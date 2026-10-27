#!/usr/bin/env python3
"""
nDashboard PC-Agent: protokolliert, was auf diesem Linux-PC passiert, und stellt es
der App (Seite „Sensoren“) im Heimnetz bereit.

Erfasst werden
  - Hardware: CPU-Last und -Temperatur, alle Temperatur-/Lüftersensoren, RAM,
    Datenträger, Netzwerk, Akku (alle 10 s, Verlauf 7 Tage)
  - An- und Abmeldungen (systemd-logind, SSH), Herunterfahren/Neustart
  - Abstürze (systemd-coredump) und Out-of-Memory-Abbrüche
  - Dateien: neu, geändert, gelöscht, verschoben in den überwachten Ordnern
  - Warnungen bei zu hoher Temperatur, vollem RAM oder vollem Datenträger
  - optional (--allow-control): Neustart, Herunterfahren, Ruhezustand aus der App
    – nur diese festen Aktionen, keine beliebigen Befehle, nur mit Benutzer/Passwort

Gebraucht wird nur Python 3, keine zusätzlichen Pakete. Daten liegen in einer
SQLite-Datei (Standard: ~/.local/share/ndashboard-agent/agent.db).

Start:
    python3 pc-agent.py --user ich --pass geheim
    python3 pc-agent.py --user ich --pass geheim --watch ~/Dokumente --watch ~/Projekte

Die Adresse für die App steht nach dem Start im Fenster, z. B. http://192.168.1.20:5006
Einrichtung als Dienst: siehe PC-AGENT.md
"""

import argparse
import base64
import ctypes
import ctypes.util
import json
import os
import platform
import re
import shutil
import signal
import socket
import sqlite3
import struct
import subprocess
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VERSION = "1.0"
SYS = os.environ.get("NDA_SYSFS_ROOT", "")  # nur für Tests: anderes Wurzelverzeichnis für /sys und /proc
SAMPLE_SECONDS = 10
KEEP_DAYS = 7
IGNORED_SUFFIXES = (".swp", ".swx", ".tmp", ".part", ".crdownload", ".kate-swp", "~", ".goutputstream")
IGNORED_DIRS = {".git", "node_modules", "__pycache__", ".cache", ".venv", ".gradle", "build", ".flatpak-builder"}


def sysfs(path):
    return SYS + path


def read(path, default=None):
    try:
        with open(sysfs(path)) as f:
            return f.read().strip()
    except OSError:
        return default


def now():
    return time.time()


# ---------------------------------------------------------------- Datenbank

class Store:
    def __init__(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.lock = threading.Lock()
        with self.lock:
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, ts REAL, category TEXT, level TEXT, title TEXT, detail TEXT);
                CREATE INDEX IF NOT EXISTS events_ts ON events(ts);
                CREATE TABLE IF NOT EXISTS samples (ts REAL, metric TEXT, value REAL);
                CREATE INDEX IF NOT EXISTS samples_metric_ts ON samples(metric, ts);
                CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
            """)
            self.db.commit()

    def event(self, category, level, title, detail="", ts=None):
        with self.lock:
            self.db.execute("INSERT INTO events (ts, category, level, title, detail) VALUES (?,?,?,?,?)",
                            (ts or now(), category, level, title, detail))
            self.db.commit()

    def samples(self, ts, values):
        with self.lock:
            self.db.executemany("INSERT INTO samples VALUES (?,?,?)", [(ts, k, v) for k, v in values.items() if v is not None])
            self.db.commit()

    def get_meta(self, key):
        with self.lock:
            row = self.db.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
        return row[0] if row else None

    def set_meta(self, key, value):
        with self.lock:
            self.db.execute("INSERT OR REPLACE INTO meta VALUES (?,?)", (key, value))
            self.db.commit()

    def events(self, category=None, limit=100, before=None, since=None):
        sql, args = "SELECT id, ts, category, level, title, detail FROM events WHERE 1=1", []
        if category:
            sql += " AND category=?"
            args.append(category)
        if before:
            sql += " AND id<?"
            args.append(before)
        if since:
            sql += " AND ts>=?"
            args.append(since)
        sql += " ORDER BY id DESC LIMIT ?"
        args.append(limit)
        with self.lock:
            rows = self.db.execute(sql, args).fetchall()
        return [dict(zip(("id", "ts", "category", "level", "title", "detail"), r)) for r in rows]

    def counts(self, since):
        with self.lock:
            rows = self.db.execute("SELECT category, COUNT(*) FROM events WHERE ts>=? GROUP BY category", (since,)).fetchall()
        return dict(rows)

    def history(self, metric, since, points=120):
        with self.lock:
            rows = self.db.execute("SELECT ts, value FROM samples WHERE metric=? AND ts>=? ORDER BY ts", (metric, since)).fetchall()
        if len(rows) <= points:
            return rows
        step = len(rows) / points  # gleichmäßig ausdünnen, Mittelwert je Abschnitt
        out = []
        for i in range(points):
            chunk = rows[int(i * step):int((i + 1) * step)] or rows[-1:]
            out.append((chunk[-1][0], sum(v for _, v in chunk) / len(chunk)))
        return out

    def prune(self):
        with self.lock:
            self.db.execute("DELETE FROM samples WHERE ts<?", (now() - KEEP_DAYS * 86400,))
            self.db.execute("DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 50000)")
            self.db.commit()


# ---------------------------------------------------------------- Hardware

class Hardware:
    def __init__(self):
        self.prev_cpu = None
        self.prev_net = None
        self.snapshot = {}
        self.lock = threading.Lock()

    def cpu_percent(self):
        line = read("/proc/stat", "").split("\n")[0].split()
        if len(line) < 5:
            return None
        values = list(map(int, line[1:]))
        idle, total = values[3] + (values[4] if len(values) > 4 else 0), sum(values)
        prev, self.prev_cpu = self.prev_cpu, (idle, total)
        if not prev or total == prev[1]:
            return None
        return round(100 * (1 - (idle - prev[0]) / (total - prev[1])), 1)

    @staticmethod
    def memory():
        info = {}
        for line in read("/proc/meminfo", "").splitlines():
            parts = line.split()
            if len(parts) >= 2:
                info[parts[0].rstrip(":")] = int(parts[1]) * 1024
        total, avail = info.get("MemTotal"), info.get("MemAvailable")
        if not total or avail is None:
            return None
        return {"total": total, "used": total - avail, "percent": round(100 * (total - avail) / total, 1)}

    @staticmethod
    def sensors():
        temps, fans = [], []
        base = sysfs("/sys/class/hwmon")
        try:
            chips = sorted(os.listdir(base))
        except OSError:
            chips = []
        for chip in chips:
            d = os.path.join(base, chip)
            name = read(os.path.join("/sys/class/hwmon", chip, "name"), chip)
            try:
                files = sorted(os.listdir(d))
            except OSError:
                continue
            for f in files:
                if f.startswith("temp") and f.endswith("_input"):
                    n = f[:-6]
                    raw = read(os.path.join("/sys/class/hwmon", chip, f))
                    if raw is None or not raw.lstrip("-").isdigit():
                        continue
                    crit = read(os.path.join("/sys/class/hwmon", chip, n + "_crit"))
                    label = read(os.path.join("/sys/class/hwmon", chip, n + "_label")) or n
                    temps.append({"chip": name, "label": label, "value": int(raw) / 1000,
                                  "crit": int(crit) / 1000 if crit and crit.lstrip("-").isdigit() and int(crit) > 0 else None})
                elif f.startswith("fan") and f.endswith("_input"):
                    raw = read(os.path.join("/sys/class/hwmon", chip, f))
                    if raw and raw.isdigit():
                        label = read(os.path.join("/sys/class/hwmon", chip, f[:-6] + "_label")) or f[:-6]
                        fans.append({"chip": name, "label": label, "rpm": int(raw)})
        return temps, fans

    @staticmethod
    def cpu_temp(temps):
        for chip in ("k10temp", "coretemp", "zenpower", "cpu_thermal", "cpu-thermal", "acpitz"):
            for t in temps:
                if t["chip"] == chip:
                    return t["value"]
        return temps[0]["value"] if temps else None

    @staticmethod
    def disks():
        out, seen = [], set()
        for line in read("/proc/mounts", "").splitlines():
            dev, mnt, fstype = (line.split() + ["", "", ""])[:3]
            if not dev.startswith("/dev/") or dev in seen or fstype in ("squashfs", "iso9660") or mnt.startswith(("/boot", "/snap", "/var/lib/flatpak")):
                continue
            try:
                du = shutil.disk_usage(mnt)
            except OSError:
                continue
            seen.add(dev)
            out.append({"mount": mnt, "total": du.total, "used": du.used, "percent": round(100 * du.used / du.total, 1) if du.total else 0})
        return out

    def network(self):
        rx = tx = 0
        for line in read("/proc/net/dev", "").splitlines()[2:]:
            name, data = line.split(":", 1)
            if name.strip() == "lo":
                continue
            f = data.split()
            rx, tx = rx + int(f[0]), tx + int(f[8])
        t = now()
        prev, self.prev_net = self.prev_net, (t, rx, tx)
        if not prev or t <= prev[0]:
            return None
        return {"rx": max(0, (rx - prev[1]) / (t - prev[0])), "tx": max(0, (tx - prev[2]) / (t - prev[0]))}

    @staticmethod
    def battery():
        base = sysfs("/sys/class/power_supply")
        try:
            names = os.listdir(base)
        except OSError:
            return None
        for n in names:
            if read("/sys/class/power_supply/%s/type" % n) == "Battery":
                cap = read("/sys/class/power_supply/%s/capacity" % n)
                return {"percent": int(cap) if cap and cap.isdigit() else None, "status": read("/sys/class/power_supply/%s/status" % n)}
        return None

    def sample(self):
        temps, fans = self.sensors()
        snap = {
            "ts": now(),
            "cpu": self.cpu_percent(),
            "load": os.getloadavg() if hasattr(os, "getloadavg") else None,
            "memory": self.memory(),
            "temps": temps,
            "fans": fans,
            "cpu_temp": self.cpu_temp(temps),
            "disks": self.disks(),
            "network": self.network(),
            "battery": self.battery(),
            "uptime": float((read("/proc/uptime", "0") or "0").split()[0]),
        }
        with self.lock:
            self.snapshot = snap
        return snap


def sampler(store, hw, stop):
    last_alert = {}

    def alert(key, level, title, detail):
        if now() - last_alert.get(key, 0) > 15 * 60:  # dieselbe Warnung höchstens alle 15 min
            last_alert[key] = now()
            store.event("hardware", level, title, detail)

    hw.sample()  # erste Messung nur als Basis für CPU-Last und Netzwerk
    n = 0
    while not stop.wait(SAMPLE_SECONDS):
        s = hw.sample()
        mem = s["memory"] or {}
        net = s["network"] or {}
        root = next((d for d in s["disks"] if d["mount"] == "/"), s["disks"][0] if s["disks"] else None)
        store.samples(s["ts"], {"cpu": s["cpu"], "cpu_temp": s["cpu_temp"], "memory": mem.get("percent"),
                                "disk": root["percent"] if root else None,
                                "net_rx": net.get("rx"), "net_tx": net.get("tx")})
        for t in s["temps"]:
            limit = t["crit"] or 95
            if t["value"] >= limit:
                alert("temp-crit-" + t["chip"] + t["label"], "danger", "Temperatur kritisch: %s %s" % (t["chip"], t["label"]), "%.0f °C (Grenze %.0f °C)" % (t["value"], limit))
            elif t["value"] >= min(85, limit - 10):
                alert("temp-" + t["chip"] + t["label"], "warn", "Temperatur hoch: %s %s" % (t["chip"], t["label"]), "%.0f °C" % t["value"])
        if mem.get("percent", 0) >= 92:
            alert("memory", "warn", "Arbeitsspeicher fast voll", "%.0f %% belegt" % mem["percent"])
        for d in s["disks"]:
            if d["percent"] >= 90:
                alert("disk-" + d["mount"], "warn", "Datenträger fast voll: " + d["mount"], "%.0f %% belegt" % d["percent"])
        n += 1
        if n % 360 == 0:  # etwa stündlich aufräumen
            store.prune()


# ---------------------------------------------------------------- Journal (Anmeldungen, Abstürze)

JOURNAL_MATCHES = ["_SYSTEMD_UNIT=systemd-logind.service", "+", "SYSLOG_IDENTIFIER=systemd-coredump", "+",
                   "SYSLOG_IDENTIFIER=sshd", "+", "SYSLOG_IDENTIFIER=systemd-oomd", "+", "SYSLOG_IDENTIFIER=sshd-session"]


def classify(entry):
    """Ein Journal-Eintrag (JSON von journalctl) → (Kategorie, Stufe, Titel, Detail) oder None."""
    msg = entry.get("MESSAGE")
    if isinstance(msg, list):  # Binärdaten liefert journalctl als Byte-Liste
        msg = bytes(msg).decode("utf-8", "replace")
    msg = (msg or "").strip()
    ident = entry.get("SYSLOG_IDENTIFIER", "")
    if ident == "systemd-coredump":
        if "dumped core" in msg:
            exe = entry.get("COREDUMP_EXE") or entry.get("COREDUMP_COMM") or ""
            name = os.path.basename(exe) if exe else msg.split("(", 1)[-1].split(")", 1)[0]
            signal = entry.get("COREDUMP_SIGNAL_NAME") or ""
            return "crash", "danger", "Absturz: " + name, (msg.split("\n")[0] + (" · " + signal if signal else ""))[:300]
        return None
    if ident == "systemd-oomd" or "Out of memory" in msg:
        if "Killed" in msg or "killed" in msg:
            return "crash", "danger", "Wegen Speichermangel beendet", msg[:300]
        return None
    if ident.startswith("sshd"):
        if msg.startswith("Accepted"):
            return "session", "info", "SSH-Anmeldung", msg[:300]
        if msg.startswith(("Failed password", "Invalid user")):
            return "session", "warn", "Fehlgeschlagene SSH-Anmeldung", msg[:300]
        return None
    m = re.match(r"New session (\S+) of user (\S+?)\.?$", msg)
    if m:
        return "session", "info", "Anmeldung: " + m.group(2), "Sitzung " + m.group(1)
    if msg.startswith("New session"):
        return "session", "info", "Anmeldung", msg
    if msg.startswith("Removed session"):
        return "session", "info", "Abmeldung", "Sitzung " + msg[len("Removed session "):].rstrip(".")
    if msg.startswith("System is powering down"):
        return "system", "info", "Herunterfahren", msg
    if msg.startswith("System is rebooting"):
        return "system", "info", "Neustart", msg
    if "Lid closed" in msg or "Suspending" in msg or msg.startswith("The system will suspend"):
        return "system", "info", "Ruhezustand", msg
    return None


def journal_follower(store, stop, status):
    if not shutil.which("journalctl"):
        status["journal"] = "journalctl nicht gefunden"
        return
    cursor = store.get_meta("journal_cursor")
    while not stop.is_set():
        args = ["journalctl", "-f", "-o", "json", "--no-pager"]
        args += ["--after-cursor=" + cursor] if cursor else ["--since=-7d"]  # erster Start: letzte 7 Tage übernehmen
        try:
            proc = subprocess.Popen(args + JOURNAL_MATCHES, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        except OSError as e:
            status["journal"] = "Fehler: %s" % e
            return
        status["journal"] = "ok"
        for line in proc.stdout:
            if stop.is_set():
                break
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            hit = classify(entry)
            if hit:
                ts = int(entry.get("__REALTIME_TIMESTAMP", 0)) / 1e6 or None
                store.event(*hit, ts=ts)
            cursor = entry.get("__CURSOR") or cursor
            if cursor:
                store.set_meta("journal_cursor", cursor)
        proc.kill()
        err = proc.stderr.read() if proc.stderr else ""
        if "No journal files" in err or "permission" in err.lower():
            status["journal"] = "eingeschränkt: Benutzer in Gruppe systemd-journal aufnehmen (siehe PC-AGENT.md)"
        stop.wait(10)


def journal_access():
    """Sieht dieser Benutzer das System-Journal (nötig für Anmeldungen anderer Benutzer)?"""
    try:
        out = subprocess.run(["journalctl", "-n", "1", "-o", "json", "_SYSTEMD_UNIT=systemd-logind.service"],
                             capture_output=True, text=True, timeout=10)
        return bool(out.stdout.strip()) or os.geteuid() == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


# ---------------------------------------------------------------- Dateien (inotify)

IN_MODIFY, IN_CLOSE_WRITE, IN_MOVED_FROM, IN_MOVED_TO = 0x2, 0x8, 0x40, 0x80
IN_CREATE, IN_DELETE, IN_DELETE_SELF, IN_ISDIR, IN_Q_OVERFLOW, IN_IGNORED = 0x100, 0x200, 0x400, 0x40000000, 0x4000, 0x8000
WATCH_MASK = IN_CLOSE_WRITE | IN_MOVED_FROM | IN_MOVED_TO | IN_CREATE | IN_DELETE | IN_DELETE_SELF


def file_watcher(store, dirs, stop, status):
    libc = ctypes.CDLL(ctypes.util.find_library("c") or "libc.so.6", use_errno=True)
    fd = libc.inotify_init1(0o4000)  # IN_NONBLOCK
    if fd < 0:
        status["files"] = "inotify nicht verfügbar"
        return
    wd_paths = {}

    def add(path):
        wd = libc.inotify_add_watch(fd, path.encode(), WATCH_MASK)
        if wd >= 0:
            wd_paths[wd] = path
        elif ctypes.get_errno() == 28:  # ENOSPC: zu viele Überwachungen
            status["files"] = "Grenze erreicht (fs.inotify.max_user_watches erhöhen, siehe PC-AGENT.md)"
            return False
        return True

    def add_tree(root):
        for d, subdirs, _ in os.walk(root):
            subdirs[:] = [s for s in subdirs if not s.startswith(".") and s not in IGNORED_DIRS]
            if not add(d):
                return

    for d in dirs:
        if os.path.isdir(d):
            add_tree(d)
    status["files"] = "ok · %d Ordner" % len(wd_paths)
    status["watched"] = dirs

    pending = {}  # Pfad → (Aktion, Zeit): kurz sammeln, damit z. B. Speichern nicht zehnmal auftaucht
    moved_from = {}

    def new_dir(path):
        """Neuer Ordner: überwachen und gleich durchsuchen – was darin landete, bevor die
        Überwachung griff, sonst ginge es verloren (oder ein Verschieben sähe wie Löschen aus)."""
        add_tree(path)
        for d, subdirs, files in os.walk(path):
            subdirs[:] = [x for x in subdirs if not x.startswith(".") and x not in IGNORED_DIRS]
            for f in files:
                if f.startswith(".") or f.endswith(IGNORED_SUFFIXES):
                    continue
                full = os.path.join(d, f)
                src = next((c for c, (p, _) in moved_from.items() if os.path.basename(p) == f), None)
                if src is not None:
                    pending[full] = ("moved", now(), False, moved_from.pop(src)[0])
                elif full not in pending:
                    pending[full] = ("created", now(), False)
    labels = {"created": "Neu", "modified": "Geändert", "deleted": "Gelöscht", "moved": "Verschoben"}
    while not stop.is_set():
        try:
            data = os.read(fd, 65536)
        except BlockingIOError:
            data = b""
        i = 0
        while i + 16 <= len(data):
            wd, mask, cookie, length = struct.unpack_from("iIII", data, i)
            name = data[i + 16:i + 16 + length].rstrip(b"\0").decode("utf-8", "replace")
            i += 16 + length
            if mask & IN_Q_OVERFLOW:
                store.event("file", "warn", "Zu viele Dateiänderungen", "Einige Änderungen wurden nicht erfasst.")
                continue
            base = wd_paths.get(wd)
            if mask & IN_IGNORED:
                wd_paths.pop(wd, None)
                continue
            if base is None or not name or name.startswith(".") or name.endswith(IGNORED_SUFFIXES):
                continue
            path = os.path.join(base, name)
            is_dir = bool(mask & IN_ISDIR)
            if mask & IN_CREATE:
                pending[path] = ("created", now(), is_dir)
                if is_dir and name not in IGNORED_DIRS:
                    new_dir(path)
            elif mask & IN_CLOSE_WRITE:
                prev = pending.get(path)
                pending[path] = (prev[0] if prev and prev[0] == "created" else "modified", now(), False)
            elif mask & IN_DELETE:
                if pending.get(path, ("",))[0] == "created":
                    pending.pop(path)  # gleich wieder gelöscht: kurzlebige Datei, nicht melden
                else:
                    pending[path] = ("deleted", now(), is_dir)
            elif mask & IN_MOVED_FROM:
                moved_from[cookie] = (path, now())
            elif mask & IN_MOVED_TO:
                src = moved_from.pop(cookie, None)
                if src:
                    pending[path] = ("moved", now(), is_dir, src[0])
                elif path not in pending:
                    pending[path] = ("created", now(), is_dir)
                if is_dir and name not in IGNORED_DIRS:
                    new_dir(path)
        t = now()
        for cookie, (src, ts) in list(moved_from.items()):  # aus dem überwachten Bereich verschoben
            if t - ts > 2:
                moved_from.pop(cookie)
                # in einen gerade erst entdeckten Ordner verschoben? Dann dort als „neu“ gefunden
                twin = next((p for p, v in pending.items() if v[0] == "created" and os.path.basename(p) == os.path.basename(src)), None)
                if twin:
                    pending[twin] = ("moved", pending[twin][1], pending[twin][2], src)
                else:
                    pending[src] = ("deleted", ts, False)
        for path, info in list(pending.items()):
            if t - info[1] >= 2:
                pending.pop(path)
                action, is_dir = info[0], info[2]
                home = os.path.expanduser("~")
                short = lambda p: "~" + p[len(home):] if p.startswith(home) else p
                detail = short(path) if action != "moved" else "%s → %s" % (short(info[3]), short(path))
                title = "%s: %s%s" % (labels[action], os.path.basename(path), "/" if is_dir else "")
                store.event("file", "info", title, detail, ts=info[1])
        stop.wait(0.5)


# ---------------------------------------------------------------- Gerätesteuerung

# Feste Liste – die App kann nur diese Aktionen auslösen, keine beliebigen Befehle.
POWER_ACTIONS = {
    "reboot": {"label": "Neustart", "command": ["systemctl", "--no-ask-password", "reboot"], "check": "CanReboot"},
    "poweroff": {"label": "Herunterfahren", "command": ["systemctl", "--no-ask-password", "poweroff"], "check": "CanPowerOff"},
    "suspend": {"label": "Ruhezustand", "command": ["systemctl", "--no-ask-password", "suspend"], "check": "CanSuspend"},
}


def can(check):
    """Fragt systemd-logind, ob dieser Benutzer die Aktion ohne Passwortabfrage ausführen darf:
    "yes", "challenge" (bräuchte ein Passwort – Polkit-Regel fehlt), "no", "na" oder "unknown"."""
    if not shutil.which("busctl"):
        return "unknown"
    try:
        out = subprocess.run(["busctl", "--system", "call", "org.freedesktop.login1", "/org/freedesktop/login1",
                              "org.freedesktop.login1.Manager", check], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.TimeoutExpired):
        return "unknown"
    return out.strip().split('"')[1] if '"' in out else "unknown"


def control_status(enabled):
    return {"enabled": enabled, "actions": {k: (can(v["check"]) if enabled else "off") for k, v in POWER_ACTIONS.items()}}


def run_power_action(store, action):
    info = POWER_ACTIONS[action]
    store.event("system", "warn", info["label"] + " über die App ausgelöst", socket.gethostname())

    def go():
        if os.environ.get("NDA_DRY_RUN"):  # nur für Tests: nichts wirklich ausführen
            store.event("system", "info", "Trockenlauf: " + " ".join(info["command"]))
            return
        try:
            subprocess.run(info["command"], capture_output=True, timeout=30)
        except (OSError, subprocess.TimeoutExpired) as e:
            store.event("system", "danger", info["label"] + " fehlgeschlagen", str(e))
    # kurz warten, damit die Antwort an die App noch rausgeht, bevor das System herunterfährt
    threading.Timer(1.5, go).start()


# ---------------------------------------------------------------- HTTP-API

def os_name():
    for line in read("/etc/os-release", "").splitlines():
        if line.startswith("PRETTY_NAME="):
            return line.split("=", 1)[1].strip('"')
    return platform.system()


class Handler(BaseHTTPRequestHandler):
    server_version = "nDashboardAgent/" + VERSION
    store = hw = status = auth = None
    control = False

    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "authorization, content-type")

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def authorized(self):
        if not self.auth:
            return True
        head = self.headers.get("Authorization", "")
        try:
            if head.startswith("Basic ") and base64.b64decode(head[6:]).decode("utf-8") == self.auth:
                return True
        except ValueError:
            pass
        self.send_response(401)
        self.cors()
        self.send_header("WWW-Authenticate", 'Basic realm="nDashboard Agent"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def do_GET(self):
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        if url.path == "/api/ping":  # ohne Anmeldung: nur zum Finden des Agenten
            return self.send_json(200, {"agent": "ndashboard", "version": VERSION})
        if not self.authorized():
            return
        try:
            if url.path == "/api/status":
                return self.send_json(200, {
                    "host": socket.gethostname(), "os": os_name(), "kernel": platform.release(), "version": VERSION,
                    "uptime": float((read("/proc/uptime", "0") or "0").split()[0]),
                    "journal": self.status.get("journal"), "journal_full": self.status.get("journal_full"),
                    "files": self.status.get("files"), "watched": self.status.get("watched", []),
                    "counts_24h": self.store.counts(now() - 86400),
                    "control": control_status(self.control)})
            if url.path == "/api/sensors":
                with self.hw.lock:
                    return self.send_json(200, self.hw.snapshot)
            if url.path == "/api/history":
                minutes = min(int(q.get("minutes", 60)), KEEP_DAYS * 1440)
                rows = self.store.history(q.get("metric", "cpu_temp"), now() - minutes * 60, int(q.get("points", 120)))
                return self.send_json(200, {"metric": q.get("metric", "cpu_temp"), "points": rows})
            if url.path == "/api/events":
                return self.send_json(200, {"events": self.store.events(
                    q.get("category") or None, min(int(q.get("limit", 100)), 500),
                    int(q["before"]) if q.get("before") else None,
                    float(q["since"]) if q.get("since") else None)})
        except ValueError:
            return self.send_json(400, {"error": "Ungültige Parameter"})
        self.send_json(404, {"error": "Nicht gefunden"})

    def do_POST(self):
        url = urlparse(self.path)
        if url.path != "/api/control":
            return self.send_json(404, {"error": "Nicht gefunden"})
        if not self.auth:  # Steuerung nie ohne Anmeldung
            return self.send_json(403, {"error": "Steuerung nur mit --user/--pass möglich."})
        if not self.authorized():
            return
        if not self.control:
            return self.send_json(403, {"error": "Steuerung ist auf diesem Gerät nicht freigeschaltet (Agent mit --allow-control starten)."})
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(min(length, 4096)) or b"{}")
        except ValueError:
            return self.send_json(400, {"error": "Ungültige Anfrage"})
        action = body.get("action")
        if action not in POWER_ACTIONS:
            return self.send_json(400, {"error": "Unbekannte Aktion"})
        allowed = can(POWER_ACTIONS[action]["check"])
        if allowed in ("challenge", "no"):
            return self.send_json(403, {"error": "Das System erlaubt diesem Benutzer „%s“ nicht ohne Passwort. Polkit-Regel einrichten (siehe PC-AGENT.md)." % POWER_ACTIONS[action]["label"]})
        if allowed == "na":
            return self.send_json(409, {"error": "„%s“ wird auf diesem Gerät nicht unterstützt." % POWER_ACTIONS[action]["label"]})
        run_power_action(self.store, action)
        self.send_json(202, {"ok": True, "action": action})

    def log_message(self, fmt, *args):
        pass  # keine Zugriffsprotokolle im Terminal


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def default_dirs():
    out = []
    for key in ("DESKTOP", "DOCUMENTS", "DOWNLOAD", "PICTURES"):
        try:
            p = subprocess.run(["xdg-user-dir", key], capture_output=True, text=True, timeout=5).stdout.strip()
        except (OSError, subprocess.TimeoutExpired):
            p = ""
        if p and p != os.path.expanduser("~") and os.path.isdir(p):
            out.append(p)
    return out or [os.path.expanduser("~/Dokumente"), os.path.expanduser("~/Downloads")]


def main():
    ap = argparse.ArgumentParser(description="nDashboard PC-Agent")
    ap.add_argument("--port", type=int, default=5006)
    ap.add_argument("--user", default="")
    ap.add_argument("--pass", dest="password", default="")
    ap.add_argument("--watch", action="append", help="Ordner, deren Dateien protokolliert werden (mehrfach möglich)")
    ap.add_argument("--no-files", action="store_true", help="keine Dateien protokollieren")
    ap.add_argument("--db", default=os.path.expanduser("~/.local/share/ndashboard-agent/agent.db"))
    ap.add_argument("--allow-control", action="store_true", help="Neustart/Herunterfahren/Ruhezustand aus der App erlauben (nur mit --user/--pass)")
    a = ap.parse_args()

    store, hw, stop = Store(a.db), Hardware(), threading.Event()
    status = {"journal_full": journal_access()}
    dirs = [] if a.no_files else [os.path.abspath(os.path.expanduser(d)) for d in (a.watch or default_dirs())]
    store.event("system", "info", "Agent gestartet", "%s · %s" % (socket.gethostname(), os_name()))

    threading.Thread(target=sampler, args=(store, hw, stop), daemon=True).start()
    threading.Thread(target=journal_follower, args=(store, stop, status), daemon=True).start()
    if dirs:
        threading.Thread(target=file_watcher, args=(store, dirs, stop, status), daemon=True).start()
    else:
        status["files"] = "aus"

    # systemctl stop schickt SIGTERM: wie Strg+C behandeln, damit "Agent beendet" protokolliert wird
    def on_term(*_):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, on_term)
    Handler.store, Handler.hw, Handler.status = store, hw, status
    Handler.auth = (a.user + ":" + a.password) if a.user else None
    Handler.control = bool(a.allow_control and a.user)
    print("nDashboard PC-Agent", VERSION)
    print("Adresse für die App:  http://%s:%d" % (local_ip(), a.port))
    print("Benutzer:", a.user or "(ohne Anmeldung – nicht empfohlen)")
    print("Überwachte Ordner:", ", ".join(dirs) or "(keine)")
    if a.allow_control and not a.user:
        print("Hinweis: --allow-control wird ohne --user/--pass ignoriert.")
    print("Steuerung (Neustart/Herunterfahren):", "freigeschaltet" if Handler.control else "aus")
    if not status["journal_full"]:
        print("Hinweis: System-Journal nicht lesbar – An-/Abmeldungen fehlen. Siehe PC-AGENT.md (Gruppe systemd-journal).")
    print("Beenden mit Strg+C")
    try:
        ThreadingHTTPServer(("0.0.0.0", a.port), Handler).serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        store.event("system", "info", "Agent beendet", datetime.now().strftime("%H:%M:%S"))


if __name__ == "__main__":
    main()
