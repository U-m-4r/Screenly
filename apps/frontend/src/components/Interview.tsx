import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  AgentSession,
  AgentMicrophone,
  AgentPlayer,
} from "@deepgram/agents";

const BACKEND_URL = "http://localhost:3001";

type ConversationMessage = {
  role: string;
  content: string;
};

export function Interview() {
  const { id } = useParams();

  const sessionRef = useRef<AgentSession | null>(null);
  const micRef = useRef<AgentMicrophone | null>(null);
  const playerRef = useRef<AgentPlayer | null>(null);

  const [status, setStatus] = useState("Ready");
  const [conversation, setConversation] = useState<
    ConversationMessage[]
  >([]);

  async function getDeepgramToken() {
    const response = await fetch(
      `${BACKEND_URL}/api/deepgram-token`
    );

    if (!response.ok) {
      throw new Error("Failed to get Deepgram token");
    }

    return response.text();
  }

  async function startInterview() {
    try {
      setStatus("Connecting...");

      // Create the audio player.
      const player = new AgentPlayer({
        sampleRate: 24000,
      });

      playerRef.current = player;

      // Create the Deepgram Voice Agent session.
      const session = new AgentSession({
        auth: {
          tokenFactory: getDeepgramToken,
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

            prompt: `
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

Interview flow:
1. Briefly introduce yourself as the Screenly AI interviewer.
2. Ask the candidate to briefly introduce themselves.
3. Ask technical questions appropriate for a software engineering interview.
4. Ask follow-up questions when appropriate.
5. Discuss the candidate's projects and technical experience.
6. Gradually increase the difficulty of the questions.
7. At the end, thank the candidate and end the interview.

This is a technical interview, not a casual conversation.
            `,
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

        audio: {
          input: {
            encoding: "linear16",
            sampleRate: 16000,
          },

          output: {
            encoding: "linear16",
            sampleRate: 24000,
          },
        },
      });

      sessionRef.current = session;

      // Connection established.
      session.on("connected", () => {
        console.log("Deepgram connected");
        setStatus("Connected");
      });

      // Connection closed.
      session.on("disconnected", (reason) => {
        console.log("Deepgram disconnected:", reason);
        setStatus("Disconnected");
      });

      // Conversation text.
      session.on("conversation-text", (message) => {
        console.log(
          `${message.role}: ${message.content}`
        );

        setConversation((previous) => [
          ...previous,
          {
            role: message.role,
            content: message.content,
          },
        ]);
      });

      // AI audio received.
      session.on("audio", (chunk) => {
        player.queue(chunk);
      });

      // Candidate started speaking.
      // Stop any AI speech that is still playing.
      session.on("user-started-speaking", () => {
        player.interrupt();
      });

      // Server-side Deepgram error.
      session.on("error", (error) => {
        console.error("Deepgram error:", error);
        setStatus("Error");
      });

      // Client-side SDK error.
      session.on("sdk-error", (error) => {
        console.error("Deepgram SDK error:", error);
        setStatus("Error");
      });

      // Create microphone.
      const mic = new AgentMicrophone(
        (data) => {
          session.sendAudio(data);
        },
        {
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      );

      micRef.current = mic;

      // Connect WebSocket first.
      await session.connect();

      // Then request microphone permission and start streaming.
      await mic.start();

      setStatus("Listening");
    } catch (error) {
      console.error(
        "Failed to start interview:",
        error
      );

      setStatus("Failed to connect");

      // Clean up anything that was created before the error.
      micRef.current?.stop();
      sessionRef.current?.disconnect();
      playerRef.current?.dispose();

      micRef.current = null;
      sessionRef.current = null;
      playerRef.current = null;
    }
  }

  function stopInterview() {
    micRef.current?.stop();
    sessionRef.current?.disconnect();
    playerRef.current?.dispose();

    micRef.current = null;
    sessionRef.current = null;
    playerRef.current = null;

    setStatus("Stopped");
  }

  useEffect(() => {
    return () => {
      micRef.current?.stop();
      sessionRef.current?.disconnect();
      playerRef.current?.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen w-screen flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold">
        Screenly AI Interview
      </h1>

      <p className="mt-2 text-gray-500">
        Interview ID: {id}
      </p>

      <p className="mt-4">
        Status: <strong>{status}</strong>
      </p>

      <div className="mt-6 flex gap-4">
        <button
          onClick={startInterview}
          disabled={
            status === "Connecting..." ||
            status === "Connected" ||
            status === "Listening"
          }
          className="rounded-md border px-4 py-2"
        >
          Start Interview
        </button>

        <button
          onClick={stopInterview}
          className="rounded-md border px-4 py-2"
        >
          End Interview
        </button>
      </div>

      <div className="mt-8 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">
          Conversation
        </h2>

        <div className="space-y-3">
          {conversation.map((message, index) => (
            <div
              key={index}
              className="rounded-md border p-3"
            >
              <strong>{message.role}:</strong>{" "}
              {message.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}