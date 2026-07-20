import { z } from "zod";
import { PROVIDERS } from "../utils/constants";
import { LeetCodeSubmissionSchema } from "./leetcodeClient.schema";

export const analysisRequestSchema = z
  .object({
    submission: LeetCodeSubmissionSchema,
    config: z.object({
      provider: z.enum(PROVIDERS),
      userAPIKey: z.string().min(1),
      modelId: z.string().min(1),
      baseUrl: z.string().optional(),
    }),
  })
  .transform((data) => {
    // 🔥 Yahan transform karke wahi shape banao jo tumhare backend ko chahiye
    const details = data.submission.submissionDetails;

    return {
      code: details.code,
      provider: data.config.provider,
      userAPIKey: data.config.userAPIKey, // As per backend contract
      modelId: data.config.modelId, // As per backend contract
      language: details.lang.name,
      problemTitle: details.question.titleSlug,
      baseUrl: data.config.baseUrl || "",
    };
  });

// Use a unified schema for backendClient

export const questionResponseSchema = z.object({
  title: z.string(),
  companies: z.record(
    z.string(), // Company name (e.g., 'google')
    z.record(
      z.string(), // Time period (e.g., 'Thirty Days')
      z.object({
        frequency: z.union([z.string(), z.number()]), // Handle strings or parsed numbers
      }),
    ),
  ),
});

export type QuestionResponse = z.infer<typeof questionResponseSchema>;
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
