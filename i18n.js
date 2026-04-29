/* i18n.js — language toggle + persistence
   Detection priority: localStorage > navigator.language > default 'en'
   The initial detection runs inline in each page's <head> to avoid flash.
   This file wires up the EN/PT toggle buttons and persists the choice.
*/
(function () {
  'use strict';

  var SUPPORTED = ['en', 'pt'];
  var STORAGE_KEY = 'site-lang';

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang === 'pt' ? 'pt-BR' : 'en');
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
    updateUI();
  }

  function updateUI() {
    var current = document.documentElement.getAttribute('data-lang') || 'en';
    var btns = document.querySelectorAll('[data-lang-btn]');
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var isActive = btn.getAttribute('data-lang-btn') === current;
      btn.setAttribute('aria-pressed', String(isActive));
    }
  }

  function bindButtons() {
    var btns = document.querySelectorAll('[data-lang-btn]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function (e) {
        e.preventDefault();
        setLang(this.getAttribute('data-lang-btn'));
      });
    }
    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }
})();
