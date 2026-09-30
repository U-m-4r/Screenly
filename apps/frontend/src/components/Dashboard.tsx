import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

const BACKEND_URL = "http://localhost:3001";

type Company = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Candidate = {
  id: string;
  companyId: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [creatingInterview, setCreatingInterview] = useState<string | null>(
    null
  );
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCandidateName, setInviteCandidateName] = useState("");
  const [interviewError, setInterviewError] = useState("");

  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  const [companyError, setCompanyError] = useState("");
  const [candidateError, setCandidateError] = useState("");

  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");

  const [addingCandidate, setAddingCandidate] = useState(false);
  const [addCandidateError, setAddCandidateError] = useState("");

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  async function loadCompany() {
    try {
      setCompanyError("");

      const response = await fetch(`${BACKEND_URL}/api/v1/company`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load company");
      }

      setCompany(data.company);
    } catch (error) {
      console.error("Company fetch error:", error);

      setCompanyError(
        error instanceof Error
          ? error.message
          : "Failed to load company"
      );
    } finally {
      setLoadingCompany(false);
    }
  }

  async function loadCandidates() {
    try {
      setCandidateError("");

      const response = await fetch(
        `${BACKEND_URL}/api/v1/company/candidates`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load candidates"
        );
      }

      setCandidates(data.candidates);
    } catch (error) {
      console.error("Candidate fetch error:", error);

      setCandidateError(
        error instanceof Error
          ? error.message
          : "Failed to load candidates"
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  useEffect(() => {
    void loadCompany();
    void loadCandidates();
  }, []);

  async function handleAddCandidate(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!candidateEmail.trim()) {
      setAddCandidateError("Candidate email is required.");
      return;
    }

    try {
      setAddingCandidate(true);
      setAddCandidateError("");

      const response = await fetch(
        `${BACKEND_URL}/api/v1/company/candidates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: candidateName.trim() || null,
            email: candidateEmail.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to add candidate"
        );
      }

      setCandidates((current) => [
        data.candidate,
        ...current,
      ]);

      setCandidateName("");
      setCandidateEmail("");
      setShowAddCandidate(false);
    } catch (error) {
      console.error("Add candidate error:", error);

      setAddCandidateError(
        error instanceof Error
          ? error.message
          : "Failed to add candidate"
      );
    } finally {
      setAddingCandidate(false);
    }
  }

  async function handleCreateInterview(candidate: Candidate) {
    try {
      setCreatingInterview(candidate.id);
      setInterviewError("");
      setInviteUrl("");
      setInviteCandidateName("");

      const response = await fetch(
        `${BACKEND_URL}/api/v1/company/candidates/${candidate.id}/interview`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create interview"
        );
      }

      setInviteUrl(data.invite.url);
      setInviteCandidateName(
        candidate.name || candidate.email
      );
    } catch (error) {
      console.error("Create interview error:", error);

      setInterviewError(
        error instanceof Error
          ? error.message
          : "Failed to create interview"
      );
    } finally {
      setCreatingInterview(null);
    }
  }

  async function handleLogout() {
    try {
      setSigningOut(true);
      setError("");

      await logout();

      navigate("/", { replace: true });
    } catch {
      setError("Unable to sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
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
        {loadingCompany ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <p className="text-sm text-gray-500">
              Loading your company...
            </p>
          </div>
        ) : companyError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-semibold text-red-900">
              Unable to load company
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {companyError}
            </p>
          </div>
        ) : company ? (
          <>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Company Dashboard
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Welcome back
                {user?.name ? `, ${user.name}` : ""}
              </h2>

              <p className="mt-3 text-gray-500">
                Manage candidates and technical interviews for{" "}
                <span className="font-medium text-gray-700">
                  {company.name}
                </span>
                .
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                  Candidates
                </p>

                <p className="mt-3 text-3xl font-bold text-gray-900">
                  {candidates.length}
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Candidates added to your company
                </p>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                  Interviews
                </p>

                <p className="mt-3 text-3xl font-bold text-gray-900">
                  0
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Interviews created
                </p>
              </div>
            </div>

            {interviewError && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {interviewError}
              </div>
            )}

            <div className="mt-8 rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-6 py-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Candidates
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Manage candidates for your company.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAddCandidateError("");
                    setShowAddCandidate(true);
                  }}
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  + Add Candidate
                </button>
              </div>

              {loadingCandidates ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-500">
                    Loading candidates...
                  </p>
                </div>
              ) : candidateError ? (
                <div className="px-6 py-8">
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {candidateError}
                  </div>
                </div>
              ) : candidates.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-gray-900">
                    No candidates yet
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Add your first candidate to get started.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setAddCandidateError("");
                      setShowAddCandidate(true);
                    }}
                    className="mt-5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    + Add Candidate
                  </button>
                </div>
              ) : (
                <div className="divide-y">
                  {candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between gap-6 px-6 py-5"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {candidate.name || "Unnamed candidate"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {candidate.email}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleCreateInterview(candidate)
                        }
                        disabled={
                          creatingInterview === candidate.id
                        }
                        className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {creatingInterview === candidate.id
                          ? "Creating..."
                          : "Create Interview"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </main>

      {showAddCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Candidate
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Add a candidate to your company.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!addingCandidate) {
                    setShowAddCandidate(false);
                  }
                }}
                className="text-xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleAddCandidate}
              className="mt-6 space-y-5"
            >
              <div>
                <label
                  htmlFor="candidateName"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Candidate name
                </label>

                <input
                  id="candidateName"
                  type="text"
                  value={candidateName}
                  onChange={(event) =>
                    setCandidateName(event.target.value)
                  }
                  placeholder="John Doe"
                  disabled={addingCandidate}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label
                  htmlFor="candidateEmail"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Candidate email
                </label>

                <input
                  id="candidateEmail"
                  type="email"
                  value={candidateEmail}
                  onChange={(event) =>
                    setCandidateEmail(event.target.value)
                  }
                  placeholder="john@example.com"
                  disabled={addingCandidate}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-50"
                />
              </div>

              {addCandidateError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {addCandidateError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!addingCandidate) {
                      setShowAddCandidate(false);
                    }
                  }}
                  disabled={addingCandidate}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addingCandidate}
                  className="rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingCandidate
                    ? "Adding..."
                    : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inviteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900">
              Interview Created
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Your interview for{" "}
              <span className="font-medium text-gray-700">
                {inviteCandidateName}
              </span>{" "}
              is ready.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Candidate invite link
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none"
                />

                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteUrl);
                  }}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Copy
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              This link expires in 7 days.
            </p>

            <button
              type="button"
              onClick={() => {
                setInviteUrl("");
                setInviteCandidateName("");
              }}
              className="mt-6 w-full rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;