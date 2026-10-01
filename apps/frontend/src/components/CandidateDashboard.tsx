import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

const BACKEND_URL = "http://localhost:3001";

type CandidateInterview = {
  id: string;
  status: "Pre" | "InProgress" | "Done";
  score: number;
  company: {
    id: string;
    name: string;
  } | null;
  candidate: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export function CandidateDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [interviews, setInterviews] = useState<
    CandidateInterview[]
  >([]);

  const [loadingInterviews, setLoadingInterviews] =
    useState(true);

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function loadInterviews() {
    try {
      setLoadingInterviews(true);
      setError("");

      const response = await fetch(
        `${BACKEND_URL}/api/v1/candidate/interviews`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load interviews"
        );
      }

      setInterviews(data.interviews);
    } catch (error) {
      console.error(
        "Candidate interviews fetch error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load interviews"
      );
    } finally {
      setLoadingInterviews(false);
    }
  }

  useEffect(() => {
    void loadInterviews();
  }, []);

  async function handleLogout() {
    try {
      setSigningOut(true);
      setError("");

      await logout();

      navigate("/", {
        replace: true,
      });
    } catch {
      setError("Unable to sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  }

  function getStatusLabel(status: CandidateInterview["status"]) {
    switch (status) {
      case "Pre":
        return "Ready to start";

      case "InProgress":
        return "Interview in progress";

      case "Done":
        return "Completed";

      default:
        return status;
    }
  }

  function getStatusClass(
    status: CandidateInterview["status"]
  ) {
    switch (status) {
      case "Pre":
        return "bg-yellow-50 text-yellow-700";

      case "InProgress":
        return "bg-blue-50 text-blue-700";

      case "Done":
        return "bg-green-50 text-green-700";

      default:
        return "bg-gray-50 text-gray-700";
    }
  }

  function handleInterviewAction(
    interview: CandidateInterview
  ) {
    if (interview.status === "Done") {
      navigate(`/results/${interview.id}`);
      return;
    }

    if (interview.status === "InProgress") {
      navigate(`/interview/${interview.id}`);
      return;
    }

    navigate(`/setup?interviewId=${interview.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <h1 className="text-2xl font-bold text-gray-900">
            Screenly
          </h1>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-600 sm:block">
              {user?.name || user?.email}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div>
          <p className="text-sm font-medium text-gray-500">
            Candidate Dashboard
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            Welcome back
            {user?.name ? `, ${user.name}` : ""}
          </h2>

          <p className="mt-3 text-gray-500">
            Your company interview invitations will appear here.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="mt-10 rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Interviews
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Interviews you have been invited to complete.
            </p>
          </div>

          {loadingInterviews ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">
                Loading your interviews...
              </p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900">
                No interviews yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                You don't currently have any interview
                invitations. When a company invites you to an
                interview, it will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {interview.company?.name ||
                        "Company Interview"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Technical interview
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          interview.status
                        )}`}
                      >
                        {getStatusLabel(interview.status)}
                      </span>

                      {interview.status === "Done" && (
                        <span className="text-sm text-gray-500">
                          Score: {interview.score}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleInterviewAction(interview)
                    }
                    className="shrink-0 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                  >
                    {interview.status === "Done"
                      ? "View Results"
                      : interview.status === "InProgress"
                        ? "Continue Interview"
                        : "Start Setup"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CandidateDashboard;