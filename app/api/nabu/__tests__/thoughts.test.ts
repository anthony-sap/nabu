import { GET as listThoughts, POST as createThought } from "../thoughts/route";
import {
  GET as getThought,
  PATCH as updateThought,
  DELETE as deleteThought,
} from "../thoughts/[id]/route";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  validateOwnership,
} from "@/lib/nabu-helpers";
import { ThoughtSource, ThoughtState } from "@prisma/client";

jest.mock("@/lib/nabu-helpers", () => {
  const actual = jest.requireActual("@/lib/nabu-helpers");
  return {
    ...actual,
    getUserContext: jest.fn(),
    validateOwnership: jest.fn(),
  };
});

jest.mock("@/lib/db", () => ({
  prisma: {
    thought: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    note: {
      findFirst: jest.fn(),
    },
  },
}));

const mockGetUserContext = getUserContext as jest.Mock;
const mockValidateOwnership = validateOwnership as jest.Mock;

const defaultContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "user@example.com",
};

const baseThought = {
  id: "thought-1",
  tenantId: defaultContext.tenantId,
  userId: defaultContext.userId,
  noteId: null,
  content: "Initial idea",
  contentState: "{\"root\":{}}",
  source: ThoughtSource.WEB,
  state: ThoughtState.NEW,
  suggestedTags: ["idea"],
  meta: { url: "https://example.com" },
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  deletedAt: null,
  note: null,
  _count: {
    attachments: 0,
  },
};

describe("Thoughts API Routes", () => {
  const validNoteId = "cknote000000000000000000000";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserContext.mockResolvedValue(defaultContext);
    mockValidateOwnership.mockResolvedValue(true);
  });

  describe("GET /api/nabu/thoughts", () => {
    it("returns paginated thoughts", async () => {
      (prisma.thought.findMany as jest.Mock).mockResolvedValue([baseThought]);
      (prisma.thought.count as jest.Mock).mockResolvedValue(1);

      const res = await listThoughts(
        new Request("http://localhost/api/nabu/thoughts?page=1&limit=5"),
      );

      expect(prisma.thought.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 5,
          where: expect.objectContaining({
            userId: defaultContext.userId,
            tenantId: defaultContext.tenantId,
          }),
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.thoughts).toHaveLength(1);
    });

    it("validates query params", async () => {
      const res = await listThoughts(
        new Request("http://localhost/api/nabu/thoughts?page=zero"),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/nabu/thoughts", () => {
    it("validates payload", async () => {
      const res = await createThought(
        new Request("http://localhost/api/nabu/thoughts", {
          method: "POST",
          body: JSON.stringify({ content: "" }),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("ensures linked note exists", async () => {
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await createThought(
        new Request("http://localhost/api/nabu/thoughts", {
          method: "POST",
          body: JSON.stringify({
            content: "Idea",
            source: ThoughtSource.WEB,
            noteId: validNoteId,
          }),
        }),
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Note not found");
    });

    it("creates thought successfully", async () => {
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.thought.create as jest.Mock).mockResolvedValueOnce(baseThought);

      const res = await createThought(
        new Request("http://localhost/api/nabu/thoughts", {
          method: "POST",
          body: JSON.stringify({
            content: "Idea",
            contentState: "{\"root\":{}}",
            source: ThoughtSource.WEB,
          }),
        }),
      );

      expect(prisma.thought.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: "Idea",
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
        }),
        include: {
          note: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              attachments: true,
            },
          },
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.message).toBe("Thought created successfully");
    });
  });

  describe("GET /api/nabu/thoughts/[id]", () => {
    it("returns 404 when not found", async () => {
      (prisma.thought.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await getThought(
        new Request("http://localhost/api/nabu/thoughts/thought-unknown"),
        { params: { id: "thought-unknown" } },
      );

      expect(res.status).toBe(404);
    });

    it("returns thought with attachments", async () => {
      (prisma.thought.findFirst as jest.Mock).mockResolvedValueOnce({
        ...baseThought,
        attachments: [],
      });

      const res = await getThought(
        new Request("http://localhost/api/nabu/thoughts/thought-1"),
        { params: { id: "thought-1" } },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe("thought-1");
      expect(body.data.attachments).toEqual([]);
    });
  });

  describe("PATCH /api/nabu/thoughts/[id]", () => {
    it("requires ownership", async () => {
      mockValidateOwnership.mockResolvedValueOnce(false);

      const res = await updateThought(
        new Request("http://localhost/api/nabu/thoughts/thought-1", {
          method: "PATCH",
          body: JSON.stringify({ state: ThoughtState.PROMOTED }),
        }),
        { params: { id: "thought-1" } },
      );

      expect(res.status).toBe(404);
    });

    it("validates note when promoting", async () => {
      // Mock finding the existing thought first
      (prisma.thought.findFirst as jest.Mock).mockResolvedValueOnce(baseThought);
      // Mock note not found
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await updateThought(
        new Request("http://localhost/api/nabu/thoughts/thought-1", {
          method: "PATCH",
          body: JSON.stringify({ noteId: validNoteId }),
        }),
        { params: { id: "thought-1" } },
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Note not found");
    });

    it("updates thought successfully", async () => {
      // Mock finding the existing thought
      (prisma.thought.findFirst as jest.Mock).mockResolvedValueOnce(baseThought);
      // Mock the update
      (prisma.thought.update as jest.Mock).mockResolvedValueOnce(baseThought);

      const res = await updateThought(
        new Request("http://localhost/api/nabu/thoughts/thought-1", {
          method: "PATCH",
          body: JSON.stringify({ state: ThoughtState.ENRICHED }),
        }),
        { params: { id: "thought-1" } },
      );

      expect(prisma.thought.update).toHaveBeenCalledWith({
        where: { id: "thought-1" },
        data: expect.objectContaining({
          state: ThoughtState.ENRICHED,
        }),
        include: {
          note: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              attachments: true,
            },
          },
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Thought updated successfully");
    });
  });

  describe("DELETE /api/nabu/thoughts/[id]", () => {
    it("requires ownership", async () => {
      // Reset and override mock for this test
      mockValidateOwnership.mockReset();
      mockValidateOwnership.mockResolvedValueOnce(false);

      const res = await deleteThought(
        new Request("http://localhost/api/nabu/thoughts/thought-1", {
          method: "DELETE",
        }),
        { params: { id: "thought-1" } },
      );

      expect(res.status).toBe(404);
    });

    it("soft deletes thought", async () => {
      // Reset mocks and set up for this test
      mockGetUserContext.mockReset();
      mockValidateOwnership.mockReset();
      mockGetUserContext.mockResolvedValue(defaultContext);
      mockValidateOwnership.mockResolvedValue(true);
      (prisma.thought.update as jest.Mock).mockResolvedValueOnce({});

      const res = await deleteThought(
        new Request("http://localhost/api/nabu/thoughts/thought-1", {
          method: "DELETE",
        }),
        { params: { id: "thought-1" } },
      );

      // Check response first - helps debug if something failed early
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Thought deleted successfully");
      
      // Verify the update was called with correct params
      expect(prisma.thought.update).toHaveBeenCalledWith({
        where: { id: "thought-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });
    });
  });
});

