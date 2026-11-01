import { db } from "@/lib/db";

/** This user plus every descendant under them in the manager hierarchy
 *  (direct reports, their reports, and so on) — breadth-first over
 *  `User.managerId` rather than a raw recursive SQL query, matching the
 *  rest of the codebase's Prisma-only style. Used to scope the Agency
 *  Hall of Fame track to "you and your downline" rather than the whole
 *  org. */
export async function getDownlineIds(rootUserId: string): Promise<string[]> {
  const all = new Set<string>([rootUserId]);
  let frontier = [rootUserId];

  while (frontier.length > 0) {
    const children = await db.user.findMany({
      where: { managerId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id).filter((id) => !all.has(id));
    for (const id of frontier) all.add(id);
  }

  return [...all];
}
