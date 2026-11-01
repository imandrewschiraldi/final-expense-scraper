"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Lesson = { id: string; title: string; moduleTitle: string };

export function NewTrainingWidget({ lessons, trainingHref }: { lessons: Lesson[]; trainingHref: string }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-[18px] w-[18px]" style={{ color: "var(--copper-metal-hi)" }} />
          <h3 className="font-condensed text-[15.5px] font-extrabold tracking-wide text-white uppercase">New Training</h3>
        </div>
        <Link href={trainingHref} className="font-condensed text-[11px] font-bold tracking-wide text-teal-light uppercase hover:underline">
          View All
        </Link>
      </div>

      {lessons.length === 0 ? (
        <p className="text-sm text-muted">No new lessons in the last two weeks.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {lessons.map((l) => (
            <Link
              key={l.id}
              href={trainingHref}
              className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.05]"
            >
              <div
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border"
                style={{ background: "linear-gradient(135deg, #2a1a0e, #140a05)", borderColor: "rgba(202,126,64,0.3)" }}
              >
                <BookOpen className="h-[15px] w-[15px]" style={{ color: "var(--copper-metal-hi)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-[13px] font-semibold text-foreground">{l.title}</div>
                <div className="font-condensed mt-0.5 text-[10.5px] tracking-wide text-muted">{l.moduleTitle}</div>
              </div>
              <span
                className="font-condensed shrink-0 rounded-full px-1.75 py-0.5 text-[8.5px] font-extrabold tracking-wide text-[#0a2e2b] uppercase"
                style={{ background: "var(--teal-light)" }}
              >
                New
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
