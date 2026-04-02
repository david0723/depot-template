# Depot Setup Guide

## Prerequisites

- A GitHub repo (this template)
- A VPS or always-on machine with Node.js 22+
- Claude Code Max subscription (for zero API costs)

## 1. Self-Hosted Runner

Install a GitHub Actions runner on your VPS so agents run on your machine with your tools and auth.

### Option A: Docker (recommended)

Create `/opt/depot-runner/` on your VPS with a Dockerfile, docker-compose.yml, and entrypoint. See the [depot documentation](https://github.com/david0723/depot-template) for the Docker setup files.

### Option B: Bare metal

```bash
# On your VPS:
mkdir -p /opt/actions-runner && cd /opt/actions-runner

# Download latest runner (check https://github.com/actions/runner/releases)
curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.333.1/actions-runner-linux-x64-2.333.1.tar.gz
tar xzf runner.tar.gz

# Get registration token (run locally):
# gh api repos/OWNER/REPO/actions/runners/registration-token -X POST --jq .token

# Register
RUNNER_ALLOW_RUNASROOT=1 ./config.sh \
  --url https://github.com/OWNER/REPO \
  --token YOUR_TOKEN \
  --name depot-vps \
  --labels depot,self-hosted \
  --unattended

# Install as service
./svc.sh install && ./svc.sh start
```

## 2. Claude Code Authentication

```bash
# On the runner machine:
claude auth login
# Opens a URL - complete auth in your browser
```

Configure auto-approve for CI:
```bash
mkdir -p ~/.claude && cat > ~/.claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "Glob(*)", "Grep(*)", "WebSearch(*)", "WebFetch(*)"]
  }
}
EOF
```

## 3. GitHub Configuration

### Repo Variables (Settings > Variables > Actions)
- `GIT_USER_NAME`: Your name (for commits)
- `GIT_USER_EMAIL`: Your email (for commits)

### Repo Secrets (Settings > Secrets > Actions)
- `DEPOT_TOKEN`: Fine-grained PAT with permissions:
  - Contents: Read and write
  - Workflows: Read and write
  - Issues: Read and write
  - Scoped to this repo only

## 4. GitHub Pages (for dashboard)

```bash
gh api repos/OWNER/REPO/pages -X POST -f build_type=workflow
```

## 5. Customize Your Factory

1. Edit `CLAUDE.md` with your project identity
2. Create skills in `.claude/skills/` (or ask the operator)
3. Create a pipeline in `.claude/pipelines/` (or ask the operator)
4. Update `.claude/SKILL_MAP.md` with your label-to-skill routing

## 6. Test

```bash
# Create a test issue
gh issue create --title "Test: verify factory works" --label "worker,example" --body "Test issue"

# Trigger worker manually
gh workflow run "Depot: Worker"

# Or use the operator
gh issue create --title "Show me the current factory status" --label "operator"
```

## How It Works

```
GitHub Actions (scheduler) -> Self-hosted runner (your VPS) -> Claude Code (Max sub) -> GitHub Issues (task queue)
```

- **Planner** creates pipeline issues on schedule
- **Worker** picks up issues, executes skills, commits results
- **Operator** handles natural language config changes via `operator`-labeled issues
- **Dashboard** auto-deploys to GitHub Pages on activity
