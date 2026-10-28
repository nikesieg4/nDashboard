/* nDashboard — prüft auf GitHub, ob es ein neueres Release gibt.
 * Android: lädt die neue APK und öffnet den Installieren-Dialog (NDNative.installUpdate).
 * Windows: lädt den neuen Installer aus dem Release und startet neu (NDDesktop, desktop/main.js).
 * macOS: nicht signiert, daher nur ein Link zum neuen .dmg.
 * Linux: das Flatpak aktualisiert sich über die Paketquelle (Software-Center bzw. `flatpak update`). */
(function () {
  var REPO = 'nikesieg4/nDashboard';
  var KEY = 'nd.update';
  var INTERVAL = 60 * 60 * 1000; // höchstens einmal pro Stunde fragen (GitHub erlaubt 60 Anfragen/h ohne Anmeldung)
  var listeners = [], state = { checking: false, latest: null, error: null, checkedAt: null };
  var desktop = null; // { platform, canUpdate } in der Windows-/macOS-App
  if (window.NDDesktop) window.NDDesktop.info().then(function (i) { desktop = i; emit(); });

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
  /** 'android', 'windows', 'mac' oder 'flatpak' */
  function platform() {
    if (window.NDNative) return 'android';
    if (desktop) return desktop.platform === 'darwin' ? 'mac' : 'windows';
    return 'flatpak';
  }
  function hint() {
    return { android: 'Die neue Version wird heruntergeladen, danach bestätigst du die Installation.',
      windows: 'Die neue Version wird heruntergeladen und installiert, danach startet die App neu.',
      mac: 'Lade die neue nDashboard.dmg herunter und ziehe die App wieder in den Programme-Ordner.',
      flatpak: 'Das Flatpak aktualisiert sich über die Softwareverwaltung oder mit „flatpak update“.' }[platform()];
  }
  function canInstall() { return !!(window.NDNative && window.NDNative.installUpdate) || !!(desktop && desktop.canUpdate); }
  function install() {
    if (!canInstall() || !state.latest) return false;
    if (desktop) {
      window.NDDesktop.installUpdate().then(function (ok) {
        if (!ok) { state.error = 'Update konnte nicht installiert werden.'; emit(); }
      }, function () { state.error = 'Update-Download fehlgeschlagen.'; emit(); });
      return true;
    }
    if (!state.latest.apk) return false;
    return window.NDNative.installUpdate(state.latest.apk, state.latest.name);
  }
  /** macOS: Release-Seite im Browser öffnen (desktop/main.js leitet Links nach außen). */
  function openRelease() { if (state.latest) window.open(state.latest.url, '_blank'); }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners.splice(listeners.indexOf(fn), 1); };
  }

  window.NDUpdate = { check: check, available: available, canInstall: canInstall, install: install, subscribe: subscribe,
    platform: platform, hint: hint, openRelease: openRelease,
    state: function () { return Object.assign({}, state); } };
})();
