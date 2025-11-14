# Embeddings System - Future Features

This document outlines potential future enhancements for the embeddings system.

## Bulk Regeneration Endpoint

### Purpose
Allow administrators to regenerate embeddings for all existing notes and thoughts. Useful for:
- Initial setup after deploying the embeddings system
- Migrating to a different embedding model
- Recovering from embedding generation failures
- Performance tuning and optimization

### Implementation Design

#### Endpoint: `POST /api/nabu/embeddings/regenerate`

**Request Body:**
```json
{
  "entityType": "NOTE" | "THOUGHT" | "ALL",
  "batchSize": 50,
  "onlyMissing": false // If true, only regenerate for entities without chunks
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk regeneration started",
  "stats": {
    "totalNotes": 150,
    "totalThoughts": 75,
    "jobsEnqueued": 225
  }
}
```

#### Implementation Steps

1. **Query Strategy**: Paginate through all notes/thoughts
   ```typescript
   // Process in batches to avoid memory issues
   const batchSize = 50;
   let offset = 0;
   
   while (true) {
     const notes = await prisma.note.findMany({
       where: { deletedAt: null },
       take: batchSize,
       skip: offset,
       select: { id: true, title: true, content: true, contentState: true, userId: true, tenantId: true },
     });
     
     if (notes.length === 0) break;
     
     for (const note of notes) {
       await enqueueNoteEmbeddingJobs(...);
     }
     
     offset += batchSize;
   }
   ```

2. **Rate Limiting**: Implement throttling to avoid overwhelming the Edge Function
   - Add delays between batches
   - Monitor Edge Function cold starts
   - Consider using a background job queue (BullMQ, Inngest, etc.)

3. **Progress Tracking**: Store regeneration progress in database
   ```prisma
   model EmbeddingRegenerationJob {
     id String @id @default(cuid())
     status JobStatus
     entityType String
     totalCount Int
     processedCount Int
     failedCount Int
     startedAt DateTime
     completedAt DateTime?
   }
   ```

4. **Error Handling**: Track and report failures
   - Log failed entities
   - Provide retry mechanism
   - Email admin on completion with summary

### Security Considerations

- **Authentication**: Require admin role
- **Rate Limiting**: Prevent abuse with rate limits
- **Monitoring**: Track resource usage and costs

---

## Migration Strategy for Existing Data

### Scenario: First-Time Deployment

When deploying the embeddings system to production with existing notes and thoughts:

1. **Deploy Migration**: Run the database migration to create chunk tables
2. **Deploy Application Code**: Update API routes with embedding logic
3. **Deploy Edge Function**: Deploy the `generate-embedding` function
4. **Configure Webhook**: Set up database webhook in Supabase
5. **Test with Single Note**: Create a new note and verify embeddings are generated
6. **Bulk Regeneration**: Call the bulk regeneration endpoint for existing data

### Scenario: Model Upgrade

When switching to a different embedding model (e.g., from 384 to 768 dimensions):

1. **Update Schema**: Modify vector dimensions in database
   ```sql
   ALTER TABLE "NoteChunk" ALTER COLUMN embedding TYPE vector(768);
   ALTER TABLE "ThoughtChunk" ALTER COLUMN embedding TYPE vector(768);
   ```

2. **Update Configuration**: Change `EMBEDDING_MODEL` and `EMBEDDING_DIMENSIONS` env vars
3. **Rebuild Indexes**: Drop and recreate ivfflat indexes
   ```sql
   DROP INDEX note_chunk_embedding_idx;
   CREATE INDEX note_chunk_embedding_idx ON "NoteChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ```

4. **Regenerate Embeddings**: Use bulk regeneration endpoint
5. **Monitor Performance**: Compare search quality before/after

---

## Performance Optimization Strategies

### 1. Index Tuning

**IVFFLAT Lists Parameter**: Adjust based on data size
- Small datasets (< 1K vectors): `lists = 10`
- Medium datasets (1K - 100K vectors): `lists = 100`
- Large datasets (> 100K vectors): `lists = sqrt(rows)`

**Rebuild Indexes Periodically**: After significant data growth
```sql
REINDEX INDEX note_chunk_embedding_idx;
VACUUM ANALYZE "NoteChunk";
```

### 2. Chunking Optimization

**Experiment with Chunk Sizes**:
- Smaller chunks (1000 chars): More granular results, higher storage costs
- Larger chunks (3000 chars): Less granular, lower costs
- Measure retrieval quality vs. cost tradeoff

**Smart Chunking**:
- Respect semantic boundaries (paragraphs, sections)
- Use NLP libraries for sentence tokenization
- Consider document structure (headers, lists)

### 3. Search Performance

**Hybrid Search Weighting**:
- Adjust keyword vs. vector weight based on use case
- A/B test different ratios (60/40, 50/50, 70/30)
- Consider query-specific weights (short queries → more keywords)

**Caching**:
- Cache popular search queries
- Pre-compute embeddings for common search terms
- Use Redis for embedding cache

### 4. Cost Optimization

**Lazy Embedding Generation**:
- Don't generate embeddings for short notes (< 100 chars)
- Skip embeddings for drafts/temporary notes
- Implement TTL for old, unused embeddings

**Edge Function Cold Starts**:
- Keep functions warm with periodic pings
- Use Supabase Edge Function logs to monitor performance
- Consider dedicated compute for high-volume workloads

---

## Re-embedding with Different Models

### Supported Models

Current: `Xenova/all-MiniLM-L6-v2` (384 dimensions)

Alternative models from transformers.js:
- `Xenova/all-mpnet-base-v2` - 768 dimensions, higher quality
- `Xenova/bert-base-uncased` - 768 dimensions, good for English
- `Xenova/multilingual-e5-small` - 384 dimensions, multilingual support

### Migration Process

1. **Test in Staging**: Create test notes and compare search quality
2. **Benchmark Performance**: Measure embedding generation time
3. **Estimate Costs**: Calculate Edge Function usage for full regeneration
4. **Update Configuration**: Change `EMBEDDING_MODEL` in env vars
5. **Regenerate Embeddings**: Run bulk regeneration
6. **Verify Search Quality**: Run test queries and validate results
7. **Monitor Production**: Track search satisfaction metrics

---

## Advanced Features (Long-term)

### 1. Semantic Clustering

**Goal**: Automatically group related notes and thoughts

**Approach**:
- Use K-means clustering on embeddings
- Create "topic clusters" for related content
- Surface clusters in UI for discovery

### 2. Recommendation Engine

**Goal**: Suggest related notes while writing

**Approach**:
- Generate embedding for current note content
- Find similar notes using vector similarity
- Display as "Related Notes" sidebar

### 3. Auto-summarization

**Goal**: Generate summaries using embeddings + LLM

**Approach**:
- Use embeddings to find key sections
- Pass sections to LLM for summarization
- Store summary in `Note.summary` field

### 4. Multi-modal Embeddings

**Goal**: Support images, PDFs, and other attachments

**Approach**:
- Use CLIP for image embeddings
- OCR + text embeddings for PDFs
- Store in separate `AttachmentChunk` table

---

## Monitoring and Observability

### Key Metrics to Track

1. **Embedding Generation**
   - Jobs processed per hour
   - Average generation time
   - Failure rate
   - Queue depth

2. **Search Performance**
   - Query latency (p50, p95, p99)
   - Result relevance (user feedback)
   - Cache hit rate

3. **Resource Usage**
   - Edge Function invocations
   - Database storage (chunk tables)
   - Vector index size

### Alerts to Configure

- High failure rate (> 5%)
- Slow embedding generation (> 5s per chunk)
- Large queue backlog (> 1000 pending jobs)
- Database storage exceeding limits

---

## Cost Estimation

### Storage Costs

- Vector dimensions: 384 floats × 4 bytes = 1.5 KB per embedding
- Average note: 3 chunks = 4.5 KB per note
- 10,000 notes = 45 MB vector data
- PostgreSQL storage: ~$0.023/GB/month (Supabase pricing)

### Compute Costs

- Supabase Edge Functions: Free tier includes 500K requests/month
- Beyond free tier: ~$0.50 per 1M requests
- Estimated cost for 10K notes: < $1/month

### Scaling Considerations

- 100K notes: ~450 MB storage, ~$10/month compute
- 1M notes: ~4.5 GB storage, ~$100/month compute
- Consider dedicated infrastructure for > 1M notes

