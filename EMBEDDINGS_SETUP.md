# Embeddings System - Production Setup Guide

Complete guide for setting up and deploying the vector embeddings system for semantic search on notes and thoughts.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Edge Function Deployment](#edge-function-deployment)
6. [Database Webhook Configuration](#database-webhook-configuration)
7. [Testing and Verification](#testing-and-verification)
8. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
9. [Performance Tuning](#performance-tuning)
10. [Cost Estimation](#cost-estimation)

---

## Overview

The embeddings system provides semantic search capabilities by:
- **Chunking** long notes/thoughts into ~2000 character segments with overlap
- **Generating embeddings** using transformers.js (`Xenova/all-MiniLM-L6-v2`, 384 dimensions)
- **Storing vectors** in PostgreSQL with pgvector extension
- **Processing asynchronously** via Supabase Edge Functions triggered by database webhooks

### Architecture

```
User creates/updates note
    ↓
API enqueues EmbeddingJob records
    ↓
Database webhook triggers Edge Function
    ↓
Edge Function generates embedding with transformers.js
    ↓
Embedding stored in NoteChunk/ThoughtChunk table
    ↓
Available for semantic search
```

---

## Prerequisites

1. **Supabase Project** with:
   - PostgreSQL database (Postgres 14+)
   - Edge Functions enabled
   - Service role key access

2. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

3. **Database Access** via:
   - Supabase SQL Editor (web UI)
   - OR psql CLI with connection string

4. **Deployment Access**:
   - Supabase project ref and credentials
   - Ability to configure webhooks in Supabase dashboard

---

## Environment Variables

Add these to your `.env` file (for local development) and production environment:

```bash
# Required - Already configured for Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional - Embedding configuration
# These have sensible defaults but can be customized
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384
EMBEDDING_CHUNK_SIZE=2000
EMBEDDING_CHUNK_OVERLAP=200
```

### Configuration Details

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_MODEL` | `Xenova/all-MiniLM-L6-v2` | Transformers.js model name |
| `EMBEDDING_DIMENSIONS` | `384` | Vector dimensions (must match model) |
| `EMBEDDING_CHUNK_SIZE` | `2000` | Characters per chunk |
| `EMBEDDING_CHUNK_OVERLAP` | `200` | Overlapping characters between chunks |

### Model Options

- **`Xenova/all-MiniLM-L6-v2`** (384 dim): Fast, good quality, recommended
- **`Xenova/all-mpnet-base-v2`** (768 dim): Higher quality, slower, 2x storage
- **`Xenova/multilingual-e5-small`** (384 dim): Multilingual support

---

## Database Setup

### Step 1: Enable pgvector Extension

Run in Supabase SQL Editor or via psql:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Verification:**
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Expected output: One row showing vector extension.

### Step 2: Run Prisma Migration

From your project root:

```bash
npx prisma migrate deploy
```

This will apply the migration: `20251113223728_add_embeddings_chunking_system`

**What it does:**
- Removes old `Note.embedding` and `Thought.embedding` columns
- Creates `NoteChunk` table with vector(384) embedding column
- Creates `ThoughtChunk` table with vector(384) embedding column
- Creates `EmbeddingJob` table for job queue
- Creates ivfflat indexes for vector similarity search
- Sets up foreign key cascades for automatic cleanup

### Step 3: Verify Tables

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('NoteChunk', 'ThoughtChunk', 'EmbeddingJob');

-- Check vector columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'NoteChunk' AND column_name = 'embedding';
```

### Step 4: Verify Indexes

```sql
-- Check ivfflat indexes exist
SELECT indexname, tablename FROM pg_indexes 
WHERE indexname IN ('note_chunk_embedding_idx', 'thought_chunk_embedding_idx');
```

---

## Edge Function Deployment

### Step 1: Login to Supabase CLI

```bash
supabase login
```

### Step 2: Link Project

```bash
supabase link --project-ref your-project-ref
```

### Step 3: Deploy Edge Function

From project root:

```bash
supabase functions deploy generate-embedding
```

**Expected output:**
```
Deploying function generate-embedding...
Function URL: https://your-project-ref.supabase.co/functions/v1/generate-embedding
```

### Step 4: Set Edge Function Secrets

The Edge Function needs access to environment variables:

```bash
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

**Verify secrets:**
```bash
supabase secrets list
```

### Step 5: Test Edge Function

You can test the Edge Function manually using curl (optional):

```bash
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/generate-embedding \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "EmbeddingJob",
    "record": {
      "id": "test-job-id",
      "tenantId": null,
      "userId": "test-user",
      "entityType": "NOTE",
      "entityId": "test-note",
      "chunkId": "test-chunk",
      "chunkIndex": 0,
      "content": "This is a test note content for embedding generation.",
      "status": "PENDING",
      "attempts": 0
    },
    "schema": "public",
    "old_record": null
  }'
```

---

## Database Webhook Configuration

### Step 1: Open Supabase Dashboard

Navigate to: `https://app.supabase.com/project/your-project-ref/database/hooks`

### Step 2: Create Database Webhook

Click **"Create a new hook"** and configure:

**Settings:**
- **Name**: `trigger-embedding-generation`
- **Table**: `EmbeddingJob`
- **Events**: ☑ Insert (uncheck Update, Delete)
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://your-project-ref.supabase.co/functions/v1/generate-embedding`
- **Headers**:
  ```
  Authorization: Bearer your-service-role-key
  Content-Type: application/json
  ```
- **Payload**: ☑ Send all columns
- **Enabled**: ☑ Yes

### Step 3: Test Webhook

The webhook should automatically trigger when a new `EmbeddingJob` is inserted.

Test by creating a note via your API:

```bash
curl -X POST \
  http://localhost:3000/api/nabu/notes \
  -H "Authorization: Bearer your-user-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note for Embeddings",
    "content": "This is a test note to verify that embeddings are being generated automatically.",
    "folderId": null
  }'
```

---

## Testing and Verification

### Test 1: Create a Short Note

```bash
POST /api/nabu/notes
{
  "title": "Short Test",
  "content": "This is a short test note with minimal content for testing embeddings."
}
```

**Expected:**
1. Note is created
2. One `NoteChunk` record created (short content = 1 chunk)
3. One `EmbeddingJob` created with status PENDING
4. Edge Function processes job → status changes to COMPLETED
5. `NoteChunk.embedding` populated with vector

**Verify:**
```sql
SELECT nc.id, nc.chunkIndex, 
       LENGTH(nc.content) as content_length,
       nc.embedding IS NOT NULL as has_embedding
FROM "NoteChunk" nc
JOIN "Note" n ON nc."noteId" = n.id
WHERE n.title = 'Short Test';
```

### Test 2: Create a Long Note

Create a note with > 2000 characters of content.

**Expected:**
- Multiple `NoteChunk` records created
- Multiple `EmbeddingJob` records created
- All chunks get embeddings

**Verify:**
```sql
SELECT COUNT(*) as chunk_count,
       COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedded_chunks
FROM "NoteChunk" nc
JOIN "Note" n ON nc."noteId" = n.id
WHERE n.title = 'Long Test';
```

Both counts should match.

### Test 3: Update Note Content

Update an existing note's content significantly.

**Expected:**
- Old chunks deleted
- New chunks created
- New embeddings generated

**Verify:**
```sql
SELECT COUNT(*) FROM "EmbeddingJob" 
WHERE "entityType" = 'NOTE' 
  AND "entityId" = 'your-note-id'
  AND status = 'COMPLETED';
```

### Test 4: Delete Note

Delete a note.

**Expected:**
- `NoteChunk` records automatically deleted (CASCADE)
- No orphaned chunks remain

**Verify:**
```sql
SELECT COUNT(*) FROM "NoteChunk" WHERE "noteId" = 'deleted-note-id';
-- Should return 0
```

### Test 5: Check Edge Function Logs

View logs in Supabase dashboard:
`https://app.supabase.com/project/your-project-ref/functions/generate-embedding/logs`

Look for:
- ✅ "Processing embedding job: {jobId}"
- ✅ "Generated embedding with 384 dimensions"
- ✅ "Job {jobId} completed successfully"

---

## Monitoring and Troubleshooting

### Key Metrics to Monitor

1. **Embedding Job Queue**
   ```sql
   SELECT status, COUNT(*) 
   FROM "EmbeddingJob" 
   GROUP BY status;
   ```
   
   Healthy system: Most jobs should be COMPLETED, few PENDING

2. **Failed Jobs**
   ```sql
   SELECT id, "entityType", "entityId", error, attempts
   FROM "EmbeddingJob"
   WHERE status = 'FAILED'
   ORDER BY "updatedAt" DESC
   LIMIT 10;
   ```

3. **Chunks Without Embeddings**
   ```sql
   -- Notes
   SELECT COUNT(*) FROM "NoteChunk" WHERE embedding IS NULL;
   
   -- Thoughts
   SELECT COUNT(*) FROM "ThoughtChunk" WHERE embedding IS NULL;
   ```
   
   Should be close to 0 in steady state

### Common Issues

#### Issue 1: Edge Function Cold Starts

**Symptom**: First embedding job takes 5-10 seconds

**Solution**: Normal behavior. Transformers.js model loads on first invocation. Subsequent requests are fast (~100-500ms).

**Mitigation**: Keep function warm with periodic pings (future optimization).

#### Issue 2: Webhook Not Triggering

**Symptom**: EmbeddingJob records stay in PENDING status

**Diagnosis:**
1. Check webhook is enabled in Supabase dashboard
2. Check webhook logs for errors
3. Verify service role key in webhook headers

**Solution**: Recreate webhook or fix configuration.

#### Issue 3: Embedding Generation Failures

**Symptom**: Jobs transition to FAILED status

**Diagnosis**: Check error field in EmbeddingJob table
```sql
SELECT error FROM "EmbeddingJob" WHERE status = 'FAILED' LIMIT 1;
```

**Common errors:**
- `Model not found`: Check EMBEDDING_MODEL env var
- `Out of memory`: Content too long (rare with 2000 char chunks)
- `Network timeout`: Edge Function timeout (max 120s)

**Solution**: Check Edge Function logs for details, verify model name.

#### Issue 4: Index Not Being Used

**Symptom**: Slow vector search queries

**Diagnosis**: Run EXPLAIN on search query
```sql
EXPLAIN ANALYZE
SELECT * FROM "NoteChunk"
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

**Solution**: If index not used, rebuild it:
```sql
REINDEX INDEX note_chunk_embedding_idx;
VACUUM ANALYZE "NoteChunk";
```

---

## Performance Tuning

### 1. Index Optimization

The ivfflat index `lists` parameter should be tuned based on dataset size:

```sql
-- For ~10K vectors (current default: lists = 100)
DROP INDEX note_chunk_embedding_idx;
CREATE INDEX note_chunk_embedding_idx ON "NoteChunk" 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- For ~100K+ vectors
DROP INDEX note_chunk_embedding_idx;
CREATE INDEX note_chunk_embedding_idx ON "NoteChunk" 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 300);
```

**Rule of thumb**: `lists = sqrt(total_rows)`

### 2. Chunk Size Tuning

Experiment with different chunk sizes based on your content:

```env
# Smaller chunks (more granular, higher storage)
EMBEDDING_CHUNK_SIZE=1000
EMBEDDING_CHUNK_OVERLAP=100

# Larger chunks (less granular, lower storage)
EMBEDDING_CHUNK_SIZE=3000
EMBEDDING_CHUNK_OVERLAP=300
```

### 3. Search Query Optimization

When implementing search, use:
```sql
-- Efficient: Use index with LIMIT
SELECT nc.*, n.title
FROM "NoteChunk" nc
JOIN "Note" n ON nc."noteId" = n.id
ORDER BY nc.embedding <=> $1::vector
LIMIT 20;

-- Also consider: Pre-filter by tenant/user before vector search
SELECT nc.*, n.title
FROM "NoteChunk" nc
JOIN "Note" n ON nc."noteId" = n.id
WHERE n."tenantId" = $2 AND n."deletedAt" IS NULL
ORDER BY nc.embedding <=> $1::vector
LIMIT 20;
```

### 4. Maintenance Tasks

Schedule these periodically (e.g., weekly):

```sql
-- Rebuild indexes
REINDEX INDEX note_chunk_embedding_idx;
REINDEX INDEX thought_chunk_embedding_idx;

-- Update statistics
VACUUM ANALYZE "NoteChunk";
VACUUM ANALYZE "ThoughtChunk";

-- Clean up old failed jobs (optional)
DELETE FROM "EmbeddingJob" 
WHERE status = 'FAILED' 
  AND "updatedAt" < NOW() - INTERVAL '7 days';
```

---

## Cost Estimation

### Supabase Edge Functions

**Free Tier**: 500K requests/month

**Pricing Beyond Free Tier**: ~$0.50 per 1M requests

**Estimated Usage**:
- 1,000 notes/month with avg 3 chunks = 3,000 embedding requests
- Well within free tier for most use cases

### Database Storage

**Vectors**: 384 floats × 4 bytes = 1.5 KB per embedding

**Average Note**: 3 chunks = 4.5 KB

**Storage Costs** (Supabase Postgres):
- 10,000 notes: ~45 MB = ~$0.001/month
- 100,000 notes: ~450 MB = ~$0.01/month
- 1,000,000 notes: ~4.5 GB = ~$0.10/month

### Total Estimated Cost

For typical usage (< 10K notes/month):
- **Compute**: Free (within 500K Edge Function requests)
- **Storage**: < $1/month
- **Total**: **Effectively free**

For high-volume usage (100K+ notes):
- **Compute**: ~$5-10/month
- **Storage**: ~$1-5/month
- **Total**: **~$10-15/month**

---

## Next Steps

1. ✅ Complete this setup guide
2. ⏭️ Implement search API with vector similarity (see TODO: `create-search-api`)
3. ⏭️ Monitor embedding generation performance
4. ⏭️ Consider bulk regeneration for existing notes (see `.devreadyai/other/embeddings-future-features.md`)
5. ⏭️ Set up monitoring alerts for failed jobs
6. ⏭️ A/B test search relevance with and without embeddings

---

## Support and Resources

- **Supabase Docs**: https://supabase.com/docs
- **pgvector Docs**: https://github.com/pgvector/pgvector
- **Transformers.js**: https://huggingface.co/docs/transformers.js
- **Project Docs**: `.devreadyai/other/embeddings-future-features.md`

---

## Troubleshooting Checklist

Before deploying to production, verify:

- [ ] pgvector extension enabled
- [ ] Prisma migration applied successfully
- [ ] NoteChunk and ThoughtChunk tables exist
- [ ] Vector indexes created (ivfflat)
- [ ] Edge Function deployed
- [ ] Edge Function secrets set
- [ ] Database webhook configured and enabled
- [ ] Test note creates chunks and embeddings
- [ ] Edge Function logs show successful processing
- [ ] No failed embedding jobs in database
- [ ] Search API implemented (next step)

---

**Last Updated**: November 13, 2024  
**Version**: 1.0

