/* nDashboard — Verbindungen zum PC-Agenten (tools/pc-agent.py) und zu Stripe.
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

  /* ---------- Stripe ---------- */
  var stripeCfg = store('nd.stripe');
  var PERMISSION = { '/v1/balance': 'Balance', '/v1/balance_transactions': 'Balance', '/v1/payouts': 'Payouts' };
  function stripeGet(path, params) {
    var c = stripeCfg.get();
    if (!c || !c.key) return Promise.reject(new ServiceError(0, 'Kein Stripe-Schlüssel eingerichtet.'));
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch('https://api.stripe.com' + path + qs, { headers: { Authorization: 'Bearer ' + c.key }, cache: 'no-store' })
      .catch(function () { throw new ServiceError(0, 'Stripe nicht erreichbar – Internetverbindung prüfen.'); })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (r.ok) return body;
          if (r.status === 401) throw new ServiceError(401, 'Stripe-Schlüssel ungültig.');
          if (r.status === 403) throw new ServiceError(403, 'Dem Schlüssel fehlt die Leseberechtigung „' + (PERMISSION[path] || path) + '“.');
          throw new ServiceError(r.status, (body.error && body.error.message) || 'Fehler ' + r.status + ' von Stripe.');
        });
      });
  }
  /** Alle Buchungen seit `since` (Unix-Sekunden), höchstens `max` Stück. */
  function transactions(since, max) {
    var all = [];
    function page(after) {
      var p = { limit: 100, 'created[gte]': since };
      if (after) p.starting_after = after;
      return stripeGet('/v1/balance_transactions', p).then(function (res) {
        all = all.concat(res.data || []);
        if (res.has_more && all.length < (max || 1000)) return page(all[all.length - 1].id);
        return all;
      });
    }
    return page(null);
  }
  var Stripe = {
    config: stripeCfg.get, save: stripeCfg.set,
    configured: function () { var c = stripeCfg.get(); return !!(c && c.key); },
    testMode: function () { var c = stripeCfg.get(); return !!(c && /_test_/.test(c.key)); },
    balance: function () { return stripeGet('/v1/balance'); },
    payouts: function () { return stripeGet('/v1/payouts', { limit: 5 }); },
    transactions: transactions
  };

  /** Geldbetrag aus Stripe (kleinste Einheit, z. B. Cent) formatieren. */
  var ZERO_DECIMAL = ['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'];
  function money(amount, currency, signed) {
    currency = (currency || 'eur').toLowerCase();
    var value = ZERO_DECIMAL.indexOf(currency) >= 0 ? amount : amount / 100;
    var text = new Intl.NumberFormat('de-DE', { style: 'currency', currency: currency.toUpperCase() }).format(Math.abs(value));
    return signed ? (value < 0 ? '− ' : '+ ') + text : (value < 0 ? '− ' + text : text);
  }

  window.NDServices = { Agent: Agent, Stripe: Stripe, money: money };
})();
