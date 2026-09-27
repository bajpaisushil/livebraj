# Braj architectural detail: chhajja2

*Researched and verified 2026-09-27. Impact: transforms-it.*

## whatItIs

THE CHHAJJA — the projecting stone eave carried on brackets. Growse defines it himself in the memoir's Braj glossary, which is as close to a primary definition as this project will get:

  "Chhajja, stone eaves of a house or other building, supported on projecting brackets."
  "Toba, in architecture, brackets supporting the projecting eaves or chhajja."
  "Dasa, in architecture, a string-course."
  "Gokh (for gavaksha), a look-out; a window on an upper story with a projecting balcony."

So the element has three named parts, and the local word for the bracket is TOBA (Rajasthani/Hindi toda/tora). It is not one thing but a small assembly, and that is the whole point for the code:

  1. DASA — a thin string-course / moulding band on the wall, at the level the brackets stand on. The brackets are corbelled off this, not glued to blank plaster.
  2. TOBA — a row of projecting brackets. Plain stepped corbels in plastered lime work; S-curve scroll brackets in carved sandstone; figural elephants, swans and makaras on the important buildings (all three named by Growse in Braj).
  3. The SLAB — a thin stone plate, wider than the wall, sloping slightly down and out, with a fascia edge and a drip on the underside.

Two physical facts decide whether it reads:
  • The eye does not see the slab. It sees the BAND OF SHADOW between the wall and the slab edge, ruled by the rhythm of the brackets. A plain projecting slab is a shelf; a slab with a bracket row under it is Braj. Whatever else gets cut for triangles, the bracket rhythm cannot be.
  • The soffit is a separate colour. Growse on Mathura's street fronts: balconies "protected from the weather by broad eaves, the under-surface of which is brightly painted." On the finest Vrindavan example, Rani Lachhmi's kunj at Kesi Ghat, the eaves "have a wavy pattern on their under-surface and are supported on bold brackets." With flat-shaded vertex colour and no textures, painting the underside costs nothing and is documented.

HONESTY ABOUT THE RECORD — it is thin where it matters most. I searched the entire text of the memoir for chhajja / eaves / cornice / bracket / corbel. Growse gives NO projection, NO thickness and NO bracket spacing anywhere. His hard numbers touching this element are exactly three:
  • a COUNT — "eight closely-set brackets" under one small side-door hood at Jugal Kishor;
  • a COUNT — at the village temple of Bihari Ji, "of those that support the eaves of the temple itself six are of the same pattern";
  • a HEIGHT — Hari Deva at Govardhan, "the height is about 30 feet to the cornice."
Everything dimensional below comes from the project's own photo-scaled surveys in docs/research (which are internally consistent and were cross-checked by two agents), from modern Indian building practice for the concrete ones, and from the one published generic figure for Rajasthani havelis. Treat projections as ±25%, heights as ±15%.

## proportions

Let H = height from grade to the chhajja line on the face being capped.

=== 1. HEIGHT — where the eave line sits (all measured, project surveys) ===
  Single-storey Braj temple, one eave:            3.8 – 5.0 m   (default 4.2)
  Domestic court, between-storey band:            3.2 – 3.5 m   (Meera Bai, measured)
  Radha Gokulananda arcade, full stack:           arch springing 2.4 → chhajja 3.8 → parapet top 4.5
  Two-storey street front:                        3.2–3.6 m and 6.6–7.4 m
  Three-storey lane front (Ashta Sakhi):          ~3.4 / ~6.6 / ~9.6 m
  Palace-temple gallery (Jaipur Mandir):          ~6.5 m and ~12.5–13.5 m under a 16 m roof terrace
  Growse's one hard height (Hari Deva, Govardhan): 30 ft = 9.14 m to the cornice, on a nave 20 ft (6.1 m) broad
       → cornice height ≈ 1.5 × the width of the hall it caps. Useful sanity check on the big ones.

  AS A FRACTION: the eave line sits at 0.82–0.88 of the total front height measured to the top of the parapet.
  CLEARANCE RULE (this is what makes it look right, more than the projection does):
       the BRACKET TOP must clear the crown of the cusped arch below by 0.40–0.80 m.
       Springing 2.4 + rise ~0.8 = crown 3.2 → bracket top 3.6–3.7 → slab underside 3.75 → slab top 3.9.
       Tighter than 0.4 m and the facade chokes; looser than 0.9 m and a blank plaster band appears that
       nothing in Braj has.

=== 2. PROJECTION P ===
  0.35 – 0.55 m   plastered domestic court / between-storey band        (measured, Meera Bai)
  0.60 – 0.90 m   standard temple facade over a verandah or arcade      (DEFAULT 0.70)
  0.90 – 1.20 m   monumental: gateway frontispiece, palace gallery. Growse singles out the Kesi Ghat
                  kunjs for "unusually broad eaves", so 1.2 m is the top of the historic range in Vrindavan.
                  Beyond 1.2 m a second, lower bracket tier appears — do not cantilever further on one row.
  0.45 – 0.60 m   MODERN CONCRETE, which is most of the present lane fabric. Indian municipal practice
                  caps a chhajja at 600 mm projection without a supporting beam; 75–100 mm constant
                  thickness; brackets absent or token. Vamsi Vat's inner gateway is exactly this.
  0.45 – 0.60 m   door/window HOOD over a single opening. Hood width = opening + 2 × 0.35 m.

  SCALING RULE for a builder that has only a height:  P = clamp(H / 6, 0.35, 1.20).
       H 3.3 → 0.55    H 4.2 → 0.70    H 7.0 → 1.05    H 13 → 1.20 (clamped)

=== 3. SLAB SECTION ===
  Stone thickness:   0.12 m at the wall, tapering to 0.07 m at the tip.
  Fascia (the vertical outer edge face):  0.07 – 0.10 m.
  Slope:             1:10 to 1:12 down and out ≈ 5°. Over a 0.75 m projection that is a 0.06–0.08 m drop.
                     Some are dead flat; none slope up.
  Drip / chamfer:    0.04–0.05 m in from the underside edge.
  TOTAL SHADOW BAND at the edge (fascia + bracket drop): 0.35 – 0.50 m. This number, not P, is what the
  eye resolves from across a 4 m lane, and it is the number to protect.

=== 4. BRACKETS (toba) ===
  SPACING, centres:
     0.60 – 0.90 m   continuous run on a facade          (DEFAULT 0.75)
     0.25 – 0.35 m   "closely-set" — door hoods and dentil-like corbel courses.
                     Growse counts EIGHT under one small side doorway at Jugal Kishor; a doorway hood
                     ~2.2 m wide with 8 brackets = 0.28 m centres. Akrura Ghat's "carved dentil eaves
                     course" is the same density.
     ~2.0 m          monumental courtyard arcade only (the published figure for the Jama Masjid,
                     Fatehpur Sikri). Do NOT use this on a Vrindavan temple — it is a mosque-courtyard scale.
     HARD CEILING: never more than 1.1 m and never more than 1.2 × P. Past that the rhythm dies and the
     eave reads as a concrete shelf. (The current helper's 1.1 m is at that ceiling — see mistakes.)
  DEPTH out from the wall:   0.65 – 0.80 × P. The slab must oversail the bracket nose by 0.15 – 0.25 m.
  DROP below the slab soffit:
     0.30 – 0.45 m   run bracket (default 0.36)
     0.20 – 0.25 m   dense dentil course
     0.55 – 0.70 m   heavy jharokha / balcony bracket (Meera Bai: balcony projects 0.7–0.9 m on 5 or 6 of these)
  WIDTH:             0.14 – 0.20 m plain;  0.20 – 0.26 m figural (elephant, swan, makara).
  COUNTS per face:
     12 m front @ 0.75 m  →  17 brackets
      8 m front @ 0.75 m  →  12
      6 m shrine front    →   9,  and Growse's village temple of Bihari Ji carries its whole eave on SIX
                                  brackets of one pattern, so six is a legitimate count for a small shrine
      door hood           →   8  (Growse, exactly)
     Mughal figural clustering: 5 brackets per pillar head, 40 in one chhatri (Fatehpur Sikri, attributed —
     I could not verify this against a primary survey, so use it only as the pattern: figural brackets
     CLUSTER in threes and fives at a pier head rather than spreading evenly.)
  ALIGNMENT: one bracket centred on every pier, then fill each bay with round(bay / 0.75) equal spaces.
  Brackets that ignore the piers under them are the tell that the eave was generated, not designed.

=== 5. WHAT SITS ABOVE ===
  Parapet 0.55 – 1.00 m tall, its top 0.70 – 1.20 m above the slab. A chhajja with open sky directly
  above it is decapitated — every surveyed Braj example has a parapet, a balustrade, or a further storey.

=== 6. COLOUR ===
  Soffit: tint(wall, 0.60–0.68) for plain stone/plaster. For a street front, a documented PAINTED
  under-surface — ochre, Indian red, or blue-green — plus a 0.10 m painted stripe on the fascia.
  Slab top: tint(wall, 1.05). The 0.45 contrast between soffit and top face is what sells the slope.

## howToBuildCheaply

The existing `chhajja()` at client/src/game/world/LandmarkGenerator.js:458 is the right idea with the wrong numbers and one geometric bug. Below is the replacement recipe — all stacked/offset boxes, prisms and quads, nothing turned.

SUGGESTED SIGNATURE (back-compatible: the 9th arg was a bare `out`)
  chhajja(b, cx, y, cz, w, d, rot, color, opt = {})
  opt = {
    out    = 0.70,              // P, from clamp(H/6, 0.35, 1.20)
    spacing= 0.75,              // bracket centres; 0.28 for a hood/dentil course
    drop   = 0.36,              // bracket drop below the soffit
    thick  = 0.12,              // slab at the wall
    sides  = 'all'|'three'|'front',
    form   = 'corbel'|'scroll'|'elephant'|'none',
    soffit = tint(color, 0.64),
    piers  = [],                // local offsets that MUST carry a bracket
  }

PER FACE, four primitives:

1. DASA — the string-course the brackets stand on.  ONE box, 12 tris for the whole ring.
     b.box(cx, y - drop - 0.09, cz, w + 0.10, 0.09, d + 0.10, tint(color, 0.96), rot)
   Without this the brackets look stuck onto blank plaster. Cheapest single improvement in the whole element.

2. BRACKETS — one primitive each. Three forms, pick by material:
   (a) 'corbel'  (plastered lime work — Meera Bai, Radha Gokulananda, most of the lane fabric)
       ONE prism, deep at the top, shallow at the bottom, which IS the corbel's undercut:
         b.prism(bx, y - drop, bz, 0.16, out*0.30,   // bottom: narrow nose
                                0.16, out*0.78,     // top: full depth into the soffit
                                drop, tint(color, 0.88), rot)
       12 tris. A plain box here is the thing that reads as a shelf bracket from IKEA.
   (b) 'scroll'  (carved sandstone — the S-curve toba)
       TWO offset boxes: upper 0.16 × 0.22 × out*0.45 at the wall; nose 0.16 × 0.16 × out*0.78
       offset out 0.10 and down 0.16. From 8 m the offset reads as an S-curve. 24 tris, or 16 with
       the back and bottom faces masked off.
   (c) 'elephant' (ONLY where Growse names them — see whereItAppears)
       bevelBox body 0.24 × 0.26 × out*0.6 + a prism trunk tapering down-and-out + two quads for ears.
       ~40 tris. Cap the count at 8 per hood and never run these along a whole facade.
   Face masking: brackets are seen from below and outside only. Drop the back and bottom faces
   (faces = 0b111101 & ~backbit) and a box bracket costs 8 tris instead of 12.

3. SLAB — ONE prism, not two boxes. The taper gives the outward slope AND the edge chamfer in one go:
     b.prism(cx, y, cz, w + 2*out,        d + 2*out,          // bottom = full extent
                        w + 2*out - 0.14, d + 2*out - 0.14,   // top inset 0.07 all round
                        thick, soffit, rot, /*shadeTop*/ tint(color, 1.05))
   `prism` already takes a separate top colour, so the sloping top face is stone and the four edge
   faces and the underside are the darker soffit colour — the painted-soffit rule for free. 12 tris.

4. FASCIA STRIPE (optional, street fronts only) — one panel() along the outer edge, 2 tris,
   in the painted accent. This is the "brightly painted under-surface" Growse describes and it costs nothing.

BRACKET LAYOUT (replaces the current even loop):
     const xs = [];
     for (const p of piers) xs.push(p);                       // one on every pier, always
     // fill each gap with equal spaces closest to `spacing`
     for (each consecutive pair a,b) { n = max(1, round((b-a)/spacing)); push a + i*(b-a)/n }
     // no piers supplied → n = max(2, round(len/spacing)), evenly
Keep the bracket's BACK FACE flush with the wall: centre offset = wallFace + depth*0.5 - 0.02
(embedded 20 mm). The current code leaves a 37 mm air gap and the brackets float.

TRIANGLE BUDGET
  ~1.33 brackets per metre × 8–12 tris = ~14 tris/m of front, plus 24 tris for the slab+dasa ring.
  A 12 × 10 m temple, eave on three sides (34 m): ~500 tris.
  Sixteen temples: ~8–9k tris. Compare: one `shikhara()` at 12 sides × 12 rings = 288 tris.
  The eave is cheap; it is cheap because it is boxes.

LOD — where the savings really are:
  Past ~45 m, call with form:'none' and add one dark box under the slab:
     b.box(cx, y - 0.30, cz, w + 2*out - 0.12, 0.30, d + 2*out - 0.12, soffit, rot)
  The shadow band is the entire read at that range; the brackets are 80% of the cost and invisible.
  Also pass sides:'front' or 'three' — a chhajja is a FACADE device and the rear wall in a lane has none.

## whereItAppears

HAS IT — build it, with the variant named:

  • MEERA BAI (temple-house-court) — TWO. A between-storey chhajja running right round the court at
    3.2–3.5 m, projecting 0.35–0.55 m on CLOSELY SPACED SIMPLE FLAT CORBELS; and a moulded,
    dentil-carved eaves slab under the street parapet. Both are MOULDED LIME PLASTER, limewashed —
    only the street doorway and its jharokha brackets are real carved stone. Do not make these ashlar.
  • RADHA GOKULANANDA (temple-samadhi-yard) — chhajja at 3.8 m on small brackets over a cusped arcade
    on 0.30–0.35 m piers, parapet at 4.5 m. Plastered and limewashed, salmon-pink and cream.
  • JAIPUR MANDIR (temple-fort-palace) — the deepest in the set. A deep chajja on DENSE bracket courses
    above the first-storey gallery, plus a deep bracketed cornice on the gateway frontispiece. 0.9–1.2 m.
    This eave and the blind arcade of cusped niches are why the building reads as a Rajput palace.
  • ASHTA SAKHI (temple-upstairs-sakhi) — a deep flat chhajja on ORNATELY CARVED brackets below the roof
    parapet, at the top of three storeys, seen steeply from a lane too narrow to step back in.
  • PAGAL BABA (temple-stepped-marble) — a deep flat chhajja on brackets at EVERY receding stage, 7–8 of
    them, each with a low square-baluster parapet above; plus a bracketed cornice over the entrance porch.
    Repetition up the tower is the whole silhouette.
  • AKRURA GHAT — a deep flat slab verandah roof with a CARVED DENTIL EAVES COURSE: the dense
    0.25–0.35 m variant, not bold brackets. (One-source observation; flagged as such in its own research file.)
  • VAMSI VAT — two eras on one site: the Oel mandir's deep projecting cornice on close-set small brackets
    over a low parapet, and a plain flat CONCRETE chhajja over the remodelled inner cusped gateway.
    Build both; the contrast is real and is what the place looks like.
  • SEVA KUNJ — the small bangaldar shrine: a rolled, downturned curved eave over a bracketed cornice.
    The ONLY curved (bangla) eave in the set.
  • BANKE BIHARI, IMLI TAL, and Rangaji's two outer Jaipur-style gates (the project's own architecture
    record notes "bracketed chhajjas" on those gates, alongside the multifoil arches and jali).
  • The ghat kiosks along the Yamuna front, which Growse describes as a mile-and-a-half run of them.

POINTEDLY DOES NOT — and this is the important half:

  • THE FOUR AKBAR/JAHANGIR RED SANDSTONE TEMPLES — GOVIND DEV (1590), MADAN MOHAN, GOPINATH,
    JUGAL KISHOR (1627). They carry NO continuous bracketed chhajja on the body. In the whole memoir
    Growse mentions eaves at Govind Dev only on "the external arcades on the north and south sides"
    (the low side arcades, whose "pillars, brackets, and eaves" he renewed in the 1870s), and at
    Jugal Kishor only as HOODS over the two small side doorways, each "supported on eight closely-set
    brackets carved into the form of elephants." Their wall head is a heavy MOULDED CORNICE plus a
    lofty ARCADED PARAPET, now lost at Govind Dev.
    The sister temple of Hari Deva at Govardhan gives the pattern exactly: "the height is about
    30 feet to the cornice, which is decorated at intervals with large projecting heads of elephants
    and sea-monsters." So the 16th–17th-century group gets a MOULDED CORNICE BAND + PROJECTING ANIMAL
    HEADS AT INTERVALS (spacing ~2–3 m, projection 0.4–0.6 m, roughly 0.5 m tall) + an arcaded parapet.
    Giving these four the same bracketed eave as the 19th-century plastered temples is precisely the
    sameness the owner is complaining about — it is the single highest-value distinction in this element.
  • NEVER ON A SHIKHARA, and never on a dome drum. The horizontal on a curvilinear tower is the moulded
    band and the bhumi-amalaka, not an eave. Madan Mohan's tower has no chhajja anywhere on it.
  • PREM MANDIR and KRISHNA BALARAM (ISKCON). Prem Mandir is late-20th-century Bansi Paharpur carving —
    cornices and small balconies, but not the plain slab-on-toba. Krishna Balaram is 1970s marble.
  • REAR WALLS AND PARTY WALLS. It is a facade device. A lane wall a neighbour abuts has none, and the
    back of every one of these buildings has none.

ELEPHANT BRACKETS — only where Growse actually names them, otherwise they become wallpaper:
  Jugal Kishor's two side-door hoods (8 each, Vrindavan); the temple near the Sati Burj in Mathura
  ("a long balcony supported on brackets quaintly carved to represent elephants", uncased in 1875);
  Bitthalnath at Gokul ("bold brackets carved into the form of elephants and swans"); Hari Deva's
  cornice heads at Govardhan. That is the documented list for the whole district.

## mistakes

Bugs and errors in the current shared helper (LandmarkGenerator.js:458), then the general traps.

IN THE EXISTING CODE:
 1. BRACKET SPACING 1.1 m IS AT THE CEILING, and the comment ("roughly a bracket every 1.1 m, which is
    what the photographs show") over-reads them. Every written source says "closely-set" / "closely
    spaced" — Growse's eight brackets under one small doorway is 0.28 m centres, and the project's own
    Meera Bai survey says "closely spaced flat corbels". Use 0.75 m on a run and 0.28 m on a hood.
    At 1.1 m the eave reads as a shelf on shelf-brackets, which is a large part of why the temples
    photograph as boxes.
 2. THE BRACKETS FLOAT OFF THE WALL. `across = d*0.5 + out*0.45` with depth `out*0.8` leaves a 37 mm air
    gap between the bracket's back face and the wall at out = 0.75. Embed them 20 mm instead.
 3. THE BRACKETS PUNCH THROUGH THE SLAB. Bracket spans y-0.26 → y+0.08; slab spans y → y+0.16. The top
    80 mm of every bracket is inside the slab, so the real drop is 0.26 m, below the 0.30–0.45 m range.
 4. THE "LIP" IS AN UPSTAND, NOT A LIP. The second full-extent box at y+0.16 caps the ENTIRE slab, so the
    eave has a raised kerb all the way round instead of a chamfered, outward-sloping top. Replace both
    boxes with one `prism` whose top is inset 0.07 all round — same triangle count, correct read.
 5. THE BRACKET IS A PLAIN BOX. No taper, no undercut. `prism` costs the same 12 triangles and gives the
    corbel its diagonal, which is the only thing distinguishing a toba from a bracket in a warehouse.
 6. NO SOFFIT COLOUR. Slab is drawn in tint(color, 1.05) on all faces, so the underside is LIGHTER than
    the wall — the exact inverse of reality, and it kills the shadow band. Soffit must be ~0.64.
 7. NO DASA. Nothing under the brackets; they spring from blank plaster.
 8. IT ALWAYS RUNS ALL FOUR SIDES. Add a `sides` option. Rear and party walls have none.

GENERAL TRAPS:
 9. PUTTING IT ON THE RED SANDSTONE FOUR. Govind Dev, Madan Mohan, Gopinath and Jugal Kishor get a moulded
    cornice and projecting animal heads at intervals, not a bracket row. This is the highest-value fix here.
10. PUTTING IT ON A SHIKHARA or a dome drum. Never happens.
11. SLAB TOO THICK. Anything over 0.18 m at the root reads as a concrete canopy. 0.12 → 0.07.
12. SLOPING IT UP, or curving it. The bangla (curved, downturned) eave is Shah-Jahani and Bengali-derived;
    in this set it belongs to exactly one building, the little bangaldar shrine at Seva Kunj.
13. BRACKET NOSE REACHING THE SLAB EDGE. Always leave 0.15–0.25 m of slab oversailing the nose.
14. IGNORING THE PIERS. A bracket must land on every pier; the evenly-spaced loop that walks past a pier
    and lands 0.2 m off it is instantly readable as procedural.
15. NO PARAPET ABOVE. A chhajja against open sky looks decapitated; 0.55–1.0 m of parapet, top
    0.70–1.20 m above the slab.
16. ELEPHANT BRACKETS EVERYWHERE. Four locations in the whole district are documented. Everywhere else
    they are a costume.
17. SPENDING THE BUDGET ON CARVED BRACKETS AND THEN HAVING TO DROP THEM AT DISTANCE. Build the LOD in
    from the start: brackets inside ~45 m, a dark soffit box beyond it.
18. TREATING THE MODERN CONCRETE ONES AS FAILURES TO BE PRETTIFIED. A flat 0.5 m concrete slab with no
    brackets over a remodelled cusped gate IS what Vamsi Vat has. Build it as it is.

## sources

- F. S. Growse, 'Mathura: A District Memoir' (3rd ed. 1883) — full text downloaded and searched directly from https://archive.org/download/b29352095/b29352095_djvu.txt (Wellcome copy, public domain). GLOSSARY: 'Chhajja, stone eaves of a house or other building, supported on projecting brackets'; 'Toba, in architecture, brackets supporting the projecting eaves or chhajja'; 'Dasa, in architecture, a string-course'; 'Gokh (for gavaksha), a look-out; a window on an upper story with a projecting balcony'; 'Chira, the capital of a pillar, when it has brackets attached to it'.
- Growse, p.254 (Jugal Kishor, Kesi Ghat, Vrindavan, 1627): the choir is 25 feet square, principal entrance east, 'but is peculiar in having also, both north and south, a small doorway under a hood supported on eight closely-set brackets carved into the form of elephants.' — the only bracket-count-per-opening in the record.
- Growse, p.~248 (Govind Dev restoration, 1870s): 'the pillars, brackets, and eaves of the external arcades on the north and south sides, together with the porches at the four corners of the central dome, were all renewed' — eaves at Govind Dev are on the LOW SIDE ARCADES only; the wall head carried a now-lost 'lofty arcaded parapet'.
- Growse, on Hari Deva, Govardhan (Akbar period, Raja Bhagwan Das of Amber): nave 68 × 20 ft, choir 20 ft square, 'the height is about 30 feet to the cornice, which is decorated at intervals with large projecting heads of elephants and sea-monsters' — the only cornice height in the memoir, and the model for the red-sandstone group's wall head.
- Growse, on the Bharatpur kunjs at Kesi Ghat, Vrindavan (Ranis Kishori and Lachhmi): a colonnade of five arches on a high plinth 'shaded above by unusually broad eaves which have a wavy pattern on their under-surface and are supported on bold brackets' — the deepest eave and the carved-soffit evidence.
- Growse, on modern Mathura street architecture: 'Storey upon storey above are projecting balconies supported on quaint corbels, the arches being filled in with the most minute reticulated tracery ... and protected from the weather by broad eaves, the under-surface of which is brightly painted' — the painted-soffit rule.
- Growse, on the temple of Bihari Ji at Bachh-ban/Indrauli: a square red sandstone chhattri 'with brackets carved in the same style as some in the Brinda-ban temple of Gobind Deva; and of those that support the eaves of the temple itself six are of the same pattern' — six brackets carry a small village temple's eave.
- Growse, other bracket evidence in Braj: a temple near the Sati Burj, Mathura, with 'a long balcony supported on brackets quaintly carved to represent elephants' (masonry casing removed 1875); Bitthalnath at Gokul, 'a small but richly decorated quadrangle with bold brackets carved into the form of elephants and swans'; the river-bank cenotaphs 'mostly in old Hindu style, with brackets of good and varied design'.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/meera-bai.md — measured: ground to chhajja line 3.2–3.5 m; chhajja projects 0.35–0.55 m on closely spaced simple flat corbels (revised DOWN from 0.6–0.8 m); jharokha floor 4.0–4.5 m projecting 0.7–0.9 m on five or six heavy carved brackets; chhajja brackets are moulded lime plaster, not stone.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/radha-gokulananda.md — measured stack: piers 0.30–0.35 m square, arch springing ~2.4 m, chhajja ~3.8 m, parapet ~4.5 m; 'projecting chhajja eaves on small brackets' as the late-Mughal/Braj domestic vocabulary.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/jaipur-mandir.md, pagal-baba.md, ashta-sakhi.md, akrura-ghat.md, vamsi-vat.md, seva-kunj.md — deep chajja on dense bracket courses above the gallery under a ~16 m roof terrace (Jaipur Mandir); a deep flat chhajja on brackets at every one of 7–8 receding stages (Pagal Baba); deep flat chhajja on ornately carved brackets below the roof parapet (Ashta Sakhi); carved dentil eaves course over the verandah (Akrura Ghat); deep projecting cornice on close-set small brackets, plus a flat concrete chhajja over the inner gate (Vamsi Vat); rolled downturned eave over a bracketed cornice on a bangaldar shrine (Seva Kunj).
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/temple-architecture.json — the project's own Growse-sourced records for Gopinath (three bracket arches as an applied screen), Jugal Kishor (eight elephant brackets per side-door hood), Radha Vallabh (double tier: bracketed-and-architraved below, arched above), Rangaji (Jaipur-style outer gates with bracketed chhajjas and jali).
- Wikipedia, 'Chhajja' — https://en.wikipedia.org/wiki/Chhajja : definition, large support brackets of varying design, pink sandstone slabs on dark basalt brackets, curved chhajjas popular under Shah Jahan, pre-Mughal Hindu-temple origin.
- Grokipedia, 'Chhajja' — https://grokipedia.com/page/Chhajja : Rajasthani haveli chhajjas project 'up to 0.6 metres'; Jama Masjid (Fatehpur Sikri) courtyard brackets 'approximately two metres apart'; corbelled layered-stone brackets, dovetail joints into the wall masonry, sloped or horizontal profiles for runoff, curved 'galar' mouldings in Rajasthan.
- ASI, Fatehpur Sikri World Heritage page — https://asi.nic.in/pages/WorldHeritageFatehpurSikri : the palaces are trabeate red sandstone 'composed of pillars, ornamental arches, brackets-and-chhajjas, jharokhas, chhatris...'. The figure of five brackets per pillar / forty brackets in one chhatri surfaced in search summaries of Fatehpur Sikri descriptions but I could NOT verify it against a primary survey — use it only as the clustering pattern, not as a measurement.
- Modern Indian practice for the concrete chhajjas that dominate present-day Vrindavan lanes: municipal codes commonly set a minimum 150 mm and maximum 600 mm projection for a chajja without a separate supporting beam, at 75 mm slab thickness — e.g. https://www.comaron.com/blog/window-sill-and-sunshade-chajja-house-construction-2026 and the Chandigarh Housing Board standard RCC chajja detail, https://chbonline.in/standard-design-r-c-c-chajja-doorswindows/
- Existing code reviewed: /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/LandmarkGenerator.js lines 396-485 (THE BRAJ DETAIL VOCABULARY block, mouldedPlinth, chhajja, parapet, jharokha) and /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/engine/render/MeshBuilder.js lines 49-130 (quad/box/prism/bevelBox/panel signatures; box and prism take a BASE y, prism accepts a separate top colour, box accepts a face mask).
