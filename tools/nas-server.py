#!/usr/bin/env python3
"""
Kleiner WebDAV-Server fuer die nDashboard-App.

Damit wird ein Ordner (z.B. ein USB-Stick oder eine Festplatte) im Heimnetz
fuer die App lesbar und beschreibbar. Laeuft auf Raspberry Pi, Laptop oder PC,
gebraucht wird nur Python 3, keine zusaetzlichen Pakete.

Start:
    python3 nas-server.py /pfad/zum/usb-stick --user projekt --pass geheim

Windows-Beispiel:
    python nas-server.py E:\\ --user projekt --pass geheim

Die Adresse fuer die App steht nach dem Start im Fenster, z.B. http://192.168.1.42:5005

Archive (Entpacken/Komprimieren in der App): ZIP und TAR/GZ gehen ohne Zusatzpakete.
Fuer 7z, RAR und Passwortschutz 7-Zip installieren:
    sudo apt install 7zip          (Raspberry Pi OS / Debian 12 und neuer, kann auch RAR)
    sudo apt install p7zip-full    (aeltere Systeme, ohne RAR)
"""

import argparse, base64, bz2, gzip, html, json, lzma, os, shutil, socket, subprocess, sys, tarfile, tempfile, threading, time, uuid, zipfile
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, unquote, urlparse

ROOT = "."
AUTH = None          # "user:pass" oder None
SEVENZIP = shutil.which("7zz") or shutil.which("7z") or shutil.which("7za")


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


class Handler(BaseHTTPRequestHandler):
    server_version = "nDashboardNAS/1.0"

    # ---------- Hilfsfunktionen ----------
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "authorization, depth, content-type, destination, overwrite")
        self.send_header("Access-Control-Expose-Headers", "DAV, content-length, content-type")

    def authorized(self):
        if not AUTH:
            return True
        head = self.headers.get("Authorization", "")
        if head.startswith("Basic "):
            try:
                if base64.b64decode(head[6:]).decode("utf-8") == AUTH:
                    return True
            except Exception:
                pass
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="nDashboard"')
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def fs_path(self):
        """URL-Pfad in einen Pfad auf der Platte umwandeln, ohne aus ROOT auszubrechen."""
        rel = unquote(self.path.split("?", 1)[0]).lstrip("/")
        full = os.path.abspath(os.path.join(ROOT, rel.replace("/", os.sep)))
        if full != os.path.abspath(ROOT) and not full.startswith(os.path.abspath(ROOT) + os.sep):
            return None
        return full

    def send_simple(self, code, body=b"", ctype="text/plain; charset=utf-8"):
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body and self.command != "HEAD":
            self.wfile.write(body)

    # ---------- HTTP-Methoden ----------
    def do_OPTIONS(self):
        self.send_response(200)
        self.cors()
        self.send_header("DAV", "1")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_PROPFIND(self):
        if not self.authorized():
            return
        path = self.fs_path()
        if path is None or not os.path.exists(path):
            return self.send_simple(404, b"not found")
        depth = self.headers.get("Depth", "1")
        base = self.path.split("?", 1)[0]
        if not base.startswith("/"):
            base = "/" + base
        entries = [(path, base if base.endswith("/") or not os.path.isdir(path) else base + "/")]
        if os.path.isdir(path) and depth != "0":
            prefix = entries[0][1]
            try:
                for name in sorted(os.listdir(path)):
                    if name.startswith("."):
                        continue
                    child = os.path.join(path, name)
                    href = prefix + quote(name) + ("/" if os.path.isdir(child) else "")
                    entries.append((child, href))
            except PermissionError:
                pass

        out = ['<?xml version="1.0" encoding="utf-8"?>', '<d:multistatus xmlns:d="DAV:">']
        for i, (fs, href) in enumerate(entries):
            is_dir = os.path.isdir(fs)
            try:
                st = os.stat(fs)
                size, mtime = st.st_size, st.st_mtime
            except OSError:
                size, mtime = 0, 0
            modified = datetime.fromtimestamp(mtime, timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
            out.append("<d:response><d:href>" + html.escape(href) + "</d:href><d:propstat><d:prop>")
            out.append("<d:resourcetype>" + ("<d:collection/>" if is_dir else "") + "</d:resourcetype>")
            if not is_dir:
                out.append("<d:getcontentlength>%d</d:getcontentlength>" % size)
                out.append("<d:getcontenttype>%s</d:getcontenttype>" % guess_type(fs))
            out.append("<d:getlastmodified>%s</d:getlastmodified>" % modified)
            if i == 0 and is_dir:
                # Speicherplatz (RFC 4331), damit die App den Fuellstand anzeigen kann
                try:
                    du = shutil.disk_usage(fs)
                    out.append("<d:quota-used-bytes>%d</d:quota-used-bytes>" % du.used)
                    out.append("<d:quota-available-bytes>%d</d:quota-available-bytes>" % du.free)
                except OSError:
                    pass
            out.append("</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>")
        out.append("</d:multistatus>")
        body = "".join(out).encode("utf-8")
        self.send_response(207)
        self.cors()
        self.send_header("Content-Type", 'application/xml; charset="utf-8"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, code, data):
        self.send_simple(code, json.dumps(data).encode("utf-8"), "application/json; charset=utf-8")

    def do_GET(self):
        if not self.authorized():
            return
        if self.path.startswith("/.nd/"):
            return self.app_get()
        path = self.fs_path()
        if path is None or not os.path.isfile(path):
            return self.send_simple(404, b"not found")
        size = os.path.getsize(path)
        self.send_response(200)
        self.cors()
        self.send_header("Content-Type", guess_type(path))
        self.send_header("Content-Length", str(size))
        self.end_headers()
        if self.command == "HEAD":
            return
        with open(path, "rb") as f:
            while True:
                chunk = f.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)

    def do_HEAD(self):
        self.do_GET()

    def do_PUT(self):
        if not self.authorized():
            return
        path = self.fs_path()
        if path is None:
            return self.send_simple(403, b"forbidden")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        length = int(self.headers.get("Content-Length", 0))
        with open(path, "wb") as f:
            left = length
            while left > 0:
                chunk = self.rfile.read(min(65536, left))
                if not chunk:
                    break
                f.write(chunk)
                left -= len(chunk)
        self.send_simple(201, b"created")

    def do_MOVE(self):
        """Umbenennen oder Verschieben (WebDAV MOVE)."""
        if not self.authorized():
            return
        src = self.fs_path()
        dest_header = self.headers.get("Destination", "")
        if not src or not os.path.exists(src) or not dest_header:
            return self.send_simple(400, b"bad request")
        # Aus der Ziel-URL den Pfad auf der Platte machen
        path = urlparse(dest_header).path if "://" in dest_header else dest_header
        rel = unquote(path).lstrip("/")
        dest = os.path.abspath(os.path.join(ROOT, rel.replace("/", os.sep)))
        if dest != os.path.abspath(ROOT) and not dest.startswith(os.path.abspath(ROOT) + os.sep):
            return self.send_simple(403, b"forbidden")
        exists = os.path.exists(dest)
        if exists and self.headers.get("Overwrite", "T").upper() == "F":
            return self.send_simple(412, b"target exists")
        try:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            os.replace(src, dest)
        except OSError as e:
            return self.send_simple(409, str(e).encode())
        self.send_simple(204 if exists else 201, b"")

    def do_MKCOL(self):
        if not self.authorized():
            return
        path = self.fs_path()
        if path is None:
            return self.send_simple(403, b"forbidden")
        try:
            os.makedirs(path, exist_ok=False)
            self.send_simple(201, b"created")
        except FileExistsError:
            self.send_simple(405, b"exists")

    def do_DELETE(self):
        if not self.authorized():
            return
        path = self.fs_path()
        if path is None or not os.path.exists(path):
            return self.send_simple(404, b"not found")
        try:
            if path == os.path.abspath(ROOT):
                return self.send_simple(403, b"forbidden")
            if os.path.isdir(path):
                shutil.rmtree(path)  # WebDAV: DELETE auf einen Ordner loescht ihn samt Inhalt
            else:
                os.remove(path)
            self.send_simple(204)
        except OSError as e:
            self.send_simple(409, str(e).encode())

    # ---------- Archive (nur fuer die nDashboard-App, nicht Teil von WebDAV) ----------
    def app_get(self):
        route = self.path.split("?", 1)[0]
        if route == "/.nd/caps":
            return self.send_json(200, capabilities())
        if route.startswith("/.nd/jobs/"):
            job = JOBS.get(route[len("/.nd/jobs/"):])
            if not job:
                return self.send_json(404, {"error": "Auftrag nicht gefunden"})
            return self.send_json(200, {k: job[k] for k in ("state", "done", "total", "result", "error", "code") if k in job})
        self.send_json(404, {"error": "nicht gefunden"})

    def do_POST(self):
        """POST /.nd/archive startet Entpacken/Komprimieren im Hintergrund, Antwort {job}; Fehler als {error, code}."""
        if not self.authorized():
            return
        if self.path.split("?", 1)[0] != "/.nd/archive":
            return self.send_json(404, {"error": "nicht gefunden"})
        try:
            length = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(min(length, 65536)) or b"{}")
            password = str(req.get("password") or "")
            if req.get("op") == "extract":
                src = in_root(req.get("path"))
                if not src or not os.path.isfile(src) or not archive_kind(src):
                    raise ArchiveError("Kein unterstütztes Archiv.")
                into = "here" if req.get("into") == "here" else "folder"
                return self.send_json(200, {"job": start_job(extract_archive, src, into, password)})
            if req.get("op") == "compress":
                paths = [in_root(p) for p in req.get("paths") or []]
                if not paths or any(not p or not os.path.exists(p) or p == os.path.abspath(ROOT) for p in paths):
                    raise ArchiveError("Nichts zum Komprimieren ausgewählt.")
                if len({os.path.dirname(p) for p in paths}) != 1:
                    raise ArchiveError("Alle Dateien müssen im selben Ordner liegen.")
                fmt = req.get("format")
                if fmt not in ("zip", "7z", "tar.gz"):
                    raise ArchiveError("Unbekanntes Format.")
                name = os.path.basename(str(req.get("name") or "Archiv"))
                if not name or name.startswith("."):
                    raise ArchiveError("Ungültiger Name.")
                if not name.lower().endswith("." + fmt):
                    name += "." + fmt
                return self.send_json(200, {"job": start_job(compress_archive, paths, name, fmt, password)})
            raise ArchiveError("Unbekannter Auftrag.")
        except ArchiveError as e:
            self.send_json(200, {"error": str(e), "code": e.code})
        except (ValueError, TypeError):
            self.send_json(400, {"error": "Ungültige Anfrage"})

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - %s\n" % (self.address_string(), fmt % args))


TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif",
         ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
         ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
         ".txt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".csv": "text/csv; charset=utf-8",
         ".json": "application/json", ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
         ".py": "text/x-python", ".log": "text/plain; charset=utf-8", ".pdf": "application/pdf"}


def guess_type(path):
    return TYPES.get(os.path.splitext(path)[1].lower(), "application/octet-stream")


# ---------- Archive ----------
class ArchiveError(Exception):
    def __init__(self, message, code="error"):
        super().__init__(message)
        self.code = code


TAR_EXT = (".tar.gz", ".tgz", ".tar.bz2", ".tbz2", ".tar.xz", ".txz", ".tar")
SINGLE_EXT = {".gz": gzip.open, ".bz2": bz2.open, ".xz": lzma.open}
NEEDS_7Z = (".7z", ".rar")
NO_7Z = "Dafür braucht das NAS 7-Zip: sudo apt install 7zip (ältere Systeme: p7zip-full), dann nas-server.py neu starten."
JOBS = {}


def capabilities():
    extract = ["zip"] + [e[1:] for e in TAR_EXT] + [e[1:] for e in SINGLE_EXT]
    create = ["zip", "tar.gz"]
    if SEVENZIP:
        extract += ["7z", "rar"]
        create.insert(1, "7z")
    return {"version": 2, "archive": {"extract": extract, "create": create, "password": bool(SEVENZIP), "sevenzip": bool(SEVENZIP)}}


def in_root(rel):
    """App-Pfad wie /ordner/datei.zip auf die Platte abbilden, ohne aus ROOT auszubrechen."""
    if not isinstance(rel, str):
        return None
    root = os.path.abspath(ROOT)
    full = os.path.abspath(os.path.join(root, rel.lstrip("/").replace("/", os.sep)))
    return full if full == root or full.startswith(root + os.sep) else None


def app_path(full):
    rel = os.path.relpath(full, os.path.abspath(ROOT)).replace(os.sep, "/")
    return "/" if rel == "." else "/" + rel


def archive_kind(path):
    low = path.lower()
    for ext in TAR_EXT + (".zip",) + NEEDS_7Z + tuple(SINGLE_EXT):
        if low.endswith(ext):
            return ext
    return None


def unique(path):
    """Freien Namen finden: datei.zip → datei (1).zip"""
    if not os.path.exists(path):
        return path
    folder, name = os.path.split(path)
    kind = archive_kind(name) or os.path.splitext(name)[1]
    stem = name[:len(name) - len(kind)] if kind and name.lower().endswith(kind) else name
    n = 1
    while os.path.exists(os.path.join(folder, "%s (%d)%s" % (stem, n, kind))):
        n += 1
    return os.path.join(folder, "%s (%d)%s" % (stem, n, kind))


def start_job(fn, *args):
    for key in [k for k, j in JOBS.items() if j["state"] != "running" and time.time() - j["started"] > 3600]:
        JOBS.pop(key, None)
    job_id = uuid.uuid4().hex[:12]
    job = JOBS[job_id] = {"state": "running", "done": 0, "total": 0, "started": time.time()}

    def run():
        try:
            job["result"] = app_path(fn(job, *args))
            job["state"] = "done"
        except ArchiveError as e:
            job.update(state="error", error=str(e), code=e.code)
        except Exception as e:  # z. B. Platte voll, kaputtes Archiv
            job.update(state="error", error="Fehlgeschlagen: %s" % e, code="error")
    threading.Thread(target=run, daemon=True).start()
    return job_id


def safe_member(name):
    """Kein absoluter Pfad, kein .. – sonst könnte ein Archiv Dateien außerhalb des Zielordners schreiben."""
    parts = name.replace("\\", "/").split("/")
    return bool(name) and not name.startswith(("/", "\\")) and ".." not in parts and ":" not in parts[0]


def run_7z(args, password, cwd=None):
    if not SEVENZIP:
        raise ArchiveError(NO_7Z, "missing7z")
    # -p immer setzen, sonst wartet 7z bei verschlüsselten Archiven auf eine Eingabe
    cmd = [SEVENZIP] + args[:1] + ["-y", "-bd", "-p" + password] + args[1:]
    r = subprocess.run(cmd, cwd=cwd, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    out = r.stdout.decode("utf-8", "replace")
    if r.returncode != 0:
        if "Wrong password" in out or "encrypted" in out.lower():
            raise ArchiveError("Falsches Passwort." if password else "Das Archiv ist verschlüsselt – Passwort eingeben.", "password")
        lines = [l for l in out.splitlines() if l.strip() and ("ERROR" in l or "Error" in l)]
        raise ArchiveError("7-Zip: " + (lines[-1].strip() if lines else "Fehler %d" % r.returncode))


def extract_archive(job, src, into, password):
    kind, parent = archive_kind(src), os.path.dirname(src)
    name = os.path.basename(src)
    stem = name[:len(name) - len(kind)] or "Archiv"
    tmp = tempfile.mkdtemp(prefix=".nd-entpacken-", dir=parent)  # versteckt, gleiche Platte → schnelles Verschieben
    try:
        if kind == ".zip" and not password:
            try:
                with zipfile.ZipFile(src) as z:
                    infos = z.infolist()
                    job["total"] = len(infos)
                    for info in infos:
                        if not safe_member(info.filename):
                            raise ArchiveError("Das Archiv enthält unsichere Pfade: " + info.filename)
                        if info.flag_bits & 0x1:
                            raise ArchiveError("Das Archiv ist verschlüsselt – Passwort eingeben.", "password")
                        z.extract(info, tmp)
                        job["done"] += 1
            except NotImplementedError:  # z. B. Deflate64 – 7-Zip kann mehr
                shutil.rmtree(tmp, ignore_errors=True)
                os.makedirs(tmp)
                run_7z(["x", "-o" + tmp, src], password)
            except zipfile.BadZipFile:
                raise ArchiveError("Kein gültiges ZIP-Archiv.")
        elif kind == ".zip" or kind in NEEDS_7Z:
            if kind == ".zip" and not SEVENZIP:
                try:  # klassische ZIP-Verschlüsselung kann Python selbst
                    with zipfile.ZipFile(src) as z:
                        for info in z.infolist():
                            if not safe_member(info.filename):
                                raise ArchiveError("Das Archiv enthält unsichere Pfade: " + info.filename)
                        z.extractall(tmp, pwd=password.encode("utf-8"))
                except RuntimeError:
                    raise ArchiveError("Falsches Passwort.", "password")
                except NotImplementedError:
                    raise ArchiveError(NO_7Z, "missing7z")
            else:
                run_7z(["x", "-o" + tmp, src], password)
        elif kind in TAR_EXT:
            if password:
                raise ArchiveError("TAR-Archive haben keinen Passwortschutz.")
            try:
                with tarfile.open(src) as t:
                    members = [m for m in t.getmembers() if (m.isfile() or m.isdir()) and safe_member(m.name)]
                    job["total"] = len(members)
                    extra = {"filter": "data"} if hasattr(tarfile, "data_filter") else {}
                    for m in members:
                        t.extract(m, tmp, set_attrs=False, **extra)
                        job["done"] += 1
            except tarfile.TarError:
                raise ArchiveError("Kein gültiges TAR-Archiv.")
        else:  # einzelne gepackte Datei: bericht.txt.gz → bericht.txt
            with SINGLE_EXT[kind](src, "rb") as f_in, open(os.path.join(tmp, stem), "wb") as f_out:
                shutil.copyfileobj(f_in, f_out, 1 << 20)

        # Verknüpfungen und Gerätedateien entfernen (könnten aus dem Ordner herauszeigen)
        for folder, dirs, files in os.walk(tmp):
            for entry in dirs + files:
                full = os.path.join(folder, entry)
                if os.path.islink(full) or not (os.path.isfile(full) or os.path.isdir(full)):
                    os.remove(full)
        top = os.listdir(tmp)
        if into == "here":
            for entry in top:
                os.replace(os.path.join(tmp, entry), unique(os.path.join(parent, entry)))
            return parent
        # Enthält das Archiv genau einen Ordner, diesen nehmen statt doppelt zu verschachteln
        source = os.path.join(tmp, top[0]) if len(top) == 1 and os.path.isdir(os.path.join(tmp, top[0])) else tmp
        target = unique(os.path.join(parent, top[0] if source != tmp else stem))
        os.replace(source, target)
        return target
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def compress_archive(job, paths, name, fmt, password):
    parent = os.path.dirname(paths[0])
    dest = unique(os.path.join(parent, name))
    tmp = os.path.join(parent, ".nd-packen-%s.tmp" % uuid.uuid4().hex[:8])
    names = [os.path.basename(p) for p in paths]
    try:
        if fmt == "7z" or (fmt == "zip" and password):
            args = ["a", "-t" + fmt, tmp] + names
            if password:
                args.insert(1, "-mhe=on" if fmt == "7z" else "-mem=AES256")  # 7z: auch Dateinamen verschlüsseln
            run_7z(args, password, cwd=parent)
        elif fmt == "zip":
            files = []
            for p in paths:
                if os.path.isdir(p):
                    for folder, _dirs, fs in os.walk(p):
                        files += [os.path.join(folder, f) for f in fs]
                        if not fs and not _dirs:
                            files.append(folder)
                else:
                    files.append(p)
            job["total"] = len(files)
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as z:
                for f in files:
                    if not os.path.islink(f):
                        z.write(f, os.path.relpath(f, parent))
                    job["done"] += 1
        else:
            if password:
                raise ArchiveError("TAR.GZ kann keinen Passwortschutz – ZIP oder 7z wählen.")
            job["total"] = len(paths)
            with tarfile.open(tmp, "w:gz") as t:
                for p, n in zip(paths, names):
                    t.add(p, arcname=n)
                    job["done"] += 1
        os.replace(tmp, dest)
        return dest
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="WebDAV-Server fuer die nDashboard-App")
    ap.add_argument("folder", help="Ordner, der freigegeben wird (z.B. der USB-Stick)")
    ap.add_argument("--port", type=int, default=5005)
    ap.add_argument("--user", default="")
    ap.add_argument("--pass", dest="password", default="")
    a = ap.parse_args()

    ROOT = os.path.abspath(a.folder)
    if not os.path.isdir(ROOT):
        sys.exit("Ordner nicht gefunden: " + ROOT)
    AUTH = (a.user + ":" + a.password) if a.user else None

    print("Freigegeben:", ROOT)
    print("Adresse fuer die App:  http://%s:%d" % (local_ip(), a.port))
    print("Benutzer:", a.user or "(ohne Anmeldung)")
    print("Archive:", "ZIP, 7z, RAR, TAR (7-Zip: %s)" % SEVENZIP if SEVENZIP else "ZIP, TAR (für 7z/RAR: sudo apt install 7zip)")
    print("Beenden mit Strg+C")
    ThreadingHTTPServer(("0.0.0.0", a.port), Handler).serve_forever()
