# User Signup Flow with Plan Selection

## Feature Specification

Implement a user signup flow that:
1. Defaults new users to Free plan
2. Allows upgrade to Personal plan (without payment for testing)
3. Allows upgrade to Teams plan (creates workspace)
4. Handles workspace invite acceptance for team users
5. Integrates with existing Kinde authentication

## Implementation Details

### Phase 1: User Creation on First Login

**User Sync Service (`lib/user-sync.ts`):**
- `syncUser()` - Syncs Kinde user to database, creates if not exists
- Sets `plan: "free"` by default for new users
- Checks for pending workspace invites by email
- Returns user info and pending invites

**User Sync API (`app/api/user/sync/route.ts`):**
- POST endpoint called after Kinde authentication
- Returns user data and any pending workspace invites

### Phase 2: Plan Upgrade Flow

**Upgrade API (`app/api/user/upgrade/route.ts`):**
- GET: Returns current plan and available upgrade paths
- POST: Performs upgrade with validation

**Supported Upgrade Paths:**
- `free` → `personal` (updates plan field)
- `free` → `teams` (updates plan + creates workspace)
- `personal` → `teams` (updates plan + creates workspace)

**Teams Upgrade:**
- Requires `workspaceName` in request body
- Creates workspace with user as owner
- Creates membership with `owner` role
- Returns workspace info in response

**Upgrade Hooks (`hooks/use-plan-upgrade.ts`):**
- `useUpgradeOptions()` - Fetches current plan and available upgrades
- `usePlanUpgrade()` - Mutation hook for performing upgrades
- Automatically invalidates entitlements queries after upgrade

**Upgrade Page (`app/(app)/upgrade/page.tsx`):**
- Displays all three plans with features/limits comparison
- Shows current plan badge
- Teams upgrade triggers dialog for workspace name input
- Success redirects to notes

**Plan Comparison Card (`components/entitlements/PlanComparisonCard.tsx`):**
- Displays plan features and limits
- Shows upgrade button or "Current Plan" badge
- Loading state during upgrade

### Phase 3: Workspace Invite Acceptance

**Invite Acceptance Page (`app/(auth)/invite/[token]/page.tsx`):**
- Server component that validates invite
- Handles expired, already-accepted, and not-found cases
- Passes data to client form component

**Invite Acceptance Form (`components/invite/InviteAcceptanceForm.tsx`):**
- Shows workspace name, role, and email
- Handles authenticated vs unauthenticated states
- Email mismatch warning when logged in with different email
- Accept button calls POST `/api/invites/[token]`
- Success redirects to notes

### Phase 4: Team Member Management

**Members API (`app/api/workspaces/[id]/members/route.ts`):**
- GET: List all workspace members
- PATCH: Update member role (admin/member/guest)
- DELETE: Remove member from workspace

**Members Page (`app/(app)/workspace/[id]/members/page.tsx`):**
- Lists current members with avatars and roles
- Dropdown for role management (Make Admin, Make Member, Remove)
- Invite dialog with email and role selection
- Pending invites list with copy link and expiry dates

**Invite Email (`lib/email/send-invite.ts`):**
- `sendInviteEmail()` - Sends invite email via Postmark
- Uses HTML template from `lib/email/templates.ts`
- Includes workspace name, role, inviter name, and invite URL

**Email Templates (`lib/email/templates.ts`):**
- `generateInviteEmailHtml()` - Full HTML email template
- `generateInviteEmailText()` - Plain text fallback
- Branded design with Nabu styling

## Files Created

1. `lib/user-sync.ts` - User sync service
2. `app/api/user/sync/route.ts` - User sync API
3. `app/api/user/upgrade/route.ts` - Plan upgrade API
4. `hooks/use-plan-upgrade.ts` - Frontend upgrade hooks
5. `components/entitlements/PlanComparisonCard.tsx` - Plan card component
6. `app/(app)/upgrade/page.tsx` - Upgrade page
7. `app/(auth)/invite/[token]/page.tsx` - Invite acceptance page
8. `components/invite/InviteAcceptanceForm.tsx` - Invite form component
9. `app/api/workspaces/[id]/members/route.ts` - Members API
10. `app/(app)/workspace/[id]/members/page.tsx` - Members page
11. `lib/email/templates.ts` - Email templates
12. `lib/email/send-invite.ts` - Invite email service

## Files Modified

1. `components/entitlements/UpgradePrompt.tsx` - Updated links to `/upgrade`
2. `app/api/workspaces/[id]/invites/route.ts` - Added email sending
3. `app/(marketing)/faq/page.tsx` - Added Plans & Teams FAQ sections

## API Endpoints

### User Sync
```
POST /api/user/sync
Response: { user: { id, email, plan, isNewUser }, pendingInvites: [...] }
```

### Plan Upgrade
```
GET /api/user/upgrade
Response: { currentPlan, availableUpgrades, workspaces }

POST /api/user/upgrade
Body: { targetPlan: "personal" | "teams", workspaceName?: string }
Response: { previousPlan, newPlan, workspace?: { id, name } }
```

### Workspace Members
```
GET /api/workspaces/[id]/members
Response: [{ id, userId, email, firstName, lastName, role, status }]

PATCH /api/workspaces/[id]/members
Body: { memberId, role }

DELETE /api/workspaces/[id]/members?memberId=xxx
```

## Testing Scenarios

1. **New user signup** → Gets Free plan → Can upgrade to Personal
2. **Free → Personal upgrade** → Plan updated, entitlements refresh
3. **Free → Teams upgrade** → Workspace created, user is owner
4. **Personal → Teams upgrade** → Workspace created, user is owner
5. **User receives invite** → Signs up → Accepts invite → Joins workspace
6. **Existing user receives invite** → Logs in → Accepts invite
7. **Workspace admin invites** → Email sent → User accepts → Joins

## Future Enhancements

- Stripe payment integration for Personal and Teams plans
- Trial periods for paid plans
- Bulk invite functionality
- Invite expiration notifications
- Workspace plan management

