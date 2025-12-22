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

const seedAnthonyFolders = async () => {
  // Find Anthony's user record
  const anthony = await prismaClient.user.findUnique({
    where: { email: "anthony@aerion.com.au" },
  });

  if (!anthony) {
    console.log("Anthony user not found, skipping folder seeding");
    return;
  }

  console.log(`Seeding folders for Anthony (${anthony.email})...`);

  // Define folder structure
  const folderStructure = [
    { name: "Inbox", children: [] },
    { name: "Work", children: [] },
    { name: "Home", children: [] },
    { name: "Ideas and Experiments", children: [] },
    {
      name: "Business",
      children: [
        { name: "Aerion Technologies", children: [] },
        { name: "Client Work", children: [] },
      ],
    },
    {
      name: "Content and Media",
      children: [
        { name: "Video Content", children: [] },
        { name: "Articles and Writing", children: [] },
        { name: "Ads and Funnels", children: [] },
      ],
    },
  ];

  // Helper function to create folders recursively
  const createFolder = async (
    folderData: { name: string; children: any[] },
    parentId: string | null = null,
    order: number = 0
  ): Promise<string> => {
    // Check if folder already exists
    const existing = await prismaClient.folder.findFirst({
      where: {
        userId: anthony.id,
        tenantId: anthony.tenantId,
        name: folderData.name,
        parentId: parentId,
      },
    });

    if (existing) {
      console.log(`  Folder already exists: ${folderData.name}`);
      return existing.id;
    }

    // Create folder
    const folder = await prismaClient.folder.create({
      data: {
        name: folderData.name,
        userId: anthony.id,
        tenantId: anthony.tenantId,
        parentId: parentId,
        order: order,
        createdBy: anthony.id,
        updatedBy: anthony.id,
      },
    });

    console.log(`  ✓ Created folder: ${folderData.name}${parentId ? " (child)" : " (root)"}`);

    // Create children recursively
    for (let i = 0; i < folderData.children.length; i++) {
      await createFolder(folderData.children[i], folder.id, i);
    }

    return folder.id;
  };

  // Create all folders
  for (let i = 0; i < folderStructure.length; i++) {
    await createFolder(folderStructure[i], null, i);
  }

  console.log("✓ Anthony's folders seeded successfully");
};

const seed = async () => {
  console.log("Seeding database...");
  await seedTenant();
  await seedUsers();
  await seedAnthonyFolders();
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
