'use strict';
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Extract sections from a SKILL.md file
// ---------------------------------------------------------------------------

function extractSection(content, sectionName) {
  const headerRe = new RegExp(`^##\\s+${sectionName}\\b.*$`, 'im');
  const match = content.match(headerRe);
  if (!match) return '';

  const startIdx = match.index + match[0].length;
  const rest = content.slice(startIdx);

  // Find the next ## header or end of file
  const nextHeader = rest.search(/^##\s+/m);
  const section = nextHeader === -1 ? rest : rest.slice(0, nextHeader);
  return section.trim();
}

// ---------------------------------------------------------------------------
// Read supporting files (resolver, stack profile)
// ---------------------------------------------------------------------------

function readResolverInfo(skill, projectRoot) {
  if (!skill) return null;
  const skillName = skill.replace(/^\//, '');
  // Check for resolver in references directory
  const resolverPaths = [
    path.join(projectRoot, '.orch/references', skillName, 'resolver.yaml'),
    path.join(projectRoot, '.orch/references/angular/resolver.yaml')
  ];
  for (const rp of resolverPaths) {
    try {
      return fs.readFileSync(rp, 'utf8');
    } catch (err) {
      // Continue to next candidate
    }
  }
  return null;
}

function readStackProfile(projectRoot) {
  const stackPath = path.join(projectRoot, '.orch/cache/stack.yaml');
  try {
    return fs.readFileSync(stackPath, 'utf8');
  } catch (err) {
    return null;
  }
}

function extractStackVersion(stackContent, key) {
  if (!stackContent) return 'unknown';
  const re = new RegExp(`^\\s*${key}:\\s*["']?(.+?)["']?\\s*$`, 'm');
  const m = stackContent.match(re);
  return m ? m[1].trim() : 'unknown';
}

// ---------------------------------------------------------------------------
// Collect inherited data from completed dependency events
// ---------------------------------------------------------------------------

function collectDependencyData(event, runDir) {
  const results = [];
  const deps = event.dependencies && event.dependencies.depends_on
    ? event.dependencies.depends_on
    : [];

  for (const depId of deps) {
    const completeFile = path.join(runDir, `${depId}.complete.json`);
    try {
      const data = JSON.parse(fs.readFileSync(completeFile, 'utf8'));
      results.push({ event_id: depId, collected: data.collected || {}, summary: data.summary || '' });
    } catch (err) {
      // Dependency hasn't completed yet or file missing — skip
    }

    // Also check event result
    const eventFile = path.join(runDir, `${depId}.event.json`);
    try {
      const depEvent = JSON.parse(fs.readFileSync(eventFile, 'utf8'));
      if (depEvent.result && depEvent.result.collected) {
        // Merge if we didn't get it from complete.json
        const existing = results.find(r => r.event_id === depId);
        if (existing && Object.keys(existing.collected).length === 0) {
          existing.collected = depEvent.result.collected;
        } else if (!existing) {
          results.push({
            event_id: depId,
            collected: depEvent.result.collected,
            summary: depEvent.result.summary || ''
          });
        }
      }
    } catch (err) {
      // Skip unreadable events
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Build the .prompt.md file
// ---------------------------------------------------------------------------

function readSkillSections(event, projectRoot) {
  const skill = event.identity.skill;
  const allSkills = event.identity.skills || (skill ? [skill] : []);
  let stepsSection = '';
  let contextSection = '';

  for (const s of allSkills) {
    const sName = s.replace(/^\//, '');
    const sMdPath = path.join(projectRoot, '.github/skills', sName, 'SKILL.md');
    try {
      const sContent = fs.readFileSync(sMdPath, 'utf8');
      const steps = extractSection(sContent, 'Steps') || extractSection(sContent, 'Instructions');
      const ctx = extractSection(sContent, 'Context') || extractSection(sContent, 'Overview');
      if (allSkills.length > 1) {
        stepsSection += `\n### ${sName}\n\n${steps || '(no steps found)'}\n`;
        contextSection += `\n### ${sName}\n\n${ctx || ''}\n`;
      } else {
        stepsSection = steps || '';
        contextSection = ctx || '';
      }
    } catch (err) {
      stepsSection += `\n(SKILL.md not found for ${sName})`;
    }
  }
  return { stepsSection, contextSection };
}

function buildPrompt(event, runDir, projectRoot) {
  if (!event || !event.identity) {
    throw new Error('buildPrompt: invalid event object');
  }

  const { event_id, workflow_name, phase_name, skill, agent } = event.identity;
  const runId = event.identity.run_id;

  // Read SKILL.md (handles both single skill and skills: plural list)
  const { stepsSection, contextSection } = readSkillSections(event, projectRoot);

  // Read stack profile
  const stackContent = readStackProfile(projectRoot);
  const angularVersion = extractStackVersion(stackContent, 'angular');
  const nodeVersion = extractStackVersion(stackContent, 'node');

  // Read resolver info
  const resolverInfo = readResolverInfo(skill, projectRoot);

  // Collect dependency data
  const depData = collectDependencyData(event, runDir);

  // Build the prompt
  const lines = [];

  lines.push('---');
  lines.push(`event_id: "${event_id}"`);
  lines.push(`workflow: "${workflow_name}"`);
  lines.push(`phase: "${phase_name}"`);
  if (skill) lines.push(`skill: "${skill}"`);
  if (agent) lines.push(`agent: "${agent}"`);
  lines.push('---');
  lines.push('');

  lines.push('## Task');
  if (contextSection) {
    lines.push(contextSection);
  } else {
    lines.push(`Execute the "${phase_name}" phase of the ${workflow_name} workflow.`);
  }
  lines.push('');

  lines.push('## Project Context');
  lines.push(`- Angular version: ${angularVersion}`);
  lines.push(`- Node version: ${nodeVersion}`);
  if (event.context && event.context.project_root) {
    lines.push(`- Project root: ${event.context.project_root}`);
  } else {
    lines.push(`- Project root: ${projectRoot}`);
  }
  if (resolverInfo) {
    lines.push('');
    lines.push('### Version Resolver');
    lines.push('```yaml');
    lines.push(resolverInfo.trim());
    lines.push('```');
  }
  lines.push('');

  // Runtime Context: dump all event.context key-value pairs for the AI
  const ctx = event.context || {};
  const ctxKeys = Object.keys(ctx).filter(k => k !== 'inherited_from');
  if (ctxKeys.length > 0) {
    lines.push('## Runtime Context');
    lines.push('');
    for (const key of ctxKeys) {
      const value = ctx[key];
      lines.push(`- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
    lines.push('');
  }

  if (depData.length > 0) {
    lines.push('## Inputs from Previous Phases');
    for (const dep of depData) {
      lines.push(`### Phase ${dep.event_id}`);
      if (dep.summary) lines.push(`Summary: ${dep.summary}`);
      if (dep.collected && Object.keys(dep.collected).length > 0) {
        for (const [key, value] of Object.entries(dep.collected)) {
          const display = typeof value === 'string' ? value : JSON.stringify(value);
          lines.push(`- **${key}**: ${display}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('## Instructions');
  if (stepsSection) {
    lines.push(stepsSection);
  } else {
    lines.push(`Complete the "${phase_name}" phase. Follow the skill documentation if available.`);
  }
  lines.push('');

  lines.push('## Completion Protocol');
  lines.push('When you have completed this phase, create this file:');
  lines.push('');
  lines.push(`**Path:** \`.orch/workflow-state/events/${runId}/${event_id}.complete.json\``);
  lines.push('');
  lines.push('**Content:**');
  lines.push('```json');
  lines.push('{');
  lines.push('  "status": "complete",');
  lines.push('  "summary": "<what you did>",');
  lines.push('  "files_modified": ["<list>"],');
  lines.push('  "collected": { "<key-value data for downstream phases>" },');
  lines.push('  "error": null');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('If the phase fails, set status to "failed" and include the error.');

  // Write the prompt file
  const promptPath = path.join(runDir, `${event_id}.prompt.md`);
  fs.writeFileSync(promptPath, lines.join('\n'));

  return promptPath;
}

/**
 * Build a skeleton prompt at publish time — includes everything EXCEPT
 * dependency data (which is not yet available). The full prompt will be
 * rebuilt at dispatch time by calling buildPrompt().
 */
function buildSkeletonPrompt(event, runDir, projectRoot) {
  if (!event || !event.identity) {
    throw new Error('buildSkeletonPrompt: invalid event object');
  }

  const { event_id, workflow_name, phase_name, skill, agent } = event.identity;
  const runId = event.identity.run_id;

  // Read SKILL.md (handles both single skill and skills: plural list)
  const { stepsSection, contextSection } = readSkillSections(event, projectRoot);

  // Read stack profile
  const stackContent = readStackProfile(projectRoot);
  const angularVersion = extractStackVersion(stackContent, 'angular');
  const nodeVersion = extractStackVersion(stackContent, 'node');

  // Read resolver info
  const resolverInfo = readResolverInfo(skill, projectRoot);

  // Build the skeleton prompt (no dependency data)
  const lines = [];

  lines.push('---');
  lines.push(`event_id: "${event_id}"`);
  lines.push(`workflow: "${workflow_name}"`);
  lines.push(`phase: "${phase_name}"`);
  if (skill) lines.push(`skill: "${skill}"`);
  if (agent) lines.push(`agent: "${agent}"`);
  lines.push('---');
  lines.push('');

  lines.push('## Task');
  if (contextSection) {
    lines.push(contextSection);
  } else {
    lines.push(`Execute the "${phase_name}" phase of the ${workflow_name} workflow.`);
  }
  lines.push('');

  lines.push('## Project Context');
  lines.push(`- Angular version: ${angularVersion}`);
  lines.push(`- Node version: ${nodeVersion}`);
  if (event.context && event.context.project_root) {
    lines.push(`- Project root: ${event.context.project_root}`);
  } else {
    lines.push(`- Project root: ${projectRoot}`);
  }
  if (resolverInfo) {
    lines.push('');
    lines.push('### Version Resolver');
    lines.push('```yaml');
    lines.push(resolverInfo.trim());
    lines.push('```');
  }
  lines.push('');

  // Runtime Context
  const ctx = event.context || {};
  const ctxKeys = Object.keys(ctx).filter(k => k !== 'inherited_from');
  if (ctxKeys.length > 0) {
    lines.push('## Runtime Context');
    lines.push('');
    for (const key of ctxKeys) {
      const value = ctx[key];
      lines.push(`- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
    lines.push('');
  }

  // Placeholder for dependency data (will be filled at dispatch time)
  lines.push('## Inputs from Previous Phases');
  lines.push('*(Will be populated at dispatch time with actual data from completed dependencies.)*');
  lines.push('');

  lines.push('## Instructions');
  if (stepsSection) {
    lines.push(stepsSection);
  } else {
    lines.push(`Complete the "${phase_name}" phase. Follow the skill documentation if available.`);
  }
  lines.push('');

  lines.push('## Completion Protocol');
  lines.push('When you have completed this phase, create this file:');
  lines.push('');
  lines.push(`**Path:** \`.orch/workflow-state/events/${runId}/${event_id}.complete.json\``);
  lines.push('');
  lines.push('**Content:**');
  lines.push('```json');
  lines.push('{');
  lines.push('  "status": "complete",');
  lines.push('  "summary": "<what you did>",');
  lines.push('  "files_modified": ["<list>"],');
  lines.push('  "collected": { "<key-value data for downstream phases>" },');
  lines.push('  "error": null');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('If the phase fails, set status to "failed" and include the error.');

  // Write the prompt file
  const promptPath = path.join(runDir, `${event_id}.prompt.md`);
  fs.writeFileSync(promptPath, lines.join('\n'));

  return promptPath;
}

module.exports = { buildPrompt, buildSkeletonPrompt, extractSection };
