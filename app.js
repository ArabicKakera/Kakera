(function () {
  'use strict';

  const STATUS = { done: 'مكتمل', wip: 'قيد العمل' };
  const ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 12h4M8 10v4M15 11h.01M18 13h.01M17.3 5H6.7a4 4 0 0 0-3.9 3.1l-1.5 7A3 3 0 0 0 4.2 19a3 3 0 0 0 2.3-1.1L8 16h8l1.5 1.9a3 3 0 0 0 2.3 1.1 3 3 0 0 0 2.9-3.9l-1.5-7A4 4 0 0 0 17.3 5Z"/></svg>';

  const INFO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';

  const $ = (sel, root) => (root || document).querySelector(sel);

  function el(tag, attrs) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    for (let i = 2; i < arguments.length; i++) {
      const kid = arguments[i];
      if (kid == null || kid === false) continue;
      node.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return node;
  }

  function fmtDate(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('ar-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ---------- الهيدر والفوتر ---------- */
  function navLink(href, label, current) {
    const a = el('a', { href: href, text: label });
    if (current) a.setAttribute('aria-current', 'page');
    return a;
  }

  function buildHeader() {
    const header = $('#site-header');
    if (!header) return;
    const page = document.body.dataset.page;
    const q = page === 'games' ? new URLSearchParams(location.search).get('q') || '' : '';
    const form = el('form', { class: 'search', role: 'search', action: 'games.html', method: 'get' },
      el('label', { class: 'visually-hidden', for: 'site-search', text: 'بحث عن لعبة' }),
      el('input', { id: 'site-search', type: 'search', name: 'q', placeholder: 'ابحث عن لعبة…', value: q })
    );
    header.append(el('div', { class: 'container' },
      el('a', { class: 'brand', href: 'index.html', text: SITE.name }),
      el('nav', { class: 'nav', 'aria-label': 'التنقل الرئيسي' },
        navLink('index.html', 'الرئيسية', page === 'home'),
        navLink('games.html', 'الألعاب', page === 'games' || page === 'game'),
        navLink('team.html', 'نبذة عن الفريق', page === 'team')
      ),
      form
    ));
  }

  function buildFooter() {
    const footer = $('#site-footer');
    if (!footer) return;
    footer.append(el('div', { class: 'container' }, el('span', { text: SITE.name + ' · جميع الحقوق محفوظة' })));
  }

  /* ---------- البطاقات ---------- */
  function coverEl(g, cls) {
    const d = el('div', { class: cls });
    if (g.cover) {
      d.append(el('img', { src: g.cover, alt: g.title, loading: 'lazy' }));
    } else {
      d.style.background = 'linear-gradient(135deg,' + (g.color || '#1E2A4A') + ',#0F1115)';
      d.insertAdjacentHTML('beforeend', ICON);
    }
    return d;
  }

  function statusEl(g) {
    return el('span', { class: 'status ' + (g.status === 'wip' ? 'wip' : 'done'), text: STATUS[g.status] || STATUS.done });
  }

  function card(g) {
    return el('article', { class: 'card' },
      coverEl(g, 'cover'),
      el('div', { class: 'card-body' },
        el('div', { class: 'card-top' }, statusEl(g), el('span', { class: 'date', text: fmtDate(g.date) })),
        el('h3', { text: g.title }),
        el('p', { class: 'meta', text: [g.platform, g.version ? 'الإصدار ' + g.version : ''].filter(Boolean).join(' · ') }),
        el('a', { class: 'btn btn-primary btn-block', href: 'game.html?id=' + encodeURIComponent(g.id), text: 'التفاصيل' })
      )
    );
  }

  function renderCards(container, list) {
    container.replaceChildren();
    if (!list.length) {
      container.append(el('p', { class: 'empty', text: 'لا توجد ألعاب مطابقة.' }));
      return;
    }
    list.forEach((g) => container.append(card(g)));
  }

  function buildFilters(container, onChange) {
    const items = [['all', 'الكل'], ['done', 'مكتمل'], ['wip', 'قيد العمل']];
    const buttons = items.map(([value, label]) => {
      const b = el('button', { type: 'button', class: 'chip-btn', 'aria-pressed': value === 'all' ? 'true' : 'false', text: label });
      b.addEventListener('click', () => {
        buttons.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        onChange(value);
      });
      return b;
    });
    container.append(...buttons);
  }

  /* ---------- الصفحة الرئيسية ---------- */
  function initHome() {
    const grid = $('#grid');
    let status = 'all';
    const draw = () => renderCards(grid, GAMES.filter((g) => status === 'all' || g.status === status).slice(0, SITE.homeCount));
    buildFilters($('#filters'), (s) => { status = s; draw(); });
    draw();
  }

  /* ---------- صفحة الألعاب ---------- */
  function initGames() {
    const grid = $('#grid');
    const pager = $('#pagination');
    const q = (new URLSearchParams(location.search).get('q') || '').trim();
    const needle = q.toLowerCase();
    let status = 'all';
    let page = 1;

    $('#count').textContent = q ? 'نتائج البحث عن «' + q + '»' : GAMES.length + ' لعبة معرّبة';

    function draw() {
      const list = GAMES.filter((g) =>
        (status === 'all' || g.status === status) &&
        (!needle || (g.title + ' ' + (g.platform || '')).toLowerCase().includes(needle))
      );
      const pages = Math.max(1, Math.ceil(list.length / SITE.perPage));
      page = Math.min(page, pages);
      renderCards(grid, list.slice((page - 1) * SITE.perPage, page * SITE.perPage));
      drawPager(pages);
    }

    function go(n) {
      page = n;
      draw();
      window.scrollTo({ top: 0 });
    }

    function drawPager(pages) {
      pager.replaceChildren();
      if (pages <= 1) return;
      if (page > 1) {
        const prev = el('button', { type: 'button', class: 'page-btn', text: 'السابق' });
        prev.addEventListener('click', () => go(page - 1));
        pager.append(prev);
      }
      for (let n = 1; n <= pages; n++) {
        const b = el('button', { type: 'button', class: 'page-btn', text: String(n) });
        if (n === page) b.setAttribute('aria-current', 'page');
        b.addEventListener('click', () => go(n));
        pager.append(b);
      }
      if (page < pages) {
        const next = el('button', { type: 'button', class: 'page-btn', text: 'التالي' });
        next.addEventListener('click', () => go(page + 1));
        pager.append(next);
      }
    }

    buildFilters($('#filters'), (s) => { status = s; page = 1; draw(); });
    draw();
  }

  /* ---------- عناصر المقال (فقرة، عنوان، قائمة...) ---------- */
  function block(b) {
    if (typeof b === 'string') return el('p', { text: b });
    if (b.h) return el('h2', { text: b.h });
    if (b.h3) return el('h3', { text: b.h3 });
    if (b.note) return el('p', { class: 'note', text: b.note });
    if (b.small) return el('p', { class: 'small', text: b.small });
    if (b.list) return el('ul', {}, ...b.list.map((t) => el('li', { text: t })));
    if (b.ol) return el('ol', {}, ...b.ol.map((t) => el('li', { text: t })));
    if (b.box) {
      const title = el('h2', { class: 'callout-title' });
      title.insertAdjacentHTML('beforeend', INFO);
      title.append(b.box.title);
      return el('aside', { class: 'callout' }, title, ...b.box.blocks.map(block));
    }
    if (b.rows) {
      return el('div', { class: 'rows' }, ...b.rows.map((r) =>
        r.length < 2
          ? el('div', {}, el('span', { class: 'v', text: r[0] }))
          : el('div', {}, el('span', { class: 'k', text: r[0] }), el('span', { class: 'v', text: r[1] }))
      ));
    }
    return null;
  }

  /* ---------- صفحة المقال ---------- */
  function initGame() {
    const root = $('#game-root');
    const id = new URLSearchParams(location.search).get('id');
    const g = GAMES.find((x) => x.id === id);

    if (!g) {
      root.append(
        el('p', { class: 'empty', text: 'لم نجد هذا التعريب.' }),
        el('p', { class: 'empty' }, el('a', { href: 'games.html', text: 'العودة إلى الألعاب' }))
      );
      document.title = 'غير موجود · ' + SITE.name;
      return;
    }

    document.title = 'تعريب ' + g.title + ' · ' + SITE.name;

    const metaLine = [fmtDate(g.date), g.translator ? 'بواسطة ' + g.translator : ''].filter(Boolean).join(' · ');
    const main = el('article', { class: 'article-main' },
      coverEl(g, 'cover'),
      el('div', { class: 'article-head' },
        statusEl(g),
        el('h1', { text: 'تعريب ' + g.title }),
        el('p', { class: 'meta', text: metaLine })
      ),
      el('div', { class: 'prose' }, ...(g.description || []).map(block))
    );

    if (g.screenshots && g.screenshots.length) {
      main.append(
        el('h2', { text: 'لقطات من التعريب' }),
        el('div', { class: 'shots' }, ...g.screenshots.map((src) => el('img', { src: src, alt: 'لقطة من تعريب ' + g.title, loading: 'lazy' })))
      );
    }

    const download = g.download
      ? el('a', { class: 'btn btn-primary btn-lg', href: g.download, target: '_blank', rel: 'noopener', text: 'تحميل التعريب' })
      : el('a', { class: 'btn btn-primary btn-lg', href: '#', 'aria-disabled': 'true', text: 'تحميل التعريب' });

    const spec = (label, value) => el('div', {}, el('dt', { text: label }), el('dd', { text: value || '—' }));

    const side = el('aside', { class: 'article-side' },
      download,
      el('dl', { class: 'specs' },
        spec('المنصة', g.platform),
        spec('الإصدار', g.version),
        spec('حجم الملف', g.size),
        spec('آخر تحديث', fmtDate(g.updated || g.date))
      )
    );

    if (g.install && g.install.length) {
      side.append(
        el('hr'),
        el('h2', { text: 'طريقة التثبيت' }),
        el('ol', { class: 'steps' }, ...g.install.map((t) => el('li', { text: t })))
      );
    }

    root.append(
      el('nav', { class: 'crumbs', 'aria-label': 'مسار التصفح' },
        el('a', { href: 'index.html', text: 'الرئيسية' }),
        el('span', { 'aria-hidden': 'true', text: '/' }),
        el('a', { href: 'games.html', text: 'الألعاب' }),
        el('span', { 'aria-hidden': 'true', text: '/' }),
        el('span', { 'aria-current': 'page', text: g.title })
      ),
      el('div', { class: 'article-layout' }, main, side)
    );
  }

  /* ---------- التشغيل ---------- */
  buildHeader();
  buildFooter();
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  else if (page === 'games') initGames();
  else if (page === 'game') initGame();
})();
