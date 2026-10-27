/* nDashboard — Verbindungen zu den Agenten (tools/pc-agent.py) auf dem PC und auf dem NAS.
 * Zugangsdaten liegen wie beim NAS nur auf diesem Gerät (localStorage). */
(function () {
  function store(key) {
    var current = null;
    try { current = window.NDNet.migrate(JSON.parse(localStorage.getItem(key)) || null); } catch (e) { /* leer */ }
    return {
      get: function () { return current; },
      set: function (v) { current = v; try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* nur diese Sitzung */ } }
    };
  }
  function ServiceError(status, message) { this.status = status; this.message = message; }

  /** Verbindung zu einem Agenten; `name` erscheint in Fehlermeldungen („PC“, „NAS“). */
  function makeAgent(key, name) {
    var cfg = store(key);
    window.NDNet.register(cfg.get);
    function request(path, opts) {
      var c = cfg.get();
      var base = window.NDNet.pick(c);
      if (!base) return Promise.reject(new ServiceError(0, 'Kein Agent für ' + name + ' eingerichtet.'));
      var headers = Object.assign({}, opts.headers || {});
      if (c.user) headers.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(c.user + ':' + (c.pass || ''))));
      return fetch(base + path, { method: opts.method || 'GET', headers: headers, body: opts.body, cache: 'no-store' })
        .catch(function () { throw new ServiceError(0, name + ' nicht erreichbar (' + base + ', Netz: ' + window.NDNet.label(window.NDNet.profile()) + '). Läuft pc-agent.py? Unterwegs: VPN eingeschaltet?'); })
        .then(function (r) {
          if (r.status === 401) throw new ServiceError(401, 'Anmeldung abgelehnt – Benutzer oder Passwort prüfen.');
          return r.json().catch(function () { return {}; }).then(function (body) {
            if (!r.ok) throw new ServiceError(r.status, body.error || 'Fehler ' + r.status + ' vom Agenten (' + name + ').');
            return body;
          });
        });
    }
    return {
      name: name,
      config: cfg.get, save: cfg.set,
      configured: function () { var c = cfg.get(); return !!(c && (c.url || c.urlVpn)); },
      get: function (path, params) { return request(path + (params ? '?' + new URLSearchParams(params).toString() : ''), {}); },
      post: function (path, data) { return request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
    };
  }

  window.NDServices = { Agent: makeAgent('nd.agent', 'PC'), NasAgent: makeAgent('nd.agent.nas', 'NAS') };
})();
