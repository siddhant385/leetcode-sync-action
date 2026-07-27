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

### Generating a Profile Badge

You can now automatically generate a dynamically updating SVG badge that shows your total solved problems on LeetCode! Add the following to your action step:

```yaml
  - name: LeetCode+ Sync
    uses: sid/leetcode-sync-action@main
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      leetcode_session: ${{ secrets.LEETCODE_SESSION }}
      leetcode_csrf_token: ${{ secrets.LEETCODE_CSRF_TOKEN }}
      generate_badge: "true"
      badge_folder: ".badges"
```

Once the action runs, an SVG will be saved to `.badges/leetcode.svg`. You can display it in your profile README:
```markdown
![LeetCode Stats](.badges/leetcode.svg)
```
