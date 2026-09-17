# Checks, Option C

Option C is the scroll narrative, so most of what matters about it does not
exist at rest. A screenshot of a pinned act is a picture of one frame of it,
and computed styles on a loaded page say nothing about what happens at 40 per
cent of the way down. So the checks here sample through the scroll and assert
the painted result rather than the class list.

Two pages: the homepage and the Cyber page. Everything below is measured, and
where a number is quoted it came from a run rather than an estimate.

## Lighthouse

| | Performance | Accessibility | Best practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Homepage | 99 | 100 | 100 | 1.8s | 0 | 0ms |
| Cyber | 99 | 100 | 100 | 1.8s | 0 | 0ms |

Mobile emulation, 412 x 823, throttled to 1.6Mbps with a 4x CPU penalty, which
is Lighthouse's default and harsher than most real phones.

### The fonts the page preloads are the fonts first paint renders

Preloading is only useful if it names what the first screen actually needs.
Measured on both pages: which families and weights render above the fold,
against which files are preloaded.

Rendered above the fold: Newsreader 300, Poppins 400, Poppins 600.
Preloaded: `newsreader-var.woff2`, `poppins-400.woff2`, `poppins-600.woff2`.

Across both pages the rendered set is Newsreader 300 and Poppins 400, 500 and
600, and every one of those has a declared `@font-face`. Nothing renders at a
weight with no face behind it, so nothing is synthesised.

### Layout shift, measured directly

Lighthouse reports a single number after the fact. This observes
`layout-shift` entries with their sources, at 360, 375, 390, 412, 1024 and
1350 wide, unthrottled and again at 1.6Mbps with a 4x CPU penalty, through a
full scroll to the foot and back.

Zero shifts, every combination, both pages.

## Accessibility, axe-core

WCAG 2.0 A and AA, 2.1 A and AA, and 2.2 AA. Zero violations on all eight
pages across the three options.

### The states a single pass does not reach

A scroll narrative has states that only exist part way down, so the Option C
pages are tested three times each:

- loaded and settled
- under `prefers-reduced-motion: reduce`, which is a different layout rather
  than the same one with the transitions removed
- at 42 per cent scroll, mid travel, with a pinned act part way through its
  horizontal movement

Zero violations in all three states on both pages.

### Moving content has a pause control

The client logo rail loops continuously, which is the one thing on the page
that moves without being asked. WCAG 2.2.2 requires a mechanism to pause,
stop or hide anything that moves automatically for more than five seconds, and
`prefers-reduced-motion` is not that mechanism, because many people who need
motion stopped have never set it.

The control is a real button in the tab order with `aria-pressed`. Verified:
animation play state goes from running to paused, `aria-pressed` becomes true,
and the label changes from Pause to Play. Under reduced motion the rail does
not animate at all, it wraps onto as many lines as it needs, and the control is
not rendered, because a pause button for something that is not moving is a tab
stop with nothing to do.

## The pinned act

The signature mechanic: a section sticks to the viewport and converts vertical
scroll into horizontal travel, then releases.

Sampled at 31 scroll positions, recording the section's position, the sticky
viewport's position and the track's transform at each.

| | Pins | Travel | Releases | Distinct states | Page errors |
|---|---|---|---|---|---|
| Homepage, 1440 | yes, viewport top 0 | -2880px | yes | 12 | 0 |
| Cyber, 1440 | yes, viewport top 0 | -2880px | yes | 7 | 0 |

The travel is exactly two viewport widths for three panels, which is what the
geometry should produce and is therefore worth checking rather than assuming.

### It never takes the scroll

No `preventDefault` on wheel or touch, no scroll library, no custom scrollbar.
Sticky positioning, transforms and one `requestAnimationFrame`. A pinned
section that steals the scroll breaks keyboard, trackpad and assistive
technology at once.

## Keyboard

Focus inside a pinned act is the hard case: a panel parked off the left of the
screen still contains focusable content, and the browser's own attempt to
reveal it scrolls the clipped viewport rather than the page.

Tested by placing a link in each of the three panels and tabbing to each in
turn. All three land fully in view, and the clipped viewport's own scroll
position stays at zero, which is what keeps the track and the transform in
step.

The target is computed from the panel's index rather than measured from its
current position, because `scroll-behavior: smooth` means any measurement
taken during the browser's own scroll reads a value that is still changing.

Every focus stop on both pages is named, at least 44px in its smaller
dimension, and carries a visible ring.

## Cross browser

Chromium, Firefox and WebKit, both pages, 15 scroll positions each.

All three engines: the act pins, the track travels -2560px at 1280 wide,
four distinct transform states across the sample, nothing below half opacity
after a full scroll, zero page errors. No engine differs from another.

## Reduced motion is a second design, not a disabled first one

The concern with a scroll narrative is that switching the motion off leaves
the page just as tall with nothing happening in it, which would be worse than
a page that never tried.

Four criteria, all measured:

**Every pinned act's height is content driven.** A pinned act's height is a
multiple of the viewport; a stacked one's is set by what is in it. So the page
is rendered at three viewport heights and the act is measured in each.

| | 700 | 900 | 1100 | Spread |
|---|---|---|---|---|
| Homepage act, motion | 2100 | 2700 | 3300 | 1200px, viewport driven |
| Homepage act, reduced | 1167 | 1167 | 1167 | 0px, content driven |
| Cyber act, reduced | 573 | 573 | 573 | 0px, content driven |

**No half-viewport slice of the reduced page is empty.** Swept in half-screen
steps: zero empty slices on either page.

**The reduced page is shorter.** Homepage 10,416px against 11,874px. Cyber
9,653px against 11,781px.

**Nothing is missing from either version.** Images, links and text compared
between the two designs. Homepage 14 images and 10 links in both, Cyber 12 and
11, and the only text that differs is the logo rail's pause control, which
exists to govern motion and has nothing to govern when there is none.

Measured on a settled page, after a scroll to the foot and back and with
images given time to arrive, because a height read too early is a measurement
of a page that has not finished loading.

## Nothing fades, and no figure counts

Every arrival is a transform behind a mask. A fade fails contrast for the
whole of its duration, so text that arrives by fading is text that is
unreadable while it arrives.

Figures do not count up to their values either. A number animating towards
250 displays a number that is not 250 for as long as it runs, and anyone
capturing the screen mid animation captures a figure that is not true. The
geometry behind the figures still moves with the scroll, so the act does not
lose its movement.

## Claims are sized to be read

The case study's outcome is published as "Circa 4% decrease in learner
non-completion reported following initial pilot rollout". A panel that gives
one statement the whole screen is exactly the format that invites reducing
that to a large "4%", which would turn a hedged pilot result into a claim
about delivered outcomes.

So the qualifier is sized against the figure by construction rather than by
eye: `qualifier = max(19px, figure x 0.44)`.

Measured at 320, 390, 600, 768, 900, 1100, 1280, 1440 and 1920 wide, in both
the motion and the reduced designs. Eighteen measurements, all at 44.0 per
cent, with the qualifier between 19.4px and 45.8px against a 17px body.

The published wording appears in the panel itself rather than in a caption or
a title attribute, and the hedge on "around 40,000" is kept, because the page
may not add precision the client has not published.

## Every item traces to a source for the page it is on

Being true and being true of this page are different tests. The homepage
carries the firm's own figures and its own client quote; the Cyber page
carries the cyber figures and the cyber quote, because that is where the
published sources put them.

Checked automatically against the content sources record: the quotes and
figures in each row are searched for on every built page, and any page
carrying one whose source belongs to a different page is reported. Navigation,
header and footer are excluded, because a footer listing the services is not
the page making a claim.

Clean across all seven built pages.

## Text does not run into other text

Line boxes are taken from the rendered text rather than from element
rectangles, and every pair sharing a line is checked for a gap that has
collapsed. Swept at 40px steps from 360 to 1600, which is 32 widths per page,
because a gap that closes at particular sizes is invisible to a check that
samples three breakpoints.

Eight pages, 256 width checks, no collisions.

## The geometry stays clear of the type

The arc device is drawn behind three of the acts. A hairline through the
counter of a letterform is damage rather than a watermark, so the reading
column is on the left, the geometry keeps to the right, and below 900px the
geometry is removed rather than overlapped.

Checked by rendering each page twice at the same scroll position, once with
the geometry and once without, and comparing the pixels inside every line of
text. Anything that changed is something the geometry was painting there. This
needs no assumption about the colour of the device or how transparent it is.

Both pages at 390, 768 and 1440, sampled at 17 scroll positions each: no
overlaps anywhere. The same check, run with the geometry deliberately moved
back over the reading column, returns 82.

## Page weight and requests

| | Requests | Transferred | Third party |
|---|---|---|---|
| Homepage, first screen | 10 | 123 KB | 0 |
| Homepage, after a full scroll | 23 | 311 KB | 0 |
| Cyber, first screen | 10 | 124 KB | 0 |
| Cyber, after a full scroll | 21 | 211 KB | 0 |

Zero third party requests on either page at any point. No analytics, no fonts
from a CDN, no motion library. The whole scroll narrative is CSS sticky
positioning, transforms and about 14 KB of JavaScript.

## The page is complete without the script

The stylesheet at rest is the finished page. Pinning, travel, parallax and
staging are switched on only by an attribute the script adds, and only after
it has proved it can run. A script that never loads, or throws part way,
leaves a complete stacked page rather than an empty one.

Verified with JavaScript disabled and with the script blocked at the network:
no pinning, no horizontal traversal, and no text below half opacity. Verified
again with the script running and a deliberate failure: the attribute is
removed, every reveal is shown, and the failure is written to the console and
rethrown rather than swallowed, so a dead beat is never silent.

## The enquiry form

A concept, so it submits nothing, but a form that silently does nothing is
worse than no form. Three states checked:

- empty submit: the confirmation stays hidden, both required fields are
  marked invalid, and focus moves to the first of them
- malformed email: the confirmation stays hidden and focus moves to the email
  field
- valid submit: the confirmation appears with `role="status"` and says plainly
  that the concept does not submit anything

## Design switcher

Three options now, and the control is loaded by all eight pages, six of which
were already live, so it is checked exhaustively rather than sampled.

- 24 routes, eight pages by three options: every one returns 200
- exactly one option selected per page, and it is the right one
- `?clean=1` suppresses the control on all eight, and it is hidden in print
- the query string and fragment are preserved when switching

### A page that exists in one option and not another

The article exists in Option A only. Both B and C offer their homepage instead
and say so in the label, rather than offering a route to a page that is not
there.

That behaviour depends on each option declaring which pages it has, and the
safe reading of a missing declaration is "homepage only" rather than "every
page exists". Tested by stripping the declarations from the page before it
reaches the browser, in all four combinations: every route returns 200 and the
fallback is labelled in every case.

### It works from a subpath

The switcher maps between options with a string operation on the path, and the
published site sits under a subpath that a local server does not have. Checked
on the live origin rather than locally: every route resolves, each page selects
its own option, and a path containing "cyber" is not mistaken for the Option C
prefix.

## British English and typography

British spelling throughout. No em dashes. Apostrophes and quotation marks are
typographic. Client names, accreditations and figures appear exactly as
published.

## Confidentiality

Swept in both directions on every check, and against the files that are
actually served rather than against local copies, because the served file is
what a reader opens.

- **Client**: anything supplied that is not published on their own site.
- **Ourselves**: who made this, for whom, and on what commercial footing.

Clean on both halves.

One thing this caught in Option C's own source. Comments in a stylesheet are
read by whoever opens the stylesheet, and all three options travel
together, so a comment in one option's CSS is read beside the other two. Seven
comments explained a rule by describing what an earlier version of it got
wrong, and one of those attributed a fault to another option sitting next to
it. Each has been rewritten to give the reason for the rule without the
history behind it. A stylesheet should say why the code is the way
it is. This document is where the history belongs.

## A note on these checks

Every check in this list returned a clean result at some point before it was
capable of returning a dirty one. A colour threshold that could not see a
semi-transparent stroke. A comparison that read an image as missing because
the browser had not fetched it yet. A geometry test that measured element
boxes and flagged a short word in a wide paragraph.

So each one is validated by reinstating the exact fault it exists to catch, at
the values that fault really had, and confirming it goes red. A clean result
from a check that has never been made to fail is not evidence.

Two defects in the final rounds were found by a person looking at the page
while every check reported clean. The suite is not what finds problems. It is
what stops a problem, once found, from coming back.
