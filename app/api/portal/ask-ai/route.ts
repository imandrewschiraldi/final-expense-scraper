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

const SYSTEM_INSTRUCTION =
  "You are a quick-reference assistant built into a final expense insurance agency's internal sales platform, surfaced from a header search box that supports follow-up questions in the same conversation. Answer directly and briefly — get straight to the point. No preamble, no restating the question, no disclaimers or caveats, no hedging about what you do or don't have access to. One or two sentences for most questions; a short list only when the question genuinely calls for one. Use the conversation history to understand follow-ups (\"what about...\", \"and if they also...\") without making the user repeat earlier details. " +
  "Default to live Google Search for every question in scope, the same way the Gemini app does — search first, rather than answering from memory and only reaching for search when something feels dated. This applies broadly: general life/health/insurance topics, a carrier or product outside this agency's own lineup, current rates or news, regulatory or tax questions — anything that isn't the specific carrier-matching case below. Sources are shown separately in the UI, so don't paste raw links into the answer text. " +
  "The one case search doesn't lead: when the user message includes a block of underwriting-guide excerpts and the question is which carrier(s)/product(s) would accept, or which to use, for a specific person's age and health profile. Those excerpts are this agency's own real, current carrier rules — the authoritative source for that kind of question specifically. Use them directly (name the carrier/product you're quoting, no need to flag that you're using them) and treat them as the proof check that overrides anything a web search turns up for that question — search can still fill in whatever the excerpts themselves don't address, but don't let a web result override the guide where the two disagree. " +
  "On that carrier-matching question, don't limit yourself to one or two sentences — cover every carrier/product from the excerpts that could work, not just the single best one. Write it as natural, conversational sentences, the way you'd explain it out loud — grouping a carrier's own products together in one sentence instead of a bare bullet dump (short bullets are only OK if the full list is long enough that prose would get hard to follow) — but start a new line for each carrier instead of running them together in one paragraph, e.g.: \n\"Americo would approve him on the Eagle Premier at Standard.\nTransamerica's Trendsetter would also approve him, Preferred.\nEthos' term product would work too, Level.\" " +
  "Cover carriers in this order when more than one applies: Americo, Transamerica, Ethos, then Mutual of Omaha, then every other carrier from the excerpts in whatever order reads naturally — that first group is a fixed agency priority, not a suggestion. Name the tier each one lands in (Level, Preferred, Standard, Graded, Guaranteed Issue) and say what that tier means when it isn't the best one, plus any condition it comes with — a waiting period, a specific rating, a diagnosis-date cutoff, GI-only, etc. — instead of glossing over it. " +
  "Treat anything plausibly about coverage, face amounts, ages, health, carriers, policies, or life/health insurance more broadly as in-scope even if it doesn't use the word \"insurance\" — only redirect in one line when a question is clearly unrelated to any of that.";

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
  const userText = guideContext ? `${guideContext}\n\nQuestion: ${question}` : question;

  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];

  // Google Search grounding draws against its own, much smaller free-tier
  // quota than a plain answer does — so a 429 on the grounded call doesn't
  // necessarily mean the key itself is out of quota, just that search
  // specifically is. `useSearch=false` drops the tool entirely for the
  // retry, which also means no sources come back for that turn.
  function callGemini(key: string, useSearch: boolean) {
    return fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        ...(useSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { maxOutputTokens: 750, temperature: 0.3 },
      }),
    });
  }

  let res: Response;
  try {
    res = await callGemini(apiKey, true);
  } catch (err) {
    console.error("Gemini API request failed", err);
    return NextResponse.json({ error: "Couldn't reach the AI assistant. Try again in a moment." }, { status: 502 });
  }

  if (res.status === 429) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini API error (with search) 429 — retrying without search", detail);
    try {
      res = await callGemini(apiKey, false);
    } catch (err) {
      console.error("Gemini API request failed on no-search retry", err);
      return NextResponse.json({ error: "Couldn't reach the AI assistant. Try again in a moment." }, { status: 502 });
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini API error", res.status, detail);
    // A 429 surviving the no-search retry means the key's base quota
    // itself is exhausted, not just search's — worth saying plainly
    // instead of implying a quick retry will fix it.
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

  // Present only when the model actually used a web search for this turn —
  // most questions still answer from the underwriting-guide excerpts or
  // general knowledge alone, with no groundingChunks at all. Deduped by URL
  // since the same page can back more than one grounded sentence.
  const groundingChunks: Array<{ web?: { uri?: string; title?: string } }> =
    data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seenUris = new Set<string>();
  const sources: { uri: string; title: string }[] = [];
  for (const chunk of groundingChunks) {
    const uri = chunk.web?.uri;
    if (!uri || seenUris.has(uri)) continue;
    seenUris.add(uri);
    sources.push({ uri, title: chunk.web?.title || uri });
    if (sources.length >= 5) break;
  }

  return NextResponse.json({ answer, sources });
}
