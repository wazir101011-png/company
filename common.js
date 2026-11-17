(function (w) {
    'use strict';

    // Printing (all pages): no screen-only controls, and no full-screen-height body (on iPhone 100vh made a blank 2nd page).
    (function () {
        var css = '@media print{html,body{min-height:0!important;height:auto!important}'
            + '#btnBack,#btnBackHome,#btnLedgerBack,.btn-back,.btn-top-back,.btn-print,.btn-header,#archiveSearchInput,#voiceMic{display:none!important}}';
        try { var st = document.createElement('style'); st.id = 'ubg-print-base'; st.textContent = css; (document.head || document.documentElement).appendChild(st); } catch (e) {}
    })();

    // On phones the page starts below the status bar / notch so the top buttons can be tapped.
    (function () {
        var css = '@media screen and (max-width:700px){html{padding-top:calc(env(safe-area-inset-top,0px) + 18px)!important}}';
        try { var st = document.createElement('style'); st.id = 'ubg-top-space'; st.textContent = css; (document.head || document.documentElement).appendChild(st); } catch (e) {}
    })();

    // Date inputs: iPhone Safari draws <input type="date"> wider than its box and shows "Nov 15, 2026" in its own style.
    // Every plain date input (not the ledger boxes / journal, which have their own) is wrapped in a clipping box;
    // the native control stays (tap opens the calendar) but its text is hidden and the chosen date is shown as DD/MM/YYYY.
    (function () {
        var css = '@media screen{'
            + '.ubg-date{position:relative;display:block;width:100%;max-width:100%;min-width:0;overflow:hidden;border-radius:6px;box-sizing:border-box}'
            + '.ubg-date>input[type="date"]{display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;-webkit-appearance:none;appearance:none;color:transparent!important;-webkit-text-fill-color:transparent!important;cursor:pointer}'
            + '.ubg-date>input[type="date"]::-webkit-datetime-edit{color:transparent;opacity:0}'
            + '.ubg-date>input[type="date"]::-webkit-date-and-time-value{text-align:start}'
            + '.ubg-date-fmt{position:absolute;top:50%;transform:translateY(-50%);inset-inline-start:12px;pointer-events:none;font-weight:bold;direction:ltr;unicode-bidi:isolate;color:#fff;white-space:nowrap}'
            + 'body.light-theme .ubg-date-fmt{color:#111827}'
            + '}';
        function fmt(v) { return v && /^\d{4}-\d\d-\d\d$/.test(v) ? v.slice(8, 10) + '/' + v.slice(5, 7) + '/' + v.slice(0, 4) : ''; }
        function enhance(inp) {
            if (inp.getAttribute('data-ubg-date') || inp.closest('.dbox,.date-wrap,.ubg-date')) return;
            inp.setAttribute('data-ubg-date', '1');
            var wrap = document.createElement('span'); wrap.className = 'ubg-date';
            var out = document.createElement('span'); out.className = 'ubg-date-fmt'; out.setAttribute('aria-hidden', 'true');
            inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp); wrap.appendChild(out);
            try { out.style.fontSize = getComputedStyle(inp).fontSize; } catch (e) {}
            var last = null;
            function sync() { if (inp.value !== last) { last = inp.value; var t = fmt(last); out.textContent = t || 'DD/MM/YYYY'; out.style.opacity = t ? '1' : '.45'; } }
            inp.addEventListener('input', sync); inp.addEventListener('change', sync);
            sync(); setInterval(sync, 300);
        }
        function run() {
            try {
                var st = document.createElement('style'); st.id = 'ubg-date-ui'; st.textContent = css; document.head.appendChild(st);
                Array.prototype.forEach.call(document.querySelectorAll('input[type="date"]'), enhance);
            } catch (e) {}
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
    })();

    // Reliable printing on every device (iPhone Safari included). Before window.print() the elements that must not be
    // printed are hidden with inline !important styles (stronger than any stylesheet), page heights are released, and on
    // iPhone/iPad the table is split into explicit pages: every page gets its own copy of the header rows (logo / name /
    // date + column titles). Everything is put back afterwards.
    window.__ubgPrintNow = function (opt) {
        opt = opt || {};
        var doc = document, undo = [], added = [], done = false;
        var iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        function remember(el) { undo.push([el, el.getAttribute('style')]); }
        function imp(el, k, v) { el.style.setProperty(k, v, 'important'); }
        try {
            if (opt.hide) Array.prototype.forEach.call(doc.querySelectorAll(opt.hide), function (el) { remember(el); imp(el, 'display', 'none'); });
            [doc.documentElement, doc.body].forEach(function (el) { remember(el); imp(el, 'height', 'auto'); imp(el, 'min-height', '0'); imp(el, 'overflow', 'visible'); });
            var tbl = opt.table && doc.querySelector(opt.table);
            if (tbl && tbl.tHead && tbl.tBodies[0] && (iOS || /[?&]printchunk=1/.test(location.search))) {
                var N = opt.rowsPerPage || 28;
                var rows = Array.prototype.filter.call(tbl.tBodies[0].rows, function (r) { return getComputedStyle(r).display !== 'none'; });
                if (rows.length > N) {
                    var hrows = Array.prototype.slice.call(tbl.tHead.rows);
                    remember(tbl.tHead); imp(tbl.tHead, 'display', 'table-row-group');
                    for (var i = N; i < rows.length; i += N) {
                        hrows.forEach(function (hr, k) {
                            var c = hr.cloneNode(true); c.removeAttribute('id');
                            Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (e) { e.removeAttribute('id'); });
                            if (k === 0) { c.style.setProperty('break-before', 'page'); c.style.setProperty('page-break-before', 'always'); }
                            rows[i].parentNode.insertBefore(c, rows[i]); added.push(c);
                        });
                    }
                }
            }
        } catch (e) {}
        function restore() {
            if (done) return; done = true;
            added.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); });
            undo.forEach(function (u) { if (u[1] === null) u[0].removeAttribute('style'); else u[0].setAttribute('style', u[1]); });
            window.removeEventListener('afterprint', restore);
        }
        window.addEventListener('afterprint', restore);
        if (iOS) {
            // iOS returns from print() at once and keeps rendering the preview: restore only after the sheet is closed
            setTimeout(function () { ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) { doc.addEventListener(ev, function f() { doc.removeEventListener(ev, f, true); restore(); }, true); }); }, 1500);
            setTimeout(restore, 120000);
        }
        try { window.print(); } catch (e) {}
        if (!iOS) restore();
    };

    // Defaults; config.js (loaded before this file) may override any of them, e.g. API_BASE.
    var APP_CONFIG = w.APP_CONFIG = Object.assign({
        API_BASE: '',
        PRINT_FOOTER_TEXT: 'Fahim Afaq 03060563856'
    }, w.APP_CONFIG || {});
    try { var pf = localStorage.getItem('rohan_print_footer'); if (pf !== null) APP_CONFIG.PRINT_FOOTER_TEXT = pf; } catch (e) {}

    (function () {
        var orig = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            try { return orig.call(this, k, v); }
            catch (e) {
                try { w.alert('⚠️ ڈیٹا محفوظ نہیں ہو سکا! براؤزر کی اسٹوریج بھر چکی ہے۔ پہلے بیک اپ ڈاؤن لوڈ کریں۔\nData NOT saved: browser storage is full. Download a backup first.'); } catch (e2) {}
                throw e;
            }
        };
    })();

    function esc(s) {
        return String(s === null || s === undefined ? '' : s).replace(/[&<>"'`]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c];
        });
    }
    function norm(s) { return String(s === null || s === undefined ? '' : s).trim().toLowerCase(); }
    function sameName(a, b) { return norm(a) === norm(b); }
    function readJSON(key, fallback, store) {
        try {
            var raw = (store || localStorage).getItem(key);
            if (raw === null || raw === undefined) return fallback;
            var v = JSON.parse(raw);
            return (v === null || v === undefined) ? fallback : v;
        } catch (e) { return fallback; }
    }
    function readArray(key) {
        var v = readJSON(key, []);
        if (!Array.isArray(v)) return [];
        if (/_customer_list$/.test(key)) return v.filter(function (x) { return (typeof x === 'string' && x.trim() !== '') || typeof x === 'number'; }).map(String);
        if (/_(customer_details|bnam_records|audit_log|deleted_entries)$/.test(key)) return v.filter(function (x) { return x && typeof x === 'object' && !Array.isArray(x); });
        return v;
    }
    function readObject(key) { var v = readJSON(key, {}); return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function pad2(n) { return String(n).padStart(2, '0'); }
    function localDate() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
    function toISODate(s) {
        s = String(s || '').trim();
        var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
        m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return m[3] + '-' + pad2(m[2]) + '-' + pad2(m[1]);
        return '';
    }
    function fmtDMY(s) {
        var iso = toISODate(s); if (!iso) return s || '-';
        var p = iso.split('-'), f = '';
        try { f = localStorage.getItem('rohan_date_format'); } catch (e) {}
        return f === 'ymd' ? p[0] + '-' + p[1] + '-' + p[2] : (f === 'mdy' ? p[1] + '/' + p[2] + '/' + p[0] : p[2] + '/' + p[1] + '/' + p[0]);
    }
    function num(v) { var n = parseFloat(String(v === null || v === undefined ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }

    function toast(msg, ms) {
        try {
            var t = document.createElement('div');
            t.textContent = (window.App && App.i18n && App.i18n.text) ? App.i18n.text(msg) : msg;
            t.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#7f1d1d;color:#fff;padding:10px 16px;border-radius:8px;font:bold 13px Arial;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,.5);max-width:90%;text-align:center';
            (document.body || document.documentElement).appendChild(t);
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 4000);
        } catch (e) {}
    }

    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var isIndex = (path === '' || path === 'index.html' || path === 'password_key_maker.html');
    var isBranches = (path === 'branches.html' || path === 'all_branches.html' || path === 'size_settings.html');

    function sessionActive() { try { return sessionStorage.getItem('rohan_session_active') === 'true'; } catch (e) { return false; } }
    function getRole() { try { return sessionStorage.getItem('rohan_user_role') || 'owner'; } catch (e) { return 'owner'; } }
    function getBranchId() { try { return sessionStorage.getItem('active_branch_id') || ''; } catch (e) { return ''; } }
    function allowedBranchIds() { try { if (getRole() === 'admin') return null; var v = JSON.parse(sessionStorage.getItem('rohan_user_branches') || '"*"'); return Array.isArray(v) ? v : null; } catch (e) { return null; } }
    function canSeeBranch(id) { var a = allowedBranchIds(); return !a || a.indexOf(id) >= 0; }
    function keysFor(bid) {
        return {
            customers: bid + '_customer_list',
            details: bid + '_customer_details',
            deleted: bid + '_deleted_customers',
            records: bid + '_bnam_records',
            settings: 'rohan_branch_master_settings_' + bid
        };
    }

    if (!isIndex) {
        if (!sessionActive()) {
            try { document.documentElement.style.display = 'none'; } catch (e) {}
            location.replace('./index.html');
            throw new Error('not-logged-in');
        }
        if (!isBranches && getBranchId() && !canSeeBranch(getBranchId())) {
            try { document.documentElement.style.display = 'none'; sessionStorage.removeItem('active_branch_id'); } catch (e) {}
            location.replace('./branches.html');
            throw new Error('branch-not-allowed');
        }
        if (!isBranches && !getBranchId()) {
            try { document.documentElement.style.display = 'none'; } catch (e) {}
            location.replace('./branches.html');
            throw new Error('no-branch');
        }
    }
    w.addEventListener('pageshow', function (e) {
        if (e.persisted && !isIndex && !sessionActive()) location.replace('./index.html');
    });

    var OWNER_DEFAULTS = {
        btnJamaEntry: false, btnBnamEntry: false, btnAddCustomer: false, lblBtnJournal: true, lblBtnSummary: true,
        lblBtnDeleted: true, btnAging: true, btnDelEntries: true, btnAudit: true, allBranches: true, printing: true,
        editEntries: false, editCustomer: false, deleteAccount: false, penTool: false, restoreEntries: false
    };
    function ownerPerms() {
        var s = readObject('rohan_owner_perms'), out = {};
        Object.keys(OWNER_DEFAULTS).forEach(function (k) { out[k] = typeof s[k] === 'boolean' ? s[k] : OWNER_DEFAULTS[k]; });
        return out;
    }
    function ownerCan(key) { return getRole() !== 'owner' || ownerPerms()[key] === true; }

    function blockOwner(isEn, msgUr, msgEn, target, key) {
        if (getRole() !== 'owner' || (key && ownerCan(key))) return;
        try { document.documentElement.style.display = 'none'; } catch (e) {}
        try { w.alert(isEn ? msgEn : msgUr); } catch (e) {}
        location.replace(target);
        throw new Error('owner-blocked');
    }

    function guardOwner(key, target) {
        if (ownerCan(key)) return;
        var bid = getBranchId(), lang = '';
        try { lang = sessionStorage.getItem('active_branch_lang') || readObject('rohan_branch_lang_overrides')[bid] || localStorage.getItem('rohan_global_lang') || 'ur'; } catch (e) {}
        blockOwner(lang === 'en', '⚠️ آپ کو اس صفحے کی اجازت نہیں ہے!', '⚠️ You are not authorized to open this page!', target, key);
    }

    (function () {
        if (!ownerCan('printing')) {
            var st = document.createElement('style');
            st.textContent = '@media print { body { display: none !important; } } #btnLedgerPrint, #btnPrintSummary, #btnPrintJournal, #btnOut { display: none !important; }';
            document.head.appendChild(st);
        }
    })();

    (function () {
        var standalone = (w.navigator && w.navigator.standalone) ||
            (w.matchMedia && w.matchMedia('(display-mode: standalone)').matches);
        if (!standalone) return;
        document.addEventListener('click', function (e) {
            if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            var t = e.target;
            while (t && t.nodeName !== 'A' && t.nodeName !== 'HTML') t = t.parentNode;
            if (t && t.nodeName === 'A') {
                var href = t.getAttribute('href');
                if (href && !/^(https?:|javascript:|mailto:|tel:)/i.test(href) && href !== '#') {
                    e.preventDefault();
                    w.location.href = href;
                }
            }
        }, true);
    })();

    var DEFAULT_BRANCHES = [
        { id: 'branch_1', num: 1, ur: 'ڈرائی فروٹ ہاؤس', en: 'Dry Fruit House', owner: '', icon: '📦', color1: '#b78a82', color2: '#3d0f05', text: '#efebe9' },
        { id: 'branch_2', num: 2, ur: 'تانبا فیکٹری', en: 'Copper Factory', owner: '', icon: '⚡', color1: '#dc7c5b', color2: '#461a10', text: '#fbe9e7' },
        { id: 'branch_3', num: 3, ur: 'سلور برانچ', en: 'Silver Branch', owner: '', icon: '⛓️', color1: '#8ea2ac', color2: '#0e3833', text: '#cfd8dc' },
        { id: 'branch_4', num: 4, ur: 'پیتل برانچ', en: 'Brass Branch', owner: '', icon: '🏺', color1: '#c7c07d', color2: '#302509', text: '#d7ccc8' },
        { id: 'branch_5', num: 5, ur: 'سکریپ گودام', en: 'Scrap Warehouse', owner: '', icon: '🏪', color1: '#607fad', color2: '#0d1f3d', text: '#e3f2fd' },
        { id: 'branch_6', num: 6, ur: 'دوبی برانچ', en: 'Dubai Branch', owner: '', icon: '🏭', color1: '#60988f', color2: '#2e4340', text: '#e0f2f1' },
        { id: 'branch_7', num: 7, ur: 'سلور بھٹی', en: 'Silver Furnace', owner: '', icon: '🏢', color1: '#927fa9', color2: '#1f053d', text: '#f3e5f5' },
        { id: 'branch_8', num: 8, ur: 'برانچ نمبر 8', en: 'Branch No. 8', owner: '', icon: '🏢', color1: '#755c69', color2: '#490c26', text: '#fce4ec' },
        { id: 'branch_9', num: 9, ur: 'برانچ نمبر 9', en: 'Branch No. 9', owner: '', icon: '🏢', color1: '#323a32', color2: '#0a4516', text: '#e8f5e9' },
        { id: 'branch_10', num: 10, ur: 'برانچ نمبر 10', en: 'Branch No. 10', owner: '', icon: '🏢', color1: '#cca86d', color2: '#0a2841', text: '#e1f5fe' },
        { id: 'branch_11', num: 11, ur: 'برانچ نمبر 11', en: 'Branch No. 11', owner: '', icon: '🏢', color1: '#b49585', color2: '#47200d', text: '#fff3e0' },
        { id: 'branch_12', num: 12, ur: 'برانچ نمبر 12', en: 'Branch No. 12', owner: '', icon: '🏢', color1: '#2e3b4e', color2: '#112948', text: '#eceff1' },
        { id: 'branch_13', num: 13, ur: 'برانچ نمبر 13', en: 'Branch No. 13', owner: '', icon: '🏢', color1: '#921b3f', color2: '#120743', text: '#ede7f6' },
        { id: 'branch_14', num: 14, ur: 'برانچ نمبر 14', en: 'Branch No. 14', owner: '', icon: '🏢', color1: '#424242', color2: '#410a0a', text: '#f5f5f5' },
        { id: 'branch_15', num: 15, ur: 'برانچ نمبر 15', en: 'Branch No. 15', owner: '', icon: '🏢', color1: '#8085b8', color2: '#0d1450', text: '#e8eaf6' },
        { id: 'branch_16', num: 16, ur: 'برانچ نمبر 16', en: 'Branch No. 16', owner: '', icon: '🏢', color1: '#bbccb5', color2: '#142d07', text: '#f1f8e9' },
        { id: 'branch_17', num: 17, ur: 'برانچ نمبر 17', en: 'Branch No. 17', owner: '', icon: '🏢', color1: '#5c3a21', color2: '#27180c', text: '#f5f5f5' },
        { id: 'branch_18', num: 18, ur: 'برانچ نمبر 18', en: 'Branch No. 18', owner: '', icon: '🏢', color1: '#b1a87a', color2: '#3a3204', text: '#fffde7' },
        { id: 'branch_19', num: 19, ur: 'برانچ نمبر 19', en: 'Branch No. 19', owner: '', icon: '🏢', color1: '#a981aa', color2: '#41092f', text: '#e0f7fa' },
        { id: 'branch_20', num: 20, ur: 'برانچ نمبر 20', en: 'Branch No. 20', owner: '', icon: '🏢', color1: '#cd608f', color2: '#34081c', text: '#fce4ec' }
    ];
    function getBranches() {
        var saved = readJSON('rohan_branches_custom_config_v2', []);
        if (!Array.isArray(saved)) saved = [];
        var byId = {};
        saved.forEach(function (b) { if (b && b.id) byId[b.id] = b; });
        var out = DEFAULT_BRANCHES.map(function (d) {
            var s = byId[d.id] || {};
            var m = {};
            Object.keys(d).forEach(function (k) { m[k] = (s[k] !== undefined && s[k] !== null && s[k] !== '') ? s[k] : d[k]; });
            m.owner = (s.owner !== undefined && s.owner !== null) ? s.owner : d.owner;
            delete byId[d.id];
            return m;
        });
        Object.keys(byId).forEach(function (id) { out.push(byId[id]); });
        return out;
    }

    function visibleBranches() { return getBranches().filter(function (b) { return canSeeBranch(b.id); }); }

    function defaultSettings() {
        return {
            maundUnit: '37.324', rateThreshold: 25000, enablePercent: false, percentVal: 0, percentMode: 'deduct',
            cols: {
                pcs: { visible: true, name: 'پیس' }, weight: { visible: true, name: 'وزن' }, rate: { visible: true, name: 'ریٹ' },
                amount: { name: 'کل رقم' }, extra: { visible: false, name: 'اضافی کالم' }
            },
            summaryBoxPos: 'bottom', ledgerBoxPos: 'bottom', dueDays: 30, oldEntryDays: 3,
            currency: '', summarySort: 'added', hideZero: false, confirmSave: false, dupWarn: true,
            entryDate: 'today', requireDetails: false, futureWarn: true, maxAmountWarn: 0, defaultCreditLimit: 0,
            ledgerPeriod: 'all', ageBanner: true, summarySubInfo: true, summaryToday: false, agingStep: 30, hiddenBtns: [],
            creditWarn: true, compactNums: false,
            openingInTotals: true, recycleDays: 0
        };
    }
    function loadSettings(bid) {
        var d = defaultSettings();
        var s = readObject(keysFor(bid).settings);
        var out = {};
        Object.keys(d).forEach(function (k) { out[k] = (k === 'cols') ? {} : (s[k] !== undefined && s[k] !== null ? s[k] : d[k]); });
        var sc = (s.cols && typeof s.cols === 'object') ? s.cols : {};
        ['pcs', 'weight', 'rate', 'amount', 'extra'].forEach(function (k) {
            var c = (sc[k] && typeof sc[k] === 'object') ? sc[k] : {};
            out.cols[k] = {};
            Object.keys(d.cols[k]).forEach(function (f) { out.cols[k][f] = (c[f] !== undefined && c[f] !== null) ? c[f] : d.cols[k][f]; });
        });
        if (!out.cols.details) out.cols.details = {};
        var en = settingsLangIsEn(bid);
        ['pcs', 'weight', 'rate', 'amount', 'extra'].forEach(function (k) {
            var n = out.cols[k].name, pair = COL_DEFAULTS[k];
            if (en && pair.ur.indexOf(n) >= 0) out.cols[k].name = pair.en;
            else if (!en && n === pair.en) out.cols[k].name = pair.ur[0];
        });
        return out;
    }
    var COL_DEFAULTS = {
        pcs: { ur: ['پیس', 'پیس / کارٹن', 'پیس/کارٹن'], en: 'Pcs' }, weight: { ur: ['وزن'], en: 'Weight' }, rate: { ur: ['ریٹ'], en: 'Rate' },
        amount: { ur: ['کل رقم'], en: 'Total Amount' }, extra: { ur: ['اضافی کالم'], en: 'Extra Field' }
    };
    function settingsLangIsEn(bid) {
        try {
            if (bid === getBranchId() && sessionStorage.getItem('active_branch_lang')) return sessionStorage.getItem('active_branch_lang') === 'en';
            return (readObject('rohan_branch_lang_overrides')[bid] || localStorage.getItem('rohan_global_lang') || 'ur') === 'en';
        } catch (e) { return false; }
    }

    function calcTotal(o) {
        var s = o.settings || {};
        var pcs = num(o.pcs), weight = num(o.weight), rate = num(o.rate);
        var unit = parseFloat(o.unit) || parseFloat(s.maundUnit) || 37.324;
        var thRaw = parseFloat(s.rateThreshold);
        var th = isNaN(thRaw) ? 25000 : thRaw;
        var mode = o.mode || 'auto';
        var res = { total: 0, mode: '', unit: unit, percent: 0 };
        if (rate > 0) {
            if (weight > 0) {
                var m = (mode === 'auto') ? (rate >= th ? 'maund' : 'unit') : mode;
                res.mode = m;
                res.total = (m === 'maund') ? (weight / unit) * rate : weight * rate;
            } else if (pcs > 0) {
                res.mode = 'pcs';
                res.total = pcs * rate;
            }
            var pv = parseFloat(o.percentVal !== undefined ? o.percentVal : s.percentVal) || 0;
            var enabled = (o.percentVal !== undefined) ? true : !!s.enablePercent;
            var pm = o.percentMode || s.percentMode;
            if (enabled && pv > 0 && res.total > 0) {
                var p = (res.total * pv) / 100;
                if (pm === 'add') { res.total += p; res.percent = pv; } else { res.total -= p; res.percent = -pv; }
            }
        }
        res.total = Math.round(res.total);
        return res;
    }

    function migrateBranch(bid) {
        if (!bid) return;
        var k = keysFor(bid);
        var details = readArray(k.details).filter(function (d) { return d && typeof d === 'object' && d.name; });
        var changedD = false;
        details.forEach(function (d) { if (!d.id) { d.id = uid(); changedD = true; } });
        if (changedD || details.length !== readArray(k.details).length) store.set(k.details, JSON.stringify(details));
        var idByName = {};
        details.forEach(function (d) { idByName[norm(d.name)] = d.id; });

        var recs = readArray(k.records);
        var changedR = false;
        recs.forEach(function (r) {
            if (!r || typeof r !== 'object') return;
            if (!r.id) { r.id = uid(); changedR = true; }
            ['pcs', 'weight', 'totalAmount'].forEach(function (f) {
                if (typeof r[f] !== 'number') { r[f] = num(r[f]); changedR = true; }
            });
            if (!r.customerId && r.customerName && idByName[norm(r.customerName)]) { r.customerId = idByName[norm(r.customerName)]; changedR = true; }
            if (!r.createdAt) { r.createdAt = ''; }
        });
        if (changedR) store.set(k.records, JSON.stringify(recs));
        try { store.remove('factory_customers'); } catch (e) {}
    }

    function getDeletionMap(bid) {
        var map = {};
        readArray(keysFor(bid).deleted).forEach(function (d) {
            var name = (d && typeof d === 'object') ? d.name : d;
            if (!name) return;
            map[norm(name)] = (d && typeof d === 'object') ? toISODate(d.date) : '';
        });
        return map;
    }
    function liveOn(name, iso, activeSet, delMap) {
        var n = norm(name);
        if (activeSet[n]) return true;
        if (Object.prototype.hasOwnProperty.call(delMap, n)) {
            var dd = delMap[n];
            return !!(dd && iso && iso <= dd);
        }
        return false;
    }
    function activeNameSet(bid) {
        var set = {};
        readArray(keysFor(bid).customers).forEach(function (n) { set[norm(n)] = true; });
        return set;
    }

    function archiveDeletedSameName(bid, name, isEn) {
        var k = keysFor(bid);
        var deleted = readArray(k.deleted);
        var match = deleted.filter(function (d) { return sameName((d && typeof d === 'object') ? d.name : d, name); });
        if (!match.length) return;
        var suffix = Date.now().toString().slice(-4);
        var archived = isEn ? (name + ' (Archived #' + suffix + ')') : (name + ' (ختم شدہ #' + suffix + ')');
        deleted.forEach(function (d, i) {
            var dn = (d && typeof d === 'object') ? d.name : d;
            if (sameName(dn, name)) { if (d && typeof d === 'object') d.name = archived; else deleted[i] = archived; }
        });
        store.set(k.deleted, JSON.stringify(deleted));
        var recs = readArray(k.records);
        recs.forEach(function (r) { if (r && sameName(r.customerName, name)) r.customerName = archived; });
        store.set(k.records, JSON.stringify(recs));
        var det = readArray(k.details);
        det.forEach(function (c) { if (c && sameName(c.name, name)) c.name = archived; });
        store.set(k.details, JSON.stringify(det));
    }

    function normalizePhone(raw) {
        var d = String(raw || '').replace(/[^0-9]/g, '');
        if (!d) return '';
        if (d.indexOf('00') === 0) return d.slice(2);
        if (d.indexOf('92') === 0 && d.length >= 12) return d;
        if (d.indexOf('971') === 0 && d.length >= 12) return d;
        if (d.length === 11 && d.indexOf('03') === 0) return '92' + d.slice(1);
        if (d.length === 10 && d.charAt(0) === '3') return '92' + d;
        if (d.length === 10 && d.indexOf('05') === 0) return '971' + d.slice(1);
        if (d.length === 9 && d.charAt(0) === '5') return '971' + d;
        return d;
    }
    function openExternal(url) { return w.open(url, '_blank', 'noopener,noreferrer'); }

    // ---------- Server access ----------
    // One place for every HTTP call. Returns { ok, status, data } and never throws.
    function request(method, urlPath, body) {
        if (!APP_CONFIG.API_BASE) return Promise.resolve({ ok: false, status: 0, data: null, offline: true });
        var headers = { 'Content-Type': 'application/json' };
        try { var tk = sessionStorage.getItem('api_token'); if (tk) headers['Authorization'] = 'Bearer ' + tk; } catch (e) {}
        return fetch(APP_CONFIG.API_BASE.replace(/\/$/, '') + urlPath, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) })
            .then(function (r) {
                return r.json().catch(function () { return null; }).then(function (data) {
                    if (r.status === 401 && sessionActive()) sessionExpired();
                    return { ok: r.ok, status: r.status, data: data };
                });
            }, function () { return { ok: false, status: 0, data: null }; });
    }
    function sessionExpired() {
        try { sessionStorage.clear(); } catch (e) {}
        if (!isIndex) w.location.replace('./index.html');
    }
    var apiWarned = 0;
    function api(method, urlPath, body) {
        if (!APP_CONFIG.API_BASE) return Promise.resolve(null);
        return request(method, urlPath, body).then(function (r) {
            if (r.ok) return r.data || {};
            if (Date.now() - apiWarned > 15000) { apiWarned = Date.now(); toast('⚠️ سرور سے رابطہ نہیں ہوا — ڈیٹا صرف اس براؤزر میں محفوظ ہے / Server not reachable, saved locally only'); }
            return null;
        });
    }

    // ---------- Central data store ----------
    // Every page reads/writes app data through App.store. Without API_BASE it is plain localStorage.
    // With API_BASE every write of a synced key is queued (outbox) and pushed to the server:
    //   PUT /api/kv/<key> {value, version} · DELETE /api/kv/<key> · GET /api/kv (pull). See API_CONTRACT.md.
    var LOCAL_ONLY = /^(rohan_(theme_mode|global_lang|font_scale|table_density|reduce_motion|card_badge|card_status|branch_cols|tbl_head_size|tbl_head_font|tbl_acc_size|tbl_acc_font|tbl_text_size|tbl_text_font|tbl_num_size|tbl_num_font|tbl_row_h|tbl_col_w|sz_[a-z]+_[a-z]+_[sfbhw]|pl_[a-z]+|logout_confirm|voice_fix|voice_pos|voice_eng|users_v1|outbox|sync_versions|sync_conflicts)|.*_audit_seen)$/;
    var SYNC_META = /^rohan_(outbox|sync_versions|sync_conflicts)$/;
    var flushing = false, flushTimer = 0, retryMs = 2000;
    function rawGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function rawObj(k) { try { var v = JSON.parse(rawGet(k)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; } }
    function rawPut(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
    function isSynced(key) { return !LOCAL_ONLY.test(key); }
    function markDirty(key) {
        if (!APP_CONFIG.API_BASE || !isSynced(key)) return;
        var ob = rawObj('rohan_outbox'); ob[key] = Date.now(); rawPut('rohan_outbox', ob);
        scheduleFlush(800);
    }
    function scheduleFlush(ms) {
        if (!APP_CONFIG.API_BASE) return;
        clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms);
    }
    function flush() {
        if (flushing || !APP_CONFIG.API_BASE || !sessionActive()) return Promise.resolve();
        var ob = rawObj('rohan_outbox'), keys = Object.keys(ob), vers = rawObj('rohan_sync_versions'), conf = rawObj('rohan_sync_conflicts');
        keys = keys.filter(function (k) { return !conf[k]; });
        if (!keys.length) return Promise.resolve();
        flushing = true;
        var i = 0, failed = false;
        function next() {
            if (i >= keys.length || failed) return Promise.resolve();
            var key = keys[i++], val = rawGet(key), at = rawObj('rohan_outbox')[key], path = '/api/kv/' + encodeURIComponent(key);
            var p = val === null ? request('DELETE', path, { version: vers[key] || 0 }) : request('PUT', path, { value: val, version: vers[key] || 0 });
            return p.then(function (r) {
                if (r.ok) {
                    var cur = rawObj('rohan_outbox');
                    if (cur[key] === at) delete cur[key];
                    rawPut('rohan_outbox', cur);
                    if (r.data && r.data.version !== undefined) { vers[key] = r.data.version; rawPut('rohan_sync_versions', vers); }
                    retryMs = 2000;
                } else if (r.status === 409) {
                    conf[key] = Date.now(); rawPut('rohan_sync_conflicts', conf);
                    toast('⚠️ سرور پر نیا ڈیٹا موجود ہے، ہم آہنگی رکی ہے / Sync conflict on server data');
                } else if (r.status === 400 || r.status === 403 || r.status === 413 || r.status === 422) {
                    var c2 = rawObj('rohan_outbox'); delete c2[key]; rawPut('rohan_outbox', c2);
                    console.warn('server rejected', key, r.status);
                } else { failed = true; }
                return next();
            });
        }
        return next().then(function () {
            flushing = false;
            if (failed) { retryMs = Math.min(60000, retryMs * 2); scheduleFlush(retryMs); }
        });
    }
    function pull() {
        if (!APP_CONFIG.API_BASE) return Promise.resolve(0);
        return request('GET', '/api/kv').then(function (r) {
            if (!r.ok || !r.data || typeof r.data.items !== 'object' || !r.data.items) return 0;
            var ob = rawObj('rohan_outbox'), vers = rawObj('rohan_sync_versions'), n = 0;
            Object.keys(r.data.items).forEach(function (k) {
                var it = r.data.items[k];
                if (!isSynced(k) || ob[k] || !it || typeof it.value !== 'string') return;
                if (rawGet(k) !== it.value) { try { localStorage.setItem(k, it.value); n++; } catch (e) {} }
                vers[k] = it.version || 0;
            });
            rawPut('rohan_sync_versions', vers);
            return n;
        });
    }
    var store = {
        get: function (key) { return rawGet(key); },
        set: function (key, value) { localStorage.setItem(key, String(value)); markDirty(key); },
        remove: function (key) { localStorage.removeItem(key); markDirty(key); },
        isSynced: isSynced, pull: pull, flush: flush,
        pending: function () { return Object.keys(rawObj('rohan_outbox')).length; },
        conflicts: function () { return Object.keys(rawObj('rohan_sync_conflicts')); },
        // Resolve a conflict: 'local' = overwrite the server copy with this browser's, 'server' = take the server copy.
        resolve: function (key, keep) {
            return request('GET', '/api/kv/' + encodeURIComponent(key)).then(function (r) {
                var conf = rawObj('rohan_sync_conflicts'), vers = rawObj('rohan_sync_versions'), ob = rawObj('rohan_outbox');
                if (r.ok && r.data) {
                    vers[key] = r.data.version || 0; rawPut('rohan_sync_versions', vers);
                    if (keep === 'server' && typeof r.data.value === 'string') { try { localStorage.setItem(key, r.data.value); } catch (e) {} delete ob[key]; rawPut('rohan_outbox', ob); }
                    else { ob[key] = Date.now(); rawPut('rohan_outbox', ob); }
                } else if (r.status === 404) { vers[key] = 0; rawPut('rohan_sync_versions', vers); }
                else return false;
                delete conf[key]; rawPut('rohan_sync_conflicts', conf); scheduleFlush(100);
                return true;
            });
        }
    };
    if (APP_CONFIG.API_BASE) {
        w.addEventListener('online', function () { scheduleFlush(300); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
        setTimeout(function () { scheduleFlush(500); }, 1500);
    }

    // ---------- Login ----------
    // Server mode: POST /api/login {username, password} -> {token, role}.  Local mode: salted PBKDF2 against localUsers.
    var auth = {
        login: function (username, password, localUsers) {
            if (APP_CONFIG.API_BASE) {
                return request('POST', '/api/login', { username: username, password: password }).then(function (r) {
                    if (r.ok && r.data && r.data.token && (r.data.role === 'admin' || r.data.role === 'owner')) return { ok: true, role: r.data.role, token: r.data.token, user: username, branches: Array.isArray(r.data.branches) ? r.data.branches : '*' };
                    return { ok: false, network: r.status === 0, locked: r.status === 429 };
                });
            }
            var custom = readJSON('rohan_users_v1', {}), has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
            if (!custom || typeof custom !== 'object' || Array.isArray(custom)) custom = {};
            var merge = function (n) { return has(localUsers, n) || has(custom, n) ? Object.assign({}, has(localUsers, n) ? localUsers[n] : {}, has(custom, n) ? custom[n] : {}) : null; };
            var u = merge(username), ref = u && u.salt && u.hash ? u : merge('admin');
            return w.App.pbkdf2Hex(username + ':' + password, ref.salt, ref.iter).then(function (h) {
                var okUser = u && u.hash && !u.disabled && (u.role === 'admin' || u.role === 'owner') && h === u.hash;
                return okUser ? { ok: true, role: u.role, user: username, branches: Array.isArray(u.branches) ? u.branches : '*' } : { ok: false };
            });
        },
        start: function (res) {
            sessionStorage.setItem('rohan_session_active', 'true');
            sessionStorage.setItem('rohan_user_role', res.role);
            sessionStorage.setItem('rohan_last_activity', String(Date.now()));
            sessionStorage.setItem('rohan_user_name', res.user || '');
            sessionStorage.setItem('rohan_user_branches', JSON.stringify(Array.isArray(res.branches) ? res.branches : '*'));
            if (res.token) sessionStorage.setItem('api_token', res.token);
        },
        logout: function () {
            var p = APP_CONFIG.API_BASE ? flush().then(function () { return request('POST', '/api/logout', {}); }) : Promise.resolve();
            return p;
        }
    };

    function exportBackup() {
        var data = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (SYNC_META.test(key)) continue;
            data[key] = localStorage.getItem(key);
        }
        var payload = { app: 'unit-business-group', version: 2, exportedAt: new Date().toISOString(), data: data };
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'backup_' + localDate() + '.json';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function importBackup(file, done) {
        var fr = new FileReader();
        fr.onload = function () {
            try {
                var p = JSON.parse(fr.result);
                if (!p || p.app !== 'unit-business-group' || !p.data || typeof p.data !== 'object') throw new Error('bad file');
                Object.keys(p.data).forEach(function (k) { if (typeof p.data[k] === 'string' && !SYNC_META.test(k)) store.set(k, p.data[k]); });
                done(true);
            } catch (e) { done(false); }
        };
        fr.onerror = function () { done(false); };
        fr.readAsText(file);
    }

    function hasChart() { return typeof w.Chart !== 'undefined'; }

    // Voice "my words": [{ w: written Urdu text, s: optional spoken form }]. A synced key (rohan_voice_words).
    var voiceWords = {
        key: 'rohan_voice_words',
        load: function () {
            return readArray(this.key).filter(function (x) { return x && typeof x.w === 'string' && x.w.trim(); })
                .map(function (x) { return { w: x.w.trim(), s: typeof x.s === 'string' ? x.s.trim() : '' }; });
        },
        save: function (list) {
            try { store.set(this.key, JSON.stringify(list)); } catch (e) { return false; }
            return true;
        }
    };

    w.App = {
        esc: esc, norm: norm, sameName: sameName, readJSON: readJSON, readArray: readArray, readObject: readObject,
        uid: uid, localDate: localDate, toISODate: toISODate, fmtDMY: fmtDMY, num: num, toast: toast,
        sessionActive: sessionActive, getRole: getRole, getBranchId: getBranchId, keysFor: keysFor, blockOwner: blockOwner, guardOwner: guardOwner, ownerPerms: ownerPerms, ownerCan: ownerCan,
        DEFAULT_BRANCHES: DEFAULT_BRANCHES, getBranches: getBranches, visibleBranches: visibleBranches, canSeeBranch: canSeeBranch, allowedBranchIds: allowedBranchIds,
        loadSettings: loadSettings, calcTotal: calcTotal, migrateBranch: migrateBranch,
        getDeletionMap: getDeletionMap, liveOn: liveOn, activeNameSet: activeNameSet,
        archiveDeletedSameName: archiveDeletedSameName, normalizePhone: normalizePhone, openExternal: openExternal,
        api: api, request: request, store: store, auth: auth, voiceWords: voiceWords, exportBackup: exportBackup, importBackup: importBackup, hasChart: hasChart
    };

    try { if (!isIndex && getBranchId()) migrateBranch(getBranchId()); } catch (e) { console.warn('migration', e); }

    try {
        var css =
        '@media screen {' +
        'html body .btn-print, html body .btn-back, html body .btn-top-back, html body .btn-header, html body .btn-logout, html body .btn-lang-settings, html body .btn-chart-settings, html body .btn-theme-toggle, html body .btn-dash-print, html body #btnOut, html body #btnBack {' +
        ' box-sizing:border-box !important; height:44px !important; min-width:0 !important; width:120px !important; max-width:120px !important; flex:0 0 120px !important; padding:0 6px !important; font-size:15px !important; font-weight:800 !important; margin-top:0 !important; margin-bottom:0 !important; line-height:1 !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; justify-content:center !important; white-space:nowrap !important; text-decoration:none !important; }' +
        'html body .btn-save, html body .btn-submit, html body .btn-login, html body .btn-delete-entry, html body .btn-delete-account, html body .btn-restore-account, html body .btn-modal-save, html body .btn-modal-close {' +
        ' box-sizing:border-box !important; min-height:44px !important; font-size:15px !important; font-weight:bold !important; border-radius:8px !important; }' +
        '.shared-scroll-wrapper { scrollbar-width: thin; }' +
        '.shared-scroll-wrapper::-webkit-scrollbar { height:4px; width:4px; }' +
        '.shared-scroll-wrapper::-webkit-scrollbar-thumb { background:#666; border-radius:4px; }' +
        '.footer-summary, .summary-box { overflow:visible !important; }' +
        '}' +
        '@media screen and (max-width:600px) {' +
        'html body .btn-print, html body .btn-back, html body .btn-top-back, html body .btn-header, html body .btn-logout, html body .btn-lang-settings, html body .btn-chart-settings, html body .btn-theme-toggle, html body .btn-dash-print, html body #btnOut, html body #btnBack {' +
        ' height:38px !important; width:96px !important; max-width:96px !important; flex:0 0 96px !important; padding:0 4px !important; font-size:13px !important; font-weight:800 !important; }' +
        'html body .btn-save, html body .btn-submit, html body .btn-login, html body .btn-delete-entry, html body .btn-delete-account, html body .btn-restore-account, html body .btn-modal-save, html body .btn-modal-close { min-height:40px !important; font-size:14px !important; }' +
        '}' +
        '@media screen and (max-width:340px) {' +
        'html body .btn-print, html body .btn-back, html body .btn-top-back, html body .btn-header, html body .btn-logout, html body .btn-lang-settings, html body .btn-chart-settings, html body .btn-theme-toggle, html body .btn-dash-print, html body #btnOut, html body #btnBack {' +
        ' height:36px !important; width:80px !important; max-width:80px !important; flex:0 0 80px !important; font-size:12px !important; }' +
        '}';
        var addStyle = function () { var st = document.createElement('style'); st.id = 'appUnifiedUI'; st.textContent = css; document.head.appendChild(st); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addStyle); else addStyle();
    } catch (e) {}
})(window);

(function (w) {
    'use strict';
    var App = w.App; if (!App) return;
    App.printNow = w.__ubgPrintNow;

    // Thin page border in the active branch's colour (screen only) on every page except the fixed-colour jama/bnam sheets.
    (function () {
        var pg = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (/^(index|branches|jama_entry|bnam_entry)\.html$/.test(pg)) return;
        function apply() {
            try {
                var id = sessionStorage.getItem('active_branch_id'); if (!id) return;
                var br = (App.getBranches() || []).filter(function (b) { return b.id === id; })[0]; if (!br) return;
                var col = br.color1 || br.color || ''; if (!/^#[0-9a-f]{3,8}$/i.test(col)) return;
                var st = document.createElement('style'); st.id = 'ubg-branch-border';
                st.textContent = '@media screen{body>.form-container,body>.edit-container,body>.archive-container,body>.ledger-container,body>.container,body>.wrap,body>.chart-box,body>.dashboard-container>.chart-box,body>.dashboard-container>.dashboard{border:1.5px solid ' + col + '!important}}';
                document.head.appendChild(st);
            } catch (e) {}
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
    })();
    var APP_CONFIG = w.APP_CONFIG || {};
    var D = document;
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var isIndex = (path === '' || path === 'index.html' || path === 'password_key_maker.html');
    if (!APP_CONFIG.SESSION_TIMEOUT_MIN) APP_CONFIG.SESSION_TIMEOUT_MIN = 30;

    function isEnLang() {
        try {
            var bid = App.getBranchId(), ov = App.readObject('rohan_branch_lang_overrides');
            return (sessionStorage.getItem('active_branch_lang') || ov[bid] || localStorage.getItem('rohan_global_lang') || 'ur') === 'en';
        } catch (e) { return false; }
    }
    function T(isEn, ur, en) { return isEn ? en : ur; }
    function xk(bid) { return { audit: bid + '_audit_log', recycle: bid + '_deleted_entries', seq: bid + '_entry_seq', seen: bid + '_audit_seen' }; }
    function nowISO() { return new Date().toISOString(); }
    function todayISO() { return App.localDate(); }
    function save(key, val) { App.store.set(key, JSON.stringify(val)); }
    function fmtN(n) { return Number(n || 0).toLocaleString('en-US'); }
    function daysBetween(aISO, bISO) {
        var a = Date.parse(aISO + 'T00:00:00'), b = Date.parse(bISO + 'T00:00:00');
        if (isNaN(a) || isNaN(b)) return 0;
        return Math.round((b - a) / 86400000);
    }
    function amtOf(r) { return parseFloat(r && r.totalAmount) || 0; }
    function show(v) { return (v === undefined || v === null || v === '' || v === '-') ? '—' : String(v); }

    App.audit = function (bid, action, info) {
        try {
            var k = xk(bid).audit, list = App.readArray(k);
            var e = { id: App.uid(), ts: nowISO(), by: App.getRole(), action: action };
            Object.keys(info || {}).forEach(function (f) { e[f] = info[f]; });
            list.push(e);
            if (list.length > 2000) list = list.slice(list.length - 2000);
            save(k, list);
            return e;
        } catch (err) { console.warn('audit', err); return null; }
    };
    App.auditUnseen = function (bid) {
        var seen = localStorage.getItem(xk(bid).seen) || '';
        return App.readArray(xk(bid).audit).filter(function (e) { return e && !e.minor && e.ts > seen; }).length;
    };
    App.auditMarkSeen = function (bid) { try { App.store.set(xk(bid).seen, nowISO()); } catch (e) {} };

    App.recycleEntry = function (bid, rec, reason, extra) {
        var k = xk(bid).recycle, list = App.readArray(k);
        var item = { rid: App.uid(), deletedAt: nowISO(), deletedBy: App.getRole(), reason: reason || 'DELETE', rec: JSON.parse(JSON.stringify(rec)) };
        if (extra) Object.keys(extra).forEach(function (f) { item[f] = extra[f]; });
        list.push(item); save(k, list);
        return item;
    };
    // Permanently drops Recycle Bin items older than the branch setting "recycleDays" (0 = keep forever).
    App.purgeRecycle = function (bid) {
        var days = parseInt(App.loadSettings(bid).recycleDays, 10) || 0;
        if (days <= 0) return 0;
        var k = xk(bid).recycle, list = App.readArray(k), limit = Date.now() - days * 86400000;
        var keep = list.filter(function (x) { var t = x && Date.parse(x.deletedAt); return !(t && t < limit); });
        if (keep.length !== list.length) save(k, keep);
        return list.length - keep.length;
    };
    App.restoreEntry = function (bid, rid, opts) {
        var K = App.keysFor(bid), kk = xk(bid).recycle, list = App.readArray(kk);
        var i = list.findIndex(function (x) { return x && x.rid === rid; });
        if (i < 0) return { ok: false, code: 'NOT_FOUND' };
        var item = list[i], rec = item.rec;
        var customers = App.readArray(K.customers);
        var active = customers.some(function (c) { return App.sameName(c, rec.customerName); });
        if (!active) {
            var inDeleted = App.readArray(K.deleted).some(function (d) { return App.sameName((d && typeof d === 'object') ? d.name : d, rec.customerName); });
            if (inDeleted) return { ok: false, code: 'ACCOUNT_DELETED' };
            if (!(opts && opts.recreate)) return { ok: false, code: 'NO_CUSTOMER' };
            customers.push(rec.customerName); save(K.customers, customers);
            if (item.cust) {
                var det = App.readArray(K.details);
                if (!det.some(function (c) { return c && App.sameName(c.name, rec.customerName); })) { det.push(item.cust); save(K.details, det); }
            }
        }
        var recs = App.readArray(K.records);
        if (!recs.some(function (r) { return r && r.id === rec.id; })) recs.push(rec);
        save(K.records, recs);
        list.splice(i, 1); save(kk, list);
        App.audit(bid, 'RESTORE', { recordId: rec.id, no: rec.no, customer: rec.customerName, amount: amtOf(rec), type: rec.type, date: rec.date, rec: JSON.parse(JSON.stringify(rec)),
            summary: 'بحال / Restored #' + (rec.no || '-') + ' ' + rec.customerName + ' ' + fmtN(amtOf(rec)) });
        return { ok: true, rec: rec };
    };
    App.archiveAccount = function (bid, name) {
        var K = App.keysFor(bid), n = 0;
        var det = App.readArray(K.details).find(function (c) { return c && App.sameName(c.name, name); }) || null;
        App.readArray(K.records).forEach(function (r) {
            if (r && App.sameName(r.customerName, name)) { App.recycleEntry(bid, r, 'ACCOUNT_PERM_DELETE', { cust: det }); n++; }
        });
        App.audit(bid, 'ACCOUNT_PERM_DELETE', { customer: name, count: n, summary: 'کھاتہ مستقل ختم / Account permanently deleted: ' + name + ' (' + n + ' entries kept in recycle bin)' });
        return n;
    };

    App.nextSerial = function (bid) {
        var k = xk(bid).seq, cur = parseInt(localStorage.getItem(k), 10) || 0, max = 0;
        App.readArray(App.keysFor(bid).records).forEach(function (r) { if (r && r.no > max) max = r.no; });
        var n = Math.max(cur, max) + 1;
        App.store.set(k, String(n));
        return n;
    };
    function assignSerials(bid) {
        var K = App.keysFor(bid), recs = App.readArray(K.records);
        if (!recs.length) return;
        var missing = [], max = parseInt(localStorage.getItem(xk(bid).seq), 10) || 0;
        recs.forEach(function (r, i) {
            if (!r || typeof r !== 'object') return;
            if (typeof r.no === 'number' && r.no > 0) { if (r.no > max) max = r.no; } else missing.push(i);
        });
        if (!missing.length) return;
        missing.sort(function (a, b) {
            var da = (recs[a].date || '') + '|' + (recs[a].createdAt || ''), db = (recs[b].date || '') + '|' + (recs[b].createdAt || '');
            return da < db ? -1 : (da > db ? 1 : a - b);
        });
        missing.forEach(function (i) { max++; recs[i].no = max; });
        save(K.records, recs);
        App.store.set(xk(bid).seq, String(max));
    }

    function idNameMap(bid) {
        var m = {};
        App.readArray(App.keysFor(bid).details).forEach(function (c) { if (c && c.id && c.name) m[c.id] = c.name; });
        return m;
    }
    function recName(r, idMap) { return (r.customerId && idMap[r.customerId]) ? idMap[r.customerId] : r.customerName; }
    App.recordsByCustomer = function (bid) {
        var idMap = idNameMap(bid), out = {};
        App.readArray(App.keysFor(bid).records).forEach(function (r) {
            if (!r || !r.customerName) return;
            var n = App.norm(recName(r, idMap));
            (out[n] = out[n] || []).push(r);
        });
        return out;
    };
    App.balanceOf = function (list, asOfISO) {
        var b = 0;
        (list || []).forEach(function (r) {
            if (!r) return;
            if (asOfISO && !(r.date && r.date <= asOfISO)) return;
            b += (r.type === 'JAMA') ? amtOf(r) : -amtOf(r);
        });
        return b;
    };
    App.customerInfo = function (bid, name, id) {
        var det = App.readArray(App.keysFor(bid).details);
        return det.find(function (c) { return c && ((id && c.id === id) || App.sameName(c.name, name)); }) || null;
    };

    App.aging = function (list, asOfISO) {
        asOfISO = asOfISO || todayISO();
        var recs = (list || []).filter(function (r) { return r && r.date && r.date <= asOfISO; });
        var net = App.balanceOf(recs);
        if (Math.abs(net) < 0.5) return null;
        var jamaSide = net > 0;
        function ord(a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : ((a.no || 0) - (b.no || 0))); }
        var pool = recs.filter(function (r) { return (r.type === 'JAMA') === jamaSide; }).sort(ord);
        var opp = 0;
        recs.forEach(function (r) { if ((r.type === 'JAMA') !== jamaSide) opp += amtOf(r); });
        var items = [];
        pool.forEach(function (r) {
            var amt = amtOf(r), take = Math.min(amt, opp); opp -= take;
            var rem = amt - take;
            if (rem > 0.5) items.push({ date: r.date, amount: rem, days: daysBetween(r.date, asOfISO) });
        });
        if (!items.length) return null;
        return { side: jamaSide ? 'JAMA' : 'BNAM', net: net, oldestDate: items[0].date, days: items[0].days, items: items };
    };
    App.agingStep = function () { var v = parseInt(App.loadSettings(App.getBranchId()).agingStep, 10); return v > 0 ? v : 30; };
    App.agingBucket = function (days) { var s = App.agingStep(); return days <= s ? 0 : (days <= 2 * s ? 1 : (days <= 3 * s ? 2 : 3)); };
    App.dueDays = function (bid) { var v = parseInt(App.loadSettings(bid).dueDays, 10); return isNaN(v) ? 30 : Math.max(0, v); };
    App.creditLimitOf = function (bid, name, id) {
        var c = App.customerInfo(bid, name, id);
        var v = c ? parseFloat(c.creditLimit) : 0;
        return (v > 0) ? v : 0;
    };

    function creditWarn(bid, entry, isEn, excludeId) {
        if (entry.type === 'JAMA' || App.loadSettings(bid).creditWarn === false) return '';
        var lim = App.creditLimitOf(bid, entry.customerName, entry.customerId);
        if (!lim) return '';
        var list = (App.recordsByCustomer(bid)[App.norm(entry.customerName)] || []).filter(function (r) { return r.id !== excludeId; });
        var after = App.balanceOf(list) - amtOf(entry);
        if (after < 0 && -after > lim) {
            return T(isEn, '💳 کریڈٹ لمٹ (' + fmtN(lim) + ') سے بڑھ جائے گی۔ نیا بقایا بنام: ' + fmtN(-after),
                           '💳 Credit limit (' + fmtN(lim) + ') will be exceeded. New debit balance: ' + fmtN(-after));
        }
        return '';
    }
    App.entryWarnings = function (bid, entry, isEn) {
        var out = [];
        var st = App.loadSettings(bid);
        if (st.futureWarn !== false && entry.date && entry.date > todayISO()) out.push(T(isEn, '📅 تاریخ آج سے آگے کی ہے: ' + App.fmtDMY(entry.date), '📅 The date is in the future: ' + App.fmtDMY(entry.date)));
        if (st.maxAmountWarn > 0 && amtOf(entry) > st.maxAmountWarn) out.push(T(isEn, '💰 رقم مقررہ حد (' + fmtN(st.maxAmountWarn) + ') سے زیادہ ہے: ' + fmtN(amtOf(entry)), '💰 The amount exceeds the set limit (' + fmtN(st.maxAmountWarn) + '): ' + fmtN(amtOf(entry))));
        var amt = Math.round(amtOf(entry));
        var dup = st.dupWarn !== false && App.readArray(App.keysFor(bid).records).find(function (r) {
            return r && r.id !== entry.id && (r.type === 'JAMA') === (entry.type === 'JAMA') && r.date === entry.date &&
                   App.sameName(r.customerName, entry.customerName) && Math.round(amtOf(r)) === amt;
        });
        if (dup) out.push(T(isEn, '🔁 بالکل ایسی ہی انٹری (اسی گاہک، تاریخ، قسم اور رقم کی) پہلے سے موجود ہے' + (dup.no ? ' (#' + dup.no + ')' : ''),
                                  '🔁 An identical entry (same customer, date, type and amount) already exists' + (dup.no ? ' (#' + dup.no + ')' : '')));
        var cw = creditWarn(bid, entry, isEn, entry.id); if (cw) out.push(cw);
        return out;
    };
    App.confirmWarnings = function (list, isEn) {
        if (!list || !list.length) return true;
        return confirm('⚠️ ' + T(isEn, 'وارننگ', 'Warning') + ':\n\n' + list.join('\n\n') + '\n\n' + T(isEn, 'کیا پھر بھی انٹری محفوظ کریں؟', 'Do you still want to save this entry?'));
    };
    App.oldEntryInfo = function (bid, dateISO) {
        var lim = parseInt(App.loadSettings(bid).oldEntryDays, 10); if (isNaN(lim) || lim < 0) lim = 3;
        var d = daysBetween(dateISO, todayISO());
        return { days: d, limit: lim, old: !!dateISO && d > lim };
    };
    App.diffRecord = function (a, b, isEn) {
        var F = [['type', 'قسم', 'Type'], ['customerName', 'گاہک', 'Customer'], ['date', 'تاریخ', 'Date'], ['details', 'تفصیل', 'Details'],
                 ['pcs', 'پیس', 'Pcs'], ['weight', 'وزن', 'Weight'], ['rate', 'ریٹ', 'Rate'], ['totalAmount', 'رقم', 'Amount']];
        var out = [];
        F.forEach(function (f) {
            var x = a[f[0]], y = b[f[0]];
            if (f[0] === 'type') { x = (x === 'JAMA') ? 'JAMA' : 'BNAM'; y = (y === 'JAMA') ? 'JAMA' : 'BNAM'; }
            if (f[0] === 'details') { x = (x === '-' || x == null) ? '' : x; y = (y === '-' || y == null) ? '' : y; }
            if (['pcs', 'weight', 'rate', 'totalAmount'].indexOf(f[0]) >= 0) { x = (x === '-' || x == null || x === '') ? 0 : parseFloat(x) || 0; y = (y === '-' || y == null || y === '') ? 0 : parseFloat(y) || 0; }
            if (String(x == null ? '' : x) !== String(y == null ? '' : y)) {
                var sx = f[0] === 'date' ? App.fmtDMY(x) : show(x), sy = f[0] === 'date' ? App.fmtDMY(y) : show(y);
                if (f[0] === 'totalAmount') { sx = fmtN(x); sy = fmtN(y); }
                out.push('• ' + (isEn ? f[2] : f[1]) + ': ' + sx + '  ➜  ' + sy);
            }
        });
        return out;
    };
    App.editWarnings = function (bid, oldRec, newVals, isEn) {
        var lines = [], diff = App.diffRecord(oldRec, newVals, isEn);
        var oi = App.oldEntryInfo(bid, oldRec.date);
        if (oi.old) lines.push(T(isEn, '⏰ یہ انٹری ' + oi.days + ' دن پرانی ہے (' + App.fmtDMY(oldRec.date) + ') — پرانی انٹری بدلنے سے پرانا حساب بدل جاتا ہے!',
                                      '⏰ This entry is ' + oi.days + ' days old (' + App.fmtDMY(oldRec.date) + ') — changing it alters past accounts!'));
        if (newVals.date && newVals.date !== oldRec.date) {
            var ni = App.oldEntryInfo(bid, newVals.date);
            if (newVals.date > todayISO()) lines.push(T(isEn, '📅 نئی تاریخ آج سے آگے کی ہے', '📅 The new date is in the future'));
            else if (ni.old) lines.push(T(isEn, '📅 نئی تاریخ بھی ' + ni.days + ' دن پرانی ہے', '📅 The new date is also ' + ni.days + ' days old'));
        }
        var tmp = JSON.parse(JSON.stringify(newVals)); tmp.id = oldRec.id;
        var cw = creditWarn(bid, tmp, isEn, oldRec.id); if (cw) lines.push(cw);
        return { diff: diff, lines: lines, text: (lines.length ? '\n\n' + lines.join('\n\n') : '') + (diff.length ? '\n\n' + T(isEn, 'تبدیلیاں:', 'Changes:') + '\n' + diff.join('\n') : '') };
    };

    App.defaultEntryDate = function (bid) {
        if (App.loadSettings(bid).entryDate !== 'yesterday') return App.localDate();
        var d = new Date(); d.setDate(d.getDate() - 1);
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    };

    function sha256Bytes(msg) {
        var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        var h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
        var l = msg.length, nb = ((l + 9 + 63) >> 6) << 6, p = new Uint8Array(nb);
        p.set(msg); p[l] = 0x80;
        var bits = l * 8; p[nb - 4] = (bits >>> 24) & 255; p[nb - 3] = (bits >>> 16) & 255; p[nb - 2] = (bits >>> 8) & 255; p[nb - 1] = bits & 255;
        var wv = new Array(64);
        for (var o = 0; o < nb; o += 64) {
            for (var i = 0; i < 16; i++) wv[i] = (p[o + i * 4] << 24) | (p[o + i * 4 + 1] << 16) | (p[o + i * 4 + 2] << 8) | p[o + i * 4 + 3];
            for (i = 16; i < 64; i++) {
                var s0 = ((wv[i - 15] >>> 7) | (wv[i - 15] << 25)) ^ ((wv[i - 15] >>> 18) | (wv[i - 15] << 14)) ^ (wv[i - 15] >>> 3);
                var s1 = ((wv[i - 2] >>> 17) | (wv[i - 2] << 15)) ^ ((wv[i - 2] >>> 19) | (wv[i - 2] << 13)) ^ (wv[i - 2] >>> 10);
                wv[i] = (wv[i - 16] + s0 + wv[i - 7] + s1) | 0;
            }
            var a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
            for (i = 0; i < 64; i++) {
                var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
                var ch = (e & f) ^ (~e & g), t1 = (hh + S1 + ch + K[i] + wv[i]) | 0;
                var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
                var mj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + mj) | 0;
                hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0; h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
        }
        var out = new Uint8Array(32);
        for (var j = 0; j < 8; j++) { out[j * 4] = (h[j] >>> 24) & 255; out[j * 4 + 1] = (h[j] >>> 16) & 255; out[j * 4 + 2] = (h[j] >>> 8) & 255; out[j * 4 + 3] = h[j] & 255; }
        return out;
    }
    function hmacSha256(key, msg) {
        if (key.length > 64) key = sha256Bytes(key);
        var k = new Uint8Array(64); k.set(key);
        var ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96);
        for (var i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
        ip.set(msg, 64);
        op.set(sha256Bytes(ip), 64);
        return sha256Bytes(op);
    }
    function pbkdf2JS(pw, salt, iter) {
        var s1 = new Uint8Array(salt.length + 4); s1.set(salt); s1[salt.length + 3] = 1;
        var u = hmacSha256(pw, s1), t = new Uint8Array(u);
        for (var i = 1; i < iter; i++) { u = hmacSha256(pw, u); for (var j = 0; j < 32; j++) t[j] ^= u[j]; }
        return t;
    }
    function hex2u8(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
    function u82hex(u) { var s = ''; for (var i = 0; i < u.length; i++) s += (u[i] < 16 ? '0' : '') + u[i].toString(16); return s; }
    // Local-mode user accounts (server mode: users live on the server). Stored in 'rohan_users_v1' as
    // { username: { role, salt, iter, hash, branches: [ids] | '*', disabled } }; the built-in admin/owner
    // (index.html) are overridden field by field.
    var USERS_KEY = 'rohan_users_v1', BUILTIN_USERS = { admin: 'admin', owner: 'owner' };
    function usersRaw() { var u = App.readObject(USERS_KEY); return u && typeof u === 'object' ? u : {}; }
    App.users = {
        BUILTIN: BUILTIN_USERS,
        list: function () {
            var c = usersRaw(), out = [];
            Object.keys(BUILTIN_USERS).forEach(function (n) { var r = c[n] || {}; out.push({ username: n, role: BUILTIN_USERS[n], builtin: true, disabled: !!r.disabled && n !== 'admin', branches: Array.isArray(r.branches) ? r.branches : '*' }); });
            Object.keys(c).forEach(function (n) { if (BUILTIN_USERS[n] || !c[n]) return; out.push({ username: n, role: c[n].role, builtin: false, disabled: !!c[n].disabled, branches: Array.isArray(c[n].branches) ? c[n].branches : '*' }); });
            return out;
        },
        // o: { username, role, password (optional when editing), branches: [ids] | '*', disabled }
        save: function (o) {
            var name = String(o.username || '').trim().toLowerCase();
            if (!/^[a-z0-9_.-]{3,30}$/.test(name)) return Promise.resolve({ ok: false, code: 'BAD_NAME' });
            var c = usersRaw(), cur = c[name] || {}, builtin = !!BUILTIN_USERS[name], isNew = !builtin && !c[name];
            var role = builtin ? BUILTIN_USERS[name] : o.role;
            if (role !== 'admin' && role !== 'owner') return Promise.resolve({ ok: false, code: 'BAD_ROLE' });
            var branches = role === 'owner' && Array.isArray(o.branches) ? o.branches : '*';
            if (Array.isArray(branches) && !branches.length) return Promise.resolve({ ok: false, code: 'NO_BRANCH' });
            if (isNew && !o.password) return Promise.resolve({ ok: false, code: 'NEED_PASSWORD' });
            if (o.password && String(o.password).length < 6) return Promise.resolve({ ok: false, code: 'SHORT_PASSWORD' });
            var rec = Object.assign({}, cur, { role: role, branches: branches, disabled: name === 'admin' ? false : !!o.disabled });
            var done = function () { c[name] = rec; App.store.set(USERS_KEY, JSON.stringify(c)); return { ok: true }; };
            if (!o.password) return Promise.resolve(done());
            var salt = u82hex(w.crypto.getRandomValues(new Uint8Array(16)));
            return App.pbkdf2Hex(name + ':' + o.password, salt, 120000).then(function (h) { rec.salt = salt; rec.iter = 120000; rec.hash = h; return done(); });
        },
        remove: function (name) {
            var c = usersRaw();
            if (BUILTIN_USERS[name] || !c[name]) return false;
            delete c[name]; App.store.set(USERS_KEY, JSON.stringify(c)); return true;
        }
    };
    App.pbkdf2Hex = function (secret, saltHex, iter) {
        var pw = new TextEncoder().encode(secret), salt = hex2u8(saltHex);
        if (w.crypto && w.crypto.subtle && w.isSecureContext) {
            return w.crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveBits'])
                .then(function (k) { return w.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter }, k, 256); })
                .then(function (b) { return u82hex(new Uint8Array(b)); })
                .catch(function () { return u82hex(pbkdf2JS(pw, salt, iter)); });
        }
        return new Promise(function (res) { setTimeout(function () { res(u82hex(pbkdf2JS(pw, salt, iter))); }, 30); });
    };

    var crcT = null;
    function crc32(u8) {
        if (!crcT) { crcT = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcT[n] = c >>> 0; } }
        var crc = 0xFFFFFFFF;
        for (var i = 0; i < u8.length; i++) crc = crcT[(crc ^ u8[i]) & 255] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    function u16(n) { return [n & 255, (n >> 8) & 255]; }
    function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
    function concat(parts) {
        var len = 0; parts.forEach(function (p) { len += p.length; });
        var out = new Uint8Array(len), o = 0; parts.forEach(function (p) { out.set(p, o); o += p.length; });
        return out;
    }
    function zipStore(files) {
        var enc = new TextEncoder(), chunks = [], central = [], offset = 0;
        files.forEach(function (f) {
            var nameB = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data), size = data.length;
            var lh = new Uint8Array([].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0)));
            chunks.push(lh, nameB, data);
            central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), nameB);
            offset += lh.length + nameB.length + size;
        });
        var cd = concat(central);
        var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cd.length), u32(offset), u16(0)));
        return concat(chunks.concat([cd, end]));
    }
    function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
    function xmlEsc(s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function asNumber(t) {
        if (typeof t === 'number') return t;
        t = String(t).trim();
        if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return parseFloat(t.replace(/,/g, ''));
        if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(t)) return parseFloat(t);
        return null;
    }
    function sheetXml(sh) {
        var maxC = 0, widths = [];
        sh.rows.forEach(function (r) { maxC = Math.max(maxC, r.cells.length); r.cells.forEach(function (v, i) { if (v && typeof v === 'object') v = v.v; var L = String(v == null ? '' : v).length; if (L > 60) L = 60; widths[i] = Math.max(widths[i] || 8, Math.min(48, L + 3)); }); });
        if (sh.widths) sh.widths.forEach(function (x, i) { if (x) widths[i] = x; });
        var cols = '<cols>' + widths.map(function (wd, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + wd + '" customWidth="1"/>'; }).join('') + '</cols>';
        var rowsXml = sh.rows.map(function (row, ri) {
            var cx = row.cells.map(function (v, ci) {
                var ref = colName(ci) + (ri + 1), st = row.style || 0;
                if (v && typeof v === 'object') {
                    st = v.s || 0; v = v.v;
                    if (typeof v === 'number') return '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>';
                    if (v === '' || v == null) return '<c r="' + ref + '" s="' + st + '"/>';
                    return '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
                }
                if (v === '' || v == null) return st ? '<c r="' + ref + '" s="' + st + '"/>' : '';
                var n = (st === 0 || st === 1) ? asNumber(v) : null;
                if (n !== null) { var ns = (n % 1 === 0) ? (st === 1 ? 4 : 3) : st; return '<c r="' + ref + '" s="' + ns + '"><v>' + n + '</v></c>'; }
                return '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
            }).join('');
            return '<row r="' + (ri + 1) + '"' + (row.h ? ' ht="' + row.h + '" customHeight="1"' : '') + '>' + cx + '</row>';
        }).join('');
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"' + (sh.rtl ? ' rightToLeft="1"' : '') + (sh.freeze ? '><pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView>' : '/>') + '</sheetViews><sheetFormatPr defaultRowHeight="15"/>' + cols + '<sheetData>' + rowsXml + '</sheetData></worksheet>';
    }
    var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' +
        '<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font></fonts>' +
        '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9E9E9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F3D5C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="18">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
        '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
        '<xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
        '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
        '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
        '<xf numFmtId="3" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
        '<xf numFmtId="3" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '<xf numFmtId="3" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '<xf numFmtId="3" fontId="4" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '<xf numFmtId="3" fontId="5" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
        '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

    App.buildBranchXlsx = function (bid, branchName) {
        var isEn = isEnLang(), K = App.keysFor(bid), rtl = !isEn;
        var recs = App.readArray(K.records).filter(function (r) { return r && r.customerName; });
        var det = App.readArray(K.details), names = App.readArray(K.customers);
        var st = App.loadSettings(bid), by = App.recordsByCustomer(bid);
        function ord(a, b) { return (a.date || '') < (b.date || '') ? -1 : ((a.date || '') > (b.date || '') ? 1 : ((a.no || 0) - (b.no || 0))); }
        function num(v) { v = parseFloat(v); return isNaN(v) ? 0 : v; }
        function info(n) { return det.find(function (c) { return c && App.sameName(c.name, n); }) || {}; }
        function cn(k, d) { return (st.cols && st.cols[k] && st.cols[k].name) ? st.cols[k].name : d; }
        var H = {
            date: T(isEn, 'تاریخ', 'Date'), no: T(isEn, 'نمبر', 'No'), cust: T(isEn, 'گاہک', 'Customer'), det: T(isEn, 'تفصیل', 'Details'),
            pcs: cn('pcs', T(isEn, 'پیس', 'Pcs')), w: cn('weight', T(isEn, 'وزن', 'Weight')), rate: cn('rate', T(isEn, 'ریٹ', 'Rate')),
            bnam: T(isEn, 'بنام رقم', 'Debit'), jama: T(isEn, 'جمع رقم', 'Credit'), bal: T(isEn, 'بیلنس', 'Balance'), side: T(isEn, 'ج/ب', 'Cr/Dr')
        };
        var sheets = [];
        function title(text, cols) { var c = [{ v: text, s: 5 }]; for (var i = 1; i < cols; i++) c.push({ v: '', s: 5 }); return { cells: c, h: 28 }; }
        function hdr(list) { return { cells: list.map(function (x) { return { v: x, s: 6 }; }), h: 22 }; }
        function amtCell(v, isJ) { return v ? { v: v, s: isJ ? 9 : 10 } : { v: '', s: 7 }; }
        function txt(v) { return { v: (v === undefined || v === null || v === '-') ? '' : String(v), s: 7 }; }

        var jr = [title(T(isEn, 'روزنامچہ — ', 'Journal — ') + branchName, 9), hdr([H.date, H.no, H.cust, H.det, H.pcs, H.w, H.rate, H.bnam, H.jama])];
        var all = recs.slice().sort(ord), cur = null, dj = 0, db = 0, tj = 0, tb = 0;
        function dayTotal() { if (cur === null) return; jr.push({ cells: [{ v: T(isEn, 'دن کا ٹوٹل', 'Day total'), s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: db, s: 15 }, { v: dj, s: 14 }] }); }
        all.forEach(function (r) {
            if (r.date !== cur) { dayTotal(); cur = r.date; dj = 0; db = 0; var c = [{ v: App.fmtDMY(r.date), s: 13 }]; for (var i = 1; i < 9; i++) c.push({ v: '', s: 13 }); jr.push({ cells: c }); }
            var a = num(r.totalAmount), isJ = r.type === 'JAMA';
            if (isJ) { dj += a; tj += a; } else { db += a; tb += a; }
            jr.push({ cells: [{ v: App.fmtDMY(r.date), s: 16 }, { v: r.no || '', s: 16 }, txt(r.customerName), txt(r.details), { v: num(r.pcs) || '', s: num(r.pcs) ? 8 : 7 }, { v: num(r.weight) || '', s: num(r.weight) ? 17 : 7 }, { v: num(r.rate) || '', s: num(r.rate) ? 8 : 7 }, isJ ? { v: '', s: 7 } : amtCell(a, false), isJ ? amtCell(a, true) : { v: '', s: 7 }] });
        });
        dayTotal();
        jr.push({ cells: [{ v: T(isEn, 'کل ٹوٹل', 'Grand total'), s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: tb, s: 15 }, { v: tj, s: 14 }], h: 22 });
        sheets.push({ name: T(isEn, 'روزنامچہ', 'Journal'), rtl: rtl, rows: jr, freeze: 2, widths: [13, 7, 22, 30, 9, 11, 10, 15, 15] });

        var sr = [title(T(isEn, 'سمری — ', 'Summary — ') + branchName, 6), hdr([T(isEn, 'کھاتہ نمبر', 'Acc No'), H.cust, T(isEn, 'موبائل', 'Mobile'), H.pcs, H.jama, H.bnam])];
        var rowsS = names.map(function (n) { var l = by[App.norm(n)] || [], bal = App.balanceOf(l), pcs = 0; l.forEach(function (r) { pcs += (r.type === 'JAMA' ? 1 : -1) * num(r.pcs); }); var ci = info(n); return { n: n, acc: ci.accountNo || '', ph: ci.phone, bal: bal, pcs: pcs }; });
        rowsS.sort(function (a, b) { return (parseFloat(a.acc) || 0) - (parseFloat(b.acc) || 0) || (a.n < b.n ? -1 : 1); });
        var sj = 0, sb = 0;
        rowsS.forEach(function (r) { if (r.bal > 0) sj += r.bal; else sb += -r.bal;
            sr.push({ cells: [{ v: String(r.acc), s: 16 }, txt(r.n), txt(r.ph), { v: r.pcs || '', s: r.pcs ? 8 : 7 }, r.bal > 0 ? amtCell(r.bal, true) : { v: '', s: 7 }, r.bal < 0 ? amtCell(-r.bal, false) : { v: '', s: 7 }] }); });
        sr.push({ cells: [{ v: T(isEn, 'ٹوٹل', 'Total'), s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: sj, s: 14 }, { v: sb, s: 15 }], h: 22 });
        sr.push({ cells: [{ v: T(isEn, 'نیٹ (جمع − بنام)', 'Net (Cr − Dr)'), s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: sj - sb, s: 12 }, { v: '', s: 11 }] });
        sheets.push({ name: T(isEn, 'سمری', 'Summary'), rtl: rtl, rows: sr, freeze: 2, widths: [11, 26, 16, 10, 16, 16] });

        names.slice().sort(function (a, b) { return (parseFloat(info(a).accountNo) || 0) - (parseFloat(info(b).accountNo) || 0); }).forEach(function (n) {
            var l = (by[App.norm(n)] || []).slice().sort(ord); if (!l.length) return;
            var ci = info(n), rows = [title(T(isEn, 'کھاتہ: ', 'Ledger: ') + n + (ci.accountNo ? '  (#' + ci.accountNo + ')' : '') + ' — ' + branchName, 10), hdr([H.date, H.no, H.det, H.pcs, H.w, H.rate, H.bnam, H.jama, H.bal, H.side])];
            var bal = 0, tJ = 0, tB = 0;
            l.forEach(function (r) { var a = num(r.totalAmount), isJ = r.type === 'JAMA'; bal += isJ ? a : -a; if (isJ) tJ += a; else tB += a;
                rows.push({ cells: [{ v: App.fmtDMY(r.date), s: 16 }, { v: r.no || '', s: 16 }, txt(r.details), { v: num(r.pcs) || '', s: num(r.pcs) ? 8 : 7 }, { v: num(r.weight) || '', s: num(r.weight) ? 17 : 7 }, { v: num(r.rate) || '', s: num(r.rate) ? 8 : 7 }, isJ ? { v: '', s: 7 } : amtCell(a, false), isJ ? amtCell(a, true) : { v: '', s: 7 }, { v: Math.abs(bal), s: bal >= 0 ? 9 : 10 }, { v: bal >= 0 ? T(isEn, 'ج', 'Cr') : T(isEn, 'ب', 'Dr'), s: 16 }] }); });
            rows.push({ cells: [{ v: T(isEn, 'ٹوٹل', 'Total'), s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: '', s: 11 }, { v: tB, s: 15 }, { v: tJ, s: 14 }, { v: Math.abs(bal), s: bal >= 0 ? 14 : 15 }, { v: bal >= 0 ? T(isEn, 'ج', 'Cr') : T(isEn, 'ب', 'Dr'), s: 11 }], h: 22 });
            var nm = String(n).replace(/[\[\]:*?\/\\]/g, ' ').trim().slice(0, 26) || 'Ledger', base = nm, k = 2;
            while (sheets.some(function (s2) { return s2.name.toLowerCase() === nm.toLowerCase(); })) nm = base.slice(0, 23) + ' ' + (k++);
            sheets.push({ name: nm, rtl: rtl, rows: rows, freeze: 2, widths: [13, 7, 30, 9, 11, 10, 15, 15, 15, 6] });
        });
        return packXlsx(sheets);
    };
    App.downloadBranchXlsx = function (bid, branchName) {
        var u8 = App.buildBranchXlsx(bid, branchName);
        download(u8, String(branchName || bid).replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_') + '_' + todayISO() + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    };

    function packXlsx(sheets) {
        var files = [];
        files.push({ name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' });
        files.push({ name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
        files.push({ name: 'xl/workbook.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + xmlEsc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' });
        files.push({ name: 'xl/_rels/workbook.xml.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
        files.push({ name: 'xl/styles.xml', text: STYLES_XML });
        sheets.forEach(function (s, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXml(s) }); });
        return zipStore(files);
    }

    function download(u8, name, mime) {
        var blob = new Blob([u8], { type: mime }), a = D.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; D.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }

    try {
        var st = D.createElement('style'); st.id = 'appExtrasCSS';
        st.textContent =
        '.app-banner{margin:0 0 12px;padding:10px 12px;border-radius:10px;font-weight:bold;font-size:13.5px;text-align:center;border:1px solid}' +
        '.app-banner-warn{background:rgba(255,193,7,.12);border-color:#ffc107;color:#ffc107}body.light-theme .app-banner-warn{color:#92400e;background:#fef3c7}' +
        '.app-banner-bad{background:rgba(220,53,69,.14);border-color:#dc3545;color:#ff8a8a}body.light-theme .app-banner-bad{color:#991b1b;background:#fee2e2}' +
        '.app-banner button{margin:6px 6px 0;padding:6px 12px;border:none;border-radius:6px;font-weight:bold;cursor:pointer;background:#ffc107;color:#000}' +
        '.age-badge{display:inline-block;font-size:10px;font-weight:800;color:#fff;background:#dc3545;border-radius:8px;padding:1px 6px;margin:0 4px;white-space:nowrap}' +
        '.limit-badge{display:inline-block;font-size:10px;font-weight:800;color:#000;background:#ffc107;border-radius:8px;padding:1px 6px;margin:0 4px;white-space:nowrap}' +
        '@media print{.app-banner{display:none!important}}';
        D.head.appendChild(st);
    } catch (e) {}

    // Mobile layout of the .wrap report pages (aging, deleted entries, audit log, all branches): smaller heading and text,
    // one-line cells with a visible horizontal scroll bar so names are never split over several lines.
    try {
        if (D.querySelector && /(aging_report|deleted_entries|audit_log|all_branches)\.html$/i.test(location.pathname)) {
            var mst = D.createElement('style'); mst.id = 'ubgWrapMobile';
            mst.textContent = '@media screen and (max-width:700px){' +
                'body{padding:10px!important}html body .wrap{padding:10px!important}' +
                'html body .wrap .hd h1{font-size:13.5px!important;line-height:1.4!important}' +
                'html body .wrap .scroll{overflow-x:scroll!important;-webkit-overflow-scrolling:touch;padding-bottom:6px}' +
                'html body .wrap .scroll::-webkit-scrollbar{height:9px}' +
                'html body .wrap .scroll::-webkit-scrollbar-track{background:rgba(128,128,128,.25);border-radius:6px}' +
                'html body .wrap .scroll::-webkit-scrollbar-thumb{background:#888;border-radius:6px}' +
                'html body .wrap .scroll table{width:max-content!important;min-width:100%!important;font-size:11.5px!important}' +
                'html body .wrap .scroll th,html body .wrap .scroll td{white-space:nowrap!important;padding:6px 8px!important;font-size:11.5px!important}' +
                'html body .wrap .scroll th{position:static!important}' +
                'html body .wrap .rb{overflow-x:auto;padding:6px 8px!important}html body .wrap .rg{display:block!important}' +
                'html body .wrap .rc{display:flex!important;flex-direction:row!important;justify-content:space-between;align-items:baseline;gap:10px;padding:3px 0;border-bottom:1px dashed rgba(128,128,128,.35);white-space:nowrap}' +
                'html body .wrap .rc:last-child{border-bottom:none}html body .wrap .rc small{display:inline!important;font-size:11px!important}' +
                'html body .wrap .rc b{font-size:12.5px!important;word-break:normal!important;white-space:nowrap}html body .wrap .rt{font-size:12px!important}' +
                'html body .wrap .ev{padding:8px!important}html body .wrap .ev .ch{font-size:12px!important}' +
                'html body .wrap .btn{font-size:12px!important}html body .wrap .card b{font-size:15px!important}html body .wrap .card small{font-size:11px!important}}';
            D.head.appendChild(mst);
        }
    } catch (e) {}

    try {
        var fs = parseInt(localStorage.getItem('rohan_font_scale'), 10);
        var gcss = '';
        if (fs >= 80 && fs <= 130 && fs !== 100) gcss += '@media screen{html{zoom:' + fs / 100 + '}}';
        var dn = localStorage.getItem('rohan_table_density'), pad = { compact: 2, roomy: 11 }[dn];
        if (pad) gcss += '@media screen{html body th,html body td{padding-top:' + pad + 'px!important;padding-bottom:' + pad + 'px!important}}';
        // ===== print logo: which printed pages show the logo (home > settings > print logo). key rohan_pl_<id> = '0' means OFF =====
        (function () {
            var L = window.__ubgPrintLogo = [
                { id: 'home', files: ['home'], ur: 'ہوم ڈیش بورڈ پرنٹ', en: 'Home dashboard print' },
                { id: 'journal', files: ['daily_journal'], ur: 'روزنامچہ پرنٹ', en: 'Daily journal print' },
                { id: 'summary', files: ['summary'], own: 1, ur: 'سمری پرنٹ', en: 'Summary print' },
                { id: 'ledger', files: ['customer_ledger'], own: 1, ur: 'لیجر پرنٹ', en: 'Ledger print' },
                { id: 'aging', files: ['aging_report'], ur: 'ایجنگ رپورٹ پرنٹ', en: 'Ageing report print' },
                { id: 'allbr', files: ['all_branches'], ur: 'سب برانچز کی رپورٹ پرنٹ', en: 'All branches report print' },
                { id: 'delent', files: ['deleted_entries'], ur: 'ڈیلیٹ شدہ انٹریاں پرنٹ', en: 'Deleted entries print' },
                { id: 'audit', files: ['audit_log'], ur: 'ایڈٹ لاگ پرنٹ', en: 'Audit log print' }
            ];
            var pg = (location.pathname.split('/').pop() || '').replace(/\.html?$/i, '');
            var cur = null; L.forEach(function (p) { if (p.files.indexOf(pg) >= 0) cur = p; });
            if (!cur) return;
            var off = localStorage.getItem('rohan_pl_' + cur.id) === '0';
            if (cur.own) { if (off) gcss += '@media print{html body .print-logo-img,html body .print-logo-top-right{display:none!important}}'; return; }
            if (off) return;
            var host = { home: '.chart-header-row', journal: '#topHeaderArea' }[cur.id] || '.hd';
            gcss += '.ubg-print-logo{display:none}@media print{html body .ubg-pl-host{position:relative!important;min-height:54px!important;padding-left:58px!important;padding-right:58px!important;box-sizing:border-box!important}html body .ubg-pl-host>img.ubg-print-logo{display:block!important;position:absolute!important;right:2px;top:50%;transform:translateY(-50%);height:46px;width:46px;object-fit:contain;border:none;background:transparent;z-index:5}html body>img.ubg-print-logo{display:block!important;position:absolute;top:6px;right:8px;height:46px;width:46px;object-fit:contain;z-index:5}}';
            var add = function () { var i = document.createElement('img'); i.src = 'logo.png'; i.className = 'ubg-print-logo'; i.alt = ''; i.setAttribute('aria-hidden', 'true'); var h = document.querySelector(host); if (h) { h.classList.add('ubg-pl-host'); h.appendChild(i); } else document.body.appendChild(i); };
            if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
        })();
        // ===== per-page size settings (hub: size_settings.html). keys: rohan_sz_<page>_<group>_<s|f|b|h|w> =====
        (function () {
            var P = window.__ubgSizeSpec = [
                { id: 'home', files: ['home'], ico: '🏠', c: '#7d2ae8', ur: 'ہوم پیج', en: 'Home', g: [
                    { id: 'brand', ur: 'برانچ کا نام (اوپر)', en: 'Branch name (top)', sel: '#main_branch_title,.company-title', ctl: 'sf' },
                    { id: 'top', ur: 'اوپر کے بٹن (واپس / سیٹنگ)', en: 'Top buttons (back / settings)', sel: '.btn-top-back,.btn-chart-settings', ctl: 'sfb' },
                    { id: 'menu', ur: 'مینو کے بٹن (جمع، بنام، رپورٹیں…)', en: 'Menu buttons', sel: '.menu-btn', ctl: 'sfb' },
                    { id: 'dbhead', ur: 'ڈیش بورڈ کا عنوان اور برانچ', en: 'Dashboard title and branch', sel: '.chart-title,.dash-branch', ctl: 'sf' },
                    { id: 'dbprint', ur: 'ڈیش بورڈ پرنٹ بٹن', en: 'Dashboard print button', sel: '.btn-dash-print', ctl: 'sfb' },
                    { id: 'dbdate', ur: 'ڈیش بورڈ کی تاریخ والا بٹن', en: 'Dashboard date button', sel: '.db-datebtn', ctl: 'sfb' },
                    { id: 'kpi', ur: 'اوپر کے رنگین بکس (ڈبے)', en: 'Top KPI boxes', sel: '.db-kpi', ctl: 'b' },
                    { id: 'kpit', ur: 'بکس کا عنوان (جمع، بنام…)', en: 'KPI box titles', sel: '.db-kpi .kt', ctl: 'sf' },
                    { id: 'kpiv', ur: 'بکس کی رقم', en: 'KPI box values', sel: '.db-kpi .kv', ctl: 'sf' },
                    { id: 'kpis', ur: 'بکس کی چھوٹی تفصیل', en: 'KPI box small text', sel: '.db-kpi .ks', ctl: 'sf' },
                    { id: 'card', ur: 'ڈیش بورڈ کے کارڈ (ڈبے)', en: 'Dashboard cards', sel: '.db-card', ctl: 'b' },
                    { id: 'cardh', ur: 'کارڈ کے عنوان', en: 'Card headings', sel: '.db-card h3,.db-card h4', ctl: 'sf' },
                    { id: 'rows', ur: 'کارڈ کی قطاریں (تفصیل)', en: 'Card rows', sel: '.db-tbl .r,.db-card .r', ctl: 'sf' },
                    { id: 'leg', ur: 'گراف کی لیجنڈ', en: 'Chart legends', sel: '.db-leg,.db-dleg', ctl: 'sf' }
                ] },
                { id: 'entry', files: ['jama_entry', 'bnam_entry', 'edit_entry'], ico: '📝', c: '#1e7e34', ur: 'جمع / بنام انٹری شیٹ', en: 'Jama / Bnam Entry', g: [
                    { id: 'title', ur: 'شیٹ کا نام', en: 'Sheet title', sel: '#titleText,.edit-title,.header-title', ctl: 'sf' },
                    { id: 'branch', ur: 'برانچ کا نام (چھوٹا)', en: 'Branch badge', sel: '.branch-mini-name', ctl: 'sf' },
                    { id: 'back', ur: 'واپس کا بٹن', en: 'Back button', sel: '.btn-back,.btn-top-back', ctl: 'sfb' },
                    { id: 'lab', ur: 'خانوں کے نام (لیبل)', en: 'Field labels', sel: '.form-group label', ctl: 'sf' },
                    { id: 'inp', ur: 'خانوں کے اندر کی تحریر', en: 'Field text', sel: '.form-group input,.form-group select,.form-group textarea', ctl: 'sfh' },
                    { id: 'dd', ur: 'نام کی فہرست (ڈراپ ڈاؤن)', en: 'Name dropdown list', sel: '.dropdown-list', ctl: 'sf' },
                    { id: 'save', ur: 'محفوظ کریں کا بٹن', en: 'Save button', sel: '.btn-save', ctl: 'sfbh' },
                    { id: 'mic', ur: 'ماؤس / آواز کا بٹن', en: 'Mic button', sel: '#vmBtn', ctl: 'b' },
                    { id: 'dfmt', ur: 'تاریخ کی تحریر (دن/مہینہ/سال)', en: 'Date text', sel: '.ubg-date-fmt', ctl: 'sf' },
                    { id: 'typ', ur: 'جمع / بنام چننے کے بٹن (ایڈٹ)', en: 'Jama / Bnam type options', sel: '.type-option', ctl: 'sfb' },
                    { id: 'del', ur: 'ریکارڈ ڈیلیٹ کا بٹن', en: 'Delete entry button', sel: '.btn-delete-entry', ctl: 'sfbh' }
                ] },
                { id: 'journal', files: ['daily_journal'], ico: '📖', c: '#0d6efd', ur: 'روزنامچہ', en: 'Daily Journal', g: [
                    { id: 'title', ur: 'اوپر کا نام (عنوان)', en: 'Title', sel: '.main-title', ctl: 'sf' },
                    { id: 'date', ur: 'تاریخ', en: 'Date', sel: '.date-title,.date-fmt,.date-input', ctl: 'sf' },
                    { id: 'srch', ur: 'تلاش کا خانہ', en: 'Search box', sel: '.search-input', ctl: 'sfh' },
                    { id: 'btn', ur: 'بٹن (پرنٹ / واپس)', en: 'Buttons', sel: '.btn-header', ctl: 'sfb' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'tx', ur: 'متن (نام، تفصیل)', en: 'Text cells', sel: 'table td:not(.ubg-num):not(.ubg-acc)', ctl: 'sf' },
                    { id: 'num', ur: 'نمبر / رقم', en: 'Numbers', sel: 'table td.ubg-num', ctl: 'sf' },
                    { id: 'acc', ur: 'کھاتہ نمبر', en: 'Account no.', sel: 'table td.ubg-acc', ctl: 'sf' },
                    { id: 'foot', ur: 'فوٹر (ٹوٹل قطاریں)', en: 'Footer rows', sel: 'tr.row-today-total td,tr.row-final-balance td,tr.row-carton-record td', ctl: 'sf' },
                    { id: 'stat', ur: 'اوپر کے خلاصہ ڈبے', en: 'Summary boxes', sel: '.dashboard-stat-card', ctl: 'b' },
                    { id: 'statl', ur: 'ڈبے کا نام', en: 'Box label', sel: '.stat-label', ctl: 'sf' },
                    { id: 'statv', ur: 'ڈبے کی رقم', en: 'Box value', sel: '.stat-value', ctl: 'sf' }
                ] },
                { id: 'summary', files: ['summary'], ico: '💰', c: '#e67e22', ur: 'سمری', en: 'Summary', g: [
                    { id: 'title', ur: 'اوپر کا نام (عنوان)', en: 'Title', sel: '#summaryMainTitle,.main-title', ctl: 'sf' },
                    { id: 'branch', ur: 'برانچ کا نام (چھوٹا)', en: 'Branch badge', sel: '.branch-mini-name', ctl: 'sf' },
                    { id: 'btn', ur: 'بٹن (پرنٹ / واپس)', en: 'Buttons', sel: '.btn-header', ctl: 'sfb' },
                    { id: 'filt', ur: 'تلاش اور تاریخ', en: 'Search and date', sel: '.date-label,.search-input,.date-input', ctl: 'sf' },
                    { id: 'dfmt', ur: 'تاریخ کی تحریر (دن/مہینہ/سال)', en: 'Date text', sel: '.ubg-date-fmt', ctl: 'sf' },
                    { id: 'pen', ur: 'قلم / واٹس ایپ کے چھوٹے بٹن', en: 'Small pen / WhatsApp buttons', sel: '.btn-pen-tiny,.btn-wa-tiny', ctl: 'b' },
                    { id: 'empty', ur: 'خالی پیغام (کوئی ریکارڈ نہیں)', en: 'Empty message', sel: '.no-data-row td', ctl: 'sf' },
                    { id: 'tt', ur: 'جدول کا عنوان (جمع / بنام)', en: 'Table titles', sel: '.table-title', ctl: 'sf' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'name', ur: 'نام', en: 'Names', sel: '.customer-main-name,td.text-right', ctl: 'sf' },
                    { id: 'acc', ur: 'کھاتہ نمبر', en: 'Account no.', sel: 'table td.ubg-acc', ctl: 'sf' },
                    { id: 'num', ur: 'رقم / نمبر', en: 'Amounts', sel: 'table td.ubg-num,.main-amount-text', ctl: 'sf' },
                    { id: 'badge', ur: 'چھوٹے بیج (پیس، وزن)', en: 'Small badges', sel: '.stat-badge,.khata-inline-badge', ctl: 'sf' },
                    { id: 'foot', ur: 'فوٹر کے ڈبے', en: 'Footer boxes', sel: '.summary-item', ctl: 'b' },
                    { id: 'footl', ur: 'فوٹر کے ڈبے کا نام', en: 'Footer box label', sel: '.summary-item>span', ctl: 'sf' },
                    { id: 'footv', ur: 'فوٹر کی رقم (ٹوٹل)', en: 'Footer totals', sel: '.summary-item>div', ctl: 'sf' }
                ] },
                { id: 'ledger', files: ['customer_ledger'], ico: '📒', c: '#c2185b', ur: 'لیجر', en: 'Ledger', g: [
                    { id: 'title', ur: 'گاہک کا نام (عنوان)', en: 'Customer name', sel: '.customer-title', ctl: 'sf' },
                    { id: 'sub', ur: 'کھاتہ نمبر اور برانچ (چھوٹا)', en: 'Account / branch (small)', sel: '.hdr-sub', ctl: 'sf' },
                    { id: 'btn', ur: 'بٹن (پرنٹ / واپس)', en: 'Buttons', sel: '.hdr-side .btn-print,.hdr-side .btn-back', ctl: 'sfb' },
                    { id: 'date', ur: 'تاریخ سے تاریخ تک', en: 'Date range', sel: '.date-range-field,.date-picker-input', ctl: 'sf' },
                    { id: 'srch', ur: 'تلاش کا خانہ', en: 'Search box', sel: '.search-input', ctl: 'sfh' },
                    { id: 'dclr', ur: 'تاریخ صاف کرنے کا بٹن', en: 'Clear dates button', sel: '.btn-date-clear', ctl: 'sfb' },
                    { id: 'pen', ur: 'قلم کا ٹول بار', en: 'Pen toolbar', sel: '.pen-toggle', ctl: 'sfb' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'tx', ur: 'متن (تفصیل)', en: 'Text cells', sel: 'table td:not(.ubg-num):not(.ubg-acc)', ctl: 'sf' },
                    { id: 'num', ur: 'نمبر / رقم', en: 'Numbers', sel: 'table td.ubg-num', ctl: 'sf' },
                    { id: 'sumh', ur: 'فوٹر کے ڈبوں کا عنوان', en: 'Footer box headings', sel: '.summary-column h3', ctl: 'sf' },
                    { id: 'sumbox', ur: 'فوٹر کے ڈبے', en: 'Footer boxes', sel: '.summary-column', ctl: 'b' },
                    { id: 'suml', ur: 'فوٹر کا نام (بنام / جمع)', en: 'Footer labels', sel: '.summary-item>span:first-child', ctl: 'sf' },
                    { id: 'sumv', ur: 'فوٹر کے نمبر / رقم', en: 'Footer numbers', sel: '.summary-item>span:last-child', ctl: 'sf' },
                    { id: 'del', ur: 'کھاتہ ڈیلیٹ کا بٹن', en: 'Delete account button', sel: '.btn-delete-account', ctl: 'sfb' }
                ] },
                { id: 'addcust', files: ['add_customer', 'edit_customer'], ico: '➕', c: '#00897b', ur: 'نیا گاہک / گاہک میں تبدیلی', en: 'Add / Edit Customer', g: [
                    { id: 'title', ur: 'صفحے کا نام', en: 'Page title', sel: '#pageTitle,.header-title,.title', ctl: 'sf' },
                    { id: 'back', ur: 'واپس کا بٹن', en: 'Back button', sel: '.btn-top-back', ctl: 'sfb' },
                    { id: 'lab', ur: 'خانوں کے نام (لیبل)', en: 'Field labels', sel: '.form-group label', ctl: 'sf' },
                    { id: 'inp', ur: 'خانوں کے اندر کی تحریر', en: 'Field text', sel: '.form-group input,.form-group select,.form-group textarea', ctl: 'sfh' },
                    { id: 'save', ur: 'محفوظ کریں کا بٹن', en: 'Save button', sel: '.btn-submit,.btn-save', ctl: 'sfbh' }
                ] },
                { id: 'delrec', files: ['deleted_records'], ico: '🗑️', c: '#6d4c41', ur: 'ڈیلیٹ شدہ کھاتے', en: 'Deleted Accounts', g: [
                    { id: 'title', ur: 'صفحے کا نام', en: 'Page title', sel: '.archive-title', ctl: 'sf' },
                    { id: 'back', ur: 'واپس کا بٹن', en: 'Back button', sel: '.btn-back', ctl: 'sfb' },
                    { id: 'srch', ur: 'تلاش کا خانہ', en: 'Search box', sel: '.search-input', ctl: 'sfh' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'tx', ur: 'متن (نام)', en: 'Text cells', sel: 'table td:not(.ubg-num):not(.ubg-acc)', ctl: 'sf' },
                    { id: 'num', ur: 'نمبر / کھاتہ نمبر', en: 'Numbers', sel: 'table td.ubg-num,table td.ubg-acc,.account-badge', ctl: 'sf' },
                    { id: 'view', ur: 'دیکھیں کا بٹن', en: 'View button', sel: '.btn-view', ctl: 'sfb' }
                ] },
                { id: 'aging', files: ['aging_report'], ico: '⏰', c: '#f9a825', ur: 'ایجنگ رپورٹ', en: 'Ageing Report', g: [
                    { id: 'title', ur: 'صفحے کا نام', en: 'Page title', sel: '.hd h1', ctl: 'sf' },
                    { id: 'btn', ur: 'بٹن (واپس / پرنٹ)', en: 'Buttons', sel: '.hd .btn', ctl: 'sfb' },
                    { id: 'bar', ur: 'اوپر کا انتخاب (جمع / بنام)', en: 'Selector bar', sel: '.bar select,.bar input', ctl: 'sfh' },
                    { id: 'card', ur: 'خلاصہ ڈبے', en: 'Summary boxes', sel: '.card', ctl: 'b' },
                    { id: 'cardl', ur: 'ڈبے کا نام', en: 'Box label', sel: '.card small', ctl: 'sf' },
                    { id: 'cardv', ur: 'ڈبے کی رقم', en: 'Box value', sel: '.card b', ctl: 'sf' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'tx', ur: 'متن (نام)', en: 'Text cells', sel: 'table td:not(.ubg-num):not(.ubg-acc)', ctl: 'sf' },
                    { id: 'num', ur: 'نمبر / رقم', en: 'Numbers', sel: 'table td.ubg-num', ctl: 'sf' },
                    { id: 'acc', ur: 'کھاتہ نمبر', en: 'Account no.', sel: 'table td.ubg-acc', ctl: 'sf' },
                    { id: 'note', ur: 'نیچے کا نوٹ', en: 'Bottom note', sel: '.muted', ctl: 'sf' }
                ] },
                { id: 'delent', files: ['deleted_entries'], ico: '♻️', c: '#5e35b1', ur: 'ڈیلیٹ شدہ انٹریاں', en: 'Deleted Entries', g: [
                    { id: 'title', ur: 'صفحے کا نام', en: 'Page title', sel: '.hd h1', ctl: 'sf' },
                    { id: 'btn', ur: 'بٹن', en: 'Buttons', sel: '.btn', ctl: 'sfb' },
                    { id: 'bar', ur: 'گنتی کی پٹی', en: 'Count bar', sel: '.bar,.muted', ctl: 'sf' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'tx', ur: 'متن (نام، تفصیل)', en: 'Text cells', sel: 'table td:not(.ubg-num):not(.ubg-acc)', ctl: 'sf' },
                    { id: 'num', ur: 'نمبر / رقم', en: 'Numbers', sel: 'table td.ubg-num', ctl: 'sf' }
                ] },
                { id: 'audit', files: ['audit_log'], ico: '📜', c: '#37474f', ur: 'ایڈٹ لاگ / تبدیلیوں کی ہسٹری', en: 'Audit Log / Change History', g: [
                    { id: 'title', ur: 'صفحے کا نام', en: 'Page title', sel: '.hd h1', ctl: 'sf' },
                    { id: 'btn', ur: 'بٹن', en: 'Buttons', sel: '.btn', ctl: 'sfb' },
                    { id: 'bar', ur: 'فلٹر اور گنتی', en: 'Filter and count', sel: '.bar,.bar select,.muted', ctl: 'sf' },
                    { id: 'ev', ur: 'ہر ریکارڈ (ڈبہ)', en: 'Each record (box)', sel: '.ev', ctl: 'b' },
                    { id: 'evt', ur: 'ریکارڈ کی تحریر', en: 'Record text', sel: '.ev', ctl: 'sf' },
                    { id: 'tag', ur: 'ٹیگ (نیا، ایڈٹ، ڈیلیٹ)', en: 'Tags', sel: '.tag', ctl: 'sf' },
                    { id: 'empty', ur: 'خالی پیغام', en: 'Empty message', sel: '.empty', ctl: 'sf' }
                ] },
                { id: 'branches', files: ['branches'], ico: '🏢', c: '#0097a7', ur: 'برانچز کی فہرست (پہلا صفحہ)', en: 'Branches list (first page)', g: [
                    { id: 'title', ur: 'اوپر کا نام (کمپنی)', en: 'Company title', sel: '#mainTitle,.main-title', ctl: 'sf' },
                    { id: 'top', ur: 'اوپر کے بٹن (لاگ آؤٹ / ترمیم / تھیم)', en: 'Top buttons', sel: '.btn-logout,.btn-lang-settings,.btn-theme-toggle', ctl: 'sfb' },
                    { id: 'all', ur: 'سب برانچز کی رپورٹ کا بٹن', en: 'All-branches report button', sel: '.btn-all-report', ctl: 'sfb' },
                    { id: 'card', ur: 'برانچ کے کارڈ (ڈبے)', en: 'Branch cards', sel: '.branch-card', ctl: 'b' },
                    { id: 'name', ur: 'برانچ کا نام', en: 'Branch name', sel: '.branch-name', ctl: 'sf' },
                    { id: 'num', ur: 'برانچ کا نمبر (بیج)', en: 'Branch number badge', sel: '.branch-num-badge', ctl: 'sf' },
                    { id: 'icon', ur: 'برانچ کا آئیکن', en: 'Branch icon', sel: '.branch-icon', ctl: 'sf' },
                    { id: 'stat', ur: 'برانچ کی حالت', en: 'Branch status', sel: '.branch-status', ctl: 'sf' }
                ] },
                { id: 'allbr', files: ['all_branches'], ico: '🏙️', c: '#ad1457', ur: 'سب برانچز کی رپورٹ', en: 'All Branches Report', g: [
                    { id: 'title', ur: 'صفحے کا نام', en: 'Page title', sel: '.hd h1', ctl: 'sf' },
                    { id: 'btn', ur: 'بٹن (واپس / پرنٹ / فلٹر)', en: 'Buttons', sel: '.hd .btn,.bar .btn', ctl: 'sfb' },
                    { id: 'card', ur: 'اوپر کے خلاصہ ڈبے', en: 'Summary boxes', sel: '#hero>div,.cards>*,.card', ctl: 'b' },
                    { id: 'cardl', ur: 'ڈبے کا نام', en: 'Box label', sel: '#hero small,.card small,.cards small', ctl: 'sf' },
                    { id: 'cardv', ur: 'ڈبے کی رقم', en: 'Box value', sel: '#hero b,.card b,.cards b', ctl: 'sf' },
                    { id: 'sec', ur: 'حصوں کے عنوان (چارٹ / جدول)', en: 'Section titles', sel: '.sec', ctl: 'sf' },
                    { id: 'bc', ur: 'برانچ کے کارڈ', en: 'Branch cards', sel: '.bc', ctl: 'b' },
                    { id: 'bch', ur: 'برانچ کارڈ کا عنوان', en: 'Branch card heading', sel: '.bc-h', ctl: 'sf' },
                    { id: 'bcr', ur: 'برانچ کارڈ کی قطاریں', en: 'Branch card rows', sel: '.bc-r', ctl: 'sf' },
                    { id: 'bcn', ur: 'برانچ کارڈ کا خالص حساب', en: 'Branch card net', sel: '.bc-net', ctl: 'sf' },
                    { id: 'bca', ur: 'برانچ کارڈ کے بٹن', en: 'Branch card buttons', sel: '.bc-act .btn', ctl: 'sfb' },
                    { id: 'th', ur: 'ہیڈر (کالموں کے نام)', en: 'Table header', sel: 'table th', ctl: 'sfhw' },
                    { id: 'tx', ur: 'متن (نام)', en: 'Text cells', sel: 'table td:not(.ubg-num):not(.ubg-acc)', ctl: 'sf' },
                    { id: 'num', ur: 'نمبر / رقم', en: 'Numbers', sel: 'table td.ubg-num', ctl: 'sf' }
                ] }
            ];
            var pg = (location.pathname.split('/').pop() || '').replace(/\.html?$/i, '');
            var cur = null; P.forEach(function (p) { if (p.files.indexOf(pg) >= 0) cur = p; });
            if (!cur) return;
            var K = function (g, x) { return localStorage.getItem('rohan_sz_' + cur.id + '_' + g.id + '_' + x) || ''; };
            var N = function (v) { v = parseInt(v, 10); return v >= 1 && v <= 100 ? v : 0; };
            var css = '', sc = function (sel, deco) { return sel.split(',').map(function (x) { return 'html body:not(#ubgZ) ' + x.trim() + deco; }).join(','); };
            cur.g.forEach(function (g) {
                var s = N(K(g, 's')), f = K(g, 'f'), b = N(K(g, 'b')), h = N(K(g, 'h')), w = N(K(g, 'w'));
                if (s || f) { css += sc(g.sel, '') + ',' + sc(g.sel, ' *') + '{' + (s ? 'font-size:' + s + 'px!important;' : '') + (f ? 'font-family:' + f + '!important;' : '') + '}'; if (/\bt(d|h)\b/.test(g.sel) || /table/.test(g.sel)) window.__ubgNeedTag = true; }
                if (b) css += sc(g.sel, '') + '{zoom:' + (0.5 + b / 100).toFixed(2) + '!important}';
                if (h) css += sc(g.sel, '') + '{' + (/table/.test(g.sel) ? 'height:' + h + 'px!important;padding-top:' + Math.round(h / 4) + 'px!important;padding-bottom:' + Math.round(h / 4) + 'px!important' : 'min-height:' + h + 'px!important;height:' + h + 'px!important') + '}';
                if (w) css += sc(g.sel, '') + '{min-width:' + w + 'ch!important}';
                if (g.sel.indexOf('td.ubg') >= 0 || g.sel.indexOf('td:not(.ubg') >= 0 || g.sel.indexOf('ubg-') >= 0) window.__ubgNeedTag = true;
            });
            if (css) gcss += '@media screen{' + css + '}';
        })();
        (function () {
            var g = function (k) { return localStorage.getItem('rohan_' + k) || ''; };
            var n = function (k) { var v = parseInt(g(k), 10); return v >= 1 && v <= 100 ? v : 0; };
            var ts = n('tbl_text_size'), ns = n('tbl_num_size'), hs = n('tbl_head_size'), as_ = n('tbl_acc_size'), rh = n('tbl_row_h'), cw = n('tbl_col_w');
            var tf = g('tbl_text_font'), nf = g('tbl_num_font'), hf = g('tbl_head_font'), af = g('tbl_acc_font');
            var T = 'html body table:not(#ubgZ):not(.zz):not(.zy) ';
            var fx = function (sz, ff) { return (sz ? 'font-size:' + sz + 'px!important;' : '') + (ff ? 'font-family:' + ff + '!important;' : ''); };
            if (hs || hf) gcss += T + 'tr:not(.print-repeat-row)>th,' + T + 'tr:not(.print-repeat-row)>th *{' + fx(hs, hf) + '}';
            if (ts || tf) gcss += T + 'td:not(.ubg-num):not(.ubg-acc),' + T + 'td:not(.ubg-num):not(.ubg-acc) *{' + fx(ts, tf) + '}';
            if (ns || nf) gcss += T + 'td.ubg-num:not(.ubg-acc),' + T + 'td.ubg-num:not(.ubg-acc) *{' + fx(ns, nf) + '}';
            if (as_ || af) gcss += T + 'td.ubg-acc,' + T + 'td.ubg-acc *{' + fx(as_, af) + '}';
            if (/audit_log\.html$/i.test(location.pathname)) {
                var A = 'html body .wrap ';
                if (hs || hf) gcss += A + '.rc small,' + A + '.rc small *{' + fx(hs, hf) + '}';
                if (ts || tf) gcss += A + '.rc b,' + A + '.rt,' + A + '.ch{' + fx(ts, tf) + '}';
            }
            if (rh) gcss += T + 'th,' + T + 'td{height:' + rh + 'px!important;padding-top:' + Math.round(rh / 4) + 'px!important;padding-bottom:' + Math.round(rh / 4) + 'px!important}';
            if (cw) gcss += '@media screen{' + T + 'th{min-width:' + cw + 'ch!important}}';
            if (ns || nf || as_ || af || window.__ubgNeedTag) {
                var ACC = /^\s*(کھاتہ|کھاتا|اکاؤنٹ|acc|a\/c|account)/i;
                var tag = function () {
                    Array.prototype.forEach.call(D.querySelectorAll('table'), function (tb) {
                        var ths = tb.querySelectorAll('thead tr:last-child th'), accIdx = -1;
                        for (var k = 0; k < ths.length; k++) if (ACC.test(ths[k].textContent || '')) { accIdx = k; break; }
                        Array.prototype.forEach.call(tb.querySelectorAll('tbody tr'), function (tr) {
                            var tds = tr.children;
                            Array.prototype.forEach.call(tds, function (td, idx) {
                                if (td.tagName !== 'TD') return;
                                if (td.classList.contains('acc-no-cell') || (accIdx >= 0 && idx === accIdx && tds.length === ths.length)) { td.classList.add('ubg-acc'); return; }
                                if (td.classList.contains('ubg-num')) return;
                                var t = (td.textContent || '').trim();
                                if (t && t.length < 25 && /\d/.test(t) && /^[\s\d,.\-+()%\/:]+\s*(ج|ب|cr|dr)?$/i.test(t)) td.classList.add('ubg-num');
                            });
                        });
                    });
                };
                var tm = 0, go = function () { clearTimeout(tm); tm = setTimeout(tag, 80); };
                D.addEventListener('DOMContentLoaded', function () { tag(); try { new MutationObserver(go).observe(D.body, { childList: true, subtree: true, characterData: true }); } catch (e) {} });
            }
        })();

        if (localStorage.getItem('rohan_reduce_motion') === '1') gcss += '*,*::before,*::after{transition:none!important;animation:none!important}';
        if (gcss) { var gst = D.createElement('style'); gst.textContent = gcss; D.head.appendChild(gst); }
        var pp = localStorage.getItem('rohan_print_paper'), po = localStorage.getItem('rohan_print_orient');
        if (pp || po) D.addEventListener('DOMContentLoaded', function () {
            var pst = D.createElement('style'); pst.textContent = '@media print{@page{size:' + (pp || 'A4') + ' ' + (po || 'portrait') + '}}'; D.head.appendChild(pst);
        });
    } catch (e) {}

    if (!isIndex) {
        var lastTouch = 0, limit = function () { var m = parseInt(localStorage.getItem('rohan_idle_minutes'), 10); return (m > 0 ? m : APP_CONFIG.SESSION_TIMEOUT_MIN) * 60000; };
        var check = function () {
            try {
                var t = parseInt(sessionStorage.getItem('rohan_last_activity'), 10);
                if (t && Date.now() - t > limit()) {
                    var en = isEnLang(); sessionStorage.clear();
                    try { alert(T(en, '⏱️ کافی دیر سے کوئی کام نہیں ہوا، حفاظت کے لیے لاگ آؤٹ کر دیا گیا ہے۔', '⏱️ Logged out for security after inactivity.')); } catch (e) {}
                    location.replace('./index.html');
                }
            } catch (e) {}
        };
        var touch = function () { var n = Date.now(); if (n - lastTouch < 5000) return; lastTouch = n; try { sessionStorage.setItem('rohan_last_activity', String(n)); } catch (e) {} };
        check(); lastTouch = 0; touch();
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { D.addEventListener(ev, touch, true); });
        setInterval(check, 30000);
        w.addEventListener('pageshow', check);
    }

    try {
        var l = D.createElement('link'); l.rel = 'manifest'; l.href = './manifest.json'; D.head.appendChild(l);
        if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
            navigator.serviceWorker.register('./sw.js').catch(function () {});
        }
    } catch (e) {}

    /* ---- Single-language guarantee ----
       Static markup may carry bilingual labels ("اردو / English", "اردو (English)") or Urdu-only text.
       Once, before the page's own scripts run, every static text / placeholder / title is reduced to the active language.
       Page scripts that render data build their own strings with isEn. */
    var I18N_EN = {};      // Urdu -> English (exact, whitespace-normalised)
    var I18N_UR = {};      // English -> Urdu (exact), filled from I18N_EN plus extras
    function i18nAdd(map) { Object.keys(map).forEach(function (k) { I18N_EN[k] = map[k]; if (!I18N_UR[map[k]]) I18N_UR[map[k]] = k; }); }
    i18nAdd({
 "⚠️ آپ کے پاس سیٹنگز اور ترمیم کی اجازت نہیں ہے! یہ اختیار صرف ایڈمن کے لیے ہے۔": "⚠️ You do not have permission for settings and editing! This is for the admin only.",
 "یوزر نیم 3 سے 30 چھوٹے انگریزی حروف/ہندسے/_ . - ہو": "Username must be 3 to 30 lowercase letters/digits/_ . -",
 "⏳ بہت زیادہ کوششیں، کچھ دیر بعد کوشش کریں": "⏳ Too many attempts, try again after a while",
 "کردار درست نہیں": "Invalid role", "کم از کم ایک برانچ چنیں": "Choose at least one branch", "نئے صارف کے لیے پاس ورڈ لازمی ہے": "A password is required for a new user",
 "پاس ورڈ کم از کم 6 حروف کا ہو": "Password must be at least 6 characters", "⚠️ اجازت نہیں ہے!": "⚠️ Not allowed!", "⚠️ محفوظ نہیں ہوا": "⚠️ Not saved", "✅ صارف محفوظ ہو گیا": "✅ User saved",
 "⏳ بار بار غلط کوشش: 30 سیکنڈ بعد دوبارہ کوشش کریں": "⏳ Too many wrong attempts: try again in 30 seconds",
 "کھلا بیلنس کو روزانہ / ماہانہ جمع بنام کے ٹوٹل میں گنیں (بند ہو تو وہ روزنامچے میں «پرانا حساب» میں جاتا ہے؛ کھاتے کا بیلنس ہر صورت میں شامل رہتا ہے)": "Count the Opening balance in the daily / monthly Jama-Bnam totals (when off, it goes to \"Old balance\" in the daily journal; the account balance always includes it)",
 "سمری میں نگ / وزن کی لائن": "Pcs / Weight line in the summary",
 "اضافی کالم": "Extra Field",
 "نیا یوزر نیم": "New username",

 "سسٹم میں داخل ہوں": "Log In",
 "❌ یوزر نیم یا پاس ورڈ درست نہیں ہے!": "❌ Username or password is incorrect!",
 "تھیم تبدیل کریں": "Change theme",
 "یوزر نیم درج کریں": "Enter username",
 "زبان": "Language",
 "برانچز": "Branches",
 "ظاہری شکل": "Appearance",
 "پرنٹ": "Print",
 "حفاظت": "Security",
 "اونر کی اجازتیں": "Owner Permissions",
 "صارفین": "Users",
 "بیک اپ": "Backup",
 "برانچز کا نام، نمبر، اونر، آئیکن، رنگ اور زبان تبدیل کریں:": "Change branch name, number, owner, icon, color and language:",
 "نمبر": "No.",
 "آئیکن": "Icon",
 "اردو نام": "Urdu Name",
 "اونر کا نام": "Owner Name",
 "یوزر نیم": "Username",
 "کردار": "Role",
 "برانچیں": "Branches",
 "➕ نیا صارف": "➕ New User",
 "یوزر نیم (چھوٹے انگریزی حروف/ہندسے، کم از کم 3):": "Username (lowercase letters/digits, at least 3):",
 "کردار:": "Role:",
 "پاس ورڈ (کم از کم 6؛ ایڈٹ میں خالی چھوڑیں تو نہیں بدلے گا):": "Password (at least 6; leave empty when editing to keep it):",
 "مثلاً ali": "e.g. ali",
 "37.324 کلو (کچا من / میٹل)": "37.324 kg (Kacha maund / metal)",
 "40 کلو (پکا من / غلہ و جنرل)": "40 kg (Pakka maund / grain & general)",
 "پرسنٹیج (%) فارمولا لاگو کریں": "Apply percentage (%) formula",
 "پرسنٹیج کی قسم:": "Percentage type:",
 "کالم کی فیلڈ": "Column field",
 "فعال (آن / آف)": "Active (On / Off)",
 "کالم کا نیا نام": "New column name",
 "فعال": "Active",
 "ہمیشہ فعال": "Always active",
 "فعال کریں": "Enable",
 "روکڑ سمری شیٹ میں باکسز کی پوزیشن:": "Box position in the Cash Summary sheet:",
 "کسٹمر لیجر میں باکسز کی پوزیشن:": "Box position in the Customer Ledger:",
 "ڈیلیٹ شدہ انٹریاں اتنے دن بعد مستقل صاف (0 = کبھی نہیں):": "Permanently purge deleted entries after this many days (0 = never):",
 "رقم کی حد، اس سے بڑی انٹری پر وارننگ (0 = بند):": "Amount limit, warn on a larger entry (0 = off):",
 "نئے گاہک کی ڈیفالٹ کریڈٹ لمٹ (0 = کوئی نہیں):": "Default credit limit for a new customer (0 = none):",
 "🧮 ڈیش بورڈ کے اپنے بکس": "🧮 Your Own Dashboard Boxes",
 "➕ کھاتے کا حساب (کھاتہ + بل)": "➕ Account balance (account + bill)",
 "➕ فیکٹری کا حساب (بل کا ریٹ)": "➕ Factory account (bill rate)",
 "➕ خرچہ بکس (صرف رقم، اپنی مرضی کی)": "➕ Expense box (amount only, your own)",
 "➕ وزن کا کھاتہ (صرف وزن، ضائع مال)": "➕ Weight account (weight only, wasted goods)",
 "➕ آخری خالص حساب (فیکٹری − ضائع وزن − خرچہ = ریٹ)": "➕ Final net account (factory − waste weight − expense = rate)",
 "بکس محفوظ کریں ✅": "Save boxes ✅",
 "مثلاً: 25000": "e.g. 25000",
 "فیصد شرح (مثلاً: 2 یا 5)": "Percentage rate (e.g. 2 or 5)",
 "مثلاً: پیس / کارٹن": "e.g. Pcs / Carton",
 "مثلاً: وزن": "e.g. Weight",
 "مثلاً: ریٹ": "e.g. Rate",
 "مثلاً: کل رقم": "e.g. Total Amount",
 "کالم کا نام (مثلاً: بنڈل # / گاڑی #)": "Column name (e.g. Bundle # / Vehicle #)",
 "اضافی معلومات لکھیں...": "Enter extra information...",
 "فارمولا تبدیل کریں": "Change formula",
 "پیس لکھیں...": "Enter pieces...",
 "وزن لکھیں...": "Enter weight...",
 "ریٹ لکھیں...": "Enter rate...",
 "سمری میں نگ / وزن کی لائن (Pcs / Weight Line)": "Pcs / Weight line in the summary",
 "کھلا بیلنس (Opening) کو روزانہ / ماہانہ جمع بنام کے ٹوٹل میں گنیں (بند ہو تو وہ روزنامچے میں «پرانا حساب» میں جاتا ہے؛ کھاتے کا بیلنس ہر صورت میں شامل رہتا ہے)": "Count the Opening balance in the daily / monthly Jama-Bnam totals (when off, it goes to \"Old balance\" in the daily journal; the account balance always includes it)",
 "ایجنگ رپورٹ": "Ageing Report",
 "سب برانچز": "All Branches",
 "آڈٹ لاگ": "Audit Log",
 "ڈیلیٹ شدہ انٹریاں": "Deleted Entries",
 "ڈیلیٹ شدہ کھاتوں کا ریکارڈ": "Deleted Accounts Record",
 "میرے الفاظ": "My Words",
 "مثلاً: عطاء اللہ ، میزان بینک": "e.g. Ataullah, Meezan Bank"
});
    Object.assign(I18N_UR, {"UNIT BUSINESS": "یونٹ بزنس", "GROUP": "گروپ", "Unit Business Group Logo": "یونٹ بزنس گروپ لوگو", "Logo": "لوگو", "Unit Business Group": "یونٹ بزنس گروپ", "English Name": "انگریزی نام", "DD/MM/YYYY": "دن/ماہ/سال", "MM/DD/YYYY": "ماہ/دن/سال", "YYYY-MM-DD": "سال-ماہ-دن", "Letter": "لیٹر", "Legal": "لیگل", "Excel": "ایکسل", "📗 Excel": "📗 ایکسل", "Date:": "تاریخ:", "Urdu ۲": "اردو ۲"});
    var I18N_BOTH = {"⚠️ سرور موڈ میں صارف سرور پر بنتے ہیں۔ Users are managed on the server.": ["⚠️ سرور موڈ میں صارف سرور پر بنتے ہیں۔", "⚠️ In server mode, users are managed on the server."], "🇵🇰 اردو (Urdu - RTL)": ["🇵🇰 اردو", "🇵🇰 Urdu"], "🇬🇧 English (LTR)": ["🇬🇧 انگریزی", "🇬🇧 English"], "Owner (مالک)": ["مالک", "Owner"], "Admin (ایڈمن)": ["ایڈمن", "Admin"]};
    Object.keys(I18N_BOTH).forEach(function (k) { I18N_UR[k] = I18N_BOTH[k][0]; I18N_EN[k] = I18N_BOTH[k][1]; });
    function pageLangIsEn() {
        try {
            if (isIndex || path === 'branches.html') return (localStorage.getItem('rohan_global_lang') || 'ur') === 'en';
        } catch (e) {}
        return isEnLang();
    }
    var RE_AR = /[؀-ۿﭐ-﷿ﹰ-﻿]/, RE_LAT = /[A-Za-z]/;
    function digitsEn(s) { return s.replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); }); }
    function leadSym(s) { var m = /^[^A-Za-z؀-ۿ]*/.exec(s); return m ? m[0] : ''; }
    function bal(x) { return (x.match(/\(/g) || []).length === (x.match(/\)/g) || []).length; }
    function biPick(s, en) {
        var t = s.replace(/\s+/g, ' ').trim(), m;
        if (!t) return null;
        var hasAr = RE_AR.test(t), hasLat = RE_LAT.test(t);
        if (hasAr && hasLat) {
            if ((m = /^(.*[؀-ۿﭐ-﷿ﹰ-﻿].*?)\s+\/\s+([^؀-ۿ]*[A-Za-z][^؀-ۿ]*)$/.exec(t))) {
                if (bal(m[1]) && bal(m[2])) {
                var ur = m[1], e = m[2].trim(), colon = /[:：]$/.test(e) && !/[:：]$/.test(ur) ? ':' : '';
                return en ? e : ur + colon;
                }
            }
            if ((m = /^(.*[؀-ۿﭐ-﷿ﹰ-﻿].*?)\s*\(([^؀-ۿ()]*[A-Za-z][^؀-ۿ()]*)\)\s*([^؀-ۿ]*)$/.exec(t))) {
                var tail = m[3].trim();
                return en ? digitsEn(leadSym(m[1])) + m[2].split(/\s+\/\s+/).pop().trim() + (tail ? ' ' + tail : '') : m[1].replace(/\s*[-–]\s*$/, '').trim() + (tail ? ' ' + tail : '');
            }
            if ((m = /^\(([^؀-ۿ()]*[A-Za-z][^؀-ۿ()]*)\)\s*(.*[؀-ۿ].*)$/.exec(t))) { return en ? m[1].trim() : m[2].trim(); }
            if ((m = /^([A-Za-z][^؀-ۿ]*?)\s*\(([^()]*[؀-ۿ][^()]*)\)\s*([^؀-ۿ]*)$/.exec(t))) {
                return en ? m[1].trim() + (m[3] ? ' ' + m[3].trim() : '') : m[2].trim() + (m[3] ? ' ' + m[3].trim() : '');
            }
        }
        return null;
    }
    function i18nText(s, en) {
        var t = s.replace(/\s+/g, ' ').trim(); if (!t) return null;
        var d = en ? I18N_EN : I18N_UR;
        if (Object.prototype.hasOwnProperty.call(d, t)) return d[t];
        var b = biPick(t, en); if (b !== null) { if (Object.prototype.hasOwnProperty.call(d, b)) return d[b]; return b; }
        return null;
    }
    function i18nApply(root, en) {
        var w = D.createTreeWalker(root || D.body, NodeFilter.SHOW_TEXT), n, list = [];
        while ((n = w.nextNode())) { var p = n.parentElement; if (p && !/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.tagName) && !p.closest('[data-no-i18n]')) list.push(n); }
        list.forEach(function (n) {
            var r = i18nText(n.nodeValue, en); if (r === null) return;
            var m = /^(\s*)[\s\S]*?(\s*)$/.exec(n.nodeValue); n.nodeValue = (m ? m[1] : '') + r + (m ? m[2] : '');
        });
        (root || D).querySelectorAll('[placeholder],[title],[alt],[aria-label],input[type=button],input[type=submit]').forEach(function (e) {
            ['placeholder', 'title', 'alt', 'aria-label'].forEach(function (a) { var v = e.getAttribute(a); if (v) { var r = i18nText(v, en); if (r !== null) e.setAttribute(a, r); } });
            if (/^(button|submit)$/.test(e.type || '') && e.tagName === 'INPUT') { var r2 = i18nText(e.value, en); if (r2 !== null) e.value = r2; }
        });
        if (!root || root === D.body) {
            var tp = D.title.split(' - ').map(function (x) {
                var r = i18nText(x, en); if (r !== null) return r;
                return /^unit business group$/i.test(x.trim()) ? (en ? 'Unit Business Group' : 'یونٹ بزنس گروپ') : x;
            });
            D.title = tp.join(' - ');
        }
    }
    function i18nMsg(s) { return typeof s === 'string' ? (function () { var en = pageLangIsEn(), r = i18nText(s, en); return r === null ? s : r; })() : s; }
    App.i18n = { add: i18nAdd, text: function (s) { return i18nMsg(s); }, apply: function (root) { i18nApply(root || D.body, pageLangIsEn()); }, isEn: pageLangIsEn };
    function msgLines(s, en) {
        var ls = s.split('\n');
        if (ls.length > 1 && ls.some(function (l) { return RE_AR.test(l); }) && ls.some(function (l) { return RE_LAT.test(l) && !RE_AR.test(l); })) {
            ls = ls.filter(function (l) { return en ? !RE_AR.test(l) : !(RE_LAT.test(l) && !RE_AR.test(l)); });
            return ls.join('\n');
        }
        return null;
    }
    function i18nMsg2(s) {
        if (typeof s !== 'string') return s;
        var en = pageLangIsEn(), one = msgLines(s, en); if (one !== null) s = one;
        var parts = s.split('\n').map(function (l) { var r = i18nText(l, en); return r === null ? l : r; });
        return parts.join('\n');
    }
    ['alert', 'confirm', 'prompt'].forEach(function (fn) {
        var orig = w[fn]; if (!orig) return;
        w[fn] = function (m, d) { return fn === 'prompt' ? orig.call(w, i18nMsg2(m), d) : orig.call(w, i18nMsg2(m)); };
    });
    App.i18n.text = i18nMsg2;
    /* Fixed positions in both languages: Back = left, Print / Settings = right (direction of the row is always LTR). */
    (function () {
        var rows = '.header-top-bar,.top-header,.hd,.header-area,.header-container,.archive-header,#ledgerHeaderSection,.menu-head,.chart-header-row,.bar';
        var kids = rows.split(',').map(function (r) { return r + '>*'; }).join(',');
        var back = '.btn-top-back,.btn-back,#btnBack,#btnBackHome,#btnLedgerBack,#backToBranchesBtn';
        var prt = '.btn-print,#btnDashPrint,#btnPrintSummary,#btnPrintJournal,#btnLedgerPrint,#btnOut,#btnSettingsMenu';
        function inject() {
            if (D.getElementById('ubg-nav-style')) return;
            var st = D.createElement('style'); st.id = 'ubg-nav-style';
            st.textContent = '@media screen{' + rows + '{direction:ltr!important}' + kids + '{direction:var(--ubg-dir,rtl)}' +
                back + '{order:-1!important;margin-left:0!important;margin-right:0!important}' + prt + '{order:99!important}}';
            D.head.appendChild(st);
            D.documentElement.style.setProperty('--ubg-dir', pageLangIsEn() ? 'ltr' : 'rtl');
        }
        if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', inject); else inject();
    })();
    function runI18n() { try { i18nApply(D.body, pageLangIsEn()); } catch (e) { console.warn('i18n', e); } }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', runI18n); else runI18n();

    try { if (!isIndex && App.getBranchId()) assignSerials(App.getBranchId()); } catch (e) { console.warn('serials', e); }
})(window);
