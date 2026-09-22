import "dotenv/config";
import express from "express";
import cors from "cors";
import { PreInterviewRequestSchema } from "./types";
import axios from "axios";
import { prisma } from "./db";
import { DeepgramClient } from "@deepgram/sdk";

const app = express();

app.use(cors());
app.use(express.json());

const deepgram = new DeepgramClient({
  apiKey: process.env.DEEPGRAM_API_KEY,
});

app.get("/api/deepgram-token", async (_req, res) => {
  try {
    const token = await deepgram.auth.v1.tokens.grant();

    res.send(token.access_token);
  } catch (error) {
    console.error("Failed to create Deepgram token:", error);
    res.status(500).json({ error: "Failed to create Deepgram token" });
  }
});

app.post("/api/v1/pre-interview", async (req, res) => {
    const {success, data}= PreInterviewRequestSchema.safeParse(req.body);

    if(!success) {
        return res.status(411).json({error: "Incorrect request body"});
    }

    //TODO: URL can be validated more thoroughly, but for now we will just check if they are valid URLs and extract the usernames from them (USE SLM maybe?)
    const githubUrl = data.github.endsWith("/") ? data.github.slice(0, -1) : data.github;
    const linkedinUrl = data.linkedin.endsWith("/") ? data.linkedin.slice(0, -1) : data.linkedin;

    const githubUsername = githubUrl.split("/").pop();
    const linkedinUsername = linkedinUrl.split("/").pop();

    const userRepos = await axios.get(`https://api.github.com/users/${githubUsername}/repos`,
        {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2026-03-10",
        },
        }
    );

    //TODO Add Linkedin API call to fetch user data and return it along with the GitHub repos

    const interview = await prisma.interview.create({
        data: {
            githubMetadata: JSON.stringify(userRepos.data),
            status: "Pre",
            // linkedinMetadata: JSON.stringify({username: linkedinUsername}),
        }
    });

    return res.json({
        interviewId: interview.id,
    });
});

app.listen(3001);