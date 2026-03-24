import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/useAuthStore";
import ProtectedRoute from "./components/ProtectedRoute";
import OnboardingTour from "./components/OnboardingTour";

// Pages
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Results from "./pages/Results";
import Analytics from "./pages/Analytics";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import FaceEmotion from "./pages/FaceEmotion";
import EmotionalReels from "./pages/EmotionalReels";

function App() {
  const initSession = useAuthStore((s) => s.initSession);

  React.useEffect(() => {
    initSession();
  }, [initSession]);

  return (
        <BrowserRouter>
          {/* Onboarding tour — shown once for first-time logged-in users */}
          <OnboardingTour />

          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/emotional-reels" element={<EmotionalReels />} />

            {/* ── Protected routes ── */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/face-emotion" element={<ProtectedRoute><FaceEmotion /></ProtectedRoute>} />

            {/* ── Admin only ── */}
            <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminPanel /></ProtectedRoute>} />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
    </BrowserRouter>
  );
}

export default App;
