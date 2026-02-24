require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

// Route imports
const authRoutes = require("./routes/auth");
const uploadRoutes = require("./routes/upload");
const resultRoutes = require("./routes/results");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
    origin: true,  // allow all origins (Render + localhost)
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend build in production
const frontendBuild = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(frontendBuild));

// Simple request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ─── Database ─────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/emoharmony";

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Atlas connected successfully");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        console.error("   ⚠️  Check: 1) Atlas IP Whitelist  2) Correct password  3) Network connection");
        console.log("   🔄 Server still running – retrying DB in 10 seconds...");
        setTimeout(connectDB, 10000); // retry without crashing
    }
};

connectDB();

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api", uploadRoutes);       // /api/upload, /api/datasets
app.use("/api/results", resultRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "EmoHarmony Backend",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
    });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

// SPA catch-all: serve React app for any non-API route (must come after API routes)
app.get("*", (req, res) => {
    const indexPath = path.join(frontendBuild, "index.html");
    const fs = require("fs");
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
    }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`🚀 EmoHarmony Backend running on http://localhost:${PORT}`);
    console.log(`📊 ML Service expected at: ${process.env.ML_SERVICE_URL || "http://localhost:8000"}`);
});

module.exports = app;
