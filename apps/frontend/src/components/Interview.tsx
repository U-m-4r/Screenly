import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AgentMicrophone,
  AgentPlayer,
} from "@deepgram/agents";

const BACKEND_URL = "http://localhost:3001";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export function Interview() {
  const { id } = useParams();

  const navigate = useNavigate();

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
          Start microphone.
          */

          const mic =
            new AgentMicrophone(
              (data) => {
                if (
                  socket.readyState ===
                  WebSocket.OPEN
                ) {
                  /*
                  IMPORTANT:

                  Send ONLY raw microphone
                  audio.

                  No transcript is sent
                  from the browser.
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
        | Complete conversational turn
        |--------------------------------------------------------------------------
        |
        | The backend has already aggregated
        | Deepgram ConversationText events.
        |
        */

        if (
          message.type ===
          "conversation-turn"
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
        | Evaluation complete
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "evaluation-complete"
        ) {
          console.log(
            "Interview evaluation complete"
          );

          setStatus(
            "Evaluation complete"
          );

          /*
          Give React/browser a moment to
          process the final state before
          navigating.
          */

          setTimeout(() => {
            navigate(
              `/results/${id}`
            );
          }, 200);

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Evaluation error
        |--------------------------------------------------------------------------
        */

        if (
          message.type ===
          "evaluation-error"
        ) {
          console.error(
            "Evaluation error:",
            message.message
          );

          setStatus(
            "Evaluation failed"
          );

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | General error
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
          /*
          Don't overwrite the evaluation
          state if evaluation has already
          completed.
          */

          if (
            status !==
            "Evaluation complete"
          ) {
            setStatus(
              "Disconnected"
            );
          }

          return;
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

        /*
        Don't replace the result transition
        state with "Disconnected".
        */

        setStatus(
          (currentStatus) =>
            currentStatus ===
              "Evaluation complete"
              ? currentStatus
              : "Disconnected"
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
    if (
      socketRef.current?.readyState ===
      WebSocket.OPEN
    ) {
      /*
      Tell backend to end the interview.

      IMPORTANT:

      We do NOT immediately close the
      WebSocket here.

      The backend needs the connection
      to send evaluation-complete.
      */

      socketRef.current.send(
        JSON.stringify({
          type: "end",
        })
      );

      setStatus(
        "Evaluating..."
      );

      /*
      Stop microphone so no additional
      audio is sent while evaluation
      happens.
      */

      micRef.current?.stop();

      micRef.current = null;

      return;
    }

    /*
    If there is no active connection,
    clean everything up.
    */

    micRef.current?.stop();

    socketRef.current?.close();

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
              "Thinking..." ||
            status ===
              "Evaluating..." ||
            status ===
              "Evaluation complete"
          }
          className="rounded-md border px-4 py-2"
        >
          Start Interview
        </button>

        <button
          onClick={stopInterview}
          disabled={
            status ===
              "Evaluating..." ||
            status ===
              "Evaluation complete"
          }
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