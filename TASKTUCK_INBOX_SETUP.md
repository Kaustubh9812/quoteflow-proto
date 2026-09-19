# TaskTuck customer inbox setup

This feature adds a unified customer Inbox to TaskTuck.

## What it does

A cleaning company keeps using its existing Gmail, Outlook, or other mailbox.

Customer emails are automatically forwarded to the business's unique TaskTuck inbox address:

inbox+<workspace-alias>@task-tuck.com

TaskTuck's Worker receives the raw email, extracts readable text, and asks the configured Workers AI model to classify the message as:

- inquiry
- query
- feedback
- complaint
- quote_response
- spam
- other

The AI can also return a secondary category, a confidence value, a short summary, a suggested operator action, a customer name, and a quote number.

Ambiguous or low-confidence messages are flagged for human review.

The employee can then:
- review the message in Inbox
- change the category
- clear or keep the review flag
- mark it new, in progress, resolved, or archived
- open the message in Intake desk for the existing quote workflow

The existing manual Intake desk remains available as a fallback.

## Deployment sequence

After pulling the branch:

1. Apply the new D1 migration:
   `npx wrangler d1 migrations apply task-tuck-db --remote`

2. Build:
   `npm run build`

3. Deploy:
   `npm run deploy`

## Cloudflare Email Routing

TaskTuck uses Cloudflare Email Service for inbound mail processing. This is a **one-time TaskTuck platform setup**, not something every cleaning business needs to repeat.

In the TaskTuck Cloudflare account:

1. Open Compute > Email Service > Email Routing for task-tuck.com.
2. Make sure the domain is onboarded for Email Routing.
3. Enable subaddressing / plus addressing in Email Routing Settings.
4. Create a routing rule for `inbox@task-tuck.com`.
5. Set the action to **Send to a Worker** and select the `task-tuck` Worker.
6. Save and activate the rule.

After this one-time platform rule exists, each TaskTuck workspace can use its own `inbox+<alias>@task-tuck.com` address. Cloudflare's subaddressing support matches the base `inbox@task-tuck.com` rule while preserving the plus detail in the Worker event.

Cloudflare supports routing a custom address to a Worker with an `email()` handler. With subaddressing enabled, `inbox+<alias>@task-tuck.com` matches the `inbox@task-tuck.com` rule while the plus detail remains available to the Worker.

## Gmail / Outlook forwarding

After the Cloudflare platform rule exists, the business only needs a one-time forwarding rule in the mailbox it already uses. TaskTuck does not need the employee's Gmail or Microsoft password.

The forwarding target is the unique address shown in TaskTuck Settings.

### Gmail

Gmail supports automatic forwarding and filters. A business can add the TaskTuck address under Settings > Forwarding, verify it, and then create a filter that forwards only the messages it wants TaskTuck to see. Gmail also allows the original copy to remain in the inbox or be archived. citeturn380306search0

### Outlook / Microsoft 365

Outlook supports inbox rules with a Forward to or Redirect to action. For a cleaning-business mailbox, a rule can be set for incoming customer-service mail and point it to the TaskTuck address while leaving the original mailbox available. Outlook on the web exposes these controls under Settings > Mail > Rules. citeturn380306search1turn380306search2

Recommended behavior:
- forward new customer-service mail
- keep the original mailbox copy
- do not forward unrelated internal or marketing mail

This first version is mailbox forwarding rather than direct Gmail/Microsoft OAuth. Direct provider connections can be added later without changing the TaskTuck Inbox concept.

## Important

The TaskTuck inbound address is an ingestion address, not the customer's address.

Outbound quote email is separate. The current quote sender is TaskTuck's verified sending address, with the business email used as Reply-To when configured.

Future versions can add direct Gmail / Microsoft OAuth integrations, richer attachment storage, and deeper thread synchronization without changing the Inbox concept.
