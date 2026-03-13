# BuildMe — Open Source CI/CD Build Monitor

Monitor CI/CD pipelines across GitHub Actions, Travis CI, and CircleCI from a single dashboard. Real-time build status via WebSocket, failure notifications, and team collaboration with role-based access.

## Features

- **Multi-provider**: GitHub Actions, Travis CI, CircleCI
- **Real-time**: WebSocket-powered live build updates
- **Notifications**: Email, outbound webhooks, Web Push
- **Team collaboration**: Projects with owner/admin/editor/viewer roles
- **Self-hosted**: Single binary + SQLite, deploy anywhere
- **Fast**: Qwik frontend with near-zero initial JS via resumability

## Quick Start

```bash
# Clone
git clone https://github.com/anchoo2kewl/buildme.git
cd buildme

# Configure
cp .env.example .env
# Edit .env with your secrets

# Build and run
make build
./buildme
```

Open http://localhost:8080

## Docker

```bash
docker compose up -d
```

## Development

```bash
# Backend (Go)
make dev

# Frontend (Qwik + Vite)
cd frontend && npm run dev
```

The frontend dev server proxies `/api` requests to the Go backend on port 8080.

## Configuration

All configuration is via environment variables with `BUILDME_` prefix:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BUILDME_JWT_SECRET` | Yes | - | JWT signing secret |
| `BUILDME_ENCRYPTION_KEY` | Yes | - | 32-byte key for encrypting API tokens at rest |
| `BUILDME_PORT` | No | 8080 | HTTP port |
| `BUILDME_DB_PATH` | No | buildme.db | SQLite database path |
| `BUILDME_GITHUB_CLIENT_ID` | No | - | GitHub OAuth app client ID |
| `BUILDME_GITHUB_CLIENT_SECRET` | No | - | GitHub OAuth app secret |
| `BUILDME_POLL_INTERVAL_S` | No | 10 | Poller tick interval |
| `BUILDME_POLL_CONCURRENCY` | No | 5 | Max concurrent provider polls |

## Architecture

```
Go (Chi v5) ── SQLite (WAL mode)
     │
     ├── REST API (/api/*)
     ├── WebSocket (/api/ws)
     ├── Webhook ingestion (/api/webhooks/ingest/*)
     ├── Poller (background, 10s tick)
     └── SPA fallback (serves Qwik frontend)
```

- **Backend**: Go with Chi v5 router, pure-Go SQLite (`modernc.org/sqlite`), JWT auth
- **Frontend**: Qwik with Tailwind CSS v4, static build served by Go
- **Real-time**: Gorilla WebSocket hub with per-project broadcast
- **Providers**: Hybrid polling + webhook ingestion with unified status normalization

## Tech Stack

- Go 1.26, Chi v5, `modernc.org/sqlite`, `gorilla/websocket`, `golang-jwt/jwt`
- Qwik, Tailwind CSS v4, TypeScript
- SQLite with WAL mode

## License

MIT
