const router = require("express").Router();
const User = require("../models/User");
const Result = require("../models/Result");
const Dataset = require("../models/Dataset");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// All admin routes require authentication + admin role
router.use(verifyToken, requireAdmin);

/**
 * GET /api/admin/stats
 * Global platform statistics
 */
router.get("/stats", async (req, res) => {
    try {
        const [totalUsers, totalDatasets, totalResults] = await Promise.all([
            User.countDocuments(),
            Dataset.countDocuments(),
            Result.countDocuments(),
        ]);

        // Emotion distribution across all users
        const emotions = ["Happy", "Sad", "Angry", "Calm", "Stress"];
        const emotionCounts = {};
        emotions.forEach((e) => (emotionCounts[e] = 0));
        const allResults = await Result.find().select("emotion modelUsed confidence");
        allResults.forEach((r) => {
            if (emotionCounts[r.emotion] !== undefined) emotionCounts[r.emotion]++;
        });

        // Model usage stats
        const modelUsage = { SVM: 0, CNN: 0, LSTM: 0 };
        allResults.forEach((r) => {
            if (modelUsage[r.modelUsed] !== undefined) modelUsage[r.modelUsed]++;
        });

        // Average confidence across all results
        const avgConfidence =
            allResults.length > 0
                ? allResults.reduce((s, r) => s + r.confidence, 0) / allResults.length
                : 0;

        // New users in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

        res.json({
            totalUsers,
            totalDatasets,
            totalResults,
            newUsersThisWeek: newUsers,
            emotionDistribution: emotionCounts,
            modelUsage,
            averageConfidence: parseFloat(avgConfidence.toFixed(3)),
        });
    } catch (err) {
        res.status(500).json({ error: "Could not fetch admin stats" });
    }
});

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
router.get("/users", async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const query = search ? { $or: [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }] } : {};
        const users = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));
        const total = await User.countDocuments(query);
        res.json({ users, total, page: parseInt(page) });
    } catch (err) {
        res.status(500).json({ error: "Could not fetch users" });
    }
});

/**
 * PUT /api/admin/users/:id/toggle
 * Toggle user active/inactive
 */
router.put("/users/:id/toggle", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "admin") return res.status(403).json({ error: "Cannot deactivate admin" });
        user.isActive = !user.isActive;
        await user.save({ validateBeforeSave: false });
        res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, user: user.toPublic() });
    } catch (err) {
        res.status(500).json({ error: "Toggle failed" });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and their data
 */
router.delete("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "admin") return res.status(403).json({ error: "Cannot delete admin account" });
        await Promise.all([
            Result.deleteMany({ userId: user._id }),
            Dataset.deleteMany({ userId: user._id }),
            User.findByIdAndDelete(user._id),
        ]);
        res.json({ message: "User and all data deleted" });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
});

/**
 * GET /api/admin/results
 * All results across all users (admin view)
 */
router.get("/results", async (req, res) => {
    try {
        const results = await Result.find()
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ results, total: results.length });
    } catch (err) {
        res.status(500).json({ error: "Could not fetch results" });
    }
});

module.exports = router;
