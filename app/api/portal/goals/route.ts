import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/apiAuth";
import { db } from "@/lib/db";
import { activeGoalsFor, recentWinsFor } from "@/lib/personalDashboard";
import { GoalCategory } from "@prisma/client";

const GOAL_CATEGORIES: GoalCategory[] = ["MONTHLY_AP", "ANNUAL_AP", "ISSUED_PREMIUM", "POLICY_COUNT", "INCOME", "RECRUITING"];

export async function GET() {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const [active, recentWins] = await Promise.all([
    activeGoalsFor(guard.session.user.id),
    recentWinsFor(guard.session.user.id),
  ]);

  return NextResponse.json({ active, recentWins });
}

export async function POST(req: NextRequest) {
  const guard = await requireAnyRole();
  if ("error" in guard) return guard.error;

  const body = await req.json();
  const { category, targetValue, periodStart, periodEnd } = body as {
    category?: GoalCategory;
    targetValue?: number;
    periodStart?: string;
    periodEnd?: string;
  };

  if (!category || !GOAL_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid goal category" }, { status: 400 });
  }
  if (!targetValue || targetValue <= 0) {
    return NextResponse.json({ error: "Target value must be positive" }, { status: 400 });
  }
  if (!periodStart || !periodEnd || new Date(periodEnd) <= new Date(periodStart)) {
    return NextResponse.json({ error: "Period end must be after period start" }, { status: 400 });
  }

  const goal = await db.goal.create({
    data: {
      userId: guard.session.user.id,
      category,
      targetValue,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
