// Shared sort order for the Agents table's Status column (Active / Invited
// (pending) / Inactive — see AgentsPanel's Status cell). An agent who
// hasn't accepted their invite yet still has `active: true` by default, so
// sorting on `active` alone interleaves them with genuinely active agents
// instead of grouping by what the Status column actually displays.
export function agentStatusRank(agent: { active: boolean; inviteAccepted: boolean }): number {
  if (!agent.inviteAccepted) return 1;
  return agent.active ? 0 : 2;
}
