import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { buildUnderwritingContext } from "@/lib/underwriting/aiContext";

// "-latest" alias instead of a pinned version (gemini-2.5-flash/2.0-flash
// both now 404 — Google retires pinned versions) so this keeps working as
// the model behind the alias rotates. "flash-lite", not the full "flash"
// alias: the full alias was returning 503 "high demand" at the time this
// was wired up, while flash-lite answered cleanly — more than enough model
// for a quick insurance/underwriting Q&A box anyway.
const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const LINKUP_URL = "https://api.linkup.so/v1/search";
const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/search";

type Source = { uri: string; title: string };
type LiveSearchResult = { contextText: string; sources: Source[] };

// Firecrawl returns raw results (title/url/description per hit), not a
// synthesized answer, so the top hits get folded into a short bulleted
// context block for Gemini to read rather than quoted as a ready answer.
async function firecrawlSearch(apiKey: string, query: string): Promise<LiveSearchResult | null> {
  try {
    const res = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, limit: 5 }),
    });
    if (!res.ok) {
      console.error("Firecrawl API error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const hits: Array<{ url?: string; title?: string; description?: string }> = data?.data?.web ?? [];
    const seen = new Set<string>();
    const sources: Source[] = [];
    const lines: string[] = [];
    for (const hit of hits) {
      if (!hit.url || seen.has(hit.url)) continue;
      seen.add(hit.url);
      lines.push(`- ${hit.title ?? hit.url}: ${hit.description ?? ""}`);
      sources.push({ uri: hit.url, title: hit.title || hit.url });
      if (sources.length >= 5) break;
    }
    return lines.length ? { contextText: lines.join("\n"), sources } : null;
  } catch (err) {
    console.error("Firecrawl API request failed", err);
    return null;
  }
}

// LinkUp's sourcedAnswer already synthesizes a written answer from its
// sources, used as-is for the context block.
async function linkupSearch(apiKey: string, query: string): Promise<LiveSearchResult | null> {
  try {
    const res = await fetch(LINKUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ q: query, depth: "standard", outputType: "sourcedAnswer" }),
    });
    if (!res.ok) {
      console.error("LinkUp API error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const answer: string | undefined = data?.answer;
    if (!answer) return null;
    const rawSources: Array<{ name?: string; url?: string }> = data?.sources ?? [];
    const seen = new Set<string>();
    const sources: Source[] = [];
    for (const s of rawSources) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      sources.push({ uri: s.url, title: s.name || s.url });
      if (sources.length >= 5) break;
    }
    return { contextText: answer, sources };
  } catch (err) {
    console.error("LinkUp API request failed", err);
    return null;
  }
}

// Firecrawl is the primary live-search backend (generous free tier);
// LinkUp is a fallback for when Firecrawl errors out or its key is
// missing/exhausted, so a single provider outage doesn't take down search
// entirely. Either key can be absent without failing the request — the
// assistant still answers from the guide excerpts/general knowledge alone.
async function liveSearch(query: string): Promise<LiveSearchResult | null> {
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
  "You are a quick-reference assistant built into a final expense insurance agency's internal sales platform, surfaced from a header search box that supports follow-up questions in the same conversation. Answer directly and briefly — get straight to the point. No preamble, no restating the question, no disclaimers or caveats, no hedging about what you do or don't have access to. One or two sentences for most questions; a short list only when the question genuinely calls for one. Use the conversation history to understand follow-ups (\"what about...\", \"and if they also...\") without making the user repeat earlier details. " +
  "Route to the agency's own underwriting-guide excerpts (when the user message includes a block of them) whenever the question is about a specific person's eligibility — gender, age, a medical condition, prescription, or medication, which carrier(s)/product(s) would accept them, which carrier to use, or where they'd get approved. Those excerpts are this agency's own real, current carrier rules — the authoritative source for that kind of question. Use them directly (name the carrier/product you're quoting, no need to flag that you're using them) and treat them as the proof check that overrides the live web search findings for that question where the two disagree — the search findings can still fill in whatever the excerpts themselves don't address. " +
  "On that eligibility/carrier-matching question, don't limit yourself to one or two sentences — cover every carrier/product from the excerpts that could work, not just the single best one. Write it as natural, conversational sentences, the way you'd explain it out loud — grouping a carrier's own products together in one sentence instead of a bare bullet dump (short bullets are only OK if the full list is long enough that prose would get hard to follow) — but start a new line for each carrier instead of running them together in one paragraph, e.g.: \n\"Americo would approve him on the Eagle Premier at Standard.\nTransamerica's Trendsetter would also approve him, Preferred.\nEthos' term product would work too, Level.\" " +
  "Cover carriers in this order when more than one applies: Americo, Transamerica, Ethos, then Mutual of Omaha, then every other carrier from the excerpts in whatever order reads naturally — that first group is a fixed agency priority, not a suggestion. Name the tier each one lands in (Level, Preferred, Standard, Graded, Guaranteed Issue) and say what that tier means when it isn't the best one, plus any condition it comes with — a waiting period, a specific rating, a diagnosis-date cutoff, GI-only, etc. — instead of glossing over it. " +
  "Every question is run through a live web search before you see it. When the user message includes a \"Live web search findings\" block, treat that as this turn's real, current search result and answer from it as your primary source — rather than from memory alone — for everything except the eligibility/carrier-matching case above, where the agency's own guide excerpts take priority instead. This covers lead vendors, insurance/financial industry terminology, current financial markets, stocks, crypto, housing markets, funeral/burial/cremation costs, annuities, mortgage protection, equity, business-building and sales topics, and financial services more broadly — not just insurance, and not just the eligibility case above. Sources are shown separately in the UI, so don't paste raw links into the answer text. " +
  "Scope is broad, not insurance-only — treat any reasonable work topic as answerable rather than redirecting on subject matter. The only thing to decline or redirect for is content that's inappropriate for a work setting (profanity, weapons/violence, drugs, partying, or similar) — never redirect just because a question isn't about insurance.";

const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_TURNS = 12;

type ChatTurn = { role: "user" | "model"; text: string };

function parseHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is ChatTurn =>
        !!t &&
        (t.role === "user" || t.role === "model") &&
        typeof t.text === "string" &&
        t.text.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_QUESTION_LENGTH * 2) }));
}

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI search isn't configured yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: `Keep questions under ${MAX_QUESTION_LENGTH} characters.` }, { status: 400 });
  }

  const history = parseHistory(body?.history);

  // Ground on everything the user has asked so far in this conversation, not
  // just the latest message — a follow-up like "what if they also smoke?"
  // needs the condition named in an earlier turn to still pull the right
  // guide excerpts.
  const priorQuestions = history.filter((t) => t.role === "user").map((t) => t.text);
  const guideContext = buildUnderwritingContext([...priorQuestions, question].join(" "));
  const searchResult = await liveSearch(question);

  const parts: string[] = [];
  if (guideContext) parts.push(guideContext);
  if (searchResult) parts.push(`Live web search findings for this question:\n${searchResult.contextText}`);
  parts.push(`Question: ${question}`);
  const userText = parts.join("\n\n");

  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];

  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: { maxOutputTokens: 750, temperature: 0.3 },
      }),
    });
  } catch (err) {
    console.error("Gemini API request failed", err);
    return NextResponse.json({ error: "Couldn't reach the AI assistant. Try again in a moment." }, { status: 502 });
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
  const answer: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) {
    return NextResponse.json({ error: "Didn't get a usable answer back. Try rephrasing the question." }, { status: 502 });
  }

  return NextResponse.json({ answer, sources: searchResult?.sources ?? [] });
}
