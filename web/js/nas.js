/* nDashboard — WebDAV-Client für das NAS (tools/nas-server.py oder jeder andere WebDAV-Server).
 * Zugangsdaten liegen nur auf diesem Gerät (localStorage). */
(function () {
  var KEY = 'nd.nas';
  var TEXT_EXT = ['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'yml', 'yaml', 'ini', 'conf', 'cfg', 'log',
    'html', 'htm', 'css', 'js', 'ts', 'py', 'sh', 'java', 'c', 'h', 'cpp', 'ino', 'gradle', 'properties', 'svg', 'sql', 'toml'];
  var IMAGE_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  var VIDEO_EXT = ['mp4', 'webm', 'mov', 'mkv'];
  var AUDIO_EXT = ['mp3', 'ogg', 'wav', 'flac', 'm4a'];

  function load() {
    try { return window.NDNet.migrate(JSON.parse(localStorage.getItem(KEY)) || null); } catch (e) { return null; }
  }
  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ohne Speicher nur für diese Sitzung */ }
    current = cfg;
  }
  var current = load();
  window.NDNet.register(function () { return current; });

  function base() { return window.NDNet.pick(current); }
  function headers(extra) {
    var h = Object.assign({}, extra || {});
    if (current.user) h.Authorization = 'Basic ' + btoa(unescape(encodeURIComponent(current.user + ':' + (current.pass || ''))));
    return h;
  }
  /** Pfad wie "/ordner/datei.txt" in eine URL umwandeln (jedes Segment kodiert). */
  function url(path) {
    return base() + path.split('/').map(function (s) { return encodeURIComponent(s); }).join('/');
  }

  function NasError(status, message) { this.status = status; this.message = message; }
  function fail(res) {
    var msg = {
      401: 'Anmeldung abgelehnt – Benutzer oder Passwort prüfen.',
      403: 'Zugriff verweigert.',
      404: 'Nicht gefunden.',
      405: 'Existiert bereits.',
      409: 'Konflikt – Aktion nicht möglich.',
      412: 'Ziel existiert bereits.'
    }[res.status] || ('Fehler ' + res.status + ' vom NAS.');
    throw new NasError(res.status, msg);
  }
  function request(method, path, opts) {
    if (!current || !(current.url || current.urlVpn)) return Promise.reject(new NasError(0, 'Kein NAS eingerichtet.'));
    opts = opts || {};
    return fetch(url(path), { method: method, headers: headers(opts.headers), body: opts.body, cache: 'no-store' })
      .catch(function () { throw new NasError(0, 'NAS nicht erreichbar (' + base() + ', Netz: ' + window.NDNet.label(window.NDNet.profile()) + '). Läuft nas-server.py? Unterwegs: VPN eingeschaltet?'); })
      .then(function (res) { if (!res.ok && res.status !== 207) fail(res); return res; });
  }

  function ext(name) { var i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }
  function kind(item) {
    if (item.dir) return 'folder';
    var e = ext(item.name);
    if (IMAGE_EXT.indexOf(e) >= 0) return 'image';
    if (VIDEO_EXT.indexOf(e) >= 0) return 'video';
    if (AUDIO_EXT.indexOf(e) >= 0) return 'audio';
    if (e === 'pdf') return 'pdf';
    if (TEXT_EXT.indexOf(e) >= 0 || /^text\//.test(item.type || '')) return 'text';
    return 'other';
  }

  function prop(node, name) {
    var el = node.getElementsByTagNameNS('DAV:', name)[0];
    return el ? el.textContent : null;
  }

  /** Inhalt eines Ordners. Liefert { items, quota } – quota ist null, wenn der Server sie nicht meldet. */
  function list(path) {
    return request('PROPFIND', path, { headers: { Depth: '1', 'Content-Type': 'application/xml' } })
      .then(function (res) { return res.text(); })
      .then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, 'application/xml');
        var responses = doc.getElementsByTagNameNS('DAV:', 'response');
        var self = path.replace(/\/+$/, '');
        var items = [], quota = null;
        for (var i = 0; i < responses.length; i++) {
          var r = responses[i];
          var href = decodeURIComponent(prop(r, 'href') || '');
          href = href.replace(/^https?:\/\/[^/]+/, '');
          // Läuft WebDAV unter einem Unterpfad (z. B. http://nas/webdav/), diesen abschneiden
          var prefix = decodeURIComponent(new URL(base() + '/').pathname).replace(/\/+$/, '');
          if (prefix && href.indexOf(prefix) === 0) href = href.slice(prefix.length);
          var clean = href.replace(/\/+$/, '');
          var isDir = r.getElementsByTagNameNS('DAV:', 'collection').length > 0;
          if (clean === self || (clean === '' && self === '')) {
            var used = prop(r, 'quota-used-bytes'), free = prop(r, 'quota-available-bytes');
            if (used !== null && free !== null) quota = { used: +used, free: +free };
            continue;
          }
          var name = clean.slice(clean.lastIndexOf('/') + 1);
          var modified = prop(r, 'getlastmodified');
          var item = {
            name: name, path: (self + '/' + name), dir: isDir,
            size: isDir ? null : +(prop(r, 'getcontentlength') || 0),
            type: prop(r, 'getcontenttype') || '',
            modified: modified ? new Date(modified) : null
          };
          item.kind = kind(item);
          items.push(item);
        }
        items.sort(function (a, b) { return a.dir !== b.dir ? (a.dir ? -1 : 1) : a.name.localeCompare(b.name, 'de', { numeric: true }); });
        return { items: items, quota: quota };
      });
  }

  function readText(path) { return request('GET', path).then(function (r) { return r.text(); }); }
  function readBlob(path) { return request('GET', path).then(function (r) { return r.blob(); }); }
  function writeText(path, text) { return request('PUT', path, { body: new Blob([text], { type: 'text/plain;charset=utf-8' }) }); }
  function mkdir(path) { return request('MKCOL', path); }
  function remove(path) { return request('DELETE', path); }
  function move(from, to) { return request('MOVE', from, { headers: { Destination: url(to), Overwrite: 'F' } }); }

  /** Upload mit Fortschritt (fetch kennt keinen Upload-Fortschritt, daher XHR). */
  function upload(path, file, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', url(path));
      var h = headers();
      for (var k in h) xhr.setRequestHeader(k, h[k]);
      xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = function () { if (xhr.status >= 200 && xhr.status < 300) resolve(); else { try { fail(xhr); } catch (err) { reject(err); } } };
      xhr.onerror = function () { reject(new NasError(0, 'Upload abgebrochen – NAS nicht erreichbar.')); };
      xhr.send(file);
    });
  }

  /** Datei auf dem Gerät speichern: Android über den System-Download, sonst als Browser-Download. */
  function download(item) {
    if (window.NDNative && window.NDNative.download) {
      var ok = window.NDNative.download(url(item.path), headers().Authorization || '', item.name, item.type || 'application/octet-stream');
      return ok ? Promise.resolve() : Promise.reject(new NasError(0, 'Download konnte nicht gestartet werden.'));
    }
    return readBlob(item.path).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    });
  }

  function formatSize(bytes) {
    if (bytes == null) return '';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0, v = bytes;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return (i === 0 ? v : v.toFixed(v < 10 ? 1 : 0)) + ' ' + units[i];
  }
  function formatDate(d) {
    if (!d || isNaN(d)) return '';
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function parent(path) { var i = path.replace(/\/+$/, '').lastIndexOf('/'); return i <= 0 ? '/' : path.slice(0, i); }
  function join(dir, name) { return (dir === '/' ? '' : dir.replace(/\/+$/, '')) + '/' + name; }
  function validName(name) { return !!name && name.indexOf('/') < 0 && name !== '.' && name !== '..'; }

  window.NAS = {
    config: function () { return current; }, configured: function () { return !!(current && (current.url || current.urlVpn)); }, save: save,
    list: list, readText: readText, readBlob: readBlob, writeText: writeText, mkdir: mkdir, remove: remove, move: move,
    upload: upload, download: download, kind: kind, ext: ext,
    formatSize: formatSize, formatDate: formatDate, parent: parent, join: join, validName: validName
  };
})();
