/* nDashboard — Netzwerkprofil: Zuhause (WLAN-Adressen) oder Unterwegs (VPN-Adressen, z. B. Tailscale 100.x).
 * Jede Verbindung (NAS, PC-Agent, NAS-Agent) speichert `url` (WLAN) und `urlVpn` (VPN).
 * Modus „auto“: beim Start kurz prüfen, ob eine WLAN-Adresse antwortet – sonst VPN. */
(function () {
  var KEY = 'nd.net', TIMEOUT = 1500;
  var mode = 'auto', detected = null, checking = false, listeners = [];
  try { mode = localStorage.getItem(KEY) || 'auto'; } catch (e) { /* Standard */ }

  function emit() { listeners.forEach(function (fn) { fn(state()); }); }
  function state() { return { mode: mode, profile: profile(), detected: detected, checking: checking }; }

  /** Tatsächlich genutztes Profil: 'home' oder 'vpn'. */
  function profile() {
    if (mode === 'home' || mode === 'vpn') return mode;
    return detected || 'home';
  }

  /** Adresse einer Verbindung für das aktive Profil; fehlt sie, die jeweils andere. */
  function pick(cfg) {
    if (!cfg) return '';
    var home = cfg.url || '', vpn = cfg.urlVpn || '';
    return (profile() === 'vpn' ? vpn || home : home || vpn).replace(/\/+$/, '');
  }

  /** Tailscale-Adressen liegen in 100.64.0.0/10. */
  function isVpnAddress(url) {
    var m = /^https?:\/\/100\.(\d+)\./.exec(url || '');
    return !!m && +m[1] >= 64 && +m[1] <= 127;
  }

  /** Ältere Einstellungen hatten nur eine Adresse: eine Tailscale-Adresse wandert ins VPN-Feld. */
  function migrate(cfg) {
    if (cfg && cfg.url && !('urlVpn' in cfg) && isVpnAddress(cfg.url)) return Object.assign({}, cfg, { url: '', urlVpn: cfg.url });
    return cfg;
  }

  /** Antwortet unter dieser Adresse irgendetwas? (Anmeldung egal – nur Erreichbarkeit.) */
  function reachable(url, ms) {
    if (!url) return Promise.resolve(false);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || TIMEOUT);
    return fetch(url.replace(/\/+$/, '') + '/', { mode: 'no-cors', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function () { return true; }, function () { return false; })
      .then(function (ok) { clearTimeout(timer); return ok; });
  }

  var sources = []; // function () → Konfiguration (wird von nas.js / services.js registriert)
  function register(getConfig) { sources.push(getConfig); }

  /** Modus „auto“: Zuhause, sobald eine der WLAN-Adressen antwortet. */
  function detect() {
    var homes = sources.map(function (g) { var c = g(); return c && c.url; }).filter(Boolean);
    if (!homes.length) { detected = 'vpn'; emit(); return Promise.resolve(state()); }
    checking = true; emit();
    return Promise.all(homes.map(function (u) { return reachable(u); })).then(function (res) {
      detected = res.some(Boolean) ? 'home' : 'vpn';
      checking = false; emit();
      return state();
    });
  }

  function setMode(m) {
    mode = m;
    try { localStorage.setItem(KEY, m); } catch (e) { /* nur diese Sitzung */ }
    emit();
    if (m === 'auto') detect();
  }

  // Netzwechsel (WLAN an/aus, App wieder im Vordergrund): neu erkennen
  window.addEventListener('online', function () { if (mode === 'auto') detect(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && mode === 'auto') detect(); });

  window.NDNet = {
    mode: function () { return mode; }, setMode: setMode, profile: profile, state: state, pick: pick, migrate: migrate,
    reachable: reachable, register: register, detect: detect, isVpnAddress: isVpnAddress,
    subscribe: function (fn) { listeners.push(fn); return function () { listeners.splice(listeners.indexOf(fn), 1); }; },
    label: function (p) { return p === 'vpn' ? 'VPN (unterwegs)' : 'WLAN (zuhause)'; }
  };
})();
