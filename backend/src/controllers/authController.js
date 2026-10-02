// backend/src/controllers/authController.js
import {
  registerClient,
  registerWorker,
  login,
} from "../services/authService.js";
import { verifyOtp } from "../services/otpService.js";
import { normalizeEmail } from "../utils/email.js";
import { AppError } from "../utils/AppError.js";

export async function register(req, res) {
  const { role } = req.body ?? {};

  if (role === "CLIENT") {
    await registerClient(req.body);
  } else if (role === "WORKER") {
    await registerWorker(req.body);
  } else {
    throw new AppError("role must be CLIENT or WORKER.", 400);
  }

  res.json({ message: "A verification code has been sent to your email." });
}

export async function verify(req, res) {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code ?? "").trim();
  await verifyOtp(email, code);
  res.json({ message: "Account verified. You can now log in." });
}
export async function loginHandler(req, res) {
  const result = await login(req.body ?? {});
  res.json(result);
}
