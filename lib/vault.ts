import { db } from "@/lib/db";
import { LeadStatus, isArchivedStatus } from "@/lib/leadStatus";

// Vault leads are a shared pool every agent can browse and call. Touching a
// vault lead with one of these statuses claims it for that agent and pulls
// it out of the shared pool — everything else (Contacted, No Answer, Not
// Interested) leaves it shared, just logged (see CONTACT_LOG_STATUSES).
const VAULT_EXIT_STATUSES: LeadStatus[] = ["APPOINTMENT_BOOKING", "SOLD"];

export function isVaultExitStatus(status: LeadStatus) {
  return VAULT_EXIT_STATUSES.includes(status);
}

// Marking a vault lead with one of these statuses doesn't claim it, but
// does write a ContactLogEntry — a visible record of who touched it and
// when, so other agents browsing the shared vault can see it's already
// been worked instead of spam-calling the same person.
export const CONTACT_LOG_STATUSES: LeadStatus[] = ["CONTACTED", "NO_ANSWER", "NOT_INTERESTED"];

export function shouldLogContact(status: LeadStatus) {
  return CONTACT_LOG_STATUSES.includes(status);
}

// Appointment Booked leads that came from the vault and haven't sold
// within this many days get released back into the shared pool.
export const VAULT_REVERT_DAYS = 14;

// The Vault is only open to an agent for their first 90 days on the team —
// after that their access is revoked, both in the nav and at the API level.
export const VAULT_ACCESS_DAYS = 90;

export function hasVaultAccess(
  agent: { createdAt: Date; vaultEnabled: boolean },
  now: Date = new Date(),
) {
  if (!agent.vaultEnabled) return false;
  const msSinceCreation = now.getTime() - agent.createdAt.getTime();
  return msSinceCreation < VAULT_ACCESS_DAYS * 24 * 60 * 60 * 1000;
}

export async function agentHasVaultAccess(agentId: string, now: Date = new Date()) {
  const agent = await db.user.findUnique({ where: { id: agentId }, select: { createdAt: true, vaultEnabled: true } });
  if (!agent) return false;
  return hasVaultAccess(agent, now);
}

/**
 * Given a lead's current vault state and the status an agent is setting,
 * returns the full set of fields to update. Centralized so the agent PATCH
 * route and any future entry point apply identical vault-exit rules.
 */
export function computeVaultAwareStatusUpdate(
  status: LeadStatus,
  current: { isVaulted: boolean },
  agentId: string,
) {
  const data: {
    status: LeadStatus;
    isArchived: boolean;
    isVaulted?: boolean;
    assignedAgentId?: string;
    assignedAt?: Date;
  } = {
    status,
    isArchived: isArchivedStatus(status),
  };

  if (current.isVaulted && isVaultExitStatus(status)) {
    data.isVaulted = false;
    data.assignedAgentId = agentId;
    data.assignedAt = new Date();
  }

  return data;
}

/**
 * Releases Appointment Booked leads that came from the vault back into
 * the shared pool once they've sat unsold for VAULT_REVERT_DAYS. Not
 * Interested leads never leave the vault in the first place (they stay
 * shared and tagged), so there's nothing to revert for them.
 */
export async function revertStaleVaultAppointments() {
  const cutoff = new Date(Date.now() - VAULT_REVERT_DAYS * 24 * 60 * 60 * 1000);

  const result = await db.lead.updateMany({
    where: {
      vaultOrigin: true,
      isVaulted: false,
      status: "APPOINTMENT_BOOKING",
      assignedAt: { lt: cutoff },
    },
    data: {
      isVaulted: true,
      status: "NEW",
      isArchived: false,
      assignedAgentId: null,
      assignedAt: null,
    },
  });

  return { reverted: result.count };
}
