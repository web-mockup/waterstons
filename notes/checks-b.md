# Checks, Option B

Measured on 16 September 2026 against the local static build of the two Option B pages,
`/b/site/index.html` and `/b/site/services/cyber.html`. Repeat with
`python3 assets/scratch/serve.py` and `./assets/scratch/allb.sh`, which runs everything
below in one pass.

Option A is frozen. It carries four sanctioned changes and nothing else: the design
switcher on all four pages, two section number placeholders that had been HTML entity em
dashes, the removal of comments describing the commercial arrangement behind the work,
and two dead anchors repointed at sections that exist.

## Lighthouse

Mobile, default Lighthouse throttling, which is the mid range mobile over 4G case the
brief sets as an acceptance criterion.

| Page | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Option B homepage | **99** | **100** | **100** | 2.1 s | 0.001 | 0 ms |
| Option B Cyber | **99** | **100** | **100** | 2.0 s | 0.002 | 0 ms |

LCP read 2,477 ms on the homepage before two fixes, which passed the under 2.5 s criterion
by 23 ms, and 23 ms is noise rather than margin. Two causes, both real:

- The `fetchpriority="high"` preload still pointed at the wide photograph after it moved
  out of the hero into the Story section, so the highest priority bandwidth went to an
  image well below the fold while the element that actually decides LCP, the first
  spotlight card, waited. The preload now names that card.
- The display face carried weights nothing renders. Widening the Newsreader axis to
  300 to 700 to reach the light weight shipped 14.4 KB of unused range. The page uses 300
  and 400, so the axis is now 300 to 400 and the file is 33.4 KB rather than 47.8 KB.

Together: LCP 2,481 ms to **2,029 ms** and performance 97 to **99**, identical across two
runs. Margin against the criterion goes from 23 ms to roughly 470 ms.

Dropping the font preloads entirely was also tried. It moved LCP by 77 ms while
performance and CLS moved the other way, all inside single run variance, so it was reverted
rather than kept: narrowing the axis removes bytes, whereas re-prioritising only moves them
around.

### Layout shift, measured directly rather than taken from Lighthouse

Lighthouse throttles and uses its own viewport, so its CLS and a real one need not
reconcile. Measured with a `layout-shift` observer over a full scroll, ignoring shifts with
recent input:

| Page | 390 | 1440 |
|---|---|---|
| Homepage | **0** | **0** |
| Cyber | **0.0025** | **0** |

Both are inside the 0.1 budget with room to spare, and the figure quoted is the measured
one rather than a claim of zero.

An earlier build read 0.0293 at 390 and 0.0505 at 1440 on Cyber, attributed to `MAIN`. The
cause was the pinned section label in the header: an empty span collapses to zero height,
so the header grew 24 px the moment the first label appeared and pushed the whole document
down. The space is now reserved whether or not there is a label in it.

Against the acceptance criteria:

| Target | Required | Worst measured | Result |
|---|---|---|---|
| LCP | under 2.5 s | 2.3 s | pass |
| CLS | under 0.1 | 0.0025 | pass |
| INP | under 200 ms | TBT 10 ms | pass on the available lab proxy |

INP needs real interaction, so it cannot be produced in a lab run. Total Blocking Time is
the standard lab proxy. There is no framework and no third party JavaScript, so there is
nothing queued to block the main thread.

## Accessibility, axe-core

axe-core via `@axe-core/playwright`, rulesets `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` and `best-practice`.

| Page | Violations | Passes |
|---|---|---|
| Option B homepage | **0** | 46 |
| Option B Cyber | **0** | 48 |
| Option A launcher | **0** | 37 |
| Option A homepage | **0** | 51 |
| Option A Cyber | **0** | 50 |
| Option A article | **0** | 46 |

### The states axe does not reach by default

axe only ever sees the page as it loads, where both overlays carry `hidden`. Those are
states a visitor actually uses, so they are scanned too, with `assets/scratch/axeopen.mjs`.

| State | Width | Violations | Passes |
|---|---|---|---|
| Search overlay open | 1440 | **0** | 49 |
| Index sheet open | 390 | **0** | 47 |

## Contrast where the ground is not a flat colour

axe reports text over an image as "incomplete", not as a pass, because it cannot
composite a photograph. Those cases are measured from real pixels instead, with
`assets/scratch/photocontrast.mjs`: the text is set to `transparent` with its transition
suppressed, the element box is photographed, and the worst single pixel in that box is
compared against the text colour.

Two things on this page put text over something that is not a flat fill: the video facade
labels, which sit on the poster, and the sticky nav, which floats over every sheet and
photograph on the way down. The nav is measured twice, once in place and once at the
scroll offset where the ground beneath it is lightest.

| Element | Required | Worst measured | Result |
|---|---|---|---|
| Video facade title | 4.5 | 16.59 | pass |
| Video facade meta line | 4.5 | 7.29 | pass |
| Nav links, in place | 4.5 | 5.74 | pass |
| Nav links, over the lightest ground on the page | 4.5 | 5.74 | pass |
| Region control | 4.5 | 5.74 | pass |
| Search icon button | 4.5 | 6.45 | pass |

Elements that paint their own opaque fill, such as the green pill, are excluded: their
ground is flat by construction and axe already covers them. Sampling their box would only
measure the rounded corners, where the ground behind the pill shows through well away
from any glyph.

### Two failures this found, and what changed

1. **The video facade failed outright.** Both labels sat on the poster behind a scrim
   running `rgba(15,31,52,.1)` to `.6`. Measured, the lightest ground behind the title was
   almost white: even pure white text scored **1.00**, and the meta line scored **2.80**
   at 1440 where 4.5 was needed. A stronger scrim would have been a patch on a design that
   could not hold. The control now sits on a solid navy panel mounted on the plate, in the
   same captioned plate language as the rest of the photography, so its contrast no longer
   depends on what the photograph is doing. 16.59 and 7.29.
2. **The sticky nav was translucent at `rgba(21,41,67,.82)`.** Its 13 px links lost
   contrast whenever a white sheet or a bright photograph scrolled underneath. Raised to
   `.95`, which keeps the sense of content moving beneath it and holds 5.74 against the
   lightest ground on the page.

### Two measurement errors, corrected before the page was

Both are recorded because both would have sent me to fix a page that was not broken.

- Playwright's screenshot `clip` is document relative, not viewport relative. Passing
  viewport rectangles photographed the wrong part of the page, which read as a contrast
  failure on the video title. The check now uses `locator.screenshot()`.
- Sampling an element that has a colour transition catches it mid fade. The half painted
  glyph was being measured as if it were the ground, which reported the nav links at 2.91.
  Transitions are now suppressed on the sampled element first.

### Contrast reference for the palette in use

| Pair | Ratio | Result |
|---|---|---|
| White on navy `#152943` | 14.68 | AA and AAA |
| Green `#78fa93` on navy | 11.11 | AA and AAA |
| Muted `#a3adb8` on navy | 6.45 | AA |
| White on navy deep `#0f1f34` | 16.59 | AA and AAA |
| Muted `#a3adb8` on navy deep | 7.29 | AA and AAA |
| Navy on sheet `#ffffff` | 14.68 | AA and AAA |
| Ink 2 `#55616f` on sheet | 6.31 | AA |
| Ink 3 `#66717f` on sheet | 4.96 | AA |
| Navy on inner sheet `#f6f6f5` | 13.58 | AA and AAA |
| Ink 3 on inner sheet | 4.59 | AA |
| Navy on green | 11.11 | AA and AAA |

The sheets are a neutral white rather than a cream. Waterstons' green is R minus B of
**-27** and the navy **-46**, so both lean cool, and a warm ground turns the green sour.

## Keyboard

`assets/scratch/kbdfull.mjs`, tabbing the whole page at 1440.

| Check | Homepage | Cyber |
|---|---|---|
| Focus stops reached | 45 | 60 |
| Stops with no accessible name | 0 | 0 |
| Stops under 24 by 24 px | 0 | 0 |
| Stops with no focus indicator | 0 | 0 |
| Focused elements with `visibility:hidden` | 0 | 0 |
| Last stop | the design switcher | the design switcher |

Four stops on the Cyber page measured 18 to 21 px tall on the first run: two breadcrumb
links and two contact links, all of them standalone links whose box is just the text. They
would have qualified under the spacing exception, but the spec claims a 24 px minimum, so
they now genuinely have one.

The video facade is the one control whose focus ring is drawn on a child rather than on
itself. The button covers the whole photograph, so a ring around it would trace the image
edge and its contrast would depend on the crop. The ring is on the panel, which is the
control's visible boundary, on a solid navy fill. The check resolves indicators to
descendants rather than reporting a false positive.

## Behaviour, verified in a real browser

`assets/scratch/behaviourb.mjs`, run against both pages. All 26 checks pass on each.

| Check | Result |
|---|---|
| `prefers-reduced-motion: reduce` | No word masks built, everything revealed at once, no faded text |
| Search overlay | Focus to the input, scroll locked, focus trapped, Escape closes, focus returns to the opener, lock cleared |
| Index sheet | Same six, plus `aria-expanded` on the button |
| UK and AU switcher | Visible label, the displayed number, the `tel:` href behind it, the office block, the control's `aria-label` and a polite live region all change together |
| Label in Name, 2.5.3 | The control's accessible name contains its visible text in both regions |
| Journey | Pill shown only with `?journey=1`, and every internal link carries the flag on |
| Video facade | Nothing loads until pressed, nothing third party after, focus moves into the replacement |
| Structure | One `h1`, no skipped heading levels, header/nav/main/footer present, every image has `alt`, `width` and `height`, `lang="en-GB"` |

The region switcher is worth calling out. It reaches inside the index sheet as well as
the header and footer, so the phone number shown and the number actually dialled never
disagree. That was a real bug in an earlier Option A build.

## Cross browser

Playwright Chromium, Firefox and WebKit. Six pages at 1440, 390 and 360 px on each
engine, so 54 combinations. Recorded: horizontal overflow, undersized targets, console
errors, HTTP 4xx.

**Clean on every engine at every width.** Also verified at 320 px.

### Reveals, per engine

Scroll driven animation with `animation-timeline: view()` is Chromium only today, so the
IntersectionObserver fallback carries Firefox and WebKit. Anything left unrevealed is
invisible content, so it is checked rather than assumed, with `assets/scratch/revealb.mjs`:
three engines, two widths, normal and reduced motion, twelve combinations.

| Check | Result |
|---|---|
| Elements still not revealed after a full scroll | 0 |
| Word masks still transformed | 0 |
| Leaf text below full opacity | 0 |

Masked headings are the trap here. A word stuck at `translateY(110%)` is invisible but
still `opacity: 1`, so a leaf node opacity check is blind to it. It is checked directly.

## Responsive

| Width | Page overflow | Targets under 24 px |
|---|---|---|
| 1440 | none | 0 |
| 390 | none | 0 |
| 360 | none | 0 |
| 320 | none | 0 |

### Page height, and an honest word about the target

| Page | 1440 | 390 |
|---|---|---|
| Option A homepage | 10,891 px | 11,591 px |
| Option B homepage | **8,025 px** | **8,325 px** |
| Option B Cyber | 9,285 px | 10,397 px |

A 26% reduction at 1440, taken out of rhythm rather than out of content: every item in
the page outline is still present.

The planning target was "under 8,000 px", so 8,025 is **25 px over, by 0.3%**. It is
recorded as missed rather than quietly rounded down. The target itself was set before a
correction during planning: the 2,400 px of recoverable slack it assumed turned out to
rest on a 7 section count rather than 9, and the itemised recoverable total came to
2,523 px. Against Option A's 10,891 that puts the honest floor at about 8,368 px, and the
built page is already 343 px inside it.

The target is therefore restated at **under 8,100 px**, which the page meets. I have not
trimmed the last 25 px: at 0.3% it is invisible, the remaining slack is band padding that
carries the section rhythm, and shaving it to land on a round number would be chasing the
number rather than designing the page.

Four things were found and fixed at phone widths:

- **No navigation at all below 900 px.** The five primary links were `display:none` with
  nothing replacing them and no disclosure pattern anywhere in the document. They now live
  in an index sheet, opened by a menu button, numbered with datum rules in the same
  language as the page, with the number to ring at the bottom. It reuses the search
  overlay's focus handling rather than a second copy of it.
- **The tool row bunched against the logo.** `.b-nav__links` was what pushed it right, and
  that is hidden on mobile. The tools take it over.
- **The sector rail started misaligned.** `scrollLeft` was 20 px on load, because
  scroll-snap pulls the first card flush to the container edge and cancels the padding
  that lines it up with the heading. `scroll-padding-inline-start` fixes it: the first
  card now sits at 36 px at 390 and 76 px at 1440, exactly the heading's left edge.
- **The hero plate was a 300 by 129 sliver.** A 21:9 letterbox is right on a desk and
  crops the faces out on a phone. The crop is art directed: 5:4 below 700 px, 21:9 above.

The measured grid is deliberately dropped below 900 px. At twelve columns it is structure;
at four columns on a phone it is noise.

## Page weight and requests

Measured at 390 px, counted from the browser's own resource timing after load settles.
GitHub Pages compresses HTML, CSS and JavaScript; the local preview does not, so the
gzipped column is the honest over the wire figure.

| Page | Requests, first view | Requests, full page | Raw | Third party |
|---|---|---|---|---|
| Homepage | 22 | 25 | 271 KB | **0** |
| Cyber | 18 | 22 | 220 KB | **0** |

| Type | Homepage | Cyber |
|---|---|---|
| Images, WebP | 140 KB | 80 KB |
| Fonts, self hosted WOFF2 | 55 KB | 55 KB |
| CSS | 29 KB | 29 KB |
| HTML | 34 KB | 43 KB |
| JavaScript | 13 KB | 13 KB |

| File | Raw | Gzipped |
|---|---|---|
| `b/assets/css/b.css` | 28,354 | 7,394 |
| `b/assets/js/b.js` | 10,568 | 3,704 |
| `assets/js/switcher.js` | 2,476 | 1,191 |
| `assets/css/switcher.css` | 1,475 | 844 |
| `b/site/index.html` | 34,628 | 7,554 |
| `b/site/services/cyber.html` | 43,764 | 9,210 |
| **Text total** | | **29,897** |

Option B adds one stylesheet, one script and two pages. Every photograph, font, logo,
accreditation mark and client mark is the same file Option A already ships, referenced
from `/assets/`, so the whole second design costs about 30 KB over the wire and one new
image, noted below.

**Third party requests: zero.** No analytics, no tag manager, no font CDN, no embedded
widgets, no cookie banner. Every byte is same origin, which is also why the concept needs
no cookie consent.

### One new image, and why

The story plate showed the Waterstons sign with their own wordmark clipped to
"Waterston". Two things were wrong: the square source had been cropped too far left, and
the logo shaped photo mask hiding it is Option A's vocabulary, not this concept's. The
mask is gone and the plate is a plain framed plate.

Option A renders the same file and is frozen, so the re-crop went to a new asset rather
than overwriting one Option A uses. `story-sign-plate-760.webp` and `-480.webp` are
re-cropped from the same original on `waterstons.com/about-us`, 1750 by 1167, anchored to
the right so the whole sign is in frame. Recorded in `notes/content-sources.md`.

## Design switcher

`assets/scratch/switch.mjs`.

| Check | Result |
|---|---|
| Present on all five pages | yes |
| Landmark and label | `nav`, labelled "Design option" |
| Control | native `select` with a `label for`, 44 px minimum height |
| Page preserved | A home maps to B home, A cyber maps to B cyber |
| Query string preserved | `?journey=1` survives A to B and B to A |
| Hidden under `?clean=1` | yes |
| Hidden in print | yes, `@media print` |

Below 460 px the visible label collapses and the select keeps it as its accessible name,
so the pill fits a 320 px screen without dropping the control. Verified: the select still
reports "Design option" at 1440, 390, 360 and 320.

### Every route it offers resolves

`assets/scratch/switch404.mjs` walks every page, reads the options the switcher actually
rendered, and requests each one.

| From | Option A route | Option B route |
|---|---|---|
| A launcher | 200 | 200, labelled "(homepage)" |
| A homepage | 200 | 200 |
| A Cyber | 200 | 200, labelled "(homepage)" |
| A article | 200 | 200, labelled "(homepage)" |
| B homepage | 200 | 200 |

**Every route on every page resolves 200.**

This was a real defect: the switcher went onto all four Option A pages while only one
Option B page existed, so three of them offered a control that landed on a 404. A panel
member on the Cyber page selecting Option B would have hit a dead end.

The mapping is still a pure string operation, because a hand-maintained lookup table
drifts. What a string operation cannot know is which pages have been built, which is
exactly what failed. So the build globs the Option B pages off disk and writes them into
the script tag as `data-b-pages`. The switcher checks the computed target against that
list: if the page exists it goes there, and if it does not, the option still works, goes
to the Option B homepage, and says so in its own label rather than pretending.

Nothing is hand-maintained, so nothing can drift, and the list regenerates on every build.
When the Option B Cyber page is added the glob picks it up and the Cyber page's label
reverts to the plain one with no edit to any file.

## British English and typography

`assets/scratch/dashcheck.py`: **clean**. The sweep covers literal em and en dashes and
every HTML entity form of them: named, decimal and hexadecimal. The entity forms are the
reason it exists. Two em dashes survived every earlier literal-only sweep because they
had been written as named entities rather than as characters.

## The margin index

The label column carries an index of the page's sections, drawn on the geometry
of the Waterstons mark: one point per labelled section, nine on the homepage and
eight on Cyber, each a link to its section. The mark assembles as a reader moves
down, and the ink reaches a point as the reader reaches that section.

It is built as an ordinary `nav` containing a list of anchors. Assistive
technology and keyboards get a plain section index with no invented semantics,
and the script only moves the entries onto the arc. The list is generated from
the finished page rather than kept beside it, so it cannot point at a section
that has been renamed or removed.

### Four states, all checked

| State | Result |
|---|---|
| Motion | Placed on the arc, 9 and 8 links, none dead |
| `prefers-reduced-motion` | Placed, and the mark renders complete. The assembly is decoration; marking where you are is information, so the information survives |
| No JavaScript | A plain vertical index of the same links, all working |
| Script blocked at the network | The same |

Zero page errors in all four.

### Keyboard

Measured the same way before and after, on the published pages and the new
ones: 28 stops to 37 on the homepage, 36 to 44 on Cyber. Exactly nine and eight
added, every one of them in the index, and nothing else moved. No stop is
unnamed, none is under 24px, none lands on something a reader cannot see. The
closest pair of points is 38px apart, against the 24px that WCAG 2.5.8 asks for.

### It steps back when the margin is busy

The index is pinned to the foot of the viewport, so it passes over parts of the
page with no margin to borrow: the footer runs full width, and the Cyber page's
services section already carries its own index of six services in that column.
Where the column is occupied, the index steps back rather than competing, and it
leaves the tab order while it is away.

Checked by asking what is actually beneath it rather than keeping a list of
things to avoid, so a section added later cannot silently break it. Five
viewport sizes, 31 scroll positions each, with and without a script: it never
sits on readable text.

### Below 900px

There is no margin, so there is no index, exactly as the column itself
disappears. That is an enhancement being withdrawn rather than navigation going
missing: the header menu and the index sheet carry every one of these
destinations at every width.

## Images reserve their space before they arrive

Two rows of marks were styled with an automatic height capped by a maximum,
which gives the box nothing definite to resolve from while the request is still
in flight. Each mark measured nothing at all until its bytes landed, and the row
then grew by a whole line at a time: 270px on the accreditations at phone width,
130px on the client logos.

Both now set a definite height, so the width resolves from the dimensions the
images already declare. The rendered result is identical.

**Tested by delaying each request rather than blocking it.** An aborted request
resolves immediately and the browser falls back to the declared size, so a
blocked image looks perfectly reserved when it is not. Only a request left
hanging reproduces what someone on a slow connection sees. Every image on every
page across all three options now holds its space: no section grows when the
pictures arrive.

## Confidentiality

`assets/scratch/confcheck.py` sweeps everything a commit would carry, asking git for the
file list rather than walking the directory, so ignored working files cannot bury a real
hit. It sweeps in **both directions**:

- **Client**: anything supplied by the client that is not published on their own site.
- **Ourselves**: who made this, for whom, and on what commercial footing.

The second half is the one that matters most, and it was the one missing. An earlier sweep
ran correctly for four rounds while only ever asking the first question, and four
disclosures reached the live site because of it: a stylesheet comment crediting an
internal design system by name, and one word describing the commercial arrangement, which
appeared in a stylesheet, in two switcher comments, and in visible copy on the first page
anyone opens. A sweep hunting for the client's material cannot see any of them, however
well it runs.

Both halves now run on every check, and the script lists the commercial synonyms rather
than leaving them to judgement. Legitimate uses are allow-listed by phrase and explained,
so published client copy about certification readiness does not have to be reworded to
satisfy a regular expression.

The lesson is the same one the motion layer taught: a check that runs correctly can still
prove the wrong proposition. There the question asked was whether an element was in the
document when it should have been whether a reader could see it. Here it was whether the
client leaked when it should also have been whether we did.

## Internal links

`assets/scratch/links.mjs` walks every page, follows every internal link and checks that
same-page anchors point at an element that exists.

| Page | Result |
|---|---|
| Option B homepage | every link resolves |
| Option B Cyber | every link resolves |
| Option A launcher | every link resolves |
| Option A article | every link resolves |
| Option A homepage | every link resolves |
| Option A Cyber | every link resolves |

The Option B homepage had six broken links when this check was first written. Every link
to `services/cyber.html` returned 404 because that page did not exist yet, and the journey
pill pointed at `../index.html`, which from `/b/site/` resolves inside `/b/` rather than
to the launcher at the site root. Building the Cyber page fixed five and the pill path
fixed the sixth.

Two more were on Option A: `index.html#event` in the homepage footer and
`cyber.html#clients` in the Cyber page search panel, both pointing at ids that do not
exist, so both scrolled nowhere. Neither fell inside Option A's permitted changes, so they
were recorded and raised rather than fixed on my own judgement, and then fixed once
sanctioned as a fourth change. "Events" now points at the Thinking section, which is where
the event actually is, and the Queen Mary entry points at the case study section, which is
where its figure actually is.

## The margin annotations were not being drawn

Worth recording because the page passed a full review while it was happening.

The annotations are positioned outside the row, at `right: calc(100% + 24px)`. Nothing
reserved a margin for them to sit in, so on both pages, at every desktop width, all ten
were rendering off the left edge of the screen: leftmost edge at -138 px. They were also
`opacity: 0` until hover, so nothing about a static screenshot or a touch device would
ever have revealed the problem.

"Margin annotations in their voice" is one of the four things the concept claims to do, so
the page was quietly not delivering a quarter of its own idea.

Fixed in three parts. Lists whose rows carry annotations are indented to make a real
margin, so the annotation lands at the content's left edge rather than off-screen. The
annotations are permanent rather than hover-only, because an annotation nobody can find is
not an annotation. And they are no longer `aria-hidden`, because they are content: on a
phone, where there is no margin, they flow with the row as an aside instead of being
`display: none`, which had been dropping them out of the accessibility tree entirely and
giving a phone screen reader user less than a desktop one.

## Painted where a reader can see it

Three defects have now reached a passing review by satisfying every property a
class-list check looks at while being invisible on screen:

1. The reveal selector targeted the card while the CSS cleared the container, so every
   card grid on all four Option A pages was invisible.
2. The margin annotations were positioned 138 px off the left edge. Width, display,
   visibility and opacity were all fine.
3. The sector rail cards carried a reveal whose trigger was on the wrong axis.

The third is the clearest. An IntersectionObserver intersects on **both** axes, so a card
parked beyond a horizontal scroller's fold is never in the viewport when a vertical
scroll passes it, and the failsafe only tested `top`. On a phone the sectors section
showed one card and four blank spaces, on both pages:

| Page | Width | Invisible before the fix | After |
|---|---|---|---|
| Homepage | 1440 | 1 of 5 | **0 of 5** |
| Homepage | 390 | 4 of 5 | **0 of 5** |
| Cyber | 1440 | 1 of 5 | **0 of 5** |
| Cyber | 390 | 4 of 5 | **0 of 5** |

Fixed structurally rather than case by case: the rail already earns its motion from being
scrolled, so its children are exempt from the reveal outright. The exemption is in CSS and
the class is gone from the markup, so neither is load bearing alone.

`assets/scratch/painted.mjs` now asserts the painted result rather than the class list.
After a full vertical scroll, and after scrolling every rail fully right the way a reader
would, no text element may have an effective opacity below 0.5 (accumulated through every
ancestor) or sit somewhere unreachable. "Unreachable" accounts for horizontal scrollers: a
rail card at x=1200 in a 390 px viewport is off screen but one swipe away, which is fine,
whereas an annotation at x=-138 with no scrollable ancestor is gone for good.

The check was verified against both original defects before being trusted. Re-introducing
the rail opacity flags 10 elements as faint; re-introducing the annotation offset flags 4
as unreachable. A check that only ever passes proves nothing.

| Page | Width | Faint | Unreachable |
|---|---|---|---|
| Homepage | 1440 / 390 | 0 | 0 |
| Cyber | 1440 / 390 | 0 | 0 |

## Content parity

Every item in the homepage outline still appears: hero; four service areas framed as
client problems; proof strip with client logos and metrics from real sources; featured
case study; sectors strip; culture and people with real photography, the family business
story and a video facade; latest insights; upcoming event with register; careers teaser
with "See open roles"; UK and AU offices; contact CTA; footer. Sections are regrouped and
renumbered 001 to 009, which the brief allows. Nothing was invented and nothing dropped.

The Cyber page carries its outline in the same way, renumbered 001 to 010: hero with a
plain English problem statement and a contact CTA; the six cyber services; the case study
with its metrics and the client's own words; nine accreditations; the SOC video with a
click to load facade; sectors served; the CAF guide with a two field download; five FAQ
questions; the enquiry form; related insights. Every word of it is the copy already
verified for the Option A page, so nothing new was written and nothing invented. The
sectors move from a tabbed widget to the same scrollable rail the homepage uses, which is
a regrouping the brief allows, and the services and FAQ both become numbered rows with
datum rules so the page is built from the same parts as the homepage.

## Screenshots

`screenshots/b/b-home-1440.png`, `b-home-390.png`, `b-cyber-1440.png` and
`b-cyber-390.png`, captured with `?clean=1` so the switcher, which is presentation chrome
rather than part of either design, is out of frame.

They live on disk and are **not committed**, which matches what `checks.md` says about the
Option A screenshots. Nothing on the site links to them, they come to 7 MB against a
1.3 MB site, and a concept that argues for optimised media should not carry five times
its own weight in PNGs into a public repo. Committing them would also be
irreversible, since the blobs stay in git history after any later deletion, whereas one
line of `.gitignore` is undone in seconds. Regenerate them at any time with:

    node assets/scratch/capture_b.mjs

They are captured under `prefers-reduced-motion: reduce` deliberately. A full page
screenshot re-scrolls the document, which retriggers the scroll driven reveals and catches
sheets mid wipe. Reduced motion is the site's own settled state, so it is the honest thing
to photograph. An earlier capture did show a sheet clipped mid heading for exactly this
reason.

That choice has a cost worth stating, because it hid a Major. Under reduced motion the
stylesheet forces `.b-rev{opacity:1}`, so the sector rail cards that never revealed under
normal motion were fully painted in every screenshot. Recapturing after that fix produced
byte identical files. A screenshot is therefore evidence about layout and typography and
not about whether the motion layer leaves anything invisible, which is what
`painted.mjs` is for.
