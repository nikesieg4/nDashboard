/* nDashboard — Seiten „Dateien“ (Ordner auf dem NAS) und „Datei“ (Editor/Vorschau). */
(function () {
  var O = window.Ops, h = React.createElement, NAS = window.NAS;
  var KIND_ICON = { folder: 'folder', image: 'camera', video: 'camera', audio: 'signal', pdf: 'file', text: 'file', other: 'file' };
  var TABS = [{ id: 'all', label: 'Alle' }, { id: 'folder', label: 'Ordner' }, { id: 'docs', label: 'Dokumente' }, { id: 'media', label: 'Medien' }];
  var TEXT_LIMIT = 2 * 1024 * 1024;

  function filesUrl(path) { return '#/files?p=' + encodeURIComponent(path); }
  function fileUrl(path) { return '#/file?p=' + encodeURIComponent(path); }
  function open(item) { location.hash = item.dir ? filesUrl(item.path) : fileUrl(item.path); }

  /* ---------- Kleine Bausteine ---------- */
  var toastListeners = [];
  function toast(text, tone) { toastListeners.forEach(function (fn) { fn({ text: text, tone: tone || 'ok', id: Date.now() }); }); }
  function Toast() {
    var st = React.useState(null);
    React.useEffect(function () {
      var fn = function (t) { st[1](t); setTimeout(function () { st[1](function (cur) { return cur && cur.id === t.id ? null : cur; }); }, 3500); };
      toastListeners.push(fn);
      return function () { toastListeners.splice(toastListeners.indexOf(fn), 1); };
    }, []);
    if (!st[0]) return null;
    return h('div', { className: 'toast', role: 'status' }, h(O.Status, { tone: st[0].tone }, st[0].text));
  }

  /** Modaler Dialog: Eingabe (prompt), Bestätigung (confirm) oder Aktionsliste (actions). */
  function Dialog(props) {
    var d = props.dialog, val = React.useState(d.value || ''), inputRef = React.useRef(null);
    React.useEffect(function () {
      if (inputRef.current) { inputRef.current.focus(); var dot = (d.value || '').lastIndexOf('.'); inputRef.current.setSelectionRange(0, dot > 0 ? dot : (d.value || '').length); }
      function onKey(e) { if (e.key === 'Escape') props.onClose(); }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, []);
    function submit(e) { e.preventDefault(); props.onClose(); d.onOk(val[0].trim()); }
    var body;
    if (d.type === 'actions') {
      body = h('div', { className: 'op-col' }, d.actions.map(function (a) {
        return h(O.NavButton, { key: a.label, icon: a.icon, onClick: function () { props.onClose(); a.run(); } }, a.label);
      }));
    } else {
      body = h('form', { className: 'op-col', style: { gap: 16 }, onSubmit: submit },
        d.text ? h('p', { style: { margin: 0, color: 'var(--ink-muted)' } }, d.text) : null,
        d.type === 'prompt' ? h('label', { className: 'op-field' },
          h('span', { className: 'op-label' }, d.label),
          h('input', { ref: inputRef, value: val[0], onChange: function (e) { val[1](e.target.value); }, autoComplete: 'off', spellCheck: false })) : null,
        h('div', { className: 'op-row', style: { justifyContent: 'flex-end' } },
          h(O.Button, { variant: 'ghost', onClick: props.onClose }, 'Abbrechen'),
          h(O.Button, { type: 'submit', variant: d.danger ? 'danger' : 'primary', icon: d.okIcon }, d.ok || 'OK')));
    }
    return h('div', { className: 'modal-scrim', onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
      h(O.Panel, { variant: 'framed', title: d.title, className: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': d.title }, body));
  }

  function Crumbs(props) {
    var parts = props.path.split('/').filter(Boolean), acc = '';
    return h('nav', { className: 'crumbs op-mono', 'aria-label': 'Pfad' },
      h('a', { href: filesUrl('/') }, 'nas:'),
      parts.map(function (p, i) {
        acc += '/' + p;
        return [h('span', { key: 's' + i, 'aria-hidden': 'true' }, '/'),
          i === parts.length - 1 ? h('span', { key: 'p' + i, className: 'crumbs-here' }, p) : h('a', { key: 'a' + i, href: filesUrl(acc) }, p)];
      }));
  }

  function NotConfigured() {
    return h(O.Panel, { variant: 'framed', title: 'NAS nicht verbunden', icon: 'folder' },
      h('p', { style: { margin: '0 0 16px', color: 'var(--ink-muted)' } },
        'Trage unter Einstellungen die Adresse deines NAS ein, z. B. http://192.168.1.42:5005 – die zeigt nas-server.py beim Start an.'),
      h(O.Button, { icon: 'settings', onClick: function () { location.hash = '#/settings'; } }, 'NAS einrichten'));
  }

  function matchesTab(item, tab) {
    if (tab === 'folder') return item.dir;
    if (tab === 'docs') return ['text', 'pdf', 'other'].indexOf(item.kind) >= 0;
    if (tab === 'media') return ['image', 'video', 'audio'].indexOf(item.kind) >= 0;
    return true;
  }

  /* ---------- Ordneransicht ---------- */
  function Browser(props) {
    var path = props.path;
    var data = React.useState(null), err = React.useState(null), busy = React.useState(false);
    var query = React.useState(''), tab = React.useState('all'), dialog = React.useState(null), uploads = React.useState(null);
    var fileInput = React.useRef(null);

    function reload() {
      busy[1](true); err[1](null);
      return NAS.list(path).then(function (d) { data[1](d); }, function (e) { err[1](e.message); }).then(function () { busy[1](false); });
    }
    React.useEffect(function () { data[1](null); query[1](''); if (NAS.configured()) reload(); }, [path]);

    if (!NAS.configured()) return h(NotConfigured);

    function run(promise, okText) {
      return promise.then(function () { if (okText) toast(okText); return reload(); }, function (e) { toast(e.message, 'danger'); });
    }
    function exists(name) { return data[0] && data[0].items.some(function (i) { return i.name === name; }); }
    function askName(title, label, value, ok, then) {
      dialog[1]({ type: 'prompt', title: title, label: label, value: value, ok: ok, onOk: function (name) {
        if (!NAS.validName(name)) return toast('Ungültiger Name.', 'danger');
        if (name !== value && exists(name)) return toast('„' + name + '“ existiert bereits.', 'danger');
        if (name !== value) then(name);
      } });
    }
    function newFolder() { askName('Neuer Ordner', 'Name', '', 'Anlegen', function (n) { run(NAS.mkdir(NAS.join(path, n)), 'Ordner angelegt'); }); }
    function newFile() {
      askName('Neue Textdatei', 'Dateiname', 'notiz.txt', 'Anlegen', function (n) {
        NAS.writeText(NAS.join(path, n), '').then(function () { location.hash = fileUrl(NAS.join(path, n)); }, function (e) { toast(e.message, 'danger'); });
      });
    }
    function rename(item) { askName('Umbenennen', 'Neuer Name', item.name, 'Umbenennen', function (n) { run(NAS.move(item.path, NAS.join(path, n)), 'Umbenannt'); }); }
    function moveTo(item) {
      dialog[1]({ type: 'prompt', title: 'Verschieben', label: 'Zielordner (z. B. /archiv/2026)', value: path, ok: 'Verschieben', onOk: function (dest) {
        dest = '/' + dest.replace(/^\/+|\/+$/g, '');
        if (dest === path) return;
        if (!item.dir || (dest + '/').indexOf(item.path + '/') !== 0) run(NAS.move(item.path, NAS.join(dest, item.name)), 'Verschoben nach ' + dest);
        else toast('Ein Ordner kann nicht in sich selbst verschoben werden.', 'danger');
      } });
    }
    function del(item) {
      dialog[1]({ type: 'confirm', title: 'Löschen', danger: true, ok: 'Löschen', okIcon: 'close',
        text: item.dir ? 'Ordner „' + item.name + '“ samt Inhalt endgültig löschen?' : '„' + item.name + '“ endgültig löschen?',
        onOk: function () { run(NAS.remove(item.path), 'Gelöscht'); } });
    }
    function download(item) {
      toast('Lade „' + item.name + '“ …', 'info');
      NAS.download(item).then(function () { toast('„' + item.name + '“ gespeichert'); }, function (e) { toast(e.message, 'danger'); });
    }
    function actions(item) {
      var list = [{ label: item.dir ? 'Öffnen' : 'Öffnen / Bearbeiten', icon: item.dir ? 'folder' : 'file', run: function () { open(item); } }];
      if (!item.dir) list.push({ label: 'Herunterladen', icon: 'download', run: function () { download(item); } });
      list.push({ label: 'Umbenennen', icon: 'settings', run: function () { rename(item); } },
        { label: 'Verschieben', icon: 'send', run: function () { moveTo(item); } },
        { label: 'Löschen', icon: 'close', run: function () { del(item); } });
      dialog[1]({ type: 'actions', title: item.name, actions: list });
    }
    function onPick(e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      var done = 0;
      uploads[1]({ name: files[0].name, value: 0, count: files.length });
      files.reduce(function (p, f) {
        return p.then(function () {
          uploads[1]({ name: f.name, value: done / files.length, count: files.length });
          return NAS.upload(NAS.join(path, f.name), f, function (v) { uploads[1]({ name: f.name, value: (done + v) / files.length, count: files.length }); })
            .then(function () { done++; });
        });
      }, Promise.resolve())
        .then(function () { toast(files.length === 1 ? '„' + files[0].name + '“ hochgeladen' : files.length + ' Dateien hochgeladen'); },
          function (e) { toast(e.message, 'danger'); })
        .then(function () { uploads[1](null); reload(); });
    }

    var items = data[0] ? data[0].items.filter(function (i) {
      return matchesTab(i, tab[0]) && (!query[0] || i.name.toLowerCase().indexOf(query[0].toLowerCase()) >= 0);
    }) : [];
    var quota = data[0] && data[0].quota;

    return [
      h(Crumbs, { key: 'c', path: path }),
      h('div', { key: 's', className: 'op-row', style: { flexWrap: 'nowrap' } },
        h('div', { style: { flex: 1 } }, h(O.TextField, { placeholder: 'In diesem Ordner suchen…', 'aria-label': 'Suchen', value: query[0], onChange: function (e) { query[1](e.target.value); } })),
        h(O.Button, { icon: 'upload', 'aria-label': 'Hochladen', title: 'Hochladen', onClick: function () { fileInput.current.click(); } }),
        h(O.Button, { icon: 'plus', variant: 'outline', 'aria-label': 'Neu', title: 'Neu', onClick: function () {
          dialog[1]({ type: 'actions', title: 'Neu', actions: [
            { label: 'Ordner', icon: 'folder', run: newFolder }, { label: 'Textdatei', icon: 'file', run: newFile },
            { label: 'Dateien hochladen', icon: 'upload', run: function () { fileInput.current.click(); } }] });
        } }),
        h('input', { ref: fileInput, type: 'file', multiple: true, hidden: true, onChange: onPick })),
      h(O.Tabs, { key: 't', items: TABS, value: tab[0], onChange: tab[1] }),
      uploads[0] ? h(O.ProgressBar, { key: 'u', label: 'Upload' + (uploads[0].count > 1 ? ' (' + uploads[0].count + ' Dateien)' : '') + ': ' + uploads[0].name, value: uploads[0].value }) : null,
      err[0] ? h(O.Alert, { key: 'e', tone: 'danger', title: 'Fehler' }, err[0], ' ', h('button', { className: 'link-btn', onClick: reload }, 'Erneut versuchen')) : null,
      !data[0] && busy[0] ? h('div', { key: 'l', className: 'hint' }, 'Lade Ordner …') : null,
      data[0] ? h('div', { key: 'list', className: 'file-list' },
        path !== '/' ? h(O.ListItem, { key: '..', icon: 'back', title: '..', subtitle: 'Übergeordneter Ordner', onClick: function () { location.hash = filesUrl(NAS.parent(path)); } }) : null,
        items.length === 0 ? h('div', { key: 'empty', className: 'hint', style: { padding: 24 } }, query[0] ? 'Keine Treffer.' : 'Dieser Ordner ist leer.') : null,
        items.map(function (item) {
          return h('div', { key: item.name, className: 'file-row' },
            h(O.ListItem, { icon: KIND_ICON[item.kind], title: item.name, onClick: function () { open(item); },
              subtitle: (item.dir ? 'Ordner' : NAS.formatSize(item.size)) + (item.modified ? ' · ' + NAS.formatDate(item.modified) : '') }),
            h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Aktionen für ' + item.name, onClick: function () { actions(item); } }, h(O.Icon, { name: 'more' })));
        })) : null,
      quota ? h(O.ProgressBar, { key: 'q', label: 'Speicher', value: quota.used / (quota.used + quota.free),
        valueText: Math.round(100 * quota.used / (quota.used + quota.free)) + '% · ' + NAS.formatSize(quota.free) + ' frei', tone: quota.free / (quota.used + quota.free) < .1 ? 'warn' : undefined }) : null,
      dialog[0] ? h(Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* ---------- Datei: Editor oder Vorschau ---------- */
  function Viewer(props) {
    var path = props.path, name = path.slice(path.lastIndexOf('/') + 1);
    var item = { name: name, path: path, dir: false };
    item.kind = NAS.kind(item);
    var text = React.useState(null), original = React.useState(null), blobUrl = React.useState(null);
    var err = React.useState(null), saving = React.useState(false), tooBig = React.useState(false);

    React.useEffect(function () {
      if (!NAS.configured()) return;
      var revoke = null;
      if (item.kind === 'text') {
        NAS.readBlob(path).then(function (b) {
          if (b.size > TEXT_LIMIT) { tooBig[1](true); return; }
          return b.text().then(function (t) { text[1](t); original[1](t); });
        }).catch(function (e) { err[1](e.message); });
      } else if (['image', 'video', 'audio', 'pdf'].indexOf(item.kind) >= 0) {
        NAS.readBlob(path).then(function (b) { revoke = URL.createObjectURL(b); blobUrl[1](revoke); }).catch(function (e) { err[1](e.message); });
      }
      return function () { if (revoke) URL.revokeObjectURL(revoke); };
    }, [path]);

    var dirty = text[0] !== null && text[0] !== original[0];
    function saveFile() {
      if (!dirty || saving[0]) return;
      saving[1](true);
      var value = text[0];
      NAS.writeText(path, value).then(function () { original[1](value); toast('Gespeichert'); }, function (e) { toast(e.message, 'danger'); })
        .then(function () { saving[1](false); });
    }
    // Strg+S speichert; beim Verlassen mit ungespeicherten Änderungen warnen
    React.useEffect(function () {
      function onKey(e) { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); } }
      function onLeave(e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
      window.addEventListener('keydown', onKey);
      window.addEventListener('beforeunload', onLeave);
      return function () { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onLeave); };
    });

    if (!NAS.configured()) return h(NotConfigured);
    function download() { NAS.download(item).then(function () { toast('„' + name + '“ gespeichert'); }, function (e) { toast(e.message, 'danger'); }); }

    var toolbar = h('div', { key: 'tb', className: 'op-row' },
      item.kind === 'text' && !tooBig[0] ? h(O.Button, { icon: 'download', disabled: !dirty || saving[0], onClick: saveFile }, saving[0] ? 'Speichert …' : dirty ? 'Speichern' : 'Gespeichert') : null,
      item.kind === 'text' && dirty ? h(O.Button, { variant: 'ghost', onClick: function () { text[1](original[0]); } }, 'Verwerfen') : null,
      h(O.Button, { variant: 'outline', icon: 'download', onClick: download }, 'Herunterladen'),
      h('div', { className: 'spacer' }),
      dirty ? h(O.Status, { tone: 'warn' }, 'Ungespeichert') : null);

    var content;
    if (err[0]) content = h(O.Alert, { tone: 'danger', title: 'Fehler' }, err[0]);
    else if (tooBig[0]) content = h(O.Alert, { tone: 'warn', title: 'Datei zu groß' }, 'Textdateien über 2 MB lassen sich nicht in der App bearbeiten. Lade sie herunter.');
    else if (item.kind === 'text') content = text[0] === null ? h('div', { className: 'hint' }, 'Lade …')
      : h('textarea', { className: 'editor', value: text[0], spellCheck: false, 'aria-label': 'Inhalt von ' + name, onChange: function (e) { text[1](e.target.value); } });
    else if (!blobUrl[0] && item.kind !== 'other') content = h('div', { className: 'hint' }, 'Lade …');
    else if (item.kind === 'image') content = h(O.Panel, { variant: 'framed', className: 'preview' }, h('img', { src: blobUrl[0], alt: name }));
    else if (item.kind === 'video') content = h(O.Panel, { variant: 'framed', className: 'preview' }, h('video', { src: blobUrl[0], controls: true }));
    else if (item.kind === 'audio') content = h(O.Panel, { variant: 'framed' }, h('audio', { src: blobUrl[0], controls: true, style: { width: '100%' } }));
    else if (item.kind === 'pdf' && !window.NDNative) content = h(O.Panel, { variant: 'framed', className: 'preview preview-pdf' }, h('iframe', { src: blobUrl[0], title: name }));
    else content = h(O.Panel, { variant: 'outlined', mutedCorners: true }, h('p', { style: { margin: 0, color: 'var(--ink-muted)' } }, 'Für diesen Dateityp gibt es keine Vorschau. Lade die Datei herunter, um sie zu öffnen.'));

    return [toolbar, h('div', { key: 'c', className: 'viewer' }, content)];
  }

  window.NDFiles = { Browser: Browser, Viewer: Viewer, Toast: Toast, toast: toast, Dialog: Dialog };
})();
