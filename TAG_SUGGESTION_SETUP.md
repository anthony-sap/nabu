# Tag Suggestion System - Setup Guide

## Overview

The AI-powered tag suggestion system automatically analyzes note and thought content to suggest relevant tags. It uses:
- **Database-based job queue** for orchestration
- **Supabase Edge Functions** for AI processing
- **Database webhooks** for instant, event-driven processing
- **OpenAI API** for generating tag suggestions

## Features

- ✨ **Auto-suggest tags** when content reaches 200+ characters
- ⏱️ **5-minute cooldown** prevents over-suggestion
- 🎨 **Visual differentiation** between user-added and AI-suggested tags
- 🎯 **Confidence scores** displayed for each suggestion
- 🔄 **Real-time polling** for job status updates
- 📋 **Accept/reject** interface for managing suggestions

## Prerequisites

1. **Supabase Project** - for Edge Functions and database webhooks
2. **OpenAI API Key** - for GPT-4o-mini tag generation
3. **Database** - PostgreSQL with Prisma

## Environment Variables

Add these to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Tag Suggestion Settings
TAG_SUGGESTION_MIN_CHARS=200
TAG_SUGGESTION_MAX_TAGS=5
TAG_SUGGESTION_COOLDOWN_MINUTES=5

# Supabase (for Edge Functions)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Schema

The migration `20251112034231_add_tag_suggestion_system` adds:

### New Enums
- `JobStatus`: PENDING, PROCESSING, COMPLETED, FAILED
- `TagSource`: USER_ADDED, AI_SUGGESTED

### New Table: TagSuggestionJob
Tracks AI tag generation jobs with status, results, and error handling.

### Updated Models
- `Note`: Added `tagSuggestionStatus`, `lastTagSuggestionAt`, `lastTagModifiedAt`, `pendingJobId`
- `Thought`: Added same fields as Note
- `NoteTag`: Added `source` field to differentiate user vs AI tags

## Supabase Edge Function Setup

### 1. Install Supabase CLI

**Option A: Using npm (recommended if you have Node.js)**
```bash
npm install -g supabase
```

If you get permission errors on Windows, try running PowerShell as Administrator.

**Option B: Using npx (no global install needed)**
```bash
npx supabase <command>
```
Replace `<command>` with any Supabase CLI command. This downloads and runs the CLI temporarily.

**Option C: Using Scoop (Windows)**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option D: Direct Download (Windows)**
1. Download the Windows binary from: https://github.com/supabase/cli/releases
2. Extract the executable
3. Add it to your PATH or run it directly

**Option E: Using Homebrew (Mac/Linux)**
```bash
brew install supabase/tap/supabase
```

**Verify Installation:**
```bash
supabase --version
```
Or with npx:
```bash
npx supabase --version
```

### 2. Link to Project
```bash
supabase link --project-ref your-project-ref
```
With npx: `npx supabase link --project-ref your-project-ref`

### 3. Set Secrets
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase secrets set DATABASE_URL=postgresql://...
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
With npx, prefix each command with `npx`, e.g., `npx supabase secrets set OPENAI_API_KEY=sk-...`

**Alternative: Set secrets via Supabase Dashboard**
1. Go to your project in Supabase Dashboard
2. Navigate to **Edge Functions → Secrets**
3. Add each secret via the UI

### 4. Deploy Function
```bash
supabase functions deploy process-tag-suggestion --no-verify-jwt
```
With npx: `npx supabase functions deploy process-tag-suggestion --no-verify-jwt`

> **Note for Windows users**: The `--no-verify-jwt` flag is often required for successful deployment on Windows systems.

**Alternative: Deploy via Supabase Dashboard**
1. Zip the `supabase/functions/process-tag-suggestion` folder
2. Go to **Edge Functions** in Dashboard
3. Click **Deploy new function**
4. Upload the zip file

### 5. Configure Database Webhook

In Supabase Dashboard → Database → Webhooks:

1. Click "Create a new hook"
2. Configure:
   - **Name**: `process-tag-suggestion-on-insert`
   - **Table**: `TagSuggestionJob`
   - **Events**: ✓ `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://your-project-ref.supabase.co/functions/v1/process-tag-suggestion`
   - **HTTP Headers**:
     ```json
     {
       "Authorization": "Bearer YOUR_ANON_KEY",
       "Content-Type": "application/json"
     }
     ```
   - **HTTP Parameters**: Send `record`

## API Endpoints

### POST /api/nabu/tag-suggestions
Create a new tag suggestion job.

**Request:**
```json
{
  "entityType": "NOTE",
  "entityId": "note-id",
  "content": "Note content..."
}
```

**Response (201):**
```json
{
  "jobId": "job-id",
  "status": "pending"
}
```

**Response (429 - Cooldown):**
```json
{
  "error": "cooldown_active",
  "retryAfter": 245
}
```

### GET /api/nabu/tag-suggestions/[jobId]
Get job status and results.

**Response:**
```json
{
  "id": "job-id",
  "status": "COMPLETED",
  "suggestedTags": ["machine learning", "AI", "python"],
  "confidence": 0.85,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### POST /api/nabu/tag-suggestions/[jobId]/accept
Accept suggested tags (partial or all).

**Request:**
```json
{
  "tagNames": ["machine learning", "AI"]
}
```

### POST /api/nabu/tag-suggestions/[jobId]/reject
Reject all suggestions.

## Usage Flow

1. **User creates/edits note** with 200+ characters
2. **Auto-save triggers** (3 seconds after last change)
3. **Eligibility check**:
   - Content >= 200 chars
   - < 3 existing tags
   - No pending job
   - Cooldown expired (5 min)
4. **Job created** → Webhook triggers Edge Function
5. **Edge Function**:
   - Calls OpenAI API
   - Parses tag suggestions
   - Updates job with results
6. **Frontend polls** job status every 3 seconds
7. **Notification appears** when completed
8. **User accepts/rejects** tags via modal

## UI Components

### TagBadge
Visual distinction between user-added and AI-suggested tags:
- **User tags**: Solid background, no icon
- **AI tags**: Dashed border, sparkle icon, lighter background

### TagSuggestionNotification
Pulsing badge showing count of suggested tags. Auto-dismisses after 30 seconds.

### TagSuggestionModal
Full modal for reviewing and accepting/rejecting suggested tags with confidence scores.

## Cooldown Logic

- Prevents re-suggestion within 5 minutes of last suggestion
- Manual tag edits reset cooldown
- Allows user to control when suggestions appear

## Error Handling

- **API rate limits**: Retries up to 3 times with exponential backoff
- **Invalid content**: Job marked as failed, entity cleaned up
- **Network errors**: Graceful degradation, doesn't block saves
- **User deleted entity**: 404 handled, job deleted

## Testing

### Test Locally
```bash
supabase functions serve process-tag-suggestion
```
With npx: `npx supabase functions serve process-tag-suggestion`

### Invoke Test
```bash
curl -X POST \
  'http://localhost:54321/functions/v1/process-tag-suggestion' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "INSERT",
    "table": "TagSuggestionJob",
    "record": {
      "id": "test-id",
      "userId": "user-id",
      "entityType": "NOTE",
      "entityId": "note-id",
      "content": "This is test content about machine learning and AI",
      "status": "PENDING"
    }
  }'
```

### Monitor Logs
```bash
supabase functions logs process-tag-suggestion
```
With npx: `npx supabase functions logs process-tag-suggestion`

Or in Dashboard: **Edge Functions → process-tag-suggestion → Logs**

## Future Enhancements

- **Tenant System Settings**: Move tag suggestion to per-tenant configuration
  - Enable/disable toggle for each tenant
  - Configurable cooldown duration
  - Adjustable min character threshold
  - Configurable max tags per entity
  - Custom OpenAI model selection per tenant
- Smart batching: Group multiple jobs for single API call
- User feedback loop: Track accepted/rejected tags
- Custom tag libraries: Learn from user's existing tags
- Multi-language support: Detect content language
- Embeddings: Use for similarity-based suggestions
- Note detail view: Show tags with same visual differentiation

## Troubleshooting

### Webhook not firing
- Check webhook configuration in Dashboard
- Verify Supabase service role key is correct
- Check Edge Function logs for errors

### Tags not suggested
- Verify content >= 200 characters
- Check cooldown hasn't expired
- Ensure < 3 existing tags
- Check OpenAI API key is valid

### Polling timeout
- Edge Function may be slow (cold start)
- Check OpenAI API status
- Review function logs for errors

## Security Notes

- Service role key has full database access - keep secure
- OpenAI API key should be stored as Supabase secret
- Webhook uses authentication header
- Content sent to OpenAI is limited to 1000 chars

