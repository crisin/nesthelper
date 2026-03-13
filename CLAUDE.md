# new-helper — Claude Code Root Guide

## What this is
A personal lyrics knowledge base with Spotify integration. Users search tracks, save lyrics, annotate lines, tag songs, build collections, and view personal analytics. Has a shared community layer for public songs.

## Stack
| Layer | Tech |
|---|---|
| Backend | NestJS 11 + Prisma 7 + PostgreSQL 15 |
| Frontend | React 19 + Vite + Tailwind CSS 4 + Zustand + React Query v5 |
| Auth | JWT (7d expiry, `JwtAuthGuard` on all protected routes) |
| Queue | BullMQ + Redis (optional — service still works without Redis) |
| Scheduler | `@nestjs/schedule` (cron for weekly digest) |
| Infrastructure | Docker Compose |

## Dev commands
```bash
# Start everything (backend + frontend concurrently)
npm run dev

# Backend only
npm run dev:backend   # or: cd backend && npm run start:dev

# Frontend only
npm run dev:frontend  # or: cd frontend && npm run dev

# After any schema.prisma change — ALWAYS run both:
cd backend && npx prisma migrate dev --name <description>
cd backend && npx prisma generate

# Migration naming convention: snake_case, descriptive
# Examples: add_song_audio_features, add_feature_request_kind, phase3_listening_context
```

## Environment
- Backend: [backend/.env.example](backend/.env.example) → `DATABASE_URL`, `JWT_SECRET`, `SPOTIFY_CLIENT_ID/SECRET/REDIRECT_URI`, `REDIS_HOST/PORT`
- Frontend: [frontend/.env.example](frontend/.env.example) → `VITE_API_URL=http://localhost:3001`, `VITE_SPOTIFY_CLIENT_ID`

## Hard rules
- **Always run `prisma generate` after `prisma migrate dev`** — generated types won't reflect schema changes otherwise
- **Never skip `JwtAuthGuard`** on any controller that handles user data
- **Never commit `.env` files** — only `.env.example`
- **Never use `as any`** — use Prisma type patterns (see [backend/CLAUDE.md](backend/CLAUDE.md))
- **Mobile-first for new UI** — use `sm:` breakpoint (640px) for desktop-only features
- **Avoid extra network requests** — read from React Query cache where possible (see [frontend/CLAUDE.md](frontend/CLAUDE.md))

## Key files — quick orientation
| Purpose | File |
|---|---|
| DB schema (source of truth) | [backend/prisma/schema.prisma](backend/prisma/schema.prisma) |
| Root module (all module imports) | [backend/src/app.module.ts](backend/src/app.module.ts) |
| Router (all routes) | [frontend/src/App.tsx](frontend/src/App.tsx) |
| All shared TS types | [frontend/src/types/index.ts](frontend/src/types/index.ts) |
| Axios instance | [frontend/src/services/api.ts](frontend/src/services/api.ts) |
| Global styles + keyframes | [frontend/src/index.css](frontend/src/index.css) |
| Nav + FAB + layout | [frontend/src/components/AppLayout.tsx](frontend/src/components/AppLayout.tsx) |

## Project structure
```
new-helper/
├── CLAUDE.md                          ← you are here
├── backend/
│   ├── CLAUDE.md                      ← backend patterns
│   ├── prisma/schema.prisma           ← DB source of truth
│   └── src/
│       ├── app.module.ts              ← register new modules here
│       ├── auth/                      ← JWT strategy + guard
│       ├── prisma/                    ← PrismaService singleton
│       ├── spotify/                   ← Spotify API + audio-features
│       ├── saved-lyrics/              ← user's saved songs
│       ├── songs/                     ← shared canonical Song entities
│       ├── song-lyrics/               ← shared structured lyrics
│       ├── song-tags/                 ← CONTEXT/MOOD tags
│       ├── song-notes/                ← per-user song notes
│       ├── lyrics/                    ← legacy per-SavedLyric lyrics
│       ├── line-annotations/          ← per-line annotations
│       ├── lyrics-fetch/              ← BullMQ worker (lyrics.ovh)
│       ├── search/                    ← cross-entity search
│       ├── search-history/            ← Spotify search history
│       ├── library/                   ← Spotify library sync
│       ├── collections/               ← song collections
│       ├── analytics/                 ← personal analytics
│       ├── digest/                    ← weekly digest cron
│       └── feature-requests/          ← bugs + feature wishes
└── frontend/
    ├── CLAUDE.md                      ← frontend patterns
    └── src/
        ├── App.tsx                    ← router
        ├── pages/                     ← one file per route
        ├── components/                ← shared UI
        ├── hooks/                     ← custom React hooks
        ├── stores/                    ← Zustand stores
        ├── services/api.ts            ← Axios instance
        ├── types/index.ts             ← all shared TS types
        └── index.css                  ← Tailwind + keyframes
```

