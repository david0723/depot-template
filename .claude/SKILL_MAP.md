# Skill Map

Routes issue labels to skill files. The worker reads this to know which skill to execute.

| Label | Skill File | Description |
|-------|-----------|-------------|
| `example` | `.claude/skills/example.md` | Example skill - replace with your own |

## How to add a skill

1. Create `.claude/skills/{name}.md` with frontmatter (`name`, `description`)
2. Add a row to this table
3. Create the label: `gh label create {name} --description '...' --color HEXCODE`

Or: create an operator issue asking to add a new skill. The operator will do all three steps.

## Notes

- Every `worker`-labeled issue must also have exactly one skill label from the table above.
- If an issue has an unknown label, the worker comments asking for clarification and skips it.
