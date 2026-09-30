import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";
import { useState } from "react";

export function CandidateDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

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

        <div className="mt-10 rounded-xl border bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">
            No interviews yet
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            You don't currently have any interview invitations.
            When a company invites you to an interview, it will
            appear here.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

export default CandidateDashboard;