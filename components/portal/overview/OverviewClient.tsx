"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { AnnouncementsCarousel } from "@/components/portal/overview/AnnouncementsCarousel";
import { HallOfFameCard } from "@/components/portal/overview/HallOfFameCard";
import { TeamChatWidget } from "@/components/portal/overview/TeamChatWidget";
import { NewTrainingWidget } from "@/components/portal/overview/NewTrainingWidget";

type OverviewData = {
  messages: { id: string; body: string; authorName: string; createdAt: string; channelName: string }[];
  newLessons: { id: string; title: string; moduleTitle: string }[];
  hallOfFame: { issuedAP: number; targetAP: number };
};

export function OverviewClient() {
  const { data: session } = useSession();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const name = session?.user.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const trainingHref = session?.user.role === "ADMIN" ? "/admin/training" : "/agent/training";

  return (
    <div>
      {/* Centered logo, same role every other page's PageHeading plays —
          its own height plus margin is what clears the Ask Gemini box and
          icon cluster (pure position:absolute overlays with no document
          flow height of their own) at the lg breakpoint and up, where
          they're actually shown. The copper line right below it is
          AppShell's own HeaderDivider, already rendered above this
          component for every page. */}
      <div className="mt-3 mb-8 flex justify-center lg:mt-20">
        <Image src="/agent-accelerator-full-logo.jpg" alt="Agent Accelerator" width={1320} height={492} className="h-14 w-auto sm:h-16 lg:h-20" priority />
      </div>

      <div className="mb-7">
        <p className="font-condensed mb-1.5 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">{today}</p>
        <h1 className="font-condensed text-[28px] font-extrabold tracking-wide text-white uppercase sm:text-[32px]">
          Welcome back, {name}
        </h1>
        <p className="mt-1.5 text-sm text-muted">Here&apos;s what&apos;s new across the agency since you last logged in.</p>
      </div>

      <AnnouncementsCarousel />

      {error ? (
        <p className="text-sm text-red-light">{error}</p>
      ) : !data ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <HallOfFameCard issuedAP={data.hallOfFame.issuedAP} targetAP={data.hallOfFame.targetAP} />
          <TeamChatWidget messages={data.messages} />
          <NewTrainingWidget lessons={data.newLessons} trainingHref={trainingHref} />
        </div>
      )}
    </div>
  );
}
