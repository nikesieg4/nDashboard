/* Weitere Bereiche der ABIS-Konsole für Management → Bürgerportal.
 * Die Seiten in pages/ und components/ sind unverändert aus nikesieg4/dPUbtsXv3y übernommen;
 * lib/, config.js und shim/ verbinden sie mit nDashboard (Anmeldung, Datenzugriff, React).
 * Bauen: tools/build-portal.sh → web/js/portal-abis.js */
import React from 'react';
import { can, bankAdmin, canSeeRecords, CLEARANCE } from './lib/model.js';
import Protokoll from './pages/Protokoll.jsx';
import Datenbank from './pages/Datenbank.jsx';
import Transaktionen from './pages/Transaktionen.jsx';
import Bank from './pages/Bank.jsx';
import Anmeldedaten from './pages/Anmeldedaten.jsx';
import Antragsarten from './pages/Antragsarten.jsx';
import Termine from './pages/Termine.jsx';
import Justiz from './pages/Justiz.jsx';
import Kommunikation from './pages/Kommunikation.jsx';
import Zuordnungen from './pages/Zuordnungen.jsx';
import Berechtigungen from './pages/Berechtigungen.jsx';
import Auswertungen from './pages/Auswertungen.jsx';
import System from './pages/System.jsx';
import Konto from './pages/Konto.jsx';

/* Gestaltung der Konsole (Klassen aus styles.css) gilt nur innerhalb von .abis */
const wrap = (Page) => function AbisPage() { return <div className="abis"><Page /></div>; };
const L6 = (me) => me.isAdmin || me.is >= CLEARANCE.credentials;
const always = () => true;

/* Reihenfolge, Gruppen und Rechte wie in der Konsole (src/components/Shell.jsx) */
window.NDPortal.register([
  { order: 2, group: 'Überwachung', id: 'protokoll', label: 'Sicherheitsprotokoll', C: wrap(Protokoll), ok: always },
  { order: 3, group: 'Überwachung', id: 'datenbank', label: 'Datenbank', C: wrap(Datenbank), ok: always },
  { order: 4, group: 'Überwachung', id: 'transaktionen', label: 'Transaktionen', C: wrap(Transaktionen), ok: bankAdmin, need: 'Bank-Administrator · Level 6' },
  { order: 5, group: 'Buchhaltung', id: 'bank', label: 'Bankmanagement', C: wrap(Bank), ok: bankAdmin, need: 'Bank-Administrator · Level 6' },
  { order: 7, group: 'Verwaltung', id: 'anmeldedaten', label: 'Anmeldedaten', C: wrap(Anmeldedaten), ok: L6, need: 'Level 6' },
  { order: 9, group: 'Verwaltung', id: 'antragsarten', label: 'Antragsarten', C: wrap(Antragsarten), ok: (me) => me.is >= CLEARANCE.apptypes || me.allow.includes('nav:antragsarten'), need: 'Level 4' },
  { order: 10, group: 'Verwaltung', id: 'termine', label: 'Termine', C: wrap(Termine), ok: (me) => me.is >= CLEARANCE.admintermine, need: 'Level 2' },
  { order: 11, group: 'Verwaltung', id: 'justiz', label: 'Justiz & Polizei', C: wrap(Justiz), ok: canSeeRecords, need: 'Justiz, Polizei oder Level 5' },
  { order: 12, group: 'Verwaltung', id: 'kommunikation', label: 'Kommunikation', C: wrap(Kommunikation), ok: always },
  { order: 13, group: 'Steuerung', id: 'zuordnungen', label: 'Zuordnungen', C: wrap(Zuordnungen), ok: (me) => can(me, 'units.manage'), need: 'Level 6' },
  { order: 14, group: 'Steuerung', id: 'berechtigungen', label: 'Berechtigungen', C: wrap(Berechtigungen), ok: (me) => can(me, 'perms.manage'), need: 'Level 6' },
  { order: 15, group: 'Steuerung', id: 'auswertungen', label: 'Wahl & Umfrage', C: wrap(Auswertungen), ok: (me) => L6(me) || can(me, 'audit.view'), need: 'Level 6' },
  { order: 16, group: 'Steuerung', id: 'system', label: 'System & Wartung', C: wrap(System), ok: always },
  { order: 17, group: 'Konto', id: 'konto', label: 'Mein Konto', C: wrap(Konto), ok: always },
]);
