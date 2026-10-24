# SIIR

**Super Intelligence Influencer Rank** (read "seer"). The index of superintelligence influencers on Solana and Robinhood Chain, ranked every epoch as *The SIIR 33*.

*The minds the market hasn't seen yet.*

Rebrand of Ordinal. The backend follows the same architecture as the ORDOKEY reference, applied to influencers instead of AI agents.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, hand-rolled `pushState` router, plain CSS tokens |
| Backend | NestJS 11, `/api/v1` prefix, `class-validator`, `@nestjs/throttler`, BullMQ |
| DB | **Supabase Postgres** through Prisma 6 (pooled `DATABASE_URL` + `DIRECT_URL` for migrations) |
| Queue | BullMQ on Redis. Optional: without `REDIS_URL` the scan pipeline runs in-process |
| Deploy | `vercel.json`: known routes rewrite to the SPA, any other path gets `404.html` with a real 404 status (the build copies `index.html` to `404.html`) |

## Site

- X: https://x.com/SIIR33Index
- Set `VITE_SITE_URL` (for example `https://siir.xyz`) before building. It fills `og:image`, `og:url` and canonical in `index.html`. The build warns if it is empty.
- Routes update title, description, canonical and share tags on navigation. The 404 view adds `noindex`.
- The logo files are `public/logo.webp` (lockup), `public/logo-symbol.webp`, `public/logo-symbol.png`, and the favicon set (`favicon.ico`, 16, 32, 180, 192, 512 px), all cut from the official artwork.

## Backend flow

Mirrors ORDOKEY: Agent submission becomes **nomination**, Dossier becomes **"Why they're Seen"**, Key Award becomes **epoch ranking**.

```
POST /influencers/submit   wallet-signed nomination (EVM EIP-191 or Solana ed25519)
        |  anti-abuse: one wallet per mind, unique handle, name-similarity block, per-wallet scan delay
        v
 [verify queue]  website resolves, wallet format per chain, on-chain activity via RPC   -> queued | rejected_invalid
        v
 [ingest queue]  X API signals + on-chain footprint -> SignalSnapshot rows -> ScoringService -> Score   -> draft
        v
 Editorial gate  draft "Why they're Seen" (AI-assisted), set Narrative lead, verify, publish            -> published
        v
 Epoch publish   rank eligible minds, keep the top 33, tier by rank, rank change vs previous epoch
        v
 Public API      /epochs, /seen/:handle, /badge/:handle, /influencers/public-rankings
```

Status pipeline: `submitted -> queued -> ingesting -> analyzing -> draft -> in_review -> published`, plus `rejected_invalid` and `decohered`.

Guardrails (same spirit as ORDOKEY): four of five score components need evidence or the mind is "insufficient evidence" and cannot be published; at least one verified wallet is required; the submitter cannot review their own nomination; an editor can Decohere a mind instantly (kill switch).

### Differences from ORDOKEY, on purpose

| ORDOKEY | SIIR |
|---|---|
| Sync dev fallback auto-publishes without an editor | Ends in `draft`. A human always publishes |
| Mock signatures accepted by prefix | Only when `ALLOW_MOCK_SIGNATURES=true` (never in production) |
| Editorial endpoints trust an `x-editor-id` header | Also require `x-editorial-key` = `EDITORIAL_API_KEY` and an editor/admin user |
| BullMQ ingest queue never fed after verify | Verify hands over to ingest (honouring the scan delay) |
| `CommunityRating`, x402 wash filter, ERC-8004 | Not ported: they belong to the agent domain |
| Redis hardcoded to localhost | `REDIS_URL` (supports Upstash `rediss://`) |

## Supabase setup

1. Create a project. In **Connect** (or Project Settings > Database > Connection string) copy the **Session pooler** URI (port 5432). Use the **Direct** URI instead if your network supports IPv6.
2. `cd backend && cp .env.example .env`, then fill `DIRECT_URL` with that URI, and `DATABASE_URL` with the same URI plus `?connection_limit=10&pool_timeout=20`.

   Why not the Transaction pooler (port 6543)? It is meant for serverless functions. For a long-running NestJS server it measured about 1.4 s per query against about 0.27 s on the Session pooler, and `connection_limit=1` made parallel queries time out. Use the Transaction pooler (`?pgbouncer=true&connection_limit=1`) only if you deploy the API as serverless functions.
3. Apply the schema and seed preview data:

```bash
cd backend
npm install
npx prisma migrate deploy   # creates the tables and turns on Row Level Security
npm run seed                # 36 fictional minds x 8 epochs, prints the editor id
npm run build && npm run start:prod   # http://localhost:3001/api/v1
```

The migration enables **RLS with no policies** on every table, so the Supabase Data API (PostgREST) exposes nothing. The API server connects as the table owner through Prisma, which bypasses RLS. Keep the database password and service role key server-side only.

## Run the frontend

```bash
npm install
npm run dev     # http://localhost:5173, proxies /api to :3001
```

Set `VITE_API_URL` to point the frontend at a deployed API.

## Editorial API

Disabled until `EDITORIAL_API_KEY` is set. Every request needs `x-editorial-key: <EDITORIAL_API_KEY>` and `x-editor-id: <editor user id>` (the seed prints one).

| Method | Path | |
|---|---|---|
| GET | `/editorial/stats` | Pipeline counts |
| POST | `/editorial/dossier` | Save "Why they're Seen" and optional `narrativeLead` (0-100) |
| POST | `/editorial/dossier/generate-ai` | AI draft (needs `OPENAI_API_KEY`) |
| POST | `/editorial/publish` | Verify and publish a mind |
| POST | `/editorial/epochs/publish` | Rank and publish the next epoch |
| POST | `/editorial/decohere` | Remove a mind from the live epoch |

## Public API

| Method | Path | |
|---|---|---|
| GET | `/epochs`, `/epochs/:n`, `/epochs/current` | Archive and live board |
| GET | `/seen/:handle` | Profile, stat block, score history, signals |
| GET | `/methodology` | Weights, formula, tiers, disclaimer |
| GET | `/badge/:handle` | Live SVG badge |
| GET | `/influencers?walletAddress=` | A wallet's own nominations and their status |
| GET | `/influencers/:handle/identity` | Wallets and verification tier |
| POST | `/influencers/submit` | Signed nomination (5 per minute per IP) |
| POST | `/subscribers` | Newsletter signup |

## Ingestion sources

Nothing is fabricated. Without a key, that signal is simply missing and the score reports insufficient evidence.

| Signal | Source | Env |
|---|---|---|
| Followers, engagement | X API v2 | `X_BEARER_TOKEN` |
| Solana footprint | Solana RPC | `HELIUS_API_KEY` or `SOLANA_RPC_URL` |
| Robinhood Chain footprint | EVM RPC | `ROBINHOOD_RPC_URL`, `ROBINHOOD_EXPLORER_URL` |
| Narrative lead | An editor | `/editorial/dossier` |

## Methodology thresholds

Proposals until signed off. They live in `backend/src/config/siir.ts` and can be overridden with env vars, and the Methodology page reads them from the API.

| Rule | Default | Env |
|---|---|---|
| An epoch counts toward Consistency only if the mind was listed with at least this score | 60 | `SIIR_CONSISTENCY_THRESHOLD` |
| Consistency reaches 1.0 after this many qualifying epochs in a row | 8 | |
| Bridged badge: on-chain component needed on each chain (0-1) | 0.4 | `SIIR_BRIDGED_ONCHAIN_THRESHOLD` |

The realm is recomputed on every scoring run from the per-chain on-chain scores, so Bridged is earned, not claimed.

## Share cards

- `public/og.png` is the static 1200x630 card. Regenerate with `cd backend && npx ts-node scripts/make-og.ts`.
- `GET /api/v1/og/:handle.png` renders a card per mind (rank, tier, score) with Playfair Display and Inter bundled in `backend/assets/fonts`.
- Crawlers do not run JavaScript, so `vercel.json` rewrites known crawler user agents on `/seen/:handle` to `api/seen.ts`, which returns the profile meta tags. Set `API_URL` and `SITE_URL` in the Vercel project, and `VITE_SITE_URL` at build time (see `.env.example`).

## Design tokens

All colours live in `src/tokens.css` as `--siir-*` variables. Components use semantic aliases, never raw hex.

## Preview data

Every mind in the seed is fictional and the wallet addresses are random strings in the right format. The footer disclaimer says so. Replace with real nominations flowing through the pipeline before launch.
