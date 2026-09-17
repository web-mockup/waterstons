/* Option B behaviour. Quiet by design: short fades, a pinned label, and
   nothing that draws itself. Motion sits between 0.2s and 0.6s, so there is no
   scroll-driven spectacle to fall back from. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveals. A short fade and a 14px rise, once. Anything inside a horizontal
     scroller is exempt: an observer intersects on both axes, so a card parked
     beyond the fold would never be in the viewport when a vertical scroll
     passes it and would stay invisible for good. */
  function reveals() {
    var SEL = '.t-in, .t-mask, .t-wipe, .t-rule, .t-arcs';
    var items = $$(SEL).filter(function (el) { return !el.closest('.t-reel'); });
    /* anything inside a horizontal scroller is exempt: an observer intersects
       on both axes, so a card beyond the fold would never be in the viewport when
       a vertical scroll passes it, and would stay hidden for good */
    $$('.t-reel .t-in, .t-reel .t-wipe, .t-reel .t-mask').forEach(function (el) { el.classList.add('is-on'); });
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-on'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-on');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-on'); return; }
      io.observe(el);
    });
    /* focus reveals its own container, so tabbing never lands on a faded element */
    document.addEventListener('focusin', function (e) {
      var n = e.target;
      while (n && n !== document.body) {
        if (n.classList && (n.classList.contains('t-in') || n.classList.contains('t-wipe') ||
            n.classList.contains('t-mask'))) n.classList.add('is-on');
        n = n.parentElement;
      }
    });
    /* nothing may stay faded because an observer never fired */
    /* nothing may stay hidden because an observer never fired */
    setTimeout(function () { $$(SEL).forEach(function (el) { el.classList.add('is-on'); }); }, 2500);
  }

  /* The header gains a rule once the page has moved, and carries the name of
     the section you are in, under the wordmark. */
  function head() {
    var h = $('[data-head]'), now = $('[data-now]');
    if (!h) return;
    var labs = $$('[data-lab]');
    function up() {
      if (scrollY > 8) h.setAttribute('data-stuck', ''); else h.removeAttribute('data-stuck');
      if (!now) return;
      var cur = '', mid = innerHeight * 0.34;
      labs.forEach(function (l) {
        var s = l.closest('section');
        if (!s) return;
        var r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) cur = l.getAttribute('data-lab');
      });
      /* emptied rather than faded: text left in the DOM at opacity 0 is
         invisible content, which is the thing painted.mjs exists to catch */
      if (cur && scrollY > 120) { now.textContent = cur; now.setAttribute('data-on', ''); }
      else { now.removeAttribute('data-on'); now.textContent = ''; }
    }
    var tick = false;
    addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { up(); tick = false; });
    }, { passive: true });
    up();
  }

  /* A left index that marks the section you are reading. Labels only. */
  function index() {
    $$('[data-index]').forEach(function (wrap) {
      var links = $$('a[href^="#"]', wrap);
      if (!links.length) return;
      var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
      function up() {
        var best = -1, mid = innerHeight * 0.4;
        targets.forEach(function (t, i) {
          if (!t) return;
          var r = t.getBoundingClientRect();
          if (r.top <= mid) best = i;
        });
        links.forEach(function (a, i) {
          if (i === best) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      }
      var tick = false;
      addEventListener('scroll', function () {
        if (tick) return; tick = true;
        requestAnimationFrame(function () { up(); tick = false; });
      }, { passive: true });
      up();
    });
  }

  /* One overlay behaviour, shared by search and the menu. Focus in on open,
     trapped while open, and back to the opener on close. */
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
    /* a link inside the menu closes it on the way out */
    $$('a[href^="#"]', panel).forEach(function (a) { a.addEventListener('click', close); });
    return panel;
  }

  /* UK and AU. The displayed number, the number behind it, the control's own
     label and the office block all change together. */
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
      var live = $('#t-region-live');
      if (live) live.textContent = au ? 'Showing Australian offices and phone numbers.'
                                      : 'Showing UK offices and phone numbers.';
    }
    btn.addEventListener('click', function () {
      apply(root.getAttribute('data-region') === 'au' ? 'uk' : 'au');
    });
    apply(root.getAttribute('data-region') || 'uk');
  }

  /* Accordion. aria-expanded and the panel's hidden state move together. */
  function accordion() {
    $$('.t-acc__b').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (panel) panel.hidden = open;
      });
    });
  }

  /* Video facade: nothing loads until it is asked for. */
  function video() {
    $$('[data-video]').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = b.closest('.t-video');
        if (!w) return;
        var label = b.getAttribute('data-video') || 'film';
        w.innerHTML = '<div style="aspect-ratio:16/9;display:grid;place-items:center;' +
          'background:#152943;color:#fff;text-align:center;padding:24px"><p tabindex="-1" ' +
          'style="margin:0;max-width:34ch;font-size:14px;line-height:1.6">This is where the ' + label +
          ' would load. In the real build the player is only requested once someone presses play, ' +
          'so it costs nothing until it is wanted.</p></div>';
        var p = $('p', w); if (p) p.focus();
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

  /* Journey pill, only when arrived via ?journey=1 */
  function journey() {
    var pill = $('.t-journey');
    if (!pill) return;
    if (new URLSearchParams(location.search).get('journey') !== '1') return;
    pill.hidden = false;
    $$('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#)/.test(h)) return;
      a.setAttribute('href', h + (h.indexOf('?') > -1 ? '&' : '?') + 'journey=1');
    });
  }

  /* Split display type into per word masks so the words rise out of an
     overflow box. Transform only: the type is at full contrast for every frame
     it is visible, which a fade cannot promise. */
  function masks() {
    if (reduced) return;
    /* the hero headline alone: at nine headings a per word rise stops being a
       moment and becomes a tic, which is how a distinctive page reads as a template */
    $$('.t-hero .t-d1').forEach(function (el) {
      if (el.dataset.split) return;
      var parts = el.innerHTML.split(/(<[^>]+>)/);
      var out = '', i = 0;
      parts.forEach(function (chunk) {
        if (chunk.charAt(0) === '<') { out += chunk; return; }
        chunk.split(/(\s+)/).forEach(function (w) {
          if (!w.trim()) { out += w; return; }
          out += '<span class="t-mask"><i style="transition-delay:' + (i * 35) + 'ms">' + w + '</i></span>';
          i++;
        });
      });
      el.innerHTML = out;
      el.dataset.split = '1';
    });
  }

  /* M1. Three arcs in the margin, assembled from the page's own sections.

     Each arc spans a run of sections and advances one step per section,
     completing on the last of its run, so the completed state is three arcs,
     which is the mark. Nine sections on the homepage make runs of 3, 3 and 3;
     eight on Cyber make 3, 3 and 2. The hero is not a section: it carries no
     label, and the rule for that column is that it holds a label or an index of
     labels, so no label means no arc.

     Discrete by construction. Every step lands on a section boundary and
     nothing is driven by a scroll percentage, because a continuous value
     through a nested form is a progress ring, which is where this started. */
  function watch() {
    var el = $('.t-watch');
    if (!el) return;
    var labels = $$('h2.t-lab').filter(function (l) {
      return getComputedStyle(l).display !== 'none';
    });
    var secs = labels.map(function (l) { return l.closest('section'); }).filter(Boolean);
    var n = secs.length;
    if (!n) { el.remove(); return; }

    /* split n across three arcs as evenly as possible, outer arc first */
    var runs = [], base = Math.floor(n / 3), extra = n % 3;
    for (var i = 0; i < 3; i++) runs.push(base + (i < extra ? 1 : 0));

    var paths = $$('path', el), count = $('.t-watch__n', el);
    /* getTotalLength can throw on a hidden or detached SVG, and the fallback is
       a working device with a guessed dash length rather than a dead one. It is
       a handled case, so it warns once instead of rethrowing: silent would hide
       it, rethrowing would cry wolf about something that still works. */
    var measured = true;
    paths.forEach(function (p) {
      try { var L = Math.ceil(p.getTotalLength()); p.style.setProperty('--len', L); p.dataset.len = L; }
      catch (e) { p.dataset.len = 120; measured = false; }
    });
    if (!measured) warn('watch: could not measure arc length, using a fallback');

    /* full: draw every arc regardless of position, but still mark where you are.
       Under reduced motion the assembly is the decoration and the marking is the
       information, so the information survives and the assembly does not. */
    function draw(cur, full) {
      var start = 0;
      for (var i = 0; i < 3; i++) {
        var len = runs[i], done = Math.max(0, Math.min(len, cur - start));
        var p = paths[i];
        if (!p) { start += len; continue; }
        var L = parseFloat(p.dataset.len) || 120;
        var frac = full ? 1 : (len ? done / len : 0);
        p.style.setProperty('--off', (L * (1 - frac)).toFixed(1));
        if (cur > start && cur <= start + len) p.setAttribute('data-live', '');
        else p.removeAttribute('data-live');
        start += len;
      }
      if (count) count.textContent = cur ? cur + '/' + n : '';
    }

    function up() {
      var cur = 0, mid = innerHeight * 0.42;
      secs.forEach(function (s, i) {
        if (s.getBoundingClientRect().top <= mid) cur = i + 1;
      });
      draw(cur, reduced);
    }
    var tick = false;
    addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { up(); tick = false; });
    }, { passive: true });
    up();
    /* transitions come on only after the first draw has landed */
    requestAnimationFrame(function () { el.setAttribute('data-ready', ''); });
  }

  /* Give every arc its true path length, so the draw is honest rather than
     a guessed dash value that over or undershoots. */
  function arcs() {
    var ok = true;
    $$('.t-arcs path').forEach(function (p) {
      try { var l = Math.ceil(p.getTotalLength()); if (l) p.style.setProperty('--len', l); }
      catch (e) { ok = false; }
    });
    if (!ok) warn('arcs: could not measure path length, using the declared fallback');
  }

  /* Restore the safe state, then re-surface. A catch that only restores makes
     the page safe and its failures invisible, which is the same mode as an
     exception at the head of init, except guaranteed rather than accidental:
     the motion could be entirely dead on the live site with no console error,
     no uncaught exception and a page that looks finished. It also makes
     "uncaught 0" true by construction, so the evidence stops meaning anything.
     The visitor keeps a working page and the check keeps its signal. */
  /* handled and still working: say so once, do not rethrow */
  function warn(msg) { try { console.warn('[b2] ' + msg); } catch (x) {} }

  function fail(where, e) {
    try { console.error('[b2] ' + where + ' failed, motion degraded', e); } catch (x) {}
    setTimeout(function () { throw e; }, 0);
  }

  /* Only a page that has proved it can run the reveal machinery is allowed to
     hide anything. The flag goes on before the beats and comes straight back
     off if any of them throws, so a page that fails halfway is a page with
     everything visible rather than a text document with the photographs gone. */
  function init() {
    var root = document.documentElement;
    try {
      root.setAttribute('data-motion', '');
      masks();
      arcs();
      reveals();
    } catch (e) {
      root.removeAttribute('data-motion');
      $$('.t-in, .t-mask, .t-wipe, .t-rule, .t-arcs').forEach(function (el) {
        el.classList.add('is-on');
      });
      fail('reveals', e);
    }
    /* each beat isolated, so one failure does not take the rest, and each
       reported, so a dead beat is never silent */
    [['head', head], ['watch', watch], ['index', index], ['region', region],
     ['accordion', accordion], ['video', video], ['forms', forms],
     ['journey', journey]].forEach(function (pair) {
      try { pair[1](); } catch (e) { fail(pair[0], e); }
    });
    try {
      overlay('#t-search', '[data-search-open]', '[data-search-close]', 'input[type="search"]');
      overlay('#t-menu', '[data-menu-open]', '[data-menu-close]', null);
    } catch (e) { fail('overlays', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
