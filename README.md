# HYNBET AI Clip Studio

Real clipping pipeline: Kick URL (official API metadata) → job queue → FFprobe/FFmpeg → transcription → moment ranking → 9:16 MP4.

This is not a mock. Jobs only complete after a verified render exists on disk.

## Run

```bash
# Redis (already required)
redis-server --daemonize yes --port 6379 --bind 127.0.0.1

# API + BullMQ worker
node server/src/index.js

# Frontend
npm run dev
```

Open the Vite URL. Use **Run development sample** to exercise the full pipeline without Kick media.

## Environment

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `KICK_REDIRECT_URI` | Public OAuth callback, e.g. `https://hynbetcom-production-56c5.up.railway.app/api/auth/kick/callback`. |
| `KICK_CLIENT_ID` | Server-only. Optional in `.env`. Never a `VITE_` / React variable. |
| `KICK_CLIENT_SECRET` | **Not stored in this workspace.** Arena has no secrets vault. Inject via process env or `HYNBET_SECRETS_FILE` outside `/home/user`. The server refuses to read this key from `/home/user/.env`. |
| `AI_API_KEY` | OpenAI-compatible Whisper + titles. If unset, local Whisper `tiny.en` is used. |
| `REDIS_URL` | BullMQ |
| `DATABASE_URL` | SQLite by default |
| `STORAGE_*` | Optional S3. Local disk if empty. |

## Authorized media

Kick Public API (`https://api.kick.com/public/v1`) can resolve channel/livestream metadata when OAuth is configured. It does not return downloadable VOD files. HYNBET will not scrape or bypass Kick.

To process video you must provide media you are authorized to use:

- **Development sample** — `dev://sample` (generated locally, labeled as not-from-Kick)
- **Upload** — your own MP4
- **Direct media URL** — `https://…/file.mp4` you control
- **Future** — owner export / official media grant via `KICK_AUTHORIZED_MEDIA_URL`

A Kick URL without authorized media fails with `SOURCE_ACCESS_ERROR`.

## API

- `POST /api/projects` `{ sourceUrl }` → `{ projectId, jobId, status: "QUEUED" }`
- `GET  /api/jobs/:id` and `GET /api/jobs/:id/events` (SSE)
- `GET  /api/projects/:id/clips` — only after verified MP4s exist
- `GET  /api/clips/:id/stream` / `download`
- `POST /api/clips/:id/regenerate`
- `POST /api/jobs/:id/cancel`
- `GET  /api/health`

## Pipeline states

`QUEUED → FETCHING_SOURCE → DOWNLOADING → PROBING_VIDEO → EXTRACTING_AUDIO → TRANSCRIBING → ANALYZING → DETECTING_MOMENTS → GENERATING_TITLES → GENERATING_CAPTIONS → GENERATING_CLIPS → RENDERING → UPLOADING → COMPLETED`

Progress is updated from real stage completion and FFmpeg `-progress`.
