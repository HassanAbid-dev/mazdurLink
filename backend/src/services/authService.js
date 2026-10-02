import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { normalizeEmail } from "../utils/email.js";
import { AppError } from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import { issueOtp } from "./otpService.js";

function checkEmailAvailable(existing) {
  if (!existing) return;
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

export async function registerClient({ email, phone, name, city, password }) {
  const normalizedEmail = normalizeEmail(email);

  if (!phone || !name || !city || !password) {
    throw new AppError("phone, name, city and password are required.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  checkEmailAvailable(existing);

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

export async function registerWorker({
  email,
  phone,
  name,
  city,
  trade,
  experienceYears,
  minRate,
  maxRate,
  password,
}) {
  const normalizedEmail = normalizeEmail(email);

  if (
    !phone ||
    !name ||
    !city ||
    !trade ||
    !experienceYears ||
    !minRate ||
    !maxRate ||
    !password
  ) {
    throw new AppError("All fields are required for worker registration.", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  checkEmailAvailable(existing);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: normalizedEmail,
        phone,
        name,
        passwordHash,
        roles: ["WORKER"],
      },
    });
    await tx.workerProfile.create({
      data: {
        userId: created.id,
        trade,
        city,
        experienceYears: Number(experienceYears),
        minRate: Number(minRate),
        maxRate: Number(maxRate),
      },
    });
    return created;
  });

  await issueOtp(user);
}
export async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (user.status === "UNVERIFIED") {
    throw new AppError("Please verify your email before logging in.", 403);
  }

  if (user.status === "DISABLED") {
    const unlockTime = user.otpBlockedUntil?.toISOString() ?? "later";
    throw new AppError(
      `This account is temporarily disabled. Try again after ${unlockTime}.`,
      403,
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("This account cannot log in right now.", 403);
  }

  const token = jwt.sign(
    { userId: user.id, roles: user.roles },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    },
  };
}
