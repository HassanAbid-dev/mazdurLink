import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { AppError } from "../utils/AppError.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No token provided.", 401));
  }

  const token = authHeader.slice("Bearer ".length);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new AppError("Invalid or expired token.", 401));
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });

  if (!user || user.status !== "ACTIVE") {
    return next(new AppError("This account is not currently active.", 403));
  }

  req.user = {
    id: user.id,
    roles: user.roles,
    name: user.name,
    email: user.email,
  };
  next();
}
