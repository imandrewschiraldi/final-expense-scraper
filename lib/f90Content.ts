// The agency's First 90 Days onboarding program — a fixed, code-defined
// curriculum (not admin-editable) an enrolled agent works through on their
// own F90 sidebar tab, checking off each step as they complete it (see
// User.f90CompletedSteps). Step keys are stable identifiers, never
// reused/reordered/removed once shipped, since an agent's progress is
// stored by key.

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
  trainingSchedule?: { day: string; topic: string; time: string; link: F90Link }[];
  // Breaks one step's instructions into separate labeled boxes instead of
  // a single wall of text — only the Call & Sales Execution Workflow uses
  // this, since it's 6 distinct actions, not one.
  subSteps?: { heading: string; prompt: string }[];
};

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
          { day: "Monday", topic: "New Agent Orientation", time: "12–2 PM ET", link: PINNACLE_ACADEMY_LINK },
          { day: "Tuesday", topic: "Scripts & Objections", time: "12–2 PM ET", link: PINNACLE_ACADEMY_LINK },
          { day: "Wednesday", topic: "Carriers & Applications", time: "12–2 PM ET", link: PINNACLE_ACADEMY_LINK },
          { day: "Thursday", topic: "Underwriting", time: "12–2 PM ET", link: PINNACLE_ACADEMY_LINK },
          { day: "Friday", topic: "Lead Flow & Workflow", time: "12–2 PM ET", link: PINNACLE_ACADEMY_LINK },
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
          "Transition into full-time dialing and hit one of the following benchmarks every working day: 300 outbound dials, OR 3 sit-down/phone appointments, OR 1 closed policy. Today's numbers are tracked live below.",
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
              "Follow the approved call script to build rapport and establish urgency, then complete the Client Suitability Sheet (health history, medications, budget, and coverage goals) while you're still on the phone. That sheet lives on the lead's own detail page, not here, since it's bound to that specific contact.",
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
    subtitle: "After 5 Sales or Day 90",
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

// The Graduation Certificate's own trigger — $20,000+ Issued AP AND every
// Phase 1-4 step checked off. Phase 5 is deliberately excluded: it's
// already gated separately (5 sales or Day 90) and isn't part of what the
// certificate itself certifies.
export const F90_GRADUATION_AP = 20000;

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

/** Phase 5's own trigger — "5 closed sales OR Day 90," independent of
 *  (and reached well before, in the common case) the $20,000 Issued AP
 *  graduation standard that the certificate itself checks. */
export function f90Phase5Unlocked(
  salesCount: number,
  enrolledAt: Date,
  now: Date = new Date(),
): boolean {
  return salesCount >= 5 || f90DayNumber(enrolledAt, now) >= F90_DAYS;
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
