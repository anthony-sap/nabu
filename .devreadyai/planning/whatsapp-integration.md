# Nabu WhatsApp Integration PRD

## 0. Context and Goals

Nabu is a feed first note system that captures quick Thoughts from multiple channels, promotes them into structured Notes, groups and links them with Tags and Folders, and uses AI to suggest tags, summarize, expand, and surface trends.

WhatsApp is a key capture channel alongside web, email, Telegram, and Teams. This PRD describes the WhatsApp integration across three areas:

1. Infrastructure, setup, APIs, and how to connect WhatsApp to Nabu
2. Personal account functionality
3. Team account functionality, including per message capture and AI grouped conversations and digests

Primary goals

* Make it trivial for users to capture Thoughts via WhatsApp
* For personal users, keep the mental model simple and private
* For teams, turn noisy WhatsApp group chats into structured, searchable, AI summarized knowledge
* Reuse existing Nabu concepts and data model where possible

Non goals

* Building a full WhatsApp client
* Supporting every media type from day one
* Handling billing and quota at the WhatsApp provider level beyond basic configuration

## 1. Infrastructure, Setup, APIs, and WhatsApp Configuration

### 1.1 High level architecture

Components

* WhatsApp Business Platform (Cloud API or BSP)

  * Owns phone number and message transport
  * Sends webhooks to Nabu backend for inbound messages and events

* Nabu API layer (Next.js route handlers or backend service)

  * Public webhook endpoint for WhatsApp events
  * Authenticates webhooks using provider signature
  * Normalises payloads into an internal Message model
  * Schedules async jobs for AI processing and media handling

* Message processing and AI layer

  * Worker or background job processor
  * Groups messages into conversation clusters for teams
  * Generates summaries and daily digests
  * Calls tagging and embedding pipelines

* Core Nabu application and database

  * Persists Thoughts and Notes
  * Applies Tags and Folders
  * Links Thoughts to Users, Teams, and WhatsApp metadata

* Admin and configuration UI

  * Configure WhatsApp integration per tenant
  * Map WhatsApp numbers and groups to Nabu workspaces, Folders, Tags, and modes

### 1.2 Data model extensions

Existing key models

* User
* Thought
* Note
* Folder
* Tag

New or extended concepts

* Thought.source

  * Existing enum extended with value `whatsapp`

* Thought.meta (JSON)

  * Fields for WhatsApp specific metadata

    * `whatsappPhoneId`
    * `whatsappMessageId`
    * `whatsappChatId` (1 to 1 or group id)
    * `whatsappChatType` (personal, group)
    * `whatsappSenderNumber`
    * `whatsappSenderName`
    * `whatsappRawPayloadVersion`

* WhatsAppIntegration (per tenant or per team)

  * `id`
  * `tenantId`
  * `mode` (personal only, team only, both)
  * `provider` (cloud, bsp)
  * `phoneNumber`
  * `webhookSecret`
  * `defaultLanguage`
  * `createdAt`, `updatedAt`

* WhatsAppGroupMapping (for teams)

  * `id`
  * `tenantId`
  * `whatsappChatId`
  * `name` (friendly label)
  * `defaultFolderId` (optional)
  * `defaultTagIds` (list)
  * `processingMode` (per message, clustered, digest, mixed)
  * `clusterWindowMinutes` (for grouping)
  * `digestFrequency` (daily, twiceDaily, hourly, off)
  * `isActive`

No change is required to Notes beyond their relationship to Thoughts.

### 1.3 API endpoints

Public webhook endpoints

* `POST /api/webhooks/whatsapp`

  * Accepts inbound message and status callbacks from WhatsApp
  * Verifies signature and token
  * Returns 200 quickly to respect timeout limits

Internal APIs and workers

* `POST /api/internal/whatsapp/events`

  * Internal event dispatch for normalized WhatsApp events

* Background jobs

  * `processWhatsappMessage(messageId)`

    * Load raw payload and normalised message
    * Resolve user and tenant context
    * Route to personal or team processing pipeline
  * `clusterWhatsappMessages(groupId, window)`

    * Group unclustered raw messages into conversation clusters
    * Create clustered Thoughts for teams
  * `generateWhatsappDailyDigest(groupId, date)`

    * Aggregate previous period messages and clusters
    * Generate a digest Thought and optional Note

Developer notes

* All background jobs should be idempotent
* Raw payloads should be stored with a retention policy for debugging

### 1.4 WhatsApp integration setup

Admin responsibilities

1. Create or connect a WhatsApp Business Account via Meta
2. Configure a phone number and obtain credentials

   * Phone number ID
   * Business account ID
   * Access token or BSP credentials
3. Configure the webhook in the WhatsApp console

   * Callback URL: `/api/webhooks/whatsapp`
   * Verify token configured in Nabu
   * Subscribe to message and status events

Nabu tenant setup

1. Tenant admin navigates to Integrations → WhatsApp
2. Enters provider credentials or completes OAuth style flow
3. Chooses default mode

   * Personal only
   * Teams only
   * Both
4. Tests connection

   * Nabu sends a test message to the admin on WhatsApp
   * Confirms that inbound messages are received and processed

Group mapping setup for teams

1. Admin adds the bot phone number to a WhatsApp group
2. Admin sends a special command in the group, for example `@Nabu /link`
3. Nabu replies with a one time link to the web UI
4. In the web UI, the admin sees

   * Detected group name and id
   * Options to select

     * Target Folder or create a new one
     * Default Tags (project, client, topic)
     * Processing mode

       * Per message
       * Clustered
       * Daily digest
       * Mixed
5. Admin saves configuration

### 1.5 Security and privacy

* All webhooks must use HTTPS
* Signature verification is mandatory
* Raw message payloads must be encrypted at rest
* Only minimal WhatsApp metadata is stored beyond text and attachments
* Personal accounts

  * Messages are stored only under that user’s tenant
  * No cross user or cross tenant sharing without explicit action
* Teams

  * Group messages map to a Team workspace
  * Only members of that workspace can see derived Thoughts and Notes

## 2. Personal Account Functionality

### 2.1 Goals

* Make sending a message to Nabu from WhatsApp feel like messaging an assistant
* Each message becomes a single Thought in the user’s Feed
* Keep everything private by default
* Preserve support for text, simple attachments, and voice notes

### 2.2 User stories

1. As a personal user, I want to send text to the Nabu WhatsApp bot and see it appear in my Feed as a Thought so I can capture ideas quickly.
2. As a personal user, I want my WhatsApp captured Thoughts to behave like any other Thought so I can promote them to Notes, tag them, and search them.
3. As a personal user, I want images and voice notes I send via WhatsApp to be attached to the Thought so that I do not lose context.
4. As a personal user, I want all my WhatsApp messages to be private so I can trust the system with sensitive information.

### 2.3 Functional behavior

#### 2.3.1 Adding the bot

* User adds the Nabu WhatsApp number as a contact
* User sends a first message
* If the phone number is not linked yet

  * Nabu replies with a one time link to log in or sign up
  * After login, user confirms link of that phone number to their account
  * Subsequent messages are automatically attributed to that user

#### 2.3.2 Message to Thought mapping

For personal accounts

* Each inbound WhatsApp message from the linked number creates one Thought
* Thought fields

  * `userId` → linked user
  * `source` → `whatsapp`
  * `content` → message text or transcription
  * `meta` → WhatsApp metadata
  * `state` → `new`
* Attachments

  * Image or file messages create one Attachment linked to the Thought
  * For images and audio, optional enrichment

    * OCR for images
    * Transcription for audio and voice notes
    * Extracted text is stored and embedded

#### 2.3.3 AI enrichment

* Tag suggestions

  * Standard tagger model runs on new Thoughts
  * Up to five tags suggested from the user’s existing Tag vocabulary
* Embeddings and search

  * All WhatsApp Thoughts are embedded
  * They are searchable via keyword and semantic search like any other Thought

#### 2.3.4 Feed and UX

* WhatsApp Thoughts appear in the personal Feed with a visible source label

  * Example: badge showing `WhatsApp`
* In the Thought detail view

  * Show original timestamp from WhatsApp
  * Show basic metadata such as contact label
* Promotion to Note

  * Works identically to other Thoughts
  * User can select a WhatsApp Thought and promote it to a Note
* No clustering or digesting in personal mode

  * Each message stands alone

### 2.4 Settings and controls

* Personal user settings

  * Connect or disconnect WhatsApp number
  * View last connection test status
  * Option to disable AI enrichment for media

### 2.5 Edge cases and error handling

* Unknown number sends a message

  * Bot replies with instructions to link the number to a Nabu account
* Number linked to multiple tenants

  * Not supported initially
  * First tenant wins, or explicit selection flow in the linking UI
* Integration disabled

  * Bot replies with a generic message that WhatsApp capture is disabled for this account
* Provider outage

  * Messages may be delayed
  * Nabu should handle retry webhooks idempotently

## 3. Team Account Functionality

### 3.1 Goals

* Support WhatsApp as a shared capture channel for teams
* Ingest WhatsApp group messages into a shared knowledge space
* Offer three processing modes

  * Per message capture
  * Conversation clustering
  * Daily or periodic digests
* Make it easy to map WhatsApp groups to projects, clients, or topics via Folder and Tag defaults

### 3.2 User stories

1. As a team member, I want to add the Nabu bot to a WhatsApp group so that our discussions are captured in a shared space.
2. As a team member, I want each message in the group to become a Thought in Nabu when configured, so nothing is lost.
3. As a team lead, I want Nabu to group bursts of WhatsApp messages into a single Conversation Thought so I can review discussions more quickly.
4. As a team lead, I want a daily summary of the group chat captured as a Thought or Note so I can stay informed without reading every message.
5. As a team admin, I want to control per group whether we use per message, clustered, or digest mode so we can tune noise levels.

### 3.3 Group mapping and context

Each WhatsApp group that includes the bot is mapped to a `WhatsAppGroupMapping` record.

Configuration per group

* Target Folder

  * New Thoughts created from this group are assigned to that Folder by default
* Default Tags

  * Applied to all derived Thoughts and Notes
* Processing mode

  * `perMessage`
  * `clustered`
  * `digest`
  * `mixed` (combination of the above)
* Cluster window

  * Duration (for example 15 minutes) used for grouping messages
* Digest frequency

  * Daily, twice daily, hourly, or off

### 3.4 Per message capture (Option 1)

When `processingMode` includes `perMessage`

* Each inbound WhatsApp message in the group is transformed into a Thought
* Thought fields

  * `userId` → resolved from sender email or phone mapping where possible
  * If unknown, use a generic system user and annotate sender in `meta`
  * `source` → `whatsapp`
  * `content` → message body
  * `folderId` → group mapping default Folder
  * `state` → `new`
* Default Tags from the group mapping are applied
* AI tag suggestions run as usual

This mode is best for lower volume groups or where full message level traceability is important.

### 3.5 Conversation clustering (Option 2)

When `processingMode` includes `clustered`

Concept

* Instead of every message creating a visible Thought, bursts of messages are grouped into a Conversation Thought that behaves like a mini meeting transcript.

Processing pipeline

1. Inbound messages are stored as raw WhatsApp messages with group id and timestamps.
2. A periodic job runs `clusterWhatsappMessages(groupId, window)`.
3. The job selects raw messages that

   * Belong to the group
   * Have not yet been assigned to a cluster
4. Clustering logic

   * Basic version

     * Group messages by time window (for example 15 minutes of activity)
   * Enhanced version

     * Use embeddings to detect topic shifts and start a new cluster
5. For each cluster

   * Concatenate content into a single transcript
   * Generate a summary, key decisions, open questions, and follow ups using AI
   * Create a Conversation Thought

     * `content` → summary plus optional transcript
     * `meta.transcript` → full raw transcript
     * `meta.messageIds` → list of raw message ids
     * `folderId` → group default Folder
     * Tags → group default Tags plus AI suggestions

UX and Feed behavior

* Conversation Thoughts appear in the team Feed with a label such as `WhatsApp Conversation`
* Detail view shows

  * Summary at the top
  * Collapsible transcript
  * Key decisions and actions as bullets

### 3.6 Daily or periodic digests (Option 3)

When `processingMode` includes `digest`

Concept

* At the end of a configured period (for example daily at 18:00), Nabu generates a single high level summary of all messages in that group during the day.

Processing pipeline

1. Scheduler triggers `generateWhatsappDailyDigest(groupId, date)`.
2. Job retrieves raw messages and Conversation Thoughts for the period.
3. AI generates

   * High level summary
   * Major topics and themes
   * Key decisions
   * Open issues and risks
   * Action items by person where detectable
4. Output object

   * Either a Thought or a Note depending on configuration
   * Linked to the group Folder and default Tags

UX and Feed behavior

* Digest appears in the team Feed as `WhatsApp Daily Digest` for a specific date
* Option for users to subscribe to email delivery of the digest

### 3.7 Mixed mode behavior

When `processingMode` is `mixed`

* Per message capture can still occur for auditing, but those Thoughts may be hidden by default from the main Feed and available via a filter
* Conversation clusters and digests are the primary visible entities in the Feed
* Admins can configure visibility

  * Show per message Thoughts in Feed
  * Show only clusters and digests

### 3.8 Role based access and permissions

* Only members of the associated Team workspace can see WhatsApp derived Thoughts and Notes
* Shares and permissions cascade via Folder and Tag rules
* If a member leaves the team, they lose access to all WhatsApp derived content for that workspace

### 3.9 Settings and admin controls

Per tenant

* Global toggle to enable or disable WhatsApp integration
* Default processing mode for new groups

Per group

* Processing mode selection
* Default Folder selection
* Default Tags configuration
* Cluster window and digest frequency configuration

### 3.10 Error handling and resilience

* If a group is not mapped yet

  * Bot sends a reminder message to map the group using the web UI
  * Raw messages can still be stored temporarily for a grace period
* If message processing fails

  * Job retries with backoff
  * Errors are logged with enough context to debug
* If AI enrichment fails

  * Create a minimal Thought with raw transcript and mark enrichment as pending or skipped

### 3.11 Success metrics

* Number of tenants with WhatsApp enabled
* Number of personal users actively capturing via WhatsApp
* Number of team groups mapped to Nabu
* Conversation cluster creation rate
* Digest open and click rates (if email digests are enabled)
* Search usage on WhatsApp derived Thoughts and Notes

This PRD defines the high level functionality and requirements for WhatsApp integration across infrastructure, personal users, and team accounts, aligned with Nabu concepts and extensible for future enhancements.
