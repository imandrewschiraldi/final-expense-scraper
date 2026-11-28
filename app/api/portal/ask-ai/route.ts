import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { buildUnderwritingContext } from "@/lib/underwriting/aiContext";
import { db } from "@/lib/db";
import { getCalendarEventsForUser } from "@/lib/calendarEvents";
import { shiftToZone, zonedWallTimeToInstant } from "@/lib/timeZoneMath";
import { startOfDay, addDays, expandOccurrences, formatTime } from "@/lib/calendarRecurrence";
import { metricsForWindow } from "@/lib/personalDashboard";

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
      lines.push(`- ${hit.title ?? hit.url} (${hit.url}): ${hit.description ?? ""}`);
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
    const sourceLines = sources.map((s) => `- ${s.title} (${s.uri})`).join("\n");
    return { contextText: sourceLines ? `${answer}\n\nSources:\n${sourceLines}` : answer, sources };
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

type CrmRecord = { label: string; href: string };

// A.T.L.A.S.'s one real function-calling tool — search the signed-in
// agent's own leads and client policies by name, phone, or email. Scoped
// to the caller's own book regardless of role (same as every other
// agent-facing query in this app, e.g. lib/agentLeads.ts), not an
// agency-wide search, so this never surfaces another agent's book through
// the assistant. Returns a handful of matches plus a deep link per record
// — the one thing the assistant is told to put directly in its reply
// (see SYSTEM_INSTRUCTION's existing "include that one link right in the
// answer" rule), rather than a separate citations list.
const CRM_SEARCH_TOOL = {
  name: "search_crm",
  description:
    "Search the signed-in agent's own CRM — their leads/contacts and their client policies — by a person's name, phone number, or email. Use this whenever the question is about a specific person who might be in the agent's own book (\"pull up Sarah Jenkins\", \"what's John's phone number\", \"is she in my vault\", \"what policy does he have\"), not for general industry questions.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The name, phone number, or email to search for.",
      },
    },
    required: ["query"],
  },
};

// A.T.L.A.S.'s second tool — live web search, now gated behind Gemini's
// own decision rather than running on every single question regardless of
// need (the previous design), specifically to conserve Firecrawl/LinkUp
// credits. The description below is what used to be baked into
// SYSTEM_INSTRUCTION as "every question gets searched" — now it's Gemini's
// own call about when a question actually needs current/external data.
const WEB_SEARCH_TOOL = {
  name: "web_search",
  description:
    "Searches the live web for current, external information. Call this for anything you're not fully confident answering from training alone: lead vendors, current financial markets/stocks/crypto/housing, funeral/burial/cremation costs, annuities, mortgage protection, equity, business-building/sales topics, financial services more broadly, or any other question whose answer could have changed or that needs a real current figure. Skip it for things you already know confidently and simply (definitions, how something works, basic calculations, general advice) — only search when it would actually change or improve the answer, since each search has a real cost. Also skip it for a specific person's carrier-eligibility question (a condition/medication/age against carrier rules) — that's answered from the agency's own underwriting guide excerpts instead, not the web.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The search query.",
      },
    },
    required: ["query"],
  },
};

// Three tools over the signed-in user's own real app data — same spirit as
// search_crm (never guess or invent this stuff, actually look it up) for
// the other "shouldn't this already know this" questions the assistant
// otherwise has no way to answer: today's schedule, today's own
// production, and team headcount.
const TODAY_SCHEDULE_TOOL = {
  name: "get_today_schedule",
  description:
    "Gets what's on the signed-in user's own calendar today — agency-wide events (training, company events) plus their own personal ones (appointments, policy follow-ups, Annual Reviews). Use this for any question about today's schedule, meetings, or what's on the calendar.",
  parameters: { type: "OBJECT", properties: {}, required: [] },
};

const MY_PRODUCTION_TOOL = {
  name: "get_my_production_today",
  description:
    "Gets the signed-in agent's own sales/production for today — how many policies they've submitted today and the total annual premium. Use this for questions like \"how many sales have I made today\" or \"what's my production today\". This is the signed-in user's own numbers only, not the whole agency's.",
  parameters: { type: "OBJECT", properties: {}, required: [] },
};

const TEAM_HEADCOUNT_TOOL = {
  name: "get_team_headcount",
  description:
    "Gets how many agents the signed-in user has under them — their downline if they're a manager, or the whole agency's active agent count if they're an admin. Use this for questions like \"how many agents do I have\" or \"how big is my team\".",
  parameters: { type: "OBJECT", properties: {}, required: [] },
};

async function getTodaySchedule(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  const timeZone = user?.timeZone || undefined;
  const rawEvents = await getCalendarEventsForUser(userId);
  // Same trick CalendarWidget uses: shift every real-instant value (each
  // event's own times, and "now") through the user's zone once, so every
  // date-math helper below — which only ever reads local getters — lines
  // up on the zone's actual wall-clock "today" instead of this server's own.
  const shiftedEvents = rawEvents.map((e) => ({
    ...e,
    startAt: shiftToZone(e.startAt, timeZone),
    endAt: shiftToZone(e.endAt, timeZone),
    recurrenceEndAt: e.recurrenceEndAt ? shiftToZone(e.recurrenceEndAt, timeZone) : null,
  }));
  const todayInZone = shiftToZone(new Date(), timeZone);
  const rangeStart = startOfDay(todayInZone);
  const rangeEnd = addDays(rangeStart, 1);
  const occurrences = expandOccurrences(shiftedEvents, rangeStart, rangeEnd);
  return {
    events: occurrences.map((o) => ({
      title: o.title,
      time: o.allDay ? "All day" : `${formatTime(o.occurrenceStart)}–${formatTime(o.occurrenceEnd)}`,
    })),
  };
}

async function getMyProductionToday(agentId: string) {
  const user = await db.user.findUnique({ where: { id: agentId }, select: { timeZone: true } });
  const timeZone = user?.timeZone || undefined;
  // zonedWallTimeToInstant (not shiftToZone) on purpose here — this bound
  // goes straight into a Prisma query against real submittedAt instants, so
  // it needs to actually BE midnight-today-in-this-zone as a real instant,
  // not a Date whose local fields merely read that way (see
  // lib/timeZoneMath.ts's own warning on shiftToZone's return value).
  const startOfTodayInstant = zonedWallTimeToInstant(0, 0, timeZone ?? "UTC", new Date());
  const metrics = await metricsForWindow(agentId, { gte: startOfTodayInstant });
  return { policiesSubmittedToday: metrics.submittedCount, annualPremiumToday: metrics.submittedAP };
}

async function getTeamHeadcount(userId: string, role: string) {
  if (role === "ADMIN") {
    const count = await db.user.count({ where: { role: "AGENT", active: true } });
    return { count, scope: "the whole agency's active agents" };
  }
  if (role === "MANAGER") {
    const count = await db.user.count({ where: { managerId: userId, active: true } });
    return { count, scope: "this manager's own downline" };
  }
  return { count: 0, scope: "a plain agent has no agents reporting to them" };
}

async function searchCrm(
  agentId: string,
  query: string,
): Promise<{ matches: Record<string, unknown>[]; records: CrmRecord[] }> {
  const q = query.trim();
  if (!q) return { matches: [], records: [] };
  const digits = q.replace(/\D/g, "");

  const [leads, policies] = await Promise.all([
    db.lead.findMany({
      where: {
        assignedAgentId: agentId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        state: true,
        status: true,
        dateOfBirth: true,
      },
      take: 5,
    }),
    db.policy.findMany({
      where: {
        agentId,
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          ...(digits.length >= 4 ? [{ clientPhone: { contains: digits } }] : []),
        ],
      },
      select: {
        id: true,
        clientName: true,
        carrier: true,
        product: true,
        status: true,
        annualPremium: true,
      },
      take: 5,
    }),
  ]);

  const records: CrmRecord[] = [];
  const matches: Record<string, unknown>[] = [];

  for (const l of leads) {
    const name = `${l.firstName} ${l.lastName}`.trim();
    records.push({ label: name, href: `/agent/leads/${l.id}` });
    matches.push({
      type: "lead",
      name,
      phone: l.phone,
      state: l.state,
      status: l.status,
      dateOfBirth: l.dateOfBirth,
      link: `/agent/leads/${l.id}`,
    });
  }
  for (const p of policies) {
    records.push({ label: p.clientName, href: "/book-of-business" });
    matches.push({
      type: "policy",
      name: p.clientName,
      carrier: p.carrier,
      product: p.product,
      status: p.status,
      annualPremium: Number(p.annualPremium),
      link: "/book-of-business",
    });
  }

  return { matches, records };
}

const SYSTEM_INSTRUCTION =
  "You are a quick-reference assistant built into a final expense insurance agency's internal sales platform, surfaced from a header search box that supports follow-up questions in the same conversation. Answer directly and briefly — get straight to the point. No preamble, no restating the question, no disclaimers or caveats, no hedging about what you do or don't have access to. One or two sentences for most questions; a short list only when the question genuinely calls for one. Use the conversation history to understand follow-ups (\"what about...\", \"and if they also...\") without making the user repeat earlier details. " +
  "Route to the agency's own underwriting-guide excerpts (when the user message includes a block of them) whenever the question is about a specific person's eligibility — gender, age, a medical condition, prescription, or medication, which carrier(s)/product(s) would accept them, which carrier to use, or where they'd get approved. Those excerpts are this agency's own real, current carrier rules — the authoritative source for that kind of question. Use them directly (name the carrier/product you're quoting, no need to flag that you're using them) and treat them as the proof check that overrides the live web search findings for that question where the two disagree — the search findings can still fill in whatever the excerpts themselves don't address. " +
  "On that eligibility/carrier-matching question, don't limit yourself to one or two sentences — cover every carrier/product from the excerpts that could work, not just the single best one. Write it as natural, conversational sentences, the way you'd explain it out loud — grouping a carrier's own products together in one sentence instead of a bare bullet dump (short bullets are only OK if the full list is long enough that prose would get hard to follow) — but start a new line for each carrier instead of running them together in one paragraph, e.g.: \n\"Americo would approve him on the Eagle Premier at Standard.\nTransamerica's Trendsetter would also approve him, Preferred.\nEthos' term product would work too, Level.\" " +
  "Cover carriers in this order when more than one applies: Americo, Transamerica, Ethos, then Mutual of Omaha, then every other carrier from the excerpts in whatever order reads naturally — that first group is a fixed agency priority, not a suggestion. Name the tier each one lands in (Level, Preferred, Standard, Graded, Guaranteed Issue) and say what that tier means when it isn't the best one, plus any condition it comes with — a waiting period, a specific rating, a diagnosis-date cutoff, GI-only, etc. — instead of glossing over it. " +
  "You have a web_search tool for current, external information (see its own description for when to call it and when not to bother) — call it yourself when a question needs it, rather than assuming you already have current data. When you do call it, treat the results as your primary source for that answer, rather than from memory alone, for everything except the eligibility/carrier-matching case above, where the agency's own guide excerpts take priority instead. " +
  "Don't cite sources or append links as backup for an answer — just give the straight, accurate answer itself. The one exception: when the answer IS a place to go do something — buy or renew a license, apply/sign up/register for something, a specific tool or site to use — include that one link right in the answer, since the link itself is what's being asked for, not a citation for it. " +
  "You have a search_crm tool that looks up the signed-in agent's own leads and client policies by name, phone, or email. Call it whenever the question is about a specific person who might be one of the agent's own contacts (pulling someone up by name, checking a phone number, whether someone's in their book, what policy/carrier someone has) — don't guess or make up CRM data yourself. If it returns no matches, say so plainly rather than inventing a result. When it does find someone, name them in your answer (e.g. \"Found her — Sarah Jenkins, ...\") since that name is how the app turns it into a clickable link for the agent; you don't need to include a path or URL yourself for this case. " +
  "You also have three tools over the app's own real data — never say you don't have access to this information, call the right tool instead: get_today_schedule for anything about today's calendar/schedule/meetings; get_my_production_today for the signed-in agent's own sales/production count or premium for today; get_team_headcount for how many agents someone has (their downline if a manager, the whole agency if an admin — a plain agent has none and the tool will say so, which you should relay honestly rather than guessing a number). " +
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

  // What page/record the agent is currently looking at (see
  // TopBarActions.tsx's useAtlasContext) — a single descriptive line, not
  // raw data, so a question like "what's her DOB?" without naming anyone
  // still resolves to whoever's lead page is open.
  const contextLine =
    typeof body?.context?.line === "string" ? body.context.line.trim() : "";

  // Ground on everything the user has asked so far in this conversation, not
  // just the latest message — a follow-up like "what if they also smoke?"
  // needs the condition named in an earlier turn to still pull the right
  // guide excerpts.
  const priorQuestions = history.filter((t) => t.role === "user").map((t) => t.text);
  const guideContext = buildUnderwritingContext([...priorQuestions, question].join(" "));

  const parts: string[] = [];
  if (contextLine) parts.push(contextLine);
  if (guideContext) parts.push(guideContext);
  parts.push(`Question: ${question}`);
  const userText = parts.join("\n\n");

  // `contents` grows in place across tool-call rounds below: a functionCall
  // part (what Gemini asked for) followed by a functionResponse part (what
  // the tool actually found), same shape Gemini's own docs use for
  // function calling, before asking it again for either another tool call
  // or its final text answer.
  const contents: Record<string, unknown>[] = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];

  const allRecords: CrmRecord[] = [];
  let answer: string | undefined;
  const allSources: Source[] = [];

  // At most 4 rounds — enough for both tools to get called in sequence
  // plus a final answer, not an open-ended agent loop; this is a quick-
  // reference box, not a task runner.
  for (let round = 0; round < 4; round++) {
    let res: Response;
    try {
      res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents,
          tools: [
            {
              functionDeclarations: [
                CRM_SEARCH_TOOL,
                WEB_SEARCH_TOOL,
                TODAY_SCHEDULE_TOOL,
                MY_PRODUCTION_TOOL,
                TEAM_HEADCOUNT_TOOL,
              ],
            },
          ],
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
    const responseParts: Array<Record<string, unknown>> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const functionCallPart = responseParts.find((p) => p.functionCall) as
      | { functionCall: { name: string; args?: { query?: string } } }
      | undefined;

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      const query = args?.query ?? "";
      contents.push({ role: "model", parts: [{ functionCall: functionCallPart.functionCall }] });

      if (name === "search_crm") {
        const result = await searchCrm(guard.session.user.id, query);
        allRecords.push(...result.records);
        contents.push({
          // Gemini's Content role is only ever "user" or "model" — unlike
          // OpenAI's separate "function"/"tool" role, a functionResponse
          // part is sent back as the "user" turn. Gemini rejected every
          // tool-call round with a 400 ("Role 'function' is not
          // supported") until this was caught, meaning search_crm/
          // web_search never actually worked once the model tried to call
          // either of them — see the "Couldn't reach the AI assistant"
          // error every one of those requests surfaced instead.
          role: "user",
          parts: [{ functionResponse: { name, response: { matches: result.matches } } }],
        });
      } else if (name === "web_search") {
        const result = await liveSearch(query);
        allSources.push(...(result?.sources ?? []));
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name,
                response: result
                  ? { findings: result.contextText }
                  : { findings: "No results found." },
              },
            },
          ],
        });
      } else if (name === "get_today_schedule") {
        const result = await getTodaySchedule(guard.session.user.id);
        contents.push({
          role: "user",
          parts: [{ functionResponse: { name, response: result } }],
        });
      } else if (name === "get_my_production_today") {
        const result = await getMyProductionToday(guard.session.user.id);
        contents.push({
          role: "user",
          parts: [{ functionResponse: { name, response: result } }],
        });
      } else if (name === "get_team_headcount") {
        const result = await getTeamHeadcount(guard.session.user.id, guard.session.user.role);
        contents.push({
          role: "user",
          parts: [{ functionResponse: { name, response: result } }],
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ functionResponse: { name, response: { error: "Unknown tool" } } }],
        });
      }
      continue;
    }

    answer = responseParts.find((p) => typeof p.text === "string")?.text as
      | string
      | undefined;
    break;
  }

  if (!answer) {
    return NextResponse.json({ error: "Didn't get a usable answer back. Try rephrasing the question." }, { status: 502 });
  }

  // Dedupe by href/uri — the same lead or page could come back across a
  // couple of tool-call rounds (a follow-up question re-searching the same
  // thing).
  const records = Array.from(new Map(allRecords.map((r) => [r.href, r])).values());
  const sources = Array.from(new Map(allSources.map((s) => [s.uri, s])).values());

  return NextResponse.json({ answer, sources, records });
}
