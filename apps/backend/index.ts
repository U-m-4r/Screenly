import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { DeepgramClient } from "@deepgram/sdk";

import { evaluateInterview } from "./evaluator";
import { PreInterviewRequestSchema } from "./types";
import { prisma } from "./db";

const app = express();

app.use(cors());
app.use(express.json());

const server = createServer(app);

const wss = new WebSocketServer({
  server,
});

const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY,
});

/*
|--------------------------------------------------------------------------
| Build the Screenly interview prompt
|--------------------------------------------------------------------------
*/

function buildInterviewPrompt(githubMetadata: unknown) {
  const repositories = Array.isArray(githubMetadata)
    ? githubMetadata
    : [];

  const candidateProjects = repositories
    .slice(0, 10)
    .map((repo: any) => ({
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      topics: repo.topics,
      url: repo.html_url,
    }));

  return `
You are Screenly, an AI technical interviewer conducting a software engineering interview.

Your job is to conduct a structured technical interview.

General rules:
- Be professional, friendly, and conversational.
- Ask one question at a time.
- Keep spoken responses concise.
- Do not use markdown.
- Give the candidate enough time to answer.
- Do not interrupt the candidate.
- Do not give away answers to technical questions.
- Ask useful follow-up questions based on the candidate's answers.
- Evaluate the candidate based only on what they actually demonstrate.
- Do not assume skills that the candidate has not demonstrated.

Interview flow:
1. Briefly introduce yourself as the Screenly AI interviewer.
2. Ask the candidate to briefly introduce themselves.
3. Ask technical questions appropriate for a software engineering interview.
4. Ask useful follow-up questions based on their answers.
5. Discuss the candidate's projects and technical experience.
6. Gradually increase the difficulty of the questions.
7. At the end, thank the candidate and end the interview.

Candidate's GitHub projects:

${JSON.stringify(candidateProjects, null, 2)}

Use these projects as context when asking relevant questions.
Do not simply read the project data back to the candidate.
Ask questions that test whether the candidate actually understands the technologies and projects they claim experience with.

This is a technical interview, not a casual conversation.
`;
}

/*
|--------------------------------------------------------------------------
| Pre-interview
|--------------------------------------------------------------------------
*/

app.post("/api/v1/pre-interview", async (req, res) => {
  try {
    const { success, data } =
      PreInterviewRequestSchema.safeParse(req.body);

    if (!success) {
      return res.status(411).json({
        error: "Incorrect request body",
      });
    }

    const githubUrl = data.github.endsWith("/")
      ? data.github.slice(0, -1)
      : data.github;

    const linkedinUrl = data.linkedin.endsWith("/")
      ? data.linkedin.slice(0, -1)
      : data.linkedin;

    const githubUsername = githubUrl.split("/").pop();
    const linkedinUsername = linkedinUrl.split("/").pop();

    console.log("GitHub username:", githubUsername);
    console.log("LinkedIn username:", linkedinUsername);

    const userRepos = await axios.get(
      `https://api.github.com/users/${githubUsername}/repos`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2026-03-10",
        },
      }
    );

    const interview = await prisma.interview.create({
      data: {
        githubMetadata: userRepos.data,
        status: "Pre",
      },
    });

    return res.json({
      interviewId: interview.id,
    });
  } catch (error) {
    console.error("Pre-interview error:", error);

    return res.status(500).json({
      error: "Failed to create interview",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Results API
|--------------------------------------------------------------------------
|
| The browser can retrieve a completed result.
|
| The browser does NOT provide the score or evaluation.
| Everything comes from PostgreSQL.
|
*/

app.get("/api/v1/results/:id", async (req, res) => {
  try {
    const interviewId = req.params.id;

    const interview = await prisma.interview.findUnique({
      where: {
        id: interviewId,
      },
      select: {
        id: true,
        status: true,
        score: true,
        summary: true,
        strengths: true,
        improvements: true,
        categories: true,
        topics: true,
        conversations: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            message: true,
            type: true,
          },
        },
      },
    });

    if (!interview) {
      return res.status(404).json({
        error: "Interview not found",
      });
    }

    return res.json({
      interviewId: interview.id,
      status: interview.status,
      score: interview.score,
      summary: interview.summary,
      strengths: interview.strengths,
      improvements: interview.improvements,
      categories: interview.categories,
      topics: interview.topics,
      conversations: interview.conversations,
    });
  } catch (error) {
    console.error("Result fetch error:", error);

    return res.status(500).json({
      error: "Failed to fetch interview result",
    });
  }
});

/*
|--------------------------------------------------------------------------
| Browser -> Screenly Backend -> Deepgram
|--------------------------------------------------------------------------
|
| Browser sends ONLY:
|
|   1. microphone audio
|   2. "end" control message
|
| Browser does NOT send transcripts.
| Browser does NOT send evaluation data.
|
|--------------------------------------------------------------------------
*/

wss.on("connection", async (browserSocket, request) => {
  let deepgramConnection: Awaited<
    ReturnType<typeof deepgram.agent.v1.connect>
  > | null = null;

  let interviewId: string | null = null;
  let interviewEnded = false;
  let deepgramReady = false;

  type TurnRole = "User" | "Assistant";

  let currentTurnRole: TurnRole | null = null;
  let currentTurnParts: string[] = [];

  /*
  Database writes are serialized so transcript order
  is preserved.
  */
  let messageWriteQueue = Promise.resolve();

  /*
  |--------------------------------------------------------------------------
  | Flush current conversational turn
  |--------------------------------------------------------------------------
  */

  function flushCurrentTurn() {
    if (
      !currentTurnRole ||
      currentTurnParts.length === 0
    ) {
      return null;
    }

    const message = currentTurnParts
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const turn = {
      type: currentTurnRole,
      message,
    };

    currentTurnRole = null;
    currentTurnParts = [];

    return turn;
  }

  /*
  |--------------------------------------------------------------------------
  | Queue transcript database write
  |--------------------------------------------------------------------------
  */

  function queueMessageWrite(
    turn: {
      type: TurnRole;
      message: string;
    }
  ) {
    if (!interviewId) {
      return;
    }

    const id = interviewId;

    messageWriteQueue =
      messageWriteQueue
        .then(async () => {
          await prisma.message.create({
            data: {
              message: turn.message,
              type: turn.type,
              interviewId: id,
            },
          });
        })
        .catch((error) => {
          console.error(
            "Failed to save transcript turn:",
            error
          );
        });
  }

  /*
  |--------------------------------------------------------------------------
  | Send completed turn to browser
  |--------------------------------------------------------------------------
  */

  function sendTurnToBrowser(
    turn: {
      type: TurnRole;
      message: string;
    }
  ) {
    if (
      browserSocket.readyState !==
      WebSocket.OPEN
    ) {
      return;
    }

    browserSocket.send(
      JSON.stringify({
        type: "conversation-turn",
        role:
          turn.type === "User"
            ? "user"
            : "assistant",
        content: turn.message,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Evaluate completed interview
  |--------------------------------------------------------------------------
  */

  async function evaluateCompletedInterview() {
    if (!interviewId) {
      throw new Error(
        "Cannot evaluate interview without interview ID"
      );
    }

    console.log(
      `Starting evaluation for interview ${interviewId}`
    );

    /*
    Load the authoritative transcript from PostgreSQL.
    */

    const interview =
      await prisma.interview.findUnique({
        where: {
          id: interviewId,
        },
        include: {
          conversations: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

    if (!interview) {
      throw new Error(
        "Interview not found during evaluation"
      );
    }

    /*
    Convert Prisma messages into the evaluator format.
    */

    const transcript =
      interview.conversations.map(
        (message) => ({
          type: message.type,
          message: message.message,
        })
      );

    if (transcript.length === 0) {
      throw new Error(
        "Cannot evaluate an interview with no transcript"
      );
    }

    /*
    Ask Gemini to evaluate the complete interview.
    */

    const evaluation =
      await evaluateInterview({
        githubMetadata:
          interview.githubMetadata,
        transcript,
      });

    console.log(
      `Evaluation completed for interview ${interviewId}`
    );

    /*
    Save the evaluation to PostgreSQL.
    */

    await prisma.interview.update({
      where: {
        id: interviewId,
      },

      data: {
        score: evaluation.score,

        categories:
          evaluation.categories,

        summary:
          evaluation.summary,

        strengths:
          evaluation.strengths,

        improvements:
          evaluation.improvements,

        topics:
          evaluation.topics,
      },
    });

    console.log(
      `Evaluation saved for interview ${interviewId}`
    );

    return evaluation;
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | Read interview ID from WebSocket URL
    |--------------------------------------------------------------------------
    |
    | Expected:
    |
    | /ws/interview/<interviewId>
    |
    */

    const url = new URL(
      request.url ?? "",
      `http://${request.headers.host}`
    );

    const pathParts =
      url.pathname.split("/");

    if (
      pathParts.length !== 4 ||
      pathParts[1] !== "ws" ||
      pathParts[2] !== "interview" ||
      !pathParts[3]
    ) {
      browserSocket.close(
        1008,
        "Invalid WebSocket path"
      );

      return;
    }

    interviewId = pathParts[3];

    console.log(
      `Browser connected for interview ${interviewId}`
    );

    /*
    |--------------------------------------------------------------------------
    | Load interview
    |--------------------------------------------------------------------------
    */

    const interview =
      await prisma.interview.findUnique({
        where: {
          id: interviewId,
        },
      });

    if (!interview) {
      browserSocket.close(
        1008,
        "Interview not found"
      );

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Mark interview as in progress
    |--------------------------------------------------------------------------
    */

    await prisma.interview.update({
      where: {
        id: interviewId,
      },

      data: {
        status: "InProgress",
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Connect BACKEND -> Deepgram
    |--------------------------------------------------------------------------
    */

    deepgramConnection =
      await deepgram.agent.v1.connect();

    /*
    |--------------------------------------------------------------------------
    | Deepgram messages
    |--------------------------------------------------------------------------
    */

    deepgramConnection.on(
      "message",
      async (data) => {
        /*
        Ignore non-object messages.
        */

        if (
          typeof data !== "object" ||
          data === null
        ) {
          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Welcome
        |--------------------------------------------------------------------------
        */

        if (data.type === "Welcome") {
          console.log(
            `Deepgram connected for interview ${interviewId}`
          );

          /*
          Configure Deepgram Voice Agent.
          */

          deepgramConnection?.sendSettings({
            type: "Settings",

            flags: {
              history: true,
            },

            audio: {
              input: {
                encoding: "linear16",
                sample_rate: 16000,
              },

              output: {
                encoding: "linear16",
                sample_rate: 24000,
                container: "none",
              },
            },

            agent: {
              listen: {
                provider: {
                  type: "deepgram",
                  version: "v2",
                  model: "flux-general-en",
                },
              },

              think: {
                provider: {
                  type: "google",
                  model: "gemini-3.1-flash-lite",
                },

                prompt:
                  buildInterviewPrompt(
                    interview.githubMetadata
                  ),
              },

              speak: {
                provider: {
                  type: "deepgram",
                  version: "v2",
                  model: "flux-kit-en",
                },
              },

              greeting:
                "Hi! Welcome to your Screenly interview. I'm your AI interviewer. Let's get started. Could you briefly introduce yourself?",
            },
          });

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Settings applied
        |--------------------------------------------------------------------------
        */

        if (
          data.type ===
          "SettingsApplied"
        ) {
          deepgramReady = true;

          console.log(
            `Deepgram settings applied for ${interviewId}`
          );

          /*
          Tell browser it can start microphone.
          */

          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type: "ready",
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | AUTHORITATIVE CONVERSATION
        |--------------------------------------------------------------------------
        |
        | This transcript came directly from Deepgram.
        |
        | We aggregate multiple ConversationText
        | events into complete conversational turns.
        |
        */

        if (
          data.type ===
          "ConversationText"
        ) {
          const role: TurnRole =
            data.role === "user"
              ? "User"
              : "Assistant";

          /*
          If the speaker changes, the previous
          speaker's turn is complete.
          */

          if (
            currentTurnRole &&
            currentTurnRole !== role
          ) {
            const completedTurn =
              flushCurrentTurn();

            if (completedTurn) {
              queueMessageWrite(
                completedTurn
              );

              sendTurnToBrowser(
                completedTurn
              );
            }
          }

          /*
          Start a new turn if necessary.
          */

          if (!currentTurnRole) {
            currentTurnRole = role;
          }

          /*
          Add this ConversationText chunk
          to the current turn.
          */

          currentTurnParts.push(
            data.content
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | History
        |--------------------------------------------------------------------------
        |
        | We do not use History for persistence.
        |
        | ConversationText is our authoritative
        | transcript stream.
        |
        */

        if (data.type === "History") {
          console.log(
            `Deepgram history received for ${interviewId}`
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | User started speaking
        |--------------------------------------------------------------------------
        */

        if (
          data.type ===
          "UserStartedSpeaking"
        ) {
          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type:
                  "user-started-speaking",
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Agent thinking
        |--------------------------------------------------------------------------
        */

        if (
          data.type ===
          "AgentThinking"
        ) {
          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type:
                  "agent-thinking",
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Agent audio finished
        |--------------------------------------------------------------------------
        |
        | This is the natural boundary for an
        | assistant conversational turn.
        |
        */

        if (
          data.type ===
          "AgentAudioDone"
        ) {
          /*
          Only flush here if the current turn
          belongs to the assistant.

          A user's turn is flushed when the
          assistant starts speaking.
          */

          if (
            currentTurnRole ===
            "Assistant"
          ) {
            const completedTurn =
              flushCurrentTurn();

            if (completedTurn) {
              queueMessageWrite(
                completedTurn
              );

              sendTurnToBrowser(
                completedTurn
              );
            }
          }

          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type:
                  "agent-audio-done",
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Deepgram error
        |--------------------------------------------------------------------------
        */

        if (data.type === "Error") {
          console.error(
            "Deepgram error:",
            data
          );

          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type: "error",
                message:
                  data.description ??
                  "Deepgram error",
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Deepgram warning
        |--------------------------------------------------------------------------
        */

        if (
          data.type === "Warning"
        ) {
          console.warn(
            "Deepgram warning:",
            data
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Audio from Deepgram
        |--------------------------------------------------------------------------
        */

        if (
          data instanceof Blob
        ) {
          const audioBuffer =
            Buffer.from(
              await data.arrayBuffer()
            );

          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              audioBuffer
            );
          }

          return;
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Deepgram opened
    |--------------------------------------------------------------------------
    */

    deepgramConnection.on(
      "open",
      () => {
        console.log(
          `Deepgram WebSocket opened for ${interviewId}`
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Deepgram closed
    |--------------------------------------------------------------------------
    */

    deepgramConnection.on(
      "close",
      () => {
        console.log(
          `Deepgram WebSocket closed for ${interviewId}`
        );

        if (
          browserSocket.readyState ===
          WebSocket.OPEN
        ) {
          browserSocket.send(
            JSON.stringify({
              type:
                "deepgram-disconnected",
            })
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Deepgram error
    |--------------------------------------------------------------------------
    */

    deepgramConnection.on(
      "error",
      (error) => {
        console.error(
          `Deepgram connection error for ${interviewId}:`,
          error
        );

        if (
          browserSocket.readyState ===
          WebSocket.OPEN
        ) {
          browserSocket.send(
            JSON.stringify({
              type: "error",
              message:
                "Deepgram connection error",
            })
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Open Deepgram connection
    |--------------------------------------------------------------------------
    */

    deepgramConnection.connect();

    await deepgramConnection.waitForOpen();

    /*
    |--------------------------------------------------------------------------
    | Browser messages
    |--------------------------------------------------------------------------
    */

    browserSocket.on(
      "message",
      async (data, isBinary) => {
        /*
        |--------------------------------------------------------------------------
        | Text messages
        |--------------------------------------------------------------------------
        */

        if (!isBinary) {
          try {
            const message =
              JSON.parse(
                data.toString()
              );

            /*
            |--------------------------------------------------------------------------
            | End interview
            |--------------------------------------------------------------------------
            */

            if (
              message.type === "end"
            ) {
              if (interviewEnded) {
                return;
              }

              interviewEnded = true;

              console.log(
                `Ending interview ${interviewId}`
              );

              /*
              Flush any remaining turn.

              This is particularly important if
              the candidate's final message was a
              user turn.
              */

              const finalTurn =
                flushCurrentTurn();

              if (finalTurn) {
                queueMessageWrite(
                  finalTurn
                );

                sendTurnToBrowser(
                  finalTurn
                );
              }

              /*
              Wait until every queued transcript
              write has reached PostgreSQL.
              */

              await messageWriteQueue;

              /*
              Mark interview as done BEFORE
              evaluation.
              */

              if (interviewId) {
                await prisma.interview.update(
                  {
                    where: {
                      id: interviewId,
                    },

                    data: {
                      status: "Done",
                    },
                  }
                );
              }

              /*
              Evaluate using the transcript
              stored in PostgreSQL.
              */

              try {
  await evaluateCompletedInterview();

  console.log(
    `Sending evaluation-complete to browser for interview ${interviewId}`
  );

  if (browserSocket.readyState === WebSocket.OPEN) {
    browserSocket.send(
      JSON.stringify({
        type: "evaluation-complete",
      })
    );
  }
} catch (evaluationError) {
  console.error(
    `Evaluation failed for interview ${interviewId}:`,
    evaluationError
  );

  if (browserSocket.readyState === WebSocket.OPEN) {
    browserSocket.send(
      JSON.stringify({
        type: "evaluation-error",
        message:
          "Interview ended, but evaluation could not be completed.",
      })
    );
  }
}

/*
|--------------------------------------------------------------------------
| Give the browser time to receive the completion event.
|--------------------------------------------------------------------------
*/

await new Promise((resolve) =>
  setTimeout(resolve, 500)
);

/*
|--------------------------------------------------------------------------
| Close Deepgram.
|--------------------------------------------------------------------------
*/

deepgramConnection?.close();

/*
|--------------------------------------------------------------------------
| Close browser connection.
|--------------------------------------------------------------------------
*/

if (browserSocket.readyState === WebSocket.OPEN) {
  browserSocket.close();
}

return;
            }
          } catch (error) {
            console.warn(
              "Invalid browser message:",
              error
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Binary audio
        |--------------------------------------------------------------------------
        |
        | Browser is allowed to send AUDIO only.
        |
        | No transcript is accepted here.
        |--------------------------------------------------------------------------
        */

        if (!deepgramReady) {
          return;
        }

        deepgramConnection?.sendMedia(
          Buffer.from(data as Buffer)
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Browser closed connection
    |--------------------------------------------------------------------------
    */

    browserSocket.on(
      "close",
      () => {
        console.log(
          `Browser disconnected for interview ${interviewId}`
        );

        if (!interviewEnded) {
          deepgramConnection?.close();
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Browser WebSocket error
    |--------------------------------------------------------------------------
    */

    browserSocket.on(
      "error",
      (error) => {
        console.error(
          `Browser WebSocket error for interview ${interviewId}:`,
          error
        );

        deepgramConnection?.close();
      }
    );
  } catch (error) {
    console.error(
      "Failed to establish interview:",
      error
    );

    deepgramConnection?.close();

    if (
      browserSocket.readyState ===
      WebSocket.OPEN
    ) {
      browserSocket.close(
        1011,
        "Failed to establish interview"
      );
    }
  }
});

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

server.listen(3001, () => {
  console.log(
    "Backend listening on http://localhost:3001"
  );
});