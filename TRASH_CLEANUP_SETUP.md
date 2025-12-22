# Trash Cleanup Background Job Setup

This document explains how to set up the background job system that automatically deletes notes after 60 days in trash.

## Overview

Notes that have been soft-deleted (marked with `deletedAt`) are automatically and permanently deleted after 60 days:

- **Soft Delete**: User deletes note → `deletedAt` timestamp set
- **Grace Period**: 60 days to restore from trash
- **Permanent Deletion**: Background job runs daily, removes notes older than 60 days

## Architecture

```
User deletes note
    ↓
Soft delete (deletedAt set)
    ↓
[60 day grace period]
    ↓
pg_cron triggers Edge Function (daily at 2 AM UTC)
    ↓
Edge Function finds old deleted notes
    ↓
Check file references (Attachments & ImageAttachments)
    ↓
Delete unreferenced files from Supabase storage
    ↓
Hard delete database records (Note, Chunks, Tags, Links)
    ↓
Log to AuditLog
```

## Components

### 1. Database Schema

Added `deletedBy` field to `Note` and `Attachment` models for audit trail:

```prisma
model Note {
  // ... other fields ...
  deletedAt DateTime?
  deletedBy String?
  // ... other fields ...
}

model Attachment {
  // ... other fields ...
  deletedAt DateTime?
  deletedBy String?
  // ... other fields ...
}
```

### 2. Edge Function

**Location**: `supabase/functions/process-trash-cleanup/index.ts`

**Purpose**:
- Queries for notes where `deletedAt < NOW() - 60 days`
- For each note:
  - Finds associated Attachments and ImageAttachments
  - Checks if files are referenced by other active notes/thoughts
  - Deletes unreferenced files from Supabase storage
  - Hard deletes database records (bypasses soft-delete middleware)
  - Creates audit log entries
- Processes tenants in parallel (up to 5 concurrent)
- Limits to 20 notes per tenant per run

**Triggered by**: pg_cron daily at 2 AM UTC

### 3. File Reference Checking

Before deleting a file, the edge function checks if it's referenced by:
- Any other active (non-deleted) notes
- Any active thoughts

Only unreferenced files are deleted from storage.

## Setup Instructions

### Prerequisites

- Supabase project set up
- `SUPABASE_SERVICE_ROLE_KEY` environment variable configured
- pg_cron extension enabled
- Edge Function is standalone - no Next.js API dependency

### Step 1: Apply Database Migration

Apply the migration for the `deletedBy` fields:

```bash
npx prisma migrate deploy
```

Migration file: `20251119075746_add_deleted_by_to_note_and_attachment`

### Step 2: Deploy Edge Function

Deploy the Edge Function to Supabase:

```bash
npx supabase functions deploy process-trash-cleanup
```

**Note**: Ensure you have the Supabase CLI installed and authenticated.

### Step 3: Set Environment Variables

In your Supabase project settings, add the following environment variables for the Edge Function:

```bash
# Supabase Dashboard → Settings → Edge Functions → Secrets
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Step 4: Enable pg_cron Extension

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Search for `pg_cron`
4. Click **Enable** (if not already enabled)

### Step 5: Create Cron Job

Connect to your Supabase database using the SQL Editor and run:

```sql
-- Create cron job to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-deleted-notes',              -- Job name
  '0 2 * * *',                              -- Cron expression (2 AM UTC daily)
  $$
  SELECT
    net.http_post(
      url := '<your-edge-function-url>/process-trash-cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <your-anon-key>'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

**Replace**:
- `<your-edge-function-url>`: Your Supabase Edge Functions URL (e.g., `https://abcdefghijklmnop.supabase.co/functions/v1`)
- `<your-anon-key>`: Your Supabase anon key (found in Project Settings → API)

### Step 6: Verify Cron Job

Check that the cron job was created successfully:

```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-deleted-notes';
```

### Step 7: Monitor Execution

View cron job execution history:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-deleted-notes')
ORDER BY start_time DESC
LIMIT 10;
```

## How It Works

### Deletion Flow

1. **Daily at 2 AM UTC**, the cron job triggers
2. Edge function calculates cutoff date: `NOW() - 60 days`
3. Queries for notes where `deletedAt < cutoffDate`
4. Groups notes by tenant for parallel processing
5. For each note:
   - Fetch all Attachments and ImageAttachments
   - Check if each file is referenced by other active entities
   - Delete unreferenced files from Supabase storage
   - Delete NoteChunks (cascade via FK)
   - Delete NoteTags (cascade via FK)
   - Delete NoteLinks (from/to)
   - Delete EmbeddingJobs
   - Delete unreferenced Attachments
   - Delete unreferenced ImageAttachments
   - Hard delete the Note record
   - Create audit log entry
6. Process up to 20 notes per tenant per run
7. Process up to 5 tenants concurrently

### Example Timeline

```
Jan 1  - User deletes note → deletedAt = Jan 1
Jan 15 - Note appears in trash, can be restored
Feb 1  - Still in trash (30 days)
Feb 15 - Still in trash (45 days)
Mar 2  - Still in trash (60 days) → Will be deleted tomorrow
Mar 3  - Cron runs at 2 AM UTC → Note is 61 days old → Permanently deleted
```

## Monitoring

### Check Edge Function Logs

```bash
npx supabase functions logs process-trash-cleanup
```

### Check Notes Pending Deletion

See how many notes will be deleted soon:

```sql
SELECT COUNT(*) 
FROM "Note" 
WHERE "deletedAt" < NOW() - INTERVAL '60 days'
  AND "deletedAt" IS NOT NULL;
```

### Check Recent Audit Logs

```sql
SELECT * FROM "AuditLog"
WHERE "createdBy" = 'system:trash-cleanup'
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC
LIMIT 50;
```

### Check Files by Note

See attachments for a specific note:

```sql
SELECT 
  a.id, a.fileName, a.noteId, a.thoughtId, a.deletedAt
FROM "Attachment" a
WHERE a.noteId = '<note-id>';

SELECT 
  i.id, i.filename, i.noteId, i.storagePath, i.deletedAt
FROM "ImageAttachment" i
WHERE i.noteId = '<note-id>';
```

## Troubleshooting

### Cron job not running

1. Check if pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check cron job status:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-old-deleted-notes';
   ```

3. Check execution logs:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-deleted-notes')
   ORDER BY start_time DESC;
   ```

### Edge Function errors

1. Check Edge Function logs in Supabase Dashboard
2. Verify environment variables are set correctly
3. Test Edge Function manually:
   ```bash
   curl -X POST https://<your-project>.supabase.co/functions/v1/process-trash-cleanup \
     -H "Authorization: Bearer <your-anon-key>"
   ```

### Files not being deleted

1. Verify files exist in storage
2. Check if files are referenced by other notes/thoughts
3. Review edge function logs for storage deletion errors
4. Verify storage bucket permissions

### Notes not being deleted

1. Check that notes have `deletedAt` set
2. Verify notes are older than 60 days
3. Check edge function execution logs
4. Review audit logs for deletion records

## Cleanup

To remove the cron job:

```sql
SELECT cron.unschedule('cleanup-old-deleted-notes');
```

To manually trigger cleanup (for testing):

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/process-trash-cleanup \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json"
```

## Configuration

### Adjust Retention Period

To change the 60-day retention period, edit `RETENTION_DAYS` in the edge function:

```typescript
// In supabase/functions/process-trash-cleanup/index.ts
const RETENTION_DAYS = 60; // Change this value
```

Then redeploy:
```bash
npx supabase functions deploy process-trash-cleanup
```

### Adjust Batch Sizes

```typescript
const MAX_NOTES_PER_RUN = 20;        // Notes per tenant per run
const MAX_CONCURRENT_TENANTS = 5;    // Parallel tenant processing
```

## Cost Considerations

- **Cron Job Frequency**: Running daily = 30-31 executions/month
- **Edge Function Invocations**: ~30/month (lightweight)
- **Storage Operations**: Depends on number of files deleted
- **Database Operations**: Optimized with batch processing and tenant parallelization


