# Netzwerkspeicher einrichten (USB-Stick oder Festplatte für die App)

Dieses Tutorial zeigt, wie du einen USB-Stick oder eine Festplatte für die nDashboard-App freigibst und deinen Rechner dabei ganz normal weiterbenutzt.

---

## Was dabei passiert

`tools/nas-server.py` ist ein kleines Programm, das im Hintergrund auf Anfragen aus deinem WLAN wartet und einen einzigen Ordner freigibt. Es ist kein Vollbildprogramm und blockiert nichts:

- Es läuft in einem Terminal- bzw. Eingabeaufforderungsfenster, das du kleinklicken oder ganz verstecken kannst.
- Es braucht so gut wie keine Rechenleistung, solange die App nichts abruft. Spielen, Videoschnitt oder Hausaufgaben laufen unverändert weiter.
- Du kannst den Stick gleichzeitig ganz normal am Rechner öffnen. Nur beim Auswerfen solltest du das Programm vorher beenden.

Drei Dinge musst du beachten, damit die App den Speicher erreicht: Der Rechner muss **an** sein und **im selben WLAN** hängen, er darf nicht **in den Ruhezustand** gehen, und die **Firewall** muss die Verbindung erlauben. Genau darum geht es unten.

Wenn dir das zu umständlich ist, ist ein **Raspberry Pi** die bequemste Lösung (Variante C). Der kostet wenig, verbraucht kaum Strom und darf einfach durchlaufen, dann ist dein PC gar nicht beteiligt.

---

## Vorbereitung (alle Varianten)

1. Stick oder Festplatte anstecken.
2. Einen Ordner festlegen, der freigegeben wird. Gib **nicht** deinen kompletten Benutzerordner frei, sondern nur den Stick oder einen extra Ordner darauf, zum Beispiel `Projektkurs`.
3. Ein Passwort ausdenken, das du sonst nirgends benutzt. Im Beispiel unten heißt der Benutzer `projekt` und das Passwort `geheim`. Ändere beides.

---

## Variante A: Mac

### A1. Python prüfen

Terminal öffnen (Spotlight mit `Cmd + Leertaste`, „Terminal“ eintippen) und eingeben:

```
python3 --version
```

Kommt eine Versionsnummer wie `Python 3.11.2`, ist alles gut. Kommt eine Fehlermeldung oder öffnet sich ein Installationsfenster, bestätige die Installation der Entwicklerwerkzeuge (Button „Installieren“) und warte, bis sie fertig ist.

### A2. Namen des Sticks herausfinden

```
ls /Volumes
```

Dort steht der Name deines Sticks, zum Beispiel `USB-STICK`. Der vollständige Pfad ist dann `/Volumes/USB-STICK`.

### A3. Server starten

```
cd ~/Downloads/nDashboard/tools
python3 nas-server.py /Volumes/USB-STICK --user projekt --pass geheim
```

Passe den Pfad an, falls der entpackte Ordner woanders liegt. Nach dem Start erscheint etwas wie:

```
Freigegeben: /Volumes/USB-STICK
Adresse fuer die App:  http://192.168.1.42:5005
```

Beim ersten Start fragt macOS eventuell, ob „Python“ eingehende Verbindungen annehmen darf. Klicke auf **Erlauben**.

Dieses Fenster muss offen bleiben. Du kannst es aber in den Hintergrund legen und ganz normal weiterarbeiten. Beenden geht mit `Strg + C` im Fenster.

### A4. Komfortabler: ohne offenes Fenster laufen lassen

```
cd ~/Downloads/nDashboard/tools
nohup python3 nas-server.py /Volumes/USB-STICK --user projekt --pass geheim > ~/nas.log 2>&1 &
```

Danach kannst du das Terminal schließen, das Programm läuft weiter. Beenden:

```
pkill -f nas-server.py
```

### A5. Automatisch beim Anmelden starten (optional)

Datei anlegen:

```
nano ~/Library/LaunchAgents/de.projektkurs.nas.plist
```

Folgendes einfügen und dabei `DEINBENUTZER` sowie die beiden Pfade anpassen:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>de.projektkurs.nas</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/DEINBENUTZER/Downloads/nDashboard/tools/nas-server.py</string>
    <string>/Volumes/USB-STICK</string>
    <string>--user</string><string>projekt</string>
    <string>--pass</string><string>geheim</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
```

Mit `Strg + O`, `Enter`, `Strg + X` speichern und schließen, dann aktivieren:

```
launchctl load -w ~/Library/LaunchAgents/de.projektkurs.nas.plist
```

Wieder abschalten:

```
launchctl unload -w ~/Library/LaunchAgents/de.projektkurs.nas.plist
```

### A6. Ruhezustand verhindern

Ein Mac im Ruhezustand ist für die App nicht erreichbar. Zwei Möglichkeiten:

- **Dauerhaft:** Systemeinstellungen → Batterie bzw. Energie sparen → „Automatischen Ruhezustand bei ausgeschaltetem Display verhindern“ aktivieren. Bei einem MacBook nur sinnvoll, wenn es am Strom hängt und aufgeklappt bleibt.
- **Nur für diese Sitzung:** den Befehl mit `caffeinate` starten:

```
caffeinate -i python3 nas-server.py /Volumes/USB-STICK --user projekt --pass geheim
```

### A7. Praktisch am Mac: Name statt IP-Adresse

Macs sind im Netz unter ihrem Rechnernamen erreichbar. Steht in den Systemeinstellungen unter „Allgemein → Info“ zum Beispiel `MacBook von Max`, dann funktioniert in der App meist auch:

```
http://macbook-von-max.local:5005
```

Der Vorteil: Diese Adresse bleibt gleich, auch wenn der Router eine neue IP-Adresse vergibt. Probiere sie in der App unter Einstellungen mit **Verbinden & speichern** aus. Klappt sie nicht, nimm die IP-Adresse aus dem Startfenster.

---

## Variante B: Windows

### B1. Python installieren

Von python.org die aktuelle Version herunterladen. **Wichtig:** Beim Installieren ganz unten den Haken bei **„Add python.exe to PATH“** setzen. Danach in der Eingabeaufforderung prüfen:

```
python --version
```

### B2. Server starten

Laufwerksbuchstaben des Sticks im Explorer ablesen, zum Beispiel `E:`. Dann:

```
cd %USERPROFILE%\Downloads\nDashboard\tools
python nas-server.py E:\ --user projekt --pass geheim
```

Beim ersten Start fragt die Windows-Firewall nach. Setze den Haken bei **Privates Netzwerk** und klicke auf **Zugriff zulassen**. Ohne das findet die App den Speicher nicht.

Das Fenster muss offen bleiben, darf aber minimiert sein. Beenden mit `Strg + C` oder indem du das Fenster schließt.

### B3. Ohne sichtbares Fenster starten

Lege im Ordner `tools` eine Datei `nas-start.bat` an mit diesem Inhalt (Pfade anpassen):

```bat
@echo off
start "" pythonw "%~dp0nas-server.py" E:\ --user projekt --pass geheim
```

Ein Doppelklick startet den Server unsichtbar im Hintergrund. Beenden geht über den Task-Manager: Reiter **Details**, Eintrag `pythonw.exe`, **Task beenden**.

### B4. Automatisch beim Anmelden starten (optional)

`Windows + R` drücken, `shell:startup` eingeben, Enter. In den Ordner, der sich öffnet, eine **Verknüpfung** zu deiner `nas-start.bat` legen. Dann startet der Server bei jeder Anmeldung mit.

### B5. Energiesparen anpassen

Einstellungen → System → Netzbetrieb & Energiesparen: Bei „Energiesparmodus“ für den Netzbetrieb **Nie** einstellen. Der Bildschirm darf ruhig ausgehen, nur schlafen darf der Rechner nicht.

---

## Variante C: Raspberry Pi (läuft rund um die Uhr)

Der Pi ist die sauberste Lösung, weil dein PC dann gar nichts damit zu tun hat. Eine ausführliche Fassung für den Pi 3 mit SD-Karte, SSH, Einhängen des Sticks und Dienst steht in `RASPBERRYPI.md`.

1. Raspberry Pi OS installieren, Stick anstecken. Der Stick liegt meist unter `/media/pi/NAME`. Nachsehen mit `ls /media/pi`.
2. Datei `nas-server.py` auf den Pi kopieren, zum Beispiel nach `/home/pi/nas-server.py`.
3. Testlauf:

```
python3 /home/pi/nas-server.py /media/pi/USB --user projekt --pass geheim
```

4. Als Dienst einrichten, damit er nach jedem Neustart automatisch läuft:

```
sudo nano /etc/systemd/system/nas.service
```

Inhalt:

```ini
[Unit]
Description=nDashboard NAS
After=network-online.target

[Service]
ExecStart=/usr/bin/python3 /home/pi/nas-server.py /media/pi/USB --user projekt --pass geheim
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

Speichern, dann:

```
sudo systemctl enable --now nas
sudo systemctl status nas
```

Der Pi ist danach meist auch unter `http://raspberrypi.local:5005` erreichbar.

---

## Die Adresse dauerhaft gleich halten

Router vergeben IP-Adressen manchmal neu, dann findet die App den Speicher plötzlich nicht mehr. Zwei Lösungen:

- **Namen benutzen** statt der IP: `http://macbook-von-max.local:5005` oder `http://raspberrypi.local:5005`. Unter Windows klappt das oft nicht, dort ist die zweite Lösung besser.
- **Feste Adresse im Router eintragen:** In der Fritz!Box unter Heimnetz → Netzwerk den Rechner anklicken und „Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“ aktivieren. Andere Router nennen das DHCP-Reservierung.

---

## In der App eintragen

1. nDashboard öffnen und über das Menü auf **Einstellungen** gehen (auf dem PC unten links, auf dem Handy über ☰).
2. Abschnitt **NAS-Verbindung**:
   - **Adresse:** die Adresse aus dem Startfenster, zum Beispiel `http://192.168.1.42:5005`.
   - **Benutzer** und **Passwort:** das, was du beim Start angegeben hast.
3. Auf **Verbinden & speichern** tippen. Erwartete Antwort: `Verbunden · n Einträge im Hauptordner. Gespeichert.`
4. Auf **Dateien** gehen. Dort erscheinen die Ordner des Sticks.

Handy oder PC müssen dabei im selben Netz sein wie der Rechner mit dem Stick.

---

## Problembehebung

| Anzeige in der App | Ursache | Lösung |
|---|---|---|
| „NAS nicht erreichbar …“ | Server läuft nicht, Firewall blockt, oder Handy im falschen WLAN | Fenster prüfen, Firewall erlauben, WLAN am Handy prüfen |
| „Anmeldung abgelehnt – Benutzer oder Passwort prüfen.“ | Benutzer oder Passwort stimmen nicht | genau so eintippen wie beim Start, Groß- und Kleinschreibung beachten |
| „NAS nicht erreichbar …“ (nach längerem Laden) | Rechner schläft oder hat eine neue IP-Adresse | Rechner aufwecken, Adresse neu ablesen |
| „Nicht gefunden.“ | Adresse hat einen Pfad zu viel | nur `http://IP:5005` eintragen, ohne Ordnernamen dahinter |
| Ordner wird leer angezeigt | falscher Ordner freigegeben | Pfad beim Start prüfen, im Fenster steht „Freigegeben: …“ |

Testen kannst du auch am Rechner selbst: Öffne `http://localhost:5005/dateiname.jpg` im Browser. Kommt die Datei, liegt es am Netz oder an der Firewall, nicht am Server.

---

## Sicherheit

Fürs Heimnetz ist das in Ordnung, aber wisse, was du tust:

- Die Verbindung ist **unverschlüsselt**. Benutzer und Passwort gehen im Klartext durchs WLAN. Nimm ein Passwort, das du sonst nirgends verwendest.
- Freigegeben ist **genau der eine Ordner**, den du beim Start angibst. Das Programm lässt niemanden aus diesem Ordner ausbrechen, auch nicht über Tricks im Pfad.
- Die Freigabe gilt **nur im lokalen Netz**. Gib den Port niemals im Router frei („Portfreigabe“, „Port Forwarding“), sonst ist dein Stick aus dem ganzen Internet erreichbar.
- Zum Abschalten reicht `Strg + C` im Fenster, beziehungsweise `pkill -f nas-server.py`, das Beenden im Task-Manager oder `sudo systemctl stop nas`.
