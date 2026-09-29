import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

const BACKEND_URL = "http://localhost:3001";

type GoogleLoginResponse = {
  credential?: string;
};

export function CompanyLogin() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          data.error || "Google sign-in failed."
        );
      }

      await refreshUser();

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Company login error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError("Google sign-in failed. Please try again.");
  }

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <button
          type="button"
          onClick={() => navigate("/company")}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>

        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Company login
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Sign in to your existing Screenly company account.
            </p>
          </div>

          <div className="flex justify-center">
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
                text="signin_with"
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

          <button
            type="button"
            onClick={() => navigate("/company/setup")}
            disabled={loading}
            className="mt-6 w-full text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            Need to create a company?
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Screenly AI Interview Platform
        </p>
      </div>
    </div>
  );
}

export default CompanyLogin;