# Generic Inbound Webhook Feature - Setup Guide

## Overview

The generic inbound webhook system allows users to receive data from external services (Zapier, Make.com, CRM systems, transcription services, etc.) and automatically:
- **Capture** payloads as Notes
- **Classify** content using AI (headers + content analysis)
- **Route** to suggested folders
- **Tag** with AI-suggested tags
- **Index** for fast search via embeddings

### Architecture

```
External Service (Zapier, Make.com, etc.)
    ↓
POST /api/webhooks/inbound/{token}
    ↓
Create Note + WebhookProcessingJob (immediate response)
    ↓
Database webhook triggers Edge Function
    ↓
AI Classification → Folder Routing → Tag Suggestions → Embeddings
    ↓
Note ready for search and organization
```

## Prerequisites

1. **Supabase Project** with:
   - PostgreSQL database (Postgres 14+)
   - Edge Functions enabled
   - Service role key access

2. **OpenAI API Key** (for AI classification and tag suggestions)

3. **Database Migration** - Run the webhook migration:
   ```bash
   npx prisma migrate dev --name add_webhook_endpoints
   ```

## Environment Variables

No new environment variables required! The webhook feature uses existing configuration:

```env
# Already configured
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

## Database Setup

### 1. Run Migration

The migration `20251119222231_add_webhook_endpoints` adds:

**New Models:**
- `WebhookEndpoint` - User's webhook endpoint configuration
- `WebhookProcessingJob` - Background job queue for processing webhooks

**Updated Models:**
- `Note` - Added `meta` JSON field for webhook metadata and classification

**Run the migration:**
```bash
npx prisma migrate dev --name add_webhook_endpoints
```

### 2. Verify Schema

After migration, verify the tables exist:
```sql
-- Check WebhookEndpoint table
SELECT * FROM "WebhookEndpoint" LIMIT 1;

-- Check WebhookProcessingJob table
SELECT * FROM "WebhookProcessingJob" LIMIT 1;

-- Check Note.meta field exists
SELECT id, title, meta FROM "Note" WHERE meta IS NOT NULL LIMIT 1;
```

## Supabase Edge Function Setup

### 1. Deploy Edge Function

Deploy the `process-webhook` edge function:

```bash
# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Deploy the function
npx supabase functions deploy process-webhook
```

### 2. Set Edge Function Secrets

Set required environment variables for the edge function:

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set OPENAI_MODEL=gpt-4o-mini
npx supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Or via Supabase Dashboard:**
1. Go to **Project Settings** → **Edge Functions**
2. Select `process-webhook`
3. Add secrets:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Database Webhook Configuration

Configure Supabase to trigger the edge function when webhook jobs are created.

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to **Database** → **Webhooks** in Supabase Dashboard
2. Click **Create a new webhook**
3. Configure:
   - **Name**: `webhook-processing-trigger`
   - **Table**: `WebhookProcessingJob`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/process-webhook`
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **Filter**: `status = 'PENDING'` (optional, but recommended)

### Option 2: Via SQL (Alternative)

```sql
-- Create database webhook trigger
CREATE OR REPLACE FUNCTION trigger_webhook_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process PENDING jobs
  IF NEW.status = 'PENDING' THEN
    -- Call edge function via HTTP
    PERFORM
      net.http_post(
        url := 'https://your-project-ref.supabase.co/functions/v1/process-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'WebhookProcessingJob',
          'record', row_to_json(NEW)
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER webhook_processing_trigger
  AFTER INSERT ON "WebhookProcessingJob"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_webhook_processing();
```

**Note**: The SQL approach requires `pg_net` extension. Supabase Dashboard method is simpler.

## Testing and Verification

### 1. Create a Webhook Endpoint

Via UI:
1. Navigate to `/nabu/webhooks`
2. Click **Create Webhook**
3. Enter name and description
4. Copy the webhook URL

Via API:
```bash
curl -X POST http://localhost:3000/api/nabu/webhooks \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Test Webhook",
    "description": "Testing webhook integration"
  }'
```

### 2. Test Webhook Reception

Send a test payload to your webhook URL:

```bash
curl -X POST https://your-app-url.com/api/webhooks/inbound/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "This is a test webhook payload",
    "source": "test-service"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Webhook received"
}
```

### 3. Verify Note Creation

Check that a Note was created:
1. Go to `/nabu/notes`
2. Look for a note with title "Test Note"
3. Check the note's `meta` field contains webhook metadata

### 4. Verify Background Processing

Check the `WebhookProcessingJob` table:

```sql
SELECT 
  id,
  status,
  "noteId",
  "webhookEndpointId",
  error,
  "createdAt",
  "updatedAt"
FROM "WebhookProcessingJob"
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Expected Status Flow:**
- `PENDING` → `PROCESSING` → `COMPLETED`

### 5. Check Classification

Verify the Note was classified:

```sql
SELECT 
  id,
  title,
  content,
  meta->'classification' as classification
FROM "Note"
WHERE meta->>'source' = 'WEBHOOK'
ORDER BY "createdAt" DESC
LIMIT 5;
```

### 6. Verify Tag Suggestions

Check if tag suggestions were created:

```sql
SELECT 
  tsj.id,
  tsj."entityId",
  tsj.status,
  tsj."suggestedTags",
  tsj.confidence
FROM "TagSuggestionJob" tsj
WHERE tsj."entityType" = 'NOTE'
  AND tsj."entityId" IN (
    SELECT id FROM "Note" 
    WHERE meta->>'source' = 'WEBHOOK'
    ORDER BY "createdAt" DESC
    LIMIT 1
  );
```

## Integration Examples

### Zapier

1. Create a new Zap
2. Choose your trigger (e.g., "New Email", "New Form Entry")
3. Add **Webhooks by Zapier** → **POST** action
4. URL: `https://your-app-url.com/api/webhooks/inbound/YOUR_TOKEN`
5. Method: POST
6. Data: Map your trigger data to JSON

**Example Zapier Webhook Payload:**
```json
{
  "title": "New Form Submission",
  "content": "Name: John Doe\nEmail: john@example.com\nMessage: Hello!",
  "source": "zapier-form"
}
```

### Make.com (Integromat)

1. Create a new scenario
2. Add your trigger module
3. Add **HTTP** → **Make a Request** module
4. URL: `https://your-app-url.com/api/webhooks/inbound/YOUR_TOKEN`
5. Method: POST
6. Body type: JSON
7. Body: Map your data

**Example Make.com Webhook Payload:**
```json
{
  "event": "customer_created",
  "data": {
    "name": "Acme Corp",
    "email": "contact@acme.com"
  }
}
```

### Custom Service

Any service that can send HTTP POST requests:

```bash
curl -X POST https://your-app-url.com/api/webhooks/inbound/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -H "X-Source: my-custom-service" \
  -H "X-Type: meeting-transcript" \
  -d '{
    "title": "Meeting Notes",
    "transcript": "Meeting discussion about project timeline..."
  }'
```

## Classification Types

The webhook classifier supports 10 content types:

1. **meeting_transcript** - Meeting notes and transcripts
2. **call_transcript** - Phone call recordings/transcripts
3. **system_log** - Application logs and monitoring data
4. **chat_export** - Slack, Discord, Teams chat exports
5. **crm_note** - CRM system notes (Salesforce, HubSpot, etc.)
6. **ticket_update** - Support ticket updates (Zendesk, Intercom, etc.)
7. **analytics_event** - Analytics and tracking events
8. **calendar_event** - Calendar events and reminders
9. **email_forward** - Email forwards and notifications
10. **generic_doc** - Generic documents (fallback)

Classification uses:
- **Header analysis** (fast, no AI) - Checks `X-Source`, `X-Type`, `User-Agent`, etc.
- **Content analysis** (AI-powered) - Analyzes payload content for keywords and patterns

## Troubleshooting

### Webhook Returns 404

**Issue**: Webhook endpoint not found

**Solutions:**
- Verify the token in the URL matches the token in `WebhookEndpoint` table
- Check that `isActive = true` and `deletedAt IS NULL`
- Ensure the webhook endpoint belongs to the correct user/tenant

### Note Created but Not Processed

**Issue**: `WebhookProcessingJob` stuck in `PENDING` status

**Solutions:**
- Check database webhook is configured correctly
- Verify edge function is deployed: `npx supabase functions list`
- Check edge function logs: `npx supabase functions logs process-webhook`
- Verify edge function secrets are set correctly

### Classification Not Working

**Issue**: Note created but `meta.classification` is missing

**Solutions:**
- Check edge function logs for errors
- Verify `OPENAI_API_KEY` is set in edge function secrets
- Check `WebhookProcessingJob.error` field for details
- Ensure payload has enough content for classification

### Tag Suggestions Not Appearing

**Issue**: No tag suggestions after webhook processing

**Solutions:**
- Verify content length >= 200 characters (minimum for tag suggestions)
- Check `TagSuggestionJob` table for job status
- Verify tag suggestion edge function is deployed and configured
- Check `Note.tagSuggestionStatus` field

### Embeddings Not Generated

**Issue**: Note not appearing in semantic search

**Solutions:**
- Verify embedding system is set up (see `EMBEDDINGS_SETUP.md`)
- Check `EmbeddingJob` table for pending jobs
- Ensure note content is substantial enough for embedding
- Verify embedding edge function is deployed

## Monitoring

### Check Webhook Stats

```sql
-- Webhook endpoint statistics
SELECT 
  we.id,
  we.name,
  we.token,
  we."isActive",
  COUNT(wpj.id) as total_received,
  COUNT(CASE WHEN wpj.status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN wpj.status = 'FAILED' THEN 1 END) as failed,
  MAX(wpj."createdAt") as last_received
FROM "WebhookEndpoint" we
LEFT JOIN "WebhookProcessingJob" wpj ON wpj."webhookEndpointId" = we.id
WHERE we."deletedAt" IS NULL
GROUP BY we.id, we.name, we.token, we."isActive"
ORDER BY last_received DESC;
```

### Check Processing Performance

```sql
-- Average processing time
SELECT 
  AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))) as avg_processing_seconds,
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed
FROM "WebhookProcessingJob"
WHERE "createdAt" > NOW() - INTERVAL '24 hours';
```

### Check Classification Distribution

```sql
-- Classification type distribution
SELECT 
  meta->'classification'->>'type' as classification_type,
  COUNT(*) as count
FROM "Note"
WHERE meta->>'source' = 'WEBHOOK'
  AND meta->'classification' IS NOT NULL
GROUP BY classification_type
ORDER BY count DESC;
```

## Security Considerations

1. **Token Security**
   - Tokens are cryptographically secure (32-byte random)
   - Never expose tokens in logs or error messages
   - Rotate tokens if compromised

2. **Rate Limiting** (Future Enhancement)
   - Consider implementing per-webhook-endpoint rate limits
   - Monitor for abuse patterns

3. **Payload Size Limits**
   - Current limit: ~10MB (Next.js default)
   - Large payloads may timeout

4. **IP Allowlisting** (Future Enhancement)
   - Optionally restrict webhook endpoints to specific IPs
   - Useful for enterprise integrations

## Next Steps

1. ✅ Run database migration
2. ✅ Deploy edge function
3. ✅ Configure database webhook
4. ✅ Test with sample payload
5. ✅ Integrate with external services (Zapier, Make.com, etc.)
6. ✅ Monitor webhook performance
7. ✅ Customize classification rules if needed

## Support

For issues or questions:
- Check edge function logs: `npx supabase functions logs process-webhook`
- Check database logs in Supabase Dashboard
- Review `WebhookProcessingJob.error` field for processing errors
- Verify all environment variables are set correctly

