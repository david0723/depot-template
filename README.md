# Depot

A dark factory template for autonomous AI agents. Drop it into any repo, define your skills and pipelines, and let AI agents do the work on a schedule.

## What is this?

Depot is a pattern for running AI agents autonomously:

- **Planner** agent creates tasks as GitHub Issues on a schedule
- **Worker** agent picks up tasks, executes skills, commits results
- **Operator** agent lets you change factory config via natural language (create an issue labeled `operator`)
- **Dashboard** shows factory status on GitHub Pages

Everything runs on a self-hosted GitHub Actions runner using Claude Code with a Max subscription (zero API costs).

## Quick Start

1. Use this template to create a new repo
2. Follow `SETUP.md` for runner + auth setup
3. Edit `CLAUDE.md` with your project identity
4. Create your first skill and pipeline (manually or via operator)
5. Trigger a test run: `gh workflow run "Depot: Worker"`

## Trigger Modes

Workers can be triggered in three modes:

| Mode | Triggers on | Best for |
|------|------------|----------|
| **Scheduled** | Fixed cron interval | Cost-conscious, batch workloads |
| **Event-driven** | Issue created/labeled | Maximum responsiveness |
| **Hybrid** (default) | Both schedule + issues | Resilience (missed events don't stall work) |

The template ships with hybrid mode. To change it:
- Edit `.github/workflows/depot-worker.yml` directly, or
- Create an operator issue: "Switch workers to event-driven only"

## Structure

```
.claude/
  agents/         # Agent behavior (planner, worker, operator)
  skills/         # How to do specific tasks
  pipelines/      # Recurring task definitions
  SKILL_MAP.md    # Label-to-skill routing
.github/workflows/ # Cron schedules and triggers
dashboard/        # Static dashboard (GitHub Pages)
CLAUDE.md         # Project identity
SETUP.md          # Installation guide
```

## Controlling the Factory

Create a GitHub Issue with the `operator` label:

- "Run workers every 2 hours"
- "Add a skill for writing social media posts"
- "Create a weekly research pipeline"
- "What's the current schedule?"

The operator interprets your intent and makes the changes.
