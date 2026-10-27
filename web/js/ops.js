/* @ds-bundle: {"format":4,"namespace":"Ops","components":[{"name":"Panel"},{"name":"TitleBar"},{"name":"Tabs"},{"name":"NavButton"},{"name":"Button"},{"name":"Icon"},{"name":"Status"},{"name":"Badge"},{"name":"StatTile"},{"name":"BarGauge"},{"name":"AreaChart"},{"name":"RadarChart"},{"name":"InfoList"},{"name":"EventLog"},{"name":"DataTable"},{"name":"CommandInput"},{"name":"TextField"},{"name":"Toggle"},{"name":"ProgressBar"},{"name":"Alert"},{"name":"ChatMessage"},{"name":"LogoSlot"},{"name":"AppBar"},{"name":"BottomNav"},{"name":"ListItem"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() { return Array.prototype.slice.call(arguments).filter(Boolean).join(' '); }
  function rest(props, keys) { var o = {}; for (var k in props) if (keys.indexOf(k) < 0) o[k] = props[k]; return o; }

  /* ---------- Icon ---------- */
  var ICONS = {
    file: 'M6 3h8l4 4v14H6z M14 3v4h4',
    folder: 'M3 6h6l2 2h10v11H3z',
    sensor: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M7.5 7.5a6.4 6.4 0 0 0 0 9 M16.5 7.5a6.4 6.4 0 0 1 0 9 M4.6 4.6a10.5 10.5 0 0 0 0 14.8 M19.4 4.6a10.5 10.5 0 0 1 0 14.8',
    bank: 'M3 9l9-5 9 5 M4 9h16 M6 9v8 M10 9v8 M14 9v8 M18 9v8 M3 20h18',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z M9 12l2 2 4-4',
    chart: 'M4 4v16h16 M7 15l4-4 3 3 5-6',
    news: 'M4 5h13v14H4z M17 9h3v10H4 M7 8h7 M7 12h7 M7 15h4',
    chat: 'M4 5h16v11H9l-5 4z',
    power: 'M12 3v9 M7 6.3a7 7 0 1 0 10 0',
    alert: 'M12 3l10 18H2z M12 10v5 M12 17.5v.5',
    close: 'M5 5l14 14 M19 5L5 19',
    user: 'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21c1-4 4-6 8-6s7 2 8 6',
    lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
    temp: 'M10 4h4v10a4 4 0 1 1-4 0z M12 9v8',
    grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
    signal: 'M4 20v-3 M9 20v-7 M14 20v-11 M19 20V4',
    search: 'M10.5 10.5m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0 M15 15l6 6',
    upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4',
    download: 'M12 4v12 M7 11l5 5 5-5 M4 16v4h16v-4',
    send: 'M3 11l18-8-8 18-2-8z',
    camera: 'M3 7h4l2-3h6l2 3h4v13H3z M12 13.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
    map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15',
    settings: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    wallet: 'M3 7h16v13H3z M3 7l12-4v4 M15 13h4',
    door: 'M5 3h11v18H5z M16 5h3v16 M13 12v1',
    back: 'M15 5l-7 7 7 7',
    home: 'M3 11l9-7 9 7 M5 10v10h14V10',
    plus: 'M12 5v14 M5 12h14',
    more: 'M5 11h2v2H5z M11 11h2v2h-2z M17 11h2v2h-2z',
    card: 'M3 6h18v12H3z M3 10h18 M6 15h4'
  };
  function Icon(props) {
    var d = ICONS[props.name] || ICONS.grid;
    return h('svg', { className: cx('op-icon', props.className), viewBox: '0 0 24 24', 'aria-hidden': props.title ? undefined : 'true', role: props.title ? 'img' : undefined, style: props.size ? { width: props.size, height: props.size } : undefined },
      props.title ? h('title', null, props.title) : null,
      h('path', { d: d }));
  }
  Icon.names = Object.keys(ICONS);

  /* ---------- Layout ---------- */
  function Corners(muted) {
    return [h('span', { key: 'tl', className: 'op-corner op-corner-tl' }), h('span', { key: 'tr', className: 'op-corner op-corner-tr' }),
      h('span', { key: 'bl', className: 'op-corner op-corner-bl' }), h('span', { key: 'br', className: 'op-corner op-corner-br' })];
  }
  function Panel(props) {
    var variant = props.variant || 'plain';
    var corners = props.corners !== false;
    return h('section', Object.assign(rest(props, ['variant', 'corners', 'title', 'icon', 'glow', 'mutedCorners', 'className', 'children']), {
      className: cx('op-panel', 'op-root', 'op-panel-' + variant, props.glow && 'op-panel-glow', props.mutedCorners && 'op-corners-muted', props.className)
    }),
      corners ? Corners() : null,
      props.title ? h('h3', { className: 'op-panel-head' }, props.icon ? h(Icon, { name: props.icon }) : null, props.title) : null,
      props.children);
  }

  function TitleBar(props) {
    return h('header', { className: cx('op-titlebar', 'op-root', props.size === 'lg' && 'op-titlebar-lg', props.className) },
      h('span', null, props.children),
      props.onClose ? h('button', { className: 'op-titlebar-x', 'aria-label': 'Close', onClick: props.onClose }, h(Icon, { name: 'close' })) : props.end || null);
  }

  function Tabs(props) {
    var st = React.useState(props.defaultValue || (props.items[0] && props.items[0].id));
    var value = props.value !== undefined ? props.value : st[0];
    function pick(id) { if (props.value === undefined) st[1](id); if (props.onChange) props.onChange(id); }
    return h('div', { className: cx('op-tabs', 'op-root', props.className), role: 'tablist', style: props.align === 'end' ? { justifyContent: 'flex-end' } : props.align === 'center' ? { justifyContent: 'center' } : undefined },
      props.items.map(function (it) {
        return h('button', { key: it.id, role: 'tab', className: 'op-tab', 'aria-selected': value === it.id ? 'true' : 'false', onClick: function () { pick(it.id); } }, it.label);
      }));
  }

  function NavButton(props) {
    return h('button', Object.assign(rest(props, ['active', 'icon', 'meta', 'className', 'children']), {
      className: cx('op-nav', props.className), 'aria-current': props.active ? 'page' : undefined, type: 'button'
    }), props.icon ? h(Icon, { name: props.icon }) : null, h('span', null, props.children), props.meta ? h('span', { className: 'op-nav-meta' }, props.meta) : null);
  }

  function Button(props) {
    var v = props.variant || 'primary';
    return h('button', Object.assign(rest(props, ['variant', 'size', 'icon', 'className', 'children']), {
      type: props.type || 'button', className: cx('op-btn', 'op-btn-' + v, props.size === 'sm' && 'op-btn-sm', props.className)
    }), props.icon ? h(Icon, { name: props.icon }) : null, props.children);
  }

  /* ---------- Status ---------- */
  var GLYPH = { ok: '●', warn: '▲', danger: '✕', info: 'i', signal: '■', neutral: '○' };
  function Status(props) {
    var tone = props.tone || 'ok';
    return h('span', { className: cx('op-status', 'op-tone-' + tone, props.className) },
      props.glyph === false ? null : h('span', { 'aria-hidden': 'true' }, GLYPH[tone]), h('span', null, props.children));
  }
  function Badge(props) {
    var tone = props.tone || 'signal';
    return h('span', { className: cx('op-badge', props.solid ? 'op-badge-solid' : 'op-tone-' + tone, props.className) }, props.children);
  }

  /* ---------- Charts ---------- */
  function BarGauge(props) {
    var w = props.width || 34, ht = props.height || 64, v = Math.max(0, Math.min(1, props.value == null ? .5 : props.value));
    var y = ht - v * ht, amp = props.wave === false ? 0 : Math.min(4, ht * .06);
    var d = 'M0 ' + (y + amp) + ' C ' + (w * .3) + ' ' + (y - amp) + ' ' + (w * .6) + ' ' + (y + amp * 1.4) + ' ' + w + ' ' + (y - amp * .5) + ' L ' + w + ' ' + ht + ' L 0 ' + ht + ' Z';
    return h('svg', { className: cx('op-gauge', props.solid && 'op-gauge-solid', props.className), width: w, height: ht, viewBox: '0 0 ' + w + ' ' + ht, role: 'img', 'aria-label': (props.label || 'Level') + ' ' + Math.round(v * 100) + '%' },
      h('path', { d: d }),
      h('rect', { className: 'op-gauge-frame', x: .5, y: .5, width: w - 1, height: ht - 1 }));
  }

  function AreaChart(props) {
    var data = props.data || [], W = props.width || 320, H = props.height || 160, padL = 34, padB = 16, padT = props.title ? 18 : 6;
    var min = props.min != null ? props.min : Math.min.apply(null, data), max = props.max != null ? props.max : Math.max.apply(null, data);
    if (max === min) max = min + 1;
    var ticks = props.ticks || 5, iw = W - padL - 4, ih = H - padB - padT;
    function X(i) { return padL + (data.length < 2 ? 0 : i * iw / (data.length - 1)); }
    function Y(v) { return padT + ih - (v - min) / (max - min) * ih; }
    var line = data.map(function (v, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var start = props.fillFrom != null ? Math.round(props.fillFrom * (data.length - 1)) : 0;
    var seg = data.slice(start).map(function (v, i) { return (i ? 'L' : 'M') + X(i + start).toFixed(1) + ' ' + Y(v).toFixed(1); }).join(' ');
    var area = seg + ' L' + X(data.length - 1).toFixed(1) + ' ' + (padT + ih) + ' L' + X(start).toFixed(1) + ' ' + (padT + ih) + ' Z';
    var grid = [];
    for (var t = 0; t < ticks; t++) {
      var val = min + (max - min) * t / (ticks - 1), yy = Y(val);
      grid.push(h('line', { key: 'g' + t, className: 'op-grid', x1: padL, x2: W - 4, y1: yy, y2: yy }));
      grid.push(h('text', { key: 't' + t, x: padL - 6, y: yy + 3, textAnchor: 'end' }, props.format ? props.format(val) : Math.round(val)));
    }
    return h('svg', { className: cx('op-chart', props.className), viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': props.title || 'Chart' },
      props.title ? h('text', { className: 'op-chart-title', x: padL + iw / 2, y: 10, textAnchor: 'middle' }, props.title) : null,
      grid,
      props.band ? h('rect', { className: 'op-area', x: X(Math.round(props.band[0] * (data.length - 1))), y: padT, width: X(Math.round(props.band[1] * (data.length - 1))) - X(Math.round(props.band[0] * (data.length - 1))), height: ih }) : null,
      props.area === false ? null : h('path', { className: 'op-area', d: area }),
      h('path', { className: 'op-stroke', d: line }),
      props.xLabels ? props.xLabels.map(function (l, i) { return h('text', { key: 'x' + i, x: padL + i * iw / (props.xLabels.length - 1), y: H - 2, textAnchor: i === 0 ? 'start' : i === props.xLabels.length - 1 ? 'end' : 'middle' }, l); }) : null);
  }

  function RadarChart(props) {
    var vals = props.values || [], n = vals.length || 6, S = props.size || 180, c = S / 2, r = c - 16, labels = props.labels || [];
    function pt(i, k) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k]; }
    function poly(k) { var p = []; for (var i = 0; i < n; i++) p.push(pt(i, k).map(function (x) { return x.toFixed(1); }).join(',')); return p.join(' '); }
    var rings = [1, .66, .33].map(function (k) { return h('polygon', { key: k, className: 'op-grid', points: poly(k), fill: 'none' }); });
    var spokes = []; for (var i = 0; i < n; i++) { var e = pt(i, 1); spokes.push(h('line', { key: 's' + i, className: 'op-grid', x1: c, y1: c, x2: e[0], y2: e[1] })); }
    var shape = vals.map(function (v, i) { return pt(i, Math.max(0, Math.min(1, v))).map(function (x) { return x.toFixed(1); }).join(','); }).join(' ');
    var lab = labels.map(function (l, i) { var p = pt(i, 1.12); return h('text', { key: 'l' + i, x: p[0], y: p[1] + 3, textAnchor: 'middle' }, l); });
    return h('svg', { className: cx('op-chart', props.className), viewBox: '0 0 ' + S + ' ' + S, width: S, height: S, role: 'img', 'aria-label': props.title || 'Radar chart' },
      rings, spokes, h('polygon', { className: 'op-area', points: shape }), h('polygon', { className: 'op-stroke', points: shape }), lab);
  }

  /* ---------- Data ---------- */
  function StatTile(props) {
    var gauge = props.level != null ? h(BarGauge, { value: props.level, height: props.gaugeHeight || 64, label: props.label }) : props.aside || null;
    return h(Panel, { variant: props.variant || 'plain', className: cx('op-tile', props.className), mutedCorners: props.mutedCorners !== false },
      h('div', { className: 'op-tile-body' },
        props.icon ? h(Icon, { name: props.icon, className: 'op-tile-icon' }) : null,
        h('div', { className: 'op-label', style: { color: 'var(--ink)' } }, props.label),
        h('div', { className: 'op-tile-value' }, props.value, props.unit ? h('span', { className: 'op-tile-unit' }, props.unit) : null),
        props.delta ? h('div', { className: cx('op-tile-delta', 'op-tone-' + (props.deltaTone || 'neutral')) }, props.delta) : null),
      gauge);
  }

  function InfoList(props) {
    return h('dl', { className: cx('op-info', props.className) },
      (props.items || []).map(function (it, i) {
        if (it.section) return h('div', { key: i, className: 'op-info-section' }, it.section);
        return h('div', { key: i },
          h('dt', null, it.label + ':'),
          h('dd', { className: cx('op-tone-' + (it.tone || 'ok'), it.big && 'op-info-big') },
            it.tone === 'danger' || it.tone === 'warn' ? h(Status, { tone: it.tone }, it.value) : it.value));
      }));
  }

  function EventLog(props) {
    return h('ul', { className: cx('op-log', props.rail && 'op-log-rail', props.className), 'aria-live': props.live ? 'polite' : undefined },
      (props.items || []).map(function (it, i) {
        return h('li', { key: i },
          h('span', { className: 'op-log-mark', 'aria-hidden': 'true', style: it.tone ? { background: 'var(--' + it.tone + ')' } : undefined }),
          h('span', { className: 'op-log-text' }, it.text),
          it.time ? h('span', { className: 'op-log-time' }, it.time) : null);
      }));
  }

  function DataTable(props) {
    var cols = props.columns || [];
    return h('table', { className: cx('op-table', props.className) },
      h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { key: c.key, className: c.align === 'right' ? 'op-r' : undefined, style: c.width ? { width: c.width } : undefined }, c.label); }))),
      h('tbody', null, (props.rows || []).map(function (r, i) {
        var sel = props.selected != null && (props.selected === i || props.selected === r.id);
        return h('tr', { key: r.id != null ? r.id : i, className: sel ? 'op-sel' : undefined, onClick: props.onRowClick ? function () { props.onRowClick(r, i); } : undefined, style: props.onRowClick ? { cursor: 'pointer' } : undefined },
          cols.map(function (c) {
            var v = c.render ? c.render(r) : r[c.key];
            return h('td', { key: c.key, className: cx(c.align === 'right' && 'op-r', c.mono && 'op-m') }, v);
          }));
      })));
  }

  /* ---------- Forms ---------- */
  function CommandInput(props) {
    var st = React.useState('');
    var user = props.user || 'root', host = props.host || 'sudo_user', path = props.path || '~';
    return h('form', { className: cx('op-cmd', 'op-root', props.className), onSubmit: function (e) { e.preventDefault(); if (props.onSubmit) props.onSubmit(st[0]); st[1](''); } },
      props.showPrompt === false ? null : h('span', { className: 'op-cmd-prompt' }, user + '@' + host + ':', h('span', null, path), '$'),
      h('input', { value: st[0], onChange: function (e) { st[1](e.target.value); }, placeholder: props.placeholder || 'Enter command…', 'aria-label': props.label || 'Command', autoComplete: 'off', spellCheck: false }));
  }

  function TextField(props) {
    var input = props.multiline
      ? h('textarea', Object.assign(rest(props, ['label', 'hint', 'error', 'multiline', 'className']), { rows: props.rows || 3 }))
      : h('input', rest(props, ['label', 'hint', 'error', 'multiline', 'className']));
    return h('label', { className: cx('op-field', props.error && 'op-field-error', props.className) },
      props.label ? h('span', { className: 'op-label' }, props.label) : null, input,
      props.error || props.hint ? h('span', { className: 'op-field-hint' }, props.error ? '✕ ' + props.error : props.hint) : null);
  }

  function Toggle(props) {
    var st = React.useState(!!props.defaultChecked);
    var on = props.checked !== undefined ? props.checked : st[0];
    return h('button', { type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false', className: cx('op-toggle', props.className), disabled: props.disabled,
      onClick: function () { if (props.checked === undefined) st[1](!on); if (props.onChange) props.onChange(!on); } },
      h('span', { className: 'op-toggle-track' }, h('span', { className: 'op-toggle-knob' })),
      h('span', { className: 'op-toggle-state' }, on ? 'ON' : 'OFF'),
      props.label ? h('span', null, props.label) : null);
  }

  /* ---------- Feedback ---------- */
  function ProgressBar(props) {
    var cells = props.cells || 20, v = Math.max(0, Math.min(1, props.value || 0)), on = Math.round(v * cells), list = [];
    for (var i = 0; i < cells; i++) list.push(h('i', { key: i, className: i < on ? 'on' : undefined }));
    return h('div', { className: cx('op-progress', props.tone && 'op-progress-' + props.tone, props.className), role: 'progressbar', 'aria-valuenow': Math.round(v * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': props.label },
      props.label ? h('div', { className: 'op-progress-head' }, h('span', { className: 'op-label' }, props.label), h('span', { className: 'op-mono' }, props.valueText || Math.round(v * 100) + '%')) : null,
      h('div', { className: 'op-progress-cells' }, list));
  }

  function Alert(props) {
    var tone = props.tone || 'warn';
    return h('div', { role: tone === 'danger' ? 'alert' : 'status', className: cx('op-alert', 'op-tone-' + tone, props.className) },
      h('span', { className: 'op-alert-icon' }, h(Icon, { name: tone === 'ok' ? 'shield' : 'alert' })),
      h('div', { className: 'op-alert-title' }, props.title),
      props.children ? h('div', { className: 'op-alert-body' }, props.children) : null);
  }

  function ChatMessage(props) {
    var me = props.from === 'me';
    return h('div', { className: cx('op-msg', me && 'op-msg-me', props.className) },
      h('div', { className: 'op-msg-head' }, props.author || (me ? 'You' : 'Operator'), props.time ? h('span', null, props.time) : null),
      h('div', { className: 'op-msg-body' }, props.children));
  }

  function LogoSlot(props) {
    var w = props.width || 120, ht = props.height || 40;
    return h('span', { className: cx('op-logo', props.src && 'op-logo-filled', props.className), style: { width: w, height: ht } },
      props.src ? h('img', { src: props.src, alt: props.alt || '' }) : (props.label || 'Your logo'));
  }

  /* ---------- Mobile ---------- */
  function AppBar(props) {
    var lead = props.onBack ? h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Back', onClick: props.onBack }, h(Icon, { name: 'back' }))
      : props.onMenu ? h('button', { type: 'button', className: 'op-appbar-btn', 'aria-label': 'Menu', onClick: props.onMenu }, h(Icon, { name: 'menu' })) : null;
    return h('header', { className: cx('op-appbar', 'op-root', props.className) }, lead,
      props.logo ? props.logo : null,
      props.title ? h('div', { className: 'op-appbar-title' }, props.title, props.subtitle ? h('small', null, props.subtitle) : null) : h('div', { style: { flex: 1 } }),
      props.end || null);
  }

  function BottomNav(props) {
    var st = React.useState(props.defaultValue || (props.items[0] && props.items[0].id));
    var value = props.value !== undefined ? props.value : st[0];
    return h('nav', { className: cx('op-bottomnav', 'op-root', props.className), 'aria-label': props.label || 'Main' },
      props.items.map(function (it) {
        return h('button', { key: it.id, type: 'button', 'aria-current': value === it.id ? 'page' : undefined,
          onClick: function () { if (props.value === undefined) st[1](it.id); if (props.onChange) props.onChange(it.id); } },
          h(Icon, { name: it.icon || 'grid' }), h('span', null, it.label),
          it.badge ? h('span', { className: 'op-bn-badge' }, it.badge) : null);
      }));
  }

  function ListItem(props) {
    return h(props.onClick ? 'button' : 'div', { type: props.onClick ? 'button' : undefined, onClick: props.onClick,
      className: cx('op-li', props.selected && 'op-li-sel', props.className) },
      props.icon ? h('span', { className: 'op-li-icon' }, h(Icon, { name: props.icon })) : null,
      h('span', { className: 'op-li-main' },
        h('span', { className: 'op-li-title' }, props.title),
        props.subtitle ? h('span', { className: 'op-li-sub' }, props.subtitle) : null),
      props.meta || props.end ? h('span', { className: 'op-li-end' }, props.meta ? h('span', { className: 'op-li-meta' }, props.meta) : null, props.end || null) : null);
  }

  var C = window;
  C.Ops = C.Ops || {};
  Object.assign(C.Ops, { Panel: Panel, TitleBar: TitleBar, Tabs: Tabs, NavButton: NavButton, Button: Button, Icon: Icon, Status: Status, Badge: Badge,
    StatTile: StatTile, BarGauge: BarGauge, AreaChart: AreaChart, RadarChart: RadarChart, InfoList: InfoList, EventLog: EventLog, DataTable: DataTable,
    CommandInput: CommandInput, TextField: TextField, Toggle: Toggle, ProgressBar: ProgressBar, Alert: Alert, ChatMessage: ChatMessage, LogoSlot: LogoSlot,
    AppBar: AppBar, BottomNav: BottomNav, ListItem: ListItem });
})();
