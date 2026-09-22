import z from "zod";

/**
 * Schema for validating pre-interview request data.
 */
export const PreInterviewRequestSchema = z.object({
    github: z.string().url(),
    linkedin: z.string().url(),
});