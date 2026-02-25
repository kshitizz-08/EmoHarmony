/**
 * EmoHarmony — PDF Report Generator
 * Generates a professional academic/clinical EEG analysis report using jsPDF.
 * No screenshots needed — pure programmatic text/vector PDF.
 */
import { jsPDF } from "jspdf";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMOTION_COLORS = {
    Happy: [245, 158, 11],
    Calm: [16, 185, 129],
    Stress: [139, 92, 246],
    Angry: [239, 68, 68],
    Sad: [59, 130, 246],
};

const hex = ([r, g, b]) => ({ r, g, b });

function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

// ── Section helpers ───────────────────────────────────────────────────────────

function addHeader(doc, result) {
    const color = EMOTION_COLORS[result.emotion] || [99, 102, 241];
    const { r, g, b } = hex(color);
    const pageW = doc.internal.pageSize.getWidth();

    // Top banner
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageW, 38, "F");

    // Brand name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("EmoHarmony", 14, 18);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("EEG Emotional Analysis Report", 14, 26);

    // Date top-right
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const dateStr = result.createdAt ? formatDate(result.createdAt) : new Date().toLocaleString();
    doc.text(dateStr, pageW - 14, 26, { align: "right" });

    // Disclaimer strip
    doc.setFillColor(240, 240, 245);
    doc.rect(0, 38, pageW, 10, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 120);
    doc.text(
        "⚠  This report is generated for research & educational purposes only and does not constitute medical diagnosis.",
        pageW / 2, 44.5, { align: "center" }
    );

    return 58; // return Y cursor after header
}

function addSectionTitle(doc, title, y, color = [60, 60, 80]) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(14, y, doc.internal.pageSize.getWidth() - 14, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(title, 14, y);
    return y + 7;
}

function addKVRow(doc, label, value, y, labelColor = [100, 100, 120]) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...labelColor);
    doc.text(label, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 50);
    doc.text(String(value), 80, y);
    return y + 7;
}

function addBandPowerTable(doc, bandPowers, y) {
    const bands = ["delta", "theta", "alpha", "beta", "gamma"];
    const bandColors = {
        delta: [59, 130, 246],
        theta: [139, 92, 246],
        alpha: [16, 185, 129],
        beta: [245, 158, 11],
        gamma: [239, 68, 68],
    };
    const pageW = doc.internal.pageSize.getWidth();
    const cellW = (pageW - 28) / bands.length;

    bands.forEach((band, i) => {
        const x = 14 + i * cellW;
        const color = bandColors[band] || [99, 102, 241];
        const val = bandPowers?.[band] ?? 0;

        // Band label box
        doc.setFillColor(...color);
        doc.roundedRect(x, y, cellW - 2, 8, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(band.toUpperCase(), x + (cellW - 2) / 2, y + 5.5, { align: "center" });

        // Value
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 50);
        doc.text(
            typeof val === "number" ? val.toFixed(4) : String(val),
            x + (cellW - 2) / 2, y + 16, { align: "center" }
        );
    });

    return y + 22;
}

function addEmotionScoreBar(doc, emotion, score, y, maxW) {
    const color = EMOTION_COLORS[emotion] || [99, 102, 241];
    const pct = Math.min(score * 100, 100);
    const barW = (pct / 100) * maxW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 80);
    doc.text(emotion, 14, y + 4);

    // Background bar
    doc.setFillColor(230, 230, 240);
    doc.roundedRect(55, y, maxW, 5, 1, 1, "F");

    // Filled bar
    if (barW > 0) {
        doc.setFillColor(...color);
        doc.roundedRect(55, y, barW, 5, 1, 1, "F");
    }

    // Percentage text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 50);
    const pageW = doc.internal.pageSize.getWidth();
    doc.text(`${pct.toFixed(1)}%`, pageW - 14, y + 4, { align: "right" });

    return y + 9;
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
}

// ── Main export function ──────────────────────────────────────────────────────

export function exportResultAsPDF(result) {
    if (!result) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const maxW = pageW - 28;
    const emotionColor = EMOTION_COLORS[result.emotion] || [99, 102, 241];

    let y = addHeader(doc, result);

    // ── 1. Session Info ──────────────────────────────────────────────────────
    y = addSectionTitle(doc, "Session Information", y, [50, 50, 80]);
    y = addKVRow(doc, "Report ID:", result._id || "N/A", y);
    y = addKVRow(doc, "Dataset Name:", result.datasetName || "Unknown", y);
    y = addKVRow(doc, "Model Used:", result.modelUsed || "N/A", y);
    y = addKVRow(doc, "Processing Time:", `${result.processingTime ?? "—"} ms`, y);
    y = addKVRow(doc, "Analysis Date:", result.createdAt ? formatDate(result.createdAt) : "N/A", y);
    y += 4;

    // ── 2. Primary Emotion ───────────────────────────────────────────────────
    y = addSectionTitle(doc, "Primary Emotion Detected", y, [50, 50, 80]);

    // Emotion badge box
    doc.setFillColor(...emotionColor);
    doc.roundedRect(14, y, 60, 18, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(result.emotion || "Unknown", 44, y + 12, { align: "center" });

    // Confidence
    const confPct = Math.round((result.confidence ?? 0) * 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 80);
    doc.text("Confidence:", 82, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...emotionColor);
    doc.text(`${confPct}%`, 82, y + 16);
    y += 26;

    // ── 3. Band Powers ───────────────────────────────────────────────────────
    y = addSectionTitle(doc, "EEG Band Powers (μV²/Hz)", y, [50, 50, 80]);
    y = addBandPowerTable(doc, result.bandPowers, y);
    y += 4;

    // ── 4. Emotion Probability Scores ────────────────────────────────────────
    y = addSectionTitle(doc, "Emotion Probability Scores", y, [50, 50, 80]);
    const scores = result.emotionScores || {};
    Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .forEach(([emo, score]) => {
            y = addEmotionScoreBar(doc, emo, score, y, maxW - 40);
        });
    y += 6;

    // ── 5. Clinical Interpretation ───────────────────────────────────────────
    y = addSectionTitle(doc, "Clinical Interpretation", y, [50, 50, 80]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 60);
    const interp = result.interpretation || "No interpretation available.";
    y = wrapText(doc, interp, 14, y, maxW, 5.5);
    y += 8;

    // ── 6. Neurological Ratios (if available) ────────────────────────────────
    if (result.ratios && Object.keys(result.ratios).length > 0) {
        y = addSectionTitle(doc, "Neurological Ratios", y, [50, 50, 80]);
        const ratioLabels = {
            alpha_beta_ratio: "Alpha/Beta Ratio (Relaxation Index)",
            theta_alpha_ratio: "Theta/Alpha Ratio (Mental Load Index)",
            fatigue_index: "Fatigue Index ((α+θ)/β)",
        };
        Object.entries(result.ratios).forEach(([key, val]) => {
            const label = ratioLabels[key] || key;
            y = addKVRow(doc, label + ":", typeof val === "number" ? val.toFixed(4) : val, y);
        });
        y += 4;
    }

    // ── Footer on every page ──────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const pH = doc.internal.pageSize.getHeight();
        doc.setFillColor(245, 245, 250);
        doc.rect(0, pH - 12, pageW, 12, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 150);
        doc.text("Generated by EmoHarmony — EEG Emotional Analysis Platform", 14, pH - 4.5);
        doc.text(`Page ${p} of ${totalPages}`, pageW - 14, pH - 4.5, { align: "right" });
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const filename = `EmoHarmony_Report_${result.emotion || "EEG"}_${Date.now()}.pdf`;
    doc.save(filename);
}
