import { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

const BACKEND_URL = "http://localhost:3001";

type GoogleLoginResponse = {
  credential?: string;
};

type LoginMode = "selection" | "candidate";

export function SignIn() {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
    refreshUser,
  } = useAuth();

  const [mode, setMode] = useState<LoginMode>("selection");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

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

    setError("Google sign-in failed. Please try again.");
  }

  function handleCompanyClick() {
    navigate("/company/setup");
  }

  return (
    <div className="min-h-screen w-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to Screenly
          </h1>

          <p className="mt-3 text-gray-500">
            AI-powered technical interviews for modern hiring.
          </p>
        </div>

        {/* Main card */}
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          {mode === "selection" ? (
            <>
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  How are you using Screenly?
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Choose how you want to continue.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("candidate");
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <div className="text-base font-semibold text-gray-900">
                    I'm a Candidate
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    Take a technical interview.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleCompanyClick}
                  className="w-full rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition hover:border-gray-400 hover:bg-gray-50"
                >
                  <div className="text-base font-semibold text-gray-900">
                    I'm a Company / Hiring Team
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    Hire candidates and manage interviews.
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("selection");
                }}
                className="mb-6 text-sm text-gray-500 hover:text-gray-900"
              >
                ← Back
              </button>

              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Candidate Sign-In
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Sign in with Google to continue.
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
            </>
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