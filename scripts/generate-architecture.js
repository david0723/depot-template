const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  const frontmatter = yaml.load(match[1]);
  const body = content.slice(match[0].length).trim();
  return { frontmatter, body };
}

function parseWorkflows() {
  const dir = path.join(ROOT, '.github', 'workflows');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.startsWith('depot-') && f.endsWith('.yml'));

  return files.map(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const parsed = yaml.load(content);
    const triggers = [];

    // js-yaml v4 keeps 'on' as string key, but guard against older schemas
    const onBlock = parsed.on ?? parsed[true] ?? {};

    if (onBlock.schedule) {
      for (const s of onBlock.schedule) {
        triggers.push({ type: 'schedule', cron: s.cron });
      }
    }
    if (onBlock.issues) {
      triggers.push({ type: 'issues', types: onBlock.issues.types || [] });
    }
    if (onBlock.issue_comment) {
      triggers.push({ type: 'issue_comment', types: onBlock.issue_comment.types || [] });
    }
    if (onBlock.workflow_dispatch !== undefined) {
      triggers.push({ type: 'workflow_dispatch' });
    }
    if (onBlock.workflow_run) {
      triggers.push({ type: 'workflow_run' });
    }

    const jobName = Object.keys(parsed.jobs)[0];
    const job = parsed.jobs[jobName];
    const agentName = (parsed.name || file)
      .replace(/^Depot:\s*/i, '')
      .trim()
      .toLowerCase();

    return {
      file,
      name: agentName,
      workflow_name: parsed.name,
      triggers,
      concurrency: parsed.concurrency?.group || null,
      timeout_minutes: job['timeout-minutes'] || null,
    };
  });
}

function parseAgents() {
  const dir = path.join(ROOT, '.claude', 'agents');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const { frontmatter } = parseFrontmatter(content);
    return {
      name: frontmatter.name || path.basename(file, '.md'),
      description: frontmatter.description || '',
    };
  });
}

function parsePipelines() {
  const dir = path.join(ROOT, '.claude', 'pipelines');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);

    const steps = [];
    const stepRegex = /^### \d+\.\s+(.+)$/gm;
    let stepMatch;

    while ((stepMatch = stepRegex.exec(body)) !== null) {
      const stepName = stepMatch[1];
      const startIdx = stepMatch.index + stepMatch[0].length;
      const rest = body.slice(startIdx);
      const nextHeading = rest.search(/^##/m);
      const stepContent = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

      const labelsMatch = stepContent.match(/\*\*Labels\*\*:\s*(.+)/);
      const dependsMatch = stepContent.match(/\*\*Depends on\*\*:\s*(.+)/);
      const skillMatch = stepContent.match(/\*\*Skill\*\*:\s*(.+)/);

      const labels = labelsMatch
        ? labelsMatch[1].split(',').map(l => l.trim().replace(/`/g, ''))
        : [];

      const dependsRaw = dependsMatch ? dependsMatch[1].trim() : null;
      const dependsOn = dependsRaw && !dependsRaw.toLowerCase().startsWith('none')
        ? dependsRaw
        : null;

      const skillRaw = skillMatch ? skillMatch[1].trim().replace(/`/g, '') : null;
      const skill = skillRaw ? path.basename(skillRaw, '.md') : null;

      steps.push({ name: stepName, labels, depends_on: dependsOn, skill });
    }

    return {
      name: frontmatter.name || path.basename(file, '.md'),
      description: frontmatter.description || '',
      schedule: frontmatter.schedule || null,
      steps,
    };
  });
}

function parseSkillMap() {
  const file = path.join(ROOT, '.claude', 'SKILL_MAP.md');
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');

  const skills = [];
  const rowRegex = /^\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|$/gm;
  let match;

  while ((match = rowRegex.exec(content)) !== null) {
    if (match[1].includes('---')) continue;

    const label = match[1];
    const filePath = match[2];
    const description = match[3].trim();

    // Try to read skill file for a richer description
    const skillFile = path.join(ROOT, filePath);
    let skillDescription = description;
    if (fs.existsSync(skillFile)) {
      const skillContent = fs.readFileSync(skillFile, 'utf8');
      const { frontmatter } = parseFrontmatter(skillContent);
      if (frontmatter.description) skillDescription = frontmatter.description;
    }

    skills.push({ name: label, description: skillDescription, label, file: filePath });
  }

  return skills;
}
