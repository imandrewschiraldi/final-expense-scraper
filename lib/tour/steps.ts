export type Role = "ADMIN" | "MANAGER" | "AGENT";

export type TourStep = {
  /** Stable id — persisted to resume a tour across page navigations/reloads. */
  id: string;
  /** Route the viewer is sent to before this step's target is looked up. */
  path: string;
  /** CSS selector for the element to spotlight. Omit for a centered, elementless step (intro/outro). */
  selector?: string;
  title: string;
  body: string;
  /** Omit to show for both Manager and Agent — the only roles this tour is ever shown to. */
  roles?: Role[];
};

export type TourSection = {
  label: string;
  steps: TourStep[];
};

// The platform tour — Manager/Agent only, by design: it's shown to no one
// else, and nothing admin-only is in here at all (not just filtered out per
// viewer). Every step navigates to the real page and spotlights a real
// element — nothing here is a mock-up, so a step whose target doesn't exist
// for a given viewer (a flag-gated page like Vault or Recruiting Radar) is
// skipped automatically by the tour engine rather than left dangling.
export const TOUR_SECTIONS: TourSection[] = [
  {
    label: "Getting Started",
    steps: [
      {
        id: "intro",
        path: "/overview",
        title: "Welcome to Tier 1 Financial",
        body: "This tour walks through every section of the platform. Use Next/Back to step through it in order, or open the menu any time to jump straight to a topic.",
      },
      {
        id: "sidebar-profile-link",
        path: "/overview",
        selector: '[data-tour="sidebar-profile-link"]',
        title: "Your Profile Menu",
        body: "Click your name/photo here any time to open a menu — My Profile (your picture, contact details, password, and Demo Mode), Interaction Sounds, this tour, and Log Out all live there.",
      },
      {
        id: "profile-picture",
        path: "/profile",
        selector: '[data-tour="profile-picture-button"]',
        title: "Add a Profile Picture",
        body: 'Click your photo (or the "Change picture" link beside it) to upload one. It shows up next to your name across the Leaderboard, Team Chat, and anywhere else your activity appears.',
      },
      {
        id: "push-notifications",
        path: "/profile",
        selector: '[data-tour="push-notifications-card"]',
        title: "Turn On Notifications",
        body: "Enable push notifications on this device to get alerted for new leads, goals you hit, and Team Chat messages — even when the app isn't open.",
      },
      {
        id: "sidebar-search",
        path: "/overview",
        selector: '[data-tour="sidebar-search"]',
        title: "Search Everything",
        body: "One search box for the whole platform — leads/contacts, carriers, training lessons, and lead vendors, plus any page by name. Press ⌘K (Ctrl+K on Windows) to jump to it from anywhere.",
      },
      {
        id: "ask-gemini",
        path: "/overview",
        selector: '[data-tour="ask-gemini-box"]',
        title: "Ask Gemini",
        body: "Type or dictate a question — underwriting/carrier-eligibility questions pull from the agency's own guidelines, everything else (industry terms, markets, lead vendors, and more) gets a live web search. Drag it anywhere on the page, and resize it from the bottom-right corner once a conversation's open.",
      },
      {
        id: "notification-bell",
        path: "/overview",
        selector: '[data-tour="notification-bell"]',
        title: "In-App Notifications",
        body: "The bell shows your notification history inside the app regardless of whether push is turned on — click it any time to see what you've missed.",
      },
    ],
  },
  {
    label: "Overview",
    steps: [
      {
        id: "overview",
        path: "/overview",
        selector: 'a[href="/overview"]',
        title: "Overview",
        body: "Your home page — this is what you land on first. Recent Team Chat activity and newly added Training show up here automatically, alongside the two sections below.",
      },
      {
        id: "kpi-tracker",
        path: "/overview",
        selector: 'a[href="/agent/kpi-tracker"]',
        title: "KPI Tracker",
        body: "Log today's dials, appointments, presentations, and closes as you go — AP submitted is filled in automatically from your submitted policies. My History rolls it up into a weekly view.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "submit-policy",
        path: "/submit-policy",
        selector: 'a[href="/submit-policy"]',
        title: "Submit Policy",
        body: "Log a new sale here — carrier, product, premium, and the lead it came from.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "announcements-carousel",
        path: "/overview",
        selector: '[data-tour="announcements-carousel"]',
        title: "Announcements",
        body: "Training videos and downloadable flyers/graphics, scrolling on their own — pause it or step through manually with the arrows beside it.",
      },
      {
        id: "hall-of-fame",
        path: "/overview",
        selector: '[data-tour="hall-of-fame-card"]',
        title: "Hall of Fame",
        body: "Your progress toward this calendar year's issued-premium milestone, updated the moment a policy of yours is marked issued.",
      },
    ],
  },
  {
    label: "Dashboards",
    steps: [
      {
        id: "dashboard",
        path: "/dashboard",
        selector: 'a[href="/dashboard"]',
        title: "Dashboard",
        body: "Your own production at a glance — KPIs, goals, and analytics, all derived from the policies you've submitted.",
      },
      {
        id: "dashboard-range",
        path: "/dashboard",
        selector: '[data-tour="dashboard-range-select"]',
        title: "Change the Timeframe",
        body: "Switch between Daily, Weekly, Monthly, Year-to-Date, or All — the KPIs and analytics below update to match whichever one you pick.",
      },
      {
        id: "leaderboard",
        path: "/leaderboard",
        selector: 'a[href="/leaderboard"]',
        title: "Leaderboard",
        body: "See where you rank against the rest of the team by issued annual premium, updated live.",
      },
    ],
  },
  {
    label: "Training",
    steps: [
      {
        id: "training-agent",
        path: "/agent/training",
        selector: 'a[href="/agent/training"]',
        title: "Training",
        body: "Onboarding lessons and ongoing training modules — each module breaks down into chapters, then individual lessons.",
        roles: ["MANAGER", "AGENT"],
      },
    ],
  },
  {
    label: "Team Chat",
    steps: [
      {
        id: "team-chat",
        path: "/chat",
        selector: 'a[href="/chat"]',
        title: "Team Chat",
        body: "The whole agency's group chat — organized into channels, with pinned messages, reactions, and image sharing.",
      },
      {
        id: "chat-channels",
        path: "/chat",
        selector: '[data-tour="chat-channel-list"]',
        title: "Channels",
        body: "Every channel you have access to lives here — click one to switch to it. Admins and managers can create new channels and categories with the + buttons.",
      },
      {
        id: "chat-composer",
        path: "/chat",
        selector: '[data-tour="chat-composer"]',
        title: "Send a Message",
        body: "Type here and hit Enter to send (Shift+Enter for a new line). You can also attach an image with the button to the left.",
      },
    ],
  },
  {
    label: "Leads",
    steps: [
      {
        id: "my-leads",
        path: "/agent/dashboard",
        selector: 'a[href="/agent/dashboard"]',
        title: "My Leads",
        body: "Every lead currently assigned to you, with its status and contact info.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "buy-leads",
        path: "/agent/buy-leads",
        selector: 'a[href="/agent/buy-leads"]',
        title: "Buy Leads",
        body: "Trusted third-party lead vendors to supplement what comes through the Vault.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "book-of-business",
        path: "/book-of-business",
        selector: 'a[href="/book-of-business"]',
        title: "Book of Business",
        body: "Every policy you've submitted, with its status, in one place.",
        roles: ["MANAGER", "AGENT"],
      },
    ],
  },
  {
    label: "Selling Tools",
    steps: [
      {
        id: "scripts-overview",
        path: "/scripts",
        selector: '[data-tour="embedded-tool"]',
        title: "Scripts",
        body: "An interactive call script, not just something to read off — it's broken into every section of the sales framework, each with its own built-in objections and rebuttals so you always have an answer ready, wherever the call goes.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "quote-tool",
        path: "/quoter",
        selector: 'a[href="/quoter"]',
        title: "Quote Tool",
        body: "Run quotes across carriers for a prospect right from the app.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "underwriting-genie",
        path: "/underwriting-genie",
        selector: 'a[href="/underwriting-genie"]',
        title: "Underwriting Genie",
        body: "Ask underwriting questions and get instant guidance on carrier guidelines.",
      },
      {
        id: "commission-calculator",
        path: "/commission-calculator",
        selector: 'a[href="/commission-calculator"]',
        title: "Commission Calculator",
        body: "Estimate your commission on a sale before you submit it.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "ask-integrity",
        path: "/ask-integrity",
        selector: 'a[href="/ask-integrity"]',
        title: "Ask Integrity",
        body: "An AI sales coach — it runs a demo call with you, rebuttals included, then grades the call and tells you exactly how to improve.",
      },
      {
        id: "carrier-resources-agent",
        path: "/carrier-resources",
        selector: 'a[href="/carrier-resources"]',
        title: "Carrier Resources",
        body: "Phone numbers and portal links for every carrier you write with, in one place.",
        roles: ["MANAGER", "AGENT"],
      },
    ],
  },
  {
    label: "Wrap-Up",
    steps: [
      {
        id: "outro",
        path: "/overview",
        title: "That's the Platform",
        body: "That covers every section. Come back to this tour any time from your profile menu in the sidebar, or the Platform Tour button on your Profile page — jump straight to any topic from its menu.",
      },
    ],
  },
];

export const ALL_STEPS: TourStep[] = TOUR_SECTIONS.flatMap((s) => s.steps);

export function visibleSections(role: Role): TourSection[] {
  return TOUR_SECTIONS.map((section) => ({
    ...section,
    steps: section.steps.filter(
      (step) => !step.roles || step.roles.includes(role),
    ),
  })).filter((section) => section.steps.length > 0);
}

export function visibleSteps(role: Role): TourStep[] {
  return ALL_STEPS.filter((step) => !step.roles || step.roles.includes(role));
}
