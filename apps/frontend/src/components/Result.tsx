import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";

const BACKEND_URL = "http://localhost:3001";

type CategoryScores = {
  technicalKnowledge: number;
  problemSolving: number;
  projectUnderstanding: number;
  communication: number;
  depth: number;
  adaptability: number;
};

type Conversation = {
  id: string;
  message: string;
  type: "User" | "Assistant";
  createdAt: string;
};

type InterviewResult = {
  id: string;
  status: string;
  score: number;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  categories: CategoryScores | null;
  topics: string[] | null;
  conversations: Conversation[];
};

const categoryLabels: Record<keyof CategoryScores, string> = {
  technicalKnowledge: "Technical Knowledge",
  problemSolving: "Problem Solving",
  projectUnderstanding: "Project Understanding",
  communication: "Communication",
  depth: "Depth",
  adaptability: "Adaptability",
};

export function Result() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [result, setResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResult() {
      try {
        if (!id) {
          throw new Error("Missing interview ID");
        }

        const response = await fetch(
          `${BACKEND_URL}/api/v1/results/${id}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load result: ${response.status}`
          );
        }

        const data = await response.json();

        setResult(data);
      } catch (error) {
        console.error("Failed to load interview result:", error);

        setError(
          "We couldn't load the interview results."
        );
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          Loading interview results...
        </p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">
          Results unavailable
        </h1>

        <p className="text-gray-500">
          {error || "No interview result was found."}
        </p>

        <button
          onClick={() => navigate("/")}
          className="rounded-md border px-4 py-2"
        >
          Start New Interview
        </button>
      </div>
    );
  }

  const categories = result.categories;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold">
            Interview Results
          </h1>

          <p className="mt-2 text-gray-500">
            Here's your Screenly technical interview evaluation.
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Interview ID: {result.id}
          </p>
        </div>

        {/* Overall Score */}
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center">

            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Overall Score
            </p>

            <div className="mt-4 flex h-40 w-40 items-center justify-center rounded-full border-8">
              <div className="text-center">
                <div className="text-5xl font-bold">
                  {result.score}
                </div>

                <div className="text-sm text-gray-500">
                  / 100
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Interview status:{" "}
              <span className="font-medium text-gray-900">
                {result.status}
              </span>
            </p>
          </div>
        </div>

        {/* Summary */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">
            Summary
          </h2>

          <p className="mt-4 leading-7 text-gray-600">
            {result.summary ||
              "No summary was generated for this interview."}
          </p>
        </section>

        {/* Category Scores */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">
            Category Scores
          </h2>

          <div className="mt-6 space-y-6">
            {categories ? (
              (
                Object.keys(categoryLabels) as Array<
                  keyof CategoryScores
                >
              ).map((category) => {
                const score = categories[category];

                return (
                  <div key={category}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">
                        {categoryLabels[category]}
                      </span>

                      <span className="font-semibold">
                        {score}/100
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-black transition-all"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, score)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">
                Category scores are unavailable.
              </p>
            )}
          </div>
        </section>

        {/* Strengths + Improvements */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* Strengths */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Strengths
            </h2>

            {result.strengths &&
            result.strengths.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {result.strengths.map(
                  (strength, index) => (
                    <li
                      key={index}
                      className="rounded-lg border p-3 text-gray-700"
                    >
                      {strength}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="mt-4 text-gray-500">
                No specific strengths were identified.
              </p>
            )}
          </section>

          {/* Improvements */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Areas for Improvement
            </h2>

            {result.improvements &&
            result.improvements.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {result.improvements.map(
                  (improvement, index) => (
                    <li
                      key={index}
                      className="rounded-lg border p-3 text-gray-700"
                    >
                      {improvement}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="mt-4 text-gray-500">
                No specific improvements were identified.
              </p>
            )}
          </section>

        </div>

        {/* Topics */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">
            Topics Discussed
          </h2>

          {result.topics &&
          result.topics.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.topics.map((topic, index) => (
                <span
                  key={index}
                  className="rounded-full border bg-gray-50 px-4 py-2 text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-500">
              No specific technical topics were identified.
            </p>
          )}
        </section>

        {/* Transcript */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">
            Interview Transcript
          </h2>

          <div className="mt-6 space-y-4">
            {result.conversations.length > 0 ? (
              result.conversations.map(
                (conversation) => (
                  <div
                    key={conversation.id}
                    className={`rounded-lg border p-4 ${
                      conversation.type === "User"
                        ? "ml-8 bg-gray-50"
                        : "mr-8 bg-white"
                    }`}
                  >
                    <div className="mb-2 text-sm font-semibold">
                      {conversation.type === "User"
                        ? "You"
                        : "Screenly"}
                    </div>

                    <p className="leading-7 text-gray-700">
                      {conversation.message}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="text-gray-500">
                No transcript is available.
              </p>
            )}
          </div>
        </section>

        {/* Bottom action */}
        <div className="flex justify-center pb-8">
          <button
            onClick={() => navigate("/")}
            className="rounded-md border bg-white px-6 py-3 font-medium shadow-sm"
          >
            Start New Interview
          </button>
        </div>

      </div>
    </div>
  );
}

export default Result;