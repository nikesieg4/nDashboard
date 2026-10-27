# nDashboard

App im **Terminal Ops**-Design (dunkles Kontrollterminal: schwarze Panels auf Punktraster, Signalgelb, Eckklammern).
Enthalten sind alle Seiten des App-Templates. Funktionsfähig sind die **Anmeldung**, die **Dateien auf deinem NAS**, die **Sensoren** (Protokoll und Hardware deines PCs), das **Management** (eigene Ziele, Codes-Admin des Disponenten-Simulators, ABIS-Konsole des Bürgerportals) und die **Steuereinheit** (PC und NAS neu starten/herunterfahren); News zeigt noch Beispieldaten, Sicherheit ist noch mit nichts verbunden, Chat ist ausgeschaltet.

## Anmeldung

Beim Start fragt die App nach **Benutzer** (Standard „Administrator“) und **Passwort** – das ist das Konto vom **Bürgerportal** (ABIS-Konsole; Zugang wie bei der Konsole nur für Administrator, Level 5/6 und ABIS-Mitglieder).

Das Passwort für den **Disponenten-Simulator** (Codes-Admin) trägst du einmal unter **Einstellungen → Konten** ein. Es bleibt nur auf dem Gerät und wird erst benutzt, wenn der Login fürs Bürgerportal geklappt hat – dann meldet die App automatisch auch beim Spiel an. Nach 3 Fehlversuchen wartet die App immer länger. Klappt das Spiel nicht (z. B. Passwort geändert), zeigt der Reiter Spiel ein Passwortfeld.

Die Sitzungen liegen nur im Speicher: Bei jedem App-Start und nach **20 Minuten ohne Eingabe** fragt die App wieder nach dem Passwort. Ohne Internet geht es mit **Ohne Anmeldung weiter** in die App – Dateien, Sensoren und Steuerung laufen übers Heimnetz/VPN, nur die Admin-Reiter bleiben gesperrt (das gespeicherte Spiel-Passwort wird dann nicht benutzt).

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

## Steuereinheit: PC und NAS steuern

Auf der Seite **Steuereinheit** siehst du, ob PC und NAS online sind, und kannst sie **neu starten**, **herunterfahren** oder in den **Ruhezustand** schicken – jeweils mit Rückfrage. Dafür läuft `pc-agent.py` auf beiden Geräten mit `--allow-control`. Es gibt bewusst keine freie Kommandozeile, nur diese festen Aktionen. Einrichtung: [PC-AGENT.md, Abschnitte 6 und 7](tools/PC-AGENT.md).

## Management: Ziele und Sparpläne

Auf der Seite **Management** legst du eigene Ziele an, z. B. „Server“, und fügst die Teile mit Preis hinzu (16 GB RAM für 250 €, CPU für 20 € → 270 €). Unter **Gespart** trägst du ein, was du schon zurückgelegt hast. Die App zeigt dann den Fortschritt (10 / 270 € = 3 %) und was noch fehlt (260 €). Teile, die du schon gekauft hast, hakst du ab – sie zählen dann als gedeckt. Mit einem Zieldatum rechnet die App aus, wie viel du pro Woche sparen musst.

Die Ziele werden auf dem NAS in `/.ndashboard/ziele.json` gespeichert, damit Handy und PC dieselben sehen. Ohne NAS-Verbindung bleiben sie nur auf dem jeweiligen Gerät.

### Spiel (Disponenten-Simulator)

Unter **Management → Spiel** dieselben Funktionen wie [Disponenten-Simulator-Admin](https://github.com/nikesieg4/Disponenten-Simulator-Admin): Codes anlegen (Geld, Personal mit Ausbildung, Gebäude- und Erweiterungs-Gutscheine; Ablaufdatum, max. Spieler, nur neue Konten, nur Premium), bearbeiten, (de)aktivieren, löschen, sehen wer eingelöst hat; EP, RP und Premium-Tage schenken oder abziehen; Premium- und Discord-Liste. Alle Prüfungen macht der Server (`admin_*`-Funktionen in Supabase); die Spiel-Sitzung gilt 2 Stunden.

### Bürgerportal (ABIS-Konsole)

Unter **Management → Bürgerportal** die komplette [ABIS-Sicherheitskonsole](https://github.com/nikesieg4/dPUbtsXv3y) mit derselben Datenbank und denselben Rechten (RLS, Level, Zuordnungen, Einzelrechte). Oben wählst du den **Bereich**; gesperrte Bereiche sind markiert:

- **Überwachung:** Lagezentrum, Sicherheitsprotokoll (Bank-Audit, Anmeldungen, Datenänderungen, Verwaltungsaktionen, Live; CSV-Export), Datenbank (Datensätze, Tabellen & RLS, Profile, Konsistenz), Transaktionen
- **Buchhaltung:** Bankmanagement (Konten, Geld buchen, Dauerzahlungen, Journal, Steuern, Integrität)
- **Verwaltung:** Bürgerregister, Anmeldedaten, Anträge, Antragsarten, Termine, Justiz & Polizei, Kommunikation
- **Steuerung:** Zuordnungen, Berechtigungen, Wahl & Umfrage, System & Wartung
- **Konto:** Mein Konto (Rechte, Passwort ändern)

Exporte (CSV, JSON, Sicherung) landen im Download-Ordner – auf Android über die App, weil die WebView keine `blob:`-Links herunterladen kann.

Lagezentrum, Register und Anträge sind in `web/js/portal.js` nachgebaut. Die übrigen Bereiche liegen als unveränderte Kopie der Konsole in `portal/pages/` und `portal/components/`; `portal/lib/` verbindet sie mit der Anmeldung und dem Datenzugriff von nDashboard. Nach Änderungen in `portal/` (z. B. neue Version aus dem Konsolen-Repo kopiert) `tools/build-portal.sh` ausführen (braucht Node.js) und `web/js/portal-abis.js` mit einchecken – der Build prüft, dass beides zusammenpasst.

## Zuhause und unterwegs (WLAN / VPN)

Für den Zugriff von unterwegs empfiehlt sich [Tailscale](https://tailscale.com) auf PC, NAS und Handy (kein Port im Router freigeben!). In den Einstellungen hat jede Verbindung dann zwei Adressen: **im WLAN** (`192.168.…`) und **über VPN** (Tailscale, `100.…`). Oben unter **Netzwerk** wählst du:

- **Automatisch** (Standard): Beim Start und wenn die App wieder in den Vordergrund kommt, prüft sie kurz, ob eine WLAN-Adresse antwortet – dann WLAN, sonst VPN. So kannst du Tailscale zuhause ausschalten.
- **WLAN** oder **VPN**: fest eingestellt.

Im Menü steht jederzeit, welches Netz gerade benutzt wird. Ältere Einstellungen mit einer Tailscale-Adresse werden automatisch ins VPN-Feld übernommen.

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
| Anmeldung (Bürgerportal + Spiel) | `#/login` | LoginScreen |
| Start / Terminal | `#/home` | TerminalScreen |
| Steuereinheit (PC & NAS) | `#/control` | ControlUnitScreen |
| Dateien (NAS) | `#/files?p=/ordner` | FileManagerScreen |
| Datei (Editor/Vorschau) | `#/file?p=/ordner/datei.txt` | FileManagerScreen |
| Sensoren (PC-Monitor) | `#/sensors` | MotionSensorScreen |
| Sicherheit (nicht verbunden) | `#/security` | SecurityScreen |
| Management (Ziele) | `#/management` | ManagementScreen |
| Ziel (Teile, Erspartes) | `#/goal?id=…` | ManagementScreen |
| Management → Spiel (Codes-Admin) | `#/game` | ManagementScreen |
| Management → Bürgerportal (ABIS) | `#/portal?s=lage` · `…?s=register&id=…` · `…?s=bank` usw. | ManagementScreen |
| Bulletin (News) | `#/news` | NewsScreen |
| Chat (ausgeschaltet) | `#/chat` | ChatScreen |
| Einstellungen (Konten, Netzwerk, NAS, PC-Agent, NAS-Agent, Updates) | `#/settings` | Navigations-Drawer |

Auf dem Handy gibt es unten eine Leiste mit fünf Einträgen (Start, Dateien, Sensoren, Steuerung, Mehr) und links ein ausklappbares Menü. Ab 900 px Breite (Desktop) ist das Menü fest als Seitenleiste eingeblendet.

## Aufbau

```
web/        Gemeinsame Oberfläche (HTML/CSS/JS), wird von beiden Plattformen geladen
  js/ops.js     Komponenten des Terminal-Ops-Design-Systems (window.Ops)
  js/app.js     Alle Seiten + Navigation
  js/network.js WLAN/VPN-Umschaltung (welche Adresse benutzt wird)
  js/nas.js     WebDAV-Client fürs NAS
  js/files.js   Seiten Dateien und Datei (Editor/Vorschau)
  js/services.js Verbindungen zu den Agenten (PC, NAS)
  js/monitor.js Seite Sensoren
  js/goals.js   Seiten Management (Ziele) und Ziel
  js/control.js Seite Steuereinheit
  js/auth.js    Anmeldung (Bürgerportal + Spiel), automatische Abmeldung
  js/game.js    Management → Spiel (Codes-Admin des Disponenten-Simulators)
  js/portal.js  Management → Bürgerportal (ABIS-Konsole): Datenzugriff, Lagezentrum, Register, Anträge
  js/portal-abis.js übrige Konsolen-Bereiche, gebaut aus portal/ (nicht von Hand ändern)
  js/portal-model.js Datenmodell und Rechte des Bürgerportals (aus dPUbtsXv3y)
  js/ui.js      Auswahlliste, Chips, Fenster für die Admin-Bereiche
  js/update.js  Prüft GitHub Releases auf neue Versionen
  js/version.js Versionsnummer (setzt GitHub Actions beim Bauen)
  css/          Design-Tokens, Komponenten-CSS, App-Layout, lokale Schriften
  vendor/       React 18.3.1 und supabase-js 2.117.3 (offline eingebunden)
android/    Gradle-Projekt: WebView-Hülle, bindet web/ als Assets ein
linux/      GTK4-/WebKitGTK-Hülle (Python) + Flatpak-Manifest
portal/     Bereiche der ABIS-Konsole (aus dPUbtsXv3y), gebaut mit tools/build-portal.sh
tools/      nas-server.py (WebDAV-Server fürs NAS), pc-agent.py (PC-Protokoll), build-portal.sh + Anleitungen
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
