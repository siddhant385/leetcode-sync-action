import * as core from '@actions/core';
import * as github from '@actions/github';
import { GithubSyncFlow } from './api/githubSyncFlow';
import { leetcodeClient } from './api/leetcodeClient';
import { GitHubClient } from './api/githubClient';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  try {
    // 1. Get inputs
    const leetcodeSession = core.getInput('leetcode_session', { required: true });
    const csrfToken = core.getInput('leetcode_csrf_token', { required: true });
    const githubToken = core.getInput('github_token', { required: true });

    core.info('LeetCode+ Sync Action started.');
    
    // 2. Determine target repository
    const { owner, repo } = github.context.repo;
    core.info(`Target repository: ${owner}/${repo}`);

    // 3. Initialize Clients & Flow
    leetcodeClient.setCredentials(leetcodeSession, csrfToken);

    const syncFlow = new GithubSyncFlow({
      githubToken,
      githubOwner: owner,
      githubRepo: repo,
      leetcodeSession,
      csrfToken
    });

    // 4. Read the Watermark from sync-stats.json
    const statsPath = "sync-stats.json";
    let lastSyncedTimestamp = 0;
    let totalSynced = 0;
    
    try {
      const statsFile = await GitHubClient.getFileContent(githubToken, owner, repo, statsPath);
      if (statsFile && statsFile.content) {
        const stats = JSON.parse(statsFile.content);
        if (stats.lastSyncedTimestamp) {
          lastSyncedTimestamp = stats.lastSyncedTimestamp;
          totalSynced = stats.totalSynced || 0;
          core.info(`Found watermark: last synced timestamp is ${lastSyncedTimestamp}`);
        }
      } else {
        core.info('No sync-stats.json found. Beginning full backfill.');
      }
    } catch (e) {
      core.info('Could not parse sync-stats.json. Proceeding with backfill.');
    }

    // 5. Fetch loop (Watermark Sync)
    let offset = 0;
    const limit = 20;
    let hasNext = true;
    const pendingSync: any[] = [];
    let stopFetching = false;
    let newestTimestamp = lastSyncedTimestamp;

    while (hasNext && !stopFetching) {
      core.info(`Fetching submissions from LeetCode, offset ${offset}...`);
      const response = await leetcodeClient.getGlobalSubmissions(offset, limit);
      
      for (const submission of response.submissions) {
        const timestamp = parseInt(submission.timestamp, 10);
        
        // Stop Condition: If we hit a submission older than our watermark, stop completely.
        if (timestamp <= lastSyncedTimestamp) {
          core.info(`Reached watermark (Timestamp: ${timestamp} <= ${lastSyncedTimestamp}). Stopping fetch.`);
          stopFetching = true;
          break;
        }

        if (submission.statusDisplay === "Accepted") {
          pendingSync.push(submission);
          // Keep track of the highest timestamp in the batch to update the watermark
          if (timestamp > newestTimestamp) {
            newestTimestamp = timestamp;
          }
        }
      }

      hasNext = response.hasNext;
      offset += limit;
      
      // Safety delay to prevent hammering LeetCode's GraphQL API
      await delay(1000); 
    }

    // 6. Process & Commit
    if (pendingSync.length === 0) {
      core.info('No new accepted submissions to sync. Exiting.');
      return;
    }

    // Reverse to process oldest -> newest so commit history is accurate
    pendingSync.reverse();

    core.info(`Found ${pendingSync.length} new accepted submissions to sync.`);

    let latestProblem = "";
    
    for (let i = 0; i < pendingSync.length; i++) {
      const submission = pendingSync[i];
      const submissionId = parseInt(submission.id, 10);
      core.info(`[${i + 1}/${pendingSync.length}] Syncing submission ID: ${submissionId} (${submission.title})`);
      
      try {
        const success = await syncFlow.syncSubmission(submissionId);
        if (success) {
          totalSynced++;
          latestProblem = submission.title;
        }
        // Throttle 2 seconds between commits to avoid GitHub abuse rates
        await delay(2000);
      } catch (e) {
        core.error(`Failed to sync submission ${submissionId}: ${e}`);
        // Optionally, we could break here so the watermark doesn't update past this failure
        core.setFailed('Stopping sync due to failure to prevent watermark corruption.');
        return; 
      }
    }

    // 7. Update and Commit State
    try {
      core.info('Updating sync-stats.json with new watermark...');
      const stats = {
        totalSynced,
        lastSyncedTimestamp: newestTimestamp,
        lastSyncDate: new Date().toISOString(),
        latestProblem
      };
      
      const statsBase64 = Buffer.from(JSON.stringify(stats, null, 2), 'utf8').toString('base64');
      const statsFile = await GitHubClient.getFileContent(githubToken, owner, repo, statsPath);
      
      await GitHubClient.uploadFile(
        githubToken,
        owner,
        repo,
        statsPath,
        statsBase64,
        `Update sync stats for ${latestProblem}`,
        statsFile ? statsFile.sha : null
      );
      
      core.info('Sync completed successfully.');
    } catch (e) {
      core.error(`Failed to update sync-stats.json: ${e}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred.');
    }
  }
}

run();
