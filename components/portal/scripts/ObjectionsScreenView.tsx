"use client";

import { OBJECTIONS_SCREEN_DIAL_HTML, OBJECTIONS_SCREEN_TABS, OBJECTIONS_SCREEN_PAGES } from "@/lib/salesScript/objectionsScreen";

/** The standalone "Objections" track — its own master-sheet screen with its
 *  own category tabs, distinct from the per-section slide-in panel that
 *  OBJ data feeds (see ObjectionsPanel). */
export function ObjectionsScreenView({ activeTab, onTabChange }: { activeTab: string; onTabChange: (key: string) => void }) {
  const page = OBJECTIONS_SCREEN_PAGES.find((p) => p.id === activeTab);
  return (
    <div>
      <div className="dial-card" dangerouslySetInnerHTML={{ __html: OBJECTIONS_SCREEN_DIAL_HTML }} />
      <div className="obj-screen-tabs">
        {OBJECTIONS_SCREEN_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`obj-tab${activeTab === tab.key ? " active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {page && (
         
        <div className="obj-page visible" dangerouslySetInnerHTML={{ __html: page.html }} />
      )}
    </div>
  );
}
