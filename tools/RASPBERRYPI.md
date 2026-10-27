# Netzwerkspeicher mit dem Raspberry Pi 3 — Einrichtung von Windows 11 aus

Komplette Anleitung: Der Pi 3 gibt einen USB-Stick oder eine Festplatte im Heimnetz frei, die App greift darauf zu, und dein PC bleibt außen vor. Der Pi darf dauerhaft laufen, er braucht etwa 2 bis 3 Watt.

Alles wird von Windows 11 aus eingerichtet. Du brauchst am Pi weder Bildschirm noch Tastatur. Zusätzliche Programme sind nicht nötig: Der SSH-Client ist in Windows 11 bereits eingebaut.

---

## 1. Was du brauchst

| Teil | Hinweis |
|---|---|
| Raspberry Pi 3 (B oder B+) | ältere Modelle gehen auch, sind nur langsamer |
| Netzteil 5 V / 2,5 A mit Micro-USB | ein schwaches Handy-Ladegerät führt zu zufälligen Neustarts |
| microSD-Karte, 8 GB oder mehr | Klasse 10, dazu ein Kartenleser am PC |
| USB-Stick oder Festplatte | eine 2,5-Zoll-Platte braucht meist einen **aktiven** USB-Hub mit eigenem Netzteil, der Pi liefert zu wenig Strom |
| Netzwerkkabel (empfohlen) | per LAN deutlich schneller und stabiler als über das WLAN des Pi 3 |

---

## 2. SD-Karte am PC beschreiben

1. **Raspberry Pi Imager** von raspberrypi.com herunterladen und installieren.
2. SD-Karte in den Kartenleser stecken, Imager starten.
3. **Modell:** Raspberry Pi 3. **Betriebssystem:** unter „Raspberry Pi OS (other)“ den Eintrag *Raspberry Pi OS Lite (64-bit)* wählen. Lite heißt ohne Desktop, das reicht völlig und läuft flotter. **SD-Karte:** dein Kartenleser.
4. Auf **Weiter** klicken. Bei der Frage nach den Einstellungen auf **Einstellungen bearbeiten** gehen und eintragen:
   - **Hostname:** `ndashboard-nas`
   - **Benutzername und Passwort:** zum Beispiel `pi` und ein eigenes Passwort (unbedingt merken)
   - **WLAN:** Name und Passwort deines WLANs, Land `DE` (kannst du weglassen, wenn du ein Netzwerkkabel benutzt)
   - **Zeitzone und Tastatur:** Deutschland
   - Reiter **Dienste:** **SSH aktivieren**, Anmeldung per Passwort
5. Speichern, schreiben lassen. Windows meldet danach eventuell „Datenträger formatieren?“ — das **ablehnen**, die Karte ist fertig. Auswerfen.

---

## 3. Pi starten und vom PC aus verbinden

1. SD-Karte in den Pi, Stick oder Festplatte anstecken, dann erst das Netzteil. Der erste Start dauert ein bis zwei Minuten.
2. Am PC **Windows Terminal** oder **PowerShell** öffnen (Rechtsklick auf das Startmenü → *Terminal*).
3. Verbinden:

```powershell
ssh pi@ndashboard-nas.local
```

Beim ersten Mal kommt eine Frage nach dem Fingerabdruck, mit `yes` bestätigen. Dann das Passwort eingeben. Die Eingabe bleibt dabei unsichtbar, das ist normal.

**Falls `ndashboard-nas.local` nicht gefunden wird** (Windows kann diese Namen nicht immer auflösen), suche die IP-Adresse im Router. In der Fritz!Box unter *Heimnetz → Netzwerk* steht der Pi als `ndashboard-nas`. Dann so verbinden:

```powershell
ssh pi@192.168.1.60
```

4. Ab hier tippst du alle Befehle im SSH-Fenster, also auf dem Pi. Zuerst das System aktualisieren:

```bash
sudo apt update && sudo apt full-upgrade -y
```

---

## 4. USB-Stick dauerhaft einbinden

Bei Raspberry Pi OS Lite wird der Stick nicht automatisch eingebunden. Das richten wir einmalig fest ein.

### 4.1 Stick finden

```bash
lsblk -f
```

Du siehst eine Zeile wie `sda1` mit Dateisystem und Namen. Merke dir die Partition (meist `sda1`) und den Typ unter **FSTYPE**: `vfat` (FAT32), `exfat`, `ntfs` oder `ext4`. Sticks, die vorher an Windows formatiert wurden, sind meist `ntfs` oder `exfat`.

### 4.2 Treiber nachinstallieren

```bash
sudo apt install -y exfatprogs ntfs-3g
```

### 4.3 Ordner anlegen und UUID ablesen

```bash
sudo mkdir -p /media/usb
sudo blkid /dev/sda1
```

Notiere den Wert hinter `UUID=`, zum Beispiel `1234-ABCD`.

### 4.4 Automatisches Einhängen eintragen

```bash
sudo nano /etc/fstab
```

Unten **eine** Zeile ergänzen, passend zum Dateisystem, mit deiner UUID:

FAT32 oder exFAT:
```
UUID=1234-ABCD  /media/usb  auto  defaults,nofail,uid=1000,gid=1000,umask=000  0  0
```

NTFS:
```
UUID=1234-ABCD  /media/usb  ntfs-3g  defaults,nofail,uid=1000,gid=1000,umask=000  0  0
```

ext4:
```
UUID=1234-ABCD  /media/usb  ext4  defaults,nofail  0  0
```

Speichern mit `Strg + O`, `Enter`, schließen mit `Strg + X`. Dann einhängen und prüfen:

```bash
sudo mount -a
ls /media/usb
```

`nofail` sorgt dafür, dass der Pi auch ohne Stick startet.

---

## 5. Server-Skript auf den Pi kopieren

**Variante 1 – vom PC aus.** Dafür ein **zweites** Terminal-Fenster auf Windows öffnen, also nicht das SSH-Fenster benutzen:

```powershell
scp "$env:USERPROFILE\Downloads\nDashboard\tools\nas-server.py" pi@ndashboard-nas.local:/home/pi/
```

Liegt der entpackte Ordner woanders, den Pfad anpassen. Tipp: Datei im Explorer suchen, mit Rechtsklick **Als Pfad kopieren** wählen und einfügen. Hat `.local` vorhin nicht funktioniert, hier ebenfalls die IP-Adresse einsetzen.

**Variante 2 – direkt aus deinem GitHub-Repository**, falls es öffentlich ist. Im SSH-Fenster auf dem Pi:

```bash
wget https://raw.githubusercontent.com/DEINNAME/DEINREPO/main/tools/nas-server.py
```

Python ist bei Raspberry Pi OS schon dabei, Prüfung im SSH-Fenster:

```bash
python3 --version
```

---

## 6. Testlauf

Im SSH-Fenster:

```bash
python3 /home/pi/nas-server.py /media/usb --user projekt --pass geheim
```

Wähle eigene Zugangsdaten. Es erscheint:

```
Freigegeben: /media/usb
Adresse fuer die App:  http://192.168.1.60:5005
```

Notiere diese Adresse. Testen kannst du sie direkt am PC im Browser: `http://192.168.1.60:5005/` fragt nach Benutzer und Passwort und zeigt danach eine XML-Antwort. Beendet wird der Testlauf mit `Strg + C`.

---

## 7. Als Dienst einrichten (startet automatisch mit)

```bash
sudo nano /etc/systemd/system/nas.service
```

Inhalt einfügen, Benutzername und Zugangsdaten anpassen:

```ini
[Unit]
Description=nDashboard NAS
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/nas-server.py /media/usb --user projekt --pass geheim
Restart=always
RestartSec=5
User=pi

[Install]
WantedBy=multi-user.target
```

Speichern und aktivieren:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nas
sudo systemctl status nas
```

Steht dort `active (running)`, läuft alles. Der Dienst startet ab jetzt bei jedem Einschalten des Pi automatisch, auch nach einem Stromausfall.

Befehle für später:

```bash
sudo systemctl stop nas        # anhalten
sudo systemctl start nas       # starten
sudo systemctl restart nas     # neu starten, z.B. nach Passwortänderung
journalctl -u nas -n 50        # letzte Meldungen ansehen
```

---

## 8. Feste Adresse einrichten

Damit die App den Pi immer findet, soll sich seine IP-Adresse nicht ändern:

- **Fritz!Box:** Heimnetz → Netzwerk → Eintrag `ndashboard-nas` anklicken → Bearbeiten → „Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“ anhaken.
- Andere Router nennen das DHCP-Reservierung oder statische Zuweisung.

Aktuelle Adresse jederzeit abfragen, im SSH-Fenster:

```bash
hostname -I
```

In der App trägst du die **IP-Adresse** ein, nicht `ndashboard-nas.local`. Android erkennt solche Namen je nach Version nicht zuverlässig.

---

## 9. In der App eintragen

1. nDashboard öffnen und über das Menü auf **Einstellungen** gehen (auf dem PC unten links, auf dem Handy über ☰).
2. Abschnitt **NAS-Verbindung**:
   - **Adresse:** `http://192.168.1.60:5005` (deine Adresse).
   - **Benutzer** und **Passwort:** wie in der Dienstdatei.
3. Auf **Verbinden & speichern** tippen. Erwartete Antwort: `Verbunden · n Einträge im Hauptordner. Gespeichert.`
4. Auf **Dateien** gehen. Dort erscheinen die Ordner des Sticks.

Handy oder PC müssen dabei im Heimnetz sein.

---

## 10. Problembehebung

| Symptom | Ursache | Lösung |
|---|---|---|
| `ssh: Could not resolve hostname ndashboard-nas.local` | Windows löst den Namen nicht auf | IP-Adresse im Router nachsehen und diese verwenden |
| `Connection refused` oder Zeitüberschreitung beim SSH | Pi noch nicht fertig gestartet, SSH im Imager vergessen, oder WLAN-Daten falsch | zwei Minuten warten; sonst SD-Karte neu beschreiben und dabei SSH aktivieren |
| `scp` meldet „No such file or directory“ | Pfad unter Windows stimmt nicht | Pfad im Explorer mit *Als Pfad kopieren* holen, in Anführungszeichen setzen |
| `/media/usb` ist leer | Stick nicht eingehängt | `lsblk -f`, `sudo mount -a`, UUID in der fstab prüfen |
| Dienst läuft, App meldet „NAS nicht erreichbar“ | Handy im falschen WLAN oder Port fehlt | WLAN prüfen, Adresse mit `:5005` eintragen |
| „Anmeldung abgelehnt – Benutzer oder Passwort prüfen.“ | Zugangsdaten weichen ab | Dienstdatei prüfen, danach `sudo systemctl restart nas` |
| Dienst beendet sich sofort wieder | Pfad im `ExecStart` stimmt nicht | `sudo systemctl status nas` zeigt die Fehlerzeile |
| Kopieren ist sehr langsam | WLAN des Pi 3 ist langsam | Netzwerkkabel benutzen |
| Festplatte klickt, Pi startet neu | zu wenig Strom | aktiven USB-Hub mit eigenem Netzteil verwenden |

**Geschwindigkeit des Pi 3:** über Kabel etwa 8 bis 11 MB/s, über WLAN eher 3 bis 5 MB/s. Für Fotos und kurze Videos aus dem Projekt reicht das problemlos.

---

## 11. Betrieb und Sicherheit

- **Ausschalten** immer sauber mit `sudo shutdown -h now`, erst danach den Strom ziehen. Sonst kann die SD-Karte Schaden nehmen.
- **Passwort ändern** mit `passwd`, falls du im Imager etwas Einfaches gewählt hast.
- Freigegeben ist **nur** `/media/usb`, nicht der Rest des Pi.
- Die Verbindung ist **unverschlüsselt** und nur fürs Heimnetz gedacht. Gib den Port 5005 niemals im Router nach außen frei.
