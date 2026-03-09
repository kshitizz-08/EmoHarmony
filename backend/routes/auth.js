const router = require("express").Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");
const { sendPasswordResetEmail,
  sendWelcomeEmail } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET || "emoharmony_secret";
const JWT_EXPIRES = "7d";

// Helper: generate signed JWT
const signToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role === "researcher" ? "researcher" : "user",
    });
    const token = signToken(user._id);
    // Send welcome email (non-blocking — don't await so it doesn't slow down registration)
    sendWelcomeEmail(user).catch((e) => console.error("Welcome email failed:", e.message));
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed", details: err.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    // Include password explicitly (select: false in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Account has been deactivated" });
    }
    // Update last login and session count
    user.lastLogin = new Date();
    user.totalSessions = (user.totalSessions || 0) + 1;
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

/**
 * GET /api/auth/me
 * Return logged-in user's profile
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    res.json({ user: req.user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch user" });
  }
});

/**
 * PUT /api/auth/change-password
 * Change logged-in user's password
 */
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both current and new password required" });
    }
    const user = await User.findById(req.user._id).select("+password");
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Password change failed" });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile fields (name)
 */
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true, runValidators: true }
    );
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ error: "Profile update failed" });
  }
});

/**
 * POST /api/auth/forgot-password
 * Send a password-reset link to the user's email
 */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+passwordResetToken +passwordResetExpires");

    // Always return 200 — don't reveal whether email exists (security best practice)
    if (!user) return res.json({ message: "If that email is registered, a reset link has been sent." });

    // Generate secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send email with raw (unhashed) token in URL
    await sendPasswordResetEmail(user, rawToken);

    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Could not process request. Try again later." });
  }
});

/**
 * POST /api/auth/reset-password/:token
 * Validate token + update password
 */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Hash the URL token to compare with stored hash
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },   // not expired
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({ error: "Reset link is invalid or has expired. Please request a new one." });
    }

    // Update password — pre-save hook will hash it
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed. Try again." });
  }
});

module.exports = router;
