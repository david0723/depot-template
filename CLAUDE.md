# [Your Project Name]

[One-line description of what this project produces]

## Identity

**Author**: [Your name and brief bio]

**Audience**: [Who consumes your output]

**Format**: [What you produce - newsletter, blog posts, reports, etc.]

**Publish cadence**: [How often - weekly, biweekly, etc.]

## Content Pillars

1. **[Pillar 1]** - [description]
2. **[Pillar 2]** - [description]
3. **[Pillar 3]** - [description]

## How This Repo Works

This repo uses the **Depot** pattern: scheduled AI agents coordinate via GitHub Issues.

| Component | Location | Purpose |
|-----------|----------|---------|
| Agents | `.claude/agents/` | Planner, worker, and operator behavior |
| Skills | `.claude/skills/` | How to do specific tasks |
| Skill map | `.claude/SKILL_MAP.md` | Which issue labels route to which skills |
| Pipelines | `.claude/pipelines/` | Recurring task definitions and quality standards |
| Workflows | `.github/workflows/` | GitHub Actions schedules (cron triggers) |
| Dashboard | `dashboard/` | Static dashboard deployed to GitHub Pages |

## Setup

1. Set GitHub repo variables: `GIT_USER_NAME`, `GIT_USER_EMAIL`
2. Create GitHub secret: `DEPOT_TOKEN` (fine-grained PAT with contents + workflows + issues)
3. Set up a self-hosted runner (see `SETUP.md`)
4. Customize: `CLAUDE.md`, skills, pipelines, `SKILL_MAP.md`
5. Create your first pipeline via an operator issue, or manually

## Operations

**Trigger manually:**
```
gh workflow run "Depot: Planner"
gh workflow run "Depot: Worker"
```

**Change factory config via natural language:**
Create a GitHub Issue with the `operator` label. Describe what you want changed.

**Check runner status:**
```
gh api repos/OWNER/REPO/actions/runners --jq '.runners[] | {name, status}'
```
