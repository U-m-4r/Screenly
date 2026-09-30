import { useNavigate } from "react-router";

export function SignIn() {
  const navigate = useNavigate();

  function handleCandidateClick() {
    navigate("/candidate/login");
  }

  function handleCompanyClick() {
    navigate("/company");
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
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              How are you using Screenly?
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Choose how you want to continue.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {/* Candidate */}
            <button
              type="button"
              onClick={handleCandidateClick}
              className="w-full rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition hover:border-gray-400 hover:bg-gray-50"
            >
              <div className="text-base font-semibold text-gray-900">
                I'm a Candidate
              </div>

              <div className="mt-1 text-sm text-gray-500">
                Take a technical interview.
              </div>
            </button>

            {/* Company */}
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