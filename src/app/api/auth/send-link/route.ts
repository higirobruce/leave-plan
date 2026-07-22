import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/user';
import { sendMagicLink } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        role: email.toLowerCase() === process.env.LEAD_EMAIL?.toLowerCase() ? 'lead' : 'member',
      });
    }

    const token = uuidv4();
    user.magicLinkToken = token;
    user.magicLinkExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendMagicLink(user.email, token);

    return NextResponse.json({ message: 'Magic link sent to your email' });
  } catch (error) {
    console.error('Send link error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}
