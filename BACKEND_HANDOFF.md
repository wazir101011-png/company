# Unit Business Group Ledger — Backend hand-off (English, for the backend developer)

This file is the short, verified summary. Full detail (Urdu): `docs/FACTORY_ACCOUNTING_BACKEND_DOCUMENTATION.md`. Endpoint rules: `API_CONTRACT.md`. Frontend notes and storage keys: `README_BACKEND.md`.

## 1. What exists today
- A static, offline-first web app (plain HTML + JS, no build step). All data lives in the browser's `localStorage`. Every read/write goes through one layer, `App.store` in `common.js`.
- Setting `API_BASE` in `config.js` turns on server sync. Nothing else in the frontend has to change.
- Business logic (totals, running balances, aging, dashboard maths) is computed **in the browser from the entries**. No balance is stored anywhere. The server stores data; it does not have to calculate.

## 2. What the backend must build (phase 1 — required, works with the frontend unchanged)
A key/value REST API with optimistic locking. The full contract is in `API_CONTRACT.md`.

| Endpoint | Purpose |
|---|---|
| `POST /api/login` `{username,password}` | `200 {token, role: 'admin'｜'owner', branches?: [..]｜"*"}`; `401` wrong credentials; `429` too many attempts |
| `POST /api/logout` | invalidate the token |
| `GET /api/kv` | all keys the user may see: `{items:{key:{value,version}}}` (called once after login) |
| `GET /api/kv/:key` | `{value,version}`; `404` if missing |
| `PUT /api/kv/:key` `{value,version}` | `200 {version}`; `409` if `version` differs from the server's (nothing changes) |
| `DELETE /api/kv/:key` `{version}` | same version rule |

Rules (all covered by `tools/contract_test.js`, 30 checks):
- Key format `^[A-Za-z0-9_.-]{1,120}$` (else 400); value must be a string (else 422); max 5 MB (else 413).
- `version` is an integer ≥ 0; a missing key counts as 0; success returns old + 1.
- Per-user branch access: reject any `branch_N_*` key outside the user's `branches` list with 403, and hide those keys from `GET /api/kv`.
- Only an admin may write `rohan_owner_perms` (403 for others).
- Bearer tokens, expiry (reference 12 h), login rate limit (10 failures / 15 min per IP+user), HTTPS, CORS for the app origin (headers `Content-Type, Authorization`; methods `GET, PUT, DELETE, POST, OPTIONS`).
- `GET` and `OPTIONS` of the static files stay public; `/api/*` is never cached by `sw.js`.

`tools/reference_server.js` is a working Node 18 implementation (no dependencies, JSON file storage). Port the same behaviour to your stack and run:
`BASE=https://your-server ADMIN_PASSWORD=… OWNER_PASSWORD=… [LIMITED_USER=… LIMITED_PASSWORD=…] node tools/contract_test.js` — exit code 0 means compliant. (`LIMITED_USER` is an owner restricted to `branch_1` only.)

## 3. File-by-file: what each frontend file needs from the backend
| File | Role | Backend relevance |
|---|---|---|
| `config.js` | the only deployment setting (`API_BASE`) | set to the server URL; empty = local-only |
| `common.js` | `window.App`: store/sync/outbox, auth, users, settings, calculations, audit, recycle bin, i18n, Excel export | contains all business formulas; `App.store` is the single seam to replace if you move to per-record endpoints |
| `index.html` | login | local mode checks PBKDF2 hashes; with `API_BASE` set it calls `POST /api/login`. Remove the hashes once the server owns users |
| `branches.html` | branch picker + Branch Settings + Users tab | writes `rohan_branches_custom_config_v2`, language overrides, `rohan_users_v1` (local mode only) |
| `home.html` | dashboard, settings, print | reads `<bid>_*` keys; writes `<bid>_dash_boxes`, `<bid>_dash_layout`, master settings |
| `jama_entry.html`, `bnam_entry.html` | entry sheets (+ `voice_input.js` mic) | append to `<bid>_bnam_records`, may create customers, write audit + serial `<bid>_entry_seq` |
| `add_customer.html`, `edit_customer.html`, `edit_entry.html` | account / entry maintenance | `<bid>_customer_list`, `_customer_details`, `_bnam_records`, `_deleted_*`, `_audit_log` |
| `customer_ledger.html`, `summary.html`, `daily_journal.html`, `aging_report.html`, `all_branches.html` | reports | read-only: derive everything from entries |
| `deleted_entries.html`, `deleted_records.html`, `audit_log.html` | recycle bin / archived accounts / history | `_deleted_entries`, `_deleted_customers`, `_audit_log` |
| `my_words.html` | mic dictionary | key `rohan_voice_words` (synced) |
| `size_settings.html` | per-page size settings hub (font size, font style, box/button scale, row height, column width), opened from Branch Settings | only device-local keys `rohan_sz_*` and `rohan_tbl_*`; **no backend work** |
| `seed_dryfruit_lahore.js`, `seed_branches_import.js` | one-time local-mode imports | do nothing when `API_BASE` is set. Import `tools/dryfruit_lahore_data.json` (branch_1) and `tools/branches_import_data.json` (branch_2–5; also empties the other non-Dry-Fruit branches) server-side instead, then delete the scripts and their `<script>` tags |
| `sw.js`, `manifest.json`, `vendor/offline-chart.js` | PWA shell / offline chart | no backend work |
| `logo.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | brand logo (transparent PNG) for the login page, printouts, browser tab and the home-screen icon | static files; serve them with the app |
| `tools/` | reference server, contract test, data files, `password_key_maker.html` | developer tooling, not deployed |

## 4. Data model the server will store (phase 1 = opaque strings)
Per branch `<bid>` (`branch_1` … `branch_20`): `<bid>_customer_list`, `<bid>_customer_details`, `<bid>_bnam_records` (ALL entries; `type==='JAMA'` = credit, anything else = debit; opening balance = entry with `isOpening:true`), `<bid>_deleted_customers`, `<bid>_deleted_entries`, `<bid>_audit_log`, `<bid>_entry_seq`, `<bid>_dash_boxes`, `<bid>_dash_layout`, plus `rohan_branch_master_settings_<bid>`. Global keys start with `rohan_`. The exact field list is in `README_BACKEND.md` (key table) and §8 of the Urdu document (proposed relational schema for phase 2).

Invariants the frontend relies on: customer names and account numbers are unique inside a branch; every entry has a `customerId` that exists in `_customer_details`; dates are `YYYY-MM-DD`; `totalAmount` is a number (store as decimal); entry `id` values are unique.

## 4a. Device-only keys (never sent to the server)
`App.store` skips syncing for the keys matched by `LOCAL_ONLY` in `common.js` (about line 492). They are per-device display preferences, not business data, so the backend neither stores nor validates them. If your server rejects unknown keys, nothing breaks: the frontend never sends them.
`rohan_theme_mode`, `rohan_global_lang`, `rohan_font_scale`, `rohan_table_density`, `rohan_reduce_motion`, `rohan_card_badge`, `rohan_card_status`, `rohan_branch_cols`, `rohan_tbl_*` (table sizes), `rohan_sz_<page>_<group>_<s|f|b|h|w>` (per-page sizes from `size_settings.html`), `rohan_pl_<page>` (print-logo on/off per printout, value `0` = off), `rohan_logout_confirm`, `rohan_voice_fix|pos|eng` (mic position and engine: 1 Urdu-1, 2 Urdu-2, 3 English), `rohan_users_v1`, `rohan_outbox`, `rohan_sync_versions`, `rohan_sync_conflicts`, `<bid>_audit_seen`.
Business-wide settings (branch master settings, owner permissions, mic words, dashboard layout) ARE synced.

## 5. Phase 2 (recommended before many users edit the same branch)
Whole-array keys (e.g. `<bid>_bnam_records`) are synced as one value, so two people editing the same branch at once get a `409` and the user chooses local or server. For real concurrency add per-record endpoints (`/api/branches/:bid/entries`, `/customers`, …; proposed in §10-B of the Urdu document) and replace `App.store` behind the same interface; pages need no change.

## 6. Security checklist
Server-side password hashing (not the client PBKDF2 hashes), HTTPS only, short-lived tokens, login rate limit, per-user branch enforcement and admin-only `rohan_owner_perms` on every write, size/shape validation, server-side audit trail, backups. The frontend escapes all rendered values (`App.esc`).

## 7. Acceptance checklist
1. `tools/contract_test.js` passes against your server (all checks, including the limited-user branch checks).
2. Log in from the UI with `API_BASE` set; create an account and an entry; reload in a second browser — the data appears after login.
3. An owner restricted to some branches cannot read or write other branches' keys (403 / hidden).
4. Go offline, add an entry, come back online — it syncs (outbox `rohan_outbox`); a deliberate stale version shows the conflict warning.
5. One-time imports done server-side; seed scripts removed.

## 8. Known limits (by design, not defects)
- Size settings and the print-logo switches are saved per device (see §4a). If the owner wants them shared across devices, remove the key pattern from `LOCAL_ONLY`; no other change is needed.
- Local-mode users (`rohan_users_v1`) live only in that browser; with a backend the user list belongs on the server.
- Print layouts were verified in emulated print media, not on physical printers.
- Column names typed by the user in Branch Settings are not translated (only the defaults are).
- Dashboard direction convention: In = BNAM weight, Out = JAMA weight (a frontend convention).
