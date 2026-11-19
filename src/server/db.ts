import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as typeof globalThis & { wordRunDb?: PrismaClient };

export function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  return globalDb.wordRunDb ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 3, connectionTimeoutMillis: 5_000 }),
  });
}
