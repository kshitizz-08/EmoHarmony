const mongoose = require("mongoose");

/**
 * Result Schema - Stores ML emotion prediction results
 * Includes emotion label, confidence, band powers, and per-class scores
 */
const ResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    datasetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dataset",
      default: null,
    },
    filename: {
      type: String,
      default: "Unknown",
    },
    // Primary emotion prediction
    emotion: {
      type: String,
      enum: ["Happy", "Sad", "Angry", "Calm", "Stress"],
      required: true,
    },
    // Confidence of primary prediction (0-1)
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true,
    },
    // Per-emotion probability scores
    emotionScores: {
      Happy: { type: Number, default: 0 },
      Sad: { type: Number, default: 0 },
      Angry: { type: Number, default: 0 },
      Calm: { type: Number, default: 0 },
      Stress: { type: Number, default: 0 },
    },
    // EEG brainwave band powers (μV²/Hz)
    bandPowers: {
      delta: { type: Number, default: 0 }, // 0.5-4 Hz (deep sleep)
      theta: { type: Number, default: 0 }, // 4-8 Hz (drowsiness/meditation)
      alpha: { type: Number, default: 0 }, // 8-13 Hz (relaxed alertness)
      beta: { type: Number, default: 0 },  // 13-30 Hz (active thinking)
      gamma: { type: Number, default: 0 }, // 30-50 Hz (high cognition)
    },
    // ML model used for prediction
    modelUsed: {
      type: String,
      enum: ["SVM", "CNN", "LSTM"],
      default: "SVM",
    },
    // Processing time in milliseconds
    processingTime: {
      type: Number,
      default: 0,
    },
    // Interpretation text from ML service
    interpretation: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Static: get emotion distribution for a user
ResultSchema.statics.getEmotionDistribution = async function (userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: "$emotion", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.model("Result", ResultSchema);
