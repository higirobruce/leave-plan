import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
