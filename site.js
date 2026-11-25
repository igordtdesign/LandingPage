/* site.js: shared behaviour for every page.
   1. Theme switch: light by default; picking dark is saved, picking light
      again clears it. The initial theme is set inline in each page's <head>
      (no flash).
   2. Button hover: the fill grows from where the pointer enters and drains
      toward where it leaves; the button leans a few px toward the cursor.
   3. Scroll reveal for the case pages' .fade-up blocks.
   4. Privacy notice for Microsoft Clarity.
   5. Alt texts and labels follow the language.
*/
(function () {
  'use strict';
  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Theme switch
  (function () {
    var sw = document.getElementById('themeSwitch');
    if (!sw) return;
    var DEFAULT = 'light';
    var bar = document.querySelector('meta[name="theme-color"]'); // browser toolbar tint on phones
    function sync() {
      var t = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      sw.setAttribute('data-active', t);
      sw.setAttribute('aria-checked', t === 'light' ? 'true' : 'false');
      if (bar) bar.setAttribute('content', t === 'light' ? '#f4f2ed' : '#0a0d14');
    }
    function apply(t) {
      root.classList.add('theme-anim');
      root.setAttribute('data-theme', t);
      sync();
      setTimeout(function () { root.classList.remove('theme-anim'); }, 450);
    }
    sync();
    sw.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      apply(next);
      try {
        if (next === DEFAULT) localStorage.removeItem('site-theme');
        else localStorage.setItem('site-theme', next);
      } catch (e) {}
    });
  })();

  // 2. Button hover (mouse and trackpad only)
  (function () {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.btn, .cta-btn').forEach(function (b) {
      function origin(e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        b.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      }
      b.addEventListener('pointerenter', origin);
      b.addEventListener('pointerleave', function (e) {
        origin(e);
        b.style.setProperty('--tx', '0px');
        b.style.setProperty('--ty', '0px');
      });
      if (still) return;
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.setProperty('--tx', (dx * 8).toFixed(1) + 'px');
        b.style.setProperty('--ty', (dy * 6).toFixed(1) + 'px');
      });
    });
  })();

  // 2b. Header: hides while scrolling down, comes back on any scroll up, near
  //     the top, or when it gets keyboard focus
  (function () {
    var nav = document.querySelector('nav');
    if (!nav) return;
    var last = window.scrollY, ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY, d = y - last;
      if (y < 120) { nav.classList.remove('nav-hidden'); last = y; return; }
      if (Math.abs(d) < 8) return; // ignore jitter; small moves add up
      if (d > 0 && !nav.contains(document.activeElement)) nav.classList.add('nav-hidden');
      else if (d < 0) nav.classList.remove('nav-hidden');
      last = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    nav.addEventListener('focusin', function () { nav.classList.remove('nav-hidden'); });
  })();

  // 3. Scroll reveal for the case pages, in reading order.
  //    Every block of every section takes part (not only the ones marked
  //    .fade-up): when only some blocks animated, the text under a heading
  //    was already sitting there while the heading above it faded in, which
  //    read backwards. Blocks entering together cascade top to bottom.
  //    The home page has its own reveal ([data-reveal]) and is skipped.
  (function () {
    if (document.querySelector('[data-reveal]')) return;
    var blocks = [];
    document.querySelectorAll('.page section').forEach(function (sec) {
      var box = sec.querySelector(':scope > .container') || sec;
      Array.prototype.forEach.call(box.children, function (el) {
        if (/^(STYLE|SCRIPT)$/.test(el.tagName)) return;
        if (!el.getClientRects().length) return; // display:none (e.g. the other language)
        blocks.push(el);
      });
    });
    if (!blocks.length) return;
    var order = new Map(blocks.map(function (el, i) { return [el, i]; }));
    function reveal(list) {
      list.sort(function (a, b) { return order.get(a) - order.get(b); });
      list.forEach(function (el, i) {
        el.style.setProperty('--rv-delay', Math.min(i, 5) * 70 + 'ms');
        el.classList.add('is-in');
      });
    }
    blocks.forEach(function (el) { el.classList.add('rv'); });
    if (still || !('IntersectionObserver' in window)) { reveal(blocks); return; }
    var io = new IntersectionObserver(function (entries) {
      var list = [];
      entries.forEach(function (e) {
        if (e.isIntersecting) { list.push(e.target); io.unobserve(e.target); }
      });
      if (list.length) reveal(list);
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    // what's already on screen shows at once (the observer can be throttled in
    // hidden tabs and embedded previews); the rest waits for its turn
    var vh = window.innerHeight, now = [];
    blocks.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) now.push(el); else io.observe(el);
    });
    // if the first screen was already painted, don't make it blink out and back
    var painted = window.performance && performance.getEntriesByType &&
      performance.getEntriesByType('paint').some(function (p) { return p.name === 'first-contentful-paint'; });
    if (painted) now.forEach(function (el) { el.classList.add('rv-static'); });
    reveal(now);
  })();

  // 4. Privacy notice for Microsoft Clarity (pairs with the snippet in each <head>).
  //    No choice yet: Clarity runs without cookies. Accept: cookies on.
  //    Decline: cookies off now, and Clarity stops loading on the next pages.
  //    Ad storage is always denied. The choice is kept for 9 months (Clarity's
  //    own consent window), then the notice asks again. "Privacy settings" in
  //    the footer reopens it at any time.
  (function () {
    var KEY = 'site-consent', MAX_AGE = 270 * 864e5;
    function read() {
      try { var r = (localStorage.getItem(KEY) || '').split('|'); return (Date.now() - (+r[1] || 0) < MAX_AGE) ? r[0] : null; }
      catch (e) { return null; }
    }
    function save(v) { try { localStorage.setItem(KEY, v + '|' + Date.now()); } catch (e) {} }
    function signal(v) {
      if (typeof window.clarity === 'function') window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: v });
    }

    var css = document.createElement('style');
    css.textContent =
      // bottom-right on desktop, clear of the hero's main button and the cases' back pill
      '.consent{position:fixed;z-index:400;right:16px;bottom:16px;width:min(420px,calc(100% - 32px));' +
      'background:var(--surface-1);color:var(--text-2);border:1px solid var(--border-hover);border-radius:18px;' +
      'padding:18px 18px 16px;box-shadow:0 24px 60px -20px rgba(0,0,0,.55);font-family:var(--sans);font-size:14px;line-height:1.55;' +
      'transform:translateY(16px);opacity:0;transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .35s ease}' +
      '.consent.is-on{transform:none;opacity:1}.consent[hidden]{display:none}' +
      '.consent p{margin:0 0 14px}.consent a{color:var(--blue-bright);text-underline-offset:3px}' +
      '.consent-row{display:flex;gap:10px}' +
      '.consent-row button{flex:1;min-height:44px;border-radius:99px;cursor:pointer;font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:-.02em;' +
      'border:1px solid var(--border-hover);background:transparent;color:var(--text-1);transition:background-color .2s,border-color .2s,color .2s}' +
      '.consent-row button:hover{border-color:var(--text-1)}' +
      '.consent-row .consent-yes{background:var(--btn-fill,var(--s-btn-fill));color:var(--btn-ink,var(--s-btn-ink));border-color:var(--btn-fill,var(--s-btn-fill))}' +
      '.consent-row .consent-yes:hover{background:var(--blue-bright);border-color:var(--blue-bright);color:var(--on-accent,var(--s-on-accent))}' +
      '.footer-links .consent-open{display:flex;align-items:center;padding:6px 12px;border:0;border-radius:99px;background:none;cursor:pointer;' +
      'font-family:var(--mono);font-size:12px;color:var(--text-3);transition:color .2s,background .2s}' +
      '.footer-links .consent-open:hover{color:var(--text-1);background:var(--surface-2)}' +
      '@media (max-width:560px){.consent{left:12px;right:12px;bottom:12px;width:auto}}' +
      '@media (prefers-reduced-motion:reduce){.consent{transition:none}}';
    document.head.appendChild(css);

    var box = null;
    function build() {
      box = document.createElement('section');
      box.className = 'consent';
      box.setAttribute('aria-label', 'Privacy / Privacidade');
      box.hidden = true;
      box.innerHTML =
        '<p><span lang="en">This site uses Microsoft Clarity so I can see how people use it: heatmaps and session recordings, never ads. Can it use cookies for that? ' +
        '<a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener">Microsoft\'s privacy statement</a></span>' +
        '<span lang="pt">Este site usa o Microsoft Clarity pra eu entender como as pessoas navegam: mapas de calor e gravações de sessão, nunca anúncios. Pode usar cookies pra isso? ' +
        '<a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener">Política de privacidade da Microsoft</a></span></p>' +
        '<div class="consent-row">' +
        '<button type="button" class="consent-no"><span lang="en">Decline</span><span lang="pt">Recusar</span></button>' +
        '<button type="button" class="consent-yes"><span lang="en">Accept</span><span lang="pt">Aceitar</span></button>' +
        '</div>';
      document.body.appendChild(box);
      box.querySelector('.consent-yes').addEventListener('click', function () { save('granted'); signal('granted'); hide(); });
      box.querySelector('.consent-no').addEventListener('click', function () { save('denied'); signal('denied'); hide(); });
    }
    function show() {
      if (!box) build();
      box.hidden = false;
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { box.classList.add('is-on'); }); });
    }
    function hide() {
      box.classList.remove('is-on');
      setTimeout(function () { box.hidden = true; }, 450);
    }

    var foot = document.querySelector('.footer-links');
    if (foot) {
      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'consent-open';
      open.innerHTML = '<span lang="en">Privacy settings</span><span lang="pt">Privacidade</span>';
      open.addEventListener('click', function () { show(); box.querySelector('.consent-no').focus(); });
      foot.appendChild(open);
    }
    if (!read()) setTimeout(show, 900);
  })();

  // 5. Image descriptions and screen-reader labels follow the language.
  //    The markup holds the Portuguese text (the main version, the one search
  //    engines read); the English sits in data-alt-en / data-aria-en. The first
  //    pass files the Portuguese away in data-alt-pt / data-aria-pt.
  (function () {
    var pairs = [['alt', 'data-alt-'], ['aria-label', 'data-aria-']];
    function apply() {
      var lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'pt';
      pairs.forEach(function (p) {
        document.querySelectorAll('[' + p[1] + 'en]').forEach(function (el) {
          if (!el.hasAttribute(p[1] + 'pt')) el.setAttribute(p[1] + 'pt', el.getAttribute(p[0]) || '');
          var v = el.getAttribute(p[1] + lang);
          if (v !== null && el.getAttribute(p[0]) !== v) el.setAttribute(p[0], v);
        });
      });
    }
    apply();
    if ('MutationObserver' in window) {
      new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ['data-lang'] });
    }
  })();
})();
