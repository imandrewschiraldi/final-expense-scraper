import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAndSendInvite(agent: { id: string; name: string; email: string }) {
  const token = randomBytes(32).toString("hex");
  const inviteTokenHash = hashInviteToken(token);
  const inviteTokenExpiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  await db.user.update({
    where: { id: agent.id },
    data: { inviteTokenHash, inviteTokenExpiresAt, invitedAt: new Date() },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${token}`;

  await sendInviteEmail({ to: agent.email, agentName: agent.name, inviteUrl });
}
