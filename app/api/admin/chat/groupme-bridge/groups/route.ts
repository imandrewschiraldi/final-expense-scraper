import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/apiAuth";
import { fetchGroupMeGroups } from "@/lib/groupmePoll";

/** Stateless lookup, not tied to any particular channel — the "paste a
 *  token, see which groups it can read, pick one" step of connecting a
 *  POLL-mode bridge, before anything is saved. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as {
    accessToken?: string;
  } | null;
  const accessToken = body?.accessToken?.trim();
  if (!accessToken)
    return NextResponse.json(
      { error: "accessToken is required" },
      { status: 400 },
    );

  try {
    const groups = await fetchGroupMeGroups(accessToken);
    return NextResponse.json({ groups });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load groups." },
      { status: 400 },
    );
  }
}
