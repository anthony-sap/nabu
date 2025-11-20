# Database Webhooks Setup Guide

This document consolidates all database webhooks that need to be configured across all setup guides. Use this as a quick reference to ensure all webhooks are properly configured.

## Overview

Database webhooks in Supabase automatically trigger Edge Functions when specific database events occur. This document lists all webhooks required for the Nabu application.

**Project Reference**: `ihnthvgzawryjhtnulce`  
**Base URL**: `https://ihnthvgzawryjhtnulce.supabase.co`

---

## Required Webhooks

### 1. Tag Suggestion Processing

**Purpose**: Automatically process tag suggestion jobs when they are created.

**Configuration**:
- **Name**: `process-tag-suggestion-on-insert`
- **Table**: `TagSuggestionJob`
- **Events**: `INSERT` only
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://ihnthvgzawryjhtnulce.supabase.co/functions/v1/process-tag-suggestion`
- **HTTP Headers**:
  ```
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  ```
- **HTTP Parameters**: Send `record`
- **Filter**: None (processes all INSERT events)

**Setup Location**: `TAG_SUGGESTION_SETUP.md` → Section "Database Webhook Configuration"

**Edge Function**: `process-tag-suggestion`

**Status**: ⬜ Not Configured / ✅ Configured

---

### 2. Embedding Generation

**Purpose**: Automatically generate embeddings when embedding jobs are created.

**Configuration**:
- **Name**: `trigger-embedding-generation`
- **Table**: `EmbeddingJob`
- **Events**: `INSERT` only
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://ihnthvgzawryjhtnulce.supabase.co/functions/v1/generate-embedding`
- **HTTP Headers**:
  ```
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  ```
- **Payload**: Send all columns
- **Filter**: None (processes all INSERT events)

**Setup Location**: `EMBEDDINGS_SETUP.md` → Section "Database Webhook Configuration"

**Edge Function**: `generate-embedding`

**Status**: ⬜ Not Configured / ✅ Configured

---

### 3. Webhook Processing

**Purpose**: Process incoming webhook payloads (classification, routing, tagging, embeddings).

**Configuration**:
- **Name**: `webhook-processing-trigger`
- **Table**: `WebhookProcessingJob`
- **Events**: `INSERT` only
- **Type**: HTTP Request
- **Method**: POST
- **URL**: `https://ihnthvgzawryjhtnulce.supabase.co/functions/v1/process-webhook`
- **HTTP Headers**:
  ```
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
  Content-Type: application/json
  ```
- **Filter**: `status = 'PENDING'` (optional, but recommended)

**Setup Location**: `WEBHOOK_SETUP.md` → Section "Database Webhook Configuration"

**Edge Function**: `process-webhook`

**Status**: ⬜ Not Configured / ✅ Configured

---

## Setup Instructions

### Quick Setup (Supabase Dashboard)

1. Navigate to **Database** → **Webhooks** in Supabase Dashboard
2. For each webhook listed above:
   - Click **"Create a new webhook"**
   - Configure according to the specifications above
   - Click **Save**

### Verification

After setting up each webhook, verify it's working:

#### Test Tag Suggestion Webhook

```sql
-- Create a test tag suggestion job
INSERT INTO "TagSuggestionJob" (
  id, "userId", "entityType", "entityId", content, status
) VALUES (
  'test-job-id',
  'your-user-id',
  'NOTE',
  'your-note-id',
  'This is test content about machine learning and AI',
  'PENDING'
);

-- Check if job was processed (status should change to PROCESSING/COMPLETED)
SELECT id, status, "updatedAt" 
FROM "TagSuggestionJob" 
WHERE id = 'test-job-id';
```

#### Test Embedding Webhook

```sql
-- Create a test embedding job
INSERT INTO "EmbeddingJob" (
  id, "userId", "entityType", "entityId", "chunkId", "chunkIndex", content, status
) VALUES (
  'test-embedding-id',
  'your-user-id',
  'NOTE',
  'your-note-id',
  'test-chunk-id',
  0,
  'This is test content for embedding generation',
  'PENDING'
);

-- Check if job was processed
SELECT id, status, "updatedAt" 
FROM "EmbeddingJob" 
WHERE id = 'test-embedding-id';
```

#### Test Webhook Processing

```sql
-- Create a test webhook processing job
INSERT INTO "WebhookProcessingJob" (
  id, "webhookEndpointId", "userId", headers, body, method, status
) VALUES (
  'test-webhook-job-id',
  'your-webhook-endpoint-id',
  'your-user-id',
  '{}'::jsonb,
  '{"title": "Test", "content": "Test content"}'::jsonb,
  'POST',
  'PENDING'
);

-- Check if job was processed
SELECT id, status, "noteId", error, "updatedAt" 
FROM "WebhookProcessingJob" 
WHERE id = 'test-webhook-job-id';
```

---

## Edge Functions Required

Ensure these Edge Functions are deployed before configuring webhooks:

1. ✅ `process-tag-suggestion` - Tag suggestion processing
2. ✅ `generate-embedding` - Embedding generation
3. ✅ `process-webhook` - Webhook payload processing

**Deploy commands**:
```bash
npx supabase functions deploy process-tag-suggestion
npx supabase functions deploy generate-embedding
npx supabase functions deploy process-webhook
```

---

## Edge Function Secrets

All Edge Functions require these secrets to be set:

```bash
# Set secrets for each function
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
npx supabase secrets set SUPABASE_URL=https://ihnthvgzawryjhtnulce.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note**: Secrets are set per-function. Set them for each Edge Function individually.

---

## Troubleshooting

### Webhook Not Firing

1. **Check webhook configuration**:
   - Verify table name matches exactly (case-sensitive)
   - Verify event type is correct (INSERT)
   - Check URL is correct
   - Verify Authorization header uses SERVICE_ROLE_KEY (not anon key)

2. **Check Edge Function**:
   - Verify function is deployed: `npx supabase functions list`
   - Check function logs: `npx supabase functions logs <function-name>`
   - Verify secrets are set correctly

3. **Test manually**:
   ```bash
   curl -X POST https://ihnthvgzawryjhtnulce.supabase.co/functions/v1/<function-name> \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"type": "INSERT", "table": "<TableName>", "record": {...}}'
   ```

### Webhook Firing But Job Not Processing

1. **Check job status**:
   ```sql
   SELECT id, status, error, "updatedAt" 
   FROM "<JobTable>" 
   WHERE status = 'PENDING' 
   ORDER BY "createdAt" DESC 
   LIMIT 10;
   ```

2. **Check Edge Function logs**:
   ```bash
   npx supabase functions logs <function-name> --tail
   ```

3. **Verify secrets**:
   - Check that all required secrets are set
   - Verify SERVICE_ROLE_KEY has proper permissions

### Multiple Webhooks Firing

If you see duplicate processing:
- Check if multiple webhooks are configured for the same table/event
- Verify filter conditions are correct
- Check for duplicate Edge Function deployments

---

## Webhook Status Checklist

Use this checklist to track which webhooks are configured:

- [ ] **Tag Suggestion Processing** (`TagSuggestionJob` → `process-tag-suggestion`)
- [ ] **Embedding Generation** (`EmbeddingJob` → `generate-embedding`)
- [ ] **Webhook Processing** (`WebhookProcessingJob` → `process-webhook`)

---

## Related Documentation

- **Tag Suggestions**: See `TAG_SUGGESTION_SETUP.md`
- **Embeddings**: See `EMBEDDINGS_SETUP.md`
- **Webhooks**: See `WEBHOOK_SETUP.md`
- **Background Jobs** (pg_cron, not webhooks):
  - Embeddings Background Job: See `EMBEDDINGS_BACKGROUND_JOB_SETUP.md`
  - Trash Cleanup: See `TRASH_CLEANUP_SETUP.md`

---

## Notes

- **Service Role Key**: Always use SERVICE_ROLE_KEY in Authorization header (not anon key)
- **Case Sensitivity**: Table names are case-sensitive in PostgreSQL
- **Filter Conditions**: Optional filters can improve performance by reducing unnecessary triggers
- **Testing**: Always test webhooks with sample data before relying on them in production

---

## Quick Reference: All Webhooks Summary

| Webhook Name | Table | Event | Edge Function | Status |
|-------------|-------|-------|---------------|--------|
| `process-tag-suggestion-on-insert` | `TagSuggestionJob` | INSERT | `process-tag-suggestion` | ⬜ |
| `trigger-embedding-generation` | `EmbeddingJob` | INSERT | `generate-embedding` | ⬜ |
| `webhook-processing-trigger` | `WebhookProcessingJob` | INSERT | `process-webhook` | ⬜ |

---

**Last Updated**: 2024-11-19  
**Project**: Nabu  
**Supabase Project Ref**: `ihnthvgzawryjhtnulce`


