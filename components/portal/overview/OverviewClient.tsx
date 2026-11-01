"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical, Eye, EyeOff, LayoutGrid, Check, FilePlus2 } from "lucide-react";
import { PageHeading } from "@/components/portal/PageHeading";
import { AnnouncementsCarousel } from "@/components/portal/overview/AnnouncementsCarousel";
import { HallOfFameCard } from "@/components/portal/overview/HallOfFameCard";
import { BonusVolumeCard } from "@/components/portal/overview/BonusVolumeCard";
import { TeamChatWidget } from "@/components/portal/overview/TeamChatWidget";
import { MiniLeaderboard } from "@/components/portal/overview/MiniLeaderboard";
import { NewTrainingWidget } from "@/components/portal/overview/NewTrainingWidget";
import { RecruitingRadarWidget } from "@/components/portal/overview/RecruitingRadarWidget";
import { UnderwritingGenieMini } from "@/components/portal/overview/UnderwritingGenieMini";

type LayoutWidget = { id: string; label: string; order: number; enabled: boolean };

type OverviewData = {
  messages: { id: string; body: string; authorName: string; authorProfileImageUrl: string | null; createdAt: string; channelName: string }[];
  newLessons: { id: string; title: string; moduleTitle: string }[];
  hallOfFame: {
    personal: { issuedAP: number; targetAP: number };
    agency: { issuedAP: number; targetAP: number };
    annuity: { issuedAP: number; targetAP: number };
  };
  bonusVolume: { issuedAP: number };
  layout: LayoutWidget[];
};

function WidgetContent({ id, data, trainingHref }: { id: string; data: OverviewData; trainingHref: string }) {
  switch (id) {
    case "hallOfFame":
      return <HallOfFameCard personal={data.hallOfFame.personal} agency={data.hallOfFame.agency} annuity={data.hallOfFame.annuity} />;
    case "bonusVolume":
      return <BonusVolumeCard issuedAP={data.bonusVolume.issuedAP} />;
    case "teamChat":
      return <TeamChatWidget messages={data.messages} />;
    case "leaderboard":
      return <MiniLeaderboard />;
    case "newTraining":
      return <NewTrainingWidget lessons={data.newLessons} trainingHref={trainingHref} />;
    case "recruitingRadar":
      return <RecruitingRadarWidget />;
    case "underwritingGenie":
      return <UnderwritingGenieMini />;
    default:
      return null;
  }
}

/** Edit-mode wrapper for one grid tile — a drag handle to reorder it and an
 *  eye toggle to show/hide it, overlaid on the real widget underneath
 *  (dimmed while hidden) rather than replacing it with some abstracted
 *  settings-list row, so the admin is reordering the actual page. */
function EditableTile({ widget, onToggle, children }: { widget: LayoutWidget; onToggle: () => void; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className={widget.enabled ? "" : "opacity-40"}>{children}</div>
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-label={widget.enabled ? `Hide ${widget.label}` : `Show ${widget.label}`}
          title={widget.enabled ? "Hide" : "Show"}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          {widget.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <span
          {...attributes}
          {...listeners}
          title="Drag to reorder"
          className="flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded-full bg-black/50 text-white active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

export function OverviewClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(TouchSensor));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/overview")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.json();
      })
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load."));
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = session?.user.role === "ADMIN";
  const name = session?.user.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const trainingHref = session?.user.role === "ADMIN" ? "/admin/training" : "/agent/training";

  async function toggleWidget(id: string, enabled: boolean) {
    setData((d) => (d ? { ...d, layout: d.layout.map((w) => (w.id === id ? { ...w, enabled } : w)) } : d));
    await fetch("/api/admin/overview-layout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!data || !over || active.id === over.id) return;
    const ids = data.layout.map((w) => w.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...data.layout];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setData({ ...data, layout: reordered.map((w, i) => ({ ...w, order: i })) });
    await fetch("/api/admin/overview-layout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder: reordered.map((w) => w.id) }),
    });
  }

  return (
    <div>
      <PageHeading slug="agent-accelerator" alt="Agent Accelerator" />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-condensed mb-1.5 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">{today}</p>
          <h1 className="font-condensed text-[28px] font-extrabold tracking-wide text-white uppercase sm:text-[32px]">
            Welcome back, {name}
          </h1>
          <p className="mt-1.5 text-sm text-muted">Here&apos;s what&apos;s new across the agency since you last logged in.</p>
        </div>
        {isAdmin && data && (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={`font-condensed flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold tracking-wide uppercase transition-colors ${
              editing ? "border-copper-dim-gradient bg-surface2 text-white" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {editing ? "Done" : "Edit Layout"}
          </button>
        )}
        {/* Moved here from the sidebar's "Sell" section — same audience
            (manager/agent, not admin) it was already scoped to there.
            Deliberately not the shared Button component: its variants each
            bake in their own background/text classes, and this codebase's
            cn() is plain clsx (no tailwind-merge), so layering bg-white/
            text-background on top of a variant's own background/color
            classes would leave which one wins to Tailwind's generated
            stylesheet order rather than anything predictable here. */}
        {!isAdmin && (
          <Link
            href="/submit-policy"
            // mr-3.5 (14px) centers this under the top bar's 4-icon cluster
            // (QuickLinks/theme/Bell/avatar, 176px wide total at lg+) rather
            // than sitting flush with its right edge — both are inset the
            // same lg:px-10 from the viewport, so this is a fixed offset,
            // not something that needs to track the cluster at runtime.
            className="font-condensed mr-3.5 inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-bold tracking-[0.08em] text-background uppercase transition-opacity hover:opacity-90"
          >
            <FilePlus2 className="h-4 w-4" />
            Submit Policy
          </Link>
        )}
      </div>

      <AnnouncementsCarousel />

      {error ? (
        <p className="text-sm text-red-light">{error}</p>
      ) : !data ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : editing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={data.layout.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.layout.map((widget) => (
                <EditableTile key={widget.id} widget={widget} onToggle={() => toggleWidget(widget.id, !widget.enabled)}>
                  <WidgetContent id={widget.id} data={data} trainingHref={trainingHref} />
                </EditableTile>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.layout
            .filter((w) => w.enabled)
            .map((widget) => (
              <div key={widget.id}>
                <WidgetContent id={widget.id} data={data} trainingHref={trainingHref} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
