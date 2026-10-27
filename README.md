# nDashboard

App im **Terminal Ops**-Design (dunkles Kontrollterminal: schwarze Panels auf Punktraster, Signalgelb, Eckklammern).
Diese erste Version enthält alle Seiten des App-Templates, aber noch keine Funktion. Nur die Navigation zwischen den Seiten funktioniert.

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
| Dateien | `#/files` | FileManagerScreen |
| Bewegungsmelder | `#/sensors` | MotionSensorScreen |
| Sicherheit | `#/security` | SecurityScreen |
| Konten (Banking) | `#/banking` | BankingScreen |
| Management | `#/management` | ManagementScreen |
| Bulletin (News) | `#/news` | NewsScreen |
| Chat-Kanäle | `#/chat` | ChatScreen |
| Unterhaltung | `#/conversation` | ChatScreen |
| Einstellungen | `#/settings` | Navigations-Drawer |

Auf dem Handy gibt es unten eine Leiste mit fünf Einträgen und links ein ausklappbares Menü. Ab 900 px Breite (Desktop) ist das Menü fest als Seitenleiste eingeblendet.

## Aufbau

```
web/        Gemeinsame Oberfläche (HTML/CSS/JS), wird von beiden Plattformen geladen
  js/ops.js     Komponenten des Terminal-Ops-Design-Systems (window.Ops)
  js/app.js     Alle Seiten + Navigation
  css/          Design-Tokens, Komponenten-CSS, App-Layout, lokale Schriften
  vendor/       React 18.3.1 (offline eingebunden)
android/    Gradle-Projekt: WebView-Hülle, bindet web/ als Assets ein
linux/      GTK4-/WebKitGTK-Hülle (Python) + Flatpak-Manifest
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
