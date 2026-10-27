#!/usr/bin/env python3
"""nDashboard für Linux: zeigt die gemeinsame Weboberfläche (web/) in einem GTK4-Fenster."""
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
from gi.repository import Gio, Gtk, WebKit  # noqa: E402

APP_ID = "de.nikesieg4.nDashboard"
WEB_DIR = os.environ.get("NDASHBOARD_WEB_DIR", "/app/share/ndashboard/web")


class Window(Gtk.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title="nDashboard")
        self.set_default_size(1280, 800)
        self.set_size_request(360, 560)

        view = WebKit.WebView()
        view.get_settings().set_allow_file_access_from_file_urls(True)
        view.set_background_color(self._rgba("#121212"))
        view.load_uri(Gio.File.new_for_path(os.path.join(WEB_DIR, "index.html")).get_uri())
        self.set_child(view)

    @staticmethod
    def _rgba(hex_color):
        from gi.repository import Gdk

        color = Gdk.RGBA()
        color.parse(hex_color)
        return color


class App(Gtk.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID, flags=Gio.ApplicationFlags.DEFAULT_FLAGS)

    def do_activate(self):
        win = self.get_active_window() or Window(self)
        win.present()


if __name__ == "__main__":
    sys.exit(App().run(sys.argv))
