# LeetCode+ Sync Action

This repository contains the standalone GitHub Action script for syncing LeetCode submissions directly to a GitHub repository.

## Implementation Idea
As outlined in the architecture migration plan, this action replaces the heavy client-side synchronization logic that previously lived in the browser extension. The browser extension now acts purely as a dashboard and controller, offloading the heavy lifting of:
1. Fetching submission details
2. Formatting code and file structures
3. Committing to the user's repository
4. Generating sync statistics (`sync-stats.json`)

By moving this logic to a centralized GitHub Action, we ensure better reliability, remove background worker limitations in Manifest V3, and allow users to sync their LeetCode history automatically on a schedule or via manual triggers from the extension.

## Usage
This action is intended to be called from a `.github/workflows/leetcode-sync.yml` workflow file pushed by the LeetCode+ extension to the user's target repository. It uses the `LEETCODE_SESSION` and `LEETCODE_CSRF_TOKEN` secrets provided by the user.
