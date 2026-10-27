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
"""

import argparse, base64, html, os, shutil, socket, sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote, unquote, urlparse

ROOT = "."
AUTH = None          # "user:pass" oder None


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
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, OPTIONS")
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

    def do_GET(self):
        if not self.authorized():
            return
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
    print("Beenden mit Strg+C")
    ThreadingHTTPServer(("0.0.0.0", a.port), Handler).serve_forever()
