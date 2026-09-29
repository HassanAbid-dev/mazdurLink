import nodemailer from "nodemailer";
import { AppError } from "./AppError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw) {
  const email = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new AppError("Enter a valid email address.", 400);
  }
  return email;
}

export const transporter = nodemailer.createTransport({
  host: process.env.SMPT_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}

export async function sendOtp(destination, code) {
  await sendEmail(
    destination,
    "Your MazdoorLink verification code",
    `Your verification code is ${code}. It expires in 10 minutes.`,
  );
}
