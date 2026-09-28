import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";

const BACKEND_URL = "http://localhost:3001";

type GoogleLoginResponse = {
  credential?: string;
};

export function SignIn() {
  const navigate = useNavigate();

  const {
  user,
  loading: authLoading,
  refreshUser,
} = useAuth();

useEffect(() => {
  if (!authLoading && user) {
    navigate("/dashboard", { replace: true });
  }
}, [authLoading, user, navigate]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSuccess(
    credentialResponse: GoogleLoginResponse
  ) {
    try {
      setError("");

      if (!credentialResponse.credential) {
        setError("Google sign-in did not return a credential.");
        return;
      }

      setLoading(true);

      const response = await fetch(
        `${BACKEND_URL}/api/v1/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            credential: credentialResponse.credential,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Google authentication failed."
        );
      }

      console.log("Screenly user authenticated:", data.user);

      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Google authentication error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    console.error("Google sign-in failed");

    setError(
      "Google sign-in failed. Please try again."
    );
  }

  return (
    <div className="min-h-screen w-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">

          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to Screenly
          </h1>

          <p className="mt-3 text-gray-500">
            AI-powered technical interviews for modern hiring.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Sign in to continue
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Use your Google account to securely access Screenly.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            {loading ? (
              <div className="flex h-10 items-center justify-center text-sm text-gray-500">
                Signing you in...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="320"
              />
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />

            <span className="text-xs text-gray-400">
              SECURE SIGN-IN
            </span>

            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <p className="text-center text-xs leading-5 text-gray-400">
            By continuing, you agree to use Screenly for its intended
            interview and hiring workflows.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Screenly AI Interview Platform
        </p>
      </div>
    </div>
  );
}

export default SignIn;