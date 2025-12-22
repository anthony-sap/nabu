# Search API Test Suite Plan

## Overview
Comprehensive unit tests for `/api/nabu/search` endpoint covering hybrid search (keyword + vector), tag search, filtering, and edge cases.

## Testing Framework
- **Jest** - Test runner (already configured)
- **Mocking**: Prisma client, getUserContext, OpenAI API
- **Pattern**: Follows existing test structure in `app/api/nabu/__tests__/`

## Test File Structure

**File:** `app/api/nabu/__tests__/search.test.ts`

```typescript
import { GET as searchRoute } from "../search/route";
import { prisma } from "@/lib/db";
import { getUserContext } from "@/lib/nabu-helpers";

jest.mock("@/lib/nabu-helpers");
jest.mock("@/lib/db");

// Mock fetch for OpenAI API
global.fetch = jest.fn();

describe("Search API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Keyword Search - Notes", () => {
    // ... tests
  });

  describe("Keyword Search - Thoughts", () => {
    // ... tests
  });

  describe("Tag Search", () => {
    // ... tests
  });

  describe("Vector Search", () => {
    // ... tests
  });

  describe("Hybrid Search (Keyword + Vector)", () => {
    // ... tests
  });

  describe("Filters", () => {
    // ... tests
  });

  describe("Edge Cases", () => {
    // ... tests
  });
});
```

## Test Scenarios

### 1. **Keyword Search - Notes**

#### Test: Basic keyword search in note title
```typescript
it("finds notes by title match", async () => {
  // Mock: Note with "Marketing" in title
  // Query: "marketing"
  // Expected: Note found with keywordScore > 0
});
```

#### Test: Keyword search in note content
```typescript
it("finds notes by content match", async () => {
  // Mock: Note with "project deadline" in content
  // Query: "deadline"
  // Expected: Note found
});
```

#### Test: Case-insensitive search
```typescript
it("performs case-insensitive search", async () => {
  // Query: "MEETING" vs "meeting"
  // Expected: Same results
});
```

#### Test: Multi-word search
```typescript
it("handles multi-word queries", async () => {
  // Query: "project update meeting"
  // Expected: Finds notes with any of these words
});
```

### 2. **Keyword Search - Thoughts**

#### Test: Find thoughts by content
```typescript
it("finds thoughts by content match", async () => {
  // Mock: Thought with specific content
  // Query: keyword from content
  // Expected: Thought found
});
```

#### Test: Thoughts with suggestedTags
```typescript
it("finds thoughts by suggested tag", async () => {
  // Mock: Thought with suggestedTags: ["idea", "brainstorm"]
  // Query: "idea"
  // Expected: Thought found with 2x boost
});
```

### 3. **Tag Search**

#### Test: Exact tag match for notes
```typescript
it("finds notes by exact tag name with 2x boost", async () => {
  // Mock: Note with tag "marketing"
  // Query: "marketing"
  // Expected: 
  //   - Note found
  //   - keywordScore boosted by 2.0
  //   - Tags included in response
});
```

#### Test: Partial tag match
```typescript
it("finds notes by partial tag match", async () => {
  // Mock: Note with tag "marketing-campaign"
  // Query: "marketing"
  // Expected: Note found (no 2x boost, but still matches)
});
```

#### Test: Tag search with multiple tags
```typescript
it("searches across all note tags", async () => {
  // Mock: Note with tags ["design", "frontend", "ui"]
  // Query: "frontend"
  // Expected: Note found
});
```

#### Test: Thought suggestedTags search
```typescript
it("finds thoughts by exact suggestedTag with boost", async () => {
  // Mock: Thought with suggestedTags: ["research", "ai"]
  // Query: "research"
  // Expected: 
  //   - Thought found
  //   - 2x score boost applied
  //   - suggestedTags in response
});
```

#### Test: Tags in results
```typescript
it("returns tags in note search results", async () => {
  // Mock: Note with tags
  // Query: any match
  // Expected: Response includes tags as JSONB array
});
```

### 4. **Vector Search (Semantic)**

#### Test: Vector search with embeddings
```typescript
it("performs vector search when embeddings available", async () => {
  // Mock: OpenAI API returns embedding
  // Mock: NoteChunk with embedding
  // Query: "artificial intelligence"
  // Expected: Semantically similar notes found
});
```

#### Test: Fallback when OpenAI fails
```typescript
it("falls back to keyword-only when embedding fails", async () => {
  // Mock: OpenAI API throws error
  // Expected: Still returns keyword results, no crash
});
```

#### Test: Vector score calculation
```typescript
it("calculates vector similarity score correctly", async () => {
  // Mock: Embedding with specific similarity
  // Expected: vectorScore = 1 - distance
});
```

### 5. **Hybrid Search (Keyword + Vector)**

#### Test: Combined scoring
```typescript
it("combines keyword and vector scores with weights", async () => {
  // Mock: Result from both keyword and vector
  // Weights: keyword=0.4, vector=0.6
  // Expected: combinedScore = (keyword * 0.4) + (vector * 0.6)
});
```

#### Test: Deduplication
```typescript
it("merges results when same item found in both searches", async () => {
  // Mock: Same note in keyword AND vector results
  // Expected: Single result with combined scores
});
```

#### Test: Custom weights
```typescript
it("respects custom search weights", async () => {
  // Query params: keywordWeight=0.7, vectorWeight=0.3
  // Expected: Weights applied correctly
});
```

#### Test: Weight validation
```typescript
it("validates weights sum to 1.0", async () => {
  // Query params: keywordWeight=0.5, vectorWeight=0.6
  // Expected: 400 error (sum = 1.1)
});
```

### 6. **Filters**

#### Test: Filter by type - notes only
```typescript
it("filters to show only notes", async () => {
  // Mock: Notes and thoughts available
  // Filter: includeNotes=true, includeThoughts=false
  // Expected: Only notes returned
});
```

#### Test: Filter by type - thoughts only
```typescript
it("filters to show only thoughts", async () => {
  // Filter: includeNotes=false, includeThoughts=true
  // Expected: Only thoughts returned
});
```

#### Test: Filter by folder
```typescript
it("filters notes by folderId", async () => {
  // Query param: folderId=folder-123
  // Expected: Only notes in that folder
});
```

#### Test: Combined filters
```typescript
it("applies multiple filters together", async () => {
  // Filters: folderId=X, includeThoughts=false
  // Expected: Only notes in folder X
});
```

### 7. **Pagination & Limits**

#### Test: Limit parameter
```typescript
it("respects limit parameter", async () => {
  // Query param: limit=5
  // Mock: 20 results available
  // Expected: Only 5 results returned
});
```

#### Test: Default limit
```typescript
it("uses default limit of 20", async () => {
  // Query param: no limit specified
  // Expected: limit=20 applied
});
```

### 8. **Scoring & Ranking**

#### Test: Results sorted by score
```typescript
it("sorts results by combined score descending", async () => {
  // Mock: Multiple results with different scores
  // Expected: Highest score first
});
```

#### Test: Tag exact match boost
```typescript
it("boosts exact tag matches to top of results", async () => {
  // Mock: 
  //   - Note A: "marketing project" (keyword match)
  //   - Note B: "some content" with tag "marketing" (tag match)
  // Query: "marketing"
  // Expected: Note B ranked higher (2x boost)
});
```

### 9. **Edge Cases**

#### Test: Empty query
```typescript
it("returns 400 for empty query", async () => {
  // Query: ""
  // Expected: 400 error, validation failure
});
```

#### Test: No results
```typescript
it("returns empty array when no matches", async () => {
  // Query: "xyznonexistent"
  // Expected: 200 status, empty results array
});
```

#### Test: Special characters
```typescript
it("handles special characters in query", async () => {
  // Query: "C++ programming"
  // Expected: No SQL injection, valid results
});
```

#### Test: Very long query
```typescript
it("handles very long search queries", async () => {
  // Query: 500 character string
  // Expected: Processes without error
});
```

#### Test: Unauthorized access
```typescript
it("requires authentication", async () => {
  // Mock: getUserContext throws error
  // Expected: 401/403 error
});
```

#### Test: Tenant isolation
```typescript
it("only returns results for user's tenant", async () => {
  // Mock: Notes in different tenants
  // Expected: Only user's tenant results
});
```

#### Test: Soft-deleted exclusion
```typescript
it("excludes soft-deleted notes and thoughts", async () => {
  // Mock: Mix of deleted and active items
  // Expected: Only active items (deletedAt=null)
});
```

### 10. **Tag-Specific Tests**

#### Test: Note with multiple tags
```typescript
it("searches all tags on a note", async () => {
  // Mock: Note with tags ["react", "typescript", "frontend"]
  // Query: "typescript"
  // Expected: Note found
});
```

#### Test: Tag with special characters
```typescript
it("handles tags with hyphens and underscores", async () => {
  // Mock: Tag "next-js" or "web_dev"
  // Query: "next-js"
  // Expected: Found correctly
});
```

#### Test: Tag case sensitivity
```typescript
it("performs case-insensitive tag matching", async () => {
  // Mock: Tag "JavaScript"
  // Query: "javascript"
  // Expected: Match found with 2x boost
});
```

#### Test: Empty tags
```typescript
it("handles notes/thoughts with no tags", async () => {
  // Mock: Note with empty tags array
  // Expected: No crash, normal search works
});
```

### 11. **Response Format**

#### Test: Response structure
```typescript
it("returns correct response structure", async () => {
  // Expected structure:
  // {
  //   success: true,
  //   data: {
  //     query: string,
  //     results: SearchResult[],
  //     count: number,
  //     weights: { keyword, vector },
  //     hasVectorSearch: boolean
  //   }
  // }
});
```

#### Test: Note result includes tags
```typescript
it("includes tags in note search results", async () => {
  // Mock: Note with tags
  // Expected: result.tags is array of {id, name, color}
});
```

#### Test: Thought result includes suggestedTags
```typescript
it("includes suggestedTags in thought results", async () => {
  // Mock: Thought with suggestedTags
  // Expected: result.suggestedTags in response
});
```

## Mock Data Setup

### 20 Sample Notes with Diverse Content & Tags

```typescript
const sampleNotes = [
  {
    id: "note-1",
    title: "Marketing Campaign Planning",
    content: "Q4 campaign strategy and budget allocation for digital marketing initiatives",
    tags: [
      { id: "tag-1", name: "marketing", color: "#FF6B6B" },
      { id: "tag-2", name: "planning", color: "#4ECDC4" },
    ],
    folderId: "folder-marketing",
  },
  {
    id: "note-2",
    title: "Product Roadmap 2025",
    content: "Feature prioritization and release schedule for next year's product updates",
    tags: [
      { id: "tag-3", name: "product", color: "#95E1D3" },
      { id: "tag-4", name: "roadmap", color: "#F38181" },
    ],
    folderId: "folder-product",
  },
  {
    id: "note-3",
    title: "Customer Feedback Summary",
    content: "Key insights from customer interviews and survey responses about UX improvements",
    tags: [
      { id: "tag-5", name: "customer", color: "#AA96DA" },
      { id: "tag-6", name: "research", color: "#FCBAD3" },
      { id: "tag-7", name: "ux", color: "#A8D8EA" },
    ],
    folderId: "folder-research",
  },
  {
    id: "note-4",
    title: "Team Meeting Notes - Sprint Planning",
    content: "Discussed sprint goals, capacity planning, and blockers for the engineering team",
    tags: [
      { id: "tag-8", name: "meeting", color: "#FFD93D" },
      { id: "tag-9", name: "engineering", color: "#6BCB77" },
    ],
    folderId: "folder-meetings",
  },
  {
    id: "note-5",
    title: "Budget Allocation Review",
    content: "Financial planning and resource allocation across departments for Q1",
    tags: [
      { id: "tag-10", name: "finance", color: "#4D96FF" },
      { id: "tag-2", name: "planning", color: "#4ECDC4" },
    ],
    folderId: "folder-finance",
  },
  {
    id: "note-6",
    title: "Design System Guidelines",
    content: "Component library standards, color palette, typography, and spacing rules",
    tags: [
      { id: "tag-11", name: "design", color: "#FF6B9D" },
      { id: "tag-12", name: "frontend", color: "#C44569" },
    ],
    folderId: "folder-design",
  },
  {
    id: "note-7",
    title: "API Integration Documentation",
    content: "REST API endpoints, authentication, rate limits, and example requests",
    tags: [
      { id: "tag-13", name: "api", color: "#FFA07A" },
      { id: "tag-14", name: "documentation", color: "#98D8C8" },
    ],
    folderId: "folder-tech",
  },
  {
    id: "note-8",
    title: "Competitor Analysis Report",
    content: "Market research on competitors' features, pricing, and positioning strategies",
    tags: [
      { id: "tag-6", name: "research", color: "#FCBAD3" },
      { id: "tag-1", name: "marketing", color: "#FF6B6B" },
    ],
    folderId: "folder-research",
  },
  {
    id: "note-9",
    title: "Onboarding Process Improvement",
    content: "Streamlining new hire onboarding with better documentation and mentorship",
    tags: [
      { id: "tag-15", name: "hr", color: "#B0E0E6" },
      { id: "tag-16", name: "process", color: "#DDA15E" },
    ],
    folderId: "folder-hr",
  },
  {
    id: "note-10",
    title: "Security Audit Findings",
    content: "Vulnerability assessment results and recommended security improvements",
    tags: [
      { id: "tag-17", name: "security", color: "#E63946" },
      { id: "tag-18", name: "audit", color: "#457B9D" },
    ],
    folderId: "folder-security",
  },
  {
    id: "note-11",
    title: "Content Strategy for Blog",
    content: "Editorial calendar, SEO keywords, and topic clusters for content marketing",
    tags: [
      { id: "tag-1", name: "marketing", color: "#FF6B6B" },
      { id: "tag-19", name: "content", color: "#F4A261" },
    ],
    folderId: "folder-marketing",
  },
  {
    id: "note-12",
    title: "Database Optimization Notes",
    content: "Query performance improvements, indexing strategy, and migration plan",
    tags: [
      { id: "tag-20", name: "database", color: "#2A9D8F" },
      { id: "tag-9", name: "engineering", color: "#6BCB77" },
    ],
    folderId: "folder-tech",
  },
  {
    id: "note-13",
    title: "User Research Insights",
    content: "Behavioral patterns, pain points, and feature requests from user testing sessions",
    tags: [
      { id: "tag-6", name: "research", color: "#FCBAD3" },
      { id: "tag-7", name: "ux", color: "#A8D8EA" },
      { id: "tag-5", name: "customer", color: "#AA96DA" },
    ],
    folderId: "folder-research",
  },
  {
    id: "note-14",
    title: "Sales Pipeline Review",
    content: "Q4 sales metrics, conversion rates, and deal stage analysis",
    tags: [
      { id: "tag-21", name: "sales", color: "#06D6A0" },
      { id: "tag-22", name: "metrics", color: "#EF476F" },
    ],
    folderId: "folder-sales",
  },
  {
    id: "note-15",
    title: "Mobile App Feature Specs",
    content: "iOS and Android feature requirements, user flows, and technical specifications",
    tags: [
      { id: "tag-3", name: "product", color: "#95E1D3" },
      { id: "tag-23", name: "mobile", color: "#118AB2" },
    ],
    folderId: "folder-product",
  },
  {
    id: "note-16",
    title: "Performance Metrics Dashboard",
    content: "KPI tracking, analytics setup, and reporting automation configuration",
    tags: [
      { id: "tag-22", name: "metrics", color: "#EF476F" },
      { id: "tag-24", name: "analytics", color: "#073B4C" },
    ],
    folderId: "folder-data",
  },
  {
    id: "note-17",
    title: "Partnership Proposal Draft",
    content: "Collaboration opportunities with strategic partners and revenue sharing models",
    tags: [
      { id: "tag-25", name: "partnerships", color: "#E76F51" },
      { id: "tag-26", name: "business", color: "#264653" },
    ],
    folderId: "folder-business",
  },
  {
    id: "note-18",
    title: "Testing Strategy",
    content: "Unit tests, integration tests, E2E testing framework and CI/CD pipeline setup",
    tags: [
      { id: "tag-27", name: "testing", color: "#2A9D8F" },
      { id: "tag-9", name: "engineering", color: "#6BCB77" },
    ],
    folderId: "folder-tech",
  },
  {
    id: "note-19",
    title: "Brand Guidelines Update",
    content: "Logo usage, color palette, typography, and voice/tone documentation",
    tags: [
      { id: "tag-11", name: "design", color: "#FF6B9D" },
      { id: "tag-28", name: "branding", color: "#C9ADA7" },
    ],
    folderId: "folder-design",
  },
  {
    id: "note-20",
    title: "Infrastructure Migration Plan",
    content: "Cloud migration strategy, timeline, and risk mitigation for AWS to GCP move",
    tags: [
      { id: "tag-29", name: "infrastructure", color: "#577590" },
      { id: "tag-30", name: "devops", color: "#43AA8B" },
    ],
    folderId: "folder-tech",
  },
];
```

### 20 Sample Thoughts with Diverse Content & SuggestedTags

```typescript
const sampleThoughts = [
  {
    id: "thought-1",
    content: "Need to follow up with the design team about the new landing page mockups",
    suggestedTags: ["design", "followup", "web"],
  },
  {
    id: "thought-2",
    content: "Research best practices for implementing OAuth 2.0 authentication",
    suggestedTags: ["research", "security", "auth"],
  },
  {
    id: "thought-3",
    content: "Customer complained about slow load times on mobile app - investigate caching",
    suggestedTags: ["bug", "performance", "mobile"],
  },
  {
    id: "thought-4",
    content: "Idea: Add dark mode toggle to user settings with system preference detection",
    suggestedTags: ["idea", "feature", "ui"],
  },
  {
    id: "thought-5",
    content: "Remember to update API documentation before next release",
    suggestedTags: ["todo", "documentation", "api"],
  },
  {
    id: "thought-6",
    content: "Meeting scheduled with investors next Tuesday at 2pm",
    suggestedTags: ["meeting", "business", "calendar"],
  },
  {
    id: "thought-7",
    content: "Explore AI-powered content recommendations for user dashboard",
    suggestedTags: ["ai", "idea", "product"],
  },
  {
    id: "thought-8",
    content: "Database queries running slow - need to add indexes on user_id and created_at",
    suggestedTags: ["performance", "database", "optimization"],
  },
  {
    id: "thought-9",
    content: "Competitor launched similar feature - analyze their approach",
    suggestedTags: ["research", "competitive", "analysis"],
  },
  {
    id: "thought-10",
    content: "User requested export to CSV functionality for reports",
    suggestedTags: ["feature-request", "export", "data"],
  },
  {
    id: "thought-11",
    content: "Review pull requests before end of day - focus on security changes",
    suggestedTags: ["todo", "code-review", "security"],
  },
  {
    id: "thought-12",
    content: "Marketing team needs analytics dashboard with real-time metrics",
    suggestedTags: ["marketing", "analytics", "dashboard"],
  },
  {
    id: "thought-13",
    content: "Brainstorm session: gamification features to improve user engagement",
    suggestedTags: ["brainstorm", "engagement", "gamification"],
  },
  {
    id: "thought-14",
    content: "Bug: Payment webhook failing intermittently - check logs",
    suggestedTags: ["bug", "payment", "urgent"],
  },
  {
    id: "thought-15",
    content: "Research serverless architecture for microservices migration",
    suggestedTags: ["research", "architecture", "cloud"],
  },
  {
    id: "thought-16",
    content: "Customer success team wants better onboarding flow metrics",
    suggestedTags: ["customer-success", "onboarding", "metrics"],
  },
  {
    id: "thought-17",
    content: "Plan team building event for next month - remote friendly activities",
    suggestedTags: ["team", "planning", "culture"],
  },
  {
    id: "thought-18",
    content: "Evaluate different email service providers for transactional emails",
    suggestedTags: ["research", "email", "infrastructure"],
  },
  {
    id: "thought-19",
    content: "Create tutorial video for new feature announcement next week",
    suggestedTags: ["content", "video", "marketing"],
  },
  {
    id: "thought-20",
    content: "Performance optimization: consider implementing Redis caching layer",
    suggestedTags: ["performance", "optimization", "caching"],
  },
];
```

### Mock OpenAI Embedding Response
```typescript
const mockEmbedding = {
  data: [{
    embedding: new Array(512).fill(0).map(() => Math.random()),
  }],
};
```

## Specific Test Scenarios Using Sample Data

### Scenario 1: Search for "marketing"
**Expected Results:**
- Note 1, 8, 11 (have "marketing" tag)
- Note 1, 11 get 2x boost (exact tag match)
- Thought 12, 19 (have "marketing" in suggestedTags)
- All sorted by combined score

### Scenario 2: Search for "research"  
**Expected Results:**
- Note 3, 8, 13 (have "research" tag)
- Note 3, 8, 13 get 2x boost
- Thought 2, 9, 15, 18 (have "research" in suggestedTags or content)
- Thoughts with "research" tag get 2x boost

### Scenario 3: Search for "engineering"
**Expected Results:**
- Note 4, 12, 18 (have "engineering" tag)
- 2x boost applied to all three
- Sorted by score

### Scenario 4: Search for "performance"
**Expected Results:**
- Thought 3, 8, 20 (have "performance" in tags or content)
- Mix of tag matches and content matches

### Scenario 5: Filter by folder
**Query:** "team" + folderId="folder-meetings"
**Expected Results:**
- Only Note 4 (in folder-meetings with "team" in content)
- Notes in other folders excluded

### Scenario 6: Partial tag match
**Query:** "market"
**Expected Results:**
- Notes with "marketing" tag (partial match, no 2x boost)
- Content containing "market" word

### Scenario 7: Multi-tag notes
**Query:** "ux"
**Expected Results:**
- Note 3, 13 (both have "ux" tag)
- Both get 2x boost

### Scenario 8: Empty results
**Query:** "nonexistentxyz123"
**Expected Results:**
- Empty array
- 200 status
- count: 0

## Test Utilities

### Helper: Create mock request
```typescript
function createSearchRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/nabu/search");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString());
}
```

### Helper: Mock $queryRaw
```typescript
function mockQueryRaw(results: any[]) {
  (prisma.$queryRaw as jest.Mock).mockResolvedValue(results);
}
```

### Helper: Mock sequential queries
```typescript
function mockSequentialQueries(results: any[][]) {
  results.forEach((result, index) => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce(result);
  });
}
```

## Coverage Goals

- ✅ All search paths (keyword, vector, hybrid)
- ✅ All entity types (notes, thoughts)
- ✅ Tag search functionality
- ✅ Score boosting logic
- ✅ Filter combinations
- ✅ Error handling
- ✅ Edge cases
- ✅ Response formatting

**Target:** 90%+ code coverage for search route

## Priority Test Order

1. **Basic keyword search** (notes & thoughts)
2. **Tag search with boost**
3. **Filter by type**
4. **Error handling**
5. **Vector search**
6. **Hybrid scoring**
7. **Edge cases**

## Notes

- Mock OpenAI API to avoid real API calls in tests
- Use deterministic embeddings for vector tests
- Test tenant isolation thoroughly (security critical)
- Verify soft-delete filtering (audit requirement)
- Test tag JSONB formatting (PostgreSQL-specific)

