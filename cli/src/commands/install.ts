/**
 * orch install <agent> — Install a specific agent + its skills
 */

export async function installCommand(agent: string, options: any): Promise<void> {
  const agentName = agent.replace('@', '');
  console.log(`Installing @${agentName}...`);
  console.log('(Delegates to init with --domain flag)');
  // In practice, this calls the same assembler logic as init
  // but for a single domain. Placeholder for now.
  console.log(`Run: orch init --domain ${agentName}`);
}
