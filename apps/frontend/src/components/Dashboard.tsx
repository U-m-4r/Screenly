import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "./AuthProvider";

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [signingOut, setSigningOut] =
    useState(false);

  const [error, setError] = useState("");

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
              onClick={handleLogout}
              disabled={signingOut}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h2>

          <p className="mt-2 text-gray-500">
            Welcome back, {user?.name || "there"}.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl">
              +
            </div>

            <h3 className="text-xl font-semibold text-gray-900">
              Start an interview
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Launch the existing AI technical interview
              workflow.
            </p>

            <button
              onClick={() => navigate("/setup")}
              className="mt-7 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Create interview
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl">
              ✉
            </div>

            <h3 className="text-xl font-semibold text-gray-900">
              Candidate invitations
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Invite candidates by email or upload a CSV
              file. This feature is coming next.
            </p>

            <button
              disabled
              className="mt-7 cursor-not-allowed rounded-lg border px-5 py-3 text-sm text-gray-400"
            >
              Coming soon
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}