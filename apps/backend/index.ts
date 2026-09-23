import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { DeepgramClient } from "@deepgram/sdk";

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
| Browser -> Screenly Backend -> Deepgram
|--------------------------------------------------------------------------
|
| Browser sends ONLY:
|
|   1. microphone audio
|   2. "end" control message
|
| Browser does NOT send transcripts.
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

    const pathParts = url.pathname.split("/");

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

    const interview = await prisma.interview.findUnique({
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
        |--------------------------------------------------------------------------
        | Ignore non-object messages
        |--------------------------------------------------------------------------
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
          |--------------------------------------------------------------------------
          | Configure Deepgram Voice Agent
          |--------------------------------------------------------------------------
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

                prompt: buildInterviewPrompt(
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

        if (data.type === "SettingsApplied") {
          deepgramReady = true;

          console.log(
            `Deepgram settings applied for ${interviewId}`
          );

          /*
          |--------------------------------------------------------------------------
          | Tell browser it can start microphone
          |--------------------------------------------------------------------------
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
        | The browser did NOT provide it.
        |
        |--------------------------------------------------------------------------
        */

        if (data.type === "ConversationText") {
          console.log(
            `${data.role}: ${data.content}`
          );

          /*
          |--------------------------------------------------------------------------
          | Save authoritative transcript
          |--------------------------------------------------------------------------
          */

          if (interviewId) {
            await prisma.message.create({
              data: {
                message: data.content,

                type:
                  data.role === "user"
                    ? "User"
                    : "Assistant",

                interviewId,
              },
            });
          }

          /*
          |--------------------------------------------------------------------------
          | Forward transcript to browser
          |--------------------------------------------------------------------------
          |
          | This is ONLY for UI.
          |
          | The browser cannot modify the database record.
          |
          |--------------------------------------------------------------------------
          */

          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type: "conversation-text",
                role: data.role,
                content: data.content,
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | History
        |--------------------------------------------------------------------------
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
          data.type === "UserStartedSpeaking"
        ) {
          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type: "user-started-speaking",
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

        if (data.type === "AgentThinking") {
          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type: "agent-thinking",
              })
            );
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Agent audio finished
        |--------------------------------------------------------------------------
        */

        if (
          data.type === "AgentAudioDone"
        ) {
          if (
            browserSocket.readyState ===
            WebSocket.OPEN
          ) {
            browserSocket.send(
              JSON.stringify({
                type: "agent-audio-done",
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

        if (data.type === "Warning") {
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
            browserSocket.send(audioBuffer);
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
              |--------------------------------------------------------------------------
              | Mark interview done
              |--------------------------------------------------------------------------
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
              |--------------------------------------------------------------------------
              | Close Deepgram
              |--------------------------------------------------------------------------
              */

              deepgramConnection?.close();

              /*
              |--------------------------------------------------------------------------
              | Close browser connection
              |--------------------------------------------------------------------------
              */

              browserSocket.close();

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