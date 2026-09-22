const nodemailer = require('nodemailer');

const createTransporter = () => {
  const port = Number(process.env.EMAIL_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendVerificationEmail = async (user, token) => {
  const transporter = createTransporter();
  const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;
  const text = `Hi ${user.name}, verify your email: ${verifyUrl}\nThis link expires in 24 hours.`;

  await transporter.sendMail({
    from: `"Auth Service" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Verify your email address',
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Hi ${user.name},</h2>
        <p>Thanks for signing up. Please verify your email address.</p>
        <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a></p>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.CLIENT_URL}/api/auth/reset-password/${token}`;
  const text = `Hi ${user.name}, reset your password: ${resetUrl}\nThis link expires in 1 hour.`;

  await transporter.sendMail({
    from: `"Auth Service" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Password reset request',
    text,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <h2>Hi ${user.name},</h2>
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#DC2626;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
