import { db } from "@/lib/db";
import { hashInviteToken } from "@/lib/invite";
import { AcceptInviteForm } from "@/components/agent/AcceptInviteForm";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inviteTokenHash = hashInviteToken(token);
  const user = await db.user.findUnique({ where: { inviteTokenHash } });

  const isValid = !!user && !!user.inviteTokenExpiresAt && user.inviteTokenExpiresAt > new Date();

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-condensed mb-1 text-center text-3xl font-extrabold tracking-wide text-copper uppercase">
          Tier 1 Lead System
        </h1>

        {isValid ? (
          <>
            <p className="mb-8 text-center text-sm text-muted">Welcome, {user!.name} — set your password</p>
            <AcceptInviteForm token={token} />
          </>
        ) : (
          <div className="rounded-[10px] border border-border bg-surface p-6 text-center">
            <p className="text-sm text-copper">
              This invite link is invalid or has expired. Ask your admin to resend your invite.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
