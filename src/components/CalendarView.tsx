'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarProvider } from '@/components/calendar-context';
import { DndProvider } from '@/components/dnd-context';
import { CalendarHeader } from '@/components/calendar-header';
import { CalendarBody } from '@/components/calendar-body';
import PlanModal from './PlanModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Download, AlertTriangle, CalendarDays } from 'lucide-react';
import type { IEvent, IUser } from '@/components/interfaces';
import type { TEventColor } from '@/components/types';
import { getDaysBetween } from '@/lib/dates';

interface LeavePlan {
  _id: string;
  userId: { _id: string; name: string; email: string } | string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface UserInfo {
  id: string;
  email: string;
  role: string;
}

const USER_COLORS: TEventColor[] = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'];

function useLeavePlanIdMap(plans: LeavePlan[]) {
  return useMemo(() => {
    const map = new Map<number, string>();
    plans.forEach((plan, idx) => {
      map.set(idx + 1, plan._id);
    });
    return map;
  }, [plans]);
}

export default function CalendarView({ user }: { user: UserInfo }) {
  const [plans, setPlans] = useState<LeavePlan[]>([]);
  const [teamUsers, setTeamUsers] = useState<UserInfo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LeavePlan | null>(null);
  const [usedDays, setUsedDays] = useState(0);
  const [plansKey, setPlansKey] = useState(0);
  const maxPlans = 3;
  const maxDays = 30;

  const idToPlan = useLeavePlanIdMap(plans);

  const fetchPlans = useCallback(async () => {
    const res = await fetch('/api/plans');
    const data = await res.json();
    setPlans(data.plans || []);
    if (data.usedDays !== undefined) setUsedDays(data.usedDays);
    setPlansKey((k) => k + 1);
  }, []);

  const fetchUsers = useCallback(async () => {
    if (user.role !== 'lead') return;
    const res = await fetch('/api/users');
    const data = await res.json();
    setTeamUsers(data.users || []);
  }, [user.role]);

  useEffect(() => {
    fetchPlans();
    fetchUsers();
  }, [fetchPlans, fetchUsers]);

  const allUserIds = useMemo(
    () => [...new Set(plans.map((p) => (typeof p.userId === 'string' ? p.userId : p.userId._id)))],
    [plans],
  );

  const userColorMap = useMemo(() => {
    const map: Record<string, TEventColor> = {};
    allUserIds.forEach((id, i) => {
      map[id] = USER_COLORS[i % USER_COLORS.length];
    });
    return map;
  }, [allUserIds]);

  const events: IEvent[] = useMemo(() => {
    return plans.map((plan, idx) => {
      const uid = typeof plan.userId === 'string' ? plan.userId : plan.userId._id;
      const name = typeof plan.userId === 'string' ? '' : plan.userId.name;
      const color = userColorMap[uid] || 'blue';
      return {
        id: idx + 1,
        startDate: new Date(plan.startDate).toISOString(),
        endDate: new Date(plan.endDate).toISOString(),
        title: plan.reason || 'Leave',
        color,
        description: plan.reason || '',
        user: { id: uid, name, picturePath: null },
      };
    });
  }, [plans, userColorMap]);

  const calendarUsers: IUser[] = useMemo(() => {
    return teamUsers.map((u) => ({
      id: u.id,
      name: u.email.split('@')[0] || u.email,
      picturePath: null,
    }));
  }, [teamUsers]);

  const eventCollisions = useMemo(() => {
    const dateCount: Record<string, string[]> = {};
    for (const plan of plans) {
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);
      const uid = typeof plan.userId === 'string' ? plan.userId : plan.userId._id;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        if (!dateCount[key]) dateCount[key] = [];
        dateCount[key].push(uid);
      }
    }
    const collisionMap: Record<string, boolean> = {};
    for (const [date, ids] of Object.entries(dateCount)) {
      if (new Set(ids).size < ids.length) {
        collisionMap[date] = true;
      }
    }
    return collisionMap;
  }, [plans]);

  const collisionEntries = useMemo(
    () => Object.entries(eventCollisions).sort(([a], [b]) => a.localeCompare(b)),
    [eventCollisions],
  );

  const collisionDetails = useMemo(
    () =>
      collisionEntries.map(([date]) => {
        const plansOnDate = plans.filter((p) => {
          const d = new Date(date);
          return d >= new Date(p.startDate) && d <= new Date(p.endDate);
        });
        const names = plansOnDate.map((p) =>
          typeof p.userId === 'string' ? 'Unknown' : p.userId.name,
        );
        return { date, names };
      }),
    [collisionEntries, plans],
  );

  const handleEventClick = useCallback(
    (event: IEvent) => {
      const leavePlanId = idToPlan.get(event.id);
      if (!leavePlanId) return;
      const plan = plans.find((p) => p._id === leavePlanId);
      if (!plan) return;
      const uid = typeof plan.userId === 'string' ? plan.userId : plan.userId._id;
      if (uid !== user.id) return;
      setEditingPlan(plan);
      setIsModalOpen(true);
    },
    [plans, idToPlan, user.id],
  );

  const openNewModal = useCallback(() => {
    setEditingPlan(null);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setEditingPlan(null);
    setIsModalOpen(false);
  }, []);

  const handleSave = useCallback(
    async (data: { startDate: string; endDate: string; reason: string }) => {
      if (editingPlan) {
        const res = await fetch(`/api/plans/${editingPlan._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to save');
      } else {
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to save');
      }
      setEditingPlan(null);
      await fetchPlans();
    },
    [fetchPlans, editingPlan],
  );

  const handleDelete = useCallback(
    async (planId: string) => {
      if (!confirm('Delete this leave plan?')) return;
      const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchPlans();
      }
    },
    [fetchPlans],
  );

  const exportToExcel = useCallback(() => {
    window.open('/api/export', '_blank');
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Leave plans</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === 'lead'
              ? 'Overview of all team members'
              : `${usedDays} of ${maxDays} days used (${maxPlans} plan${maxPlans > 1 ? 's' : ''} max)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role !== 'lead' && plans.length < maxPlans && usedDays < maxDays && (
            <Button size="sm" onClick={openNewModal}>
              <Plus /> New plan
            </Button>
          )}
          {user.role !== 'lead' && (plans.length >= maxPlans || usedDays >= maxDays) && (
            <Button size="sm" disabled>
              <Plus /> {plans.length >= maxPlans ? 'Max plans reached' : 'No days remaining'}
            </Button>
          )}
          {user.role === 'lead' && (
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <Download /> Export
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <CalendarProvider
            key={plansKey}
            events={events}
            users={calendarUsers}
            view="month"
            readOnly
            onEventClick={handleEventClick}
          >
            <DndProvider>
              <div className="w-full border rounded-xl">
                <CalendarHeader hideAddEvent />
                <CalendarBody />
              </div>
            </DndProvider>
          </CalendarProvider>
        </CardContent>
      </Card>

      {user.role === 'lead' && collisionDetails.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle>Collisions</CardTitle>
              <Badge variant="outline" className="ml-auto text-xs font-normal">
                {collisionDetails.length} date{collisionDetails.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <CardDescription>Dates where multiple team members are on leave</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead>Team members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collisionDetails.map(({ date, names }) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {names.map((name, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {user.role === 'lead' && collisionDetails.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-green-500" />
              <CardTitle>Collisions</CardTitle>
            </div>
            <CardDescription>No overlapping leave plans detected</CardDescription>
          </CardHeader>
        </Card>
      )}

      <PlanModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={editingPlan ? () => handleDelete(editingPlan._id) : undefined}
        initialData={
          editingPlan
            ? {
                startDate: editingPlan.startDate,
                endDate: editingPlan.endDate,
                reason: editingPlan.reason,
              }
            : undefined
        }
        editingId={editingPlan?._id}
        usedDays={usedDays}
        maxDays={maxDays}
      />
    </div>
  );
}
