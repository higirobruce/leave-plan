import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { LeavePlan } from '@/lib/models/leave-plan';
import { User } from '@/lib/models/user';
import { requireLead } from '@/lib/auth';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    await requireLead();
    await connectDB();

    const plans = await LeavePlan.find()
      .populate<{ userId: { _id: string; name: string; email: string } }>('userId', 'name email')
      .sort({ startDate: 1 })
      .lean() as any[];

    const plansByDate: Record<string, string[]> = {};
    for (const plan of plans) {
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);
      const name = plan.userId?.name || 'Unknown';
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        if (!plansByDate[key]) plansByDate[key] = [];
        plansByDate[key].push(name);
      }
    }

    const collisionDates: string[] = [];
    for (const [date, names] of Object.entries(plansByDate)) {
      if (new Set(names).size < names.length) {
        collisionDates.push(date);
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leave Plans');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Start Date', key: 'startDate', width: 15 },
      { header: 'End Date', key: 'endDate', width: 15 },
      { header: 'Reason', key: 'reason', width: 30 },
      { header: 'Collision', key: 'collision', width: 10 },
    ];

    for (const plan of plans) {
      const name = (plan.userId as any)?.name || 'Unknown';
      const email = (plan.userId as any)?.email || '';
      const hasCollision = collisionDates.some((d) => {
        const date = new Date(d);
        return date >= new Date(plan.startDate) && date <= new Date(plan.endDate);
      });

      sheet.addRow({
        name,
        email,
        startDate: new Date(plan.startDate).toLocaleDateString(),
        endDate: new Date(plan.endDate).toLocaleDateString(),
        reason: plan.reason,
        collision: hasCollision ? 'Yes' : 'No',
      });
    }

    const buf = await workbook.xlsx.writeBuffer();

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="leave-plans.xlsx"',
      },
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
