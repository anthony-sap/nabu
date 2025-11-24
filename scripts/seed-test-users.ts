/**
 * Seed Test Users Script
 * 
 * Creates test users with different plan tiers for testing entitlements:
 * - Free plan users (anthony+free*@aerion.com.au)
 * - Personal plan user (anthony@aerion.com.au)
 * - Teams plan users (anthony+teams*@aerion.com.au) - ready for workspace assignment
 */

import { UserRole } from "@prisma/client";
import { MAIN_TENANT_ID, prismaClient } from "@/lib/db";

/**
 * Generate a Kinde-style user ID
 */
function generateKindeId(): string {
  return `kp_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
}

const seedTestUsers = async () => {
  console.log("Seeding test users for entitlements testing...\n");

  // Update Anthony to Personal plan
  const anthony = await prismaClient.user.findUnique({
    where: { email: "anthony@aerion.com.au" },
  });

  if (anthony) {
    await prismaClient.user.update({
      where: { id: anthony.id },
      data: {
        plan: "personal",
      },
    });
    console.log("✓ Updated anthony@aerion.com.au to Personal plan");
  } else {
    console.log("⚠ anthony@aerion.com.au not found, skipping update");
  }

  // Free plan test users
  const freeUsers = [
    {
      email: "anthony+free1@aerion.com.au",
      firstName: "Free",
      lastName: "User One",
      plan: "free" as const,
    },
    {
      email: "anthony+free2@aerion.com.au",
      firstName: "Free",
      lastName: "User Two",
      plan: "free" as const,
    },
    {
      email: "anthony+free3@aerion.com.au",
      firstName: "Free",
      lastName: "User Three",
      plan: "free" as const,
    },
  ];

  console.log("\nCreating Free plan users...");
  for (const userData of freeUsers) {
    const existing = await prismaClient.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      // Update plan if user exists
      await prismaClient.user.update({
        where: { id: existing.id },
        data: { plan: userData.plan },
      });
      console.log(`  ✓ Updated ${userData.email} to Free plan`);
    } else {
      const user = await prismaClient.user.create({
        data: {
          id: generateKindeId(),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          plan: userData.plan,
          roles: [UserRole.USER],
          tenantId: MAIN_TENANT_ID,
        },
      });
      console.log(`  ✓ Created ${userData.email} (Free plan)`);
    }
  }

  // Personal plan test users (in addition to Anthony)
  const personalUsers = [
    {
      email: "anthony+personal1@aerion.com.au",
      firstName: "Personal",
      lastName: "User One",
      plan: "personal" as const,
    },
    {
      email: "anthony+personal2@aerion.com.au",
      firstName: "Personal",
      lastName: "User Two",
      plan: "personal" as const,
    },
  ];

  console.log("\nCreating Personal plan users...");
  for (const userData of personalUsers) {
    const existing = await prismaClient.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      await prismaClient.user.update({
        where: { id: existing.id },
        data: { plan: userData.plan },
      });
      console.log(`  ✓ Updated ${userData.email} to Personal plan`);
    } else {
      const user = await prismaClient.user.create({
        data: {
          id: generateKindeId(),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          plan: userData.plan,
          roles: [UserRole.USER],
          tenantId: MAIN_TENANT_ID,
        },
      });
      console.log(`  ✓ Created ${userData.email} (Personal plan)`);
    }
  }

  // Teams plan test users (ready for workspace assignment)
  // Note: These users have 'teams' plan but won't have workspaces yet
  // Workspaces can be created and they can be added as members
  const teamsUsers = [
    {
      email: "anthony+teams1@aerion.com.au",
      firstName: "Teams",
      lastName: "User One",
      plan: "teams" as const,
    },
    {
      email: "anthony+teams2@aerion.com.au",
      firstName: "Teams",
      lastName: "User Two",
      plan: "teams" as const,
    },
    {
      email: "anthony+teams3@aerion.com.au",
      firstName: "Teams",
      lastName: "User Three",
      plan: "teams" as const,
    },
    {
      email: "anthony+teams4@aerion.com.au",
      firstName: "Teams",
      lastName: "User Four",
      plan: "teams" as const,
    },
  ];

  console.log("\nCreating Teams plan users...");
  for (const userData of teamsUsers) {
    const existing = await prismaClient.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      await prismaClient.user.update({
        where: { id: existing.id },
        data: { plan: userData.plan },
      });
      console.log(`  ✓ Updated ${userData.email} to Teams plan`);
    } else {
      const user = await prismaClient.user.create({
        data: {
          id: generateKindeId(),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          plan: userData.plan,
          roles: [UserRole.USER],
          tenantId: MAIN_TENANT_ID,
        },
      });
      console.log(`  ✓ Created ${userData.email} (Teams plan)`);
    }
  }

  console.log("\n✓ Test users seeding completed!");
  console.log("\nSummary:");
  console.log("  - Free plan: 3 users (anthony+free1-3@aerion.com.au)");
  console.log("  - Personal plan: anthony@aerion.com.au + 2 test users (anthony+personal1-2@aerion.com.au)");
  console.log("  - Teams plan: 4 users (anthony+teams1-4@aerion.com.au)");
  console.log("\nNote: Teams users are ready for workspace assignment via the workspace invite system.");
};

const run = async () => {
  try {
    await seedTestUsers();
    await prismaClient.$disconnect();
  } catch (error) {
    console.error("Error seeding test users");
    console.error(error);
    await prismaClient.$disconnect();
    process.exit(1);
  }
};

run();


