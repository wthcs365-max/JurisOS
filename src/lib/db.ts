import { PrismaClient } from "@prisma/client";

// SQLite default for local dev / this sandbox. Prisma resolves the relative path
// against prisma/schema.prisma, so this always points at prisma/dev.db regardless
// of the server's working directory. When a real DATABASE_URL is provided
// (e.g. Postgres in production), it wins.
process.env.DATABASE_URL ??= "file:./dev.db";

// Reuse the client across hot reloads in dev; the Node server is single-threaded
// so a module-level singleton is safe.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
