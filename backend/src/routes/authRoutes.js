import { Router } from "express";
import { register, verify,loginHandler } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verify);
router.post("/login", loginHandler);

export default router;
