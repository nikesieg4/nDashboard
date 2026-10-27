/* Erzeugt mit tools/build-portal.sh aus portal/ – nicht von Hand ändern. */
(() => {
  // portal/shim/react.js
  var R = window.React;
  var react_default = R;
  var { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext, Fragment, createElement } = R;

  // portal/lib/model.js
  var { KEYS, KEY_LABEL, keyReadLevel, keyWriteLevel, CLEARANCE, IS_LABEL, APP_STEPS, MINISTRIES, ORGANE, BUNDES, ALL_UNITS, unitShort, PORTAL_NAV, CAPS, can, normPerm, normUnit, grantsFor, buildMe, consoleAllowed, bankAdmin, maxAssignableLevel, REDACT_TIERS, tierRank, isJusticeOfficer, isPoliceOfficer, canSeeRecords, canDeleteRecord, viewerRank, clampTier, redact, canHandleApplication, manageableUnits, normType, inferUnitFromLabel, canHandleAppt, electionPhase, voteIdx, voteAt, nameParts, displayName, initials, CITIZEN_DOMAIN, loginEmailFor, genPassword, sha256Hex, uuidOk, shortId, fmtMinor, fmtM, parseMinor, fmtRate, fmtD, fmtT, fmtDT, fmtISO, fmtDay, relTime, fmtBytes, jsonSize, berlinToday, TX_TYPE, TX_STATUS, TX_AUTH, PAY_TYPE_LABEL, JOURNAL_CATEGORY, FAIL_TXT, SO_INTERVAL, SO_STATUS, SO_RUN, buildCsv, downloadText } = window.NDPortalModel;

  // portal/lib/state.jsx
  function useApp() {
    return window.NDPortal.internal.usePortal();
  }

  // portal/lib/db.js
  var I = window.NDPortal.internal;
  var sb = I.sb;
  var adminAction = I.adminAction;
  var Store = {
    async all() {
      const { data, error } = await sb.from("kv").select("key, value, updated_at");
      if (error) throw error;
      return data || [];
    },
    getRaw: I.getRaw,
    async set(key, value) {
      const { error } = await sb.from("kv").upsert({ key, value, updated_at: (/* @__PURE__ */ new Date()).toISOString() }, { onConflict: "key" });
      if (error) throw error;
    },
    mutate: I.kvMutate
  };
  var Bank = { call: I.bankCall };
  var Monitor = { query: I.monitorQuery, rpc: I.monitorRpc, logAction: I.logAction };
  var pingDb = I.pingDb;
  var pingFunction = I.pingFunction;
  var Auth = {
    async changePassword(current, next) {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return { ok: false, reason: "Nicht angemeldet." };
        const check = await sb.auth.signInWithPassword({ email: user.email, password: current });
        if (check.error) return { ok: false, reason: "Aktuelles Passwort ist falsch." };
        const { error } = await sb.auth.updateUser({ password: next });
        if (error) return { ok: false, reason: error.message || "Änderung fehlgeschlagen." };
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: "Änderung fehlgeschlagen." };
      }
    }
  };
  function newKey() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) {
    }
    const a = new Uint8Array(16);
    window.crypto.getRandomValues(a);
    return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // portal/lib/format.js
  var { KEYS: KEYS2, KEY_LABEL: KEY_LABEL2, keyReadLevel: keyReadLevel2, keyWriteLevel: keyWriteLevel2, CLEARANCE: CLEARANCE2, IS_LABEL: IS_LABEL2, APP_STEPS: APP_STEPS2, MINISTRIES: MINISTRIES2, ORGANE: ORGANE2, BUNDES: BUNDES2, ALL_UNITS: ALL_UNITS2, unitShort: unitShort2, PORTAL_NAV: PORTAL_NAV2, CAPS: CAPS2, can: can2, normPerm: normPerm2, normUnit: normUnit2, grantsFor: grantsFor2, buildMe: buildMe2, consoleAllowed: consoleAllowed2, bankAdmin: bankAdmin2, maxAssignableLevel: maxAssignableLevel2, REDACT_TIERS: REDACT_TIERS2, tierRank: tierRank2, isJusticeOfficer: isJusticeOfficer2, isPoliceOfficer: isPoliceOfficer2, canSeeRecords: canSeeRecords2, canDeleteRecord: canDeleteRecord2, viewerRank: viewerRank2, clampTier: clampTier2, redact: redact2, canHandleApplication: canHandleApplication2, manageableUnits: manageableUnits2, normType: normType2, inferUnitFromLabel: inferUnitFromLabel2, canHandleAppt: canHandleAppt2, electionPhase: electionPhase2, voteIdx: voteIdx2, voteAt: voteAt2, nameParts: nameParts2, displayName: displayName2, initials: initials2, CITIZEN_DOMAIN: CITIZEN_DOMAIN2, loginEmailFor: loginEmailFor2, genPassword: genPassword2, sha256Hex: sha256Hex2, uuidOk: uuidOk2, shortId: shortId2, fmtMinor: fmtMinor2, fmtM: fmtM2, parseMinor: parseMinor2, fmtRate: fmtRate2, fmtD: fmtD2, fmtT: fmtT2, fmtDT: fmtDT2, fmtISO: fmtISO2, fmtDay: fmtDay2, relTime: relTime2, fmtBytes: fmtBytes2, jsonSize: jsonSize2, berlinToday: berlinToday2, TX_TYPE: TX_TYPE2, TX_STATUS: TX_STATUS2, TX_AUTH: TX_AUTH2, PAY_TYPE_LABEL: PAY_TYPE_LABEL2, JOURNAL_CATEGORY: JOURNAL_CATEGORY2, FAIL_TXT: FAIL_TXT2, SO_INTERVAL: SO_INTERVAL2, SO_STATUS: SO_STATUS2, SO_RUN: SO_RUN2, buildCsv: buildCsv2, downloadText: downloadText2 } = window.NDPortalModel;

  // portal/components/ui.jsx
  var ICON = {
    shield: "M12 2l8 3.5v6c0 5-3.6 8.8-8 10.5-4.4-1.7-8-5.5-8-10.5v-6z",
    log: "M4 6h16M4 12h16M4 18h10",
    db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
    tx: "M4 8h13l-3-3M20 16H7l3 3",
    warn: "M12 3l10 18H2zM12 10v5M12 18v.5",
    pulse: "M3 12h4l3-7 4 14 3-7h4",
    lock: "M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4",
    users: "M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 20v-2a4 4 0 0 0-3-3.9M16 2.1a4 4 0 0 1 0 7.8",
    bank: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
    check: "M5 12l5 5 9-10",
    power: "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"
  };
  function Icon({ d, size = 20, sw = 1.6, style }) {
    return /* @__PURE__ */ react_default.createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: sw,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        style
      },
      /* @__PURE__ */ react_default.createElement("path", { d })
    );
  }
  function Btn({ variant, size, block, className = "", ...rest }) {
    const cls = ["btn", variant ? "btn-" + variant : "", size ? "btn-" + size : "", block ? "btn-block" : "", className].filter(Boolean).join(" ");
    return /* @__PURE__ */ react_default.createElement("button", { type: "button", className: cls, ...rest });
  }
  function Badge({ tone, children, title }) {
    return /* @__PURE__ */ react_default.createElement("span", { className: "badge " + (tone || ""), title }, children);
  }
  function Msg({ m }) {
    if (!m) return null;
    return /* @__PURE__ */ react_default.createElement("div", { className: "msg " + (m.ok ? "ok" : m.tone || "bad"), role: m.ok ? "status" : "alert" }, m.text);
  }
  function Field({ label, hint, error, children }) {
    return /* @__PURE__ */ react_default.createElement("label", { className: "field" }, label, children, error ? /* @__PURE__ */ react_default.createElement("span", { className: "err" }, error) : hint ? /* @__PURE__ */ react_default.createElement("span", { className: "hint" }, hint) : null);
  }
  function Input({ label, hint, error, mono, className = "", ...rest }) {
    return /* @__PURE__ */ react_default.createElement(Field, { label, hint, error }, /* @__PURE__ */ react_default.createElement("input", { className: "input " + (mono ? "mono " : "") + className, ...rest }));
  }
  function Select({ label, hint, children, ...rest }) {
    return /* @__PURE__ */ react_default.createElement(Field, { label, hint }, /* @__PURE__ */ react_default.createElement("select", { className: "select", ...rest }, children));
  }
  function Textarea({ label, hint, ...rest }) {
    return /* @__PURE__ */ react_default.createElement(Field, { label, hint }, /* @__PURE__ */ react_default.createElement("textarea", { className: "textarea", rows: 3, ...rest }));
  }
  function Panel({ title, actions, children, className = "", pad = true }) {
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel " + className }, (title || actions) && /* @__PURE__ */ react_default.createElement("div", { className: "panel-h" }, typeof title === "string" ? /* @__PURE__ */ react_default.createElement("h2", null, title) : title, actions && /* @__PURE__ */ react_default.createElement("div", { className: "row" }, actions)), pad ? /* @__PURE__ */ react_default.createElement("div", { className: "panel-b" }, children) : children);
  }
  function Corners({ yellow, children, className = "", innerStyle }) {
    return /* @__PURE__ */ react_default.createElement("div", { className: "corners " + (yellow ? "y " : "") + className }, /* @__PURE__ */ react_default.createElement("div", { className: "inner", style: innerStyle }, children));
  }
  function Stat({ k, v, m, tone, icon, spark, onClick }) {
    const body = /* @__PURE__ */ react_default.createElement(Corners, null, /* @__PURE__ */ react_default.createElement("div", { className: "stat" }, /* @__PURE__ */ react_default.createElement("div", { className: "stat-text" }, icon && /* @__PURE__ */ react_default.createElement("span", { className: "stat-icon" }, /* @__PURE__ */ react_default.createElement(Icon, { d: icon, size: 22 })), /* @__PURE__ */ react_default.createElement("span", { className: "stat-k" }, k), /* @__PURE__ */ react_default.createElement("span", { className: "stat-v " + (tone || "") }, v), m && /* @__PURE__ */ react_default.createElement("span", { className: "stat-m" }, m)), spark && spark.length > 1 && /* @__PURE__ */ react_default.createElement(Spark, { values: spark })));
    return onClick ? /* @__PURE__ */ react_default.createElement("button", { type: "button", className: "stat-btn", onClick }, body) : body;
  }
  function Spark({ values, w = 64, h = 74 }) {
    const max = Math.max(1, ...values), min = Math.min(0, ...values);
    const pts = values.map((v, i) => [i / (values.length - 1) * w, h - (v - min) / (max - min || 1) * (h - 6) - 2]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return /* @__PURE__ */ react_default.createElement("svg", { width: w, height: h, viewBox: `0 0 ${w} ${h}`, "aria-hidden": "true", style: { flexShrink: 0 } }, /* @__PURE__ */ react_default.createElement("path", { d: line + ` L${w} ${h} L0 ${h} Z`, fill: "var(--y-fill)" }), /* @__PURE__ */ react_default.createElement("path", { d: line, fill: "none", stroke: "var(--y)", strokeWidth: "1.6" }));
  }
  function Dialog({ title, onClose, wide, children }) {
    react_default.useEffect(() => {
      const f = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", f);
      return () => window.removeEventListener("keydown", f);
    }, [onClose]);
    return /* @__PURE__ */ react_default.createElement("div", { className: "dialog-back", onMouseDown: (e) => {
      if (e.target === e.currentTarget) onClose();
    } }, /* @__PURE__ */ react_default.createElement("div", { className: "dialog " + (wide ? "wide" : ""), role: "dialog", "aria-modal": "true", "aria-label": title }, /* @__PURE__ */ react_default.createElement("div", { className: "dialog-h" }, /* @__PURE__ */ react_default.createElement("h2", null, title), /* @__PURE__ */ react_default.createElement("button", { type: "button", className: "x-btn", onClick: onClose, "aria-label": "Schließen" }, "✕")), /* @__PURE__ */ react_default.createElement("div", { className: "dialog-b" }, children)));
  }
  function Tabs({ value, onChange, options }) {
    return /* @__PURE__ */ react_default.createElement("div", { className: "tabs", role: "tablist" }, options.map((o) => /* @__PURE__ */ react_default.createElement(
      "button",
      {
        key: o.value,
        type: "button",
        role: "tab",
        "aria-selected": value === o.value,
        className: "tab " + (value === o.value ? "active" : ""),
        onClick: () => onChange(o.value)
      },
      o.label
    )));
  }
  function Pager({ page, total, size, onPage }) {
    const pages = Math.max(1, Math.ceil((total || 0) / size));
    return /* @__PURE__ */ react_default.createElement("div", { className: "pager" }, /* @__PURE__ */ react_default.createElement("span", null, total, " Einträge · Seite ", page + 1, " von ", pages), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", disabled: page <= 0, onClick: () => onPage(page - 1) }, "← Zurück"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", disabled: page + 1 >= pages, onClick: () => onPage(page + 1) }, "Weiter →")));
  }
  function CopyBtn({ text, label = "Kopieren" }) {
    const [done, setDone] = useState(false);
    return /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: async () => {
      try {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      } catch (e) {
      }
    } }, done ? "Kopiert" : label);
  }
  function Uuid({ id }) {
    if (!id) return /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "—");
    return /* @__PURE__ */ react_default.createElement("span", { className: "mono", title: id, style: { fontSize: 12 } }, shortId2(id));
  }
  function Secret({ label, value }) {
    return /* @__PURE__ */ react_default.createElement("div", { className: "secret" }, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { color: "var(--y)" } }, label, " — wird nur einmal angezeigt"), /* @__PURE__ */ react_default.createElement("div", { className: "secret-v" }, value), /* @__PURE__ */ react_default.createElement(CopyBtn, { text: value }));
  }
  function Empty({ children }) {
    return /* @__PURE__ */ react_default.createElement("div", { className: "empty" }, children);
  }
  function Kv({ rows }) {
    return /* @__PURE__ */ react_default.createElement("div", { className: "kv" }, rows.filter(Boolean).map(([k, v], i) => /* @__PURE__ */ react_default.createElement(react_default.Fragment, { key: i }, /* @__PURE__ */ react_default.createElement("div", null, k), /* @__PURE__ */ react_default.createElement("div", null, v))));
  }
  function PageHead({ title, sub, actions }) {
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { gap: 8 } }, /* @__PURE__ */ react_default.createElement("div", { className: "banner" }, title), (sub || actions) && /* @__PURE__ */ react_default.createElement("div", { className: "row-between" }, /* @__PURE__ */ react_default.createElement("div", { className: "banner-sub", style: { marginTop: 0 } }, sub), actions && /* @__PURE__ */ react_default.createElement("div", { className: "row" }, actions)));
  }

  // portal/pages/Protokoll.jsx
  var RESULT = { success: ["Erfolg", "ok"], rejected: ["Abgelehnt", "warn"], failed: ["Fehler", "bad"] };
  var AUTH_EV = {
    sign_in: ["Anmeldung", "ok"],
    user_created: ["Konto angelegt", "info"],
    password_changed: ["Passwort geändert", "warn"],
    email_changed: ["E-Mail geändert", "warn"],
    banned: ["Gesperrt", "bad"],
    unbanned: ["Entsperrt", "ok"],
    user_deleted: ["Konto gelöscht", "bad"]
  };
  var SOURCES = {
    audit: { table: "bank_audit_logs", ts: "ts", label: "Bank-Audit" },
    auth: { table: "abis_auth_events", ts: "ts", label: "Anmeldungen" },
    kv: { table: "abis_kv_changes", ts: "ts", label: "Datenänderungen" },
    admin: { table: "abis_admin_actions", ts: "ts", label: "Verwaltungsaktionen" }
  };
  function Protokoll() {
    const [src, setSrc] = useState("audit");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Sicherheitsprotokoll", sub: "Unveränderliche Protokolle aus der Datenbank und Live-Ereignisse dieser Sitzung" }), /* @__PURE__ */ react_default.createElement(Tabs, { value: src, onChange: setSrc, options: [...Object.entries(SOURCES).map(([k, s]) => ({ value: k, label: s.label })), { value: "live", label: "Live / Sitzung" }] }), src === "live" ? /* @__PURE__ */ react_default.createElement(LiveLog, null) : /* @__PURE__ */ react_default.createElement(DbLog, { key: src, src }));
  }
  function DbLog({ src }) {
    const app = useApp();
    const S = SOURCES[src];
    const PAGE = 25;
    const empty = { result: "", text: "", from: "", to: "" };
    const [f, setF] = useState(empty);
    const [page, setPage] = useState(0);
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [detail, setDetail] = useState(null);
    const seq = useRef(0);
    const byUid = useMemo(() => {
      const m = {};
      app.profiles.forEach((p) => {
        m[p.id] = p;
      });
      return m;
    }, [app.profiles]);
    function build(q, f2) {
      if (f2.result) q = src === "auth" ? q.eq("event", f2.result) : q.eq("result", f2.result);
      if (f2.text) {
        const t = f2.text.replace(/[%,()]/g, " ").trim();
        if (t) q = src === "audit" ? q.ilike("action", "%" + t + "%") : src === "auth" ? q.or("email.ilike.%" + t + "%,name.ilike.%" + t + "%,citizen_id.ilike.%" + t + "%") : src === "kv" ? q.or("key.ilike.%" + t + "%,actor_name.ilike.%" + t + "%,actor_citizen.ilike.%" + t + "%") : q.or("action.ilike.%" + t + "%,actor_name.ilike.%" + t + "%,target.ilike.%" + t + "%");
      }
      if (f2.from) q = q.gte(S.ts, (/* @__PURE__ */ new Date(f2.from + "T00:00:00")).toISOString());
      if (f2.to) q = q.lt(S.ts, new Date((/* @__PURE__ */ new Date(f2.to + "T00:00:00")).getTime() + 864e5).toISOString());
      return q.order(S.ts, { ascending: false });
    }
    async function load(f2 = f, p = page) {
      const mine = ++seq.current;
      setBusy(true);
      const r = await Monitor.query(S.table, (q) => build(q, f2).range(p * PAGE, p * PAGE + PAGE - 1));
      if (mine !== seq.current) return;
      setBusy(false);
      setData(r);
    }
    useEffect(() => {
      load();
    }, [page]);
    const apply = () => {
      if (page) setPage(0);
      else load();
    };
    async function exportCsv() {
      const r = await Monitor.query(S.table, (q) => build(q, f).limit(5e3));
      if (!r.ok) return;
      const rows2 = r.rows;
      const keys = rows2.length ? Object.keys(rows2[0]) : [];
      downloadText2(
        "abis-" + src + "-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".csv",
        buildCsv2(keys, rows2.map((x) => keys.map((k) => typeof x[k] === "object" && x[k] !== null ? JSON.stringify(x[k]) : x[k])))
      );
      app.note("Protokoll exportiert: " + S.label + " (" + rows2.length + ")", "ok");
      Monitor.logAction("Protokoll exportiert", S.table, { rows: rows2.length });
    }
    if (data && data.missing) return /* @__PURE__ */ react_default.createElement(SetupHint, { table: S.table });
    const rows = data && data.ok ? data.rows : [];
    const actor = (uid, name, cit) => name ? /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, name, /* @__PURE__ */ react_default.createElement("div", { className: "muted small mono" }, cit || "")) : uid ? byUid[uid] ? /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, byUid[uid].name, /* @__PURE__ */ react_default.createElement("div", { className: "muted small mono" }, byUid[uid].citizen_id)) : /* @__PURE__ */ react_default.createElement(Uuid, { id: uid }) : /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "System");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "filters" }, /* @__PURE__ */ react_default.createElement(Field, { label: src === "auth" ? "Ereignis" : "Ergebnis" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: f.result, onChange: (e) => setF({ ...f, result: e.target.value }), style: { minWidth: 170 } }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "Alle"), Object.entries(src === "auth" ? AUTH_EV : src === "audit" ? RESULT : {}).map(([k, v]) => /* @__PURE__ */ react_default.createElement("option", { key: k, value: k }, v[0])))), /* @__PURE__ */ react_default.createElement(Field, { label: "Suche" }, /* @__PURE__ */ react_default.createElement("input", { className: "input mono", style: { width: 230 }, value: f.text, onChange: (e) => setF({ ...f, text: e.target.value }), onKeyDown: (e) => {
      if (e.key === "Enter") apply();
    }, placeholder: src === "audit" ? "Aktion, z. B. TRANSFER" : "Name, Schlüssel …" })), /* @__PURE__ */ react_default.createElement(Field, { label: "Von" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: f.from, onChange: (e) => setF({ ...f, from: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Field, { label: "Bis" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: f.to, onChange: (e) => setF({ ...f, to: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: apply }, "Filtern"), /* @__PURE__ */ react_default.createElement(Btn, { onClick: () => {
      setF(empty);
      if (page) setPage(0);
      else load(empty, 0);
    } }, "Zurücksetzen"), /* @__PURE__ */ react_default.createElement(Btn, { onClick: exportCsv, disabled: !rows.length }, "CSV exportieren")), data && !data.ok && /* @__PURE__ */ react_default.createElement("div", { className: "msg bad" }, /permission|42501/i.test(data.message || "") ? "Keine Leseberechtigung für dieses Protokoll (Level 6 / Administrator)." : "Fehler: " + data.message), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table mono", style: { minWidth: 900 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, src === "audit" && ["Zeitstempel", "Aktion", "Akteur", "Zielkonto", "Transaktion", "Ergebnis", "Grund"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)), src === "auth" && ["Zeitstempel", "Ereignis", "Person", "E-Mail", "Details"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)), src === "kv" && ["Zeitstempel", "Datensatz", "Vorgang", "Durch", "Größe vorher → nachher", "Prüfsumme"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)), src === "admin" && ["Zeitstempel", "Aktion", "Durch", "Ziel", "Details"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, rows.map((r) => {
      if (src === "audit") {
        const rs = RESULT[r.result] || [r.result, ""];
        return /* @__PURE__ */ react_default.createElement("tr", { key: r.id, className: "click " + (r.result === "failed" ? "row-bad" : r.result === "rejected" ? "row-warn" : ""), onClick: () => setDetail(r) }, /* @__PURE__ */ react_default.createElement("td", { className: "nowrap" }, fmtISO2(r.ts)), /* @__PURE__ */ react_default.createElement("td", null, r.action), /* @__PURE__ */ react_default.createElement("td", null, r.actor_type ? /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, r.actor_type, " · ") : null, actor(r.actor_user_id)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: r.target_account_id })), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: r.transaction_id })), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: rs[1] }, rs[0])), /* @__PURE__ */ react_default.createElement("td", null, r.reason || "—"));
      }
      if (src === "auth") {
        const ev = AUTH_EV[r.event] || [r.event, ""];
        return /* @__PURE__ */ react_default.createElement("tr", { key: r.id, className: r.event === "banned" || r.event === "user_deleted" ? "row-bad" : "" }, /* @__PURE__ */ react_default.createElement("td", { className: "nowrap" }, fmtISO2(r.ts)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: ev[1] }, ev[0])), /* @__PURE__ */ react_default.createElement("td", null, r.name || "—", /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, r.citizen_id || "")), /* @__PURE__ */ react_default.createElement("td", null, r.email || "—"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail) : "—"));
      }
      if (src === "kv") {
        const shrink = r.old_size != null && r.new_size != null && r.new_size < r.old_size * 0.5 && r.old_size > 2e3;
        return /* @__PURE__ */ react_default.createElement("tr", { key: r.id, className: r.op === "DELETE" || shrink ? "row-bad" : "" }, /* @__PURE__ */ react_default.createElement("td", { className: "nowrap" }, fmtISO2(r.ts)), /* @__PURE__ */ react_default.createElement("td", null, KEY_LABEL[r.key] || r.key, /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, r.key)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: r.op === "DELETE" ? "bad" : r.op === "INSERT" ? "info" : "" }, r.op), shrink && /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, "Stark verkleinert"))), /* @__PURE__ */ react_default.createElement("td", null, actor(r.actor_id, r.actor_name, r.actor_citizen)), /* @__PURE__ */ react_default.createElement("td", { className: "nowrap" }, r.old_size != null ? fmtBytes2(r.old_size) : "—", " → ", r.new_size != null ? fmtBytes2(r.new_size) : "—"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, (r.new_hash || r.old_hash || "").slice(0, 12)));
      }
      return /* @__PURE__ */ react_default.createElement("tr", { key: r.id }, /* @__PURE__ */ react_default.createElement("td", { className: "nowrap" }, fmtISO2(r.ts)), /* @__PURE__ */ react_default.createElement("td", null, r.action), /* @__PURE__ */ react_default.createElement("td", null, actor(r.actor_id, r.actor_name, r.actor_citizen)), /* @__PURE__ */ react_default.createElement("td", null, r.target || "—"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, r.detail && Object.keys(r.detail).length ? JSON.stringify(r.detail) : "—"));
    }))), !busy && data && data.ok && rows.length === 0 && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Einträge."), busy && /* @__PURE__ */ react_default.createElement(Empty, null, "Lädt …")), data && data.ok && /* @__PURE__ */ react_default.createElement(Pager, { page, total: data.total, size: PAGE, onPage: setPage }), detail && /* @__PURE__ */ react_default.createElement(Dialog, { title: "Audit-Eintrag", wide: true, onClose: () => setDetail(null) }, /* @__PURE__ */ react_default.createElement("pre", { className: "json" }, JSON.stringify(detail, null, 2))));
  }
  function LiveLog() {
    const { events, live } = useApp();
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel" }, /* @__PURE__ */ react_default.createElement("div", { className: "panel-h" }, /* @__PURE__ */ react_default.createElement("h2", null, "Live-Ereignisse dieser Sitzung"), /* @__PURE__ */ react_default.createElement("span", { className: "row small muted" }, /* @__PURE__ */ react_default.createElement("span", { className: "dot " + (live ? "live" : "bad") }), live ? "Realtime verbunden" : "Realtime getrennt")), /* @__PURE__ */ react_default.createElement("div", { className: "panel-b" }, events.length === 0 ? /* @__PURE__ */ react_default.createElement(Empty, null, "Noch keine Ereignisse. Änderungen an den Portaldaten erscheinen hier sofort.") : /* @__PURE__ */ react_default.createElement("ul", { className: "log" }, events.map((e) => /* @__PURE__ */ react_default.createElement("li", { key: e.id, className: e.tone === "bad" ? "bad" : e.tone === "ok" ? "ok" : e.tone === "warn" ? "warn" : "" }, "[", e.src, "] ", e.text, /* @__PURE__ */ react_default.createElement("span", { className: "t" }, fmtISO2(e.ts)))))));
  }
  function SetupHint({ table }) {
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel alert-warn" }, /* @__PURE__ */ react_default.createElement("div", { className: "panel-h" }, /* @__PURE__ */ react_default.createElement("h2", null, "Protokoll nicht eingerichtet")), /* @__PURE__ */ react_default.createElement("div", { className: "panel-b stack", style: { gap: 8 } }, /* @__PURE__ */ react_default.createElement("p", { style: { margin: 0 } }, "Die Tabelle ", /* @__PURE__ */ react_default.createElement("code", null, table), " existiert noch nicht. Damit Anmeldungen, Datenänderungen und Verwaltungsaktionen dauerhaft protokolliert werden, führen Sie einmalig ", /* @__PURE__ */ react_default.createElement("code", null, "sql/abis-ueberwachung.sql"), " im Supabase-SQL-Editor aus (Anleitung in der README)."), /* @__PURE__ */ react_default.createElement("p", { className: "muted small", style: { margin: 0 } }, "Das Bürgerportal funktioniert unverändert weiter – die Protokollierung läuft rein in der Datenbank.")));
  }

  // portal/pages/Datenbank.jsx
  function Datenbank() {
    const app = useApp();
    const [tab, setTab] = useState("kv");
    const [ping, setPing] = useState(null);
    useEffect(() => {
      pingDb().then(setPing);
    }, []);
    const entries = useMemo(() => Object.entries(app.kv || {}).map(([key, e]) => ({ key, size: jsonSize2(e.value), updated_at: e.updated_at, value: e.value })).sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || ""))), [app.kv]);
    const total = entries.reduce((s, e) => s + e.size, 0);
    const issues = useConsistency();
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Datenbankkontrolle", sub: "Supabase · Tabelle kv (Portaldaten), profiles, Bank-Tabellen", actions: /* @__PURE__ */ react_default.createElement(Btn, { onClick: () => {
      app.reloadAll();
      pingDb().then(setPing);
    } }, "Neu laden") }), /* @__PURE__ */ react_default.createElement("div", { className: "stats" }, /* @__PURE__ */ react_default.createElement(Stat, { icon: ICON.db, k: "Datensätze (kv)", v: entries.length, m: fmtBytes2(total) + " gesamt" }), /* @__PURE__ */ react_default.createElement(Stat, { icon: ICON.users, k: "Profile", v: app.profiles.length, m: app.profiles.filter((p) => p.is_admin || p.level >= 5).length + " privilegiert (L5+)" }), /* @__PURE__ */ react_default.createElement(Stat, { icon: ICON.pulse, k: "Antwortzeit", v: ping ? ping.ok ? ping.ms + " ms" : "AUSFALL" : "…", tone: ping && !ping.ok ? "bad" : "", m: "letzte Synchronisation " + (app.lastSync ? relTime2(app.lastSync) : "—") }), /* @__PURE__ */ react_default.createElement(Stat, { icon: ICON.warn, k: "Konsistenz", v: issues.length ? issues.length : "OK", tone: issues.length ? "warn" : "ok", m: "Register ↔ Profile" })), /* @__PURE__ */ react_default.createElement(Tabs, { value: tab, onChange: setTab, options: [{ value: "kv", label: "Datensätze" }, { value: "tables", label: "Tabellen & RLS" }, { value: "profiles", label: "Profile" }, { value: "check", label: "Konsistenz" }] }), tab === "kv" && /* @__PURE__ */ react_default.createElement(KvTable, { entries }), tab === "tables" && /* @__PURE__ */ react_default.createElement(Tables, null), tab === "profiles" && /* @__PURE__ */ react_default.createElement(Profiles, null), tab === "check" && /* @__PURE__ */ react_default.createElement(Consistency, { issues }));
  }
  function KvTable({ entries }) {
    const { me } = useApp();
    const [open, setOpen] = useState(null);
    const lvl = me.isAdmin ? 99 : me.baseLevel;
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 900 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Bereich", "Schlüssel", "Größe", "Einträge", "Zuletzt geändert", "Lesen ab", "Schreiben ab", "Ihr Zugriff", ""].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, entries.map((e) => {
      const n = Array.isArray(e.value) ? e.value.length : e.value && typeof e.value === "object" ? Array.isArray(e.value.tickets) ? e.value.tickets.length : Array.isArray(e.value.channels) ? e.value.channels.length : Object.keys(e.value).length : "—";
      const w = keyWriteLevel(e.key);
      const recent = e.updated_at && Date.now() - new Date(e.updated_at).getTime() < 36e5;
      return /* @__PURE__ */ react_default.createElement("tr", { key: e.key }, /* @__PURE__ */ react_default.createElement("td", null, KEY_LABEL[e.key] || /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "unbekannt")), /* @__PURE__ */ react_default.createElement("td", { className: "mono small" }, e.key), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, fmtBytes2(e.size)), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, n), /* @__PURE__ */ react_default.createElement("td", { className: "nowrap" }, recent ? /* @__PURE__ */ react_default.createElement("span", { className: "val-warn" }, relTime2(e.updated_at)) : relTime2(e.updated_at), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, fmtDT2(e.updated_at))), /* @__PURE__ */ react_default.createElement("td", null, "L", keyReadLevel(e.key)), /* @__PURE__ */ react_default.createElement("td", null, "L", w), /* @__PURE__ */ react_default.createElement("td", null, lvl >= w ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "ok" }, "lesen + schreiben") : /* @__PURE__ */ react_default.createElement(Badge, null, "nur lesen")), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setOpen(e) }, "Ansehen")));
    }))), entries.length === 0 && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine lesbaren Datensätze."), open && /* @__PURE__ */ react_default.createElement(Dialog, { title: "Datensatz · " + open.key, wide: true, onClose: () => setOpen(null) }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "row-between" }, /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, fmtBytes2(open.size), " · geändert ", fmtDT2(open.updated_at), " · nur Ansicht"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => downloadText2(open.key.replace(/[^a-z0-9]+/gi, "-") + ".json", JSON.stringify(open.value, null, 2), "application/json") }, "Als JSON herunterladen")), /* @__PURE__ */ react_default.createElement("pre", { className: "json" }, JSON.stringify(open.value, null, 2).slice(0, 2e5)))));
  }
  function Tables() {
    const [r, setR] = useState(null);
    const load = () => Monitor.rpc("abis_db_overview").then(setR);
    useEffect(() => {
      load();
    }, []);
    if (!r) return /* @__PURE__ */ react_default.createElement(Empty, null, "Lädt …");
    if (r.missing) return /* @__PURE__ */ react_default.createElement(SetupHint, { table: "abis_db_overview()" });
    if (!r.ok) return /* @__PURE__ */ react_default.createElement("div", { className: "msg bad" }, /permission|denied|forbidden/i.test(r.message) ? "Nur für Level 5+ / Administrator." : r.message);
    const d = r.data || {};
    const tables = d.tables || [];
    const noRls = tables.filter((t) => !t.rls);
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, noRls.length > 0 && /* @__PURE__ */ react_default.createElement("div", { className: "alert-bar" }, /* @__PURE__ */ react_default.createElement("span", { className: "badge solid-bad" }, "Alarm"), /* @__PURE__ */ react_default.createElement("span", { className: "grow" }, "Tabellen ohne Row Level Security: ", noRls.map((t) => t.name).join(", "), " – diese sind über den öffentlichen Schlüssel ungeschützt.")), /* @__PURE__ */ react_default.createElement("div", { className: "stats" }, /* @__PURE__ */ react_default.createElement(Stat, { k: "Datenbankgröße", v: fmtBytes2(d.db_size), m: d.pg_version || "" }), /* @__PURE__ */ react_default.createElement(Stat, { k: "Verbindungen", v: d.connections != null ? d.connections : "—", m: "aktive Sitzungen (pg_stat_activity)" }), /* @__PURE__ */ react_default.createElement(Stat, { k: "Tabellen (public)", v: tables.length, m: noRls.length ? noRls.length + " ohne RLS" : "alle mit RLS", tone: noRls.length ? "bad" : "ok" })), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("div", { className: "panel-h" }, /* @__PURE__ */ react_default.createElement("h2", null, "Tabellen"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: load }, "Aktualisieren")), /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 720 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Tabelle", "Zeilen (ca.)", "Größe", "RLS", "Policies", "Realtime"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, tables.map((t) => /* @__PURE__ */ react_default.createElement("tr", { key: t.name, className: t.rls ? "" : "row-bad" }, /* @__PURE__ */ react_default.createElement("td", { className: "mono" }, t.name), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, t.rows), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, fmtBytes2(t.size)), /* @__PURE__ */ react_default.createElement("td", null, t.rls ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "ok" }, "aktiv") : /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, "AUS")), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, t.policies), /* @__PURE__ */ react_default.createElement("td", null, t.realtime ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "info" }, "ja") : /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "—"))))))));
  }
  function Profiles() {
    const { profiles, registry } = useApp();
    const [q, setQ] = useState("");
    const list = profiles.filter((p) => !q || (p.name + " " + p.citizen_id + " " + (p.ministries || []).join(" ")).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.is_admin - a.is_admin || b.level - a.level || String(a.name).localeCompare(b.name, "de"));
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("div", { className: "panel-h" }, /* @__PURE__ */ react_default.createElement("h2", null, "Profile (", profiles.length, ")"), /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { maxWidth: 280 }, placeholder: "Suchen …", value: q, onChange: (e) => setQ(e.target.value) })), /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 820 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Name", "Bürger-Nr.", "Level", "Rolle", "Zuordnungen", "Im Register", "Geändert"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, list.map((p) => {
      const reg = registry.find((c) => c.id === p.citizen_id);
      return /* @__PURE__ */ react_default.createElement("tr", { key: p.id, className: p.is_admin || p.level >= 6 ? "row-warn" : "" }, /* @__PURE__ */ react_default.createElement("td", null, p.name), /* @__PURE__ */ react_default.createElement("td", { className: "mono small" }, p.citizen_id), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: p.is_admin || p.level >= 5 ? "amber" : "" }, "L", p.is_admin ? 6 : p.level), " ", /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, IS_LABEL[p.is_admin ? 6 : p.level])), /* @__PURE__ */ react_default.createElement("td", null, p.is_admin ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, "Administrator") : "—"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, (p.ministries || []).join(", ") || /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "Zivilist")), /* @__PURE__ */ react_default.createElement("td", null, reg ? reg.locked ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, "gesperrt") : /* @__PURE__ */ react_default.createElement(Badge, { tone: "ok" }, "ja") : p.is_admin ? /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "—") : /* @__PURE__ */ react_default.createElement(Badge, { tone: "warn" }, "fehlt")), /* @__PURE__ */ react_default.createElement("td", { className: "small nowrap" }, relTime2(p.updated_at)));
    }))));
  }
  function useConsistency() {
    const { profiles, registry } = useApp();
    return useMemo(() => {
      const out = [];
      const byCit = {};
      profiles.forEach((p) => {
        byCit[p.citizen_id] = p;
      });
      registry.forEach((c) => {
        const p = byCit[c.id];
        if (!p) out.push({ tone: "warn", text: c.name + " (" + c.id + ") steht im Register, hat aber kein Anmeldeprofil." });
        else if (c.is !== void 0 && Number(c.is) !== Number(p.level) && !p.is_admin) out.push({ tone: "info", text: c.name + ": Level im Register (" + c.is + ") weicht vom Profil (" + p.level + ") ab. Maßgeblich ist das Profil." });
      });
      profiles.forEach((p) => {
        if (!p.is_admin && !registry.some((c) => c.id === p.citizen_id)) out.push({ tone: "warn", text: "Profil " + p.name + " (" + p.citizen_id + ") hat keinen Eintrag im Bürgerregister." });
      });
      const ids = {};
      registry.forEach((c) => {
        ids[c.id] = (ids[c.id] || 0) + 1;
      });
      Object.entries(ids).filter(([, n]) => n > 1).forEach(([id, n]) => out.push({ tone: "bad", text: "Bürger-Nr. " + id + " kommt " + n + "× im Register vor." }));
      const mails = {};
      registry.forEach((c) => {
        const m = String(c.loginEmail || "").toLowerCase();
        if (m) mails[m] = (mails[m] || 0) + 1;
      });
      Object.entries(mails).filter(([, n]) => n > 1).forEach(([m, n]) => out.push({ tone: "bad", text: "Login-Adresse " + m + " ist " + n + "× vergeben." }));
      return out;
    }, [profiles, registry]);
  }
  function Consistency({ issues }) {
    if (!issues.length) return /* @__PURE__ */ react_default.createElement("div", { className: "msg ok" }, "Register und Profile sind konsistent.");
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel" }, /* @__PURE__ */ react_default.createElement("div", { className: "panel-b" }, /* @__PURE__ */ react_default.createElement("ul", { className: "log" }, issues.map((i, k) => /* @__PURE__ */ react_default.createElement("li", { key: k, className: i.tone === "bad" ? "bad" : i.tone === "warn" ? "warn" : "" }, i.text)))));
  }

  // portal/components/bank.jsx
  function StatusBadge({ s }) {
    const t = TX_STATUS2[s] || [s, ""];
    return /* @__PURE__ */ react_default.createElement(Badge, { tone: t[1] }, t[0]);
  }
  function Journal({ initialAccount, onOpen, refreshKey }) {
    const PAGE = 20;
    const empty = { type: "", cat: "ALL", status: "", auth: "", account: initialAccount || "", user: "", from: "", to: "", min: "", max: "", search: "", sort: "date_desc" };
    const [f, setF] = useState(empty);
    const [page, setPage] = useState(0);
    const [data, setData] = useState({ rows: [], total: 0 });
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");
    const seq = useRef(0);
    const set = (k, v) => {
      setF((x) => ({ ...x, [k]: v }));
      setPage(0);
    };
    function args(fx, p) {
      const min = fx.min ? parseMinor2(fx.min) : null, max = fx.max ? parseMinor2(fx.max) : null;
      return {
        p_limit: PAGE,
        p_offset: p * PAGE,
        p_from: fx.from ? (/* @__PURE__ */ new Date(fx.from + "T00:00:00")).toISOString() : null,
        p_to: fx.to ? new Date((/* @__PURE__ */ new Date(fx.to + "T00:00:00")).getTime() + 864e5).toISOString() : null,
        p_min: min,
        p_max: max,
        p_status: fx.status || null,
        p_type: fx.type || null,
        p_search: fx.search || null,
        p_sort: fx.sort,
        p_category: fx.cat || "ALL",
        p_account: fx.account ? fx.account.trim().toLowerCase() : null,
        p_user: fx.user || null,
        p_auth: fx.auth || null
      };
    }
    async function load() {
      const mine = ++seq.current;
      setErr("");
      if (f.account && !uuidOk2(f.account)) {
        setErr("Die Konto-UUID ist ungültig.");
        return;
      }
      setBusy(true);
      const r = await Bank.call("bank_admin_journal", args(f, page));
      if (mine !== seq.current) return;
      setBusy(false);
      if (!r.ok) {
        setErr(r.message || "Das Journal konnte nicht geladen werden.");
        return;
      }
      setData({ rows: r.rows || [], total: Number(r.total) || 0 });
    }
    useEffect(() => {
      load();
    }, [page, f.type, f.cat, f.status, f.auth, f.sort, refreshKey]);
    const apply = () => {
      if (page) setPage(0);
      else load();
    };
    async function exportCsv() {
      const r = await Bank.call("bank_admin_journal", { ...args(f, 0), p_limit: 100 });
      if (!r.ok) return;
      const header = ["Datum", "Uhrzeit", "Transaktions-ID", "Typ", "Zahlungsart", "Absender", "Empfänger", "Betrag (M$)", "Steuer (M$)", "Zweck", "Status", "Autorisierung", "Ausgelöst von", "Fehlergrund"];
      const rows = (r.rows || []).map((t) => [
        fmtD2(t.created_at),
        fmtT2(t.created_at),
        t.id,
        TX_TYPE2[t.type] || t.type,
        PAY_TYPE_LABEL2[t.payment_type] || t.payment_type || "",
        t.sender_account_id || "",
        t.recipient_account_id || "",
        fmtMinor2(t.amount_minor),
        t.tax_amount_minor ? fmtMinor2(t.tax_amount_minor) : "",
        t.reference || "",
        (TX_STATUS2[t.status] || [t.status])[0],
        TX_AUTH2[t.authorization_status] || t.authorization_status,
        t.initiated_by_name || (t.initiated_by ? t.initiated_by : "System"),
        t.failure_reason || ""
      ]);
      downloadText2("journal-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".csv", buildCsv2(header, rows));
      Monitor.logAction("Journal exportiert", null, { rows: rows.length });
    }
    const sel = (k, opts) => /* @__PURE__ */ react_default.createElement("select", { className: "select", value: f[k], onChange: (e) => set(k, e.target.value) }, opts);
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "filters" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Konto-UUID" }, /* @__PURE__ */ react_default.createElement("input", { className: "input mono", style: { width: 280 }, value: f.account, onChange: (e) => setF({ ...f, account: e.target.value }), onKeyDown: (e) => {
      if (e.key === "Enter") apply();
    }, placeholder: "UUID" })), /* @__PURE__ */ react_default.createElement(Field, { label: "Benutzer" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 160 }, value: f.user, onChange: (e) => setF({ ...f, user: e.target.value }), onKeyDown: (e) => {
      if (e.key === "Enter") apply();
    }, placeholder: "Name / Bürger-Nr." })), /* @__PURE__ */ react_default.createElement(Field, { label: "Kategorie" }, sel("cat", JOURNAL_CATEGORY2.map((c) => /* @__PURE__ */ react_default.createElement("option", { key: c[0], value: c[0] }, c[1])))), /* @__PURE__ */ react_default.createElement(Field, { label: "Typ" }, sel("type", [/* @__PURE__ */ react_default.createElement("option", { key: "", value: "" }, "Alle"), ...Object.keys(TX_TYPE2).map((k) => /* @__PURE__ */ react_default.createElement("option", { key: k, value: k }, TX_TYPE2[k]))])), /* @__PURE__ */ react_default.createElement(Field, { label: "Status" }, sel("status", [/* @__PURE__ */ react_default.createElement("option", { key: "", value: "" }, "Alle"), ...Object.keys(TX_STATUS2).map((k) => /* @__PURE__ */ react_default.createElement("option", { key: k, value: k }, TX_STATUS2[k][0]))])), /* @__PURE__ */ react_default.createElement(Field, { label: "Autorisierung" }, sel("auth", [/* @__PURE__ */ react_default.createElement("option", { key: "", value: "" }, "Alle"), ...Object.keys(TX_AUTH2).map((k) => /* @__PURE__ */ react_default.createElement("option", { key: k, value: k }, TX_AUTH2[k]))])), /* @__PURE__ */ react_default.createElement(Field, { label: "Von" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: f.from, onChange: (e) => setF({ ...f, from: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Field, { label: "Bis" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: f.to, onChange: (e) => setF({ ...f, to: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Field, { label: "Betrag ab" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 100 }, value: f.min, onChange: (e) => setF({ ...f, min: e.target.value }), placeholder: "0,00" })), /* @__PURE__ */ react_default.createElement(Field, { label: "Betrag bis" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 100 }, value: f.max, onChange: (e) => setF({ ...f, max: e.target.value }), placeholder: "0,00" })), /* @__PURE__ */ react_default.createElement(Field, { label: "Suche" }, /* @__PURE__ */ react_default.createElement("input", { className: "input mono", style: { width: 180 }, value: f.search, onChange: (e) => setF({ ...f, search: e.target.value }), onKeyDown: (e) => {
      if (e.key === "Enter") apply();
    }, placeholder: "ID / Zweck" })), /* @__PURE__ */ react_default.createElement(Field, { label: "Sortierung" }, sel("sort", [["date_desc", "Neueste zuerst"], ["date_asc", "Älteste zuerst"], ["amount_desc", "Betrag absteigend"], ["amount_asc", "Betrag aufsteigend"]].map(([v, l]) => /* @__PURE__ */ react_default.createElement("option", { key: v, value: v }, l)))), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: apply }, "Filtern"), /* @__PURE__ */ react_default.createElement(Btn, { onClick: () => {
      setF(empty);
      setPage(0);
    } }, "Zurücksetzen"), /* @__PURE__ */ react_default.createElement(Btn, { onClick: exportCsv }, "CSV")), err && /* @__PURE__ */ react_default.createElement("div", { className: "msg bad" }, err), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 1500 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Zeit", "Transaktion", "Typ", "Zahlungsart", "Absender", "Empfänger", "Betrag", "Steuer", "Zweck", "Status", "Autor.", "Ausgelöst von", "Fehler"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, data.rows.map((t) => /* @__PURE__ */ react_default.createElement("tr", { key: t.id, className: "click " + (t.status === "failed" ? "row-bad" : t.status === "rejected" ? "row-warn" : ""), onClick: () => onOpen && onOpen(t.id) }, /* @__PURE__ */ react_default.createElement("td", { className: "nowrap mono small" }, fmtD2(t.created_at), /* @__PURE__ */ react_default.createElement("div", { className: "muted" }, fmtT2(t.created_at))), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: t.id })), /* @__PURE__ */ react_default.createElement("td", null, TX_TYPE2[t.type] || t.type), /* @__PURE__ */ react_default.createElement("td", null, PAY_TYPE_LABEL2[t.payment_type] || t.payment_type || "—"), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: t.sender_account_id })), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: t.recipient_account_id })), /* @__PURE__ */ react_default.createElement("td", { className: "num mono", style: { fontWeight: 600 } }, fmtMinor2(t.amount_minor)), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, Number(t.tax_amount_minor) > 0 ? fmtMinor2(t.tax_amount_minor) : "—"), /* @__PURE__ */ react_default.createElement("td", { style: { maxWidth: 220, wordBreak: "break-word" } }, t.reference || "—"), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(StatusBadge, { s: t.status })), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, TX_AUTH2[t.authorization_status] || t.authorization_status), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, t.initiated_by_name ? t.initiated_by_name + " · " + t.initiated_by_citizen : t.initiated_by ? /* @__PURE__ */ react_default.createElement(Uuid, { id: t.initiated_by }) : "System"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, t.failure_reason ? FAIL_TXT2[t.failure_reason] || t.failure_reason : "—"))))), !busy && !data.rows.length && !err && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Transaktionen gefunden."), busy && /* @__PURE__ */ react_default.createElement(Empty, null, "Lädt …")), /* @__PURE__ */ react_default.createElement(Pager, { page, total: data.total, size: PAGE, onPage: setPage }));
  }
  function ledgerRole(l, root) {
    if (l.account_kind === "tax") return l.amount_minor > 0 ? "Steuerkonto (+Steuer)" : "Steuerkonto (−Steuer)";
    if (l.account_id === root.sender_account_id) return l.amount_minor < 0 ? "Absender (−Brutto)" : "Absender (+Brutto)";
    if (l.account_id === root.recipient_account_id) return l.amount_minor > 0 ? Number(root.tax_amount_minor) > 0 ? "Empfänger (+Netto)" : "Empfänger" : "Empfänger (−Netto)";
    return "—";
  }
  function TxDetail({ id, onClose, onChanged }) {
    const app = useApp();
    const [d, setD] = useState(null);
    const [err, setErr] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [key] = useState(newKey);
    async function load() {
      const r = await Bank.call("bank_admin_tx_detail", { p_transaction: id });
      if (r.ok) setD(r);
      else setErr(r.message || "Nicht geladen.");
    }
    useEffect(() => {
      load();
    }, [id]);
    const t = d && d.transaction;
    async function reverse() {
      setBusy(true);
      const r = await Bank.call("bank_admin_reverse", { p_transaction: id, p_reason: reason.trim(), p_idempotency_key: key });
      setBusy(false);
      if (r.ok) {
        setMsg({ ok: true, text: "Die Buchung wurde storniert (Gegenbuchung erstellt)." });
        app.note("Buchung storniert: " + id, "warn", "bank");
        Monitor.logAction("Buchung storniert", id, { reason: reason.trim() });
        await load();
        onChanged && onChanged();
      } else setMsg({ ok: false, text: r.message || "Stornierung fehlgeschlagen." });
    }
    return /* @__PURE__ */ react_default.createElement(Dialog, { title: "Transaktionsdetails", wide: true, onClose }, err && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: err } }), !d && !err && /* @__PURE__ */ react_default.createElement(Empty, null, "Lädt …"), t && /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [
      ["Transaktions-ID", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, t.id)],
      ["Typ", TX_TYPE2[t.type] || t.type],
      ["Zahlungsart", PAY_TYPE_LABEL2[t.payment_type] || t.payment_type || "—"],
      ["Betrag", /* @__PURE__ */ react_default.createElement("strong", null, fmtM2(t.amount_minor))],
      Number(t.tax_amount_minor) > 0 && ["Brutto / Steuer / Netto", fmtM2(t.gross_amount_minor) + " / " + fmtM2(t.tax_amount_minor) + " (" + fmtRate2(t.tax_rate) + ") / " + fmtM2(t.net_amount_minor)],
      t.parent_transaction_id && ["Ursprungstransaktion", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, t.parent_transaction_id)],
      ["Absender", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, t.sender_account_id || "—")],
      ["Empfänger", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, t.recipient_account_id || t.metadata && t.metadata.recipient || "—")],
      ["Verwendungszweck", t.reference || "—"],
      ["Erstellt", fmtDT2(t.created_at)],
      ["Autorisierung", (TX_AUTH2[t.authorization_status] || "") + (t.authorized_at ? " · " + fmtDT2(t.authorized_at) : "")],
      ["Buchung", /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(StatusBadge, { s: t.status }), " ", t.posted_at ? fmtDT2(t.posted_at) : "")],
      ["Ausgelöst von", d.initiator ? d.initiator.name + " · " + d.initiator.citizen_id : t.initiated_by || "System"],
      t.failure_reason && ["Fehlergrund", FAIL_TXT2[t.failure_reason] || t.failure_reason],
      t.metadata && t.metadata.reason && ["Begründung", t.metadata.reason],
      t.metadata && t.metadata.note && ["Interne Notiz", t.metadata.note],
      t.reverses_transaction_id && ["Storniert Buchung", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, t.reverses_transaction_id)]
    ] }), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 6 } }, "Ledger (Soll / Haben)"), !d.ledger || !d.ledger.length ? /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Keine – es wurde nichts verbucht.") : /* @__PURE__ */ react_default.createElement("div", { className: "table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table mono", style: { minWidth: 560 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Nr.", "Rolle", "Konto", "Betrag", "Saldo danach", "Zeit"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, d.ledger.map((l) => /* @__PURE__ */ react_default.createElement("tr", { key: l.entry_no }, /* @__PURE__ */ react_default.createElement("td", null, l.entry_no), /* @__PURE__ */ react_default.createElement("td", null, ledgerRole(l, d.root || t)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: l.account_id })), /* @__PURE__ */ react_default.createElement("td", { className: l.amount_minor < 0 ? "val-bad" : "val-ok" }, l.amount_minor < 0 ? "−" : "+", fmtMinor2(Math.abs(l.amount_minor))), /* @__PURE__ */ react_default.createElement("td", null, fmtMinor2(l.balance_after_minor)), /* @__PURE__ */ react_default.createElement("td", null, fmtDT2(l.created_at)))))))), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 6 } }, "Audit-Protokoll"), !d.audit || !d.audit.length ? /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Keine Einträge.") : /* @__PURE__ */ react_default.createElement("ul", { className: "log" }, d.audit.map((a, i) => /* @__PURE__ */ react_default.createElement("li", { key: i, className: a.result === "success" ? "" : "bad" }, a.action, " · ", a.result, a.reason ? " · " + a.reason : "", /* @__PURE__ */ react_default.createElement("span", { className: "t" }, fmtDT2(a.ts)))))), t.status === "posted" && t.type !== "reversal" && t.type !== "tax" && /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { borderTop: "1px solid var(--line)", paddingTop: 14, gap: 10 } }, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow" }, "Buchung stornieren"), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Erzeugt eine Gegenbuchung; das Original bleibt erhalten. Der Empfänger muss noch über das Guthaben verfügen."), /* @__PURE__ */ react_default.createElement(Input, { label: "Begründung (mind. 5 Zeichen)", value: reason, onChange: (e) => setReason(e.target.value) }), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "danger", disabled: busy || reason.trim().length < 5, onClick: () => {
      if (window.confirm("Diese Buchung wirklich stornieren?")) reverse();
    } }, busy ? "Wird storniert …" : "Stornieren"))), /* @__PURE__ */ react_default.createElement(Msg, { m: msg })));
  }

  // portal/pages/Transaktionen.jsx
  function Transaktionen() {
    const [detail, setDetail] = useState(null);
    const [tick, setTick] = useState(0);
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Transaktionsüberwachung", sub: "Alle Maisdollar-Buchungen · Klick auf eine Zeile öffnet Ledger, Audit und Storno" }), /* @__PURE__ */ react_default.createElement(Journal, { onOpen: setDetail, refreshKey: tick }), detail && /* @__PURE__ */ react_default.createElement(TxDetail, { id: detail, onClose: () => setDetail(null), onChanged: () => setTick((x) => x + 1) }));
  }

  // portal/pages/Bank.jsx
  function Bank2() {
    const [tab, setTab] = useState("accounts");
    const [jAcc, setJAcc] = useState("");
    const [mAcc, setMAcc] = useState("");
    const [detail, setDetail] = useState(null);
    const [tick, setTick] = useState(0);
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Bankmanagement", sub: "Maisdollar · alle Vorgänge laufen über geprüfte Server-Funktionen und werden im Audit-Log festgehalten" }), /* @__PURE__ */ react_default.createElement(Tabs, { value: tab, onChange: setTab, options: [
      { value: "accounts", label: "Konten" },
      { value: "money", label: "Geld buchen" },
      { value: "recurring", label: "Dauerzahlungen" },
      { value: "journal", label: "Journal" },
      { value: "tax", label: "Steuern" },
      { value: "system", label: "Integrität" }
    ] }), tab === "accounts" && /* @__PURE__ */ react_default.createElement(Accounts, { onJournal: (id) => {
      setJAcc(id);
      setTab("journal");
    }, onMoney: (id) => {
      setMAcc(id);
      setTab("money");
    } }), tab === "money" && /* @__PURE__ */ react_default.createElement(Money, { key: mAcc, prefill: mAcc }), tab === "recurring" && /* @__PURE__ */ react_default.createElement(Recurring, null), tab === "journal" && /* @__PURE__ */ react_default.createElement(Journal, { key: jAcc, initialAccount: jAcc, onOpen: setDetail, refreshKey: tick }), tab === "tax" && /* @__PURE__ */ react_default.createElement(Tax, { onOpen: setDetail }), tab === "system" && /* @__PURE__ */ react_default.createElement(Integrity, null), detail && /* @__PURE__ */ react_default.createElement(TxDetail, { id: detail, onClose: () => setDetail(null), onChanged: () => setTick((x) => x + 1) }));
  }
  var ST = { active: ["Aktiv", "ok"], blocked: ["Gesperrt", "bad"], closed: ["Stillgelegt", ""] };
  function Accounts({ onJournal, onMoney }) {
    const PAGE = 20;
    const [q, setQ] = useState("");
    const [st, setSt] = useState("");
    const [ty, setTy] = useState("");
    const [page, setPage] = useState(0);
    const [data, setData] = useState({ rows: [], total: 0 });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [detail, setDetail] = useState(null);
    const [creating, setCreating] = useState(false);
    const seq = useRef(0);
    async function load() {
      const mine = ++seq.current;
      setBusy(true);
      const r = await Bank.call("bank_admin_accounts", { p_search: q || null, p_status: st || null, p_limit: PAGE, p_offset: page * PAGE, p_type: ty || null });
      if (mine !== seq.current) return;
      setBusy(false);
      if (r.ok) setData({ rows: r.rows || [], total: Number(r.total) || 0 });
      else setMsg({ ok: false, text: r.message });
    }
    useEffect(() => {
      load();
    }, [page, st, ty]);
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "filters" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Suche (UUID, Name, ID, Kennung)" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 300 }, value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => {
      if (e.key === "Enter") {
        if (page) setPage(0);
        else load();
      }
    } })), /* @__PURE__ */ react_default.createElement(Field, { label: "Kontotyp" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: ty, onChange: (e) => {
      setTy(e.target.value);
      setPage(0);
    } }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "Alle"), /* @__PURE__ */ react_default.createElement("option", { value: "citizen" }, "Bürgerkonten"), /* @__PURE__ */ react_default.createElement("option", { value: "standalone" }, "Eigenständige"))), /* @__PURE__ */ react_default.createElement(Field, { label: "Status" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: st, onChange: (e) => {
      setSt(e.target.value);
      setPage(0);
    } }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "Alle"), /* @__PURE__ */ react_default.createElement("option", { value: "active" }, "Aktiv"), /* @__PURE__ */ react_default.createElement("option", { value: "blocked" }, "Gesperrt"), /* @__PURE__ */ react_default.createElement("option", { value: "closed" }, "Stillgelegt"))), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: () => {
      if (page) setPage(0);
      else load();
    } }, "Suchen"), /* @__PURE__ */ react_default.createElement(Btn, { onClick: () => setCreating(true) }, "+ Neues Bankkonto")), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 1e3 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Kontoinhaber", "Typ", "Bürger-/interne ID", "Konto-UUID", "Kontostand", "Status", ""].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, data.rows.map((a) => /* @__PURE__ */ react_default.createElement("tr", { key: a.id, className: a.status === "blocked" ? "row-bad" : "" }, /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("strong", null, a.name || "—"), a.login_identifier && /* @__PURE__ */ react_default.createElement("div", { className: "mono small muted" }, a.login_identifier)), /* @__PURE__ */ react_default.createElement("td", null, a.account_type === "system" ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "amber" }, "System") : a.account_type === "standalone" ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "info" }, "Eigenständig") : /* @__PURE__ */ react_default.createElement(Badge, null, "Bürger")), /* @__PURE__ */ react_default.createElement("td", { className: "mono small" }, a.citizen_id || "—"), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: a.id })), /* @__PURE__ */ react_default.createElement("td", { className: "num mono", style: { fontWeight: 600 } }, fmtM2(a.balance_minor)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: (ST[a.status] || [])[1] }, (ST[a.status] || [a.status])[0])), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { gap: 6 } }, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setDetail(a.id) }, "Details"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => onJournal(a.id) }, "Verlauf"), a.kind === "user" && a.status === "active" && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => onMoney(a.id) }, "Buchen"))))))), !busy && !data.rows.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Konten gefunden."), busy && /* @__PURE__ */ react_default.createElement(Empty, null, "Lädt …")), /* @__PURE__ */ react_default.createElement(Pager, { page, total: data.total, size: PAGE, onPage: setPage }), detail && /* @__PURE__ */ react_default.createElement(AccountDetail, { id: detail, onClose: () => setDetail(null), onChanged: load, onJournal: (id) => {
      setDetail(null);
      onJournal(id);
    } }), creating && /* @__PURE__ */ react_default.createElement(CreateStandalone, { onClose: () => setCreating(false), onCreated: load }));
  }
  function AccountDetail({ id, onClose, onChanged, onJournal }) {
    const app = useApp();
    const [d, setD] = useState(null);
    const [err, setErr] = useState("");
    const [msg, setMsg] = useState(null);
    const [mode, setMode] = useState(null);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [secret, setSecret] = useState(null);
    const [edit, setEdit] = useState({ name: "", ext: "", cat: "", desc: "" });
    const [newPw, setNewPw] = useState("");
    const [orders, setOrders] = useState([]);
    const lock = useRef(false);
    async function load() {
      const r = await Bank.call("bank_admin_account_detail", { p_account: id });
      if (r.ok) {
        setD(r);
        setEdit({ name: r.account.owner_name || "", ext: r.account.external_id || "", cat: r.account.category || "", desc: r.account.description || "" });
      } else setErr(r.message || "Nicht geladen.");
    }
    useEffect(() => {
      load();
    }, [id]);
    const a = d && d.account, cr = d && d.credentials, standalone = a && a.account_type === "standalone";
    const ok5 = reason.trim().length >= 5;
    async function run(fn, args, okText) {
      if (lock.current) return null;
      lock.current = true;
      setBusy(true);
      const r = await Bank.call(fn, args);
      setBusy(false);
      lock.current = false;
      if (r.ok) {
        setMsg({ ok: true, text: okText });
        setMode(null);
        setReason("");
        setNewPw("");
        app.note(okText + " (" + (a.owner_name || id) + ")", "warn", "bank");
        Monitor.logAction(okText, id, { reason: args.p_reason });
        await load();
        onChanged && onChanged();
      } else setMsg({ ok: false, text: r.message || "Fehlgeschlagen." });
      return r;
    }
    const pwBad = newPw && (newPw.length < 10 || newPw.length > 72);
    return /* @__PURE__ */ react_default.createElement(Dialog, { title: "Kontodetails", wide: true, onClose }, err && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: err } }), !d && !err && /* @__PURE__ */ react_default.createElement(Empty, null, "Lädt …"), a && /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [
      ["Kontotyp", standalone ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "info" }, "Eigenständig") : a.account_type === "system" ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "amber" }, "System") : /* @__PURE__ */ react_default.createElement(Badge, null, "Bürgerkonto")],
      ["Kontoinhaber", /* @__PURE__ */ react_default.createElement("strong", null, a.owner_name || "—")],
      ["Bürger-/interne ID", a.external_id || "—"],
      ["Kategorie", a.category || "—"],
      ["Beschreibung", a.description || "—"],
      ["Konto-UUID", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, a.id)],
      ["Kontostand", /* @__PURE__ */ react_default.createElement("strong", null, fmtM2(a.balance_minor))],
      ["Status", /* @__PURE__ */ react_default.createElement(Badge, { tone: (ST[a.status] || [])[1] }, (ST[a.status] || [a.status])[0])],
      ["Erstellt", fmtDT2(a.created_at) + (a.created_by_name ? " von " + a.created_by_name : "")],
      cr && ["Kontokennung", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, cr.login_identifier)],
      cr && ["Letzte Anmeldung", cr.last_login_at ? fmtDT2(cr.last_login_at) : "noch nie"],
      cr && ["Passwortwechsel nötig", cr.must_change_password ? "Ja" : "Nein"],
      cr && ["Aktive Sitzungen", d.active_sessions],
      ["Aktive Daueraufträge", d.active_standing_orders]
    ] }), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), secret && /* @__PURE__ */ react_default.createElement(Secret, { label: "Neues temporäres Passwort", value: secret }), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => onJournal(a.id) }, "Transaktionsverlauf"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: async () => {
      const r = await Bank.call("bank_admin_so_list", { p_account: id });
      if (r.ok) {
        setOrders(r.rows || []);
        setMode("orders");
      } else setMsg({ ok: false, text: r.message });
    } }, "Daueraufträge"), a.account_type !== "system" && a.status !== "closed" && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: a.status === "active" ? "danger" : "primary", onClick: () => {
      setMode("status");
      setReason("");
    } }, a.status === "active" ? "Sperren" : "Freigeben"), standalone && a.status !== "closed" && /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => {
      setMode("edit");
      setReason("");
    } }, "Inhaber ändern"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => {
      setMode("reset");
      setReason("");
      setSecret(null);
    } }, "Zugangsdaten zurücksetzen"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
      setMode("close");
      setReason("");
    } }, "Stilllegen"))), mode && mode !== "orders" && /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { borderTop: "1px solid var(--line)", paddingTop: 14, gap: 10 } }, mode === "edit" && /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Input, { label: "Kontoinhaber", value: edit.name, onChange: (e) => setEdit({ ...edit, name: e.target.value }) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Bürger-/interne ID", value: edit.ext, onChange: (e) => setEdit({ ...edit, ext: e.target.value }) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Kategorie", value: edit.cat, onChange: (e) => setEdit({ ...edit, cat: e.target.value }) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Beschreibung", value: edit.desc, onChange: (e) => setEdit({ ...edit, desc: e.target.value }) })), mode === "reset" && /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement("div", { className: "small" }, "Das alte Passwort wird ersetzt, alle Sitzungen enden, beim nächsten Login ist ein neues Passwort Pflicht."), /* @__PURE__ */ react_default.createElement(Input, { label: "Neues Passwort (optional, sonst vom System erzeugt)", type: "password", autoComplete: "new-password", value: newPw, onChange: (e) => setNewPw(e.target.value), error: pwBad ? "10 bis 72 Zeichen" : void 0 })), mode === "close" && /* @__PURE__ */ react_default.createElement("div", { className: "msg bad" }, "Stilllegen ist endgültig. Alle Daueraufträge des Kontos enden. Nur bei Kontostand 0 möglich."), /* @__PURE__ */ react_default.createElement(Input, { label: "Begründung (mind. 5 Zeichen)", value: reason, onChange: (e) => setReason(e.target.value) }), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, mode === "edit" && /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: busy || !ok5 || edit.name.trim().length < 2, onClick: () => run("bank_admin_update_standalone", { p_account: id, p_owner_name: edit.name, p_external_id: edit.ext, p_category: edit.cat, p_description: edit.desc, p_reason: reason.trim() }, "Kontoinhaber geändert") }, "Speichern"), mode === "reset" && /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: busy || !ok5 || pwBad, onClick: async () => {
      if (!window.confirm("Zugangsdaten wirklich zurücksetzen?")) return;
      const r = await run("bank_admin_reset_credentials", { p_account: id, p_reason: reason.trim(), p_new_password: newPw || null }, "Zugangsdaten zurückgesetzt");
      if (r && r.ok && r.temp_password) setSecret(r.temp_password);
    } }, "Zurücksetzen"), mode === "status" && /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: busy || !ok5, onClick: () => run("bank_admin_set_status", { p_account: id, p_status: a.status === "active" ? "blocked" : "active", p_reason: reason.trim() }, a.status === "active" ? "Bankkonto gesperrt" : "Bankkonto freigegeben") }, a.status === "active" ? "Jetzt sperren" : "Jetzt freigeben"), mode === "close" && /* @__PURE__ */ react_default.createElement(Btn, { variant: "danger", disabled: busy || !ok5, onClick: () => {
      if (window.confirm("Konto endgültig stilllegen?")) run("bank_admin_close_account", { p_account: id, p_reason: reason.trim() }, "Bankkonto stillgelegt");
    } }, "Endgültig stilllegen"), /* @__PURE__ */ react_default.createElement(Btn, { variant: "ghost", onClick: () => setMode(null) }, "Abbrechen"))), mode === "orders" && /* @__PURE__ */ react_default.createElement("div", { style: { borderTop: "1px solid var(--line)", paddingTop: 12 } }, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 6 } }, "Daueraufträge (nur Ansicht)"), !orders.length ? /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Keine Daueraufträge.") : orders.map((o) => /* @__PURE__ */ react_default.createElement("div", { key: o.id, className: "list-row small" }, /* @__PURE__ */ react_default.createElement("span", null, fmtM2(o.amount_minor), " · ", SO_INTERVAL2[o.repeat_interval] || o.repeat_interval, " · ", o.source_account_id === id ? "an " : "von ", /* @__PURE__ */ react_default.createElement(Uuid, { id: o.source_account_id === id ? o.target_account_id : o.source_account_id })), /* @__PURE__ */ react_default.createElement("span", { className: "row" }, /* @__PURE__ */ react_default.createElement(Badge, { tone: (SO_STATUS2[o.status] || [])[1] }, (SO_STATUS2[o.status] || [o.status])[0]), o.last_run && /* @__PURE__ */ react_default.createElement(Badge, { tone: (SO_RUN2[o.last_run.status] || [])[1] }, (SO_RUN2[o.last_run.status] || [o.last_run.status])[0])))))));
  }
  function CreateStandalone({ onClose, onCreated }) {
    const app = useApp();
    const [f, setF] = useState({ name: "", ext: "", amount: "", status: "active", category: "", desc: "", pw: "", reason: "" });
    const [review, setReview] = useState(false);
    const [key] = useState(newKey);
    const [busy, setBusy] = useState(false);
    const [res, setRes] = useState(null);
    const lock = useRef(false);
    const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const amount = f.amount.trim() ? parseMinor2(f.amount) : 0;
    const pwOk = !f.pw || f.pw.length >= 10 && f.pw.length <= 72;
    const valid = f.name.trim().length >= 2 && amount !== null && f.reason.trim().length >= 5 && pwOk;
    async function create() {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      const r = await Bank.call("bank_admin_create_standalone", {
        p_owner_name: f.name.trim(),
        p_external_id: f.ext.trim() || null,
        p_initial_minor: amount || 0,
        p_status: f.status,
        p_description: f.desc.trim() || null,
        p_category: f.category.trim() || null,
        p_initial_password: f.pw || null,
        p_reason: f.reason.trim(),
        p_idempotency_key: key
      });
      setBusy(false);
      lock.current = false;
      setRes((prev) => prev && prev.ok && prev.temp_password && r.ok && r.replayed ? prev : r);
      setF((x) => ({ ...x, pw: "" }));
      if (r.ok) {
        app.note("Bankkonto erstellt: " + f.name.trim(), "ok", "bank");
        Monitor.logAction("Bankkonto erstellt", r.account_id, { name: f.name.trim() });
        onCreated && onCreated();
      }
    }
    if (res && res.ok) return /* @__PURE__ */ react_default.createElement(Dialog, { title: "Konto erstellt", onClose }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [["Kontoinhaber", f.name], ["Konto-UUID", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, res.account_id)], ["Kontokennung", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, res.login_identifier)]] }), res.temp_password ? /* @__PURE__ */ react_default.createElement(Secret, { label: "Temporäres Passwort", value: res.temp_password }) : /* @__PURE__ */ react_default.createElement("div", { className: "msg info" }, res.replayed ? "Bereits erstellt – das Passwort wird nicht erneut angezeigt." : "Das festgelegte Passwort gilt."), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: onClose }, "Fertig"))));
    return /* @__PURE__ */ react_default.createElement(Dialog, { title: review ? "Neues Bankkonto · Prüfen" : "Neues Bankkonto", wide: true, onClose: () => !busy && onClose() }, !review ? /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Ein eigenständiges Konto braucht keinen Bürgerportal-Account; Anmeldung mit Kontokennung und eigenem Passwort."), /* @__PURE__ */ react_default.createElement("div", { className: "cols", style: { gap: 12 } }, /* @__PURE__ */ react_default.createElement("div", { style: { flex: "2 1 240px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Kontoinhaber", value: f.name, onChange: (e) => set("name", e.target.value) })), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 180px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Bürger-/interne ID (optional)", value: f.ext, onChange: (e) => set("ext", e.target.value) }))), /* @__PURE__ */ react_default.createElement("div", { className: "cols", style: { gap: 12 } }, /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 160px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Startguthaben (M$)", value: f.amount, onChange: (e) => set("amount", e.target.value), error: f.amount.trim() && amount === null ? "Ungültiger Betrag" : void 0 })), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 160px" } }, /* @__PURE__ */ react_default.createElement(Select, { label: "Status", value: f.status, onChange: (e) => set("status", e.target.value) }, /* @__PURE__ */ react_default.createElement("option", { value: "active" }, "Aktiv"), /* @__PURE__ */ react_default.createElement("option", { value: "blocked" }, "Gesperrt"))), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 160px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Kategorie (optional)", value: f.category, onChange: (e) => set("category", e.target.value), placeholder: "z. B. Unternehmen" }))), /* @__PURE__ */ react_default.createElement(Input, { label: "Beschreibung (optional)", value: f.desc, onChange: (e) => set("desc", e.target.value) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Passwort (optional – leer = vom System erzeugt)", type: "password", autoComplete: "new-password", value: f.pw, onChange: (e) => set("pw", e.target.value), error: f.pw && !pwOk ? "10 bis 72 Zeichen" : void 0 }), /* @__PURE__ */ react_default.createElement(Input, { label: "Begründung (mind. 5 Zeichen)", value: f.reason, onChange: (e) => set("reason", e.target.value.slice(0, 300)) }), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: !valid, onClick: () => setReview(true) }, "Zusammenfassung prüfen"), /* @__PURE__ */ react_default.createElement(Btn, { variant: "ghost", onClick: onClose }, "Abbrechen"))) : /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [["Kontoinhaber", f.name.trim()], ["Interne ID", f.ext.trim() || "—"], ["Startguthaben", amount ? fmtM2(amount) : "keines"], ["Status · Kategorie", (f.status === "active" ? "Aktiv" : "Gesperrt") + " · " + (f.category.trim() || "—")], ["Passwort", f.pw ? "festgelegt" : "wird erzeugt (einmalige Anzeige)"], ["Begründung", f.reason.trim()]] }), res && !res.ok && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: res.message || "Erstellung fehlgeschlagen." } }), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: busy, onClick: create }, busy ? "Wird erstellt …" : "Konto erstellen"), /* @__PURE__ */ react_default.createElement(Btn, { variant: "ghost", disabled: busy, onClick: () => setReview(false) }, "Zurück"))));
  }
  function Money({ prefill }) {
    const app = useApp();
    const [mode, setMode] = useState("credit");
    const [acct, setAcct] = useState(prefill || "");
    const [accts, setAccts] = useState([]);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");
    const [review, setReview] = useState(false);
    const [key, setKey] = useState("");
    const [sending, setSending] = useState(false);
    const [res, setRes] = useState(null);
    const [ack, setAck] = useState(false);
    useEffect(() => {
      Bank.call("bank_admin_accounts", { p_limit: 100 }).then((r) => {
        if (r.ok) setAccts((r.rows || []).filter((a) => a.kind === "user"));
      });
    }, []);
    const target = acct.trim().toLowerCase();
    const minor = parseMinor2(amount);
    const known = accts.find((a) => a.id === target);
    const ok = uuidOk2(target) && minor && reason.trim().length >= 5;
    async function run() {
      setSending(true);
      const r = mode === "credit" ? await Bank.call("bank_admin_credit", { p_recipient: target, p_amount_minor: minor, p_reason: reason.trim(), p_note: note.trim() || null, p_idempotency_key: key }) : await Bank.call("bank_admin_debit", { p_account: target, p_amount_minor: minor, p_reason: reason.trim(), p_note: note.trim() || null, p_idempotency_key: key });
      setSending(false);
      setRes(r);
      if (r.ok) {
        const t = (mode === "credit" ? "Gutschrift " : "Abbuchung ") + fmtM2(minor) + " → " + (known ? known.name : target);
        app.note(t, "warn", "bank");
        Monitor.logAction(t, target, { reason: reason.trim() });
        setAmount("");
        setReason("");
        setNote("");
        setAck(false);
      }
    }
    return /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 22, maxWidth: 640 } }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Tabs, { value: mode, onChange: (v) => {
      setMode(v);
      setAck(false);
    }, options: [{ value: "credit", label: "Gutschrift" }, { value: "debit", label: "Abbuchung" }] }), /* @__PURE__ */ react_default.createElement(Field, { label: "Konto-UUID", hint: known ? known.name + " · " + (known.citizen_id || "") + " · Kontostand " + fmtM2(known.balance_minor) : void 0, error: acct && !uuidOk2(target) ? "Keine gültige UUID." : void 0 }, /* @__PURE__ */ react_default.createElement("input", { className: "input mono", list: "abis-acc-list", value: acct, onChange: (e) => setAcct(e.target.value), placeholder: "UUID eingeben oder wählen" })), /* @__PURE__ */ react_default.createElement("datalist", { id: "abis-acc-list" }, accts.map((a) => /* @__PURE__ */ react_default.createElement("option", { key: a.id, value: a.id }, a.name, " · ", a.citizen_id))), /* @__PURE__ */ react_default.createElement(Input, { label: "Betrag (M$)", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "z. B. 100,00", error: amount && !minor ? "Ungültiger Betrag." : void 0 }), /* @__PURE__ */ react_default.createElement(Input, { label: "Verwendungszweck / Begründung (mind. 5 Zeichen)", value: reason, onChange: (e) => setReason(e.target.value.slice(0, 140)) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Interne Notiz (optional)", value: note, onChange: (e) => setNote(e.target.value.slice(0, 500)) }), mode === "debit" && /* @__PURE__ */ react_default.createElement("label", { className: "check" }, /* @__PURE__ */ react_default.createElement("input", { type: "checkbox", checked: ack, onChange: (e) => setAck(e.target.checked) }), /* @__PURE__ */ react_default.createElement("span", null, "Ich bestätige, dass dem Konto dieser Betrag ", /* @__PURE__ */ react_default.createElement("strong", null, "entzogen"), " werden soll.")), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: !ok || mode === "debit" && !ack, onClick: () => {
      setKey(newKey());
      setRes(null);
      setReview(true);
    } }, "Zusammenfassung prüfen"))), review && /* @__PURE__ */ react_default.createElement(Dialog, { title: mode === "credit" ? "Gutschrift bestätigen" : "Abbuchung bestätigen", onClose: () => {
      if (!sending) {
        setReview(false);
        setRes(null);
      }
    } }, res && res.ok ? /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: true, text: "Verbucht." } }), /* @__PURE__ */ react_default.createElement("div", { className: "mono small break" }, "Transaktions-ID: ", res.transaction_id), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: () => {
      setReview(false);
      setRes(null);
    } }, "Fertig"))) : /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [
      ["Aktion", mode === "credit" ? "Gutschrift (Staatskasse → Konto)" : "Abbuchung (Konto → Staatskasse)"],
      ["Konto", /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, known ? known.name + " · " : "", /* @__PURE__ */ react_default.createElement("span", { className: "mono small" }, target))],
      ["Betrag", /* @__PURE__ */ react_default.createElement("strong", { style: { fontSize: 22 } }, fmtM2(minor))],
      ["Begründung", reason.trim()],
      note.trim() && ["Notiz", note.trim()]
    ] }), res && !res.ok && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: res.message || "Fehlgeschlagen." } }), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: sending, onClick: run }, sending ? "Wird gebucht …" : "Verbindlich buchen"), /* @__PURE__ */ react_default.createElement(Btn, { variant: "ghost", disabled: sending, onClick: () => {
      setReview(false);
      setRes(null);
    } }, "Abbrechen")))));
  }
  var REC_EMPTY = { id: "", name: "", description: "", amount: "", direction: "payout", recipient_scope: "account", recipient_account_id: "", schedule_day: "1", start_date: "", end_date: "", budget: "", payment_type: "NORMAL" };
  var REC_ST = { active: ["Aktiv", "ok"], paused: ["Pausiert", "warn"], ended: ["Beendet", ""] };
  var RUN_ST = { success: ["Erfolgreich", "ok"], partial: ["Teilweise", "warn"], failed: ["Fehlgeschlagen", "bad"], skipped: ["Übersprungen", ""], running: ["Läuft", "info"] };
  function Recurring() {
    const app = useApp();
    const [rows, setRows] = useState([]);
    const [sch, setSch] = useState(null);
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [runs, setRuns] = useState(null);
    async function load() {
      const [a, b] = await Promise.all([Bank.call("bank_admin_recurring_list"), Bank.call("bank_scheduler_status")]);
      if (a.ok) setRows(a.rows || []);
      else setMsg({ ok: false, text: a.message });
      if (b.ok) setSch(b);
    }
    useEffect(() => {
      load();
    }, []);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const amountMinor = form ? parseMinor2(form.amount) : null;
    const budgetMinor = form && form.budget ? parseMinor2(form.budget) : null;
    const day = form ? Number(form.schedule_day) : 0;
    const formOk = form && form.name.trim().length >= 2 && amountMinor && day >= 1 && day <= 31 && (!form.budget || budgetMinor) && (form.recipient_scope === "all_users" || uuidOk2(form.recipient_account_id.trim()));
    async function save() {
      setSaving(true);
      const r = await Bank.call("bank_admin_recurring_save", { p: {
        id: form.id || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        amount_minor: amountMinor,
        direction: form.direction,
        recipient_scope: form.recipient_scope,
        recipient_account_id: form.recipient_scope === "account" ? form.recipient_account_id.trim().toLowerCase() : null,
        schedule_day: day,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget_total_minor: budgetMinor,
        payment_type: form.direction === "payout" ? form.payment_type : "NORMAL"
      } });
      setSaving(false);
      if (r.ok) {
        app.note("Dauerzahlung gespeichert: " + form.name.trim(), "ok", "bank");
        Monitor.logAction("Dauerzahlung gespeichert", form.name.trim());
        setForm(null);
        setMsg({ ok: true, text: "Dauerzahlung gespeichert." });
        load();
      } else setMsg({ ok: false, text: r.message || "Speichern fehlgeschlagen." });
    }
    async function setStatus(p, status) {
      const r = await Bank.call("bank_admin_recurring_set_status", { p_id: p.id, p_status: status });
      setMsg(r.ok ? { ok: true, text: "Status geändert." } : { ok: false, text: r.message });
      if (r.ok) Monitor.logAction("Dauerzahlung " + status, p.name);
      load();
    }
    async function runDue() {
      setBusy(true);
      const r = await Bank.call("bank_admin_run_due");
      setBusy(false);
      setMsg(r.ok ? { ok: true, text: r.periods_processed + " Zeitraum/-räume verarbeitet, " + r.periods_failed + " fehlgeschlagen." } : { ok: false, text: r.message });
      if (r.ok) Monitor.logAction("Fällige Dauerzahlungen manuell ausgeführt");
      load();
    }
    function edit(p) {
      setForm({
        id: p.id,
        name: p.name,
        description: p.description || "",
        amount: fmtMinor2(p.amount_minor),
        direction: p.direction,
        recipient_scope: p.recipient_scope,
        recipient_account_id: p.recipient_account_id || "",
        schedule_day: String(p.schedule_day),
        start_date: p.start_date || "",
        end_date: p.end_date || "",
        budget: p.budget_total_minor ? fmtMinor2(p.budget_total_minor) : "",
        payment_type: p.payment_type === "INCOME" ? "INCOME" : "NORMAL"
      });
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, sch && (sch.job_scheduled ? /* @__PURE__ */ react_default.createElement("div", { className: "msg ok" }, "Scheduler aktiv – fällige Zahlungen laufen automatisch.", sch.last_run_at ? " Letzter Lauf: " + fmtDT2(sch.last_run_at) + "." : "") : /* @__PURE__ */ react_default.createElement("div", { className: "msg bad" }, "Kein Scheduler eingerichtet – Dauerzahlungen laufen nicht automatisch (", sch.pg_cron_installed ? "pg_cron aktiv, Job fehlt" : "pg_cron nicht aktiviert", "). Datei ", /* @__PURE__ */ react_default.createElement("code", null, "sql/banking/6d-scheduler-pgcron.sql"), " ausführen.")), sch && sch.due_now > 0 && /* @__PURE__ */ react_default.createElement("div", { className: "msg warn" }, sch.due_now, " Dauerzahlung(en) fällig und nicht ausgeführt."), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: () => setForm({ ...REC_EMPTY }) }, "+ Neue Dauerzahlung"), /* @__PURE__ */ react_default.createElement(Btn, { disabled: busy, onClick: () => {
      if (window.confirm("Alle fälligen Dauerzahlungen jetzt ausführen?")) runDue();
    } }, busy ? "Läuft …" : "Fällige jetzt ausführen"), /* @__PURE__ */ react_default.createElement(Btn, { variant: "ghost", onClick: load }, "Aktualisieren")), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 1100 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Name", "Betrag", "Art", "Richtung", "Empfänger", "Tag", "Zeitraum", "Nächste", "Letzter Lauf", "Status", ""].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, rows.map((p) => /* @__PURE__ */ react_default.createElement("tr", { key: p.id }, /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("strong", null, p.name), p.description && /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, p.description)), /* @__PURE__ */ react_default.createElement("td", { className: "nowrap mono" }, fmtM2(p.amount_minor), p.budget_total_minor ? /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Budget ", fmtMinor2(p.spent_minor), " / ", fmtMinor2(p.budget_total_minor)) : null), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, p.payment_type === "INCOME" ? "Lohn (40 % Steuer)" : "Normal"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, p.direction === "payout" ? "Auszahlung" : "Gebühr"), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, p.recipient_scope === "all_users" ? "Alle aktiven Konten" : p.recipient_name || /* @__PURE__ */ react_default.createElement(Uuid, { id: p.recipient_account_id })), /* @__PURE__ */ react_default.createElement("td", null, p.schedule_day, "."), /* @__PURE__ */ react_default.createElement("td", { className: "nowrap small" }, p.start_date ? fmtD2(p.start_date) : "sofort", " – ", p.end_date ? fmtD2(p.end_date) : "offen"), /* @__PURE__ */ react_default.createElement("td", { className: "nowrap small" }, p.status === "active" ? fmtDT2(p.next_run_at) : "—"), /* @__PURE__ */ react_default.createElement("td", null, p.last_run ? /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Badge, { tone: (RUN_ST[p.last_run.status] || [])[1] }, (RUN_ST[p.last_run.status] || [p.last_run.status])[0]), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, fmtD2(p.last_run.scheduled_for))) : "—"), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: (REC_ST[p.status] || [])[1] }, (REC_ST[p.status] || [p.status])[0])), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { gap: 6 } }, p.status !== "ended" && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => edit(p) }, "Bearbeiten"), p.status === "active" && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setStatus(p, "paused") }, "Pausieren"), p.status === "paused" && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setStatus(p, "active") }, "Fortsetzen"), p.status !== "ended" && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
      if (window.confirm("Endgültig beenden?")) setStatus(p, "ended");
    } }, "Beenden"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: async () => {
      const r = await Bank.call("bank_admin_recurring_runs", { p_id: p.id });
      if (r.ok) setRuns({ p, rows: r.rows || [] });
    } }, "Läufe"))))))), !rows.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Noch keine Dauerzahlungen.")), form && /* @__PURE__ */ react_default.createElement(Dialog, { title: form.id ? "Dauerzahlung bearbeiten" : "Neue Dauerzahlung", wide: true, onClose: () => !saving && setForm(null) }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Input, { label: "Name", value: form.name, onChange: (e) => set("name", e.target.value), placeholder: "z. B. Monatliches Einkommen" }), /* @__PURE__ */ react_default.createElement(Input, { label: "Beschreibung (optional)", value: form.description, onChange: (e) => set("description", e.target.value) }), /* @__PURE__ */ react_default.createElement("div", { className: "cols", style: { gap: 12 } }, /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 150px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Betrag (M$)", value: form.amount, onChange: (e) => set("amount", e.target.value), error: form.amount && !amountMinor ? "Ungültig" : void 0 })), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 220px" } }, /* @__PURE__ */ react_default.createElement(Select, { label: "Richtung", value: form.direction, onChange: (e) => set("direction", e.target.value) }, /* @__PURE__ */ react_default.createElement("option", { value: "payout" }, "Auszahlung (Staatskasse → Konto)"), /* @__PURE__ */ react_default.createElement("option", { value: "charge" }, "Gebühr (Konto → Staatskasse)"))), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 120px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Tag (1–31)", type: "number", value: form.schedule_day, onChange: (e) => set("schedule_day", e.target.value), error: form.schedule_day && !(day >= 1 && day <= 31) ? "1–31" : void 0 }))), /* @__PURE__ */ react_default.createElement(Select, { label: "Zahlungsart", value: form.direction === "payout" ? form.payment_type : "NORMAL", disabled: form.direction !== "payout", onChange: (e) => set("payment_type", e.target.value) }, /* @__PURE__ */ react_default.createElement("option", { value: "NORMAL" }, "Normale Zahlung (steuerfrei)"), /* @__PURE__ */ react_default.createElement("option", { value: "INCOME" }, "Lohn / Einkommen (40 % Steuer)")), /* @__PURE__ */ react_default.createElement(Select, { label: "Empfänger", value: form.recipient_scope, onChange: (e) => set("recipient_scope", e.target.value) }, /* @__PURE__ */ react_default.createElement("option", { value: "account" }, "Ein bestimmtes Konto"), /* @__PURE__ */ react_default.createElement("option", { value: "all_users" }, "Alle aktiven Bürgerkonten")), form.recipient_scope === "account" && /* @__PURE__ */ react_default.createElement(Input, { label: "Konto-UUID", mono: true, value: form.recipient_account_id, onChange: (e) => set("recipient_account_id", e.target.value), error: form.recipient_account_id && !uuidOk2(form.recipient_account_id.trim()) ? "Keine gültige UUID" : void 0 }), /* @__PURE__ */ react_default.createElement("div", { className: "cols", style: { gap: 12 } }, /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 150px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Start (optional)", type: "date", value: form.start_date, onChange: (e) => set("start_date", e.target.value) })), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 150px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Ende (optional)", type: "date", value: form.end_date, onChange: (e) => set("end_date", e.target.value) })), /* @__PURE__ */ react_default.createElement("div", { style: { flex: "1 1 170px" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Gesamtbudget (optional)", value: form.budget, onChange: (e) => set("budget", e.target.value), error: form.budget && !budgetMinor ? "Ungültig" : void 0 }))), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Fällig jeweils 06:00 Uhr (Berlin), höchstens einmal pro Monat. Gebühren werden nie über das Guthaben hinaus eingezogen."), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: !formOk || saving, onClick: save }, saving ? "Speichert …" : "Speichern"), /* @__PURE__ */ react_default.createElement(Btn, { variant: "ghost", disabled: saving, onClick: () => setForm(null) }, "Abbrechen")))), runs && /* @__PURE__ */ react_default.createElement(Dialog, { title: "Läufe · " + runs.p.name, wide: true, onClose: () => setRuns(null) }, !runs.rows.length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Noch keine Ausführung.") : /* @__PURE__ */ react_default.createElement("div", { className: "table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table" }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Zeitraum", "Status", "OK", "Fehler", "Summe", "Meldung"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, runs.rows.map((r) => /* @__PURE__ */ react_default.createElement("tr", { key: r.id }, /* @__PURE__ */ react_default.createElement("td", null, fmtD2(r.scheduled_for)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: (RUN_ST[r.status] || [])[1] }, (RUN_ST[r.status] || [r.status])[0])), /* @__PURE__ */ react_default.createElement("td", null, r.count_ok), /* @__PURE__ */ react_default.createElement("td", null, r.count_failed), /* @__PURE__ */ react_default.createElement("td", { className: "mono" }, fmtM2(r.total_minor)), /* @__PURE__ */ react_default.createElement("td", null, r.error_message || "—"))))))));
  }
  function Tax({ onOpen }) {
    const [view, setView] = useState("overview");
    const [ov, setOv] = useState(null);
    const [acc, setAcc] = useState(null);
    const [page, setPage] = useState(0);
    const [err, setErr] = useState("");
    const today = berlinToday2();
    const [from, setFrom] = useState(today.slice(0, 8) + "01");
    const [to, setTo] = useState(today);
    const [rep, setRep] = useState(null);
    const [busy, setBusy] = useState(false);
    const PAGE = 15;
    useEffect(() => {
      if (view === "overview") Bank.call("bank_admin_tax_overview").then((r) => r.ok ? setOv(r) : setErr(r.message));
    }, [view]);
    useEffect(() => {
      if (view === "account") Bank.call("bank_admin_tax_account", { p_limit: PAGE, p_offset: page * PAGE }).then((r) => r.ok ? setAcc(r) : setErr(r.message));
    }, [view, page]);
    async function loadRep() {
      setErr("");
      if (!from || !to || to < from) {
        setErr("Bitte einen gültigen Zeitraum wählen.");
        return;
      }
      setBusy(true);
      const r = await Bank.call("bank_admin_tax_report", { p_from: from, p_to: to });
      setBusy(false);
      if (r.ok) setRep(r);
      else setErr(r.message || "Bericht fehlgeschlagen.");
    }
    function exportCsv() {
      const header = ["Datum", "Uhrzeit", "Transaktions-ID", "Steuer-ID", "Absender", "Empfänger", "Brutto", "Steuer", "Satz", "Netto", "Zweck"];
      const rows = rep.rows.map((r) => [fmtD2(r.posted_at), fmtT2(r.posted_at), r.id, r.tax_transaction_id, r.sender_name, r.recipient_name, fmtMinor2(r.gross_amount_minor), fmtMinor2(r.tax_amount_minor), String(r.tax_rate).replace(".", ","), fmtMinor2(r.net_amount_minor), r.reference]);
      rows.push([], ["Summe", "", "", "", "", "", fmtMinor2(rep.gross_total_minor), fmtMinor2(rep.tax_total_minor), "", fmtMinor2(rep.net_total_minor), rep.income_payments + " Zahlungen"]);
      downloadText2("steuerbericht-" + rep.from + "_" + rep.to + ".csv", buildCsv2(header, rows));
    }
    const check = (b, t) => /* @__PURE__ */ react_default.createElement("div", { className: b ? "val-ok" : "val-bad", style: { fontWeight: 600 } }, b ? "✓" : "✗", " ", t);
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Tabs, { value: view, onChange: setView, options: [{ value: "overview", label: "Übersicht" }, { value: "account", label: "Steuerkonto" }, { value: "report", label: "Steuerbericht" }] }), err && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: err } }), view === "overview" && ov && /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "stats" }, /* @__PURE__ */ react_default.createElement(Stat, { k: "Steuereinnahmen gesamt (" + String(ov.rate_percent).replace(".", ",") + " %)", v: fmtMinor2(ov.tax_total_minor), m: "M$" }), /* @__PURE__ */ react_default.createElement(Stat, { k: "Heute", v: fmtMinor2(ov.tax_today_minor), m: ov.income_today + " Zahlung(en)" }), /* @__PURE__ */ react_default.createElement(Stat, { k: "Dieser Monat", v: fmtMinor2(ov.tax_month_minor), m: ov.income_month + " Zahlung(en)" }), /* @__PURE__ */ react_default.createElement(Stat, { k: "Dieses Jahr", v: fmtMinor2(ov.tax_year_minor), m: ov.income_year + " Zahlung(en)" })), /* @__PURE__ */ react_default.createElement(Panel, { title: "Lohn- und Einkommenszahlungen" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [["Anzahl", ov.income_payments], ["Brutto", fmtM2(ov.gross_total_minor)], ["Steuer", fmtM2(ov.tax_total_minor)], ["Netto", fmtM2(ov.net_total_minor)]] }), /* @__PURE__ */ react_default.createElement("div", { style: { marginTop: 10 } }, check(ov.consistent, ov.consistent ? "Brutto = Netto + Steuer, Steuerkonto = Summe der Steuern" : "Abweichung – Integritätsprüfung ausführen")))), view === "account" && acc && /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Panel, { title: "Systemkonto „" + acc.account.name + "“ (nur Ansicht)" }, /* @__PURE__ */ react_default.createElement("div", { className: "stat-v" }, fmtM2(acc.account.balance_minor)), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Zuflüsse gesamt ", fmtM2(acc.total_inflow_minor), " · ", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, acc.account.id))), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 1e3 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Zeit", "Ursprung", "Steuer-Tx", "Art", "Gegenpartei", "Brutto", "Steuer", "Satz", "Netto", "Buchung", "Saldo"].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, acc.rows.map((r) => /* @__PURE__ */ react_default.createElement("tr", { key: r.entry_no, className: "click", onClick: () => onOpen(r.origin_transaction_id) }, /* @__PURE__ */ react_default.createElement("td", { className: "nowrap small" }, fmtDT2(r.created_at)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: r.origin_transaction_id })), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Uuid, { id: r.tax_transaction_id })), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, PAY_TYPE_LABEL2[r.payment_type] || r.payment_type), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, r.counterparty_name || "—"), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, fmtMinor2(r.gross_amount_minor)), /* @__PURE__ */ react_default.createElement("td", { className: "num mono " + (r.amount_minor < 0 ? "val-bad" : "val-ok") }, r.amount_minor < 0 ? "−" : "+", fmtMinor2(Math.abs(r.amount_minor))), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, fmtRate2(r.tax_rate)), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, fmtMinor2(r.net_amount_minor)), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(StatusBadge, { s: r.origin_status })), /* @__PURE__ */ react_default.createElement("td", { className: "num mono" }, fmtMinor2(r.balance_after_minor)))))), !acc.rows.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Noch keine Steuerbuchungen.")), /* @__PURE__ */ react_default.createElement(Pager, { page, total: Number(acc.total) || 0, size: PAGE, onPage: setPage })), view === "report" && /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "filters" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Von" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: from, onChange: (e) => setFrom(e.target.value) })), /* @__PURE__ */ react_default.createElement(Field, { label: "Bis" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: to, onChange: (e) => setTo(e.target.value) })), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: busy, onClick: loadRep }, busy ? "Erstellt …" : "Bericht erstellen"), rep && /* @__PURE__ */ react_default.createElement(Btn, { onClick: exportCsv }, "CSV exportieren")), rep && /* @__PURE__ */ react_default.createElement(Panel, { title: "Steuerbericht " + fmtDay2(rep.from) + " – " + fmtDay2(rep.to) }, /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [["Zahlungen", rep.income_payments], ["Brutto", fmtM2(rep.gross_total_minor)], ["Steuer", fmtM2(rep.tax_total_minor)], ["Netto", fmtM2(rep.net_total_minor)]] })), /* @__PURE__ */ react_default.createElement("div", { className: "col-1 stack", style: { gap: 6 } }, check(rep.check_gross_equals_net_plus_tax, "Brutto = Netto + Steuer"), check(rep.check_tax_matches_ledger, "Steuer = Zufluss laut Ledger"), rep.truncated && /* @__PURE__ */ react_default.createElement("div", { className: "msg warn" }, "Nur die ersten 5000 Zahlungen gelistet; Summen vollständig."))))));
  }
  function Integrity() {
    const app = useApp();
    const [r, setR] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    async function check() {
      setBusy(true);
      const x = await Bank.call("bank_admin_integrity");
      setBusy(false);
      if (x.message) setMsg({ ok: false, text: x.message });
      else {
        setR(x);
        app.note("Integritätsprüfung: " + (x.ok ? "in Ordnung" : "ABWEICHUNG"), x.ok ? "ok" : "bad", "bank");
      }
    }
    async function backfill() {
      const x = await Bank.call("bank_admin_backfill");
      setMsg(x.ok ? { ok: true, text: x.created + " fehlende Konto/Konten angelegt." } : { ok: false, text: x.message });
    }
    const line = (ok, text) => /* @__PURE__ */ react_default.createElement("div", { className: ok ? "val-ok" : "val-bad", style: { fontWeight: 600, padding: "4px 0" } }, ok ? "✓" : "✗", " ", text);
    return /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-2" }, /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 22 } }, /* @__PURE__ */ react_default.createElement("h2", null, "Integritätsprüfung"), /* @__PURE__ */ react_default.createElement("p", { className: "muted", style: { margin: "8px 0 14px" } }, "Prüft Kontostände gegen die Buchungssummen, Soll = Haben, Steuerzeilen und die kryptografisch verkettete Buchungsfolge (HMAC)."), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: busy, onClick: check }, busy ? "Prüfe …" : "Jetzt prüfen"), r && /* @__PURE__ */ react_default.createElement("div", { style: { marginTop: 14 } }, line(r.ok, r.ok ? "Alles in Ordnung" : "Abweichungen gefunden!"), line(r.accounts_with_wrong_balance === 0, "Kontostände = Summe der Buchungen (" + r.accounts_with_wrong_balance + " Abweichungen)"), line(r.unbalanced_transactions === 0 && r.ledger_total_minor === 0, "Soll = Haben: Summe " + fmtMinor2(r.ledger_total_minor) + " (" + r.unbalanced_transactions + " unausgeglichen)"), r.tax_payments_inconsistent !== void 0 && line(r.tax_payments_inconsistent === 0 && r.tax_rows_with_ledger_entries === 0 && r.tax_account_matches_payments, "Steuern konsistent (" + r.tax_payments_inconsistent + " Abweichungen)"), line(r.broken_chain_entries === 0 && r.chain_head_matches, "Buchungskette: " + r.entries_checked + " geprüft, " + r.broken_chain_entries + " verändert" + (r.first_broken_entry ? " (erster: Nr. " + r.first_broken_entry + ")" : ""))))), /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Panel, { title: "Konten für bestehende Benutzer" }, /* @__PURE__ */ react_default.createElement("p", { className: "muted small" }, "Legt Bankkonten für Benutzer an, die noch keins haben. Vorhandene Daten bleiben unverändert."), /* @__PURE__ */ react_default.createElement(Btn, { onClick: backfill }, "Fehlende Konten anlegen"), /* @__PURE__ */ react_default.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg })))));
  }

  // portal/pages/Anmeldedaten.jsx
  function Anmeldedaten() {
    const app = useApp();
    const { citizens, me, profiles } = app;
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState(null);
    const [res, setRes] = useState(null);
    const allowed = can(me, "credentials.reset");
    const list = citizens.filter((c) => (displayName(c.name) + c.id + (c.loginEmail || "")).toLowerCase().includes(q.toLowerCase())).sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), "de"));
    async function reset(c) {
      if (!window.confirm("Passwort von " + displayName(c.name) + " zurücksetzen? Das alte Passwort wird sofort ungültig.")) return;
      setBusy(c.id);
      setRes(null);
      const pw = genPassword(12);
      const r = await adminAction("reset-password", { citizen_id: c.id, password: pw });
      setBusy(null);
      if (!r.ok) {
        setRes({ id: c.id, err: r.reason === "Konto nicht gefunden." ? "Diese Person hat noch kein Anmeldekonto." : r.reason || "Fehlgeschlagen." });
        return;
      }
      try {
        await app.mutate(KEYS.REG, (reg) => (reg || []).map((x) => x.id === c.id ? { ...x, pwIsDefault: true } : x), [], "Passwort zurückgesetzt: " + c.id);
      } catch (e) {
      }
      setRes({ id: c.id, name: c.name, pw });
    }
    const defaults = citizens.filter((c) => c.pwIsDefault).length;
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Anmeldedaten & Konten", sub: "Passwörter verwaltet Supabase (bcrypt) – sie sind nirgends einsehbar und lassen sich nur neu setzen" }), defaults > 0 && /* @__PURE__ */ react_default.createElement("div", { className: "alert-bar warn" }, /* @__PURE__ */ react_default.createElement(Badge, { tone: "warn" }, "Hinweis"), /* @__PURE__ */ react_default.createElement("span", { className: "grow" }, defaults, " Konto/Konten nutzen noch ein Start- oder zurückgesetztes Passwort.")), !allowed && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: "Passwörter zurücksetzen ist Ihnen nicht freigegeben." } }), res && (res.err ? /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: res.err } }) : /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: true, text: "Neues Passwort für " + displayName(res.name) + " gesetzt." } }), /* @__PURE__ */ react_default.createElement(Secret, { label: "Neues Passwort", value: res.pw }))), /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { maxWidth: 340 }, placeholder: "Suchen …", value: q, onChange: (e) => setQ(e.target.value), "aria-label": "Suchen" }), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 820 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Konto", "E-Mail (Login)", "Anmeldekonto", "Passwort", "Status", ""].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, list.map((c) => {
      const p = profiles.find((x) => x.citizen_id === c.id);
      return /* @__PURE__ */ react_default.createElement("tr", { key: c.id, className: c.locked ? "row-bad" : "" }, /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("strong", null, displayName(c.name)), /* @__PURE__ */ react_default.createElement("div", { className: "mono small muted" }, c.id, " · L", c.is)), /* @__PURE__ */ react_default.createElement("td", { className: "mono small" }, c.loginEmail || "—"), /* @__PURE__ */ react_default.createElement("td", null, p ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "ok" }, "vorhanden") : /* @__PURE__ */ react_default.createElement(Badge, { tone: "warn" }, "fehlt")), /* @__PURE__ */ react_default.createElement("td", null, c.pwIsDefault ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "warn" }, "Standard") : /* @__PURE__ */ react_default.createElement(Badge, null, "Eigenes")), /* @__PURE__ */ react_default.createElement("td", null, c.locked ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, "Gesperrt") : /* @__PURE__ */ react_default.createElement(Badge, { tone: "ok" }, "Aktiv")), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", disabled: !allowed || busy === c.id || p && p.is_admin && !me.isAdmin, onClick: () => reset(c) }, busy === c.id ? "…" : "Zurücksetzen")));
    }))), !list.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Treffer.")));
  }

  // portal/pages/Antragsarten.jsx
  var DEFAULT_APPTYPES = [
    { id: "reisepass", label: "Reisepass", questions: [] },
    { id: "personalausweis", label: "Personalausweis", questions: [] },
    { id: "militaer", label: "Militärdienst", questions: ["Warum möchten Sie dem Militär beitreten?"] },
    { id: "urkunde", label: "Urkunde", questions: [] }
  ];
  function Antragsarten() {
    const app = useApp();
    const { me, units } = app;
    const full = me.isAdmin || me.is >= CLEARANCE.clearance;
    const mine = manageableUnits(me, units);
    const mineNames = mine.map((u) => u.name);
    const typeUnits = app.val(KEYS.TYPEUNITS, {}) || {};
    const types = (app.val(KEYS.TYPES, []) || []).map((t) => ({ ...normType(t), unit: t.unit || typeUnits[t.id] || inferUnitFromLabel(t.label, units) })).filter((t) => full || mineNames.includes(t.unit)).sort((a, b) => a.label.localeCompare(b.label, "de"));
    const [msg, setMsg] = useState(null);
    const [nf, setNf] = useState({ label: "", questions: [""], unit: "", grantOnAccept: false, cdH: 0, cdM: 0 });
    async function save(fn, text, tu) {
      try {
        await app.mutate(KEYS.TYPES, (list) => fn(Array.isArray(list) ? list : []), [], text);
        if (tu) await app.mutate(KEYS.TYPEUNITS, (m) => ({ ...m || {}, ...tu }), {});
        setMsg({ ok: true, text });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    const update = (t, patch, text) => save((list) => list.map((x) => x.id === t.id ? normType({ ...x, ...patch }) : x), text || "Antragsart geändert: " + t.label, patch.unit !== void 0 ? { [t.id]: patch.unit } : null);
    async function remove(t) {
      if (!window.confirm("Antragsart „" + t.label + "“ löschen? Eingereichte Bewerbungen wandern ins Archiv.")) return;
      await save((list) => list.filter((x) => x.id !== t.id), "Antragsart gelöscht: " + t.label);
      try {
        await app.mutate(KEYS.APPS, (a) => (a || []).map((x) => x.title === t.label && !x.archived ? { ...x, archived: true, archivedAt: Date.now(), archivedReason: "Antragsart gelöscht" } : x), []);
      } catch (e) {
      }
    }
    function add() {
      const id = "at" + Date.now();
      const t = normType({ id, label: nf.label.trim(), questions: nf.questions.map((q) => q.trim()).filter(Boolean), unit: nf.unit, grantOnAccept: nf.grantOnAccept, cooldownH: Math.max(0, Number(nf.cdH) || 0), cooldownM: Math.max(0, Math.min(59, Number(nf.cdM) || 0)) });
      save((list) => [...list, t], "Antragsart angelegt: " + t.label, { [id]: nf.unit });
      setNf({ label: "", questions: [""], unit: "", grantOnAccept: false, cdH: 0, cdM: 0 });
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(
      PageHead,
      {
        title: "Antragsarten",
        sub: "Diese Arten stehen den Bürgern bei „Neue Bewerbung“ zur Auswahl",
        actions: (me.isAdmin || me.is >= 6) && /* @__PURE__ */ react_default.createElement(Btn, { variant: "danger", size: "sm", onClick: () => {
          if (window.confirm("ALLE Antragsarten durch die Standardliste ersetzen?")) save(() => DEFAULT_APPTYPES, "Antragsarten auf Standard zurückgesetzt");
        } }, "Auf Standard zurücksetzen")
      }
    ), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-2 stack" }, !types.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Antragsarten in Ihren Zuordnungen."), types.map((t) => /* @__PURE__ */ react_default.createElement(TypeCard, { key: t.id, t, units: full ? units : mine, onUpdate: update, onRemove: remove }))), /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 20 } }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("h2", null, "Neue Antragsart"), /* @__PURE__ */ react_default.createElement(Input, { label: "Bezeichnung", value: nf.label, onChange: (e) => setNf({ ...nf, label: e.target.value }), placeholder: "z. B. Wohnsitzwechsel" }), /* @__PURE__ */ react_default.createElement(Field, { label: "Fragen (optional)" }, nf.questions.map((q, i) => /* @__PURE__ */ react_default.createElement("div", { key: i, className: "row", style: { flexWrap: "nowrap" } }, /* @__PURE__ */ react_default.createElement("input", { className: "input", value: q, placeholder: "Frage " + (i + 1), onChange: (e) => setNf({ ...nf, questions: nf.questions.map((x, j) => j === i ? e.target.value : x) }) }), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => setNf({ ...nf, questions: nf.questions.length > 1 ? nf.questions.filter((_, j) => j !== i) : [""] }), "aria-label": "Frage entfernen" }, "✕"))), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => setNf({ ...nf, questions: [...nf.questions, ""] }) }, "+ Weitere Frage")), /* @__PURE__ */ react_default.createElement(Field, { label: "Zuständige Zuordnung" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: nf.unit, onChange: (e) => setNf({ ...nf, unit: e.target.value }) }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— wählen —"), (full ? units : mine).slice().sort((a, b) => a.name.localeCompare(b.name, "de")).map((u) => /* @__PURE__ */ react_default.createElement("option", { key: u.id, value: u.name }, u.name)))), /* @__PURE__ */ react_default.createElement("label", { className: "check" }, /* @__PURE__ */ react_default.createElement("input", { type: "checkbox", checked: nf.grantOnAccept, onChange: (e) => setNf({ ...nf, grantOnAccept: e.target.checked }) }), /* @__PURE__ */ react_default.createElement("span", null, "Bei Bewilligung automatisch der Zuordnung hinzufügen")), /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { flexWrap: "nowrap" } }, /* @__PURE__ */ react_default.createElement(Input, { label: "Sperrzeit Std.", type: "number", min: "0", value: nf.cdH, onChange: (e) => setNf({ ...nf, cdH: e.target.value }) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Min.", type: "number", min: "0", max: "59", value: nf.cdM, onChange: (e) => setNf({ ...nf, cdM: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: nf.label.trim().length < 2 || !nf.unit, onClick: add }, "Antragsart hinzufügen"))))));
  }
  function TypeCard({ t, units, onUpdate, onRemove }) {
    const [nq, setNq] = useState("");
    const qs = t.questions || [];
    return /* @__PURE__ */ react_default.createElement(
      Panel,
      {
        title: /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement("h2", null, t.label), /* @__PURE__ */ react_default.createElement(Badge, { tone: qs.length ? "amber" : "" }, qs.length, " Fragen"), !t.unit && /* @__PURE__ */ react_default.createElement(Badge, { tone: "warn" }, "ohne Zuordnung")),
        actions: /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => onRemove(t) }, "Löschen")
      },
      /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { gap: 10 } }, qs.map((q, i) => /* @__PURE__ */ react_default.createElement("div", { key: i, className: "list-row" }, /* @__PURE__ */ react_default.createElement("span", null, /* @__PURE__ */ react_default.createElement("strong", null, i + 1, "."), " ", q), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => onUpdate(t, { questions: qs.filter((_, j) => j !== i) }), "aria-label": "Frage entfernen" }, "✕"))), /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { flexWrap: "nowrap" } }, /* @__PURE__ */ react_default.createElement("input", { className: "input", value: nq, onChange: (e) => setNq(e.target.value), placeholder: "Frage hinzufügen …", onKeyDown: (e) => {
        if (e.key === "Enter" && nq.trim()) {
          onUpdate(t, { questions: [...qs, nq.trim()] });
          setNq("");
        }
      } }), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", disabled: !nq.trim(), onClick: () => {
        onUpdate(t, { questions: [...qs, nq.trim()] });
        setNq("");
      } }, "+ Frage")), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement("label", { className: "field", style: { flex: "1 1 240px" } }, "Zuordnung", /* @__PURE__ */ react_default.createElement("select", { className: "select", value: t.unit || "", onChange: (e) => onUpdate(t, { unit: e.target.value }) }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— keine —"), units.slice().sort((a, b) => a.name.localeCompare(b.name, "de")).map((u) => /* @__PURE__ */ react_default.createElement("option", { key: u.id, value: u.name }, u.name)))), /* @__PURE__ */ react_default.createElement("label", { className: "field", style: { width: 110 } }, "Sperre Std.", /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "number", min: "0", value: t.cooldownH || 0, onChange: (e) => onUpdate(t, { cooldownH: Math.max(0, Number(e.target.value) || 0) }) })), /* @__PURE__ */ react_default.createElement("label", { className: "field", style: { width: 110 } }, "Min.", /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "number", min: "0", max: "59", value: t.cooldownM || 0, onChange: (e) => onUpdate(t, { cooldownM: Math.max(0, Math.min(59, Number(e.target.value) || 0)) }) }))), /* @__PURE__ */ react_default.createElement("label", { className: "check" }, /* @__PURE__ */ react_default.createElement("input", { type: "checkbox", checked: !!t.grantOnAccept, onChange: (e) => onUpdate(t, { grantOnAccept: e.target.checked }) }), /* @__PURE__ */ react_default.createElement("span", null, "Bei Bewilligung automatisch der Zuordnung hinzufügen")))
    );
  }

  // portal/pages/Termine.jsx
  var isPast = (a) => {
    const t = a.dateISO ? (/* @__PURE__ */ new Date(a.dateISO + "T" + (a.time || "00:00") + ":00")).getTime() : null;
    return t == null ? !a.upcoming : t < Date.now();
  };
  function Termine() {
    const app = useApp();
    const { me, citizens, units } = app;
    const all = app.val(KEYS.APPTS, []) || [];
    const [view, setView] = useState("pending");
    const [msg, setMsg] = useState(null);
    const [creating, setCreating] = useState(false);
    const groups = {
      pending: all.filter((a) => a.status === "Angefragt" && !isPast(a)),
      confirmed: all.filter((a) => a.status === "Bestätigt" && !isPast(a)),
      past: all.filter((a) => a.status === "Abgelehnt" || a.status === "Storniert" || isPast(a))
    };
    const list = groups[view].slice().sort((a, b) => String(a.dateISO || "").localeCompare(String(b.dateISO || "")) * (view === "past" ? -1 : 1));
    async function patch(a, p, text) {
      try {
        await app.mutate(KEYS.APPTS, (l) => (l || []).map((x) => x.id === a.id ? { ...x, ...p } : x), [], text);
        setMsg({ ok: true, text });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(
      PageHead,
      {
        title: "Termine",
        sub: "Alle Termine des Portals · bearbeiten darf nur die zuständige Stelle (Level 6 alle)",
        actions: (me.isAdmin || me.is >= CLEARANCE.clearance) && /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: () => setCreating(!creating) }, creating ? "Formular schließen" : "+ Termin für Bürger")
      }
    ), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), creating && /* @__PURE__ */ react_default.createElement(CreateAppt, { citizens, units, onDone: (t) => {
      setCreating(false);
      setMsg({ ok: true, text: t });
    } }), /* @__PURE__ */ react_default.createElement(Tabs, { value: view, onChange: setView, options: [{ value: "pending", label: "Angefragt (" + groups.pending.length + ")" }, { value: "confirmed", label: "Bestätigt (" + groups.confirmed.length + ")" }, { value: "past", label: "Vergangen / Abgelehnt (" + groups.past.length + ")" }] }), !list.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Termine."), /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, list.map((a) => /* @__PURE__ */ react_default.createElement(ApptRow, { key: a.id, a, me, name: displayName(app.nameOf(a.ownerId)), onPatch: patch }))));
  }
  function ApptRow({ a, me, name, onPatch }) {
    const may = canHandleAppt(me, a);
    const [note, setNote] = useState(a.note || "");
    return /* @__PURE__ */ react_default.createElement("section", { className: "panel" }, /* @__PURE__ */ react_default.createElement("div", { className: "panel-h" }, /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, a.title, " — ", name), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, a.date, " · ", a.time, a.endTime ? "–" + a.endTime : "", " Uhr · ", a.office, " · ", a.ref)), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, a.status === "Angefragt" && !isPast(a) ? may ? /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "primary", onClick: () => onPatch(a, { status: "Bestätigt", accepted: true }, "Termin bestätigt: " + a.ref) }, "Annehmen"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => onPatch(a, { status: "Abgelehnt", upcoming: false, accepted: false }, "Termin abgelehnt: " + a.ref) }, "Ablehnen")) : /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, "Nur ", unitShort(a.office), " kann bearbeiten") : /* @__PURE__ */ react_default.createElement(Badge, { tone: a.status === "Bestätigt" ? "ok" : a.status === "Abgelehnt" ? "bad" : "" }, isPast(a) && a.status === "Bestätigt" ? "Erledigt" : a.status))), /* @__PURE__ */ react_default.createElement("div", { className: "panel-b stack", style: { gap: 8 } }, a.grund && /* @__PURE__ */ react_default.createElement("div", { className: "small" }, /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "Grund des Bürgers: "), a.grund), may ? /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { flexWrap: "nowrap", alignItems: "flex-start" } }, /* @__PURE__ */ react_default.createElement("textarea", { className: "textarea", rows: 2, value: note, onChange: (e) => setNote(e.target.value), placeholder: "Notiz für den Bürger …" }), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", disabled: note === (a.note || ""), onClick: () => onPatch(a, { note: note.trim() }, "Terminnotiz gespeichert: " + a.ref) }, "Notiz speichern")) : a.note ? /* @__PURE__ */ react_default.createElement("div", { className: "small" }, /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "Notiz: "), a.note) : null));
  }
  function CreateAppt({ citizens, units, onDone }) {
    const app = useApp();
    const [f, setF] = useState({ ownerId: "", office: "", other: "", date: "", from: "", to: "", note: "" });
    const [err, setErr] = useState("");
    const office = f.office === "__other__" ? f.other.trim() : f.office;
    const valid = f.ownerId && office && f.date && f.from && f.to && f.to > f.from;
    async function submit() {
      const label = (/* @__PURE__ */ new Date(f.date + "T00:00:00")).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
      const mk = (uid, i) => ({
        id: "t" + Date.now() + "_" + i,
        ownerId: uid,
        title: office,
        office,
        date: label,
        dateISO: f.date,
        time: f.from,
        endTime: f.to,
        status: "Bestätigt",
        upcoming: true,
        accepted: true,
        note: f.note.trim(),
        ref: "MK-T-" + (1e3 + window.crypto.getRandomValues(new Uint16Array(1))[0] % 9e3),
        createdBy: app.me.id
      });
      const news = f.ownerId === "__all__" ? citizens.map((c, i) => mk(c.id, i)) : [mk(f.ownerId, 0)];
      try {
        const t = "Termin angelegt: " + office + " am " + label + (f.ownerId === "__all__" ? " (alle Bürger)" : "");
        await app.mutate(KEYS.APPTS, (l) => [...news, ...l || []], [], t);
        onDone(t);
      } catch (e) {
        setErr(e.message);
      }
    }
    return /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 20 } }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("h2", null, "Termin anlegen (bestätigt)"), /* @__PURE__ */ react_default.createElement("div", { className: "cols", style: { gap: 12 } }, /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Bürger" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: f.ownerId, onChange: (e) => setF({ ...f, ownerId: e.target.value }) }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— wählen —"), /* @__PURE__ */ react_default.createElement("option", { value: "__all__" }, "★ Alle Bürger"), citizens.slice().sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), "de")).map((c) => /* @__PURE__ */ react_default.createElement("option", { key: c.id, value: c.id }, displayName(c.name), " · ", c.id))))), /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Stelle" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: f.office, onChange: (e) => setF({ ...f, office: e.target.value }) }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— wählen —"), (units.length ? units.map((u) => u.name) : ALL_UNITS).slice().sort((a, b) => a.localeCompare(b, "de")).map((u) => /* @__PURE__ */ react_default.createElement("option", { key: u }, u)), /* @__PURE__ */ react_default.createElement("option", { value: "__other__" }, "Sonstiges"))))), f.office === "__other__" && /* @__PURE__ */ react_default.createElement("input", { className: "input", value: f.other, onChange: (e) => setF({ ...f, other: e.target.value }), placeholder: "Ort / Stelle", "aria-label": "Stelle" }), /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { alignItems: "flex-end" } }, /* @__PURE__ */ react_default.createElement(Field, { label: "Datum" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", min: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), value: f.date, onChange: (e) => setF({ ...f, date: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Field, { label: "Von" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "time", value: f.from, onChange: (e) => setF({ ...f, from: e.target.value }) })), /* @__PURE__ */ react_default.createElement(Field, { label: "Bis" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "time", value: f.to, onChange: (e) => setF({ ...f, to: e.target.value }) }))), /* @__PURE__ */ react_default.createElement("textarea", { className: "textarea", rows: 2, value: f.note, onChange: (e) => setF({ ...f, note: e.target.value }), placeholder: "Notiz (optional)", "aria-label": "Notiz" }), err && /* @__PURE__ */ react_default.createElement(Msg, { m: { ok: false, text: err } }), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: !valid, onClick: submit }, "Termin anlegen"))));
  }

  // portal/pages/Justiz.jsx
  function Justiz() {
    const [tab, setTab] = useState("records");
    const { val } = useApp();
    const pending = (val(KEYS.WARRANTS, []) || []).filter((w) => w.status === "beantragt").length;
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Justiz & Polizei", sub: "Führungszeugnisse mit Schwärzung nach Stufe · Haftbefehle mit Genehmigungspflicht" }), /* @__PURE__ */ react_default.createElement(Tabs, { value: tab, onChange: setTab, options: [{ value: "records", label: "Führungszeugnisse" }, { value: "warrants", label: "Haftbefehle" + (pending ? " (" + pending + ")" : "") }] }), tab === "records" ? /* @__PURE__ */ react_default.createElement(Records, null) : /* @__PURE__ */ react_default.createElement(Warrants, null));
  }
  function Records() {
    const app = useApp();
    const { me, citizens, units } = app;
    const rank = viewerRank(me);
    const officer = isJusticeOfficer(me);
    const mayDelete = canDeleteRecord(me, units);
    const tiers = REDACT_TIERS.filter((t) => t.rank <= rank);
    const records = (app.val(KEYS.RECORDS, []) || []).filter((r) => officer || r.released);
    const [q, setQ] = useState("");
    const [newFor, setNewFor] = useState("");
    const [msg, setMsg] = useState(null);
    const [openId, setOpenId] = useState(null);
    const save = async (fn, text) => {
      try {
        await app.mutate(KEYS.RECORDS, (l) => fn(l || []), [], text);
        setMsg({ ok: true, text });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    };
    const list = records.filter((r) => (r.citizenName + r.citizenId).toLowerCase().includes(q.toLowerCase())).sort((a, b) => displayName(a.citizenName).localeCompare(displayName(b.citizenName), "de"));
    function create() {
      if (records.some((r) => r.citizenId === newFor)) {
        setMsg({ ok: false, text: "Für diese Person besteht bereits ein Führungszeugnis." });
        return;
      }
      const c = citizens.find((x) => x.id === newFor);
      save((l) => [{ id: "fz" + Date.now(), citizenId: newFor, citizenName: c ? c.name : newFor, createdAt: Date.now(), createdBy: me.id, released: false, entries: [] }, ...l], "Führungszeugnis angelegt: " + newFor);
      setNewFor("");
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("div", { className: "filters" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Suche" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 260 }, value: q, onChange: (e) => setQ(e.target.value) })), officer && /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Field, { label: "Neues Führungszeugnis für" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: newFor, onChange: (e) => setNewFor(e.target.value), style: { minWidth: 260 } }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— Person wählen —"), citizens.filter((c) => !records.some((r) => r.citizenId === c.id)).sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), "de")).map((c) => /* @__PURE__ */ react_default.createElement("option", { key: c.id, value: c.id }, displayName(c.name), " · ", c.id)))), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: !newFor, onClick: create }, "Anlegen")), /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, "Ihre Sichtstufe: ", (REDACT_TIERS.find((t) => t.rank === rank) || { label: "—" }).label)), !list.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Führungszeugnisse."), list.map((r) => {
      const open = openId === r.id;
      const entries = (r.entries || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      return /* @__PURE__ */ react_default.createElement(
        Panel,
        {
          key: r.id,
          title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, displayName(r.citizenName)), /* @__PURE__ */ react_default.createElement("div", { className: "muted small mono" }, r.citizenId, " · ", entries.length, " Eintragung(en) · angelegt ", fmtD2(r.createdAt))),
          actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Badge, { tone: r.released ? "ok" : "" }, r.released ? "Für Polizei freigegeben" : "Intern"), officer && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => save((l) => l.map((x) => x.id === r.id ? { ...x, released: !r.released, releasedAt: !r.released ? Date.now() : null, releasedBy: !r.released ? me.id : null } : x), (r.released ? "Freigabe zurückgezogen: " : "Führungszeugnis freigegeben: ") + r.citizenId) }, r.released ? "Freigabe zurückziehen" : "Freigeben"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setOpenId(open ? null : r.id) }, open ? "Schließen" : "Öffnen"), mayDelete && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
            if (window.confirm("Führungszeugnis mit allen Eintragungen endgültig löschen?")) save((l) => l.filter((x) => x.id !== r.id), "Führungszeugnis gelöscht: " + r.citizenId);
          } }, "Löschen"))
        },
        !open ? /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Zum Ansehen öffnen.") : /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, !entries.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Eintragungen."), entries.map((e) => /* @__PURE__ */ react_default.createElement(
          Entry,
          {
            key: e.id,
            e,
            rank,
            tiers,
            canEdit: officer && rank >= tierRank(e.tier || "alle"),
            onUpdate: (p) => save((l) => l.map((x) => x.id !== r.id ? x : { ...x, entries: (x.entries || []).map((y) => y.id === e.id ? { ...y, ...p } : y) }), "Eintrag geändert: " + r.citizenId),
            onRemove: () => {
              if (window.confirm("Eintrag löschen?")) save((l) => l.map((x) => x.id !== r.id ? x : { ...x, entries: (x.entries || []).filter((y) => y.id !== e.id) }), "Eintrag gelöscht: " + r.citizenId);
            }
          }
        )), officer && /* @__PURE__ */ react_default.createElement(AddEntry, { tiers, onAdd: (d) => save((l) => l.map((x) => x.id !== r.id ? x : { ...x, entries: [...x.entries || [], { id: "e" + Date.now(), date: d.date, title: d.title, detail: d.detail, tier: clampTier(me, d.tier), by: me.id, at: Date.now() }] }), "Eintrag hinzugefügt: " + r.citizenId) }))
      );
    }));
  }
  function Entry({ e, rank, tiers, canEdit, onUpdate, onRemove }) {
    const hidden = rank < tierRank(e.tier || "alle");
    const partial = Object.keys(e.markTitle || {}).length || Object.keys(e.markDetail || {}).length;
    return /* @__PURE__ */ react_default.createElement("div", { className: "list-row", style: { alignItems: "flex-start" } }, /* @__PURE__ */ react_default.createElement("div", { className: "grow" }, /* @__PURE__ */ react_default.createElement("div", { className: "muted small mono" }, e.date || "—", " · Stufe: ", (REDACT_TIERS.find((t) => t.key === (e.tier || "alle")) || {}).label), /* @__PURE__ */ react_default.createElement("div", { style: { fontWeight: 600 } }, redact(e.title, e.markTitle, rank, e.tier)), e.detail && /* @__PURE__ */ react_default.createElement("div", { className: "small", style: { color: "var(--text-2)" } }, redact(e.detail, e.markDetail, rank, e.tier)), hidden || partial ? /* @__PURE__ */ react_default.createElement(Badge, null, hidden ? "Vollständig geschwärzt" : "Teilweise geschwärzt") : null), canEdit && /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", style: { width: 230 }, value: e.tier || "alle", onChange: (ev) => onUpdate({ tier: ev.target.value }), "aria-label": "Sichtbarkeit" }, tiers.map((t) => /* @__PURE__ */ react_default.createElement("option", { key: t.key, value: t.key }, t.label))), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: onRemove }, "Löschen")));
  }
  function AddEntry({ tiers, onAdd }) {
    const [d, setD] = useState({ date: "", title: "", detail: "", tier: "alle" });
    return /* @__PURE__ */ react_default.createElement(Corners, { innerStyle: { padding: 14 } }, /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { gap: 10 } }, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { alignItems: "flex-end" } }, /* @__PURE__ */ react_default.createElement(Field, { label: "Datum" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "date", value: d.date, onChange: (e) => setD({ ...d, date: e.target.value }) })), /* @__PURE__ */ react_default.createElement("div", { className: "grow" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Betreff" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", value: d.title, onChange: (e) => setD({ ...d, title: e.target.value }), placeholder: "z. B. Verwarnung" }))), /* @__PURE__ */ react_default.createElement(Field, { label: "Sichtbar für" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: d.tier, onChange: (e) => setD({ ...d, tier: e.target.value }) }, tiers.map((t) => /* @__PURE__ */ react_default.createElement("option", { key: t.key, value: t.key }, t.label))))), /* @__PURE__ */ react_default.createElement("textarea", { className: "textarea", rows: 2, value: d.detail, onChange: (e) => setD({ ...d, detail: e.target.value }), placeholder: "Sachverhalt (optional)", "aria-label": "Sachverhalt" }), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", size: "sm", disabled: !d.title.trim(), onClick: () => {
      onAdd({ ...d, title: d.title.trim(), detail: d.detail.trim() });
      setD({ date: "", title: "", detail: "", tier: "alle" });
    } }, "Eintrag hinzufügen"))));
  }
  var W_ST = { beantragt: ["Beantragt", "warn"], offen: ["Offen", "bad"], vollstreckt: ["Vollstreckt", "ok"], abgelehnt: ["Abgelehnt", ""] };
  function Warrants() {
    const app = useApp();
    const { me, citizens } = app;
    const officer = isJusticeOfficer(me);
    const see = canSeeRecords(me);
    const warrants = app.val(KEYS.WARRANTS, []) || [];
    const [showDone, setShowDone] = useState(false);
    const [f, setF] = useState({ citizenId: "", reason: "" });
    const [msg, setMsg] = useState(null);
    const save = async (fn, text) => {
      try {
        await app.mutate(KEYS.WARRANTS, (l) => fn(l || []), [], text);
        setMsg({ ok: true, text });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    };
    const by = me.isAdmin ? "Administrator" : me.name;
    function request() {
      const c = citizens.find((x) => x.id === f.citizenId);
      save((l) => [{
        id: "hb" + Date.now(),
        citizenId: f.citizenId,
        citizenName: c ? c.name : f.citizenId,
        reason: f.reason.trim(),
        requestedBy: me.id,
        requestedByName: by,
        at: Date.now(),
        status: officer ? "offen" : "beantragt",
        approvedBy: officer ? me.id : null,
        approvedByName: officer ? by : null,
        approvedAt: officer ? Date.now() : null
      }, ...l], (officer ? "Haftbefehl erlassen: " : "Haftbefehl beantragt: ") + f.citizenId);
      setF({ citizenId: "", reason: "" });
    }
    async function execute(w) {
      if (!window.confirm("Haftbefehl gegen " + displayName(w.citizenName) + " als vollstreckt markieren? Die Inhaftierung wird ins Führungszeugnis eingetragen.")) return;
      const now = Date.now();
      try {
        await app.mutate(KEYS.WARRANTS, (l) => (l || []).map((x) => x.id === w.id ? { ...x, status: "vollstreckt", executedBy: me.id, executedByName: by, executedAt: now } : x), [], "Haftbefehl vollstreckt: " + w.citizenId);
        const entry = {
          id: "e" + now,
          date: new Date(now).toISOString().slice(0, 10),
          title: "Inhaftierung",
          tier: "alle",
          by: me.id,
          at: now,
          fromWarrant: w.id,
          detail: "Die Person wurde inhaftiert. Der Haftbefehl wegen „" + w.reason + "“ wurde von " + displayName(by) + " vollstreckt." + (w.approvedByName ? " Genehmigt durch " + displayName(w.approvedByName) + "." : "")
        };
        await app.mutate(KEYS.RECORDS, (l) => {
          const list2 = l || [];
          const ex = list2.find((r) => r.citizenId === w.citizenId);
          return ex ? list2.map((r) => r.id === ex.id ? { ...r, entries: [...r.entries || [], entry] } : r) : [{ id: "fz" + now, citizenId: w.citizenId, citizenName: w.citizenName, createdAt: now, createdBy: me.id, released: true, entries: [entry] }, ...list2];
        }, []);
        setMsg({ ok: true, text: "Vollstreckt und im Führungszeugnis vermerkt." });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    const list = warrants.filter((w) => showDone || w.status === "beantragt" || w.status === "offen");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), see && /* @__PURE__ */ react_default.createElement("div", { className: "filters" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Person" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", style: { minWidth: 260 }, value: f.citizenId, onChange: (e) => setF({ ...f, citizenId: e.target.value }) }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— wählen —"), citizens.slice().sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), "de")).map((c) => /* @__PURE__ */ react_default.createElement("option", { key: c.id, value: c.id }, displayName(c.name), " · ", c.id)))), /* @__PURE__ */ react_default.createElement("div", { className: "grow" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Grund" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", value: f.reason, onChange: (e) => setF({ ...f, reason: e.target.value }) }))), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: !f.citizenId || !f.reason.trim(), onClick: request }, officer ? "Haftbefehl erlassen" : "Beantragen")), /* @__PURE__ */ react_default.createElement("label", { className: "check" }, /* @__PURE__ */ react_default.createElement("input", { type: "checkbox", checked: showDone, onChange: (e) => setShowDone(e.target.checked) }), /* @__PURE__ */ react_default.createElement("span", null, "Erledigte (vollstreckt / abgelehnt) anzeigen")), /* @__PURE__ */ react_default.createElement("section", { className: "panel table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table", style: { minWidth: 900 } }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, ["Person", "Grund", "Beantragt", "Genehmigt", "Status", ""].map((h) => /* @__PURE__ */ react_default.createElement("th", { key: h }, h)))), /* @__PURE__ */ react_default.createElement("tbody", null, list.map((w) => /* @__PURE__ */ react_default.createElement("tr", { key: w.id, className: w.status === "offen" ? "row-bad" : w.status === "beantragt" ? "row-warn" : "" }, /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("strong", null, displayName(w.citizenName)), /* @__PURE__ */ react_default.createElement("div", { className: "mono small muted" }, w.citizenId)), /* @__PURE__ */ react_default.createElement("td", null, w.reason), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, w.requestedByName ? displayName(w.requestedByName) : "—", /* @__PURE__ */ react_default.createElement("div", { className: "muted" }, fmtDT2(w.at))), /* @__PURE__ */ react_default.createElement("td", { className: "small" }, w.approvedByName ? displayName(w.approvedByName) : "—", w.approvedAt && /* @__PURE__ */ react_default.createElement("div", { className: "muted" }, fmtDT2(w.approvedAt))), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement(Badge, { tone: (W_ST[w.status] || [])[1] }, (W_ST[w.status] || [w.status])[0])), /* @__PURE__ */ react_default.createElement("td", null, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { gap: 6 } }, w.status === "beantragt" && officer && /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "primary", onClick: () => save((l) => l.map((x) => x.id === w.id ? { ...x, status: "offen", approvedBy: me.id, approvedByName: by, approvedAt: Date.now() } : x), "Haftbefehl genehmigt: " + w.citizenId) }, "Genehmigen"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => save((l) => l.map((x) => x.id === w.id ? { ...x, status: "abgelehnt", approvedBy: me.id, approvedByName: by, approvedAt: Date.now() } : x), "Haftbefehl abgelehnt: " + w.citizenId) }, "Ablehnen")), w.status === "offen" && see && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => execute(w) }, "Vollstreckt"), officer && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => {
      if (window.confirm("Haftbefehl löschen?")) save((l) => l.filter((x) => x.id !== w.id), "Haftbefehl gelöscht: " + w.citizenId);
    } }, "Löschen"))))))), !list.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine offenen Haftbefehle.")));
  }

  // portal/config.js
  var ABIS_NAME = window.NDPortalModel.ABIS_NAME;
  var CONSOLE_MIN_LEVEL = window.NDPortalModel.CONSOLE_MIN_LEVEL;
  var IDLE_LOGOUT_MIN = window.NDAuth.idleMinutes;
  var SUPABASE_URL = window.NDAuth.portalUrl;
  var APP_VERSION = window.ND_VERSION.name;

  // portal/pages/Kommunikation.jsx
  function isAgent(me) {
    if (me.deny.includes("support.agent")) return false;
    if (me.allow.includes("support.agent")) return true;
    return me.isAdmin || me.ministries.includes(ABIS_NAME);
  }
  function Kommunikation() {
    const { me } = useApp();
    const tabs = [
      can(me, "chat.all") && { value: "chat", label: "Chat-Überwachung" },
      isAgent(me) && { value: "support", label: "Support-Tickets" },
      can(me, "feedback.view") && { value: "feedback", label: "Feedback" },
      can(me, "announce.post") && { value: "announce", label: "Ankündigungen" }
    ].filter(Boolean);
    const [tab, setTab] = useState(tabs[0] ? tabs[0].value : "");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Kommunikation", sub: "Chats, Support und Bekanntmachungen des Bürgerportals" }), !tabs.length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Für keinen Kommunikationsbereich freigeschaltet.") : /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Tabs, { value: tab, onChange: setTab, options: tabs }), tab === "chat" && /* @__PURE__ */ react_default.createElement(Chat, null), tab === "support" && /* @__PURE__ */ react_default.createElement(Support, null), tab === "feedback" && /* @__PURE__ */ react_default.createElement(Feedback, null), tab === "announce" && /* @__PURE__ */ react_default.createElement(Announce, null)));
  }
  function Chat() {
    const app = useApp();
    const chat = app.val(KEYS.CHAT, { channels: [] }) || { channels: [] };
    const channels = (chat.channels || []).slice().sort((a, b) => (b.messages || []).length - (a.messages || []).length);
    const [sel, setSel] = useState(channels[0] ? channels[0].id : null);
    const [q, setQ] = useState("");
    const [msg, setMsg] = useState(null);
    const ch = channels.find((c) => c.id === sel);
    const mayDelete = can(app.me, "chat.delete");
    const hits = q.trim() ? channels.flatMap((c) => (c.messages || []).filter((m) => String(m.text).toLowerCase().includes(q.toLowerCase())).map((m) => ({ ...m, ch: c }))) : null;
    async function del(cid, mid) {
      if (!window.confirm("Nachricht löschen?")) return;
      try {
        await app.mutate(KEYS.CHAT, (d) => ({ ...d || {}, channels: (d && d.channels || []).map((c) => c.id === cid ? { ...c, messages: (c.messages || []).filter((m) => m.id !== mid) } : c) }), { channels: [] }, "Chatnachricht gelöscht (" + cid + ")");
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    const Line = ({ m, cid }) => /* @__PURE__ */ react_default.createElement("li", { className: "list-row", style: { alignItems: "flex-start" } }, /* @__PURE__ */ react_default.createElement("div", { className: "grow" }, /* @__PURE__ */ react_default.createElement("div", { className: "small" }, /* @__PURE__ */ react_default.createElement("strong", null, displayName(app.nameOf(m.from))), " ", /* @__PURE__ */ react_default.createElement("span", { className: "muted mono" }, fmtDT2(m.at))), /* @__PURE__ */ react_default.createElement("div", { style: { whiteSpace: "pre-wrap", wordBreak: "break-word" } }, m.text)), mayDelete && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => del(cid, m.id), "aria-label": "Nachricht löschen" }, "✕"));
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { maxWidth: 380 }, placeholder: "Alle Chats durchsuchen …", value: q, onChange: (e) => setQ(e.target.value), "aria-label": "Chats durchsuchen" }), hits ? /* @__PURE__ */ react_default.createElement(Panel, { title: hits.length + " Treffer" }, !hits.length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Nichts gefunden.") : /* @__PURE__ */ react_default.createElement("ul", { style: { listStyle: "none", margin: 0, padding: 0 } }, hits.slice(0, 200).map((m) => /* @__PURE__ */ react_default.createElement("div", { key: m.ch.id + m.id }, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow" }, m.ch.name || m.ch.id), /* @__PURE__ */ react_default.createElement(Line, { m, cid: m.ch.id }))))) : /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-1", style: { maxWidth: 340 } }, /* @__PURE__ */ react_default.createElement("section", { className: "panel" }, channels.map((c) => /* @__PURE__ */ react_default.createElement("button", { key: c.id, type: "button", className: "nav-item " + (sel === c.id ? "active" : ""), style: { margin: 0, borderWidth: 0, borderBottom: "1px solid var(--line)" }, onClick: () => setSel(c.id) }, /* @__PURE__ */ react_default.createElement("span", null, c.type === "public" ? c.name || "Öffentlich" : c.name || (c.members || []).map((m) => displayName(app.nameOf(m)).split(",")[0]).join(", ")), /* @__PURE__ */ react_default.createElement("span", { className: "mono small" }, (c.messages || []).length))))), /* @__PURE__ */ react_default.createElement("div", { className: "col-2" }, ch ? /* @__PURE__ */ react_default.createElement(Panel, { title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, ch.name || "Privater Chat"), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, ch.type === "public" ? "Öffentlich" : "Privat · " + (ch.members || []).map((m) => displayName(app.nameOf(m))).join(" · "))) }, !(ch.messages || []).length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Nachrichten.") : /* @__PURE__ */ react_default.createElement("ul", { style: { listStyle: "none", margin: 0, padding: 0, maxHeight: 600, overflowY: "auto" } }, (ch.messages || []).slice().reverse().map((m) => /* @__PURE__ */ react_default.createElement(Line, { key: m.id, m, cid: ch.id })))) : /* @__PURE__ */ react_default.createElement(Empty, null, "Kein Chat gewählt."))));
  }
  function Support() {
    const app = useApp();
    const tickets = ((app.val(KEYS.SUPPORT, { tickets: [] }) || {}).tickets || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const [sel, setSel] = useState(null);
    const [text, setText] = useState("");
    const [msg, setMsg] = useState(null);
    const t = tickets.find((x) => x.id === sel);
    const save = async (fn, log) => {
      try {
        await app.mutate(KEYS.SUPPORT, (d) => ({ ...d || {}, tickets: fn(d && d.tickets || []) }), { tickets: [] }, log);
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    };
    const send = () => {
      const tt = text.trim();
      if (!tt) return;
      save((l) => l.map((x) => x.id === t.id ? { ...x, messages: [...x.messages || [], { id: "sm" + Date.now(), from: app.me.id, text: tt, at: Date.now() }] } : x), "Support-Antwort: " + t.subject);
      setText("");
    };
    return /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-1", style: { maxWidth: 380 } }, /* @__PURE__ */ react_default.createElement("section", { className: "panel" }, !tickets.length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Tickets.") : tickets.map((x) => /* @__PURE__ */ react_default.createElement("button", { key: x.id, type: "button", className: "nav-item " + (sel === x.id ? "active" : ""), style: { margin: 0, borderWidth: 0, borderBottom: "1px solid var(--line)", display: "block", textTransform: "none", letterSpacing: "0.02em" }, onClick: () => setSel(x.id) }, /* @__PURE__ */ react_default.createElement("div", { className: "row-between" }, /* @__PURE__ */ react_default.createElement("strong", null, x.subject), /* @__PURE__ */ react_default.createElement(Badge, { tone: x.status === "offen" ? "warn" : "" }, x.status)), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, displayName(app.nameOf(x.ownerId)), " · ", fmtDT2(x.createdAt)))))), /* @__PURE__ */ react_default.createElement("div", { className: "col-2" }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), !t ? /* @__PURE__ */ react_default.createElement(Empty, null, "Ticket auswählen.") : /* @__PURE__ */ react_default.createElement(
      Panel,
      {
        title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, t.subject), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, displayName(app.nameOf(t.ownerId)), " · ", fmtDT2(t.createdAt))),
        actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement("select", { className: "select", style: { width: 170 }, value: t.status, onChange: (e) => save((l) => l.map((x) => x.id === t.id ? { ...x, status: e.target.value } : x), "Ticketstatus " + e.target.value + ": " + t.subject), "aria-label": "Status" }, [...new Set(["offen", "in Bearbeitung", "erledigt", "geschlossen", t.status].filter(Boolean))].map((s) => /* @__PURE__ */ react_default.createElement("option", { key: s }, s))), can(app.me, "support.delete") && /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
          if (window.confirm("Ticket vollständig löschen?")) {
            save((l) => l.filter((x) => x.id !== t.id), "Support-Ticket gelöscht: " + t.subject);
            setSel(null);
          }
        } }, "Löschen"))
      },
      /* @__PURE__ */ react_default.createElement("ul", { className: "log", style: { letterSpacing: "0.04em" } }, (t.messages || []).map((m) => /* @__PURE__ */ react_default.createElement("li", { key: m.id, className: m.from === t.ownerId ? "" : "warn" }, displayName(app.nameOf(m.from)), ": ", m.text, /* @__PURE__ */ react_default.createElement("span", { className: "t" }, fmtDT2(m.at))))),
      /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { marginTop: 12, gap: 8 } }, /* @__PURE__ */ react_default.createElement(Textarea, { label: "Antwort", value: text, onChange: (e) => setText(e.target.value) }), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: !text.trim(), onClick: send }, "Senden")))
    )));
  }
  function Feedback() {
    const app = useApp();
    const list = (app.val(KEYS.FEATURES, []) || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
    const save = (fn, log) => app.mutate(KEYS.FEATURES, (l) => fn(l || []), [], log);
    if (!list.length) return /* @__PURE__ */ react_default.createElement(Empty, null, "Kein Feedback eingegangen.");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, list.map((f) => /* @__PURE__ */ react_default.createElement(
      Panel,
      {
        key: f.id,
        title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, f.title), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, f.byName || app.nameOf(f.by), " · ", fmtDT2(f.at))),
        actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement("select", { className: "select", style: { width: 160 }, value: f.status || "offen", onChange: (e) => save((l) => l.map((x) => x.id === f.id ? { ...x, status: e.target.value } : x), "Feedback " + e.target.value + ": " + f.title), "aria-label": "Status" }, [...new Set(["offen", "geplant", "umgesetzt", "abgelehnt", f.status].filter(Boolean))].map((s) => /* @__PURE__ */ react_default.createElement("option", { key: s }, s))), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
          if (window.confirm("Feedback löschen?")) save((l) => l.filter((x) => x.id !== f.id), "Feedback gelöscht: " + f.title);
        } }, "Löschen"))
      },
      /* @__PURE__ */ react_default.createElement("div", { style: { whiteSpace: "pre-wrap" } }, f.text)
    )));
  }
  function Announce() {
    const app = useApp();
    const list = app.val(KEYS.ANNOUNCE, []) || [];
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");
    const [msg, setMsg] = useState(null);
    async function post() {
      const a = { id: "an" + Date.now(), title: title.trim(), text: text.trim(), by: app.me.id, byName: app.me.isAdmin ? "Administrator" : app.me.name, at: Date.now() };
      try {
        await app.mutate(KEYS.ANNOUNCE, (l) => [a, ...l || []], [], "Ankündigung veröffentlicht: " + a.title);
        setTitle("");
        setText("");
        setMsg({ ok: true, text: "Veröffentlicht." });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Panel, { title: "Neue Ankündigung", className: "y" }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Input, { label: "Titel", value: title, onChange: (e) => setTitle(e.target.value) }), /* @__PURE__ */ react_default.createElement(Textarea, { label: "Text", rows: 5, value: text, onChange: (e) => setText(e.target.value) }), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: !title.trim() || !text.trim(), onClick: post }, "Veröffentlichen"))))), /* @__PURE__ */ react_default.createElement("div", { className: "col-2 stack" }, !list.length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Ankündigungen.") : list.map((a) => /* @__PURE__ */ react_default.createElement(
      Panel,
      {
        key: a.id,
        title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, a.title), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, a.byName, " · ", fmtDT2(a.at))),
        actions: /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
          if (window.confirm("Ankündigung entfernen?")) app.mutate(KEYS.ANNOUNCE, (l) => (l || []).filter((x) => x.id !== a.id), [], "Ankündigung entfernt: " + a.title);
        } }, "Entfernen")
      },
      /* @__PURE__ */ react_default.createElement("div", { style: { whiteSpace: "pre-wrap" } }, a.text)
    ))));
  }

  // portal/components/CapPicker.jsx
  function CapPicker({ value, onChange, showNav = true, disabled }) {
    const allow = value.allow || [], deny = value.deny || [];
    function set(cap, st) {
      const a = allow.filter((c) => c !== cap), d = deny.filter((c) => c !== cap);
      if (st === "allow") a.push(cap);
      if (st === "deny") d.push(cap);
      onChange({ allow: a, deny: d });
    }
    const stateOf = (cap) => allow.includes(cap) ? "allow" : deny.includes(cap) ? "deny" : "default";
    const Tri = ({ cap, label, hint }) => {
      const st = stateOf(cap);
      return /* @__PURE__ */ react_default.createElement("div", { className: "list-row" }, /* @__PURE__ */ react_default.createElement("span", null, label, hint && /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, " · ", hint)), /* @__PURE__ */ react_default.createElement("span", { className: "tri", role: "group", "aria-label": label }, [["default", "Standard"], ["allow", "Erteilt"], ["deny", "Entzogen"]].map(([k, l]) => /* @__PURE__ */ react_default.createElement("button", { key: k, type: "button", disabled, "aria-pressed": st === k, className: st === k ? "on-" + k : "", onClick: () => set(cap, k) }, l))));
    };
    const groups = [...new Set(CAPS.map((c) => c.group))];
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { gap: 16 } }, showNav && /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 4 } }, "Bereiche im Portal"), PORTAL_NAV.map((n) => /* @__PURE__ */ react_default.createElement(Tri, { key: n.id, cap: "nav:" + n.id, label: n.label, hint: n.need ? "sonst ab Level " + n.need : null }))), groups.map((g) => /* @__PURE__ */ react_default.createElement("div", { key: g }, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 4 } }, g), CAPS.filter((c) => c.group === g).map((c) => /* @__PURE__ */ react_default.createElement(Tri, { key: c.id, cap: c.id, label: c.label, hint: c.level <= 6 ? "sonst ab Level " + c.level : "sonst nur Administrator" })))));
  }

  // portal/pages/Zuordnungen.jsx
  var KIND = { ministerium: "Ministerium", organ: "Organ", bundes: "Bundesverwaltung" };
  function Zuordnungen() {
    const app = useApp();
    const { units, citizens } = app;
    const [name, setName] = useState("");
    const [kind, setKind] = useState("ministerium");
    const [msg, setMsg] = useState(null);
    const [openId, setOpenId] = useState(null);
    const save = async (fn, text) => {
      try {
        await app.mutate(KEYS.UNITS, (l) => fn((l || []).map(normUnit)).map(normUnit), [], text);
        setMsg({ ok: true, text });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    };
    const patch = (u, p, text) => save((l) => l.map((x) => x.id === u.id ? { ...x, ...p } : x), text || "Zuordnung geändert: " + u.name);
    const members = (u) => citizens.filter((c) => c.ministries.includes(u.name));
    function add() {
      const n = name.trim();
      if (n.length < 2) return setMsg({ ok: false, text: "Bitte einen Namen angeben." });
      if (units.some((u) => u.name.toLowerCase() === n.toLowerCase())) return setMsg({ ok: false, text: "Diese Zuordnung gibt es bereits." });
      save((l) => [...l, { id: "u" + Date.now(), name: n, kind, nav: [], autoLevel: 0 }], "Zuordnung angelegt: " + n);
      setName("");
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Zuordnungen", sub: "Ministerien, Organe und Ämter · Rechte gelten für alle Mitglieder" }), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 16 } }, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { alignItems: "flex-end" } }, /* @__PURE__ */ react_default.createElement("div", { className: "grow" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Neue Zuordnung" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", value: name, onChange: (e) => setName(e.target.value), placeholder: "z. B. Bildungsministerium" }))), /* @__PURE__ */ react_default.createElement(Field, { label: "Art" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: kind, onChange: (e) => setKind(e.target.value) }, Object.entries(KIND).map(([k, l]) => /* @__PURE__ */ react_default.createElement("option", { key: k, value: k }, l)))), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: add }, "Anlegen"))), units.slice().sort((a, b) => a.name.localeCompare(b.name, "de")).map((u) => {
      const open = openId === u.id;
      const ms = members(u);
      return /* @__PURE__ */ react_default.createElement(
        Panel,
        {
          key: u.id,
          title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, u.name), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, KIND[u.kind], " · ", ms.length, " Mitglied(er) · ", u.nav.length, " Bereich(e)", u.autoLevel ? " · automatisch Level " + u.autoLevel : "", u.boss ? " · Leitung: " + displayName(app.nameOf(u.boss)) : "")),
          actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setOpenId(open ? null : u.id) }, open ? "Schließen" : "Bearbeiten"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => {
            if (window.confirm("Zuordnung „" + u.name + "“ löschen? Mitglieder verlieren die hier vergebenen Rechte.")) save((l) => l.filter((x) => x.id !== u.id), "Zuordnung gelöscht: " + u.name);
          } }, "Löschen"))
        },
        !open ? /* @__PURE__ */ react_default.createElement("div", { className: "small muted" }, ms.length ? ms.map((c) => displayName(c.name)).join(", ") : "Keine Mitglieder.") : /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { alignItems: "flex-end" } }, /* @__PURE__ */ react_default.createElement("div", { className: "grow" }, /* @__PURE__ */ react_default.createElement(Field, { label: "Name" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", defaultValue: u.name, onBlur: (e) => {
          if (e.target.value.trim() && e.target.value.trim() !== u.name) patch(u, { name: e.target.value.trim() });
        } }))), /* @__PURE__ */ react_default.createElement(Field, { label: "Art" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: u.kind, onChange: (e) => patch(u, { kind: e.target.value }) }, Object.entries(KIND).map(([k, l]) => /* @__PURE__ */ react_default.createElement("option", { key: k, value: k }, l)))), /* @__PURE__ */ react_default.createElement(Field, { label: "Leitung" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: u.boss || "", onChange: (e) => patch(u, { boss: e.target.value }, "Leitung gesetzt: " + u.name), style: { minWidth: 220 } }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— keine —"), ms.map((c) => /* @__PURE__ */ react_default.createElement("option", { key: c.id, value: c.id }, displayName(c.name))))), /* @__PURE__ */ react_default.createElement(Field, { label: "Mindest-Level" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: u.autoLevel, onChange: (e) => patch(u, { autoLevel: Number(e.target.value) }, "Mindest-Level " + u.name + " → " + e.target.value) }, [0, 1, 2, 3, 4, 5, 6].map((l) => /* @__PURE__ */ react_default.createElement("option", { key: l, value: l }, l ? l + " · " + IS_LABEL[l] : "keins"))))), u.autoLevel >= 5 && /* @__PURE__ */ react_default.createElement("div", { className: "msg warn" }, "Achtung: Alle Mitglieder erhalten in der Oberfläche mindestens Level ", u.autoLevel, ". (Die Datenbank-Rechte richten sich weiter nach dem Profil-Level.)"), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 6 } }, "Freigegebene Bereiche im Portal"), /* @__PURE__ */ react_default.createElement("div", { className: "chips" }, PORTAL_NAV.map((n) => /* @__PURE__ */ react_default.createElement(
          "button",
          {
            key: n.id,
            type: "button",
            className: "chip " + (u.nav.includes(n.id) ? "on" : ""),
            onClick: () => patch(u, { nav: u.nav.includes(n.id) ? u.nav.filter((x) => x !== n.id) : [...u.nav, n.id] })
          },
          u.nav.includes(n.id) ? "✓ " : "",
          n.label,
          n.need ? " · L" + n.need : ""
        )))), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { marginBottom: 6 } }, "Einzelrechte für Mitglieder"), /* @__PURE__ */ react_default.createElement(CapPicker, { value: { allow: u.allow, deny: u.deny }, showNav: false, onChange: (v) => patch(u, { allow: v.allow, deny: v.deny }, "Rechte geändert: " + u.name) })), /* @__PURE__ */ react_default.createElement("div", { className: "small" }, /* @__PURE__ */ react_default.createElement("span", { className: "muted" }, "Mitglieder: "), ms.length ? ms.map((c) => displayName(c.name)).join(", ") : "—", " ", ms.length > 0 && /* @__PURE__ */ react_default.createElement(Badge, null, ms.length)))
      );
    }));
  }

  // portal/pages/Berechtigungen.jsx
  function Berechtigungen() {
    const app = useApp();
    const { citizens, perms } = app;
    const [q, setQ] = useState("");
    const [openId, setOpenId] = useState(null);
    const [msg, setMsg] = useState(null);
    const [onlySet, setOnlySet] = useState(false);
    async function save(c, p) {
      try {
        await app.mutate(KEYS.PERMS, (m) => ({ ...m || {}, [c.id]: normPerm(p) }), {}, "Berechtigungen geändert: " + c.name + " (" + c.id + ")");
        setMsg({ ok: true, text: "Gespeichert: " + displayName(c.name) });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    const list = citizens.filter((c) => (!q || (displayName(c.name) + c.id).toLowerCase().includes(q.toLowerCase())) && (!onlySet || normPerm(perms[c.id]).allow.length + normPerm(perms[c.id]).deny.length > 0)).sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), "de"));
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Berechtigungen", sub: "„Entzogen“ gilt immer – auch gegen Level und Zuordnung. Der Administrator behält stets alle Rechte." }), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement("div", { className: "filters", style: { alignItems: "center" } }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { maxWidth: 340 }, placeholder: "Name oder Bürger-Nr. …", value: q, onChange: (e) => setQ(e.target.value), "aria-label": "Suchen" }), /* @__PURE__ */ react_default.createElement("label", { className: "check" }, /* @__PURE__ */ react_default.createElement("input", { type: "checkbox", checked: onlySet, onChange: (e) => setOnlySet(e.target.checked) }), /* @__PURE__ */ react_default.createElement("span", null, "Nur Personen mit Sonderrechten"))), !list.length && /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Treffer."), list.map((c) => {
      const p = normPerm(perms[c.id]);
      const open = openId === c.id;
      return /* @__PURE__ */ react_default.createElement(
        Panel,
        {
          key: c.id,
          title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, displayName(c.name)), /* @__PURE__ */ react_default.createElement("div", { className: "mono small muted" }, c.id, " · L", c.is)),
          actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, p.allow.length > 0 && /* @__PURE__ */ react_default.createElement(Badge, { tone: "ok" }, p.allow.length, " erteilt"), p.deny.length > 0 && /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, p.deny.length, " entzogen"), !p.allow.length && !p.deny.length && /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, "Standard"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setOpenId(open ? null : c.id) }, open ? "Schließen" : "Bearbeiten"))
        },
        open ? /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(CapPicker, { value: p, onChange: (v) => save(c, v) }), p.allow.length + p.deny.length > 0 && /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => save(c, { allow: [], deny: [] }) }, "Alles auf Standard"))) : /* @__PURE__ */ react_default.createElement("div", { className: "small muted" }, [...p.allow.map((x) => "+" + x), ...p.deny.map((x) => "−" + x)].join("  ") || "Keine Sonderrechte.")
      );
    }));
  }

  // portal/pages/Auswertungen.jsx
  function Auswertungen() {
    const [tab, setTab] = useState("wahlen");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Wahl- & Umfrage-Auswertung", sub: "Nur echte Stimmen – Anpassungen wirken ausschließlich auf die öffentlich angezeigten Ergebnisse" }), /* @__PURE__ */ react_default.createElement(Tabs, { value: tab, onChange: setTab, options: [{ value: "wahlen", label: "Wahlen" }, { value: "umfragen", label: "Umfragen" }] }), tab === "wahlen" ? /* @__PURE__ */ react_default.createElement(Elections, null) : /* @__PURE__ */ react_default.createElement(Surveys, null));
  }
  function Adjust({ items, current, onSave }) {
    const [open, setOpen] = useState(false);
    const [v, setV] = useState({});
    if (!open) return /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => {
      const o = {};
      items.forEach((it) => {
        o[it.key] = String(Number(current[it.key]) || 0);
      });
      setV(o);
      setOpen(true);
    } }, "Ergebnis anpassen");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { gap: 6, borderTop: "1px solid var(--line)", paddingTop: 10 } }, /* @__PURE__ */ react_default.createElement("div", { className: "msg warn" }, "Zusatzstimmen (auch negativ) verändern das öffentlich angezeigte Ergebnis. Die Änderung wird protokolliert."), items.map((it) => /* @__PURE__ */ react_default.createElement("div", { key: it.key, className: "list-row" }, /* @__PURE__ */ react_default.createElement("span", null, it.label, " ", /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, "(echt: ", it.real, ")")), /* @__PURE__ */ react_default.createElement("input", { className: "input", type: "number", style: { width: 100 }, value: v[it.key], onChange: (e) => setV({ ...v, [it.key]: e.target.value }), "aria-label": "Zusatzstimmen " + it.label }))), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "primary", onClick: () => {
      onSave(v);
      setOpen(false);
    } }, "Speichern"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => setOpen(false) }, "Abbrechen")));
  }
  function Elections() {
    const app = useApp();
    const { citizens, me } = app;
    const rig = can(me, "result.rig");
    const list = (app.val(KEYS.ELECTIONS, []) || []).slice().sort((a, b) => String(b.startsAt || "").localeCompare(String(a.startsAt || "")));
    const [msg, setMsg] = useState(null);
    const phaseL = { wahl: ["Wahl läuft", "ok"], ankuendigung: ["Angekündigt", "warn"], beendet: ["Beendet", ""] };
    if (!list.length) return /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Wahlen vorhanden.");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), list.map((e) => {
      const cands = e.candidates || [];
      const votes = e.votes || {};
      const phase = electionPhase(e);
      const entries = Object.entries(votes).map(([uid, x]) => ({ uid, cand: x.cand, at: x.at })).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      const nonVoters = citizens.filter((c) => !votes[c.id]);
      const total = entries.length || 1;
      return /* @__PURE__ */ react_default.createElement(
        Panel,
        {
          key: e.id,
          title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, "Wahl: ", e.office), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, cands.length, " Kandidaturen · ", fmtDT2(e.startsAt), " – ", fmtDT2(e.endsAt))),
          actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Badge, { tone: phaseL[phase][1] }, phaseL[phase][0]), /* @__PURE__ */ react_default.createElement(Badge, null, entries.length, " Stimmen"))
        },
        /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, cands.map((c) => {
          const real = entries.filter((x) => x.cand === c.id).length;
          const adj = Number((e.manual || {})[c.id]) || 0;
          return /* @__PURE__ */ react_default.createElement("div", { key: c.id }, /* @__PURE__ */ react_default.createElement("div", { className: "row-between small" }, /* @__PURE__ */ react_default.createElement("span", null, displayName(c.name)), /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, real, " echt", adj ? " · " + (adj > 0 ? "+" : "") + adj + " angepasst" : "")), /* @__PURE__ */ react_default.createElement("div", { className: "bar" }, /* @__PURE__ */ react_default.createElement("span", { style: { width: Math.round(real / total * 100) + "%" } })));
        }), entries.length > 0 && /* @__PURE__ */ react_default.createElement("div", { className: "table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table" }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, /* @__PURE__ */ react_default.createElement("th", null, "Bürger"), /* @__PURE__ */ react_default.createElement("th", null, "Stimme für"), /* @__PURE__ */ react_default.createElement("th", null, "Zeitpunkt"))), /* @__PURE__ */ react_default.createElement("tbody", null, entries.map((x) => /* @__PURE__ */ react_default.createElement("tr", { key: x.uid }, /* @__PURE__ */ react_default.createElement("td", null, displayName(app.nameOf(x.uid))), /* @__PURE__ */ react_default.createElement("td", null, displayName((cands.find((c) => c.id === x.cand) || {}).name || "—")), /* @__PURE__ */ react_default.createElement("td", { className: "mono small" }, fmtDT2(x.at))))))), nonVoters.length > 0 && /* @__PURE__ */ react_default.createElement("div", { className: "small muted" }, /* @__PURE__ */ react_default.createElement("strong", null, "Noch nicht gewählt (", nonVoters.length, "):"), " ", nonVoters.map((c) => displayName(c.name)).join(", ")), rig && cands.length > 0 && /* @__PURE__ */ react_default.createElement(
          Adjust,
          {
            items: cands.map((c) => ({ key: c.id, label: displayName(c.name), real: entries.filter((x) => x.cand === c.id).length })),
            current: e.manual || {},
            onSave: async (v) => {
              const o = {};
              cands.forEach((c) => {
                o[c.id] = Math.trunc(Number(v[c.id]) || 0);
              });
              try {
                await app.mutate(KEYS.ELECTIONS, (l) => (l || []).map((x) => x.id === e.id ? { ...x, manual: o } : x), [], "Wahlergebnis angepasst: " + e.office);
                setMsg({ ok: true, text: "Anpassung gespeichert." });
              } catch (err) {
                setMsg({ ok: false, text: err.message });
              }
            }
          }
        ))
      );
    }));
  }
  function Surveys() {
    const app = useApp();
    const { me } = app;
    const rig = can(me, "result.rig");
    const list = app.val(KEYS.SURVEYS, []) || [];
    const [msg, setMsg] = useState(null);
    if (!list.length) return /* @__PURE__ */ react_default.createElement(Empty, null, "Keine Umfragen vorhanden.");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), list.map((s) => {
      const entries = Object.entries(s.votes || {}).map(([uid, v]) => ({ uid, idx: voteIdx(v), at: voteAt(v) })).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
      const closed = s.endsAt && new Date(s.endsAt).getTime() <= Date.now();
      const total = entries.length || 1;
      return /* @__PURE__ */ react_default.createElement(
        Panel,
        {
          key: s.id,
          title: /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement("h2", null, s.title), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, s.question, s.endsAt ? " · endet " + fmtDT2(s.endsAt) : "")),
          actions: /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, closed && /* @__PURE__ */ react_default.createElement(Badge, null, "Beendet"), /* @__PURE__ */ react_default.createElement(Badge, null, entries.length, " Stimmen"))
        },
        /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, (s.options || []).map((o, i) => {
          const real = entries.filter((x) => x.idx === i).length;
          const adj = Number((s.manual || [])[i]) || 0;
          return /* @__PURE__ */ react_default.createElement("div", { key: i }, /* @__PURE__ */ react_default.createElement("div", { className: "row-between small" }, /* @__PURE__ */ react_default.createElement("span", null, o), /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, real, " echt", adj ? " · " + (adj > 0 ? "+" : "") + adj + " angepasst" : "")), /* @__PURE__ */ react_default.createElement("div", { className: "bar" }, /* @__PURE__ */ react_default.createElement("span", { style: { width: Math.round(real / total * 100) + "%" } })));
        }), entries.length > 0 && /* @__PURE__ */ react_default.createElement("div", { className: "table-wrap" }, /* @__PURE__ */ react_default.createElement("table", { className: "table" }, /* @__PURE__ */ react_default.createElement("thead", null, /* @__PURE__ */ react_default.createElement("tr", null, /* @__PURE__ */ react_default.createElement("th", null, "Bürger"), /* @__PURE__ */ react_default.createElement("th", null, "Antwort"), /* @__PURE__ */ react_default.createElement("th", null, "Zeitpunkt"))), /* @__PURE__ */ react_default.createElement("tbody", null, entries.map((x) => /* @__PURE__ */ react_default.createElement("tr", { key: x.uid }, /* @__PURE__ */ react_default.createElement("td", null, displayName(app.nameOf(x.uid))), /* @__PURE__ */ react_default.createElement("td", null, (s.options || [])[x.idx] || "—"), /* @__PURE__ */ react_default.createElement("td", { className: "mono small" }, x.at ? fmtDT2(x.at) : "—")))))), rig && /* @__PURE__ */ react_default.createElement(
          Adjust,
          {
            items: (s.options || []).map((o, i) => ({ key: String(i), label: o, real: entries.filter((x) => x.idx === i).length })),
            current: Object.fromEntries((s.manual || []).map((m, i) => [String(i), m])),
            onSave: async (v) => {
              const arr = (s.options || []).map((_, i) => Math.trunc(Number(v[String(i)]) || 0));
              try {
                await app.mutate(KEYS.SURVEYS, (l) => (l || []).map((x) => x.id === s.id ? { ...x, manual: arr } : x), [], "Umfrageergebnis angepasst: " + s.title);
                setMsg({ ok: true, text: "Anpassung gespeichert." });
              } catch (err) {
                setMsg({ ok: false, text: err.message });
              }
            }
          }
        ))
      );
    }));
  }

  // portal/pages/System.jsx
  function System() {
    const { me } = useApp();
    const any = can(me, "maintenance") || can(me, "reload.all") || can(me, "backup.export") || can(me, "backup.import") || can(me, "patchnotes.edit");
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "System & Wartung", sub: "Steuerung des Bürgerportals · alle Schaltvorgänge werden protokolliert" }), !any && /* @__PURE__ */ react_default.createElement(Empty, null, "Für keine Systemfunktion freigeschaltet (Administrator-Rechte)."), /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, can(me, "maintenance") && /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Maintenance, null)), /* @__PURE__ */ react_default.createElement("div", { className: "col-1 stack" }, can(me, "reload.all") && /* @__PURE__ */ react_default.createElement(Reload, null), (can(me, "backup.export") || can(me, "backup.import")) && /* @__PURE__ */ react_default.createElement(Backup, null))), can(me, "patchnotes.edit") && /* @__PURE__ */ react_default.createElement(PatchNotes, null));
  }
  function makeCode() {
    const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const a = window.crypto.getRandomValues(new Uint8Array(8));
    const raw = Array.from(a).map((b) => abc[b % abc.length]).join("");
    return raw.slice(0, 4) + "-" + raw.slice(4);
  }
  function Maintenance() {
    const app = useApp();
    const m = app.val(KEYS.MAINT, {}) || {};
    const [until, setUntil] = useState(m.until || "");
    const [target, setTarget] = useState(m.target || "");
    const [code, setCode] = useState("");
    const [input, setInput] = useState("");
    const [msg, setMsg] = useState(null);
    const set = async (next, text) => {
      try {
        await app.mutate(KEYS.MAINT, () => next, {}, text);
        setMsg({ ok: true, text });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    };
    async function start() {
      if (!window.confirm("Wartungsmodus starten? " + (target ? displayName(app.nameOf(target)) + " wird gesperrt." : "Alle Nutzer unter Level 6 sehen nur noch die Wartungsseite."))) return;
      const c = makeCode();
      await set({ on: true, until: until.trim(), target, codeHash: await sha256Hex(c) }, "Wartungsmodus gestartet" + (target ? " (gezielt: " + target + ")" : ""));
      setCode(c);
    }
    async function stop() {
      if (m.codeHash && await sha256Hex(input.trim().toUpperCase()) !== m.codeHash) {
        setMsg({ ok: false, text: "Der Code ist nicht richtig. Die Wartung bleibt aktiv." });
        return;
      }
      await set({ on: false, until: "", target: "", codeHash: "" }, "Wartungsmodus beendet");
      setCode("");
      setInput("");
    }
    return /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 22 } }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("div", { className: "row-between" }, /* @__PURE__ */ react_default.createElement("h2", null, "Wartungsmodus"), /* @__PURE__ */ react_default.createElement(Badge, { tone: m.on ? "solid-bad" : "ok" }, m.on ? m.target ? "Gezielt aktiv" : "Aktiv" : "Aus")), /* @__PURE__ */ react_default.createElement("p", { className: "muted small", style: { margin: 0 } }, "Aktiv sehen alle Nutzer außer Level 6 eine Wartungsmeldung. Beim Start entsteht ein Einmalcode, der nur als Prüfsumme gespeichert wird und zum Beenden nötig ist."), /* @__PURE__ */ react_default.createElement(Field, { label: "Voraussichtlich verfügbar ab" }, /* @__PURE__ */ react_default.createElement("input", { className: "input", value: until, onChange: (e) => setUntil(e.target.value), placeholder: "z. B. ca. 18:00 Uhr" })), /* @__PURE__ */ react_default.createElement(Field, { label: "Gezielt nur für eine Person (optional)" }, /* @__PURE__ */ react_default.createElement("select", { className: "select", value: target, onChange: (e) => setTarget(e.target.value) }, /* @__PURE__ */ react_default.createElement("option", { value: "" }, "— Alle (außer Level 6) —"), app.citizens.slice().sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), "de")).map((c) => /* @__PURE__ */ react_default.createElement("option", { key: c.id, value: c.id }, displayName(c.name), " · ", c.id)))), !m.on ? /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "danger", onClick: start }, "Wartung starten")) : /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { onClick: () => set({ ...m, until: until.trim(), target }, "Wartungsangaben aktualisiert") }, "Angaben aktualisieren")), code && /* @__PURE__ */ react_default.createElement("div", { className: "secret" }, /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { color: "var(--y)" } }, "Einmalcode zum Beenden – jetzt notieren"), /* @__PURE__ */ react_default.createElement("div", { className: "secret-v" }, code)), m.on && /* @__PURE__ */ react_default.createElement("div", { className: "stack", style: { gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 } }, m.codeHash && /* @__PURE__ */ react_default.createElement(Field, { label: "Einmalcode" }, /* @__PURE__ */ react_default.createElement("input", { className: "input big mono", value: input, onChange: (e) => setInput(e.target.value), placeholder: "XXXX-XXXX", onKeyDown: (e) => {
      if (e.key === "Enter") stop();
    } })), /* @__PURE__ */ react_default.createElement("div", null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", disabled: !!m.codeHash && !input.trim(), onClick: stop }, "Wartung beenden")), /* @__PURE__ */ react_default.createElement("div", { className: "muted small" }, "Code verloren? Notausgang: Eintrag ", /* @__PURE__ */ react_default.createElement("code", null, KEYS.MAINT), " in der Tabelle kv im Supabase-Dashboard löschen.")), /* @__PURE__ */ react_default.createElement(Msg, { m: msg })));
  }
  function Reload() {
    const app = useApp();
    const [msg, setMsg] = useState(null);
    async function go() {
      if (!window.confirm("Alle geöffneten Portale (alle Geräte und Tabs) jetzt neu laden?")) return;
      try {
        await app.mutate(KEYS.RELOAD, () => Date.now(), 0, "Neuladen aller Instanzen ausgelöst");
        setMsg({ ok: true, text: "Signal gesendet – geöffnete Portale laden sich neu." });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    const last = app.val(KEYS.RELOAD, 0);
    return /* @__PURE__ */ react_default.createElement(Panel, { title: "Offene Instanzen neu laden" }, /* @__PURE__ */ react_default.createElement("p", { className: "muted small" }, "Fordert alle geöffneten Bürgerportale auf, sich sofort neu zu laden – z. B. nach einem neuen Stand. ", last ? "Zuletzt: " + fmtDT2(Number(last)) : ""), /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: go }, "Alle Instanzen neu laden"), /* @__PURE__ */ react_default.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg })));
  }
  var BACKUP_KEYS = [KEYS.REG, KEYS.TYPES, KEYS.TYPEUNITS, KEYS.APPTS, KEYS.APPS, KEYS.SURVEYS, KEYS.ELECTIONS, KEYS.RECORDS, KEYS.WARRANTS, KEYS.UNITS, KEYS.PERMS, KEYS.CHAT, KEYS.ANNOUNCE, KEYS.SUPPORT, KEYS.FEATURES, KEYS.PATCHNOTES, KEYS.MAINT];
  function Backup() {
    const app = useApp();
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);
    async function doExport() {
      const data = {};
      for (const k of BACKUP_KEYS) {
        const r = await Store.getRaw(k);
        if (r.ok && r.value !== null) data[k] = r.value;
      }
      downloadText2("maiskolbistan-sicherung-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json", JSON.stringify({ _app: "maiskolbistan-buergerportal", _version: 1, _exportedAt: (/* @__PURE__ */ new Date()).toISOString(), _source: "abis-konsole", data }, null, 2), "application/json");
      app.note("Sicherung heruntergeladen", "warn");
      Monitor.logAction("Sicherung heruntergeladen", null, { keys: Object.keys(data).length });
      setMsg({ ok: true, text: "Sicherung heruntergeladen. Die Datei enthält personenbezogene Daten – sicher aufbewahren." });
    }
    async function doImport(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const obj = JSON.parse(await file.text());
        const d = obj && obj.data;
        if (!d || !Array.isArray(d[KEYS.REG]) || !d[KEYS.REG].length) {
          setMsg({ ok: false, text: "Die Datei enthält kein gültiges Bürgerregister." });
          return;
        }
        if (!window.confirm("Sicherung einspielen? Alle aktuellen Portaldaten werden überschrieben (" + d[KEYS.REG].length + " Bürger).")) return;
        setBusy(true);
        const keys = BACKUP_KEYS.filter((k) => d[k] !== void 0);
        for (const k of keys) await Store.set(k, d[k]);
        await app.reloadAll();
        app.note("Sicherung eingespielt (" + keys.length + " Bereiche)", "bad");
        Monitor.logAction("Sicherung eingespielt", file.name, { keys });
        setMsg({ ok: true, text: "Sicherung eingespielt – " + d[KEYS.REG].length + " Bürger wiederhergestellt." });
      } catch (err) {
        setMsg({ ok: false, text: "Einspielen fehlgeschlagen: " + (err.message || "ungültige Datei") });
      } finally {
        setBusy(false);
        if (ref.current) ref.current.value = "";
      }
    }
    return /* @__PURE__ */ react_default.createElement(Panel, { title: "Sicherung" }, /* @__PURE__ */ react_default.createElement("p", { className: "muted small" }, "Vollständige Sicherung aller Portaldaten (Register, Termine, Chats …) als JSON – kompatibel mit der Sicherung im Bürgerportal. Passwörter sind nicht enthalten."), /* @__PURE__ */ react_default.createElement("div", { className: "row" }, can(app.me, "backup.export") && /* @__PURE__ */ react_default.createElement(Btn, { variant: "primary", onClick: doExport }, "Herunterladen"), can(app.me, "backup.import") && /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Btn, { variant: "danger", disabled: busy, onClick: () => ref.current && ref.current.click() }, busy ? "Spielt ein …" : "Einspielen"), /* @__PURE__ */ react_default.createElement("input", { ref, type: "file", accept: "application/json,.json", onChange: doImport, style: { display: "none" } }))), /* @__PURE__ */ react_default.createElement("div", { style: { marginTop: 10 } }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg })));
  }
  function PatchNotes() {
    const app = useApp();
    const notes = app.val(KEYS.PATCHNOTES, null);
    const [draft, setDraft] = useState(null);
    const [msg, setMsg] = useState(null);
    const list = Array.isArray(notes) ? notes : [];
    function start() {
      setDraft(list.map((n) => ({ version: n.version || "", date: n.date || "", title: n.title || "", items: (n.items || []).join("\n") })));
    }
    async function save() {
      const next = draft.map((d) => ({ version: d.version.trim(), date: d.date.trim(), title: d.title.trim(), items: d.items.split("\n").map((s) => s.trim()).filter(Boolean) })).filter((n) => n.version || n.items.length);
      try {
        await app.mutate(KEYS.PATCHNOTES, () => next, [], "Patch Notes gespeichert");
        setDraft(null);
        setMsg({ ok: true, text: "Gespeichert." });
      } catch (e) {
        setMsg({ ok: false, text: e.message });
      }
    }
    const upd = (i, k, v) => setDraft((d) => d.map((x, j) => j === i ? { ...x, [k]: v } : x));
    return /* @__PURE__ */ react_default.createElement(Panel, { title: "Öffentliche Patch Notes", actions: !draft ? /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: start }, "Bearbeiten") : /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", onClick: () => setDraft([{ version: "", date: "", title: "", items: "" }, ...draft]) }, "+ Version"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "primary", onClick: save }, "Speichern"), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "ghost", onClick: () => setDraft(null) }, "Abbrechen")) }, /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), !draft ? !list.length ? /* @__PURE__ */ react_default.createElement(Empty, null, "Keine eigenen Patch Notes gespeichert – das Portal zeigt seine eingebaute Liste.") : list.map((n, i) => /* @__PURE__ */ react_default.createElement("div", { key: i, style: { marginBottom: 14 } }, /* @__PURE__ */ react_default.createElement("div", { className: "row" }, /* @__PURE__ */ react_default.createElement(Badge, { tone: "amber" }, "Version ", n.version), /* @__PURE__ */ react_default.createElement("span", { className: "muted small" }, n.date), /* @__PURE__ */ react_default.createElement("strong", null, n.title)), /* @__PURE__ */ react_default.createElement("ul", { style: { margin: "8px 0 0", paddingLeft: 20, color: "var(--text-2)" } }, (n.items || []).map((it, j) => /* @__PURE__ */ react_default.createElement("li", { key: j }, it))))) : draft.map((d, i) => /* @__PURE__ */ react_default.createElement("div", { key: i, className: "stack", style: { gap: 8, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--line)" } }, /* @__PURE__ */ react_default.createElement("div", { className: "row", style: { flexWrap: "nowrap" } }, /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 120 }, value: d.version, onChange: (e) => upd(i, "version", e.target.value), placeholder: "Version", "aria-label": "Version" }), /* @__PURE__ */ react_default.createElement("input", { className: "input", style: { width: 150 }, value: d.date, onChange: (e) => upd(i, "date", e.target.value), placeholder: "Datum", "aria-label": "Datum" }), /* @__PURE__ */ react_default.createElement("input", { className: "input", value: d.title, onChange: (e) => upd(i, "title", e.target.value), placeholder: "Titel", "aria-label": "Titel" }), /* @__PURE__ */ react_default.createElement(Btn, { size: "sm", variant: "danger", onClick: () => setDraft(draft.filter((_, j) => j !== i)) }, "✕")), /* @__PURE__ */ react_default.createElement(Textarea, { label: "Änderungen (eine pro Zeile)", rows: 4, value: d.items, onChange: (e) => upd(i, "items", e.target.value) }))));
  }

  // portal/pages/Konto.jsx
  function Konto() {
    const { me } = useApp();
    const [cur, setCur] = useState("");
    const [nw, setNw] = useState("");
    const [conf, setConf] = useState("");
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    const strong = nw.length >= 12 && /[A-Z]/.test(nw) && /[a-z]/.test(nw) && /\d/.test(nw);
    async function submit() {
      if (nw !== conf) return setMsg({ ok: false, text: "Die neuen Passwörter stimmen nicht überein." });
      if (nw.length < 10) return setMsg({ ok: false, text: "Mindestens 10 Zeichen." });
      setBusy(true);
      const r = await Auth.changePassword(cur, nw);
      setBusy(false);
      if (r.ok) {
        setMsg({ ok: true, text: "Passwort geändert." });
        setCur("");
        setNw("");
        setConf("");
        Monitor.logAction("Eigenes Passwort geändert");
      } else setMsg({ ok: false, text: r.reason });
    }
    return /* @__PURE__ */ react_default.createElement("div", { className: "stack-lg" }, /* @__PURE__ */ react_default.createElement(PageHead, { title: "Mein Konto", sub: "Automatische Abmeldung nach " + IDLE_LOGOUT_MIN + " Minuten ohne Eingabe" }), /* @__PURE__ */ react_default.createElement("div", { className: "cols" }, /* @__PURE__ */ react_default.createElement("div", { className: "col-2" }, /* @__PURE__ */ react_default.createElement(Panel, { title: "Identität" }, /* @__PURE__ */ react_default.createElement(Kv, { rows: [
      ["Name", me.isAdmin ? "Administrator" : displayName(me.name)],
      ["Bürger-Nr.", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, me.id)],
      ["E-Mail", /* @__PURE__ */ react_default.createElement("span", { className: "mono" }, me.email)],
      ["Level", /* @__PURE__ */ react_default.createElement(react_default.Fragment, null, /* @__PURE__ */ react_default.createElement(Badge, { tone: "amber" }, "L", me.is), " ", IS_LABEL[me.is], me.is !== me.baseLevel ? " (Profil: L" + me.baseLevel + ", angehoben durch Zuordnung)" : "")],
      ["Administrator", me.isAdmin ? /* @__PURE__ */ react_default.createElement(Badge, { tone: "bad" }, "ja") : "nein"],
      ["Zuordnungen", me.ministries.join(", ") || "—"]
    ] }), /* @__PURE__ */ react_default.createElement("div", { className: "eyebrow", style: { margin: "16px 0 6px" } }, "Wirksame Einzelrechte"), /* @__PURE__ */ react_default.createElement("div", { className: "chips" }, CAPS.map((c) => /* @__PURE__ */ react_default.createElement("span", { key: c.id, className: "chip " + (can(me, c.id) ? "on" : ""), style: { cursor: "default" } }, can(me, c.id) ? "✓ " : "✕ ", c.label))))), /* @__PURE__ */ react_default.createElement("div", { className: "col-1" }, /* @__PURE__ */ react_default.createElement(Corners, { yellow: true, innerStyle: { padding: 20 } }, /* @__PURE__ */ react_default.createElement("div", { className: "stack" }, /* @__PURE__ */ react_default.createElement("h2", null, "Passwort ändern"), /* @__PURE__ */ react_default.createElement(Input, { label: "Aktuelles Passwort", type: "password", autoComplete: "current-password", value: cur, onChange: (e) => setCur(e.target.value) }), /* @__PURE__ */ react_default.createElement(Input, { label: "Neues Passwort", type: "password", autoComplete: "new-password", value: nw, onChange: (e) => setNw(e.target.value), hint: nw ? strong ? "Stark" : "Empfehlung: ab 12 Zeichen, Groß-/Kleinbuchstaben und Ziffern" : void 0 }), /* @__PURE__ */ react_default.createElement(Input, { label: "Wiederholen", type: "password", autoComplete: "new-password", value: conf, onChange: (e) => setConf(e.target.value) }), /* @__PURE__ */ react_default.createElement(Msg, { m: msg }), /* @__PURE__ */ react_default.createElement(Btn, { variant: "solid", disabled: busy || !cur || !nw, onClick: submit }, busy ? "Ändert …" : "Passwort ändern"))))));
  }

  // portal/index.jsx
  var wrap = (Page) => function AbisPage() {
    return /* @__PURE__ */ react_default.createElement("div", { className: "abis" }, /* @__PURE__ */ react_default.createElement(Page, null));
  };
  var L6 = (me) => me.isAdmin || me.is >= CLEARANCE.credentials;
  var always = () => true;
  window.NDPortal.register([
    { order: 2, group: "Überwachung", id: "protokoll", label: "Sicherheitsprotokoll", C: wrap(Protokoll), ok: always },
    { order: 3, group: "Überwachung", id: "datenbank", label: "Datenbank", C: wrap(Datenbank), ok: always },
    { order: 4, group: "Überwachung", id: "transaktionen", label: "Transaktionen", C: wrap(Transaktionen), ok: bankAdmin, need: "Bank-Administrator · Level 6" },
    { order: 5, group: "Buchhaltung", id: "bank", label: "Bankmanagement", C: wrap(Bank2), ok: bankAdmin, need: "Bank-Administrator · Level 6" },
    { order: 7, group: "Verwaltung", id: "anmeldedaten", label: "Anmeldedaten", C: wrap(Anmeldedaten), ok: L6, need: "Level 6" },
    { order: 9, group: "Verwaltung", id: "antragsarten", label: "Antragsarten", C: wrap(Antragsarten), ok: (me) => me.is >= CLEARANCE.apptypes || me.allow.includes("nav:antragsarten"), need: "Level 4" },
    { order: 10, group: "Verwaltung", id: "termine", label: "Termine", C: wrap(Termine), ok: (me) => me.is >= CLEARANCE.admintermine, need: "Level 2" },
    { order: 11, group: "Verwaltung", id: "justiz", label: "Justiz & Polizei", C: wrap(Justiz), ok: canSeeRecords, need: "Justiz, Polizei oder Level 5" },
    { order: 12, group: "Verwaltung", id: "kommunikation", label: "Kommunikation", C: wrap(Kommunikation), ok: always },
    { order: 13, group: "Steuerung", id: "zuordnungen", label: "Zuordnungen", C: wrap(Zuordnungen), ok: (me) => can(me, "units.manage"), need: "Level 6" },
    { order: 14, group: "Steuerung", id: "berechtigungen", label: "Berechtigungen", C: wrap(Berechtigungen), ok: (me) => can(me, "perms.manage"), need: "Level 6" },
    { order: 15, group: "Steuerung", id: "auswertungen", label: "Wahl & Umfrage", C: wrap(Auswertungen), ok: (me) => L6(me) || can(me, "audit.view"), need: "Level 6" },
    { order: 16, group: "Steuerung", id: "system", label: "System & Wartung", C: wrap(System), ok: always },
    { order: 17, group: "Konto", id: "konto", label: "Mein Konto", C: wrap(Konto), ok: always }
  ]);
})();
