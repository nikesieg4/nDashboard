/* nDashboard — Seite „Kalender“: Termine wie im Google Kalender, aber ohne Konto.
 * Ansichten Tag / Woche / Monat / Liste, mehrere Kalender mit Farben, Wiederholungen (täglich, wöchentlich an
 * Wochentagen, monatlich, jährlich, mit Ende), Erinnerungen (→ notify.js), Suche, Feiertage (bundesweit),
 * Import/Export als .ics. Gespeichert wird wie bei den Zielen auf dem NAS (/.ndashboard/kalender.json), damit
 * Handy und PC dieselben Termine sehen; eine Kopie bleibt auf dem Gerät für unterwegs und für die Erinnerungen. */
(function () {
  var O = window.Ops, h = React.createElement, NAS = window.NAS, Files = window.NDFiles, U = window.NDUi;
  var NAS_FILE = '/.ndashboard/kalender.json', LOCAL = 'nd.calendar', DIRTY = 'nd.calendar.dirty', VIEW_KEY = 'nd.calendar.view';
  var HOLIDAYS = '_feiertage', HOUR = 48;
  var COLORS = [['#f4d24c', 'Gelb'], ['#f2a541', 'Orange'], ['#ff6a5c', 'Rot'], ['#ff8fc7', 'Pink'], ['#c58cff', 'Lila'],
    ['#6db8ff', 'Blau'], ['#4fd1c5', 'Türkis'], ['#7fd08b', 'Grün'], ['#a8a79c', 'Grau']];
  var DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var REMINDERS = [[0, 'Zum Zeitpunkt'], [5, '5 Minuten vorher'], [10, '10 Minuten vorher'], [15, '15 Minuten vorher'], [30, '30 Minuten vorher'],
    [60, '1 Stunde vorher'], [120, '2 Stunden vorher'], [1440, '1 Tag vorher'], [2880, '2 Tage vorher'], [10080, '1 Woche vorher']];
  var REMINDERS_ALLDAY = [[0, 'Am Tag um 9:00'], [1440, '1 Tag vorher um 9:00'], [2880, '2 Tage vorher um 9:00'], [10080, '1 Woche vorher um 9:00']];

  /* =====================================================================
     DATUM
     ===================================================================== */
  function pad(n) { return ('0' + n).slice(-2); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function parseYmd(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  /** 'YYYY-MM-DD' (ganztägig) oder 'YYYY-MM-DDTHH:MM' → Date (Ortszeit) */
  function parseDT(s) { var d = parseYmd(s); if (s.length > 10) { var t = s.slice(11).split(':'); d.setHours(+t[0], +t[1]); } return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function startOfWeek(d) { var x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); }
  function isoDow(d) { return (d.getDay() + 6) % 7 + 1; } // 1 = Montag … 7 = Sonntag
  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000); }
  function longDate(d) { return DAY_NAMES[isoDow(d) - 1] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function shortDate(d) { return DAYS[isoDow(d) - 1] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()].slice(0, 3) + '.'; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* =====================================================================
     SPEICHER
     ===================================================================== */
  function empty() {
    return { version: 1, holidays: true, calendars: [{ id: 'privat', name: 'Privat', color: '#f4d24c', visible: true }, { id: 'arbeit', name: 'Arbeit', color: '#6db8ff', visible: true }], events: [] };
  }
  function normalize(d) {
    d = d && typeof d === 'object' ? d : empty();
    if (!Array.isArray(d.calendars) || !d.calendars.length) d.calendars = empty().calendars;
    if (!Array.isArray(d.events)) d.events = [];
    if (d.holidays === undefined) d.holidays = true;
    return d;
  }
  function readLocal() { try { return JSON.parse(localStorage.getItem(LOCAL)); } catch (e) { return null; } }
  function writeLocal(d) { try { localStorage.setItem(LOCAL, JSON.stringify(d)); } catch (e) { /* voll */ } }
  function isDirty() { try { return localStorage.getItem(DIRTY) === '1'; } catch (e) { return false; } }
  function setDirty(v) { try { if (v) localStorage.setItem(DIRTY, '1'); else localStorage.removeItem(DIRTY); } catch (e) { /* egal */ } }
  function nasWrite(text) {
    return NAS.writeText(NAS_FILE, text).catch(function (e) {
      if (e.status !== 409) throw e; // Ordner fehlt
      return NAS.mkdir('/.ndashboard').catch(function () {}).then(function () { return NAS.writeText(NAS_FILE, text); });
    });
  }

  /** Lädt vom NAS; ohne NAS (oder wenn es gerade nicht erreichbar ist) die Kopie auf dem Gerät.
   *  Unterwegs geänderte Termine werden beim nächsten Mal aufs NAS übertragen. */
  function load() {
    var local = readLocal();
    if (!NAS.configured()) return Promise.resolve({ data: normalize(local), where: 'local' });
    return NAS.readText(NAS_FILE).then(function (t) { return JSON.parse(t); }, function (e) { if (e.status === 404) return null; throw e; })
      .then(function (remote) {
        if (local && (isDirty() || !remote)) {
          return nasWrite(JSON.stringify(local, null, 2)).then(function () { setDirty(false); return { data: normalize(local), where: 'nas' }; });
        }
        var d = normalize(remote);
        writeLocal(d);
        return { data: d, where: 'nas' };
      }, function (e) {
        if (local) return { data: normalize(local), where: 'offline', error: e.message };
        throw e;
      });
  }
  function save(d) {
    writeLocal(d);
    if (!NAS.configured()) return Promise.resolve('local');
    return nasWrite(JSON.stringify(d, null, 2)).then(function () { setDirty(false); return 'nas'; }, function () { setDirty(true); return 'offline'; });
  }

  var shared = { data: null, where: null, status: 'idle', promise: null, listeners: [] };
  function emit() { shared.listeners.forEach(function (fn) { fn({}); }); }
  function ensureLoaded() {
    if (shared.data) return Promise.resolve(shared.data);
    if (!shared.promise) {
      shared.status = 'loading';
      shared.promise = load().then(function (r) { shared.data = r.data; shared.where = r.where; shared.status = 'ok'; emit(); return r.data; },
        function (e) { shared.status = 'error'; shared.error = e.message; shared.promise = null; emit(); throw e; });
    }
    return shared.promise;
  }
  function update(fn) {
    var next = JSON.parse(JSON.stringify(shared.data));
    fn(next);
    shared.data = next; shared.status = 'saving'; emit();
    return save(next).then(function (where) {
      shared.where = where; shared.status = 'ok'; emit();
      if (window.NDNotify) NDNotify.syncReminders();
    });
  }
  function useCalendar() {
    var st = React.useState(0);
    React.useEffect(function () {
      function on() { st[1](function (n) { return n + 1; }); }
      shared.listeners.push(on);
      ensureLoaded().catch(function () { /* Fehler steht in shared */ });
      return function () { shared.listeners.splice(shared.listeners.indexOf(on), 1); };
    }, []);
    return shared;
  }

  /* =====================================================================
     TERMINE BERECHNEN (Wiederholungen, Feiertage)
     ===================================================================== */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var hh = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - hh - k) % 7, m = Math.floor((a + 11 * hh + 22 * l) / 451);
    var month = Math.floor((hh + l - 7 * m + 114) / 31), day = (hh + l - 7 * m + 114) % 31 + 1;
    return new Date(y, month - 1, day);
  }
  /** Gesetzliche Feiertage, die in ganz Deutschland gelten */
  function holidays(year) {
    var e = easter(year);
    return [[new Date(year, 0, 1), 'Neujahr'], [addDays(e, -2), 'Karfreitag'], [addDays(e, 1), 'Ostermontag'], [new Date(year, 4, 1), 'Tag der Arbeit'],
      [addDays(e, 39), 'Christi Himmelfahrt'], [addDays(e, 50), 'Pfingstmontag'], [new Date(year, 9, 3), 'Tag der Deutschen Einheit'],
      [new Date(year, 11, 25), '1. Weihnachtstag'], [new Date(year, 11, 26), '2. Weihnachtstag']]
      .map(function (x) { return { id: 'h-' + ymd(x[0]), cal: HOLIDAYS, title: x[1], allDay: true, start: ymd(x[0]), end: ymd(x[0]), readonly: true }; });
  }

  /** Alle Vorkommen eines Termins, die [from, to) berühren: { ev, start, end, key } */
  function occurrences(ev, from, to) {
    var s = parseDT(ev.start), e = parseDT(ev.end || ev.start);
    if (ev.allDay) e = addDays(startOfDay(e), 1); // Ende ganztägiger Termine: Folgetag 0:00
    var dur = Math.max(0, e - s), out = [], r = ev.repeat, ex = ev.exdates || [];
    function hit(st) {
      var en = new Date(st.getTime() + dur);
      if ((en > from || (dur === 0 && st >= from)) && st < to && ex.indexOf(ymd(st)) < 0) out.push({ ev: ev, start: st, end: en, key: ev.id + '@' + ymd(st) });
    }
    if (!r || !r.freq) { hit(s); return out; }
    var interval = Math.max(1, r.interval || 1), until = r.until ? addDays(parseYmd(r.until), 1) : null, count = r.count || 0, n = 0, guard = 0;
    function stop(st) { return st >= to || (until && st >= until) || (count && n >= count) || ++guard > 20000; }
    // Ohne Anzahl-Grenze direkt in die Nähe des Zeitraums springen
    var skip = 0;
    if (!count && (r.freq === 'daily' || r.freq === 'weekly')) {
      var unit = (r.freq === 'daily' ? 1 : 7) * interval;
      skip = Math.max(0, Math.floor((daysBetween(s, from) - Math.ceil(dur / 86400000) - 7) / unit));
    }
    var k, st;
    if (r.freq === 'daily') {
      for (k = skip; ; k++) { st = addDays(s, k * interval); if (stop(st)) break; n++; hit(st); }
    } else if (r.freq === 'weekly') {
      var days = r.days && r.days.length ? r.days.slice().sort() : [isoDow(s)], week0 = startOfWeek(s);
      outer: for (k = skip; ; k++) {
        for (var i = 0; i < days.length; i++) {
          st = addDays(week0, k * 7 * interval + days[i] - 1);
          st.setHours(s.getHours(), s.getMinutes());
          if (st < s) continue;
          if (stop(st)) break outer;
          n++; hit(st);
        }
      }
    } else {
      var months = r.freq === 'monthly' ? interval : 12 * interval;
      for (k = 0; ; k++) {
        st = new Date(s.getFullYear(), s.getMonth() + k * months, s.getDate(), s.getHours(), s.getMinutes());
        if (st.getDate() !== s.getDate()) { if (++guard > 20000) break; continue; } // 31. im Februar u. ä. überspringen
        if (stop(st)) break;
        n++; hit(st);
      }
    }
    return out;
  }

  function calendarOf(data, id) {
    if (id === HOLIDAYS) return { id: HOLIDAYS, name: 'Feiertage', color: '#a8a79c', visible: data.holidays };
    return data.calendars.filter(function (c) { return c.id === id; })[0] || data.calendars[0];
  }
  function colorOf(data, ev) { return ev.color || calendarOf(data, ev.cal).color; }

  /** Sichtbare Vorkommen im Zeitraum, sortiert (ganztägig zuerst). */
  function range(data, from, to, all) {
    var list = [];
    data.events.forEach(function (ev) { if (all || calendarOf(data, ev.cal).visible) list = list.concat(occurrences(ev, from, to)); });
    if (data.holidays || all) for (var y = from.getFullYear(); y <= to.getFullYear(); y++) holidays(y).forEach(function (ev) { list = list.concat(occurrences(ev, from, to)); });
    return list.sort(function (a, b) { return (b.ev.allDay ? 1 : 0) - (a.ev.allDay ? 1 : 0) || a.start - b.start || a.end - b.end; });
  }

  /** Erinnerungen im Zeitraum (für notify.js). Ganztägige Termine erinnern um 9:00. */
  function reminders(fromMs, toMs) {
    var data = shared.data;
    if (!data) return [];
    var from = new Date(fromMs - 15 * 86400000), to = new Date(toMs + 15 * 86400000), out = [];
    data.events.forEach(function (ev) {
      if (!ev.reminders || !ev.reminders.length) return;
      occurrences(ev, from, to).forEach(function (o) {
        var base = ev.allDay ? new Date(o.start.getFullYear(), o.start.getMonth(), o.start.getDate(), 9) : o.start;
        ev.reminders.forEach(function (min) {
          var at = base.getTime() - min * 60000;
          if (at < fromMs || at > toMs) return;
          out.push({ id: 'cal:' + o.key + ':' + min, at: at, title: ev.title || '(Ohne Titel)', body: whenText(o) + (ev.location ? ' · ' + ev.location : ''),
            url: '#/calendar?v=day&d=' + ymd(o.start) });
        });
      });
    });
    return out.sort(function (a, b) { return a.at - b.at; });
  }

  /* =====================================================================
     TEXTE
     ===================================================================== */
  function whenText(o) {
    var ev = o.ev;
    if (ev.allDay) {
      var last = addDays(o.end, -1);
      return sameDay(o.start, last) ? longDate(o.start) : shortDate(o.start) + ' – ' + shortDate(last);
    }
    if (sameDay(o.start, o.end) || +o.end === +startOfDay(addDays(o.start, 1))) return shortDate(o.start) + ' · ' + hm(o.start) + ' – ' + hm(o.end);
    return shortDate(o.start) + ' ' + hm(o.start) + ' – ' + shortDate(o.end) + ' ' + hm(o.end);
  }
  function repeatText(r, start) {
    if (!r || !r.freq) return '';
    var n = Math.max(1, r.interval || 1), t;
    if (r.freq === 'daily') t = n === 1 ? 'Täglich' : 'Alle ' + n + ' Tage';
    else if (r.freq === 'weekly') {
      var days = r.days && r.days.length ? r.days : [isoDow(start)];
      t = (n === 1 ? 'Wöchentlich' : 'Alle ' + n + ' Wochen') + ' am ' + (days.join() === '1,2,3,4,5' ? 'Mo–Fr' : days.map(function (d) { return DAYS[d - 1]; }).join(', '));
    } else if (r.freq === 'monthly') t = (n === 1 ? 'Monatlich' : 'Alle ' + n + ' Monate') + ' am ' + start.getDate() + '.';
    else t = (n === 1 ? 'Jährlich' : 'Alle ' + n + ' Jahre') + ' am ' + start.getDate() + '. ' + MONTHS[start.getMonth()];
    if (r.until) t += ', bis ' + parseYmd(r.until).toLocaleDateString('de-DE');
    if (r.count) t += ', ' + r.count + ' Mal';
    return t;
  }
  function reminderText(min, allDay) {
    var x = (allDay ? REMINDERS_ALLDAY : REMINDERS).filter(function (r) { return r[0] === min; })[0];
    if (x) return x[1];
    return min >= 1440 ? Math.round(min / 1440) + ' Tage vorher' : min >= 60 ? Math.round(min / 60) + ' Std. vorher' : min + ' Min. vorher';
  }

  /* =====================================================================
     ICS (Import / Export)
     ===================================================================== */
  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function icsDate(s, allDay) { return allDay ? s.slice(0, 10).replace(/-/g, '') : s.replace(/[-:]/g, '') + '00'; }
  function toIcs(data) {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//nDashboard//Kalender//DE', 'CALSCALE:GREGORIAN'];
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    data.events.forEach(function (ev) {
      L.push('BEGIN:VEVENT', 'UID:' + ev.id + '@ndashboard', 'DTSTAMP:' + stamp, 'SUMMARY:' + icsEscape(ev.title));
      if (ev.allDay) { L.push('DTSTART;VALUE=DATE:' + icsDate(ev.start, true), 'DTEND;VALUE=DATE:' + icsDate(ymd(addDays(parseYmd(ev.end || ev.start), 1)), true)); }
      else { L.push('DTSTART:' + icsDate(ev.start), 'DTEND:' + icsDate(ev.end || ev.start)); }
      if (ev.location) L.push('LOCATION:' + icsEscape(ev.location));
      if (ev.notes) L.push('DESCRIPTION:' + icsEscape(ev.notes));
      var r = ev.repeat;
      if (r && r.freq) {
        var rule = 'FREQ=' + r.freq.toUpperCase() + (r.interval > 1 ? ';INTERVAL=' + r.interval : '');
        if (r.freq === 'weekly' && r.days && r.days.length) rule += ';BYDAY=' + r.days.map(function (d) { return ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][d - 1]; }).join(',');
        if (r.until) rule += ';UNTIL=' + r.until.replace(/-/g, '');
        if (r.count) rule += ';COUNT=' + r.count;
        L.push('RRULE:' + rule);
      }
      (ev.exdates || []).forEach(function (x) { L.push(ev.allDay ? 'EXDATE;VALUE=DATE:' + x.replace(/-/g, '') : 'EXDATE:' + icsDate(x + ev.start.slice(10))); });
      (ev.reminders || []).forEach(function (m) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.title), 'TRIGGER:-PT' + m + 'M', 'END:VALARM'); });
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }
  /** Einfache .ics-Dateien (Google, Outlook, Apple): Titel, Zeit, Ort, Beschreibung, Wiederholung, Erinnerungen. */
  function fromIcs(text, cal) {
    var lines = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/), out = [], ev = null, inAlarm = false;
    function unescape(v) { return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }
    function when(params, v) {
      var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(v);
      if (!m) return null;
      if (!m[4] || /VALUE=DATE(?!-)/.test(params)) return { allDay: true, s: m[1] + '-' + m[2] + '-' + m[3] };
      var d = m[7] ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
      return { allDay: false, s: ymd(d) + 'T' + hm(d) };
    }
    lines.forEach(function (line) {
      var i = line.indexOf(':');
      if (i < 0) return;
      var head = line.slice(0, i), value = line.slice(i + 1), name = head.split(';')[0].toUpperCase(), params = head.slice(name.length).toUpperCase();
      if (name === 'BEGIN' && value === 'VEVENT') { ev = { id: uid(), cal: cal, title: '', allDay: false, start: '', end: '', exdates: [], reminders: [] }; return; }
      if (!ev) return;
      if (name === 'BEGIN' && value === 'VALARM') { inAlarm = true; return; }
      if (name === 'END' && value === 'VALARM') { inAlarm = false; return; }
      if (name === 'END' && value === 'VEVENT') {
        if (ev.start) {
          if (!ev.end) ev.end = ev.start;
          if (ev.allDay && ev.end > ev.start) ev.end = ymd(addDays(parseYmd(ev.end), -1)); // DTEND ist exklusiv
          out.push(ev);
        }
        ev = null; return;
      }
      if (inAlarm) {
        var t = /^-P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(value);
        if (name === 'TRIGGER' && t) ev.reminders.push((+t[1] || 0) * 10080 + (+t[2] || 0) * 1440 + (+t[3] || 0) * 60 + (+t[4] || 0));
        return;
      }
      if (name === 'SUMMARY') ev.title = unescape(value);
      else if (name === 'LOCATION') ev.location = unescape(value);
      else if (name === 'DESCRIPTION') ev.notes = unescape(value);
      else if (name === 'DTSTART') { var w = when(params, value); if (w) { ev.start = w.s; ev.allDay = w.allDay; } }
      else if (name === 'DTEND') { var w2 = when(params, value); if (w2) ev.end = w2.s; }
      else if (name === 'EXDATE') value.split(',').forEach(function (x) { var w3 = when(params, x); if (w3) ev.exdates.push(w3.s.slice(0, 10)); });
      else if (name === 'RRULE') {
        var p = {}; value.split(';').forEach(function (kv) { var q = kv.split('='); p[q[0]] = q[1]; });
        var freq = (p.FREQ || '').toLowerCase();
        if (['daily', 'weekly', 'monthly', 'yearly'].indexOf(freq) < 0) return;
        ev.repeat = { freq: freq, interval: +p.INTERVAL || 1 };
        if (p.BYDAY && freq === 'weekly') ev.repeat.days = p.BYDAY.split(',').map(function (d) { return ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].indexOf(d.slice(-2)) + 1; }).filter(Boolean);
        if (p.UNTIL) { var u = when('', p.UNTIL); if (u) ev.repeat.until = u.s.slice(0, 10); }
        if (p.COUNT) ev.repeat.count = +p.COUNT;
      }
    });
    return out;
  }

  /* =====================================================================
     ANSICHTEN
     ===================================================================== */
  function nav(view, date) { location.hash = '#/calendar?v=' + view + '&d=' + ymd(date); }
  function defaultView() { try { return localStorage.getItem(VIEW_KEY) || (window.innerWidth >= 900 ? 'week' : 'month'); } catch (e) { return 'month'; } }
  function openNew(date, time) { location.hash = '#/event?d=' + ymd(date) + (time ? '&t=' + time : ''); }

  function Chip(p) {
    var o = p.o, data = p.data, color = colorOf(data, o.ev);
    return h('button', { type: 'button', className: 'cal-chip' + (o.ev.allDay ? ' cal-chip-allday' : ''), style: { '--c': color },
      onClick: function (e) { e.stopPropagation(); p.onOpen(o); }, title: o.ev.title },
      o.ev.allDay ? null : h('span', { className: 'cal-chip-time' }, hm(o.start)), o.ev.title || '(Ohne Titel)');
  }

  /** Überlappende Termine eines Tages nebeneinander legen (wie Google). */
  function layout(items) {
    var cols = [], groups = [], group = [], groupEnd = 0;
    items.forEach(function (it) {
      if (group.length && it.s >= groupEnd) { groups.push(group); group = []; cols = []; }
      var c = 0; while (cols[c] !== undefined && cols[c] > it.s) c++;
      cols[c] = it.e; it.col = c; group.push(it); groupEnd = Math.max(groupEnd, it.e);
      group.cols = Math.max(group.cols || 0, c + 1);
    });
    if (group.length) groups.push(group);
    groups.forEach(function (g) { g.forEach(function (it) { it.cols = g.cols; }); });
    return items;
  }

  function TimeGrid(p) {
    var days = p.days, data = p.data, scroller = React.useRef(null), now = React.useState(new Date());
    React.useEffect(function () {
      if (scroller.current) scroller.current.scrollTop = Math.max(0, (days.some(function (d) { return sameDay(d, new Date()); }) ? new Date().getHours() - 1 : 7) * HOUR);
      var t = setInterval(function () { now[1](new Date()); }, 60000);
      return function () { clearInterval(t); };
    }, []);
    var from = days[0], to = addDays(days[days.length - 1], 1), occ = range(data, from, to);
    function slot(day, e) {
      var y = e.clientY - e.currentTarget.getBoundingClientRect().top, mins = Math.floor(y / HOUR * 2) * 30;
      openNew(day, pad(Math.floor(mins / 60)) + ':' + pad(mins % 60));
    }
    var hours = []; for (var i = 0; i < 24; i++) hours.push(i);
    return h('div', { className: 'cal-tg', style: { '--cols': days.length } },
      h('div', { className: 'cal-tg-head' }, h('div', { className: 'cal-tg-gutter' }),
        days.map(function (d) {
          var today = sameDay(d, now[0]);
          return h('button', { key: ymd(d), type: 'button', className: 'cal-tg-day' + (today ? ' is-today' : ''), onClick: function () { nav('day', d); } },
            h('span', null, DAYS[isoDow(d) - 1]), h('b', null, d.getDate()));
        })),
      h('div', { className: 'cal-tg-allday' }, h('div', { className: 'cal-tg-gutter op-mono' }, 'ganzt.'),
        days.map(function (d) {
          var list = occ.filter(function (o) { return o.ev.allDay && o.start < addDays(d, 1) && o.end > d; });
          return h('div', { key: ymd(d), className: 'cal-tg-allday-cell', onClick: function () { location.hash = '#/event?d=' + ymd(d) + '&allday=1'; } },
            list.map(function (o) { return h(Chip, { key: o.key, o: o, data: data, onOpen: p.onOpen }); }));
        })),
      h('div', { className: 'cal-tg-scroll', ref: scroller },
        h('div', { className: 'cal-tg-body', style: { height: 24 * HOUR } },
          h('div', { className: 'cal-tg-gutter' }, hours.map(function (hh) { return h('span', { key: hh, style: { top: hh * HOUR } }, hh ? [pad(hh), h('i', { key: 'm' }, ':00')] : ''); })),
          days.map(function (d) {
            var dayEnd = addDays(d, 1);
            var items = layout(occ.filter(function (o) { return !o.ev.allDay && o.start < dayEnd && o.end > d; }).map(function (o) {
              var s = Math.max(0, (o.start - d) / 60000), e = Math.min(1440, (o.end - d) / 60000);
              return { o: o, s: s, e: Math.max(e, s + 20) };
            }));
            var today = sameDay(d, now[0]), nowMin = now[0].getHours() * 60 + now[0].getMinutes();
            return h('div', { key: ymd(d), className: 'cal-tg-col' + (today ? ' is-today' : ''), onClick: function (e) { if (e.target === e.currentTarget) slot(d, e); } },
              items.map(function (it) {
                return h('button', { key: it.o.key, type: 'button', className: 'cal-ev', title: it.o.ev.title,
                  style: { '--c': colorOf(data, it.o.ev), top: it.s / 60 * HOUR, height: (it.e - it.s) / 60 * HOUR - 2, left: (it.col / it.cols * 100) + '%', width: 'calc(' + (100 / it.cols) + '% - 2px)' },
                  onClick: function () { p.onOpen(it.o); } },
                  h('b', null, it.o.ev.title || '(Ohne Titel)'),
                  h('span', null, hm(it.o.start) + ' – ' + hm(it.o.end) + (it.o.ev.location ? ' · ' + it.o.ev.location : '')));
              }),
              today ? h('div', { className: 'cal-now', style: { top: nowMin / 60 * HOUR } }) : null);
          }))));
  }

  function MonthGrid(p) {
    var d = p.date, data = p.data, first = new Date(d.getFullYear(), d.getMonth(), 1), start = startOfWeek(first);
    var weeks = Math.ceil((daysBetween(start, new Date(d.getFullYear(), d.getMonth() + 1, 1))) / 7);
    var end = addDays(start, weeks * 7), occ = range(data, start, end), today = new Date();
    var cells = []; for (var i = 0; i < weeks * 7; i++) cells.push(addDays(start, i));
    return h('div', { className: 'cal-month' },
      h('div', { className: 'cal-month-head' }, DAYS.map(function (n) { return h('span', { key: n }, n); })),
      h('div', { className: 'cal-month-grid', style: { gridTemplateRows: 'repeat(' + weeks + ', 1fr)' } },
        cells.map(function (c) {
          var list = occ.filter(function (o) { return o.start < addDays(c, 1) && (o.end > c || (+o.end === +o.start && sameDay(o.start, c))); });
          var more = list.length - 3;
          return h('div', { key: ymd(c), className: 'cal-cell' + (c.getMonth() !== d.getMonth() ? ' is-other' : '') + (sameDay(c, today) ? ' is-today' : ''),
            onClick: function () { nav('day', c); } },
            h('span', { className: 'cal-cell-day' }, c.getDate()),
            list.slice(0, 3).map(function (o) { return h(Chip, { key: o.key, o: o, data: data, onOpen: p.onOpen }); }),
            more > 0 ? h('span', { className: 'cal-more' }, '+' + more + ' weitere') : null);
        })));
  }

  function Agenda(p) {
    var data = p.data, days = {}, order = [];
    p.items.forEach(function (o) {
      var k = ymd(o.start < p.from ? p.from : o.start);
      if (!days[k]) { days[k] = []; order.push(k); }
      days[k].push(o);
    });
    if (!order.length) return h('div', { className: 'hint' }, p.empty);
    var today = new Date();
    return h('div', { className: 'cal-agenda' }, order.map(function (k) {
      var d = parseYmd(k), rel = daysBetween(today, d);
      return h('section', { key: k, className: 'cal-agenda-day' + (rel === 0 ? ' is-today' : '') },
        h('button', { type: 'button', className: 'cal-agenda-date', onClick: function () { nav('day', d); } },
          h('b', null, d.getDate()), h('span', null, (rel === 0 ? 'Heute' : rel === 1 ? 'Morgen' : DAYS[isoDow(d) - 1]) + ' · ' + MONTHS[d.getMonth()].slice(0, 3) + (d.getFullYear() !== today.getFullYear() ? ' ' + d.getFullYear() : ''))),
        h('div', { className: 'cal-agenda-list' }, days[k].map(function (o) {
          return h('button', { key: o.key, type: 'button', className: 'cal-agenda-item', style: { '--c': colorOf(data, o.ev) }, onClick: function () { p.onOpen(o); } },
            h('span', { className: 'cal-dot' }),
            h('span', { className: 'cal-agenda-time op-mono' }, o.ev.allDay ? 'ganztägig' : hm(o.start) + ' – ' + hm(o.end)),
            h('span', { className: 'cal-agenda-title' }, o.ev.title || '(Ohne Titel)', o.ev.location ? h('small', null, o.ev.location) : null));
        })));
    }));
  }

  /* ---------- Termin ansehen / löschen ---------- */
  function scopeDialog(dialog, title, run) {
    dialog({ type: 'actions', title: title, actions: [
      { label: 'Nur dieser Termin', icon: 'calendar', run: function () { run('one'); } },
      { label: 'Dieser und alle folgenden', icon: 'calendar', run: function () { run('following'); } },
      { label: 'Alle Termine der Serie', icon: 'calendar', run: function () { run('all'); } }] });
  }
  function deleteOccurrence(o, scope) {
    var day = ymd(o.start);
    return update(function (d) {
      var ev = d.events.filter(function (x) { return x.id === o.ev.id; })[0];
      if (!ev) return;
      var first = ymd(parseDT(ev.start)) === day;
      if (scope === 'one' && ev.repeat) (ev.exdates = ev.exdates || []).push(day);
      else if (scope === 'following' && ev.repeat && !first) { ev.repeat.until = ymd(addDays(o.start, -1)); delete ev.repeat.count; }
      else d.events = d.events.filter(function (x) { return x.id !== ev.id; });
    });
  }

  function Details(p) {
    var o = p.o, data = p.data, ev = o.ev, cal = calendarOf(data, ev.cal);
    function del() {
      p.onClose();
      if (ev.repeat && ev.repeat.freq) scopeDialog(p.dialog, 'Wiederkehrenden Termin löschen', function (scope) { deleteOccurrence(o, scope).then(function () { Files.toast('Termin gelöscht'); }); });
      else p.dialog({ type: 'confirm', title: 'Termin löschen', danger: true, ok: 'Löschen', okIcon: 'close', text: '„' + (ev.title || '(Ohne Titel)') + '“ löschen?',
        onOk: function () { deleteOccurrence(o, 'all').then(function () { Files.toast('Termin gelöscht'); }); } });
    }
    function duplicate() {
      p.onClose();
      var copy = JSON.parse(JSON.stringify(ev));
      copy.id = uid(); copy.title = (ev.title || '') + ' (Kopie)'; copy.exdates = [];
      update(function (d) { d.events.push(copy); }).then(function () { location.hash = '#/event?id=' + copy.id; });
    }
    return h(U.Modal, { title: ev.title || '(Ohne Titel)', onClose: p.onClose },
      h('div', { className: 'cal-detail', style: { '--c': colorOf(data, ev) } },
        h(O.InfoList, { items: [
          { label: 'Wann', value: whenText(o) },
          ev.repeat && ev.repeat.freq ? { label: 'Wiederholung', value: repeatText(ev.repeat, parseDT(ev.start)) } : null,
          ev.location ? { label: 'Ort', value: ev.location } : null,
          { label: 'Kalender', value: cal.name },
          ev.reminders && ev.reminders.length ? { label: 'Erinnerung', value: ev.reminders.map(function (m) { return reminderText(m, ev.allDay); }).join(', ') } : null
        ].filter(Boolean) }),
        ev.notes ? h('p', { className: 'cal-notes' }, ev.notes) : null),
      ev.readonly ? h('div', { className: 'op-field-hint', style: { marginTop: 12 } }, 'Gesetzlicher Feiertag (bundesweit). Ausblenden unter „Kalender“.')
        : h('div', { className: 'control-actions' },
          h(O.Button, { size: 'sm', icon: 'settings', onClick: function () { p.onClose(); location.hash = '#/event?id=' + ev.id + '&o=' + ymd(o.start); } }, 'Bearbeiten'),
          h(O.Button, { size: 'sm', variant: 'ghost', icon: 'plus', onClick: duplicate }, 'Duplizieren'),
          h(O.Button, { size: 'sm', variant: 'danger', icon: 'close', onClick: del }, 'Löschen')));
  }

  /* ---------- Kalender verwalten ---------- */
  function Manage(p) {
    var data = p.data, file = React.useRef(null);
    function change(id, patch) { update(function (d) { d.calendars.forEach(function (c) { if (c.id === id) Object.assign(c, patch); }); }); }
    function add() {
      p.dialog({ type: 'prompt', title: 'Neuer Kalender', label: 'Name (z. B. Schule, Familie)', value: '', ok: 'Anlegen', onOk: function (name) {
        if (name) update(function (d) { d.calendars.push({ id: uid(), name: name, color: COLORS[d.calendars.length % COLORS.length][0], visible: true }); });
      } });
    }
    function remove(c) {
      var n = data.events.filter(function (e) { return e.cal === c.id; }).length;
      p.dialog({ type: 'confirm', title: 'Kalender löschen', danger: true, ok: 'Löschen', okIcon: 'close',
        text: '„' + c.name + '“' + (n ? ' mit ' + n + (n === 1 ? ' Termin' : ' Terminen') : '') + ' endgültig löschen?',
        onOk: function () { update(function (d) { d.calendars = d.calendars.filter(function (x) { return x.id !== c.id; }); d.events = d.events.filter(function (e) { return e.cal !== c.id; }); }); } });
    }
    function importIcs(e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      f.text().then(function (text) {
        var list = fromIcs(text, data.calendars[0].id);
        if (!list.length) return Files.toast('Keine Termine in der Datei gefunden.', 'danger');
        update(function (d) { d.events = d.events.concat(list); }).then(function () { Files.toast(list.length + (list.length === 1 ? ' Termin' : ' Termine') + ' importiert'); });
      });
    }
    return h(U.Modal, { title: 'Kalender', onClose: p.onClose },
      h('div', { className: 'file-list' }, data.calendars.map(function (c) {
        return h('div', { key: c.id, className: 'cal-manage-row' },
          h(U.Check, { label: '', checked: c.visible !== false, onChange: function (v) { change(c.id, { visible: v }); } }),
          h('span', { className: 'cal-swatch', style: { background: c.color } }),
          h('span', { className: 'cal-manage-name' }, c.name),
          h('select', { 'aria-label': 'Farbe von ' + c.name, value: c.color, onChange: function (e) { change(c.id, { color: e.target.value }); } }, U.options(COLORS)),
          h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': c.name + ' umbenennen', onClick: function () {
            p.dialog({ type: 'prompt', title: 'Kalender umbenennen', label: 'Name', value: c.name, ok: 'Speichern', onOk: function (v) { if (v) change(c.id, { name: v }); } });
          } }, h(O.Icon, { name: 'settings' })),
          data.calendars.length > 1 ? h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': c.name + ' löschen', onClick: function () { remove(c); } }, h(O.Icon, { name: 'close' })) : null);
      }),
      h('div', { className: 'cal-manage-row' },
        h(U.Check, { label: '', checked: data.holidays, onChange: function (v) { update(function (d) { d.holidays = v; }); } }),
        h('span', { className: 'cal-swatch', style: { background: '#a8a79c' } }), h('span', { className: 'cal-manage-name' }, 'Feiertage (bundesweit)'))),
      h('div', { className: 'control-actions' },
        h(O.Button, { size: 'sm', icon: 'plus', onClick: add }, 'Neuer Kalender'),
        h(O.Button, { size: 'sm', variant: 'outline', icon: 'upload', onClick: function () { file.current.click(); } }, '.ics importieren'),
        h(O.Button, { size: 'sm', variant: 'outline', icon: 'download', disabled: !data.events.length,
          onClick: function () { window.NDPortalModel.downloadText('kalender.ics', toIcs(data), 'text/calendar;charset=utf-8'); } }, '.ics exportieren')),
      h('input', { ref: file, type: 'file', accept: '.ics,text/calendar', hidden: true, onChange: importIcs }),
      h('div', { className: 'op-field-hint', style: { marginTop: 8 } }, 'Import landet im Kalender „' + data.calendars[0].name + '“. Termine aus dem Google Kalender: dort unter Einstellungen → Import & Export als .ics exportieren.'));
  }

  function StoreHint() {
    var s = shared;
    var text = s.status === 'saving' ? 'Speichert …' : s.where === 'nas' ? 'Auf dem NAS – auf allen Geräten gleich'
      : s.where === 'offline' ? 'NAS nicht erreichbar – Änderungen werden später übertragen' : 'Nur auf diesem Gerät – verbinde das NAS, um Termine zu teilen';
    return h(O.Status, { tone: s.status === 'saving' ? 'info' : s.where === 'nas' ? 'ok' : 'warn' }, text);
  }

  /* ---------- Seite ---------- */
  function Calendar(props) {
    var cal = useCalendar(), q = React.useState(''), searching = React.useState(false), open = React.useState(null), manage = React.useState(false), dialog = React.useState(null);
    var view = ['day', 'week', 'month', 'list'].indexOf(props.view) >= 0 ? props.view : defaultView();
    var date = props.date ? parseYmd(props.date) : startOfDay(new Date());
    React.useEffect(function () { try { localStorage.setItem(VIEW_KEY, view); } catch (e) { /* egal */ } }, [view]);
    if (cal.status === 'error' && !cal.data) return h(O.Alert, { tone: 'danger', title: 'Kalender nicht geladen' }, cal.error);
    if (!cal.data) return h('div', { className: 'hint' }, 'Lade Kalender …');
    var data = cal.data;

    function step(n) {
      if (view === 'day') nav(view, addDays(date, n));
      else if (view === 'week') nav(view, addDays(date, 7 * n));
      else if (view === 'month') nav(view, new Date(date.getFullYear(), date.getMonth() + n, 1));
      else nav(view, addDays(date, 14 * n));
    }
    var week = startOfWeek(date), weekEnd = addDays(week, 6);
    var title = view === 'day' ? longDate(date) : view === 'month' ? MONTHS[date.getMonth()] + ' ' + date.getFullYear()
      : view === 'week' ? week.getDate() + '. ' + (week.getMonth() !== weekEnd.getMonth() ? MONTHS[week.getMonth()].slice(0, 3) + ' ' : '') + '– ' + weekEnd.getDate() + '. ' + MONTHS[weekEnd.getMonth()].slice(0, 3) + ' ' + weekEnd.getFullYear()
      : 'Ab ' + date.getDate() + '. ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear();

    var body;
    if (searching[0] && q[0].trim()) {
      var needle = q[0].trim().toLowerCase(), today = startOfDay(new Date());
      var found = range(data, addDays(today, -365), addDays(today, 730), true).filter(function (o) {
        return !o.ev.readonly && ((o.ev.title || '') + ' ' + (o.ev.location || '') + ' ' + (o.ev.notes || '')).toLowerCase().indexOf(needle) >= 0;
      }).slice(0, 200);
      body = h(Agenda, { items: found, from: addDays(today, -365), data: data, onOpen: open[1], empty: 'Keine Termine gefunden.' });
    } else if (view === 'month') body = h(MonthGrid, { date: date, data: data, onOpen: open[1] });
    else if (view === 'list') body = h(Agenda, { items: range(data, date, addDays(date, 60)), from: date, data: data, onOpen: open[1], empty: 'Keine Termine in den nächsten 60 Tagen.' });
    else body = h(TimeGrid, { key: view + ymd(date), days: view === 'day' ? [date] : [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(week, i); }), data: data, onOpen: open[1] });

    return [
      h('div', { key: 'tb', className: 'cal-toolbar' },
        h('div', { className: 'op-row', style: { gap: 6, flexWrap: 'nowrap' } },
          h(O.Button, { variant: 'outline', size: 'sm', onClick: function () { nav(view, new Date()); } }, 'Heute'),
          h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Zurück', onClick: function () { step(-1); } }, h(O.Icon, { name: 'back' })),
          h('button', { type: 'button', className: 'op-appbar-btn cal-next', 'aria-label': 'Weiter', onClick: function () { step(1); } }, h(O.Icon, { name: 'back' })),
          h('h2', { className: 'cal-title' }, title)),
        h('div', { className: 'op-row', style: { gap: 6 } },
          h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Suchen', 'aria-pressed': searching[0] ? 'true' : 'false', onClick: function () { searching[1](!searching[0]); } }, h(O.Icon, { name: 'search' })),
          h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Kalender verwalten', onClick: function () { manage[1](true); } }, h(O.Icon, { name: 'settings' })),
          h(O.Button, { size: 'sm', icon: 'plus', onClick: function () { openNew(view === 'month' || view === 'list' ? (sameDay(date, new Date()) ? new Date() : date) : date); } }, 'Termin'))),
      searching[0] ? h(O.TextField, { key: 's', label: 'Suchen', value: q[0], autoFocus: true, placeholder: 'Titel, Ort, Notiz …', onChange: function (e) { q[1](e.target.value); } }) : null,
      h(O.Tabs, { key: 'v', items: [{ id: 'day', label: 'Tag' }, { id: 'week', label: 'Woche' }, { id: 'month', label: 'Monat' }, { id: 'list', label: 'Liste' }],
        value: view, onChange: function (v) { searching[1](false); nav(v, date); } }),
      h('div', { key: 'cals', className: 'cal-legend' }, data.calendars.concat(data.holidays ? [calendarOf(data, HOLIDAYS)] : []).map(function (c) {
        return h('button', { key: c.id, type: 'button', className: 'cal-legend-item', 'aria-pressed': c.visible !== false ? 'true' : 'false', style: { '--c': c.color },
          onClick: function () { if (c.id === HOLIDAYS) update(function (d) { d.holidays = false; }); else update(function (d) { d.calendars.forEach(function (x) { if (x.id === c.id) x.visible = x.visible === false; }); }); } },
          h('span', { className: 'cal-dot' }), c.name);
      })),
      h('div', { key: 'body', className: 'cal-body' }, body),
      h('div', { key: 'st' }, h(StoreHint)),
      open[0] ? h(Details, { key: 'o', o: open[0], data: data, onClose: function () { open[1](null); }, dialog: dialog[1] }) : null,
      manage[0] ? h(Manage, { key: 'm', data: data, onClose: function () { manage[1](false); }, dialog: dialog[1] }) : null,
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /* =====================================================================
     TERMIN BEARBEITEN
     ===================================================================== */
  function repeatPresets(start) {
    var dow = isoDow(start);
    return [['none', 'Wiederholt sich nicht'], ['daily', 'Täglich'], ['weekly', 'Wöchentlich am ' + DAY_NAMES[dow - 1]], ['weekdays', 'Jeden Werktag (Mo–Fr)'],
      ['monthly', 'Monatlich am ' + start.getDate() + '.'], ['yearly', 'Jährlich am ' + start.getDate() + '. ' + MONTHS[start.getMonth()]], ['custom', 'Benutzerdefiniert …']];
  }
  function presetOf(r, start) {
    if (!r || !r.freq) return 'none';
    if ((r.interval || 1) !== 1 || r.until || r.count) return 'custom';
    if (r.freq === 'weekly') {
      var days = (r.days && r.days.length ? r.days : [isoDow(start)]).join();
      return days === '1,2,3,4,5' ? 'weekdays' : days === String(isoDow(start)) ? 'weekly' : 'custom';
    }
    return r.freq;
  }

  function EventEditor(props) {
    var cal = useCalendar(), dialog = React.useState(null), err = React.useState(null);
    var f = React.useState(null);
    var data = cal.data;
    // Formular einmal aus dem Termin (bzw. dem gewählten Vorkommen) füllen
    React.useEffect(function () {
      if (!data || f[0]) return;
      var ev = props.id ? data.events.filter(function (x) { return x.id === props.id; })[0] : null;
      if (ev) {
        var s = parseDT(ev.start), e = parseDT(ev.end || ev.start), shift = props.occurrence ? daysBetween(s, parseYmd(props.occurrence)) : 0;
        s = addDays(s, shift); e = addDays(e, shift);
        f[1]({ title: ev.title || '', allDay: !!ev.allDay, sd: ymd(s), st: hm(s), ed: ymd(e), et: hm(e), repeat: ev.repeat ? JSON.parse(JSON.stringify(ev.repeat)) : null,
          preset: presetOf(ev.repeat, parseDT(ev.start)), reminders: (ev.reminders || []).slice(), cal: ev.cal, color: ev.color || '', location: ev.location || '', notes: ev.notes || '' });
      } else {
        var d = props.date ? parseYmd(props.date) : new Date(), t = props.time;
        if (!t) { var n = new Date(); t = pad(Math.min(23, n.getHours() + 1)) + ':00'; }
        var start = parseDT(ymd(d) + 'T' + t), end = new Date(start.getTime() + 3600000);
        f[1]({ title: '', allDay: !!props.allDay, sd: ymd(start), st: hm(start), ed: ymd(end), et: hm(end), repeat: null, preset: 'none',
          reminders: props.allDay ? [] : [30], cal: (data.calendars.filter(function (c) { return c.visible !== false; })[0] || data.calendars[0]).id, color: '', location: '', notes: '' });
      }
    }, [data]);
    if (cal.status === 'error' && !data) return h(O.Alert, { tone: 'danger', title: 'Kalender nicht geladen' }, cal.error);
    if (!data || !f[0]) return h('div', { className: 'hint' }, 'Lade …');
    var v = f[0], original = props.id ? data.events.filter(function (x) { return x.id === props.id; })[0] : null;
    if (props.id && !original) return h(O.Alert, { tone: 'warn', title: 'Termin nicht gefunden' }, 'Vielleicht wurde er auf einem anderen Gerät gelöscht.');

    function set(patch) { f[1](Object.assign({}, v, patch)); }
    var startDate = parseYmd(v.sd);
    function setStart(sd, st) {
      // Ende mitschieben, Dauer bleibt gleich
      var oldS = parseDT(v.sd + 'T' + v.st), oldE = parseDT(v.ed + 'T' + v.et), s = parseDT(sd + 'T' + st), e = new Date(s.getTime() + Math.max(0, oldE - oldS));
      set({ sd: sd, st: st, ed: ymd(e), et: hm(e) });
    }
    function setPreset(p) {
      var dow = isoDow(startDate);
      var r = p === 'none' ? null : p === 'weekdays' ? { freq: 'weekly', interval: 1, days: [1, 2, 3, 4, 5] } : p === 'weekly' ? { freq: 'weekly', interval: 1, days: [dow] }
        : p === 'custom' ? (v.repeat || { freq: 'weekly', interval: 1, days: [dow] }) : { freq: p, interval: 1 };
      set({ preset: p, repeat: r });
    }
    function setRepeat(patch) { set({ repeat: Object.assign({}, v.repeat, patch) }); }

    function fields() {
      var start = v.allDay ? v.sd : v.sd + 'T' + v.st, end = v.allDay ? v.ed : v.ed + 'T' + v.et;
      var r = v.repeat ? JSON.parse(JSON.stringify(v.repeat)) : null;
      if (r && r.freq !== 'weekly') delete r.days;
      return { title: v.title.trim(), allDay: v.allDay, start: start, end: end, repeat: r, reminders: v.reminders.slice().sort(function (a, b) { return a - b; }),
        cal: v.cal, color: v.color || undefined, location: v.location.trim() || undefined, notes: v.notes.trim() || undefined };
    }
    function done(dateStr) { Files.toast('Termin gespeichert'); location.hash = '#/calendar?d=' + dateStr.slice(0, 10); }
    function submit(e) {
      e.preventDefault(); err[1](null);
      var x = fields();
      if (parseDT(x.end) < parseDT(x.start)) return err[1]('Das Ende liegt vor dem Beginn.');
      if (x.repeat && x.repeat.freq === 'weekly' && x.repeat.days && !x.repeat.days.length) return err[1]('Mindestens einen Wochentag wählen.');
      if (!original) return update(function (d) { d.events.push(Object.assign({ id: uid(), exdates: [] }, x)); }).then(function () { done(x.start); });
      if (!(original.repeat && original.repeat.freq) || !props.occurrence) {
        return update(function (d) { d.events.forEach(function (ev) { if (ev.id === original.id) { Object.keys(x).forEach(function (k) { ev[k] = x[k]; }); } }); }).then(function () { done(x.start); });
      }
      scopeDialog(dialog[1], 'Wiederkehrenden Termin ändern', function (scope) {
        var occ = props.occurrence, firstDay = ymd(parseDT(original.start));
        update(function (d) {
          var ev = d.events.filter(function (y) { return y.id === original.id; })[0];
          if (!ev) return;
          if (scope === 'one') {
            (ev.exdates = ev.exdates || []).push(occ);
            x.repeat = null;
            d.events.push(Object.assign({ id: uid(), exdates: [] }, x));
          } else if (scope === 'following' && occ !== firstDay) {
            ev.repeat.until = ymd(addDays(parseYmd(occ), -1)); delete ev.repeat.count;
            d.events.push(Object.assign({ id: uid(), exdates: [] }, x));
          } else {
            // ganze Serie: um dieselbe Anzahl Tage verschieben wie das bearbeitete Vorkommen
            var shift = daysBetween(parseYmd(occ), parseYmd(x.start)), dur = parseDT(x.end) - parseDT(x.start);
            var s = addDays(parseYmd(original.start), shift);
            var ns = v.allDay ? ymd(s) : ymd(s) + 'T' + v.st, ne = new Date(parseDT(ns).getTime() + dur);
            Object.keys(x).forEach(function (k) { ev[k] = x[k]; });
            ev.start = ns; ev.end = v.allDay ? ymd(ne) : ymd(ne) + 'T' + hm(ne);
          }
        }).then(function () { done(x.start); });
      });
    }
    function remove() {
      var o = { ev: original, start: parseYmd(props.occurrence || original.start) };
      if (original.repeat && original.repeat.freq && props.occurrence) scopeDialog(dialog[1], 'Wiederkehrenden Termin löschen', function (scope) { deleteOccurrence(o, scope).then(function () { location.hash = '#/calendar?d=' + ymd(o.start); }); });
      else dialog[1]({ type: 'confirm', title: 'Termin löschen', danger: true, ok: 'Löschen', okIcon: 'close', text: '„' + (original.title || '(Ohne Titel)') + '“ löschen?',
        onOk: function () { deleteOccurrence(o, 'all').then(function () { location.hash = '#/calendar?d=' + ymd(o.start); }); } });
    }

    var reminderOpts = v.allDay ? REMINDERS_ALLDAY : REMINDERS;
    var r = v.repeat;
    return [
      h(O.Panel, { key: 'f', variant: 'framed', title: original ? 'Termin bearbeiten' : 'Neuer Termin', icon: 'calendar' },
        h('form', { className: 'op-col', style: { gap: 14 }, onSubmit: submit, autoComplete: 'off' },
          h(O.TextField, { label: 'Titel', value: v.title, autoFocus: !original, placeholder: 'Titel hinzufügen', onChange: function (e) { set({ title: e.target.value }); } }),
          h(O.Toggle, { label: 'Ganztägig', checked: v.allDay, onChange: function (on) { set({ allDay: on, reminders: on ? [] : [30] }); } }),
          h('div', { className: 'cal-when' },
            h(O.TextField, { label: 'Beginn', type: 'date', value: v.sd, required: true, onChange: function (e) { if (e.target.value) setStart(e.target.value, v.st); } }),
            v.allDay ? null : h(O.TextField, { label: 'Uhrzeit', type: 'time', value: v.st, required: true, onChange: function (e) { if (e.target.value) setStart(v.sd, e.target.value); } }),
            h(O.TextField, { label: 'Ende', type: 'date', value: v.ed, required: true, onChange: function (e) { if (e.target.value) set({ ed: e.target.value }); } }),
            v.allDay ? null : h(O.TextField, { label: 'Uhrzeit', type: 'time', value: v.et, required: true, onChange: function (e) { if (e.target.value) set({ et: e.target.value }); } })),
          h(U.Select, { label: 'Wiederholung', value: v.preset, onChange: setPreset }, U.options(repeatPresets(startDate))),
          v.preset === 'custom' && r ? h('div', { className: 'reward' },
            h('div', { className: 'g2' },
              h(O.TextField, { label: 'Alle', type: 'number', min: 1, max: 99, value: r.interval || 1, onChange: function (e) { setRepeat({ interval: Math.max(1, +e.target.value || 1) }); } }),
              h(U.Select, { label: 'Einheit', value: r.freq, onChange: function (fq) { setRepeat({ freq: fq, days: fq === 'weekly' ? [isoDow(startDate)] : undefined }); } },
                U.options([['daily', 'Tage'], ['weekly', 'Wochen'], ['monthly', 'Monate'], ['yearly', 'Jahre']]))),
            r.freq === 'weekly' ? h('div', null, h('div', { className: 'op-label', style: { marginBottom: 6 } }, 'Am'),
              h(U.Chips, { multi: true, label: 'Wochentage', value: (r.days || []).map(String), items: DAYS.map(function (n, i) { return [String(i + 1), n]; }),
                onChange: function (id) { var days = (r.days || []).slice(), n = +id, i = days.indexOf(n); if (i >= 0) days.splice(i, 1); else days.push(n); setRepeat({ days: days.sort() }); } })) : null,
            h(U.Select, { label: 'Endet', value: r.until ? 'until' : r.count ? 'count' : 'never', onChange: function (m) {
              setRepeat({ until: m === 'until' ? ymd(addDays(startDate, 30)) : undefined, count: m === 'count' ? 10 : undefined });
            } }, U.options([['never', 'Nie'], ['until', 'Am Datum'], ['count', 'Nach Anzahl Terminen']])),
            r.until ? h(O.TextField, { label: 'Endet am', type: 'date', value: r.until, onChange: function (e) { if (e.target.value) setRepeat({ until: e.target.value }); } }) : null,
            r.count ? h(O.TextField, { label: 'Anzahl Termine', type: 'number', min: 1, max: 999, value: r.count, onChange: function (e) { setRepeat({ count: Math.max(1, +e.target.value || 1) }); } }) : null,
            h('div', { className: 'op-field-hint' }, repeatText(r, startDate))) : null,
          h('div', null, h('div', { className: 'op-label', style: { marginBottom: 6 } }, 'Erinnerungen'),
            h('div', { className: 'chips' }, v.reminders.map(function (m, i) {
              return h('button', { key: m + '-' + i, type: 'button', className: 'chip', 'aria-label': reminderText(m, v.allDay) + ' entfernen',
                onClick: function () { set({ reminders: v.reminders.filter(function (x, j) { return j !== i; }) }); } }, reminderText(m, v.allDay) + '  ✕');
            }),
              h('select', { className: 'chip', 'aria-label': 'Erinnerung hinzufügen', value: '', onChange: function (e) {
                var m = +e.target.value; if (e.target.value !== '' && v.reminders.indexOf(m) < 0) set({ reminders: v.reminders.concat([m]) });
              } }, h('option', { value: '' }, '+ Erinnerung'), U.options(reminderOpts.map(function (x) { return [String(x[0]), x[1]]; }))))),
          h('div', { className: 'g2' },
            h(U.Select, { label: 'Kalender', value: v.cal, onChange: function (c) { set({ cal: c }); } }, U.options(data.calendars.map(function (c) { return [c.id, c.name]; }))),
            h(U.Select, { label: 'Farbe', value: v.color, onChange: function (c) { set({ color: c }); } }, h('option', { value: '' }, 'Farbe des Kalenders'), U.options(COLORS))),
          h(O.TextField, { label: 'Ort', value: v.location, placeholder: 'Ort hinzufügen', onChange: function (e) { set({ location: e.target.value }); } }),
          h(O.TextField, { label: 'Beschreibung', multiline: true, rows: 4, value: v.notes, onChange: function (e) { set({ notes: e.target.value }); } }),
          err[0] ? h(O.Status, { tone: 'danger' }, err[0]) : null,
          h('div', { className: 'op-row', style: { justifyContent: 'space-between' } },
            original ? h(O.Button, { variant: 'danger', icon: 'close', onClick: remove }, 'Löschen') : h('span'),
            h('div', { className: 'op-row' },
              h(O.Button, { variant: 'ghost', onClick: function () { if (history.length > 1) history.back(); else location.hash = '#/calendar'; } }, 'Abbrechen'),
              h(O.Button, { type: 'submit', icon: 'calendar', disabled: cal.status === 'saving' }, 'Speichern'))))),
      dialog[0] ? h(Files.Dialog, { key: 'd', dialog: dialog[0], onClose: function () { dialog[1](null); } }) : null
    ];
  }

  /** Nächste Termine (für die Startseite). */
  function Upcoming() {
    var cal = useCalendar();
    if (!cal.data) return null;
    var now = new Date(), list = range(cal.data, now, addDays(startOfDay(now), 3)).filter(function (o) { return !o.ev.readonly && o.end > now; }).slice(0, 4);
    return h(O.Panel, { variant: 'outlined', mutedCorners: true, title: 'Nächste Termine', icon: 'calendar' },
      list.length ? h(Agenda, { items: list, from: startOfDay(now), data: cal.data, onOpen: function (o) { location.hash = '#/calendar?v=day&d=' + ymd(o.start); }, empty: '' })
        : h('p', { style: { margin: 0, color: 'var(--ink-muted)' } }, 'Heute und morgen keine Termine.'),
      h('div', { style: { marginTop: 10 } }, h(O.Button, { variant: 'ghost', size: 'sm', icon: 'calendar', onClick: function () { location.hash = '#/calendar'; } }, 'Zum Kalender')));
  }

  window.NDCalendar = { Calendar: Calendar, EventEditor: EventEditor, Upcoming: Upcoming, ensureLoaded: ensureLoaded, ready: function () { return !!shared.data; },
    reminders: reminders, _occurrences: occurrences, _fromIcs: fromIcs, _toIcs: toIcs, _holidays: holidays };
})();
