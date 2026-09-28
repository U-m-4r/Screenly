import "../styles/globals.css";

import { useEffect, useState } from "react";

import { SignIn } from "./components/SignIn";
import { Form } from "./components/Form";
import { Interview } from "./components/Interview";
import { Result } from "./components/Result";

import { Toaster } from "sonner";
import { BrowserRouter, Route, Routes } from "react-router";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./components/Dashboard";

export function App() {
  const [googleClientId, setGoogleClientId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch("/api/config");

        if (!response.ok) {
          throw new Error("Failed to load application configuration");
        }

        const data = await response.json();

        if (!data.googleClientId) {
          throw new Error("Google Client ID is missing");
        }

        setGoogleClientId(data.googleClientId);
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

          <p className="text-sm text-gray-500">
            Loading Screenly...
          </p>
        </div>
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <div className="min-h-screen w-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Configuration Error
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            Google Sign-In is not configured correctly.
          </p>

          <p className="mt-2 text-xs text-gray-400">
            Check the VITE_GOOGLE_CLIENT_ID value in
            apps/frontend/.env
          </p>
        </div>
      </div>
    );
  }

  return (
  <GoogleOAuthProvider clientId={googleClientId}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SignIn />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <Form />
              </ProtectedRoute>
            }
          />

          <Route
            path="/interview/:id"
            element={
              <ProtectedRoute>
                <Interview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <Result />
              </ProtectedRoute>
            }
          />
        </Routes>

        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  </GoogleOAuthProvider>
);
}

export default App;