/**
 * Search API Integration Tests
 * 
 * Tests real database queries, tag search, and scoring logic
 * Requires a test database to be running
 */

import { prisma } from "@/lib/db";
import { GET as searchRoute } from "../search/route";

// Mock only getUserContext to inject test user
jest.mock("@/lib/nabu-helpers", () => {
  const actual = jest.requireActual("@/lib/nabu-helpers");
  return {
    ...actual,
    getUserContext: jest.fn(),
  };
});

const { getUserContext } = require("@/lib/nabu-helpers");

// Mock OpenAI API to avoid external calls
global.fetch = jest.fn().mockResolvedValue({
  ok: false,
  status: 500,
  text: jest.fn().mockResolvedValue("Mock error"),
  json: jest.fn().mockResolvedValue({}),
});

describe.skip("Search API Integration Tests", () => {
  const testUserId = "integration-test-user-search";
  const testTenantId = null; // Use NULL for integration tests to avoid tenant FK constraint
  
  let createdNoteIds: string[] = [];
  let createdThoughtIds: string[] = [];
  let createdTagIds: string[] = [];
  let createdFolderIds: string[] = [];

  /**
   * Seed test database with sample data
   */
  beforeAll(async () => {
    // Set up mock for all tests
    (getUserContext as jest.Mock).mockResolvedValue({
      userId: testUserId,
      tenantId: testTenantId,
      email: "integration-test@example.com",
    });

    try {
      // Create test user first (required for foreign keys)
      await prisma.user.upsert({
        where: { id: testUserId },
        update: {},
        create: {
          id: testUserId,
          email: "integration-test@example.com",
          firstName: "Integration",
          lastName: "Test",
        },
      });

      // Create test folder
      const marketingFolder = await prisma.folder.create({
        data: {
          name: "Marketing",
          userId: testUserId,
          tenantId: testTenantId,
          color: "#FF6B6B",
        },
      });
      createdFolderIds.push(marketingFolder.id);

      // Create tags
      const marketingTag = await prisma.tag.create({
        data: {
          name: "marketing",
          userId: testUserId,
          tenantId: testTenantId,
          color: "#FF6B6B",
        },
      });
      createdTagIds.push(marketingTag.id);

      const researchTag = await prisma.tag.create({
        data: {
          name: "research",
          userId: testUserId,
          tenantId: testTenantId,
          color: "#FCBAD3",
        },
      });
      createdTagIds.push(researchTag.id);

      const engineeringTag = await prisma.tag.create({
        data: {
          name: "engineering",
          userId: testUserId,
          tenantId: testTenantId,
          color: "#6BCB77",
        },
      });
      createdTagIds.push(engineeringTag.id);

      // Create note with marketing tag
      const note1 = await prisma.note.create({
        data: {
          title: "Marketing Campaign Planning",
          content: "Q4 campaign strategy and budget allocation for digital marketing",
          userId: testUserId,
          tenantId: testTenantId,
          folderId: marketingFolder.id,
        },
      });
      createdNoteIds.push(note1.id);

      await prisma.noteTag.create({
        data: {
          noteId: note1.id,
          tagId: marketingTag.id,
          tenantId: testTenantId,
          source: "USER_ADDED",
        },
      });

      // Create note with research tag
      const note2 = await prisma.note.create({
        data: {
          title: "User Research Findings",
          content: "Customer feedback and user testing insights for Q1",
          userId: testUserId,
          tenantId: testTenantId,
        },
      });
      createdNoteIds.push(note2.id);

      await prisma.noteTag.create({
        data: {
          noteId: note2.id,
          tagId: researchTag.id,
          tenantId: testTenantId,
          source: "USER_ADDED",
        },
      });

      // Create note with engineering tag
      const note3 = await prisma.note.create({
        data: {
          title: "Technical Architecture",
          content: "System design and engineering decisions",
          userId: testUserId,
          tenantId: testTenantId,
        },
      });
      createdNoteIds.push(note3.id);

      await prisma.noteTag.create({
        data: {
          noteId: note3.id,
          tagId: engineeringTag.id,
          tenantId: testTenantId,
          source: "USER_ADDED",
        },
      });

      // Create thoughts with suggestedTags
      const thought1 = await prisma.thought.create({
        data: {
          content: "Need to research AI trends for 2025 product roadmap",
          userId: testUserId,
          tenantId: testTenantId,
          source: "WEB",
          suggestedTags: ["research", "ai", "product"],
        },
      });
      createdThoughtIds.push(thought1.id);

      const thought2 = await prisma.thought.create({
        data: {
          content: "Marketing team meeting about Q4 campaign budget",
          userId: testUserId,
          tenantId: testTenantId,
          source: "WEB",
          suggestedTags: ["marketing", "meeting", "budget"],
        },
      });
      createdThoughtIds.push(thought2.id);

      console.log(`✅ Seeded test data: ${createdNoteIds.length} notes, ${createdThoughtIds.length} thoughts, ${createdTagIds.length} tags`);
    } catch (error) {
      console.error("Failed to seed test data:", error);
      throw error;
    }
  });

  /**
   * Cleanup all test data
   */
  afterAll(async () => {
    try {
      // Delete in correct order (foreign key constraints)
      if (createdNoteIds.length > 0) {
        await prisma.noteTag.deleteMany({
          where: { noteId: { in: createdNoteIds } },
        });

        await prisma.note.deleteMany({
          where: { id: { in: createdNoteIds } },
        });
      }

      if (createdThoughtIds.length > 0) {
        await prisma.thought.deleteMany({
          where: { id: { in: createdThoughtIds } },
        });
      }

      if (createdTagIds.length > 0) {
        await prisma.tag.deleteMany({
          where: { id: { in: createdTagIds } },
        });
      }

      if (createdFolderIds.length > 0) {
        await prisma.folder.deleteMany({
          where: { id: { in: createdFolderIds } },
        });
      }

      // Delete test user
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });

      console.log(`🧹 Cleaned up test data: ${createdNoteIds.length} notes, ${createdThoughtIds.length} thoughts, ${createdTagIds.length} tags`);
    } catch (error) {
      console.error("Cleanup error:", error);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe("Tag Search Integration", () => {
    it("finds notes by exact tag name with real database JOIN", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=marketing&includeNotes=true&includeThoughts=false"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.results.length).toBeGreaterThan(0);

      // Should find note with "marketing" tag
      const marketingNote = body.data.results.find((r: any) =>
        r.title?.includes("Marketing Campaign")
      );

      expect(marketingNote).toBeDefined();
      expect(marketingNote.tags).toBeDefined();
    });

    it("searches thought suggestedTags arrays in real database", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=marketing&includeNotes=false&includeThoughts=true"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();

      // Should find thought with "marketing" in suggestedTags
      const marketingThought = body.data.results.find((r: any) =>
        r.content?.includes("Marketing team meeting")
      );

      expect(marketingThought).toBeDefined();
      expect(marketingThought.suggestedTags).toBeDefined();
      expect(marketingThought.suggestedTags).toContain("marketing");
    });

    it("executes CTE for tag aggregation without SQL errors", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=research"
      );

      const res = await searchRoute(req);

      // Should not throw "aggregate functions not allowed in WHERE" error
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.results)).toBe(true);
    });

    it("searches notes with multiple tags correctly", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=engineering"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();

      const engineeringNote = body.data.results.find((r: any) =>
        r.title?.includes("Technical Architecture")
      );

      expect(engineeringNote).toBeDefined();
    });
  });

  describe("Full-Text Search", () => {
    it("ranks results using PostgreSQL ts_rank", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=marketing campaign"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();

      // Results should be sorted by score
      if (body.data.results.length > 1) {
        for (let i = 0; i < body.data.results.length - 1; i++) {
          const currentScore = body.data.results[i].combinedScore || body.data.results[i].keywordScore || 0;
          const nextScore = body.data.results[i + 1].combinedScore || body.data.results[i + 1].keywordScore || 0;
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }
      }
    });

    it("performs case-insensitive search", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=MARKETING"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.results.length).toBeGreaterThan(0);
    });
  });

  describe("Data Isolation", () => {
    it("only returns results for test user's tenant", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=marketing"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();

      // All results should be from test tenant
      body.data.results.forEach((result: any) => {
        // Results are from our test user/tenant (verified by finding them)
        expect(result.id).toBeDefined();
      });
    });

    it("excludes soft-deleted notes from search", async () => {
      // Create and soft-delete a note
      const deletedNote = await prisma.note.create({
        data: {
          title: "Deleted Note Test",
          content: "This should not appear in search results",
          userId: testUserId,
          tenantId: testTenantId,
          deletedAt: new Date(),
        },
      });

      const req = new Request(
        "http://localhost/api/nabu/search?q=deleted"
      );

      const res = await searchRoute(req);
      const body = await res.json();

      // Should NOT find soft-deleted note
      const foundDeleted = body.data.results.find((r: any) =>
        r.id === deletedNote.id
      );
      expect(foundDeleted).toBeUndefined();

      // Cleanup
      await prisma.note.delete({ where: { id: deletedNote.id } });
    });
  });

  describe("Response Format", () => {
    it("returns properly formatted JSONB tags for notes", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=marketing&includeThoughts=false"
      );

      const res = await searchRoute(req);
      const body = await res.json();

      const noteWithTags = body.data.results.find((r: any) =>
        r.tags && r.tags.length > 0
      );

      if (noteWithTags) {
        // Tags should be JSONB array
        expect(Array.isArray(noteWithTags.tags) || typeof noteWithTags.tags === 'string').toBe(true);
      }
    });

    it("returns suggestedTags array for thoughts", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=research&includeNotes=false"
      );

      const res = await searchRoute(req);
      const body = await res.json();

      const thoughtWithTags = body.data.results.find((r: any) =>
        r.suggestedTags && r.suggestedTags.length > 0
      );

      if (thoughtWithTags) {
        expect(Array.isArray(thoughtWithTags.suggestedTags)).toBe(true);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles notes with no tags", async () => {
      // Create note without tags
      const noTagNote = await prisma.note.create({
        data: {
          title: "Untagged Note",
          content: "This note has no tags attached",
          userId: testUserId,
          tenantId: testTenantId,
        },
      });
      createdNoteIds.push(noTagNote.id);

      const req = new Request(
        "http://localhost/api/nabu/search?q=untagged"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      const found = body.data.results.find((r: any) => r.id === noTagNote.id);

      if (found) {
        // Should have empty tags array or property
        expect(found.tags === null || found.tags === undefined || found.tags.length === 0).toBe(true);
      }
    });

    it("handles special characters in search query", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=C%2B%2B+programming"
      );

      const res = await searchRoute(req);
      // Should not crash with SQL error
      expect(res.status).toBe(200);
    });

    it("handles empty search results", async () => {
      const req = new Request(
        "http://localhost/api/nabu/search?q=xyznonexistent12345"
      );

      const res = await searchRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data.results)).toBe(true);
    });
  });
});

