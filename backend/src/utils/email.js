import nodemailer from "nodemailer";
import { AppError } from "./AppError.js";

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
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export async function sendEmail(to, subject, text, html) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

export async function sendOtp(destination, code) {
  await sendEmail(
    destination,
    "Your MazdoorLink verification code",
    `Your verification code is ${code}. It expires in 10 minutes.`,
    `<div style="font-family: sans-serif; padding: 20px;">
       <h2>MazdoorLink</h2>
       <p>Your verification code is:</p>
       <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${code}</p>
       <p style="color: #666;">This code expires in 10 minutes.</p>
     </div>`,
  );
}
