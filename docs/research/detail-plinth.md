# Braj architectural detail: plinth

*Researched and verified 2026-09-27. Impact: transforms-it.*

## whatItIs

THE KURSI — the moulded plinth every Braj building stands on. Not the South Indian adhisthana (upana/jagati/tripatta-kumuda/kantha/pattika); that vocabulary does not apply here and will mislead anyone who googles it. Braj is late-Mughal/Rajput/Jat work, and its base is a KURSI: a short stack of horizontal stone courses (Growse's Braj glossary word for each course is DASA, "in architecture, a string-course", p.428) enclosing one tall panelled field (his DILA, "in architecture, a panel", p.428).

The defining property, and the one thing a stack of boxes gets wrong: A KURSI IS NOT MONOTONIC. It goes out, out, then BACK IN, then out again. A bold roll projects near the bottom; above it a NECK course recedes BEHIND the wall face; above that the tall panelled dado sits roughly flush; and the whole thing is capped by a drip course that projects out again under the floor. That one re-entrant neck is the entire difference between a moulding and a ziggurat. Growse's two adjectives for a good Braj base are "BOLD in outline and DELICATE in finish" (Kusum Sarovar, p.307) and "boldly moulded" (Gopinath, p.254) — bold means the shadow line, not the overhang, which is small.

Its second job is urban, not architectural: it is the edge of the street. There is no pavement in a Vrindavan lane. The paving butts the bottom course, the lowest one or two courses are buried in accumulated ground, and at 0.40–0.45 m the cap is a seat — Growse describes pilgrims "seated on the terraces" (p.311). The plinth is the town's furniture.

Third job: it is why there are STEPS. Growse's whole criticism of the Kusum Sarovar tombs is that the carver ran the decorated panels "all round the four sides of the building, without a blank space being left anywhere for THE STEPS, WHICH THE HEIGHT FROM THE GROUND RENDERS ABSOLUTELY NECESSARY" (p.307). A plinth and its flight are one object. Build one without the other and you have built the mistake Growse singled out.

Where the record is THIN, say so: Growse never gives a course-by-course profile or a single plinth height in feet anywhere in the Memoir. He gives adjectives, one buried depth, and Tavernier's second-hand numbers. Everything below that is not a direct quotation is reconstructed from his dimensions plus this project's own photographic surveys, and is labelled.

## proportions

== TOTAL HEIGHT, BY BUILDING CLASS (this is the number that matters most) ==
Four classes. Do not give all sixteen temples the same base.

A. LANE CLASS — goswami house, samadhi shrine, small street temple, compound gate.
   H = 0.35–0.55 m, 2–3 risers. 3 courses only.
   Anchors: docs/research/akrura-ghat.md "a plinth 2–3 steps (about 0.45 m)"; "grey plastered plinth about 0.6 m high"; docs/research/radha-gokulananda.md "three or four steps up from the lane", "verandah floor... on a low plinth".

B. COMPOUND-TEMPLE CLASS — the Vrindavan default; shrine porch raised above its own court.
   H = 0.90–1.30 m, 5–6 risers. 5–6 courses.
   Anchor: docs/research/jaipur-mandir.md "shrine porch plinth above the court: about 1.0–1.3 m, 5–6 steps."

C. RAISED-COURT CLASS — the whole compound lifted over the street.
   H = 1.50–1.80 m, 9–10 risers. 7–8 courses (a second roll+neck pair inserted).
   Anchors: docs/research/imli-tal.md "courtyard plinth above street: 1.5–1.8 m, 9–10 steps ~5.5 m wide"; docs/research/ashta-sakhi.md internal flight "seven to nine risers, ~1.3–1.6 m total rise, ~8–9 m wide".

D. AKBARI / JAGATI CLASS — Govind Dev, Madan Mohan, Gopinath, Jugal Kishor; and the lost Keshav Dev platform.
   H = 1.8–2.4 m. 8–9 courses, and TWO ornament bands rather than one dado.
   Anchor, and it is a bound not a measurement: at Govind Dev debris had piled round the base "to the astonishing height of EIGHT FEET and in some places even more, ENTIRELY CONCEALING the handsomely moulded plinth" (p.246). Eight feet = 2.44 m is therefore the CEILING, not the height. Growse says clearing it made "a considerable increase... to the elevation of the building", so it is also not small. Code 1.8 m; the honest range is 1.5–2.4 m and no source narrows it.
   Tavernier at Keshav Dev, Mathura, c.1650, quoted by Growse p.127–128, is the only fully numbered Braj plinth in the literature: "a large octagonal platform... all faced with cut stone, and has round about it TWO BANDS of many kinds of animals... in relief; THE ONE BAND BEING ONLY TWO FEET OFF THE GROUND LEVEL, THE OTHER TWO FEET FROM THE TOP. The ascent is by two staircases of 15 OR 16 STEPS EACH; the steps being only TWO FEET IN LENGTH, so that two people cannot mount abreast."
   → platform 15–16 risers ≈ 2.5–2.9 m; ornament band 1 at +0.61 m; ornament band 2 at (H − 0.61 m); plain panelled field between; the ascent stair only 0.61 m WIDE.

== COURSE STACK — 6 courses, tabulated for H = 1.00 m ==
Projection is PER SIDE, relative to the wall face above (negative = recessed).
  1  APRON        proj +0.16   h 0.12   tint 0.90   meets the paving; gets buried
  2  LOWER DASA   proj +0.13   h 0.16   tint 1.04   the bold roll; the heaviest shadow
  3  KANTHA/GALA  proj -0.05   h 0.13   tint 0.80   RECESSED. the course that makes it a moulding
  4  DILA (dado)  proj +0.02   h 0.40   tint 0.98   panelled field, ~40% of total H
  5  UPPER DASA   proj +0.11   h 0.11   tint 1.05   the drip / string-course; reads from across the lane
  6  FARSH LIP    proj +0.04   h 0.08   tint 1.10   the floor slab you stand on
                                sum 1.00

== SCALING RULES (get these wrong and it looks like a wedding cake) ==
- DO NOT scale projections with H. At every class, total projection stays 0.10–0.18 m per side. A 0.45 m lane plinth and a 2.4 m Akbari plinth project almost identically. Growse's "bold" is about shadow depth, not overhang.
- DO scale the DILA. It absorbs the height: 0.40·H at every class. Courses 1,2,3,5,6 keep near-absolute heights (0.08–0.18 m) because they are single stone courses, and a stone course is a stone course whatever it carries.
- MINIMUM COURSE HEIGHT 0.08 m. Below that it is one pixel on a phone and costs the same triangles. Clamp.
- COURSE COUNT by H: H≤0.6 → 3 (apron, dado, cap). 0.6–1.3 → 5–6. 1.3–2.0 → 7–8 (repeat roll+neck above the dado). >2.0 → 8–9 with two ornament bands per Tavernier.
- Late work is FLATTER. Growse on post-1750 Bharatpur/Jat building at Gobardhan: "the mouldings are SHALLOWER and the wall-ornamentation consists of nothing but an endless succession of niches and vases repeated with wearisome uniformity" (p.173). For anything after ~1800 (Radha Raman 1826, Jugal Kishor's new temple 1821, Rangaji 1851, Shahji 1876) use projections at the low end, 0.08–0.12 m, and a repetitive niche dado.

== DILA PANELS ==
Panel 0.50–0.70 m wide × 0.24–0.32 m high, recessed 0.03–0.05 m, pier 0.12–0.18 m between. Pitch 0.70–0.85 m.
ALIGN THEM TO THE BAY. Put 2 or 3 panels per structural bay and land a pier under each pier/bracket above. That alignment is what reads as designed rather than wallpapered. Existing chhajja bracket spacing in the code is 1.10 m, so a 2-per-bay dado at ~0.75–0.85 m pitch against a 1.1 m bracket rhythm is close but NOT harmonic — pick one rhythm and derive the other from it.
On a 12 m frontage: 14–17 panels.

== STEPS ==
Riser 0.16–0.18 m. Derived three independent ways from the project's own surveys: 1.5–1.8 m ÷ 9–10 = 0.16–0.18; 1.3–1.6 m ÷ 7–9 = 0.17–0.18; 0.45 m ÷ 2–3 = 0.15–0.22.
Tread 0.30–0.36 m. Nosing overhang 0.03 m.
Flight width, two populations, far apart:
  monumental / gateway / darshan flights: 5.0–9.0 m (Imli Tal 5.5 m; Ashta Sakhi 8–9 m)
  service and ascent stairs: 0.6–1.2 m (Tavernier's "two feet in length, so that two people cannot mount abreast")
The flight CUTS the courses. The dado stops at the cheek wall and the roll and neck die into it. That blank is exactly what Growse says the Kusum Sarovar carver forgot.

== BURIAL DEPTH — the level-rise number ==
Growse dug 8 ft of accumulated debris out of Govind Dev's court (p.246) and in 1875 "greatly improved the appearance of the temple by REDUCING THE LEVEL OF THE GROUND round the chapel, THE PLINTH OF WHICH HAD BEEN COMPLETELY BURIED" at Madan Mohan (p.252). Vrindavan's ground rises.
  pre-1700 building: bury 0.30–0.60 m — lose the apron and most of the lower roll
  1700–1850:        bury 0.10–0.25 m — lose the apron
  post-1850/modern: bury 0.03–0.08 m — the apron just meets the paving
Never zero. A plinth whose bottom edge is exactly on the ground plane reads as a prop sitting on a table.

== TERRACE TIERS (for compounds, ghats, Kusum Sarovar, the Katra) ==
Terraces step down in ~1.5 m tiers. Growse, Mathura Katra, p.126: central terrace 172 × 86 ft (52.4 × 26.2 m); "About FIVE FEET LOWER is another terrace, measuring 286 × 268 feet" (87.2 × 81.7 m). So: 1.52 m drop, and each tier is roughly 1.7× the plan dimension of the one above.
Kusum Sarovar for scale: principal tomb 57 ft (17.4 m) square on its celebrated plinth; the terrace carrying all three 460 ft (140 m) long; the lake 460 ft square (p.307).
Govind Dev for scale: nave 100 ft (30.5 m), transept span the same, walls "an average thickness of TEN FEET" (3.05 m) (p.241).

## howToBuildCheaply

== FIRST, THE FINDING THAT MATTERS MOST ==
`mouldedPlinth()` ALREADY EXISTS at client/src/game/world/LandmarkGenerator.js:437 — and `grep -rn "mouldedPlinth" client/src` returns exactly ONE hit: the definition. Same for `chhajja()` (:458) and `parapet()` (:491). The Braj detail vocabulary is defined and called ZERO TIMES. All sixteen temples still read as boxes because nothing calls the helpers written to fix that. Wiring the existing three into sixteen builders is a bigger win than any new geometry.

And the existing profile is wrong in one specific way. Its `grow` array is [0.55, 0.42, 0.22, 0.0] — strictly decreasing. That is a monotonic step-in: an Egyptian batter, not a kursi. No recessed neck, no cap projecting back out. It needs one sign flip and one extra course.

== THE HELPERS, AS THEY ACTUALLY BEHAVE ==
engine/render/MeshBuilder.js:65 — box(cx, cy, cz, w, h, d, color, rot, faces, topColor). cy is the BASE, not the centre (y0 = 0, y1 = h). This is perfect for a plinth: courses stack by accumulating y, no half-height arithmetic anywhere.
:122 — panel(cx, cy, cz, w, h, color, rot, lift). cy IS the centre here. Two triangles. This is how you get a panelled dado for nearly nothing.
:89 — prism(cx, cy, cz, bw, bd, tw, td, h, ...) base-anchored, for the one course where you want a taper.
`faces` bitmask: bit0 top, bit1 bottom, bit2 -Z, bit3 +Z, bit4 -X, bit5 +X. Pass 0b111101 to drop the bottom of every course — nobody ever sees it.

== THE RECIPE ==
```js
// Braj kursi. y is STREET level. Returns the FLOOR level.
// Projections are absolute metres per side and do NOT scale with H.
// Heights: the dado takes the height, the stone courses stay stone-sized.
const KURSI = [
  // [proj/side, height, tintK]      negative proj = RECESSED
  [ 0.16, 0.12, 0.90 ],   // apron    — buried, dirty
  [ 0.13, 0.16, 1.04 ],   // dasa     — the bold roll
  [-0.05, 0.13, 0.80 ],   // kantha   — THE RECESS. do not delete this line.
  [ 0.02, null, 0.98 ],   // dila     — null = absorbs the remaining height
  [ 0.11, 0.11, 1.05 ],   // dasa     — drip / string course
  [ 0.04, 0.08, 1.10 ],   // farsh    — floor lip
];

function kursi(b, cx, y, cz, w, d, rot, color, H = 1.0, opts = {}) {
  const flat = opts.late ? 0.7 : 1.0;          // post-1800: shallower mouldings
  const fixed = 0.60;                           // sum of the non-dado heights
  let yy = y;
  for (const [p0, h0, k] of KURSI) {
    const p = p0 * flat;
    const h = Math.max(0.08, h0 === null ? Math.max(0.18, H - fixed) : h0);
    b.box(cx, yy, cz, w + 2*p, h, d + 2*p, tint(color, k), rot, 0b111101);
    if (h0 === null) dado(b, cx, yy, cz, w + 2*p, d + 2*p, h, rot, color, opts);
    yy += h;
  }
  return yy;                                    // hand this to the wall builder
}
```
COST: 6 courses × 5 faces × 2 tris = 60 triangles.

== THE DADO, IN QUADS ==
```js
function dado(b, cx, y, cz, w, d, h, rot, color, opts) {
  const dark = tint(color, 0.74);
  const pitch = opts.bay ? opts.bay / 2 : 0.78;   // ALIGN TO THE BAY if you know it
  const ph = h * 0.68, gap = 0.15;
  for (const [len, nx, nz, face] of [[w,0,1,rot],[w,0,-1,rot+Math.PI],
                                     [d,1,0,rot+Math.PI/2],[d,-1,0,rot-Math.PI/2]]) {
    const n = Math.max(1, Math.round(len / pitch));
    const pw = len / n - gap;
    if (pw < 0.28) continue;                      // too fine to read: leave plain
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      // ... place a panel() quad at t*len along the face, lift 0.02
      b.panel(/* centre on the face */ 0,0,0, pw, ph, dark, face, 0.025);
    }
  }
}
```
COST: 4 sides × ~15 panels × 2 tris = 120 tris on a 12 m frontage; on a lane shrine, ~24.
Per temple: ~180 tris. Sixteen temples: under 3,000. Nothing.

== THE STEPS, AND THE BLANK THEY NEED ==
```js
function kursiSteps(b, cx, y, cz, width, H, rot, color) {
  const n = Math.max(2, Math.round(H / 0.17));    // riser 0.16–0.18
  const rise = H / n, tread = 0.33;
  for (let i = 0; i < n; i++)
    b.box(cx + 0, y + i*rise, cz + (n - i) * tread * 0.5,   // project toward the street
          width, rise + 0.02, (n - i) * tread,
          tint(color, 1.02 - 0.03*(i%2)), rot, 0b111101);
  // cheek walls: two plain boxes, full height, 0.22 m thick, flanking `width`.
  // THEN: suppress the dado panels across `width` + 0.44. That blank is the
  // thing Growse says the Kusum Sarovar carver forgot.
}
```
Each step is one box drawn as a solid wedge-of-boxes, not a tread-and-riser pair. n boxes × 5 faces = 10n tris; a 6-riser flight is 60 tris.
Width: 5.0–9.0 m for a main/darshan flight, 0.6–1.2 m for a side ascent.

== MEETING THE STREET ==
- CLAMP y TO LEVEL, LET THE LANE RISE AGAINST IT. A kursi never follows a slope. Set the base y once per building and let the terrain cut the apron. The number of visible courses then changes along the run by itself, which is exactly what the photographs show, and it costs nothing.
- SINK IT. base_y = ground − burial, using the table in proportions (0.30–0.60 m pre-1700, 0.10–0.25 m 1700–1850, 0.03–0.08 m modern).
- CULL THE BACK. Where a plinth abuts a neighbour's wall, pass a faces mask dropping that side. Vrindavan houses are party-walled; three-quarters of these bases are only ever seen on one or two faces.
- COLOUR IT DIFFERENTLY FROM THE WALL. Two knobs, both nearly free:
    sandstone buildings: tint(wall, 0.88) — splash-dirtied stone.
    lime-plastered buildings: a MAROON or TERRACOTTA-RED band. docs/research/radha-gokulananda.md records "a terracotta-red band at pier bases" and "a maroon plinth flaking to cream". This is the commonest painted Braj base and one colour constant delivers it.
- PUT PEOPLE ON IT. At 0.40–0.45 m the cap is seat height. Growse (p.311) describes visitors "seated on the terraces". If the crowd system can place a sitter, the plinth is where they sit, and that single behaviour does more for "this is a real street" than any geometry.

== WHAT THE FOUR CLASSES COST, END TO END ==
lane shrine (3 courses, 24 panels, 3 steps):    ~ 84 tris
compound temple (6, 120, 6):                    ~240 tris
raised court (8, 120, 10):                      ~300 tris
Akbari (9 courses, two bands, 16 risers):       ~420 tris
Sixteen temples plus the street ranges: well under 10k. This is the cheapest legibility in the whole project.

## whereItAppears

== GROWSE NAMES A MOULDED PLINTH ON THESE, IN THESE WORDS ==
- GOVIND DEV (1590). "the handsomely moulded plinth" — concealed under 8 ft of debris until Growse cleared it in August 1873; clearing it made "a considerable increase... to the elevation of the building — the one point in which, since the loss of the original parapet and towers, the design had appeared defective" (p.246). Growse is explicitly saying the plinth is what rescues the proportions of a building that otherwise reads "heavy" and "stunted" (p.245). That is the owner's complaint, diagnosed in 1883.
  CODE NOW: LandmarkGenerator.js:2938 sets FL = ground + 1.1 and the "moulded plinth" at :2945 is a SINGLE 0.5 m plain box. It has no mouldings. This is the highest-value single fix in the file.
- GOPINATH (early 17th c). Its south wall "already had A FINE BOLDLY MOULDED PLINTH and required no further adornment" — Growse's point being that the three bracket arches screening that wall are redundant BECAUSE the plinth already carried it (p.254). He also records that "The terrace on which this arcade stands has a CARVED STONE FRONT, WHICH HAD BEEN BURIED FOR YEARS, TILL I UNCOVERED IT." Two levels: a carved terrace front, and a moulded plinth above it. The code already quotes this at :4003/:4065 — it needs the geometry to match the comment.
- MADAN MOHAN (1590). Chapel plinth "HAD BEEN COMPLETELY BURIED"; Growse lowered the ground round it in 1875 and the municipality built "a new approach to the court-yard... from the east with a flight of masonry steps up the ascent" for Rs. 200 (p.252). Hill + flight + plinth, in that order.
- RADHA INDRA KISHOR (completed 1871). "The building is RAISED ON A HIGH AND ENRICHED PLINTH, and the entire design is singularly light and graceful." 70 ft (21.3 m) square, three aisles of five bays, cost three lakhs (p.263). This is the model for a 19th-century Vrindavan temple base: high, panelled, and the reason Growse calls an otherwise plain block graceful.
- RANI LACHHMI'S KUNJ, Kesi Ghat. The chapel front "has a colonnade of five arches STANDING ON A HIGH PLINTH, which, like every part of the wall surface, is covered with the most delicate carving and is shaded above by unusually broad eaves... supported on bold brackets" (p.264). Plinth below, chhajja above, carving between — the complete Braj horizontal grammar in one sentence.
- KUSUM SAROVAR, Suraj Mall's tomb (1764, 57 ft square). "THE BEST PART OF THE DESIGN IS THE PLINTH, WHICH IS AT ONCE BOLD IN OUTLINE AND DELICATE IN FINISH" (p.307). The single best description of a Braj kursi in the literature, and the source of both adjectives.
- RANDHIR SINH & BALADEVA SINH CHHATRIS, Manasi Ganga (1823, 1825). Each is "a lofty and substantial square masonry terrace with corner kiosks and lateral alcoves, and in the centre the monument itself, STILL FURTHER RAISED ON A RICHLY DECORATED PLINTH" (p.306). Two-tier: terrace, then plinth. Note Growse's verdict that these are contractor work, "scamped", with details "repeated with a monotonous uniformity" — if you build these, build them coarser than the Kusum Sarovar group.
- KESHAV DEV, Mathura (destroyed 1670). Tavernier's octagonal cut-stone platform, 15–16 risers, two sculptured bands at +2 ft and top−2 ft, narrow one-abreast stairs (p.127–128). The only fully dimensioned Braj plinth on record.
- KUKARGAMA, a village shrine. "a plinth, 4 feet 8 inches square, formed of massive blocks of a hard and closely grained grey stone. THE MOULDINGS ARE BOLD AND SIMPLE, like what may be seen in the oldest Kashmir temples" (p.169). Pre-Mughal, and the one place Growse gives a plinth a measurement.

== POINTEDLY DOES NOT HAVE ONE ==
- GANGA MOHAN KUNJ, Kesi Ghat — the same mass reads as two different things on two sides: "The river front... has A HIGH AND MASSIVE BASEMENT STORY, which on the land side, as seen from the interior of the court, BECOMES A MERE PLINTH for the support of a majestic double cloister" (p.265). If you build one riverfront kunj, build it this way: basement storey to the water, low kursi to the court. Growse calls its arcade "a very fine specimen of [the Jat] style at its best" (p.173).
- RADHA RAMAN (present building 1826) — no plinth is recorded anywhere, and this project's own survey describes "a simple sandstone structure at first glance hardly distinguishable from the houses around it", wedged between buildings. Give it the LANE class, 0.35–0.50 m, 2 steps. A temple-class plinth here would be an invention.
- RADHA GOKULANANDA — docs/research/radha-gokulananda.md: verandah "on a low plinth", street gate "three or four steps up from the lane", samadhi shrines with "a maroon plinth flaking to cream". Lane class throughout. Its Vishvanatha samadhi is the one place in the complex where a small decorated plinth is documented.
- AKRURA DHAM and the other post-1990 temples — docs/research/akrura-ghat.md: machine-cut Bansi Paharpur sandstone, forecourt "on a plinth 2–3 steps (about 0.45 m)", pavilions on "a grey plastered plinth about 0.6 m high" with stainless railings and a black marble skirting band. Two courses and a skirting. NOT a kursi. Modern temples get the simple version and that difference is itself a period marker worth building.
- THE WHOLE POST-1800 JAT/BHARATPUR STRAND at Gobardhan and after — Growse, p.173: "the mouldings are SHALLOWER and the wall-ornamentation consists of nothing but an endless succession of NICHES AND VASES repeated with wearisome uniformity." Flatten the profile to ~0.7× and make the dado repetitive on anything from this period.
- SHAHJI (1876) — white Italian marble and twelve spiral columns. Whatever it has, it is not a sandstone kursi. Do not carry the vocabulary onto it without evidence.
- RANGAJI (1851) — Dravidian-derived, built to a South Indian model. This is the ONE temple in Vrindavan where the adhisthana vocabulary might genuinely apply and the Braj kursi does not. Research it separately.

== THE HONEST GAP ==
Growse surveyed these buildings, restored two of them with his own hands, and still never wrote down a course profile, a projection, or a plinth height in feet. There is no measured section of a Braj plinth in any public-domain source I could reach. Nalini Thakur's measured drawings of Govind Dev exist — published in Margaret Case, ed., "Govindadeva: A Dialogue in Stone" (IGNCA, 1996), drawn under ASI permission — and that book is where the real numbers are. It is not online. If anyone can get a copy, the Govind Dev plinth section in it would replace half of the reconstructed figures above with measured ones.

## mistakes

1. THE MONOTONIC STEP-IN — the mistake currently in the code. `mouldedPlinth()` at LandmarkGenerator.js:437 uses grow = [0.55, 0.42, 0.22, 0.0], strictly decreasing. Every course narrower than the one below is an Egyptian batter or a ziggurat, and it is the single reason a stack of boxes still reads as a stack of boxes. A kursi MUST contain one course that recedes BEHIND the wall face. Fix: make course 3 negative (−0.05) and add a cap course that projects back out.

2. NO CAP / DRIP COURSE. If the topmost course is the narrowest, the base is a pyramid. The real profile crowns with a course projecting +0.10 m under the floor line, throwing the horizontal shadow you actually see from across a 4 m lane. Growse's glossary word for it is DASA, "in architecture, a string-course" (p.428).

3. SCALING PROJECTIONS WITH HEIGHT. The commonest instinct and always wrong. A 2.4 m Akbari plinth projects about as far as a 0.45 m lane plinth — 0.10 to 0.18 m per side. Scale the DADO, never the mouldings. A 2.4 m plinth with 0.4 m projections is a wedding cake.

4. TOO MANY, TOO THIN. Eight 0.06 m courses cost the same triangles as eight 0.16 m courses and resolve to a grey smear on a phone at 1:1. Below 0.08 m a course does not exist. Three bold courses beat eight thin ones, every time, on this hardware.

5. NO STEPS. Growse's whole criticism of the finest plinth in Braj is that its carver left no blank "for the steps, WHICH THE HEIGHT FROM THE GROUND RENDERS ABSOLUTELY NECESSARY" (p.307). Any plinth over ~0.35 m without a flight is wrong, and the flight must INTERRUPT the dado, not sit in front of it. Carrying the panels unbroken behind a stair is the precise error Growse singled out in 1883.

6. FLOATING / RESTING EXACTLY ON THE GROUND PLANE. Vrindavan's ground rises; Growse dug 8 ft of it off Govind Dev and found Madan Mohan's plinth "completely buried". Bury the apron 0.03–0.60 m depending on the building's date. A base whose bottom edge sits exactly on the terrain reads as a model on a table.

7. SLOPING THE PLINTH TO FOLLOW THE LANE. Masonry stays level; the street rises against it and swallows courses as it goes. Clamping base y per building and letting the terrain cut it is both more correct AND cheaper than conforming geometry to the ground.

8. ONE PLINTH FOR ALL SIXTEEN. Four classes: lane 0.45, compound 1.1, raised court 1.65, Akbari 1.8. Radha Raman's base and Govind Dev's base are not the same object and should not share a default.

9. SAME COLOUR AS THE WALL. The base is always darker — splash, dirt, and on plastered buildings a deliberate maroon or terracotta band (documented at Radha Gokulananda). One tint constant, enormous return.

10. IMPORTING THE ADHISTHANA VOCABULARY. Searching "temple plinth mouldings" returns upana / jagati / tripatta-kumuda / kantha / pattika / prati — that is the South Indian Dravida system and it belongs to Rangaji, if anywhere. Braj is late-Mughal/Rajput. Using Dravida profiles here will make sixteen buildings wrong in a way that looks researched.

11. MARBLE. Only Shahji (1876) and post-1990 work. The historic Braj plinth is Bharatpur/Bansi Paharpur red-to-buff sandstone or painted lime plaster.

12. CARVING THE BACK. These buildings are party-walled into a dense lane fabric. Cull the faces nobody can reach, and skip the dado entirely on any side that abuts.

13. BUILDING THE HELPER AND NOT CALLING IT. `mouldedPlinth`, `chhajja` and `parapet` all exist in LandmarkGenerator.js and all have exactly one occurrence in the whole client — their own definition. Whatever is added to the vocabulary next, the wiring is the work.

## sources

- F. S. Growse, 'Mathura: A District Memoir' (3rd ed., 1883) — full OCR text downloaded from Internet Archive scan b29352095 (https://archive.org/details/b29352095, djvu.txt). Passages used, by page: p.126-128 Katra terraces (172x86 ft; second terrace 'about five feet lower', 286x268 ft) and Tavernier c.1650 on the Keshav Dev octagonal platform (two relief bands at +2 ft and top-2 ft, two staircases of 15-16 steps, steps 'only two feet in length'); p.169 Kukargama plinth 4 ft 8 in square, 'mouldings are bold and simple'; p.173 the Jat style and its successor, 'the mouldings are shallower... an endless succession of niches and vases repeated with wearisome uniformity'; p.241 Govind Dev, nave 100 ft, transepts 100 ft, walls 'an average thickness of ten feet'; p.245-246 restoration Aug 1873, debris 'to the astonishing height of eight feet and in some places even more, entirely concealing the handsomely moulded plinth', 'a considerable increase was thus made to the elevation of the building'; p.252 Madan Mohan, 1875, 'reducing the level of the ground round the chapel, the plinth of which had been completely buried', new flight of masonry steps from the east for Rs.200; p.254 Gopinath, south wall 'already had a fine boldly moulded plinth and required no further adornment', terrace with 'a carved stone front, which had been buried for years, till I uncovered it'; p.263 Radha Indra Kishor (1871), 70 ft square, 'raised on a high and enriched plinth'; p.264 Rani Lachhmi's kunj at Kesi Ghat, 'a colonnade of five arches standing on a high plinth... shaded above by unusually broad eaves... supported on bold brackets'; p.265 Ganga Mohan Kunj, river front 'a high and massive basement story, which on the land side... becomes a mere plinth'; p.306-307 Randhir Sinh and Baladeva Sinh chhatris 'still further raised on a richly decorated plinth', Suraj Mall's tomb 57 ft square, 'the best part of the design is the plinth, which is at once bold in outline and delicate in finish', and the decorated panels 'continued all round the four sides... without a blank space being left anywhere for the steps, which the height from the ground renders absolutely necessary'; p.311 pilgrims 'seated on the terraces'; p.427-428 Braj architectural glossary — DASA 'in architecture, a string-course', DILA 'in architecture, a panel', CHHAJJA 'stone eaves of a house or other building, supported on projecting brackets', TOBA 'brackets supporting the projecting eaves or chhajja', ALIN 'a pilaster, or attached pillar', CHHARI 'the shaft of a pillar', BHARNA/CHIRA 'the capital of a pillar', GOKH 'a window on an upper story with a projecting balcony'. Growse gives NO course-by-course profile and NO plinth height in feet for any Braj temple.
- Tavernier, 'Les Six Voyages' (visited Mathura c.1650), as translated and quoted in Growse pp.127-128 — the only fully dimensioned Braj temple plinth in the public-domain record.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/imli-tal.md — 'Courtyard plinth above street: 1.5-1.8 m, 9-10 steps ~5.5 m wide'; octagonal marble platform 6-7 m across, 0.45 m high.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/akrura-ghat.md — forecourt 'on a plinth 2-3 steps (about 0.45 m)'; Hanuman pavilion 'about 4.5 x 4.5 m on a 0.6 m plinth'; 'stainless-steel tube railings on a grey plastered plinth about 0.6 m high'; forecourt 'slightly below the plinth, reached by two or three broad shallow steps'.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/jaipur-mandir.md — 'Shrine porch plinth above the court: about 1.0-1.3 m, 5-6 steps'; 'Projecting central porch on a plinth of 5-6 steps'; cloistered ranges 'on raised plinths'; 'the altars are NOT upstairs (they are at ground/plinth level behind the great arch, up 5-6 steps)'.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/ashta-sakhi.md — 'Steps at the far end: about seven to nine risers, ~1.3-1.6 m total rise, ~8-9 m wide'; altar platform '~1 m above the hall floor'.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/radha-gokulananda.md — 'a terracotta-red band at pier bases'; 'a maroon plinth flaking to cream'; 'Verandah floor in black-and-white checkerboard marble on a low plinth'; street gate 'Three or four steps up from the lane'; 'plinth and step bringing the overall footprint to ~2.5-3 m'; Narottama's chhatri 'on a 0.35 m platform'.
- /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/temple-architecture.json — Radha Raman entry: present building 1826, 'a simple sandstone structure at first glance hardly distinguishable from the houses around it', no tower, no documented plinth.
- /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/LandmarkGenerator.js:437 mouldedPlinth() (grow = [0.55, 0.42, 0.22, 0.0], monotonic, 4 courses, h=0.55 default); :458 chhajja(); :491 parapet(); :2938 Govind Dev FL = ground + 1.1 with a single 0.5 m unmoulded 'plinth' box at :2945; :4003 Gopinath 'a fine boldly moulded plinth' comment with no moulding geometry. VERIFIED: grep -rn across client/src returns exactly one occurrence of each of mouldedPlinth, chhajja and parapet — the definitions. Zero call sites.
- /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/engine/render/MeshBuilder.js:65 box() (cy is the BASE, y0=0 to y1=h; faces bitmask bit0 top, bit1 bottom, bit2 -Z, bit3 +Z, bit4 -X, bit5 +X); :89 prism() base-anchored tapered box; :106 bevelBox() (three stacked prisms); :122 panel() (centre-anchored, two triangles).
- Margaret H. Case (ed.), 'Govindadeva: A Dialogue in Stone', Indira Gandhi National Centre for the Arts, New Delhi, 1996 — contains Nalini Thakur's measured plans, elevations and sections of Govind Dev prepared under ASI permission. NOT consulted: not available online. This is where the actual measured plinth section exists and would replace the reconstructed figures above.
- https://archive.org/details/b29352095 — Wellcome copy of Growse, the scan used.
- https://archive.org/details/in.ernet.dli.2015.32120 — second Growse scan (Digital Library of India).
- https://ignca.gov.in/brhadisvaratemple/VIMAN/ARCHITECTURE/Components/pages/01_Adhisthana.htm and https://www.intachblr.org/ulsoorsomeshwara/article.php?artid=51&Pid=architecture&id=ENG — consulted and REJECTED as a model for Braj. These document the South Indian Dravida adhisthana (upana, jagati, tripatta-kumuda, kantha, pattika, prati). Recorded here so the next researcher does not re-import it: it is the wrong system for late-Mughal/Rajput Braj, and would only apply to Rangaji (1851).
