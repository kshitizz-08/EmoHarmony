/**
 * EmoHarmony — Onboarding Tour Component
 * Shows a guided 3-step walkthrough for first-time users using react-joyride.
 * Shown once after first login (tracked in localStorage).
 */
import React, { useState, useEffect } from "react";
import Joyride, { STATUS } from "react-joyride";
import useAuthStore from "../store/useAuthStore";

const TOUR_KEY = "emoharmony_tour_done";

const TOUR_STEPS = [
    {
        target: "#upload-nav-link",
        title: "📤 Upload Your EEG File",
        content: "Start here — upload a CSV or EDF file from your EEG device. We support most standard formats.",
        placement: "bottom",
        disableBeacon: true,
    },
    {
        target: "#model-selector",
        title: "🤖 Choose Your AI Model",
        content: "Select from SVM (fastest), XGBoost, LightGBM, LSTM (deep learning), or let the Ensemble pick automatically.",
        placement: "bottom",
        disableBeacon: true,
    },
    {
        target: "#analyze-button",
        title: "⚡ Run the Analysis",
        content: "Hit this button and our ML models will analyze your brainwave patterns in seconds.",
        placement: "top",
        disableBeacon: true,
    },
    {
        target: "#nav-dashboard",
        title: "📊 Track Your Progress",
        content: "Check the Dashboard to see your emotion history, session counts, and wellness trends over time.",
        placement: "bottom",
        disableBeacon: true,
    },
];

// Joyride styling to match BioZen dark theme
const JOYRIDE_STYLES = {
    options: {
        primaryColor: "#10b981",
        backgroundColor: "#0a1f18",
        textColor: "#a7f3d0",
        arrowColor: "#0a1f18",
        overlayColor: "rgba(0,0,0,0.65)",
        zIndex: 10000,
        width: 320,
    },
    tooltip: {
        borderRadius: "16px",
        border: "1px solid rgba(52,211,153,0.25)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.1)",
        fontFamily: "'Nunito', sans-serif",
        padding: "20px 24px",
    },
    tooltipTitle: {
        fontSize: "15px",
        fontWeight: "700",
        color: "#ecfdf5",
        marginBottom: "6px",
    },
    tooltipContent: {
        fontSize: "13px",
        color: "#94a3b8",
        lineHeight: "1.6",
        padding: "0",
    },
    buttonNext: {
        background: "linear-gradient(135deg,#10b981,#059669)",
        borderRadius: "10px",
        fontWeight: "600",
        fontSize: "13px",
        padding: "8px 16px",
        color: "#fff",
        border: "none",
    },
    buttonBack: {
        color: "#7fa891",
        fontSize: "13px",
        background: "transparent",
        border: "none",
    },
    buttonSkip: {
        color: "#475569",
        fontSize: "12px",
        background: "transparent",
        border: "none",
    },
    buttonClose: {
        color: "#5a8a72",
    },
};

const OnboardingTour = () => {
    const { user } = useAuthStore();
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState([]);

    useEffect(() => {
        if (!user) return;
        const done = localStorage.getItem(TOUR_KEY);
        if (!done) {
            // Small delay so all nav elements mount first
            const timer = setTimeout(() => {
                // Filter to steps whose target elements actually exist in DOM
                const validSteps = TOUR_STEPS.filter(
                    (step) => document.querySelector(step.target)
                );
                if (validSteps.length > 0) {
                    setSteps(validSteps);
                    setRun(true);
                }
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [user]);

    const handleCallback = ({ status }) => {
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRun(false);
            localStorage.setItem(TOUR_KEY, "true");
        }
    };

    if (!run || steps.length === 0) return null;

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showProgress
            showSkipButton
            scrollToFirstStep
            styles={JOYRIDE_STYLES}
            locale={{
                back: "← Back",
                close: "✕",
                last: "Get Started 🚀",
                next: "Next →",
                skip: "Skip tour",
            }}
            callback={handleCallback}
        />
    );
};

export default OnboardingTour;
