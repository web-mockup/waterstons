/* Waterstons Option B, "Show Your Working". Vanilla JS, no library, no third party.
   Motion draws, measures or sets out. Text never animates on opacity and nothing
   leaves the tab order. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REVEAL = '.b-rev, .b-wipe, [data-set], .b-dims, .b-arcs';

  /* Split a statement into per word masks, so words rise on transform only. */
  function masks() {
    if (reduced) return;
    $$('[data-set]').forEach(function (el) {
      if (el.dataset.done) return;
      var html = el.innerHTML;
      // keep <em> spans intact by splitting on text nodes only
      var parts = html.split(/(<[^>]+>)/);
      var out = '', i = 0;
      parts.forEach(function (p) {
        if (p.charAt(0) === '<') { out += p; return; }
        p.split(/(\s+)/).forEach(function (w) {
          if (!w.trim()) { out += w; return; }
          out += '<span class="b-mask"><i style="transition-delay:' + (i * 40) + 'ms">' + w + '</i></span>';
          i++;
        });
      });
      el.innerHTML = out;
      el.dataset.done = '1';
    });
  }

  /* Give every construction arc its true path length so the draw is honest. */
  function arcs() {
    $$('.b-arcs path').forEach(function (p) {
      try { var l = Math.ceil(p.getTotalLength()); if (l) p.style.setProperty('--len', l); }
      catch (e) {}
    });
  }

  function reveals() {
    var items = $$(REVEAL);
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in', 'is-set'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        if (e.target.classList.contains('b-arcs')) e.target.classList.add('is-set');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-in', 'is-set', 'is-now'); return; }
      io.observe(el);
    });
    /* focus reveals its own container, so tabbing never lands mid animation */
    document.addEventListener('focusin', function (e) {
      var n = e.target;
      while (n && n !== document.body) {
        if (n.matches && n.matches(REVEAL) && !n.classList.contains('is-in')) {
          n.classList.add('is-in', 'is-set', 'is-now');
        }
        n = n.parentElement;
      }
    });
    /* nothing may stay invisible because an observer never fired */
    setTimeout(function () {
      $$(REVEAL).forEach(function (el) {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight * 2) {
          el.classList.add('is-in', 'is-set');
        }
      });
    }, 2500);
  }

  /* Dimensioned numbers count as their measure line draws. */
  function dims() {
    var ns = $$('.b-dim__n');
    if (!ns.length || reduced || !('IntersectionObserver' in window)) return;
    ns.forEach(function (el) {
      var node = null, i;
      for (i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3 && el.childNodes[i].nodeValue.trim()) { node = el.childNodes[i]; break; }
      }
      if (!node) return;
      var raw = node.nodeValue;
      if (raw.indexOf('/') > -1) return;
      var m = raw.match(/^(\D*)([\d,]+)(.*)$/);
      if (!m) return;
      var pre = m[1], target = parseInt(m[2].replace(/,/g, ''), 10), post = m[3];
      if (!isFinite(target) || !target) return;
      var grouped = m[2].indexOf(',') > -1;
      el.__go = function () {
        if (el.__done) return;
        el.__done = true;
        var t0 = null;
        (function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / 900, 1), e = 1 - Math.pow(1 - p, 4);
          var v = Math.round(target * e);
          node.nodeValue = pre + (grouped ? v.toLocaleString('en-GB') : v) + post;
          if (p < 1) requestAnimationFrame(step); else node.nodeValue = raw;
        })(performance.now());
      };
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.target.__go) { e.target.__go(); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    ns.forEach(function (el) { io.observe(el); });
  }

  function video() {
    $$('.b-video__b').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = b.closest('.b-video');
        var label = b.getAttribute('data-label') || 'film';
        w.innerHTML = '<div style="aspect-ratio:16/9;display:grid;place-items:center;' +
          'background:#0f1f34;color:#fff;text-align:center;padding:24px"><p tabindex="-1" ' +
          'style="margin:0;max-width:34ch;font-size:14px;line-height:1.6">This is where the ' + label +
          ' would load. In the real build the player is only requested once someone presses play, ' +
          'so it costs nothing until it is wanted.</p></div>';
        $('p', w).focus();
      });
    });
  }

  /* UK and AU. Text, the href behind it, the control label and the office block. */
  function region() {
    var btn = $('[data-region-toggle]');
    if (!btn) return;
    var root = document.documentElement;
    function apply(r) {
      root.setAttribute('data-region', r);
      var au = r === 'au';
      var lab = $('[data-region-label]', btn);
      if (lab) lab.textContent = au ? 'AU' : 'UK';
      btn.setAttribute('aria-label', au ? 'Region AU, switch to United Kingdom'
                                        : 'Region UK, switch to Australia');
      $$('[data-uk]').forEach(function (el) {
        el.textContent = au ? el.getAttribute('data-au') : el.getAttribute('data-uk');
        var h = au ? el.getAttribute('data-au-href') : el.getAttribute('data-uk-href');
        if (h) el.setAttribute('href', h);
      });
      $$('[data-region-only]').forEach(function (el) {
        el.hidden = el.getAttribute('data-region-only') !== r;
      });
      var live = $('#b-region-live');
      if (live) live.textContent = au ? 'Showing Australian offices and phone numbers.'
                                      : 'Showing UK offices and phone numbers.';
    }
    btn.addEventListener('click', function () {
      apply(root.getAttribute('data-region') === 'au' ? 'uk' : 'au');
    });
    apply(root.getAttribute('data-region') || 'uk');
  }

  /* Journey pill, only when arrived via ?journey=1 */
  function journey() {
    var pill = $('.b-journey');
    if (!pill) return;
    if (new URLSearchParams(location.search).get('journey') !== '1') return;
    pill.hidden = false;
    $$('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#)/.test(h)) return;
      a.setAttribute('href', h + (h.indexOf('?') > -1 ? '&' : '?') + 'journey=1');
    });
  }

  /* One overlay behaviour, shared by the search panel and the index sheet.
     Focus in on open, trapped while open, and back to the opener on close. */
  function overlay(panelSel, openSel, closeSel, focusSel) {
    var panel = $(panelSel);
    if (!panel) return null;
    var last = null;
    function flag(v) { $$(openSel).forEach(function (b) { b.setAttribute('aria-expanded', v); }); }
    function open() {
      last = document.activeElement;
      panel.hidden = false;
      document.body.style.overflow = 'hidden';
      flag('true');
      var f = focusSel && $(focusSel, panel);
      if (!f) f = $$('a[href],button:not([disabled]),input,select,textarea', panel)[0];
      if (f) { f.focus(); if (f.select) f.select(); }
    }
    function close() {
      panel.hidden = true;
      document.body.style.overflow = '';
      flag('false');
      if (last) last.focus();
    }
    $$(openSel).forEach(function (b) { b.addEventListener('click', open); });
    $$(closeSel, panel).forEach(function (b) { b.addEventListener('click', close); });
    panel.addEventListener('mousedown', function (e) { if (e.target === panel) close(); });
    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled]),input,select,textarea', panel);
      if (!f.length) return;
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
    return panel;
  }

  /* Search overlay. Static UI, real focus management. */
  function search() {
    var panel = overlay('#b-search', '[data-search-open]', '[data-search-close]', 'input[type="search"]');
    if (!panel) return;
    $$('.b-chip', panel).forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });
  }

  /* The index sheet carries the navigation below 900px, where the links are hidden. */
  function menu() {
    overlay('#b-menu', '[data-menu-open]', '[data-menu-close]', null);
  }

  /* Accordion. aria-expanded and the panel's hidden state move together, so
     what a screen reader is told and what is on screen never disagree. */
  function accordion() {
    $$('.b-acc__b').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (panel) panel.hidden = open;
      });
    });
  }

  function forms() {
    $$('form[data-mock]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var n = $('[data-mock-note]', f);
        if (n) { n.hidden = false; n.setAttribute('tabindex', '-1'); n.focus(); }
      });
    });
  }

  function init() { masks(); arcs(); reveals(); dims(); video(); region(); journey(); search(); menu(); accordion(); forms(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
