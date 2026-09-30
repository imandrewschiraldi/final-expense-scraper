import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Inbound webhook for the Base44 "Apply Now" job-application site — an
 * external, unauthenticated caller, so the secret token in the URL path is
 * the only gate (checked with a timing-safe comparison rather than `===`
 * to avoid leaking the correct value one byte at a time via response
 * timing). Not a session-based admin route, so lib/apiAuth's requireAdmin
 * doesn't apply here.
 */
function isAuthorized(token: string): boolean {
  const secret = process.env.BASE44_WEBHOOK_SECRET;
  if (!secret) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Base44's exact payload shape isn't documented anywhere we control, so
 * every field is looked up across several plausible key names (including
 * one level of nesting under common envelope keys) instead of assuming one
 * fixed shape. rawPayload always keeps the untouched body regardless, so a
 * wrong guess here never loses data — it's just a matter of updating this
 * mapping and re-deriving already-stored rows if needed.
 */
function firstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function parseLicensed(obj: Record<string, unknown>): boolean | null {
  const raw = firstString(obj, ["licensed", "licensing_status", "licensingStatus", "license_status", "is_licensed"]);
  if (raw === null) {
    const bool = obj.licensed;
    if (typeof bool === "boolean") return bool;
    return null;
  }
  const normalized = raw.toLowerCase();
  if (normalized.includes("unlicensed") || normalized.includes("not licensed") || normalized === "no" || normalized === "false") {
    return false;
  }
  if (normalized.includes("licensed") || normalized === "yes" || normalized === "true") return true;
  return null;
}

function candidateObjects(body: Record<string, unknown>): Record<string, unknown>[] {
  const nestedKeys = ["data", "fields", "submission", "answers", "form_response", "payload"];
  const objects: Record<string, unknown>[] = [body];
  for (const key of nestedKeys) {
    const nested = body[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      objects.push(nested as Record<string, unknown>);
    }
  }
  return objects;
}

function extractField(objects: Record<string, unknown>[], keys: string[]): string | null {
  for (const obj of objects) {
    const found = firstString(obj, keys);
    if (found) return found;
  }
  return null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isAuthorized(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const objects = candidateObjects(body);

  const name = extractField(objects, ["name", "full_name", "fullName", "applicant_name"]);
  if (!name) {
    return NextResponse.json({ error: "Could not find an applicant name in the payload" }, { status: 422 });
  }

  const licensedObj = objects.find((o) => "licensed" in o || "licensing_status" in o || "licensingStatus" in o) ?? objects[0];

  const application = await db.jobApplication.create({
    data: {
      name,
      email: extractField(objects, ["email", "applicant_email"]),
      phone: extractField(objects, ["phone", "phone_number", "phoneNumber"]),
      state: extractField(objects, ["state", "applicant_state"]),
      experience: extractField(objects, ["experience", "years_experience", "yearsExperience"]),
      licensed: parseLicensed(licensedObj),
      videoUrl: extractField(objects, ["video", "video_url", "videoUrl", "intro_video", "introVideo", "video_link"]),
      rawPayload: body as object,
    },
  });

  return NextResponse.json({ ok: true, id: application.id });
}
