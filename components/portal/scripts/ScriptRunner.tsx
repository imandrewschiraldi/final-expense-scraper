"use client";

import { useState } from "react";
import "@/app/portal/scripts/scripts.css";
import { SCRIPT_TRACKS, type TrackId } from "@/lib/salesScript/scriptTracks";
import { OBJECTIONS_SCREEN_TABS } from "@/lib/salesScript/objectionsScreen";
import { ScriptSectionView } from "@/components/portal/scripts/ScriptSectionView";
import { ObjectionsScreenView } from "@/components/portal/scripts/ObjectionsScreenView";
import { ObjectionsPanel } from "@/components/portal/scripts/ObjectionsPanel";

type ActiveTrack = TrackId | "objections";

const TRACK_BUTTONS: { id: ActiveTrack; label: string; obj?: boolean }[] = [
  { id: "mp", label: "Mortgage Protection" },
  { id: "finexp", label: "Veterans Final Expense" },
  { id: "iul", label: "IUL / Cash Value" },
  { id: "fia", label: "FIA / Annuity" },
  { id: "objections", label: "Objections", obj: true },
];

function seedOpen(track: TrackId): Set<string> {
  return new Set(SCRIPT_TRACKS[track].sections.filter((s) => s.defaultOpen).map((s) => s.id));
}

export function ScriptRunner() {
  const [activeTrack, setActiveTrack] = useState<ActiveTrack>("mp");
  const [openSections, setOpenSections] = useState<Set<string>>(() => seedOpen("mp"));
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set());
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [openSubdrops, setOpenSubdrops] = useState<Set<string>>(new Set());
  const [objPanel, setObjPanel] = useState<{ open: boolean; key: string | null }>({ open: false, key: null });
  const [activeObjTab, setActiveObjTab] = useState(OBJECTIONS_SCREEN_TABS[0]?.key ?? "");

  function switchTrack(id: ActiveTrack) {
    setActiveTrack(id);
    if (id !== "objections") setOpenSections(seedOpen(id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function markDone(id: string) {
    if (doneSections.has(id) || activeTrack === "objections") return;
    setDoneSections((prev) => new Set(prev).add(id));
    const sections = SCRIPT_TRACKS[activeTrack].sections;
    const idx = sections.findIndex((s) => s.id === id);
    if (idx >= 0 && idx < sections.length - 1) {
      const nextId = sections[idx + 1].id;
      setOpenSections((prev) => new Set(prev).add(nextId));
      setTimeout(() => {
        document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }

  function toggleQuestion(key: string) {
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSubdrop(id: string) {
    setOpenSubdrops((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openObjections(key: string) {
    setObjPanel({ open: true, key });
  }

  function closeObjPanel() {
    setObjPanel({ open: false, key: null });
  }

  function restartTrack() {
    if (activeTrack === "objections") return;
    if (!window.confirm("Reset this script? All progress and notes will be cleared.")) return;
    const ids = new Set(SCRIPT_TRACKS[activeTrack].sections.map((s) => s.id));
    setDoneSections((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      for (const key of next) {
        if (ids.has(key.split("::")[0])) next.delete(key);
      }
      return next;
    });
    setOpenSections(seedOpen(activeTrack));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const trackData = activeTrack !== "objections" ? SCRIPT_TRACKS[activeTrack] : null;
  const doneCount = trackData ? trackData.sections.filter((s) => doneSections.has(s.id)).length : 0;
  const pct = trackData && trackData.sections.length > 0 ? Math.round((doneCount / trackData.sections.length) * 100) : 0;

  return (
    <div className={`t1-scripts${objPanel.open ? " panel-open" : ""}`}>
      <div className="header-row">
        <div className="selector-wrap">
          <div className="selector-label">Choose Your Script</div>
          <div className="selector-btns">
            {TRACK_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                className={`sel-btn${btn.obj ? " sel-btn-obj" : ""}${activeTrack === btn.id ? " active" : ""}`}
                onClick={() => switchTrack(btn.id)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        {trackData && (
          <div className="flex items-center gap-3">
            <button className="restart-btn" onClick={restartTrack}>
              New Call
            </button>
            <div className="bar-wrap">
              <span className="bar-label">Progress</span>
              <div className="bar-bg">
                <div className="bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="bar-pct">{pct}%</span>
            </div>
          </div>
        )}
      </div>

      <main className="t1s-main">
        {activeTrack === "objections" ? (
          <ObjectionsScreenView activeTab={activeObjTab} onTabChange={setActiveObjTab} />
        ) : (
          trackData && (
            <>
              <div className="dial-card" dangerouslySetInnerHTML={{ __html: trackData.dialHtml }} />
              {trackData.sections.map((section) => (
                <ScriptSectionView
                  key={section.id}
                  section={section}
                  open={openSections.has(section.id)}
                  done={doneSections.has(section.id)}
                  checkedQuestions={checkedQuestions}
                  openSubdrops={openSubdrops}
                  onToggle={() => toggleSection(section.id)}
                  onToggleQuestion={toggleQuestion}
                  onToggleSubdrop={toggleSubdrop}
                  onMarkDone={() => markDone(section.id)}
                  onShowObjections={section.objKey ? () => openObjections(section.objKey!) : undefined}
                />
              ))}
            </>
          )
        )}
      </main>

      <ObjectionsPanel open={objPanel.open} objKey={objPanel.key} onClose={closeObjPanel} />
    </div>
  );
}
