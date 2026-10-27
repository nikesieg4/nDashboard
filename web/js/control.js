/* nDashboard — Seite „Steuereinheit“: PC und NAS neu starten, herunterfahren, in den Ruhezustand schicken.
 * Nur die festen Aktionen, die der Agent (tools/pc-agent.py --allow-control) anbietet – jede mit Rückfrage. */
(function () {
  var O = window.Ops, h = React.createElement, S = window.NDServices, Files = window.NDFiles;
  var DEVICES = [
    { id: 'pc', title: 'PC', icon: 'grid', agent: S.Agent },
    { id: 'nas', title: 'NAS', icon: 'folder', agent: S.NasAgent }
  ];
  var ACTIONS = [
    { id: 'reboot', label: 'Neustart', icon: 'power', variant: 'outline', verb: 'neu starten' },
    { id: 'poweroff', label: 'Herunterfahren', icon: 'power', variant: 'danger', verb: 'herunterfahren',
      warn: 'Danach ist das Gerät aus und lässt sich aus der App nicht wieder einschalten.' },
    { id: 'suspend', label: 'Ruhezustand', icon: 'lock', variant: 'ghost', verb: 'in den Ruhezustand schicken',
      warn: 'Im Ruhezustand ist das Gerät nicht erreichbar, bis es geweckt wird.' }
  ];

  function duration(sec) {
    var d = Math.floor(sec / 86400), hh = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
    return (d ? d + ' T ' : '') + (d || hh ? hh + ' h ' : '') + m + ' min';
  }

  function Device(props) {
    var dev = props.device, agent = dev.agent;
    var st = React.useState(null), err = React.useState(null), pending = React.useState(null), dialog = React.useState(null);

    React.useEffect(function () {
      if (!agent.configured()) return;
      var alive = true, timer;
      function tick() {
        Promise.all([agent.get('/api/status'), agent.get('/api/sensors').catch(function () { return null; })]).then(function (r) {
          if (!alive) return;
          st[1]({ status: r[0], sensors: r[1] }); err[1](null);
          // Aktion abgeschlossen, sobald das Gerät einmal weg war und wieder antwortet
          pending[1](function (p) { return p && p.wasOffline ? null : p; });
        }, function (e) {
          if (!alive) return;
          err[1](e.message);
          pending[1](function (p) { return p ? Object.assign({}, p, { wasOffline: true }) : p; });
        })
          .then(function () { if (alive) timer = setTimeout(tick, 5000); });
      }
      tick();
      return function () { alive = false; clearTimeout(timer); };
    }, []);

    if (!agent.configured()) {
      return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: dev.title, icon: dev.icon },
        h(O.Status, { tone: 'neutral' }, 'Nicht verbunden'),
        h('p', { style: { margin: '8px 0 12px', color: 'var(--ink-muted)' } }, 'Auf dem ' + dev.title + ' pc-agent.py mit --allow-control starten und unter Einstellungen eintragen.'),
        h(O.Button, { variant: 'outline', icon: 'settings', onClick: function () { location.hash = '#/settings'; } }, 'Einrichten'));
    }

    var s = st[0] && st[0].status, sens = st[0] && st[0].sensors;
    var online = s && !err[0];
    var control = s && s.control || { enabled: false, actions: {} };

    function confirm(a) {
      dialog[1]({ type: 'confirm', title: dev.title + ' ' + a.label, danger: a.id !== 'reboot', ok: a.label, okIcon: a.icon,
        text: '„' + s.host + '“ wirklich ' + a.verb + '?' + (a.warn ? ' ' + a.warn : ''),
        onOk: function () {
          pending[1]({ action: a.id, label: a.label });
          agent.post('/api/control', { action: a.id }).then(function () {
            Files.toast(a.label + ' für ' + s.host + ' ausgelöst');
          }, function (e) { pending[1](null); Files.toast(e.message, 'danger'); });
        } });
    }

    var statusLine = pending[0] ? h(O.Status, { tone: 'warn' }, pending[0].label + ' läuft …' + (err[0] ? ' (nicht erreichbar)' : ''))
      : online ? h(O.Status, { tone: 'ok' }, 'Online · ' + s.host + ' · ' + s.os)
      : err[0] ? h(O.Status, { tone: 'danger' }, 'Offline') : h(O.Status, { tone: 'neutral' }, 'Verbinde …');

    return h(O.Panel, { variant: online ? 'framed' : 'outlined', mutedCorners: !online, title: dev.title, icon: dev.icon },
      statusLine,
      err[0] && !pending[0] ? h('p', { style: { margin: '8px 0 0', color: 'var(--ink-muted)', fontSize: 13 } }, err[0]) : null,
      s ? h(O.InfoList, { items: [
        { label: 'Läuft seit', value: duration(s.uptime) },
        sens && sens.cpu_temp != null ? { label: 'CPU-Temperatur', value: Math.round(sens.cpu_temp) + ' °C', tone: sens.cpu_temp >= 85 ? 'warn' : undefined } : null,
        sens && sens.memory ? { label: 'Arbeitsspeicher', value: Math.round(sens.memory.percent) + ' %' } : null
      ].filter(Boolean) }) : null,
      s && !control.enabled ? h(O.Alert, { tone: 'info', title: 'Steuerung nicht freigeschaltet' },
        'Den Agenten auf diesem Gerät mit --allow-control starten (siehe PC-AGENT.md, Abschnitt Steuerung).') : null,
      s && control.enabled ? h('div', { className: 'control-actions' }, ACTIONS.map(function (a) {
        var state = control.actions[a.id];
        var blocked = state === 'na' || state === 'no' || state === 'challenge';
        return h(O.Button, { key: a.id, variant: a.variant, icon: a.icon, disabled: !online || !!pending[0] || state === 'na',
          title: state === 'challenge' || state === 'no' ? 'Polkit-Regel fehlt (siehe PC-AGENT.md)' : undefined,
          onClick: function () { confirm(a); } }, a.label + (blocked && state !== 'na' ? ' *' : ''));
      })) : null,
      s && control.enabled && ACTIONS.some(function (a) { return control.actions[a.id] === 'challenge' || control.actions[a.id] === 'no'; })
        ? h('div', { className: 'op-field-hint', style: { marginTop: 8 } }, '* Das System verlangt dafür noch eine Freigabe (Polkit-Regel, siehe PC-AGENT.md).') : null,
      dialog[0] ? h(Files.Dialog, { dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null);
  }

  function Control() {
    return [
      h('p', { key: 'i', style: { margin: 0, color: 'var(--ink-muted)' } },
        'Neustart, Herunterfahren und Ruhezustand für PC und NAS. Jede Aktion fragt vorher nach.'),
      h('div', { key: 'd', className: 'control-grid' }, DEVICES.map(function (d) { return h(Device, { key: d.id, device: d }); }))
    ];
  }

  window.NDControl = { Control: Control };
})();
