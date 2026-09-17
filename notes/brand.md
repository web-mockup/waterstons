# Waterstons brand reference

Extracted from the live site on 16 September 2026. Nothing here is guessed.

Sources
- Theme CSS: `https://www.waterstons.com/themes/custom/waterstons/css/styles.css`
- Typekit CSS: `https://use.typekit.net/gfp7ftd.css`
- Logos: `/themes/custom/waterstons/logo.svg`, `logo--stacked.svg`
- Line shapes: `/themes/custom/waterstons/assets/icons/shields/shield-1..12--green.svg`
- Computed styles read from the live homepage in a real browser.

## Colours

Hex values counted straight out of the theme stylesheet, most used first.

| Token | Hex | Where it is used on the live site |
|---|---|---|
| `--w-navy` | `#152943` | Primary. Nav bar, headings, body copy, buttons (139 uses) |
| `--w-navy-deep` | `#162843` | Slightly darker navy used behind a few panels |
| `--w-green` | `#78fa93` | The brand green. Hero panels, shield motif, button hover (51 uses) |
| `--w-grey` | `#8a96a3` | Meta text, captions |
| `--w-grey-line` | `#e4e6ea` | Hairlines and card borders |
| `--w-off-white` | `#f7f9fb` | Alternating light section background |
| `--w-slate` | `#677383` | Secondary body text |
| `--w-border` | `#d8d8d8` | Form field borders |
| `--w-pink` | `#ff429e` | Accent card background (events) |
| `--w-yellow` | `#ffba00` | Accent card background (articles) |
| `--w-cyan` | `#00fff5` | Accent section background |
| `--w-orange` | `#ff6439` | Accent shield motif on case study cards |
| `--w-white` | `#ffffff` | |

The accent four (pink, yellow, cyan, orange) are used sparingly on the live site,
one per card type. This mockup keeps that discipline.

## Type

| Role | Live site | Notes |
|---|---|---|
| Headings | `le-monde-livre-std`, serif, weight 700 | Adobe Fonts. High contrast book serif, sharp wedge serifs |
| Body and UI | `urbane`, sans-serif, weights 300 / 500 / 700 | Adobe Fonts. Geometric, single storey `a` and `g` |
| Body size | 14px / 1.15 line height | Small. This mockup uses 17px for readability and WCAG comfort |
| Buttons | `border-radius: 50px`, padding `10px 20px` | Full pill |

### Font substitution in this mockup, please read

`urbane` and `le-monde-livre-std` are Adobe Fonts, served from Typekit kit `gfp7ftd`. That
kit is licensed to the waterstons.com domain, so the real files cannot be self hosted on a
GitHub Pages preview, and self hosting them anyway would breach the licence.

This mockup therefore uses the closest open licence stand ins, self hosted as WOFF2:

| Real font | Stand in | Why it is close |
|---|---|---|
| `le-monde-livre-std` | **Newsreader** (SIL OFL) | Book serif, similar stroke contrast and sharp serifs, same literary feel |
| `urbane` | **Poppins** (SIL OFL) | Geometric sans with the same single storey `a` and `g` and circular bowls |

```css
--w-font-head: "le-monde-livre-std", "Newsreader", Georgia, serif;
--w-font-body: "urbane", "Poppins", system-ui, sans-serif;
```

**What this does and does not do.** The real family names sit first in the stack, so the
production build only needs the Typekit stylesheet added to the `<head>` for the true
fonts to take over. It does **not** happen automatically: this mockup ships no Typekit
embed and no `@font-face` for those two families, so on any domain, including
waterstons.com, those names currently resolve to nothing and the stand ins render. Adding
the kit embed is a one line change at build time, and it is the only change needed, but it
is a change that has to be made rather than something the mockup inherits on its own.

## Logo

- Horizontal: `assets/brand/logo.svg`, viewBox `0 0 361 70`. Navy `#152943` wordmark, shield mark in green `#78FA93`.
- Stacked: `assets/brand/logo--stacked.svg`, viewBox `0 0 200 110`, carries the "we're with you" line.
- Signage seen in their own photography reads "Waterstons / technology + growth partners".

## The line shapes

The brief calls these "the family of logo line shapes". On the live site they are twelve
shield silhouettes, viewBox `0 0 181 181`, each filled with a different arrangement of
stripes and arcs, published in green `#78FA93` and orange `#FF6439`.

Downloaded to `assets/brand/shields/shield-1..12--green.svg`.

How this mockup uses them, restrained, as the brief asks:
- Section dividers between bands.
- One large watermark shape per dark band, low contrast, `aria-hidden`.
- The homepage hero signature moment, arcs drawing in once on load.
- Never as decoration inside body copy.

## Voice, taken from the live About Us page

The tone benchmark, quoted from their own copy:

> "We keep the bad guys out. We keep IT grumbles to a minimum."
> "We'll do whatever it takes." / "We never say it's not our problem."
> "We'll not bamboozle you with jargon and tech-speak."
> "We're only as good as the people we put in front of you."

Tagline: **We're with you.** Signature CTA on the live site: *"Ready to reimagine your business? We're with you."*

## Real facts used in this mockup

All verified on waterstons.com, none invented.

- Founded over 30 years ago, family business. Live copy says "For over 30 years" and "Three decades on".
- "Almost 300 experts" (About Us).
- Offices: Durham (Liddon Court, Aykley Heads, DH1 5TS), London, Glasgow (17 Renfield Street), Sydney (Waterstons Pty, 4.03 6 Eden Park Drive, Macquarie Park, NSW 2113).
- UK: Office +44 345 094 0945, Service desk +44 345 094 0944, info@waterstons.com
- AU: Office +61 2 9160 8430, Service desk +61 2 9160 8445, info@waterstons.com.au
- Company no 3818424. VAT no 605757824.
- Services: Business Consulting, Data & AI, Technology, Cyber Security.
- Cyber services, exactly as published: Cyber Strategy, Fractional Security Roles,
  Managed Detection and Response (SOC), CAF Audit and Assurance, Cyber Essentials and
  ISO 27001, Penetration Testing.
- Accreditations, as published: NCSC Cyber Resilience Audit assured service provider,
  NCSC consultancy for risk management and for audit and review, NCSC Cyber Incident
  Exercising, CREST SOC, CREST Penetration Testing, CREST Cyber Training Provider,
  BSI ISO 27001 and 9001, BSI ACP, Cyber Essentials Plus, NEBRC trusted partner, ScotlandIS.
- Clients named on their own client grid: Age UK, Durham University, Enva, Quorn,
  Foster + Partners, People's Postcode Lottery, Newcastle International Airport, VARO,
  Gateway Housing Association.

## Imagery

Every photograph in this mockup is a real Waterstons photograph pulled from their own
S3 media library. No stock, no AI, no invented people. Faces are never captioned with a
name or job title unless Waterstons themselves published that pairing (the article author
is the only case).

Converted to WebP at responsive widths in `assets/img/`. Source map in
`assets/scratch/imgmanifest.json`.
