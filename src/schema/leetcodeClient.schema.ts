import { z } from "zod";

// Schema for raw data coming from LeetCode API
export const LeetCodeSubmissionSchema = z.object({
  submissionDetails: z.object({
    code: z.string(),
    statusCode: z.number(), // 10 = AC, 11 = WA, 14 = TLE, 15 = RE, 20 = CE
    timestamp: z.number(),
    lang: z.object({
      name: z.string(),
    }),
    question: z.object({
      titleSlug: z.string(),
    }),

    // Success Fields
    runtimePercentile: z.number().nullable().optional(),
    memoryPercentile: z.number().nullable().optional(),
    // error fields
    totalCorrect: z.number().nullable().optional(),
    totalTestcases: z.number().nullable().optional(),
    compileError: z.string().nullable().optional(),
    runtimeError: z.string().nullable().optional(),
    lastTestcase: z
      .string()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        return val.length > 300
          ? val.substring(0, 300) + "\n... [TRUNCATED]"
          : val;
      }),
    expectedOutput: z.string().nullable().optional(),
  }),
});

export const LeetCodeProblemSchema = z.object({
  question: z.object({
    questionId: z.string(),
    questionFrontendId: z.string(),
    title: z.string(),
    titleSlug: z.string(),
    content: z.string().nullable(),
    difficulty: z.string(),
    isPaidOnly: z.boolean(),
    topicTags: z.array(
      z.object({
        name: z.string(),
        slug: z.string(),
      })
    ).nullable().optional(),
    codeSnippets: z.array(
      z.object({
        lang: z.string(),
        langSlug: z.string(),
        code: z.string(),
      })
    ).nullable().optional(),
    sampleTestCase: z.string().nullable().optional(),
    exampleTestcases: z.string().nullable().optional(),
    hints: z.array(z.string()).nullable().optional(),
    companyTags: z.array(
      z.object({
        name: z.string(),
        slug: z.string(),
      })
    ).nullable().optional(),
    stats: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
});

// TypeScript type inference
export type LeetCodeSubmission = z.infer<typeof LeetCodeSubmissionSchema>;
export type LeetCodeProblem = z.infer<typeof LeetCodeProblemSchema>;
