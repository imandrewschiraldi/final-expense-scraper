import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { F90_DOC_TYPES, F90_DOC_MAX_BYTES, F90_DOC_MIME_TYPES, type F90DocType } from "@/lib/f90Content";

export const dynamic = "force-dynamic";

const FIELD_BY_DOC_TYPE: Record<F90DocType, "f90LicenseDocUrl" | "f90EoDocUrl" | "f90AmlDocUrl"> = {
  license: "f90LicenseDocUrl",
  eo: "f90EoDocUrl",
  aml: "f90AmlDocUrl",
};

/** Uploads one compliance document (resident license, E&O certificate, AML
 *  certificate) to Blob storage and saves its URL on the agent's own
 *  record — same pattern as the training-lesson image upload, just scoped
 *  to the signed-in agent's own F90 progress instead of admin content. */
export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const userId = guard.session.user.id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { f90EnrolledAt: true },
  });
  if (!user?.f90EnrolledAt) {
    return NextResponse.json({ error: "Not enrolled in F90" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const docType = formData.get("docType");

  if (typeof docType !== "string" || !F90_DOC_TYPES.includes(docType as F90DocType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!F90_DOC_MIME_TYPES.includes(file.type as (typeof F90_DOC_MIME_TYPES)[number])) {
    return NextResponse.json({ error: "Only PNG, JPEG, WebP, or PDF files are allowed" }, { status: 400 });
  }
  if (file.size > F90_DOC_MAX_BYTES) {
    return NextResponse.json({ error: "That file is too large (10MB max)" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "File storage isn't configured yet — BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 },
    );
  }

  const blob = await put(`f90-docs/${userId}-${docType}-${Date.now()}-${file.name}`, file, {
    access: "public",
  });

  const field = FIELD_BY_DOC_TYPE[docType as F90DocType];
  await db.user.update({ where: { id: userId }, data: { [field]: blob.url } });

  return NextResponse.json({ url: blob.url });
}
