import { GET as listFolders, POST as createFolder } from "../folders/route";
import {
  GET as getFolderById,
  PATCH as updateFolder,
  DELETE as deleteFolder,
} from "../folders/[id]/route";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  validateOwnership,
  handleApiError,
} from "@/lib/nabu-helpers";

jest.mock("@/lib/nabu-helpers", () => {
  const actual = jest.requireActual("@/lib/nabu-helpers");
  return {
    ...actual,
    getUserContext: jest.fn(),
    validateOwnership: jest.fn(),
    handleApiError: jest.fn(actual.handleApiError),
  };
});

jest.mock("@/lib/db", () => ({
  prisma: {
    folder: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockGetUserContext = getUserContext as jest.Mock;
const mockValidateOwnership = validateOwnership as jest.Mock;
const mockHandleApiError = handleApiError as jest.Mock;

const defaultContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "user@example.com",
};

const baseFolder = {
  id: "folder-1",
  tenantId: defaultContext.tenantId,
  userId: defaultContext.userId,
  name: "Root",
  description: null,
  color: "#00B3A6",
  parentId: null,
  order: null,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  deletedAt: null,
  _count: {
    notes: 0,
    children: 0,
  },
};

describe("Folders API Routes", () => {
  const validCuid = "ckparent0000000000000000000";
  const childCuid = "ckchild0000000000000000000";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserContext.mockResolvedValue(defaultContext);
    mockValidateOwnership.mockResolvedValue(true);
  });

  describe("GET /api/nabu/folders", () => {
    it("returns folders for the current user", async () => {
      (prisma.folder.findMany as jest.Mock).mockResolvedValue([baseFolder]);

      const res = await listFolders(
        new Request("http://localhost/api/nabu/folders"),
      );

      expect(prisma.folder.findMany).toHaveBeenCalledWith({
        where: {
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
          deletedAt: null,
          parentId: null, // Updated: now filters for root folders by default
        },
        include: {
          _count: {
            select: {
              notes: true,
              children: true,
            },
          },
        },
        orderBy: [{ order: "asc" as const }, { name: "asc" as const }],
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe("Root");
    });

    it("validates query params and returns 400 for invalid parentId", async () => {
      const res = await listFolders(
        new Request(
          "http://localhost/api/nabu/folders?parentId=invalid-id&includeChildren=true",
        ),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Invalid query parameters");
    });

    it("includes children when requested", async () => {
      (prisma.folder.findMany as jest.Mock).mockResolvedValue([
        {
          ...baseFolder,
          children: [
            {
              ...baseFolder,
              id: "folder-2",
              name: "Child",
            },
          ],
        },
      ]);

      const res = await listFolders(
        new Request(
          "http://localhost/api/nabu/folders?includeChildren=true",
        ),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].children).toHaveLength(1);
    });

    it("includes notes when requested", async () => {
      const folderWithNotes = {
        ...baseFolder,
        notes: [
          {
            id: "note-1",
            title: "Test Note",
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
            updatedAt: new Date("2025-01-01T00:00:00.000Z"),
          },
        ],
      };
      (prisma.folder.findMany as jest.Mock).mockResolvedValue([folderWithNotes]);

      const res = await listFolders(
        new Request(
          "http://localhost/api/nabu/folders?includeNotes=true",
        ),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].notes).toHaveLength(1);
      expect(body.data[0].notes[0].title).toBe("Test Note");
      expect(body.data[0].notes[0].content).toBeUndefined(); // Content not included
    });

    it("filters by parentId when specified", async () => {
      const childFolder = {
        ...baseFolder,
        id: "folder-2",
        name: "Child",
        parentId: validCuid,
      };
      (prisma.folder.findMany as jest.Mock).mockResolvedValue([childFolder]);

      const res = await listFolders(
        new Request(
          `http://localhost/api/nabu/folders?parentId=${validCuid}`,
        ),
      );

      expect(prisma.folder.findMany).toHaveBeenCalledWith({
        where: {
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
          deletedAt: null,
          parentId: validCuid,
        },
        include: {
          _count: {
            select: {
              notes: true,
              children: true,
            },
          },
        },
        orderBy: [{ order: "asc" as const }, { name: "asc" as const }],
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data[0].parentId).toBe(validCuid);
    });

    it("delegates to handleApiError when an exception occurs", async () => {
      const error = new Error("Unexpected");
      (prisma.folder.findMany as jest.Mock).mockRejectedValue(error);
      mockHandleApiError.mockReturnValue(
        new Response(JSON.stringify({ success: false, error: "Unexpected" }), {
          status: 500,
        }),
      );

      const res = await listFolders(
        new Request("http://localhost/api/nabu/folders"),
      );

      expect(mockHandleApiError).toHaveBeenCalledWith(error);
      expect(res.status).toBe(500);
    });
  });

  describe("POST /api/nabu/folders", () => {
    it("validates payload and returns 400 for missing name", async () => {
      const res = await createFolder(
        new Request("http://localhost/api/nabu/folders", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it("returns 404 when parent folder does not exist", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await createFolder(
        new Request("http://localhost/api/nabu/folders", {
          method: "POST",
          body: JSON.stringify({
            name: "Child",
            parentId: validCuid,
          }),
        }),
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Parent folder not found");
    });

    it("creates folder successfully", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(baseFolder);
      (prisma.folder.create as jest.Mock).mockResolvedValue(baseFolder);

      const res = await createFolder(
        new Request("http://localhost/api/nabu/folders", {
          method: "POST",
          body: JSON.stringify({
            name: "Child",
            parentId: validCuid,
            color: "#00B3A6",
          }),
        }),
      );

      expect(prisma.folder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Child",
          parentId: validCuid,
          color: "#00B3A6",
          userId: defaultContext.userId,
          tenantId: defaultContext.tenantId,
        }),
        include: {
          _count: {
            select: {
              notes: true,
              children: true,
            },
          },
        },
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.message).toBe("Folder created successfully");
      expect(body.data.name).toBe("Root");
    });
  });

  describe("GET /api/nabu/folders/[id]", () => {
    it("returns 404 when folder not found", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await getFolderById(
        new Request("http://localhost/api/nabu/folders/folder-unknown"),
        { params: { id: "folder-unknown" } },
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Folder not found");
    });

    it("returns folder details", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(baseFolder);

      const res = await getFolderById(
        new Request("http://localhost/api/nabu/folders/folder-1"),
        { params: { id: baseFolder.id } },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe(baseFolder.id);
    });
  });

  describe("PATCH /api/nabu/folders/[id]", () => {
    it("prevents circular hierarchy", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);

      // First call to findFirst for parent validation
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(baseFolder);
      // getDescendantIds will call findMany
      (prisma.folder.findMany as jest.Mock)
        .mockResolvedValueOnce([{ id: childCuid }])
        .mockResolvedValueOnce([]);

      const res = await updateFolder(
        new Request("http://localhost/api/nabu/folders/folder-1", {
          method: "PATCH",
          body: JSON.stringify({ parentId: childCuid }),
        }),
        { params: { id: baseFolder.id } },
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Cannot create circular folder hierarchy");
    });

    it("updates folder successfully", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.folder.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.folder.update as jest.Mock).mockResolvedValueOnce(baseFolder);

      const res = await updateFolder(
        new Request("http://localhost/api/nabu/folders/folder-1", {
          method: "PATCH",
          body: JSON.stringify({ name: "Renamed" }),
        }),
        { params: { id: baseFolder.id } },
      );

      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: baseFolder.id },
        data: expect.objectContaining({ name: "Renamed" }),
        include: {
          _count: {
            select: {
              notes: true,
              children: true,
            },
          },
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Folder updated successfully");
    });
  });

  describe("DELETE /api/nabu/folders/[id]", () => {
    it("prevents deletion when notes exist", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce({
        ...baseFolder,
        _count: {
          notes: 2,
          children: 0,
        },
      });

      const res = await deleteFolder(
        new Request("http://localhost/api/nabu/folders/folder-1", {
          method: "DELETE",
        }),
        { params: { id: baseFolder.id } },
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe(
        "Cannot delete folder with notes. Move or delete notes first.",
      );
    });

    it("deletes folder successfully", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce({
        ...baseFolder,
        _count: { notes: 0, children: 0 },
      });

      (prisma.folder.update as jest.Mock).mockResolvedValueOnce({});

      const res = await deleteFolder(
        new Request("http://localhost/api/nabu/folders/folder-1", {
          method: "DELETE",
        }),
        { params: { id: baseFolder.id } },
      );

      expect(prisma.folder.update).toHaveBeenCalledWith({
        where: { id: baseFolder.id },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Folder deleted successfully");
    });
  });
});

