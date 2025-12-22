import { GET as listTags, POST as createTag } from "../tags/route";
import {
  GET as getTag,
  PATCH as updateTag,
  DELETE as deleteTag,
} from "../tags/[id]/route";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  validateOwnership,
} from "@/lib/nabu-helpers";
import { TagType } from "@prisma/client";

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
    tag: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
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

const baseTag = {
  id: "tag-1",
  tenantId: defaultContext.tenantId,
  userId: defaultContext.userId,
  name: "Research",
  color: "#00B3A6",
  type: TagType.TOPIC,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  deletedAt: null,
  _count: {
    noteTags: 2,
  },
};

describe("Tags API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserContext.mockResolvedValue(defaultContext);
    mockValidateOwnership.mockResolvedValue(true);
  });

  describe("GET /api/nabu/tags", () => {
    it("returns tags for the current user", async () => {
      (prisma.tag.findMany as jest.Mock).mockResolvedValue([baseTag]);

      const res = await listTags(new Request("http://localhost/api/nabu/tags"));

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
          deletedAt: null,
        },
        include: {
          _count: {
            select: {
              noteTags: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Research");
    });

    it("supports filtering by type", async () => {
      (prisma.tag.findMany as jest.Mock).mockResolvedValue([baseTag]);

      await listTags(
        new Request("http://localhost/api/nabu/tags?type=TOPIC"),
      );

      expect(prisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "TOPIC",
          }),
        }),
      );
    });

    it("returns 400 for invalid type filter", async () => {
      const res = await listTags(
        new Request("http://localhost/api/nabu/tags?type=INVALID"),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/nabu/tags", () => {
    it("validates payload", async () => {
      const res = await createTag(
        new Request("http://localhost/api/nabu/tags", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("prevents duplicate tag names", async () => {
      (prisma.tag.findFirst as jest.Mock).mockResolvedValueOnce(baseTag);

      const res = await createTag(
        new Request("http://localhost/api/nabu/tags", {
          method: "POST",
          body: JSON.stringify({ name: "Research" }),
        }),
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe("Tag with this name already exists");
    });

    it("creates tag successfully", async () => {
      (prisma.tag.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.tag.create as jest.Mock).mockResolvedValueOnce(baseTag);

      const res = await createTag(
        new Request("http://localhost/api/nabu/tags", {
          method: "POST",
          body: JSON.stringify({ name: "Research", color: "#00B3A6" }),
        }),
      );

      expect(prisma.tag.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Research",
          color: "#00B3A6",
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
        }),
        include: {
          _count: {
            select: {
              noteTags: true,
            },
          },
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.message).toBe("Tag created successfully");
    });
  });

  describe("GET /api/nabu/tags/[id]", () => {
    it("returns 404 when tag not found", async () => {
      (prisma.tag.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await getTag(
        new Request("http://localhost/api/nabu/tags/tag-unknown"),
        { params: { id: "tag-unknown" } },
      );

      expect(res.status).toBe(404);
    });

    it("returns tag details including notes", async () => {
      (prisma.tag.findFirst as jest.Mock).mockResolvedValueOnce({
        ...baseTag,
        noteTags: [
          {
            note: {
              id: "note-1",
              title: "Linked note",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      });

      const res = await getTag(
        new Request("http://localhost/api/nabu/tags/tag-1?includeNotes=true"),
        { params: { id: "tag-1" } },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.notes).toHaveLength(1);
    });
  });

  describe("PATCH /api/nabu/tags/[id]", () => {
    it("prevents duplicate names on update", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.tag.findFirst as jest.Mock).mockResolvedValueOnce(baseTag);

      const res = await updateTag(
        new Request("http://localhost/api/nabu/tags/tag-1", {
          method: "PATCH",
          body: JSON.stringify({ name: "Research" }),
        }),
        { params: { id: "tag-1" } },
      );

      expect(res.status).toBe(409);
    });

    it("updates tag successfully", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.tag.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.tag.update as jest.Mock).mockResolvedValueOnce(baseTag);

      const res = await updateTag(
        new Request("http://localhost/api/nabu/tags/tag-1", {
          method: "PATCH",
          body: JSON.stringify({ color: "#1E40AF" }),
        }),
        { params: { id: "tag-1" } },
      );

      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: expect.objectContaining({ color: "#1E40AF" }),
        include: {
          _count: {
            select: {
              noteTags: true,
            },
          },
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Tag updated successfully");
    });
  });

  describe("DELETE /api/nabu/tags/[id]", () => {
    it("requires ownership", async () => {
      mockValidateOwnership.mockResolvedValueOnce(false);

      const res = await deleteTag(
        new Request("http://localhost/api/nabu/tags/tag-1", {
          method: "DELETE",
        }),
        { params: { id: "tag-1" } },
      );

      expect(res.status).toBe(404);
    });

    it("soft deletes tag", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.tag.update as jest.Mock).mockResolvedValueOnce({});

      const res = await deleteTag(
        new Request("http://localhost/api/nabu/tags/tag-1", {
          method: "DELETE",
        }),
        { params: { id: "tag-1" } },
      );

      expect(prisma.tag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Tag deleted successfully");
    });
  });
});

