---
name: GitHub push from Replit
description: How to push this repo to an external GitHub repo from the Replit main agent, given git write restrictions.
---

# GitHub push from Replit (external repo)

## Constraints
- The main agent CANNOT run `git add` / `git commit` / `git remote` — they are blocked
  as destructive. Replit auto-commits a checkpoint at the END of each agent loop.
- Replit's `GIT_ASKPASS` does NOT authenticate for external (non-Replit) repos. You
  must embed a Personal Access Token in the push URL.

## Working push flow
1. Make file edits.
2. End the loop and tell the user to reply "push" — this lets Replit create the
   checkpoint commit first.
3. On the next turn, push with the PAT in the URL (token stored as a Replit secret).
   The secret name varies per project — check `viewEnvVars` (e.g. `GITHUB_PAT`):

```
git --no-optional-locks push \
  "https://<github-username>:${GITHUB_PAT}@github.com/<owner>/<repo>.git" \
  HEAD:main
```

**Why:** If you push before the checkpoint commit exists, git reports "Everything
up-to-date" because the working-tree edits aren't committed yet. The checkpoint must
land first.

## Fine-grained token pitfall

If the push returns `403 Permission denied to <owner>` even though the REST API
shows `"push": true` in the repo permissions block, the token is a **fine-grained PAT**
and the REST `permissions` reflects the *user's role*, not the token's grants.
Fix: set **Repository permissions → Contents: Read and write** on the token, OR
switch to a **classic token** with the `repo` scope (simpler, avoids this confusion).

**How to apply:** Edit → end loop → user says "push" → run the PAT push. Never try to
commit yourself; rely on the checkpoint.
