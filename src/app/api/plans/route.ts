import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { LeavePlan } from '@/lib/models/leave-plan';
import { requireAuth } from '@/lib/auth';
import { getDaysBetween } from '@/lib/dates';

const MAX_PLANS = 3;
const MAX_DAYS = 30;

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    if (session.role === 'lead') {
      const plans = await LeavePlan.find().populate('userId', 'name email').sort({ startDate: 1 }).lean();
      return NextResponse.json({ plans, maxPlans: MAX_PLANS, maxDays: MAX_DAYS });
    }

    const plans = await LeavePlan.find({ userId: session.userId }).sort({ startDate: 1 }).lean();
    const usedDays = plans.reduce((sum, p) => sum + getDaysBetween(p.startDate, p.endDate), 0);
    return NextResponse.json({ plans, planCount: plans.length, usedDays, maxPlans: MAX_PLANS, maxDays: MAX_DAYS });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { startDate, endDate, reason } = await request.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    await connectDB();

    const plans = await LeavePlan.find({ userId: session.userId }).lean();
    if (plans.length >= MAX_PLANS) {
      return NextResponse.json({ error: `Maximum ${MAX_PLANS} leave plans allowed` }, { status: 400 });
    }

    const newDays = getDaysBetween(startDate, endDate);
    if (newDays < 1) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const usedDays = plans.reduce((sum, p) => sum + getDaysBetween(p.startDate, p.endDate), 0);
    if (usedDays + newDays > MAX_DAYS) {
      const remaining = MAX_DAYS - usedDays;
      return NextResponse.json(
        { error: `Total leave days cannot exceed ${MAX_DAYS}. You have ${remaining} day${remaining === 1 ? '' : 's'} remaining.` },
        { status: 400 },
      );
    }

    const plan = await LeavePlan.create({
      userId: session.userId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || '',
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
