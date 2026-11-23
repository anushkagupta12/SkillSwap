const nodemailer = require('nodemailer');
const { isProd, clientOrigins } = require('../config/env');

let transporter;
const getTransporter = () => {
  if (transporter !== undefined) return transporter;
  transporter = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
  return transporter;
};

const appUrl = () => clientOrigins()[0];

/**
 * Sends an email through SMTP_URL (e.g. smtps://user:pass@smtp.example.com).
 * Without SMTP_URL the message is printed to the server console in development
 * (handy for copying verification links) and silently dropped in production.
 */
async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) {
    if (!isProd() && process.env.NODE_ENV !== 'test') {
      console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n[mail:dev] ${text}\n`);
    }
    return;
  }
  await t.sendMail({ from: process.env.MAIL_FROM || 'SkillSwap <no-reply@skillswap.local>', to, subject, text });
}

const sendVerificationEmail = (user, rawToken) =>
  sendMail({
    to: user.email,
    subject: 'Verify your SkillSwap email',
    text: `Hi ${user.name},\n\nConfirm your email address:\n${appUrl()}/verify-email?token=${rawToken}\n\nThis link expires in 24 hours.`,
  });

const sendPasswordResetEmail = (user, rawToken) =>
  sendMail({
    to: user.email,
    subject: 'Reset your SkillSwap password',
    text: `Hi ${user.name},\n\nReset your password:\n${appUrl()}/reset-password?token=${rawToken}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.`,
  });

module.exports = { sendMail, sendVerificationEmail, sendPasswordResetEmail };
