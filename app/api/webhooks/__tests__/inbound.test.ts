import {
  POST as handleWebhookPost,
  GET as handleWebhookGet,
} from "../inbound/[token]/route";
import { prisma } from "@/lib/db";
import { env } from "@/env";

jest.mock("@/lib/db", () => ({
  prisma: {
    webhookEndpoint: {
      findUnique: jest.fn(),
    },
    note: {
      create: jest.fn(),
    },
    webhookProcessingJob: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://example.com",
  },
}));

const mockWebhookEndpoint = {
  id: "webhook-1",
  userId: "user-1",
  tenantId: "tenant-1",
  token: "test-token-123456789012345678901234567890",
  isActive: true,
  deletedAt: null,
};

describe("Webhook Inbound Endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/webhooks/inbound/[token]", () => {
    it("creates note and processing job for valid webhook", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(
        mockWebhookEndpoint,
      );
      (prisma.note.create as jest.Mock).mockResolvedValue({
        id: "note-1",
        userId: "user-1",
        tenantId: "tenant-1",
        title: "Webhook: 2025-01-01T00:00:00.000Z",
        content: '{"message":"test"}',
      });
      (prisma.webhookProcessingJob.create as jest.Mock).mockResolvedValue({
        id: "job-1",
      });

      const req = new Request("http://localhost/api/webhooks/inbound/test-token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "192.168.1.1",
        },
        body: JSON.stringify({ message: "test" }),
      });

      const res = await handleWebhookPost(req, {
        params: Promise.resolve({ token: "test-token-123456789012345678901234567890" }),
      });

      expect(prisma.webhookEndpoint.findUnique).toHaveBeenCalledWith({
        where: {
          token: "test-token-123456789012345678901234567890",
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          tenantId: true,
        },
      });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          tenantId: "tenant-1",
          title: expect.any(String),
          content: expect.any(String),
          visibility: "PRIVATE",
          meta: expect.objectContaining({
            source: "WEBHOOK",
            webhookEndpointId: "webhook-1",
            method: "POST",
          }),
        }),
      });

      expect(prisma.webhookProcessingJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          noteId: "note-1",
          webhookEndpointId: "webhook-1",
          status: "PENDING",
          method: "POST",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 404 for invalid token", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request("http://localhost/api/webhooks/inbound/invalid-token", {
        method: "POST",
        body: JSON.stringify({ message: "test" }),
      });

      const res = await handleWebhookPost(req, {
        params: Promise.resolve({ token: "invalid-token" }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain("not found");
    });

    it("returns 404 for inactive webhook", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request("http://localhost/api/webhooks/inbound/test-token", {
        method: "POST",
        body: JSON.stringify({ message: "test" }),
      });

      const res = await handleWebhookPost(req, {
        params: Promise.resolve({ token: "test-token-123456789012345678901234567890" }),
      });

      expect(res.status).toBe(404);
    });

    it("handles JSON payload correctly", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(
        mockWebhookEndpoint,
      );
      (prisma.note.create as jest.Mock).mockResolvedValue({
        id: "note-1",
        userId: "user-1",
        tenantId: "tenant-1",
        title: "Webhook: 2025-01-01T00:00:00.000Z",
        content: '{"title":"Test","content":"Hello"}',
      });
      (prisma.webhookProcessingJob.create as jest.Mock).mockResolvedValue({
        id: "job-1",
      });

      const payload = { title: "Test", content: "Hello" };
      const req = new Request("http://localhost/api/webhooks/inbound/test-token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await handleWebhookPost(req, {
        params: Promise.resolve({ token: "test-token-123456789012345678901234567890" }),
      });

      expect(res.status).toBe(200);
      const createCall = (prisma.note.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.content).toContain("Hello");
    });

    it("handles plain text payload correctly", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(
        mockWebhookEndpoint,
      );
      (prisma.note.create as jest.Mock).mockResolvedValue({
        id: "note-1",
        userId: "user-1",
        tenantId: "tenant-1",
        title: "Webhook: 2025-01-01T00:00:00.000Z",
        content: "Plain text content",
      });
      (prisma.webhookProcessingJob.create as jest.Mock).mockResolvedValue({
        id: "job-1",
      });

      const req = new Request("http://localhost/api/webhooks/inbound/test-token", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
        },
        body: "Plain text content",
      });

      const res = await handleWebhookPost(req, {
        params: Promise.resolve({ token: "test-token-123456789012345678901234567890" }),
      });

      expect(res.status).toBe(200);
      const createCall = (prisma.note.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.content).toBe("Plain text content");
    });

    it("extracts title from payload when available", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(
        mockWebhookEndpoint,
      );
      (prisma.note.create as jest.Mock).mockResolvedValue({
        id: "note-1",
        userId: "user-1",
        tenantId: "tenant-1",
        title: "Test Title",
        content: '{"title":"Test Title","body":"Content"}',
      });
      (prisma.webhookProcessingJob.create as jest.Mock).mockResolvedValue({
        id: "job-1",
      });

      const req = new Request("http://localhost/api/webhooks/inbound/test-token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "Test Title", body: "Content" }),
      });

      await handleWebhookPost(req, {
        params: Promise.resolve({ token: "test-token-123456789012345678901234567890" }),
      });

      const createCall = (prisma.note.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.title).toBe("Test Title");
    });

    it("handles GET requests", async () => {
      (prisma.webhookEndpoint.findUnique as jest.Mock).mockResolvedValue(
        mockWebhookEndpoint,
      );
      (prisma.note.create as jest.Mock).mockResolvedValue({
        id: "note-1",
        userId: "user-1",
        tenantId: "tenant-1",
        title: "Webhook: 2025-01-01T00:00:00.000Z",
        content: "",
      });
      (prisma.webhookProcessingJob.create as jest.Mock).mockResolvedValue({
        id: "job-1",
      });

      const req = new Request("http://localhost/api/webhooks/inbound/test-token?param=value", {
        method: "GET",
      });

      const res = await handleWebhookGet(req, {
        params: Promise.resolve({ token: "test-token-123456789012345678901234567890" }),
      });

      expect(res.status).toBe(200);
    });
  });
});


