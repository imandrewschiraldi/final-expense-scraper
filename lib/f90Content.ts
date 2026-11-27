// The agency's First 90 Days onboarding program — a fixed, code-defined
// curriculum (not admin-editable) an enrolled agent works through on their
// own F90 sidebar tab, checking off each step as they complete it (see
// User.f90CompletedSteps). Step keys are stable identifiers, never
// reused/reordered/removed once shipped, since an agent's progress is
// stored by key.

export const F90_DAYS = 90;

export type F90Step = {
  key: string;
  title: string;
  description: string;
  // Deep-links straight to another tab instead of making the agent go
  // find it while they're mid-call — only Phase 3's call workflow step
  // uses this.
  links?: { label: string; href: string }[];
};

export type F90Phase = {
  key: string;
  title: string;
  subtitle: string;
  steps: F90Step[];
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
      },
      {
        key: "P1_S2",
        title: "State Exam",
        description:
          "Schedule and pass your state licensing exam through your state testing vendor (e.g., Pearson VUE or PSI).",
      },
      {
        key: "P1_S3",
        title: "License Application & Fingerprints",
        description:
          "Complete required fingerprinting and submit your resident license application via NIPR or Sircon immediately upon passing.",
      },
      {
        key: "P1_S4",
        title: "Compliance Prerequisites",
        description:
          "Purchase Errors & Omissions (E&O) insurance and complete your Anti-Money Laundering (AML) certification.",
      },
      {
        key: "P1_S5",
        title: "Carrier Contracting",
        description:
          "Submit contracting packets for core carriers through the agency portal and upload your resident license, E&O certificate, AML certificate, and voided check.",
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
        title: "Recorded Core Training",
        description:
          "Complete the self-paced recorded training modules covering product basics, compliance rules, and CRM navigation before Monday morning.",
      },
      {
        key: "P2_S2",
        title: "Dialer & Lead Assistance Activation",
        description:
          "Enroll in the Free Aged Lead Assistance Program by activating your $250 dialer seat prior to Monday's kickoff so your phone line and company-provided aged leads are ready to go.",
      },
      {
        key: "P2_S3",
        title: "Pinnacle New Agent Academy (Monday–Friday)",
        description:
          "Attend all mandatory live training sessions from Monday through Friday. Take notes on script structure, objection handling, and quoting tools.",
      },
      {
        key: "P2_S4",
        title: "Afternoon Live Dialing (Monday–Friday)",
        description:
          "Immediately after live training hours end each day, log into your active dialer seat and make live production calls using your aged leads under manager supervision.",
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
          "Transition into full-time dialing and hit one of the following benchmarks every working day: 300 outbound dials, OR 3 sit-down/phone appointments, OR 1 closed policy.",
      },
      {
        key: "P3_S2",
        title: "Call & Sales Execution Workflow",
        description:
          "1. Open & Discover: Follow the approved call script to build rapport, establish urgency, and complete the Client Suitability Sheet (health history, medications, budget, and coverage goals) while on the phone — it's on the lead's own detail page, not here, since it's bound to that specific contact.\n" +
          "2. Field Underwrite: Enter the client's health profile and medications into the Underwriting Genie to identify pre-approved carriers.\n" +
          "3. Run Quotes: Open the Quote Tool and pull accurate rates for the approved carriers.\n" +
          "4. Present Options: Present 2 to 3 coverage tiers (Good, Better, Best) based on the client's budget and ask for the sale.\n" +
          "5. Access E-App: Once the client selects an option, open the carrier's e-application through the Carrier Resources portal and complete all required fields, payment details, and voice/email signatures.\n" +
          "6. Post-Call Submission: Hang up the phone, review the application for accuracy, and hit submit.",
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
        title: "Welcome & Delivery Call",
        description:
          "Call the client within 24–48 hours of policy issue to confirm their first draft date, review policy details, and prevent early-lapse chargebacks.",
      },
      {
        key: "P4_S3",
        title: "Annual Policy Review",
        description:
          "Set an 11-month CRM reminder for every issued client to conduct an annual coverage review, add policies, and ask for referrals.",
      },
    ],
  },
  {
    key: "P5",
    title: "Scaling Lead Generation",
    subtitle: "After 5 Sales or Day 90",
    steps: [
      {
        key: "P5_S1",
        title: "Data + SMS Marketing",
        description:
          "Purchase raw consumer data and run automated SMS drip campaigns to generate inbound callbacks and text replies. Benchmark: iLoveLeads ($69/month + $0.01 per SMS).",
      },
      {
        key: "P5_S2",
        title: "Pre-Booked Appointments",
        description:
          "Purchase verified, pre-set calendar appointments so you focus strictly on running presentations and closing. Benchmark: $20–$25 per appointment (iLoveLeads & Leadspply).",
      },
      {
        key: "P5_S3",
        title: "Fresh Exclusive/Real-Time Leads",
        description:
          "Buy newly generated leads to dial immediately using your daily KPI cadence. Benchmark: FOMO Leads.",
      },
      {
        key: "P5_S4",
        title: "Dedicated Appointment Setter",
        description:
          "Hire and pay an appointment setter to dial your purchased aged or fresh leads and book qualified appointments directly onto your calendar. Benchmark: setter hourly/commission pay plus lead cost.",
      },
      {
        key: "P5_S5",
        title: "90-Day Graduation Standard",
        description:
          "Combining the Aged Lead Assistance Program with your chosen scaling channel(s), hit the agency benchmark of $20,000 in Issued Annual Premium within your first 90 days.",
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
 *  graduation standard that's the last step inside Phase 5 itself. */
export function f90Phase5Unlocked(
  salesCount: number,
  enrolledAt: Date,
  now: Date = new Date(),
): boolean {
  return salesCount >= 5 || f90DayNumber(enrolledAt, now) >= F90_DAYS;
}
