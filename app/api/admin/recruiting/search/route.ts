import { NextRequest, NextResponse } from "next/server";
import { requireRecruitingRadarAccess } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { searchApolloPeople, ApolloSearchError } from "@/lib/apollo";
import { CATEGORIES, MARKETS, isCategoryKey, isMarketId } from "@/lib/recruitingRadar";

/** Runs one Apollo People Search for a single background/market pair, dedupes against every prospect already sourced, and inserts the rest. */
export async function POST(req: NextRequest) {
  const guard = await requireRecruitingRadarAccess();
  if ("error" in guard) return guard.error;

  const { category, market } = (await req.json().catch(() => ({}))) as { category?: string; market?: string };
  if (!category || !isCategoryKey(category)) {
    return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
  }
  if (!market || !isMarketId(market)) {
    return NextResponse.json({ error: "Invalid or missing market" }, { status: 400 });
  }

  const cat = CATEGORIES[category];
  const mkt = MARKETS.find((m) => m.id === market)!;

  let people;
  try {
    people = await searchApolloPeople(cat.titles, mkt.locations, mkt.label);
  } catch (err) {
    const message = err instanceof ApolloSearchError ? err.message : "Apollo search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const candidates = people
    .filter((p) => p.name)
    .map((p) => ({
      name: p.name,
      title: p.title,
      company: p.company,
      location: p.location,
      linkedinUrl: p.linkedinUrl || null,
      category: cat.label,
      market: mkt.label,
      dedupeKey: `${p.name}|${p.company}`,
    }));

  if (candidates.length === 0) {
    return NextResponse.json({ added: 0, prospects: [] });
  }

  // Skip anything already sourced (by the same name|company dedupe key the
  // reference tool used) — createMany + skipDuplicates on the unique
  // dedupeKey column does this in one round trip instead of a Set diff.
  const result = await db.recruitProspect.createManyAndReturn({
    data: candidates,
    skipDuplicates: true,
  });

  return NextResponse.json({ added: result.length, prospects: result });
}
