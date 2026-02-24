const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

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

module.exports = router;
