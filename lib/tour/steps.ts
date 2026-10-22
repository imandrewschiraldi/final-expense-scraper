export type Role = "ADMIN" | "MANAGER" | "AGENT";

export type TourStep = {
  /** Stable id — persisted to resume a tour across page navigations/reloads. */
  id: string;
  /** Route the viewer is sent to before this step's target is looked up. */
  path: string;
  /** CSS selector for the element to spotlight. Omit for a centered, elementless step (intro/outro). */
  selector?: string;
  /** Dispatches `tour:open-sidebar-group` with this label before searching for the target, so a
   *  collapsed sidebar group (e.g. "Leads") opens on its own instead of hiding the step's target. */
  opensSidebarGroup?: string;
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
        path: "/portal/dashboard",
        title: "Welcome to Tier 1 Financial",
        body: "This tour walks through every section of the platform. Use Next/Back to step through it in order, or open the menu any time to jump straight to a topic.",
      },
      {
        id: "sidebar-profile-link",
        path: "/portal/dashboard",
        selector: '[data-tour="sidebar-profile-link"]',
        title: "Your Profile",
        body: "Click your name/photo here any time to open your profile — your picture, contact details, password, and Demo Mode all live there.",
      },
      {
        id: "profile-picture",
        path: "/portal/profile",
        selector: '[data-tour="profile-picture-button"]',
        title: "Add a Profile Picture",
        body: "Click your photo (or the \"Change picture\" link beside it) to upload one. It shows up next to your name across the Leaderboard, Team Chat, and anywhere else your activity appears.",
      },
      {
        id: "push-notifications",
        path: "/portal/profile",
        selector: '[data-tour="push-notifications-card"]',
        title: "Turn On Notifications",
        body: "Enable push notifications on this device to get alerted for new leads, goals you hit, and Team Chat messages — even when the app isn't open.",
      },
      {
        id: "sidebar-notification-bell",
        path: "/portal/dashboard",
        selector: '[data-tour="sidebar-notification-bell"]',
        title: "In-App Notifications",
        body: "The bell shows your notification history inside the app regardless of whether push is turned on — click it any time to see what you've missed.",
      },
      {
        id: "sidebar-sound-toggle",
        path: "/portal/dashboard",
        selector: '[data-tour="sidebar-sound-toggle"]',
        title: "Sound Effects",
        body: "Toggle the little celebration/alert sounds the app plays (like when you hit a goal) on or off here.",
      },
    ],
  },
  {
    label: "Dashboards",
    steps: [
      {
        id: "dashboard",
        path: "/portal/dashboard",
        selector: 'a[href="/portal/dashboard"]',
        title: "Dashboard",
        body: "Your own production at a glance — KPIs, goals, and analytics, all derived from the policies you've submitted.",
      },
      {
        id: "dashboard-range",
        path: "/portal/dashboard",
        selector: '[data-tour="dashboard-range-select"]',
        title: "Change the Timeframe",
        body: "Switch between Daily, Weekly, Monthly, Year-to-Date, or All — the KPIs and analytics below update to match whichever one you pick.",
      },
      {
        id: "leaderboard",
        path: "/portal/leaderboard",
        selector: 'a[href="/portal/leaderboard"]',
        title: "Leaderboard",
        body: "See where you rank against the rest of the team by issued annual premium, updated live.",
      },
    ],
  },
  {
    label: "Team Chat",
    steps: [
      {
        id: "team-chat",
        path: "/portal/chat",
        selector: 'a[href="/portal/chat"]',
        title: "Team Chat",
        body: "The whole agency's group chat — organized into channels, with pinned messages, reactions, and image sharing.",
      },
      {
        id: "chat-channels",
        path: "/portal/chat",
        selector: '[data-tour="chat-channel-list"]',
        title: "Channels",
        body: "Every channel you have access to lives here — click one to switch to it. Admins and managers can create new channels and categories with the + buttons.",
      },
      {
        id: "chat-composer",
        path: "/portal/chat",
        selector: '[data-tour="chat-composer"]',
        title: "Send a Message",
        body: "Type here and hit Enter to send (Shift+Enter for a new line). You can also attach an image with the button to the left.",
      },
    ],
  },
  {
    label: "Selling Tools",
    steps: [
      {
        id: "book-of-business",
        path: "/portal/book-of-business",
        selector: 'a[href="/portal/book-of-business"]',
        title: "Book of Business",
        body: "Every policy you've submitted, with its status, in one place.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "submit-policy",
        path: "/portal/submit-policy",
        selector: 'a[href="/portal/submit-policy"]',
        title: "Submit Policy",
        body: "Log a new sale here — carrier, product, premium, and the lead it came from.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "scripts-overview",
        path: "/portal/scripts",
        selector: '[data-tour="embedded-tool"]',
        title: "Scripts",
        body: "An interactive call script, not just something to read off — it's broken into every section of the sales framework, each with its own built-in objections and rebuttals so you always have an answer ready, wherever the call goes.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "quote-tool",
        path: "/portal/quoter",
        selector: 'a[href="/portal/quoter"]',
        title: "Quote Tool",
        body: "Run quotes across carriers for a prospect right from the app.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "underwriting-genie",
        path: "/portal/underwriting-genie",
        selector: 'a[href="/portal/underwriting-genie"]',
        title: "Underwriting Genie",
        body: "Ask underwriting questions and get instant guidance on carrier guidelines.",
      },
      {
        id: "commission-calculator",
        path: "/portal/commission-calculator",
        selector: 'a[href="/portal/commission-calculator"]',
        title: "Commission Calculator",
        body: "Estimate your commission on a sale before you submit it.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "ask-integrity",
        path: "/portal/ask-integrity",
        selector: 'a[href="/portal/ask-integrity"]',
        title: "Ask Integrity",
        body: "An AI sales coach — it runs a demo call with you, rebuttals included, then grades the call and tells you exactly how to improve.",
      },
      {
        id: "carrier-resources-agent",
        path: "/portal/carrier-resources",
        selector: 'a[href="/portal/carrier-resources"]',
        title: "Carrier Resources",
        body: "Phone numbers and portal links for every carrier you write with, in one place.",
        roles: ["MANAGER", "AGENT"],
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
        opensSidebarGroup: "Leads",
        title: "My Leads",
        body: "Found under the Leads tab in the sidebar — every lead currently assigned to you, with its status and contact info.",
        roles: ["MANAGER", "AGENT"],
      },
      {
        id: "buy-leads",
        path: "/agent/buy-leads",
        selector: 'a[href="/agent/buy-leads"]',
        opensSidebarGroup: "Leads",
        title: "Buy Leads",
        body: "Trusted third-party lead vendors to supplement what comes through the Vault.",
        roles: ["MANAGER", "AGENT"],
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
        body: "Onboarding lessons and ongoing training modules.",
        roles: ["MANAGER", "AGENT"],
      },
    ],
  },
  {
    label: "Wrap-Up",
    steps: [
      {
        id: "outro",
        path: "/portal/dashboard",
        title: "That's the Platform",
        body: "That covers every section. Come back to this tour any time from the tab on the edge of the screen, and jump straight to any topic from its menu.",
      },
    ],
  },
];

export const ALL_STEPS: TourStep[] = TOUR_SECTIONS.flatMap((s) => s.steps);

export function visibleSections(role: Role): TourSection[] {
  return TOUR_SECTIONS.map((section) => ({
    ...section,
    steps: section.steps.filter((step) => !step.roles || step.roles.includes(role)),
  })).filter((section) => section.steps.length > 0);
}

export function visibleSteps(role: Role): TourStep[] {
  return ALL_STEPS.filter((step) => !step.roles || step.roles.includes(role));
}
