import { POST as createWebhook, GET as listWebhooks } from "../webhooks/route";
import {
  GET as getWebhookById,
  PATCH as updateWebhook,
  DELETE as deleteWebhook,
} from "../webhooks/[id]/route";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/nabu-helpers";
import { env } from "@/env";

jest.mock("@/lib/nabu-helpers", () => {
  const actual = jest.requireActual("@/lib/nabu-helpers");
  return {
    ...actual,
    getUserContext: jest.fn(),
  };
});

jest.mock("@/lib/db", () => ({
  prisma: {
    webhookEndpoint: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    webhookProcessingJob: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://example.com",
  },
}));

const mockGetUserContext = getUserContext as jest.Mock;

const defaultContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "user@example.com",
};

const baseWebhook = {
  id: "webhook-1",
  tenantId: defaultContext.tenantId,
  userId: defaultContext.userId,
  token: "test-token-123456789012345678901234567890",
  name: "Test Webhook",
  description: "Test description",
  isActive: true,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  deletedAt: null,
  createdBy: defaultContext.userId,
  updatedBy: defaultContext.userId,
  deletedBy: null,
  _count: {
    processingJobs: 5,
  },
};

describe("Webhooks API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserContext.mockResolvedValue(defaultContext);
  });

  describe("POST /api/nabu/webhooks", () => {
    it("creates webhook endpoint successfully", async () => {
      const createdWebhook = {
        ...baseWebhook,
        token: "new-token-123456789012345678901234567890",
      };
      (prisma.webhookEndpoint.create as jest.Mock).mockResolvedValue(createdWebhook);

      const res = await createWebhook(
        new Request("http://localhost/api/nabu/webhooks", {
          method: "POST",
          body: JSON.stringify({
            name: "Test Webhook",
            description: "Test description",
          }),
        }),
      );

      expect(prisma.webhookEndpoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
          name: "Test Webhook",
          description: "Test description",
          isActive: true,
          token: expect.any(String),
          createdBy: defaultContext.userId,
          updatedBy: defaultContext.userId,
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Test Webhook");
      expect(body.data.url).toContain("/api/webhooks/inbound/");
    });

    it("validates name is required", async () => {
      const res = await createWebhook(
        new Request("http://localhost/api/nabu/webhooks", {
          method: "POST",
          body: JSON.stringify({
            description: "Test description",
          }),
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
    });

    it("generates unique token for each webhook", async () => {
      const token1 = "token-1-123456789012345678901234567890";
      const token2 = "token-2-123456789012345678901234567890";

      (prisma.webhookEndpoint.create as jest.Mock)
        .mockResolvedValueOnce({ ...baseWebhook, token: token1 })
        .mockResolvedValueOnce({ ...baseWebhook, token: token2 });

      const res1 = await createWebhook(
        new Request("http://localhost/api/nabu/webhooks", {
          method: "POST",
          body: JSON.stringify({ name: "Webhook 1" }),
        }),
      );

      const res2 = await createWebhook(
        new Request("http://localhost/api/nabu/webhooks", {
          method: "POST",
          body: JSON.stringify({ name: "Webhook 2" }),
        }),
      );

      const body1 = await res1.json();
      const body2 = await res2.json();

      expect(body1.data.token).not.toBe(body2.data.token);
    });
  });

  describe("GET /api/nabu/webhooks", () => {
    it("returns webhooks for the current user", async () => {
      (prisma.webhookEndpoint.findMany as jest.Mock).mockResolvedValue([baseWebhook]);
      (prisma.webhookProcessingJob.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      });

      const res = await listWebhooks(
        new Request("http://localhost/api/nabu/webhooks"),
      );

      expect(prisma.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: {
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              processingJobs: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Test Webhook");
      expect(body.data[0].totalReceived).toBe(5);
    });

    it("handles webhooks with no received payloads", async () => {
      const webhookNoJobs = {
        ...baseWebhook,
        _count: { processingJobs: 0 },
      };
      (prisma.webhookEndpoint.findMany as jest.Mock).mockResolvedValue([webhookNoJobs]);
      (prisma.webhookProcessingJob.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await listWebhooks(
        new Request("http://localhost/api/nabu/webhooks"),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].totalReceived).toBe(0);
      expect(body.data[0].lastReceived).toBeNull();
    });
  });

  describe("GET /api/nabu/webhooks/[id]", () => {
    it("returns webhook details", async () => {
      (prisma.webhookEndpoint.findFirst as jest.Mock).mockResolvedValue(baseWebhook);
      (prisma.webhookProcessingJob.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      });

      const res = await getWebhookById(
        new Request("http://localhost/api/nabu/webhooks/webhook-1"),
        { params: Promise.resolve({ id: "webhook-1" }) },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe("webhook-1");
      expect(body.data.name).toBe("Test Webhook");
    });

    it("returns 404 when webhook not found", async () => {
      (prisma.webhookEndpoint.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await getWebhookById(
        new Request("http://localhost/api/nabu/webhooks/webhook-unknown"),
        { params: Promise.resolve({ id: "webhook-unknown" }) },
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Webhook endpoint not found");
    });
  });

  describe("PATCH /api/nabu/webhooks/[id]", () => {
    it("updates webhook successfully", async () => {
      (prisma.webhookEndpoint.findFirst as jest.Mock).mockResolvedValue(baseWebhook);
      (prisma.webhookEndpoint.update as jest.Mock).mockResolvedValue({
        ...baseWebhook,
        name: "Updated Name",
      });

      const res = await updateWebhook(
        new Request("http://localhost/api/nabu/webhooks/webhook-1", {
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Name",
            isActive: false,
          }),
        }),
        { params: Promise.resolve({ id: "webhook-1" }) },
      );

      expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith({
        where: { id: "webhook-1" },
        data: expect.objectContaining({
          name: "Updated Name",
          isActive: false,
          updatedBy: defaultContext.userId,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.name).toBe("Updated Name");
    });

    it("returns 404 when webhook not found", async () => {
      (prisma.webhookEndpoint.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await updateWebhook(
        new Request("http://localhost/api/nabu/webhooks/webhook-unknown", {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated" }),
        }),
        { params: Promise.resolve({ id: "webhook-unknown" }) },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/nabu/webhooks/[id]", () => {
    it("soft deletes webhook successfully", async () => {
      (prisma.webhookEndpoint.findFirst as jest.Mock).mockResolvedValue(baseWebhook);
      (prisma.webhookEndpoint.update as jest.Mock).mockResolvedValue({
        ...baseWebhook,
        isActive: false,
        deletedAt: new Date(),
      });

      const res = await deleteWebhook(
        new Request("http://localhost/api/nabu/webhooks/webhook-1", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "webhook-1" }) },
      );

      expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith({
        where: { id: "webhook-1" },
        data: expect.objectContaining({
          isActive: false,
          deletedAt: expect.any(Date),
          updatedBy: defaultContext.userId,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 404 when webhook not found", async () => {
      (prisma.webhookEndpoint.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await deleteWebhook(
        new Request("http://localhost/api/nabu/webhooks/webhook-unknown", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "webhook-unknown" }) },
      );

      expect(res.status).toBe(404);
    });
  });
});

