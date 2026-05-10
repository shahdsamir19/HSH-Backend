import express from "express";
import { register, login } from "../controllers/auth.controller.js";

import { verifyOtp } from '../controllers/auth.controller.js';


const router = express.Router();

router.post('/verify-otp', verifyOtp);
router.post("/register", register);
router.post("/login", login);

export default router;