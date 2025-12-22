
Here is a complete Product Requirements Document for Nabu that you can hand to engineering, design, and QA. It keeps user-facing terms as Thought, Note, Folder, and Tag. It assumes a Next.js front end with shadcn UI, a Postgres database with pgvector, Prisma ORM, and LLM services for enrichment.

Nabu PRD v1

1.  Summary and goals
    

-   Vision: Nabu is a feed‑first notes system that lets people capture Thoughts anywhere, automatically organizes them into Notes with Tags and Folders, links related ideas, and produces AI summaries and expansions that are actually useful.
    
-   Primary outcomes:
    
    1.  Zero‑friction capture from chat apps and the web
        
    2.  Reliable auto‑tagging and clustering
        
    3.  Clear feed and search that make retrieval fast
        
    4.  Collaboration by sharing Notes and Tags
        
    5.  Meeting prep flow that turns inputs into questions and a clean brief
        
-   Success metrics to track:
    
    -   Time from capture to retrieval: median under 10 seconds for indexed search, under 2 seconds for local cache
        
    -   Tag suggestion acceptance rate: target 60 percent or higher
        
    -   Percentage of captured Thoughts converted to Notes within 72 hours: target 40 percent or higher
        
    -   Weekly active creators and retrievers per workspace
        
    -   Meeting prep usage rate and satisfaction score
        

2.  Personas and core problems
    

-   Consultant or founder: high volume of client context, needs to capture on the go, wants reliable retrieval and briefs.
    
-   Product or research lead: many ideas and inputs, wants patterns and trends, needs to link Notes.
    
-   Small team: needs a shared Tag or Folder to coordinate without heavy project tooling.
    

3.  Scope
    

-   In scope for v1
    
    -   Capture Thoughts from web, Telegram, WhatsApp, and Teams
        
    -   Feed view with clustering, quick promotion of Thoughts to Notes
        
    -   Auto‑tagging and auto‑linking suggestions
        
    -   Notes with attachments, linking between Notes
        
    -   Hybrid search: indexed full‑text plus vector
        
    -   Share Note or Tag with specific people
        
    -   Meeting prep flow with attachments, generated questions, and a summary
        
    -   Daily AI overview email or in‑app digest
        
-   Out of scope for v1
    
    -   Real‑time collaborative editing inside a single Note
        
    -   Complex workflow automation and advanced permissions beyond note, tag, and folder share
        
    -   Offline clients
        
    -   Native mobile apps
        

4.  User journeys with acceptance criteria
    

4.1 Capture a Thought from chat

-   As a user, I send a message to a bot in WhatsApp, Telegram, or Teams and it appears in my Nabu feed as a Thought.
    
-   Acceptance criteria:
    
    -   Message text, timestamp, and source are stored
        
    -   If an image, audio, or file is present it is attached and OCR or transcription runs if applicable
        
    -   The Thought is visible in the feed within 3 seconds of webhook arrival
        
    -   The Thought displays one to five tag suggestions within 10 seconds
        

4.2 Promote Thoughts to a Note

-   As a user, I select one or more Thoughts and convert them into a Note with a title and content prefilled by the AI summary.
    
-   Acceptance criteria:
    
    -   The new Note references the source Thought ids
        
    -   Accepted tag suggestions become Note tags
        
    -   The Note is editable and stored with a folder if chosen
        

4.3 Auto‑tag and cluster

-   As a user, I see a cluster badge when several Thoughts are similar. I can accept to group them or ignore.
    
-   Acceptance criteria:
    
    -   Cluster suggestion appears when cosine similarity passes threshold and at least two Thoughts are within the last 14 days
        
    -   Accepting the cluster creates a Note or a grouped view
        

4.4 Meeting prep

-   As a user, I create a Note, upload attachments, click Generate questions. I get a list of smart questions and a short brief.
    
-   Acceptance criteria:
    
    -   Questions are grounded in the Note and attachments text
        
    -   A section for taking notes during the meeting is appended
        
    -   After the meeting, newly captured Thoughts can be merged back with one click, and the brief is refreshed
        

4.5 Share a Tag or a Note

-   As a user, I share a Tag with teammates so everyone can see Notes with that Tag. I can also share a single Note.
    
-   Acceptance criteria:
    
    -   Invite by email with view, comment, or edit rights
        
    -   Search and AI results respect permissions
        

4.6 Search and retrieval

-   As a user, I type a query and see exact matches from full‑text, plus semantic matches from vector search, clearly labeled.
    
-   Acceptance criteria:
    
    -   Indexed results return first with snippets
        
    -   Semantic results follow with similarity score hidden but consistent ordering
        
    -   Filters by Tag, Folder, date, and source work together
        

5.  Functional requirements
    

5.1 Capture layer

-   Telegram bot, WhatsApp inbound via Twilio or Meta Graph API, Teams bot via Bot Framework. All call a unified Nabu ingestion endpoint.
    
-   Web quick capture on every page with a keyboard shortcut. Mobile quick jot in header.
    

5.2 Thought pipeline

-   Store raw Thought immediately
    
-   Background worker runs:
    
    -   Embedding generation
        
    -   Auto‑tag classification
        
    -   Similarity search for cluster suggestions
        
    -   Optional OCR or speech‑to‑text for attachments
        
-   Thought state transitions: new, enriched, grouped, promoted, archived
    

5.3 Notes

-   Rich text editor that supports markdown and attachments
    
-   Note links: add relationship to another Note with a relation type
    
-   AI actions on a Note: expand, summarize, generate questions
    

5.4 Tags and Folders

-   Folder: optional single parent for a Note
    
-   Tags: many to many, user managed, AI can suggest
    
-   Share at Tag or Note level
    

5.5 Search

-   Full‑text: Postgres tsvector on Thought and Note content, Tag names, attachment extracted text
    
-   Vector: pgvector on embeddings for Thoughts, Notes, and attachments
    
-   Hybrid rank: combine text rank and cosine similarity with a simple weighted sum, text rank priority by default
    

5.6 Export and notifications

-   Export Note as Markdown or PDF
    
-   Daily overview: AI summarizes new and updated Notes and Thoughts by Tag or Folder
    

6.  System architecture
    

6.1 Components

-   Front end: Next.js, shadcn UI, mint theme already supplied
    
-   API and background: Next.js API routes for ingestion and CRUD, background worker using queues
    
-   Database: Postgres with Prisma, pgvector extension
    
-   File storage: S3 compatible or Supabase Storage
    
-   Auth: Kinde or Supabase Auth with JWT
    
-   Integrations: Telegram, WhatsApp, Teams webhooks
    
-   Observability: request logging, job metrics, error tracking
    

6.2 Data model in Prisma syntax  
Use this as a starting point. Adjust naming to match your conventions.

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  Thoughts     Thought[]
  Notes        Note[]
  Folders      Folder[]
  Tags         Tag[]    @relation("UserTags")
  Shares       Share[]
}

model Folder {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String
  description String?
  parentId  String?  @db.VarChar
  order     Int?
  createdAt DateTime @default(now())
  Notes     Note[]
}

model Tag {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation("UserTags", fields: [userId], references: [id])
  name      String
  color     String?
  type      String?  // topic, project, client
  createdAt DateTime @default(now())
  NoteTags  NoteTag[]
}

model Note {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  folderId      String?
  folder        Folder?  @relation(fields: [folderId], references: [id])
  title         String
  content       String   @db.Text
  sourceThoughts String[] // store thought ids for traceability
  summary       String?  @db.Text
  embedding     Bytes?   // pgvector via bytea or use a separate table
  visibility    String   @default("private")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  NoteTags      NoteTag[]
  Attachments   Attachment[]
  OutgoingLinks NoteLink[] @relation("FromNote")
  IncomingLinks NoteLink[] @relation("ToNote")
}

model Thought {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  content      String   @db.Text
  source       String   // web, telegram, whatsapp, teams, email, voice
  createdAt    DateTime @default(now())
  embedding    Bytes?
  suggestedTags String[] // store raw suggestions alongside final tags at note level
  noteId       String?
  note         Note?    @relation(fields: [noteId], references: [id])
  meta         Json?
  Attachments  Attachment[]
  state        String   @default("new") // new, enriched, grouped, promoted, archived
}

model NoteTag {
  noteId String
  tagId  String
  confidence Float?
  Note   Note   @relation(fields: [noteId], references: [id])
  Tag    Tag    @relation(fields: [tagId], references: [id])
  @@id([noteId, tagId])
}

model NoteLink {
  id         String @id @default(cuid())
  fromNoteId String
  toNoteId   String
  relation   String // related, expands, supports, contradicts, follows_up
  createdAt  DateTime @default(now())
  from       Note   @relation("FromNote", fields: [fromNoteId], references: [id])
  to         Note   @relation("ToNote", fields: [toNoteId], references: [id])
}

model Attachment {
  id           String   @id @default(cuid())
  noteId       String?
  note         Note?    @relation(fields: [noteId], references: [id])
  thoughtId    String?
  thought      Thought? @relation(fields: [thoughtId], references: [id])
  fileName     String
  fileUrl      String
  mimeType     String
  extractedText String? @db.Text
  embedding    Bytes?
  createdAt    DateTime @default(now())
}

model Share {
  id          String  @id @default(cuid())
  entityType  String  // note, tag, folder
  entityId    String
  userId      String
  permission  String  // view, comment, edit
  createdAt   DateTime @default(now())
}

```

6.3 API surface

Public REST endpoints

-   POST /api/thoughts: create a Thought
    
-   GET /api/thoughts: list with filters by source, state, date
    
-   PATCH /api/thoughts/:id: update state or link to a Note
    
-   POST /api/notes: create a Note from Thoughts
    
-   GET /api/notes/:id: fetch a Note with tags, links, attachments
    
-   PATCH /api/notes/:id: update Note content and tags
    
-   POST /api/notes/:id/link: create a NoteLink to another note
    
-   POST /api/attachments: upload attachment, returns URL, triggers OCR
    
-   GET /api/search: query with q, filters, returns indexed and semantic results
    
-   POST /api/share: create a share for note, tag, or folder
    
-   POST /api/ai/expand: expand an idea for a Note
    
-   POST /api/ai/questions: generate meeting questions
    
-   POST /api/ai/summarize: produce a brief
    

Webhook endpoints

-   POST /api/webhooks/telegram
    
-   POST /api/webhooks/whatsapp
    
-   POST /api/webhooks/teams
    

Background jobs

-   Queue thought_enrich: embeddings, tag suggestions, cluster detection
    
-   Queue note_refresh: regenerate summary when content changes
    
-   Queue attachment_ingest: OCR, text extract, embedding
    

6.4 Request and response shapes

Create Thought

```http
POST /api/thoughts
{
  "content": "Follow up with HydroChem on mobile sync",
  "source": "telegram",
  "attachments": [],
  "meta": { "chatId": "xxx", "messageId": "yyy" }
}

```

Response includes id, createdAt, and a processing flag.

Search

```http
GET /api/search?q=mobile+sync&tags=client:HydroChem

```

Response includes indexed hits, semantic hits, and filters applied.

6.5 Ingestion mapping

Telegram update mapping

-   Extract message text or caption
    
-   User identity mapping via bot user record
    
-   Attach photos or documents to Attachment entries with thoughtId
    

WhatsApp mapping via Twilio

-   Parse Body and MediaUrl fields
    
-   Validate sender to user mapping
    

Teams mapping

-   Use Bot Framework activity payload to extract text and attachments
    

7.  LLM design
    

7.1 Models and functions

-   Embeddings: small fast embedding model, store as pgvector
    
-   Tagger prompt:
    
    -   Instruction: given text, suggest up to 5 tags from known tags, optionally propose new ones, return JSON with tags and confidence
        
-   Linker:
    
    -   Retrieve top k similar Notes by embedding, return suggestions with relation guess
        
-   Summariser:
    
    -   3 to 6 bullet executive summary, keep names and dates
        
-   Expander:
    
    -   Given a note and one idea, produce a structured outline with references to related Notes by title
        
-   Meeting questions:
    
    -   Given a Note and extracted attachment text, produce 8 to 12 concise questions grouped by topic
        

7.2 Prompt example for Tagger

```
You are classifying a short Thought or Note.
Return JSON with fields tags and newTags. Use existing tags when possible.
Limit to 5 items. Include confidence per tag from 0 to 1.

```

7.3 Cost control and rate limits

-   Cache tag suggestions for duplicate content
    
-   Batch embedding jobs
    
-   Apply per‑user daily cap for expansion actions with soft warnings
    

7.4 Safety and privacy

-   PII detection in uploads, redact when requested
    
-   Do not send attachments to external LLM if the user sets a local only flag
    

7.5 Evaluation

-   Track acceptance rate per suggestion type
    
-   Manual golden sets for tagger and summariser regression tests
    

8.  Analytics and metrics
    

-   Capture event stream:
    
    -   thought_created, thought_enriched, note_created, tags_accepted, link_created, search_performed, share_created
        
-   Funnel metrics for Thought to Note conversion
    
-   Search success proxy: result clicked within 10 seconds
    
-   Day‑over‑day active users, queries per user, AI actions per user
    

9.  Non‑functional requirements
    

-   Performance:
    
    -   P95 page load under 2 seconds on a typical broadband connection
        
    -   P95 search under 400 ms for index queries, semantic results can stream
        
-   Availability:
    
    -   Target 99.9 percent monthly availability for ingestion and read APIs
        
-   Security:
    
    -   Encrypt at rest, encrypted in transit
        
    -   Role based access control on shares
        
    -   Audit log for share and export events
        
-   Accessibility:
    
    -   WCAG AA contrast for text
        
    -   Keyboard access and focus outlines
        
-   Internationalization ready
    

10.  Step by step build plan
    

Phase 1 foundations

1.  Create repo with Next.js, shadcn, theme tokens
    
2.  Add Prisma schema above, run migrations
    
3.  Add Auth and basic user onboarding
    
4.  Implement Folder, Tag CRUD pages
    
5.  Implement Note editor and read view, no AI yet
    
6.  Implement basic share for Note and Tag
    
7.  Add file uploads, store in S3 or Supabase Storage
    

Phase 2 capture and feed

1.  Build unified POST /api/thoughts
    
2.  Implement Telegram webhook to ingestion
    
3.  Implement WhatsApp webhook to ingestion
    
4.  Implement Teams webhook to ingestion
    
5.  Build Feed view that shows Thoughts ordered by time with quick actions
    
6.  Promote to Note action with merge of multiple Thoughts
    

Phase 3 enrichment

1.  Add embedding generator worker and pgvector
    
2.  Build tag suggestion service and UI accept flow
    
3.  Build cluster suggestion in feed with accept flow
    
4.  Build automatic Note summary on save
    

Phase 4 search

1.  Build Postgres full‑text index
    
2.  Build vector search API using pgvector
    
3.  Build hybrid search service with filters and ranking
    
4.  Add search UI with labels for exact vs semantic
    

Phase 5 links and collaboration

1.  Add NoteLink CRUD and UI for linking and browsing related Notes
    
2.  Respect share permissions in all queries
    
3.  Add shared Tag workspace view
    

Phase 6 meeting prep

1.  Add meeting prep mode on Notes
    
2.  Parse attachments via OCR and text extraction
    
3.  Add Generate questions and Brief buttons
    
4.  Add Merge meeting Thoughts into Note flow
    

Phase 7 polish

1.  Daily AI overview digest with actionable suggestions
    
2.  Export to PDF and Markdown
    
3.  Analytics dashboards and event tracking
    
4.  QA pass and accessibility checks
    
5.  QA plan with key test cases
    

Capture

-   Telegram message appears in feed within seconds
    
-   WhatsApp image uploads with extracted text available
    
-   Teams message with attachment produces Thought with linked Attachment
    

Enrichment

-   Tag suggestions appear and can be accepted or rejected
    
-   Cluster suggestion appears only when threshold met
    

Notes

-   Promote multiple Thoughts to one Note preserves source references
    
-   Linking a Note to another displays in both directions
    

Search

-   Query returns expected indexed hits first
    
-   Semantic results include related Notes not matching exact text
    

Permissions

-   Tag share exposes only Notes with that Tag
    
-   Shared Note is visible to invitee, not to others
    

Meeting prep

-   Attachments are parsed and included in generated questions
    
-   Merge of meeting Thoughts updates the summary
    

12.  Risks and mitigations
    

-   Messaging APIs change or rate limits: mitigate with a small adapter layer per provider and centralized retry
    
-   LLM cost spikes: mitigate with batching, caching, and caps
    
-   Poor tag quality: mitigate with feedback loop and user curated tag mapping
    
-   Privacy concerns: mitigate with clear settings for enrichment scope and data deletion
    

13.  Open product questions
    

-   Do we allow cross‑workspace shares or invite only within a workspace
    
-   Do we expose a public link option for Notes
    
-   Do we add role templates for teams such as viewer and contributor
    

If you want, I can turn this PRD into a GitHub project structure with labeled milestones and issues, and I can output a starter Prisma schema and API route stubs that match this plan.
