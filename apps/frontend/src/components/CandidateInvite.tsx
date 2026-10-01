import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate, useParams } from "react-router";
import { BACKEND_URL } from "../lib/config";
import { useAuth } from "./AuthProvider";

type InviteData = {
  invite: {
    id: string;
    candidateEmail: string;
    expiresAt: string;
  };
  interview: {
    id: string;
    status: string;
  };
  candidate: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  company: {
    id: string;
    name: string;
  } | null;
};

export function CandidateInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError("Invalid interview invite.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/v1/candidate/invite/${token}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load interview invite.");
        }

        setInvite(data);
      } catch (error) {
        console.error("Invite loading error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load interview invite."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadInvite();
  }, [token]);

  async function handleGoogleSuccess(credential: string) {
    if (!token) {
      setError("Invalid interview invite.");
      return;
    }

    setAuthenticating(true);
    setError("");

    try {
      // 1. Authenticate with Google
      const authResponse = await fetch(
        `${BACKEND_URL}/api/v1/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            credential,
          }),
        }
      );

      const authData = await authResponse.json();

      if (!authResponse.ok) {
        throw new Error(
          authData.error || "Google authentication failed."
        );
      }

      // 2. Refresh the frontend session
      await refreshUser();

      // 3. Accept the invite and verify the Google email
      const acceptResponse = await fetch(
        `${BACKEND_URL}/api/v1/candidate/invite/${token}/accept`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const acceptData = await acceptResponse.json();

      if (!acceptResponse.ok) {
        throw new Error(
          acceptData.error || "Unable to accept interview invite."
        );
      }

      // 4. Go to the existing interview's setup page
      navigate(
        `/setup?interviewId=${acceptData.interviewId}`,
        { replace: true }
      );
    } catch (error) {
      console.error("Candidate authentication error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google."
      );
    } finally {
      setAuthenticating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">
          Loading your interview invite...
        </p>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">
            Interview invite unavailable
          </h1>

          <p className="mt-3 text-gray-600">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  const expiresAt = new Date(
    invite.invite.expiresAt
  ).toLocaleDateString();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl">👋</span>
          </div>

          <h1 className="mt-5 text-2xl font-bold text-gray-900">
            You've been invited to an interview
          </h1>

          <p className="mt-2 text-gray-600">
            {invite.company?.name ?? "A company"} has invited you
            to complete a technical interview.
          </p>
        </div>

        <div className="mt-8 space-y-4 rounded-xl bg-gray-50 p-5">
          <div>
            <p className="text-sm text-gray-500">
              Candidate
            </p>

            <p className="font-medium text-gray-900">
              {invite.candidate?.name ||
                invite.candidate?.email ||
                invite.invite.candidateEmail}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Email
            </p>

            <p className="font-medium text-gray-900">
              {invite.invite.candidateEmail}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Invite expires
            </p>

            <p className="font-medium text-gray-900">
              {expiresAt}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8">
          {authenticating ? (
            <div className="flex justify-center">
              <p className="text-sm text-gray-500">
                Signing you in...
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(response) => {
                  if (!response.credential) {
                    setError(
                      "Google did not return a valid credential."
                    );
                    return;
                  }

                  void handleGoogleSuccess(response.credential);
                }}
                onError={() => {
                  setError(
                    "Google sign-in failed. Please try again."
                  );
                }}
                text="continue_with"
                shape="rectangular"
                size="large"
              />
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Sign in with the Google account associated with the
          invitation email.
        </p>

        <p className="mt-6 text-center text-xs text-gray-400">
          After signing in, you'll provide your GitHub and LinkedIn
          profiles before starting the interview.
        </p>
      </div>
    </div>
  );
}