// The agency's First 90 Days onboarding program — a code-defined curriculum
// an enrolled agent works through on their own F90 sidebar tab, checking
// off each step as they complete it (see User.f90CompletedSteps). Step keys
// are stable identifiers, never reused/reordered/removed once shipped,
// since an agent's progress is stored by key, and admin overrides (see
// F90StepContent in prisma/schema.prisma and f90ApplyStepOverrides below)
// are keyed the same way. The text/links/video below are the defaults —
// an admin can override a step's title, description, links, or add a
// video from the Admin > F90 page without touching this file.

export const F90_DAYS = 90;

export type F90Link = {
  label: string;
  // null means the real URL hasn't been supplied yet — rendered as a
  // disabled "link coming soon" pill instead of a dead/guessed href. Never
  // filled with a guessed vendor URL; only with one actually supplied.
  href: string | null;
};

export type F90Step = {
  key: string;
  title: string;
  description: string;
  // Deep-links straight to another tab instead of making the agent go
  // find it while they're mid-call.
  links?: F90Link[];
  // Monday-Friday live session times, rendered as a small calendar strip
  // instead of plain checkbox text — only Phase 2's academy step uses this.
  // Hours are the fixed wall-clock time in ET (America/New_York), the zone
  // the Academy actually runs on; the UI converts to each viewer's own
  // profile time zone for display via zonedWallTimeToInstant.
  trainingSchedule?: {
    day: string;
    topic: string;
    startHour: number;
    endHour: number;
    link: F90Link;
  }[];
  // Breaks one step's instructions into separate labeled boxes instead of
  // a single wall of text — only the Call & Sales Execution Workflow uses
  // this, since it's 6 distinct actions, not one.
  subSteps?: { heading: string; prompt: string }[];
  // Admin-added embeddable video (see f90ApplyStepOverrides) — undefined
  // for every code-defined step above; only ever set on the merged copy
  // handed to the agent-facing page.
  videoUrl?: string | null;
};

// One row of admin-edited mission content (F90StepContent in
// prisma/schema.prisma), already JSON-parsed — a null field means "keep
// using this step's code default," not "clear it," so an admin can
// override just the video without retyping the title and description too.
export type F90StepOverrideRow = {
  stepKey: string;
  title: string | null;
  description: string | null;
  videoUrl: string | null;
  links: F90Link[] | null;
};

/** Layers admin-edited mission content over the code-defined F90_PHASES
 *  (or any phase list derived from it) — call once on the server with
 *  whatever rows exist in F90StepContent, then pass the result to
 *  F90Panel instead of the raw F90_PHASES import. A step with no matching
 *  row comes back unchanged (same object reference). */
export function f90ApplyStepOverrides(
  phases: F90Phase[],
  overrides: F90StepOverrideRow[],
): F90Phase[] {
  if (overrides.length === 0) return phases;
  const byKey = new Map(overrides.map((o) => [o.stepKey, o]));
  return phases.map((phase) => {
    if (phase.steps.length === 0) return phase; // Phase 5's channels aren't covered
    return {
      ...phase,
      steps: phase.steps.map((step) => {
        const o = byKey.get(step.key);
        if (!o) return step;
        return {
          ...step,
          title: o.title ?? step.title,
          description: o.description ?? step.description,
          links: o.links ?? step.links,
          videoUrl: o.videoUrl ?? null,
        };
      }),
    };
  });
}

export type F90Channel = {
  key: string;
  title: string;
  description: string;
  benchmark: string;
  link: F90Link;
};

export type F90Phase = {
  key: string;
  title: string;
  subtitle: string;
  steps: F90Step[];
  // Only Phase 5 uses this — rendered as selectable branch cards instead
  // of a plain step list, since an agent picks which channel(s) they're
  // running rather than working through a fixed sequence.
  channels?: F90Channel[];
};

const SURELC_LINKS: F90Link[] = [
  {
    label: "Quility SureLC →",
    href: "https://surelc.surancebay.com/sbweb/login.jsp?branch=Joe%20Basso&branchEditable=off&branchRequired=on&branchVisible=on&gaId=233&gaName=Quility%20Sales",
  },
  {
    label: "Equita SureLC →",
    href: "https://accounts.surancebay.com/oauth/authorize?redirect_uri=https:%2F%2Fsurelc.surancebay.com%2Fproducer%2Foauth%3FreturnUrl%3D%252Fprofile%252Fcontact-info%253FgaId%253D323%2526branch%253DBasso-Montemurro&gaId=323&client_id=surecrmweb&response_type=code",
  },
];
const CLOSERTEXT_LINK: F90Link = {
  label: "Purchase Your Dialer Seat (CloserText) →",
  href: "https://closrleads.com/go.php?c=TIER1FINANCIAL&p=dialer-seat",
};
const PINNACLE_ACADEMY_LINK: F90Link = {
  label: "Join on Zoom",
  href: "https://pinnacleagentsuccess.com",
};

export const F90_PHASES: F90Phase[] = [
  {
    key: "P1",
    title: "Licensing & Carrier Contracting",
    subtitle: "Pre-Week 1",
    steps: [
      {
        key: "P1_S1",
        title: "Pre-Licensing Course",
        description:
          "Complete your state-approved life insurance pre-licensing course and pass the practice exam with a score of 80% or higher.",
        links: [
          {
            label: "Start Pre-Licensing Course (XCEL) →",
            href: "https://partners.xcelsolutions.com/familyfirstlife",
          },
        ],
      },
      {
        key: "P1_S2",
        title: "State Exam",
        description:
          "Schedule and pass your state licensing exam through your state testing vendor (e.g., Pearson VUE or PSI).",
        links: [
          {
            label: "Find Your State's Exam Steps (XCEL) →",
            href: "https://www.xcelsolutions.com/insurance-license/requirements",
          },
        ],
      },
      {
        key: "P1_S3",
        title: "License Application & Fingerprints",
        description:
          "Complete required fingerprinting and submit your resident license application via NIPR immediately upon passing. Pay the state's application processing fee. If you answer \"Yes\" to a background question, submit your written statement with the corresponding court documents through NIPR's Attachments Warehouse — a printout from a court website isn't accepted.",
        links: [{ label: "Apply via NIPR →", href: "https://nipr.com/" }],
      },
      {
        key: "P1_S4",
        title: "Compliance Prerequisites",
        description:
          "Once you have your license number and NPN (National Producer Number), purchase Errors & Omissions (E&O) insurance through ERGO NEXT (ask your admin for the required limits) and complete your Anti-Money Laundering (AML) certification for free in SureLC. Then send your license and NPN number to your direct manager so they can get you onboarded for contracting.",
        links: [
          { label: "Get E&O Insurance (ERGO NEXT) →", href: "https://refer.nextinsurance.com/7LoS9qx" },
          { label: "Complete AML Certificate (SureLC) →", href: "https://aml.surancebay.com" },
        ],
      },
      {
        key: "P1_EMAIL",
        title: "Set Up Your Work Email",
        description:
          'Create a dedicated work email for client-facing business: firstnamelastname.life@gmail.com (for example, "johnsmith.life@gmail.com"). Use this address on your carrier contracting, your CRM profile, and with every client going forward.',
      },
      {
        key: "P1_S5",
        title: "Carrier Contracting",
        description:
          "Submit contracting packets for core carriers through SureLC and upload your resident license, E&O certificate, AML certificate, and voided check.",
        links: SURELC_LINKS,
      },
    ],
  },
  {
    key: "P2",
    title: "Bootcamp & Live Academy",
    subtitle: "Week 1",
    steps: [
      {
        key: "P2_S1",
        title: "Launch Training",
        description:
          "Complete the self-paced recorded training modules covering product basics, compliance rules, and CRM navigation before Monday morning.",
        links: [{ label: "Launch Training →", href: "/agent/training" }],
      },
      {
        key: "P2_S2",
        title: "Purchase Your Dialer Seat",
        description:
          "Purchase your dialer seat to get started in the Agent Accelerator Lead Program, prior to Monday's kickoff, so your phone line and Agent Accelerator Lead Program leads are ready to go. Once it's purchased, text your manager at (631) 708-6052 so it can be linked to Tier 1 Financial.",
        links: [CLOSERTEXT_LINK],
      },
      {
        key: "P2_S3",
        title: "Pinnacle New Agent Academy",
        description:
          "Attend all mandatory live training sessions, Monday through Friday, 12:00–2:00 PM Eastern. Same Zoom link every day. Take notes on script structure, objection handling, and quoting tools.",
        trainingSchedule: [
          { day: "Monday", topic: "New Agent Orientation", startHour: 12, endHour: 14, link: PINNACLE_ACADEMY_LINK },
          { day: "Tuesday", topic: "Scripts & Objections", startHour: 12, endHour: 14, link: PINNACLE_ACADEMY_LINK },
          { day: "Wednesday", topic: "Carriers & Applications", startHour: 12, endHour: 14, link: PINNACLE_ACADEMY_LINK },
          { day: "Thursday", topic: "Underwriting", startHour: 12, endHour: 14, link: PINNACLE_ACADEMY_LINK },
          { day: "Friday", topic: "Lead Flow & Workflow", startHour: 12, endHour: 14, link: PINNACLE_ACADEMY_LINK },
        ],
      },
      {
        key: "P2_S4",
        title: "Afternoon Live Dialing (Monday–Friday)",
        description:
          "Immediately after live training hours end each day, log into your active dialer seat and make live production calls using your Agent Accelerator Lead Program leads under manager supervision.",
      },
    ],
  },
  {
    key: "P3",
    title: "Full-Time Daily Production",
    subtitle: "Weeks 2–12",
    steps: [
      {
        key: "P3_S1",
        title: "Daily Non-Negotiable KPIs",
        description:
          "This is the agency's Standard Operating Procedure (SOP) for full-time daily production — hit any one of the following benchmarks every working day: 300 outbound dials, 30 conversions, 3 appointments booked, or 1 close. Log your actual numbers in the KPI Tracker.",
        links: [{ label: "Open Full KPI Tracker →", href: "/agent/kpi-tracker" }],
      },
      {
        key: "P3_S2",
        title: "Call & Sales Execution Workflow",
        description:
          "Six steps, every call, in order — the worksheet below walks through each one.",
        subSteps: [
          {
            heading: "1. Open & Discover",
            prompt:
              "Follow the approved call script to build rapport and establish urgency, then complete the Client Suitability Sheet (health history, medications, budget, and coverage goals) while you're still on the phone — pick the lead below and fill it out live, right here, or on that lead's own detail page.",
          },
          {
            heading: "2. Field Underwrite",
            prompt:
              "Enter the client's health profile and medications into the Underwriting Genie to identify which carriers are likely to approve them before you quote anything.",
          },
          {
            heading: "3. Run Quotes",
            prompt:
              "Open the Quote Tool and pull accurate rates for the carriers the Underwriting Genie just cleared.",
          },
          {
            heading: "4. Present Options",
            prompt:
              "Present 2 to 3 coverage tiers (Good, Better, Best) based on the client's budget, and ask for the sale.",
          },
          {
            heading: "5. Access E-App",
            prompt:
              "Once the client picks an option, open that carrier's e-application through Carrier Resources and complete all required fields, payment details, and voice/email signatures.",
          },
          {
            heading: "6. Post-Call Submission",
            prompt:
              "Hang up the phone, review the application for accuracy, and hit submit.",
          },
        ],
        links: [
          { label: "Launch Underwriting Genie →", href: "/underwriting-genie" },
          { label: "Open Quote Tool →", href: "/quoter" },
          { label: "Go to Carrier Resources →", href: "/carrier-resources" },
        ],
      },
    ],
  },
  {
    key: "P4",
    title: "Policy Tracking & Client Retention",
    subtitle: "Ongoing",
    steps: [
      {
        key: "P4_S1",
        title: "Pending Business Tracking",
        description:
          "Check carrier portals every 48 hours for pending requirements (e.g., medical records or banking verification) and resolve issues immediately until the policy is Issued.",
      },
      {
        key: "P4_S2",
        title: "Welcome & Discovery Call",
        description:
          'If the policy was NOT approved live on the call — it went to underwriting for a decision — call the client within 24–48 hours of that decision to deliver the news, confirm their first draft date, and review policy details. If it WAS approved instantly on the call, you already told them the good news live: no separate welcome call is needed, just send the policy documents and confirm the draft date before you hang up.',
      },
      {
        key: "P4_S3",
        title: "Annual Policy Review",
        description:
          "Nothing to set up here — once a policy is submitted, Agent Accelerator automatically tracks it and reminds you a year out for the Annual Review. Use that reminder as your cue to check in, review coverage, and ask for referrals.",
      },
    ],
  },
  {
    key: "P5",
    title: "Scaling Lead Generation",
    subtitle: "Ongoing",
    steps: [],
    channels: [
      {
        key: "P5_S1",
        title: "Data + SMS Marketing",
        description:
          "Purchase raw consumer data and run automated SMS drip campaigns to generate inbound callbacks and text replies.",
        benchmark: "iLoveLeads ($69/month + $0.01 per SMS)",
        link: { label: "See Trusted Lead Vendors →", href: "/agent/buy-leads" },
      },
      {
        key: "P5_S2",
        title: "Pre-Booked Appointments",
        description:
          "Purchase verified, pre-set calendar appointments so you focus strictly on running presentations and closing.",
        benchmark: "$20–$25 per appointment",
        link: { label: "See Trusted Lead Vendors →", href: "/agent/buy-leads" },
      },
      {
        key: "P5_S3",
        title: "Fresh Exclusive/Real-Time Leads",
        description:
          "Buy newly generated leads to dial immediately using your daily KPI cadence.",
        benchmark: "Real-time leads",
        link: { label: "See Trusted Lead Vendors →", href: "/agent/buy-leads" },
      },
      {
        key: "P5_S4",
        title: "Dedicated Appointment Setter",
        description:
          "Hire and pay an appointment setter to dial your purchased aged or fresh leads and book qualified appointments directly onto your calendar.",
        benchmark: "Setter hourly/commission pay plus lead cost",
        link: { label: "Get Started →", href: null },
      },
    ],
  },
];

export const F90_ALL_STEP_KEYS: string[] = F90_PHASES.flatMap((p) =>
  p.steps.map((s) => s.key),
);

export const F90_TOTAL_STEPS = F90_ALL_STEP_KEYS.length;

export function isF90StepKey(key: string): boolean {
  return F90_ALL_STEP_KEYS.includes(key);
}

export const F90_ALL_CHANNEL_KEYS: string[] =
  F90_PHASES.find((p) => p.key === "P5")?.channels?.map((c) => c.key) ?? [];

export function isF90ChannelKey(key: string): boolean {
  return F90_ALL_CHANNEL_KEYS.includes(key);
}

// Compliance-document upload nodes on the roadmap (License, E&O, AML) —
// scanned documents are commonly a photo or a PDF, not just an image like
// the training-lesson upload this otherwise mirrors.
export const F90_DOC_TYPES = ["license", "eo", "aml"] as const;
export type F90DocType = (typeof F90_DOC_TYPES)[number];
export const F90_DOC_MAX_BYTES = 10 * 1024 * 1024;
export const F90_DOC_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

// The Graduation Certificate's own trigger — $30,000+ Issued AP AND every
// Phase 1-4 step checked off. Phase 5 is deliberately excluded: it's
// already gated separately (5 sales or Day 90) and isn't part of what the
// certificate itself certifies.
export const F90_GRADUATION_AP = 30000;

export function f90Phases1to4StepKeys(): string[] {
  return F90_PHASES.filter((p) => p.key !== "P5").flatMap((p) =>
    p.steps.map((s) => s.key),
  );
}

export function f90IsEligibleForCertificate(
  completedSteps: string[],
  issuedAP: number,
): boolean {
  if (issuedAP < F90_GRADUATION_AP) return false;
  const completedSet = new Set(completedSteps);
  return f90Phases1to4StepKeys().every((k) => completedSet.has(k));
}

/** Calendar day the agent is currently on, 1-indexed from enrollment —
 *  Day 1 is the day they were enrolled. Never negative/zero. */
export function f90DayNumber(enrolledAt: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor((now.getTime() - enrolledAt.getTime()) / msPerDay);
  return Math.max(1, elapsedDays + 1);
}

export function f90IsGraduated(enrolledAt: Date, now: Date = new Date()): boolean {
  return f90DayNumber(enrolledAt, now) > F90_DAYS;
}

/** Which roadmap node (phase index, or -1 for "not started"/5 for
 *  "graduated") an agent is currently sitting on — the first phase with an
 *  incomplete step, since actual progress through compliance-gated steps
 *  (licensing, exams) varies far more than calendar days do. */
export function f90CurrentPhaseIndex(completedSteps: string[]): number {
  const completedSet = new Set(completedSteps);
  for (let i = 0; i < F90_PHASES.length; i++) {
    const phase = F90_PHASES[i];
    if (phase.steps.length === 0) continue; // Phase 5 — reached via Phase 1-4 completion, not its own steps
    if (!phase.steps.every((s) => completedSet.has(s.key))) return i;
  }
  return F90_PHASES.length - 1;
}

// The roadmap's own node list — a short "trunk" of one node per phase
// (plus a final Graduation node), with each phase's individual steps
// branching off its trunk node like twigs on a tree, instead of every
// single step sitting inline on the main path. Six trunk nodes total:
// Phase 1-4, the Phase 5 Vault, and Graduation. F90_PHASES/F90Step stay
// the single source of truth for each branch's real content.
export type F90TrunkNode = {
  key: string; // a phase key, or "GRADUATION"
  title: string;
  kind: "phase" | "vault" | "graduation";
  branches: { key: string; title: string }[]; // empty for vault/graduation
};

export const F90_TRUNK_NODES: F90TrunkNode[] = [
  ...F90_PHASES.map(
    (phase): F90TrunkNode =>
      phase.key === "P5"
        ? { key: phase.key, title: "Lead Scaling Vault", kind: "vault", branches: [] }
        : {
            key: phase.key,
            title: phase.title,
            kind: "phase",
            branches: phase.steps.map((step) => ({ key: step.key, title: step.title })),
          },
  ),
  { key: "GRADUATION", title: "Graduation", kind: "graduation", branches: [] },
];

/** Index (0-based) of the trunk node the agent is actively working on —
 *  the first Phase 1-4 trunk with an incomplete branch, or the Vault's
 *  index once all four are done (no separate sales/day gate — the Vault
 *  is the lead source agents dial through to get those first sales, so
 *  it opens as soon as bootcamp/compliance is behind them). Graduation's
 *  own lock state is driven by certificate eligibility, not this index,
 *  since that also depends on Issued AP. */
export function f90CurrentTrunkIndex(completedSteps: string[]): number {
  const completedSet = new Set(completedSteps);
  const phaseNodes = F90_TRUNK_NODES.filter((t) => t.kind === "phase");
  for (let i = 0; i < phaseNodes.length; i++) {
    if (!phaseNodes[i].branches.every((b) => completedSet.has(b.key))) return i;
  }
  return phaseNodes.length; // the Vault's index once every phase is done
}

