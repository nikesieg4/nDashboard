/* nDashboard — Management → Spiel: Codes-Admin des Disponenten-Simulators.
 * Übernommen aus nikesieg4/Disponenten-Simulator-Admin (admin.js). Spricht nur mit den admin_*-Funktionen
 * in Supabase; alle Prüfungen passieren auf dem Server. Kommen im Spiel neue Ausbildungen oder
 * Erweiterungen dazu, die Listen unten (wie in admin.js) ergänzen. */
(function () {
  var O = window.Ops, h = React.createElement, A = window.NDAuth, Files = window.NDFiles, U = window.NDUi;
  var Select = U.Select, options = U.options, Check = U.Check, Modal = U.Modal;
  var COURSES = [['el-c', 'Einsatzleiter C-Dienst'], ['el-b', 'Einsatzleiter B-Dienst'], ['el-a', 'Einsatzleiter A-Dienst'], ['Fernmeldung', 'Fernmeldedienst'], ['wechsellader', 'Wechsellader'],
    ['gefahrgut', 'Gefahrgut'], ['dekonp', 'Dekontamination (Dekon-P)'], ['hoehenrettung', 'Höhenrettung'], ['kran', 'Feuerwehrkran'], ['wasserrettung', 'Wasserrettung'], ['taucher', 'Feuerwehrtaucher'],
    ['notarzt', 'Notarzt'], ['intensiv', 'Intensivpflege'], ['verpflegungseinheit', 'Führer Verpflegungseinheit'], ['verpflegungshelfer', 'Verpflegungshelfer'], ['stemo', 'STEMO-Neurologie'],
    ['mtra', 'Radiologie-Assistenz (MTRA)'], ['lna', 'Leitender Notarzt']];
  var BUILDINGS = [['fire', 'Feuerwache'], ['academy', 'Feuerwehr-Akademie'], ['leitstelle', 'Leitstelle']];
  var EXTENSIONS = [['Feuerwache', [['rw', 'Rettungswache'], ['wlf', 'Wechsellader-Stützpunkt'], ['wasser', 'Wasserrettung'], ['hoehe', 'Höhenrettung'], ['gefahr', 'Gefahrgut'], ['ruhe', 'Ruheräume'], ['uebung', 'Übungsplatz']]],
    ['Akademie', [['saal', 'Lehrsaal'], ['sim', 'Simulationszentrum'], ['hof', 'Übungshof']]], ['Leitstelle', [['ct', 'Calltaker-Platz'], ['tna', 'Telenotarzt-Arbeitsplatz']]]];
  var REWARDS = [['money', 'Geld'], ['staff', 'Personal'], ['building', 'Gebäude-Gutschein'], ['extension', 'Erweiterungs-Gutschein']];
  var GRANT = { ep: { label: 'Einsatzpunkte (EP)', unit: 'EP', max: 100000 }, rp: { label: 'Forschungspunkte (RP)', unit: 'RP', max: 100000 }, premium: { label: 'Premium (Tage)', unit: 'Tage Premium', max: 3650 } };

  function name(list, id) { return (list.filter(function (x) { return x[0] === id; })[0] || [id, id])[1]; }
  function extName(id) { for (var i = 0; i < EXTENSIONS.length; i++) { var n = name(EXTENSIONS[i][1], id); if (n !== id) return n; } return id; }
  function fmt(n) { return Math.round(n).toLocaleString('de-DE'); }
  function fmtDate(t) { return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(t)); }
  function toLocal(iso) { if (!iso) return ''; var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
  function future(t) { return !!t && new Date(t).getTime() > Date.now(); }

  function rewardText(r) {
    if (r.type === 'money') return fmt(r.amount) + ' €';
    if (r.type === 'staff') return r.count + ' Personal' + (r.qual ? ' · ' + name(COURSES, r.qual) : '');
    if (r.type === 'building') return r.count + '× ' + name(BUILDINGS, r.building);
    if (r.type === 'extension') return r.count + '× ' + extName(r.ext);
    return r.type;
  }
  function codeStatus(c) {
    if (!c.active) return ['deaktiviert', 'neutral'];
    if (c.expires_at && !future(c.expires_at)) return ['abgelaufen', 'neutral'];
    if (c.max_uses && c.uses >= c.max_uses) return ['aufgebraucht', 'neutral'];
    return ['aktiv', 'ok'];
  }

  /* ---------- Code bearbeiten ---------- */
  function newReward(type) {
    if (type === 'money') return { type: type, amount: 100000 };
    if (type === 'staff') return { type: type, count: 5, qual: '' };
    if (type === 'building') return { type: type, building: 'fire', count: 1 };
    return { type: type, ext: 'rw', count: 1 };
  }
  function RewardRow(p) {
    var r = p.reward;
    function set(k, v) { var n = Object.assign({}, r); n[k] = v; p.onChange(n); }
    function num(label, k, min, max) {
      return h(O.TextField, { label: label, type: 'number', min: min, max: max, step: 1, value: r[k], required: true, onChange: function (e) { set(k, e.target.value === '' ? '' : Number(e.target.value)); } });
    }
    var fields = r.type === 'money' ? [num('Betrag (€)', 'amount', 1, 100000000)]
      : r.type === 'staff' ? [num('Anzahl', 'count', 1, 50), h(Select, { key: 'q', label: 'Ausbildung', value: r.qual || '', onChange: function (v) { set('qual', v); } }, h('option', { value: '' }, 'ohne'), options(COURSES))]
      : r.type === 'building' ? [h(Select, { key: 'b', label: 'Gebäude', value: r.building, onChange: function (v) { set('building', v); } }, options(BUILDINGS)), num('Anzahl', 'count', 1, 5)]
      : [h(Select, { key: 'e', label: 'Erweiterung', value: r.ext, onChange: function (v) { set('ext', v); } },
        EXTENSIONS.map(function (g) { return h('optgroup', { key: g[0], label: g[0] }, options(g[1])); })), num('Anzahl', 'count', 1, 10)];
    return h('div', { className: 'reward' },
      h('div', { className: 'op-row', style: { justifyContent: 'space-between' } }, h('span', { className: 'op-label', style: { color: 'var(--signal)' } }, name(REWARDS, r.type)),
        h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Belohnung entfernen', onClick: p.onRemove }, h(O.Icon, { name: 'close' }))),
      h('div', { className: 'g2' }, fields.map(function (f, i) { return h(React.Fragment, { key: i }, f); })));
  }

  function CodeForm(p) {
    var c = p.code;
    var f = React.useState(c ? { code: c.code, note: c.note || '', exp: toLocal(c.expires_at), max: c.max_uses || '', newDays: c.new_days || '', active: c.active, premium: !!c.premium_only, rewards: c.rewards.slice() }
      : { code: '', note: '', exp: '', max: '', newDays: '', active: true, premium: false, rewards: [newReward('money')] });
    var err = React.useState(null), busy = React.useState(false), v = f[0];
    function set(k, val) { var n = Object.assign({}, v); n[k] = val; f[1](n); }
    function random() {
      var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint32Array(8); crypto.getRandomValues(b);
      set('code', Array.prototype.map.call(b, function (x) { return a[x % a.length]; }).join(''));
    }
    function submit(e) {
      e.preventDefault(); err[1](null);
      var code = v.code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return err[1]('Code: 3–32 Zeichen, nur Buchstaben, Ziffern, _ und -.');
      if (!v.rewards.length) return err[1]('Mindestens eine Belohnung hinzufügen.');
      if (!c && p.codes.some(function (x) { return x.code === code; })) return err[1]('Code ' + code + ' gibt es schon – in der Liste auf „Bearbeiten“ tippen.');
      var payload = { code: code, note: v.note.trim(), expires_at: v.exp ? new Date(v.exp).toISOString() : '', max_uses: Number(v.max) || 0, new_days: Number(v.newDays) || 0,
        active: v.active, premium_only: v.premium, rewards: v.rewards.map(function (r) { var o = Object.assign({}, r); ['amount', 'count'].forEach(function (k) { if (k in o) o[k] = Number(o[k]); }); return o; }) };
      busy[1](true);
      A.gameRpc('admin_code_save', { p: payload }).then(function (r) {
        busy[1](false);
        if (!r || r.error) return err[1]((r && r.error) || 'Fehler');
        Files.toast('Code ' + r.code + ' gespeichert'); p.onDone();
      }, function (e2) { busy[1](false); err[1](e2.message); });
    }
    return h(O.Panel, { variant: 'framed', title: c ? 'Code ' + c.code + ' bearbeiten' : 'Neuer Code', icon: 'plus' },
      h('form', { className: 'op-col', style: { gap: 14 }, onSubmit: submit, autoComplete: 'off' },
        h('div', { className: 'code-row' },
          h(O.TextField, { label: 'Code', value: v.code, disabled: !!c, maxLength: 32, placeholder: 'SOMMER25', spellCheck: false, onChange: function (e) { set('code', e.target.value); } }),
          c ? null : h(O.Button, { variant: 'ghost', onClick: random }, 'Zufällig')),
        h(O.TextField, { label: 'Notiz (nur für dich)', value: v.note, maxLength: 200, placeholder: 'z. B. Instagram-Post 24.10.', onChange: function (e) { set('note', e.target.value); } }),
        h('div', { className: 'g2' },
          h(O.TextField, { label: 'Läuft ab (leer = permanent)', type: 'datetime-local', value: v.exp, onChange: function (e) { set('exp', e.target.value); } }),
          h(O.TextField, { label: 'Max. Spieler (leer = alle)', type: 'number', min: 1, step: 1, value: v.max, placeholder: 'alle', onChange: function (e) { set('max', e.target.value); } }),
          h(O.TextField, { label: 'Nur Konten jünger als … Tage', type: 'number', min: 1, step: 1, value: v.newDays, placeholder: 'alle', onChange: function (e) { set('newDays', e.target.value); } })),
        h('div', { className: 'op-row' }, h(Check, { label: 'Aktiv', checked: v.active, onChange: function (x) { set('active', x); } }),
          h(Check, { label: 'Nur Premium', checked: v.premium, onChange: function (x) { set('premium', x); } })),
        h('div', { className: 'op-field-hint' }, 'Jeder Spieler kann einen Code genau einmal einlösen. „Max. Spieler“ begrenzt, wie viele ihn insgesamt einlösen können, z. B. 100 = die ersten 100.'),
        h('div', { className: 'op-label', style: { marginTop: 6 } }, 'Belohnungen'),
        v.rewards.map(function (r, i) {
          return h(RewardRow, { key: i, reward: r, onChange: function (n) { set('rewards', v.rewards.map(function (x, j) { return j === i ? n : x; })); },
            onRemove: function () { set('rewards', v.rewards.filter(function (x, j) { return j !== i; })); } });
        }),
        h('div', { className: 'g2' }, REWARDS.map(function (t) {
          return h(O.Button, { key: t[0], variant: 'ghost', size: 'sm', icon: 'plus', onClick: function () { set('rewards', v.rewards.concat([newReward(t[0])])); } }, t[1]);
        })),
        h('div', { className: 'op-row', style: { justifyContent: 'flex-end' } },
          h(O.Button, { variant: 'ghost', onClick: p.onCancel }, 'Abbrechen'),
          h(O.Button, { type: 'submit', disabled: busy[0] }, c ? 'Änderungen speichern' : 'Code speichern')),
        err[0] ? h(O.Status, { tone: 'danger' }, err[0]) : null));
  }

  /* ---------- Codes ---------- */
  function Codes() {
    var list = React.useState(null), err = React.useState(null), editing = React.useState(null), dialog = React.useState(null), who = React.useState(null);
    function load() {
      A.gameRpc('admin_codes').then(function (r) { list[1]((r && r.codes) || []); err[1](null); }, function (e) { err[1](e.message); });
    }
    React.useEffect(load, []);
    if (editing[0]) return h(CodeForm, { code: editing[0] === 'new' ? null : editing[0], codes: list[0] || [], onCancel: function () { editing[1](null); }, onDone: function () { editing[1](null); load(); } });

    function act(c, a) {
      if (a === 'toggle') return A.gameRpc('admin_code_active', { p_code: c.code, p_active: !c.active }).then(function () { Files.toast(c.code + (c.active ? ' deaktiviert' : ' aktiviert')); load(); }, function (e) { Files.toast(e.message, 'danger'); });
      if (a === 'who') return A.gameRpc('admin_code_redemptions', { p_code: c.code }).then(function (r) { who[1]({ code: c.code, list: (r && r.list) || [] }); }, function (e) { Files.toast(e.message, 'danger'); });
      if (a === 'del') dialog[1]({ type: 'confirm', title: 'Code löschen', danger: true, ok: 'Löschen', okIcon: 'close', text: 'Code ' + c.code + ' endgültig löschen? Die Liste der Einlösungen geht verloren.',
        onOk: function () { A.gameRpc('admin_code_delete', { p_code: c.code }).then(function () { Files.toast(c.code + ' gelöscht'); load(); }, function (e) { Files.toast(e.message, 'danger'); }); } });
    }
    var codes = list[0] || [];
    return [
      h('div', { key: 'tb', className: 'op-row', style: { justifyContent: 'space-between' } },
        h('span', { className: 'op-label' }, list[0] ? codes.length + ' Codes' : 'Lade Codes …'),
        h('div', { className: 'op-row' }, h(O.Button, { variant: 'ghost', size: 'sm', icon: 'signal', onClick: load }, 'Aktualisieren'),
          h(O.Button, { icon: 'plus', onClick: function () { editing[1]('new'); } }, 'Neuer Code'))),
      err[0] ? h(O.Alert, { key: 'e', tone: 'danger', title: 'Codes konnten nicht geladen werden' }, err[0]) : null,
      list[0] && !codes.length ? h('div', { key: 'n', className: 'hint' }, 'Noch keine Codes.') : null,
      codes.map(function (c) {
        var s = codeStatus(c);
        return h(O.Panel, { key: c.code, variant: s[1] === 'ok' ? 'framed' : 'outlined', mutedCorners: s[1] !== 'ok' },
          h('div', { className: 'op-row', style: { justifyContent: 'space-between' } },
            h('b', { className: 'op-mono', style: { fontSize: 16 } }, c.code),
            h('div', { className: 'op-row', style: { gap: 6 } }, h(O.Badge, { tone: s[1] }, s[0]), c.premium_only ? h(O.Badge, { tone: 'signal' }, 'Premium') : null)),
          c.note ? h('div', { className: 'op-field-hint', style: { marginTop: 4 } }, c.note) : null,
          h(O.InfoList, { className: 'code-info', items: [
            { label: 'Belohnungen', value: c.rewards.map(rewardText).join(' · ') },
            { label: 'Gültig', value: (c.expires_at ? 'bis ' + fmtDate(c.expires_at) : 'permanent') + (c.new_days ? ' · Konten < ' + c.new_days + ' Tage' : '') },
            { label: 'Spieler', value: c.uses + (c.max_uses ? ' / ' + c.max_uses : '') }] }),
          h('div', { className: 'control-actions' },
            h(O.Button, { variant: 'outline', size: 'sm', onClick: function () { editing[1](c); } }, 'Bearbeiten'),
            h(O.Button, { variant: 'ghost', size: 'sm', onClick: function () { act(c, 'toggle'); } }, c.active ? 'Deaktivieren' : 'Aktivieren'),
            h(O.Button, { variant: 'ghost', size: 'sm', icon: 'user', onClick: function () { act(c, 'who'); } }, 'Wer?'),
            h(O.Button, { variant: 'danger', size: 'sm', onClick: function () { act(c, 'del'); } }, 'Löschen')));
      }),
      who[0] ? h(Modal, { key: 'w', title: 'Eingelöst: ' + who[0].code + ' (' + who[0].list.length + ')', onClose: function () { who[1](null); } },
        who[0].list.length ? h('div', { className: 'file-list' }, who[0].list.map(function (x, i) { return h(O.ListItem, { key: i, icon: 'user', title: x.name, meta: fmtDate(x.at) }); }))
          : h('p', { className: 'hint' }, 'Noch niemand.')) : null,
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* ---------- Schenken ---------- */
  function Gift() {
    var f = React.useState({ user: '', kind: 'ep', amount: '', note: '' }), dialog = React.useState(null), v = f[0], g = GRANT[v.kind];
    function set(k, val) { var n = Object.assign({}, v); n[k] = val; f[1](n); }
    function submit(e) {
      e.preventDefault();
      var user = v.user.trim(), amount = Math.trunc(Number(v.amount));
      if (!user || !amount) return Files.toast('Spieler und Anzahl eintragen.', 'danger');
      if (Math.abs(amount) > g.max) return Files.toast('Höchstens ' + fmt(g.max) + ' ' + g.unit + '.', 'danger');
      dialog[1]({ type: 'confirm', title: 'Schenken', ok: amount > 0 ? 'Schenken' : 'Abziehen', danger: amount < 0, text: user + ': ' + Math.abs(amount) + ' ' + g.unit + (amount > 0 ? ' schenken?' : ' abziehen?'),
        onOk: function () {
          A.gameRpc('admin_grant', { p_username: user, p_kind: v.kind, p_amount: amount, p_note: v.note.trim() }).then(function (r) {
            if (!r || r.error) return Files.toast((r && r.error) || 'Fehler', 'danger');
            Files.toast(user + ': ' + (v.kind === 'ep' ? r.ep + ' EP' : v.kind === 'rp' ? r.rp + ' RP' : future(r.premium_until) ? 'Premium bis ' + fmtDate(r.premium_until) : 'kein Premium mehr'));
            f[1]({ user: '', kind: v.kind, amount: '', note: '' });
          }, function (e2) { Files.toast(e2.message, 'danger'); });
        } });
    }
    return [
      h(O.Panel, { key: 'f', variant: 'framed', title: 'Schenken', icon: 'wallet' },
        h('p', { style: { margin: '0 0 12px', color: 'var(--ink-muted)' } }, 'Einsatzpunkte, Forschungspunkte oder Premium-Tage an einen Spieler. Negative Werte ziehen ab (nie unter 0, Premium endet höchstens sofort). Geschenkte Premium-Tage kosten keine EP und werden an eine laufende Laufzeit angehängt.'),
        h('form', { className: 'op-col', style: { gap: 14 }, onSubmit: submit, autoComplete: 'off' },
          h(O.TextField, { label: 'Spieler', value: v.user, maxLength: 30, spellCheck: false, onChange: function (e) { set('user', e.target.value); } }),
          h('div', { className: 'g2' },
            h(Select, { label: 'Was', value: v.kind, onChange: function (x) { set('kind', x); } }, Object.keys(GRANT).map(function (k) { return h('option', { key: k, value: k }, GRANT[k].label); })),
            h(O.TextField, { label: v.kind === 'premium' ? 'Tage (±)' : 'Anzahl (±)', type: 'number', step: 1, min: -g.max, max: g.max, value: v.amount, onChange: function (e) { set('amount', e.target.value); } })),
          h(O.TextField, { label: 'Notiz', value: v.note, maxLength: 200, placeholder: 'z. B. Gewinnspiel, Entschädigung', onChange: function (e) { set('note', e.target.value); } }),
          h('div', { className: 'op-row' }, h(O.Button, { type: 'submit', icon: 'send' }, 'Schenken')))),
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* ---------- Premium & Discord ---------- */
  function Premium() {
    var list = React.useState(null), err = React.useState(null);
    function load() { A.gameRpc('admin_premium_list').then(function (r) { list[1]((r && r.list) || []); err[1](null); }, function (e) { err[1](e.message); }); }
    React.useEffect(load, []);
    var rows = list[0] || [];
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Premium & Discord', icon: 'user' },
      h('div', { className: 'op-row', style: { justifyContent: 'space-between', marginBottom: 8 } },
        h('span', { className: 'op-field-hint' }, 'Alle Spieler mit EP, RP, Premium oder Discord-ID. Aktives Premium + Discord-ID = Rolle VIP (bis der Bot kommt: von Hand).'),
        h(O.Button, { variant: 'ghost', size: 'sm', icon: 'signal', onClick: load }, 'Aktualisieren')),
      err[0] ? h(O.Status, { tone: 'danger' }, err[0]) : null,
      !list[0] && !err[0] ? h('div', { className: 'hint' }, 'Lade …') : null,
      list[0] && !rows.length ? h('div', { className: 'hint' }, 'Noch niemand.') : null,
      h('div', { className: 'file-list' }, rows.map(function (x) {
        var on = future(x.premium_until);
        return h(O.ListItem, { key: x.name, icon: 'user', title: x.name,
          subtitle: x.ep + ' EP · ' + (x.rp || 0) + ' RP' + (x.discord_id ? ' · Discord ' + x.discord_id : '') + (on && !x.auto ? ' · keine Verlängerung' : ''),
          end: h('span', { className: 'op-row', style: { gap: 6, flexWrap: 'nowrap' } },
            on ? h(O.Badge, { tone: 'ok' }, 'bis ' + fmtDate(x.premium_until)) : x.premium_until ? h(O.Badge, { tone: 'neutral' }, 'abgelaufen') : null,
            on && x.discord_id ? h(O.Badge, { tone: 'signal' }, 'VIP') : null) });
      })));
  }

  /* ---------- Seite ---------- */
  function Page() {
    var a = A.useAuth(), tab = React.useState('codes');
    if (!a.game) return h(A.SignIn, { system: 'game', title: 'Disponenten-Simulator' });
    return [
      h('div', { key: 's', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Status, { tone: 'ok' }, 'Codes-Admin · angemeldet bis ' + fmtDate(a.game.expires)),
        h(O.Button, { variant: 'ghost', size: 'sm', icon: 'lock', onClick: A.logoutGame }, 'Abmelden')),
      h(O.Tabs, { key: 't', items: [{ id: 'codes', label: 'Codes' }, { id: 'gift', label: 'Schenken' }, { id: 'premium', label: 'Premium' }], value: tab[0], onChange: tab[1] }),
      h(tab[0] === 'codes' ? Codes : tab[0] === 'gift' ? Gift : Premium, { key: tab[0] })
    ];
  }

  window.NDGame = { Page: Page, _rewardText: rewardText };
})();
