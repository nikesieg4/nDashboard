/* nDashboard — Seite „Sensoren“: Live-Werte und Protokoll vom PC-Agenten (tools/pc-agent.py). */
(function () {
  var O = window.Ops, h = React.createElement, Agent = window.NDServices.Agent;
  var CATEGORIES = [{ id: '', label: 'Alle' }, { id: 'file', label: 'Dateien' }, { id: 'crash', label: 'Abstürze' },
    { id: 'session', label: 'Anmeldung' }, { id: 'hardware', label: 'Hardware' }, { id: 'system', label: 'System' }];
  var ICON = { file: 'file', crash: 'alert', session: 'user', hardware: 'temp', system: 'power' };
  var METRICS = [
    { id: 'cpu_temp', label: 'Temperatur', unit: '°C', max: 100 },
    { id: 'cpu', label: 'CPU', unit: '%', max: 100 },
    { id: 'memory', label: 'RAM', unit: '%', max: 100 }
  ];
  var RANGES = [{ id: '60', label: '1 h' }, { id: '1440', label: '24 h' }, { id: '10080', label: '7 T' }];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function when(ts) {
    var d = new Date(ts * 1000), today = new Date();
    var time = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    return d.toDateString() === today.toDateString() ? time : pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '. ' + time.slice(0, 5);
  }
  function duration(sec) {
    var d = Math.floor(sec / 86400), hh = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
    return (d ? d + ' T ' : '') + (d || hh ? hh + ' h ' : '') + m + ' min';
  }
  function bytes(n) {
    var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + ' ' + u[i];
  }
  function tempTone(t) {
    var crit = t.crit || 95;
    return t.value >= crit ? 'danger' : t.value >= Math.min(85, crit - 10) ? 'warn' : 'ok';
  }

  /** Ruft `load` sofort und dann alle `ms` Millisekunden auf, solange die Seite offen ist. */
  function usePoll(load, ms, deps) {
    React.useEffect(function () {
      var alive = true, timer;
      function tick() { load(function () { return alive; }).then(function () { if (alive) timer = setTimeout(tick, ms); }); }
      tick();
      return function () { alive = false; clearTimeout(timer); };
    }, deps);
  }

  /** AreaChart in tatsächlicher Breite zeichnen (sonst wird die 320 px breite Grafik
   *  auf dem Desktop samt Schrift hochskaliert). */
  function FitChart(props) {
    var ref = React.useRef(null), w = React.useState(0);
    React.useEffect(function () {
      var el = ref.current, ro = new ResizeObserver(function () { w[1](Math.round(el.clientWidth)); });
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    return h('div', { ref: ref }, w[0] ? h(O.AreaChart, Object.assign({}, props, { width: w[0] })) : null);
  }

  function NotConfigured() {
    return h(O.Panel, { variant: 'framed', title: 'PC nicht verbunden', icon: 'sensor' },
      h('p', { style: { margin: '0 0 16px', color: 'var(--ink-muted)' } },
        'Starte pc-agent.py auf deinem PC und trage unter Einstellungen die Adresse ein, z. B. http://192.168.1.20:5006.'),
      h(O.Button, { icon: 'settings', onClick: function () { location.hash = '#/settings'; } }, 'PC verbinden'));
  }

  function Chart() {
    var metric = React.useState('cpu_temp'), range = React.useState('60'), data = React.useState(null);
    usePoll(function (alive) {
      return Agent.get('/api/history', { metric: metric[0], minutes: range[0], points: 120 })
        .then(function (d) { if (alive()) data[1](d.points); }, function () { /* Fehler zeigt die Seite schon */ });
    }, 30000, [metric[0], range[0]]);
    var m = METRICS.filter(function (x) { return x.id === metric[0]; })[0];
    var values = (data[0] || []).map(function (p) { return Math.round(p[1] * 10) / 10; });
    var max = Math.max(m.max, Math.ceil(Math.max.apply(null, values.concat([0])) / 10) * 10);
    return h(O.Panel, { variant: 'framed', title: m.label + ' · Verlauf', icon: 'chart' },
      h('div', { className: 'op-row', style: { justifyContent: 'space-between', marginBottom: 12 } },
        h(O.Tabs, { items: METRICS, value: metric[0], onChange: metric[1] }),
        h(O.Tabs, { items: RANGES, value: range[0], onChange: range[1] })),
      values.length > 1 ? h(FitChart, { data: values, min: 0, max: max, height: 160, format: function (v) { return Math.round(v) + (m.unit === '%' ? '%' : '°'); } })
        : h('div', { className: 'hint', style: { padding: 24 } }, data[0] ? 'Noch keine Messwerte – der Agent misst alle 10 Sekunden.' : 'Lade …'));
  }

  function EventList() {
    var cat = React.useState(''), events = React.useState(null), more = React.useState(true), err = React.useState(null);
    usePoll(function (alive) {
      return Agent.get('/api/events', { category: cat[0], limit: 50 }).then(function (d) {
        if (!alive()) return;
        err[1](null);
        // neue Einträge oben einfügen, bereits nachgeladene ältere behalten
        events[1](function (cur) {
          if (!cur || !cur.length) return d.events;
          var newest = cur[0].id, fresh = d.events.filter(function (e) { return e.id > newest; });
          return fresh.concat(cur);
        });
        if (d.events.length < 50) more[1](false);
      }, function (e) { if (alive()) err[1](e.message); });
    }, 10000, [cat[0]]);
    function pick(id) { events[1](null); more[1](true); cat[1](id); }
    function loadMore() {
      var list = events[0];
      Agent.get('/api/events', { category: cat[0], limit: 50, before: list[list.length - 1].id }).then(function (d) {
        events[1](list.concat(d.events));
        if (d.events.length < 50) more[1](false);
      });
    }
    var list = events[0];
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Protokoll', icon: 'news' },
      h(O.Tabs, { items: CATEGORIES, value: cat[0], onChange: pick }),
      err[0] ? h(O.Alert, { tone: 'danger', title: 'Fehler' }, err[0]) : null,
      !list ? h('div', { className: 'hint', style: { padding: 24 } }, 'Lade …')
        : list.length === 0 ? h('div', { className: 'hint', style: { padding: 24 } }, 'Keine Einträge.')
        : h('div', { className: 'event-list' }, list.map(function (e) {
          return h(O.ListItem, { key: e.id, icon: ICON[e.category] || 'grid',
            title: e.level === 'info' ? e.title : h(O.Status, { tone: e.level }, e.title),
            subtitle: e.detail, meta: h('span', { className: 'event-time' }, when(e.ts)) });
        })),
      list && list.length && more[0] ? h('div', { style: { marginTop: 12 } }, h(O.Button, { variant: 'ghost', size: 'sm', onClick: loadMore }, 'Ältere laden')) : null);
  }

  function Sensors() {
    var status = React.useState(null), snap = React.useState(null), err = React.useState(null);
    usePoll(function (alive) {
      return Promise.all([Agent.get('/api/status'), Agent.get('/api/sensors')]).then(function (r) {
        if (!alive()) return;
        status[1](r[0]); snap[1](r[1]); err[1](null);
      }, function (e) { if (alive()) err[1](e.message); });
    }, 10000, []);

    if (!Agent.configured()) return h(NotConfigured);
    if (err[0] && !snap[0]) return h(O.Alert, { tone: 'danger', title: 'PC nicht erreichbar' }, err[0]);
    if (!snap[0]) return h('div', { className: 'hint' }, 'Verbinde mit dem PC …');

    var s = snap[0], st = status[0], mem = s.memory || {};
    var root = (s.disks || []).filter(function (d) { return d.mount === '/'; })[0] || (s.disks || [])[0];
    var crashes = (st.counts_24h || {}).crash || 0;
    return [
      h('div', { key: 'st', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Status, { tone: err[0] ? 'warn' : 'ok' }, (err[0] ? 'Verbindung unterbrochen · ' : 'Verbunden · ') + st.host + ' · ' + st.os),
        h('span', { className: 'op-mono', style: { color: 'var(--ink-faint)', fontSize: 11 } }, 'läuft seit ' + duration(st.uptime))),
      crashes ? h(O.Alert, { key: 'cr', tone: 'danger', title: crashes === 1 ? '1 Absturz in den letzten 24 h' : crashes + ' Abstürze in den letzten 24 h' }, 'Details im Protokoll unter „Abstürze“.') : null,
      !st.journal_full ? h(O.Alert, { key: 'j', tone: 'warn', title: 'An-/Abmeldungen unvollständig' }, 'Der Agent darf das System-Journal nicht lesen. Siehe PC-AGENT.md, Abschnitt „Journal“.') : null,
      h('div', { key: 'tiles', className: 'g2 tiles-desktop' },
        h(O.StatTile, { icon: 'temp', label: 'CPU-Temperatur', value: s.cpu_temp != null ? Math.round(s.cpu_temp) : '–', unit: s.cpu_temp != null ? '°C' : '', level: s.cpu_temp != null ? Math.min(1, s.cpu_temp / 100) : undefined, gaugeHeight: 48 }),
        h(O.StatTile, { label: 'CPU-Last', value: s.cpu != null ? Math.round(s.cpu) : '–', unit: '%', delta: s.load ? 'Last ' + s.load.map(function (l) { return l.toFixed(2); }).join(' / ') : null }),
        h(O.StatTile, { label: 'Arbeitsspeicher', value: mem.percent != null ? Math.round(mem.percent) : '–', unit: '%', delta: mem.total ? bytes(mem.used) + ' / ' + bytes(mem.total) : null }),
        h(O.StatTile, { label: 'Datenträger ' + (root ? root.mount : ''), value: root ? Math.round(root.percent) : '–', unit: '%', delta: root ? bytes(root.total - root.used) + ' frei' : null, deltaTone: root && root.percent >= 90 ? 'warn' : 'neutral' })),
      h(Chart, { key: 'chart' }),
      h(O.Panel, { key: 'hw', variant: 'outlined', mutedCorners: true, title: 'Hardware-Sensoren', icon: 'sensor' },
        s.temps.length + s.fans.length === 0 ? h('p', { style: { margin: 0, color: 'var(--ink-muted)' } }, 'Keine Sensoren gefunden. Unter Fedora hilft oft: sudo dnf install lm_sensors && sudo sensors-detect.') : null,
        s.temps.map(function (t, i) {
          return h(O.ListItem, { key: 't' + i, icon: 'temp', title: t.chip + ' · ' + t.label, subtitle: t.crit ? 'kritisch ab ' + Math.round(t.crit) + ' °C' : null,
            end: h(O.Status, { tone: tempTone(t) }, t.value.toFixed(1) + ' °C') });
        }),
        s.fans.map(function (f, i) {
          return h(O.ListItem, { key: 'f' + i, icon: 'signal', title: f.chip + ' · ' + f.label, end: h(O.Status, { tone: f.rpm > 0 ? 'ok' : 'neutral' }, f.rpm + ' U/min') });
        }),
        s.network ? h(O.ListItem, { key: 'net', icon: 'download', title: 'Netzwerk', end: h('span', { className: 'op-mono' }, '↓ ' + bytes(s.network.rx) + '/s  ↑ ' + bytes(s.network.tx) + '/s') }) : null,
        s.battery ? h(O.ListItem, { key: 'bat', icon: 'power', title: 'Akku', subtitle: s.battery.status, end: h(O.Status, { tone: s.battery.percent < 15 ? 'warn' : 'ok' }, s.battery.percent + ' %') }) : null),
      (s.disks || []).length > 1 ? h(O.Panel, { key: 'disks', variant: 'outlined', mutedCorners: true, title: 'Datenträger', icon: 'folder' },
        h('div', { className: 'op-col', style: { gap: 14 } }, s.disks.map(function (d) {
          return h(O.ProgressBar, { key: d.mount, label: d.mount, value: d.percent / 100, valueText: Math.round(d.percent) + '% · ' + bytes(d.total - d.used) + ' frei', tone: d.percent >= 90 ? 'warn' : undefined });
        }))) : null,
      h(EventList, { key: 'ev' }),
      h('div', { key: 'info', className: 'hint' }, 'Agent ' + st.version + ' · Dateien: ' + (st.files || '–') + ' · Journal: ' + (st.journal || '–'))
    ];
  }

  window.NDMonitor = { Sensors: Sensors, FitChart: FitChart };
})();
