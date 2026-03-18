/**
 * orch override <action> [skill] — Manage team overrides
 */

export async function overrideCommand(action: string, skill: string, options: any): Promise<void> {
  console.log(`Override: ${action} ${skill || ''}`);
  console.log('');
  console.log('When implemented, this will:');
  console.log('  create  — scaffold a new override directory with overrides.yaml template');
  console.log('  list    — show all active overrides with expiry dates');
  console.log('  remove  — remove an override');
  console.log('  check   — check for expired overrides');
}
