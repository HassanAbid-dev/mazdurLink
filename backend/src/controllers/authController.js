import { registerClient } from "../services/authService.js";
import { verifyOtp } from "../services/otpService.js";
import { normalizeEmail } from "../utils/email.js";

export async function register(req, res) {
  await registerClient(req.body ?? {});
  res.json({ message: "A verification code has been sent to your email." });
}

export async function verify(req, res) {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code ?? "").trim();
  await verifyOtp(email, code);
  res.json({ message: "Account verified. You can now log in." });
}
