import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin, requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const resources = await db.resource.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });

  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const formData = await req.formData();
  const file = formData.get("file");
  const title = formData.get("title");
  const description = formData.get("description");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 },
    );
  }

  const blob = await put(`resources/${Date.now()}-${file.name}`, file, { access: "public" });

  const resource = await db.resource.create({
    data: {
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      fileUrl: blob.url,
      uploadedById: guard.session.user.id,
    },
  });

  return NextResponse.json({ resource }, { status: 201 });
}
