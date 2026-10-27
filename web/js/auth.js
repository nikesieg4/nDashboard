/* nDashboard — Anmeldung für die Admin-Bereiche unter Management.
 * Ein Login meldet bei zwei Systemen an:
 *  - Bürgerportal (ABIS-Konsole): Supabase-Konto, z. B. „Administrator“ + Passwort
 *  - Disponenten-Simulator (Codes-Admin): admin_login mit dem eigenen Spiel-Passwort, das nur auf dem
 *    Gerät gespeichert ist (Einstellungen → Konten) und erst nach erfolgreichem Portal-Login benutzt wird
 * Sitzungen liegen nur im Speicher: Beim App-Neustart und nach 20 Minuten ohne Eingabe
 * fragt die App wieder nach dem Passwort. Ohne Internet geht es mit „Ohne Anmeldung weiter“
 * in die App – Dateien, Sensoren und Steuerung brauchen keinen Login. */
(function () {
  var M = window.NDPortalModel;
  var PORTAL = {
    url: 'https://tyfdwdzglguiiqbsttav.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZmR3ZHpnbGd1aWlxYnN0dGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjc0NTIsImV4cCI6MjA5NzgwMzQ1Mn0.d7LwJH1gsXgz_h0TrQLPX38uI6slf0IpeFwFXxe99Uc',
    aliases: { administrator: 'administrator@maiskolbistan.app', admin: 'administrator@maiskolbistan.app' }
  };
  var GAME = {
    url: 'https://virsphrwhskjquenyhsj.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcnNwaHJ3aHNranF1ZW55aHNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MzYzMTIsImV4cCI6MjEwNDAxMjMxMn0.THEjf23Z_amiHsN0uZ5eRQbM0oj7yG9DgNbjmu8bca8'
  };
  var IDLE_MIN = 20, SETTINGS = 'nd.accounts', TIMEOUT = 15000;

  // Öffentliche Schlüssel (dieselben wie Portal und Spiel) – geschützt wird über Anmeldung, RLS und admin_*-Funktionen
  var sb = window.supabase.createClient(PORTAL.url, PORTAL.key, { auth: { persistSession: false, autoRefreshToken: true } });

  var state = { unlocked: false, user: '', portal: null, portalError: null, game: null, gameError: null, notice: null };
  var listeners = [];
  function emit() { var s = snapshot(); listeners.forEach(function (fn) { fn(s); }); }
  function snapshot() { return Object.assign({}, state); }
  function set(patch) { Object.assign(state, patch); emit(); }

  /* ---------- Einstellungen (nur auf diesem Gerät) ---------- */
  function settings() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SETTINGS) || 'null'); } catch (e) { /* leer */ }
    s = Object.assign({ user: 'Administrator', gamePass: '' }, s || {});
    delete s.gamePrefix; // alte Version: nur Präfix gespeichert
    return s;
  }
  function saveSettings(patch) {
    try { localStorage.setItem(SETTINGS, JSON.stringify(Object.assign(settings(), patch))); } catch (e) { /* egal */ }
  }

  function withTimeout(promise) {
    return Promise.race([promise, new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, TIMEOUT); })]);
  }

  /* ---------- Bürgerportal ---------- */
  function normEmail(input) {
    var mail = String(input || '').trim().toLowerCase();
    return PORTAL.aliases[mail] || mail;
  }
  function loadProfile() {
    return sb.auth.getUser().then(function (r) {
      var user = r.data && r.data.user;
      if (!user) return null;
      return sb.from('profiles').select('*').eq('id', user.id).maybeSingle().then(function (p) {
        if (p.error) throw p.error;
        return p.data ? Object.assign({}, p.data, { email: user.email, uid: user.id, lastSignIn: user.last_sign_in_at }) : null;
      });
    });
  }
  /** Ergebnis: { ok, profile } oder { ok: false, reason, wrong (Passwort falsch), offline }. */
  function portalLogin(user, pass) {
    var mail = normEmail(user);
    if (mail.indexOf('@') < 0) return Promise.resolve({ ok: false, wrong: true, reason: 'Bitte die vollständige E-Mail-Adresse eingeben (oder „Administrator“).' });
    return withTimeout(sb.auth.signInWithPassword({ email: mail, password: pass })).then(function (res) {
      if (res.error) {
        var msg = String(res.error.message || '').toLowerCase();
        if (res.error.status === 0 || res.error.name === 'AuthRetryableFetchError') return { ok: false, offline: true, reason: 'Bürgerportal nicht erreichbar.' };
        if (msg.indexOf('not confirmed') >= 0) return { ok: false, reason: 'Das Portal-Konto ist noch nicht bestätigt.' };
        if (msg.indexOf('banned') >= 0) return { ok: false, reason: 'Das Portal-Konto ist gesperrt.' };
        if (msg.indexOf('rate') >= 0 || res.error.status === 429) return { ok: false, reason: 'Bürgerportal: zu viele Versuche, bitte später erneut.' };
        return { ok: false, wrong: true, reason: 'Benutzer oder Passwort ist falsch.' };
      }
      return loadProfile().then(function (p) {
        if (!p) { sb.auth.signOut(); return { ok: false, reason: 'Für dieses Portal-Konto ist kein Profil hinterlegt.' }; }
        if (!M.consoleAllowed(p)) { sb.auth.signOut(); return { ok: false, reason: 'Bürgerportal: Zugang nur für Administrator, Level 5/6 und ABIS.' }; }
        sb.rpc('abis_log_action', { p_action: 'Anmeldung an der Konsole (nDashboard)', p_target: null, p_detail: { ua: navigator.userAgent.slice(0, 160) } }).then(null, function () { /* optional */ });
        return { ok: true, profile: p };
      });
    }).catch(function () { return { ok: false, offline: true, reason: 'Bürgerportal nicht erreichbar.' }; });
  }

  /* ---------- Disponenten-Simulator ---------- */
  function gameFetch(fn, args) {
    return withTimeout(fetch(GAME.url + '/rest/v1/rpc/' + fn, { method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', apikey: GAME.key, Authorization: 'Bearer ' + GAME.key }, body: JSON.stringify(args || {}) }))
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (data) {
          if (!r.ok) throw new Error((data && (data.message || data.hint)) || 'Fehler ' + r.status);
          return data;
        });
      }, function () { throw Object.assign(new Error('Spiel-Server nicht erreichbar.'), { offline: true }); });
  }
  function gameLogin(pass) {
    if (!pass) return Promise.resolve({ ok: false, reason: 'Spiel: Passwort fehlt (Einstellungen → Konten).' });
    return gameFetch('admin_login', { p_password: pass }).then(function (r) {
      if (!r || r.error) return { ok: false, reason: 'Spiel: ' + ((r && r.error) || 'Anmeldung fehlgeschlagen') };
      return { ok: true, token: r.token, expires: r.expires_at };
    }, function (e) { return { ok: false, offline: !!e.offline, reason: e.offline ? e.message : 'Spiel: ' + e.message }; });
  }
  /** Aufruf einer admin_*-Funktion mit der aktuellen Sitzung. */
  function gameRpc(fn, args) {
    if (!state.game) return Promise.reject(new Error('Beim Spiel nicht angemeldet.'));
    return gameFetch(fn, Object.assign({ p_token: state.game.token }, args || {})).then(function (data) {
      if (data && data.error === 'Nicht angemeldet') {
        set({ game: null, gameError: 'Spiel-Sitzung abgelaufen, bitte neu anmelden.' });
        throw new Error('Spiel-Sitzung abgelaufen, bitte neu anmelden.');
      }
      return data;
    });
  }

  /* ---------- Anmelden / Abmelden ---------- */
  function applyPortal(r) { set({ portal: r.ok ? r.profile : null, portalError: r.ok ? null : r.reason }); }
  function applyGame(r) { set({ game: r.ok ? { token: r.token, expires: r.expires } : null, gameError: r.ok ? null : r.reason }); }

  /** Mit dem Portal-Konto anmelden. Erst wenn das klappt, meldet die App mit dem gespeicherten
   *  Spiel-Passwort auch beim Spiel an – sonst könnte jeder mit dem Gerät in den Codes-Admin. */
  function login(user, pass) {
    user = String(user || '').trim();
    return portalLogin(user, pass).then(function (p) {
      var stored = settings().gamePass;
      var g = !p.ok ? Promise.resolve({ ok: false, reason: 'Spiel: nicht angemeldet (erst nach Portal-Login).' })
        : stored ? gameLogin(stored) : Promise.resolve({ ok: false, reason: 'Spiel: Passwort unter Einstellungen → Konten eintragen.' });
      return g.then(function (gr) {
        if (p.ok) {
          saveSettings({ user: user });
          applyPortal(p); applyGame(gr);
          set({ unlocked: true, user: user, notice: null });
          touch();
        }
        return { ok: p.ok, portal: p, game: gr, offline: !!p.offline };
      });
    });
  }
  /** Nur ein System neu anmelden (z. B. nach Ablauf der Spiel-Sitzung). Ohne eingegebenes Passwort nimmt
   *  das Spiel das gespeicherte – aber nur, solange das Portal angemeldet ist. */
  function loginPortal(pass) { return portalLogin(state.user || settings().user, pass).then(function (r) { applyPortal(r); return r; }); }
  function loginGame(pass) {
    if (!pass && state.portal) pass = settings().gamePass;
    return gameLogin(pass).then(function (r) { applyGame(r); return r; });
  }

  function skip() { set({ unlocked: true, portal: null, game: null, portalError: 'Ohne Anmeldung gestartet.', gameError: 'Ohne Anmeldung gestartet.', notice: null }); touch(); }

  function logoutPortal() { if (state.portal) sb.auth.signOut().then(null, function () { /* egal */ }); set({ portal: null, portalError: 'Abgemeldet.' }); }
  function logoutGame() {
    if (state.game) gameFetch('admin_logout', { p_token: state.game.token }).then(null, function () { /* egal */ });
    set({ game: null, gameError: 'Abgemeldet.' });
  }
  function logout(notice) {
    logoutPortal(); logoutGame();
    set({ unlocked: false, notice: notice || null });
    location.hash = '#/login';
  }

  /* ---------- Automatische Abmeldung ---------- */
  var last = Date.now();
  function touch() { last = Date.now(); }
  ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(function (ev) { window.addEventListener(ev, touch, { passive: true, capture: true }); });
  function checkIdle() {
    if (state.unlocked && Date.now() - last > IDLE_MIN * 60000) logout('Nach ' + IDLE_MIN + ' Minuten ohne Eingabe automatisch abgemeldet.');
    if (state.game && new Date(state.game.expires).getTime() < Date.now()) set({ game: null, gameError: 'Spiel-Sitzung abgelaufen (2 Stunden), bitte neu anmelden.' });
  }
  setInterval(checkIdle, 15000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkIdle(); });

  // Abmeldung durch das Portal selbst (z. B. Konto gesperrt, Sitzung widerrufen)
  sb.auth.onAuthStateChange(function (event) { if (event === 'SIGNED_OUT' && state.portal) set({ portal: null, portalError: 'Vom Bürgerportal abgemeldet.' }); });

  function subscribe(fn) { listeners.push(fn); return function () { listeners.splice(listeners.indexOf(fn), 1); }; }
  /** Anmeldestand als React-Hook. */
  function useAuth() {
    var st = React.useState(snapshot());
    React.useEffect(function () { return subscribe(st[1]); }, []);
    return st[0];
  }

  /** Hinweis + Passwortfeld, wenn ein System (Portal oder Spiel) nicht angemeldet ist. */
  function SignIn(props) {
    var O = window.Ops, h = React.createElement;
    var pass = React.useState(''), busy = React.useState(false), err = React.useState(null);
    var game = props.system === 'game', a = useAuth(), useStored = game && a.portal && !!settings().gamePass;
    function submit(e) {
      e.preventDefault();
      busy[1](true); err[1](null);
      (game ? loginGame : loginPortal)(pass[0]).then(function (r) { busy[1](false); pass[1](''); if (!r.ok) err[1](r.reason); });
    }
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: props.title, icon: 'lock' },
      h(O.Status, { tone: 'neutral' }, 'Nicht angemeldet'),
      h('p', { style: { margin: '8px 0 12px', color: 'var(--ink-muted)' } }, (game ? a.gameError : a.portalError) || 'Bitte anmelden.'),
      h('form', { className: 'op-col', style: { gap: 12 }, onSubmit: submit },
        game ? null : h(O.TextField, { label: 'Benutzer', value: a.user || settings().user, readOnly: true, hint: 'Ändern unter Einstellungen → Konten oder über Abmelden.' }),
        h(O.TextField, { label: game ? 'Spiel-Passwort' : 'Passwort', type: 'password', value: pass[0], onChange: function (e) { pass[1](e.target.value); }, autoComplete: 'current-password',
          placeholder: useStored ? 'leer = gespeichertes Passwort' : null, hint: game ? 'Das Passwort des Codes-Admins (Disponenten-Simulator).' : null }),
        h('div', { className: 'op-row' }, h(O.Button, { type: 'submit', icon: 'lock', disabled: busy[0] || (!pass[0] && !useStored) }, busy[0] ? 'Prüfe …' : 'Anmelden')),
        err[0] ? h(O.Status, { tone: 'danger' }, err[0]) : null));
  }

  window.NDAuth = {
    state: snapshot, subscribe: subscribe, useAuth: useAuth, SignIn: SignIn,
    settings: settings, saveSettings: saveSettings, idleMinutes: IDLE_MIN,
    login: login, loginPortal: loginPortal, loginGame: loginGame, skip: skip, logout: logout, logoutPortal: logoutPortal, logoutGame: logoutGame,
    portal: sb, portalUrl: PORTAL.url, portalKey: PORTAL.key, gameRpc: gameRpc
  };
})();
