# API contract (what the backend must implement)

The frontend is offline-first. Every page reads/writes through `App.store` (common.js); the browser keeps a full local copy and syncs it with the server in the background. Set `API_BASE` in `config.js` to the server URL to switch sync on. Leave it empty to run local-only.

All requests are JSON. Authenticated calls send `Authorization: Bearer <token>`. A `401` makes the app clear the session and return to the login page. CORS: allow the app origin, headers `Content-Type, Authorization`, methods `GET, PUT, DELETE, POST, OPTIONS`.

## Auth
| Call | Body | Success | Failure |
|---|---|---|---|
| `POST /api/login` | `{username, password}` | `200 {token, role}` — `role` is `"admin"` or `"owner"` | `401` wrong credentials, `429` too many attempts |
| `POST /api/logout` | `{}` | `200` | — (best effort) |

Passwords must be verified on the server (salted slow hash). Once the server is used, remove the `USERS` hashes from `index.html`.

## Data (key/value, one row per localStorage key)
| Call | Body | Success | Notes |
|---|---|---|---|
| `GET /api/kv` | — | `200 {items: {"<key>": {value: "<string>", version: <int>}}}` | Called once after login. Only keys of the logged-in company. |
| `GET /api/kv/<key>` | — | `200 {value, version}` | `404` if missing. |
| `PUT /api/kv/<key>` | `{value: "<string>", version: <int>}` | `200 {version: <new int>}` | `version` = the version the client last saw (0 = new). If it differs from the server's: `409` and change nothing. |
| `DELETE /api/kv/<key>` | `{version}` | `200 {version}` | Same version rule. |

`value` is always a string (usually JSON text). Reject with `400/403/413/422` to make the client drop that write. Network errors and `5xx` are retried with back-off (2s … 60s); unsent keys stay in the local outbox (`rohan_outbox`), so nothing is lost while offline.

Keys that are **not** synced (per device): `rohan_theme_mode`, `rohan_global_lang`, `rohan_font_scale`, `rohan_table_density`, `rohan_reduce_motion`, `rohan_card_badge`, `rohan_card_status`, `rohan_branch_cols`, `rohan_logout_confirm`, `rohan_voice_fix`, `*_audit_seen` and the sync bookkeeping keys. Everything else is synced (see the key table in `README_BACKEND.md`).

## Conflicts
`409` marks the key as conflicted: the client stops pushing it and shows a warning. `App.store.conflicts()` lists such keys and `App.store.resolve(key, 'local' | 'server')` resolves them (keep this browser's copy, or take the server's). Whole-array keys (`<bid>_bnam_records` …) are last-writer-wins; for several people working at once, the next backend step is per-record endpoints (`/api/entries`, `/api/customers` with `updatedAt`), then `App.store` can be replaced behind the same interface without touching the pages.

## Server rules to enforce (do not trust the browser)
- Role `owner` may only use what `rohan_owner_perms` allows; enforce it on writes too.
- Validate sizes and JSON shape; amounts are numbers or numeric strings (use a decimal type).
- Keep an audit trail on the server; `<bid>_audit_log` from the client is informational.
- HTTPS only, short-lived tokens, rate-limit `/api/login`.

## Exact rules (as implemented by `tools/reference_server.js`, verified by `tools/contract_test.js`)
- Key format `^[A-Za-z0-9_.-]{1,120}$` → otherwise `400`. Value must be a string → otherwise `422`. Max value 5 MB → `413`.
- `PUT`/`DELETE` need an integer `version` (≥ 0) → otherwise `400`. Missing key counts as version 0. Success returns the new version (old + 1).
- `403` when a non-admin writes `rohan_owner_perms` (the client treats 400, 403, 413 and 422 as a dropped write).
- Tokens: random, expire (reference: 12 h), invalid/expired → `401`. Login: max 10 failures / 15 min per IP+user → `429`.
- Clients send `Origin`; reply with matching CORS headers and answer `OPTIONS` with 2xx.
- Deployment: same-origin hosting (serve the app and `/api` together, `API_BASE = location.origin`) avoids CORS entirely.
