import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function describeEnvUrl(name: string, value: string | undefined) {
  if (!value) {
    console.log(`[env-check] ${name} is NOT SET`);
    return;
  }
  console.log(
    `[env-check] ${name}: length=${value.length}` +
      ` startsWithPostgres=${value.startsWith("postgresql://") || value.startsWith("postgres://")}` +
      ` hasCR=${/\r/.test(value)}` +
      ` hasLF=${/\n/.test(value)}` +
      ` hasLeadingWhitespace=${/^\s/.test(value)}` +
      ` hasTrailingWhitespace=${/\s$/.test(value)}` +
      ` startsWithQuote=${/^["']/.test(value)}` +
      ` endsWithQuote=${/["']$/.test(value)}` +
      ` firstChars=${JSON.stringify(value.slice(0, 12))}` +
      ` lastChars=${JSON.stringify(value.slice(-12))}`,
  );
}

describeEnvUrl("DATABASE_URL", process.env.DATABASE_URL);
describeEnvUrl("DIRECT_URL", process.env.DIRECT_URL);
describeEnvUrl("NEXTAUTH_URL", process.env.NEXTAUTH_URL);

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
