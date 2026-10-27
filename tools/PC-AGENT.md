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
| Steuerung (optional) | Neustart, Herunterfahren, Ruhezustand aus der App – nur nach Freischaltung, siehe Abschnitt 6 |

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

## 6. Steuerung: Neustart, Herunterfahren, Ruhezustand (optional)

Auf der Seite **Steuereinheit** kannst du PC und NAS neu starten, herunterfahren oder in den Ruhezustand schicken. Aus Sicherheitsgründen gibt es **keine freie Kommandozeile** – nur diese drei festen Aktionen, jede mit Rückfrage in der App und nur mit Benutzer und Passwort.

**a) Freischalten:** `--allow-control` an die `ExecStart`-Zeile anhängen, dann `systemctl --user daemon-reload && systemctl --user restart ndashboard-agent`. Ohne diesen Schalter lehnt der Agent jede Steuerung ab.

**b) Dem System erlauben, dass dein Benutzer ohne Passwortabfrage neu starten darf** (sonst zeigt die App bei den Knöpfen ein „*“). `BENUTZER` durch deinen Linux-Benutzernamen ersetzen:

```sh
sudo tee /etc/polkit-1/rules.d/50-ndashboard.rules <<'ENDE'
polkit.addRule(function (action, subject) {
  var erlaubt = ["org.freedesktop.login1.reboot", "org.freedesktop.login1.reboot-multiple-sessions",
                 "org.freedesktop.login1.power-off", "org.freedesktop.login1.power-off-multiple-sessions",
                 "org.freedesktop.login1.suspend", "org.freedesktop.login1.suspend-multiple-sessions"];
  if (subject.user == "BENUTZER" && erlaubt.indexOf(action.id) >= 0) return polkit.Result.YES;
});
ENDE
```

Die Regel gilt sofort. Sie erlaubt diesem Benutzer nur Neustart, Herunterfahren und Ruhezustand – sonst nichts.

**Achtung:** Nach dem Herunterfahren ist das Gerät aus und lässt sich aus der App nicht wieder einschalten.

## 7. Auf dem NAS (Raspberry Pi)

Damit du auch das NAS aus der App neu starten kannst, läuft derselbe Agent zusätzlich auf dem Pi (neben `nas-server.py`). Per SSH auf dem Pi die Schritte 1 bis 3 und 6 ausführen, dabei in der `ExecStart`-Zeile Dateien abschalten und die Steuerung freischalten:

```
ExecStart=/usr/bin/python3 %h/.local/bin/pc-agent.py --user ich --pass geheim --no-files --allow-control
```

`loginctl enable-linger $USER` nicht vergessen, sonst läuft der Agent auf dem Pi nur, solange du per SSH angemeldet bist. In der App unter **Einstellungen → NAS-Agent** die Adresse des Pi mit Port **5006** eintragen (nicht 5005 – das ist `nas-server.py`). Die Steuereinheit zeigt dann nebenbei auch Temperatur und RAM des Pi.

## Wenn etwas nicht klappt

| Problem | Lösung |
|---|---|
| App: „PC nicht erreichbar“ | Läuft der Dienst? `systemctl --user status ndashboard-agent`. Firewall: Fedora Workstation erlaubt Ports ab 1025 im Heimnetz normalerweise; sonst `sudo firewall-cmd --add-port=5006/tcp --permanent && sudo firewall-cmd --reload` |
| Keine Temperaturen | `sudo dnf install lm_sensors && sudo sensors-detect --auto`, danach PC neu starten |
| „Grenze erreicht“ bei Dateien | sehr viele Ordner: `echo fs.inotify.max_user_watches=524288 | sudo tee /etc/sysctl.d/90-inotify.conf && sudo sysctl --system` |
| Ausgaben des Agenten ansehen | `journalctl --user -u ndashboard-agent -f` |
| Agent aktualisieren | Schritt 1 wiederholen, dann `systemctl --user restart ndashboard-agent` |

## Sicherheit

- Ohne `--allow-control` liefert der Agent nur Daten **aus**. Mit `--allow-control` kommen genau drei Aktionen dazu (Neustart, Herunterfahren, Ruhezustand) – beliebige Befehle lassen sich nicht ausführen. Jede ausgelöste Aktion steht im Protokoll.
- Die Verbindung ist unverschlüsselt (HTTP) und nur fürs Heimnetz gedacht. Port 5006 nie im Router freigeben.
- Im Protokoll stehen Dateinamen und Pfade aus den überwachten Ordnern – überwache nur, was du in der App sehen willst.
