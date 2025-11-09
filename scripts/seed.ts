import { UserRole } from "@prisma/client";

import { MAIN_TENANT_ID, prismaClient } from "@/lib/db";

const seedTenant = async () => {
  const tenantItems = [
    {
      id: MAIN_TENANT_ID,
      name: "Default Tenant",
    },
  ];
  for (const tenantItem of tenantItems) {
    const tenantExists = await prismaClient.tenant.findUnique({
      where: {
        id: tenantItem.id,
      },
    });
    if (!tenantExists) {
      const tenant = await prismaClient.tenant.create({
        data: tenantItem,
      });
      console.log("Tenant created", tenant);
    }
  }
};

const seedUsers = async () => {
  const userItems = [
    {
      id: "kp_d89d794014f543069cd7cc0141846083",
      email: "anthony@aerion.com.au",
      firstName: "Anthony",
      lastName: "Sapountzis",
      roles: [UserRole.ADMIN],
      tenantId: MAIN_TENANT_ID,
    },
    {
      id: "kp_941d13fa884f4f8cbae72befba1ab8f2",
      email: "aaron@aerion.com.au",
      firstName: "Aaron",
      lastName: "Admin User",
      roles: [UserRole.ADMIN],
      tenantId: MAIN_TENANT_ID,
    },
    {
      id: "kp_567387f05bb046d8bbdf2b100077712d",
      email: "suson@aerion.com.au",
      firstName: "Suson",
      lastName: "Admin User",
      roles: [UserRole.ADMIN],
      tenantId: MAIN_TENANT_ID,
    },
  ];
  for (const userItem of userItems) {
    const userExists = await prismaClient.user.findUnique({
      where: {
        email: userItem.email,
      },
    });
    if (!userExists) {
      const user = await prismaClient.user.create({
        data: userItem,
      });
      console.log("User created", user);
    }
  }
};

const seed = async () => {
  console.log("Seeding database...");
  await seedTenant();
  await seedUsers();
  console.log("Database seeded successfully");
};

const run = async () => {
  try {
    await seed();
  } catch (error) {
    console.error("Error seeding database");
    console.error(error);
    process.exit(1);
  }
};

run();
