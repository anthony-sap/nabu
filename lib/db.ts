import "server-only";

import { PrismaClient } from "@prisma/client";

import {
  createdByUpdatedBy,
  softDeleteAware,
  storingAuditLog,
  tenantAware,
} from "./dbMiddleware";

export const MAIN_TENANT_ID = "4365be3f-1d9c-4408-83d1-c250d1a3a251";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient;
}

export let prismaClient: PrismaClient;
if (process.env.NODE_ENV === "production") {
  prismaClient = new PrismaClient();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient();
  }
  prismaClient = global.cachedPrisma;
}

export let prisma = prismaClient
  .$extends(softDeleteAware)
  .$extends(tenantAware)
  .$extends(createdByUpdatedBy)
  .$extends(storingAuditLog);
