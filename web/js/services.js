/* nDashboard — Verbindung zum PC-Agenten (tools/pc-agent.py).
 * Zugangsdaten liegen wie beim NAS nur auf diesem Gerät (localStorage). */
(function () {
  function store(key) {
    var current = null;
    try { current = JSON.parse(localStorage.getItem(key)) || null; } catch (e) { /* leer */ }
    return {
      get: function () { return current; },
      set: function (v) { current = v; try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* nur diese Sitzung */ } }
    };
  }
  function ServiceError(status, message) { this.status = status; this.message = message; }

  /* ---------- PC-Agent ---------- */
  var agentCfg = store('nd.agent');
  var Agent = {
    config: agentCfg.get, save: agentCfg.set,
    configured: function () { var c = agentCfg.get(); return !!(c && c.url); },
    get: function (path, params) {
      var c = agentCfg.get();
      if (!c || !c.url) return Promise.reject(new ServiceError(0, 'Kein PC-Agent eingerichtet.'));
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      var headers = c.user ? { Authorization: 'Basic ' + btoa(unescape(encodeURIComponent(c.user + ':' + (c.pass || '')))) } : {};
      return fetch(c.url.replace(/\/+$/, '') + path + qs, { headers: headers, cache: 'no-store' })
        .catch(function () { throw new ServiceError(0, 'PC nicht erreichbar. Läuft pc-agent.py und ist das Gerät im selben Netz? Bei .local-Adressen die IP verwenden.'); })
        .then(function (r) {
          if (r.status === 401) throw new ServiceError(401, 'Anmeldung abgelehnt – Benutzer oder Passwort prüfen.');
          if (!r.ok) throw new ServiceError(r.status, 'Fehler ' + r.status + ' vom PC-Agenten.');
          return r.json();
        });
    }
  };

  window.NDServices = { Agent: Agent };
})();
