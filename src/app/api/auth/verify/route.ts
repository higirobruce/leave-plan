import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import { setSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    const email = request.nextUrl.searchParams.get('email');

    if (!token || !email) {
      return NextResponse.redirect(new URL('/?error=invalid-link', request.url));
    }

    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase(),
      magicLinkToken: token,
      magicLinkExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.redirect(new URL('/?error=expired-or-invalid', request.url));
    }

    user.magicLinkToken = undefined;
    user.magicLinkExpires = undefined;
    await user.save();

    await setSession({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/?error=server-error', request.url));
  }
}
