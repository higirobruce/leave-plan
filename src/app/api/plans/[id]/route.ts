import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { LeavePlan } from '@/lib/models/leave-plan';
import { requireAuth } from '@/lib/auth';
import { getDaysBetween } from '@/lib/dates';

const MAX_DAYS = 30;

async function getOwnPlan(id: string, userId: string) {
  await connectDB();
  const plan = await LeavePlan.findById(id);
  if (!plan) return { error: 'Plan not found', status: 404 };
  if (plan.userId.toString() !== userId) return { error: 'Forbidden', status: 403 };
  return { plan };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { startDate, endDate, reason } = await request.json();

    const result = await getOwnPlan(id, session.userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const finalStart = startDate || result.plan.startDate.toISOString();
    const finalEnd = endDate || result.plan.endDate.toISOString();

    const newDays = getDaysBetween(finalStart, finalEnd);
    if (newDays < 1) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const allPlans = await LeavePlan.find({ userId: session.userId }).lean();
    const otherDays = allPlans.reduce((sum, p) => {
      if (p._id.toString() === id) return sum;
      return sum + getDaysBetween(p.startDate, p.endDate);
    }, 0);

    if (otherDays + newDays > MAX_DAYS) {
      const remaining = MAX_DAYS - otherDays;
      return NextResponse.json(
        { error: `Total leave days cannot exceed ${MAX_DAYS}. You have ${remaining} day${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 },
      );
    }

    if (startDate) result.plan.startDate = new Date(startDate);
    if (endDate) result.plan.endDate = new Date(endDate);
    if (reason !== undefined) result.plan.reason = reason;
    await result.plan.save();

    return NextResponse.json({ plan: result.plan });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const result = await getOwnPlan(id, session.userId);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await LeavePlan.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Plan deleted' });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
