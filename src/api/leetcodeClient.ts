import { SUBMISSION_DETAILS_QUERY, PROBLEM_DETAIL_QUERY, SUBMISSION_LIST_QUERY, GLOBAL_SUBMISSION_LIST_QUERY, USER_STATUS_QUERY } from "./queries";
import {
  LeetCodeSubmissionSchema,
  LeetCodeSubmission,
  LeetCodeProblemSchema,
  LeetCodeProblem,
  LeetCodeUserStatusSchema,
  LeetCodeUserStatus,
} from "../schema/leetcodeClient.schema";

export class LeetCodeClient {
  private readonly graphqlEndpoint = "https://leetcode.com/graphql/";
  private sessionCookie: string = "";
  private csrfToken: string = "";

  public setCredentials(sessionCookie: string, csrfToken: string) {
    this.sessionCookie = sessionCookie;
    this.csrfToken = csrfToken;
  }

  private async graphqlRequest<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const response = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `LEETCODE_SESSION=${this.sessionCookie}; csrftoken=${this.csrfToken}`,
        "x-csrftoken": this.csrfToken,
        "Referer": "https://leetcode.com/",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode API HTTP Error: ${response.status}`);
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (json.errors?.length) {
      throw new Error(
        "GraphQL Errors: " + json.errors.map((e) => e.message).join(" | "),
      );
    }

    if (!json.data) {
      throw new Error("GraphQL returned empty data object.");
    }

    return json.data;
  }

  public async getSubmissionDetail(
    submissionId: number,
  ): Promise<LeetCodeSubmission> {
    const rawData = await this.graphqlRequest<unknown>(
      SUBMISSION_DETAILS_QUERY,
      { submissionId },
    );
    return LeetCodeSubmissionSchema.parse(rawData);
  }

  public async getProblemDetail(titleSlug: string): Promise<LeetCodeProblem["question"]> {
    const rawData = await this.graphqlRequest<unknown>(
      PROBLEM_DETAIL_QUERY,
      { titleSlug },
    );
    const validData = LeetCodeProblemSchema.parse(rawData);
    return validData.question;
  }

  public async getUserStatus(): Promise<LeetCodeUserStatus["userStatus"]> {
    const rawData = await this.graphqlRequest<unknown>(USER_STATUS_QUERY);
    const validData = LeetCodeUserStatusSchema.parse(rawData);
    return validData.userStatus;
  }

  public async getRecentSubmissions(questionSlug: string, limit: number = 20): Promise<any> {
    return this.graphqlRequest<unknown>(
      SUBMISSION_LIST_QUERY,
      { questionSlug, limit, offset: 0 }
    );
  }

  public async getGlobalSubmissions(offset: number, limit: number = 20): Promise<{
    hasNext: boolean;
    submissions: Array<{
      id: string;
      lang: string;
      timestamp: string;
      statusDisplay: string;
      runtime: string;
      title: string;
      memory: string;
      titleSlug: string;
    }>;
  }> {
    const rawData = await this.graphqlRequest<any>(
      GLOBAL_SUBMISSION_LIST_QUERY,
      { offset, limit }
    );
    return rawData.submissionList;
  }
}

export const leetcodeClient = new LeetCodeClient();
