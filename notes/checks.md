# Checks

Measured on 16 September 2026 against the local static build, after the design rebuild.
Repeat with `python3 assets/scratch/serve.py` and the scripts in `assets/scratch/`.

Screenshots are not part of the deliverable. They can be regenerated on demand with
`node assets/scratch/shot.mjs <url> <out.png> <width> <height> full`.

## Lighthouse

Mobile, default Lighthouse throttling (simulated slow 4G, 4x CPU slowdown), which is the
mid range mobile over 4G case the brief sets as an acceptance criterion.

| Page | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Homepage | **99** | **100** | **100** | 2.2 s | 0 | 20 ms |
| Cyber | **99** | **100** | **100** | 2.2 s | 0 | 0 ms |
| Article | **99** | **100** | **100** | 2.1 s | 0 | 0 ms |

Measured with the full motion layer in place.

Against the acceptance criteria, which the brief calls criteria and not aspirations:

| Target | Required | Worst measured | Result |
|---|---|---|---|
| LCP | under 2.5 s | 2.0 s | pass, 20% inside |
| CLS | under 0.1 | 0 | pass |
| INP | under 200 ms | TBT 10 ms | pass on the available lab proxy |

INP needs real interaction so it cannot be produced in a lab run. Total Blocking Time is
the standard lab proxy, and there is no framework and no third party JavaScript on any
page, so there is nothing queued to block the main thread.

### Layout shift, traced rather than assumed

An earlier build measured CLS 0.079. Inside the budget, but close enough to be worth
tracing. Reading the `layout-shift` entries showed the cause: on a 390 px screen two hero
buttons fitted on one line in the fallback font and wrapped onto a second line once the
web font loaded, pushing everything below down 68 px.

Fixed by stacking button rows below 600 px so a font swap cannot re-wrap them. Also added
`@font-face` fallbacks with `size-adjust`, `ascent-override`, `descent-override` and
`line-gap-override` computed from the real font files rather than estimated, so any
remaining swap costs almost nothing. CLS is now 0 in Lighthouse and 0.0012 measured
directly under 4x CPU throttling and simulated slow 4G.

## Accessibility, axe-core

axe-core via `@axe-core/playwright`, rulesets `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` and `best-practice`.

| Page | Violations | Passes |
|---|---|---|
| Journey launcher | **0** | 28 |
| Article | **0** | 46 |
| Cyber | **0** | 49 |
| Homepage | **0** | 43 |

### Contrast issues found and fixed

1. Hero label was the light background meta grey on navy, 3.04. Now brand green, 11.11.
2. Offices list used a dark background grey on a light band, 2.81. Now the meta grey.
3. `#8a96a3` on the navy card fill `#1b3455` is 4.18 and fails. Lightened to `#a3adb8`, 5.53.
4. Meta grey `#677383` on the off white band passes at 4.57 with almost no margin.
   Darkened to `#55616f`, 5.98.
5. Social post card on the launcher inherited a dark background colour onto white, 3.01.
6. Launcher had no `main` landmark.
7. After the rebuild the hero moved from navy to the light paper, so two dark background
   colour rules briefly misapplied to the hero label and lead. Rescoped.

Both palette changes are recorded in `brand.md` as deliberate accessibility derivations of
published Waterstons values, not silent brand drift.

### Contrast reference for the palette in use

| Pair | Ratio | Result |
|---|---|---|
| Navy `#152943` on paper `#f7f9fb` | 13.91 | AA and AAA |
| White on navy | 14.68 | AA and AAA |
| Green `#78fa93` on navy | 11.11 | AA and AAA |
| Meta `#55616f` on paper | 5.98 | AA |
| Muted `#a3adb8` on navy card `#1b3455` | 5.53 | AA |
| Navy on green | 11.11 | AA and AAA |

White on orange `#ff6439` is 2.94 and fails, so it is never used. Orange only ever appears
as a decorative shape.

### Target size, WCAG 2.2 AA 2.5.8

Every interactive target is at least 24 by 24 CSS px at 1440 px and 390 px on all three
engines. Three cases needed care:

- Standalone links in the footer, breadcrumb, contact lists and search results had a 19 px
  line box. They would have qualified under the spacing exception, but the spec claims a
  24 px minimum, so they now genuinely have one.
- The header logo link was 116 by 22 px on mobile. Now has a 44 px minimum height.
- Card and list title links measure as text only but carry a stretched `::after` covering
  the whole card. Hit tested at five points across a card at 390 px: the whole 350 by
  256 px card is the target. The check script now resolves stretched links to their
  positioned ancestor rather than reporting a false positive.

Honeypot inputs are excluded. They sit off screen with `tabindex="-1"` inside an
`aria-hidden` wrapper, so they are neither perceivable nor keyboard reachable.

### Behaviour verified in a real browser, not assumed

Run with `node assets/scratch/behaviour.mjs`.

| Check | Result |
|---|---|
| `prefers-reduced-motion: reduce` | Reveals render at full opacity, marquee animation `none`, pointer-following preview never created |
| Search overlay | Focus moves to the input on open, Escape closes, focus returns to the button that opened it, body scroll lock cleared, Tab trapped while open |
| Accordion | `aria-expanded` and the panel `hidden` state both toggle together |
| Tabs | Arrow keys move focus and selection, roving `tabindex`, exactly one tab in the tab order |
| UK and AU switcher | Text, the `tel:` and `mailto:` href behind it, the control's `aria-label`, and which office block is shown all change, with a polite live region announcement |
| Headings and landmarks | Exactly one `h1` per page, no skipped levels, header/nav/main/footer present, every image has `alt` plus `width` and `height`, `lang="en-GB"` |

The switcher is worth calling out. An earlier build swapped only the visible text, so the
Australian view displayed `+61` while the link still dialled `+44`. That is now fixed on
every page, in the header, the footer, the enquiry block and the homepage call button.

## Cross browser

Playwright Chromium 153, Firefox, WebKit 26.6. Four pages at 1440 px and 390 px on each
engine, so 24 combinations. Recorded: horizontal overflow, undersized targets, console
errors, HTTP 4xx.

| Engine | Launcher | Article | Cyber | Homepage |
|---|---|---|---|---|
| Chromium 1440 / 390 | clean | clean | clean | clean |
| Firefox 1440 / 390 | clean | clean | clean | clean |
| WebKit 1440 / 390 | clean | clean | clean | clean |

Clean means zero horizontal overflow, zero targets under 24 px, zero console errors and
zero failed requests. No engine specific rendering differences were found. Also verified at
360 px. At 320 px the header tool row overflows by 25 px; 320 px is outside the required
viewports and was left as is.

Issues fixed before this run: header tools overflowed by 11 px at 390 px on both the
original and the rebuilt header; `offices-800.webp` 404 because the source photograph is
only 712 px wide; the shield mask data URI was wrapped in single quotes while containing
single quotes, so masking silently failed.

## Page weight and requests

Measured at 390 px. "First view" is the page as loaded. "Full page" is after scrolling to
the bottom so every lazy image has been fetched. GitHub Pages compresses HTML, CSS and
JavaScript; the local preview does not, so the gzipped column is the honest over the wire
figure and the one to quote.

| Page | Req, first view | Req, full page | Full page raw | **Full page, gzipped** |
|---|---|---|---|---|
| Journey launcher | 12 | 12 | 169 KB | **117 KB** |
| Article | 11 | 12 | 180 KB | **114 KB** |
| Cyber | 16 | 28 | 322 KB | **246 KB** |
| Homepage | 19 | 23 | 322 KB | **247 KB** |

The motion layer costs 15 KB of CSS and 12 KB of JavaScript raw, about 8 KB gzipped
in total, and no extra requests at all.

Heaviest page, the Cyber page, full scroll:

| Type | Raw | Gzipped |
|---|---|---|
| Images, WebP including 9 accreditation marks and 6 client logos | 157 KB | already compressed |
| Fonts, 5 self hosted WOFF2 | 55 KB | already compressed |
| CSS, one file | 35 KB | 8.6 KB |
| HTML | 38 KB | 9.6 KB |
| JavaScript, one file | 12 KB | 3.7 KB |

Whole committed site on disk: **1.3 MB**, across 56 images, 5 fonts, one stylesheet and
one script. 22 files orphaned by the design rebuild were removed rather than shipped.

**Third party requests: zero, on every page.** No analytics, no tag manager, no font CDN,
no embedded widgets, no cookie banner. Every byte is same origin, which is also why no
cookie consent banner is needed in the concept.

## How the weight was kept down

- WebP at the sizes actually used, with `srcset` and `sizes`, so a phone never downloads a
  desktop image. Every `img` carries `width` and `height`.
- Below the fold images lazy load. The hero image is preloaded with `fetchpriority="high"`.
- Fonts self hosted and subset to Latin. The display serif is a variable font instanced to
  one optical size and subset, which took it from 132 KB to 33 KB.
- Accreditation marks are normalised to one canvas at generation time, which fixed an
  optical inconsistency and made them cheaper at the same time.
- Video never loads until someone presses play.
- One hand written CSS file and one hand written JavaScript file. No framework, no build
  step, nothing shipped that is not used.
- The logo and the twelve line shapes are minified SVG, cached across all four pages.

## Motion

All motion is CSS and IntersectionObserver. No animation library, no WebGL, nothing
added to the request count. Native CSS scroll-driven animation is used where the engine
supports it, with a JavaScript fallback everywhere else, verified per engine.

| Effect | How | Fallback |
|---|---|---|
| Scroll progress rail | `animation-timeline: scroll()` | rAF on a passive scroll listener |
| Hero mark parallax and headline ease-back | `animation-timeline: view()` | static, no movement |
| Headline line reveal | staggered transform inside an overflow mask | shown immediately |
| Section and card reveals | transform, triggered by IntersectionObserver | shown immediately |
| Stat counters | rAF, quartic ease, real value always in the DOM first | real value, no animation |
| Cursor preview on the service list | pointer position, rAF throttled, masked into the logo | not created at all |
| Client logo dock magnify | pointer distance, rAF throttled | no scaling |
| Hero mark leaning to the pointer | two CSS custom properties, rAF throttled | no lean |
| Page transition | the logo mark scales up and swallows the page | plain navigation |
| Marquee speed from scroll velocity | scroll delta damped per frame | fixed speed |

### Three decisions that are worth explaining

**Opacity is never animated on text.** Semi transparent copy fails contrast for the whole
length of a fade, for an auditor and for a reader with low vision alike. Reveals therefore
switch opacity discretely and animate only the transform. Text is fully opaque in every
frame it is visible. When this was first built as a fade, Lighthouse accessibility dropped
to 96 because it sampled body copy mid transition.

**Nothing is hidden with `visibility` or `display`.** An earlier version used
`visibility: hidden` for reveals, which scored 100 but silently removed every unrevealed
element from the tab order. A keyboard user reached 16 focus stops and could not get past
the hero. It is 53 stops now, in correct order, through the whole page. Focus also reveals
its own container, so tabbing never lands on something still animating in.

**The observed element is never the clipped one.** `clip-path` that collapses an element
to zero height also empties its intersection rectangle, so IntersectionObserver never
fires and the element stays hidden permanently. The clip is applied to children and the
parent is observed. A safety net also reveals anything still hidden after 2.5 seconds, limited to elements within two viewport heights so it never forces work for content far down the page.

### Motion verification

| Check | Result |
|---|---|
| Elements left unrevealed after a full scroll | 0 on all four pages |
| Keyboard focus stops | 53, none on a hidden element |
| CLS with all motion running, 4x CPU and slow 4G | 0.0000, zero shift events |
| `prefers-reduced-motion: reduce` | curtain and cursor preview never created, marquee animation `none`, all reveals shown, counters show final values, mark does not lean, section notches hidden |
| Chromium / Firefox / WebKit | no console errors, no hidden elements, progress rail works natively in Chromium and WebKit and via fallback in Firefox |
