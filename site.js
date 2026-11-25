/* site.js: shared behaviour for every page.
   1. Theme switch: follows the OS (prefers-color-scheme) until the visitor
      picks otherwise; picking the same theme as the OS clears the override.
      The initial theme is set inline in each page's <head> (no flash).
   2. Button hover: the fill grows from where the pointer enters and drains
      toward where it leaves; the button leans a few px toward the cursor.
   3. Scroll reveal for the case pages' .fade-up blocks.
*/
(function () {
  'use strict';
  var root = document.documentElement;
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Theme switch
  (function () {
    var sw = document.getElementById('themeSwitch');
    if (!sw) return;
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
    function system() { return mq && mq.matches ? 'light' : 'dark'; }
    function saved() { try { return localStorage.getItem('site-theme'); } catch (e) { return null; } }
    function sync() {
      var t = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      sw.setAttribute('data-active', t);
      sw.setAttribute('aria-checked', t === 'light' ? 'true' : 'false');
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
        if (next === system()) localStorage.removeItem('site-theme');
        else localStorage.setItem('site-theme', next);
      } catch (e) {}
    });
    if (mq) {
      var onChange = function () { if (!saved()) apply(system()); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
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
})();
