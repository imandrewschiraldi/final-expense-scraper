import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Bad or out-of-range timestamps (e.g. a Postgres "infinity" value from a
// corrupt row) decode into a JS Date with NaN internally. Any later
// .toISOString() call — including the implicit one JSON.stringify makes on
// every Date — throws "RangeError: Invalid time value" and 500s the whole
// page. Sanitizing every query result here means one bad row can never take
// down a page that merely lists it alongside everything else.
function sanitizeDates<T>(value: T): T {
  if (value instanceof Date) {
    return (Number.isNaN(value.getTime()) ? new Date(0) : value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeDates(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = sanitizeDates(v);
    }
    return out as T;
  }
  return value;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const result = await query(args);
          return sanitizeDates(result);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
