import { leetcodeClient } from "./leetcodeClient";
import { GitHubClient } from "./githubClient";
import {
  createCommitMessage,
  createReadmeTemplate,
  formatFolderName,
  getLanguageExtension,
  appendProblemToReadme,
  sortTopicsInReadme
} from "../utils/githubFormatter";

export interface SyncConfig {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  leetcodeSession: string;
  csrfToken: string;
}

export class GithubSyncFlow {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
    leetcodeClient.setCredentials(config.leetcodeSession, config.csrfToken);
  }

  /**
   * Syncs a specific submission to GitHub.
   */
  public async syncSubmission(submissionId: number): Promise<boolean> {
    const { githubToken, githubOwner: owner, githubRepo: repo } = this.config;
    
    console.log(`[Sync] Fetching submission details for ID: ${submissionId}`);
    
    // 1. Fetch submission and problem details
    const submission = await leetcodeClient.getSubmissionDetail(submissionId);
    if (!submission.submissionDetails) {
      throw new Error("Could not retrieve submission details.");
    }

    if (submission.submissionDetails.statusCode !== 10) {
      console.log(`[Sync] Skipping submission ${submissionId}. Status is not Accepted (AC).`);
      return false; // Not AC
    }

    const titleSlug = submission.submissionDetails.question.titleSlug;
    console.log(`[Sync] Fetching problem details for: ${titleSlug}`);
    const problemDetail = await leetcodeClient.getProblemDetail(titleSlug);

    if (!problemDetail) {
      throw new Error(`Could not fetch details for problem: ${titleSlug}`);
    }

    const { title, difficulty, questionFrontendId, content } = problemDetail;
    const leetcodeUrl = `https://leetcode.com/problems/${titleSlug}/`;
    const languageInfo = submission.submissionDetails.lang;

    // 2. Format strings
    const folderName = formatFolderName(questionFrontendId, titleSlug);
    const langExt = getLanguageExtension(languageInfo?.name || "");
    const codeFileName = `solution.${langExt}`;

    const readmeContent = createReadmeTemplate(title, difficulty, leetcodeUrl, content || "");
    const commitMessage = createCommitMessage(title, difficulty);

    // 3. Upload README.md
    const readmePath = `${folderName}/README.md`;
    const readmeBase64 = Buffer.from(readmeContent, 'utf8').toString('base64');
    const readmeSha = await GitHubClient.getFileSha(githubToken, owner, repo, readmePath);

    console.log(`[Sync] Uploading ${readmePath}...`);
    await GitHubClient.uploadFile(
      githubToken,
      owner,
      repo,
      readmePath,
      readmeBase64,
      readmeSha ? `Update README for ${title}` : `Create README for ${title}`,
      readmeSha
    );

    // 4. Upload Code File
    const codePath = `${folderName}/${codeFileName}`;
    const codeBase64 = Buffer.from(submission.submissionDetails.code, 'utf8').toString('base64');
    const codeSha = await GitHubClient.getFileSha(githubToken, owner, repo, codePath);

    console.log(`[Sync] Uploading ${codePath}...`);
    await GitHubClient.uploadFile(
      githubToken,
      owner,
      repo,
      codePath,
      codeBase64,
      commitMessage,
      codeSha
    );

    // 5. Update root README.md
    try {
      const topic = problemDetail.topicTags && problemDetail.topicTags.length > 0 
        ? problemDetail.topicTags[0].name 
        : "Uncategorized";

      const rootReadme = await GitHubClient.getFileContent(githubToken, owner, repo, "README.md");
      const currentContent = rootReadme ? rootReadme.content : "";
      
      let updatedReadme = appendProblemToReadme(topic, currentContent, `${owner}/${repo}`, folderName);
      updatedReadme = sortTopicsInReadme(updatedReadme);

      if (updatedReadme !== currentContent) {
        const rootReadmeBase64 = Buffer.from(updatedReadme, 'utf8').toString('base64');
        console.log(`[Sync] Updating root README.md...`);
        await GitHubClient.uploadFile(
          githubToken,
          owner,
          repo,
          "README.md",
          rootReadmeBase64,
          `Update README with ${title}`,
          rootReadme ? rootReadme.sha : null
        );
      }
    } catch (e) {
      console.warn("[Sync] Failed to update root README.md", e);
    }
    
    // 6. Update sync-stats.json is now handled in index.ts to prevent multiple file updates and race conditions.

    console.log(`[Sync] Successfully synced ${folderName}`);
    return true;
  }

  public async getUserStats(): Promise<Record<string, any>> {
    const userStatus = await leetcodeClient.getUserStatus();

    if (!userStatus.isSignedIn) {
      throw new Error("LeetCode user is not signed in.");
    }

    const userSubmissionStats = userStatus.submitStatsGlobal.acSubmissionNum.reduce<Record<string, number>>(
      (acc, stat) => {
        acc[stat.difficulty.toLowerCase()] = stat.count;
        return acc;
      },
      {}
    );

    return {
      leetcodeUsername: userStatus.username,
      userSubmissionStats,
      userSubmissionStatsUpdatedAt: new Date().toISOString(),
    };
  }

}
