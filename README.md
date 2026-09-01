# Sonic & Co Admin

Next.js admin console for the Sonic & Co API.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- JWT Bearer auth against the Go Gin API

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001).

Seed an admin user from the API:

```bash
cd ../api
go run ./cmd/seed -email admin@sonicn.co -password 'ChangeMeAdmin!123'
```

## Screens

- **Login** — `POST /auth/admin/login`
- **Overview** — `/admin/overview`
- **Users** — list / suspend
- **Releases** — review queue + status updates (enqueues asynq + OpenSearch index)
- **Payouts** — approve / reject
- **Search** — OpenSearch release query
