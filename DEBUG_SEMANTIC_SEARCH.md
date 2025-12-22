# Debug Semantic Search - Step by Step

## Step 1: Verify Notes Exist

Run this SQL in Supabase SQL Editor:

```sql
-- Check if you have any notes
SELECT id, title, LENGTH(content) as content_length, "createdAt"
FROM "Note"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected**: Should see your notes listed

## Step 2: Verify Chunks Were Created

```sql
-- Check if chunks exist for your notes
SELECT 
  n.title,
  COUNT(nc.id) as chunk_count,
  COUNT(nc.embedding) as chunks_with_embeddings
FROM "Note" n
LEFT JOIN "NoteChunk" nc ON n.id = nc."noteId" AND nc."deletedAt" IS NULL
WHERE n."deletedAt" IS NULL
GROUP BY n.id, n.title
ORDER BY n."createdAt" DESC
LIMIT 10;
```

**Expected**: 
- `chunk_count` > 0 (chunks created)
- `chunks_with_embeddings` > 0 (embeddings generated)

**If chunk_count = 0**: Notes are too short (< 100 chars). Create longer notes.

**If chunks_with_embeddings = 0**: 
- Check Edge Function logs
- Check `EmbeddingJob` table for errors

## Step 3: Check Embedding Jobs

```sql
-- Check embedding job status
SELECT 
  "entityType",
  "entityId", 
  "chunkIndex",
  status,
  attempts,
  error,
  "createdAt"
FROM "EmbeddingJob"
WHERE "deletedAt" IS NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected**: Status should be "COMPLETED"

**If status = "FAILED"**: Check `error` column for details

**If status = "PENDING"**: Webhook not triggering, check webhook configuration

## Step 4: Test Search API Directly

### Simple Test (No Authentication)

Create a file `test-search.mjs`:

```javascript
// Test script - run with: node test-search.mjs

const userId = 'YOUR_USER_ID'; // Replace with your actual user ID from database

// Test 1: Simple keyword search
console.log('\n=== Test 1: Keyword Search ===');
const keywordQuery = 'project'; // Use a word from your notes
console.log(`Query: "${keywordQuery}"`);

// Test 2: Check what search API expects
console.log('\n=== API Endpoint ===');
console.log('GET /api/nabu/search?q=your-search-term');
console.log('Authentication: Required (user session)');

// SQL to test vector search directly
console.log('\n=== Test Vector Search in Database ===');
console.log('Run this SQL to verify vector search works:');
console.log(`
WITH sample_chunk AS (
  SELECT embedding 
  FROM "NoteChunk" 
  WHERE embedding IS NOT NULL 
  LIMIT 1
)
SELECT 
  n.title,
  nc."chunkIndex",
  1 - (nc.embedding <=> sample_chunk.embedding) as similarity
FROM "NoteChunk" nc
CROSS JOIN sample_chunk
JOIN "Note" n ON nc."noteId" = n.id
WHERE nc.embedding IS NOT NULL
  AND nc."deletedAt" IS NULL
ORDER BY nc.embedding <=> sample_chunk.embedding
LIMIT 5;
`);
```

## Step 5: Check Search API Logs

When you call the search API, check your terminal for:

```
[Search] Generating embedding for query: "your query"
[Search] Generated 512d embedding for query (expected: 512d)
```

**If you see**: `OPENAI_API_KEY not configured`
- Check your `.env` file has `OPENAI_API_KEY=sk-...`

**If you don't see any logs**: The search API isn't being called
- Verify you're authenticated
- Check the request is reaching the endpoint

## Step 6: Minimal Working Test

The simplest test without a UI:

### Option A: Using psql/SQL Editor

```sql
-- 1. Count notes
SELECT COUNT(*) FROM "Note" WHERE "deletedAt" IS NULL;

-- 2. Count chunks with embeddings
SELECT COUNT(*) FROM "NoteChunk" WHERE embedding IS NOT NULL AND "deletedAt" IS NULL;

-- 3. Test full-text search (keyword only)
SELECT n.id, n.title, 
       ts_rank(to_tsvector('english', n.title || ' ' || n.content), 
               plainto_tsquery('english', 'project')) as rank
FROM "Note" n
WHERE n."deletedAt" IS NULL
  AND to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', 'project')
ORDER BY rank DESC
LIMIT 5;
```

### Option B: Test via Browser Console (Logged In)

1. Open your app (make sure you're logged in)
2. Open DevTools → Console
3. Run:

```javascript
// Simple test
fetch('/api/nabu/search?q=test')
  .then(r => r.json())
  .then(data => {
    console.log('Search Response:', data);
    if (data.success) {
      console.log('✅ API works');
      console.log('Has Vector Search:', data.data.hasVectorSearch);
      console.log('Results:', data.data.count);
    } else {
      console.log('❌ Error:', data.error);
    }
  })
  .catch(err => console.error('Request failed:', err));
```

## Common Issues

### Issue 1: No Results Because Notes Too Short

**Problem**: Notes < 100 characters don't get embeddings

**Solution**: Add more content to your notes (aim for 200+ characters)

### Issue 2: No Results Because No Authentication

**Problem**: Search API requires authentication

**Solution**: Test from browser console while logged in, not from curl without cookies

### Issue 3: Embeddings Not Generated Yet

**Problem**: Jobs still processing or webhook not configured

**Check**:
```sql
SELECT status, COUNT(*) 
FROM "EmbeddingJob" 
WHERE "deletedAt" IS NULL
GROUP BY status;
```

**Solution**: Wait a few seconds, or check webhook configuration

### Issue 4: Search Returns Empty Array

**Problem**: Search query doesn't match any content

**Solution**: 
- Use words that actually appear in your notes
- Check notes exist: `SELECT COUNT(*) FROM "Note" WHERE "deletedAt" IS NULL;`

## Quick Debug Checklist

- [ ] Created notes with > 100 characters of content
- [ ] Waited ~10 seconds after creating notes
- [ ] Verified chunks exist in database
- [ ] Verified embeddings populated (not NULL)
- [ ] Verified `EmbeddingJob` status = COMPLETED
- [ ] Testing while logged in (has valid session)
- [ ] Using words that appear in your notes
- [ ] Checked terminal logs for errors

## Still Not Working?

Share these details:
1. How many notes do you have?
2. How many chunks in database?
3. How many chunks have embeddings?
4. What query are you testing?
5. What response do you get?
6. Any errors in terminal or Edge Function logs?

