import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 },
    );
  }

  const blob = await put(`profile-pictures/${guard.session.user.id}-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  const user = await db.user.update({
    where: { id: guard.session.user.id },
    data: { profileImageUrl: blob.url },
    select: { profileImageUrl: true },
  });

  return NextResponse.json({ profileImageUrl: user.profileImageUrl });
}
