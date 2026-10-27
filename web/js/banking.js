/* nDashboard — Seite „Banking“: Einnahmen und Kontostand aus Stripe (nur lesend). */
(function () {
  var O = window.Ops, h = React.createElement, S = window.NDServices, Stripe = S.Stripe, money = S.money;
  var DAY = 86400;
  var INCOME = ['charge', 'payment'], REFUND = ['refund', 'payment_refund'], PAYOUT = ['payout', 'payout_cancel', 'payout_failure'];
  var TYPE_LABEL = { charge: 'Zahlung', payment: 'Zahlung', refund: 'Rückerstattung', payment_refund: 'Rückerstattung',
    payout: 'Auszahlung', payout_cancel: 'Auszahlung storniert', payout_failure: 'Auszahlung fehlgeschlagen',
    stripe_fee: 'Stripe-Gebühr', adjustment: 'Korrektur', dispute: 'Rückbuchung', application_fee: 'Plattformgebühr', topup: 'Aufladung' };
  var TYPE_ICON = { charge: 'download', payment: 'download', refund: 'back', payment_refund: 'back', payout: 'bank', stripe_fee: 'card', dispute: 'alert' };
  var TABS = [{ id: 'all', label: 'Alle' }, { id: 'income', label: 'Einnahmen' }, { id: 'refund', label: 'Rückerstattungen' }, { id: 'payout', label: 'Auszahlungen' }];
  var PAYOUT_STATUS = { paid: 'ausgezahlt', pending: 'ausstehend', in_transit: 'unterwegs', canceled: 'storniert', failed: 'fehlgeschlagen' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function date(ts) { var d = new Date(ts * 1000); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function inGroup(t, group) { return group.indexOf(t.type) >= 0; }

  /** Kennzahlen für einen Zeitraum [from, to). */
  function summarize(txs, from, to) {
    var r = { income: 0, count: 0, fees: 0, refunds: 0, net: 0 };
    txs.forEach(function (t) {
      if (t.created < from || t.created >= to) return;
      if (inGroup(t, INCOME)) { r.income += t.amount; r.count++; r.fees += t.fee; r.net += t.net; }
      else if (inGroup(t, REFUND)) { r.refunds += -t.amount; r.net += t.net; }
      else if (t.type === 'stripe_fee') { r.fees += -t.amount; r.net += t.net; }
    });
    return r;
  }
  /** Netto-Einnahmen pro Tag der letzten `days` Tage (für das Diagramm). */
  function daily(txs, days) {
    var start = Math.floor(Date.now() / 1000 / DAY) * DAY - (days - 1) * DAY, out = [];
    for (var i = 0; i < days; i++) out.push(0);
    txs.forEach(function (t) {
      var i = Math.floor((t.created - start) / DAY);
      if (i >= 0 && i < days && (inGroup(t, INCOME) || inGroup(t, REFUND))) out[i] += t.net;
    });
    return out;
  }
  function delta(cur, prev) {
    if (!prev) return cur ? 'neu in diesem Zeitraum' : null;
    var p = Math.round(100 * (cur - prev) / Math.abs(prev));
    return (p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + ' % ggü. Vorperiode';
  }

  function NotConfigured() {
    return h(O.Panel, { variant: 'framed', title: 'Stripe nicht verbunden', icon: 'bank' },
      h('p', { style: { margin: '0 0 16px', color: 'var(--ink-muted)' } },
        'Lege in Stripe einen eingeschränkten Schlüssel nur mit Leserechten an (Balance, Payouts) und trage ihn unter Einstellungen ein.'),
      h(O.Button, { icon: 'settings', onClick: function () { location.hash = '#/settings'; } }, 'Stripe verbinden'));
  }

  function Banking() {
    var data = React.useState(null), err = React.useState(null), busy = React.useState(false), tab = React.useState('all'), days = React.useState(30);

    function load() {
      busy[1](true);
      var since = Math.floor(Date.now() / 1000) - 2 * days[0] * DAY; // doppelter Zeitraum für den Vergleich
      return Promise.all([Stripe.balance(), Stripe.transactions(since, 2000), Stripe.payouts().catch(function () { return { data: [] }; })])
        .then(function (r) { data[1]({ balance: r[0], txs: r[1], payouts: r[2].data || [] }); err[1](null); },
          function (e) { err[1](e.message); })
        .then(function () { busy[1](false); });
    }
    React.useEffect(function () { if (Stripe.configured()) load(); }, [days[0]]);

    if (!Stripe.configured()) return h(NotConfigured);
    if (err[0] && !data[0]) return [h(O.Alert, { key: 'e', tone: 'danger', title: 'Stripe' }, err[0]),
      h(O.Button, { key: 'r', variant: 'outline', icon: 'signal', onClick: load }, 'Erneut versuchen')];
    if (!data[0]) return h('div', { className: 'hint' }, 'Lade Daten von Stripe …');

    var d = data[0], nowTs = Math.floor(Date.now() / 1000), span = days[0] * DAY;
    var cur = summarize(d.txs, nowTs - span, nowTs + 1), prev = summarize(d.txs, nowTs - 2 * span, nowTs - span);
    var currency = (d.balance.available[0] || {}).currency || 'eur';
    var sum = function (list) { return list.filter(function (b) { return b.currency === currency; }).reduce(function (a, b) { return a + b.amount; }, 0); };
    var chart = daily(d.txs, days[0]);
    var nextPayout = d.payouts.filter(function (p) { return p.status === 'pending' || p.status === 'in_transit'; })[0];
    var lastPayout = d.payouts.filter(function (p) { return p.status === 'paid'; })[0];
    var list = d.txs.filter(function (t) {
      return t.created >= nowTs - span && (tab[0] === 'all' || (tab[0] === 'income' && inGroup(t, INCOME)) || (tab[0] === 'refund' && inGroup(t, REFUND)) || (tab[0] === 'payout' && inGroup(t, PAYOUT)));
    });

    return [
      h('div', { key: 'tb', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Tabs, { items: [{ id: 7, label: '7 T' }, { id: 30, label: '30 T' }, { id: 90, label: '90 T' }], value: days[0], onChange: days[1] }),
        h('div', { className: 'op-row' },
          Stripe.testMode() ? h(O.Badge, { tone: 'warn' }, 'Testmodus') : null,
          h(O.Button, { variant: 'ghost', size: 'sm', icon: 'signal', disabled: busy[0], onClick: load }, busy[0] ? 'Lädt …' : 'Aktualisieren'))),
      err[0] ? h(O.Alert, { key: 'err', tone: 'danger', title: 'Aktualisieren fehlgeschlagen' }, err[0]) : null,
      h(O.Panel, { key: 'bal', variant: 'framed' },
        h('div', { className: 'op-label' }, 'Verfügbar bei Stripe'),
        h('div', { style: { fontSize: 36, lineHeight: '40px', fontWeight: 500, marginTop: 4 } }, money(sum(d.balance.available), currency)),
        h('div', { className: 'op-mono', style: { fontSize: 12, marginTop: 4, color: 'var(--ink-muted)' } }, 'Ausstehend: ' + money(sum(d.balance.pending), currency)),
        h('div', { className: 'op-label', style: { marginTop: 16 } }, 'Netto-Einnahmen pro Tag · ' + days[0] + ' Tage'),
        h('div', { style: { marginTop: 8 } }, h(window.NDMonitor.FitChart, { data: chart.map(function (c) { return c / 100; }), min: Math.min(0, Math.min.apply(null, chart) / 100), max: Math.max(10, Math.max.apply(null, chart) / 100 * 1.15), height: 110,
          format: function (v) { return Math.round(v) + ''; } }))),
      h('div', { key: 'tiles', className: 'g2 tiles-desktop' },
        h(O.StatTile, { label: 'Einnahmen', value: money(cur.income, currency), delta: delta(cur.income, prev.income), deltaTone: cur.income >= prev.income ? 'ok' : 'warn' }),
        h(O.StatTile, { label: 'Netto', value: money(cur.net, currency), delta: 'nach Gebühren und Erstattungen' }),
        h(O.StatTile, { label: 'Zahlungen', value: cur.count, delta: delta(cur.count, prev.count), deltaTone: cur.count >= prev.count ? 'ok' : 'warn' }),
        h(O.StatTile, { label: 'Gebühren', value: money(cur.fees, currency), delta: cur.refunds ? 'Erstattet: ' + money(cur.refunds, currency) : 'keine Erstattungen' })),
      h(O.Panel, { key: 'po', variant: 'outlined', mutedCorners: true, title: 'Auszahlungen', icon: 'bank' },
        h(O.InfoList, { items: [
          { label: 'Nächste Auszahlung', value: nextPayout ? money(nextPayout.amount, nextPayout.currency) + ' · ' + date(nextPayout.arrival_date) + ' (' + PAYOUT_STATUS[nextPayout.status] + ')' : 'keine geplant' },
          { label: 'Letzte Auszahlung', value: lastPayout ? money(lastPayout.amount, lastPayout.currency) + ' · ' + date(lastPayout.arrival_date) : '–' }] })),
      h(O.Tabs, { key: 'tabs', items: TABS, value: tab[0], onChange: tab[1] }),
      h('div', { key: 'list' },
        list.length === 0 ? h('div', { className: 'hint', style: { padding: 24 } }, 'Keine Buchungen in diesem Zeitraum.') : null,
        list.slice(0, 200).map(function (t) {
          var income = inGroup(t, INCOME);
          return h(O.ListItem, { key: t.id, icon: TYPE_ICON[t.type] || 'wallet', title: t.description || TYPE_LABEL[t.type] || t.type,
            subtitle: date(t.created) + ' · ' + (TYPE_LABEL[t.type] || t.type) + (t.fee ? ' · Gebühr ' + money(t.fee, t.currency) : ''),
            meta: h('span', { className: income ? 'op-tone-ok' : '' }, money(t.amount, t.currency, true)) });
        }))
    ];
  }

  window.NDBanking = { Banking: Banking, _summarize: summarize };
})();
