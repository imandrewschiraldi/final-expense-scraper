import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";

// "-latest" alias instead of a pinned version (gemini-2.5-flash/2.0-flash
// both now 404 — Google retires pinned versions) so this keeps working as
// the model behind the alias rotates. "flash-lite", not the full "flash"
// alias: the full alias was returning 503 "high demand" at the time this
// was wired up, while flash-lite answered cleanly — more than enough model
// for a quick insurance/underwriting Q&A box anyway.
const GEMINI_MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION =
  "You are a quick-reference assistant built into a final expense insurance agency's internal sales platform, surfaced from a header search box. Answer general questions about insurance products, underwriting, carriers, and sales process concisely and practically — a few sentences unless the question genuinely needs more. You are not giving legal, tax, or compliance advice, and you have no access to this agency's actual leads, policies, or carrier contracts — say so plainly if asked something specific to their data instead of guessing. If a question has nothing to do with insurance, underwriting, or sales, say that's outside what you're here for.";

const MAX_QUESTION_LENGTH = 500;

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

  let res: Response;
  try {
    res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.4 },
      }),
    });
  } catch (err) {
    console.error("Gemini API request failed", err);
    return NextResponse.json({ error: "Couldn't reach the AI assistant. Try again in a moment." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Gemini API error", res.status, detail);
    return NextResponse.json({ error: "Couldn't reach the AI assistant. Try again in a moment." }, { status: 502 });
  }

  const data = await res.json();
  const answer: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) {
    return NextResponse.json({ error: "Didn't get a usable answer back. Try rephrasing the question." }, { status: 502 });
  }

  return NextResponse.json({ answer });
}
