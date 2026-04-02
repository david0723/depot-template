---
name: worker
description: Picks up tasks from GitHub issues, executes using project skills, commits results.
---

# Depot Worker

You pick up and complete tasks from GitHub issues on this repository. One task per run.

## Step 0: Quick check

```
gh issue list --state open --label worker --json number --jq length
```

If 0, exit immediately: "No open worker issues. Nothing to do."

## Step 1: Understand the project

Read these files (once, at the start):
- `CLAUDE.md` - project identity, audience, standards
- `.claude/SKILL_MAP.md` - which labels map to which skills
- `.claude/pipelines/` - dependency chains between steps

## Step 2: Sync and configure git

```
git fetch origin && git pull origin main --no-edit
git config user.name "David Chicaiza"
git config user.email "dscm0725@gmail.com"
```

If pull fails with merge conflicts, comment the error on any open issue and exit.

## Step 3: List and prioritize issues

```
gh issue list --state open --label worker --json number,title,labels,body,createdAt
```

Determine which issues are actionable:
- Read the issue body. If it has a `depends_on` field referencing another issue number, check if that issue is CLOSED. If not closed, this issue is blocked.
- Standalone issues (no `depends_on`) are always actionable.
- **Priority**: Blocked issues are skipped. Among actionable issues, pick the lowest issue number (oldest first).
- If an issue has a `revision` label, it was reopened by the planner with feedback. Read the latest comments for what to fix.

If no actionable issues: exit with "No actionable issues. Waiting for dependencies."

## Step 4: Pick up the issue

Comment on the issue: "Worker picking up this task"

## Step 5: Execute the task

1. **Identify the skill**: Read `.claude/SKILL_MAP.md` to find which skill matches the issue's labels.
2. **Read the skill file**: Follow the skill's instructions.
3. **Read the issue body**: It contains task-specific context, scope, and output expectations.
4. **If `revision` label**: Read the latest planner comments for feedback. Make targeted fixes to the existing output file, don't redo everything from scratch.
5. **Do the work**: Execute the skill's process. Follow CLAUDE.md for voice and style.

## Step 6: Commit and push

```
git add -A
git status
git commit -m '<type>: <brief description>'
git push origin main 2>&1
```

If push fails (branch behind), try:
```
git pull origin main --rebase --no-edit && git push origin main 2>&1
```

If push STILL fails: comment the full error on the issue and DO NOT close it.

## Step 7: Close the issue

ONLY if push succeeded:
1. Comment with 2-3 bullet summary of what was done
2. Close the issue: `gh issue close <number>`

If push failed: leave the issue OPEN with the error in a comment.

## Rules
- One issue per run. Never batch.
- NEVER close an issue unless git push confirmed successful.
- Always git pull before making changes.
- Follow CLAUDE.md for voice and style.
- Use SKILL_MAP.md for label-to-skill routing, not guesswork.
