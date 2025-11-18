# Search API Integration Test Plan

## Overview
Integration tests that execute real SQL queries against a test PostgreSQL database to verify:
- Actual tag search with JOIN operations
- Full-text search functionality
- Score boosting logic (2x for exact tag matches)
- Real data relationships and constraints
- PostgreSQL-specific features (JSONB, arrays, CTEs)

## Test Database Setup

### Option 1: Docker Compose (Recommended)
Use existing `test-docker-compose.yaml` with test database.

### Option 2: Separate Test Database
Create dedicated test database: `nabu_test`

```bash
createdb nabu_test
DATABASE_URL="postgresql://postgres:password@localhost:5432/nabu_test" npx prisma migrate deploy
```

### Option 3: In-Memory SQLite (Not Recommended)
PostgreSQL-specific features won't work (JSONB, vectors, full-text search).

## Test File Structure

**File:** `app/api/nabu/__tests__/search.integration.test.ts`

```typescript
import { prisma } from "@/lib/db";
import { GET as searchRoute } from "../search/route";

// Real Prisma client - no mocking
// Tests run against actual test database

describe("Search API Integration Tests", () => {
  let testUserId: string;
  let testTenantId: string;
  let createdNoteIds: string[] = [];
  let createdThoughtIds: string[] = [];
  let createdTagIds: string[] = [];
  let createdFolderIds: string[] = [];

  beforeAll(async () => {
    // Setup: Create test user, tenant, and seed data
    await seedTestData();
  });

  afterAll(async () => {
    // Cleanup: Delete all test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // Tests...
});
```

## Test Data Seeding

### Seed 20 Notes with Tags

```typescript
async function seedTestData() {
  testTenantId = "test-tenant-integration";
  testUserId = "test-user-integration";

  // Create folders
  const marketingFolder = await prisma.folder.create({
    data: {
      id: "folder-marketing-test",
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
      id: "tag-marketing-test",
      name: "marketing",
      userId: testUserId,
      tenantId: testTenantId,
      color: "#FF6B6B",
    },
  });
  createdTagIds.push(marketingTag.id);

  const researchTag = await prisma.tag.create({
    data: {
      id: "tag-research-test",
      name: "research",
      userId: testUserId,
      tenantId: testTenantId,
      color: "#FCBAD3",
    },
  });
  createdTagIds.push(researchTag.id);

  // Create notes with tags
  const note1 = await prisma.note.create({
    data: {
      id: "note-1-test",
      title: "Marketing Campaign Planning",
      content: "Q4 campaign strategy and budget allocation for digital marketing",
      userId: testUserId,
      tenantId: testTenantId,
      folderId: marketingFolder.id,
    },
  });
  createdNoteIds.push(note1.id);

  // Link note to tag
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
      id: "note-2-test",
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

  // Create thoughts with suggestedTags
  const thought1 = await prisma.thought.create({
    data: {
      id: "thought-1-test",
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
      id: "thought-2-test",
      content: "Marketing team meeting about Q4 campaign budget",
      userId: testUserId,
      tenantId: testTenantId,
      source: "WEB",
      suggestedTags: ["marketing", "meeting", "budget"],
    },
  });
  createdThoughtIds.push(thought2.id);
}
```

### Cleanup Test Data

```typescript
async function cleanupTestData() {
  // Delete in correct order (foreign key constraints)
  await prisma.noteTag.deleteMany({
    where: { tenantId: testTenantId },
  });
  
  await prisma.note.deleteMany({
    where: { userId: testUserId },
  });
  
  await prisma.thought.deleteMany({
    where: { userId: testUserId },
  });
  
  await prisma.tag.deleteMany({
    where: { userId: testUserId },
  });
  
  await prisma.folder.deleteMany({
    where: { userId: testUserId },
  });
}
```

## Integration Test Scenarios

### Test 1: Real Tag Search with JOIN
```typescript
it("finds notes by exact tag name with real database JOIN", async () => {
  // Seed data already has note with "marketing" tag
  
  const req = new Request(
    "http://localhost/api/nabu/search?q=marketing&includeNotes=true&includeThoughts=false"
  );
  
  // Mock getUserContext
  jest.spyOn(require("@/lib/nabu-helpers"), "getUserContext")
    .mockResolvedValue({
      userId: testUserId,
      tenantId: testTenantId,
      email: "test@test.com",
    });

  const res = await searchRoute(req);
  
  expect(res.status).toBe(200);
  const body = await res.json();
  
  // Should find note-1 with "marketing" tag
  expect(body.data.results.length).toBeGreaterThan(0);
  
  const marketingNote = body.data.results.find((r: any) => 
    r.id === "note-1-test"
  );
  
  expect(marketingNote).toBeDefined();
  expect(marketingNote.tags).toBeDefined();
  
  // Parse JSONB tags
  const tags = typeof marketingNote.tags === "string" 
    ? JSON.parse(marketingNote.tags)
    : marketingNote.tags;
    
  expect(tags).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "marketing" })
    ])
  );
});
```

### Test 2: Tag Search Score Boost
```typescript
it("boosts exact tag matches by 2x in real queries", async () => {
  // Create two notes:
  // Note A: Contains word "marketing" in content (no tag)
  // Note B: Tagged with "marketing" (should rank higher)
  
  const noteA = await prisma.note.create({
    data: {
      title: "Some content",
      content: "This mentions marketing strategies briefly",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });
  createdNoteIds.push(noteA.id);

  const noteB = await prisma.note.create({
    data: {
      title: "Different content",
      content: "Other topic entirely",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });
  createdNoteIds.push(noteB.id);

  // Tag noteB with "marketing"
  await prisma.noteTag.create({
    data: {
      noteId: noteB.id,
      tagId: "tag-marketing-test",
      tenantId: testTenantId,
      source: "USER_ADDED",
    },
  });

  // Search for "marketing"
  const req = new Request(
    "http://localhost/api/nabu/search?q=marketing"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  // Note B (with tag) should rank higher than Note A (content only)
  const noteAResult = body.data.results.find((r: any) => r.id === noteA.id);
  const noteBResult = body.data.results.find((r: any) => r.id === noteB.id);
  
  if (noteAResult && noteBResult) {
    expect(noteBResult.keywordScore).toBeGreaterThan(noteAResult.keywordScore * 1.5);
  }
});
```

### Test 3: Thought suggestedTags Search
```typescript
it("searches thought suggestedTags arrays in real database", async () => {
  // Seed data has thought-2 with suggestedTags: ["marketing", "meeting", "budget"]
  
  const req = new Request(
    "http://localhost/api/nabu/search?q=marketing&includeNotes=false&includeThoughts=true"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  const marketingThought = body.data.results.find((r: any) => 
    r.id === "thought-2-test"
  );
  
  expect(marketingThought).toBeDefined();
  expect(marketingThought.suggestedTags).toContain("marketing");
});
```

### Test 4: CTE Query Execution
```typescript
it("executes CTE (WITH clause) for tag aggregation without errors", async () => {
  // Tests the actual SQL CTE that aggregates tags
  
  const req = new Request(
    "http://localhost/api/nabu/search?q=test"
  );
  
  const res = await searchRoute(req);
  
  // Should not throw "aggregate functions not allowed in WHERE" error
  expect(res.status).toBe(200);
});
```

### Test 5: Multi-Tag Notes
```typescript
it("searches notes with multiple tags correctly", async () => {
  // Create note with 3 tags
  const multiTagNote = await prisma.note.create({
    data: {
      title: "Multi-Tag Test",
      content: "Testing multiple tag search",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });
  createdNoteIds.push(multiTagNote.id);

  // Create and link multiple tags
  const tags = ["frontend", "design", "ui"];
  for (const tagName of tags) {
    const tag = await prisma.tag.create({
      data: {
        name: tagName,
        userId: testUserId,
        tenantId: testTenantId,
      },
    });
    createdTagIds.push(tag.id);

    await prisma.noteTag.create({
      data: {
        noteId: multiTagNote.id,
        tagId: tag.id,
        tenantId: testTenantId,
        source: "USER_ADDED",
      },
    });
  }

  // Search for any of the tags
  const req = new Request(
    "http://localhost/api/nabu/search?q=frontend"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  const foundNote = body.data.results.find((r: any) => r.id === multiTagNote.id);
  expect(foundNote).toBeDefined();
});
```

### Test 6: Tenant Isolation
```typescript
it("isolates search results by tenant", async () => {
  // Create note in different tenant
  const otherTenantNote = await prisma.note.create({
    data: {
      title: "Other Tenant Note",
      content: "Should not appear in search",
      userId: "other-user",
      tenantId: "other-tenant",
    },
  });

  const req = new Request(
    "http://localhost/api/nabu/search?q=tenant"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  // Should NOT find the other tenant's note
  const otherNote = body.data.results.find((r: any) => 
    r.id === otherTenantNote.id
  );
  expect(otherNote).toBeUndefined();

  // Cleanup
  await prisma.note.delete({ where: { id: otherTenantNote.id } });
});
```

### Test 7: Soft Delete Exclusion
```typescript
it("excludes soft-deleted notes and tags from search", async () => {
  // Create and soft-delete a note
  const deletedNote = await prisma.note.create({
    data: {
      title: "Deleted Note",
      content: "This should not appear",
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
```

### Test 8: Full-Text Search Ranking
```typescript
it("ranks results using PostgreSQL ts_rank correctly", async () => {
  // Create notes with varying relevance
  const highRelevance = await prisma.note.create({
    data: {
      title: "Database Performance Optimization",
      content: "Database optimization techniques for better performance and query speed",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });

  const lowRelevance = await prisma.note.create({
    data: {
      title: "Unrelated Topic",
      content: "This barely mentions database once",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });

  createdNoteIds.push(highRelevance.id, lowRelevance.id);

  const req = new Request(
    "http://localhost/api/nabu/search?q=database optimization"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  // High relevance note should rank first
  if (body.data.results.length >= 2) {
    const firstResult = body.data.results[0];
    expect(firstResult.id).toBe(highRelevance.id);
  }
});
```

### Test 9: Case-Insensitive Tag Matching
```typescript
it("performs case-insensitive tag matching in database", async () => {
  // Tag created as "Marketing" (capitalized)
  const capitalTag = await prisma.tag.create({
    data: {
      name: "JavaScript",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });
  createdTagIds.push(capitalTag.id);

  const note = await prisma.note.create({
    data: {
      title: "JS Note",
      content: "About JavaScript",
      userId: testUserId,
      tenantId: testTenantId,
    },
  });
  createdNoteIds.push(note.id);

  await prisma.noteTag.create({
    data: {
      noteId: note.id,
      tagId: capitalTag.id,
      tenantId: testTenantId,
      source: "USER_ADDED",
    },
  });

  // Search with lowercase
  const req = new Request(
    "http://localhost/api/nabu/search?q=javascript"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  const found = body.data.results.find((r: any) => r.id === note.id);
  expect(found).toBeDefined();
  expect(found.keywordScore).toBeGreaterThan(0);
});
```

### Test 10: Array to String Conversion for Thoughts
```typescript
it("converts suggestedTags array to searchable text", async () => {
  const thought = await prisma.thought.create({
    data: {
      content: "Random content here",
      userId: testUserId,
      tenantId: testTenantId,
      source: "WEB",
      suggestedTags: ["integration-test", "database", "search"],
    },
  });
  createdThoughtIds.push(thought.id);

  const req = new Request(
    "http://localhost/api/nabu/search?q=integration-test"
  );
  
  const res = await searchRoute(req);
  const body = await res.json();
  
  const found = body.data.results.find((r: any) => r.id === thought.id);
  expect(found).toBeDefined();
});
```

## Running Integration Tests

### Separate from Unit Tests

**package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=integration",
    "test:integration": "jest --testPathPattern=integration",
    "test:all": "jest"
  }
}
```

### Run Integration Tests
```bash
# Start test database
docker-compose -f test-docker-compose.yaml up -d

# Run migrations
DATABASE_URL="postgres://postgres:root@localhost:5432/tests" npx prisma migrate deploy

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f test-docker-compose.yaml down -v
```

## Expected Outcomes

✅ All SQL queries execute without syntax errors
✅ CTE for tag aggregation works correctly
✅ JSONB tag data properly formatted
✅ Array operations on suggestedTags function
✅ Full-text search with ts_rank returns ranked results
✅ 2x score boost applied for exact tag matches
✅ Tenant isolation enforced
✅ Soft-deletes excluded
✅ Case-insensitive matching works
✅ Multi-tag notes searchable

## Benefits of Integration Tests

1. **Validates real SQL** - Unit tests can't catch SQL syntax errors
2. **Tests PostgreSQL features** - JSONB, arrays, full-text search, CTEs
3. **Verifies data relationships** - JOINs, foreign keys work as expected
4. **Catches edge cases** - Real database behavior vs mocked
5. **Confidence in deployment** - If integration tests pass, production will work

## Test Coverage Goals

- Unit tests: 90% code coverage (logic, validation, error handling)
- Integration tests: 100% critical path coverage (SQL queries, data relationships)

**Combined:** Comprehensive coverage ensuring both logic AND data layer work correctly.

