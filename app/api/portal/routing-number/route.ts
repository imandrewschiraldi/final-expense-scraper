import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";

// Same Gemini + live-search pattern as /api/portal/ask-ai (see that file for
// why Firecrawl is primary and LinkUp is the fallback) — reused here rather
// than wired to a separate AI provider since both keys are already
// configured for this app, and grounding the answer in an actual live
// search result is more trustworthy for a number this consequential than
// asking a model to recall it from memory alone.
const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const LINKUP_URL = "https://api.linkup.so/v1/search";
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/search";

type LiveSearchResult = { contextText: string } | null;

async function firecrawlSearch(
  apiKey: string,
  query: string,
): Promise<LiveSearchResult> {
  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit: 5 }),
    });
    if (!res.ok) {
      console.error(
        "Firecrawl API error",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }
    const data = await res.json();
    const hits: Array<{ url?: string; title?: string; description?: string }> =
      data?.data?.web ?? [];
    const lines = hits
      .filter((hit) => hit.url)
      .slice(0, 5)
      .map(
        (hit) =>
          `- ${hit.title ?? hit.url} (${hit.url}): ${hit.description ?? ""}`,
      );
    return lines.length ? { contextText: lines.join("\n") } : null;
  } catch (err) {
    console.error("Firecrawl API request failed", err);
    return null;
  }
}

async function linkupSearch(
  apiKey: string,
  query: string,
): Promise<LiveSearchResult> {
  try {
    const res = await fetch(LINKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        q: query,
        depth: "standard",
        outputType: "sourcedAnswer",
      }),
    });
    if (!res.ok) {
      console.error(
        "LinkUp API error",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }
    const data = await res.json();
    const answer: string | undefined = data?.answer;
    return answer ? { contextText: answer } : null;
  } catch (err) {
    console.error("LinkUp API request failed", err);
    return null;
  }
}

async function liveSearch(query: string): Promise<LiveSearchResult> {
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    const result = await firecrawlSearch(firecrawlKey, query);
    if (result) return result;
  }
  const linkupKey = process.env.LINKUP_API_KEY;
  if (linkupKey) {
    return linkupSearch(linkupKey, query);
  }
  return null;
}

const SYSTEM_INSTRUCTION =
  "You look up ABA bank routing numbers for an insurance agency's internal sales platform, given a bank name plus a city, state, or ZIP. " +
  "You're given a live web search result for the query — base your answer on that, not on memory alone. " +
  "If you find a routing number you're confident matches the specific bank and location given, answer with ONLY the routing number and the bank's full name, nothing else — no preamble, no explanation. " +
  "If the search result doesn't clearly confirm a routing number for that specific bank and location (wrong branch, ambiguous, multiple conflicting numbers, or no match), say so directly in one short sentence instead of guessing — never state a routing number you're not confident is correct for the location given.";

const MAX_QUERY_LENGTH = 200;

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json(
      { error: "Routing Number Genie isn't configured yet." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json(
      { error: "Enter a bank name and city or ZIP first." },
      { status: 400 },
    );
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Keep it under ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const searchResult = await liveSearch(`${query} bank routing number`);
  if (!searchResult) {
    return NextResponse.json({
      error:
        "Couldn't find anything for that bank and location. Try the full bank name and a city, state, or ZIP.",
    });
  }

  const userText = `Live web search findings:\n${searchResult.contextText}\n\nBank and location: ${query}`;

  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.1 },
      }),
    });
  } catch (err) {
    console.error("Gemini API request failed", err);
    return NextResponse.json(
      { error: "Couldn't reach the AI assistant. Try again in a moment." },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini API error", res.status, detail);
    const error =
      res.status === 429
        ? "The AI assistant has hit its usage limit for now. Check the Gemini API plan/billing — this won't clear on its own until quota resets."
        : "Couldn't reach the AI assistant. Try again in a moment.";
    return NextResponse.json({ error }, { status: 502 });
  }

  const data = await res.json();
  const answer: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) {
    return NextResponse.json(
      { error: "Didn't get a usable answer back. Try rephrasing." },
      { status: 502 },
    );
  }

  return NextResponse.json({ answer: answer.trim() });
}
