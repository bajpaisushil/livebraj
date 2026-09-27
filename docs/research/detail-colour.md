# Braj architectural detail: colour

*Researched and verified 2026-09-27. Impact: transforms-it.*

## whatItIs

COLOUR AND SURFACE — the free half of the fix. Sixteen temples currently read as boxes partly because each is one flat hex. On a real Braj temple, no two square metres are the same colour, and the variation is not random noise: it is four stacked, *rule-governed* layers, every one of which is documented.

LAYER 1 — THE STONE FAMILY. Braj has three distinct building materials and they are not interchangeable between buildings.
(a) Red sandstone from the Bharatpur/Bayana quarries — Growse names the source repeatedly: Hari Deva at Gobardhan is "red sandstone from the Bharatpur quarries, while the foundations are composed of rough blocks of the stone found in the neighbourhood" (p.305); the Rani of Tikari's temple piers are "each shaft being a single piece of stone, brought from the Paharpur quarry in Bharatpur territory" (p.263); Mathura's streets were paved with "substantial stone flags brought from the Bharatpur quarries" (p.155). That quarry is Bansi Paharpur, still worked, and still sold in THREE named grades — pink, red, and "barra". One building carries all three because it was built from whatever the barge brought. Tavernier (quoted by Growse, p.119–20) on the Mathura stone: "of a reddish tint, brought from a large quarry near Agra. It splits like our slate, and you can have slabs 15 feet long and nine or ten broad and only some six inches thick" — i.e. 4.6 m × 2.7–3.0 m × 150 mm. That is why these walls read as LARGE panels, not small bricks.
(b) Lime plaster over brick — the whole town that is not a Mughal-period temple. Growse: where stone ran short in the Madan Mohan nave rebuild, "the place of stone being supplied by brick" (p.252).
(c) White marble — Shahji's "colonnade of spiral marble pillars, each shaft being of a single piece" (p.262); Prem Mandir (Italian marble, 1990s–2012); ISKCON Krishna Balaram.

LAYER 2 — HOW ONE BUILDING VARIES ACROSS ITSELF. Vertically, monotonically, bottom-dark to top-light. Measured off a midday photograph of Govind Dev: sunlit upper pier faces #c6835a and #a27252 (H 23°/S 55%/V 78% and H 24°/S 49%/V 64%), mid-wall #7a4d36 (V 48%), lower wall #513022 (V 32%), plinth zone #2c1f18 (V 17%). Same hue throughout (18–24°), value falling by a factor of 4.5 from parapet to plinth. Horizontally, course-by-course: roughly one block in seven is a visibly paler grade or a replacement, jumping +20% value and dropping ~25% saturation against its neighbours.

LAYER 3 — WEATHERING, AND IT FOLLOWS THE CARVING. Growse's most useful single sentence, on Lala Babu's temple (p.257–58): the two sikharas "are singularly plain, but have been wisely so designed that their smooth polished surface may remain unsullied by rain and dust." Dirt lives where carving is. Flat polished surfaces stay clean. So streaks hang BELOW cornices, drip edges and carved bands — never on plain ashlar. On the ghats, Growse found mendicants had taken the stone kiosks for kitchens, "blocking up the arches with mud walls and blackening the carved work with the smoke of their fires" (p.264). And the black is chemistry, not just soot: studies of Indian red sandstone monuments find the crust is amorphous carbon plus heavy metals bound in gypsum, and it forms on rain-SHELTERED surfaces while rain-washed faces stay red.

LAYER 4 — PAINT, WHICH IS REAL AND WHICH PEOPLE FORGET. Three documented conventions:
(i) The chhajja soffit is painted. Growse on the Mathura/Vrindavan modern style: the balconies are "protected from the weather by broad eaves, the under-surface of which is brightly painted" (p.155); at Rani Lachhmi's kunj by Keshi Ghat, "unusually broad eaves which have a wavy pattern on their under-surface" (p.264). The underside of every eave is a DIFFERENT colour from the wall.
(ii) Periodic whitewash over stone. Growse explains why a French traveller thought Dwarkadhish looked like a cotton factory: "possibly he may have seen it soon after the festival of the Diwali, when, according to barbarous Hindu custom, the whole of the stone front is beautified with a thick coat of whitewash" (p.156). And in 1882 a Jaipur agent whitewashed Govind Dev's interior "walls and pillars… up to about half their height, thus ruining the architectural effect, which depends so much on the rich glow of the red sandstone" (p.245–46 fn). Half height. That is a number.
(iii) Gilt metal, in tiny quantity and very high value. Rani of Tikari's copper kalash alone cost Rs 5,000 (p.263); Rangji's copper-gilt dhvaja stambha is 60 ft high (p.260).

And the modern street layer, which is what a pilgrim actually photographs: the Radha Vallabh street gate today is painted vermilion (sampled #e25f3c in sun, #792512 in shade — H 11–13°, S 73–85%), with white line-drawn lotus motifs, a yellow signboard, and an ochre-yellow band on the door jambs. That is not "temple architecture" but it is 40% of the pixels.

## proportions

All hexes are sRGB, taken as the MIDDAY SUNLIT SIDE FACE. Everything else is derived from these by multipliers. H/S/V given so you can tune without losing the family.

=== A. BASE PALETTE (14 constants — this is the whole module) ===
Red sandstone, Bharatpur family (use all four on every "red" temple):
  SS_RED    0x8c4a2f   H 18° S 66% V 55%   — the commonest course, ~55% of blocks
  SS_BROWN  0x6b3a26   H 18° S 65% V 42%   — darker course, ~20% of blocks
  SS_PINK   0xb07a56   H 22° S 51% V 69%   — the "pink" grade / newer replacement, ~12%
  SS_BARRA  0xa9764f   H 24° S 54% V 66%   — variegated grade, ~13%
Lime plaster / buff (the rest of the town):
  LP_CREAM  0xd8c39a   H 34° S 29% V 85%
  LP_BUFF   0xbe9a6c   H 32° S 43% V 75%
  LP_PINK   0xc08b76   H 13° S 39% V 75%   — the pink-plastered house at Keshi Ghat
  LP_WHITE  0xeae3d6   H 36° S  9% V 92%   — fresh whitewash
Marble (TWO whites, never one):
  MB_WARM   0xd9cbac   H 40° S 21% V 85%   — Shahji's centre pavilion, honeyed
  MB_COOL   0xdcdcd8   H 60° S  3% V 86%   — Shahji's balustrade, ISKCON, Prem Mandir
Dirt:
  W_SOOT    0x2a211b   W_DAMP 0x5b4c42   W_ALGAE 0x3d4436   W_DUST 0xc9b294
Paint:
  PT_VERM   0xb8402a   PT_OCHRE 0xd79a2b   PT_WHITE 0xf2efe6   PT_GILT 0xc9a03c (already in your file)
Ground for comparison (measured off the Govind Dev plaza): 0xc9a98e — the ground is LIGHTER than the building. If your plaza is dark the temple looks pasted on.

=== B. THE VERTICAL RAMP (the single highest-value number here) ===
Let H = wall height, y = height above the building's own ground.
  Land buildings:       vMul(y) = 0.58 + 0.42 · min(1, y / (0.30·H))
  Riverfront buildings: vMul(y) = 0.45 + 0.55 · min(1, (y − 2.6) / (0.22·H)), clamped ≥ 0.45
The 2.6 m is the Yamuna silt line: Mathura's danger level is 166 m and floods run to 166.68 m, putting the Keshi Ghat steps and the road under water most monsoons. Below 2.6 m on a riverfront building, everything is one grey-brown regardless of what it is made of — blend 60% toward W_DAMP.
Measured check (Govind Dev, H ≈ 17 m): V 78% at 12 m, 48% at 6 m, 32% at 3 m, 17% at 1 m. Ratio top:bottom = 4.5:1.

=== C. SHADE MULTIPLIERS (multiply V, keep H, S) ===
  upward-facing top face:        ×1.12  (use box()'s existing topColor argument)
  ledge/cornice top > 0.25 m deep: ×1.12 then blend 35% toward W_DUST
  recessed panel field:          ×0.62
  under an eave (soffit):        DO NOT SHADE — use a PAINT colour (see F)
  inside a cusped arch:          ×0.16   (measured #100d0a against #c6835a: V 6% vs 78%)
  self-shadowed side of a shikhara: ×0.55

=== D. COURSE JITTER (per 0.45 m course, hashed on y and building id) ===
  V × (1 ± 0.06), S × (1 ± 0.05) every course.
  12% of courses take SS_PINK or SS_BARRA instead of SS_RED: +22% V, −28% S.
  Course height 0.45 m is right for the panelled shikhara faces; for the big slab walls use 0.9 m,
  since the quarry splits at 150 mm thick and up to 4.6 m long — few, large panels.

=== E. STREAKS ===
  Only below a cornice, drip edge, carved band or window sill. Never on plain ashlar.
  width 0.10–0.25 m; length 0.8–2.2 m (≈ 0.10–0.25·H); 2–5 per 6 m of cornice run;
  colour = base with V ×0.42, S ×0.80; offset 0.015 m proud of the wall.
  In the shaded/north quadrant swap 30% of streaks to W_ALGAE.
  Budget: 2 triangles each, so a whole temple's streaking is 24–40 triangles.

=== F. PAINTED SOFFITS AND BANDS ===
  Every chhajja soffit: PT_OCHRE or PT_VERM, never the wall colour. One quad per eave run.
  Interior whitewash band: floor to 0.50·H exactly (Growse's 1882 figure), LP_WHITE, box 0.02 m proud.
  Street-gate scheme (Radha Vallabh, and the bazaar generally): PT_VERM arch face, PT_OCHRE 0.6 m
  band up each jamb from the threshold, PT_WHITE 0.04 m drawn line at the arch edge.
  Diwali state (optional, if you ever want a festival dressing): LP_WHITE over the FRONT FACE ONLY,
  blurring the carving — Growse says "a thick coat", thick enough that a visitor mistook the
  building for a barrack.

=== G. WHOLE-TOWN VALUE RANGE, FOR SKY MATCHING ===
Under the overcast/monsoon sky measured at Keshi Ghat, every built surface on a 120 m riverfront
sat inside H 5–22°, S 18–45%, V 24–46%, with ONE pink house at V 70% — against a sky at V 92%.
So in dull light the town is roughly one third the brightness of the sky. In your midday lighting,
buildings run V 45–80%. If your buildings are brighter than V 80% in any weather, they are wrong.

=== H. HUE SEPARATION (the thing that makes the town legible from the tower) ===
  red sandstone temples: H 14–22°
  lime-plaster/buff town: H 27–38°  ← 10–16° away, which is exactly why Rangji's cream gate
                                      reads as a different substance from Govind Dev at 400 m
  marble: S ≤ 21% (warm) or ≤ 3% (cool)
  painted street level: H 11–13°, S 73–85% — more saturated than any stone in town.

## howToBuildCheaply

Zero new triangles for 80% of the effect, because this is all colour arguments on boxes you already emit.

=== STEP 1: one palette module, no per-temple hexes (0 triangles) ===
New file `client/src/game/world/BrajPalette.js` exporting the 14 constants in §A, plus three pure functions. Your builders currently inline hexes (`0xa8321e`, `0xbfae8b`, …) and only Krishna Balaram has named constants (KB_CREAM, KB_IVORY, KB_SALMON, KB_TEAL). Promote that pattern to the shared module — then one correction really does improve sixteen buildings.

  export function stone(base, y, H, seed, opts) — returns a hex.
    1. hash(seed, floor(y / 0.45)) → per-course rng
    2. 12% of the time swap base for the pale grade
    3. jitter V ±6%, S ±5%
    4. multiply V by the vertical ramp in §B
    5. multiply V by the shade multiplier in §C
  Implement in HSV: hex→hsv, scale, hsv→hex. ~30 lines, runs at build time only, costs nothing at runtime.

  export function sunTop(hex)  — hex with V ×1.12, for box()'s existing `topColor` argument.
  export function dusted(hex)  — hex blended 35% toward W_DUST, for ledge tops.

=== STEP 2: retrofit the box calls (0 triangles) ===
Your signature is already `box(cx, cy, cz, w, h, d, color, rot, faces, topColor)`. So:
    b.box(x, y, z, w, h, d, 0x8c4a2f)
becomes
    const c = stone(SS_RED, y - ground, H, loc.id);
    b.box(x, y, z, w, h, d, c, rot, 0b111111, sunTop(c));
Every wall box in a temple builder gets the same two-line change. A sed-able pattern, sixteen times.

=== STEP 3: streaks, as quads (2 triangles each) ===
    export function streaks(b, x, y, z, runLen, dropMax, rot, base, rng) {
      const n = Math.max(2, Math.round(runLen / 1.8));   // 2–5 per 6 m
      for (let i = 0; i < n; i++) {
        const w = 0.10 + rng() * 0.15;
        const drop = 0.8 + rng() * 1.4;
        const t = (i + 0.3 + rng() * 0.4) / n;
        b.quad(... a vertical rectangle 0.015 m proud, w wide, drop tall ...,
               shift(base, { v: 0.42, s: 0.80 }));
      }
    }
Call it once under each cornice/chhajja run a builder already draws. 8–14 calls per temple
→ 24–40 triangles. That is the entire weathering budget.

=== STEP 4: the bottom band, as ONE box (12 triangles, and only on riverfront buildings) ===
    b.box(cx, ground + 1.3, cz, W + 0.04, 2.6, D + 0.04, blend(base, W_DAMP, 0.6), rot);
A single slightly-oversized box hugging the base. Reads instantly as a flood/damp line and you
get it for the cost of one cube. For non-riverfront buildings skip it — the ramp in §B is enough.

=== STEP 5: painted soffits (1 quad per eave, which you may already be drawing) ===
Wherever a builder emits an eave/chhajja box, add the downward-facing quad in PT_OCHRE.
If you are already emitting the eave as a box, just pass a `faces` mask and a second thin box
0.01 m below it in PT_OCHRE — cheaper than a special case.

=== STEP 6: pick-out lines at the street (2–6 quads per gate) ===
A 0.04 m PT_WHITE quad along the outer edge of the entrance arch, and a 0.6 m PT_OCHRE box up
each jamb. This is the single cheapest "that's Vrindavan" signal in the whole vocabulary.

=== TOTAL COST PER TEMPLE ===
  streaks        24–40 tris
  damp band       0–12 tris
  soffits        12–24 tris
  gate pick-out   8–16 tris
  ---------------------------
                 44–92 triangles, and the §A–§D work is free.

=== ONE GOTCHA THAT WILL EAT A DAY ===
These are sRGB hexes. In three.js with colour management on, `new THREE.Color(0x8c4a2f)` and a
vertex-colour buffer are treated differently — pass hexes through `setHex(h, THREE.SRGBColorSpace)`
(or convertSRGBToLinear) before writing them into the vertex-colour attribute, or every number
above comes out muddy and dark and you will "fix" it by raising saturation, which is the exact
wrong move. Check one known value end-to-end (render SS_PINK, screenshot, sample it, expect
#b07a56 ±4) before tuning anything else.

## whereItAppears

=== RED SANDSTONE FAMILY (H 14–22°, S 50–75%) — use SS_* plus the full ramp ===
GOVIND DEV — the reference building. Measured midday: sunlit piers #c6835a / #a27252 / #7a4d36,
mid-wall #513022, plinth #2c1f18. Growse: its architectural effect "depends so much on the rich
glow of the red sandstone" (p.245–46 fn). Strong course banding visible in photographs — pale
pinkish courses alternating with dark red-brown ones, roughly 1 in 6. Note also that Growse dug
8 FEET (2.4 m) of accumulated debris off its base in 1873, "entirely concealing the handsomely
moulded plinth" — so the plinth mouldings are clean and sharp where they were buried, and worn
above. Give the bottom 2.4 m LESS weathering, not more.
MADAN MOHAN — the most saturated of the group. Measured at low sun: #864021, #6c3b23, #642c18,
#4c2415, #33190f (H 16–20°, S 68–76%). One pale patch at #a17a62 (S 39%) where a block was
replaced. Its ghat was built "all of red stone" (p.250). Its nave was rebuilt using brick where
stone ran short (p.252) — so the nave should carry a plaster/brick colour, not the shikhara's.
GOPINATH, JUGAL KISHOR — same family, same period, same quarry; Jugal Kishor's shikhara in the
Keshi Ghat panorama is the most magenta thing on the riverfront (H 332–5° in overcast), clearly
redder than the buff havelis beside it.
RADHA VALLABH (old fabric), RADHA DAMODAR (old fabric) — red sandstone, but both now have their
active worship in modern buildings alongside, which are plastered. Two materials, one site.

=== LIME PLASTER / BUFF (H 27–38°, S 25–45%) ===
RANGJI's west gate — measured #c7a77e, #b7946c, #d4b790, #9a7958 (H 30–34°, S 32–43%). Cream,
not red. Growse (p.260) describes this gate as "constructed in the Mathura style after the design
of a native artist… in striking contrast to the heavy and misshapen masses of the Madras Gopura,
which rises immediately in front of it." So Rangji needs TWO palettes in one compound: cream
Mathura-style gate, and the Dravidian gopuram behind it in its own scheme.
RADHA RAMAN — your own research file already has this right: "light brown / buff sandstone (warm
pale tan, NOT the deep red of the Akbar-period temples)", with one red sandstone archway as an
accent, and the surrounding Goswami houses in whitewash/pale ochre plaster. LP_BUFF + a single
SS_RED element.
THE KESHI GHAT RIVERFRONT — the best evidence in Braj for "one street, many colours": in a 120 m
stretch there is a buff-ochre kunj, a soot-blackened block, a salmon-PINK plastered house
(#b2796b, the brightest surface on the river), a cream house, and Jugal Kishor's maroon shikhara.
Do not give the riverfront one colour.
THE TOWN FABRIC generally — Growse (p.265): in Vrindavan "all the streets of any importance have
been either paved or metalled." Mathura's streets were paved in Bharatpur stone flags for
Rs 1,38,663, and people complained the dark stone "retains heat through the greater part of the
night" (p.155). Warm, mid-value ground, not grey.

=== MARBLE — and it is TWO whites, not one ===
SHAHJI — the important case. Measured: centre pavilion warm cream (H 36–38°, S 25–37%) against
parapet balustrade and roof figures cool white (H 45°, S 7–11%) AT THE SAME VALUE, with brown
drip stains down the cornices and the roof figures reading near-pure #eeeeef. Growse calls it
"constructed of the most costly materials and fronted with a colonnade of spiral marble pillars,
each shaft being of a single piece" (p.262). If Shahji is one white it will never look right.
PREM MANDIR (Italian marble), ISKCON KRISHNA BALARAM (white marble) — MB_COOL, S ≤ 3%.
VRINDAVAN CHANDRODAYA — thin record. It is a modern reinforced-concrete tower still under
construction; I found no reliable published statement of its final exterior finish. Say so in the
code comment rather than inventing a stone for it.

=== WHICH BUILDINGS POINTEDLY DO *NOT* GET THIS ===
PREM MANDIR and ISKCON must NOT receive the vertical weathering ramp or the streak pass. They are
new, washed, and maintained. Give them the §B ramp at strength 0.15 and no streaks at all —
the contrast between a soot-streaked Madan Mohan and a scrubbed Prem Mandir is itself the story
of the town. Prem Mandir at night is floodlit in shifting colour; that is a light, not a material.
RANGJI's gopuram is NOT red sandstone and must not take SS_*.
GOVIND DEV must NOT be fire-engine red — it measures S 49–56% in sun, and was periodically
whitewashed anyway.
RADHA RAMAN must NOT take the deep red; it is the buff outlier and your research file says so.

## mistakes

1. ONE HEX PER BUILDING. This is the actual bug behind "no single temple looks exactly as it really is". A real facade spans a 4.5:1 value range top to bottom and shifts ±20% value course to course. A flat fill cannot look like stone at any level of geometric detail.

2. FIRE-ENGINE RED. The instinct is #c0392b or #b22222. Measured reality is H 14–22°, S 50–75%, and crucially V 42–78% in SUN — the moment it is in shade it falls to V 17–32% while keeping its hue. "Red sandstone" in Braj is a dusty terracotta-to-rust, and in overcast the whole town sits at V 24–46%.

3. UNIFORM DIRT OVERLAY. Multiplying the whole building by 0.8 reads as "cheap texture". Weathering is TWO directional gradients: bottom-up damp/soil, and top-down streaks that start at cornices. Growse proves the second: Lala Babu's plain polished sikharas were designed so their "smooth polished surface may remain unsullied by rain and dust" — dirt collects where carving is, and runs downward from it.

4. STREAKS EVERYWHERE. Only under cornices, chhajja drip edges, carved bands and sills. A streak in the middle of plain ashlar looks like a rendering artefact.

5. FORGETTING THE GROUND. Measured plaza dust at Govind Dev is #c9a98e — LIGHTER than the building. Dark ground under a mid-value temple makes the temple float. Get the ground value above the building's mid-wall value.

6. ONE COLOUR PER STREET. Keshi Ghat in a single frame: buff kunj, soot-black block, salmon-pink plastered house, cream house, maroon shikhara. A riverfront in one colour is the single most obviously wrong thing you can ship.

7. PURE-WHITE MARBLE. #ffffff. Shahji's warm pavilion is S 25–37%; even its cool balustrade is S 7–11% with brown drip staining. Nothing outdoors in Braj is achromatic.

8. WHITEWASHING THE WHOLE BUILDING FOR DIWALI. Growse's passage is specific: "the whole of the STONE FRONT is beautified with a thick coat of whitewash" — the front face, and thick enough to blur carving. Not the tower, not the sides.

9. SKIPPING THE PAINTED SOFFIT. Growse notes twice that eave undersides are "brightly painted" / patterned. An eave soffit in the wall colour throws away the cheapest hit of colour on the building, and it is the one surface that stays clean and saturated because rain never touches it.

10. IGNORING THE MODERN PAINT LAYER because it is "not architecture". Radha Vallabh's actual street gate today is vermilion with white drawn lotuses, a yellow signboard and ochre jambs. If the model shows bare stone where a pilgrim sees vermilion, the model is wrong about the thing they came to see.

11. sRGB/LINEAR CONFUSION. Feed these hexes straight into a linear vertex-colour buffer and everything darkens and greys; the natural reaction is to crank saturation, which then blows out under any other lighting. Verify one known hex end-to-end first.

12. TREATING THE PLINTH AS THE DIRTIEST PART. At Govind Dev the plinth spent centuries under 8 feet of debris and came out crisp in 1873. Buried plinth mouldings are SHARPER and often paler than the wall above them. Same at Madan Mohan's side chapel, whose plinth Growse also uncovered (p.252). Counter-intuitive, documented, and a nice detail nobody else will have.

## sources

- F. S. Growse, *Mathurá: A District Memoir*, 3rd ed. (public domain; full OCR text held locally at /private/tmp/claude-501/-Users-sushilbajpai-Desktop-Projects-livebraj/7fcafe1c-f37a-48dc-90d1-37908875b73c/scratchpad/growse2.txt, flattened to g2_flat.txt). Pages used: p.119–20 (Tavernier on the reddish Agra stone, slabs 15 ft × 9–10 ft × 6 in); p.155 (Mathura streets paved in Bharatpur stone flags, Rs 1,38,663; balcony eaves 'the under-surface of which is brightly painted'); p.156 (Dwarkadhish — 'the whole of the stone front is beautified with a thick coat of whitewash' at Diwali); p.245–46 fn (Govind Dev interior whitewashed 'up to about half their height, thus ruining the architectural effect, which depends so much on the rich glow of the red sandstone'; 8 ft of debris cleared off the plinth); p.250 (Madan Mohan ghat 'all of red stone'); p.252 (brick substituted for stone in the Madan Mohan nave; buried chapel plinth uncovered); p.254 (Jugal Kishor, 4 ft of pigeon dung in the tower room); p.257–58 (Lala Babu's sikharas — 'smooth polished surface may remain unsullied by rain and dust'); p.260 (Rangji, 60 ft copper-gilt dhvaja stambha; the cream 'Mathura style' west gate contrasted with the Madras gopura); p.262 (Shahji — 'colonnade of spiral marble pillars, each shaft being of a single piece'); p.263 (Rani of Tikari's temple — piers from the Paharpur quarry in Bharatpur territory, gilt copper kalash Rs 5,000); p.264 (ghat kiosks — arches blocked with mud walls, 'blackening the carved work with the smoke of their fires'; Rani Lachhmi's kunj, broad eaves with a wavy pattern on the under-surface); p.265 (Vrindavan streets paved or metalled); p.305 (Hari Deva — 'red sandstone from the Bharatpur quarries', foundations of local stone).
- Colour measurements taken by me from photographs held in the project scratchpad, sampled with PIL (patch medians, HSV reported): img/Temple_GovindaDev.JPG (Govind Dev, midday — #c6835a, #a27252, #7a4d36, #513022, #2c1f18; plaza #c9a98e); img/01_Govind_Dev_temple_at_vrindavan_from_entr.jpg (overcast, same building); img/02_Radha_Madan_Mohan_Temple_65984_jpg.jpg (Madan Mohan shikhara, low sun — #864021, #6c3b23, #642c18, #4c2415, #33190f, pale patch #a17a62); img/09_Shri_Rangji_Mandir_Vrindavan_Rajput_styl.jpg (Rangji west gate — #c7a77e, #b7946c, #d4b790, #9a7958); img/06_Shahji_Temple_Vrindavan_Exterior_Facade_.jpg (Shahji, two whites — warm H 36–38°/S 25–37% vs cool H 45°/S 7–11%, roof figures #eeeeef); img/04_Radhavallabh_Lal_ju_Maharaj_Temple_Vrind.jpg (Radha Vallabh street gate — #e25f3c, #792512, ochre, white drawn motifs); pics/Kesi_Ghat_-_panoramio.jpg (riverfront under overcast — all built surfaces H 5–22°, S 18–45%, V 24–46%; pink house #b2796b; sky V 92%). These are photographic samples under uncontrolled light, NOT colorimetry — treat hues as reliable and absolute values as indicative.
- Project's own prior research: /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/temple-architecture.json — 26 records with existing `material` / `primaryColour` / `accentColour` fields; the Radha Raman record ('light brown / buff sandstone… NOT the deep red of the Akbar-period temples') is consistent with the photographic evidence and should be kept.
- Bansi Paharpur (Bayana tehsil, Bharatpur district, Rajasthan) sandstone is sold in three grades — pink, red and 'barra' — and is the same quarry district Growse names: https://www.aajjo.com/product/bansi-paharpur-red-sandstone-in-bharatpur-patel-stone-industries and https://www.agrared.com/bansi-paharpur-stone/
- Pink/red sandstone from Bansi Paharpur, historical and current use, and its visibly lighter pink grade: https://science.thewire.in/politics/government/ram-temple-ayodhya-rajashtan-band-baretha-pink-sandstone/
- Black crust on Indian red sandstone monuments is amorphous carbon plus heavy metals bound in gypsum, forming on rain-sheltered surfaces (Red Fort, Delhi characterisation study): https://doi.org/10.3390/heritage8060236 — abstract/search summary only; the full text returned HTTP 403, so no numeric L*a*b* or crust-thickness figures were obtained. The directional rule (sheltered blackens, rain-washed stays red) is corroborated by Growse's Lala Babu observation.
- Lime plaster / chuna / limewash and colour-washes with yellow earth in North Indian practice: https://www.inheritage.foundation/aat/materials/lime-plaster and https://www.gharpedia.com/blog/white-wash/
- Yamuna flood levels at Mathura — danger level 166 m, recorded 166.68 m, Keshi Ghat steps and approach road submerged (basis for the 2.6 m riverfront silt band): https://vrindavantoday.in/rising-yamuna-sparks-flood-fears-across-mathura-and-vrindavan/ and https://www.deccanherald.com/india/yamuna-river-floods-mathura-vrindavan-after-heavy-rainfall-1238889
- Modern temple materials: Prem Mandir in white Italian marble, ISKCON Krishna Balaram in white marble: https://en.wikipedia.org/wiki/ISKCON_Temple,_Vrindavan and https://vrajvrindavan.com/prem-mandir-vrindavan/ . Vrindavan Chandrodaya Mandir is still under construction and I found NO reliable published statement of its final exterior finish — the record is thin, do not invent one: https://en.wikipedia.org/wiki/Vrindavan_Chandrodaya_Mandir
- Banke Bihari (1864) described as red sandstone with marble, lacquer and gold in decorative elements, Rajasthani style — but note these are secondary tourism sources, not survey, and the photograph in the scratchpad (img/05_Banke_Bihari_Mandir_Vrindavan_jpg.jpg) shows the inner courtyard facade reading as pale grey-white plastered/painted carving, not red stone. Treat the 'red sandstone' claim for Banke Bihari as WEAK: https://en.wikipedia.org/wiki/Banke_Bihari_Temple
- Code shape this is written against: /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/game/world/LandmarkGenerator.js (cuspedArch at line 340, shikhara 571, chhatri 602, dome 611; existing named-constant pattern KB_CREAM/KB_IVORY/KB_SALMON/KB_TEAL at lines 929–932) and /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/engine/render/MeshBuilder.js (box signature at line 65 already accepts `topColor`; prism at line 89 already accepts `shadeTop`).
