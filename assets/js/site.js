/* Waterstons concept. Vanilla JS, no dependencies, no third party calls.
   Motion is type-led: words rise out of masks on transform only, so copy is
   never rendered semi transparent and nothing leaves the tab order. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var REVEAL = '.w-rev, .w-wipe, .w-stats, .w-list, .w-cards, .w-steps, .w-footer, [data-words], .w-resolve';

  /* ---- Split an element into per word masks. Done in JS so the markup
     stays a plain sentence for screen readers and in the source. ------ */
  function splitWords(el, delay) {
    if (!el || el.dataset.split) return;
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var mask = document.createElement('span'); mask.className = 'w-mask';
      var inner = document.createElement('span'); inner.className = 'w-in';
      inner.textContent = w;
      if (delay) inner.style.transitionDelay = (i * delay) + 'ms';
      mask.appendChild(inner); el.appendChild(mask);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    el.dataset.split = '1';
  }

  function maskHeadings() {
    if (reduced) return;
    $$('[data-words]').forEach(function (el) { splitWords(el, 42); });
  }

  /* ---- Scroll resolve. Copy moves between two colour tiers that both
     pass AA, so it is readable the whole way rather than fading up. --- */
  function resolveWords() {
    $$('.w-resolve').forEach(function (el) {
      if (el.dataset.split) return;
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w-word';
        s.style.setProperty('--i', i);
        s.style.transitionDelay = (i * 26) + 'ms';
        s.textContent = w;
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      el.dataset.split = '1';
    });
  }

  /* ---- Reveals ------------------------------------------------------ */
  function reveals() {
    var items = $$(REVEAL);
    if (!items.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    /* A .w-wipe clips its child, and the browser's own lazy loader is
       IntersectionObserver machinery that reads a clipped box as an empty rect,
       so the photograph inside cannot be fetched until the wipe lifts it. That
       is the wrong way round, and it is visible: measured at 1870x950, three
       photographs across these pages opened on an image that had not arrived.
       The wipe element itself is not clipped, so promote its image when it comes
       within 1200px of the viewport, which is what loading="lazy" would have
       done unaided on a 4g connection. Nothing is fetched any earlier than lazy
       already promised. Remove this only if the clip goes too. */
    var pre = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        pre.unobserve(e.target);
        var img = e.target.querySelector('img');
        if (img && img.loading === 'lazy') img.loading = 'eager';
      });
    }, { rootMargin: '0px 0px 1200px 0px' });
    $$('.w-wipe').forEach(function (el) { pre.observe(el); });
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { el.classList.add('is-in', 'is-instant'); return; }
      io.observe(el);
    });
    /* Focus reveals its own container, so tabbing never lands on
       something still on its way in. */
    document.addEventListener('focusin', function (e) {
      var n = e.target;
      while (n && n !== document.body) {
        if (n.matches && n.matches(REVEAL) && !n.classList.contains('is-in')) {
          n.classList.add('is-in', 'is-instant');
        }
        n = n.parentElement;
      }
    });
  }

  /* Nothing may stay invisible because an observer never fired. */
  function failsafe() {
    setTimeout(function () {
      $$(REVEAL).forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        if (el.getBoundingClientRect().top < innerHeight * 2) el.classList.add('is-in');
      });
    }, 2500);
  }

  /* ---- Hero phrase rotator. The tail of the sentence cycles through
     things Waterstons actually say in their own published copy. A hidden
     sizer holds the widest phrase, so the line never reflows. --------- */
  function rotator() {
    var rot = $('.w-rot');
    if (!rot) return;
    var phrases = (rot.getAttribute('data-phrases') || '').split('|').filter(Boolean);
    var slot = $('.w-rot__slot', rot);
    if (!slot || phrases.length < 2) return;

    function build(text) {
      var item = document.createElement('span');
      item.className = 'w-rot__item';
      var words = text.split(/\s+/);
      words.forEach(function (w, i) {
        var mask = document.createElement('span'); mask.className = 'w-mask';
        var inner = document.createElement('span'); inner.className = 'w-in';
        inner.style.setProperty('--i', i);
        inner.textContent = w;
        mask.appendChild(inner); item.appendChild(mask);
        if (i < words.length - 1) item.appendChild(document.createTextNode(' '));
      });
      return item;
    }

    var idx = 0;
    var current = build(phrases[0]);
    current.setAttribute('data-state', 'in');
    slot.appendChild(current);
    if (reduced) return;

    var timer = null;
    function step() {
      var next = build(phrases[(idx + 1) % phrases.length]);
      next.setAttribute('data-state', 'wait');
      slot.appendChild(next);
      var going = current;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          going.setAttribute('data-state', 'out');
          next.setAttribute('data-state', 'in');
        });
      });
      setTimeout(function () { if (going.parentNode) going.parentNode.removeChild(going); }, 1100);
      current = next;
      idx = (idx + 1) % phrases.length;
    }
    function start() { if (!timer) timer = setInterval(step, 3400); }
    function stop() { clearInterval(timer); timer = null; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.2 }).observe(rot);
    } else { start(); }
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  }

  /* ---- Sticky section index, in the column the layout leaves empty -- */
  function sectionIndex() {
    var host = $('[data-index]');
    if (!host) return;
    var secs = $$('section[id]').filter(function (s) { return $('.w-eyebrow', s) && $('.w-num', s); });
    if (secs.length < 3) return;
    var ul = document.createElement('ul');
    ul.className = 'w-index__l';
    var items = secs.map(function (s) {
      var li = document.createElement('li');
      li.className = 'w-index__i';
      var a = document.createElement('a');
      a.className = 'w-index__a';
      a.href = '#' + s.id;
      a.appendChild(document.createElement('span')).textContent = $('.w-eyebrow', s).textContent.trim();
      li.appendChild(a); ul.appendChild(li);
      return { li: li, sec: s };
    });
    var nav = document.createElement('nav');
    nav.className = 'w-index';
    nav.setAttribute('aria-label', 'Sections on this page');
    nav.appendChild(ul);
    host.appendChild(nav);
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var m = items.filter(function (i) { return i.sec === e.target; })[0];
        if (m) m.li.classList.toggle('is-here', e.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    items.forEach(function (i) { io.observe(i.sec); });
  }

  /* ---- Header hairline once you leave the top ---------------------- */
  function header() {
    var h = $('.w-header');
    if (!h) return;
    var tick = function () { h.classList.toggle('is-stuck', scrollY > 8); };
    tick(); addEventListener('scroll', tick, { passive: true });
  }

  /* ---- Scroll progress rail --------------------------------------- */
  function progress() {
    if (reduced) return;
    var bar = document.createElement('div');
    bar.className = 'w-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    if (CSS.supports && CSS.supports('animation-timeline: scroll()')) return;
    var raf = null;
    function tick() {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
      raf = null;
    }
    addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    tick();
  }

  /* ---- Magnetic buttons ------------------------------------------- */
  function magnetic() {
    if (reduced || matchMedia('(hover: none)').matches) return;
    $$('.w-btn').forEach(function (b) {
      var raf = null, tx = 0, ty = 0;
      function apply() { b.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)'; raf = null; }
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        tx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 9;
        ty = ((e.clientY - (r.top + r.height / 2)) / r.height) * 6;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      b.addEventListener('pointerleave', function () {
        tx = ty = 0;
        b.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
        if (!raf) raf = requestAnimationFrame(apply);
        setTimeout(function () { b.style.transition = ''; }, 520);
      });
    });
  }

  /* ---- Stat counters. The real value stays in the DOM until it runs - */
  function counters() {
    var stats = $$('.w-stat__n');
    if (!stats.length || reduced || !('IntersectionObserver' in window)) return;
    stats.forEach(function (el) {
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
      if (!isFinite(target) || target === 0) return;
      var grouped = m[2].indexOf(',') > -1;
      el.__run = function () {
        if (el.__done) return;
        el.__done = true;
        var dur = 1000, t0 = null;
        (function step(t) {
          if (t0 === null) t0 = t;
          var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
          var v = Math.round(target * e);
          node.nodeValue = pre + (grouped ? v.toLocaleString('en-GB') : v) + post;
          if (p < 1) requestAnimationFrame(step); else node.nodeValue = raw;
        })(performance.now());
      };
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.target.__run) { e.target.__run(); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    stats.forEach(function (el) { io.observe(el); });
  }

  /* ---- Page transition. The logo mark grows out of the page -------- */
  function curtain() {
    if (reduced) return;
    var el = document.createElement('div');
    el.className = 'w-curtain';
    el.setAttribute('aria-hidden', 'true');
    var shape = document.createElement('div');
    shape.className = 'w-curtain__shape';
    el.appendChild(shape);
    document.body.appendChild(el);
    function cover() {
      var need = Math.sqrt(innerWidth * innerWidth + innerHeight * innerHeight) / 240 * 1.15;
      el.style.setProperty('--cover', need.toFixed(2));
    }
    cover();
    addEventListener('resize', cover, { passive: true });
    el.classList.add('is-out');
    setTimeout(function () { el.classList.remove('is-out'); }, 900);

    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (/^(mailto:|tel:)/i.test(href)) return;
      var url;
      try { url = new URL(a.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      cover();
      el.classList.remove('is-out');
      el.classList.add('is-in');
      setTimeout(function () { location.href = a.href; }, 560);
    });
    addEventListener('pageshow', function (ev) {
      if (ev.persisted) {
        el.classList.remove('is-in'); el.classList.add('is-out');
        setTimeout(function () { el.classList.remove('is-out'); }, 900);
      }
    });
  }

  /* ---- Accordion --------------------------------------------------- */
  function accordion() {
    $$('.w-acc__b').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', String(!open));
        var p = document.getElementById(b.getAttribute('aria-controls'));
        if (p) p.hidden = open;
      });
    });
  }

  /* ---- Tabs -------------------------------------------------------- */
  function tabs() {
    $$('[role="tablist"]').forEach(function (list) {
      var btns = $$('[role="tab"]', list);
      function sel(btn) {
        btns.forEach(function (b) {
          var on = b === btn;
          b.setAttribute('aria-selected', String(on));
          b.tabIndex = on ? 0 : -1;
          var p = document.getElementById(b.getAttribute('aria-controls'));
          if (p) p.hidden = !on;
        });
      }
      btns.forEach(function (btn, i) {
        btn.addEventListener('click', function () { sel(btn); });
        btn.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          var n = btns[(i + d + btns.length) % btns.length];
          n.focus(); sel(n);
        });
      });
    });
  }

  /* ---- Video facade. Nothing loads until asked. -------------------- */
  function video() {
    $$('.w-video__b').forEach(function (b) {
      b.addEventListener('click', function () {
        var w = b.closest('.w-video');
        var label = b.getAttribute('data-label') || 'video';
        w.innerHTML = '<div style="aspect-ratio:16/9;display:grid;place-items:center;' +
          'background:#152943;color:#fff;text-align:center;padding:2rem"><p tabindex="-1" ' +
          'style="margin:0;max-width:36ch;font-size:.95rem">This is where the ' + label +
          ' would load. In the real build the player is only requested once someone presses ' +
          'play, so it costs nothing until it is wanted.</p></div>';
        $('p', w).focus();
      });
    });
  }

  /* ---- Search overlay, static UI with real focus management -------- */
  function search() {
    var panel = $('#w-search');
    if (!panel) return;
    var last = null;
    function open() {
      last = document.activeElement;
      panel.hidden = false;
      document.body.style.overflow = 'hidden';
      var i = $('input[type="search"]', panel);
      if (i) { i.focus(); i.select(); }
    }
    function close() {
      panel.hidden = true;
      document.body.style.overflow = '';
      if (last) last.focus();
    }
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-search-close]', panel).forEach(function (b) { b.addEventListener('click', close); });
    panel.addEventListener('mousedown', function (e) { if (e.target === panel) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) return close();
      if (e.key !== 'Tab' || panel.hidden) return;
      var f = $$('a[href],button:not([disabled]),input,select,textarea', panel);
      if (!f.length) return;
      var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    });
    $$('.w-chip', panel).forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });
  }

  /* ---- Show our thinking ------------------------------------------- */
  function thinking() {
    var b = $('.w-tt');
    if (!b) return;
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', String(!on));
      document.body.setAttribute('data-thinking', on ? 'off' : 'on');
      $('.w-tt__l', b).textContent = on ? 'Show our thinking' : 'Hide our thinking';
    });
  }

  /* ---- Journey pill, only when arrived via ?journey=1 --------------- */
  function journey() {
    var pill = $('.w-journey');
    if (!pill) return;
    if (new URLSearchParams(location.search).get('journey') !== '1') return;
    pill.setAttribute('data-on', '1');
    $$('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|#)/.test(h)) return;
      a.setAttribute('href', h + (h.indexOf('?') > -1 ? '&' : '?') + 'journey=1');
    });
  }

  /* ---- UK and AU switcher. Text, href, label and offices all move --- */
  function region() {
    var btn = $('[data-region-toggle]');
    if (!btn) return;
    var root = document.documentElement;
    function apply(r) {
      root.setAttribute('data-region', r);
      var au = r === 'au';
      $('[data-region-label]', btn).textContent = au ? 'AU' : 'UK';
      btn.setAttribute('aria-label', au ? 'Region AU, switch to United Kingdom'
                                        : 'Region UK, switch to Australia');
      $$('[data-uk]').forEach(function (el) {
        el.textContent = au ? el.getAttribute('data-au') : el.getAttribute('data-uk');
        var href = au ? el.getAttribute('data-au-href') : el.getAttribute('data-uk-href');
        if (href) el.setAttribute('href', href);
      });
      $$('[data-region-only]').forEach(function (el) {
        el.hidden = el.getAttribute('data-region-only') !== r;
      });
      var live = $('#w-region-live');
      if (live) live.textContent = au ? 'Showing Australian offices and phone numbers.'
                                      : 'Showing UK offices and phone numbers.';
    }
    btn.addEventListener('click', function () {
      apply(root.getAttribute('data-region') === 'au' ? 'uk' : 'au');
    });
    apply(root.getAttribute('data-region') || 'uk');
  }

  /* ---- Disclosure. Escape closes and returns focus ------------------ */
  function disclosure() {
    $$('[data-disclosure]').forEach(function (b) {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      if (!panel) return;
      function close(refocus) {
        b.setAttribute('aria-expanded', 'false');
        panel.hidden = true;
        if (refocus) b.focus();
      }
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-expanded') === 'true') return close(false);
        b.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        var f = $('input, button, textarea', panel);
        if (f) f.focus();
      });
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); close(true); }
      });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && b.getAttribute('aria-expanded') === 'true') close(true);
      });
    });
  }

  /* ---- Forms are UI only in this concept --------------------------- */
  function forms() {
    $$('form[data-mock]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var n = $('[data-mock-note]', f);
        if (n) { n.hidden = false; n.setAttribute('tabindex', '-1'); n.focus(); }
      });
    });
  }

  function init() {
    var root = document.documentElement;
    /* NOTHING IS HIDDEN UNTIL A SCRIPT HAS PROVED IT CAN RUN. data-motion is what
       switches every hiding rule in the stylesheet on, so a page without
       JavaScript, with a blocked script, or with a throw in any motion beat, is a
       page that simply arrived. Measured before this: JavaScript off left 48
       elements at opacity 0 and five photographs clipped to nothing.
       The rotator is inside this group deliberately: if it throws, dropping
       data-motion is also what makes the no-motion rule show its first phrase. */
    try {
      root.setAttribute('data-motion', '');
      maskHeadings(); resolveWords(); reveals(); failsafe(); rotator();
    } catch (e) {
      root.removeAttribute('data-motion');
      $$(REVEAL).forEach(function (el) { el.classList.add('is-in'); });
      if (window.console) console.error('motion', e);
    }
    /* Each beat isolated. This was a flat list, so one throw silently deleted
       every behaviour below it and the page still rendered, which is the hardest
       kind of failure to notice. */
    [sectionIndex, header, progress, magnetic, counters, curtain,
     accordion, tabs, video, search, thinking, journey, region,
     disclosure, forms].forEach(function (fn) {
      try { fn(); } catch (e) { if (window.console) console.error(fn.name || 'beat', e); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
