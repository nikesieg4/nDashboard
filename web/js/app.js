/* nDashboard — alle Seiten aus dem Terminal-Ops-Template. Funktionsfähig sind bisher
 * Anmeldung (auth.js), Dateien (NAS über WebDAV, files.js / nas.js), Sensoren (PC-Agent, monitor.js),
 * Steuereinheit (control.js), Management (Ziele: goals.js, Spiel: game.js, Bürgerportal: portal.js),
 * Kalender (calendar.js), News (tagesschau, news.js), Benachrichtigungen (notify.js) und die Einstellungen dazu.
 * Navigation läuft über den URL-Hash (#/home, #/files?p=/ordner, …), damit der
 * Zurück-Knopf von Android und die Browser-Historie funktionieren. */
(function () {
  var O = window.Ops, h = React.createElement, NAS = window.NAS, FilesUI = window.NDFiles;
  var Agent = window.NDServices.Agent, Auth = window.NDAuth;
  var LOGO = 'img/logo.svg', LOGO_SMALL = 'img/logo-small.svg';
  function noop() {}

  /* ---------- Routing ---------- */
  var PAGES = {
    login:        { title: 'Anmeldung', root: true },
    home:         { title: 'Start', nav: 'home', root: true },
    control:      { title: 'Steuereinheit', sub: 'PC & NAS', nav: 'control', root: true },
    files:        { title: 'Dateien', nav: 'files', root: true },
    file:         { title: 'Datei', nav: 'files' },
    sensors:      { title: 'Sensoren', sub: 'PC-Monitor', nav: 'sensors', root: true },
    security:     { title: 'Sicherheit', sub: 'Nicht verbunden', nav: 'more', root: true },
    management:   { title: 'Management', sub: 'Ziele & Sparpläne', nav: 'more', root: true },
    goal:         { title: 'Ziel', nav: 'more' },
    game:         { title: 'Management', sub: 'Spiel · Disponenten-Simulator', nav: 'more', root: true },
    portal:       { title: 'Management', sub: 'Bürgerportal · ABIS', nav: 'more', root: true },
    calendar:     { title: 'Kalender', nav: 'more', root: true },
    event:        { title: 'Termin', nav: 'more' },
    news:         { title: 'News', sub: 'tagesschau', nav: 'more', root: true },
    article:      { title: 'News', sub: 'tagesschau', nav: 'more' },
    chat:         { title: 'Chat', sub: 'Nicht verfügbar', nav: 'more', root: true },
    notifications: { title: 'Benachrichtigungen', nav: 'more' },
    settings:     { title: 'Einstellungen', nav: 'more' }
  };
  var DRAWER = [
    ['home', 'home', 'Start'], ['control', 'power', 'Steuereinheit'], ['files', 'folder', 'Dateien'],
    ['sensors', 'sensor', 'Sensoren'], ['security', 'shield', 'Sicherheit'],
    ['management', 'chart', 'Management'], ['calendar', 'calendar', 'Kalender'], ['news', 'news', 'News'], ['chat', 'chat', 'Chat', 'aus']
  ];
  var BOTTOM = [
    { id: 'home', label: 'Start', icon: 'home' }, { id: 'files', label: 'Dateien', icon: 'folder' },
    { id: 'sensors', label: 'Sensoren', icon: 'sensor' }, { id: 'control', label: 'Steuerung', icon: 'power' },
    { id: 'more', label: 'Mehr', icon: 'menu' }
  ];
  var BOTTOM_TARGET = { home: 'home', files: 'files', sensors: 'sensors', control: 'control' };

  function currentRoute() {
    var raw = (location.hash || '').replace(/^#\/?/, ''), q = raw.indexOf('?');
    var id = q < 0 ? raw : raw.slice(0, q);
    var params = new URLSearchParams(q < 0 ? '' : raw.slice(q + 1));
    return { page: PAGES[id] ? id : 'login', path: '/' + (params.get('p') || '').replace(/^\/+|\/+$/g, ''), id: params.get('id') || '', section: params.get('s') || '', query: params };
  }
  function go(id) { location.hash = '#/' + id; }
  function back() { if (history.length > 1) history.back(); else go('home'); }

  function useMedia(query) {
    var mq = window.matchMedia(query), st = React.useState(mq.matches);
    React.useEffect(function () {
      function on() { st[1](mq.matches); }
      mq.addEventListener('change', on);
      return function () { mq.removeEventListener('change', on); };
    }, []);
    return st[0];
  }

  /* ---------- Bausteine ---------- */
  function IconBtn(icon, label, onClick) {
    return h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': label, onClick: onClick || noop }, h(O.Icon, { name: icon }));
  }

  function Drawer(props) {
    var net = useNet();
    return h('aside', { className: 'drawer', 'aria-label': 'Navigation' },
      h('div', { className: 'drawer-brand' }, h(O.LogoSlot, { src: LOGO, alt: 'nDashboard', width: 48, height: 48 }), h('b', null, 'nDashboard')),
      h('div', { className: 'op-label', style: { margin: '12px 0 4px' } }, 'Navigation'),
      DRAWER.map(function (d) {
        return h(O.NavButton, { key: d[0], icon: d[1], meta: d[3], active: props.page === d[0], onClick: function () { props.onNavigate(d[0]); } }, d[2]);
      }),
      h('div', { className: 'spacer' }),
      h(O.ListItem, { icon: 'signal', title: 'Netz: ' + (net.profile === 'vpn' ? 'VPN' : 'WLAN'), subtitle: net.checking ? 'prüfe …' : net.mode === 'auto' ? 'automatisch erkannt' : 'fest eingestellt',
        onClick: function () { props.onNavigate('settings'); } }),
      h(O.Button, { variant: 'ghost', icon: 'settings', onClick: function () { props.onNavigate('settings'); } }, 'Einstellungen'),
      h(O.Button, { variant: 'ghost', icon: 'lock', onClick: function () { Auth.logout(); } }, 'Abmelden'));
  }

  /* ---------- Seiten ---------- */
  /** Ein Login für Bürgerportal und Spiel (auth.js). Ohne Netz: „Ohne Anmeldung weiter“. */
  function Login() {
    var a = Auth.useAuth(), cfg = Auth.settings();
    var user = React.useState(a.user || cfg.user), pass = React.useState(''), busy = React.useState(false), result = React.useState(null);
    var fails = React.useState(0), lockUntil = React.useState(0), now = React.useState(Date.now());
    React.useEffect(function () { var t = setInterval(function () { now[1](Date.now()); }, 1000); return function () { clearInterval(t); }; }, []);
    var locked = lockUntil[0] > now[0];

    function submit(e) {
      e.preventDefault();
      if (locked || busy[0]) return;
      busy[1](true); result[1](null);
      Auth.login(user[0], pass[0]).then(function (r) {
        busy[1](false); pass[1]('');
        if (r.ok) {
          var failed = [r.portal, r.game].filter(function (x) { return !x.ok; })[0];
          if (failed) setTimeout(function () { FilesUI.toast(failed.reason, 'warn'); }, 300);
          return;
        }
        result[1](r);
        var n = fails[0] + 1; fails[1](n);
        if (n >= 3) lockUntil[1](Date.now() + Math.min(300, 15 * Math.pow(2, n - 3)) * 1000); // wachsende Wartezeit nach Fehlversuchen
      });
    }

    var r = result[0];
    return h('div', { className: 'login op-grid-bg' },
      h('div', { className: 'spacer' }),
      h(O.Panel, { variant: 'framed', className: 'login-card' },
        h('div', { className: 'op-col', style: { alignItems: 'center', gap: 14 } },
          h(O.LogoSlot, { src: LOGO, alt: 'nDashboard', width: 80, height: 80 }),
          h('div', { className: 'op-mono', style: { color: 'var(--signal)' } }, 'SYSTEM ONLINE'),
          h('div', { style: { fontSize: 20, fontWeight: 600, letterSpacing: '.1em' } }, 'BENUTZER-ANMELDUNG')),
        h('form', { className: 'op-col', style: { gap: 14, marginTop: 20 }, onSubmit: submit },
          h(O.TextField, { label: 'Benutzer', value: user[0], onChange: function (e) { user[1](e.target.value); }, autoComplete: 'username', spellCheck: false, placeholder: 'Administrator' }),
          h(O.TextField, { label: 'Passwort', type: 'password', value: pass[0], onChange: function (e) { pass[1](e.target.value); }, autoComplete: 'current-password', placeholder: '••••••••••••' }),
          h(O.Button, { icon: 'lock', type: 'submit', disabled: busy[0] || locked || !user[0].trim() || !pass[0] }, busy[0] ? 'Prüfe Zugang …' : 'Anmelden'),
          a.notice && !r ? h(O.Status, { tone: 'warn' }, a.notice) : null,
          r ? h('div', { className: 'op-col', role: 'alert' },
            h(O.Status, { tone: 'danger' }, r.portal.reason), h(O.Status, { tone: 'danger' }, r.game.reason)) : null,
          locked ? h(O.Status, { tone: 'warn' }, 'Zu viele Fehlversuche. Nächster Versuch in ' + Math.ceil((lockUntil[0] - now[0]) / 1000) + ' s.') : null,
          h(O.Button, { variant: r && r.offline ? 'outline' : 'ghost', icon: 'door', onClick: Auth.skip }, 'Ohne Anmeldung weiter'))),
      h('div', { className: 'hint' }, 'Bürgerportal + Disponenten-Simulator · Abmeldung nach ' + Auth.idleMinutes + ' min ohne Eingabe'),
      cfg.gamePass ? null : h('div', { className: 'hint' }, 'Spiel-Passwort noch nicht eingerichtet: nach dem Login unter Einstellungen → Konten eintragen.'),
      h('div', { className: 'spacer' }));
  }

  function Home() {
    return [
      h(O.TitleBar, { key: 't', size: 'lg' }, 'Dashboard'),
      h('div', { key: 's', className: 'op-label', style: { marginTop: -8 } }, 'Deine Organisation · V. 01'),
      h(window.NDCalendar.Upcoming, { key: 'cal' }),
      h(O.Panel, { key: 'p', variant: 'framed', style: { textAlign: 'center' } },
        h('div', { style: { fontSize: 24, lineHeight: '28px', fontWeight: 500, letterSpacing: '.08em' } }, 'DIRECT ACCESS', h('br'), 'TERMINAL'),
        h('div', { style: { marginTop: 10, color: 'var(--signal)', fontSize: 13, letterSpacing: '.08em' } }, '„help“ eingeben für weitere Informationen'),
        h('div', { className: 'op-mono', style: { textAlign: 'left', marginTop: 14, color: 'var(--signal)' } }, 'root@sudo_user:', h('span', { style: { color: 'var(--info)' } }, '~'), '$')),
      h(O.CommandInput, { key: 'c', showPrompt: false, placeholder: 'Befehl eingeben…', onSubmit: noop }),
      h(O.Panel, { key: 'i', variant: 'outlined', mutedCorners: true },
        h(O.InfoList, { items: [
          { label: 'Uhrzeit', value: '20:08:44', big: true },
          { label: 'Standort', value: 'Fehler beim Abrufen des Standorts', tone: 'danger' },
          { label: 'Verbindungsstatus', value: '100.2 MB/s' },
          { label: 'Alarmstatus', value: 'Normal' }] }))
    ];
  }

  function Security() {
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Sicherheit', icon: 'shield' },
      h(O.Status, { tone: 'neutral' }, 'Nichts verbunden'),
      h('p', { style: { margin: '8px 0 0', color: 'var(--ink-muted)' } }, 'Mit diesem Bereich ist noch kein Gerät verbunden.'));
  }

  function Chat() {
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Chat', icon: 'chat' },
      h(O.Status, { tone: 'neutral' }, 'Nicht verfügbar'),
      h('p', { style: { margin: '8px 0 0', color: 'var(--ink-muted)' } }, 'Chat ist momentan nicht verfügbar.'));
  }

  /** Liste hinter der Glocke (notify.js). */
  function useNotifications() {
    var st = React.useState(0);
    React.useEffect(function () { return window.NDNotify.subscribe(function () { st[1](function (n) { return n + 1; }); }); }, []);
    return window.NDNotify;
  }
  var SOURCE_ICON = { calendar: 'calendar', news: 'news', pc: 'sensor', app: 'bell' };
  function Notifications() {
    var N = useNotifications(), list = N.log();
    React.useEffect(function () { return function () { window.NDNotify.markAllRead(); }; }, []);
    return [
      h('div', { key: 'tb', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Status, { tone: N.config().enabled ? 'ok' : 'neutral' }, N.config().enabled ? 'Benachrichtigungen an' : 'Benachrichtigungen aus – nur diese Liste'),
        h('div', { className: 'op-row' },
          h(O.Button, { variant: 'ghost', size: 'sm', icon: 'settings', onClick: function () { go('settings'); } }, 'Einstellungen'),
          list.length ? h(O.Button, { variant: 'ghost', size: 'sm', icon: 'close', onClick: N.clearLog }, 'Leeren') : null)),
      list.length ? h(O.Panel, { key: 'l', variant: 'outlined', mutedCorners: true },
        h('div', { className: 'file-list' }, list.map(function (n) {
          return h(O.ListItem, { key: n.id, icon: SOURCE_ICON[n.source] || 'bell', title: n.title, subtitle: n.body || null, className: n.read ? '' : 'notice-unread',
            meta: new Date(n.ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            onClick: n.url ? function () { location.hash = n.url; } : undefined });
        }))) : h('div', { key: 'e', className: 'hint' }, 'Noch keine Benachrichtigungen.')
    ];
  }

  function NotifySettings() {
    var N = useNotifications(), c = N.config(), perm = N.permission(), msg = React.useState(null);
    function enable(on) {
      if (!on) return N.setConfig({ enabled: false });
      N.requestPermission().then(function (p) {
        if (p === 'granted') { N.setConfig({ enabled: true }); msg[1](null); }
        else msg[1](p === 'unsupported' ? 'Dieses Gerät unterstützt keine Benachrichtigungen.' : 'Benachrichtigungen wurden nicht erlaubt. Du kannst sie in den Systemeinstellungen für nDashboard freigeben.');
      });
    }
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Benachrichtigungen', icon: 'bell' },
      h('div', { className: 'op-col', style: { gap: 12 } },
        h(O.Toggle, { label: 'Benachrichtigungen', checked: c.enabled && perm === 'granted', onChange: enable }),
        h(O.Toggle, { label: 'Kalender-Erinnerungen', checked: c.calendar, disabled: !c.enabled, onChange: function (v) { N.setConfig({ calendar: v }); } }),
        h(O.Toggle, { label: 'tagesschau-Eilmeldungen', checked: c.news, disabled: !c.enabled, onChange: function (v) { N.setConfig({ news: v }); } }),
        h(O.Toggle, { label: 'Warnungen vom PC (Temperatur, Abstürze, Anmeldungen)', checked: c.pc, disabled: !c.enabled, onChange: function (v) { N.setConfig({ pc: v }); } }),
        msg[0] ? h(O.Status, { tone: 'warn' }, msg[0]) : null,
        h('div', { className: 'op-field-hint' }, N.background
          ? 'Termin-Erinnerungen kommen auch, wenn die App geschlossen ist. Eilmeldungen und PC-Warnungen nur, solange die App läuft.'
          : 'Benachrichtigungen kommen, solange die App geöffnet ist (auch im Hintergrund). Auf dem Handy erinnert Android an Termine auch bei geschlossener App.'),
        h('div', { className: 'op-row' }, h(O.Button, { variant: 'outline', size: 'sm', icon: 'bell', disabled: !c.enabled || perm !== 'granted', onClick: N.test }, 'Test senden'))));
  }

  /** Netzwerk-Profil abonnieren (siehe network.js). */
  function useNet() {
    var st = React.useState(window.NDNet.state());
    React.useEffect(function () { return window.NDNet.subscribe(st[1]); }, []);
    return st[0];
  }

  /** Umschalter Automatisch / WLAN / VPN. */
  function NetworkSettings() {
    var n = useNet();
    var text = n.checking ? 'Prüfe, ob das Heimnetz erreichbar ist …'
      : n.mode === 'auto' ? 'Aktiv: ' + window.NDNet.label(n.profile) + ' – automatisch erkannt'
      : 'Aktiv: ' + window.NDNet.label(n.profile) + ' – fest eingestellt';
    return h(O.Panel, { variant: 'framed', title: 'Netzwerk', icon: 'signal' },
      h(O.Tabs, { items: [{ id: 'auto', label: 'Automatisch' }, { id: 'home', label: 'WLAN' }, { id: 'vpn', label: 'VPN' }], value: n.mode, onChange: window.NDNet.setMode }),
      h('div', { className: 'op-row', style: { marginTop: 12, justifyContent: 'space-between' } },
        h(O.Status, { tone: n.checking ? 'info' : n.profile === 'vpn' ? 'signal' : 'ok' }, text),
        n.mode === 'auto' ? h(O.Button, { variant: 'ghost', size: 'sm', icon: 'signal', disabled: n.checking, onClick: function () { window.NDNet.detect(); } }, 'Neu prüfen') : null),
      h('div', { className: 'op-field-hint', style: { marginTop: 8 } },
        'WLAN nutzt die Heimnetz-Adressen (192.168.…), VPN die Tailscale-Adressen (100.…). „Automatisch“ nimmt WLAN, wenn das Heimnetz antwortet, sonst VPN – so kannst du Tailscale zuhause ausschalten.'));
  }

  /** Formular für eine Verbindung mit WLAN- und VPN-Adresse, Benutzer und Passwort (NAS, PC-Agent, NAS-Agent). */
  function ConnectionSettings(p) {
    var cfg = p.service.config() || {};
    var url = React.useState(cfg.url || ''), urlVpn = React.useState(cfg.urlVpn || ''), user = React.useState(cfg.user || ''), pass = React.useState(cfg.pass || '');
    var state = React.useState(null);
    var clean = function (u) { u = u.trim().replace(/\/+$/, ''); return u === 'http:' || u === 'http://' ? '' : u; };
    function values() { return { url: clean(url[0]), urlVpn: clean(urlVpn[0]), user: user[0].trim(), pass: pass[0] }; }
    function test(e) {
      e.preventDefault();
      var v = values();
      if (!v.url && !v.urlVpn) return state[1]({ tone: 'danger', text: 'Bitte mindestens eine Adresse eintragen.' });
      var bad = [v.url, v.urlVpn].filter(function (u) { return u && !/^https?:\/\/[^/]+/.test(u); })[0];
      if (bad) return state[1]({ tone: 'danger', text: 'Adresse muss mit http:// beginnen: ' + bad });
      var previous = p.service.config();
      p.service.save(v);
      state[1]({ tone: 'info', text: 'Verbinde …' });
      var active = window.NDNet.profile(), other = active === 'vpn' ? v.url : v.urlVpn;
      Promise.all([p.test(), other ? window.NDNet.reachable(other, 2500) : Promise.resolve(null)]).then(function (r) {
        var otherText = r[1] === null ? '' : ' · ' + (active === 'vpn' ? 'WLAN' : 'VPN') + '-Adresse ' + (r[1] ? 'erreichbar' : 'gerade nicht erreichbar' + (active === 'vpn' ? '' : ' (VPN aus?)'));
        state[1]({ tone: 'ok', text: 'Verbunden über ' + window.NDNet.label(active) + ' · ' + r[0] + otherText + '. Gespeichert.' });
      }, function (err) {
        if (previous) p.service.save(previous);
        state[1]({ tone: 'danger', text: err.message + ' Nicht gespeichert.' });
      });
    }
    return h(O.Panel, { variant: p.variant || 'outlined', mutedCorners: p.variant !== 'framed', title: p.title, icon: p.icon },
      h('form', { className: 'op-col', style: { gap: 14 }, onSubmit: test },
        h(O.TextField, { label: 'Adresse im WLAN', value: url[0], onChange: function (e) { url[1](e.target.value); }, placeholder: p.placeholder, inputMode: 'url', autoComplete: 'off', spellCheck: false, hint: p.hint }),
        h(O.TextField, { label: 'Adresse über VPN (optional)', value: urlVpn[0], onChange: function (e) { urlVpn[1](e.target.value); }, placeholder: p.vpnPlaceholder, inputMode: 'url', autoComplete: 'off', spellCheck: false,
          hint: 'Tailscale-Adresse des Geräts (tailscale ip -4), gleicher Port.' }),
        h(O.TextField, { label: 'Benutzer', value: user[0], onChange: function (e) { user[1](e.target.value); }, autoComplete: 'username' }),
        h(O.TextField, { label: 'Passwort', type: 'password', value: pass[0], onChange: function (e) { pass[1](e.target.value); }, autoComplete: 'current-password' }),
        h('div', { className: 'op-row' },
          h(O.Button, { type: 'submit', icon: 'signal' }, 'Verbinden & speichern'),
          p.service.configured() ? h(O.Button, { variant: 'ghost', onClick: function () { location.hash = p.goto[0]; } }, p.goto[1]) : null),
        state[0] ? h(O.Status, { tone: state[0].tone }, state[0].text) : null,
        h('div', { className: 'op-field-hint' }, 'Die Zugangsdaten werden nur auf diesem Gerät gespeichert.')));
  }

  function NasSettings() {
    return h(ConnectionSettings, { title: 'NAS-Verbindung', icon: 'folder', variant: 'framed', service: NAS, placeholder: 'http://192.168.1.42:5005', vpnPlaceholder: 'http://100.x.y.z:5005',
      hint: 'Wird von nas-server.py beim Start angezeigt. Die IP verwenden, nicht .local.', goto: ['#/files', 'Zu den Dateien'],
      test: function () { return NAS.list('/').then(function (d) { return d.items.length + ' Einträge im Hauptordner'; }); } });
  }

  function AgentSettings() {
    return h(ConnectionSettings, { title: 'PC-Agent (Sensoren, Steuerung)', icon: 'sensor', service: Agent, placeholder: 'http://192.168.1.20:5006', vpnPlaceholder: 'http://100.x.y.z:5006',
      hint: 'Wird von pc-agent.py beim Start angezeigt.', goto: ['#/sensors', 'Zu den Sensoren'],
      test: function () { return Agent.get('/api/status').then(function (s) { return s.host + ' · ' + s.os; }); } });
  }

  function NasAgentSettings() {
    var NasAgent = window.NDServices.NasAgent;
    return h(ConnectionSettings, { title: 'NAS-Agent (Steuerung)', icon: 'power', service: NasAgent, placeholder: 'http://192.168.1.60:5006', vpnPlaceholder: 'http://100.x.y.z:5006',
      hint: 'pc-agent.py auf dem NAS (Raspberry Pi), siehe PC-AGENT.md. Nicht die Adresse von nas-server.py (Port 5005).', goto: ['#/control', 'Zur Steuereinheit'],
      test: function () { return NasAgent.get('/api/status').then(function (s) { return s.host + ' · ' + s.os; }); } });
  }

  /** Update-Stand abonnieren (siehe update.js). */
  function useUpdate() {
    var st = React.useState(window.NDUpdate.state());
    React.useEffect(function () { return window.NDUpdate.subscribe(st[1]); }, []);
    return st[0];
  }

  function installUpdate() {
    if (!window.NDUpdate.install()) FilesUI.toast('Update konnte nicht gestartet werden.', 'danger');
  }

  /** Hinweis oben in der App, wenn auf GitHub eine neuere Version liegt. */
  function UpdateBanner() {
    var u = useUpdate(), hidden = React.useState(null);
    if (!window.NDUpdate.available() || hidden[0] === u.latest.tag) return null;
    var direct = window.NDUpdate.canInstall(), mac = window.NDUpdate.platform() === 'mac';
    return h(O.Alert, { tone: 'info', title: 'Update verfügbar: ' + u.latest.name },
      window.NDUpdate.hint(),
      h('div', { className: 'op-row', style: { marginTop: 10 } },
        direct ? h(O.Button, { size: 'sm', icon: 'download', onClick: installUpdate }, 'Jetzt aktualisieren') : null,
        mac ? h(O.Button, { size: 'sm', icon: 'download', onClick: window.NDUpdate.openRelease }, 'Herunterladen') : null,
        h(O.Button, { size: 'sm', variant: 'ghost', onClick: function () { hidden[1](u.latest.tag); } }, 'Später')));
  }

  function UpdateSettings() {
    var u = useUpdate(), v = window.ND_VERSION, available = window.NDUpdate.available();
    var status = u.checking ? { tone: 'info', text: 'Suche nach Updates …' }
      : u.error ? { tone: 'danger', text: u.error }
      : available ? { tone: 'warn', text: 'Neue Version ' + u.latest.name + ' verfügbar' }
      : u.latest && v.code > 0 ? { tone: 'ok', text: 'Aktuell' }
      : v.code === 0 ? { tone: 'neutral', text: 'Entwicklungs-Build – keine automatischen Updates' } : null;
    return h(O.Panel, { key: 'upd', variant: 'outlined', mutedCorners: true, title: 'Updates', icon: 'download' },
      h(O.InfoList, { items: [{ label: 'Installiert', value: v.name }].concat(u.latest ? [{ label: 'Neueste auf GitHub', value: u.latest.name }] : []) }),
      h('div', { className: 'op-row', style: { marginTop: 14 } },
        h(O.Button, { variant: 'outline', icon: 'signal', disabled: u.checking, onClick: function () { window.NDUpdate.check(true); } }, 'Nach Updates suchen'),
        available && window.NDUpdate.canInstall() ? h(O.Button, { icon: 'download', onClick: installUpdate }, 'Jetzt aktualisieren') : null,
        available && window.NDUpdate.platform() === 'mac' ? h(O.Button, { icon: 'download', onClick: window.NDUpdate.openRelease }, 'Herunterladen') : null),
      status ? h('div', { style: { marginTop: 10 } }, h(O.Status, { tone: status.tone }, status.text)) : null);
  }

  /** Konten für die Admin-Bereiche: Portal-Benutzer und Spiel-Passwort (nur auf diesem Gerät). */
  function AccountSettings() {
    var a = Auth.useAuth(), cfg = Auth.settings();
    var user = React.useState(cfg.user), gamePass = React.useState(''), saved = React.useState(false);
    function save(e) {
      e.preventDefault();
      var change = { user: user[0].trim() || 'Administrator' };
      if (gamePass[0]) change.gamePass = gamePass[0];
      Auth.saveSettings(change);
      gamePass[1](''); saved[1](true);
      // Neues Spiel-Passwort gleich ausprobieren, wenn das Portal angemeldet ist
      if (change.gamePass && a.portal) Auth.loginGame('').then(function (r) { FilesUI.toast(r.ok ? 'Beim Spiel angemeldet' : r.reason, r.ok ? 'ok' : 'danger'); });
    }
    return h(O.Panel, { variant: 'framed', title: 'Konten (Management)', icon: 'user' },
      h(O.InfoList, { items: [
        { label: 'Bürgerportal', value: a.portal ? 'angemeldet · ' + (a.portal.is_admin ? 'Administrator' : a.portal.name || a.portal.email) : 'nicht angemeldet', tone: a.portal ? 'ok' : 'neutral' },
        { label: 'Spiel', value: a.game ? 'angemeldet bis ' + new Date(a.game.expires).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'nicht angemeldet', tone: a.game ? 'ok' : 'neutral' }] }),
      h('form', { className: 'op-col', style: { gap: 14, marginTop: 14 }, onSubmit: save },
        h(O.TextField, { label: 'Benutzer (Bürgerportal)', value: user[0], onChange: function (e) { user[1](e.target.value); saved[1](false); }, autoComplete: 'off', spellCheck: false,
          hint: '„Administrator“ oder die E-Mail-Adresse des Portal-Kontos.' }),
        h(O.TextField, { label: 'Passwort Disponenten-Simulator', type: 'password', value: gamePass[0], onChange: function (e) { gamePass[1](e.target.value); saved[1](false); }, autoComplete: 'new-password',
          placeholder: cfg.gamePass ? '•••••••• gespeichert – leer lassen = behalten' : 'Codes-Admin-Passwort',
          hint: 'Bleibt nur auf diesem Gerät und wird erst nach dem Login fürs Bürgerportal benutzt.' }),
        h('div', { className: 'op-row' },
          h(O.Button, { type: 'submit', icon: 'settings' }, 'Speichern'),
          h(O.Button, { variant: 'ghost', icon: 'lock', onClick: function () { Auth.logout(); } }, 'Abmelden')),
        saved[0] ? h(O.Status, { tone: 'ok' }, 'Gespeichert.') : null));
  }

  function Settings() {
    return [
      h(AccountSettings, { key: 'acc' }),
      h(NotifySettings, { key: 'notify' }),
      h(NetworkSettings, { key: 'net' }),
      h(NasSettings, { key: 'nas' }),
      h(AgentSettings, { key: 'agent' }),
      h(NasAgentSettings, { key: 'nasagent' }),
      h(UpdateSettings, { key: 'upd' }),
      h(O.Panel, { key: 'b', variant: 'outlined', mutedCorners: true, title: 'App', icon: 'settings' },
        h('div', { className: 'op-col', style: { gap: 12 } }, h(O.Toggle, { defaultChecked: true, label: 'Kompakte Ansicht' }))),
      h(O.Panel, { key: 'c', variant: 'outlined', mutedCorners: true, title: 'Info' },
        h(O.InfoList, { items: [{ label: 'Version', value: window.ND_VERSION.name }, { label: 'Design', value: 'Terminal Ops' }] }))
    ];
  }

  function FilesPage(props) { return h(FilesUI.Browser, { path: props.path }); }
  function Sensors() { return h(window.NDMonitor.Sensors); }
  function Control() { return h(window.NDControl.Control); }
  /** Reiter oben auf allen Management-Seiten. */
  function MgmtTabs(props) {
    return h(O.Tabs, { items: [{ id: 'management', label: 'Ziele' }, { id: 'game', label: 'Spiel' }, { id: 'portal', label: 'Bürgerportal' }], value: props.value, onChange: go });
  }
  function Management() { return [h(MgmtTabs, { key: 'tabs', value: 'management' }), h(window.NDGoals.Overview, { key: 'p' })]; }
  function Game() { return [h(MgmtTabs, { key: 'tabs', value: 'game' }), h(window.NDGame.Page, { key: 'p' })]; }
  function Portal(props) { return [props.id ? null : h(MgmtTabs, { key: 'tabs', value: 'portal' }), h(window.NDPortal.Page, { key: 'p', section: props.section, id: props.id })]; }
  function Goal(props) { return h(window.NDGoals.Detail, { id: props.id }); }
  function FilePage(props) { return h(FilesUI.Viewer, { path: props.path }); }

  function CalendarPage(props) { return h(window.NDCalendar.Calendar, { view: props.query.get('v'), date: props.query.get('d') }); }
  function EventPage(props) {
    var q = props.query;
    return h(window.NDCalendar.EventEditor, { key: q.toString(), id: q.get('id'), occurrence: q.get('o'), date: q.get('d'), time: q.get('t'), allDay: q.get('allday') === '1' });
  }
  function NewsPage() { return h(window.NDNews.News); }
  function ArticlePage(props) { return h(window.NDNews.Article, { url: props.query.get('u') }); }

  var RENDER = { home: Home, calendar: CalendarPage, event: EventPage, article: ArticlePage, notifications: Notifications, control: Control, files: FilesPage, file: FilePage, sensors: Sensors, security: Security,
    management: Management, goal: Goal, game: Game, portal: Portal, news: NewsPage, chat: Chat, settings: Settings };

  /* ---------- App-Hülle ---------- */
  function App() {
    var rt = React.useState(currentRoute()), page = rt[0].page, path = rt[0].path, routeId = rt[0].id, section = rt[0].section;
    var auth = Auth.useAuth();
    var dr = React.useState(false), drawerOpen = dr[0];
    var desktop = useMedia('(min-width: 900px)');
    var bodyRef = React.useRef(null);

    var net = useNet();
    React.useEffect(function () { if (window.ND_VERSION.code > 0) window.NDUpdate.check(false); }, []);
    React.useEffect(function () { if (window.NDNet.mode() === 'auto') window.NDNet.detect(); }, []);
    React.useEffect(function () { if (auth.unlocked && page === 'login') go('home'); }, [auth.unlocked, page]);
    // Erinnerungen und Abfragen erst, wenn feststeht, welche NAS-/PC-Adresse gilt
    var netReady = net.mode !== 'auto' || net.detected;
    React.useEffect(function () { if (netReady) window.NDNotify.start(); }, [netReady, net.profile]);
    var notes = useNotifications(), unread = notes.unread();
    React.useEffect(function () {
      function on() { rt[1](currentRoute()); dr[1](false); if (bodyRef.current) bodyRef.current.scrollTop = 0; }
      window.addEventListener('hashchange', on);
      return function () { window.removeEventListener('hashchange', on); };
    }, []);

    // Ohne Anmeldung (oder „Ohne Anmeldung weiter“) nur die Login-Seite; danach geht es zur angefragten Seite
    if (!auth.unlocked || page === 'login') return h('div', { className: 'app op-compact' }, h(Login));

    var meta = PAGES[page];
    var isFiles = page === 'files' || page === 'file';
    var root = page === 'files' ? path === '/' : page === 'portal' ? !routeId : meta.root;
    var drawer = h(Drawer, { page: isFiles ? 'files' : page === 'goal' || page === 'game' || page === 'portal' ? 'management' : page === 'event' ? 'calendar' : page === 'article' ? 'news' : page, onNavigate: go });
    var showMenu = root && !desktop;
    var bar = h(O.AppBar, {
      onMenu: showMenu ? function () { dr[1](true); } : undefined,
      onBack: !root ? (page === 'files' ? function () { location.hash = '#/files?p=' + encodeURIComponent(NAS.parent(path)); } : page === 'goal' ? function () { go('management'); }
        : page === 'portal' ? function () { location.hash = '#/portal?s=' + (section || 'lage'); } : back) : undefined,
      logo: page === 'home' && !desktop ? h(O.LogoSlot, { src: LOGO_SMALL, alt: 'nDashboard', width: 36, height: 36 }) : null,
      title: page === 'home' ? (desktop ? 'Start' : null) : page === 'file' ? path.slice(path.lastIndexOf('/') + 1) : page === 'goal' ? window.NDGoals.title(routeId) : meta.title,
      subtitle: isFiles ? (page === 'file' ? NAS.parent(path) : path) : page === 'portal' ? 'Bürgerportal · ' + window.NDPortal.title(section, routeId) : meta.sub,
      end: isFiles ? IconBtn('settings', 'NAS-Einstellungen', function () { go('settings'); })
        : h('button', { type: 'button', className: 'op-appbar-btn bell-btn', 'aria-label': 'Benachrichtigungen' + (unread ? ' (' + unread + ' neu)' : ''), onClick: function () { go('notifications'); } },
          h(O.Icon, { name: 'bell' }), unread ? h('span', { className: 'bell-badge' }, unread > 9 ? '9+' : unread) : null)
    });
    var footer = h(O.BottomNav, { value: meta.nav, items: BOTTOM, onChange: function (id) { if (id === 'more') dr[1](true); else go(BOTTOM_TARGET[id]); } });

    return h('div', { className: 'app' + (desktop ? ' is-desktop' : ' op-compact') },
      desktop ? drawer : null,
      h('div', { className: 'app-main' },
        bar,
        h('main', { className: 'app-body op-grid-bg', ref: bodyRef }, h('div', { className: 'app-body-inner' + (page === 'file' ? ' app-body-fill' : '') }, h(UpdateBanner),
          // Seiten mit Verbindungen erst nach der Netzerkennung laden und bei einem Netzwechsel neu aufbauen
          net.mode === 'auto' && !net.detected && page !== 'settings' ? h('div', { className: 'hint', key: 'net' }, 'Prüfe Netzwerk …')
            : h(RENDER[page], { key: net.profile, path: path, id: routeId, section: section, query: rt[0].query }))),
        footer),
      h(FilesUI.Toast),
      drawerOpen && !desktop ? h('div', { className: 'drawer-scrim' }, drawer, h('button', { className: 'drawer-scrim-dim', 'aria-label': 'Menü schließen', onClick: function () { dr[1](false); } })) : null);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
