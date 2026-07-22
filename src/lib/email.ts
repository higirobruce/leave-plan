import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendMagicLink(email: string, token: string) {
  const url = `${process.env.APP_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_USER,
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
