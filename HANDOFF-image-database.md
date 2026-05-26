# Agent Hand-off: Damaged Furniture Image Database & Repository

## Mission

Build a database and image storage layer for the Wayfair furniture damage assessor demo. The existing app can classify a photo and return a resolution (full refund, full replacement, partial replacement, coupon) — but it has no persistence. Your job is to store every assessment (image + result) so the team can browse cases, build a training corpus, and show demo history.

---

## Current Codebase State

**Location:** `/Users/athens/vscode101/hackathon-1/hack-webapp-starter`  
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind v4, Vercel AI SDK v6, pnpm  
**Model:** Subconscious TIM-Qwen3.6 (vision-capable, OpenAI-compatible API)

### Key files to understand first

| File | What it does |
|------|-------------|
| `app/api/assess/route.ts` | POST endpoint — takes `imageDataUrl`, calls the model, returns `AssessmentResult` JSON |
| `components/damage-assessor.tsx` | UI — 3 demo image cards + upload → calls `/api/assess` → shows result card |
| `lib/subconscious.ts` | Model provider (`subconsciousModel`, `requireSubconsciousApiKey`) |
| `app/page.tsx` | Renders `<DamageAssessor />` |
| `public/demo/image1.png` | Severe damage demo image |
| `public/demo/image2.png` | Surface scratch demo image |
| `public/demo/image3.png` | Missing parts / table demo image |

### AssessmentResult shape (from `app/api/assess/route.ts`)

```ts
interface AssessmentResult {
  damageType: "severe_damage" | "missing_parts" | "scratch";
  severity:   "high" | "medium" | "low";
  resolution: "full_refund" | "full_replacement" | "partial_replacement" | "coupon";
  explanation: string;
}
```

---

## Your Task

Build the persistence layer so every assessment is saved and browsable. Three parts:

### Part 1 — Image Storage

Store the raw uploaded image. For the hackathon, use **Cloudflare R2** (already in the sponsor stack — Wayfair/Subconscious/Baseten/Cloudflare) or fall back to local filesystem in `public/uploads/`.

- On assessment: upload the base64 image to R2, get back a public URL
- Store that URL in the database (not the raw base64)
- Env vars to add to `.env.local`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### Part 2 — Database

Use **SQLite via Turso** (or plain `better-sqlite3` locally for speed). Schema:

```sql
CREATE TABLE assessments (
  id          TEXT PRIMARY KEY,          -- uuid
  created_at  TEXT NOT NULL,             -- ISO timestamp
  image_url   TEXT NOT NULL,             -- R2 public URL (or /uploads/...)
  damage_type TEXT NOT NULL,             -- severe_damage | missing_parts | scratch
  severity    TEXT NOT NULL,             -- high | medium | low
  resolution  TEXT NOT NULL,             -- full_refund | full_replacement | partial_replacement | coupon
  explanation TEXT NOT NULL,
  source      TEXT DEFAULT 'upload'      -- 'upload' | 'demo'
);
```

Add a `lib/db.ts` that exposes:
- `saveAssessment(result: AssessmentResult, imageUrl: string, source?: string): Promise<string>` → returns id
- `listAssessments(limit?: number): Promise<Assessment[]>`
- `getAssessment(id: string): Promise<Assessment | null>`

### Part 3 — Wire into the existing API + add a gallery endpoint

**Modify `app/api/assess/route.ts`:**
1. After the model returns a result, upload the image and call `saveAssessment`
2. Return the `id` alongside the existing `AssessmentResult` fields

**Add `app/api/assessments/route.ts` (GET):**
- Returns `{ assessments: Assessment[] }` — paginated, newest first
- Query param `?limit=20`

**Add `app/assessments/page.tsx` (optional but great for demo):**
- Simple gallery: grid of thumbnails, each showing damage type badge + resolution outcome
- Clicking a card shows the full result

---

## Integration Points

The existing `assess` call in `components/damage-assessor.tsx` already does:
```ts
const res = await fetch("/api/assess", { method: "POST", body: JSON.stringify({ imageDataUrl }) });
const data = await res.json(); // currently AssessmentResult only
```

After your change, `data` will also include `{ id: string }`. The UI can optionally link to `/assessments/<id>`.

---

## Recommended Tech Choices (fast for hackathon)

| Need | Recommendation | Why |
|------|---------------|-----|
| Local DB | `better-sqlite3` | Zero setup, fast, file-based |
| Cloud DB | Turso (libsql) | SQLite-compatible, free tier, edge-ready |
| Image store | Cloudflare R2 via `@aws-sdk/client-s3` | S3-compatible, Cloudflare is a sponsor |
| Image store fallback | Write to `public/uploads/` | No config needed for demo |
| UUID | `crypto.randomUUID()` | Built into Node, no dep needed |

---

## Env Vars to Add

```bash
# .env.local additions
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=damage-assessments
R2_PUBLIC_URL=https://pub-xxx.r2.dev   # or custom domain

# If using Turso instead of local SQLite
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

---

## Verification Checklist

- [ ] `pnpm dev` starts without errors after your changes
- [ ] Upload a photo via the UI → assessment appears → row is written to DB
- [ ] Click a demo image card → assessment appears → row is written to DB with `source: 'demo'`
- [ ] `GET /api/assessments` returns JSON array with at least one entry
- [ ] Image URL in DB is reachable (loads in browser)
- [ ] `/assessments` page (if built) shows thumbnails with correct badges

---

## Dev Server

Currently running at **http://localhost:3000** (started with `node_modules/.bin/next dev`).

Re-start if needed:
```bash
cd /Users/athens/vscode101/hackathon-1/hack-webapp-starter
node_modules/.bin/next dev
```

The `SUBCONSCIOUS_API_KEY` is already set in `.env.local` — do not commit that file.

---

## Out of Scope for This Hand-off

- Authentication / multi-tenant support
- The AI assessment logic itself (already built in `app/api/assess/route.ts`)
- The front-end result card UI (already built in `components/damage-assessor.tsx`)
- Changing the model or prompt
