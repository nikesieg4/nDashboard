/* nDashboard — prüft auf GitHub, ob es ein neueres Release gibt.
 * Android: lädt die neue APK und öffnet den Installieren-Dialog (NDNative.installUpdate).
 * Linux: das Flatpak aktualisiert sich über die Paketquelle (Software-Center bzw. `flatpak update`). */
(function () {
  var REPO = 'nikesieg4/nDashboard';
  var KEY = 'nd.update';
  var INTERVAL = 60 * 60 * 1000; // höchstens einmal pro Stunde fragen (GitHub erlaubt 60 Anfragen/h ohne Anmeldung)
  var listeners = [], state = { checking: false, latest: null, error: null, checkedAt: null };

  function code(tag) { var m = /(\d+)$/.exec(tag || ''); return m ? +m[1] : 0; }
  function emit() { listeners.forEach(function (fn) { fn(Object.assign({}, state)); }); }
  function cached() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }

  function check(force) {
    var c = cached();
    if (!force && c && Date.now() - c.checkedAt < INTERVAL) {
      state.latest = c.latest; state.checkedAt = c.checkedAt; emit();
      return Promise.resolve(state);
    }
    state.checking = true; state.error = null; emit();
    return fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status === 404 ? 'Noch kein Release veröffentlicht.' : 'GitHub antwortet mit ' + r.status + '.'); return r.json(); })
      .then(function (rel) {
        var apk = (rel.assets || []).filter(function (a) { return /\.apk$/.test(a.name); })[0];
        state.latest = { tag: rel.tag_name, code: code(rel.tag_name), name: rel.tag_name.replace(/^v/, ''), url: rel.html_url, apk: apk ? apk.browser_download_url : null };
        state.checkedAt = Date.now();
        try { localStorage.setItem(KEY, JSON.stringify({ latest: state.latest, checkedAt: state.checkedAt })); } catch (e) { /* egal */ }
      }, function (e) { state.error = e.message.indexOf('fetch') >= 0 ? 'Keine Internetverbindung.' : e.message; })
      .then(function () { state.checking = false; emit(); return state; });
  }

  function available() {
    return window.ND_VERSION.code > 0 && state.latest && state.latest.code > window.ND_VERSION.code;
  }
  function canInstall() { return !!(window.NDNative && window.NDNative.installUpdate); }
  function install() {
    if (!canInstall() || !state.latest || !state.latest.apk) return false;
    return window.NDNative.installUpdate(state.latest.apk, state.latest.name);
  }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners.splice(listeners.indexOf(fn), 1); };
  }

  window.NDUpdate = { check: check, available: available, canInstall: canInstall, install: install, subscribe: subscribe,
    state: function () { return Object.assign({}, state); } };
})();
