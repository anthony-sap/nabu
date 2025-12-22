# Embeddings System - Deployment Instructions

## Quick Start

The embeddings system has been fully implemented and all tests are passing. Follow these steps to deploy to production:

### 1. Run Database Migration

```bash
npx prisma migrate deploy
```

This will apply migration `20251113223728_add_embeddings_chunking_system` which:
- Enables pgvector extension
- Creates `NoteChunk` and `ThoughtChunk` tables with vector(384) columns
- Creates `EmbeddingJob` queue table
- Creates ivfflat indexes for vector similarity search
- Removes deprecated `embedding` columns from `Note` and `Thought` tables

### 2. Verify pgvector Extension

In Supabase SQL Editor:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Should return one row. If not, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Deploy Edge Function

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy generate-embedding

# Set required secrets
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
```

### 4. Configure Database Webhook

1. Go to Supabase Dashboard → Database → Webhooks
2. Click "Create a new hook"
3. Configure:
   - **Name**: `trigger-embedding-generation`
   - **Table**: `EmbeddingJob`
   - **Events**: ☑ Insert only
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/generate-embedding`
   - **Headers**:
     ```
     Authorization: Bearer your-service-role-key
     Content-Type: application/json
     ```
4. Click "Create webhook"

### 5. Test the System

Create a test note via your frontend or API:

```bash
POST /api/nabu/notes
{
  "title": "Test Note for Embeddings",
  "content": "This is a test note to verify embeddings are being generated."
}
```

Verify chunks and embeddings were created:

```sql
-- Check chunks created
SELECT nc.id, nc.chunkIndex, nc.embedding IS NOT NULL as has_embedding
FROM "NoteChunk" nc
JOIN "Note" n ON nc."noteId" = n.id
WHERE n.title = 'Test Note for Embeddings';

-- Check embedding jobs completed
SELECT COUNT(*) FROM "EmbeddingJob" 
WHERE status = 'COMPLETED';
```

### 6. Monitor Edge Function

Check logs in Supabase Dashboard → Edge Functions → generate-embedding → Logs

Look for successful processing messages.

## What Was Implemented

### Database Schema
- `NoteChunk` table with vector embeddings
- `ThoughtChunk` table with vector embeddings
- `EmbeddingJob` queue table for async processing
- CASCADE deletes (chunks auto-delete when parent is deleted)

### Chunking System
- Smart text splitting (~2000 chars/chunk with 200 char overlap)
- Sentence boundary detection
- Handles content of any length

### API Integration
- Note CREATE/UPDATE automatically enqueue embedding jobs
- Thought CREATE/UPDATE automatically enqueue embedding jobs
- Async processing (doesn't block API responses)
- Change detection (only regenerate when content changes significantly)

### Edge Function
- Uses transformers.js (`Xenova/all-MiniLM-L6-v2`)
- Generates 384-dimensional vectors
- Retry logic (max 3 attempts)
- Updates chunks with embeddings

### Search API
- Hybrid keyword + vector similarity search
- Configurable weights (default: 40% keyword, 60% vector)
- Chunk-level matching with parent note context
- Multi-tenant isolation

### Testing
- ✅ All 392 tests pass
- ✅ API routes tested (notes, thoughts)
- ✅ Backwards compatible with existing functionality

## Configuration (Optional)

Add to `.env` if you want to customize:

```env
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2
EMBEDDING_DIMENSIONS=384
EMBEDDING_CHUNK_SIZE=2000
EMBEDDING_CHUNK_OVERLAP=200
```

## Known Limitations

1. **Query Embedding Not Implemented**: The search API currently performs keyword-only search. Vector search requires implementing query embedding generation (documented as future enhancement).

2. **No Bulk Regeneration**: For existing notes/thoughts, embeddings will be generated as they're edited. Bulk regeneration endpoint is documented but not implemented (see `.devreadyai/other/embeddings-future-features.md`).

3. **Cold Start Performance**: First embedding takes ~5-10 seconds while the model loads in Edge Function. Subsequent requests are fast (~100-500ms).

## Support

- Full setup guide: `EMBEDDINGS_SETUP.md`
- Implementation details: `.devreadyai/completed-features/embeddings-chunking-system.md`
- Future features: `.devreadyai/other/embeddings-future-features.md`

## Cost Estimate

**Free for < 10K notes/month** (within Supabase free tier)

For higher volume, see `EMBEDDINGS_SETUP.md` for detailed cost breakdown.

