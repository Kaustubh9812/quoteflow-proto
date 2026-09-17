# TaskTuck

TaskTuck is a cleaning-operations workspace that turns messy customer inquiries into structured, quote-ready briefs and carries them through quotes, jobs, customers, and business settings.

## Local development

Install dependencies:

```bash
npm install
```

Run the original Next.js development server:

```bash
npm run dev
```

Run the Cloudflare-compatible vinext development server:

```bash
npm run dev:vinext
```

## Production build

Standard Next.js build:

```bash
npm run build
```

Cloudflare Workers build:

```bash
npm run build:vinext
```

## Cloudflare deployment

The production deployment target is Cloudflare Workers. The repository contains the Worker configuration in `wrangler.jsonc` and the Cloudflare/Vite integration in `vite.config.ts`.

Deploy with:

```bash
npm run deploy:vinext
```

The production branch for Cloudflare Builds is `redesign-v2`.

## AI

The intake analyzer currently supports local Ollama development through `/api/analyze`. The production AI provider will be configured separately so local development can continue to use Ollama without exposing local services to the public application.

## Data

The current operator workspace uses browser-local persistence for briefs, quotes, jobs, customers, and settings. The production data layer will be migrated to a persistent cloud database before multi-user SaaS launch.
