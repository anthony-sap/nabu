import { GET as listNotes, POST as createNote } from "../notes/route";
import {
  GET as getNote,
  PATCH as updateNote,
  DELETE as deleteNote,
} from "../notes/[id]/route";
import { prisma } from "@/lib/db";
import {
  getUserContext,
  validateOwnership,
} from "@/lib/nabu-helpers";
import { NoteVisibility } from "@prisma/client";

jest.mock("@/lib/nabu-helpers", () => {
  const actual = jest.requireActual("@/lib/nabu-helpers");
  return {
    ...actual,
    getUserContext: jest.fn(),
    validateOwnership: jest.fn(),
  };
});

jest.mock("@/lib/db", () => {
  const noteMock = {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  };

  return {
    prisma: {
      note: noteMock,
      folder: {
        findFirst: jest.fn(),
      },
      tag: {
        findMany: jest.fn(),
      },
      noteTag: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) =>
        cb({
          note: noteMock,
          noteTag: {
            createMany: jest.fn(),
            deleteMany: jest.fn(),
          },
        }),
      ),
    },
  };
});

const mockGetUserContext = getUserContext as jest.Mock;
const mockValidateOwnership = validateOwnership as jest.Mock;

const defaultContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "user@example.com",
};

const baseNote = {
  id: "note-1",
  tenantId: defaultContext.tenantId,
  userId: defaultContext.userId,
  folderId: null,
  title: "Meeting notes",
  content: "Summary of the meeting",
  contentState: "{\"root\":{\"children\":[]}}",
  sourceThoughts: [],
  summary: null,
  visibility: NoteVisibility.PRIVATE,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  deletedAt: null,
  folder: null,
  noteTags: [],
  _count: {
    noteTags: 0,
    attachments: 0,
    thoughts: 0,
  },
};

describe("Notes API Routes", () => {
  const validFolderId = "ckfolder0000000000000000000";
  const validTagId = "cktag000000000000000000000";
  const missingTagId = "ckmissing00000000000000000";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserContext.mockResolvedValue(defaultContext);
    mockValidateOwnership.mockResolvedValue(true);
  });

  describe("GET /api/nabu/notes", () => {
    it("lists notes with pagination", async () => {
      (prisma.note.findMany as jest.Mock).mockResolvedValue([baseNote]);
      (prisma.note.count as jest.Mock).mockResolvedValue(1);

      const res = await listNotes(
        new Request("http://localhost/api/nabu/notes?page=1&limit=10"),
      );

      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: expect.objectContaining({
            userId: defaultContext.userId,
            tenantId: defaultContext.tenantId,
            deletedAt: null,
          }),
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.notes).toHaveLength(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it("applies search filter", async () => {
      (prisma.note.findMany as jest.Mock).mockResolvedValue([baseNote]);
      (prisma.note.count as jest.Mock).mockResolvedValue(1);

      await listNotes(
        new Request("http://localhost/api/nabu/notes?search=meeting"),
      );

      expect(prisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it("returns 400 for invalid query params", async () => {
      const res = await listNotes(
        new Request("http://localhost/api/nabu/notes?page=zero"),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/nabu/notes", () => {
    it("validates payload", async () => {
      const res = await createNote(
        new Request("http://localhost/api/nabu/notes", {
          method: "POST",
          body: JSON.stringify({ title: "" }),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("requires folder to belong to user", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await createNote(
        new Request("http://localhost/api/nabu/notes", {
          method: "POST",
          body: JSON.stringify({
            title: "Note",
            content: "Content",
            folderId: validFolderId,
          }),
        }),
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Folder not found");
    });

    it("requires tags to exist", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.tag.findMany as jest.Mock).mockResolvedValueOnce([
        { id: validTagId },
      ]);

      const res = await createNote(
        new Request("http://localhost/api/nabu/notes", {
          method: "POST",
          body: JSON.stringify({
            title: "Note",
            content: "Content",
            tagIds: [validTagId, missingTagId],
          }),
        }),
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("One or more tags not found");
    });

    it("creates note successfully", async () => {
      (prisma.folder.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.tag.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.note.create as jest.Mock).mockResolvedValue(baseNote);
      (prisma.note.findUnique as jest.Mock).mockResolvedValue(baseNote);
      (prisma.noteTag.createMany as jest.Mock).mockResolvedValue(undefined);

      const res = await createNote(
        new Request("http://localhost/api/nabu/notes", {
          method: "POST",
          body: JSON.stringify({
            title: "Note",
            content: "Content",
            contentState: "{\"root\":{}}",
            tagIds: [],
          }),
        }),
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.message).toBe("Note created successfully");
    });
  });

  describe("GET /api/nabu/notes/[id]", () => {
    it("returns 404 when note not found", async () => {
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const res = await getNote(
        new Request("http://localhost/api/nabu/notes/note-unknown"),
        { params: { id: "note-unknown" } },
      );

      expect(res.status).toBe(404);
    });

    it("returns note with relations", async () => {
      (prisma.note.findFirst as jest.Mock).mockResolvedValueOnce({
        ...baseNote,
        attachments: [],
        outgoingLinks: [],
        incomingLinks: [],
      });

      const res = await getNote(
        new Request("http://localhost/api/nabu/notes/note-1"),
        { params: { id: "note-1" } },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.id).toBe("note-1");
      expect(body.data.attachments).toEqual([]);
    });
  });

  describe("PATCH /api/nabu/notes/[id]", () => {
    it("requires ownership", async () => {
      mockValidateOwnership.mockResolvedValueOnce(false);

      const res = await updateNote(
        new Request("http://localhost/api/nabu/notes/note-1", {
          method: "PATCH",
          body: JSON.stringify({ title: "Updated" }),
        }),
        { params: { id: "note-1" } },
      );

      expect(res.status).toBe(404);
    });

    it("validates tags on update", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.tag.findMany as jest.Mock).mockResolvedValueOnce([
        { id: validTagId },
      ]);

      const res = await updateNote(
        new Request("http://localhost/api/nabu/notes/note-1", {
          method: "PATCH",
          body: JSON.stringify({ tagIds: [validTagId, missingTagId] }),
        }),
        { params: { id: "note-1" } },
      );

      expect(res.status).toBe(404);
    });

    it("updates note successfully", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.tag.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.note.update as jest.Mock).mockResolvedValue(baseNote);
      (prisma.note.findUnique as jest.Mock).mockResolvedValue(baseNote);

      const res = await updateNote(
        new Request("http://localhost/api/nabu/notes/note-1", {
          method: "PATCH",
          body: JSON.stringify({ summary: "Updated summary", tagIds: [] }),
        }),
        { params: { id: "note-1" } },
      );

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-1" },
        data: expect.objectContaining({ summary: "Updated summary" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Note updated successfully");
    });
  });

  describe("DELETE /api/nabu/notes/[id]", () => {
    it("requires ownership", async () => {
      mockValidateOwnership.mockResolvedValueOnce(false);

      const res = await deleteNote(
        new Request("http://localhost/api/nabu/notes/note-1", {
          method: "DELETE",
        }),
        { params: { id: "note-1" } },
      );

      expect(res.status).toBe(404);
    });

    it("soft deletes note", async () => {
      mockValidateOwnership.mockResolvedValueOnce(true);
      (prisma.note.update as jest.Mock).mockResolvedValueOnce({});

      const res = await deleteNote(
        new Request("http://localhost/api/nabu/notes/note-1", {
          method: "DELETE",
        }),
        { params: { id: "note-1" } },
      );

      expect(prisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-1" },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toBe("Note deleted successfully");
    });
  });
});

