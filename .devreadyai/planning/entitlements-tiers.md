Here’s a concrete entitlement model for Nabu based on what you wrote, aligned with the current product + roadmap. 

---

## 1. Plans & positioning

**Free – “Capture & Find”**
Solo use, great capture + powerful search. No external integrations, no automations.

**Personal – “Connected Brain”**
Power user tier. Adds WhatsApp + webhooks, AI chat inside notes, linked AI docs, and basic note‑level automations.

**Teams – “Shared Brain & Workflows”**
For teams that need shared spaces, real‑time collaboration, Teams integration, email + calendar ingestion, and robust AI workflows and admin controls.

---

## 2. Included on *all* plans

Everyone gets the “core Nabu” experience:

* **Thoughts & Notes**

  * Feed-first capture and promotion of Thoughts → Notes 
  * Create/edit Notes from the web app

* **Organization**

  * **Folders** (including nested folder structure)
  * **Tags** on Notes and Thoughts
  * Tagging on folders (e.g., “Client”, “Area”)

* **Search & retrieval**

  * Full-text search over Notes, Thoughts, Tags, attachments
  * Embedding-based / vector search (hybrid ranking) 
  * Filters by Tag, Folder, date, and source

* **AI & editor**

  * **AI tag suggestions** on Thoughts and Notes
  * Rich‑text editing (headings, bullets, checklists, etc.)
  * Images & screenshots in Notes
  * Version history on Notes (roll back / view previous versions)

So “Free” vs paid is not about *basic quality* – it’s about connectivity, collaboration, and automation.

---

## 3. Tier-by-tier entitlements

### A. Capture & integrations

| Capability                           | Free | Personal                       | Teams                                               |
| ------------------------------------ | ---- | ------------------------------ | --------------------------------------------------- |
| Web quick jot + Notes editor         | ✅    | ✅                              | ✅                                                   |
| Attach files / images / audio        | ✅    | ✅                              | ✅                                                   |
| WhatsApp bot (capture Thoughts)      | –    | ✅ (1 personal WhatsApp number) | ✅ (team-level & per-user)                           |
| Webhooks (ingest JSON into Thoughts) | –    | ✅ basic inbound webhooks       | ✅ advanced (multiple endpoints, per-folder/webhook) |
| Microsoft Teams integration          | –    | –                              | ✅ (capture from channels + send summaries back)     |
| Incoming email ingestion             | –    | –                              | ✅ workspace address + per-user aliases              |
| Calendar integration                 | –    | –                              | ✅ (per-user calendar connect)                       |

**How it behaves:**

* **Free**: Capture stays in the web app. Great for trying Nabu as a personal notebook with strong search.
* **Personal**: You “wire Nabu into your life” via WhatsApp + webhooks (e.g., send voice notes, or pipe in tasks from other tools).
* **Teams**: Nabu becomes the shared inbox for thinking:

  * team email addresses → Thoughts in shared folders
  * calendar → adds context / links meetings to Notes
  * Teams → capture and distribute context directly in channels.

---

### B. AI experience

| AI feature                                                           | Free                                         | Personal                  | Teams                                            |
| -------------------------------------------------------------------- | -------------------------------------------- | ------------------------- | ------------------------------------------------ |
| AI tag suggestions                                                   | ✅                                            | ✅                         | ✅                                                |
| Manual AI: summarize / expand / questions on Notes                   | Trial only (small monthly cap or first week) | ✅ generous per-user quota | ✅ higher pooled quota + workspace-level controls |
| **AI chat inside a Note** (“chat about this Note + linked Thoughts”) | –                                            | ✅                         | ✅ (with team context, respecting permissions)    |
| Linked AI docs (agenda, action list, brief generated from a Note)    | –                                            | ✅ basic templates         | ✅ advanced templates + team templates            |
| Daily digest / overview                                              | Weekly digest only                           | ✅ personal daily digest   | ✅ personal + team/space digests                  |
| AI note-triggered automations                                        | –                                            | ✅ basic (per-note)        | ✅ advanced (workspace workflows)                 |
| Trend analysis across Thoughts                                       | –                                            | ✅ simple (per-user)       | ✅ shared (per team/space)                        |

**Concrete behavior ideas:**

* **Free**

  * Background AI for tagging + embeddings is “invisible”; users mainly feel “search is smart”.
  * Optionally: a small “welcome pack” of manual AI actions (e.g., 20 summaries) to preview paid tiers.

* **Personal**

  * Inside any Note:

    * Chat side panel: “Ask AI about this Note + its linked Thoughts.”
    * Buttons: **Summarize**, **Expand into brief**, **Generate questions**, **Extract tasks**.
  * **Linked AI documents**:

    * From a Note: “Create agenda from this Note” → generates a separate linked agenda doc.
    * “Turn into follow‑up email draft” (just stored as a Note for now).
  * **Note‑triggered automations (basic)**, e.g.:

    * When Note is tagged `meeting`, auto-generate:

      * a summary
      * an agenda for next meeting
      * a list of action items
    * Limits (example): up to **3 automations per Note**, with **~300 runs/month**.

* **Teams**

  * All Personal features, plus:
  * AI chat can draw from:

    * the Note
    * linked Thoughts
    * related Notes in the same Folder/Tag (respecting permissions).
  * **Workflow-style automations**, e.g.:

    * Trigger: “New Thought from `sales@workspace.nabu.app`”
    * Condition: “Tagged with ‘Client: Acme’”
    * Actions:

      1. Attach to `Acme – Opportunities` Note
      2. Generate summary block
      3. Post summary to Teams channel `#sales-acme`
  * Admin can set per-user or per-role AI quotas & guardrails.

---

### C. Organization, sharing & collaboration

| Area                                | Free                   | Personal                                                     | Teams                                               |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| Folders & Tags                      | ✅                      | ✅                                                            | ✅ + team structures                                 |
| Share a single Note via link/email  | ✅ (limited recipients) | ✅ (unlimited)                                                | ✅                                                   |
| Shared Tags / shared Folders        | – (only personal)      | Limited (share specific Folders/Tags with 1–2 collaborators) | ✅ core: team spaces & shared folder trees           |
| Real-time collaborative editing     | –                      | –                                                            | ✅ (multi-cursor, presence, commenting)              |
| Permissions (view / comment / edit) | Note-level only        | Note- & Folder-level                                         | Fine-grained: Folder/Tag/Note, default roles        |
| Teams share folder space            | –                      | –                                                            | ✅ dedicated workspace storage & shared folder roots |

**Teams space model (suggested):**

* **Team Workspace** contains:

  * **Team Folders** (e.g., “Client – Acme”, “Product Discovery”)
  * **Team Tags** (shared vocabulary)
* Fine-grained controls:

  * Per-folder: who can **view / comment / edit**
  * Per-tag: who can apply it
  * Ability to make private sub-notes inside a shared folder if desired.

---

### D. Workflows, webhooks & admin

| Capability                    | Free | Personal                                  | Teams                                             |
| ----------------------------- | ---- | ----------------------------------------- | ------------------------------------------------- |
| Inbound webhooks              | –    | ✅ 1–3 simple endpoints                    | ✅ multiple endpoints, per-folder config           |
| AI note-triggered automations | –    | ✅ per-note recipes                        | ✅ workspace workflows across sources              |
| Outbound webhooks / calls     | –    | –                                         | ✅ (e.g., send payload to your own systems / zaps) |
| User management               | –    | –                                         | ✅ (admins, members, guests)                       |
| Analytics                     | –    | Per-user stats (search success, captures) | Workspace analytics & audit logs                  |

**Examples:**

* **Personal**

  * Simple webhook: send events from another tool → create Thoughts in a specific Folder.
  * Note automation feels like “If Note has tags X, run these AI actions.”

* **Teams**

  * Visual workflow builder:

    * Triggers: new Thought, Note updated, email received, meeting completed.
    * Conditions: tags, folder, user, source.
    * Actions: attach to Note, generate summary/agenda, post to Teams, call webhook, email someone.
  * User management:

    * Roles: Owner, Admin, Member, Guest
    * Seat management, invite flows, deactivation.

---

### E. Email & calendar specifics (Teams tier)

To make your “email + calendar context” concrete:

* **Email**

  * Workspace-level address (e.g., `team@workspace.nabu.app`) → inbox Folder of Thoughts.
  * Per-user addresses (e.g., `alice+thoughts@…`) → private Folder or personal Feed.
  * Auto-tag rules:

    * By sender domain (e.g., `@acme.com` → tag `Client: Acme`)
    * By subject keywords (e.g., “SOW” → tag `Contracts`)
  * Automatically link emails to existing Notes (embeddings + subject match).

* **Calendar**

  * Connect Google/Microsoft account per user.
  * For each event:

    * Suggest or create a **Meeting Note** with:

      * participants
      * date/time
      * linked Thoughts before / after
    * After the event, AI can:

      * merge meeting Thoughts into the Note
      * update the Note summary & tasks 

---

## 4. Limits (you can tune, but here’s a starting point)

You can adjust numbers later; the important part is *shape*.

* **Free**

  * Notes: unlimited or soft cap (e.g., warning after 500)
  * Attachments: limit total storage (e.g., 1–2 GB)
  * Manual AI actions: small trial pack only
  * No integrations / automations

* **Personal**

  * 1 seat
  * Integrations: WhatsApp + 1 webhook endpoint
  * AI:

    * e.g., 1,000 AI actions / month (summaries/expansions/QA)
    * 300 automation runs / month
  * Linked AI docs: e.g., 200 / month

* **Teams**

  * Seats: priced per user
  * Integrations: WhatsApp, Teams, email, calendar, multiple webhooks
  * AI:

    * large pooled quota (e.g., 10,000+ actions / month) with per-user soft caps
  * Automations: multiple workflows, much higher runs/month

---

## 5. Quick summary by tier (for internal doc / pricing page)

**Free – Capture & Find**

* Web capture, Notes, Folders, Tags
* Hybrid search (full-text + embeddings)
* AI tag suggestions
* Rich text + images/screenshots
* Version history
* No external integrations or automations

**Personal – Connected Brain**

* Everything in Free, plus:
* WhatsApp integration
* Inbound webhooks
* AI chat inside Notes
* Manual AI actions (summarize, expand, questions, tasks) with good quota
* Linked AI docs (agendas, briefs, follow-up drafts)
* Basic note-triggered automations

**Teams – Shared Brain & Workflows**

* Everything in Personal, plus:
* Team workspaces with shared Folders/Tags
* Real-time collaborative editing
* Fine-grained folder/tag/note permissions
* Microsoft Teams integration
* Incoming email ingestion (workspace + per-user)
* Calendar integration (meeting notes + context)
* AI triggers & multi-step workflows
* User management, role-based access, workspace analytics

If you’d like, next step I can turn this into a concise pricing-page-style comparison table and a short internal spec for “what engineering needs to gate per tier.”


Here’s a compact way to think about it in two layers:

1. **Global: tiers + entitlements → “what can this actor do?”**
2. **Teams: workspace + members + team note spaces → “who can do it where?”**

I’ll walk through both.

---

## 1) Top‑level overview: tiers and entitlements

### 1.1 Concepts

* **Plan / Tier**
  Logical product bundle: `free`, `personal`, `teams`.
* **Actor**
  The thing you check entitlements for:

  * Personal context → a single **User**
  * Team context → a **Workspace** the user is acting inside
* **Entitlements**
  Derived capabilities and limits:

  * **Capabilities** – booleans like `canUseWhatsApp`, `canCreateWebhooks`, `canUseEmailIngestion`
  * **Limits** – numbers like `maxAiActionsPerMonth`, `maxAutomations`

You already have the product surface: Thoughts, Notes, Folders, Tags, Search, Sharing, AI actions, etc. 
Tiers are just a structured way to decide which subset is available.

---

### 1.2 Data shape

Minimal extra tables / fields:

```ts
// Either a DB table or static config in code
type PlanCode = 'free' | 'personal' | 'teams'

type PlanConfig = {
  code: PlanCode
  name: string
  features: {
    whatsappCapture: boolean
    webhooks: boolean
    teamsIntegration: boolean
    emailIngestion: boolean
    calendarIntegration: boolean
    aiNoteChat: boolean
    aiLinkedDocs: boolean
    aiAutomations: 'none' | 'basic' | 'advanced'
    realtimeCollab: boolean
    teamSpaces: boolean
    // ...
  }
  limits: {
    aiActionsPerMonth: number | 'unmetered'
    automationRunsPerMonth: number
    webhookEndpoints: number
    // ...
  }
}
```

**For personal use**
Add a `plan` field to `User`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  // ...
  plan      String   @default("free") // free | personal
}
```

**For teams**
Plan hangs off a workspace (see section 2). The actor you check is:

* Personal: `actor = user`
* Teams: `actor = workspace` and the user’s **role** inside it (owner/admin/member/guest).

---

### 1.3 Runtime: how entitlements are used

**Step 1 – Resolve actor & plan**

On each request / page load:

```ts
const actor = resolveActor(req) // personal or workspace context
const plan = getPlanForActor(actor)       // 'free' | 'personal' | 'teams'
const entitlements = getEntitlements(plan, actor) 
```

`getEntitlements`:

* Reads **PlanConfig**
* Optionally applies **role-based overrides** (e.g., workspace guest can’t manage integrations)
* Returns a flat object:

```ts
type Entitlements = {
  canUseWhatsApp: boolean
  canUseWebhooks: boolean
  canUseTeamsIntegration: boolean
  canUseEmailIngestion: boolean
  canUseCalendarIntegration: boolean
  canUseAiNoteChat: boolean
  canUseAiLinkedDocs: boolean
  aiAutomationLevel: 'none' | 'basic' | 'advanced'
  maxAiActionsPerMonth: number | 'unmetered'
  // ...
}
```

**Step 2 – Gate at API level**

Example: WhatsApp capture webhook:

```ts
export async function POST_whatsappWebhook(req, ctx) {
  if (!ctx.entitlements.canUseWhatsApp) {
    throw new ForbiddenError('Upgrade to Personal to use WhatsApp capture.')
  }

  // existing flow: store Thought, run tagger, embeddings, etc. :contentReference[oaicite:1]{index=1}
}
```

Example: try to create an AI automation:

```ts
if (ctx.entitlements.aiAutomationLevel === 'none') {
  throw new ForbiddenError('Upgrade to enable automations.')
}
```

**Step 3 – Gate at UI level**

* Show/hide or lock UI affordances:

  * WhatsApp integration card
  * “Add webhook” button
  * “AI automations” section on a Note
  * Team spaces sidebar

Instead of `if (plan === 'personal')` all over the code, you centralize to:

```ts
if (entitlements.canUseAiNoteChat) { ... }
```

That keeps tiers manageable as you iterate.

---

### 1.4 Mapping to Nabu feature surface

Using current features as the base :

* **Always-on (all plans)**
  Thoughts, Notes, Folders, Tags, Search (text + embeddings), AI tag suggestions, rich text, images/screenshots, version history.

* **Entitlement-gated**

  * **Personal / Teams**:

    * WhatsApp integration
    * Webhooks for capture
    * AI chat inside Notes
    * Linked AI docs (agendas, briefs, etc.)
    * Basic AI automations triggered from Notes
  * **Teams only**:

    * Teams integration
    * Team workspaces / shared note spaces
    * Realtime collaborative editing
    * Email ingestion
    * Calendar integration
    * Advanced AI workflows
    * User management & invites

The entitlements object is simply the codified “switchboard” for which of those is live.

---

## 2) Teams plan: workspace, user management, invites, and team note spaces

For Teams you layer **multi‑user structure** on top of the above.

### 2.1 Core data model

Add a **Workspace** and membership layer:

```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  plan        String   @default("teams")   // only 'teams' here
  ownerId     String
  createdAt   DateTime @default(now())
  memberships WorkspaceMembership[]
  // Optional: billing fields...
}

model WorkspaceMembership {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        String   // 'owner' | 'admin' | 'member' | 'guest'
  status      String   // 'pending' | 'active'
  invitedById String?
  invitedAt   DateTime
  acceptedAt  DateTime?
}
```

Extend content models so they can belong either to a **User** (personal) or a **Workspace** (team):

```prisma
model Folder {
  id          String   @id @default(cuid())
  userId      String?  // personal owner
  workspaceId String?  // team owner
  // ...
}

model Note {
  id          String   @id @default(cuid())
  userId      String?
  workspaceId String?
  // ...
}
```

`Share` still handles granular access to individual Notes/Tags/Folders and is respected by search + AI. 

---

### 2.2 Team note spaces

You want a visible “team notes space” in the UI – conceptually a workspace-level area.

Two simple patterns:

1. **Workspace root + folders as spaces (minimal)**

   * Each `Workspace` has a root content tree.
   * Top-level `Folder`s are “spaces” (e.g. “Client – Acme”, “Product Discovery”).
   * Permissions:

     * Default: all workspace `members` can view/edit.
     * Override with `Share` records for more granular control (view/comment/edit per folder).

2. **Explicit Space model (if you want more control)**

```prisma
model Space {
  id          String   @id @default(cuid())
  workspaceId String
  name        String
  rootFolderId String
  defaultRole String   // viewer | editor
}
```

Either way, in the app:

* Sidebar:
  `Workspace: Nabu Team`

  * `Spaces`

    * `Client – Acme`
    * `Research`
    * `Internal Ops`

* Clicking a space → show its `Folder` + `Notes` tree.

Realtime collaborative editing (Teams entitlement) is enabled when:

* `note.workspaceId` is set
* entitlements say `realtimeCollab: true` for that workspace.

---

### 2.3 User management & invites

**Invite model:**

```prisma
model WorkspaceInvite {
  id          String   @id @default(cuid())
  workspaceId String
  email       String
  role        String   // 'admin' | 'member' | 'guest'
  token       String   @unique
  expiresAt   DateTime
  createdById String
  createdAt   DateTime @default(now())
  acceptedAt  DateTime?
}
```

**Flow:**

1. **Owner/Admin sends invite**

   * In Teams UI: “Invite teammate”
   * Choose `email`, `role`, optionally default spaces/folders to share.
   * Create `WorkspaceInvite` + send email with link containing `token`.

2. **Invitee opens link**

   * If no account → sign‑up → create `User`.
   * Validate token (workspace still on Teams plan, not expired).
   * Create `WorkspaceMembership` with role.
   * Activate default space access (e.g., create `Share` rows for key folders).

3. **Membership management**

   * Admin view of all members:

     * Change role (member → admin, etc.)
     * Deactivate / remove (soft delete membership; revoke shares).
   * Entitlements layer:

     * Only `owner`/`admin` can manage members or integrate email/calendars for workspace.
     * `guest` might have limited write permissions.

---

### 2.4 Entitlements in a team context

For Teams, the **actor** is the workspace, plus the member’s role:

```ts
function getEntitlementsForWorkspaceMember(
  workspace: Workspace,
  membership: WorkspaceMembership
): Entitlements {
  const base = plans['teams']

  // downgrade some capabilities for guests
  if (membership.role === 'guest') {
    return {
      ...base.features,
      canManageMembers: false,
      canManageIntegrations: false,
      canCreateAutomations: false,
      // but can still edit Notes they have access to
    }
  }

  if (membership.role === 'member') {
    return {
      ...base.features,
      canManageMembers: false,
      canManageIntegrations: false,
    }
  }

  // owner/admin
  return {
    ...base.features,
    canManageMembers: true,
    canManageIntegrations: true,
  }
}
```

Then:

* **User management UI / APIs** are gated on `canManageMembers`.
* **Integrations panel** (Teams, email ingestion, calendar, webhooks) is gated on `canManageIntegrations`.
* **AI workflows** builder is gated on `aiAutomationLevel === 'advanced'` and role not `guest`.

---

### 2.5 Recommended build order

If you want a pragmatic sequence:

1. **Introduce tiers & entitlements for single-user first**

   * Add `plan` to `User`.
   * Add central `PlanConfig` + `getEntitlements(user)`.
   * Gate WhatsApp, webhooks, AI chat in notes, linked AI docs, and automations behind entitlements.

2. **Add Workspace + Membership + basic team spaces**

   * Create `Workspace` + `WorkspaceMembership`.
   * Allow a user to “Create Team Workspace” → upgrades billing + creates workspace.
   * Add `workspaceId` to Notes/Folders.
   * Implement “Team notes space” as workspace root + folders in the sidebar.

3. **Layer in user management, invites, and Teams-only features**

   * Invite flow + membership roles.
   * Realtime co-edit for workspace Notes only.
   * Integrations (Teams, email ingestion, calendar) and AI workflows, all gated on Teams entitlements.

That gives you a clean mental model:

* **Plans** define what’s *possible*.
* **Entitlements** expose that as `canX` / `limitY`.
* **Workspaces & memberships** define *who gets what where* for the Teams plan.
You treat custom offline‑invoiced teams as **normal Teams workspaces + overrides + a different billing mode**. The entitlements system doesn’t change; you just give that workspace a custom “mask” over the standard Teams plan.

I’ll break it into: (1) model, (2) entitlements, (3) seats/usage, (4) product UX / ops.

---

## 1. Core idea

* **What they get** = entitlements (features + limits)
* **How they pay** = billing mode (card vs invoice)

So, a custom team plan is:

> “A Workspace on the `teams` base plan, with custom entitlements and `billingMode = offline_invoice`.”

All capture / notes / tags / search / AI behavior stays the same; only the plan config differs. 

---

## 2. Data model changes

Extend the **Workspace** (or “Team”) model:

```ts
type BillingMode = 'self_service' | 'offline_invoice'

model Workspace {
  id             String   @id @default(cuid())
  name           String
  planCode       String   // 'teams'
  billingMode    String   // 'self_service' | 'offline_invoice'
  customPlan     Boolean  @default(false)

  // Custom entitlements overlay
  entitlementsOverride Json?  // { maxSeats: 50, aiActionsPerMonth: 200000, ... }

  // Contract / invoicing info
  billingCompanyName   String?
  billingContactEmail  String?
  billingAddress       String?
  contractSeats        Int?      // agreed seat count
  contractStart        DateTime?
  contractEnd          DateTime?
  paymentTermsDays     Int?      // 30, 45, etc.

  createdAt       DateTime @default(now())
  // ...
}
```

Optionally keep a separate `Contract` or `BillingAccount` table if you want multiple workspaces under one contract, but the pattern is the same.

---

## 3. Entitlements for custom plans

You already have a base Teams plan config (e.g. `PLANS['teams']` → feature flags + limits). Now you **overlay the workspace’s overrides**:

```ts
type Entitlements = {
  canUseWhatsApp: boolean
  canUseTeamsIntegration: boolean
  canUseEmailIngestion: boolean
  canUseCalendarIntegration: boolean
  canUseAiNoteChat: boolean
  canUseAiLinkedDocs: boolean
  aiAutomationLevel: 'none' | 'basic' | 'advanced'
  maxAiActionsPerMonth: number
  seatLimit: number | null
  // ...
}

function getWorkspaceEntitlements(ws: Workspace): Entitlements {
  const base = plans['teams']              // standard Teams config
  const overrides = (ws.entitlementsOverride ?? {}) as Partial<Entitlements>

  return { ...base.entitlements, ...overrides }
}
```

**Examples of overrides** you’d store per customer:

* Higher/lower **AI quota**: `maxAiActionsPerMonth: 200_000`
* Different **seat limit**: `seatLimit: 100`
* Turn on/off specific things:

  * e.g. they pay for Teams + email ingestion but not calendar ingestion.

API and UI code still only ever looks at `entitlements`, not billing:

```ts
if (!ctx.entitlements.canUseEmailIngestion) {
  throw new ForbiddenError('Email ingestion is not enabled for this workspace.')
}
```

So a custom plan is just a different `entitlements` object.

---

## 4. Seats and usage for invoicing

### 4.1 Seat counting

Use `contractSeats` / `seatLimit` to enforce or at least display seat usage:

```ts
function canInviteNewMember(ws: Workspace, currentMembersCount: number): boolean {
  const ent = getWorkspaceEntitlements(ws)
  if (!ent.seatLimit) return true // unlimited or not enforced

  return currentMembersCount < ent.seatLimit
}
```

You can decide:

* **Hard cap**: block invites when `members >= seatLimit`.
* **Soft cap**: allow invites but flag as “over contract” for finance to up‑sell / invoice extras.

### 4.2 Usage for billing

To support offline invoicing:

* Track monthly usage snapshot for:

  * active seats
  * AI actions
  * automation runs
  * any other billable metric

Example table:

```ts
model WorkspaceUsageSnapshot {
  id          String   @id @default(cuid())
  workspaceId String
  month       String   // '2025-11'
  seats       Int
  aiActions   Int
  automationRuns Int
  createdAt   DateTime @default(now())
}
```

Your ops/finance team then:

* Pull this data at month end.
* Generate invoices according to the contract (e.g., base fee + overage).

Again, the **product logic** just uses entitlements and limits; it doesn’t care whether the invoice is Stripe or offline.

---

## 5. Product and UX behavior

### 5.1 In-app “Managed plan” experience

For `billingMode = offline_invoice`:

* Show a **“Managed plan” / “Enterprise” badge** in the workspace settings.
* Hide or disable self‑service credit card controls.

  * Instead of “Change plan / Cancel plan” → show “Contact Nabu to change your plan.”
* Show **seat count vs contract**:

  * “18 of 25 seats in use”
* Show **AI & automation usage vs limit**:

  * “This month: 40,000 / 80,000 AI actions.”

But everything they can do is still driven by the entitlements overlay.

### 5.2 Internal admin panel

You’ll want an internal UI for Nabu staff:

* Search for workspace.
* See:

  * base plan
  * billingMode
  * contract dates
  * contractSeats
  * entitlementsOverride (JSON → rendered as feature/limit table)
* Edit overrides safely:

  * sliders for seats & AI quota
  * toggles for features (email ingestion, calendar, advanced workflows, etc.)

This replaces ad‑hoc code changes with structured admin changes.

---

## 6. Summary pattern

When you sign a custom offline deal:

1. **Create workspace** (or upgrade existing one) with:

   * `planCode = 'teams'`
   * `billingMode = 'offline_invoice'`
   * `customPlan = true`
   * `entitlementsOverride` with their specific features/limits.
   * `contractSeats`, `contractStart`, `contractEnd`, etc.

2. **Product behavior**:

   * Entitlements = Teams base + overrides.
   * All gating uses `entitlements`, not `billingMode`.

3. **Billing behavior**:

   * Seats & usage logged monthly.
   * Finance generates offline invoice based on those metrics + contract.

That gives you maximum flexibility for custom team deals **without forking product logic**—everything still runs through the same entitlement switches; offline invoicing is just another billing mode attached to the workspace.
