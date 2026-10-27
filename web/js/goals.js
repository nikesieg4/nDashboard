/* nDashboard — Seite „Management“: eigene Ziele mit Teilen, Preisen und Erspartem.
 * Beispiel: Ziel „Server“ = RAM 250 € + CPU 20 € = 270 €; 10 € gespart → 10 / 270 € (4 %), es fehlen 260 €.
 * Gespeichert wird als JSON auf dem NAS (/.ndashboard/ziele.json), damit Handy und PC dieselben Ziele
 * sehen; ohne NAS nur auf diesem Gerät. */
(function () {
  var O = window.Ops, h = React.createElement, NAS = window.NAS, Files = window.NDFiles;
  var NAS_FILE = '/.ndashboard/ziele.json', LOCAL_KEY = 'nd.goals';

  /* ---------- Speicher ---------- */
  function empty() { return { version: 1, goals: [] }; }
  function load() {
    if (!NAS.configured()) {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(LOCAL_KEY)) || empty()); } catch (e) { return Promise.resolve(empty()); }
    }
    return NAS.readText(NAS_FILE).then(function (t) { return JSON.parse(t); }, function (e) {
      if (e.status === 404) return empty(); // noch keine Ziele angelegt
      throw e;
    });
  }
  function save(data) {
    var text = JSON.stringify(data, null, 2);
    if (!NAS.configured()) {
      try { localStorage.setItem(LOCAL_KEY, text); } catch (e) { return Promise.reject(new Error('Speichern auf dem Gerät fehlgeschlagen.')); }
      return Promise.resolve();
    }
    return NAS.writeText(NAS_FILE, text).catch(function (e) {
      if (e.status !== 409) throw e; // Ordner fehlt (manche WebDAV-Server legen ihn nicht selbst an)
      return NAS.mkdir('/.ndashboard').catch(function () {}).then(function () { return NAS.writeText(NAS_FILE, text); });
    });
  }

  /** Ziele laden und Änderungen sofort speichern. Liefert [data, update, status]. */
  var shared = { data: null, listeners: [] };
  function useGoals() {
    var st = React.useState(shared.data), status = React.useState(shared.data ? 'ok' : 'loading'), err = React.useState(null);
    React.useEffect(function () {
      shared.listeners.push(st[1]);
      if (!shared.data) {
        load().then(function (d) { shared.data = d; shared.listeners.forEach(function (fn) { fn(d); }); status[1]('ok'); },
          function (e) { err[1](e.message); status[1]('error'); });
      }
      return function () { shared.listeners.splice(shared.listeners.indexOf(st[1]), 1); };
    }, []);
    function update(fn) {
      var next = JSON.parse(JSON.stringify(shared.data));
      fn(next);
      shared.data = next;
      shared.listeners.forEach(function (l) { l(next); });
      status[1]('saving');
      return save(next).then(function () { status[1]('ok'); }, function (e) { status[1]('error'); err[1](e.message); Files.toast(e.message, 'danger'); });
    }
    return [st[0], update, status[0], err[0]];
  }

  /* ---------- Rechnen ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function euro(cents) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100); }
  /** „16,50“, „16.50“, „1.250,00 €“ → Cent. */
  function parseEuro(text) {
    var t = String(text || '').replace(/[€\s]/g, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
    var v = parseFloat(t);
    return isFinite(v) ? Math.round(v * 100) : NaN;
  }
  function stats(goal) {
    var total = 0, bought = 0, open = 0;
    goal.items.forEach(function (i) { total += i.price; if (i.bought) bought += i.price; else open++; });
    var saved = goal.deposits.reduce(function (a, d) { return a + d.amount; }, 0);
    var covered = Math.min(total, bought + saved);
    var r = { total: total, bought: bought, saved: saved, covered: covered, missing: Math.max(0, total - covered), open: open,
      percent: total ? covered / total : 0, done: total > 0 && covered >= total };
    if (goal.deadline && !r.done) {
      var days = Math.ceil((new Date(goal.deadline) - new Date(new Date().toDateString())) / 86400000);
      r.days = days;
      r.perWeek = days > 0 ? Math.ceil(r.missing / Math.max(1, days / 7)) : null;
    }
    return r;
  }
  function pct(v) { return Math.floor(v * 100) + ' %'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fmtDate(iso) { if (!iso) return ''; var p = iso.split('-'); return p[2] + '.' + p[1] + '.' + p[0]; }

  function goalLine(s) {
    return euro(s.covered) + ' / ' + euro(s.total) + (s.done ? ' · erreicht' : ' · fehlt ' + euro(s.missing));
  }
  function deadlineText(goal, s) {
    if (!goal.deadline || s.done) return null;
    if (s.days < 0) return { tone: 'danger', text: 'Zieldatum ' + fmtDate(goal.deadline) + ' überschritten' };
    if (s.days === 0) return { tone: 'warn', text: 'Zieldatum ist heute' };
    return { tone: s.days < 14 ? 'warn' : 'neutral', text: 'noch ' + s.days + ' Tage bis ' + fmtDate(goal.deadline) + ' · ' + euro(s.perWeek) + ' pro Woche sparen' };
  }

  function StoreHint(props) {
    var where = NAS.configured() ? 'Gespeichert auf dem NAS – auf allen Geräten gleich' : 'Nur auf diesem Gerät gespeichert – verbinde das NAS, um Ziele auf Handy und PC zu teilen';
    var tone = props.status === 'error' ? 'danger' : props.status === 'saving' ? 'info' : NAS.configured() ? 'ok' : 'warn';
    return h(O.Status, { tone: tone }, props.status === 'saving' ? 'Speichert …' : props.status === 'error' ? 'Nicht gespeichert' : where);
  }

  /* ---------- Übersicht ---------- */
  function Overview() {
    var g = useGoals(), data = g[0], update = g[1], dialog = React.useState(null);
    if (g[2] === 'loading') return h('div', { className: 'hint' }, 'Lade Ziele …');
    if (!data) return [h(O.Alert, { key: 'e', tone: 'danger', title: 'Ziele konnten nicht geladen werden' }, g[3]),
      h(O.Button, { key: 'r', variant: 'outline', onClick: function () { location.reload(); } }, 'Erneut versuchen')];

    var all = data.goals.map(function (goal) { return { goal: goal, s: stats(goal) }; });
    var active = all.filter(function (x) { return !x.s.done; });
    var sum = function (k, list) { return list.reduce(function (a, x) { return a + x.s[k]; }, 0); };

    function create() {
      dialog[1]({ type: 'prompt', title: 'Neues Ziel', label: 'Name (z. B. Server)', value: '', ok: 'Anlegen', onOk: function (name) {
        if (!name) return;
        var id = uid();
        update(function (d) { d.goals.push({ id: id, name: name, deadline: null, created: today(), items: [], deposits: [] }); })
          .then(function () { location.hash = '#/goal?id=' + id; });
      } });
    }

    return [
      h('div', { key: 'tiles', className: 'g2 tiles-desktop' },
        h(O.StatTile, { label: 'Aktive Ziele', value: active.length, delta: all.length - active.length ? (all.length - active.length) + ' erreicht' : null, deltaTone: 'ok' }),
        h(O.StatTile, { label: 'Gesamtbedarf', value: euro(sum('total', active)) }),
        h(O.StatTile, { label: 'Gedeckt', value: euro(sum('covered', active)), delta: sum('total', active) ? pct(sum('covered', active) / sum('total', active)) : null, deltaTone: 'ok' }),
        h(O.StatTile, { label: 'Fehlt noch', value: euro(sum('missing', active)), deltaTone: 'warn' })),
      h('div', { key: 'tb', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(StoreHint, { status: g[2] }),
        h(O.Button, { icon: 'plus', onClick: create }, 'Neues Ziel')),
      all.length === 0 ? h(O.Panel, { key: 'empty', variant: 'framed', title: 'Noch keine Ziele', icon: 'chart' },
        h('p', { style: { margin: 0, color: 'var(--ink-muted)' } }, 'Lege ein Ziel an, z. B. „Server“, und füge die Teile mit Preisen hinzu. Dann trägst du ein, was du schon gespart hast, und siehst, wie viel noch fehlt.')) : null,
      all.map(function (x) {
        var dl = deadlineText(x.goal, x.s);
        return h(O.Panel, { key: x.goal.id, variant: x.s.done ? 'outlined' : 'framed', mutedCorners: x.s.done, className: 'goal-card' },
          h('button', { type: 'button', className: 'goal-open', onClick: function () { location.hash = '#/goal?id=' + x.goal.id; }, 'aria-label': 'Ziel ' + x.goal.name + ' öffnen' },
            h('div', { className: 'op-row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } },
              h('div', { className: 'goal-title' }, x.goal.name),
              x.s.done ? h(O.Badge, { tone: 'ok' }, 'Erreicht') : h('span', { className: 'goal-pct' }, pct(x.s.percent))),
            h(O.ProgressBar, { label: x.s.open ? x.s.open + (x.s.open === 1 ? ' Teil offen' : ' Teile offen') : (x.goal.items.length ? 'Alle Teile gekauft' : 'Noch keine Teile'),
              value: x.s.percent, valueText: goalLine(x.s) }),
            dl ? h('div', { style: { marginTop: 8 } }, h(O.Status, { tone: dl.tone }, dl.text)) : null));
      }),
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* ---------- Ein Ziel ---------- */
  function AmountForm(props) {
    var a = React.useState(''), b = React.useState(''), err = React.useState(null);
    function submit(e) {
      e.preventDefault();
      var cents = parseEuro(b[0]);
      if (props.needName && !a[0].trim()) return err[1]('Bitte einen Namen eingeben.');
      if (isNaN(cents) || (props.positive && cents <= 0)) return err[1]('Bitte einen gültigen Betrag eingeben, z. B. 250 oder 16,50.');
      props.onSubmit(a[0].trim(), cents);
      a[1](''); b[1](''); err[1](null);
    }
    return h('form', { className: 'amount-form', onSubmit: submit },
      h(O.TextField, { label: props.nameLabel, value: a[0], onChange: function (e) { a[1](e.target.value); }, placeholder: props.namePlaceholder, className: 'amount-name' }),
      h(O.TextField, { label: props.amountLabel, value: b[0], onChange: function (e) { b[1](e.target.value); }, placeholder: props.amountPlaceholder, inputMode: 'decimal', className: 'amount-value' }),
      h(O.Button, { type: 'submit', icon: props.icon || 'plus', 'aria-label': props.submitLabel }, props.submitLabel),
      err[0] ? h('div', { className: 'amount-err' }, h(O.Status, { tone: 'danger' }, err[0])) : null);
  }

  function Detail(props) {
    var g = useGoals(), data = g[0], update = g[1], dialog = React.useState(null);
    if (g[2] === 'loading') return h('div', { className: 'hint' }, 'Lade Ziel …');
    var goal = data && data.goals.filter(function (x) { return x.id === props.id; })[0];
    if (!goal) return [h(O.Alert, { key: 'a', tone: 'warn', title: 'Ziel nicht gefunden' }, 'Vielleicht wurde es auf einem anderen Gerät gelöscht.'),
      h(O.Button, { key: 'b', variant: 'outline', icon: 'back', onClick: function () { location.hash = '#/management'; } }, 'Zur Übersicht')];
    var s = stats(goal), dl = deadlineText(goal, s);
    function change(fn) { return update(function (d) { fn(d.goals.filter(function (x) { return x.id === goal.id; })[0], d); }); }
    function ask(title, label, value, then) { dialog[1]({ type: 'prompt', title: title, label: label, value: value, ok: 'Speichern', onOk: then }); }

    function itemActions(item) {
      dialog[1]({ type: 'actions', title: item.name, actions: [
        { label: item.bought ? 'Als offen markieren' : 'Als gekauft markieren', icon: item.bought ? 'back' : 'plus', run: function () { change(function (gl) { gl.items.forEach(function (i) { if (i.id === item.id) i.bought = !i.bought; }); }); } },
        { label: 'Umbenennen', icon: 'settings', run: function () { ask('Teil umbenennen', 'Name', item.name, function (v) { if (v) change(function (gl) { gl.items.forEach(function (i) { if (i.id === item.id) i.name = v; }); }); }); } },
        { label: 'Preis ändern', icon: 'wallet', run: function () { ask('Preis ändern', 'Preis in €', (item.price / 100).toFixed(2).replace('.', ','), function (v) {
          var c = parseEuro(v); if (!isNaN(c) && c >= 0) change(function (gl) { gl.items.forEach(function (i) { if (i.id === item.id) i.price = c; }); }); else Files.toast('Ungültiger Betrag.', 'danger'); }); } },
        { label: 'Entfernen', icon: 'close', run: function () { change(function (gl) { gl.items = gl.items.filter(function (i) { return i.id !== item.id; }); }); } }] });
    }
    function goalActions() {
      dialog[1]({ type: 'actions', title: goal.name, actions: [
        { label: 'Umbenennen', icon: 'settings', run: function () { ask('Ziel umbenennen', 'Name', goal.name, function (v) { if (v) change(function (gl) { gl.name = v; }); }); } },
        { label: goal.deadline ? 'Zieldatum ändern' : 'Zieldatum setzen', icon: 'chart', run: function () { ask('Zieldatum', 'Datum (TT.MM.JJJJ, leer = keins)', goal.deadline ? fmtDate(goal.deadline) : '', function (v) {
          if (!v) return change(function (gl) { gl.deadline = null; });
          var m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v);
          if (!m) return Files.toast('Datum bitte als TT.MM.JJJJ eingeben.', 'danger');
          change(function (gl) { gl.deadline = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); }); }); } },
        { label: 'Ziel löschen', icon: 'close', run: function () {
          dialog[1]({ type: 'confirm', title: 'Ziel löschen', danger: true, ok: 'Löschen', okIcon: 'close', text: '„' + goal.name + '“ mit allen Teilen und Einzahlungen endgültig löschen?',
            onOk: function () { update(function (d) { d.goals = d.goals.filter(function (x) { return x.id !== goal.id; }); }).then(function () { location.hash = '#/management'; }); } });
        } }] });
    }

    return [
      h(O.Panel, { key: 'sum', variant: 'framed', title: goal.name, icon: 'chart' },
        h('div', { className: 'op-row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } },
          h('div', null, h('div', { className: 'op-label' }, 'Fortschritt'),
            h('div', { className: 'goal-big' }, euro(s.covered), h('span', null, ' / ' + euro(s.total)))),
          h('div', { className: 'goal-pct goal-pct-lg' }, pct(s.percent))),
        h('div', { style: { marginTop: 12 } }, h(O.ProgressBar, { label: s.done ? 'Ziel erreicht' : 'Es fehlen ' + euro(s.missing), value: s.percent, valueText: pct(s.percent), cells: 30 })),
        h('div', { className: 'op-mono', style: { marginTop: 10, color: 'var(--ink-muted)', fontSize: 12 } },
          'Gespart ' + euro(s.saved) + ' + gekauft ' + euro(s.bought) + (s.saved + s.bought > s.total ? ' · ' + euro(s.saved + s.bought - s.total) + ' übrig' : '')),
        dl ? h('div', { style: { marginTop: 8 } }, h(O.Status, { tone: dl.tone }, dl.text)) : null),
      h('div', { key: 'tb', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(StoreHint, { status: g[2] }),
        h(O.Button, { variant: 'ghost', size: 'sm', icon: 'more', onClick: goalActions }, 'Ziel bearbeiten')),

      h(O.Panel, { key: 'items', variant: 'outlined', mutedCorners: true, title: 'Teile · ' + euro(s.total), icon: 'grid' },
        goal.items.length === 0 ? h('p', { style: { margin: '0 0 12px', color: 'var(--ink-muted)' } }, 'Füge hinzu, was du für das Ziel brauchst, z. B. „16 GB RAM“ für 250 €.') : null,
        h('div', { className: 'file-list' }, goal.items.map(function (item) {
          return h('div', { key: item.id, className: 'file-row' + (item.bought ? ' goal-item-done' : '') },
            h('button', { type: 'button', className: 'goal-check', role: 'checkbox', 'aria-checked': item.bought ? 'true' : 'false', 'aria-label': item.name + (item.bought ? ' gekauft' : ' offen'),
              onClick: function () { change(function (gl) { gl.items.forEach(function (i) { if (i.id === item.id) i.bought = !i.bought; }); }); } }, item.bought ? '✓' : ''),
            h(O.ListItem, { title: item.name, subtitle: item.bought ? 'gekauft' : 'fehlt noch', meta: euro(item.price), onClick: function () { itemActions(item); } }));
        })),
        h(AmountForm, { nameLabel: 'Teil', namePlaceholder: 'z. B. 16 GB RAM', amountLabel: 'Preis €', amountPlaceholder: '250', submitLabel: 'Hinzufügen', needName: true,
          onSubmit: function (name, cents) { change(function (gl) { gl.items.push({ id: uid(), name: name, price: Math.max(0, cents), bought: false }); }); } })),

      h(O.Panel, { key: 'dep', variant: 'outlined', mutedCorners: true, title: 'Gespart · ' + euro(s.saved), icon: 'wallet' },
        h(AmountForm, { nameLabel: 'Notiz (optional)', namePlaceholder: 'z. B. Taschengeld', amountLabel: 'Betrag €', amountPlaceholder: '10', submitLabel: 'Eintragen', icon: 'download',
          onSubmit: function (note, cents) { if (cents) change(function (gl) { gl.deposits.unshift({ id: uid(), amount: cents, date: today(), note: note }); }); } }),
        h('div', { className: 'op-field-hint', style: { margin: '6px 0 4px' } }, 'Für eine Entnahme einen negativen Betrag eintragen, z. B. -5.'),
        h('div', { className: 'file-list' }, goal.deposits.map(function (d) {
          return h('div', { key: d.id, className: 'file-row' },
            h(O.ListItem, { icon: d.amount >= 0 ? 'download' : 'upload', title: d.note || (d.amount >= 0 ? 'Einzahlung' : 'Entnahme'), subtitle: fmtDate(d.date),
              meta: h('span', { className: d.amount >= 0 ? 'op-tone-ok' : '' }, (d.amount >= 0 ? '+ ' : '− ') + euro(Math.abs(d.amount))) }),
            h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Eintrag löschen', onClick: function () { change(function (gl) { gl.deposits = gl.deposits.filter(function (x) { return x.id !== d.id; }); }); } }, h(O.Icon, { name: 'close' })));
        }))),
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  window.NDGoals = { Overview: Overview, Detail: Detail, title: function (id) {
    var goal = shared.data && shared.data.goals.filter(function (x) { return x.id === id; })[0];
    return goal ? goal.name : 'Ziel';
  }, _parseEuro: parseEuro, _stats: stats };
})();
