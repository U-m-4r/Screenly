import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "../lib/config";
import { useNavigate, useSearchParams } from "react-router";

export function Form() {
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const interviewId = searchParams.get("interviewId");

  async function onSubmit() {
    if (!github || !linkedin) {
      // TODO: Add proper validation for URLs
      toast("Please provide valid URLs for both GitHub and LinkedIn");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (interviewId) {
        // Candidate invite flow:
        // update the existing interview created by the company.
        response = await axios.post(
          `${BACKEND_URL}/api/v1/candidate/interviews/${interviewId}/setup`,
          {
            linkedin,
            github,
          },
          {
            withCredentials: true,
          }
        );
      } else {
        // Existing direct interview flow:
        // create a new interview.
        response = await axios.post(
          `${BACKEND_URL}/api/v1/pre-interview`,
          {
            linkedin,
            github,
          },
          {
            withCredentials: true,
          }
        );
      }

      navigate(`/interview/${response.data.interviewId}`);
    } catch (error) {
      console.error("Interview setup error:", error);

      if (axios.isAxiosError(error)) {
        toast(
          error.response?.data?.error ||
            "Unable to prepare your interview. Please try again."
        );
      } else {
        toast("Unable to prepare your interview. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <div>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          Kickstart Your AI Interview!
        </h2>

        <div className="p-4">
          <Input
            placeholder="LinkedIn URL"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
          />
        </div>

        <div className="p-4">
          <Input
            placeholder="GitHub URL"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
          />
        </div>

        <div className="flex justify-center items-center mt-4">
          <Button disabled={loading} onClick={onSubmit}>
            {loading ? "Loading..." : "Start Interview"}
          </Button>
        </div>
      </div>
    </div>
  );
}