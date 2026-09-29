import { useNavigate } from "react-router";

export function CompanyChoice() {
  const navigate = useNavigate();

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
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Welcome to Screenly
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              How would you like to continue?
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={() => navigate("/company/setup")}
              className="w-full rounded-lg bg-gray-900 px-5 py-4 text-left text-white transition hover:bg-gray-800"
            >
              <div className="font-semibold">
                Create a new company
              </div>

              <div className="mt-1 text-sm text-gray-300">
                Set up your company and start hiring with Screenly.
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/company/login")}
              className="w-full rounded-lg border border-gray-300 bg-white px-5 py-4 text-left text-gray-900 transition hover:bg-gray-50"
            >
              <div className="font-semibold">
                Already registered?
              </div>

              <div className="mt-1 text-sm text-gray-500">
                Sign in to your existing company account.
              </div>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Screenly AI Interview Platform
        </p>
      </div>
    </div>
  );
}

export default CompanyChoice;