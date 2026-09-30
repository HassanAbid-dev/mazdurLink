import { Router } from "express";
import { register, verify } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verify);

export default router;
