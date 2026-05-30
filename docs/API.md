# PhotoSwipe API Reference

**Base URL**: `https://swipe-photo.onrender.com`
**API root**: `https://swipe-photo.onrender.com/api`
**Content-Type**: `application/json` (all request and response bodies)

> ⚠️ **Render free-tier cold start**: the first request after ~15 min of inactivity can take up to 30 s while the service wakes. Subsequent requests are fast. Clients should use a request timeout of at least 45 s.

## Authentication

A subset of endpoints requires a **JSON Web Token** in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

Tokens are issued by `POST /auth/register` or `POST /auth/login` and expire **30 days** after issue. On expiry the server returns `401 Unauthorized` and the client should re-authenticate.

Endpoints that *currently* require auth are marked **🔒**. Endpoints without the lock icon are **anonymous** in the current version — per-user scoping arrives with the Cloud Sync phase.

## Error envelope

All non-2xx responses use a uniform shape:

```json
{
  "error": "Human-readable message"
}
```

| Status | Meaning | When |
|---|---|---|
| `400` | Bad Request | Missing / invalid fields |
| `401` | Unauthorized | Missing / invalid / expired token |
| `404` | Not Found | Resource doesn't exist or wrong route |
| `409` | Conflict | Email already registered |
| `500` | Internal Server Error | Unhandled server error |

---

# Health

## `GET /health`

Liveness probe. Used by Render and uptime monitors.

| | |
|---|---|
| Auth | none |
| Body | none |
| 200 OK | `{ "status": "ok" }` |

**Example**
```bash
curl https://swipe-photo.onrender.com/health
# → {"status":"ok"}
```

---

# Authentication

## `POST /api/auth/register`

Creates a new user and returns a signed JWT for immediate use.

| | |
|---|---|
| Auth | none |
| Body | `{ "email": string, "password": string }` |

**Validation**
- `email` — required, lowercase, must match `^\S+@\S+\.\S+$`, must be unique
- `password` — required, minimum **6** characters

**201 Created**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6651f4a2c3a1b00012f7e1a4",
    "email": "you@example.com",
    "createdAt": "2026-05-29T08:14:42.110Z"
  }
}
```

**Errors**
- `400` — missing fields or password too short
- `409` — email already registered

**Example**
```bash
curl -X POST https://swipe-photo.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"hunter22"}'
```

## `POST /api/auth/login`

Verifies credentials and returns a fresh JWT.

| | |
|---|---|
| Auth | none |
| Body | `{ "email": string, "password": string }` |

**200 OK** — same shape as `/register`

**Errors**
- `400` — missing fields
- `401` — invalid email or password (response is intentionally generic to prevent user-enumeration)

**Example**
```bash
curl -X POST https://swipe-photo.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"hunter22"}'
```

## `GET /api/auth/me` 🔒

Returns the currently authenticated user. Used by the client on app launch to validate a stored token.

| | |
|---|---|
| Auth | Bearer token **required** |
| Body | none |

**200 OK**
```json
{
  "user": {
    "id": "6651f4a2c3a1b00012f7e1a4",
    "email": "you@example.com",
    "createdAt": "2026-05-29T08:14:42.110Z"
  }
}
```

**Errors**
- `401` — missing / invalid / expired token

**Example**
```bash
curl https://swipe-photo.onrender.com/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOi..."
```

---

# Sessions

A *cleanup session* represents one continuous review run — opened when the user starts swiping, closed when they finish.

## `POST /api/sessions`

Starts a new cleanup session and returns its id, which the client uses on subsequent `/photos` calls.

| | |
|---|---|
| Auth | none *(future: 🔒 will scope to caller)* |
| Body | `{ "photoCount": number }` *(optional, defaults to 0)* |

**201 Created**
```json
{
  "id": "6a147abf14cdf7a44516e6a6",
  "startedAt": "2026-05-29T11:02:14.221Z",
  "finishedAt": null,
  "photoCount": 60,
  "reviewed": 0,
  "kept": 0,
  "deleted": 0,
  "bytesFreed": 0
}
```

**Example**
```bash
curl -X POST https://swipe-photo.onrender.com/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"photoCount":60}'
```

## `GET /api/sessions/:id`

Fetches a single session.

| | |
|---|---|
| Path param | `id` — session ObjectId (as string) |
| Auth | none |

**200 OK** — same shape as the create response.

**Errors**
- `404` — session not found

## `PATCH /api/sessions/:id`

Finishes a session by stamping `finishedAt` and updating the totals. Idempotent — re-calling overwrites the latest summary.

| | |
|---|---|
| Auth | none |
| Body | `{ "reviewed": number, "kept": number, "deleted": number, "bytesFreed": number }` |

**200 OK** — full session with updated fields and `finishedAt` set.

**Errors**
- `404` — session not found

**Example**
```bash
curl -X PATCH https://swipe-photo.onrender.com/api/sessions/6a147abf14cdf7a44516e6a6 \
  -H "Content-Type: application/json" \
  -d '{"reviewed":42,"kept":28,"deleted":14,"bytesFreed":31457280}'
```

---

# Photos

One record per *swipe decision* — not the image itself. Only metadata flows through this API.

## `POST /api/photos`

Records a single keep/delete decision. The mobile `decide()` action calls this on every swipe (when Privacy → "Share Analytics" is ON).

| | |
|---|---|
| Auth | none *(future: 🔒)* |
| Body | `{ "sessionId"?: string, "assetId": string, "filename"?: string, "fileSize"?: number, "decision": "keep" \| "delete" }` |

**Required**: `assetId`, `decision`. Others may be omitted.

**201 Created**
```json
{
  "id": "6a147ac914cdf7a44516e6b1",
  "sessionId": "6a147abf14cdf7a44516e6a6",
  "assetId": "F1B2C3D4-A5E6-4B7C-8D9F-012345678901",
  "filename": "IMG_4821.HEIC",
  "fileSize": 2340112,
  "decision": "delete",
  "createdAt": "2026-05-29T11:02:31.880Z"
}
```

**Errors**
- `400` — `assetId` or `decision` missing
- `400` — `decision` not `"keep"` or `"delete"`

**Example**
```bash
curl -X POST https://swipe-photo.onrender.com/api/photos \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"6a147abf14cdf7a44516e6a6","assetId":"abc123","filename":"img.jpg","fileSize":1234567,"decision":"delete"}'
```

## `GET /api/photos`

Lists recorded decisions.

| | |
|---|---|
| Auth | none |
| Query | `sessionId` — *optional*; if present, returns only decisions for that session |

**200 OK**
```json
[
  { "id": "...", "sessionId": "...", "assetId": "...", "decision": "delete", "createdAt": "..." }
]
```

**Examples**
```bash
# All decisions ever recorded
curl https://swipe-photo.onrender.com/api/photos

# Just one session
curl 'https://swipe-photo.onrender.com/api/photos?sessionId=6a147abf14cdf7a44516e6a6'
```

---

# Analytics

## `GET /api/analytics`

Aggregates the `photos` and `sessions` collections into a single rollup. The dashboard polls this on focus.

| | |
|---|---|
| Auth | none *(future: 🔒)* |
| Body | none |

**200 OK**
```json
{
  "totalReviewed": 1247,
  "totalKept": 819,
  "totalDeleted": 428,
  "bytesFreed": 4217390104,
  "sessionsCompleted": 23
}
```

**How each value is computed**
- `totalReviewed` = `photos.count()`
- `totalKept` = `photos.count({ decision: 'keep' })`
- `totalDeleted` = `photos.count({ decision: 'delete' })`
- `bytesFreed` = `sum(photos.fileSize WHERE decision = 'delete')`
- `sessionsCompleted` = `sessions.count({ finishedAt: { $ne: null } })`

**Example**
```bash
curl https://swipe-photo.onrender.com/api/analytics
```

---

# Data models (TypeScript interfaces)

For client teams.

```ts
interface AuthUser {
  id: string;            // Mongo ObjectId
  email: string;         // unique, lowercase
  createdAt: string;     // ISO 8601
}

interface CleanupSession {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  photoCount: number;
  reviewed: number;
  kept: number;
  deleted: number;
  bytesFreed: number;
}

interface PhotoDecision {
  id: string;
  sessionId: string | null;
  assetId: string;
  filename: string | null;
  fileSize: number;
  decision: 'keep' | 'delete';
  createdAt: string;
}

interface AnalyticsSummary {
  totalReviewed: number;
  totalKept: number;
  totalDeleted: number;
  bytesFreed: number;
  sessionsCompleted: number;
}
```

---

# Endpoint summary

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | `GET` | `/health` | — | liveness probe |
| 2 | `POST` | `/api/auth/register` | — | create account, returns JWT |
| 3 | `POST` | `/api/auth/login` | — | sign in, returns JWT |
| 4 | `GET` | `/api/auth/me` | 🔒 | current user (validates token) |
| 5 | `POST` | `/api/sessions` | — | start cleanup session |
| 6 | `GET` | `/api/sessions/:id` | — | fetch session |
| 7 | `PATCH` | `/api/sessions/:id` | — | finish session with summary |
| 8 | `POST` | `/api/photos` | — | record one swipe decision |
| 9 | `GET` | `/api/photos` | — | list decisions (filter by `?sessionId=`) |
| 10 | `GET` | `/api/analytics` | — | aggregated rollup |
