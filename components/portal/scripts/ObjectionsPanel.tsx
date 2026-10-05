"use client";

import { OBJ } from "@/lib/salesScript/objData";

/** The slide-in (desktop) / bottom-carousel (mobile) panel a section's
 *  "Objections" button opens, filled from OBJ by the section's objKey. */
export function ObjectionsPanel({ open, objKey, onClose }: { open: boolean; objKey: string | null; onClose: () => void }) {
  const data = objKey ? OBJ[objKey] : undefined;

  return (
    <div className={`panel-overlay${open ? " open" : ""}`}>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-head-text">
            <h3>{data?.title ?? ""}</h3>
            <span>{data?.sub ?? ""}</span>
          </div>
          <button className="panel-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="panel-body">
          {data?.items.map((item, i) => (
            <div className="panel-obj" key={i}>
              <span className="obj-q" dangerouslySetInnerHTML={{ __html: item.q }} />
              <span className="obj-a" dangerouslySetInnerHTML={{ __html: item.a }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
