/* nDashboard — Seite „News“: Nachrichten der tagesschau (öffentliche API, www.tagesschau.de/api2u).
 * Liste nach Ressort, Artikel werden in der App gelesen. Die letzte Liste bleibt für unterwegs ohne Netz
 * gespeichert. Inhalte der API kommen als HTML – angezeigt werden nur einfache Auszeichnungen. */
(function () {
  var O = window.Ops, h = React.createElement, U = window.NDUi;
  var API = 'https://www.tagesschau.de/api2u/', CACHE = 'nd.news.';
  var RESSORTS = [{ id: '', label: 'Alle' }, { id: 'inland', label: 'Inland' }, { id: 'ausland', label: 'Ausland' },
    { id: 'wirtschaft', label: 'Wirtschaft' }, { id: 'wissen', label: 'Wissen' }];

  /** Nachrichtenliste eines Ressorts ('' = alle). */
  function fetchList(ressort) {
    return fetch(API + 'news' + (ressort ? '?ressort=' + ressort : ''), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('tagesschau antwortet mit ' + r.status + '.'); return r.json(); })
      .then(function (d) {
        var items = (d.news || []).filter(function (x) { return x.type === 'story' && x.title; });
        try { localStorage.setItem(CACHE + (ressort || 'alle'), JSON.stringify({ at: Date.now(), items: items.slice(0, 60) })); } catch (e) { /* voll */ }
        return items;
      });
  }
  function cached(ressort) { try { return JSON.parse(localStorage.getItem(CACHE + (ressort || 'alle'))); } catch (e) { return null; } }
  /** Nur Artikel-Adressen der tagesschau-API laden. */
  function validDetails(url) { return typeof url === 'string' && url.indexOf(API) === 0; }

  function image(item, size) {
    var v = item && item.teaserImage && item.teaserImage.imageVariants;
    return v ? v['16x9-' + (size || 640)] || v['16x9-512'] || v['16x9-960'] || null : null;
  }
  function time(iso) {
    var d = new Date(iso), now = new Date();
    var t = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return t + ' Uhr';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ', ' + t + ' Uhr';
  }

  /* ---------- HTML der API sicher anzeigen ---------- */
  var ALLOWED = { STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', BR: 'br', H2: 'h3', H3: 'h3', P: 'p', UL: 'ul', OL: 'ol', LI: 'li', A: 'a' };
  function richText(html) {
    var doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    function walk(node, key) {
      if (node.nodeType === 3) return node.nodeValue;
      if (node.nodeType !== 1) return null;
      var kids = Array.prototype.map.call(node.childNodes, function (c, i) { return walk(c, i); });
      var tag = ALLOWED[node.tagName];
      if (!tag) return h(React.Fragment, { key: key }, kids);
      if (tag === 'br') return h('br', { key: key });
      if (tag === 'a') {
        var href = node.getAttribute('href') || '';
        return /^https?:\/\//.test(href)
          ? h('a', { key: key, href: href, onClick: function (e) { e.preventDefault(); U.openExternal(href); } }, kids)
          : h(React.Fragment, { key: key }, kids);
      }
      return h(tag, { key: key }, kids);
    }
    return Array.prototype.map.call(doc.body.firstChild.childNodes, function (c, i) { return walk(c, i); });
  }

  /* ---------- Liste ---------- */
  function News() {
    var tab = React.useState(function () { try { return localStorage.getItem('nd.news.tab') || ''; } catch (e) { return ''; } });
    var c = cached(tab[0]), list = React.useState(c ? c.items : null), st = React.useState({ loading: true, error: null, at: c ? c.at : null });

    function load(ressort) {
      st[1](function (s) { return Object.assign({}, s, { loading: true, error: null }); });
      fetchList(ressort).then(function (items) { list[1](items); st[1]({ loading: false, error: null, at: Date.now() }); },
        function (e) { st[1](function (s) { return Object.assign({}, s, { loading: false, error: e.message.indexOf('fetch') >= 0 ? 'Keine Verbindung zur tagesschau.' : e.message }); }); });
    }
    React.useEffect(function () { load(tab[0]); }, [tab[0]]);
    function pick(id) {
      try { localStorage.setItem('nd.news.tab', id); } catch (e) { /* egal */ }
      var cc = cached(id); list[1](cc ? cc.items : null); tab[1](id);
    }

    var items = list[0] || [];
    return [
      h(O.Tabs, { key: 't', items: RESSORTS, value: tab[0], onChange: pick }),
      h('div', { key: 'bar', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Status, { tone: st[0].error ? 'warn' : st[0].loading ? 'info' : 'ok' },
          st[0].loading ? 'Lade Nachrichten …' : st[0].error ? st[0].error + (st[0].at ? ' Stand ' + time(new Date(st[0].at).toISOString()) : '') : 'Stand ' + time(new Date(st[0].at).toISOString())),
        h(O.Button, { variant: 'ghost', size: 'sm', icon: 'signal', disabled: st[0].loading, onClick: function () { load(tab[0]); } }, 'Aktualisieren')),
      list[0] && !items.length ? h('div', { key: 'e', className: 'hint' }, 'Keine Nachrichten.') : null,
      items.map(function (n, i) {
        var img = i < 20 ? image(n) : null, lead = i === 0 || n.breakingNews;
        return h(O.Panel, { key: n.sophoraId || i, variant: lead ? 'framed' : 'outlined', mutedCorners: !lead, className: 'news-card' },
          h('button', { type: 'button', className: 'news-open', disabled: !validDetails(n.details),
            onClick: function () { location.hash = '#/article?u=' + encodeURIComponent(n.details); } },
            img ? h('img', { className: 'news-img', src: img, alt: (n.teaserImage && n.teaserImage.alttext) || '', loading: 'lazy' }) : null,
            h('div', { className: 'op-row', style: { justifyContent: 'space-between', gap: 8 } },
              n.breakingNews ? h(O.Badge, { solid: true }, 'Eilmeldung') : h('span', { className: 'op-label' }, n.topline || n.ressort || 'tagesschau'),
              h('span', { className: 'op-mono', style: { color: 'var(--ink-faint)', fontSize: 11 } }, time(n.date))),
            h('h3', { className: 'news-title' }, n.title),
            n.firstSentence ? h('p', { className: 'news-lead' }, n.firstSentence) : null));
      }),
      h('div', { key: 'src', className: 'hint' }, 'Quelle: tagesschau.de')
    ];
  }

  /* ---------- Artikel ---------- */
  function Article(props) {
    var a = React.useState(null), err = React.useState(null);
    React.useEffect(function () {
      if (!validDetails(props.url)) { err[1]('Ungültiger Artikel.'); return; }
      fetch(props.url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('tagesschau antwortet mit ' + r.status + '.'); return r.json(); })
        .then(a[1], function (e) { err[1](e.message.indexOf('fetch') >= 0 ? 'Keine Verbindung zur tagesschau.' : e.message); });
    }, [props.url]);
    if (err[0]) return h(O.Alert, { tone: 'warn', title: 'Artikel nicht geladen' }, err[0]);
    if (!a[0]) return h('div', { className: 'hint' }, 'Lade Artikel …');
    var d = a[0], img = image(d, 960);
    var web = d.detailsweb || d.shareURL;
    return [
      h(O.Panel, { key: 'a', variant: 'framed', className: 'article' },
        h('div', { className: 'op-row', style: { justifyContent: 'space-between', gap: 8 } },
          d.breakingNews ? h(O.Badge, { solid: true }, 'Eilmeldung') : h('span', { className: 'op-label' }, d.topline || d.ressort || 'tagesschau'),
          h('span', { className: 'op-mono', style: { color: 'var(--ink-faint)', fontSize: 11 } }, time(d.date))),
        h('h2', { className: 'article-title' }, d.title),
        img ? h('figure', { className: 'article-fig' }, h('img', { src: img, alt: (d.teaserImage && d.teaserImage.alttext) || '' }),
          d.teaserImage && d.teaserImage.copyright ? h('figcaption', null, 'Bild: ' + d.teaserImage.copyright) : null) : null,
        (d.content || []).map(function (c, i) {
          if (c.type === 'text') return h('p', { key: i }, richText(c.value));
          if (c.type === 'headline') return h('h3', { key: i }, richText(c.value));
          if (c.type === 'quotation' && c.quotation) return h('blockquote', { key: i }, richText(c.quotation.text));
          if (c.type === 'list' && c.list && c.list.items) return h('ul', { key: i }, c.list.items.map(function (li, j) { return h('li', { key: j }, richText(li)); }));
          return null;
        })),
      h('div', { key: 'f', className: 'op-row', style: { justifyContent: 'space-between' } },
        h(O.Button, { variant: 'ghost', icon: 'back', onClick: function () { if (history.length > 1) history.back(); else location.hash = '#/news'; } }, 'Zur Übersicht'),
        web ? h(O.Button, { variant: 'outline', icon: 'news', onClick: function () { U.openExternal(web); } }, 'Auf tagesschau.de') : null),
      h('div', { key: 'src', className: 'hint' }, 'Quelle: tagesschau.de')
    ];
  }

  window.NDNews = { News: News, Article: Article, fetchList: fetchList };
})();
