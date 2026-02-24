const router = require("express").Router();
const Result = require("../models/Result");
const { verifyToken } = require("../middleware/auth");

/**
 * GET /api/results
 * Get all emotion results for logged-in user with emotion distribution stats
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const results = await Result.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Result.countDocuments({ userId: req.user._id });

    // Calculate emotion distribution counts
    const emotions = ["Happy", "Sad", "Angry", "Calm", "Stress"];
    const counts = {};
    emotions.forEach((e) => (counts[e] = 0));
    results.forEach((r) => {
      if (counts[r.emotion] !== undefined) counts[r.emotion]++;
    });

    // Calculate average confidence
    const avgConfidence =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 0;

    res.json({
      results,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      distribution: counts,
      avgConfidence: parseFloat(avgConfidence.toFixed(3)),
    });
  } catch (err) {
    console.error("Results fetch error:", err);
    res.status(500).json({ error: "Could not fetch results" });
  }
});

/**
 * GET /api/results/analytics
 * Get analytics: weekly trend, stress index, band averages
 */
router.get("/analytics", verifyToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch last 30 days of results
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const results = await Result.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    }).sort({ createdAt: 1 });

    // Weekly trend - group by day label
    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = {};
    dayLabels.forEach((d) => (weeklyData[d] = { Happy: 0, Sad: 0, Angry: 0, Calm: 0, Stress: 0 }));

    results.forEach((r) => {
      const day = dayLabels[new Date(r.createdAt).getDay()];
      if (weeklyData[day] && r.emotion) weeklyData[day][r.emotion]++;
    });

    // Stress index: (Stress + Angry) / total sessions
    const total = results.length;
    const negativeCount = results.filter((r) =>
      ["Stress", "Angry", "Sad"].includes(r.emotion)
    ).length;
    const stressIndex = total > 0 ? parseFloat(((negativeCount / total) * 100).toFixed(1)) : 0;

    // Calmness ratio: (Calm + Happy) / total
    const positiveCount = results.filter((r) =>
      ["Calm", "Happy"].includes(r.emotion)
    ).length;
    const calmnessRatio = total > 0 ? parseFloat(((positiveCount / total) * 100).toFixed(1)) : 0;

    // Average band powers
    const bandAvgs = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 };
    if (results.length > 0) {
      results.forEach((r) => {
        Object.keys(bandAvgs).forEach((band) => {
          bandAvgs[band] += r.bandPowers?.[band] || 0;
        });
      });
      Object.keys(bandAvgs).forEach(
        (band) => (bandAvgs[band] = parseFloat((bandAvgs[band] / results.length).toFixed(3))
        ));
    }

    // Emotion distribution for pie chart
    const emotions = ["Happy", "Sad", "Angry", "Calm", "Stress"];
    const distribution = {};
    emotions.forEach((e) => (distribution[e] = 0));
    results.forEach((r) => { if (distribution[r.emotion] !== undefined) distribution[r.emotion]++; });

    // Last 7 sessions for timeline
    const recentSessions = results.slice(-7).map((r) => ({
      date: r.createdAt,
      emotion: r.emotion,
      confidence: r.confidence,
      model: r.modelUsed,
    }));

    res.json({
      total,
      stressIndex,
      calmnessRatio,
      weeklyData,
      distribution,
      bandAverages: bandAvgs,
      recentSessions,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Could not fetch analytics" });
  }
});

/**
 * GET /api/results/:id
 * Get a single result by ID
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const result = await Result.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch result" });
  }
});

/**
 * DELETE /api/results/:id
 * Delete a single result
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const result = await Result.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!result) return res.status(404).json({ error: "Result not found" });
    res.json({ message: "Result deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
