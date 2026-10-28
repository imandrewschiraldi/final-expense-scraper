import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { VENDORS, vendorSlug } from "@/lib/vendors";

export const dynamic = "force-dynamic";

type ResultType = "lead" | "carrier" | "training" | "vendor";
type SearchResult = { type: ResultType; id: string; title: string; subtitle?: string; href: string };

const RESULT_LIMIT = 5;

/**
 * Backs the sidebar's "search everything" box — the nav-item filter it also
 * does stays entirely client-side (see Sidebar.tsx); this only covers real
 * data: leads/contacts, carriers, training, and lead vendors. Each category
 * is capped at RESULT_LIMIT so one broad match (e.g. a common last name)
 * can't crowd out the others.
 */
export async function GET(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const role = guard.session.user.role;
  const userId = guard.session.user.id;

  const [leadResults, carrierResults, trainingResults] = await Promise.all([
    searchLeads(q, role, userId),
    searchCarriers(q, role),
    searchTraining(q, role),
  ]);
  const vendorResults = searchVendors(q);

  return NextResponse.json({
    results: [...leadResults, ...carrierResults, ...trainingResults, ...vendorResults],
  });
}

async function searchLeads(q: string, role: string, userId: string): Promise<SearchResult[]> {
  // Agents/managers only ever see their own assigned leads everywhere else
  // in the app (see app/agent/dashboard/page.tsx, app/agent/leads/[id]/page.tsx,
  // lib/agentLeads.ts) — search has to respect that same boundary, not a
  // looser one, or it'd leak other agents' contacts through the search box.
  const scopeWhere = role === "ADMIN" ? {} : { assignedAgentId: userId };

  const words = q.split(/\s+/).filter(Boolean);
  const nameOr =
    words.length > 1
      ? [{ AND: [{ firstName: { contains: words[0], mode: "insensitive" as const } }, { lastName: { contains: words[1], mode: "insensitive" as const } }] }]
      : [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
        ];

  const leads = await db.lead.findMany({
    where: {
      ...scopeWhere,
      isArchived: false,
      OR: [...nameOr, { phone: { contains: q } }],
    },
    select: { id: true, firstName: true, lastName: true, phone: true, status: true, assignedAgentId: true },
    take: RESULT_LIMIT,
    orderBy: { updatedAt: "desc" },
  });

  return leads.map((lead) => ({
    type: "lead",
    id: lead.id,
    title: `${lead.firstName} ${lead.lastName}`,
    subtitle: lead.phone,
    // Only agent/manager has a real per-lead page (scoped to their own
    // assignment) — admin has no equivalent detail route today, so an
    // admin's match points at the Leads hub instead of a dead/wrong link.
    href: role === "ADMIN" ? "/admin/leads" : `/agent/leads/${lead.id}`,
  }));
}

async function searchCarriers(q: string, role: string): Promise<SearchResult[]> {
  const carriers = await db.carrier.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: { id: true, name: true },
    take: RESULT_LIMIT,
    orderBy: { name: "asc" },
  });

  return carriers.map((carrier) => ({
    type: "carrier",
    id: carrier.id,
    title: carrier.name,
    subtitle: "Carrier Resources",
    // Agent-facing grid supports ?carrier= deep-linking (scrolls + rings
    // the card); the admin editing panel doesn't need that treatment — a
    // searched carrier there is still easy to find in its own list.
    href: role === "ADMIN" ? "/admin/carrier-resources" : `/carrier-resources?carrier=${carrier.id}`,
  }));
}

async function searchTraining(q: string, role: string): Promise<SearchResult[]> {
  const trainingHome = role === "ADMIN" ? "/admin/training" : "/agent/training";

  const lessons = await db.trainingLesson.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    select: { id: true, title: true, module: { select: { title: true } } },
    take: RESULT_LIMIT,
    orderBy: { order: "asc" },
  });
  if (lessons.length > 0) {
    return lessons.map((lesson) => ({
      type: "training",
      id: lesson.id,
      title: lesson.title,
      subtitle: lesson.module.title,
      // Admin manages lessons from the module editor, not a per-lesson
      // viewer page — only agent/manager has the lesson-viewing route.
      href: role === "ADMIN" ? trainingHome : `/agent/training/lessons/${lesson.id}`,
    }));
  }

  // No lesson title matched — fall back to a module-title match so e.g.
  // searching a course name still finds something, just at module level.
  const modules = await db.trainingModule.findMany({
    where: { title: { contains: q, mode: "insensitive" } },
    select: { id: true, title: true },
    take: RESULT_LIMIT,
    orderBy: { order: "asc" },
  });
  return modules.map((mod) => ({
    type: "training",
    id: mod.id,
    title: mod.title,
    subtitle: "Training module",
    href: trainingHome,
  }));
}

function searchVendors(q: string): SearchResult[] {
  const needle = q.toLowerCase();
  return VENDORS.filter((v) => v.name.toLowerCase().includes(needle))
    .slice(0, RESULT_LIMIT)
    .map((vendor) => ({
      type: "vendor" as const,
      id: vendorSlug(vendor.name),
      title: vendor.name,
      subtitle: "Lead vendor",
      href: `/agent/buy-leads?vendor=${vendorSlug(vendor.name)}`,
    }));
}
