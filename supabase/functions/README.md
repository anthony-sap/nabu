# Supabase Edge Functions

## Setup

### 1. Install Supabase CLI

**Option A: Using npm**
```bash
npm install -g supabase
```

**Option B: Using npx (no install needed)**
Use `npx supabase` instead of `supabase` for all commands.

**Option C: Windows (Scoop)**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option D: Mac/Linux (Homebrew)**
```bash
brew install supabase/tap/supabase
```

**Option E: Direct Download**
Download from: https://github.com/supabase/cli/releases

### 2. Link to your Supabase project
```bash
supabase link --project-ref your-project-ref
```

### 3. Set secrets
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase secrets set DATABASE_URL=postgresql://...
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Deploy function
```bash
supabase functions deploy process-tag-suggestion
```

## Configure Database Webhook

After deploying the function, configure a database webhook in Supabase Dashboard:

1. Go to **Database → Webhooks**
2. Click **Create a new hook**
3. Configure:
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
   - **HTTP Parameters**: Send `record` (contains the inserted job data)

## Testing

Test the function locally:
```bash
supabase functions serve process-tag-suggestion
```

Invoke it:
```bash
curl -i --location --request POST \
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
    },
    "schema": "public"
  }'
```

## Monitoring

View function logs:
```bash
supabase functions logs process-tag-suggestion
```

Or in the Supabase Dashboard: **Edge Functions → process-tag-suggestion → Logs**

