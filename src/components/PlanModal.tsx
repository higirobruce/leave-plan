'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { getDaysBetween } from '@/lib/dates';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { startDate: string; endDate: string; reason: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: { startDate?: string; endDate?: string; reason?: string };
  editingId?: string;
  usedDays?: number;
  maxDays?: number;
}

export default function PlanModal({ isOpen, onClose, onSave, onDelete, initialData, editingId, usedDays = 0, maxDays = 30 }: PlanModalProps) {
  const editingDays = editingId && initialData?.startDate && initialData?.endDate
    ? getDaysBetween(initialData.startDate, initialData.endDate)
    : 0;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialData?.startDate?.split('T')[0] || '');
      setEndDate(initialData?.endDate?.split('T')[0] || '');
      setReason(initialData?.reason || '');
      setError('');
    }
  }, [isOpen, initialData]);

  const planDays = startDate && endDate ? getDaysBetween(startDate, endDate) : 0;
  const effectiveUsed = usedDays - editingDays;
  const remaining = maxDays - effectiveUsed;
  const exceedsRemaining = planDays > remaining;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (planDays < 1) {
      setError('End date must be after start date');
      return;
    }

    if (exceedsRemaining) {
      setError(`Total leave cannot exceed ${maxDays} days. You have ${remaining} day${remaining === 1 ? '' : 's'} remaining.`);
      return;
    }

    setLoading(true);
    try {
      await onSave({ startDate, endDate, reason });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm('Delete this leave plan?')) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = !!editingId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 sm:mx-0">
              {isEditing ? (
                <Pencil className="h-5 w-5 text-primary" />
              ) : (
                <CalendarPlus className="h-5 w-5 text-primary" />
              )}
            </div>
            <DialogTitle>{isEditing ? 'Edit leave plan' : 'New leave plan'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the dates for your leave' : 'Select the dates for your leave'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              {effectiveUsed} of {maxDays} days used &middot; {remaining} day{remaining === 1 ? '' : 's'} remaining
            </p>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {startDate && endDate && (
              <p className={`text-xs ${exceedsRemaining ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {planDays} day{planDays > 1 ? 's' : ''}
                {exceedsRemaining ? ` — exceeds remaining allowance by ${planDays - remaining} day${planDays - remaining === 1 ? '' : 's'}` : ''}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                rows={3}
                placeholder="Optional reason..."
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              {isEditing && onDelete ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  {deleting ? (
                    <><Loader2 className="animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 /> Delete</>
                  )}
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || planDays < 1 || exceedsRemaining}>
                  {loading ? (
                    <><Loader2 className="animate-spin" /> Saving...</>
                  ) : (
                    isEditing ? 'Update' : 'Save'
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
