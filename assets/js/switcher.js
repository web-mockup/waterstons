/* Design option switcher. Presentation chrome, part of neither design.
   Mapping is a pure string operation on the path, so it cannot drift
   out of sync with a lookup table. Hidden under ?clean=1 and in print. */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('clean') === '1') return;

  var path = location.pathname;
  // everything before /b/ or before the page tree is the deploy base
  var isB = /\/b\//.test(path) || /\/b$/.test(path);
  var base, rest;
  if (isB) {
    var i = path.indexOf('/b/');
    if (i === -1) { i = path.length - 2; }
    base = path.slice(0, i);
    rest = path.slice(i + 2) || '/';
  } else {
    var m = path.match(/^(.*?)(\/(?:site\/.*|index\.html)?)$/);
    base = m ? m[1] : path.replace(/\/[^/]*$/, '');
    rest = m ? m[2] : '/';
  }
  if (!rest || rest === '/') rest = '/index.html';
  var toA = base + rest;
  var toB = base + '/b' + rest;

  /* The mapping is a string operation, so it cannot drift out of step with a
     lookup table, but it also cannot know which Option B pages have been built.
     The build globs them off disk and writes them here, so the two never
     disagree and adding a B page needs no edit to this file. Where an Option B
     page does not exist, the control still works and says where it goes,
     rather than offering a route to a 404. */
  var tag = document.currentScript || document.querySelector('script[data-b-pages]');
  var built = tag && tag.getAttribute('data-b-pages');
  var bLabel = 'Option B: Show Your Working';
  if (built !== null && built !== undefined) {
    var list = built.split(/\s+/).filter(Boolean);
    if (list.indexOf(rest) === -1) {
      toB = base + '/b/site/index.html';
      bLabel = 'Option B: Show Your Working (homepage)';
    }
  }

  var wrap = document.createElement('nav');
  wrap.className = 'b-switch';
  wrap.setAttribute('aria-label', 'Design option');
  wrap.innerHTML =
    '<label class="b-switch__l" for="b-switch-sel">Design option</label>' +
    '<select id="b-switch-sel" class="b-switch__s">' +
      '<option value="' + toA + '"' + (isB ? '' : ' selected') + '>Option A</option>' +
      '<option value="' + toB + '"' + (isB ? ' selected' : '') + '>' + bLabel + '</option>' +
    '</select>';
  document.body.appendChild(wrap);

  document.getElementById('b-switch-sel').addEventListener('change', function (e) {
    location.href = e.target.value + location.search + location.hash;
  });
})();
