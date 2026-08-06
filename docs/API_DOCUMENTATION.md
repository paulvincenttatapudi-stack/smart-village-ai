# API Documentation

Base URL: `http://localhost:8000` (dev) or your deployed backend URL.

Interactive docs are available at `/docs` (Swagger UI) and `/redoc` only when
`DEBUG=true`. In production they return 404.

Conventions:

- **Auth:** most endpoints require `Authorization: Bearer <access_token>`
  (obtained from `/api/auth/login`).
- **Roles:** `citizen`, `admin`, `super_admin`. Admin endpoints require
  `admin`/`super_admin`; role-change requires `super_admin`.
- **Errors:** JSON `{"detail": "..."}` with standard HTTP status codes.
- **Pagination:** list endpoints accept `page` (1-based) and `page_size` query
  params; responses include `items`, `total`, `page`, `page_size`, `pages`.

---

## Auth — `/api/auth`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Create a citizen account `{name, email, password}` | — |
| POST | `/login` | Returns `{access_token, refresh_token, token_type, user}` | — |
| POST | `/refresh` | Rotate refresh token → new token pair | refresh token |
| GET | `/me` | Current user profile | ✔ |
| PUT | `/change-password` | `{old_password, new_password}` | ✔ |
| POST | `/logout` | Revoke the refresh token | ✔ |

## Complaints — `/api/complaints`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/stats/summary` | Public complaint statistics | — |
| GET | `/my/stats` | Current user's stats | citizen |
| GET | `/my/all` | Current user's complaints | citizen |
| POST | `/analyze` | AI classify text `{title, description}` → `{category, priority, department, summary, sentiment}` | ✔ |
| POST | `/check-duplicate` | `{title, description}` → `{is_duplicate, of_complaint_id, confidence}` | ✔ |
| GET | `` | List/filter complaints (`category`, `status`, `priority`, `q`, `page`) | ✔ |
| POST | `` | Create a complaint (multipart or JSON) | ✔ |
| GET | `/{complaint_id}` | Single complaint detail + updates | ✔ |
| PUT | `/{complaint_id}` | Update own complaint (status, priority, description) | owner |
| POST | `/{complaint_id}/upvote` | Upvote a complaint | ✔ |
| GET | `/{complaint_id}/updates` | Status updates history | ✔ |

## Admin — `/api/admin` (requires `admin`/`super_admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users with stats, paginated |
| PUT | `/users/{user_id}/role` | Change role (super_admin only) |
| PUT | `/users/{user_id}/verify` | Verify a citizen |
| GET | `/complaints` | List all complaints with filters + pagination |
| PUT | `/complaints/{complaint_id}/assign` | Assign complaint + department |
| POST | `/complaints/bulk-status` | Bulk status update `{ids, status}` |
| GET | `/dashboard` | Admin dashboard aggregates |
| GET | `/analytics` | Time-series + category data |
| GET | `/stats` | Complaint stats by status/category |

## Analytics — `/api/analytics`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/overview` | Totals, resolution rate, avg time, satisfaction |
| GET | `/trends` | Monthly trends |
| GET | `/hotspots` | Geo hotspots (top areas) |
| GET | `/departments` | Per-department workload |

## Notifications — `/api/notifications`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `` | Current user's notifications | ✔ |
| PUT | `/{notification_id}/read` | Mark one read | ✔ |
| PUT | `/read-all` | Mark all read | ✔ |
| GET | `/unread-count` | Unread count | ✔ |

## Uploads — `/api/upload`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/image` | `multipart/form-data` file → `{url, filename, size}` |
| POST | `/voice` | Voice recording upload |
| POST | `/document` | Document upload |

Files are validated by extension, MIME sniffing (magic bytes), and size caps.
Uploaded media is served from `/uploads/...` (mounted at the `/uploads` route).

## Users — `/api/users`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/profile` | Full profile | ✔ |
| PUT | `/profile` | Update profile `{name, phone, village, district, ...}` | ✔ |
| GET | `/{user_id}` | Public user info | ✔ |

## Chat — `/api/chat`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `` | `{message}` → AI reply `{reply, data}` | ✔ |
| GET | `/history` | Recent chat messages | ✔ |
| DELETE | `/history` | Clear history | ✔ |

`data` is a structured summary: `{type, complaints, total, resolved, pending,
capabilities}` depending on the query.

## Metrics — root

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | `{"status": "healthy"}` liveness probe |
| GET | `/api/metrics` | `application/json` runtime metrics |

## Demo — `/api/demo`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/simulate` | Run the demo simulation (creates a complaint pipeline) |
| GET | `/stats` | Current demo stats |

## WebSockets

| Path | Description |
|------|-------------|
| `/ws/notifications?token=<access_token>` | Live push of new complaint updates/notifications |
| `/ws/chat?token=<access_token>` | Live AI chat over WebSocket |

Both validate the JWT (`token` query param). Invalid/missing tokens are
rejected with `1008 POLICY_VIOLATION`.

## Authentication flow

1. `POST /api/auth/login` with email/password → store both tokens.
2. Send `Authorization: Bearer <access_token>` on every API call.
3. On `401` (expired access), `POST /api/auth/refresh` with the refresh token.
4. On logout, `POST /api/auth/logout` revokes the refresh token server-side.

## Example

```bash
# login
curl -s -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"rahul@example.com","password":"User@123"}'

# authenticated call
curl -s http://localhost:8000/api/complaints/my/all \
  -H 'Authorization: Bearer <access_token>'

# upload an image
curl -s -X POST http://localhost:8000/api/upload/image \
  -H 'Authorization: Bearer <access_token>' \
  -F 'file=@photo.jpg;type=image/jpeg'
```
