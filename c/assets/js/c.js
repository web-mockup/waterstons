/* Waterstons concept, Option C. The scroll narrative.

   Zero third party. CSS sticky, transforms, and one requestAnimationFrame.

   Two rules this file exists to honour:

   1. The stylesheet at rest is the finished page. This script only ever adds
      data-motion, and only after it has proved it can run. If it throws, the
      attribute comes off and the page is the complete stacked design again.
   2. A failure is never silent. Restore the safe state, log it, and rethrow
      asynchronously so it reaches the console and any error reporting rather
      than being swallowed by the catch that saved the page.

   And one rule about scroll: this never takes it. No preventDefault on wheel
   or touch, no scroll library, no custom scrollbar. A pinned section that
   steals the scroll breaks keyboard, trackpad and assistive technology at
   once, and it is the most disliked pattern on the web.
*/
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduced = false; }

  function fail(where, e) {
    try { console.error('[c] ' + where + ' failed, motion degraded', e); } catch (x) {}
    setTimeout(function () { throw e; }, 0);
  }

  /* ---------- The pinned acts ---------------------------------------------
     Each act is a tall section containing a sticky viewport and a flex track.
     Scroll position within the section is read and written to the track as a
     transform. Nothing here listens to wheel or touch: the page scrolls
     natively and this only observes where it got to. */

  var acts = [];

  function measure(a) {
    a.travel = a.track.scrollWidth - a.vp.clientWidth;
    a.span = a.sec.offsetHeight - a.vp.offsetHeight;
  }

  function place(a) {
    if (a.span <= 0 || a.travel <= 0) {
      a.track.style.transform = '';
      return;
    }
    var top = a.sec.getBoundingClientRect().top;
    var p = clamp(-top / a.span, 0, 1);
    a.track.style.transform = 'translate3d(' + (-p * a.travel).toFixed(2) + 'px,0,0)';
    if (a.bar) a.bar.style.setProperty('--p', p.toFixed(4));
    a.p = p;
  }

  function pins() {
    $$('.c-pin').forEach(function (sec) {
      var vp = $('.c-pin__vp', sec), track = $('.c-pin__track', sec);
      if (!vp || !track) return;
      var a = {
        sec: sec, vp: vp, track: track,
        bar: $('.c-pin__bar', sec),
        panels: $$('.c-panel', track),
        travel: 0, span: 0, p: 0
      };

      /* A focus landing on an off screen panel makes the browser scroll the
         overflow:hidden viewport to reveal it, which would slide the track out
         of step with the transform. So the viewport's own scroll is pushed
         back to zero and the page is scrolled to the equivalent position
         instead. The panel is still revealed, which is what matters for a
         keyboard. */
      vp.addEventListener('scroll', function () {
        if (vp.scrollLeft !== 0) { vp.scrollLeft = 0; }
      }, { passive: true });

      vp.addEventListener('focusin', function (ev) {
        if (!document.documentElement.hasAttribute('data-motion')) return;
        var el = ev.target, i = -1;
        for (var k = 0; k < a.panels.length; k++) {
          if (a.panels[k].contains(el)) { i = k; break; }
        }
        if (i < 0 || a.panels.length < 2 || a.span <= 0) return;

        /* No position is read here, and that is the whole point.

           Focusing an element makes the browser scroll to reveal it, and with
           scroll-behavior:smooth that scroll is animated over several hundred
           milliseconds. Any "is the panel already in view" test run during it
           reads a value the browser is in the middle of changing.

           So this computes the target from the panel index, which does not
           depend on when it runs, and issues its own scroll. That supersedes
           the browser's in-flight one rather than racing it. The guard is
           against the destination, not against the current position. */
        var want = i / (a.panels.length - 1);
        var y = a.sec.getBoundingClientRect().top + window.pageYOffset + want * a.span;
        if (Math.abs(window.pageYOffset - y) < 4) return;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });

      acts.push(a);
      measure(a);
      place(a);
    });

    if (!acts.length) return;

    var queued = false;
    function frame() { queued = false; acts.forEach(place); }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(frame);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        acts.forEach(function (a) { measure(a); place(a); });
      }, 120);
    }, { passive: true });
  }

  /* ---------- C3. The scrubbed background ---------------------------------
     Reads progress through the act and writes it to one custom property. The
     arcs are complete at --s 1, which is the resting value in the stylesheet,
     so an act whose script never runs shows finished geometry rather than an
     empty band. */

  function scrub() {
    var secs = $$('.c-scrub, .c-close');
    if (!secs.length) return;

    var jobs = [];
    secs.forEach(function (sec) {
      var bg = $('.c-scrub__bg, .c-close__bg', sec);
      if (!bg) return;
      $$('path', bg).forEach(function (pth) {
        var len = 0;
        try { len = pth.getTotalLength(); } catch (e) { len = 2000; }
        pth.style.setProperty('--len', Math.ceil(len));
      });
      jobs.push({ sec: sec, bg: bg });
    });
    if (!jobs.length) return;

    function put() {
      jobs.forEach(function (j) {
        var r = j.sec.getBoundingClientRect();
        var span = r.height + window.innerHeight;
        if (span <= 0) return;
        var p = clamp((window.innerHeight - r.top) / span, 0, 1);
        /* eased so the draw finishes while the act is still on screen rather
           than completing as it leaves */
        j.bg.style.setProperty('--s', Math.min(1, p * 1.45).toFixed(4));
      });
    }

    var queued = false;
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; put(); });
    }, { passive: true });
    put();
  }

  /* ---------- Reveals ------------------------------------------------------
     Everything rests finished, so this can only ever hide something it is
     also able to show. The failsafe shows the lot after 2.5s whatever the
     observer did, and anything already on screen when the page lands still
     animates rather than appearing pre arrived. */

  function reveals() {
    var items = $$('.c-in, .c-mask');
    if (!items.length) return;

    var done = false;
    function all() {
      if (done) return;
      done = true;
      items.forEach(function (el) { el.classList.add('is-on'); });
    }

    /* THE FAILSAFE MUST NOT REVEAL WHAT NOBODY HAS REACHED.
       It used to mark every element on the page after 2.5s, which keeps the
       guarantee that nothing stays hidden and destroys the entire point of the
       page: after two and a half seconds every arrival had already happened, so
       scrolling down showed finished content and nothing ever played. That is
       what "the photographs are stale" means. They were not stale, they had
       arrived while the reader was still at the top.

       The guarantee is only about what a reader can SEE. So the fallback
       reveals anything at or above the fold and then keeps doing that on
       scroll: nothing visible is ever hidden, and nothing below the fold is
       spent before it is reached. */
    var fallback = false;
    function reachable() {
      var any = false;
      items.forEach(function (el) {
        if (el.classList.contains('is-on')) return;
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-on');
        else any = true;
      });
      return any;
    }

    if (reduced || !('IntersectionObserver' in window)) { all(); return; }

    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-on');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    /* Anything inside a pinned track is exempt: an observer intersects on both
       axes, so a panel parked off to the right never reports as visible and
       its contents would stay hidden for the whole act. */
    var onscreen = [];
    items.forEach(function (el) {
      if (el.closest('.c-pin__track')) { el.classList.add('is-on'); return; }
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { onscreen.push(el); return; }
      io.observe(el);
    });

    /* The landing screen animates too. Marking what is already on screen as
       arrived, rather than playing it, is what makes a page with a full motion
       layer still read as static at the top. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        onscreen.forEach(function (el, i) {
          el.style.transitionDelay = Math.min(i * 55, 440) + 'ms';
          el.classList.add('is-on');
        });
      });
    });

    /* After 2.5s, stop trusting the observer and drive it from scroll instead,
       but only ever for what is on screen. */
    setTimeout(function () {
      if (done) return;
      fallback = true;
      reachable();
      addEventListener('scroll', function () {
        if (!fallback) return;
        if (!reachable()) fallback = false;
      }, { passive: true });
    }, 2500);

    /* A plate that has finished arriving drops its transition, so the
       counter-scroll follows the scroll rather than trailing 2.6s behind it. */
    var plates = $$('.c-plate');
    if (plates.length) {
      var watchdog = setInterval(function () {
        var left = 0;
        plates.forEach(function (pl) {
          if (!pl.classList.contains('is-on')) { left++; return; }
          if (!pl.hasAttribute('data-settled')) {
            setTimeout(function () { pl.setAttribute('data-settled', ''); }, 2700);
            pl.setAttribute('data-pending', '');
          }
        });
        if (!left) clearInterval(watchdog);
      }, 400);
    }
  }

  /* ---------- C4. The pause control ---------------------------------------
     WCAG 2.2.2. Anything that moves automatically for more than five seconds
     needs a mechanism to pause, stop or hide it, and the marquee is the one
     beat on this page that runs without being asked. The plan's own words were
     "never stops", which is the requirement stated as a feature. */

  function marquee() {
    $$('.c-marq').forEach(function (m) {
      var btn = $('.c-marq__p', m);
      if (!btn) return;
      btn.hidden = false;
      function set(paused) {
        if (paused) m.setAttribute('data-paused', '');
        else m.removeAttribute('data-paused');
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        $('.c-marq__p-t', btn).textContent = paused ? 'Play' : 'Pause';
      }
      set(false);
      btn.addEventListener('click', function () {
        set(!m.hasAttribute('data-paused'));
      });
    });
  }

  /* ---------- C6. Parallax -------------------------------------------------
     A slow counter-scroll on full bleed photographs. The image is oversized
     and offset in CSS, so the transform only ever moves within ground the
     image already covers and no edge can be exposed. */

  function parallax() {
    var plates = $$('.c-plate__f');
    if (!plates.length || reduced) return;
    var queued = false;
    function put() {
      plates.forEach(function (f) {
        var img = $('img', f);
        if (!img) return;
        var r = f.getBoundingClientRect();
        if (r.bottom < -80 || r.top > window.innerHeight + 80) return;
        var mid = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        /* 12% of headroom each way on a contained plate, so the travel stays
           inside ground the image already covers. */
        img.style.setProperty('--y', (clamp(mid, -1, 1) * -54).toFixed(1));
      });
    }
    window.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; put(); });
    }, { passive: true });
    put();
  }

  /* ---------- The enquiry form --------------------------------------------
     A concept, so it submits nothing. It still validates and still tells the
     reader what would happen, because a form that silently does nothing is
     worse than no form. */

  function forms() {
    $$('form[data-mock]').forEach(function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var bad = null;
        $$('input[required], textarea[required]', f).forEach(function (el) {
          var ok = el.value.trim() !== '' &&
                   (el.type !== 'email' || /.+@.+\..+/.test(el.value));
          el.setAttribute('aria-invalid', ok ? 'false' : 'true');
          if (!ok && !bad) bad = el;
        });
        if (bad) { bad.focus(); return; }
        var note = $('[data-mock-note]', f);
        if (note) { note.hidden = false; note.setAttribute('role', 'status'); }
      });
    });
  }

  /* ---------- The video facade -------------------------------------------
     A concept, so there is no film to load. It says so plainly rather than
     doing nothing, because a control that appears to fail is worse than one
     that explains itself. */
  function video() {
    $$('[data-video]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fig = btn.closest('figure');
        if (!fig) return;
        var note = fig.querySelector('.c-video__c .c-plate__d');
        if (note) {
          note.textContent = 'In the live build this loads the film. This concept does not.';
          note.setAttribute('role', 'status');
        }
        btn.disabled = true;
      });
    });
  }

  /* ---------- Per word staging -------------------------------------------- */

  function masks() {
    $$('[data-words]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'c-mask';
        var it = document.createElement('i');
        it.textContent = w;
        it.style.transitionDelay = (i * 60) + 'ms';
        s.appendChild(it);
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* Show our thinking: our commentary on the client's page, off by default. */
  /* Same as the other two options: the annotation choice survives navigation
     within a session, so an evaluator turns it on once rather than on each of
     nine pages. sessionStorage, every access wrapped, fallback off, because a
     private window or blocked site data makes these throw and off is the
     first-visit default anyway. */
  var THINK = 'ws-thinking';
  function thinkGet() { try { return sessionStorage.getItem(THINK) === 'on'; } catch (e) { return false; } }
  function thinkSet(v) { try { sessionStorage.setItem(THINK, v ? 'on' : 'off'); } catch (e) {} }

  function thinking() {
    var b = $('.c-tt');
    if (!b) return;
    function apply(on, save) {
      b.setAttribute('aria-pressed', String(on));
      document.body.setAttribute('data-thinking', on ? 'on' : 'off');
      $('.c-tt__l', b).textContent = on ? 'Hide our thinking' : 'Show our thinking';
      if (save) thinkSet(on);
    }
    if (thinkGet()) apply(true, false);
    b.addEventListener('click', function () {
      apply(b.getAttribute('aria-pressed') !== 'true', true);
    });
  }

  function init() {
    var root = document.documentElement;
    if (reduced) {
      /* The reduced motion page is a different design rather than this one with
         the transitions turned off: no pinning, no travel, acts stacked and
         short. That is what the stylesheet already is, so the correct action
         here is to do nothing to it. */
      $$('.c-in, .c-mask').forEach(function (el) { el.classList.add('is-on'); });
      /* The marquee is already inert under reduced motion and its rail wraps,
         so there is nothing to pause and the control stays hidden. The form is
         not motion and must still work. */
      try { forms(); } catch (e) { fail('forms', e); }
      return;
    }

    try {
      masks();
      root.setAttribute('data-motion', '');
      pins();
      scrub();
      reveals();
    } catch (e) {
      root.removeAttribute('data-motion');
      $$('.c-in, .c-mask').forEach(function (el) { el.classList.add('is-on'); });
      fail('init', e);
    }

    /* These run whatever happened above, and each one fails on its own rather
       than taking the others with it. A dead parallax must not cost the page
       its pause control, because one of those is a nicety and the other is a
       conformance requirement. */
    [['marquee', marquee], ['parallax', parallax], ['forms', forms],
     ['video', video], ['thinking', thinking]].forEach(function (pair) {
      try { pair[1](); } catch (e) { fail(pair[0], e); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
