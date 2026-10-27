# PC-Agent einrichten (Seite „Sensoren“)

`pc-agent.py` läuft im Hintergrund auf deinem Linux-PC, protokolliert, was dort passiert, und stellt es der App im Heimnetz bereit:

| Bereich | Was erfasst wird |
|---|---|
| Hardware | CPU-Last, CPU-Temperatur, alle Temperatur- und Lüftersensoren, RAM, Datenträger, Netzwerk, Akku – alle 10 Sekunden, Verlauf 7 Tage |
| Anmeldung | An- und Abmeldungen, SSH-Anmeldungen (auch fehlgeschlagene) |
| Abstürze | Programme, die abstürzen (Coredump), und Programme, die wegen Speichermangel beendet werden |
| System | Herunterfahren, Neustart, Ruhezustand, Start/Ende des Agenten |
| Dateien | Neu, geändert, gelöscht, verschoben – in Schreibtisch, Dokumente, Downloads und Bilder (oder den Ordnern, die du angibst) |
| Warnungen | Temperatur zu hoch, Arbeitsspeicher oder Datenträger fast voll |

Gebraucht wird nur Python 3 (unter Fedora vorinstalliert). Die Daten liegen in `~/.local/share/ndashboard-agent/agent.db`.

---

## 1. Herunterladen

Im Terminal auf dem PC:

```sh
mkdir -p ~/.local/bin
curl -fsSL https://raw.githubusercontent.com/nikesieg4/nDashboard/main/tools/pc-agent.py -o ~/.local/bin/pc-agent.py
```

## 2. Kurz ausprobieren

```sh
python3 ~/.local/bin/pc-agent.py --user ich --pass geheim
```

Benutzer und Passwort frei wählen (ein Passwort, das du sonst nirgends nutzt). Das Fenster zeigt die Adresse für die App, z. B. `http://192.168.1.20:5006`. Mit `Strg + C` beenden.

## 3. Als Dienst einrichten (startet automatisch)

```sh
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/ndashboard-agent.service <<'EOF'
[Unit]
Description=nDashboard PC-Agent
After=network-online.target

[Service]
ExecStart=/usr/bin/python3 %h/.local/bin/pc-agent.py --user ich --pass geheim
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now ndashboard-agent
```

`ich` und `geheim` in der `ExecStart`-Zeile ersetzen. Andere Ordner überwachen: `--watch ~/Projekte --watch ~/Dokumente` anhängen (ersetzt die Standardordner). Keine Dateien protokollieren: `--no-files`.

**Auch ohne Anmeldung laufen lassen** – sonst startet der Agent erst, wenn du dich anmeldest, und verpasst die Anmeldung selbst:

```sh
loginctl enable-linger $USER
```

## 4. Journal: An-/Abmeldungen und Abstürze

Anmeldungen und Abstürze stehen im System-Journal. Damit der Agent es lesen darf, einmal:

```sh
sudo usermod -aG systemd-journal $USER
```

Danach **abmelden und neu anmelden** (oder neu starten) und den Dienst neu starten: `systemctl --user restart ndashboard-agent`. Solange das fehlt, zeigt die App „An-/Abmeldungen unvollständig“.

Beim ersten Start übernimmt der Agent die Einträge der letzten 7 Tage.

## 5. In der App eintragen

Einstellungen → **PC-Agent (Sensoren)**: Adresse aus Schritt 2, Benutzer und Passwort → **Verbinden & speichern**. Auf dem Handy die **IP-Adresse** statt `pc-philipp.local` verwenden.

---

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| App: „PC nicht erreichbar“ | Läuft der Dienst? `systemctl --user status ndashboard-agent`. Firewall: Fedora Workstation erlaubt Ports ab 1025 im Heimnetz normalerweise; sonst `sudo firewall-cmd --add-port=5006/tcp --permanent && sudo firewall-cmd --reload` |
| Keine Temperaturen | `sudo dnf install lm_sensors && sudo sensors-detect --auto`, danach PC neu starten |
| „Grenze erreicht“ bei Dateien | sehr viele Ordner: `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/90-inotify.conf && sudo sysctl --system` |
| Ausgaben des Agenten ansehen | `journalctl --user -u ndashboard-agent -f` |
| Agent aktualisieren | Schritt 1 wiederholen, dann `systemctl --user restart ndashboard-agent` |

## Sicherheit

- Der Agent liefert nur Daten **aus** (lesend); über die App lässt sich am PC nichts verändern.
- Die Verbindung ist unverschlüsselt (HTTP) und nur fürs Heimnetz gedacht. Port 5006 nie im Router freigeben.
- Im Protokoll stehen Dateinamen und Pfade aus den überwachten Ordnern – überwache nur, was du in der App sehen willst.
