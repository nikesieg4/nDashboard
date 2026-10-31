#!/usr/bin/env python3
"""nDashboard für Linux: zeigt die gemeinsame Weboberfläche (web/) in einem GTK4-Fenster."""
import json
import locale
import os
import sys

# Fehlt die Sprache des Systems in der Flatpak-Laufzeit, fällt glibc auf ASCII zurück.
# WebKit startet seine Prozesse dann über flatpak-spawn, das an Umlauten in
# Umgebungsvariablen scheitert ("Invalid byte sequence") – WebKit bricht ab.
# Deshalb in diesem Fall auf das immer vorhandene C.UTF-8 ausweichen.
try:
    locale.setlocale(locale.LC_ALL, "")
except locale.Error:
    os.environ["LC_ALL"] = "C.UTF-8"
    locale.setlocale(locale.LC_ALL, "C.UTF-8")

import gi  # noqa: E402

gi.require_version("Gtk", "4.0")
gi.require_version("WebKit", "6.0")
from gi.repository import Gio, GLib, Gtk, WebKit  # noqa: E402

APP_ID = "de.nikesieg4.nDashboard"
WEB_DIR = os.environ.get("NDASHBOARD_WEB_DIR", "/app/share/ndashboard/web")


class Window(Gtk.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title="nDashboard")
        self.set_default_size(1280, 800)
        self.set_size_request(360, 560)

        view = self.view = WebKit.WebView()
        view.get_settings().set_allow_file_access_from_file_urls(True)
        view.set_background_color(self._rgba("#121212"))
        view.get_network_session().connect("download-started", self._on_download)
        view.connect("decide-policy", self._on_policy)
        # Benachrichtigungen aus web/js/notify.js: window.webkit.messageHandlers.ndnotify.postMessage({...})
        content = view.get_user_content_manager()
        content.register_script_message_handler("ndnotify", None)
        content.connect("script-message-received::ndnotify", self._on_notify)
        view.load_uri(Gio.File.new_for_path(os.path.join(WEB_DIR, "index.html")).get_uri())
        self.set_child(view)

    def _on_notify(self, _manager, value):
        """Als Systembenachrichtigung zeigen (im Flatpak über das Benachrichtigungs-Portal)."""
        try:
            data = json.loads(value.to_json(0))
        except (TypeError, ValueError):
            return
        note = Gio.Notification.new(str(data.get("title") or "nDashboard"))
        note.set_body(str(data.get("body") or ""))
        note.set_default_action_and_target_value("app.open", GLib.Variant.new_string(str(data.get("url") or "")))
        self.get_application().send_notification(str(data.get("id") or "nd"), note)

    def open_page(self, url):
        """Seite der App öffnen (Tipp auf eine Benachrichtigung), z. B. #/calendar?d=2026-11-02."""
        self.present()
        if url.startswith("#/"):
            self.view.evaluate_javascript("location.hash = %s;" % json.dumps(url), -1, None, None, None, None, None)

    def _on_policy(self, _view, decision, kind):
        """Links nach außen (tagesschau.de, GitHub) im Browser öffnen statt in der App."""
        if kind not in (WebKit.PolicyDecisionType.NAVIGATION_ACTION, WebKit.PolicyDecisionType.NEW_WINDOW_ACTION):
            return False
        uri = decision.get_navigation_action().get_request().get_uri()
        if not uri.startswith(("http://", "https://")):
            return False
        Gtk.UriLauncher.new(uri).launch(self, None, None, None)
        decision.ignore()
        return True

    def _on_download(self, _session, download):
        """Downloads aus der App (z. B. Dateien vom NAS) landen im Download-Ordner."""
        download.connect("decide-destination", self._decide_destination)

    @staticmethod
    def _decide_destination(download, suggested):
        folder = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_DOWNLOAD) or GLib.get_home_dir()
        os.makedirs(folder, exist_ok=True)
        name = os.path.basename(suggested) or "download"
        stem, ext = os.path.splitext(name)
        target, n = os.path.join(folder, name), 1
        while os.path.exists(target):  # nichts überschreiben: datei (1).txt, datei (2).txt, …
            target = os.path.join(folder, "%s (%d)%s" % (stem, n, ext))
            n += 1
        download.set_destination(target)
        return True

    @staticmethod
    def _rgba(hex_color):
        from gi.repository import Gdk

        color = Gdk.RGBA()
        color.parse(hex_color)
        return color


class App(Gtk.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID, flags=Gio.ApplicationFlags.DEFAULT_FLAGS)

    def do_startup(self):
        Gtk.Application.do_startup(self)
        action = Gio.SimpleAction.new("open", GLib.VariantType.new("s"))
        action.connect("activate", self._on_open)
        self.add_action(action)

    def do_activate(self):
        win = self.get_active_window() or Window(self)
        win.present()

    def _on_open(self, _action, param):
        win = self.get_active_window() or Window(self)
        win.open_page(param.get_string())


if __name__ == "__main__":
    sys.exit(App().run(sys.argv))
