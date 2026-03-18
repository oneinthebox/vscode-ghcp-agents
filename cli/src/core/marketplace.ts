/**
 * ORCH CLI — Marketplace Reader
 *
 * Reads the marketplace/ directory to discover available agents, skills,
 * instructions, hooks, and scripts. Maps agents to their skills.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AgentDef {
  name: string;
  file: string;
  skills: string[];
  isWorker: boolean;
}

export interface SkillDef {
  name: string;
  dir: string;
  hasReferences: boolean;
  hasTemplates: boolean;
  hasExamples: boolean;
  hasScripts: boolean;
  hasSchemas: boolean;
}

export interface MarketplaceContents {
  agents: AgentDef[];
  skills: SkillDef[];
  instructions: string[];
  hooks: string[];
  auditScripts: string[];
  semanticAdapters: string[];
}

export function readMarketplace(marketplacePath: string): MarketplaceContents {
  const mp = path.resolve(marketplacePath);
  const ghDir = path.join(mp, '.github');

  const contents: MarketplaceContents = {
    agents: [],
    skills: [],
    instructions: [],
    hooks: [],
    auditScripts: [],
    semanticAdapters: [],
  };

  // Read agents
  const agentsDir = path.join(ghDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const file of fs.readdirSync(agentsDir)) {
      if (!file.endsWith('.agent.md')) continue;
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      const name = extractFrontmatter(content, 'name') || file.replace('.agent.md', '');
      const isWorker = content.includes('user-invocable: false');
      const skills = extractSkillsFromAgent(content);
      contents.agents.push({ name, file, skills, isWorker });
    }
  }

  // Read skills
  const skillsDir = path.join(ghDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const dir of fs.readdirSync(skillsDir)) {
      const skillDir = path.join(skillsDir, dir);
      if (!fs.statSync(skillDir).isDirectory()) continue;
      if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) continue;

      contents.skills.push({
        name: dir,
        dir: skillDir,
        hasReferences: fs.existsSync(path.join(skillDir, 'references')),
        hasTemplates: fs.existsSync(path.join(skillDir, 'templates')),
        hasExamples: fs.existsSync(path.join(skillDir, 'examples')),
        hasScripts: fs.existsSync(path.join(skillDir, 'scripts')),
        hasSchemas: fs.existsSync(path.join(skillDir, 'schemas')),
      });
    }
  }

  // Read instructions
  const instrDir = path.join(ghDir, 'instructions');
  if (fs.existsSync(instrDir)) {
    contents.instructions = fs.readdirSync(instrDir)
      .filter(f => f.endsWith('.instructions.md'));
  }

  // Read hooks
  const hooksDir = path.join(ghDir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    contents.hooks = fs.readdirSync(hooksDir)
      .filter(f => f.endsWith('.json'));
  }

  // Read audit scripts
  const auditDir = path.join(mp, 'scripts', 'audit');
  if (fs.existsSync(auditDir)) {
    contents.auditScripts = fs.readdirSync(auditDir)
      .filter(f => f.endsWith('.sh') || f.endsWith('.py'));
  }

  // Read semantic adapters
  const semanticDir = path.join(mp, 'scripts', 'semantic', 'adapters');
  if (fs.existsSync(semanticDir)) {
    contents.semanticAdapters = fs.readdirSync(semanticDir)
      .filter(f => fs.statSync(path.join(semanticDir, f)).isDirectory());
  }

  return contents;
}

/**
 * Get the agent-to-skill mapping for a specific domain
 */
export function getAgentSkills(marketplace: MarketplaceContents, agentName: string): string[] {
  const agent = marketplace.agents.find(a => a.name === agentName);
  return agent?.skills || [];
}

/**
 * Get all agents for a domain (coordinator + its workers)
 */
export function getAgentWithWorkers(marketplace: MarketplaceContents, agentName: string): AgentDef[] {
  const agent = marketplace.agents.find(a => a.name === agentName);
  if (!agent) return [];

  // Find workers by reading agent file for 'agents:' field
  const workers = marketplace.agents.filter(a => a.isWorker);
  return [agent, ...workers.filter(w => {
    // Worker belongs to this coordinator if coordinator references it
    return agent.skills.length > 0; // simplified — in practice parse the agents: field
  })];
}

// ── Helpers ──

function extractFrontmatter(content: string, field: string): string | null {
  const match = content.match(new RegExp(`^${field}:\\s*"?([^"\\n]+)"?`, 'm'));
  return match ? match[1].trim() : null;
}

function extractSkillsFromAgent(content: string): string[] {
  // Extract skill names from the agent's "Your skills" or description section
  const skillMatches = content.match(/\/(\w[-\w]*)/g);
  return skillMatches
    ? [...new Set(skillMatches.map(s => s.slice(1)))] // remove leading /
    : [];
}
