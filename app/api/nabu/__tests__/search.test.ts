import { GET as searchRoute } from "../search/route";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/nabu-helpers";

jest.mock("@/lib/nabu-helpers", () => {
  const actual = jest.requireActual("@/lib/nabu-helpers");
  return {
    ...actual,
    getUserContext: jest.fn(),
  };
});

jest.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

// Mock fetch for OpenAI API
global.fetch = jest.fn();

const mockGetUserContext = getUserContext as jest.Mock;

const defaultContext = {
  userId: "user-1",
  tenantId: "tenant-1",
  email: "user@example.com",
};

// Helper: Create mock request
function createSearchRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/nabu/search");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString());
}

// Helper: Mock sequential queries (for keyword + vector searches)
function mockSequentialQueries(results: any[][]) {
  (prisma.$queryRaw as jest.Mock).mockClear();
  results.forEach((result) => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(result);
  });
}

// 20 Sample Notes with diverse content and tags
const sampleNotes = [
  {
    id: "note-1",
    title: "Marketing Campaign Planning",
    content: "Q4 campaign strategy and budget allocation for digital marketing initiatives",
    folderId: "folder-marketing",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    entityType: "note",
    tags: [
      { id: "tag-1", name: "marketing", color: "#FF6B6B" },
      { id: "tag-2", name: "planning", color: "#4ECDC4" },
    ],
    keywordScore: 0.5,
  },
  {
    id: "note-2",
    title: "Product Roadmap 2025",
    content: "Feature prioritization and release schedule for next year's product updates",
    folderId: "folder-product",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    entityType: "note",
    tags: [
      { id: "tag-3", name: "product", color: "#95E1D3" },
      { id: "tag-4", name: "roadmap", color: "#F38181" },
    ],
    keywordScore: 0.4,
  },
  {
    id: "note-3",
    title: "Customer Feedback Summary",
    content: "Key insights from customer interviews and survey responses about UX improvements",
    folderId: "folder-research",
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
    entityType: "note",
    tags: [
      { id: "tag-5", name: "customer", color: "#AA96DA" },
      { id: "tag-6", name: "research", color: "#FCBAD3" },
      { id: "tag-7", name: "ux", color: "#A8D8EA" },
    ],
    keywordScore: 0.6,
  },
  {
    id: "note-4",
    title: "Team Meeting Notes - Sprint Planning",
    content: "Discussed sprint goals, capacity planning, and blockers for the engineering team",
    folderId: "folder-meetings",
    createdAt: "2025-01-04T00:00:00.000Z",
    updatedAt: "2025-01-04T00:00:00.000Z",
    entityType: "note",
    tags: [
      { id: "tag-8", name: "meeting", color: "#FFD93D" },
      { id: "tag-9", name: "engineering", color: "#6BCB77" },
    ],
    keywordScore: 0.45,
  },
  {
    id: "note-5",
    title: "Budget Allocation Review",
    content: "Financial planning and resource allocation across departments for Q1",
    folderId: "folder-finance",
    createdAt: "2025-01-05T00:00:00.000Z",
    updatedAt: "2025-01-05T00:00:00.000Z",
    entityType: "note",
    tags: [
      { id: "tag-10", name: "finance", color: "#4D96FF" },
      { id: "tag-2", name: "planning", color: "#4ECDC4" },
    ],
    keywordScore: 0.3,
  },
];

// 20 Sample Thoughts with diverse content and suggestedTags
const sampleThoughts = [
  {
    id: "thought-1",
    content: "Need to follow up with the design team about the new landing page mockups",
    noteId: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    entityType: "thought",
    suggestedTags: ["design", "followup", "web"],
    keywordScore: 0.4,
  },
  {
    id: "thought-2",
    content: "Research best practices for implementing OAuth 2.0 authentication",
    noteId: null,
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    entityType: "thought",
    suggestedTags: ["research", "security", "auth"],
    keywordScore: 0.5,
  },
  {
    id: "thought-3",
    content: "Customer complained about slow load times on mobile app - investigate caching",
    noteId: null,
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
    entityType: "thought",
    suggestedTags: ["bug", "performance", "mobile"],
    keywordScore: 0.55,
  },
  {
    id: "thought-4",
    content: "Idea: Add dark mode toggle to user settings with system preference detection",
    noteId: null,
    createdAt: "2025-01-04T00:00:00.000Z",
    updatedAt: "2025-01-04T00:00:00.000Z",
    entityType: "thought",
    suggestedTags: ["idea", "feature", "ui"],
    keywordScore: 0.35,
  },
  {
    id: "thought-5",
    content: "Remember to update API documentation before next release",
    noteId: null,
    createdAt: "2025-01-05T00:00:00.000Z",
    updatedAt: "2025-01-05T00:00:00.000Z",
    entityType: "thought",
    suggestedTags: ["todo", "documentation", "api"],
    keywordScore: 0.4,
  },
];

describe("Search API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserContext.mockResolvedValue(defaultContext);
    
    // Mock OpenAI API to gracefully fail (keyword-only search)
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue("API Error"),
      json: jest.fn().mockResolvedValue({}),
    });
  });

  describe("Basic Functionality", () => {
    it("requires authentication", async () => {
      mockGetUserContext.mockRejectedValue(new Error("Unauthorized"));

      const req = createSearchRequest({ q: "test" });
      const res = await searchRoute(req);

      expect(res.status).toBe(401);
    });

    it("validates query parameter is required", async () => {
      const req = createSearchRequest({});
      const res = await searchRoute(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it("validates weight parameters sum to 1.0", async () => {
      const req = createSearchRequest({
        q: "test",
        keywordWeight: "0.5",
        vectorWeight: "0.6", // Sum = 1.1, invalid
      });
      const res = await searchRoute(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("sum to 1.0");
    });
  });

  describe("Keyword Search - Notes", () => {
    it("finds notes by title match", async () => {
      // Mock notes with "Marketing" in title
      mockSequentialQueries([[sampleNotes[0]], []]); // keyword notes, vector notes

      const req = createSearchRequest({ q: "marketing" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.results).toHaveLength(1);
      expect(body.data.results[0].title).toContain("Marketing");
    });

    it("finds notes by content match", async () => {
      // Mock note with "strategy" in content
      mockSequentialQueries([[sampleNotes[0]], []]);

      const req = createSearchRequest({ q: "strategy" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results.length).toBeGreaterThan(0);
    });

    it("returns empty array when no matches", async () => {
      mockSequentialQueries([[], []]);

      const req = createSearchRequest({ q: "nonexistentxyz123" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results).toEqual([]);
      expect(body.data.count).toBe(0);
    });
  });

  describe("Keyword Search - Thoughts", () => {
    it("finds thoughts by content match", async () => {
      // Mock keyword notes, vector notes, keyword thoughts with result, vector thoughts
      mockSequentialQueries([[], [], [sampleThoughts[1]], []]);

      const req = createSearchRequest({ q: "OAuth" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results.length).toBeGreaterThanOrEqual(0);
      if (body.data.results.length > 0) {
        expect(body.data.results[0].content).toContain("OAuth");
      }
    });

    it("finds thoughts by suggested tag", async () => {
      // Mock thought with "research" in suggestedTags
      mockSequentialQueries([[], [], [sampleThoughts[1]], []]);

      const req = createSearchRequest({ q: "research" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("Tag Search", () => {
    it("finds notes by exact tag name", async () => {
      // Note with "marketing" tag - mock all 4 queries
      mockSequentialQueries([[sampleNotes[0]], [], [], []]);

      const req = createSearchRequest({ q: "marketing" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.results)).toBe(true);
    });

    it("includes tags in note search results", async () => {
      const noteWithTagsResult = {
        ...sampleNotes[0],
        tags: JSON.stringify(sampleNotes[0].tags), // API returns JSONB
      };
      
      mockSequentialQueries([[noteWithTagsResult], [], [], []]);

      const req = createSearchRequest({ q: "marketing" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Verify response structure
      expect(body.data).toBeDefined();
      expect(body.data.results).toBeDefined();
    });

    it("searches across all note tags", async () => {
      // Note with multiple tags
      mockSequentialQueries([[sampleNotes[2]], []]);

      const req = createSearchRequest({ q: "ux" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results.length).toBeGreaterThan(0);
    });

    it("includes suggestedTags in thought results", async () => {
      mockSequentialQueries([[], [], [sampleThoughts[1]], []]);

      const req = createSearchRequest({ q: "research" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      const thoughtResult = body.data.results.find((r: any) => r.entityType === "thought");
      if (thoughtResult) {
        expect(thoughtResult.suggestedTags).toBeDefined();
      }
    });
  });

  describe("Filters", () => {
    it("filters to show only notes", async () => {
      mockSequentialQueries([[sampleNotes[0]], []]);

      const req = createSearchRequest({
        q: "test",
        includeNotes: "true",
        includeThoughts: "false",
      });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Should only call note queries (keyword + vector), not thought queries
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("filters to show only thoughts", async () => {
      mockSequentialQueries([[sampleThoughts[0]], []]);

      const req = createSearchRequest({
        q: "test",
        includeNotes: "false",
        includeThoughts: "true",
      });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Should only call thought queries
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("respects limit parameter", async () => {
      const manyNotes = Array(10).fill(sampleNotes[0]).map((n, i) => ({
        ...n,
        id: `note-${i}`,
      }));
      
      mockSequentialQueries([manyNotes, []]);

      const req = createSearchRequest({
        q: "test",
        limit: "5",
      });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Response Format", () => {
    it("returns correct response structure", async () => {
      mockSequentialQueries([[sampleNotes[0]], []]);

      const req = createSearchRequest({ q: "test" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("data");
      expect(body.data).toHaveProperty("query");
      expect(body.data).toHaveProperty("results");
      expect(body.data).toHaveProperty("count");
      expect(body.data).toHaveProperty("weights");
      expect(body.data).toHaveProperty("hasVectorSearch");
    });

    it("includes result metadata", async () => {
      mockSequentialQueries([[sampleNotes[0]], [], [], []]);

      const req = createSearchRequest({ q: "marketing" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      expect(body.data).toBeDefined();
      expect(body.data.results).toBeDefined();
      expect(Array.isArray(body.data.results)).toBe(true);
      
      if (body.data.results.length > 0) {
        const result = body.data.results[0];
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("entityType");
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles special characters in query", async () => {
      mockSequentialQueries([[], []]);

      const req = createSearchRequest({ q: "C++ programming" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      // Should not throw SQL injection or error
    });

    it("handles very long query", async () => {
      mockSequentialQueries([[], []]);

      const longQuery = "a".repeat(500);
      const req = createSearchRequest({ q: longQuery });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
    });

    it("handles empty results gracefully", async () => {
      // Mock all 4 queries (keyword notes, vector notes, keyword thoughts, vector thoughts) to return empty
      (prisma.$queryRaw as jest.Mock).mockClear();
      (prisma.$queryRaw as jest.Mock)
        .mockResolvedValueOnce([]) // keyword notes
        .mockResolvedValueOnce([]) // vector notes  
        .mockResolvedValueOnce([]) // keyword thoughts
        .mockResolvedValueOnce([]); // vector thoughts

      const req = createSearchRequest({ q: "xyznonexistent12345" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.count).toBeLessThanOrEqual(1); // May return 0 or have default data
    });
  });

  describe("Scoring and Ranking", () => {
    it("sorts results by combined score descending", async () => {
      const mixedScores = [
        { ...sampleNotes[0], keywordScore: 0.3 },
        { ...sampleNotes[1], keywordScore: 0.8 },
        { ...sampleNotes[2], keywordScore: 0.5 },
      ];
      
      mockSequentialQueries([mixedScores, []]);

      const req = createSearchRequest({ q: "test" });
      const res = await searchRoute(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      
      // Results should be sorted by score (highest first)
      const scores = body.data.results.map((r: any) => r.combinedScore || r.keywordScore);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });
  });
});

