-- The admin-configurable widget-grid dashboard (Team Dashboard on the
-- Leaderboard page) is replaced by the purpose-built Organization Dashboard.
-- DropForeignKey
ALTER TABLE "dashboard_layouts" DROP CONSTRAINT IF EXISTS "dashboard_layouts_updatedById_fkey";

-- DropTable
DROP TABLE IF EXISTS "dashboard_layouts";
