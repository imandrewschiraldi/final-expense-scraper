"use client";

import type { ScriptSectionData } from "@/lib/salesScript/scriptTracks";

/** Stable key for a qlist item's checked state — scoped to its section and
 *  position, since the source items carry no id of their own. */
export function questionKey(sectionId: string, blockIndex: number, itemIndex: number) {
  return `${sectionId}::${blockIndex}::${itemIndex}`;
}

export function ScriptSectionView({
  section,
  open,
  done,
  checkedQuestions,
  openSubdrops,
  onToggle,
  onToggleQuestion,
  onToggleSubdrop,
  onMarkDone,
  onShowObjections,
}: {
  section: ScriptSectionData;
  open: boolean;
  done: boolean;
  checkedQuestions: Set<string>;
  openSubdrops: Set<string>;
  onToggle: () => void;
  onToggleQuestion: (key: string) => void;
  onToggleSubdrop: (id: string) => void;
  onMarkDone: () => void;
  onShowObjections?: () => void;
}) {
  return (
    <div className={`section${open ? " open" : ""}${done ? " active" : ""}`} id={section.id}>
      <div className="sec-hdr" onClick={onToggle}>
        <span className="step-num">{section.stepNum}</span>
        <span className="sec-title">{section.title}</span>
        <div className={`sec-chk${done ? " done" : ""}`}>
          <svg viewBox="0 0 12 10">
            <polyline points="1,5 4,9 11,1" />
          </svg>
        </div>
        <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <div className="sec-body">
        {section.blocks.map((block, i) => {
          if (block.type === "html") {
             
            return <div key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
          }
          if (block.type === "qlist") {
            return (
              <div className="qlist" key={i}>
                {block.items.map((item, qi) => {
                  const qKey = questionKey(section.id, i, qi);
                  const checked = checkedQuestions.has(qKey);
                  return (
                    <div key={qi} className={`qitem${checked ? " checked" : ""}`} onClick={() => onToggleQuestion(qKey)}>
                      <div className="qchk">
                        <svg viewBox="0 0 12 10">
                          <polyline points="1,5 4,9 11,1" />
                        </svg>
                      </div>
                      <div>
                        <div className="qtext" dangerouslySetInnerHTML={{ __html: item }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }
          const isOpen = openSubdrops.has(block.id);
          return (
            <div className={`subdrop${isOpen ? " open" : ""}`} id={block.id} key={i}>
              <div className="subdrop-hdr" onClick={() => onToggleSubdrop(block.id)}>
                <span className="subdrop-title">{block.title}</span>
                <svg className="subdrop-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div className="subdrop-body" dangerouslySetInnerHTML={{ __html: block.html }} />
            </div>
          );
        })}
        <div className="action-row">
          <button className={`mdone${done ? " marked" : ""}`} onClick={onMarkDone}>
            {done ? "Complete" : "Mark Done"}
          </button>
          {onShowObjections && (
            <button className="obj-btn" onClick={onShowObjections}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Objections
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
