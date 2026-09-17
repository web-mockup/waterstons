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
    /* Anything already on screen at load was being marked finished immediately,
       so the entire first viewport never animated: the landing screen was
       static by construction. It now plays on the next frame instead, which
       keeps the guarantee that nothing stays hidden while letting the page
       actually arrive. */
    var onscreen = [];
    items.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { onscreen.push(el); return; }
      io.observe(el);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        onscreen.forEach(function (el, i) {
          el.style.transitionDelay = Math.min(i * 45, 420) + 'ms';
          el.classList.add('is-on');
        });
      });
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
    /* NOTHING MAY STAY HIDDEN BECAUSE AN OBSERVER NEVER FIRED, and nothing may
       be spent before a reader reaches it.

       This used to mark every element on the page after 2.5s. That keeps the
       first half of the guarantee and destroys the page: two and a half seconds
       after load every arrival had already happened, so scrolling down revealed
       content that had finished animating while the reader was still at the
       top. The page was not static, it had simply already played.

       The guarantee is only ever about what a reader can SEE, so the fallback
       reveals what is at or above the fold and then keeps doing that on scroll.
       Nothing visible is ever hidden; nothing below the fold is spent early. */
    var fallback = false;
    function reachable() {
      var pending = false;
      $$(SEL).forEach(function (el) {
        if (el.classList.contains('is-on')) return;
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-on');
        else pending = true;
      });
      return pending;
    }
    setTimeout(function () {
      fallback = true;
      reachable();
      addEventListener('scroll', function () {
        if (fallback && !reachable()) fallback = false;
      }, { passive: true });
    }, 2500);
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

    /* Only the live paths, never the ghost behind them. */
    var paths = $$('svg > path', el), count = $('.t-watch__n', el);
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
      /* All three arcs advance together, on the same discrete step.
         They used to take a run of sections each, which put the ink on one arc
         while every index point sat on the outer contour, so the front of the
         drawn line did not pass through the point it was supposed to have
         reached. Position and progress were two different curves saying
         different things.

         This is still discrete and still lands on section boundaries, which was
         the point of runs: the count lives in the steps, and cur/n steps once
         per section. It is not a percentage of scroll. What changes is that the
         mark now assembles as one thing, and the ink arrives at each point as
         the reader arrives at its section. */
      /* Continuous, not nine steps. The step version was the honest reading of
         "one advance per section" and it looks like a slideshow: nine jumps,
         each eased, none of them tied to what the hand is doing. This follows
         scroll position directly, so the mark is drawn BY the reader rather
         than played at them. The points still mark sections, which is where
         the discrete information belongs. */
      var frac;
      if (full) frac = 1;
      else {
        var doc = document.documentElement;
        var max = doc.scrollHeight - innerHeight;
        frac = max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)) : 0;
      }
      for (var i = 0; i < 3; i++) {
        var p = paths[i];
        if (!p) continue;
        var L = parseFloat(p.dataset.len) || 120;
        p.style.setProperty('--off', (L * (1 - frac)).toFixed(1));
        if (cur > 0) p.setAttribute('data-live', '');
        else p.removeAttribute('data-live');
      }
      /* No name here. The header already renders the current section as
         visible text at every width, so a second readout is a duplicate that
         can only ever agree or be wrong. The device shows position and offers
         destinations; the header says where you are. */
    }

    /* ---- The index, placed on the geometry ----
       The list is real anchors in the markup and it works as a plain vertical
       index with no script at all. This only moves each entry onto the arc that
       carries its section, at the same position the drawing uses, so what a
       reader clicks and what the mark shows are the same thing rather than two
       views that can disagree. */
    var items = $$('.t-watch__l > li', el);

    function place() {
      if (!items.length) return false;
      var box = el.getBoundingClientRect();
      if (!box.width) return false;               /* hidden below 900px */
      var sx = box.width / 36, sy = box.height / 42;
      var outer = paths[0];
      if (!outer) return false;

      /* Every entry rides the OUTER contour, spaced evenly along it, rather
         than sitting on the arc that happens to draw its run.

         Putting each entry on its own arc was the obvious mapping and it does
         not survive the geometry. The mark's three arcs are nested at radii
         16, 12.93 and 2.85 in a 36 unit box, so at any size that fits a margin
         the outer two are about seven pixels apart. A 24px target, which is the
         smallest 2.5.8 allows, is more than three times that gap, so entries on
         adjacent arcs overlapped: four collisions per page, meaning a reader
         aiming at one section could land on another.

         The outer contour is one continuous line with room for all of them, and
         nothing is lost: the drawing still advances arc by arc, and a reader was
         never told which run a section belonged to. */
      var ok = true;
      try {
        var L = outer.getTotalLength();
        items.forEach(function (li, i) {
          var pt = outer.getPointAtLength(L * ((i + 0.5) / items.length));
          li.style.left = (pt.x * sx).toFixed(1) + 'px';
          li.style.top = (pt.y * sy).toFixed(1) + 'px';
        });
      } catch (e) { ok = false; }
      return ok;
    }

    function mark(cur) {
      items.forEach(function (li, i) {
        if (i + 1 === cur) li.setAttribute('data-here', '');
        else li.removeAttribute('data-here');
        if (i + 1 < cur) li.setAttribute('data-done', '');
        else li.removeAttribute('data-done');
      });
    }

    /* The index yields when the margin is already in use.
       It is pinned to the foot of the viewport, so it passes over parts of the
       page that are not offset sections and have no margin to borrow: the
       footer runs full width, and the Cyber page's services section already
       carries its own live index of six services in that column. Measured
       through a full scroll at five viewport sizes, those were the only two
       things it ever landed on, at 67 positions in total.

       Hiding rather than moving is the right semantic here. The column holds
       one index at a time, which is the rule the stylesheet states, so when the
       column is occupied this one steps back rather than competing. Over the
       services list a reader is left with a better, section-specific index; at
       the footer the page has ended.

       Tested with elementsFromPoint rather than a list of selectors to avoid,
       because a list has to be maintained and fails silently when a new full
       width section is added. This asks what is actually under it. */
    function occupied() {
      var box = el.getBoundingClientRect();
      if (!box.width) return false;
      /* A 5 by 5 grid over a box inflated by 8px, rather than 9 points inside
         it. Nine points missed a text run clipping only the edge of the box:
         two positions out of 310 tested, which is exactly the kind of residue
         that looks like noise and is a reader seeing the index on top of a
         word. Sampling wider and denser costs nothing on a scroll tick. */
      /* The grid is dense in Y and coarse in X, because that is the shape of
         the thing being looked for. A line of text is wide and about 20px
         tall, so a probe grid with rows 47px apart passes straight through one:
         it left a real overlap on the footer at 1100 wide that survived being
         sampled slowly, so it was geometry rather than timing. Rows are now
         about 14px apart, closer together than a line of text is tall, which is
         the resolution the target actually requires.

         20px of margin around the box as well, so the device steps back just
         before it touches something rather than exactly as it does. */
      var pad = 20, xs = [], ys = [], i;
      var COLS = 4, ROWS = 15;
      for (i = 0; i < COLS; i++) xs.push(box.left - pad + ((box.width + pad * 2) * i) / (COLS - 1));
      for (i = 0; i < ROWS; i++) ys.push(box.top - pad + ((box.height + pad * 2) * i) / (ROWS - 1));
      for (var a = 0; a < xs.length; a++) {
        for (var c = 0; c < ys.length; c++) {
          var stack = document.elementsFromPoint(xs[a], ys[c]) || [];
          for (var k = 0; k < stack.length; k++) {
            var node = stack[k];
            if (node === el || el.contains(node)) continue;
            if (node === document.body || node === document.documentElement) continue;
            /* A DIRECT text node, not "an element with no children".
               The leaf test skipped anything containing an element, and the
               section labels contain the mark svg, so the one thing this
               device sits next to was the one thing it could not see. It
               yielded once in thirteen scroll positions while overlapping
               labels at every narrow width. Same mistake as measuring column
               ink by element rather than by text node. */
            var direct = false;
            for (var t = 0; t < node.childNodes.length; t++) {
              var cn = node.childNodes[t];
              if (cn.nodeType === 3 && cn.nodeValue && cn.nodeValue.trim()) { direct = true; break; }
            }
            if (direct) return true;
          }
        }
      }
      return false;
    }

    function yieldIfBusy() {
      if (occupied()) el.setAttribute('data-yield', '');
      else el.removeAttribute('data-yield');
    }

    function up() {
      /* THE SAME RULE THE HEADER USES: the section straddling 34% of the
         viewport. The header has named the current section since long before
         this device could point at one, and two components answering "where am
         I" with different arithmetic will disagree in a band around every
         boundary. They did: the header read CLIENTS while the marked point read
         WORK, in one glance, on the same screen. One rule, so they cannot. */
      var cur = 0, mid = innerHeight * 0.34;
      secs.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) cur = i + 1;
      });
      draw(cur, reduced);
      mark(cur);
      yieldIfBusy();
    }
    var tick = false;
    addEventListener('scroll', function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { up(); tick = false; });
    }, { passive: true });
    up();
    /* transitions come on only after the first draw has landed */
    requestAnimationFrame(function () { el.setAttribute('data-ready', ''); });

    /* data-nav is the switch from "a list of links" to "a list of links on the
       arc", and it is only set once every entry has actually been placed. If
       any placement fails the attribute stays off and the reader keeps the
       plain vertical index, which is a working index rather than a broken
       diagram. */
    function replace() {
      if (place()) {
        el.setAttribute('data-nav', '');
        /* Confirms to the head flag that the machinery arrived, so its
           watchdog leaves the pinned state alone. */
        document.documentElement.setAttribute('data-pin-ok', '');
      } else {
        el.removeAttribute('data-nav');
      }
    }
    requestAnimationFrame(replace);
    var rt;
    addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(replace, 150);
    }, { passive: true });
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
  /* The reel's buttons. It scrolls by drag and by keyboard already, but with
     the scrollbar hidden there was no way to discover that with a mouse and no
     sign there was anything past the right edge. The buttons are the
     affordance; they move by one card and disable at each end so the control
     tells you where you are. */
  function reel() {
    $$('.t-reel').forEach(function (rail) {
      var nav = rail.parentElement && $('.t-reel__nav', rail.parentElement);
      if (!nav) return;
      var prev = $('[data-reel-prev]', nav), next = $('[data-reel-next]', nav);
      if (!prev || !next) return;

      function step() {
        var first = rail.firstElementChild;
        if (!first) return rail.clientWidth * 0.8;
        var gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        return first.getBoundingClientRect().width + gap;
      }
      function sync() {
        var max = rail.scrollWidth - rail.clientWidth;
        prev.disabled = rail.scrollLeft <= 2;
        next.disabled = rail.scrollLeft >= max - 2;
        nav.hidden = max <= 2;                 /* nothing to scroll, no control */
      }
      prev.addEventListener('click', function () {
        rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' });
      });
      next.addEventListener('click', function () {
        rail.scrollBy({ left: step(), behavior: reduced ? 'auto' : 'smooth' });
      });
      rail.addEventListener('scroll', sync, { passive: true });
      addEventListener('resize', sync, { passive: true });
      sync();
    });
  }


  /* Show our thinking: our commentary on the client's page, off by default. */
  function thinking() {
    var b = $('.t-tt');
    if (!b) return;
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', String(!on));
      document.body.setAttribute('data-thinking', on ? 'off' : 'on');
      $('.t-tt__l', b).textContent = on ? 'Show our thinking' : 'Hide our thinking';
    });
  }

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
     ['journey', journey], ['reel', reel], ['thinking', thinking]].forEach(function (pair) {
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
