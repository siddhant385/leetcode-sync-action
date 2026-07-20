import { z } from "zod";
import { PROVIDERS } from "../utils/constants";

export const extensionOptionsSchema = z.object({
  enableCompanyTags: z.boolean().default(true),
  enableLiveContestRating: z.boolean().default(false),
});

export const llmOptionsSchema = z.object({
  baseUrl: z.string().default(""),
  provider: z.enum(PROVIDERS).default("openai"),
  modelId: z.string().default("gpt-4o"),
  userAPIKey: z.string().default(""),
});

export const githubOptionsSchema = z.object({
  githubToken: z.string().default(""),
  githubUserName: z.string().default(""),
  githubRepoName: z.string().default("LeetCode-Solutions"),
  phase: z
    .enum(["not_auth", "auth_complete", "repo_setup", "connected"])
    .default("not_auth"),
  enableGitHubSync: z.boolean().default(false),
  githubRepoPrivate: z.boolean().default(true),
  autoSync: z.boolean().default(true),
});

export const configSchema = z.object({
  extension: extensionOptionsSchema.default({} as any),
  llm: llmOptionsSchema.default({} as any),
  github: githubOptionsSchema.default({} as any),
});


export type Config = z.infer<typeof configSchema>;
export type ExtensionOptions = z.infer<typeof extensionOptionsSchema>;
export type LLMOptions = z.infer<typeof llmOptionsSchema>;
export type GithubOptions = z.infer<typeof githubOptionsSchema>;
