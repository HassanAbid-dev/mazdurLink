import { Router } from "express";
import {
  register,
  verify,
  loginHandler,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verify);
router.post("/login", loginHandler);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
export default router;
