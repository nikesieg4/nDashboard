# nDashboard

App im **Terminal Ops**-Design (dunkles Kontrollterminal: schwarze Panels auf Punktraster, Signalgelb, Eckklammern).
Enthalten sind alle Seiten des App-Templates. Funktionsfähig sind die **Dateien auf deinem NAS**, und die **Sensoren** (Protokoll und Hardware deines PCs); die übrigen Seiten zeigen noch Beispieldaten. Kameras sind als „Nicht verfügbar“ markiert.

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

## Sensoren: PC-Protokoll

Die Seite **Sensoren** zeigt, was auf deinem Linux-PC passiert. Dafür läuft dort [`tools/pc-agent.py`](tools/pc-agent.py) als Hintergrunddienst (nur Python 3). Er protokolliert:

- Hardware: CPU-Last und -Temperatur, alle Temperatur- und Lüftersensoren, RAM, Datenträger, Netzwerk, Akku (Verlauf 7 Tage, Diagramm 1 h / 24 h / 7 Tage)
- An- und Abmeldungen, SSH-Anmeldungen, Herunterfahren und Neustart
- Abstürze (Coredumps) und Abbrüche wegen Speichermangel
- Dateien: neu, geändert, gelöscht, verschoben in Schreibtisch, Dokumente, Downloads, Bilder (oder eigenen Ordnern)
- Warnungen bei hoher Temperatur oder vollem Speicher

Einrichtung Schritt für Schritt: [PC-Agent einrichten](tools/PC-AGENT.md). In der App unter **Einstellungen → PC-Agent** Adresse (Standard-Port 5006), Benutzer und Passwort eintragen.

## Installieren und Updates

Jeder Push auf `main` veröffentlicht automatisch eine neue Version (`.github/workflows/build.yml`):

- ein [GitHub Release](https://github.com/nikesieg4/nDashboard/releases/latest) mit `nDashboard.apk` und `nDashboard.flatpak`
- eine Flatpak-Paketquelle unter <https://nikesieg4.github.io/nDashboard/>

**Android:** Die APK aus dem [neuesten Release](https://github.com/nikesieg4/nDashboard/releases/latest) einmal installieren. Danach prüft die App beim Start (höchstens einmal pro Stunde) auf GitHub, ob es eine neuere Version gibt, und zeigt „Update verfügbar“. Ein Tipp auf **Jetzt aktualisieren** lädt die neue APK und öffnet den Installieren-Dialog. Beim ersten Mal fragt Android, ob nDashboard Apps installieren darf. Manuell geht es unter Einstellungen → Updates.

**Linux:** Einmal über die Paketquelle installieren:
```sh
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user https://nikesieg4.github.io/nDashboard/ndashboard.flatpakref
```
Danach kommen Updates wie bei jeder anderen Flatpak-App über die Softwareverwaltung (GNOME Software, KDE Discover) oder mit `flatpak update`. Die App weist zusätzlich auf neue Versionen hin.

Jeder Push (auch auf andere Branches) baut beide Dateien außerdem im Actions-Lauf unter **Artifacts**.

### Einmalige Einrichtung im Repo

Damit `main` veröffentlichen kann, braucht das Repo:

1. **Secrets** unter *Settings → Secrets and variables → Actions → New repository secret*:
   - `ANDROID_KEYSTORE_BASE64` – Android-Signaturschlüssel (Base64). Alle Updates müssen mit demselben Schlüssel signiert sein, sonst lehnt Android sie ab.
   - `ANDROID_KEYSTORE_PASSWORD` – Passwort dazu
   - `FLATPAK_GPG_PRIVATE_KEY` – GPG-Schlüssel, mit dem die Flatpak-Paketquelle signiert wird. Der öffentliche Teil liegt in `linux/flatpak-repo-key.gpg.base64`.
2. **GitHub Pages** unter *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.

Fehlen die Secrets, bauen Pull Requests trotzdem (APK mit Debug-Schlüssel), nur das Veröffentlichen auf `main` schlägt mit einem Hinweis fehl.

## Seiten

| Seite | Hash | Vorlage im Template |
|---|---|---|
| Anmeldung | `#/login` | LoginScreen |
| Start / Terminal | `#/home` | TerminalScreen |
| Steuereinheit | `#/control` | ControlUnitScreen |
| Dateien (NAS) | `#/files?p=/ordner` | FileManagerScreen |
| Datei (Editor/Vorschau) | `#/file?p=/ordner/datei.txt` | FileManagerScreen |
| Sensoren (PC-Monitor) | `#/sensors` | MotionSensorScreen |
| Sicherheit | `#/security` | SecurityScreen |
| Management | `#/management` | ManagementScreen |
| Bulletin (News) | `#/news` | NewsScreen |
| Chat-Kanäle | `#/chat` | ChatScreen |
| Unterhaltung | `#/conversation` | ChatScreen |
| Einstellungen (NAS, PC-Agent, Updates) | `#/settings` | Navigations-Drawer |

Auf dem Handy gibt es unten eine Leiste mit fünf Einträgen und links ein ausklappbares Menü. Ab 900 px Breite (Desktop) ist das Menü fest als Seitenleiste eingeblendet.

## Aufbau

```
web/        Gemeinsame Oberfläche (HTML/CSS/JS), wird von beiden Plattformen geladen
  js/ops.js     Komponenten des Terminal-Ops-Design-Systems (window.Ops)
  js/app.js     Alle Seiten + Navigation
  js/nas.js     WebDAV-Client fürs NAS
  js/files.js   Seiten Dateien und Datei (Editor/Vorschau)
  js/services.js Verbindung zum PC-Agenten
  js/monitor.js Seite Sensoren
  js/update.js  Prüft GitHub Releases auf neue Versionen
  js/version.js Versionsnummer (setzt GitHub Actions beim Bauen)
  css/          Design-Tokens, Komponenten-CSS, App-Layout, lokale Schriften
  vendor/       React 18.3.1 (offline eingebunden)
android/    Gradle-Projekt: WebView-Hülle, bindet web/ als Assets ein
linux/      GTK4-/WebKitGTK-Hülle (Python) + Flatpak-Manifest
tools/      nas-server.py (WebDAV-Server fürs NAS), pc-agent.py (PC-Protokoll) + Anleitungen
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
