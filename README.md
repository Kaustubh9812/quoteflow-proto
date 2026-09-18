# TaskTuck

TaskTuck is a cleaning-operations workspace that turns messy customer inquiries into structured, quote-ready briefs and carries them through quotes, jobs, customers, and business settings.

## Local development

Install dependencies:

```bash
npm install
```

Run TaskTuck with the Cloudflare-compatible vinext runtime:

```bash
npm run dev
```

The original Next.js development server remains available for compatibility checks:

```bash
npm run dev:next
```

## Checks and builds

Lint:

```bash
npm run lint
```

Cloudflare production build:

```bash
npm run build
```

Original Next.js production build, for comparison/testing:

```bash
npm run build:next
```

## Cloudflare deployment

The production platform is Cloudflare Workers.

The repository contains the Worker configuration in `wrangler.jsonc` and the Cloudflare/Vite integration in `vite.config.ts`.

For local authenticated deployment:

```bash
npm run deploy:full
```

For Cloudflare Workers Builds, use:

- Build command: `npm run build`
- Deploy command: `npm run deploy`
- Production branch: `redesign-v2`

The CI deploy script uses `--skip-build` because Workers Builds already runs the build command before the deploy command.

## AI

The intake analyzer currently supports local Ollama development through `/api/analyze`. Production AI is intentionally separated from the local Ollama dependency; the production adapter will be configured before public AI use.

## Data

The current operator workspace uses browser-local persistence for briefs, quotes, jobs, customers, and settings. A persistent cloud data layer and authentication are required before multi-user SaaS launch.

## Deployment notes

The old Vercel deployment is not part of the production deployment path. Vercel-related starter assets/configuration are not required by TaskTuck; Cloudflare Workers is the production target.
