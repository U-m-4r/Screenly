import Groq from "groq-sdk";

type EvaluationInput = {
  githubMetadata: unknown;
  transcript: {
    type: "User" | "Assistant";
    message: string;
  }[];
};

export type InterviewEvaluation = {
  score: number;
  categories: {
    technicalKnowledge: number;
    problemSolving: number;
    projectUnderstanding: number;
    communication: number;
    depth: number;
    adaptability: number;
  };
  summary: string;
  strengths: string[];
  improvements: string[];
  topics: string[];
};

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const evaluationSchema = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Overall technical interview score from 0 to 100.",
    },

    categories: {
      type: "object",
      properties: {
        technicalKnowledge: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description: "Understanding of software engineering concepts.",
        },

        problemSolving: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description:
            "Ability to reason through technical problems.",
        },

        projectUnderstanding: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description:
            "Depth of understanding of projects and technologies the candidate discusses.",
        },

        communication: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description:
            "Clarity, organization, and precision when explaining technical ideas.",
        },

        depth: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description:
            "Ability to go beyond surface-level technical knowledge.",
        },

        adaptability: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description:
            "Ability to handle follow-ups, changes in topic, uncertainty, and correction.",
        },
      },

      required: [
        "technicalKnowledge",
        "problemSolving",
        "projectUnderstanding",
        "communication",
        "depth",
        "adaptability",
      ],

      additionalProperties: false,
    },

    summary: {
      type: "string",
      description:
        "A concise overall assessment of the candidate's technical interview performance.",
    },

    strengths: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Three or fewer concrete strengths demonstrated during the interview.",
    },

    improvements: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Three or fewer concrete areas the candidate could improve.",
    },

    topics: {
      type: "array",
      items: {
        type: "string",
      },
      description:
        "Technical topics that were meaningfully discussed during the interview.",
    },
  },

  required: [
    "score",
    "categories",
    "summary",
    "strengths",
    "improvements",
    "topics",
  ],

  additionalProperties: false,
};

export async function evaluateInterview(
  input: EvaluationInput
): Promise<InterviewEvaluation> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const githubRepositories = Array.isArray(input.githubMetadata)
    ? input.githubMetadata.slice(0, 10).map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        topics: repo.topics,
      }))
    : [];

  const transcript = input.transcript
    .map(
      (turn) =>
        `${turn.type.toUpperCase()}: ${turn.message}`
    )
    .join("\n\n");

  const prompt = `
You are the evaluation engine for Screenly, an AI technical interview platform.

Evaluate the candidate based ONLY on the evidence contained in the interview transcript.

Do not infer skills that the candidate did not demonstrate.

Do not evaluate individual answers separately.
Instead, evaluate the candidate's overall performance across the complete interview.

The candidate's GitHub projects are provided as context. Use them to understand the technical areas discussed, but do not assume the candidate personally implemented every part of a project merely because it appears in their GitHub information.

IMPORTANT SCORING RULES:

- Score every category from 0 to 100.
- Be evidence-based.
- A candidate saying "I don't know" should not automatically receive a zero overall.
- A candidate who refuses to answer a question should not be treated as demonstrating knowledge of that topic.
- Do not reward claims that are unsupported by the conversation.
- Do not penalize the candidate merely for declining a particular question.
- Do not evaluate accent, appearance, personality, or unrelated personal characteristics.
- Communication means technical clarity and organization, not native-level English fluency.
- Adaptability means how effectively the candidate handles changes, follow-ups, uncertainty, corrections, and new technical areas.
- Project Understanding specifically measures whether the candidate demonstrates genuine understanding of the projects they discuss.
- Depth measures whether the candidate can explain implementation details, reasoning, tradeoffs, and underlying concepts beyond surface-level statements.

CATEGORY DEFINITIONS:

1. Technical Knowledge
Understanding of relevant software engineering concepts, technologies, and principles.

2. Problem Solving
Ability to reason through technical problems, decompose them, consider approaches, and explain tradeoffs.

3. Project Understanding
Understanding of the candidate's own projects, architecture, implementation, technologies, and design decisions.

4. Communication
Clarity, structure, precision, and effectiveness when explaining technical ideas.

5. Depth
Ability to move beyond high-level statements into implementation details, reasoning, and tradeoffs.

6. Adaptability
Ability to respond constructively to follow-up questions, changes in topic, uncertainty, corrections, and new technical areas.

OVERALL SCORE:

Calculate the overall score using these weights:

Technical Knowledge: 20%
Problem Solving: 20%
Project Understanding: 20%
Communication: 15%
Depth: 15%
Adaptability: 10%

The overall score should be consistent with the weighted category scores.

GITHUB PROJECT CONTEXT:

${JSON.stringify(githubRepositories, null, 2)}

INTERVIEW TRANSCRIPT:

${transcript}

Return a complete evaluation object.

You MUST provide ALL of these fields:

- score
- categories
- summary
- strengths
- improvements
- topics

Do not omit any field.

The following fields are required arrays:
- strengths
- improvements
- topics

Even if the interview contains very little evidence, still provide all required fields.

For example, if there is insufficient evidence:

- summary should explain that the interview contained insufficient evidence.
- strengths should be an empty array.
- improvements should be an empty array.
- topics should be an empty array.

Return ONLY the JSON object. Do not include markdown or explanatory text.
`;

  console.log("Starting Groq evaluation...");

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",

    messages: [
      {
        role: "system",
        content:
          "You are a technical interview evaluation engine. Return only the requested structured evaluation.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],

    response_format: {
      type: "json_schema",
      json_schema: {
        name: "interview_evaluation",
        strict: true,
        schema: evaluationSchema,
      },
    },

    reasoning_effort: "low",
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty evaluation");
  }

  console.log("Groq evaluation response:", content);

const evaluation = JSON.parse(content) as InterviewEvaluation;

if (
  typeof evaluation.score !== "number" ||
  !evaluation.categories ||
  typeof evaluation.summary !== "string" ||
  !Array.isArray(evaluation.strengths) ||
  !Array.isArray(evaluation.improvements) ||
  !Array.isArray(evaluation.topics)
) {
  throw new Error(
    "Groq returned an incomplete evaluation object"
  );
}

return evaluation;
}