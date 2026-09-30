import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { normalizeEmail } from "../utils/email.js";
import { AppError } from "../utils/AppError.js";
import { issueOtp } from "./otpService.js";

export async function registerClient({ email, phone, name, city, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (!phone || !name || !city || !password) {
    throw new AppError("phone, name, city and password are required.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (existing.status === "ACTIVE") {
      throw new AppError(
        "An account with this email already exists. Please log in.",
        409,
      );
    }
    if (existing.status === "UNVERIFIED") {
      throw new AppError(
        "This email is already pending verification. Please verify or request a new code.",
        409,
      );
    }
    if (existing.status === "DISABLED") {
      const unlockTime = existing.otpBlockedUntil?.toISOString() ?? "later";
      throw new AppError(
        `This account is temporarily disabled. Try again after ${unlockTime}.`,
        403,
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: normalizedEmail,
        phone,
        name,
        passwordHash,
        roles: ["CLIENT"],
      },
    });
    await tx.clientProfile.create({ data: { userId: created.id, city } });
    return created;
  });

  await issueOtp(user);
}
