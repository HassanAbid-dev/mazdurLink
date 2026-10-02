import { AppError } from "../utils/AppError.js";

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      throw new AppError(
        `This action requires one of these roles: ${allowedRoles.join(", ")}.`,
        403,
      );
    }
    next();
  };
}
