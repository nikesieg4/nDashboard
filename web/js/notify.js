/* nDashboard — Benachrichtigungen: Kalender-Erinnerungen, Tagesschau-Eilmeldungen, Warnungen vom PC-Agenten.
 *  - Android: über die App-Brücke (NDNative). Erinnerungen plant Android selbst (AlarmManager) und zeigt
 *    sie auch an, wenn die App geschlossen ist.
 *  - Linux (Flatpak): über ndashboard.py als Systembenachrichtigung (Nachrichtenhandler „ndnotify“).
 *  - Windows/macOS (Electron): Web-Notification-API.
 *  Auf dem Desktop kommen Meldungen nur, solange die App läuft.
 * Alle Meldungen landen außerdem in der Liste hinter der Glocke (#/notifications). */
(function () {
  var CFG = 'nd.notify', LOG = 'nd.notify.log', FIRED = 'nd.notify.fired', SEEN = 'nd.notify.seen';
  var HORIZON = 60 * 86400000, MAX_PLANNED = 150, MAX_LOG = 100;
  var listeners = [], androidPermission = null;

  function read(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v === null || v === undefined ? fallback : v; } catch (e) { return fallback; } }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* voll oder gesperrt */ } }
  function native() { return window.NDNative && window.NDNative.notify ? window.NDNative : null; }
  function linux() { var m = window.webkit && window.webkit.messageHandlers; return m && m.ndnotify ? m.ndnotify : null; }

  /* ---------- Einstellungen ---------- */
  function config() { return Object.assign({ enabled: false, calendar: true, news: true, pc: true }, read(CFG, {})); }
  function setConfig(patch) {
    write(CFG, Object.assign(config(), patch));
    emit(); syncReminders(); startPollers();
  }

  /* ---------- Berechtigung ---------- */
  /** 'granted', 'denied', 'default' oder 'unsupported' */
  function permission() {
    var n = native();
    if (n) return androidPermission || n.notificationPermission();
    if (linux()) return 'granted'; // das System (Benachrichtigungs-Portal) entscheidet
    if (typeof Notification === 'undefined') return 'unsupported';
    // Bei file://-Seiten meldet Notification.permission nicht immer den echten Stand – die Zustimmung merken
    return Notification.permission === 'granted' || config().granted ? 'granted' : Notification.permission;
  }
  function requestPermission() {
    var n = native();
    if (n) {
      if (n.notificationPermission() === 'granted') return Promise.resolve('granted');
      return new Promise(function (resolve) { pendingPermission = resolve; n.requestNotificationPermission(); });
    }
    if (linux()) return Promise.resolve('granted');
    if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
    return Promise.resolve(Notification.requestPermission()).then(function (p) {
      write(CFG, Object.assign(config(), { granted: p === 'granted' })); emit();
      return p;
    });
  }
  var pendingPermission = null;
  /** Aufruf aus MainActivity, sobald Android die Rückfrage beantwortet hat. */
  function onAndroidPermission(state) {
    androidPermission = state; emit(); syncReminders();
    if (pendingPermission) { pendingPermission(state); pendingPermission = null; }
  }

  /* ---------- Liste hinter der Glocke ---------- */
  function log() { return read(LOG, []); }
  function unread() { return log().filter(function (x) { return !x.read; }).length; }
  function addLog(n) {
    var list = log();
    if (list.some(function (x) { return x.id === n.id; })) return false;
    list.unshift({ id: n.id, ts: n.ts || Date.now(), title: n.title, body: n.body || '', url: n.url || '', source: n.source || 'app', read: false });
    write(LOG, list.slice(0, MAX_LOG)); emit();
    return true;
  }
  function markAllRead() { write(LOG, log().map(function (x) { return Object.assign(x, { read: true }); })); emit(); }
  function clearLog() { write(LOG, []); emit(); }
  function emit() { listeners.forEach(function (fn) { fn(); }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners.splice(listeners.indexOf(fn), 1); }; }

  /** Meldung anzeigen (falls erlaubt) und in die Liste schreiben. */
  function show(n) {
    if (!addLog(n)) return;
    if (!config().enabled || permission() !== 'granted') return;
    var nat = native();
    if (nat) return nat.notify(String(n.id), n.title, n.body || '', n.url || '');
    if (linux()) return linux().postMessage({ id: String(n.id), title: n.title, body: n.body || '', url: n.url || '' });
    try {
      var note = new Notification(n.title, { body: n.body || '', tag: String(n.id), icon: 'img/logo-small.svg' });
      note.onclick = function () { window.focus(); if (n.url) location.hash = n.url; note.close(); };
    } catch (e) { /* manche Umgebungen erlauben nur Service-Worker-Meldungen */ }
  }

  /* ---------- Kalender-Erinnerungen ---------- */
  function upcoming() {
    if (!window.NDCalendar || !NDCalendar.ready()) return null;
    var now = Date.now();
    return NDCalendar.reminders(now - 15 * 60000, now + HORIZON).slice(0, MAX_PLANNED);
  }
  /** Geplante Erinnerungen an Android übergeben (dort laufen sie ohne App weiter). */
  function syncReminders() {
    var list = upcoming(), nat = native();
    if (!list || !nat || !nat.setReminders) return;
    var on = config().enabled && config().calendar && permission() === 'granted';
    nat.setReminders(JSON.stringify(on ? list.filter(function (r) { return r.at > Date.now(); }) : []));
  }
  /** Fällige Erinnerungen: auf dem Desktop selbst anzeigen, auf Android nur in die Liste übernehmen
   *  (die Meldung hat Android schon gezeigt). */
  function checkDue() {
    var list = upcoming();
    if (!list || !config().calendar) return;
    var now = Date.now(), fired = read(FIRED, {});
    list.forEach(function (r) {
      if (r.at > now || fired[r.id]) return;
      fired[r.id] = r.at;
      var n = { id: r.id, ts: r.at, title: r.title, body: r.body, url: r.url, source: 'calendar' };
      if (native()) addLog(n); else if (now - r.at < 10 * 60000) show(n); else addLog(n);
    });
    Object.keys(fired).forEach(function (k) { if (fired[k] < now - 2 * 86400000) delete fired[k]; });
    write(FIRED, fired);
  }

  /* ---------- Eilmeldungen und PC-Warnungen (solange die App läuft) ---------- */
  var timers = {};
  function poll(name, every, fn) {
    clearInterval(timers[name]);
    fn();
    timers[name] = setInterval(fn, every);
  }
  function seen() { return read(SEEN, {}); }
  function setSeen(key, v) { var s = seen(); s[key] = v; write(SEEN, s); }

  function pollNews() {
    if (!config().news || !window.NDNews) return;
    NDNews.fetchList('').then(function (items) {
      var known = seen().news || null, ids = items.filter(function (x) { return x.breakingNews; }).map(function (x) { return x.sophoraId; });
      if (known) items.filter(function (x) { return x.breakingNews && known.indexOf(x.sophoraId) < 0; }).forEach(function (x) {
        show({ id: 'news:' + x.sophoraId, title: 'Eilmeldung: ' + x.title, body: x.firstSentence || '', url: '#/article?u=' + encodeURIComponent(x.details || ''), source: 'news' });
      });
      setSeen('news', ids.concat(known || []).slice(0, 50)); // beim ersten Mal nur merken, nicht melden
    }, function () { /* offline */ });
  }

  function pollPc() {
    var Agent = window.NDServices && NDServices.Agent;
    if (!config().pc || !Agent || !Agent.configured()) return;
    Agent.get('/api/events', { limit: 30 }).then(function (d) {
      var events = (d && d.events) || [], last = seen().pc;
      if (last != null) events.filter(function (e) { return e.id > last && (e.level === 'warn' || e.level === 'danger'); }).reverse().forEach(function (e) {
        show({ id: 'pc:' + e.id, ts: e.ts * 1000, title: 'PC: ' + e.title, body: e.detail || '', url: '#/sensors', source: 'pc' });
      });
      if (events.length) setSeen('pc', Math.max(last || 0, events[0].id));
      else if (last == null) setSeen('pc', 0);
    }, function () { /* PC aus */ });
  }

  function startPollers() {
    var c = config();
    if (c.news) poll('news', 5 * 60000, pollNews); else clearInterval(timers.news);
    if (c.pc) poll('pc', 2 * 60000, pollPc); else clearInterval(timers.pc);
  }

  /** Beim Start der App: Kalender laden, Erinnerungen planen, Abfragen starten. */
  function start() {
    if (window.NDCalendar) NDCalendar.ensureLoaded().then(function () { syncReminders(); checkDue(); }, function () { /* ohne Kalender */ });
    clearInterval(timers.due);
    timers.due = setInterval(checkDue, 30000);
    startPollers();
  }

  function test() {
    show({ id: 'test:' + Date.now(), title: 'nDashboard', body: 'Benachrichtigungen funktionieren.', url: '#/notifications', source: 'app' });
  }

  window.NDNotify = { config: config, setConfig: setConfig, permission: permission, requestPermission: requestPermission,
    show: show, log: log, unread: unread, markAllRead: markAllRead, clearLog: clearLog, subscribe: subscribe,
    syncReminders: syncReminders, start: start, test: test, background: !!native(), _onPermission: onAndroidPermission };
})();
