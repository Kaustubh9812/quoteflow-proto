# TaskTuck — Complete Project State / LLM Handoff

Last updated: 2026-09-19

> This file is the source of truth for continuing TaskTuck in a new chat or with another LLM.
> Read this file before changing code, infrastructure, tests, or documentation.
> Do not assume prior chat context exists.

---

# 1. READ THIS FIRST

## Product

TaskTuck is a cleaning-business operations SaaS workspace.

Domain:
https://task-tuck.com

GitHub repository:
https://github.com/Kaustubh9812/quoteflow-proto

Active branch:
`redesign-v2`

Never work on `main`.

## Product vision

TaskTuck is intended to become an **AI operating system for cleaning businesses**, not just a quote generator.

The core operational loop is:

`Customer message -> Understand -> Act -> Get paid -> Fulfill`

The current MVP implements the beginning of that loop:

`Customer message -> Inbox -> Review inquiry -> AI operations brief -> Quote -> Send quote -> customer reply -> Job`

AI should remove administrative work, but the operator should not have to understand AI/model internals.

The UX goal is:

**Show the operator what they should do next.**

Do not expose internal concepts unnecessarily.

## Current product direction

The order of work is:

1. Finish and verify the core workflow.
2. Test the core workflow thoroughly in production.
3. Simplify UX where real testing shows friction.
4. Re-test the simplified workflow.
5. Only then build onboarding.
6. After the core is reliable, expand SaaS functionality.

Do NOT jump to onboarding or large architecture rewrites while the core workflow is still under manual verification.

---

# 2. CURRENT EXACT CHECKPOINT

We are currently doing production test cases, not UI-copy review.

The user explicitly wants a test-case-driven workflow.

## Current test status

### TC-01 — Customer inquiry -> quote details

Status: **PASSED**

Test input was an existing real Inbox inquiry:

> Need a quote for house cleaning

with the message context:

- house
- approximately 1,800 sq ft
- 3 bedrooms
- sometime next week

TaskTuck generated:

- Property type: House
- Size: ~1800 sq ft
- Rooms: 3 bedrooms
- Service: General cleaning
- Timing: Sometime next week
- No invented customer name
- No invented exact date/time
- Follow-up questions for cleaning type, exact date/time, tasks, access, and pets

Assessment:
The extraction is correct and usable for the next workflow stage.

### TC-02 — Incomplete inquiry -> quote readiness

Status: **PASSED**

A quote was created from the above inquiry.

Quote number:
`TT-1236`

The customer-facing preview currently shows:

- Draft
- Customer name missing
- House · ~1800 sq ft · 3 bedrooms
- General cleaning with specific tasks missing
- Cleaning date: Sometime next week
- Related date: Not provided
- TOTAL: US$0.00

This is expected evidence that the quote carries forward missing information instead of inventing it.

The operator-side quote screen showed `0/5 done`, the customer name was missing, the service scope was incomplete, the total was US$0.00, and the screen explicitly stated that a customer name, price above $0, and completed missing details were required before sending. The `Send quote` control was faded/disabled and clicking `Ready to send` did not allow the quote to become sendable.

Conclusion: the incomplete quote is correctly prevented from being sent.

Do not modify quote `TT-1236` as part of this test; it can remain as a historical incomplete-quote fixture.

### Immediate next action

Begin TC-03 with a fresh, complete customer inquiry.

We are checking the functional quote-creation path, not wording or visual polish.

---

# 3. MASTER TEST SUITE

Use these tests in order.

| ID | Test | Purpose | Status |
|---|---|---|---|
| TC-01 | New customer inquiry -> quote details | Verify AI extraction | PASSED |
| TC-02 | Incomplete inquiry -> quote readiness | Verify missing-data/send guards | IN PROGRESS |
| TC-03 | Complete inquiry -> create quote | Verify quote creation with usable data | NOT STARTED |
| TC-04 | Quote validation | Verify required fields before sending | NOT STARTED |
| TC-05 | Send quote | Verify Resend production delivery | NOT STARTED |
| TC-06 | Customer accepts/replies to quote | Verify inbound reply matching | Partially pre-verified |
| TC-07 | Accepted quote -> job | Verify quote-to-job transition | NOT STARTED |
| TC-08 | Customer persistence | Verify customer data survives workflow | NOT STARTED |
| TC-09 | Workspace persistence | Verify D1 persistence across logout/login | PASSED historically |
| TC-10 | Ambiguous/wrong reply | Prevent incorrect quote association | NOT STARTED |
| TC-11 | Failure handling | Prevent corrupted/half-complete state | NOT STARTED |
| TC-12 | Full real-world happy path | Verify end-to-end business loop | NOT STARTED |

## Required final happy path

The product should successfully handle:

**Real customer email -> TaskTuck Inbox -> AI categorization -> inquiry review -> quote -> quote email -> customer reply -> quote matching -> accepted quote -> job**

That is the main MVP proof.

---

# 4. CORE PRODUCT WORKFLOW

## Current workflow

1. Customer emails the cleaning business's normal/public mailbox.
2. The business forwards/filter-routes customer mail to a private TaskTuck address.
3. Cloudflare Email Routing sends the TaskTuck address to the TaskTuck Worker.
4. The Worker parses the email.
5. TaskTuck categorizes the message with Workers AI.
6. The message appears in Inbox.
7. Operator opens/reviews an inquiry.
8. TaskTuck creates a structured operations brief.
9. Operator creates/prepares a quote.
10. Operator completes missing information and sets price.
11. Quote becomes `Ready to send`.
12. TaskTuck sends the customer quote using Resend.
13. Customer replies normally by email.
14. TaskTuck receives the reply.
15. TaskTuck tries to match the reply using quote number and/or sender email.
16. Operator processes the reply.
17. Accepted quote can move into operational job flow.

## Future workflow

Later the same system should expand into:

- scheduling
- cleaner assignment
- customer history
- billing
- reminders
- team workflows
- analytics
- integrations
- direct Gmail/Microsoft synchronization
- SMS/WhatsApp
- subscription/billing infrastructure

These are not current blockers.

---

# 5. UX DIRECTION

The product should feel like a calm operations assistant.

## UX principles

- Show the next action, not the internal system state.
- Prefer plain operational language.
- Avoid exposing model/provider details unless useful.
- Use progressive disclosure.
- Keep AI assistance visible through outcomes rather than technical implementation.
- Keep the main workflow obvious:
  `message -> review -> quote -> job`

## Main navigation

Current navigation:

- Today
- Inbox
- Quotes
- Jobs
- Customers
- Settings

Review inquiry is a contextual workflow rather than a permanent main navigation item.

## UX simplification already implemented

Source commits:

- `be0ee577b532f1120ad1cc867026325c8b70b549` — Simplify TaskTuck UX across core workflows
- `ced5b3302fc4acb6036d66fafd6fc4683893ac02` — Refine quote preview language

Changes include:

- Overview -> Today
- simpler Inbox language
- Review inquiry as the contextual intake action
- less AI-centric navigation
- simpler quote wording
- simpler Jobs/Customers/Settings copy
- technical AI/model header status removed
- core persistence and workflow behavior intentionally left unchanged

The UX pass has now been deployed to production and visually smoke-tested.

Do not start another UX rewrite unless a functional/user-testing problem requires it.

---

# 6. PRODUCTION STATUS

Production URL:

https://task-tuck.com

Worker:

`task-tuck`

Latest confirmed production deployment version:

`21d0572f-c7f3-4608-a0a3-e3abd64b308a`

Latest `redesign-v2` branch checkpoint:

`95479ccd53155115edf016ded7e554be97700e3f`

Latest source commit containing the UX changes:

`ced5b3302fc4acb6036d66fafd6fc4683893ac02`

Latest documentation checkpoint commit before this update:

`95479ccd53155115edf016ded7e554be97700e3f`

The user successfully performed:

- git fetch/pull
- production build
- production deploy

The production build succeeded.

Important production routes present in the successful build:

- `/`
- `/api/analyze`
- `/api/auth/:all+`
- `/api/inbox`
- `/api/quotes/send`
- `/api/workspace`
- `/reset-password`

---

# 7. TECH STACK

Current package/runtime stack includes:

- React 19
- Next 16 compatibility layer through vinext
- vinext
- Cloudflare Workers
- Cloudflare D1
- Better Auth
- Cloudflare Workers AI
- Google Gemma 4 model
- Resend
- Cloudflare Email Routing
- Tailwind CSS
- TypeScript
- ESLint

Important package versions in `package.json` include:

- `better-auth ^1.7.5`
- `vinext 1.0.0-beta.10`
- `@vinext/cloudflare 1.0.0-beta.4`
- `next 16.3.5`
- `react 19.2.8`
- `wrangler 4.133.0`

`openai ^7.15.0` is still present in package.json even though OpenAI is no longer the production AI provider. Remove it only after confirming there are no remaining imports/references.

Do not blindly delete legacy XLSX dependencies/files.

---

# 8. CLOUDFLARE WORKER / WRANGLER

Important `wrangler.jsonc` values:

- name: `task-tuck`
- compatibility_date: `2026-09-18`
- compatibility_flags: `nodejs_compat`
- main: `./worker/index.ts`
- BETTER_AUTH_URL: `https://task-tuck.com`
- TASKTUCK_INBOUND_DOMAIN: `task-tuck.com`
- custom domain: `task-tuck.com`
- AI binding: `AI`
- D1 binding: `task_tuck_db`
- D1 database name: `task-tuck-db`
- D1 database ID: `697a9ffb-f78a-4274-863e-e929959a5ceb`
- observability: enabled

IMPORTANT:

`worker/index.ts` is not just a normal HTTP handler.

It delegates HTTP requests to vinext/server/fetch-handler and also exposes Cloudflare's `email()` handler for inbound email.

Do not replace `worker/index.ts` with a plain vinext handler without preserving/rebuilding the email path.

---

# 9. D1

Database:

- Name: `task-tuck-db`
- Binding: `task_tuck_db`
- Region: APAC
- ID: `697a9ffb-f78a-4274-863e-e929959a5ceb`

Current MVP storage model:

**JSON-per-user**, not fully normalized relational SaaS schema.

This is intentionally acceptable for the current MVP.

Future migration can introduce relational tables incrementally.

---

# 10. D1 MIGRATIONS

## 0001_better_auth_core.sql

Contains Better Auth core tables:

- user
- session
- account
- verification
- indexes

## 0002_workspace.sql

Workspace row contains JSON fields including:

- user_id
- briefs_json
- quotes_json
- jobs_json
- settings_json
- created_at
- updated_at

## 0003_inbox.sql

Adds:

- inbox_alias
- inbox_json
- unique index on inbox_alias

Remote migrations status:

- 0001 applied
- 0002 applied
- 0003 applied successfully

Remote command:

```text
npx wrangler d1 migrations apply task-tuck-db --remote
```

Do not re-run destructive migrations casually.

---

# 11. AUTHENTICATION

Provider:

Better Auth

Important files:

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/components/AuthGate.tsx`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/reset-password/page.tsx`

Implemented:

- signup
- email/password login
- signout
- verified-email requirement
- verification email
- resend verification
- forgot password
- password reset
- reset-password UI
- session-based access control

Production verified:

- signup
- verification email
- verification link
- verified login
- unverified sign-in blocked
- logout/login persistence
- password reset

A friendlier verification-specific sign-in message exists in source commit `1187614`, but it was intentionally not deployed. Do not assume that source behavior is currently live.

---

# 12. SECRETS / SECURITY

Cloudflare secrets exist for:

- BETTER_AUTH_SECRET
- RESEND_API_KEY

Never expose, print, commit, or put in documentation:

- BETTER_AUTH_SECRET
- RESEND_API_KEY
- Cloudflare tokens/credentials
- passwords
- production secrets
- database credentials

A previously exposed Better Auth secret was replaced.

Security rule:

Customer email is untrusted input.

It must not be able to override system/AI instructions.

---

# 13. AI

Production AI:

Cloudflare Workers AI

Production model:

`@cf/google/gemma-4-26b-a4b-it`

Local development:

Ollama

Local defaults:

```text
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Main AI route:

`src/app/api/analyze/route.ts`

Production AI route behavior:

- authenticated POST only
- max input around 20,000 characters
- structured operations brief
- parser supports `response`
- parser also supports `choices[0].message.content`
- prompt tells model not to invent unsupported information

Expected brief headings:

- Customer
- Property
- Service scope
- Timing & access
- Constraints & signals
- Follow-up checklist

Important:

Those headings are internal data/parser structures. Do not blindly rename their underlying keys just because the UI language was simplified.

---

# 14. AI BUG HISTORY

Initial production issue:

Gemma returned valid content, but the parser looked at the wrong response shape. This created an empty brief.

Fixed by supporting:

- `response`
- `choices[0].message.content`

Later browser issue:

`ReferenceError: getJobLabel is not defined`

Fixed by adding the missing function.

Current expected AI endpoint behavior:

- authenticated request -> allowed
- unauthenticated request -> 401

A fresh production security re-test is still useful as a hardening test.

---

# 15. WORKSPACE PERSISTENCE

Browser localStorage was replaced with D1-backed persistence.

## GET /api/workspace

- authenticates user
- loads workspace
- returns briefs
- returns quotes
- returns jobs
- returns settings
- returns inbox alias
- returns inbox data
- creates inbox alias when needed

## PUT /api/workspace

- authenticates user
- validates payload
- saves briefs
- saves quotes
- saves jobs
- saves settings
- intentionally does NOT overwrite inbox_json
- intentionally does NOT overwrite inbox_alias

This separation prevents normal workspace autosaves from deleting background inbound emails.

Signout flow was changed to save workspace before signing out.

Production verification:

Workspace survived logout/login.

---

# 16. INBOX / INBOUND EMAIL ARCHITECTURE

Current intended architecture:

`existing Gmail/Outlook mailbox`
-> mailbox forwarding/filter
-> unique TaskTuck inbox address
-> Cloudflare Email Routing
-> Worker `email()`
-> D1 `inbox_json`
-> TaskTuck Inbox

The TaskTuck inbox address is private/internal.

The business should continue using its normal public email address with customers.

Current format:

`inbox+<workspace-alias>@task-tuck.com`

Direct Gmail/Microsoft OAuth is a future improvement, not the current MVP requirement.

---

# 17. CLOUDFLARE EMAIL ROUTING — COMPLETED

Domain:

`task-tuck.com`

Cloudflare Email Routing:

Enabled

Catch-all:

Disabled

Destination addresses:

0

This is expected because the main route goes to a Worker.

## Porkbun conflict cleanup

Removed conflicting Porkbun MX:

- fwd1.porkbun.com
- fwd2.porkbun.com

Removed conflicting Porkbun SPF:

`v=spf1 include:_spf.porkbun.com ~all`

Cloudflare managed records include:

- route1.mx.cloudflare.net
- route2.mx.cloudflare.net
- route3.mx.cloudflare.net
- Cloudflare DKIM TXT
- Cloudflare SPF:
  `v=spf1 include:_spf.mx.cloudflare.net ~all`

Do not delete unrelated DNS records during future work.

---

# 18. CLOUDFLARE ROUTING RULE

Current active rule:

- email pattern: `inbox`
- domain: `task-tuck.com`
- action: Send to a Worker
- Worker: `task-tuck`
- status: Active

Current route:

`inbox+<workspace-alias>@task-tuck.com`
-> Cloudflare Email Routing
-> Worker `task-tuck`
-> D1
-> Inbox

---

# 19. SUBADDRESSING

Cloudflare Email Routing subaddressing:

**Enabled and verified.**

TaskTuck workspace addresses use:

`inbox+<workspace-alias>@task-tuck.com`

Real inbound Gmail/Outlook -> TaskTuck messages using the +alias path were successfully verified.

---

# 20. INBOX IMPLEMENTATION

Main files:

- `src/lib/inbox.ts`
- `src/app/api/inbox/route.ts`
- `worker/index.ts`
- `migrations/0003_inbox.sql`
- `src/app/page.tsx`
- `TASKTUCK_INBOX_SETUP.md`

Workspace alias:

`tt-<18 random characters>`

Worker flow:

1. Validate destination domain and inbox pattern.
2. Extract workspace alias.
3. Find workspace by inbox_alias.
4. Read raw MIME email.
5. Parse text/plain and text/html.
6. Record attachment filename/type metadata.
7. Strip common quoted reply history.
8. Deduplicate using Message-ID.
9. Classify with Workers AI.
10. Match an existing quote by quote number or sender email.
11. Store message in inbox_json.

Limits:

- stored body max 20,000 chars
- AI input max 16,000 chars
- 250 stored messages per workspace
- 20 attachment metadata entries per message

Categories:

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

Low-confidence/ambiguous emails can be flagged for human review.

---

# 21. INBOX API / UI

GET /api/inbox:

- authenticated
- messages
- inbox alias/address
- unread count
- needs-review count

PATCH /api/inbox:

- authenticated
- status updates
- category updates
- human-review flag updates

Current Inbox capabilities:

- Inbox navigation
- unread count
- message list
- message detail
- AI summary
- AI confidence
- suggested action
- status controls
- category controls
- review flag
- copy message
- attachment filenames
- contextual Review inquiry
- linked quote navigation
- Overview/Inbox polling
- Settings inbox address

---

# 22. HISTORICALLY VERIFIED INBOX BEHAVIOR

Production verification already proved:

- Real Gmail/Outlook email reaches TaskTuck.
- Plus-address routing works.
- Inbound message appears in Inbox.
- AI categorization works.
- AI confidence displays.
- Human-review behavior works.
- Quote-number matching works.
- Sender-email quote matching works.
- Inbox survives normal workspace saves.

Therefore:

**Inbox end-to-end is considered VERIFIED.**

Do not unnecessarily rebuild the Inbox infrastructure.

---

# 23. RESEND / OUTBOUND EMAIL

Sending domain:

`task-tuck.com`

Sender:

`TaskTuck <noreply@task-tuck.com>`

Implemented email flows:

- password reset email
- email verification email
- quote email

Main quote-send route:

`src/app/api/quotes/send/route.ts`

## Current quote-send guardrails

The route requires:

1. authenticated user
2. existing workspace
3. existing quote
4. quote status = `Ready to send`
5. customer name present
6. valid customer email
7. all follow-up items resolved
8. quote total > 0
9. RESEND_API_KEY configured

The route uses:

- Resend API
- quote-specific idempotency key
- HTML + plain text email
- configured business email as Reply-To when available

Quote email includes:

- business name
- quote number
- property
- cleaning date when present
- related date when present
- service items
- quote total
- terms when present
- business contact details

Current production state:

**Implemented and deployed.**

Still needs explicit current-run external recipient verification as part of the test suite.

---

# 24. CURRENT QUOTE TEST STATE

Quote under TC-02:

`TT-1236`

Current customer-facing preview:

- Draft
- Customer name missing
- House · ~1800 sq ft · 3 bedrooms
- General cleaning, specific tasks missing
- Cleaning date: Sometime next week
- Related date: Not provided
- Total: US$0.00

This is a deliberately incomplete quote generated from an incomplete customer inquiry.

The goal of TC-02 is to verify that TaskTuck refuses to treat this as sendable.

---

# 25. QUOTE WORKFLOW TEST SEQUENCE

Once TC-02 is complete, proceed in this exact order.

## TC-03 — Complete inquiry -> create quote

Use a realistic complete inquiry containing:

- customer name
- customer email
- property
- size
- service type
- desired cleaning date
- relevant scope details
- access information where useful

Verify the quote contains the expected data without hallucinating missing details.

## TC-04 — Quote validation

Deliberately test the guards:

- no customer name
- invalid customer email
- $0 total
- unresolved follow-up
- status not `Ready to send`

Each should block sending.

Then create a valid quote:

- customer name present
- valid email
- non-zero price
- required details resolved
- Ready to send

Only then send.

## TC-05 — Send quote

Verify:

- customer receives email
- subject is sensible
- quote number is correct
- customer name is correct
- property information is correct
- service scope is correct
- cleaning date is correct
- total is correct
- business Reply-To is correct when configured
- quote remains in expected state after send
- repeated clicks do not create obvious duplicate sends because the route uses idempotency

Do not judge cosmetic copy unless it causes a functional/customer-facing problem.

## TC-06 — Customer reply

Reply from the customer mailbox.

Use the quote number in at least one test.

Verify:

- reply reaches Inbox
- categorized as quote_response
- linked quote is correct
- sender matching works
- operator can process the response

Already historically verified:

- quote-number matching
- sender-email matching

Still useful to re-test together after outbound delivery.

## TC-07 — Accepted quote -> job

For an accepted quote:

- process acceptance
- confirm quote state
- create/move to job
- confirm job contains customer/service information
- confirm job persists

This is currently a key unfinished core workflow check.

## TC-08 — Customer persistence

Verify that the same customer remains associated with:

- inquiry
- quote
- job
- future activity

## TC-09 — Workspace persistence

Existing verification already proved logout/login persistence.

Re-test after the quote/job flow is complete so current workflow state survives sessions.

## TC-10 — Ambiguous/wrong reply

Test a reply that:

- comes from a known customer
- does not contain a quote number
- could plausibly refer to multiple quotes

The system must not silently associate it with the wrong quote.

## TC-11 — Failure handling

Test:

- invalid JSON/API request
- missing quote
- unauthorized request
- Resend configuration failure
- malformed workspace data where practical

No half-written or corrupted business state should result.

## TC-12 — Full happy path

Run one realistic scenario from start to finish without manually repairing data in the database.

Success condition:

**customer email -> inbox -> AI -> review -> quote -> send -> customer reply -> quote match -> accepted -> job -> persistence**

Only after this passes should the project move into non-core roadmap work.

---

# 26. KEY CURRENT USER-VERIFIED BEHAVIOR

The following have been personally verified in production during the project:

Authentication:

- signup works
- verification email arrives
- verification link works
- unverified users are blocked
- verified users can log in
- sign out works
- login persistence works
- password reset works

Workspace:

- D1 persistence works
- data survives logout/login
- Inbox data survives normal workspace saves

AI:

- real production analysis works
- Gemma 4 output is parsed
- structured operations brief is generated
- no-invention behavior for missing fields was observed in TC-01

Inbox:

- real external mail reaches Inbox
- plus addressing works
- categorization works
- confidence works
- human review works
- quote matching works

Email infrastructure:

- Cloudflare Email Routing enabled
- Worker routing active
- Subaddressing enabled
- Resend sending domain configured
- Resend API key configured as Cloudflare secret

---

# 27. FILE MAP

## Main UI

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

## Auth

- `src/lib/auth.ts`
- `src/lib/auth-client.ts`
- `src/components/AuthGate.tsx`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/reset-password/page.tsx`

## AI

- `src/app/api/analyze/route.ts`

## Workspace

- `src/app/api/workspace/route.ts`
- `migrations/0002_workspace.sql`

## Inbox

- `src/lib/inbox.ts`
- `src/app/api/inbox/route.ts`
- `worker/index.ts`
- `migrations/0003_inbox.sql`
- `TASKTUCK_INBOX_SETUP.md`

## Quotes

- `src/app/api/quotes/send/route.ts`

## Infrastructure

- `wrangler.jsonc`
- `vite.config.ts`

## Quality/config

- `package.json`
- `package-lock.json`
- `eslint.config.mjs`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`

## Documentation

- `README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.dev.vars.example`
- `TASKTUCK_INBOX_SETUP.md`
- `TASKTUCK_PROJECT_STATE.md`

## Legacy

- `QuoteFlow_FINAL_AGENT_READY.xlsx`
- `Excel_Archive/`
- `excel-raw-data-cleaner.js`
- `scraper-agent.js`

---

# 28. GIT / WORKING RULES

Active branch:

`redesign-v2`

Never work on:

`main`

User local folder:

`C:\Users\9812k\quoteflow-proto`

Normal sync:

```text
git fetch origin
git switch redesign-v2
git pull --ff-only origin redesign-v2
```

Before modifying source:

1. Inspect the current GitHub source.
2. Confirm current branch/state.
3. Make the smallest change necessary.
4. Build.
5. Deploy only when appropriate.
6. Test the actual production behavior.
7. Update this documentation file with the result.

Do not make multiple speculative code changes at once.

Do not rewrite working infrastructure because of assumptions.

Do not restart the product from scratch.

---

# 29. IMPORTANT DEVELOPMENT STYLE FOR THE USER

The user describes himself as a "vibe coder" and prefers:

- exact commands
- one coherent step at a time
- no giant terminal instructions when a single next action is enough
- practical explanations
- blunt identification of failures
- no unnecessary reassurance
- direct GitHub edits when safe and appropriate

When guiding the user manually, distinguish clearly between:

- what the user should click/type now
- what we are testing
- what counts as pass/fail

The user does NOT want long UI-copy review sessions.

Primary focus right now:

**functional product testing.**

---

# 30. KNOWN TECHNICAL CAVEATS

## JSON-per-user storage

Current D1 design is still MVP-level.

Do not migrate to relational schema during core workflow testing unless a real blocker appears.

## Large page component

`src/app/page.tsx` remains large.

A future refactor should split it into components, but do not make that refactor during core workflow verification unless necessary to fix a concrete problem.

## Legacy OpenAI dependency

`openai ^7.15.0` remains in package.json.

Confirm source usage before removing it.

Also present:

- xlsx
- xlsx-populate
- legacy spreadsheet files/scripts

Do not remove them blindly.

## AI endpoint hardening

A fresh authenticated/unauthenticated production verification of `/api/analyze` remains useful.

Expected:

- authenticated -> success
- unauthenticated -> 401

## Rate limiting

Production-grade rate limiting is not yet implemented.

---

# 31. NEAR-TERM WORK AFTER TC-12

Only after the core workflow passes:

1. Fix any concrete production issues found by testing.
2. Re-run the full happy path.
3. Harden authentication/API security.
4. Improve failure reporting/observability.
5. Improve account/profile settings.
6. Remove unused OpenAI dependency after source confirmation.
7. Refactor the oversized page component.

Only after this should broader SaaS work begin.

---

# 32. MEDIUM-TERM SAAS ARCHITECTURE

Current storage can eventually be normalized into D1 tables for:

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

Do this incrementally.

Do not rewrite everything at once.

---

# 33. FUTURE FEATURES

Not yet implemented:

- direct Gmail OAuth
- direct Microsoft/Outlook OAuth
- richer mailbox threading
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

These are roadmap items.

They are not current blockers.

---

# 34. IMPORTANT HISTORICAL COMMITS

`aff19e3c766e895e48d19bc87577cf203c95352`
- prototype dashboard build complete

`cf33c5f`
- Set project to ESM for vinext

`69d0d7372658a14aa6442969dbc67908b7df1564`
- Ignore generated vinext dist output in ESLint

`cf1c4141173b140b1ab33b3a43993a69b1aa256b`
- Fix React lint issues

`a010ba6224a6da5d649c4503bf590e243eb225ff`
- Add explicit vinext preview deployment path

`0766976e3479ad0e6f96d6747e266fd701f5c7fe`
- Add safe local environment variable template

`25b5727`
- Add Better Auth dependency

`bd9d9ad`
- Bind TaskTuck to D1

`b13997261c906c9793a2a1c36b7b7c1dc2db2f17`
- Add Better Auth core migration

`f77f43aaac857bae178b83a299d175f766442d4d`
- Configure production auth URL and custom domain

`7a3011a9abd78d7fe463fcbabec79a9a00edfa76`
- Move workspace storage to D1

`dbe3f82476cbbbbc312bcbda8973bce40e4f37f5`
- Add sign out and cloud workspace labels

`892637b1577d6776b660d185d3cf29dea56c135a`
- Fix Workers AI response parsing for Gemma 4

`f897e4fc5377d2c1c2bf786bea4dc0f4869e2eb6`
- Make workspace saves reliable before sign out

`2d8bfb10f30523f2d99b85a6df5ad49df4e1b700`
- Fix recent brief rendering error

`e7e000606bd6d5afcc425efe3d4e30227eec2b8e`
- Protect AI analysis endpoint with authentication

`12ee696`
- Add Resend password reset email delivery

`b9c357e`
- Add password reset page

`e9e5997`
- Allow password reset page without authentication

`f0c81a2`
- Add forgot password request flow and UI

`e2f7118`
- Require verified email for TaskTuck accounts

`950edb2`
- Show email verification confirmation after signup

`1187614`
- Show verification message for unverified sign-in; source-only, not deployed

`6e4e0ebc18389a8ecc81350498fa811528d650f4`
- Refine TaskTuck overview and inbox AI confidence display

`be0ee577b532f1120ad1cc867026325c8b70b549`
- Simplify TaskTuck UX across core workflows

`ced5b3302fc4acb6036d66fafd6fc4683893ac02`
- Refine quote preview language

`95479ccd53155115edf016ded7e554be97700e3f`
- Correct handoff branch checkpoint

---

# 35. NEW-CHAT RESUME PROMPT

Copy/paste the following into a new LLM chat after it has access to the repository:

```text
We are continuing the TaskTuck project.

First read TASKTUCK_PROJECT_STATE.md in the GitHub repo:
Kaustubh9812/quoteflow-proto
branch: redesign-v2

Do not touch main.

TaskTuck is a cleaning-business operations SaaS at:
https://task-tuck.com

Current stack:
- Cloudflare Workers
- Cloudflare D1
- Better Auth
- Cloudflare Workers AI
- Google Gemma 4
- Resend
- Cloudflare Email Routing
- React / Next-compatible vinext
- TypeScript

Product goal:
TaskTuck should become an AI operating system for cleaning businesses.

Core loop:
customer message -> understand -> act -> get paid -> fulfill

Current MVP loop:
customer email -> Inbox -> review inquiry -> AI operations brief -> quote -> send quote -> customer reply -> quote matching -> job

The MVP is NOT being rebuilt from scratch.

Important:
- work only on redesign-v2
- inspect current GitHub source before changing anything
- do not expose or commit secrets
- do not make speculative rewrites
- preserve working email routing and worker/index.ts
- do not jump to onboarding yet
- we are currently doing production test cases

Current production:
https://task-tuck.com

Latest source checkpoint:
95479ccd53155115edf016ded7e554be97700e3f

Latest documentation/handoff commit:
26dec974ebe8ad5ce7b2b6dc88b1b056fda4588b — Expand TaskTuck handoff with full current test state

Latest production deployment version:
21d0572f-c7f3-4608-a0a3-e3abd64b308a

Current test position:

TC-01 PASSED.
A real house-cleaning inquiry for ~1800 sq ft, 3 bedrooms, next week was correctly converted into a structured brief with no invented customer/date.

TC-02 IN PROGRESS.
Quote TT-1236 was created from that incomplete inquiry.

Current quote preview shows:
- Draft
- Customer name missing
- House · ~1800 sq ft · 3 bedrooms
- General cleaning / specific tasks missing
- Cleaning date: Sometime next week
- Related date: Not provided
- Total: US$0.00

Next task:
Continue TC-02 by checking the operator-side readiness/validation state and proving the quote cannot be sent while required details, follow-ups, customer name, or positive price are missing.

Then continue:
TC-03 complete inquiry -> quote
TC-04 quote validation
TC-05 Resend delivery
TC-06 customer reply/matching
TC-07 accepted quote -> job
TC-08 customer persistence
TC-09 workspace persistence
TC-10 ambiguous reply
TC-11 failure handling
TC-12 full end-to-end happy path

Do not spend time reviewing UI copy unless a concrete usability/functional problem is found.

When a test reveals a bug:
1. identify the exact failing behavior
2. inspect the relevant source
3. make the smallest fix
4. build
5. deploy if the fix is production-relevant
6. re-test
7. update TASKTUCK_PROJECT_STATE.md with the result

Keep this document current so another LLM can resume without historical chat context.
```

---

# 36. FINAL SOURCE-OF-TRUTH STATUS

At the time of this document update:

- Core MVP exists.
- Production deployment is working.
- Authentication is production verified.
- D1 persistence is production verified.
- Workers AI analysis is production verified.
- Cloudflare inbound email routing is production verified.
- Inbox end-to-end is production verified.
- UX simplification has been deployed and smoke-tested.
- Resend outbound quote email implementation is deployed.
- Full outbound quote delivery still needs explicit current-run verification.
- Quote-to-job end-to-end still needs explicit verification.
- Full core happy path still needs explicit verification.
- TC-01 and TC-02 are now passed; continue with TC-03.
- Onboarding is intentionally deferred.
- Large future SaaS features are intentionally deferred.

**Current execution point: TC-02 on quote TT-1236.**

Do not lose this checkpoint.
