---
name: example
description: Example pipeline showing the format. Replace with your own.
schedule: weekly
deadline: "[Day] (owner reviews before publishing)"
---

# Example Pipeline

## Edition Numbering

Count all issues with `example` label (open + closed) to determine the latest edition. Next edition = count + 1.

## Steps (created as GitHub Issues)

### 1. First Step
- **Title**: `[Edition {N}] First Step: [description] for week of {DATE}`
- **Labels**: `worker`, `first-step-label`
- **Depends on**: none
- **Skill**: `.claude/skills/first-step.md`
- **Output**: `output-dir/YYYY-MM-DD.md`

### 2. Second Step
- **Title**: `[Edition {N}] Second Step: [description] for week of {DATE}`
- **Labels**: `worker`, `second-step-label`
- **Depends on**: First Step issue (planner links by issue number)
- **Skill**: `.claude/skills/second-step.md`
- **Output**: `output-dir/YYYY-MM-DD-output.md`

## Quality Standards

### First Step
- [ ] Quality criterion 1
- [ ] Quality criterion 2
- [ ] Quality criterion 3

### Second Step
- [ ] Quality criterion 1
- [ ] Quality criterion 2
- [ ] Quality criterion 3
