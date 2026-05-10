import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { sendOTPEmail } from '../utils/sendemail.js';

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      isVerified: false
    });

    // ✅ Send email
    await sendOTPEmail(email, otp);

    // ✅ Remove password from response
    const { password: _, ...userWithoutPassword } = user.toJSON();

    return res.status(201).json({
      message: "User registered. OTP sent to email.",
      user: userWithoutPassword
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ================= VERIFY OTP =================
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.json({ message: "Account verified successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // ❌ Block unverified users
    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

    const { password: _, ...userWithoutPassword } = user.toJSON();

    return res.json({
      message: "Login successful",
      token,
      user: userWithoutPassword
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};