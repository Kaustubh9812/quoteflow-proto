# TaskTuck — Full Project State / Continuation Handoff

Last updated: 2026-09-19

## 1. PRODUCT

Product: TaskTuck  
Domain: https://task-tuck.com  
Repo: https://github.com/Kaustubh9812/quoteflow-proto  
Active branch: redesign-v2

Never work on main.

TaskTuck is a cleaning-business operations workspace:

customer inquiry -> Inbox / Intake -> AI brief -> operator review -> quote -> job -> customer/workspace records.

The original project was a QuoteFlow-style prototype. TaskTuck is now the product name.

## 2. CURRENT STATUS

Core MVP implemented and working:

- production website
- Cloudflare Worker hosting
- custom domain
- Better Auth signup/login/signout
- password reset
- email verification
- D1 persistence
- Workers AI production analysis
- Gemma 4 production model
- manual Intake desk
- structured operations briefs
- quote preparation and readiness
- quote email sending through Resend
- jobs
- customer directory
- settings
- markdown export
- recent briefs
- local Ollama development path
- authenticated AI endpoint
- unified Inbox source implementation
- inbound email Worker handler
- Inbox API
- Inbox D1 migration
- Cloudflare Email Routing

User-verified production behavior:

- Move-out inquiry produced a structured operations brief.
- Workspace survived sign-out/sign-in.
- Password-reset email arrived and reset flow worked.
- Verification email arrived and verification link worked.
- Unverified accounts were blocked from sign-in.
- Verified accounts could sign in.
- Real Gmail/Outlook email reached a real workspace inbox address.
- Plus-addressed inbox+alias routing worked.
- The message appeared in TaskTuck Inbox.
- AI categorization worked on the real inbound message.
- AI confidence displayed correctly.
- Human-review flag behavior worked.
- Quote-number matching worked.
- Sender-email quote matching worked.
- Inbox data survived normal workspace saves.

Production verification status:

- Inbox end-to-end: VERIFIED.
- Quote email delivery: IMPLEMENTED in source and deployed; external recipient delivery still needs explicit verification in the current test run unless already confirmed separately.

## 3. GIT STATE

Current redesign-v2 branch head:

37a47cbddc01d458a66a204aa37e5661cf9867e

Commit:

Add editable quote number field

User local folder:

C:\Users\9812k\quoteflow-proto

Normal sync:

~~~text
git fetch origin
git switch redesign-v2
git pull --ff-only origin redesign-v2
~~~

User prefers one concrete step at a time. Inspect current GitHub source before editing.

## 4. LATEST CONFIRMED DEPLOYMENT

The user successfully ran:

~~~text
git pull --ff-only origin redesign-v2
npx wrangler d1 migrations apply task-tuck-db --remote
npm run build
npm run deploy
~~~

Results:

- branch pulled successfully to 6e4e0ebc18389a8ecc81350498fa811528d650f4
- migration 0003_inbox.sql applied remotely successfully
- vinext build succeeded
- production deploy succeeded
- production URL: https://task-tuck.com
- production Worker: task-tuck
- production deployment version ID: 69dc67f9-485d-45e1-8ad0-b208d8988f29

Important routes from that build:

- /
- /api/analyze
- /api/auth/:all+
- /api/inbox
- /api/quotes/send
- /api/workspace
- /reset-password

Production bindings shown:

- D1 task_tuck_db
- AI
- BETTER_AUTH_URL
- TASKTUCK_INBOUND_DOMAIN

## 5. CLOUDFLARE / DOMAIN

Cloudflare nameservers:

- barbara.ns.cloudflare.com
- maciej.ns.cloudflare.com

The Worker custom-domain deployment initially conflicted with three apex A records:

- 207.207.210.50
- 207.207.210.23
- 207.207.210.36

The user deleted those three records. The custom domain then worked.

Do not delete unrelated DNS records during future work.

## 6. CLOUDFLARE EMAIL ROUTING — COMPLETED SETUP

Email Routing domain:

task-tuck.com

The user onboarded task-tuck.com for Cloudflare Email Routing.

The onboarding initially failed because Porkbun email records conflicted with Cloudflare Email Routing.

Removed Porkbun MX:

- fwd1.porkbun.com
- fwd2.porkbun.com

Removed conflicting Porkbun SPF:

- v=spf1 include:_spf.porkbun.com ~all

Cloudflare Email Routing records are now present/managed:

- route1.mx.cloudflare.net
- route2.mx.cloudflare.net
- route3.mx.cloudflare.net
- Cloudflare DKIM TXT
- Cloudflare SPF:
  v=spf1 include:_spf.mx.cloudflare.net ~all

Cloudflare dashboard showed the managed MX/DKIM records locked and the Cloudflare SPF record present.

Email Routing status:

Enabled

Catch-all:

Disabled

Destination addresses:

0, which is expected because TaskTuck's main rule uses a Worker rather than a mailbox destination.

## 7. CLOUDFLARE ROUTING RULE — COMPLETED

The user created and saved this routing rule:

- Email pattern: inbox
- Domain: task-tuck.com
- Action: Send to a Worker
- Worker: task-tuck
- Status: Active

This is a one-time TaskTuck platform rule.

Current intended route:

inbox+<workspace-alias>@task-tuck.com
-> Cloudflare Email Routing
-> Worker task-tuck
-> D1 workspace.inbox_json
-> TaskTuck Inbox

Cloudflare's current documentation confirms that routing rules can send matching mail to a Worker with an email() handler, and that plus-addressing can preserve +detail for the Worker when Subaddressing is enabled.

## 8. CLOUDFLARE SUBADDRESSING

TaskTuck generates addresses in this format:

inbox+<workspace-alias>@task-tuck.com

Cloudflare supports plus-addressing/subaddressing, but it must be enabled in:

Compute > Email Service > Email Routing > Settings

The screenshot previously showed the Subaddressing toggle off.

Status:

CONFIRMED ENABLED.

The user explicitly verified that Cloudflare Subaddressing is ON and that real TaskTuck inbox addresses using the +alias format work end-to-end.

## 9. WRANGLER

Important current values in wrangler.jsonc:

- name: task-tuck
- compatibility_date: 2026-09-18
- compatibility_flags: nodejs_compat
- main: ./worker/index.ts
- BETTER_AUTH_URL: https://task-tuck.com
- TASKTUCK_INBOUND_DOMAIN: task-tuck.com
- custom domain: task-tuck.com
- AI binding: AI
- D1 binding: task_tuck_db
- database name: task-tuck-db
- database ID: 697a9ffb-f78a-4274-863e-e929959a5ceb
- observability enabled

The custom Worker entry delegates HTTP requests to vinext/server/fetch-handler and exposes email() for Cloudflare Email Routing.

Do not replace worker/index.ts with a plain vinext handler without redesigning the email path.

## 10. D1

Database:

- Name: task-tuck-db
- Binding: task_tuck_db
- Region: APAC
- ID: 697a9ffb-f78a-4274-863e-e929959a5ceb

Current D1 model is MVP-level JSON-per-user, not a fully normalized SaaS schema.

## 11. D1 MIGRATIONS

0001_better_auth_core.sql

- user
- session
- account
- verification
- indexes

0002_workspace.sql

workspace fields:

- user_id
- briefs_json
- quotes_json
- jobs_json
- settings_json
- created_at
- updated_at

user_id references Better Auth user(id) with cascade deletion.

0003_inbox.sql

Adds:

- inbox_alias
- inbox_json
- unique index on inbox_alias

Remote status:

- 0001 applied
- 0002 applied
- 0003 applied successfully

Remote command:

~~~text
npx wrangler d1 migrations apply task-tuck-db --remote
~~~

## 12. AUTHENTICATION

Provider: Better Auth

Important files:

- src/lib/auth.ts
- src/lib/auth-client.ts
- src/components/AuthGate.tsx
- src/app/api/auth/[...all]/route.ts
- src/app/reset-password/page.tsx

Implemented:

- email/password signup
- login
- signout
- require verified email
- verification email through Resend
- resend verification behavior
- forgot password
- reset password
- reset-password page
- signup verification confirmation
- session-based access control

Production verified:

- signup
- verification email
- verification link
- verified login
- unverified login blocked
- logout/login persistence
- password reset end-to-end

A friendlier verification-specific sign-in message exists in source commit 1187614c but was intentionally not deployed. Production keeps the generic invalid-credentials message.

## 13. SECRETS

Cloudflare secrets exist for:

- BETTER_AUTH_SECRET
- RESEND_API_KEY

A previously exposed Better Auth secret was replaced.

Never record or expose:

- BETTER_AUTH_SECRET
- RESEND_API_KEY
- Cloudflare tokens
- passwords
- database credentials

Never put secrets into GitHub or committed environment files.

## 14. RESEND EMAIL DELIVERY

Sending domain:

task-tuck.com

Sender:

TaskTuck <noreply@task-tuck.com>

Implemented:

- password reset email
- email verification email
- quote email delivery

Quote email source:

src/app/api/quotes/send/route.ts

Quote email checks include:

- authenticated session
- workspace and quote existence
- Ready to send status
- valid customer email
- follow-up checklist resolved
- non-zero quote total
- Resend API key available

Business email is used as Reply-To when configured.

## 15. AI

Production:

Cloudflare Workers AI

Model:

@cf/google/gemma-4-26b-a4b-it

Local:

Ollama

Local defaults:

~~~text
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
~~~

Main route:

src/app/api/analyze/route.ts

Production behavior:

- authenticated POST only
- input max 20,000 characters
- structured operations brief
- model response parser handles response and choices[0].message.content
- prompt tells model not to invent unsupported information

Expected brief sections:

- Customer
- Property
- Service scope
- Timing & access
- Constraints & signals
- Follow-up checklist

Production Move-out brief was personally verified.

## 16. AI SECURITY / BUG HISTORY

Initial production bug:

The AI response was valid but parsed from the wrong response shape, producing an empty brief.

Parser was fixed to handle:

- response
- choices[0].message.content

Later browser issue:

ReferenceError: getJobLabel is not defined

The missing function was added and the brief then rendered correctly.

Current AI endpoint is session-protected.

Expected:

- authenticated request -> allowed
- unauthenticated request -> 401

A fresh production security re-test remains a useful hardening check.

## 17. WORKSPACE PERSISTENCE

Browser localStorage was replaced with D1-backed persistence.

GET /api/workspace:

- authenticates
- loads user workspace
- returns briefs, quotes, jobs, settings
- returns inbox alias/inbox data
- creates an inbox alias when needed

PUT /api/workspace:

- authenticates
- validates payload
- updates briefs/quotes/jobs/settings
- intentionally does NOT overwrite inbox_json or inbox_alias

That last point prevents normal workspace autosaves from clobbering background inbound emails.

Sign-out flow was also changed to save workspace before signing out.

The user verified persistence after logout/login.

## 18. INBOX IMPLEMENTATION

Main files:

- src/lib/inbox.ts
- src/app/api/inbox/route.ts
- worker/index.ts
- migrations/0003_inbox.sql
- src/app/page.tsx
- TASKTUCK_INBOX_SETUP.md

Each workspace receives a stable alias like:

tt-<18 random characters>

TaskTuck inbox address:

inbox+<workspace-alias>@task-tuck.com

Worker behavior:

1. Validate destination domain and inbox pattern.
2. Extract workspace alias.
3. Find workspace by inbox_alias.
4. Read raw MIME email.
5. Parse text/plain and text/html.
6. Record attachment filename/type metadata.
7. Strip common quoted replies.
8. Deduplicate using Message-ID.
9. Ask Workers AI to classify the email.
10. Match existing quote by quote number or sender email.
11. Store message in inbox_json.

Limits:

- stored body max 20,000 chars
- AI input max 16,000 chars
- 250 stored messages per workspace
- 20 attachment metadata entries per message

AI categories:

- inquiry
- query
- feedback
- complaint
- quote_response
- spam
- other

Additional AI fields:

- secondaryCategory
- confidence
- summary
- suggestedAction
- needsHumanReview
- customerName
- quoteNumber

Low-confidence/ambiguous messages get human-review flag.

Email content is explicitly treated as untrusted input and cannot override classifier rules.

## 19. INBOX API / UI

GET /api/inbox:

- authenticated
- returns messages
- inbox alias/address
- unread count
- needs-review count

PATCH /api/inbox:

- authenticated
- update status
- update category
- update human-review flag

UI includes:

- Inbox navigation
- unread badge
- All / Inquiries / Questions / Feedback / Complaints / Quote replies / Needs review
- message list and detail
- AI summary
- AI confidence display
- suggested action
- status controls
- category controls
- review flag controls
- copy message
- attachment filenames
- Open in Intake desk
- linked quote navigation
- 20-second polling on Overview/Inbox
- Overview Inbox metric
- Settings inbox address

## 20. CURRENT INBOUND EMAIL ARCHITECTURE

Current MVP architecture:

existing Gmail/Outlook mailbox
-> mailbox forwarding/filter
-> unique TaskTuck inbox address
-> Cloudflare Email Routing
-> task-tuck Worker email()
-> D1 inbox_json
-> TaskTuck Inbox

TaskTuck does NOT require the customer's or employee's Gmail/Microsoft password in this forwarding model.

Direct Gmail/Microsoft OAuth is a future upgrade.

## 21. WHAT HAS BEEN DONE IN EMAIL ROUTING

Completed:

- onboarded task-tuck.com
- removed Porkbun MX conflicts
- removed conflicting Porkbun SPF
- added/managed Cloudflare MX/SPF/DKIM
- Email Routing enabled
- routing rule created
- rule sends inbox pattern to Worker task-tuck
- rule status Active
- catch-all disabled

Cloudflare's current documentation confirms Worker routing and subaddressing behavior.

## 22. CURRENT NEXT STEPS

Inbox end-to-end verification is complete.

Immediate test sequence now:

1. Prepare a quote in the Quote editor.
2. Add customer name and a non-zero total.
3. Mark the quote Ready.
4. Click Email quote.
5. Verify the email reaches the external recipient inbox.
6. Verify subject, quote number, customer details, property, service scope, cleaning date, total, customer note/terms and Reply-To.
7. Verify the quote remains in the expected state after sending.
8. Test quote replies against the already-verified quote-number and sender-email matching paths.

Do not modify code during the manual test unless a concrete failure is observed.

## 23. NEAR-TERM HARDENING

- re-test authenticated /api/analyze
- re-test unauthenticated /api/analyze -> 401
- remove unused openai dependency after confirming no imports/references remain
- clean old OpenAI comments from .dev.vars.example
- add production-grade rate limiting
- improve account/profile settings
- improve inbound email observability and failure reporting
- refactor large src/app/page.tsx into components

## 24. MEDIUM-TERM SaaS ARCHITECTURE

Current workspace storage is JSON-per-user.

Eventually migrate incrementally to relational D1 tables for:

- organizations/workspaces
- workspace members
- roles
- customers
- inquiries/briefs
- quotes
- quote items
- jobs
- settings
- inbox messages
- attachments
- audit/history

Do not rewrite everything at once.

## 25. FUTURE FEATURES

Not yet implemented:

- direct Gmail OAuth
- direct Microsoft/Outlook OAuth
- richer mailbox thread synchronization
- full attachment storage/download
- calendar/scheduling integrations
- cleaner assignment
- SMS/WhatsApp
- Stripe billing
- subscription plans
- trial system
- AI usage metering
- team invitations
- organization roles
- audit log
- advanced analytics
- richer CRM/customer history
- full job timeline
- wider external integrations

These are roadmap items, not blockers for the current core MVP.

## 26. PACKAGE / LEGACY CLEANUP

package.json still contains:

openai ^7.15.0

OpenAI is no longer the production provider.

Remove it only after a source search confirms it is unused.

Also present:

- xlsx
- xlsx-populate
- legacy spreadsheet files/scripts

Do not remove those blindly.

## 27. REPO FILE MAP

Main:

- src/app/page.tsx
- src/app/layout.tsx
- src/app/globals.css

Auth:

- src/lib/auth.ts
- src/lib/auth-client.ts
- src/components/AuthGate.tsx
- src/app/api/auth/[...all]/route.ts
- src/app/reset-password/page.tsx

AI:

- src/app/api/analyze/route.ts

Workspace:

- src/app/api/workspace/route.ts
- migrations/0002_workspace.sql

Inbox:

- src/lib/inbox.ts
- src/app/api/inbox/route.ts
- worker/index.ts
- migrations/0003_inbox.sql
- TASKTUCK_INBOX_SETUP.md

Quotes:

- src/app/api/quotes/send/route.ts

Cloudflare:

- wrangler.jsonc
- vite.config.ts

Quality:

- package.json
- package-lock.json
- eslint.config.mjs
- tsconfig.json
- next.config.ts
- postcss.config.mjs

Docs:

- README.md
- AGENTS.md
- CLAUDE.md
- .dev.vars.example
- TASKTUCK_INBOX_SETUP.md
- TASKTUCK_PROJECT_STATE.md

Legacy:

- QuoteFlow_FINAL_AGENT_READY.xlsx
- Excel_Archive/
- excel-raw-data-cleaner.js
- scraper-agent.js

## 28. KEY COMMITS

aff19e3c766e895e48d19bc87577cf203c95352
- prototype dashboard build complete

cf33c5f
- Set project to ESM for vinext

69d0d7372658a14aa6442969dbc67908b7df1564
- Ignore generated vinext dist output in ESLint

cf1c4141173b140b1ab33b3a43993a69b1aa256b
- Fix React lint issues

a010ba6224a6da5d649c4503bf590e243eb225ff
- Add explicit vinext preview deployment path

0766976e3479ad0e6f96d6747e266fd701f5c7fe
- Add safe local environment variable template

25b5727
- Add Better Auth dependency

bd9d9ad
- Bind TaskTuck to D1

b13997261c906c9793a2a1c36b7b7c1dc2db2f17
- Add Better Auth core migration

f77f43aaac857bae178b83a299d175f766442d4d
- Configure production auth URL and custom domain

7a3011a9abd78d7fe463fcbabec79a9a00edfa76
- Move workspace storage to D1

dbe3f82476cbbbbc312bcbda8973bce40e4f37f5
- Add sign out and cloud workspace labels

892637b1577d6776b660d185d3cf29dea56c135a
- Fix Workers AI response parsing for Gemma 4

f897e4fc5377d2c1c2bf786bea4dc0f4869e2eb6
- Make workspace saves reliable before sign out

2d8bfb10f30523f2d99b85a6df5ad49df4e1b700
- Fix recent brief rendering error

e7e000606bd6d5afcc425efe3d4e30227eec2b8e
- Protect AI analysis endpoint with authentication

12ee696
- Add Resend password reset email delivery

b9c357e
- Add password reset page

e9e5997
- Allow password reset page without authentication

f0c81a2
- Add forgot password request flow and UI

e2f7118
- Require verified email for TaskTuck accounts

950edb2
- Show email verification confirmation after signup

1187614
- Show verification message for unverified sign-in; source-only, not deployed

6e4e0ebc18389a8ecc81350498fa811528d650f4
- Refine TaskTuck overview and inbox AI confidence display

## 29. NEW-CHAT RESUME

~~~text
We are continuing TaskTuck.

Read TASKTUCK_PROJECT_STATE.md in the GitHub repo Kaustubh9812/quoteflow-proto on branch redesign-v2.

Do not touch main.

Inspect the current GitHub source before changing anything.

TaskTuck is a cleaning-business SaaS workspace at https://task-tuck.com using Cloudflare Workers, D1, Better Auth, Workers AI/Gemma 4, Resend and Cloudflare Email Routing.

Latest source checkpoint:
37a47cbddc01d458a66a204aa37e5661cf9867e

D1 migration 0003_inbox.sql has been applied remotely.

Cloudflare Email Routing for task-tuck.com is enabled.
Subaddressing is enabled.
The real inbound Gmail/Outlook -> TaskTuck Inbox path has been verified end-to-end.

Routing rule:
inbox @ task-tuck.com -> Send to Worker -> task-tuck
Status: Active.

The immediate remaining verification is outbound quote email delivery through Resend.

Continue from the exact state in this file, not from scratch.
~~~

## 30. SECURITY RULES

Never expose or commit:

- BETTER_AUTH_SECRET
- RESEND_API_KEY
- Cloudflare credentials/tokens
- passwords
- production user secrets

Server endpoints must authenticate independently where appropriate.

Customer email is untrusted input and must not override AI/system instructions.

Never work on main.

Do not restart the project from scratch.

The core MVP is already working. Inbox end-to-end verification is complete. The immediate job is to finish outbound quote email verification and then move into product hardening/roadmap work.
