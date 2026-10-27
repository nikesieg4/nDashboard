# nDashboard

App im **Terminal Ops**-Design (dunkles Kontrollterminal: schwarze Panels auf Punktraster, Signalgelb, Eckklammern).
Enthalten sind alle Seiten des App-Templates. Funktionsfähig sind bisher die **Dateien auf deinem NAS** (siehe unten); die übrigen Seiten zeigen noch Beispieldaten. Kameras und Banking sind als „Nicht verfügbar“ markiert.

## Dateien vom NAS

Die Seite **Dateien** verbindet sich per WebDAV mit [`tools/nas-server.py`](tools/nas-server.py), einem kleinen Server, der einen Ordner (USB-Stick, Festplatte) im Heimnetz freigibt. Er läuft auf Raspberry Pi, Linux, Mac oder Windows und braucht nur Python 3.

```sh
python3 tools/nas-server.py /pfad/zum/ordner --user ich --pass geheim
# zeigt die Adresse für die App an, z. B. http://192.168.1.42:5005
```

In der App unter **Einstellungen → NAS-Verbindung** Adresse, Benutzer und Passwort eintragen und **Verbinden & speichern** drücken. Danach kann die App:

- Ordner durchsuchen (Pfadleiste, `..`, Android-Zurück-Taste), im Ordner suchen, nach Ordnern/Dokumenten/Medien filtern
- Textdateien (txt, md, csv, json, Code …) öffnen, bearbeiten und speichern (auch mit Strg+S); Bilder, Videos, Audio und auf dem PC PDFs ansehen
- Dateien hochladen (mehrere auf einmal, mit Fortschritt) und herunterladen (Android: Ordner „Downloads“, Linux: Download-Ordner)
- neue Ordner und Textdateien anlegen, umbenennen, verschieben, löschen (Ordner samt Inhalt, mit Rückfrage)
- den Speicherplatz des NAS anzeigen

Ausführliche Anleitungen: [Rechner als NAS](tools/NETZWERKSPEICHER.md) · [Raspberry Pi als NAS](tools/RASPBERRYPI.md).

Die Zugangsdaten bleiben nur auf dem jeweiligen Gerät. Die Verbindung ist unverschlüsselt (HTTP) und nur fürs Heimnetz gedacht – den Port nie im Router freigeben.

## Fertige Builds

| Plattform | Datei |
|---|---|
| Android (Handy) | [`dist/nDashboard.apk`](dist/nDashboard.apk) |
| Linux-PC (Flatpak) | [`dist/nDashboard.flatpak`](dist/nDashboard.flatpak) |

Jeder Push baut beide Dateien außerdem neu über GitHub Actions (`.github/workflows/build.yml`). Sie liegen dann im jeweiligen Lauf unter **Artifacts**.

### Installieren

**Android:** APK aufs Handy kopieren, öffnen und „Installation aus unbekannten Quellen“ erlauben. Die APK ist vorerst mit einem Debug-Schlüssel signiert.

**Linux:**
```sh
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user nDashboard.flatpak   # lädt bei Bedarf die GNOME-51-Laufzeit nach
flatpak run de.nikesieg4.nDashboard
```

## Seiten

| Seite | Hash | Vorlage im Template |
|---|---|---|
| Anmeldung | `#/login` | LoginScreen |
| Start / Terminal | `#/home` | TerminalScreen |
| Steuereinheit | `#/control` | ControlUnitScreen |
| Dateien (NAS) | `#/files?p=/ordner` | FileManagerScreen |
| Datei (Editor/Vorschau) | `#/file?p=/ordner/datei.txt` | FileManagerScreen |
| Bewegungsmelder | `#/sensors` | MotionSensorScreen |
| Sicherheit | `#/security` | SecurityScreen |
| Konten (Banking) | `#/banking` | BankingScreen |
| Management | `#/management` | ManagementScreen |
| Bulletin (News) | `#/news` | NewsScreen |
| Chat-Kanäle | `#/chat` | ChatScreen |
| Unterhaltung | `#/conversation` | ChatScreen |
| Einstellungen (NAS-Verbindung) | `#/settings` | Navigations-Drawer |

Auf dem Handy gibt es unten eine Leiste mit fünf Einträgen und links ein ausklappbares Menü. Ab 900 px Breite (Desktop) ist das Menü fest als Seitenleiste eingeblendet.

## Aufbau

```
web/        Gemeinsame Oberfläche (HTML/CSS/JS), wird von beiden Plattformen geladen
  js/ops.js     Komponenten des Terminal-Ops-Design-Systems (window.Ops)
  js/app.js     Alle Seiten + Navigation
  js/nas.js     WebDAV-Client fürs NAS
  js/files.js   Seiten Dateien und Datei (Editor/Vorschau)
  css/          Design-Tokens, Komponenten-CSS, App-Layout, lokale Schriften
  vendor/       React 18.3.1 (offline eingebunden)
android/    Gradle-Projekt: WebView-Hülle, bindet web/ als Assets ein
linux/      GTK4-/WebKitGTK-Hülle (Python) + Flatpak-Manifest
tools/      nas-server.py (WebDAV-Server fürs NAS) + Anleitungen
dist/       Fertig gebaute APK und Flatpak
```

## Selbst bauen

**APK** (benötigt JDK 17 und Android-SDK mit Platform 34):
```sh
cd android
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

**Flatpak** (benötigt `flatpak-builder`):
```sh
flatpak-builder --user --force-clean --install-deps-from=flathub --repo=repo build linux/de.nikesieg4.nDashboard.yml
flatpak build-bundle repo nDashboard.flatpak de.nikesieg4.nDashboard
```

**Im Browser ansehen:** `web/index.html` direkt öffnen.
