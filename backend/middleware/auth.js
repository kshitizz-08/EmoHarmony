const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * verifyToken - Middleware to validate JWT from Authorization header
 * Attaches decoded user to req.user
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "emoharmony_secret");
        // Fetch fresh user from DB to ensure account is still active
        const user = await User.findById(decoded.id).select("-password");
        if (!user || !user.isActive) {
            return res.status(401).json({ error: "User not found or deactivated" });
        }
        req.user = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired, please login again" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

/**
 * requireAdmin - Middleware to restrict routes to admin role only
 * Must be used AFTER verifyToken
 */
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({ error: "Admin access required" });
};

module.exports = { verifyToken, requireAdmin };
