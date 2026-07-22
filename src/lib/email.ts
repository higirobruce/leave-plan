import { Resend } from 'resend';

let client: Resend | null = null;

function getClient() {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${process.env.APP_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

  await getClient().emails.send({
    from: process.env.EMAIL_FROM || 'LeavePlan <onboarding@resend.dev>',
    to: email,
    subject: 'Sign in to LeavePlan',
    html: `
      <h2>Sign in to LeavePlan</h2>
      <p>Click the link below to sign in:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Sign In</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
}
