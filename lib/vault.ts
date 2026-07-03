import { db } from "@/lib/db";
import { LeadStatus, isArchivedStatus } from "@/lib/leadStatus";

// Vault leads are a shared pool every agent can browse and call. Touching a
// vault lead with one of these statuses claims it for that agent and pulls
// it out of the shared pool. Contacted/No Answer/New leave it shared.
const VAULT_EXIT_STATUSES: LeadStatus[] = ["APPOINTMENT_BOOKING", "NOT_INTERESTED", "SOLD"];

export function isVaultExitStatus(status: LeadStatus) {
  return VAULT_EXIT_STATUSES.includes(status);
}

// Appointment Booked leads that came from the vault and haven't sold
// within this many days get released back into the shared pool.
export const VAULT_REVERT_DAYS = 14;

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
 * Interested leads are deliberately excluded — those are handled manually
 * by an admin (see the admin Vault "Not Interested" folder), not on a
 * timer.
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
