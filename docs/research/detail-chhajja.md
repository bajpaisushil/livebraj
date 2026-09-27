# Braj architectural detail: chhajja

*Researched and verified 2026-09-27. Impact: strong.*

## whatItIs

THE JHAROKHA — and in Braj its own name is **gokh**, not jharokha.

Growse's glossary of Braj terms (Mathura: A District Memoir, 1883, Glossary p. 428) defines it exactly: "**Gokh** (for gavaksha), a look-out; **a window on an upper story with a projecting balcony**." The same glossary (p. 427) separately defines "**Chhajja**, stone eaves of a house or other building, **supported on projecting brackets**," and gives you three more words the code should be using: "**Chhari**, the shaft of a pillar"; "**Chira**, the capital of a pillar, **when it has brackets attached to it**"; "**Dasa**, in architecture, a string-course"; "**Dila**, in architecture, a panel."

So a Braj jharokha is, in local terms, a gokh: a first-floor (or higher) window pushed bodily out through the wall plane on a row of corbels, closed at its outer edge by a solid seat-high parapet, flanked by two colonnettes with bracket capitals, arched over, and hooded by its own small bracketed chhajja. You sit in it. The parapet is the seat (kakshasana), which is why it is seat-height and not rail-height.

Growse describes the street-front condition directly — this is the single most useful passage in the book for this project, p. 155, on the buildings of the Mathura/Brindaban thoroughfares:

> "In all the modern buildings, whether secular or religious, the design is of very similar character. The front is of carved stone with a grand central archway and arcades on both sides let out as shops on the ground floor. **Storey upon storey above are projecting balconies supported on quaint corbels**, the arches being filled in with the most minute reticulated tracery of an infinite variety of pattern, and **protected from the weather by broad eaves, the under-surface of which is brightly painted**."

Three things fall out of that sentence and all three are directly buildable: (1) shops below, jharokhas above — the ground floor is an arcade, never a jharokha; (2) they STACK, storey on storey; (3) the canopy soffit is a BRIGHT PAINTED COLOUR, not a darker tint of the wall. Free chroma in a flat-shaded renderer.

Two more Growse anchors for the parts:
- Bracket density under a hood, p. 254 (Jugal Kishor): a small doorway "under **a hood supported on eight closely-set brackets** carved into the form of elephants." Eight brackets over a doorway of roughly 1.0–1.2 m — pitch ~0.25–0.30 m. "Closely-set" is his word, and it is three to four times denser than the 1.1 m chhajja pitch currently in the code.
- Opening size, p. 128, in the 1650 eyewitness account of the great Kesava Deva temple he quotes: "windows **five or six feet high**, each provided with a kind of **balcony where four persons can sit**. Each balcony is **covered with a little vault, supported some by four, others by eight columns arranged in pairs and all touching**." That is 1.52–1.83 m of opening height, a cupola-vaulted canopy, and paired colonnettes — a monumental jharokha, on a temple demolished in 1670.
- The canopy's curved form has a name too, p. 173: "The **Bangala**, or oblong alcove, with a **vaulted roof of curvilinear outline**, is always a prominent feature in this style and **is introduced into some part of every facade**." So a fraction of jharokha hoods should be bangaldar — a shallow boat-hull curve with rolled-down ends — not flat slabs. The project's own Seva Kunj survey found exactly one on site: "a deep boat-hull curve in cream plaster with a rolled downturned eave over a bracketed cornice."

WHAT IT IS NOT, in Braj: Growse's whole point in the style chapter (p. 174) is that the Mathura school's glory is the flat pierced stone screen — "the pierced tracery, however, **of the screens and balconies** is as good in character as in execution... cut with great mathematical nicety, the pattern being drawn on both sides of the slab, which is half chiselled through from one side and then turned over and completed from the other." A Braj jharokha is a JALI box, not a Jaisalmer sculpture gallery.

## proportions

Provenance is marked on every line. MEASURED = this project's own photogrammetric survey in docs/research. GROWSE = verbatim from the Memoir. DERIVED = arithmetic from those. THIN = the record genuinely does not say, and I am giving you a defensible default rather than a fact.

=== THE STANDARD BRAJ STREET JHAROKHA (the one to build first) ===

  wide       (outside of jamb to outside of jamb)   1.60 m     range 1.35–1.85
  opening    (clear, between jambs)                 1.15 m     range 0.95–1.35   DERIVED from wide − 2×jamb
  OUT        (projection from the wall face)        0.80 m     range 0.70–0.90   MEASURED
  floorY     (balcony floor above the street)       4.25 m     range 4.00–4.50   MEASURED
  seat       (solid parapet above the balcony floor) 0.55 m    range 0.50–0.60   MEASURED + the project's own plinth/parapet band
  openH      (sill to head of the arched opening)   1.65 m     range 1.52–1.83   GROWSE p.128, "five or six feet high"
  canopyY    (soffit of the hood above balcony floor) 2.05 m   = seat + openH − 0.15 overlap   DERIVED
  totalH     (balcony floor to top of canopy lip)   2.30 m     range 1.90–2.45   DERIVED
  assemblyH  (street-side, brackets to canopy top)  2.95 m     = 0.60 bracket drop + 2.30       DERIVED

Slab and moulding thicknesses — all stacked boxes, none of them a profile:
  balcony floor slab         0.16 m thick, oversails the brackets by 0.08 m all round
  drip lip under it          0.06 m tall, inset 0.04 m   (this is the shadow line; do not skip it)
  parapet, three courses     0.12 base / 0.34 panelled face / 0.10 coping = 0.56 m,  0.20–0.24 m thick
  canopy slab                0.14 m thick
  canopy lip above it        0.09 m
  canopy projection          OUT + 0.24 m = 1.04 m   (it must oversail the parapet or it throws no shadow)
  canopy overhang each side  +0.25 m beyond `wide`

Brackets — the part the current code gets most wrong:
  count under the front      5 or 6 for a 1.60 m jharokha            MEASURED ("five or six heavy carved brackets")
  pitch                      0.30–0.40 m                              DERIVED from count ÷ wide
  Growse's comparison        8 brackets under a hood over a ~1.1 m doorway → pitch 0.25–0.30 m   GROWSE p.254
  plus                       1 at each return (so 7–8 in total)       DERIVED
  bracket size               0.18 w × 0.58 h × OUT deep, tapering from full OUT at the top to 0.15 m at the bottom
  canopy's own bracket row   4–6, smaller: 0.10 w × 0.18 h, pitch 0.30 m
  CONTRAST: the chhajja helper already in the file uses a 1.1 m pitch. That is right for an eave and
  wrong by 3× for a jharokha. A jharokha bracket row is dense; an eave bracket row is not.

Jambs / colonnettes:
  square jamb                0.18 m × 0.18 m, 1.55 m tall
  turned colonnette variant  0.12–0.16 m diameter                     MEASURED ("turned colonnettes at the jambs")
  bracket capital (chira)    0.22 w × 0.12 h, sitting on the jamb     GROWSE glossary p.427
  Growse's monumental case   colonnettes "arranged in pairs and all touching", 4 or 8 of them   GROWSE p.128

The arch in the opening:
  lobes                      5   (NOT 7 — seven is a gateway arch; a window head is 5, sometimes 3)
  arch width                 wide − 0.36 = 1.24 m
  arch height                1.30–1.40 m

=== STACKING, WHEN THERE IS MORE THAN ONE UPPER FLOOR ===
  floor-to-floor             3.10–3.50 m     MEASURED (the town generator already uses STOREY = 3.1)
  first jharokha floor       4.00–4.50 m
  second jharokha floor      7.20–8.00 m
  the upper one is smaller:  wide × 0.85, OUT × 0.80 (0.60–0.70 m)     THIN — inferred from
                             "storey upon storey" plus universal practice; not stated as a rule anywhere.

=== SPACING ALONG A BRAJ STREET FRONT ===
  The governing module is the arcade bay, not the jharokha.
  bay centres                2.40–3.50 m      MEASURED across the project's surveys
                             (Jaipur Mandir first-floor gallery openings 3.0–3.5 m; its kiosk five bays
                              of ~2.4 m; the town generator's own bay pitch is w/2.8)
  arcade piers               0.30–0.35 m square   MEASURED (Jaipur Mandir, Radha Gokulananda)

  CONTINUOUS type — Growse's Mathura/Brindaban High Street, p. 155, "storey upon storey":
     one jharokha PER BAY, centres 2.40–3.50 m
     plain wall left between neighbours: only 0.80–1.70 m
     this is a rich commercial frontage, not an ordinary lane

  PUNCTUATING type — the ordinary Braj lane, and much the commoner case:
     ONE jharokha per building, centred over the street door
     frontage 8–14 m, so effective spacing 8–14 m
     flanked by plain bracketed windows on the same floor, 0.85 × 1.15 m, at the same bay pitch
     MEASURED: this is exactly what the Mirabai haveli does.

  LANE-WIDTH CONSTRAINT — why Braj jharokhas are shallower than Rajasthan's:
     Vrindavan lanes measured in this project at 3–5 m wide.
     Two facing jharokhas at 0.80 m leave a 1.4–3.4 m slot of sky.
     Growse quotes Jacquemont on Mathura: "the streets are the narrowest, the crookedest…"
     Keep OUT ≤ 0.90 m. At 1.2 m the lane closes and it reads as Jaisalmer, not Braj.

  CORNER RULE (THIN — observed in photographs, not in the published record):
     a jharokha very often wraps a building corner at 45°, or two meet there.
     Very recognisable and cheap. Use it once or twice per district, not everywhere.

=== FOR COMPARISON, SO THE VOCABULARY STAYS CONSISTENT ===
  chhajja projection on the same building   0.35–0.55 m   MEASURED — a jharokha projects about 2× a chhajja
  ground storey to the chhajja line          3.20–3.50 m   MEASURED
  the file's existing survey block            plinth 0.50–0.60 · arch springing ~2.4 · chhajja 3.8–5.0 ·
                                              parapet 0.9–1.0 tall, top 4.5–5.5 · merlons 0.45 × 0.5–0.6
  A jharokha floor at 4.25 m sits just ABOVE the 3.8–5.0 m chhajja band. That is correct and not a clash:
  the chhajja runs between the storeys and the jharokha sits on it.

## howToBuildCheaply

FIRST, THE THING NOBODY HAS SAID: `jharokha()` ALREADY EXISTS AND IS DEAD CODE.

/Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/LandmarkGenerator.js:522

`grep -n "jharokha(" LandmarkGenerator.js` returns exactly one line — the definition. Sixteen temples call `cuspedArch`; not one calls this. Whatever else is done, the first job is to call it.

=== THE PRIMITIVES YOU ALREADY HAVE, AND WHICH TO USE ===

Read MeshBuilder.js before writing this. Three facts change the design:

1. `box(cx, cy, cz, w, h, d, color, rot, faces, topColor)` — **cy is the BOTTOM**, not the centre (y0 = 0, y1 = h). The existing jharokha() is written correctly against this; keep it.
2. `box` takes a **`faces` bitmask**. Bit 0b000100 is the −Z face. Every bracket, jamb and slab on a jharokha has its back buried in the wall. Dropping that one face on eight boxes saves ~16% of the assembly for nothing. `topColor` gives the top face its own colour in the same box — use it for a sunlit canopy.
3. `prism(cx, cy, cz, bw, bd, tw, td, h, color, rot)` — a tapered box, 12 tris, the same cost as a box. **This is the bracket.** A real Braj corbel is a wedge: full projection at the top where it meets the slab, tapering to a nub at the wall. `b.box` gives you a peg; `b.prism` gives you a corbel for the identical triangle count. That single substitution is the cheapest visual win on this whole element.
4. `panel(cx, cy, cz, w, h, color, rot, lift)` — one lifted quad, **2 triangles**. This is the jali, and it is the painted canopy soffit.

=== THE RECIPE ===

```
function jharokha(b, cx, y, cz, wide, rot, color, accent, opts = {}) {
  const OUT   = opts.out   ?? 0.80;   // 0.70–0.90, measured
  const SEAT  = opts.seat  ?? 0.55;   // solid parapet = the seat
  const OPENH = opts.openH ?? 1.65;   // Growse, "five or six feet"
  const BACK  = 0b111011;             // every face but −Z; the wall hides it
```

1. **Bracket row.** `n = clamp(Math.round(wide / 0.35), 4, 6)` across the front, plus one at each
   return. Each one:
   `b.prism(px, y - 0.58, pz, 0.18, 0.15, 0.18, OUT, 0.58, tint(color, 0.82), rot)`
   — 0.15 m deep at the wall, full OUT at the top. 12 tris each, 6–8 of them = 72–96 tris.
   Growse's number for a hood is EIGHT at ~0.28 m pitch; the project's measured number under a
   real Braj jharokha is FIVE OR SIX. Two is a shelf.

2. **Balcony floor**, one box, wall face dropped:
   `b.box(fx, y, fz, wide + 0.16, 0.16, OUT + 0.08, tint(color, 1.04), rot, BACK)`   10 tris
   **Drip lip** under its outer edge — this is the shadow line and it is what reads from 30 m:
   `b.box(lx, y - 0.06, lz, wide + 0.16, 0.06, 0.10, tint(color, 0.80), rot)`        12 tris

3. **Solid parapet, three stacked courses at the OUTER edge** (a moulding is three slabs, per the
   file's own rule). Widths 0.22 / 0.20 / 0.24, heights 0.12 / 0.34 / 0.10:
   base `tint(color,0.90)`, face `accent`, coping `tint(color,1.06)`. 3 boxes, back face dropped
   on none of these (all three sides are seen) = 36 tris. Repeat the same three courses, length
   OUT, on each return: +72 tris. **Solid, not a railing** — see `mistakes`.

4. **Jambs**, two boxes at ±(wide/2 − 0.09), 0.18 × 1.55 × OUT×0.8, wall face dropped: 20 tris.
   **Bracket capitals (chira)**, two boxes 0.22 × 0.12 × OUT×0.8 on top: 20 tris.

5. **The opening**, five lobes not seven:
   `cuspedArch(b, ax, y + SEAT, az, wide - 0.36, 1.35, 0.20, rot + Math.PI/2, accent, 5, 0x1a120c)`
   With lobes = 5, SEG = 20 → ~84 tris. With 7 it is ~116 for no gain at phone resolution.

6. **The jali**, one `panel()` inside the arch in a mid-tone (say 0x4a3a2c), lift 0.02, so the
   opening is a screened window in daylight rather than a black hole: **2 tris**. Growse, p. 174:
   the pierced tracery of the screens and balconies is the best thing about this architecture.

7. **Canopy bracket row** — Growse's "closely-set": 5 boxes, 0.10 × 0.18 × (OUT+0.24)×0.55,
   pitch 0.30 m, `tint(color, 0.84)`: 50 tris.

8. **Canopy slab**, with `topColor` for the sunlit upper face:
   `b.box(cx', y + SEAT + OPENH, cz', wide + 0.50, 0.14, OUT + 0.24, BRIGHT, rot, BACK, tint(color,1.08))`
   where **BRIGHT is a saturated red-ochre, indigo or green — NOT a tint of the wall.** Growse,
   p. 155: "protected from the weather by broad eaves, **the under-surface of which is brightly
   painted**." Then a lip box above it, wide + 0.50 × 0.09 × OUT + 0.32, `tint(color, 0.88)`.
   22 tris.

TOTAL, full detail: **≈ 330–390 tris.** More than the current 212, and worth it — but gate it.

=== BANGALDAR VARIANT (Growse: "introduced into some part of every facade") ===
Replace steps 7–8 with five `b.quad()` strips over a shallow arc, rise = 0.30 × (wide + 0.5),
ends rolling down by 0.18 m. Two quads per segment — one for the extrados in stone tint, one
facing down in the BRIGHT soffit colour. **20 triangles** and it is unmistakably Braj. Use it on
about one jharokha in four; flat slabs on the rest.

=== LOD — MANDATORY, THIS IS A PHONE ===
```
function blindJharokha(b, cx, y, cz, wide, rot, color, accent) { … }
```
Beyond ~45 m: 3 prisms + floor slab + drip lip + parapet coping + canopy slab. **≈ 70 tris.**
At that distance the silhouette and the two horizontal shadow lines are the entire effect; the
arch, the jali and the colonnettes resolve to nothing. Swap at build time off the camera-anchor
distance, not per frame.

=== BUDGET IN PRACTICE ===
A 40 m continuous street front at 2.8 m bay centres = 14 jharokhas. At full detail that is 5.2k
tris for one frontage. With three near ones full and eleven blind: 1.9k. That is the right split.
Across the whole town, put jharokhas on the FRONT elevation only — `facade()` already distinguishes
the road-facing side from `facadeAllSides()`.

=== THE FREE WIN IN BuildingGenerator ===
/Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/BuildingGenerator.js:1013

`facade()` already has `STOREY = 3.1` (line 992) and `cols = Math.round(w / 2.8)`. So:
- its first-floor window band sits at `y + 0.7 + 1×3.1 + ~0.5 ≈ 4.3 m` — **dead centre of the
  measured 4.00–4.50 m band.**
- its bay pitch of 2.8 m — **dead centre of the measured 2.40–3.50 m band.**

The generator's existing grid is already correct for Braj. Nothing needs re-proportioning. In the
`else` branch at line 1069, where a non-door bay currently draws a flat 0.85 × 1.15 panel, promote
ONE bay per building at `s >= 1` — the bay over the door — to a real jharokha, and leave the rest
as panels. One `if`, and every multi-storey shophouse in Vrindavan stops being a wall with stickers
on it.

## whereItAppears

Sorted by how well it is evidenced, because the difference matters more here than anywhere else in the vocabulary — half the roster must NOT have one.

=== HAS ONE, MEASURED IN THIS PROJECT'S OWN SURVEY ===

**Prachin Mirabai Mandir** — the specimen. docs/research/meera-bai.md is the only place in this repo
where a Braj jharokha has been measured, and every number in `proportions` traces back to it:
"Jharokha floor at **4.0–4.5 m**, projecting **0.7–0.9 m** on **five or six** heavy carved brackets,
with a **solid parapet**." And from the street elevation: "Directly over it a jharokha projecting on
heavy carved sandstone brackets, its fascia set with cusped recessed panels and a dentil/bead band.
**CORRECTION: the jharokha has a solid masonry parapet, not an open railing.**" ONE jharokha, centred
over the street door, in a two-storey flat-roofed haveli. Its jambs are **turned colonnettes**. The
survey also flags that only the doorway block and the brackets are carved STONE — the panels, arches
and rosettes around them are **moulded lime plaster, limewashed**. Tint accordingly.

**Shri Radha Madhav Mandir (Jaipur Mandir)** — the richest case, three separate mentions in
docs/research/jaipur-mandir.md: "long two-storey ranges, flat roofs, parapets, deep chajjas on dense
bracket courses, blind arcades of multi-cusped niches, **jharokha balconies**"; on the gateway
frontispiece, "**a jharokha to one side**, a deep bracketed cornice, a small pavilion above"; and on
the first-floor gallery, "**bracketed balconies at intervals**" behind a balustrade, openings
3.0–3.5 m. This is the one building on the roster where the CONTINUOUS type is right — street range
11–13 m over two storeys, jharokhas at bay intervals along it, and one bigger one flanking the gate.

=== HAS ONE, BUT WITH A DATE CAVEAT YOU MUST HONOUR ===

**Shri Banke Bihari Mandir** — present-day it is the textbook Rajasthani-haveli front: arched
windows and balconies on the upper gate storey over a low, horizontal red sandstone block. But
Growse saw it in 1883 (p. 217) as "**a large square red sandstone block of plain, but exceedingly
substantial, character**, with a very effective central gateway of white stone. **This has yet to be
completed by the addition of an upper story**; but even as it stands, the delicacy of its surface
carving, and the **extremely bold projection of its eaves**…" So everything above that gateway
post-dates 1883. Model today's building, but note in the source comment that the jharokha storey is
late. His "extremely bold projection of its eaves" is a direct instruction for the chhajja.

**The town itself — Loi Bazar and the lanes.** This is where the element genuinely belongs and where
it pays for sixteen temples over. Growse, p. 155, on exactly this: shops in the ground-floor arcade,
"storey upon storey above are projecting balconies supported on quaint corbels." BuildingGenerator's
multi-storey shophouses are the real client for `jharokha()`, not the temples.

=== POINTEDLY DOES NOT — and this is the more valuable half of the answer ===

**Shri Radha Ras Bihari Ashta Sakhi Mandir — a FALSE jharokha, and the survey is emphatic.**
docs/research/ashta-sakhi.md: "A flat vertical wall of carved sandstone rising straight out of the
lane to a parapet, **with no projecting balcony anywhere**." And: "One **FALSE JHAROKHA** centred over
the entrance bay — a carved miniature balcony window with a small cusped canopy over a jali-filled
opening, **in relief only**. The temple's own caption says so outright: 'The facade has false jharokas
(balconies).'" The doc's build note: "**DO NOT model the jharokhas as balconies… Nobody stands on the
front of this building.**" Build it as a `panel()` + a 0.10 m relief box + a tiny cusped canopy — a
`falseJharokha()` with no floor slab, no visible brackets, ~30 tris. Getting this one WRONG is more
damaging than leaving it off, because the temple has published the correction itself.

**The five Akbari-period stone temples — Govind Dev, Madan Mohan, Gopinath, Jugal Kishore, Radha
Vallabh. NO JHAROKHAS. This is the most important negative on the list.** Growse surveyed all five in
detail and the vocabulary he records is a different one: square-headed openings with "**the architrave
supported on projecting brackets**" (p. 173), multifoil Saracenic arches in the middle register,
clerestory windows, "**a fine boldly moulded plinth**" (Jugal Kishor, p. 254), an "**arcaded parapet**"
(Govind Dev, p. 245). Radha Vallabh's nave front, p. 255: "an eastern facade, 34 feet broad, which is
in three stages, the upper and lower Hindu, and the one between them purely Muhammadan in character…
a double tier of openings north and south; those in the lower story having brackets and architraves
and those above being Muhammadan arches… These latter open into **a narrow gallery with small
clerestory windows looking on to the street**." A gallery BEHIND the wall plane, not a box pushed
through it. Harideva at Gobardhan, same family: "There are **clerestory windows above**, and the height
is **about 30 feet to the cornice**." Putting a jharokha on any of these is a two-century anachronism
and would be the single most visible error the vocabulary could introduce.

**Shri Rangaji Mandir** — Dravidian, 1845–51, built to a Srirangam plan. Growse, p. 263: outer walls
773 × 440 ft, "lofty gate-towers, or gopuras", a 60 ft gilt copper dhvaja-stambha. Its one north-Indian
element is a single pavilion "**ninety-three feet high, constructed in the Mathura style**" over the
west entrance — and that is a tracery kiosk, not a jharokha. No jharokhas anywhere.

**Shahji Mandir** — Growse describes it at length (p. 263) with obvious distaste and mentions no
balcony at all: "fronted with a **colonnade of spiral marble pillars**, each shaft being of a single
piece… The facade with its uncouth pediment, flanked by sprawling monsters, and its **row of life-size
female figures**." Lucknow-Nawabi, built by Sah Kundan Lal to a design "suggested by the modern secular
buildings of that city." Twisted columns and a pediment, not jharokhas.

**Every single-storey building on the roster — there is no upper floor to project from:**
- **Radha Gokulananda** — "single-storey, plastered and limewashed, flat-roofed, no tower of any kind";
  "Nothing rises above the parapet line except the samadhi shrines."
- **Imli Tala** — "Single storey, flat-roofed with plain parapet, ~14–16 m wide."
- **Vamsi Vat** — "Single-storey walled precinct… every roof flat with a parapet."
- **Seva Kunj / Rang Mahal** — "Single storey, parapet at about 5 m."
- **Akrura Ghat main mandir** — "single storey with a flat walkable roof terrace and a spire."
For all of these the plinth, chhajja and parapet do the work. A jharokha here is impossible, not
merely wrong. **Gate the helper on `storeys >= 2`.**

**Pagal Baba, Prem Mandir, Chandrodaya, ISKCON Krishna-Balaram** — 20th/21st-century marble. Their
upper levels are **open walk-round galleries behind balustrades**, which is a different element:
docs/research/pagal-baba.md, "each with an open walk-round gallery, a deep flat chhajja on brackets,
and **a low parapet of small square balusters**." Do not substitute a jharokha for a balustraded
gallery — they read completely differently and Pagal Baba's whole silhouette depends on "people
standing at three or four different heights on one facade."

**Net on the sixteen: at most three or four temples should get a real jharokha; one gets a false one
in relief; the rest must not have one at all.**

## mistakes

Ranked by how much damage each one does. The first four are live defects in the code as it stands at LandmarkGenerator.js:522.

**1. THE HELPER IS NEVER CALLED.** `grep -n "jharokha(" LandmarkGenerator.js` returns one line: the definition. This element currently improves zero buildings. Everything below is moot until something calls it.

**2. TWO BRACKETS.** The code places brackets at ±wide×0.36 and nothing else. The measured Braj count is **five or six** under a 1.6 m jharokha; Growse records **eight closely-set** under a hood over a doorway barely 1.1 m wide (p. 254). A two-bracket jharokha is a shelf with a window on it. The dense corbel row IS the element — it is the thing that reads from across a 4 m lane, because the shadow between the brackets is a row of dark notches and nothing else in the vocabulary makes that pattern. Scale the count: `clamp(round(wide / 0.35), 4, 6)` plus one at each return.

**3. THE RAILING IS IN THE WRONG PLACE — a real geometry bug.**
```js
const p0 = f(OUT * 0.5);
b.box(p0[0], y + 0.16, p0[1], wide, 0.5, 0.1, accent, rot);   // the railing
```
`p0` is the MID-DEPTH of the balcony (OUT × 0.5 = 0.31 m out from the wall). So a 0.10 m rail is being planted down the middle of the balcony floor, with 0.31 m of open floor in front of it and 0.31 m behind. It should sit at the OUTER edge, at `f(OUT - 0.11)`. As drawn, you cannot lean on it and the silhouette is wrong.

**4. IT IS AN OPEN RAILING, AND IT SHOULD BE A SOLID SEAT.** This project's own survey issued the correction in capitals: "**CORRECTION: the jharokha has a solid masonry parapet, not an open railing.**" The parapet is a kakshasana — a seat. It is 0.50–0.60 m tall because that is what you sit on, and it is 0.20–0.24 m thick masonry with cusped recessed panels and a dentil band on its face. A 0.10 m rail is Jaipur palace balustrade, and it is the single most common way to make a Braj building look Rajasthani.

**5. TREATING THE CANOPY SOFFIT AS A SHADE OF THE WALL.** Growse is explicit and it is free chroma in a flat-shaded renderer: eaves "the under-surface of which is **brightly painted**" (p. 155). The current code uses `accent` for the canopy box and `tint(color, 1.05)` above it — so the underside is the same family as the wall. Give the soffit a saturated red-ochre, indigo or green. One `panel()` face-down, 2 triangles, and the jharokha suddenly has a lit interior edge.

**6. PROJECTING TOO FAR.** Anything over 0.90 m reads as Jaisalmer. The measured Braj figure is 0.70–0.90 m, and the reason is structural and civic: the lanes are **3–5 m wide** and two facing jharokhas have to leave a passable slot. Growse quotes Jacquemont on Mathura's streets as "the narrowest, the crookedest." The current OUT = 0.62 m is, if anything, slightly SHY — 0.80 is better — but the failure mode to fear is the other direction.

**7. SEVEN LOBES IN THE WINDOW ARCH.** The code passes `lobes = 7`. Seven is a gateway arch. A window head in this tradition is five, sometimes three. Seven also costs 116 triangles against 84 for five, for detail that does not survive to the screen on a phone.

**8. CONFUSING THE TWO "SILL HEIGHTS".** There are two numbers and the code parameterises neither: the balcony FLOOR above the street (**4.00–4.50 m**, measured — set by the storey height, not by taste), and the seat above the balcony floor (**0.50–0.60 m**). Both belong in the signature. Getting the first one wrong by half a metre makes the whole street front feel like a different building type.

**9. PUTTING ONE ON A SINGLE-STOREY OR AN AKBARI-PERIOD TEMPLE.** Gate the call twice — on `storeys >= 2` and on period. Six of the roster's buildings are single-storey and physically cannot have one; five more are 1590–1627 stone temples whose upper openings are clerestories and whose square-headed lower openings sit on architrave brackets INSIDE the wall plane. A jharokha on Govind Dev is a two-century error on the most-photographed building in Vrindavan.

**10. BUILDING ASHTA SAKHI'S AS A REAL BALCONY.** The temple publishes the correction itself: "The facade has **false** jharokas (balconies)." Relief only, ~0.10 m proud, no floor, no bracket row. It needs its own `falseJharokha()`, ~30 tris.

**11. PUTTING A CHHATRI ON TOP OF EVERY ONE.** Wikipedia's general definition includes "a cupola or pyramidal roof," and that is true of Rajput palaces. In Braj the canopy is a flat or **bangaldar** hood; Growse's one cupola-topped example (p. 128, "covered with a little vault… on four, others on eight columns") is on the vanished monumental Kesava Deva temple, not on a street. Reserve the cupola for gate frontispieces — Jaipur Mandir's gateway has "a small pavilion above," and that is the right place for it.

**12. PERFECTLY UNIFORM SPACING ON A LONG FRONTAGE.** It reads as a hotel. Braj fronts are accretive: one large jharokha over the door, a smaller one off-centre, one wrapping a corner, and plain bracketed windows between. Growse's "storey upon storey" continuous type is the RICH case, not the default.

**13. NOT USING THE `faces` BITMASK.** Every bracket, jamb and slab has its back buried in the wall. `box()` already takes `faces`; dropping 0b000100 on eight boxes is ~16% off the assembly for zero visual cost — and on a mid-range Android that is the difference between putting these on 40 buildings and putting them on 200.

**14. USING `box` FOR THE BRACKET WHEN `prism` COSTS THE SAME.** 12 triangles either way. A box gives a peg; a prism tapering from 0.15 m at the wall to the full projection at the slab gives a corbel. There is no argument for the box.

WHERE THE RECORD IS GENUINELY THIN, stated plainly:
- **No published source gives a dimensioned drawing of a Braj jharokha.** Growse surveyed these exact buildings but he was writing an 1883 district memoir, not a measured survey; he gives plan dimensions for temples (34 ft facade, 63 × 20 ft hall, 30 ft to the cornice) and almost none for details. Every jharokha number above comes from this project's own photogrammetry of the Mirabai haveli, cross-checked against Growse's two hard figures (a 5–6 ft opening, 8 brackets under a hood). **One measured building is one measured building.** Treat ±15% as honest.
- **How the second-storey jharokha differs from the first** is not documented anywhere I can find. "Smaller and shallower" is universal practice, not a recorded Braj rule.
- **The corner-wrapping jharokha** is visible in photographs and absent from the published record.
- **Bay rhythm on a Braj street front** is inferred from three measured buildings plus the town generator's own grid, not from any survey of a street elevation. No such survey exists.

## sources

- F. S. Growse, *Mathurá: A District Memoir*, 3rd ed. 1883 — full OCR text downloaded and searched locally (1.41 MB): https://archive.org/details/b29352095 , text at https://archive.org/download/b29352095/b29352095_djvu.txt . Passages used, by printed page: **p. 428 Glossary** — "Gokh (for gavaksha), a look-out; a window on an upper story with a projecting balcony"; **p. 427 Glossary** — "Chhajja, stone eaves of a house or other building, supported on projecting brackets"; also Chhari (shaft of a pillar), Chira (capital of a pillar, when it has brackets attached to it), Dasa (string-course), Dila (panel). **p. 155** — the Mathura/Brindaban street front: "The front is of carved stone with a grand central archway and arcades on both sides let out as shops on the ground floor. Storey upon storey above are projecting balconies supported on quaint corbels, the arches being filled in with the most minute reticulated tracery of an infinite variety of pattern, and protected from the weather by broad eaves, the under-surface of which is brightly painted." **p. 128** — the 1650 eyewitness account of Kesava Deva: "windows five or six feet high, each provided with a kind of balcony where four persons can sit. Each balcony is covered with a little vault, supported some by four, others by eight columns arranged in pairs and all touching." **p. 254** — Jugal Kishor: "a small doorway under a hood supported on eight closely-set brackets carved into the form of elephants." **p. 173** — "The Bangala, or oblong alcove, with a vaulted roof of curvilinear outline, is always a prominent feature in this style and is introduced into some part of every facade." **p. 173** — the eclectic style: "every opening is square-headed with the architrave supported on projecting brackets." **p. 174** — "The pierced tracery, however, of the screens and balconies is as good in character as in execution… the pattern being drawn on both sides of the slab, which is half chiselled through from one side and then turned over and completed from the other." **p. 217** — Banke Bihari in 1883: "a large square red sandstone block of plain, but exceedingly substantial, character… This has yet to be completed by the addition of an upper story… the extremely bold projection of its eaves." **p. 255** — Radha Ballabh: facade 34 ft broad in three stages, hall 63 × 20 ft, "a double tier of openings… those in the lower story having brackets and architraves and those above being Muhammadan arches… a narrow gallery with small clerestory windows looking on to the street." **Harideva, Gobardhan** — nave 68 × 20 ft, choir 20 ft square, "There are clerestory windows above, and the height is about 30 feet to the cornice." **p. 263** — Rangaji (outer walls 773 × 440 ft, gopuras, a 93 ft Mathura-style pavilion over the west gate) and Shahji ("a colonnade of spiral marble pillars… its uncouth pediment… its row of life-size female figures"). **p. 263** — Radha Gopal: "the tier of windows above gives on to a balcony and verandah." **p. 150** — Rani Lachhmi's kunj: "shaded above by unusually broad eaves which have a wavy pattern on their under-surface and are supported on bold brackets."
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/meera-bai.md — THE governing measurement for this element. Line 56: "Jharokha floor at 4.0–4.5 m, projecting 0.7–0.9 m on five or six heavy carved brackets, with a solid parapet." Line 74: the street door and the jharokha over it, with the explicit correction "the jharokha has a solid masonry parapet, not an open railing"; turned colonnettes at the jambs; only the doorway block and brackets are carved stone, the rest moulded lime plaster. Line 50: ground floor to chhajja line 3.2–3.5 m, chhajja projects 0.35–0.55 m on closely spaced flat corbels. Line 132: "'Rajasthani style' in the sources means the cusped arcades, the courtyard plan and the carved bracketed jharokha — not jharokhas everywhere."
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/jaipur-mandir.md — lines 64, 74, 82, 83, 103: jharokha balconies on the two-storey street range; "a jharokha to one side" of the gateway frontispiece; "bracketed balconies at intervals" on the first-floor gallery; gallery openings 3.0–3.5 m; piers 0.30–0.35 m square; kiosk five bays of ~2.4 m; street range 11–13 m over two storeys.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/ashta-sakhi.md — lines 83, 95, 209: "no projecting balcony anywhere"; "One FALSE JHAROKHA centred over the entrance bay… in relief only"; the temple's own caption "The facade has false jharokas (balconies)"; and the build instruction "DO NOT model the jharokhas as balconies… Nobody stands on the front of this building."
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/ — the storey-count evidence that gates the helper: radha-gokulananda.md (single storey throughout, nothing above the parapet line), imli-tal.md (single storey, flat roof, plain parapet, ~14–16 m wide), vamsi-vat.md (single-storey walled precinct; approach lane 3–5 m wide, buildings 1–2 storeys), seva-kunj.md (single storey, parapet ~5 m; and the one bangaldar roof on site — "a deep boat-hull curve in cream plaster with a rolled downturned eave over a bracketed cornice"), akrura-ghat.md (main mandir single storey), pagal-baba.md (open walk-round galleries behind "a low parapet of small square balusters", NOT jharokhas).
- /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/LandmarkGenerator.js:522 — the existing `jharokha()`, which `grep -n "jharokha("` shows is defined and never called. Lines 409–520 hold the BRAJ DETAIL VOCABULARY block with its measured band (plinth 0.50–0.60, arch springing ~2.4, chhajja 3.8–5.0, parapet 0.9–1.0 tall with top at 4.5–5.5, piers 0.30–0.35 square, merlons 0.45 × 0.5–0.6) and the existing `chhajja()` bracket pitch of 1.1 m.
- /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/engine/render/MeshBuilder.js:49–122 — `quad` (2 tris), `box(cx,cy,cz,w,h,d,color,rot,faces,topColor)` with cy at the BOTTOM and a per-face bitmask, `prism(cx,cy,cz,bw,bd,tw,td,h,…)` the tapered box that should be the bracket, `panel(…)` the single lifted quad for jali and painted soffits.
- /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/BuildingGenerator.js:992 and :1013 — `STOREY = 3.1` and `facade()` with `cols = Math.round(w / 2.8)`; the first-floor window band already lands at ~4.3 m and the bay pitch at 2.8 m, both inside the measured Braj bands. The `else` branch at line 1069 is where one bay per multi-storey shophouse should be promoted to a jharokha.
- Wikipedia, 'Jharokha' — https://en.wikipedia.org/wiki/Jharokha — the general (pan-Indian, Rajput-weighted) definition: "a stone window projecting from the outer wall of an upper story building", comprising "two pillars, balustrade and a cupola or pyramidal roof", supported by "two or more brackets or corbelling"; three-sided enclosures filled with jaali. Useful for the component list; contains NO dimensions, and its cupola/balustrade defaults are Rajput-palace, not Braj — see `mistakes` items 4 and 11.
- 'Tracing the Origin of Jharokha Window Used in Indian Subcontinent' (ResearchGate, publication 329570769) and the Patwa-ki-Haveli, Jaisalmer jharokha study (60+ ornate stone jharokhas, havelis of 1805–1860) — consulted for component vocabulary only. Neither publishes dimensioned drawings in metres that I could obtain, and Jaisalmer practice is deeper and richer than Braj; do not import its proportions.
