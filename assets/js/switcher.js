/* Design option switcher. Presentation chrome, part of none of the designs.
   Mapping is a pure string operation on the path, so it cannot drift out of
   sync with a lookup table. Hidden under ?clean=1 and in print.

   Three options now rather than two. The two-option version special cased "is
   this the B path", which does not extend, so the options are a list and the
   current one is read from the path. Adding a fourth would be one more entry. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('clean') === '1') return;

  var OPTIONS = [
    { key: 'a', seg: '', label: 'Option A' },
    { key: 'b', seg: '/b', label: 'Option B: Show Your Working' },
    { key: 'c', seg: '/c', label: 'Option C: The Scroll Is The Argument' }
  ];

  /* Which option are we on, and what is the page within it.
     The lookahead matters: without it "/services/cyber.html" would match "/c"
     followed by "yber.html" and the switcher would decide an Option A page was
     an Option C one. */
  var path = location.pathname, cur = 'a', base, rest;
  var m = path.match(/^(.*?)\/([bc])(?=\/|$)(\/.*)?$/);
  if (m) {
    cur = m[2];
    base = m[1];
    rest = m[3] || '/';
  } else {
    var a = path.match(/^(.*?)(\/(?:site\/.*|index\.html)?)$/);
    base = a ? a[1] : path.replace(/\/[^/]*$/, '');
    rest = a ? a[2] : '/';
  }
  if (!rest || rest === '/') rest = '/index.html';

  /* The build globs each option's pages off disk and writes them here, so the
     set cannot disagree with what exists and adding a page needs no edit to
     this file. Where a page has not been built for an option, the control
     still works and says where it goes rather than offering a route to a 404.

     AN ABSENT LIST MEANS "HOMEPAGE ONLY", NOT "EVERY PAGE EXISTS".
     This default is the whole safety property. The permissive version put the
     guarantee in the build script, so a wrong working directory, a renamed
     builder or a new page type would silently turn the control into a source
     of 404s in a deliverable somebody is evaluating. That is not hypothetical:
     the globber did default to the wrong directory, returned nothing, and the
     live pages were correct only because the working directory happened to be
     right. Same inversion as the reveals: only an option that has declared
     what it has may be offered beyond its homepage, exactly as only a page
     that has proved it can run the machinery may hide anything. The safe
     default belongs in the file that serves readers, not in the script that
     writes it. */
  var tag = document.currentScript || document.querySelector('script[data-b-pages], script[data-c-pages]');
  function built(key) {
    if (!tag) return [];
    var v = tag.getAttribute('data-' + key + '-pages');
    return v === null || v === undefined ? [] : v.split(/\s+/).filter(Boolean);
  }

  var wrap = document.createElement('nav');
  wrap.className = 'b-switch';
  wrap.setAttribute('aria-label', 'Design option');
  var html = '<label class="b-switch__l" for="b-switch-sel">Design option</label>' +
             '<select id="b-switch-sel" class="b-switch__s">';

  OPTIONS.forEach(function (o) {
    var to = base + o.seg + rest, label = o.label;
    /* Option A is the base: it is the complete site and every page in B or C
       is a redesign of a page that exists in it, so it needs no list. If that
       ever stops being true it needs one too. */
    var list = o.key === 'a' ? null : built(o.key);
    if (list && list.indexOf(rest) === -1) {
      to = base + o.seg + '/site/index.html';
      label += ' (homepage)';
    }
    html += '<option value="' + to + '"' + (cur === o.key ? ' selected' : '') + '>' +
            label + '</option>';
  });

  wrap.innerHTML = html + '</select>';
  document.body.appendChild(wrap);

  document.getElementById('b-switch-sel').addEventListener('change', function (e) {
    location.href = e.target.value + location.search + location.hash;
  });
})();
