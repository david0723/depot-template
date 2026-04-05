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

function buildManifest() {
  const workflows = parseWorkflows();
  const agents = parseAgents();
  const pipelines = parsePipelines();
  const skills = parseSkillMap();

  const mergedAgents = agents.map(agent => {
    const workflow = workflows.find(w => w.name === agent.name);
    return {
      name: agent.name,
      description: agent.description,
      workflow: workflow?.file || null,
      triggers: workflow?.triggers || [],
      concurrency: workflow?.concurrency || null,
      timeout_minutes: workflow?.timeout_minutes || null,
    };
  });

  return {
    generated_at: new Date().toISOString(),
    agents: mergedAgents,
    pipelines,
    skills,
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderMermaid(manifest) {
  const lines = ['graph TD'];

  // Agents subgraph
  lines.push('    subgraph Agents');
  for (const agent of manifest.agents) {
    const triggerParts = agent.triggers
      .map(t => {
        if (t.type === 'schedule') return '⏰ ' + t.cron;
        if (t.type === 'issues') return '📋 issues:' + t.types.join(',');
        if (t.type === 'issue_comment') return '💬 issue_comment';
        return null;
      })
      .filter(Boolean);

    const labelParts = [capitalize(agent.name), ...triggerParts];
    const label = labelParts.join('<br/>');
    lines.push('        ' + agent.name + '["' + label + '"]');
  }
  lines.push('    end');
  lines.push('');

  // Pipeline subgraphs
  for (const pipeline of manifest.pipelines) {
    const scheduleLabel = pipeline.schedule ? ' (' + pipeline.schedule + ')' : '';
    lines.push('    subgraph "Pipeline: ' + pipeline.name + scheduleLabel + '"');

    const stepIds = [];
    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];
      const stepId = pipeline.name + '_step' + (i + 1);
      stepIds.push(stepId);
      lines.push('        ' + stepId + '["' + step.name + '"]');
    }

    // Step dependency edges
    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];
      if (step.depends_on) {
        const depIndex = pipeline.steps.findIndex(s =>
          step.depends_on.includes(s.name)
        );
        if (depIndex >= 0) {
          lines.push('        ' + stepIds[depIndex] + ' --> ' + stepIds[i]);
        }
      }
    }

    lines.push('    end');
    lines.push('');
  }

  // Skills subgraph
  if (manifest.skills.length > 0) {
    lines.push('    subgraph Skills');
    for (const skill of manifest.skills) {
      lines.push('        skill_' + skill.name + '["' + skill.name + '"]');
    }
    lines.push('    end');
    lines.push('');
  }

  // Cross-cutting edges
  for (const pipeline of manifest.pipelines) {
    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];
      const stepId = pipeline.name + '_step' + (i + 1);

      if (manifest.agents.find(a => a.name === 'planner')) {
        lines.push('    planner -- "creates issues" --> ' + stepId);
      }

      if (step.labels.includes('worker') && manifest.agents.find(a => a.name === 'worker')) {
        lines.push('    worker -- "executes" --> ' + stepId);
      }

      if (step.skill) {
        const skillNode = manifest.skills.find(s => s.name === step.skill);
        if (skillNode) {
          lines.push('    ' + stepId + ' -. "skill: ' + step.skill + '" .-> skill_' + skillNode.name);
        }
      }
    }
  }

  return lines.join('\n');
}

function writeOutput(manifest, mermaidDiagram) {
  const docsDir = path.join(ROOT, 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  // Write JSON manifest
  fs.writeFileSync(
    path.join(docsDir, 'architecture.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );

  // Build markdown
  const agentRows = manifest.agents.map(a => {
    const triggers = a.triggers.map(t => {
      if (t.type === 'schedule') return 'schedule: ' + t.cron;
      if (t.type === 'issues') return 'issues: ' + t.types.join(', ');
      if (t.type === 'issue_comment') return 'issue_comment';
      return t.type;
    }).join(', ');
    return '| ' + a.name + ' | ' + triggers + ' | ' + (a.timeout_minutes || '-') + 'm |';
  }).join('\n');

  const pipelineSections = manifest.pipelines.map(p => {
    const stepList = p.steps.map((s, i) => {
      const dep = s.depends_on ? ' (depends on: ' + s.depends_on + ')' : '';
      return (i + 1) + '. **' + s.name + '** -> skill: ' + (s.skill || 'none') + dep;
    }).join('\n');
    return '### ' + p.name + ' (' + (p.schedule || 'manual') + ')\n\n' + stepList;
  }).join('\n\n');

  const skillRows = manifest.skills.map(s =>
    '| ' + s.name + ' | ' + s.description + ' |'
  ).join('\n');

  const markdown = [
    '# Factory Architecture',
    '',
    '> Auto-generated by `npm run architecture`. Do not edit manually.',
    '> Generated: ' + manifest.generated_at,
    '',
    '```mermaid',
    mermaidDiagram,
    '```',
    '',
    '## Agents',
    '',
    '| Agent | Triggers | Timeout |',
    '|-------|----------|---------|',
    agentRows,
    '',
    '## Pipelines',
    '',
    pipelineSections,
    '',
    '## Skills',
    '',
    '| Skill | Description |',
    '|-------|-------------|',
    skillRows,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(docsDir, 'architecture.md'), markdown);
}

// Main
const manifest = buildManifest();
const mermaid = renderMermaid(manifest);
writeOutput(manifest, mermaid);
console.log('Generated docs/architecture.json and docs/architecture.md');
