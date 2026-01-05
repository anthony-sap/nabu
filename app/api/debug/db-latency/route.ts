import { NextRequest } from "next/server";
import { prisma, prismaClient } from "@/lib/db";

/**
 * GET /api/debug/db-latency
 * Test database connection latency
 */
export async function GET(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  // Test 1: Simple SELECT 1
  try {
    const start1 = Date.now();
    await prismaClient.$queryRaw`SELECT 1`;
    const latency1 = Date.now() - start1;
    results.tests.push({
      name: "Raw SELECT 1",
      latency: `${latency1}ms`,
      status: latency1 < 100 ? "✅ Good" : latency1 < 500 ? "⚠️ Slow" : "❌ Very Slow",
    });
  } catch (error: any) {
    results.tests.push({
      name: "Raw SELECT 1",
      error: error.message,
      status: "❌ Failed",
    });
  }

  // Test 2: Prisma findFirst (User table)
  try {
    const start2 = Date.now();
    await prisma.user.findFirst({
      where: { id: "00000000-0000-0000-0000-000000000000" }, // Non-existent ID
      select: { id: true },
    });
    const latency2 = Date.now() - start2;
    results.tests.push({
      name: "Prisma User.findFirst (non-existent)",
      latency: `${latency2}ms`,
      status: latency2 < 100 ? "✅ Good" : latency2 < 500 ? "⚠️ Slow" : "❌ Very Slow",
    });
  } catch (error: any) {
    results.tests.push({
      name: "Prisma User.findFirst",
      error: error.message,
      status: "❌ Failed",
    });
  }

  // Test 3: Count query
  try {
    const start3 = Date.now();
    await prisma.user.count();
    const latency3 = Date.now() - start3;
    results.tests.push({
      name: "Prisma User.count",
      latency: `${latency3}ms`,
      status: latency3 < 100 ? "✅ Good" : latency3 < 500 ? "⚠️ Slow" : "❌ Very Slow",
    });
  } catch (error: any) {
    results.tests.push({
      name: "Prisma User.count",
      error: error.message,
      status: "❌ Failed",
    });
  }

  // Test 4: Connection pool info
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const isPooler = dbUrl.includes("pooler") || dbUrl.includes("6543");
    const region = dbUrl.match(/aws-\d+-(.+?)\./)?.[1] || "unknown";
    
    results.connectionInfo = {
      usingPooler: isPooler,
      region: region,
      port: dbUrl.includes(":6543") ? "6543 (pooler)" : dbUrl.includes(":5432") ? "5432 (direct)" : "unknown",
    };
  } catch (error: any) {
    results.connectionInfo = { error: error.message };
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

