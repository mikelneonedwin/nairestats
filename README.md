# Nairestats

A single-page Next.js report for all-time token usage across harnesses, models, and labs. The page presents live stats with column sorting, live per-table filtering, full token numbers on desktop, and compact short notation on mobile.

## Attribution

This project is built around data and metrics provided by [Tokenaires](https://tokenaires.cc) and its accompanying backend services. All underlying board and profile figures are pulled directly from their public API endpoints.

## Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The standalone terminal report is also available with `bun usage-stats.ts`.

## Data and caching

The server reads public data from `https://tokenaires.cc/api/v1`. Each API response is cached with Next.js for 10 minutes, then revalidated on the next request.

Harness totals use the all-time boards. Model and lab totals are inferred from public user profiles, which include at most eight models per user. Their shares use observed model tokens, and unrecognized model families appear as `Unattributed`. The API does not provide period-specific model data, so all three tables are all-time.
