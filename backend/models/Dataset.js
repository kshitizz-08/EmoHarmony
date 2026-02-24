const mongoose = require("mongoose");

/**
 * Dataset Schema - Stores uploaded EEG file metadata
 * Tracks file info, EEG parameters, and processing status
 */
const DatasetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // File metadata
        filename: {
            type: String,
            required: true,
        },
        originalName: {
            type: String,
            required: true,
        },
        filePath: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number, // bytes
            default: 0,
        },
        format: {
            type: String,
            enum: ["csv", "edf", "mat", "txt"],
            default: "csv",
        },
        // EEG technical metadata (extracted or estimated)
        channels: {
            type: Number,
            default: 14, // typical consumer EEG
        },
        samplingRate: {
            type: Number,
            default: 128, // Hz
        },
        duration: {
            type: Number,
            default: 0, // seconds
        },
        // Processing status
        status: {
            type: String,
            enum: ["uploaded", "processing", "analyzed", "error"],
            default: "uploaded",
        },
        description: {
            type: String,
            default: "",
        },
        // Associated result (if analyzed)
        resultId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Result",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Dataset", DatasetSchema);
