import crypto from "node:crypto";
import { prisma } from "../config/db.js";
import { sendOtp } from "../utils/email.js";
import { AppError } from "../utils/AppError.js";

const OTP_TTL_MS = 10 * 60 * 1000; // a code is valid for 10 minutes
const MAX_GUESSES_PER_CODE = 5; // 5 wrong guesses kills a code
const WAIT_AFTER_ROUND = {
  1: 2 * 60 * 1000, // after 1st failed code: wait 2 minutes
  2: 2 * 60 * 1000, // after 2nd failed code: wait 2 minutes
  3: 120 * 60 * 1000, // after 3rd failed code: wait 2 hours
};
const DISABLE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // after 4th failure: 7-day lockout

function hashCode(code) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET)
    .update(code)
    .digest("hex");
}

// Called by both register (first code) and resend-otp (later codes)
export async function issueOtp(user) {
  const now = new Date();

  if (user.otpBlockedUntil && user.otpBlockedUntil > now) {
    const minutesLeft = Math.ceil((user.otpBlockedUntil - now) / 60000);
    throw new AppError(
      `Please wait ${minutesLeft} minute(s) before requesting a new code.`,
      429,
    );
  }

  // If a 7-day disable has expired, reset them back to a clean slate
  if (
    user.status === "DISABLED" &&
    (!user.otpBlockedUntil || user.otpBlockedUntil <= now)
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "UNVERIFIED", otpFailedRounds: 0, otpBlockedUntil: null },
    });
  }

  const code = String(crypto.randomInt(100000, 1000000));

  await prisma.otpToken.create({
    data: {
      destination: user.email,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtp(user.email, code);
}

export async function verifyOtp(email, submittedCode) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("No pending registration for this email.", 404);

  if (user.status === "DISABLED" && user.otpBlockedUntil > new Date()) {
    throw new AppError(
      "This account is temporarily disabled. Try again later.",
      403,
    );
  }

  const token = await prisma.otpToken.findFirst({
    where: { destination: email, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!token)
    throw new AppError("No active code found. Please request a new one.", 400);

  if (token.expiresAt < new Date()) {
    throw new AppError("This code has expired. Please request a new one.", 400);
  }

  if (token.attempts >= MAX_GUESSES_PER_CODE) {
    throw new AppError(
      "Too many wrong attempts on this code. Please request a new one.",
      429,
    );
  }

  const isCorrect = token.codeHash === hashCode(submittedCode);

  if (!isCorrect) {
    const attempts = token.attempts + 1;
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts },
    });

    if (attempts >= MAX_GUESSES_PER_CODE) {
      await handleFailedRound(user);
    }
    throw new AppError("Incorrect code.", 400);
  }

  await prisma.$transaction([
    prisma.otpToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } }),
  ]);
}

async function handleFailedRound(user) {
  const round = user.otpFailedRounds + 1;

  if (round >= 4) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpFailedRounds: round,
        status: "DISABLED",
        otpBlockedUntil: new Date(Date.now() + DISABLE_DURATION_MS),
      },
    });
    return;
  }

  const wait = WAIT_AFTER_ROUND[round] ?? WAIT_AFTER_ROUND[3];
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpFailedRounds: round,
      otpBlockedUntil: new Date(Date.now() + wait),
    },
  });
}
