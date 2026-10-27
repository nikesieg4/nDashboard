/* nDashboard — alle Seiten aus dem Terminal-Ops-Template. Funktionsfähig sind bisher
 * die Dateien (NAS über WebDAV, siehe files.js / nas.js) und die NAS-Einstellungen.
 * Navigation läuft über den URL-Hash (#/home, #/files?p=/ordner, …), damit der
 * Zurück-Knopf von Android und die Browser-Historie funktionieren. */
(function () {
  var O = window.Ops, h = React.createElement, NAS = window.NAS, FilesUI = window.NDFiles;
  var LOGO = 'img/logo.svg', LOGO_SMALL = 'img/logo-small.svg';
  function noop() {}

  /* ---------- Routing ---------- */
  var PAGES = {
    login:        { title: 'Anmeldung', root: true },
    home:         { title: 'Start', nav: 'home', root: true },
    control:      { title: 'Steuereinheit', nav: 'home' },
    files:        { title: 'Dateien', nav: 'files', root: true },
    file:         { title: 'Datei', nav: 'files' },
    sensors:      { title: 'Bewegungsmelder', sub: '48 Sensoren online', nav: 'sec', root: true },
    security:     { title: 'Sicherheit', nav: 'sec', root: true },
    banking:      { title: 'Konten', sub: 'Nicht verfügbar', nav: 'more', root: true },
    management:   { title: 'Management', sub: 'Q4 · 2026', nav: 'more', root: true },
    news:         { title: 'Bulletin', nav: 'more', root: true },
    chat:         { title: 'Chat', nav: 'chat', root: true },
    conversation: { title: '# Leitstelle', sub: 'Verschlüsselt · 4 online', nav: 'chat' },
    settings:     { title: 'Einstellungen', nav: 'more' }
  };
  var DRAWER = [
    ['home', 'home', 'Start'], ['control', 'power', 'Steuereinheit'], ['files', 'folder', 'Dateien'],
    ['sensors', 'sensor', 'Sensoren'], ['security', 'shield', 'Sicherheit', '2'], ['banking', 'bank', 'Banking', 'N/V'],
    ['management', 'chart', 'Management'], ['news', 'news', 'News'], ['chat', 'chat', 'Chat', '5']
  ];
  var BOTTOM = [
    { id: 'home', label: 'Start', icon: 'home' }, { id: 'files', label: 'Dateien', icon: 'folder' },
    { id: 'sec', label: 'Sicherheit', icon: 'shield', badge: '2' }, { id: 'chat', label: 'Chat', icon: 'chat', badge: '5' },
    { id: 'more', label: 'Mehr', icon: 'menu' }
  ];
  var BOTTOM_TARGET = { home: 'home', files: 'files', sec: 'security', chat: 'chat' };

  function currentRoute() {
    var raw = (location.hash || '').replace(/^#\/?/, ''), q = raw.indexOf('?');
    var id = q < 0 ? raw : raw.slice(0, q);
    var params = new URLSearchParams(q < 0 ? '' : raw.slice(q + 1));
    return { page: PAGES[id] ? id : 'login', path: '/' + (params.get('p') || '').replace(/^\/+|\/+$/g, '') };
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
    return h('aside', { className: 'drawer', 'aria-label': 'Navigation' },
      h('div', { className: 'drawer-brand' }, h(O.LogoSlot, { src: LOGO, alt: 'nDashboard', width: 48, height: 48 }), h('b', null, 'nDashboard')),
      h('div', { className: 'op-label', style: { margin: '12px 0 4px' } }, 'Navigation'),
      DRAWER.map(function (d) {
        return h(O.NavButton, { key: d[0], icon: d[1], meta: d[3], active: props.page === d[0], onClick: function () { props.onNavigate(d[0]); } }, d[2]);
      }),
      h('div', { className: 'spacer' }),
      h(O.ListItem, { icon: 'user', title: 'Operator 2231', subtitle: 'Freigabe L3' }),
      h(O.Button, { variant: 'ghost', icon: 'settings', onClick: function () { props.onNavigate('settings'); } }, 'Einstellungen'),
      h(O.Button, { variant: 'ghost', icon: 'lock', onClick: function () { props.onNavigate('login'); } }, 'Abmelden'));
  }

  /** Platzhalter für Bereiche, die (noch) nicht angebunden sind. */
  function Unavailable(props) {
    return h(O.Panel, { key: props.k, variant: 'outlined', mutedCorners: true, title: props.title, icon: props.icon },
      h(O.Status, { tone: 'neutral' }, 'Nicht verfügbar'),
      h('p', { style: { margin: '8px 0 0', color: 'var(--ink-muted)' } }, props.text));
  }

  /* ---------- Seiten ---------- */
  function Login() {
    return h('div', { className: 'login op-grid-bg' },
      h('div', { className: 'spacer' }),
      h(O.Panel, { variant: 'framed', className: 'login-card' },
        h('div', { className: 'op-col', style: { alignItems: 'center', gap: 14 } },
          h(O.LogoSlot, { src: LOGO, alt: 'nDashboard', width: 80, height: 80 }),
          h('div', { className: 'op-mono', style: { color: 'var(--signal)' } }, 'SYSTEM ONLINE'),
          h('div', { style: { fontSize: 20, fontWeight: 600, letterSpacing: '.1em' } }, 'BENUTZER-ANMELDUNG')),
        h('form', { className: 'op-col', style: { gap: 14, marginTop: 20 }, onSubmit: function (e) { e.preventDefault(); go('home'); } },
          h(O.TextField, { label: 'Name', placeholder: 'Operator-Name' }),
          h(O.TextField, { label: 'Zugangscode', type: 'password', placeholder: '••••••••••••' }),
          h(O.Toggle, { label: 'Gerät merken' }),
          h(O.Button, { icon: 'lock', type: 'submit' }, 'Anmelden'))),
      h('div', { className: 'hint' }, 'Sitzung verschlüsselt · AES-256'),
      h('div', { className: 'spacer' }));
  }

  function Home() {
    return [
      h(O.TitleBar, { key: 't', size: 'lg' }, 'Dashboard'),
      h('div', { key: 's', className: 'op-label', style: { marginTop: -8 } }, 'Deine Organisation · V. 01'),
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

  function Control() {
    return [
      h(O.StatTile, { key: 't', icon: 'temp', label: 'Lokale Temperatur', value: '27', unit: '°C', level: .45, gaugeHeight: 48 }),
      h('div', { key: 'g', className: 'g2' }, h(O.StatTile, { label: 'Integrität', value: '99.7%' }), h(O.StatTile, { label: 'Energie', value: 'Stabil' })),
      h(O.Panel, { key: 'c', title: 'Reaktorkern', icon: 'chart' }, h(O.AreaChart, { data: [50, 52, 51, 55, 60, 59, 62, 64, 60, 52, 44, 36], min: 0, max: 80, fillFrom: .45, height: 130 })),
      h('div', { key: 'n', className: 'op-col' },
        h(O.NavButton, { icon: 'power' }, 'Energiesteuerung'),
        h(O.NavButton, { icon: 'chart', active: true }, 'Systemstatus'),
        h(O.NavButton, { icon: 'map' }, 'Standortsteuerung')),
      h(O.Panel, { key: 'l', variant: 'outlined', mutedCorners: true, title: 'Ereignisprotokoll' },
        h(O.EventLog, { items: [{ text: 'Verschlüsselungsalgorithmus entsperrt', time: '18:42:33' }, { text: 'Befehl -control- aufgerufen', time: '18:42:35' }] }))
    ];
  }

  function Sensors() {
    return [
      h(O.Alert, { key: 'a', tone: 'danger', title: 'Nordkorridor' }, 'Ungeplante Bewegung um 01:27.'),
      h('div', { key: 'g', className: 'g2' }, h(O.StatTile, { label: 'Auslösungen / 1 h', value: '7' }), h(O.StatTile, { label: 'Latenz', value: '12', unit: 'ms' })),
      h(O.Panel, { key: 'c', title: 'Aktivität · 60 min', icon: 'chart' }, h(O.AreaChart, { data: [2, 3, 2, 4, 3, 5, 9, 14, 11, 6, 4, 3, 5, 8, 12, 18, 15, 9, 6, 4], min: 0, max: 20, height: 120, band: [.7, .85] })),
      h('div', { key: 'l' }, [['Nordkorridor', 'danger', 'Bewegung'], ['Tor 16', 'warn', 'Geringe Aktivität'], ['Serverraum', 'ok', 'Frei'], ['Lobby', 'ok', 'Frei']].map(function (z) {
        return h(O.ListItem, { key: z[0], icon: 'sensor', title: z[0], end: h(O.Status, { tone: z[1] }, z[2]) });
      })),
      h(O.Panel, { key: 'k', variant: 'outlined', mutedCorners: true, title: 'Steuerung' },
        h('div', { className: 'op-col', style: { gap: 12 } },
          h(O.Toggle, { defaultChecked: true, label: 'Außenbereich' }), h(O.Toggle, { defaultChecked: true, label: 'Innenbereich' }), h(O.Toggle, { label: 'Stiller Alarm' })))
    ];
  }

  function Security() {
    return [
      h(O.Panel, { key: 'p', variant: 'framed' },
        h('div', { className: 'op-row', style: { justifyContent: 'space-between', flexWrap: 'nowrap' } },
          h('div', null,
            h('div', { className: 'op-label' }, 'Bedrohungsstufe'),
            h('div', { style: { fontSize: 40, lineHeight: '44px', fontWeight: 600, letterSpacing: '.06em' } }, 'SICHER'),
            h(O.Status, { tone: 'ok' }, 'Keine aktiven Vorfälle')),
          h(O.RadarChart, { size: 110, values: [.3, .2, .6, .25, .35, .2] }))),
      h('div', { key: 's', className: 'g2' }, h(O.StatTile, { label: 'Personal', value: '448' }), h(O.StatTile, { label: 'Sicherheitsindex', value: '78', unit: '%' })),
      h(Unavailable, { key: 'c', title: 'Kameras', icon: 'camera', text: 'Die Kameraansicht ist in dieser Version nicht verfügbar.' }),
      h(O.Panel, { key: 'l', variant: 'outlined', mutedCorners: true, title: 'Ereignisprotokoll' },
        h(O.EventLog, { rail: true, items: [{ text: 'Alle Systeme betriebsbereit', time: '01:26' }, { text: 'Zugang an Tor 16 verweigert', time: '01:25', tone: 'warn' }] })),
      h(O.Button, { key: 'b', variant: 'danger', icon: 'lock' }, 'Lockdown einleiten')
    ];
  }

  function Banking() {
    return h(Unavailable, { title: 'Banking', icon: 'bank', text: 'Konten und Umsätze sind in dieser Version nicht verfügbar.' });
  }

  function Management() {
    return [
      h('div', { key: 'g', className: 'g2 tiles-desktop' },
        h(O.StatTile, { label: 'Umsatz', value: '1.28', unit: 'M€', delta: '▲ 8.4%', deltaTone: 'ok' }),
        h(O.StatTile, { label: 'Mitarbeitende', value: '64', delta: '+3', deltaTone: 'neutral' }),
        h(O.StatTile, { label: 'Offene Aufgaben', value: '137' }),
        h(O.StatTile, { label: 'Verfügbarkeit', value: '99.98%' })),
      h(O.Panel, { key: 'c', variant: 'framed', corners: false, title: 'Umsatz · wöchentlich', icon: 'chart' },
        h(O.AreaChart, { data: [62, 70, 68, 75, 80, 78, 88, 92, 90, 97, 104, 110], min: 40, max: 120, height: 120, format: function (v) { return v + 'k'; } })),
      h(O.Panel, { key: 'p', variant: 'outlined', mutedCorners: true, title: 'Projekte' },
        h('div', { className: 'op-col', style: { gap: 14 } },
          h(O.ProgressBar, { label: 'Standorterweiterung', value: .68 }),
          h(O.ProgressBar, { label: 'App-Release 2.0', value: .9 }),
          h(O.ProgressBar, { label: 'Audit', value: .32, tone: 'warn', valueText: '32% · verspätet' }))),
      h('div', { key: 'l' },
        h(O.ListItem, { icon: 'user', title: 'A. Keller', subtitle: 'Betrieb · 12 Aufgaben', end: h(O.Status, { tone: 'ok' }, 'Verfügbar') }),
        h(O.ListItem, { icon: 'user', title: 'M. Novak', subtitle: 'Technik · 21 Aufgaben', end: h(O.Status, { tone: 'warn' }, 'Überlastet') }))
    ];
  }

  function News() {
    return [
      h(O.Tabs, { key: 't', items: [{ id: 'a', label: 'Alle' }, { id: 'o', label: 'Betrieb' }, { id: 's', label: 'Sicherheit' }, { id: 'r', label: 'Forschung' }] }),
      h(O.Panel, { key: 'b', variant: 'framed' },
        h(O.Badge, { solid: true }, 'Eilmeldung'),
        h('h2', { style: { fontSize: 22, lineHeight: '28px', fontWeight: 500, letterSpacing: '.03em', margin: '10px 0 6px' } }, 'Übung für die gesamte Anlage am Freitag, 14:00'),
        h('p', { style: { color: 'var(--ink-muted)', margin: 0 } }, 'Alle Mitarbeitenden begeben sich zu ihren zugewiesenen Sammelpunkten.'),
        h('div', { className: 'op-mono', style: { color: 'var(--ink-faint)', marginTop: 10, fontSize: 11 } }, 'Einsatzleitung · 09:00')),
      [['Betrieb', 'Wartung in Sektor B vorzeitig abgeschlossen', '08:12'], ['Sicherheit', 'Neue Zugriffsrichtlinie für gesperrte Archive', '07:40'], ['Forschung', 'Ausbau des Sensornetzes geht in Phase zwei', 'Gestern']].map(function (n) {
        return h(O.Panel, { key: n[1], variant: 'outlined', mutedCorners: true },
          h('div', { className: 'op-row', style: { justifyContent: 'space-between' } }, h('span', { className: 'op-label' }, n[0]), h('span', { className: 'op-mono', style: { color: 'var(--ink-faint)', fontSize: 11 } }, n[2])),
          h('h3', { style: { fontSize: 16, lineHeight: '22px', fontWeight: 600, letterSpacing: '.03em', margin: '6px 0 0' } }, n[1]));
      })
    ];
  }

  function Chat() {
    return [
      h(O.TextField, { key: 's', placeholder: 'Suchen…', 'aria-label': 'Kanäle suchen' }),
      h('div', { key: 'l' }, [['Leitstelle', 'Verstanden. Warte auf Freigabe.', '01:25', '2'], ['Team B', 'Position wird gehalten.', '01:20', ''], ['Sicherheitsdienst', 'Bericht Tor 16 angehängt', '00:58', '3'], ['Technik', 'Generatortest bestanden', 'Gestern', ''], ['A. Keller', 'Bis zur Besprechung', 'Gestern', '']].map(function (c, i) {
        return h(O.ListItem, { key: c[0], icon: 'chat', title: c[0], subtitle: c[1], selected: i === 0, onClick: function () { go('conversation'); },
          meta: h('span', { style: { fontSize: 11, color: 'var(--ink-faint)' } }, c[2]), end: c[3] ? h(O.Badge, { solid: true }, c[3]) : null });
      }))
    ];
  }

  function Conversation() {
    var msgs = [
      { a: 'Leitstelle', t: '01:24', x: 'Team B, Position an Tor 16 bestätigen.' },
      { me: 1, t: '01:25', x: 'Bestätigt. Wir halten am Nordkorridor.' },
      { a: 'Leitstelle', t: '01:25', x: 'Verstanden. Warten auf Freigabe.' },
      { a: 'J. Ortiz', t: '01:26', x: 'Kamera 07 zeigt Bewegung, sende Clip.' }];
    return h('div', { className: 'op-col', style: { gap: 12, flex: 1, justifyContent: 'flex-end' } }, msgs.map(function (m, i) {
      return h(O.ChatMessage, { key: i, from: m.me ? 'me' : 'them', author: m.a, time: m.t }, m.x);
    }));
  }

  function NasSettings() {
    var cfg = NAS.config() || {};
    var url = React.useState(cfg.url || 'http://'), user = React.useState(cfg.user || ''), pass = React.useState(cfg.pass || '');
    var state = React.useState(null);
    function values() { return { url: url[0].trim().replace(/\/+$/, ''), user: user[0].trim(), pass: pass[0] }; }
    function test(e) {
      e.preventDefault();
      var v = values();
      if (!/^https?:\/\/[^/]+/.test(v.url)) return state[1]({ tone: 'danger', text: 'Adresse muss mit http:// oder https:// beginnen.' });
      var previous = NAS.config();
      NAS.save(v);
      state[1]({ tone: 'info', text: 'Verbinde …' });
      NAS.list('/').then(function (d) {
        state[1]({ tone: 'ok', text: 'Verbunden · ' + d.items.length + ' Einträge im Hauptordner. Gespeichert.' });
      }, function (err) {
        if (previous) NAS.save(previous);
        state[1]({ tone: 'danger', text: err.message + ' Nicht gespeichert.' });
      });
    }
    return h(O.Panel, { key: 'nas', variant: 'framed', title: 'NAS-Verbindung', icon: 'folder' },
      h('form', { className: 'op-col', style: { gap: 14 }, onSubmit: test },
        h(O.TextField, { label: 'Adresse', value: url[0], onChange: function (e) { url[1](e.target.value); }, placeholder: 'http://192.168.1.42:5005', inputMode: 'url', autoComplete: 'off', spellCheck: false,
          hint: 'Wird von nas-server.py beim Start angezeigt.' }),
        h(O.TextField, { label: 'Benutzer', value: user[0], onChange: function (e) { user[1](e.target.value); }, autoComplete: 'username' }),
        h(O.TextField, { label: 'Passwort', type: 'password', value: pass[0], onChange: function (e) { pass[1](e.target.value); }, autoComplete: 'current-password' }),
        h('div', { className: 'op-row' },
          h(O.Button, { type: 'submit', icon: 'signal' }, 'Verbinden & speichern'),
          NAS.configured() ? h(O.Button, { variant: 'ghost', onClick: function () { location.hash = '#/files'; } }, 'Zu den Dateien') : null),
        state[0] ? h(O.Status, { tone: state[0].tone }, state[0].text) : null,
        h('div', { className: 'op-field-hint' }, 'Die Zugangsdaten werden nur auf diesem Gerät gespeichert.')));
  }

  function Settings() {
    return [
      h(NasSettings, { key: 'nas' }),
      h(O.Panel, { key: 'b', variant: 'outlined', mutedCorners: true, title: 'App', icon: 'settings' },
        h('div', { className: 'op-col', style: { gap: 12 } }, h(O.Toggle, { defaultChecked: true, label: 'Benachrichtigungen' }), h(O.Toggle, { defaultChecked: true, label: 'Kompakte Ansicht' }))),
      h(O.Panel, { key: 'c', variant: 'outlined', mutedCorners: true, title: 'Info' },
        h(O.InfoList, { items: [{ label: 'Version', value: '0.2.0' }, { label: 'Design', value: 'Terminal Ops' }] }))
    ];
  }

  function FilesPage(props) { return h(FilesUI.Browser, { path: props.path }); }
  function FilePage(props) { return h(FilesUI.Viewer, { path: props.path }); }

  var RENDER = { home: Home, control: Control, files: FilesPage, file: FilePage, sensors: Sensors, security: Security, banking: Banking,
    management: Management, news: News, chat: Chat, conversation: Conversation, settings: Settings };

  /* ---------- App-Hülle ---------- */
  function App() {
    var rt = React.useState(currentRoute()), page = rt[0].page, path = rt[0].path;
    var dr = React.useState(false), drawerOpen = dr[0];
    var desktop = useMedia('(min-width: 900px)');
    var bodyRef = React.useRef(null);

    React.useEffect(function () {
      function on() { rt[1](currentRoute()); dr[1](false); if (bodyRef.current) bodyRef.current.scrollTop = 0; }
      window.addEventListener('hashchange', on);
      return function () { window.removeEventListener('hashchange', on); };
    }, []);

    if (page === 'login') return h('div', { className: 'app op-compact' }, h(Login));

    var meta = PAGES[page];
    var isFiles = page === 'files' || page === 'file';
    var root = page === 'files' ? path === '/' : meta.root;
    var drawer = h(Drawer, { page: isFiles ? 'files' : page, onNavigate: go });
    var showMenu = root && !desktop;
    var bar = h(O.AppBar, {
      onMenu: showMenu ? function () { dr[1](true); } : undefined,
      onBack: !root ? (page === 'files' ? function () { location.hash = '#/files?p=' + encodeURIComponent(NAS.parent(path)); } : back) : undefined,
      logo: page === 'home' && !desktop ? h(O.LogoSlot, { src: LOGO_SMALL, alt: 'nDashboard', width: 36, height: 36 }) : null,
      title: page === 'home' ? (desktop ? 'Start' : null) : page === 'file' ? path.slice(path.lastIndexOf('/') + 1) : meta.title,
      subtitle: isFiles ? (page === 'file' ? NAS.parent(path) : path) : meta.sub,
      end: isFiles ? IconBtn('settings', 'NAS-Einstellungen', function () { go('settings'); }) : page === 'conversation' ? IconBtn('more', 'Mehr') : page === 'control' ? IconBtn('close', 'Schließen', back) : IconBtn('alert', 'Meldungen')
    });
    var footer = page === 'conversation'
      ? h('div', { className: 'app-footer' }, h(O.CommandInput, { showPrompt: false, placeholder: 'Nachricht schreiben…', label: 'Nachricht', onSubmit: noop }))
      : h(O.BottomNav, { value: meta.nav, items: BOTTOM, onChange: function (id) { if (id === 'more') dr[1](true); else go(BOTTOM_TARGET[id]); } });

    return h('div', { className: 'app' + (desktop ? ' is-desktop' : ' op-compact') },
      desktop ? drawer : null,
      h('div', { className: 'app-main' },
        bar,
        h('main', { className: 'app-body op-grid-bg', ref: bodyRef }, h('div', { className: 'app-body-inner' + (page === 'file' ? ' app-body-fill' : '') }, h(RENDER[page], { path: path }))),
        footer),
      h(FilesUI.Toast),
      drawerOpen && !desktop ? h('div', { className: 'drawer-scrim' }, drawer, h('button', { className: 'drawer-scrim-dim', 'aria-label': 'Menü schließen', onClick: function () { dr[1](false); } })) : null);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
