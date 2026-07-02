import { NextResponse } from "next/server";
import { requireAgent } from "@/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAgent();
  if ("error" in guard) return guard.error;

  const [modules, completedProgress] = await Promise.all([
    db.trainingModule.findMany({
      orderBy: { order: "asc" },
      include: { lessons: { orderBy: { order: "asc" } } },
    }),
    db.trainingProgress.findMany({
      where: { agentId: guard.session.user.id },
      select: { lessonId: true },
    }),
  ]);

  const completedLessonIds = completedProgress.map((p) => p.lessonId);

  return NextResponse.json({ modules, completedLessonIds });
}
