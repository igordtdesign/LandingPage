/* Doodles: reveal hand-drawn elements as they enter the viewport */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('.doodle, .scrib-u'));
  if (!els.length) return;

  function inView(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    return r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0;
  }

  /* Reveal anything already on screen synchronously — IntersectionObserver
     can be throttled (hidden tabs, embedded previews) and never fire */
  var pending = [];
  els.forEach(function (el) {
    if (inView(el)) { el.classList.add('in'); } else { pending.push(el); }
  });
  if (!pending.length) return;

  if (!('IntersectionObserver' in window)) {
    pending.forEach(function (el) { el.classList.add('in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -30px 0px' });

  pending.forEach(function (el) { io.observe(el); });
})();
