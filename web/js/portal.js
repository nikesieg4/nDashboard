/* nDashboard — Management → Bürgerportal: ABIS-Sicherheitskonsole für das Bürgerportal Maiskolbistan.
 * Übernommen aus nikesieg4/dPUbtsXv3y: Datenzugriff (src/lib/db.js, state.jsx) und bisher die Bereiche
 * Lagezentrum, Bürgerregister und Anträge. Weitere Bereiche folgen schrittweise.
 * Was erlaubt ist, entscheidet die Datenbank (RLS, security-definer-Funktionen); die App blendet nur aus,
 * was ohnehin abgelehnt würde – dieselben Regeln wie Portal und ABIS-Konsole (portal-model.js). */
(function () {
  var O = window.Ops, h = React.createElement, A = window.NDAuth, M = window.NDPortalModel, Files = window.NDFiles, U = window.NDUi;
  var sb = A.portal, KEYS = M.KEYS;

  /* =====================================================================
     DATENZUGRIFF (wie src/lib/db.js)
     ===================================================================== */
  function adminAction(action, payload) {
    return sb.auth.getSession().then(function (r) {
      var session = r.data && r.data.session;
      if (!session) return { ok: false, reason: 'Nicht angemeldet.' };
      return fetch(A.portalUrl + '/functions/v1/admin-actions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.portalKey, Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify(Object.assign({ action: action }, payload)) }).then(function (res) {
        if (res.status === 404) return { ok: false, reason: 'Die Server-Funktion „admin-actions“ ist nicht veröffentlicht.' };
        return res.json().catch(function () { return null; }).then(function (j) { return j || { ok: false, reason: 'Ungültige Antwort vom Server (' + res.status + ').' }; });
      });
    }).catch(function () { return { ok: false, reason: 'Server nicht erreichbar.' }; });
  }

  function getRaw(key) {
    return sb.from('kv').select('value').eq('key', key).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      return { ok: true, value: r.data ? r.data.value : null };
    }).catch(function () { return { ok: false, value: null }; });
  }
  /* Lesen – ändern – schreiben auf dem AKTUELLEN Stand der Datenbank, damit Änderungen aus dem Portal nicht überschrieben werden. */
  function kvMutate(key, fn, fallback) {
    return getRaw(key).then(function (cur) {
      if (!cur.ok) throw new Error('Der aktuelle Stand konnte nicht gelesen werden. Es wurde nichts gespeichert.');
      var base = cur.value === null || cur.value === undefined ? fallback : cur.value, next = fn(base);
      if (next === undefined) return base;
      return sb.from('kv').upsert({ key: key, value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' }).then(function (r) {
        if (r.error) throw r.error;
        return next;
      });
    });
  }

  function bankCall(name, args) {
    return sb.rpc(name, args || {}).then(function (res) {
      if (res.error) {
        if (res.error.code === '42501') return { ok: false, code: 'forbidden', message: 'Dafür fehlt die Berechtigung (Bank-Administrator = Level 6).' };
        if (res.error.code === 'PGRST202' || res.error.code === '42883') return { ok: false, code: 'missing', message: 'Funktion „' + name + '“ ist in der Datenbank nicht vorhanden.' };
        return { ok: false, message: 'Die Aktion konnte nicht ausgeführt werden.' };
      }
      return res.data || { ok: false, message: 'Leere Antwort vom Server.' };
    }, function () { return { ok: false, message: 'Server nicht erreichbar.' }; });
  }

  function missingTable(error) {
    var c = error && error.code;
    return c === '42P01' || c === 'PGRST205' || c === 'PGRST202' || c === '42883' || /does not exist|not find/i.test(String(error && error.message));
  }
  function monitorQuery(table, build) {
    var q = sb.from(table).select('*', { count: 'exact' });
    return (build ? build(q) : q).then(function (r) {
      if (r.error) return { ok: false, missing: missingTable(r.error), message: r.error.message };
      return { ok: true, rows: r.data || [], total: r.count != null ? r.count : (r.data || []).length };
    }, function () { return { ok: false, message: 'Server nicht erreichbar.' }; });
  }
  function logAction(action, target, detail) {
    sb.rpc('abis_log_action', { p_action: action, p_target: target || null, p_detail: detail || {} }).then(null, function () { /* optional */ });
  }

  function pingDb() {
    var t0 = performance.now();
    return sb.from('profiles').select('id', { count: 'exact', head: true }).then(function (r) {
      var ms = Math.round(performance.now() - t0);
      return r.error ? { ok: false, ms: ms, message: r.error.message } : { ok: true, ms: ms };
    }, function () { return { ok: false, ms: Math.round(performance.now() - t0), message: 'nicht erreichbar' }; });
  }
  function pingFunction(name) {
    var t0 = performance.now();
    return fetch(A.portalUrl + '/functions/v1/' + name, { method: 'OPTIONS' }).then(function (r) { return { ok: r.ok, status: r.status, ms: Math.round(performance.now() - t0) }; },
      function () { return { ok: false, status: 0, ms: Math.round(performance.now() - t0) }; });
  }

  /* =====================================================================
     ZUSTAND (wie src/lib/state.jsx): alle lesbaren kv-Datensätze + Profile, live aktuell
     ===================================================================== */
  var data = { kv: null, profiles: [], loadError: '', live: false, events: [], lastSync: null }, listeners = [], channel = null, profile = null;
  function emit() { var v = view(); listeners.forEach(function (fn) { fn(v); }); }
  function patch(p) { Object.assign(data, p); emit(); }

  function note(text, tone, src) {
    patch({ events: [{ id: Date.now() + Math.random(), ts: Date.now(), text: text, tone: tone || '', src: src || 'konsole' }].concat(data.events).slice(0, 300) });
  }
  function reloadAll() {
    var kvP = sb.from('kv').select('key, value, updated_at').then(function (r) {
      if (r.error) throw r.error;
      var m = {}; (r.data || []).forEach(function (row) { m[row.key] = { value: row.value, updated_at: row.updated_at }; });
      patch({ kv: m, loadError: '', lastSync: Date.now() });
    }).catch(function (e) { patch({ loadError: 'Die Daten konnten nicht geladen werden: ' + (e.message || 'unbekannter Fehler') }); });
    var prP = sb.from('profiles').select('*').then(function (r) { if (!r.error) patch({ profiles: r.data || [] }); });
    return Promise.all([kvP, prP]);
  }
  function start(p) {
    profile = p;
    reloadAll();
    channel = sb.channel('nd-abis-kv')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv' }, function (ev) {
        var row = ev.new && ev.new.key ? ev.new : ev.old;
        if (!row || !row.key || !data.kv) return;
        var next = Object.assign({}, data.kv);
        if (ev.eventType === 'DELETE') delete next[row.key]; else next[row.key] = { value: ev.new.value, updated_at: ev.new.updated_at };
        patch({ kv: next, lastSync: Date.now() });
        note((M.KEY_LABEL[row.key] || row.key) + ' · ' + (ev.eventType === 'INSERT' ? 'angelegt' : ev.eventType === 'DELETE' ? 'gelöscht' : 'geändert'), ev.eventType === 'DELETE' ? 'bad' : 'info', 'kv');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, function () {
        sb.from('profiles').select('*').then(function (r) { if (!r.error) patch({ profiles: r.data || [] }); });
        note('Profile · geändert', 'warn', 'db');
      })
      .subscribe(function (status) {
        patch({ live: status === 'SUBSCRIBED' });
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') note('Live-Verbindung gestört (' + status + ')', 'bad', 'system');
      });
  }
  function stop() {
    if (channel) { try { sb.removeChannel(channel); } catch (e) { /* egal */ } }
    channel = null; profile = null;
    data = { kv: null, profiles: [], loadError: '', live: false, events: [], lastSync: null };
    emit();
  }
  A.subscribe(function (a) {
    if (a.portal && !profile) start(a.portal);
    else if (!a.portal && profile) stop();
  });

  /* Abgeleitete Werte: Register mit Level aus der Datenbank, Zuordnungen, Rechte, „ich“ */
  var cache = { kv: undefined, profiles: undefined, v: null };
  function view() {
    if (cache.kv === data.kv && cache.profiles === data.profiles && cache.v) return Object.assign({}, cache.v, { live: data.live, events: data.events, loadError: data.loadError, lastSync: data.lastSync });
    function val(key, fallback) { var e = data.kv && data.kv[key]; return e && e.value !== null && e.value !== undefined ? e.value : fallback; }
    var registry = data.kv ? (val(KEYS.REG, []) || []).map(function (c) { return Object.assign({}, c, { ministries: Array.isArray(c.ministries) ? c.ministries : [] }); }) : [];
    var units = data.kv ? (val(KEYS.UNITS, []) || []).map(M.normUnit) : [];
    var perms = data.kv ? val(KEYS.PERMS, {}) || {} : {};
    var levels = {}; data.profiles.forEach(function (p) { levels[p.citizen_id] = p.is_admin ? 6 : Number(p.level) || 0; });
    var citizens = registry.map(function (c) { return levels[c.id] !== undefined ? Object.assign({}, c, { is: levels[c.id] }) : c; });
    var me = null;
    if (profile) {
      var mine = data.profiles.filter(function (p) { return p.id === profile.uid; })[0] || profile;
      me = M.buildMe(Object.assign({}, profile, mine, { email: profile.email, uid: profile.uid }), registry, units, perms);
    }
    function nameOf(id) {
      if (!id) return '—';
      var c = registry.filter(function (x) { return x.id === id; })[0]; if (c) return c.name;
      var p = data.profiles.filter(function (x) { return x.citizen_id === id || x.id === id; })[0]; return p ? p.name : id;
    }
    var v = { kv: data.kv, val: val, profiles: data.profiles, registry: registry, citizens: citizens, units: units, perms: perms, me: me, nameOf: nameOf,
      live: data.live, events: data.events, loadError: data.loadError, lastSync: data.lastSync };
    cache = { kv: data.kv, profiles: data.profiles, v: v };
    return v;
  }
  /** Speichern mit frischem Stand + Protokoll */
  function mutate(key, fn, fallback, logText) {
    return kvMutate(key, fn, fallback).then(function (next) {
      var m = Object.assign({}, data.kv); m[key] = { value: next, updated_at: new Date().toISOString() };
      patch({ kv: m });
      if (logText) { note(logText, 'ok'); logAction(logText, key); }
      return next;
    });
  }
  function usePortal() {
    var st = React.useState(view());
    React.useEffect(function () {
      st[1](view());
      listeners.push(st[1]);
      return function () { listeners.splice(listeners.indexOf(st[1]), 1); };
    }, []);
    return st[0];
  }

  /* =====================================================================
     BAUSTEINE
     ===================================================================== */
  function go(section, id) { location.hash = '#/portal?s=' + section + (id ? '&id=' + encodeURIComponent(id) : ''); }
  function Msg(p) { return p.m ? h(O.Status, { tone: p.m.ok ? 'ok' : p.m.tone || 'danger' }, p.m.text) : null; }
  function Muted(p) { return h('p', { style: Object.assign({ margin: 0, color: 'var(--ink-muted)', fontSize: 13 }, p.style) }, p.children); }
  function Denied(p) {
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Kein Zugriff', icon: 'lock' },
      h(Muted, null, 'Für diesen Bereich fehlt dir die Berechtigung' + (p.need ? ' (' + p.need + ')' : '') + '. Die Datenbank würde den Zugriff ebenfalls ablehnen.'));
  }
  function confirmDialog(setDialog, title, text, ok, run, danger) {
    setDialog({ type: 'confirm', title: title, text: text, ok: ok, danger: danger !== false, onOk: run });
  }
  function hourBuckets(rows, field) {
    var now = Date.now(), b = []; for (var i = 0; i < 24; i++) b.push(0);
    rows.forEach(function (r) { var k = 23 - Math.floor((now - new Date(r[field]).getTime()) / 3600000); if (k >= 0 && k < 24) b[k]++; });
    return b;
  }
  function Chart(p) {
    var max = Math.max.apply(null, [4].concat(p.data));
    return h('div', null, h('div', { className: 'op-label', style: { margin: '0 0 4px' } }, p.title + (p.unit ? ' (' + p.unit + ')' : '')),
      h(window.NDMonitor.FitChart, { data: p.data.length > 1 ? p.data : [0, 0], min: 0, max: Math.ceil(max / 4) * 4, height: 130 }));
  }

  /* =====================================================================
     LAGEZENTRUM
     ===================================================================== */
  var H24 = 24 * 3600 * 1000;
  function Lagezentrum() {
    var app = usePortal(), me = app.me, isBank = M.bankAdmin(me);
    var s = React.useState({ txs: null, audit: null, auth: null, cits: null }), integrity = React.useState(null), checking = React.useState(false);
    var sched = React.useState(null), pings = React.useState([]), fn = React.useState(null), alive = React.useRef(true);

    function load() {
      var since = new Date(Date.now() - H24).toISOString();
      Promise.all([
        isBank ? sb.from('bank_transactions').select('id,created_at,status,type,amount_minor,failure_reason').gte('created_at', since).order('created_at', { ascending: false }).limit(2000) : Promise.resolve(null),
        sb.from('bank_audit_logs').select('ts,action,result,reason,actor_user_id,target_account_id').gte('ts', since).order('ts', { ascending: false }).limit(2000),
        monitorQuery('abis_auth_events', function (q) { return q.gte('ts', since).order('ts', { ascending: false }).limit(500); }),
        me.is >= 4 || me.isAdmin ? sb.from('citizenship_requests').select('id', { count: 'exact', head: true }).eq('status', 'offen') : Promise.resolve(null)
      ]).then(function (r) {
        if (!alive.current) return;
        s[1]({ txs: r[0] && !r[0].error ? r[0].data : r[0] ? { error: true } : null, audit: r[1] && !r[1].error ? r[1].data : { error: true }, auth: r[2], cits: r[3] && !r[3].error ? r[3].count : null });
      }, function () { /* nächster Durchlauf */ });
      if (isBank) bankCall('bank_scheduler_status').then(function (x) { if (alive.current) sched[1](x); });
    }
    function checkIntegrity() {
      if (!isBank) return;
      checking[1](true);
      bankCall('bank_admin_integrity').then(function (r) {
        if (!alive.current) return;
        checking[1](false); integrity[1](r);
        note(r && r.ok ? 'Integritätsprüfung: in Ordnung' : 'Integritätsprüfung: ABWEICHUNG', r && r.ok ? 'ok' : 'bad', 'bank');
      });
    }
    React.useEffect(function () {
      alive.current = true;
      load(); checkIntegrity();
      pingFunction('admin-actions').then(function (r) { if (alive.current) fn[1](r); });
      function ping() { pingDb().then(function (p) { if (alive.current) pings[1](function (x) { return x.concat([p]).slice(-24); }); }); }
      ping();
      var t1 = setInterval(ping, 10000), t2 = setInterval(load, 30000);
      return function () { alive.current = false; clearInterval(t1); clearInterval(t2); };
    }, []);

    var audit = s[0].audit, auditRows = Array.isArray(audit) ? audit : [], auditBad = auditRows.filter(function (r) { return r.result !== 'success'; });
    var cut = Date.now() - 15 * 60000, perActor = {};
    auditBad.filter(function (r) { return new Date(r.ts).getTime() > cut; }).forEach(function (r) { var k = r.actor_user_id || 'system'; perActor[k] = (perActor[k] || 0) + 1; });
    var burst = Object.keys(perActor).filter(function (k) { return perActor[k] >= 3; }).map(function (k) { return perActor[k]; });
    var txRows = Array.isArray(s[0].txs) ? s[0].txs : [];
    var txFailed = txRows.filter(function (t) { return t.status === 'failed' || t.status === 'rejected'; });
    var txVolume = txRows.filter(function (t) { return t.status === 'posted'; }).reduce(function (a, t) { return a + Number(t.amount_minor || 0); }, 0);
    var maint = app.val(KEYS.MAINT, {}) || {};
    var openApps = (app.val(KEYS.APPS, []) || []).filter(isOpen).length;
    var reqAppts = (app.val(KEYS.APPTS, []) || []).filter(function (a) { return a.status === 'Angefragt'; }).length;
    var warrants = (app.val(KEYS.WARRANTS, []) || []).filter(function (w) { return w.status === 'beantragt'; }).length;
    var tickets = ((app.val(KEYS.SUPPORT, {}) || {}).tickets || []).filter(function (t) { return t.status !== 'geschlossen' && t.status !== 'erledigt'; }).length;
    var privileged = app.profiles.filter(function (p) { return p.is_admin || Number(p.level) >= 5; }).length;
    var locked = app.citizens.filter(function (c) { return c.locked; }).length;
    var lastPing = pings[0][pings[0].length - 1], auth = s[0].auth;
    var signIns = auth && auth.ok ? auth.rows.filter(function (r) { return r.event === 'sign_in'; }).length : null;
    var integ = integrity[0];

    var alerts = [];
    if (integ && integ.ok === false) alerts.push({ tone: 'danger', text: 'Integritätsprüfung meldet Abweichungen im Ledger.' });
    burst.forEach(function (n) { alerts.push({ tone: 'danger', text: n + ' abgelehnte/fehlgeschlagene Bankvorgänge desselben Akteurs in 15 Minuten.' }); });
    if (lastPing && !lastPing.ok) alerts.push({ tone: 'danger', text: 'Datenbank antwortet nicht.' });
    if (sched[0] && sched[0].ok !== false && sched[0].job_scheduled === false) alerts.push({ tone: 'warn', text: 'Kein Scheduler eingerichtet – Dauerzahlungen laufen nicht automatisch.' });
    if (sched[0] && sched[0].due_now > 0) alerts.push({ tone: 'warn', text: sched[0].due_now + ' Dauerzahlung(en) fällig und nicht ausgeführt.' });
    if (txFailed.length >= 5) alerts.push({ tone: 'warn', text: txFailed.length + ' fehlgeschlagene Transaktionen in 24 h.' });
    if (maint.on) alerts.push({ tone: 'info', text: 'Wartungsmodus ist aktiv' + (maint.target ? ' (gezielt für ' + app.nameOf(maint.target) + ')' : '') + '.' });
    if (auth && auth.missing) alerts.push({ tone: 'info', text: 'Überwachungstabellen sind noch nicht eingerichtet (sql/abis-ueberwachung.sql).' });
    var level = Math.min(5, 1 + alerts.filter(function (a) { return a.tone === 'danger'; }).length * 2 + alerts.filter(function (a) { return a.tone === 'warn'; }).length);
    var levelTone = level >= 4 ? 'danger' : level >= 2 ? 'warn' : 'ok';

    var log = app.events.slice(0, 12).map(function (x) { return { ts: x.ts, text: x.text, tone: x.tone === 'bad' ? 'danger' : null }; })
      .concat(auditRows.slice(0, 12).map(function (r) { return { ts: new Date(r.ts).getTime(), text: r.action + (r.reason ? ' · ' + r.reason : ''), tone: r.result === 'success' ? null : 'danger' }; }))
      .sort(function (x, y) { return y.ts - x.ts; }).slice(0, 10);

    return [
      alerts.map(function (a, i) { return h(O.Alert, { key: 'a' + i, tone: a.tone, title: a.tone === 'danger' ? 'Alarm' : a.tone === 'warn' ? 'Warnung' : 'Hinweis' }, a.text); }),
      h('div', { key: 'tiles', className: 'g2 tiles-desktop' },
        h('button', { type: 'button', className: 'tile-btn', disabled: !isBank, onClick: checkIntegrity, 'aria-label': 'Integrität prüfen' },
          h(O.StatTile, { label: 'Ledger-Integrität', value: !isBank ? '—' : integ ? (integ.ok ? 'INTAKT' : 'FEHLER') : checking[0] ? '…' : '—',
            delta: !isBank ? 'nur Bank-Administrator' : integ && integ.entries_checked != null ? integ.entries_checked + ' Buchungen geprüft' : 'HMAC-Kette', deltaTone: integ ? (integ.ok ? 'ok' : 'danger') : 'neutral' })),
        h(O.StatTile, { label: 'Transaktionen 24 h', value: isBank ? txRows.length : '—', delta: isBank ? txFailed.length + ' fehlgeschlagen · ' + M.fmtM(txVolume) : 'nur Bank-Administrator', deltaTone: txFailed.length ? 'warn' : 'neutral' }),
        h(O.StatTile, { label: 'Sicherheits\u00adereignisse', value: Array.isArray(audit) ? auditBad.length : '—', delta: Array.isArray(audit) ? 'abgelehnt / fehlgeschlagen · 24 h' : 'Audit-Log nur für Level 6', deltaTone: auditBad.length ? 'danger' : 'ok' }),
        h(O.StatTile, { label: 'Datenbank', value: lastPing ? (lastPing.ok ? lastPing.ms : 'AUSFALL') : '…', unit: lastPing && lastPing.ok ? 'ms' : null, delta: 'Antwortzeit · alle 10 s', deltaTone: lastPing ? (lastPing.ok ? (lastPing.ms > 800 ? 'warn' : 'ok') : 'danger') : 'neutral' })),
      h(O.Panel, { key: 'lvl', variant: 'framed', title: 'Alarmstufe', icon: 'alert' },
        h('div', { className: 'op-row', style: { justifyContent: 'space-between' } },
          h('div', { className: 'op-tile-value op-tone-' + levelTone }, level),
          h(O.Status, { tone: levelTone }, level >= 4 ? 'Kritisch' : level >= 2 ? 'Erhöht' : 'Normalbetrieb')),
        h('div', { style: { marginTop: 10 } }, h(O.ProgressBar, { value: level / 5, cells: 25, tone: levelTone === 'ok' ? undefined : levelTone, label: '1 = Normalbetrieb · 5 = kritisch', valueText: level + ' / 5' }))),
      h(O.Panel, { key: 'charts', variant: 'outlined', mutedCorners: true, title: 'Echtzeit-Messdaten', icon: 'chart' },
        h('div', { className: 'chart-grid' },
          h(Chart, { title: 'Transaktionen', unit: 'pro Stunde', data: isBank ? hourBuckets(txRows, 'created_at') : [0, 0] }),
          h(Chart, { title: 'DB-Antwortzeit', unit: 'ms', data: pings[0].map(function (p) { return p.ms; }) }),
          h(Chart, { title: 'Audit-Ereignisse', unit: 'pro Stunde', data: hourBuckets(auditRows, 'ts') }),
          h(Chart, { title: 'Abgelehnt / Fehler', unit: 'pro Stunde', data: hourBuckets(auditBad, 'ts') }))),
      h(O.Panel, { key: 'log', variant: 'outlined', mutedCorners: true, title: 'Ereignisprotokoll', icon: 'news' },
        log.length ? h(O.EventLog, { rail: true, items: log.map(function (l) { return { text: l.text, time: M.fmtT(l.ts), tone: l.tone }; }) }) : h('div', { className: 'hint', style: { textAlign: 'left' } }, '– keine Ereignisse')),
      h(O.Panel, { key: 'info', variant: 'outlined', mutedCorners: true, title: 'Allgemeine Informationen', icon: 'grid' },
        h(O.InfoList, { items: [
          { label: 'Edge Function admin-actions', value: fn[0] ? (fn[0].ok ? 'Erreichbar · ' + fn[0].ms + ' ms' : 'Nicht erreichbar') : 'Prüfe …', tone: fn[0] && !fn[0].ok ? 'danger' : undefined },
          { label: 'Scheduler (pg_cron)', value: !isBank ? 'nur Level 6' : !sched[0] ? 'Prüfe …' : sched[0].job_scheduled ? 'Aktiv' : 'Nicht eingerichtet', tone: sched[0] && !sched[0].job_scheduled ? 'warn' : undefined },
          { label: 'Wartungsmodus', value: maint.on ? 'AKTIV' + (maint.until ? ' · bis ' + maint.until : '') : 'Aus', tone: maint.on ? 'warn' : undefined },
          { label: 'Privilegierte Konten (L5+)', value: privileged },
          { label: 'Gesperrte Konten', value: locked, tone: locked ? 'danger' : undefined },
          { label: 'Anmeldungen 24 h', value: signIns == null ? 'nicht erfasst' : signIns },
          { section: 'Offene Vorgänge' },
          { label: 'Bewerbungen in Prüfung', value: openApps },
          { label: 'Terminanfragen', value: reqAppts },
          { label: 'Staatsbürgerschaftsanträge', value: s[0].cits == null ? '—' : s[0].cits },
          { label: 'Haftbefehle beantragt', value: me.is >= 3 || me.isAdmin ? warrants : '—' },
          { label: 'Offene Support-Tickets', value: tickets }] })),
      me.is < M.CLEARANCE.credentials && !me.isAdmin ? h(O.Alert, { key: 'l6', tone: 'info', title: 'Eingeschränkte Sicht' }, 'Einige Messwerte (Bank, Audit) sind nur für Level 6 bzw. den Administrator sichtbar – die Datenbank gibt sie anderen Konten nicht heraus.') : null
    ];
  }

  /* =====================================================================
     BÜRGERREGISTER
     ===================================================================== */
  function unitList(units) {
    return units.length ? units.map(function (u) { return { name: u.name, kind: u.kind }; })
      : M.MINISTRIES.map(function (n) { return { name: n, kind: 'ministerium' }; }).concat(M.ORGANE.map(function (n) { return { name: n, kind: 'organ' }; }), M.BUNDES.map(function (n) { return { name: n, kind: 'bundes' }; }));
  }

  function Register(props) {
    var app = usePortal(), citizens = app.citizens, me = app.me;
    var q = React.useState(''), filter = React.useState('alle'), adding = React.useState(false), created = React.useState(null);
    var open = props.id ? citizens.filter(function (c) { return c.id === props.id; })[0] : null;
    if (props.id && open) return h(Detail, { c: open });
    if (props.id) return [h(O.Alert, { key: 'a', tone: 'warn', title: 'Nicht gefunden' }, 'Bürger ' + props.id + ' ist nicht (mehr) im Register.'),
      h(O.Button, { key: 'b', variant: 'outline', icon: 'back', onClick: function () { go('register'); } }, 'Zum Register')];
    if (adding[0]) return h(AddCitizen, { onCancel: function () { adding[1](false); }, onDone: function (c) { adding[1](false); created[1](c); } });

    var names = (app.units.length ? app.units.map(function (u) { return u.name; }) : M.ALL_UNITS).slice().sort(function (a, b) { return M.unitShort(a).localeCompare(M.unitShort(b), 'de'); });
    var f = filter[0], needle = q[0].toLowerCase();
    var list = citizens.filter(function (c) {
      if (f === 'zivil' && c.ministries.length) return false;
      if (f === 'gesperrt' && !c.locked) return false;
      if (f === 'priv' && !(c.is >= 5)) return false;
      if (['alle', 'zivil', 'gesperrt', 'priv'].indexOf(f) < 0 && c.ministries.indexOf(f) < 0) return false;
      return (M.displayName(c.name) + ' ' + c.name + c.id + (c.role || '') + c.ministries.join(' ')).toLowerCase().indexOf(needle) >= 0;
    }).sort(function (a, b) { return M.displayName(a.name).localeCompare(M.displayName(b.name), 'de'); });
    function count(fn) { return citizens.filter(fn).length; }

    return [
      h('div', { key: 'tb', className: 'op-row', style: { justifyContent: 'space-between' } },
        h('span', { className: 'op-label' }, citizens.length + ' Bürger · Level aus der Datenbank'),
        M.can(me, 'register.create') ? h(O.Button, { icon: 'plus', onClick: function () { adding[1](true); } }, 'Bürger anlegen') : null),
      created[0] ? h(O.Panel, { key: 'cr', variant: 'framed', title: 'Bürger angelegt', icon: 'user' },
        h(Muted, null, M.displayName(created[0].name) + ' (' + created[0].id + '). Startpasswort notieren und übermitteln – es wird nur einmal angezeigt:'),
        h('div', { className: 'secret op-mono' }, created[0].password),
        h('div', { className: 'op-row' }, h(O.Button, { variant: 'outline', size: 'sm', onClick: function () { navigator.clipboard && navigator.clipboard.writeText(created[0].password).then(function () { Files.toast('Kopiert'); }, function () { /* egal */ }); } }, 'Kopieren'),
          h(O.Button, { variant: 'ghost', size: 'sm', onClick: function () { created[1](null); } }, 'Verstanden'))) : null,
      h('div', { key: 'f', className: 'g2' },
        h(O.TextField, { label: 'Suchen', value: q[0], placeholder: 'Name, Bürger-Nr., Rolle …', onChange: function (e) { q[1](e.target.value); } }),
        h(U.Select, { label: 'Filter', value: f, onChange: filter[1] }, U.options([['alle', 'Alle (' + citizens.length + ')'], ['priv', 'Level 5+ (' + count(function (c) { return c.is >= 5; }) + ')'],
          ['gesperrt', 'Gesperrt (' + count(function (c) { return c.locked; }) + ')'], ['zivil', 'Zivilisten (' + count(function (c) { return !c.ministries.length; }) + ')']]
          .concat(names.map(function (u) { return [u, M.unitShort(u) + ' (' + count(function (c) { return c.ministries.indexOf(u) >= 0; }) + ')']; }))))),
      h(O.Panel, { key: 'l', variant: 'outlined', mutedCorners: true },
        list.length ? h('div', { className: 'file-list' }, list.map(function (c) {
          return h(O.ListItem, { key: c.id, icon: 'user', title: M.displayName(c.name), onClick: function () { go('register', c.id); },
            subtitle: c.id + ' · ' + (c.role || '—') + ' · ' + (c.ministries.length ? c.ministries.map(M.unitShort).join(', ') : 'Zivilist'),
            end: h('span', { className: 'op-row', style: { gap: 6, flexWrap: 'nowrap' } }, c.locked ? h(O.Badge, { tone: 'danger' }, 'Gesperrt') : null, h(O.Badge, { tone: c.is >= 5 ? 'warn' : 'neutral' }, 'L' + c.is)) });
        })) : h('div', { className: 'hint' }, 'Keine Treffer.'))
    ];
  }

  function AddCitizen(p) {
    var app = usePortal();
    var f = React.useState({ name: '', born: '', email: '', other: 'Deutsch', role: 'Bürger', status: 'Staatsbürger' }), busy = React.useState(false), err = React.useState('');
    var nextId = React.useMemo(function () {
      var ids = app.citizens.map(function (c) { return c.id; }).concat(app.profiles.map(function (x) { return x.citizen_id; }));
      var nums = ids.filter(function (id) { return String(id).indexOf('MK-2025') === 0; }).map(function (id) { return Number(String(id).split('-')[2]) || 0; });
      return 'MK-2025-' + String(Math.max.apply(null, [0].concat(nums)) + 1).padStart(4, '0');
    }, [app.citizens, app.profiles]);
    var v = f[0];
    function set(k) { return function (e) { var n = Object.assign({}, v); n[k] = e.target.value; f[1](n); }; }
    function add(e) {
      e.preventDefault();
      busy[1](true); err[1]('');
      var pw = M.genPassword(12);
      var c = Object.assign({}, v, { name: v.name.trim(), id: nextId, is: 0, since: new Date().toLocaleDateString('de-DE'), admin: false, ministries: [], loginEmail: M.loginEmailFor(v), pwIsDefault: true, locked: false, lastLogin: null });
      adminAction('create-user', { email: c.loginEmail, password: pw, citizen_id: c.id, name: c.name, level: 0, ministries: [] }).then(function (r) {
        if (!r || !r.ok) { busy[1](false); err[1]((r && r.reason) || 'Konto konnte nicht angelegt werden.'); return; }
        return mutate(KEYS.REG, function (reg) { return (reg || []).concat([c]); }, [], 'Bürger angelegt: ' + c.name + ' (' + c.id + ')').then(function () {
          return reloadAll().then(function () { busy[1](false); p.onDone(Object.assign({}, c, { password: pw })); });
        }, function (e2) { busy[1](false); err[1]('Konto angelegt, aber Eintrag ins Register fehlgeschlagen: ' + e2.message); });
      });
    }
    return h(O.Panel, { variant: 'framed', title: 'Bürger anlegen · ' + nextId, icon: 'user' },
      h('form', { className: 'op-col', style: { gap: 14 }, onSubmit: add },
        h(O.TextField, { label: 'Voller Name', value: v.name, onChange: set('name'), placeholder: 'Vor- und Nachname' }),
        h('div', { className: 'g2' },
          h(O.TextField, { label: 'Geburtsdatum', value: v.born, onChange: set('born'), placeholder: 'TT.MM.JJJJ' }),
          h(O.TextField, { label: 'E-Mail (Login)', value: v.email, onChange: set('email'), hint: 'Leer = automatisch @' + M.CITIZEN_DOMAIN }),
          h(O.TextField, { label: 'Andere Staatsbürgerschaft', value: v.other, onChange: set('other') }),
          h(O.TextField, { label: 'Amt / Rolle', value: v.role, onChange: set('role') })),
        h(Muted, null, 'Neue Bürger erhalten Level 0. Konto und Profil legt die Server-Funktion an; das Startpasswort wird einmalig angezeigt.'),
        err[0] ? h(O.Status, { tone: 'danger' }, err[0]) : null,
        h('div', { className: 'op-row' }, h(O.Button, { type: 'submit', icon: 'plus', disabled: busy[0] || v.name.trim().length < 3 }, busy[0] ? 'Wird angelegt …' : 'Bürger eintragen'),
          h(O.Button, { variant: 'ghost', onClick: p.onCancel }, 'Abbrechen'))));
  }

  function Detail(p) {
    var app = usePortal(), me = app.me, c = p.c;
    var msg = React.useState(null), editing = React.useState(null), busy = React.useState(false), dialog = React.useState(null);
    var canEdit = M.can(me, 'register.edit'), cap = M.maxAssignableLevel(me);
    var canLevel = M.can(me, 'register.level') && me.id !== c.id && c.is <= cap;
    var canLock = M.can(me, 'register.lock') && me.id !== c.id;
    var canDelete = M.can(me, 'register.delete') && me.id !== c.id;
    var apps = (app.val(KEYS.APPS, []) || []).filter(function (a) { return a.ownerId === c.id; });
    var appts = (app.val(KEYS.APPTS, []) || []).filter(function (a) { return a.ownerId === c.id; });
    function patchReg(change, text) { return mutate(KEYS.REG, function (reg) { return (reg || []).map(function (x) { return x.id === c.id ? Object.assign({}, x, change) : x; }); }, [], text); }
    function run(fn) {
      busy[1](true); msg[1](null);
      Promise.resolve().then(fn).catch(function (e) { msg[1]({ ok: false, text: e.message || 'Fehlgeschlagen.' }); }).then(function () { busy[1](false); });
    }
    function startEdit() { editing[1]({ name: c.name || '', born: c.born || '', address: c.address || '', email: c.loginEmail || c.email || '', role: c.role || '' }); }
    function saveEdit(e) {
      e.preventDefault();
      var ed = editing[0], email = ed.email.trim();
      run(function () {
        return patchReg({ name: ed.name.trim() || c.name, born: ed.born.trim(), address: ed.address.trim(), role: ed.role.trim() || c.role, email: email || c.email, loginEmail: email || c.loginEmail }, 'Stammdaten geändert: ' + c.id)
          .then(function () { editing[1](null); msg[1]({ ok: true, text: 'Stammdaten gespeichert.' + (email && email !== c.loginEmail ? ' Hinweis: Die Anmeldeadresse bei Supabase ändert sich dadurch nicht.' : '') }); });
      });
    }
    function toggleUnit(u) {
      run(function () {
        var next = c.ministries.indexOf(u) >= 0 ? c.ministries.filter(function (x) { return x !== u; }) : c.ministries.concat([u]);
        return patchReg({ ministries: next }, 'Zuordnung geändert: ' + c.id + ' → ' + (next.join(', ') || 'Zivilist'))
          .then(function () { return adminAction('set-ministries', { citizen_id: c.id, ministries: next }); })
          .then(function (r) { if (!r.ok) msg[1]({ ok: false, tone: 'warn', text: 'Register geändert, Profil nicht: ' + (r.reason || 'Fehler') }); return reloadAll(); });
      });
    }
    function setLevel(lvl) {
      run(function () {
        return adminAction('set-level', { citizen_id: c.id, level: lvl }).then(function (r) {
          if (!r.ok) { msg[1]({ ok: false, text: r.reason || 'Level konnte nicht gesetzt werden.' }); return; }
          return patchReg({ is: lvl }, 'Level gesetzt: ' + c.id + ' → L' + lvl).then(reloadAll).then(function () { msg[1]({ ok: true, text: 'Level ' + lvl + ' gesetzt.' }); });
        });
      });
    }
    function toggleLock() {
      var next = !c.locked;
      run(function () {
        return adminAction('set-locked', { citizen_id: c.id, locked: next }).then(function (r) {
          if (!r.ok) { msg[1]({ ok: false, text: r.reason === 'Konto nicht gefunden.' ? 'Diese Person hat noch kein Anmeldekonto.' : r.reason || 'Fehlgeschlagen.' }); return; }
          return patchReg({ locked: next }, (next ? 'Konto gesperrt: ' : 'Konto entsperrt: ') + c.id)
            .then(function () { msg[1]({ ok: true, text: next ? 'Konto gesperrt – Anmeldung ist nicht mehr möglich.' : 'Konto entsperrt.' }); });
        });
      });
    }
    function del() {
      run(function () {
        return mutate(KEYS.REG, function (reg) { return (reg || []).filter(function (x) { return x.id !== c.id; }); }, [], 'Bürger gelöscht: ' + c.name + ' (' + c.id + ')')
          .then(function () { return mutate(KEYS.APPS, function (a) { return (a || []).filter(function (x) { return x.ownerId !== c.id; }); }, []); })
          .then(function () { return mutate(KEYS.APPTS, function (a) { return (a || []).filter(function (x) { return x.ownerId !== c.id; }); }, []); })
          .then(function () { go('register'); });
      });
    }

    var ed = editing[0];
    function setEd(k) { return function (e) { var n = Object.assign({}, ed); n[k] = e.target.value; editing[1](n); }; }
    var units = unitList(app.units);
    var levels = []; for (var n = 0; n <= Math.max(cap, c.is); n++) levels.push([String(n), 'Level ' + n + ' · ' + M.IS_LABEL[n], n > cap]);

    return [
      h(O.Panel, { key: 'head', variant: 'framed', title: M.displayName(c.name), icon: 'user' },
        h('div', { className: 'op-row', style: { gap: 6 } }, h(O.Badge, { tone: c.is >= 5 ? 'warn' : 'neutral' }, 'L' + c.is + ' · ' + M.IS_LABEL[c.is]),
          c.locked ? h(O.Badge, { tone: 'danger' }, 'Gesperrt') : h(O.Badge, { tone: 'ok' }, 'Aktiv'), h('span', { className: 'op-mono', style: { color: 'var(--ink-muted)' } }, c.id))),
      msg[0] ? h(Msg, { key: 'm', m: msg[0] }) : null,
      h(O.Panel, { key: 'st', variant: 'outlined', mutedCorners: true, title: 'Stammdaten', icon: 'file' },
        !ed ? [h(O.InfoList, { key: 'i', items: [
          { label: 'Name', value: M.displayName(c.name) }, { label: 'Amt / Rolle', value: c.role || '—' }, { label: 'Geburtsdatum', value: c.born || '—' },
          { label: 'Adresse', value: c.address || '—' }, { label: 'Bürger seit', value: c.since || '—' }, { label: 'E-Mail (Login)', value: c.loginEmail || M.loginEmailFor(c) },
          { label: 'Andere Staatsb.', value: c.other || '—' }, { label: 'Letzte Anmeldung', value: c.lastLogin || '—' }, { label: 'Standardpasswort', value: c.pwIsDefault ? 'ja' : 'nein', tone: c.pwIsDefault ? 'warn' : undefined }] }),
          canEdit ? h('div', { key: 'b', style: { marginTop: 12 } }, h(O.Button, { variant: 'outline', size: 'sm', icon: 'settings', onClick: startEdit }, 'Bearbeiten')) : null]
          : h('form', { className: 'op-col', style: { gap: 12 }, onSubmit: saveEdit },
            h(O.TextField, { label: 'Voller Name', value: ed.name, onChange: setEd('name') }),
            h('div', { className: 'g2' }, h(O.TextField, { label: 'Geburtsdatum', value: ed.born, onChange: setEd('born') }), h(O.TextField, { label: 'Amt / Rolle', value: ed.role, onChange: setEd('role') })),
            h(O.TextField, { label: 'Adresse', value: ed.address, onChange: setEd('address') }),
            h(O.TextField, { label: 'E-Mail (Login)', value: ed.email, onChange: setEd('email') }),
            h('div', { className: 'op-row' }, h(O.Button, { type: 'submit', disabled: busy[0] }, 'Speichern'), h(O.Button, { variant: 'ghost', onClick: function () { editing[1](null); } }, 'Abbrechen')))),
      h(O.Panel, { key: 'u', variant: 'outlined', mutedCorners: true, title: 'Zuordnungen', icon: 'grid' },
        [['Ministerien', 'ministerium'], ['Sicherheitsorgane', 'organ'], ['Bundesverwaltung', 'bundes']].map(function (g) {
          var arr = units.filter(function (u) { return u.kind === g[1]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'de'); });
          return arr.length ? h('div', { key: g[1], style: { marginBottom: 12 } }, h('div', { className: 'op-label', style: { marginBottom: 6 } }, g[0]),
            h(U.Chips, { multi: true, label: g[0], disabled: !canEdit || busy[0], value: c.ministries, items: arr.map(function (u) { return [u.name, u.name]; }), onChange: toggleUnit })) : null;
        }),
        h(Muted, null, canEdit ? 'Änderungen gehen ins Register und ins Profil (Server-Funktion).' : 'Ändern erst ab Level 4.')),
      h(O.Panel, { key: 'sec', variant: 'framed', title: 'Sicherheit', icon: 'shield' },
        h('div', { className: 'op-col', style: { gap: 14 } },
          h(U.Select, { label: 'Level (Freigabestufe)', value: String(c.is), disabled: !canLevel || busy[0], hint: canLevel ? 'Du kannst maximal Level ' + cap + ' vergeben.' : 'Nicht änderbar (Recht oder Stufe fehlt).',
            onChange: function (val) { confirmDialog(dialog[1], 'Level ändern', 'Level von ' + M.displayName(c.name) + ' auf ' + val + ' setzen?', 'Setzen', function () { setLevel(Number(val)); }, false); } }, U.options(levels)),
          h('div', null, h('div', { className: 'op-label', style: { marginBottom: 6 } }, 'Kontostatus'),
            canLock ? h(O.Button, { variant: c.locked ? 'primary' : 'danger', icon: 'lock', disabled: busy[0],
              onClick: function () { confirmDialog(dialog[1], c.locked ? 'Konto entsperren' : 'Konto sperren', c.locked ? 'Konto entsperren?' : 'Konto sperren? Die Person kann sich danach nicht mehr anmelden.', c.locked ? 'Entsperren' : 'Sperren', toggleLock, !c.locked); } },
              c.locked ? 'Konto entsperren' : 'Konto sperren') : h(O.Badge, { tone: c.locked ? 'danger' : 'ok' }, c.locked ? 'Gesperrt' : 'Aktiv'),
            h('div', { className: 'op-field-hint', style: { marginTop: 6 } }, 'Die Sperre gilt direkt bei der Anmeldung (Supabase-Bann).')))),
      h(O.Panel, { key: 'apps', variant: 'outlined', mutedCorners: true, title: 'Bewerbungen (' + apps.length + ') · Termine (' + appts.length + ')', icon: 'news' },
        apps.length || appts.length ? h('div', { className: 'file-list' },
          apps.map(function (a) { return h(O.ListItem, { key: a.id, title: a.title, subtitle: a.ref, end: h(O.Badge, { tone: a.status === 'abgelehnt' ? 'danger' : a.step >= 3 ? 'ok' : 'warn' }, a.status || M.APP_STEPS[Math.min(a.step || 0, 3)]) }); }),
          appts.map(function (a) { return h(O.ListItem, { key: a.id, title: a.title, subtitle: a.date + ' ' + a.time, end: h(O.Badge, { tone: 'neutral' }, a.status) }); }))
          : h('div', { className: 'hint', style: { textAlign: 'left' } }, 'Keine Vorgänge.')),
      canDelete ? h(O.Panel, { key: 'del', variant: 'outlined', mutedCorners: true, title: 'Bürger löschen', icon: 'close' },
        h(Muted, { style: { marginBottom: 12 } }, 'Entfernt den Registereintrag samt Bewerbungen und Terminen. Das Anmeldekonto bei Supabase bleibt bestehen – vorher sperren.'),
        h(O.Button, { variant: 'danger', icon: 'close', disabled: busy[0], onClick: function () { confirmDialog(dialog[1], 'Bürger löschen', M.displayName(c.name) + ' (' + c.id + ') endgültig aus dem Register löschen?', 'Endgültig löschen', del); } }, 'Löschen …')) : null,
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* =====================================================================
     ANTRÄGE
     ===================================================================== */
  function isOpen(a) { return !a.archived && a.step < 3 && ['abgelehnt', 'zurückgezogen', 'geschlossen'].indexOf(a.status) < 0; }
  function ended(a) { return !a.archived && ['abgelehnt', 'zurückgezogen', 'geschlossen'].indexOf(a.status) >= 0; }
  function granted(a) { return !a.archived && a.step >= 3 && !a.status; }

  function Antraege() {
    var tab = React.useState('apps');
    return [
      h(O.Tabs, { key: 't', items: [{ id: 'apps', label: 'Bewerbungen' }, { id: 'cit', label: 'Staatsbürgerschaft' }], value: tab[0], onChange: tab[1] }),
      h(tab[0] === 'apps' ? Apps : Citizenship, { key: tab[0] })
    ];
  }

  function Apps() {
    var app = usePortal(), me = app.me, units = app.units;
    var filter = React.useState('offen'), kind = React.useState(''), msg = React.useState(null), dialog = React.useState(null);
    var types = app.val(KEYS.TYPES, []) || [], typeUnits = app.val(KEYS.TYPEUNITS, {}) || {};
    var all = (app.val(KEYS.APPS, []) || []).map(function (a) {
      if (a.unit) return a;
      var t = types.filter(function (x) { return x.label === a.title; })[0];
      return Object.assign({}, a, { unit: (t && (t.unit || typeUnits[t.id])) || M.inferUnitFromLabel(a.title, units) });
    }).filter(function (a) { return M.canHandleApplication(me, a, units); });
    var kinds = all.map(function (a) { return a.title; }).filter(function (t, i, arr) { return t && arr.indexOf(t) === i; }).sort(function (a, b) { return a.localeCompare(b, 'de'); });
    var FILTERS = { offen: isOpen, bewilligt: granted, beendet: ended, archiv: function (a) { return a.archived; }, alle: function () { return true; } };
    var pool = all.filter(function (a) { return (!kind[0] || a.title === kind[0]) && FILTERS[filter[0]](a); });

    function update(a, change, text, grantUnit) {
      mutate(KEYS.APPS, function (list) { return (list || []).map(function (x) { return x.id === a.id ? Object.assign({}, x, change) : x; }); }, [], text)
        .then(function () {
          if (grantUnit) return mutate(KEYS.REG, function (reg) { return (reg || []).map(function (c) { return c.id === a.ownerId && (c.ministries || []).indexOf(grantUnit) < 0 ? Object.assign({}, c, { ministries: (c.ministries || []).concat([grantUnit]) }) : c; }); }, []);
        })
        .then(function () { msg[1]({ ok: true, text: text }); }, function (e) { msg[1]({ ok: false, text: e.message }); });
    }
    function advance(a) {
      var t = types.filter(function (x) { return x.label === a.title; })[0], next = Math.min((a.step || 0) + 1, 3);
      var grant = next >= 3 && t && t.grantOnAccept && a.unit ? a.unit : null;
      update(a, Object.assign({ step: next }, grant ? { grantedUnit: grant } : {}), 'Antrag ' + a.ref + ' → ' + M.APP_STEPS[next], grant);
    }
    function del(a) {
      confirmDialog(dialog[1], 'Bewerbung löschen', 'Bewerbung ' + a.ref + ' endgültig löschen?', 'Löschen', function () {
        mutate(KEYS.APPS, function (list) { return (list || []).filter(function (x) { return x.id !== a.id; }); }, [], 'Bewerbung gelöscht: ' + a.ref).then(null, function (e) { msg[1]({ ok: false, text: e.message }); });
      });
    }
    function n(fn) { return all.filter(fn).length; }

    return [
      h('div', { key: 'f', className: 'g2' },
        h(U.Select, { label: 'Ansicht', value: filter[0], onChange: filter[1] }, U.options([['offen', 'Offen (' + n(isOpen) + ')'], ['bewilligt', 'Bewilligt (' + n(granted) + ')'],
          ['beendet', 'Abgelehnt / Geschlossen (' + n(ended) + ')'], ['archiv', 'Archiv (' + n(FILTERS.archiv) + ')'], ['alle', 'Alle (' + all.length + ')']])),
        h(U.Select, { label: 'Antragsart', value: kind[0], onChange: kind[1] }, h('option', { value: '' }, 'Alle Antragsarten'), U.options(kinds.map(function (k) { return [k, k]; })))),
      msg[0] ? h(Msg, { key: 'm', m: msg[0] }) : null,
      !pool.length ? h('div', { key: 'n', className: 'hint' }, 'Keine Anträge in dieser Ansicht.') : null,
      pool.map(function (a) {
        var step = a.status || M.APP_STEPS[Math.min(a.step || 0, 3)], own = a.ownerId === me.id;
        return h(O.Panel, { key: a.id, variant: isOpen(a) ? 'framed' : 'outlined', mutedCorners: !isOpen(a), title: a.title + ' — ' + M.displayName(app.nameOf(a.ownerId)) },
          h('div', { className: 'op-row', style: { gap: 6 } },
            a.archived ? h(O.Badge, { tone: 'neutral' }, 'Archiviert') : null,
            h(O.Badge, { tone: a.status === 'abgelehnt' ? 'danger' : a.status ? 'neutral' : a.step >= 3 ? 'ok' : 'warn' }, step),
            h('span', { className: 'op-field-hint' }, [a.kind, a.unit || a.office || 'ohne Zuordnung', a.ref, 'eingereicht ' + a.date].filter(Boolean).join(' · '))),
          (Array.isArray(a.answers) ? a.answers : []).filter(function (x) { return x && x.a; }).length
            ? h(O.InfoList, { items: a.answers.filter(function (x) { return x && x.a; }).map(function (x) { return { label: x.q, value: x.a }; }) }) : null,
          a.grund ? h(Muted, { style: { marginTop: 8 } }, 'Beweggrund: ' + a.grund) : null,
          !a.status ? h('div', { style: { marginTop: 10 } }, h(O.ProgressBar, { value: Math.min(a.step || 0, 3) / 3, cells: 12, label: 'Schritt ' + (Math.min(a.step || 0, 3) + 1) + ' von 4', valueText: M.APP_STEPS[Math.min(a.step || 0, 3)] })) : null,
          h('div', { className: 'control-actions' },
            isOpen(a) && !own ? [
              h(O.Button, { key: 'n', size: 'sm', onClick: function () { advance(a); } }, (a.step || 0) >= 2 ? 'Bewilligen' : 'Nächster Schritt'),
              h(O.Button, { key: 'r', size: 'sm', variant: 'danger', onClick: function () { update(a, { status: 'abgelehnt', rejectedAt: Date.now() }, 'Antrag abgelehnt: ' + a.ref); } }, 'Ablehnen'),
              h(O.Button, { key: 'c', size: 'sm', variant: 'ghost', onClick: function () { update(a, { status: 'geschlossen', closedAt: Date.now() }, 'Antrag geschlossen: ' + a.ref); } }, 'Schließen')] : null,
            isOpen(a) && own ? h('span', { className: 'op-field-hint' }, 'Eigene Bewerbung') : null,
            M.can(me, 'apps.delete') ? h(O.Button, { size: 'sm', variant: 'ghost', icon: 'close', onClick: function () { del(a); } }, 'Löschen') : null));
      }),
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  function Citizenship() {
    var app = usePortal();
    var rows = React.useState(null), err = React.useState(''), st = React.useState('offen'), open = React.useState(null), dialog = React.useState(null);
    function load() {
      var q = sb.from('citizenship_requests').select('*').order('eingegangen', { ascending: false }).limit(500);
      if (st[0]) q = q.eq('status', st[0]);
      q.then(function (r) {
        if (r.error) err[1](r.error.code === '42P01' ? 'Tabelle citizenship_requests ist nicht eingerichtet (sql/5-antragstabelle.sql).' : /permission/i.test(r.error.message) ? 'Nur ab Level 4.' : r.error.message);
        else { err[1](''); rows[1](r.data || []); }
      }, function () { err[1]('Server nicht erreichbar.'); });
    }
    React.useEffect(load, [st[0]]);
    function setStatus(r, status) {
      var by = app.me.isAdmin ? 'Administrator' : app.me.name;
      sb.from('citizenship_requests').update({ status: status, bearbeitet_von: by, bearbeitet_am: new Date().toISOString() }).eq('id', r.id).then(function (res) {
        if (res.error) { err[1](res.error.message); return; }
        note('Staatsbürgerschaftsantrag ' + r.aktenzeichen + ': ' + status, 'ok'); logAction('Staatsbürgerschaftsantrag ' + status, r.aktenzeichen);
        open[1](null); load();
      });
    }
    function del(r) {
      confirmDialog(dialog[1], 'Antrag löschen', 'Antrag ' + r.aktenzeichen + ' endgültig löschen?', 'Löschen', function () {
        sb.from('citizenship_requests').delete().eq('id', r.id).then(function (res) {
          if (res.error) err[1](res.error.message); else { logAction('Staatsbürgerschaftsantrag gelöscht', r.aktenzeichen); open[1](null); load(); }
        });
      });
    }
    var o = open[0];
    return [
      h(U.Chips, { key: 's', label: 'Status', value: st[0], onChange: st[1], items: [['offen', 'Offen'], ['angenommen', 'Angenommen'], ['abgelehnt', 'Abgelehnt'], ['', 'Alle']] }),
      err[0] ? h(O.Status, { key: 'e', tone: 'danger' }, err[0]) : null,
      h(O.Panel, { key: 'l', variant: 'outlined', mutedCorners: true },
        !rows[0] && !err[0] ? h('div', { className: 'hint' }, 'Lade …') : null,
        rows[0] && !rows[0].length ? h('div', { className: 'hint' }, 'Keine Anträge.') : null,
        h('div', { className: 'file-list' }, (rows[0] || []).map(function (r) {
          return h(O.ListItem, { key: r.id, icon: 'file', title: r.vorname + ' ' + r.nachname, onClick: function () { open[1](r); },
            subtitle: r.aktenzeichen + ' · ' + M.fmtDT(r.eingegangen) + (r.art ? ' · ' + r.art : '') + (r.bearbeitet_von ? ' · bearbeitet von ' + r.bearbeitet_von : ''),
            end: h(O.Badge, { tone: r.status === 'offen' ? 'warn' : r.status === 'angenommen' ? 'ok' : 'danger' }, r.status) });
        }))),
      o ? h(U.Modal, { key: 'o', wide: true, title: 'Antrag ' + o.aktenzeichen, onClose: function () { open[1](null); } },
        h(O.InfoList, { items: [
          { label: 'Name', value: o.vorname + ' ' + o.nachname }, { label: 'Geburt', value: (o.geburtsdatum || '—') + (o.geburtsort ? ', ' + o.geburtsort : '') },
          { label: 'Staatsangehörigkeit', value: o.staatsangehoerigkeit || '—' }, { label: 'Beruf', value: o.beruf || '—' }, { label: 'Anschrift', value: o.anschrift || '—' },
          { label: 'E-Mail', value: o.email }, { label: 'Telefon', value: o.telefon || '—' }, { label: 'Seit', value: o.seit || '—' }, { label: 'Art', value: o.art || '—' },
          { label: 'Grund', value: o.grund || '—' }, { label: 'Beitrag', value: o.beitrag || '—' }, { label: 'Vorgeschichte', value: o.vorgeschichte || '—' },
          { label: 'Kontakt erlaubt', value: o.kontakt_ok ? 'ja' : 'nein' }, { label: 'Status', value: o.status }] }),
        h('div', { className: 'control-actions' },
          o.status !== 'angenommen' ? h(O.Button, { size: 'sm', onClick: function () { setStatus(o, 'angenommen'); } }, 'Annehmen') : null,
          o.status !== 'abgelehnt' ? h(O.Button, { size: 'sm', variant: 'danger', onClick: function () { setStatus(o, 'abgelehnt'); } }, 'Ablehnen') : null,
          o.status !== 'offen' ? h(O.Button, { size: 'sm', variant: 'outline', onClick: function () { setStatus(o, 'offen'); } }, 'Wieder öffnen') : null,
          h(O.Button, { size: 'sm', variant: 'ghost', icon: 'close', onClick: function () { del(o); } }, 'Löschen')),
        h('div', { className: 'op-field-hint', style: { marginTop: 8 } }, 'Ein angenommener Antrag legt noch keinen Bürger an – das geschieht im Bürgerregister.')) : null,
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* =====================================================================
     SEITE
     ===================================================================== */
  var SECTIONS = [
    { id: 'lage', label: 'Lagezentrum', C: Lagezentrum, ok: function () { return true; } },
    { id: 'register', label: 'Register', C: Register, ok: function (me) { return me.is >= M.CLEARANCE.register || me.allow.indexOf('nav:register') >= 0; }, need: 'Level 3' },
    { id: 'antraege', label: 'Anträge', C: Antraege, ok: function (me) { return me.is >= M.CLEARANCE.antraege || me.allow.indexOf('nav:antraege') >= 0; }, need: 'Level 3' }
  ];

  function Page(props) {
    var a = A.useAuth(), app = usePortal();
    if (!a.portal) return h(A.SignIn, { system: 'portal', title: 'Bürgerportal · ABIS' });
    var cur = SECTIONS.filter(function (x) { return x.id === props.section; })[0] || SECTIONS[0], me = app.me;
    return [
      h('div', { key: 's', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Status, { tone: app.live ? 'ok' : 'warn' }, (me ? (me.isAdmin ? 'Administrator' : M.displayName(me.name)) + ' · L' + me.is : 'Anmelden …') + ' · ' + (app.live ? 'Live' : 'Offline')),
        h(O.Button, { variant: 'ghost', size: 'sm', icon: 'lock', onClick: A.logoutPortal }, 'Abmelden')),
      h(O.Tabs, { key: 't', className: 'tabs-scroll', items: SECTIONS.map(function (x) { return { id: x.id, label: x.label }; }), value: cur.id, onChange: function (id) { go(id); } }),
      app.loadError ? h(O.Alert, { key: 'e', tone: 'danger', title: 'Daten nicht geladen' }, app.loadError, h('div', { style: { marginTop: 8 } }, h(O.Button, { size: 'sm', variant: 'outline', onClick: reloadAll }, 'Erneut laden'))) : null,
      !app.kv || !me ? h('div', { key: 'l', className: 'hint' }, 'Lade Staatsdaten …')
        : cur.ok(me) ? h(cur.C, { key: cur.id + (props.id || ''), id: props.id }) : h(Denied, { key: 'x', need: cur.need }),
      h('div', { key: 'f', className: 'hint' }, 'Weitere Bereiche der ABIS-Konsole (Protokoll, Datenbank, Bank, Justiz …) folgen.')
    ];
  }

  window.NDPortal = { Page: Page, title: function (section, id) {
    var cur = SECTIONS.filter(function (x) { return x.id === section; })[0] || SECTIONS[0];
    return id ? id : cur.label;
  } };
})();
