# بیک اینڈ کی مختصر گائیڈ (اردو، ایک صفحہ)

**ہر فائل اور ہر کوڈ کے سامنے بیک اینڈ کا کام: `BACKEND_FILE_BY_FILE_UR.md` (سب سے اہم)۔**

تفصیل کے لیے: `BACKEND_HANDOFF.md` (مختصر، انگریزی) → `README_BACKEND.md` → `docs/FACTORY_ACCOUNTING_BACKEND_DOCUMENTATION.md` (مکمل، اردو) → `API_CONTRACT.md` (API کا معاہدہ)۔

## ایپ کیا ہے
سادہ HTML + JavaScript (کوئی build نہیں)۔ سارا ڈیٹا اب براؤزر کے `localStorage` میں ہے۔ ہر پڑھنا/لکھنا ایک ہی جگہ سے گزرتا ہے: `App.store` (`common.js`)۔ حساب (ٹوٹل، بیلنس، ایجنگ، ڈیش بورڈ) براؤزر میں انٹریوں سے نکلتا ہے؛ Server کو بیلنس محفوظ یا حساب نہیں کرنا۔

## آپ کو کیا بنانا ہے (مرحلہ 1، فرنٹ اینڈ بدلے بغیر)
ایک key/value REST API:
- `POST /api/login` ← `{username, password}` → `{token, role, branches}`
- `POST /api/logout`
- `GET /api/kv` (سب Keys جو صارف دیکھ سکتا ہے) · `GET/PUT/DELETE /api/kv/:key`
- `PUT` اور `DELETE` میں `version`؛ فرق ہو تو `409`۔
- Key کا فارمیٹ `^[A-Za-z0-9_.-]{1,120}$`، قدر string، زیادہ سے زیادہ 5 MB۔
- صارف کی برانچ کی حد: `branch_N_*` Keys دوسری برانچوں کی `403` اور فہرست سے غائب۔
- `rohan_owner_perms` صرف admin لکھ سکتا ہے۔
- HTTPS، Bearer token، لاگ اِن کی حد (10 ناکامیاں / 15 منٹ)، CORS۔

## جانچ
`BASE=https://آپ-کا-سرور ADMIN_PASSWORD=… OWNER_PASSWORD=… node tools/contract_test.js`
25 چیکس (LIMITED_USER دیں تو 30)۔ سب پاس ہوں تو API درست ہے۔ مثال کا سرور: `tools/reference_server.js`۔

## ایپ کو Server سے جوڑنا
صرف `config.js` میں `API_BASE` لکھیں۔ باقی فرنٹ اینڈ میں کچھ نہیں بدلنا۔

## جو Server پر نہیں جاتا
ڈیوائس کی ترجیحات (تھیم، زبان، سائز سیٹنگز `rohan_sz_*` / `rohan_tbl_*`، پرنٹ لوگو `rohan_pl_*`، مائیک انجن اور پوزیشن)۔ فہرست `common.js` کی `LOCAL_ONLY` میں ہے۔ ان کے لیے Backend میں کچھ نہیں بنانا۔

## مرحلہ 2 (جب ایک ہی برانچ پر کئی لوگ ایک ساتھ کام کریں)
ہر انٹری/کھاتے کے الگ Endpoints (تجویز: مکمل دستاویز کا §10-B) اور صرف `App.store` بدلنا؛ صفحات نہیں بدلیں گے۔

## ایک بار کے امپورٹ
`seed_*.js` صرف Local mode میں چلتے ہیں۔ Server پر `tools/*.json` سے ڈیٹا امپورٹ کریں، پھر یہ اسکرپٹس اور ان کے `<script>` ٹیگ ہٹا دیں۔

## قبولیت کی فہرست
1. `contract_test.js` پاس۔ 2. `API_BASE` لگا کر لاگ اِن، کھاتہ اور انٹری بنانا، دوسرے براؤزر میں ڈیٹا نظر آنا۔ 3. محدود صارف دوسری برانچ نہ دیکھ سکے۔ 4. انٹرنیٹ بند کر کے انٹری، پھر واپسی پر Sync۔ 5. پرانا version دینے پر تنازع کی وارننگ۔
