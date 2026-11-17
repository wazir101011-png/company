# بیک اینڈ: کس فائل اور کس کوڈ کا بیک اینڈ بنے گا (ایک ہی فائل میں)

یہ فائل بیک اینڈ ڈویلپر کے لیے ہے۔ اس میں ہر فائل اور ہر مرکزی کوڈ کے سامنے لکھا ہے کہ وہ کیا کرتا ہے، اس کا کون سا ڈیٹا (Key) ہے، اور بیک اینڈ میں اس کے لیے کیا بنانا ہے۔

ساتھی فائلیں (اگر مزید تفصیل چاہیے): `BACKEND_QUICK_UR.md` (ایک صفحہ)، `BACKEND_HANDOFF.md` (انگریزی خلاصہ)، `API_CONTRACT.md` (API کا قاعدہ)، `docs/FACTORY_ACCOUNTING_BACKEND_DOCUMENTATION.md` (مکمل تفصیل، ڈیٹا بیس ٹیبل، فارمولے، ٹیسٹ کیسز)۔

---

## 1. سب سے پہلے یہ سمجھ لیں

1. ایپ سادہ HTML + JavaScript ہے۔ ابھی سارا ڈیٹا ہر براؤزر کے `localStorage` میں رہتا ہے۔
2. تمام صفحات ڈیٹا ایک ہی راستے سے پڑھتے اور لکھتے ہیں: `App.store` (فائل `common.js`)۔ اسی لیے بیک اینڈ **صرف اسی ایک جگہ** کے ساتھ جڑتا ہے۔ صفحات کا کوڈ نہیں بدلنا۔
3. جب `config.js` میں `API_BASE` لکھ دیا جائے تو `App.store` ہر لکھائی کو قطار (outbox) میں رکھ کر آپ کے سرور پر بھیج دیتا ہے، اور لاگ اِن کے بعد سرور سے سب ڈیٹا کھینچ لیتا ہے۔
4. **حساب (ٹوٹل، بیلنس، ایجنگ، ڈیش بورڈ، سمری) براؤزر میں انٹریوں سے نکلتا ہے۔** کہیں بھی بیلنس محفوظ نہیں ہوتا۔ سرور کو صرف ڈیٹا رکھنا ہے، حساب لازمی نہیں (مرحلہ 2 میں اختیاری)۔

### دو مرحلے
| | مرحلہ 1 (ضروری، ابھی) | مرحلہ 2 (بعد میں، جب ایک برانچ پر کئی لوگ ایک ساتھ کام کریں) |
|---|---|---|
| کیا بنانا ہے | ایک key/value API (لاگ اِن + `GET/PUT/DELETE /api/kv`) | ہر کھاتے/انٹری کے الگ Endpoint، اصل ڈیٹا بیس ٹیبل |
| فرنٹ اینڈ میں تبدیلی | صرف `config.js` میں `API_BASE` | صرف `App.store` کے اندر (صفحات نہیں) |
| دستاویز | `API_CONTRACT.md` | مکمل دستاویز کا باب 10-B اور 8.2 |

---

## 2. مرحلہ 1: وہ API جو لازماً بنانی ہے

| Endpoint | کام | جواب / غلطی |
|---|---|---|
| `POST /api/login` `{username,password}` | لاگ اِن | `200 {token, role:'admin'｜'owner', branches:[...]｜"*"}`؛ غلط پاس ورڈ `401`؛ بہت کوششیں `429` |
| `POST /api/logout` | ٹوکن ختم | `200` |
| `GET /api/kv` | صارف کو نظر آنے والی تمام Keys (لاگ اِن کے بعد ایک بار) | `{items:{key:{value,version}}}` |
| `GET /api/kv/:key` | ایک Key | `{value,version}`؛ نہ ملے تو `404` |
| `PUT /api/kv/:key` `{value,version}` | لکھنا | `200 {version}`؛ `version` میل نہ کھائے تو `409` (کچھ نہیں بدلتا) |
| `DELETE /api/kv/:key` `{version}` | حذف | وہی version کا قاعدہ |

قواعد (سب `tools/contract_test.js` میں جانچے جاتے ہیں):
- Key کا فارمیٹ `^[A-Za-z0-9_.-]{1,120}$` (ورنہ `400`)۔ قدر (value) لازماً string (ورنہ `422`)، زیادہ سے زیادہ 5 MB (ورنہ `413`)۔
- `version` پورا عدد ≥ 0۔ نہ ملنے والی Key کی version 0 مانی جائے۔ کامیابی پر پرانی + 1 لوٹائیں۔
- ہر صارف کی برانچ کی حد: جس صارف کو صرف کچھ برانچیں ملی ہیں، اس کے لیے دوسری برانچوں کی `branch_N_*` Keys پر `403` اور `GET /api/kv` کی فہرست سے غائب۔
- `rohan_owner_perms` صرف admin لکھ سکتا ہے (باقی کو `403`)۔
- Bearer ٹوکن، ٹوکن کی میعاد (مثال 12 گھنٹے)، لاگ اِن کی حد (مثال: 10 ناکامیاں / 15 منٹ فی IP + صارف)، صرف HTTPS، CORS (ہیڈر `Content-Type, Authorization`؛ طریقے `GET, PUT, DELETE, POST, OPTIONS`)۔
- ایپ کی Static فائلیں عوامی رہیں۔ `/api/*` کبھی cache نہ ہو (`sw.js` پہلے ہی ایسا کرتا ہے)۔

**جانچ:** `BASE=https://آپ-کا-سرور ADMIN_PASSWORD=… OWNER_PASSWORD=… [LIMITED_USER=… LIMITED_PASSWORD=…] node tools/contract_test.js`
25 چیکس (محدود صارف دیں تو 30)۔ Exit code 0 کا مطلب API درست ہے۔ تیار مثال: `tools/reference_server.js` (Node 18، بغیر Library)۔

---

## 3. مرکزی کوڈ: `common.js` (ہر صفحے پر لوڈ ہوتا ہے)

| کوڈ (فنکشن / حصہ) | کیا کرتا ہے | بیک اینڈ میں کیا بنے |
|---|---|---|
| `App.store` (`get/set/remove/pull/flush/pending/conflicts/resolve`) | ڈیٹا کا واحد راستہ۔ `API_BASE` ہو تو لکھائی قطار میں رکھ کر سرور بھیجتا ہے، آف لائن ہو تو بعد میں | **مرحلہ 1 کی KV API** (اوپر جدول)۔ مرحلہ 2 میں صرف یہی حصہ Per-record Endpoints پر منتقل ہو گا |
| `LOCAL_ONLY` (ریگولر ایکسپریشن، `common.js` میں `App.store` کے اوپر) | وہ Keys جو سرور پر نہیں جاتیں (ڈیوائس کی ترجیحات) | کچھ نہیں بنانا۔ فہرست حصہ 8 میں |
| `App.request`، `App.api` | واحد HTTP فنکشن (`{ok,status,data}` لوٹاتا ہے، کبھی ایرر نہیں پھینکتا) | کچھ نہیں؛ صرف آپ کے Endpoints کو بلاتا ہے |
| `App.auth.login/start/logout` | لاگ اِن۔ `API_BASE` ہو تو `POST /api/login`، ورنہ مقامی PBKDF2 | **`/api/login` اور `/api/logout`**۔ سرور پر پاس ورڈ ہیش (argon2id/bcrypt) |
| `App.users` + `index.html` کے `USERS` ہیش | مقامی موڈ کے صارف (صارف، کردار، برانچوں کی فہرست) | سرور پر Users ٹیبل بننے کے بعد `index.html` کے `USERS` ہیش ہٹا دیں |
| `App.guardOwner`، `ownerCan`، `ownerPerms`، `blockOwner` | Owner کی اجازتیں (کون سا بٹن/کام Owner کر سکتا ہے) | `rohan_owner_perms` صرف admin لکھے؛ مرحلہ 2 میں `/api/owner-permissions`۔ سرور بھی ہر لکھائی پر یہی اجازتیں جانچے |
| `App.keysFor(bid)` | کسی برانچ کی Keys کے نام: `<bid>_customer_list`، `_customer_details`، `_bnam_records`، `_deleted_customers`، `_deleted_entries` | ڈیٹا ماڈل (حصہ 7) |
| `App.calcTotal(o)` | رقم = وزن × ریٹ (یا وزن ÷ من × ریٹ، یا پیس × ریٹ) ± فیصد، پھر پورا عدد | مرحلہ 1 میں ضروری نہیں۔ مرحلہ 2 میں سرور پر دوبارہ جانچ لگائیں تاکہ ہاتھ سے بھیجی رقم غلط نہ ہو (فارمولا F1، حصہ 6) |
| `App.nextSerial(bid)` | انٹری کا نمبر (`no`) = موجودہ زیادہ سے زیادہ + 1، Key `<bid>_entry_seq` | مرحلہ 2 میں سرور خود نمبر دے (ٹرانزیکشن میں) تاکہ دو لوگوں کو ایک نمبر نہ ملے |
| `App.audit(bid, action, info)` | تبدیلی کی تاریخ `<bid>_audit_log` (آخری 2000) | مرحلہ 2 میں سرور خود Audit لکھے (صارف، وقت، پرانی/نئی قدر)؛ کلائنٹ پر بھروسا نہ کریں |
| `App.recycleEntry`، `restoreEntry`، `purgeRecycle`، `archiveAccount`، `archiveDeletedSameName` | حذف شدہ انٹری/کھاتے کو ری سائیکل بن میں رکھنا، بحال کرنا، `recycleDays` کے بعد مستقل ختم | مرحلہ 2: نرم حذف (`deleted_at`)، بحالی، مستقل ختم۔ Owner کے لیے اجازت کی جانچ |
| `App.balanceOf`، `App.aging`، `App.recordsByCustomer`، `App.customerInfo` | بقایا، رننگ بیلنس، ایجنگ (4 خانے) | رپورٹ Endpoints اختیاری (حصہ 6) |
| `App.entryWarnings`، `editWarnings`، `creditWarn` | کریڈٹ لمٹ، ڈپلیکیٹ، مستقبل کی تاریخ جیسی وارننگ | سرور پر ضروری نہیں؛ چاہیں تو وہی قاعدے |
| `App.buildBranchXlsx`، `downloadBranchXlsx` | Excel فائل براؤزر میں بنتی ہے | اختیاری: `GET /api/branches/:bid/export.xlsx` |
| `App.exportBackup`، `importBackup` | پوری برانچ کا JSON بیک اپ / بحالی | مرحلہ 2: `GET /api/backup`، `POST /api/restore` (صرف admin، پہلے خودکار Snapshot) |
| `App.printNow` | پرنٹ سے پہلے اضافی چیزیں چھپانا، صفحات بانٹنا | کچھ نہیں (صرف براؤزر) |
| `App.i18n` (اردو/English) | اسکرین کی زبان | کچھ نہیں |
| `window.__ubgSizeSpec`، `window.__ubgPrintLogo` | سائز سیٹنگز اور پرنٹ لوگو کی فہرست | کچھ نہیں (ڈیوائس کی Keys) |
| `App.loadSettings(bid)` | برانچ کی سیٹنگز (`rohan_branch_master_settings_<bid>`): من کا وزن، ریٹ کی حد، فیصد، ایجنگ کے دن، `recycleDays` وغیرہ | Synced Key؛ مرحلہ 2 میں `GET/PUT /api/branches/:bid/settings`۔ Owner کے لیے صرف پڑھنا |

---

## 4. ہر فائل: کون سا ڈیٹا اور بیک اینڈ کا کیا کام

`<bid>` = `branch_1` … `branch_20`۔ "مرحلہ 1" میں سب فائلیں صرف `App.store` استعمال کرتی ہیں، یعنی الگ بیک اینڈ کام نہیں۔ دائیں والا کالم مرحلہ 2 کے لیے ہے۔

| فائل | کام | Keys جو پڑھتی/لکھتی ہے | بیک اینڈ (مرحلہ 2) |
|---|---|---|---|
| `index.html` | لاگ اِن۔ ناکام کوششوں پر Lock (`rohan_lock_attempts`، `rohan_lock_seconds`) | کوئی ڈیٹا نہیں؛ `App.auth.login` | `POST /api/login`، `/api/logout`، `GET /api/me`؛ لاگ اِن کی حد اور Lock سرور پر بھی |
| `branches.html` | برانچ منتخب کرنا، **برانچ سیٹنگز** (زبان، برانچوں کے نام/رنگ، ظاہری شکل، پرنٹ، حفاظت، Owner کی اجازتیں، صارفین)، بیک اپ | `rohan_branches_custom_config_v2`، `rohan_branch_lang_overrides`، `rohan_company_name`، `rohan_owner_perms`، `rohan_users_v1` (صرف مقامی موڈ)، `rohan_print_*`، `rohan_idle_minutes`، ڈیوائس کی Keys | `GET/PUT /api/branches` (صرف admin لکھے)، `/api/owner-permissions`، صارفین کا انتظام سرور پر |
| `size_settings.html` | سائز سیٹنگز ہب (کینوا جیسا) | صرف `rohan_sz_*`، `rohan_tbl_*` (ڈیوائس) | **کچھ نہیں** |
| `home.html` | برانچ کا مین مینو، **ڈیش بورڈ** (KPI، چارٹ، اپنے بنائے ڈبے)، ماسٹر سیٹنگز، پرنٹ لوگو سوئچ | `<bid>_bnam_records`، `_customer_list`، `_dash_boxes`، `_dash_layout`، `rohan_branch_master_settings_<bid>`، `rohan_pl_*` (ڈیوائس) | `GET/PUT /api/branches/:bid/settings`، `/dash-boxes`، `/dash-layout` (admin لکھے)؛ اختیاری `GET /api/branches/:bid/dashboard` |
| `jama_entry.html`، `bnam_entry.html` | جمع / بنام انٹری شیٹ + مائیک (`voice_input.js`) | `<bid>_bnam_records` (نئی انٹری جمع)، `_customer_list`، `_customer_details` (نیا گاہک بن سکتا ہے)، `<bid>_entry_seq`، `<bid>_audit_log` | `POST /api/branches/:bid/entries`: `no` سرور دے، رقم `calcTotal` کے مطابق جانچے، Audit لکھے، Owner کے لیے اجازت جانچے |
| `edit_entry.html` | ایک انٹری ایڈٹ / ڈیلیٹ | `<bid>_bnam_records`، `_deleted_entries`، `_audit_log` | `PATCH` / `DELETE /api/branches/:bid/entries/:id` (ڈیلیٹ = ری سائیکل بن)؛ Audit میں پرانی اور نئی قدر |
| `add_customer.html` | نیا کھاتہ (+ اختیاری Credit Limit، اختیاری Opening Balance) | `<bid>_customer_list`، `_customer_details`، `_bnam_records` (Opening Balance انٹری، `isOpening:true`)، `_entry_seq` | `POST /api/branches/:bid/customers`: نام اور کھاتہ نمبر برانچ میں منفرد؛ Opening Balance اسی ٹرانزیکشن میں |
| `edit_customer.html` | کھاتے کی معلومات / نام بدلنا | `_customer_list`، `_customer_details`، `_bnam_records` | `PATCH /api/branches/:bid/customers/:id`؛ نام بدلنے پر تمام انٹریوں میں نام اپڈیٹ (سرور کرے) |
| `customer_ledger.html` | ایک گاہک کا لیجر (رننگ بیلنس)، تلاش، تاریخ فلٹر، رنگین قلم، کھاتہ ڈیلیٹ/بحال/مستقل ختم، پرنٹ | `_bnam_records`، `_customer_details`، `_customer_list`، `_deleted_customers`، `_audit_log` | اختیاری `GET /api/branches/:bid/customers/:id/ledger`؛ ڈیلیٹ/بحال/مستقل ختم کے Endpoints |
| `summary.html` | سمری: جمع کھاتے اور بنام کھاتے کے دو جدول، کل جمع/بنام/خالص کیش، واٹس ایپ، پرنٹ | `_bnam_records`، `_customer_details`، `_customer_list`، `_deleted_customers` | اختیاری `GET /api/branches/:bid/reports/summary?asOf=` |
| `daily_journal.html` | روزنامچہ: ایک تاریخ کی انٹریاں + پرانا حساب + آج کا ٹوٹل + آخری بیلنس | `_bnam_records`، `_customer_details` | اختیاری `GET /api/branches/:bid/reports/journal?date=` |
| `aging_report.html` | بقایا کی عمر (ایجنگ) | `_bnam_records`، `_customer_details`، `_customer_list` | اختیاری `GET /api/branches/:bid/reports/aging` |
| `all_branches.html` | تمام برانچوں کا موازنہ + Excel | ہر اجازت یافتہ برانچ کی Keys | اختیاری `GET /api/reports/all-branches` (صرف اجازت یافتہ برانچیں) |
| `deleted_entries.html` | ری سائیکل بن اور بحالی | `<bid>_deleted_entries` | `GET /deleted-entries`، `POST /deleted-entries/:id/restore` |
| `deleted_records.html` | ڈیلیٹ شدہ کھاتے، یتیم کھاتوں کی نشاندہی | `_deleted_customers`، `_customer_details` | `GET /customers?status=deleted`، `POST /customers/:id/restore` |
| `audit_log.html` | تبدیلیوں کی تاریخ | `<bid>_audit_log`، `_audit_seen` (ڈیوائس) | `GET /api/branches/:bid/audit` (صرف پڑھنا) |
| `my_words.html` | مائیک کے لیے "میرے الفاظ" | `rohan_voice_words` (Synced) | `GET/PUT /api/voice-words` (یا KV میں ہی رہنے دیں) |
| `voice_input.js` | مائیک بٹن (Web Speech API؛ اردو ۱، اردو ۲، English) | `<bid>_customer_list` اور `_bnam_records` صرف پڑھتا ہے؛ ڈیوائس کی `rohan_voice_*` | **کچھ نہیں** |
| `config.js` | **واحد سیٹنگ**: `window.APP_CONFIG = { API_BASE: 'https://سرور' }` (خالی = صرف مقامی؛ `location.origin` = ایک ہی ڈومین) | — | یہاں سرور کا ایڈریس لکھیں |
| `sw.js` | آف لائن cache (network-first)۔ `/api/` اور `Authorization` والی درخواست cache نہیں کرتا | — | کچھ نہیں؛ نام ہر ریلیز پر بدلیں (`ledger-v12`) |
| `manifest.json`، `logo.png`، `icon-192.png`، `icon-512.png`، `apple-touch-icon.png` | ایپ کا نام اور لوگو | — | Static فائلیں ایپ کے ساتھ Serve ہوں |
| `vendor/offline-chart.js` | آف لائن چارٹ | — | کچھ نہیں |
| `seed_dryfruit_lahore.js`، `seed_branches_import.js` | ایک بار کا ڈیٹا امپورٹ، **صرف مقامی موڈ میں**؛ `API_BASE` ہو تو کچھ نہیں کرتے | — | `tools/dryfruit_lahore_data.json` (branch_1) اور `tools/branches_import_data.json` (branch_2–5) سرور پر امپورٹ کریں، پھر یہ دونوں اسکرپٹ اور `index/branches/home.html` کے `<script>` ٹیگ ہٹا دیں |
| `tools/*` | `reference_server.js` (مثال)، `contract_test.js` (جانچ)، ڈیٹا JSON، `password_key_maker.html` | — | ڈویلپر کے اوزار، ڈپلائے نہیں ہوتے |

---

## 5. جو چیزیں سرور پر بھیجی نہیں جاتیں (بیک اینڈ نہیں بنانا)

ڈیوائس کی ظاہری ترجیحات `common.js` کی `LOCAL_ONLY` میں ہیں:
`rohan_theme_mode`، `rohan_global_lang`، `rohan_font_scale`، `rohan_table_density`، `rohan_reduce_motion`، `rohan_card_badge`، `rohan_card_status`، `rohan_branch_cols`، `rohan_tbl_*` (ٹیبل سائز)، `rohan_sz_<صفحہ>_<گروپ>_<s|f|b|h|w>` (سائز سیٹنگز)، `rohan_pl_<صفحہ>` (پرنٹ لوگو آن/آف؛ `0` = بند)، `rohan_logout_confirm`، `rohan_voice_fix|pos|eng` (eng: 1 اردو ۱، 2 اردو ۲، 3 English)، `rohan_users_v1`، `rohan_outbox`، `rohan_sync_versions`، `rohan_sync_conflicts`، `<bid>_audit_seen`۔

اگر مالک چاہے کہ سائز سیٹنگز تمام ڈیوائسز پر یکساں ہوں تو `LOCAL_ONLY` سے `sz_…` اور `pl_…` والا حصہ ہٹا دیں؛ پھر یہ عام Synced Keys بن جائیں گی اور سرور کو کوئی خاص کام نہیں۔

سیشن (`sessionStorage`، براؤزر بند ہونے پر ختم): `rohan_session_active`، `rohan_user_role`، `rohan_user_name`، `rohan_user_branches`، `rohan_last_activity`، `api_token`، `active_branch_*`، اور صفحوں کے درمیان پیغام (`active_ledger_customer`، `edit_record_id`، `edit_record_index`، `ledger_back_target`، `ab_show_all`)۔

---

## 6. فارمولے (اگر سرور پر بھی لگانے ہوں)

یہ سب `common.js` اور متعلقہ صفحے میں ہیں؛ دستاویز میں F1 تا F12 کے نام سے مکمل لکھے ہیں۔ خلاصہ:
- **رقم (`calcTotal`):** ریٹ > 0 ہو تو: وزن ہو تو `وزن × ریٹ`، یا ریٹ ≥ حد (ڈیفالٹ 25000) پر `وزن ÷ من (ڈیفالٹ 37.324) × ریٹ`؛ وزن نہ ہو اور پیس ہوں تو `پیس × ریٹ`۔ فیصد سیٹنگ آن ہو تو جمع یا منفی۔ آخر میں پورا عدد (`Math.round`)۔
- **بیلنس:** `type === 'JAMA'` کریڈٹ، باقی سب بنام (ڈیبٹ)؛ رننگ بیلنس انٹریوں کے مجموعے سے۔
- **ایجنگ:** کھاتے کی سب سے پرانی کھلی انٹری سے دنوں کی گنتی، 4 خانے (`agingStep` دن، ڈیفالٹ 30)۔
- **انٹری نمبر:** برانچ میں سب سے بڑا `no` + 1۔
- **Opening Balance:** وہ انٹری جس پر `isOpening:true` ہو؛ `openingInTotals` (ڈیفالٹ آن) سے ٹوٹل میں شامل۔

---

## 7. ڈیٹا ماڈل (کیا محفوظ ہوتا ہے)

مرحلہ 1 میں سب کچھ string (JSON) کی صورت میں KV میں۔ ہر برانچ `<bid>` کے لیے:
- `<bid>_customer_list`: کھاتوں کے ناموں کی فہرست۔
- `<bid>_customer_details`: `{id, name, accountNo, phone, cnic, address, creditLimit, createdAt}`۔
- `<bid>_bnam_records`: **تمام انٹریاں** (جمع اور بنام): `{id, date, customerName, customerId, details, extra, pcs, weight, rate, rateUnit, rateMode, percentApplied, totalManual, totalAmount, type:'JAMA'｜'BNAM', no, createdAt, createdBy, isOpening?}`۔
- `<bid>_deleted_customers`، `<bid>_deleted_entries`: ڈیلیٹ شدہ کھاتے / ری سائیکل بن (`{deletedAt, deletedBy, reason, rec}`)۔
- `<bid>_audit_log`، `<bid>_entry_seq`، `<bid>_dash_boxes`، `<bid>_dash_layout`، `rohan_branch_master_settings_<bid>`۔
- عالمی Keys: `rohan_branches_custom_config_v2` (برانچوں کے نام/رنگ)، `rohan_owner_perms`، `rohan_voice_words`، `rohan_company_name`، `rohan_print_*` وغیرہ۔

لازمی شرطیں (فرنٹ اینڈ ان پر بھروسا کرتا ہے): برانچ میں گاہک کا نام اور کھاتہ نمبر منفرد؛ ہر انٹری کا `customerId` `_customer_details` میں موجود؛ تاریخ `YYYY-MM-DD`؛ `totalAmount` عدد (ڈیٹا بیس میں DECIMAL رکھیں)؛ انٹری `id` منفرد۔

مرحلہ 2 کے ٹیبل (users، user_branch_access، branches، customers، entries، deleted_entries، audit_log وغیرہ، فیلڈ در فیلڈ): مکمل دستاویز باب 8.2۔

---

## 8. صارفین اور اجازتیں

- دو کردار: **admin** (سب کچھ) اور **owner** (صرف وہ جو `rohan_owner_perms` اجازت دے، اور صرف اپنی برانچیں)۔
- لاگ اِن کا جواب `branches` میں فہرست یا `"*"` (سب)۔ سرور ہر Key اور ہر Endpoint پر یہ حد نافذ کرے۔
- `rohan_owner_perms` صرف admin لکھے۔
- پاس ورڈ سرور پر ہیش میں؛ `index.html` کے `USERS` ہیش صرف مقامی موڈ کے لیے ہیں اور سرور تیار ہونے کے بعد ہٹا دیں۔

---

## 9. ڈویلپر کے لیے ترتیب وار کام

1. `API_CONTRACT.md` پڑھیں، `tools/reference_server.js` چلا کر دیکھیں۔
2. اپنے سٹیک میں حصہ 2 کی API بنائیں، اور `tools/contract_test.js` سے جانچیں (سب چیکس پاس ہوں)۔
3. سرور پر صارف اور کردار بنائیں (ہیش شدہ پاس ورڈ)۔
4. `config.js` میں `API_BASE` لکھیں۔ UI سے لاگ اِن کریں، کھاتہ اور انٹری بنائیں، دوسرے براؤزر میں لاگ اِن کر کے ڈیٹا دیکھیں۔
5. محدود صارف سے جانچیں کہ دوسری برانچ نظر نہیں آتی (`403`)۔
6. انٹرنیٹ بند کر کے انٹری کریں، واپس آنے پر Sync ہو۔ پرانی version بھیج کر `409` کی وارننگ دیکھیں۔
7. `tools/*.json` کا ڈیٹا سرور پر امپورٹ کریں، پھر `seed_*.js` اور ان کے `<script>` ٹیگ ہٹا دیں۔
8. جب کئی لوگ ایک برانچ پر ساتھ کام کریں تو مرحلہ 2 (Per-record Endpoints) شروع کریں۔

## 10. معلوم حدیں (خرابی نہیں، ڈیزائن کی وجہ سے)

- پوری Array والی Keys (مثلاً `<bid>_bnam_records`) ایک قدر کے طور پر Sync ہوتی ہیں؛ دو لوگ ایک ہی برانچ ایک ساتھ بدلیں تو ایک کو `409` ملتا ہے اور صارف مقامی یا سرور والی کاپی چنتا ہے (کچھ خاموشی سے ضائع نہیں ہوتا)۔ اس کا حل مرحلہ 2 ہے۔
- مقامی موڈ کے صارف (`rohan_users_v1`) صرف اسی براؤزر میں ہوتے ہیں؛ بیک اینڈ کے ساتھ صارفین سرور پر ہوں گے۔
- پرنٹ لے آؤٹ کروم کے پرنٹ موڈ میں جانچے گئے ہیں، اصلی پرنٹر پر نہیں۔
- ڈیش بورڈ میں وزن کی سمت: In = BNAM کا وزن، Out = JAMA کا وزن (فرنٹ اینڈ کا اصول)۔
