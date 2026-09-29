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

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState("");

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCompany() {
      try {
        setCompanyError("");

        const response = await fetch(
          `${BACKEND_URL}/api/v1/company`,
          {
            credentials: "include",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load company"
          );
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

    void loadCompany();
  }, []);

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
      {/* Header */}
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
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
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
            {/* Welcome */}
            <div>
              <p className="text-sm font-medium text-gray-500">
                Company Dashboard
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Welcome back{user?.name ? `, ${user.name}` : ""}
              </h2>

              <p className="mt-3 text-gray-500">
                Manage candidates and technical interviews for{" "}
                <span className="font-medium text-gray-700">
                  {company.name}
                </span>
                .
              </p>
            </div>

            {/* Stats */}
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-500">
                  Candidates
                </p>

                <p className="mt-3 text-3xl font-bold text-gray-900">
                  0
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  Candidates invited to interview
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

            {/* Actions */}
            <div className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">
                Get started
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Add your first candidate and create an interview.
              </p>

              <button
                type="button"
                onClick={() => {
                  // We'll build this next.
                  console.log("Add candidate clicked");
                }}
                className="mt-6 rounded-lg bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                + Add Candidate
              </button>
            </div>
          </>
        ) : null}

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;