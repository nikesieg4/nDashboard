/* nDashboard — kleine Formular- und Dialogbausteine, die das Terminal-Ops-Design nicht mitbringt:
 * Auswahlliste, Häkchen, Chips, Fenster; dazu Links nach außen öffnen. */
(function () {
  var O = window.Ops, h = React.createElement;

  function Select(p) {
    return h('label', { className: 'op-field' + (p.className ? ' ' + p.className : '') }, p.label ? h('span', { className: 'op-label' }, p.label) : null,
      h('select', { value: p.value, disabled: p.disabled, onChange: function (e) { p.onChange(e.target.value); }, 'aria-label': p.label }, p.children),
      p.hint ? h('span', { className: 'op-field-hint' }, p.hint) : null);
  }
  /** [[wert, text], …] → <option>s */
  function options(list) { return list.map(function (x) { return h('option', { key: x[0], value: x[0], disabled: x[2] }, x[1]); }); }

  function Check(p) {
    return h('label', { className: 'check' }, h('input', { type: 'checkbox', checked: p.checked, onChange: function (e) { p.onChange(e.target.checked); } }), p.label);
  }

  /** Auswahl-Chips: items [[id, text]], value, onChange; mit multi=true ist value eine Liste. */
  function Chips(p) {
    return h('div', { className: 'chips', role: p.multi ? 'group' : 'radiogroup', 'aria-label': p.label },
      p.items.map(function (it) {
        var on = p.multi ? p.value.indexOf(it[0]) >= 0 : p.value === it[0];
        return h('button', { key: it[0], type: 'button', className: 'chip', 'aria-pressed': on ? 'true' : 'false', disabled: p.disabled, onClick: function () { p.onChange(it[0]); } },
          (p.multi && on ? '✓ ' : '') + it[1]);
      }));
  }

  function Modal(p) {
    React.useEffect(function () {
      function onKey(e) { if (e.key === 'Escape') p.onClose(); }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, []);
    return h('div', { className: 'modal-scrim', onClick: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h(O.Panel, { variant: 'framed', title: p.title, className: 'modal' + (p.wide ? ' modal-wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': p.title },
        p.children, h('div', { className: 'op-row', style: { justifyContent: 'flex-end', marginTop: 16 } }, h(O.Button, { variant: 'ghost', onClick: p.onClose }, 'Schließen'))));
  }

  /** Link im Browser des Systems öffnen (nicht in der App navigieren). Android: über die App-Brücke,
   *  Windows/macOS: Electron leitet window.open nach außen, Linux: ndashboard.py ebenso. */
  function openExternal(url) {
    if (!/^https?:\/\//.test(url)) return;
    if (window.NDNative && window.NDNative.openUrl) window.NDNative.openUrl(url);
    else window.open(url, '_blank', 'noopener');
  }

  window.NDUi = { Select: Select, options: options, Check: Check, Chips: Chips, Modal: Modal, openExternal: openExternal };
})();
