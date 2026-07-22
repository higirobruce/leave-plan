import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import { requireLead } from '@/lib/auth';

export async function GET() {
  try {
    await requireLead();
    await connectDB();

    const users = await User.find({}, 'name email role').sort({ name: 1 }).lean();
    return NextResponse.json({ users });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : error.message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
