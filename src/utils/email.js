const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email verification link
 */
const sendVerificationEmail = async (user, token) => {
  const transporter = createTransporter();
  const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;

  await transporter.sendMail({
    from: `"Auth Service" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${user.name},</h2>
        <p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
        <p>This link expires in <strong>24 hours</strong>.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#4F46E5;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;">
          Verify Email
        </a>
        <p>Or copy this link:<br/><small>${verifyUrl}</small></p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, token) => {
  const transporter = createTransporter();
  const resetUrl = `${process.env.CLIENT_URL}/api/auth/reset-password/${token}`;

  await transporter.sendMail({
    from: `"Auth Service" <${process.env.EMAIL_FROM}>`,
    to: user.email,
    subject: 'Password reset request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${user.name},</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#DC2626;color:#fff;
                  text-decoration:none;border-radius:6px;margin:16px 0;">
          Reset Password
        </a>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
