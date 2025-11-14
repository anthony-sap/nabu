# Semantic Search - Testing Guide

## Overview

Your semantic search is now fully functional! This guide shows how to test it with sample notes and search queries.

## Test Setup

### Step 1: Create Sample Notes

Create these 4 notes in your app (copy/paste the content):

#### Note 1: "Project Planning Q2 2025"
```
We discussed the upcoming product launch scheduled for Q2 2025. Key deliverables include:
- Complete user testing by March 15th
- Finalize marketing materials and website updates
- Coordinate with the sales team for customer outreach
- Budget allocation: $50k for advertising, $30k for events

Next meeting: February 10th at 2 PM
Action items assigned to Sarah and Mike
Dependencies: Design team must finish mockups first
Risk: Timeline is aggressive, may need to push back 2 weeks
```

#### Note 2: "Customer Feedback - Mobile App"
```
Today's customer interview revealed important insights about our mobile application:
- Users complain about slow loading times (currently 3-5 seconds on startup)
- Push notifications are too frequent and becoming annoying
- Everyone loves the new dark mode feature - very positive feedback
- Top request: offline mode for note-taking when traveling

Follow-up actions:
- Schedule demo with premium tier users next week
- Priority fix: Optimize app bundle size and lazy loading
- Consider reducing notification frequency to once daily
- Investigate offline storage using IndexedDB or similar
```

#### Note 3: "Technical Architecture Review"
```
Reviewed our database scaling strategy for the next 12 months with the engineering team:

Current state:
- PostgreSQL instance handles 10,000 requests/minute
- Database size: 250 GB and growing
- Response time: Average 45ms, P95 is 200ms

Proposed improvements:
- Implement read replicas for better query performance
- Consider sharding strategy when we hit 1 million active users
- Cost optimization: Move historical data to cold storage (S3)
- Add caching layer using Redis for frequently accessed data

Technologies discussed: horizontal scaling, CDN for static assets, microservices architecture
Team consensus: Start with vertical scaling first (upgrade to larger instance), then horizontal

Budget: $5k/month additional infrastructure costs
Timeline: Phase 1 by end of Q1
```

#### Note 4: "Q1 Marketing Campaign Brainstorm"
```
Brainstorming session for Q1 marketing and growth initiatives:

Campaign ideas:
1. Social media blitz targeting developers and tech professionals (#CodeBetter, #ProductivityHacks)
2. Partnership program with tech influencers for authentic product reviews
3. Monthly webinar series on productivity and modern note-taking best practices
4. Educational discount program - 40% off for students and teachers
5. Content marketing: Blog posts about AI-powered knowledge management

Distribution channels:
- LinkedIn, Twitter, Reddit (r/productivity)
- Tech podcasts sponsorships
- Developer conferences and meetups

Budget breakdown: $75k total
- Social ads: $30k
- Influencer partnerships: $25k
- Content creation: $15k
- Events/sponsorships: $5k

Timeline: Launch by January 15th
Success metrics: 5,000 new signups, 500 paid conversions, 10% trial-to-paid rate
Lead: Jennifer (Marketing Director)
```

### Step 2: Wait for Embeddings

After creating these notes, wait ~10 seconds for embeddings to be generated. Verify in database:

```sql
SELECT COUNT(*) as total_chunks, 
       COUNT(embedding) as embedded_chunks
FROM "NoteChunk";
```

Both numbers should match (all chunks embedded).

## Testing Semantic Search

### API Endpoint

```
GET /api/nabu/search?q={query}&limit=20
```

### Test Cases

#### Test 1: Keyword Match (Baseline)

**Query**: `marketing`

**Expected**: Should find Note 4 directly (contains "marketing" keyword)

**API Call**:
```bash
GET /api/nabu/search?q=marketing
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "query": "marketing",
    "results": [
      {
        "id": "note-4-id",
        "title": "Q1 Marketing Campaign Brainstorm",
        "keywordScore": 0.95,
        "vectorScore": 0.88,
        "combinedScore": 0.91
      }
    ],
    "hasVectorSearch": true
  }
}
```

#### Test 2: Semantic Search (No Exact Keywords)

**Query**: `upcoming tasks and deadlines`

**Expected**: Should find Note 1 (project planning with action items and dates)

**Why it works**: 
- No exact "upcoming tasks" in any note
- Semantic understanding: "action items" + "next meeting" + "March 15th" = tasks/deadlines
- Vector similarity finds the conceptual match

**API Call**:
```bash
GET /api/nabu/search?q=upcoming%20tasks%20and%20deadlines
```

#### Test 3: Semantic Search - User Problems

**Query**: `user complaints and issues`

**Expected**: Should find Note 2 (customer feedback)

**Why it works**:
- Note 2 mentions "complain", "annoying", "request" (negative sentiment)
- Semantic model understands complaints ≈ feedback ≈ issues
- Finds it even though "complaints" isn't the exact word used

**API Call**:
```bash
GET /api/nabu/search?q=user%20complaints%20and%20issues
```

#### Test 4: Semantic Search - Performance

**Query**: `improving system speed and performance`

**Expected**: Should find Note 2 (slow loading) AND Note 3 (database scaling)

**Why it works**:
- Note 2: "slow loading times", "optimize bundle"
- Note 3: "performance", "scaling", "response time"
- Semantic search finds both performance-related notes

**API Call**:
```bash
GET /api/nabu/search?q=improving%20system%20speed%20and%20performance
```

#### Test 5: Semantic Search - Business Strategy

**Query**: `advertising and promotion strategies`

**Expected**: Should find Note 4 (marketing campaign)

**Why it works**:
- Note 4: "social ads", "influencer partnerships", "content marketing"
- Semantic model: advertising ≈ marketing ≈ promotion
- Finds strategic planning even with different vocabulary

**API Call**:
```bash
GET /api/nabu/search?q=advertising%20and%20promotion%20strategies
```

#### Test 6: Semantic Search - Technical Concepts

**Query**: `database optimization techniques`

**Expected**: Should find Note 3 (architecture review)

**Why it works**:
- Note 3: "scaling strategy", "read replicas", "caching", "cost optimization"
- All these are database optimization techniques
- Semantic understanding of technical concepts

**API Call**:
```bash
GET /api/nabu/search?q=database%20optimization%20techniques
```

#### Test 7: Cross-Note Concepts

**Query**: `budget planning`

**Expected**: Should find Note 1, Note 3, AND Note 4 (all mention budgets)

**Why it works**:
- Note 1: "$50k for advertising, $30k for events"
- Note 3: "$5k/month additional infrastructure"
- Note 4: "$75k total" breakdown
- Semantic model recognizes financial planning across different contexts

**API Call**:
```bash
GET /api/nabu/search?q=budget%20planning
```

## How to Test

### Method 1: Browser DevTools (Easiest)

1. Open your app in browser
2. Press F12 → Console tab
3. Paste and run:

```javascript
async function testSearch(query) {
  const response = await fetch(`/api/nabu/search?q=${encodeURIComponent(query)}&limit=10`);
  const data = await response.json();
  console.log(`\n=== SEARCH: "${query}" ===`);
  console.log(`Has Vector Search: ${data.data.hasVectorSearch}`);
  console.log(`Results: ${data.data.count}`);
  data.data.results.forEach((r, i) => {
    console.log(`${i+1}. ${r.title} (combined: ${r.combinedScore.toFixed(2)}, keyword: ${r.keywordScore.toFixed(2)}, vector: ${r.vectorScore.toFixed(2)})`);
  });
  return data;
}

// Run tests
await testSearch('marketing');
await testSearch('upcoming tasks and deadlines');
await testSearch('user complaints and issues');
await testSearch('improving system speed and performance');
await testSearch('budget planning');
```

### Method 2: curl (Terminal)

```bash
# Replace with your actual cookie/auth header
curl "http://localhost:3000/api/nabu/search?q=upcoming%20tasks" \
  -H "Cookie: your-cookie-here" \
  | jq
```

### Method 3: Direct Database Query (For Debugging)

Test vector similarity directly:

```sql
-- First, get an embedding for a search term (you'd need to run this through OpenAI)
-- Then test similarity manually:
WITH search_embedding AS (
  SELECT '[0.1, 0.2, ...]'::vector(512) as vec
)
SELECT 
  nc."chunkIndex",
  n.title,
  1 - (nc.embedding <=> search_embedding.vec) as similarity
FROM "NoteChunk" nc
CROSS JOIN search_embedding
JOIN "Note" n ON nc."noteId" = n.id
WHERE nc.embedding IS NOT NULL
ORDER BY nc.embedding <=> search_embedding.vec
LIMIT 10;
```

## What to Look For

### Successful Semantic Search Indicators

1. **`hasVectorSearch: true`** in response
2. **`vectorScore` > 0** for results
3. **Results include notes without exact keywords**
4. **`combinedScore`** ranks by relevance (hybrid of keyword + vector)

### Example Output

```json
{
  "success": true,
  "data": {
    "query": "upcoming tasks",
    "results": [
      {
        "id": "note-1-id",
        "entityType": "note",
        "title": "Project Planning Q2 2025",
        "keywordScore": 0.0,     // No exact "upcoming tasks" keyword
        "vectorScore": 0.82,     // High semantic similarity!
        "combinedScore": 0.492,  // 0.82 * 0.6 (vectorWeight)
        "matchedChunk": {
          "chunkIndex": 0,
          "content": "...Action items assigned to Sarah and Mike..."
        }
      }
    ],
    "count": 1,
    "weights": {
      "keyword": 0.4,
      "vector": 0.6
    },
    "hasVectorSearch": true
  }
}
```

## Troubleshooting

### If `hasVectorSearch: false`

Check server logs for:
```
[Search] OPENAI_API_KEY not configured - skipping vector search
```

Fix: Ensure `OPENAI_API_KEY` is in your `.env` file.

### If No Results

1. **Verify embeddings exist**:
   ```sql
   SELECT COUNT(*) FROM "NoteChunk" WHERE embedding IS NOT NULL;
   ```

2. **Check search logs**:
   - Should see `[Search] Generating embedding for query...`
   - Should see `[Search] Generated 512d embedding...`

### If Results Don't Make Sense

- **Adjust weights**: Try `keywordWeight=0.7&vectorWeight=0.3` for more keyword focus
- **Check similarity scores**: Low scores (< 0.3) mean weak matches
- **Content matters**: More detailed notes = better semantic understanding

## Next Steps

After testing, you can:
1. Build a search UI component in your frontend
2. Add search result highlighting
3. Implement search filters (by folder, date range, etc.)
4. Add search history and suggestions
5. Cache common queries for performance

---

**The semantic search is ready to use!** 🚀

