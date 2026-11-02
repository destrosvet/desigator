<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## User workflow preferences

- Do not run browser checks, browser automation, or browser-based end-to-end tests. The user performs browser verification themselves. Verify changes with code review, unit/API tests, type checks, lint, builds, and deployment status/logs instead.
- In this project, the user means committing and pushing to `main` when they ask to deploy ("nasadit"). Do not initiate separate hosting actions unless explicitly requested.
