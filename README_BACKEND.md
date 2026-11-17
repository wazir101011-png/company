# Unit Business Group Ledger — frontend notes for backend work

Pure HTML/JS, no build step. All data lives in `localStorage` (per browser) until a backend is connected.
Open via a web server (`localhost` or `https`), not by double-clicking the file: PBKDF2 login, the service worker and the clipboard need a secure context.

## Files
- `BACKEND_FILE_BY_FILE_UR.md` — ONE Urdu file: which frontend file / code needs which backend part, keys, endpoints, rules, build order. Give this to the backend developer first.
- `BACKEND_QUICK_UR.md` — one-page Urdu summary of the same.
- `BACKEND_HANDOFF.md` — short English hand-over for the backend developer: file-by-file responsibilities, build order, acceptance checklist. Read first.
- `docs/FACTORY_ACCOUNTING_BACKEND_DOCUMENTATION.md` — the full hand-over document (Urdu): every page, button, form, formula, business rule, database schema, API, permissions, security, test cases and missing information. Start here.
- `common.js` — shared layer loaded by every page (`window.App`): storage helpers, settings, totals (`App.calcTotal`), audit log, recycle bin, serial numbers, Excel export, session guard, `App.api`.
- `voice_input.js` — mic button on the jama/bnam entry sheets (Web Speech API, Chrome/Edge; Urdu speech via hi-IN or ur-PK engine (Devanagari output is transliterated to Urdu), numbers written as English digits; saying "enter" saves the entry).
- `sw.js` — offline cache (network-first). It never caches `/api/` or requests carrying an `Authorization` header.
- `size_settings.html` — canvas-style hub for per-page size settings (opened from Branch Settings > "Size Settings"). The list of pages/groups and the CSS selectors live in `window.__ubgSizeSpec` in `common.js`; values are device-local keys `rohan_sz_<page>_<group>_<s|f|b|h|w>` (s = font size 1-100, f = font family, b = box scale where 50 = normal, h = height, w = width). Applied on screen only, never in print.
- `logo.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — transparent brand logo. Print logo per printout is switched in Home > Settings > "Print Logo" (`window.__ubgPrintLogo` in `common.js`, key `rohan_pl_<page>`, `0` = off).
- `my_words.html` — "My words" list (names, banks, phrases) used by the mic. Stored in the synced key `rohan_voice_words` (JSON array of `{w, s}`).
- `config.js` — the ONLY file to edit to connect a server: `window.APP_CONFIG = { API_BASE: 'https://your-server' }` (empty = local-only, `location.origin` = same-origin).
- `API_CONTRACT.md` — the endpoints the backend must implement.
- `tools/reference_server.js` — working Node 18 example backend (no dependencies) of the contract. `tools/contract_test.js` — black-box test you run against ANY backend.
- `index.html` login · `branches.html` branch picker · `home.html` dashboard · `jama_entry.html` / `bnam_entry.html` entry sheets · `summary.html`, `customer_ledger.html`, `daily_journal.html`, `aging_report.html`, `all_branches.html` reports · `add_customer.html`, `edit_customer.html`, `edit_entry.html` · `deleted_entries.html`, `deleted_records.html`, `audit_log.html`.

## Where the server plugs in
- All data access goes through `App.store` (`get/set/remove`, `pull`, `flush`, `pending`, `conflicts`, `resolve`) in `common.js`. Pages never touch `localStorage` directly (apart from the quota guard in common.js and the reads inside the store itself).
- `App.auth.login/start/logout` handle sign-in. With `APP_CONFIG.API_BASE` empty they use the local PBKDF2 hashes in `index.html`; with it set they call `POST /api/login`.
- `App.request` is the single HTTP function (returns `{ok, status, data}`), `App.api` is a thin wrapper that shows a warning toast on failure.
- Details, endpoints and conflict rules: `API_CONTRACT.md`.

## localStorage keys (`<bid>` = `branch_1` … `branch_20` by default; the list can be changed in `rohan_branches_custom_config_v2`)
| Key | Content |
|---|---|
| `<bid>_customer_list` | array of account names |
| `<bid>_customer_details` | `{id, name, accountNo, phone, cnic, address, createdAt}` |
| `<bid>_bnam_records` | all entries (JAMA and BNAM): `{id, date, customerName, customerId, details, extra, pcs, weight, rate, rateUnit, rateMode, percentApplied, totalManual, totalAmount, type: 'JAMA'｜'BNAM', no, createdAt, createdBy, isOpening?}`. Only customer name and details are mandatory when saving; account no., pcs, weight, rate and amount may be empty (stored as 0 / `'-'`). `isOpening: true` marks an opening-balance entry |
| `<bid>_deleted_customers`, `<bid>_deleted_entries` | archived accounts / recycle bin |
| `<bid>_audit_log`, `<bid>_audit_seen`, `<bid>_entry_seq` | change history, last-seen marker, serial counter |
| `<bid>_dash_boxes` | dashboard boxes set up in Settings: `[{id, type: 'balance'｜'rate'｜'weight'｜'expense'｜'net', title, billName, billId, khataName, khataId, dedMode, rows, wtName, wtId, wtMode}]`. `rows` = hand-typed `[{n, w, a}]` (expense boxes and the expenses of a `net` box; never part of any account). `net` = factory bill − waste-account weight (`wtName`) − expense rows, then rate = amount ÷ weight |
| `<bid>_dash_layout` | per-branch dashboard layout `{order, hide, hideKpi, kpiOrder, w, labels}` (section order, hidden sections, widths, edited texts) |
| `rohan_branch_master_settings_<bid>` | per-branch settings |
| `rohan_*` | UI preferences, owner permissions (`rohan_owner_perms`, admin-write-only), branch list (`rohan_branches_custom_config_v2`), branch language overrides, company name, print settings, idle/lock settings, mic words (`rohan_voice_words`) |
| `rohan_print_paper`, `rohan_print_orient`, `rohan_voice_eng` (1 Urdu-1, 2 Urdu-2, 3 English), `rohan_voice_pos` | per-device print / mic preferences (not business data) |
| `rohan_tbl_*`, `rohan_sz_<page>_<group>_<s｜f｜b｜h｜w>`, `rohan_pl_<page>` | per-device table / per-page size settings and print-logo switches (listed in `LOCAL_ONLY` in `common.js`, never synced) |
| `ubg_seed_dryfruit_lahore2_v1`, `ubg_seed_4branches_v1`, `ubg_backup_before_empty_v1` | local-mode one-time import flags / backup (see the import sections below) |
| session (`sessionStorage`) | `rohan_session_active`, `rohan_user_role`, `rohan_user_name`, `rohan_user_branches`, `active_branch_id`, `active_branch_name`, `active_branch_lang`, `active_branch_bg`, `active_branch_text`, `api_token` |

## Rules already enforced in the frontend
- Every value rendered into HTML goes through `App.esc` (tested with script-injection payloads in names, details, settings and audit data).
- A failed `localStorage.setItem` (storage full) shows a warning and stops the save instead of failing silently.
- Totals are rounded to whole numbers in `App.calcTotal`; amounts are stored as strings or numbers, so the backend should parse them with a decimal type.

## Quick start with the reference server
```
ADMIN_PASSWORD=... OWNER_PASSWORD=... node tools/reference_server.js 8770     # serves the app + /api, stores tools/data.json
BASE=http://127.0.0.1:8770 ADMIN_PASSWORD=... OWNER_PASSWORD=... node tools/contract_test.js   # 25 checks (30 when LIMITED_USER/LIMITED_PASSWORD are set), exit 0 = pass
```
It serves a dynamic `/config.js` with `API_BASE = location.origin`. Verified end to end: login from the UI, a write in one browser appears in another after login.
For a real backend, build the same endpoints in any stack, run `contract_test.js` against it until it passes, then set `API_BASE` in `config.js`.

## Hand-off checklist for the backend developer
1. Implement every endpoint in `API_CONTRACT.md`; run `tools/contract_test.js` until all checks pass.
2. Users and roles on the server (hashed passwords). After that, delete the `USERS` hashes in `index.html` (they are only used when `API_BASE` is empty).
3. Enforce on the server: `owner` cannot write `rohan_owner_perms`; per-branch access: login returns `branches` (array or `"*"`); reject keys `branch_N_*` outside that list with 403 (see `USERS_JSON` in tools/reference_server.js). Local mode keeps users in `rohan_users_v1` (admin: Settings → Users tab).
4. Keys are free-form strings matching `^[A-Za-z0-9_.-]{1,120}$`; values are strings up to 5 MB.
5. Add HTTPS, token expiry (the reference uses 12 h), login rate limiting, backups, server-side audit trail.

## One-time data import (Dry Fruit House, branch_1)
`seed_dryfruit_lahore.js` (loaded by `index.html`, `branches.html`, `home.html`) merges 188 opening-balance accounts into `branch_1` once per browser, **only in local-only mode** (`API_BASE` empty). With a backend it does nothing; import `tools/dryfruit_lahore_data.json` server-side instead (it holds name, account no., amount, side, date). Delete the script and its three `<script>` tags once the data is on the server.

## Known limits (be aware, not defects)
- Whole-array keys such as `<bid>_bnam_records` are synced as one value, so two people editing the same branch at once get a 409 conflict (nothing is silently lost; the user picks local or server). For heavy concurrent use add per-record endpoints later; only `App.store` needs to change, not the pages.
- Amounts are plain numbers/strings in JSON; store them as decimals on the server.
- Weight unit and the in/out meaning on the dashboard (JAMA = received, BNAM = given) are frontend conventions.

## Paste-ready brief for another AI
"Build the backend for the static app in this folder. Read README_BACKEND.md and API_CONTRACT.md. Implement exactly the REST key/value API described (login, logout, GET /api/kv, GET/PUT/DELETE /api/kv/<key> with optimistic version, 409 on mismatch, Bearer tokens, CORS). Do not change the frontend except `config.js`. `tools/reference_server.js` is a working example; your server must pass `tools/contract_test.js`. Use a real database, hashed passwords, HTTPS, token expiry and rate limiting."


## New settings
`openingInTotals` (default true: opening-balance entries count in daily/monthly/dashboard totals) and `recycleDays` (default 0 = keep deleted entries forever; N = purge after N days via `App.purgeRecycle`), both per branch in master settings.

## Branch import (branch_2..branch_5) and emptying of the other branches
`seed_branches_import.js` (loaded by `index.html`, `branches.html`, `home.html`) runs once per browser, local mode only: it empties branch_2..branch_20 data (accounts, entries, recycle bin, audit log, serial; branch settings/colours are kept; a copy of the removed data is saved in localStorage key `ubg_backup_before_empty_v1`), then loads opening balances into branch_2 (Tamba), branch_3 (Silver), branch_4 (Brass), branch_5 (Scrap). branch_1 is not touched. Same data for a backend import: `tools/branches_import_data.json` (accounts without an account number in the PDF got one assigned: `accountNoAssigned: true`).

## Language (single language per screen)
The language comes only from Branch Settings (global language + per-branch language). `common.js` (`App.i18n`) reduces any static text, placeholder, title, alert, confirm and toast to the active language ("اردو / English" and "اردو (English)" labels are split, Urdu-only static text uses a built-in dictionary). Pages build their own dynamic text with `isEn`. Default column names (Pcs / Weight / Rate / Total Amount / Extra Field) follow the language unless the user renamed them.
