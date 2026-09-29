import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

const BACKEND_URL = "http://localhost:3001";

type GoogleLoginResponse = {
  credential?: string;
};

export function CompanySetup() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [role, setRole] = useState("");

  const [showGoogleLogin, setShowGoogleLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }

    setError("");
    setShowGoogleLogin(true);
  }

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

      // First authenticate the Google user.
      const authResponse = await fetch(
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

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(
          authData.error || "Google authentication failed."
        );
      }

      // Now create the company for the authenticated user.
      const companyResponse = await fetch(
        `${BACKEND_URL}/api/v1/company/onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: companyName.trim(),
            website: website.trim() || null,
            role: role.trim() || null,
          }),
        }
      );

      const companyData = await companyResponse.json();

      if (!companyResponse.ok) {
        throw new Error(
          companyData.error || "Failed to create company."
        );
      }

      console.log(
        "Company created:",
        companyData.company
      );

      await refreshUser();

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Company onboarding error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to complete company setup."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    console.error("Google sign-in failed");
    setError("Google sign-in failed. Please try again.");
  }

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>

        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Set up your company
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Tell us a little about your company to get started
              with Screenly.
            </p>
          </div>

          {!showGoogleLogin ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="companyName"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Company name
                </label>

                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(event) =>
                    setCompanyName(event.target.value)
                  }
                  placeholder="Acme Technologies"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Company website
                  <span className="ml-1 text-gray-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) =>
                    setWebsite(event.target.value)
                  }
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Your role
                  <span className="ml-1 text-gray-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="role"
                  type="text"
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value)
                  }
                  placeholder="Founder, Recruiter, Engineering Manager..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Continue
              </button>
            </form>
          ) : (
            <div>
              <div className="mb-6 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">
                  {companyName}
                </p>

                {website && (
                  <p className="mt-1 text-sm text-gray-500">
                    {website}
                  </p>
                )}

                {role && (
                  <p className="mt-1 text-sm text-gray-500">
                    {role}
                  </p>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Continue with Google
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Sign in with Google to create your company
                  account.
                </p>
              </div>

              <div className="mt-7 flex justify-center">
                {loading ? (
                  <div className="flex h-10 items-center justify-center text-sm text-gray-500">
                    Setting up your company...
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

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setShowGoogleLogin(false);
                }}
                className="mt-5 w-full text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
              >
                ← Edit company details
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Screenly AI Interview Platform
        </p>
      </div>
    </div>
  );
}

export default CompanySetup;