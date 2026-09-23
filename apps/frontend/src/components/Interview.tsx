import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import {
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

  const socketRef =
    useRef<WebSocket | null>(null);

  const micRef =
    useRef<AgentMicrophone | null>(null);

  const playerRef =
    useRef<AgentPlayer | null>(null);

  const [status, setStatus] =
    useState("Ready");

  const [conversation, setConversation] =
    useState<ConversationMessage[]>([]);

  /*
  |--------------------------------------------------------------------------
  | Start interview
  |--------------------------------------------------------------------------
  */

  async function startInterview() {
    try {
      if (!id) {
        throw new Error(
          "Missing interview ID"
        );
      }

      setStatus("Connecting...");

      /*
      |--------------------------------------------------------------------------
      | Create audio player
      |--------------------------------------------------------------------------
      */

      const player = new AgentPlayer({
        sampleRate: 24000,
      });

      playerRef.current = player;

      /*
      |--------------------------------------------------------------------------
      | Browser -> Screenly Backend
      |--------------------------------------------------------------------------
      */

      const wsUrl =
        BACKEND_URL
          .replace("http://", "ws://")
          .replace("https://", "wss://") +
        `/ws/interview/${id}`;

      console.log(
        "Connecting to:",
        wsUrl
      );

      const socket =
        new WebSocket(wsUrl);

      /*
      |--------------------------------------------------------------------------
      | Receive binary audio as ArrayBuffer
      |--------------------------------------------------------------------------
      */

      socket.binaryType =
        "arraybuffer";

      socketRef.current = socket;

      /*
      |--------------------------------------------------------------------------
      | Backend connection opened
      |--------------------------------------------------------------------------
      */

      socket.onopen = () => {
        console.log(
          "Connected to Screenly backend"
        );

        setStatus(
          "Connected to backend"
        );
      };

      /*
      |--------------------------------------------------------------------------
      | Messages from backend
      |--------------------------------------------------------------------------
      */

      socket.onmessage = async (
        event
      ) => {
        /*
        |--------------------------------------------------------------------------
        | Binary message = Deepgram audio
        |--------------------------------------------------------------------------
        */

        if (
          event.data instanceof
          ArrayBuffer
        ) {
          player.queue(
            event.data
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | JSON message
        |--------------------------------------------------------------------------
        */

        const message =
          JSON.parse(
            event.data
          );

        console.log(
          "Backend event:",
          message
        );

        /*
        |--------------------------------------------------------------------------
        | Deepgram ready
        |--------------------------------------------------------------------------
        */

        if (
          message.type === "ready"
        ) {
          console.log(
            "Deepgram is ready"
          );

          /*
          |--------------------------------------------------------------------------
          | Start microphone
          |--------------------------------------------------------------------------
          */

          const mic =
            new AgentMicrophone(
              (data) => {
                if (
                  socket.readyState ===
                  WebSocket.OPEN
                ) {
                  /*
                  |--------------------------------------------------------------------------
                  | IMPORTANT:
                  |
                  | Send ONLY raw microphone audio.
                  |
                  | No transcript is sent.
                  |--------------------------------------------------------------------------
                  */

                  socket.send(data);
                }
              },
              {
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            );

          micRef.current = mic;

          await mic.start();

          setStatus("Listening");

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Conversation text
        |--------------------------------------------------------------------------
        |
        | This came from:
        |
        | Deepgram -> Backend -> Browser
        |
        | The backend has already saved it to Prisma.
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "conversation-text"
        ) {
          setConversation(
            (previous) => [
              ...previous,
              {
                role:
                  message.role,
                content:
                  message.content,
              },
            ]
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Candidate started speaking
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "user-started-speaking"
        ) {
          player.interrupt();

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | AI thinking
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "agent-thinking"
        ) {
          setStatus("Thinking...");

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | AI finished speaking
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "agent-audio-done"
        ) {
          setStatus("Listening");

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Error
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "error"
        ) {
          console.error(
            "Interview error:",
            message.message
          );

          setStatus("Error");

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Deepgram disconnected
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "deepgram-disconnected"
        ) {
          setStatus(
            "Disconnected"
          );
        }
      };

      /*
      |--------------------------------------------------------------------------
      | Backend connection closed
      |--------------------------------------------------------------------------
      */

      socket.onclose = () => {
        console.log(
          "Disconnected from Screenly backend"
        );

        micRef.current?.stop();

        setStatus(
          "Disconnected"
        );
      };

      /*
      |--------------------------------------------------------------------------
      | WebSocket error
      |--------------------------------------------------------------------------
      */

      socket.onerror = (error) => {
        console.error(
          "Screenly WebSocket error:",
          error
        );

        setStatus("Error");
      };
    } catch (error) {
      console.error(
        "Failed to start interview:",
        error
      );

      micRef.current?.stop();
      socketRef.current?.close();
      playerRef.current?.dispose();

      micRef.current = null;
      socketRef.current = null;
      playerRef.current = null;

      setStatus(
        "Failed to connect"
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Stop interview
  |--------------------------------------------------------------------------
  */

  function stopInterview() {
    /*
    |--------------------------------------------------------------------------
    | Tell backend to end the interview
    |--------------------------------------------------------------------------
    */

    if (
      socketRef.current?.readyState ===
      WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "end",
        })
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Stop microphone
    |--------------------------------------------------------------------------
    */

    micRef.current?.stop();

    /*
    |--------------------------------------------------------------------------
    | Close browser -> backend connection
    |--------------------------------------------------------------------------
    */

    socketRef.current?.close();

    /*
    |--------------------------------------------------------------------------
    | Dispose player
    |--------------------------------------------------------------------------
    */

    playerRef.current?.dispose();

    micRef.current = null;
    socketRef.current = null;
    playerRef.current = null;

    setStatus("Stopped");
  }

  /*
  |--------------------------------------------------------------------------
  | Cleanup when leaving page
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      micRef.current?.stop();

      socketRef.current?.close();

      playerRef.current?.dispose();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen w-screen flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold">
        Screenly AI Interview
      </h1>

      <p className="mt-2 text-gray-500">
        Interview ID: {id}
      </p>

      <p className="mt-4">
        Status:{" "}
        <strong>{status}</strong>
      </p>

      <div className="mt-6 flex gap-4">
        <button
          onClick={startInterview}
          disabled={
            status ===
              "Connecting..." ||
            status ===
              "Connected to backend" ||
            status ===
              "Listening" ||
            status ===
              "Thinking..."
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
          {conversation.map(
            (message, index) => (
              <div
                key={index}
                className="rounded-md border p-3"
              >
                <strong>
                  {message.role}:
                </strong>{" "}
                {message.content}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}