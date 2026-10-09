# Keshi Ghat and the Yamuna

Queue item 12, *"the ghats stand in town with no river in sight"*. Two halves:
where the river is, and what Keshi Ghat looks like standing in it.

## Sources

| Source | What it gave |
|---|---|
| A. Sinha & S. Dhariwal, "Myth and Placemaking in Vernacular Settlements: Insights from Vrindavan", *ISVS e-journal* 11.10 (Oct 2024), doi 10.61275/ISVSej-2024-11-10-03 | Fig. 7: a surveyed plan of the Keshi Ghat riverfront with an 11-item legend; Fig. 1 and Fig. 8 (photograph from the river, section through a burj); the text on burjes, tibaris, the unified Jat composition and the kunjs' names |
| ESRI World Imagery z18/z19, Feb 2024 | **measurement only, never traced**: the palace front and its bend, courtyard positions and sizes, the water at the steps, boats moored on the mapped bank |
| Wikimedia Commons | "Kesi Ghat - panoramio" (the whole front from the river), "KesiGhat River.JPG" (2007, a burj on the steps, pontoon bridge beyond), "Keshighat Vrindavan.JPG" (a row of burjes from above, boats tied up), "Ghat at Yamuna river, Vrindavan" (the aarti platform, its railings), "Yamuna Aarti", "Rituale am Keshi-Ghat" |
| OpenStreetMap | riverbank relations 9075838 (outer 55447339 + 3 islands) and 1423292 (outer + 9 islands); centreline way 44450008; node 6313899527 "Keshi Ghat"; way 673572958 (`highway=tertiary`, `motor_vehicle=no`, `bicycle=no`) and 1537934884 along the front |

## The river

The game drew the Yamuna as a constant 130 m band on a 30-point centreline,
0.55 m below the town. Measured on five rays out from the ghats against the
imagery (where the water starts, metres from the ghat):

| Ghat | Imagery 2024 | OSM riverbank | Game before | Game now |
|---|---|---|---|---|
| Keshi | 0 | 7 | 30 | 5 |
| Chir | 61 | 58 | 40 | 59 |
| Imli Tala | 80 | 79 | 55 | 81 |
| Yugal | 171 | 162 | 167 | 162 |
| Kaliya | 546 | 540 | 511 | 541 |

- **OSM's riverbank polygon has the town side right** (within 10 m of the
  imagery at all five) but it is the river at bank-full: on the far side it
  runs into fields, and north-east of Keshi Ghat over the sand the landing's
  tracks and the pontoon approach cross. **OSM's centreline runs down the
  low-water channel.** So the water is both: inside the polygon AND within
  65 m of the centreline, and where the channel comes within 30 m of the
  polygon's bank it runs on to that bank (`TerrainBuilder._riverSigned`).
- **Keshi Ghat is the exception, and it is measured** (`content/riverbanks.js`).
  It stands on the outside of the bend, where the current cuts the bank, and
  the water is at its steps along the whole front; there the centreline drifts
  26–49 m off the bank, so the channel alone left a beach. The front line from
  Kishori Rani Kunj to the Yamunaji shrine is recorded, and the water is taken
  to 5 m out from it (the top of the steps).
- **The river's surface is 3.6 m below the town.** Vrindavan stands on a low
  bluff: the town by Keshi Ghat is at about 167 m, the dry-season river at
  162–163 m (Mathura's danger level 166 m, floods to 166.68). At 0.55 m the
  river lay level with the streets, nothing could step down to it, and the
  water plane showed through wherever the ground dipped: 387 points of a 20 m
  grid over the town, fields in the north-west, were water.
- **The riverbed the low water leaves** — inside the mapped bank, out of the
  channel — is sand flats 0.9–1.9 m above the water (not less: the depth
  buffer cannot separate two surfaces closer than about d²/4e6 m, and at
  0.35 m the far bank striped from a kilometre off).
- Not done: the river's south-eastern loop, which OSM has inside the world
  and the game never had (no centreline there); the highway bridge and the
  pontoon bridge, which cross the water as roads and drown; seasonal levels.

## Keshi Ghat

**The plan (Fig. 7), its legend:** 1 Badan Singh Kunj, 2 Rani Laxmibai Kunj,
3 Pandawala Kunj, 4 Yamunaji Temple, 5 the Old Hanumanji Temple, 6 Keshi
Ghat, 7 Pandawala Ghat, 8 Jugal Kishore Temple, 9 Kishori Rani Kunj,
10 Kishori Rani Ghat, 11 Prem Maha Vidyalay. Oriented with the river at the
bottom: its right is south-west (Jugal Kishore, behind block 3, is where the
imagery has its round sikhara).

**The front, measured:** two straight runs — south-west 68.7 m at bearing
124 (A 802,-792.5 to B 859,-830.8 in world metres), north-east 34.6 m turned
11.5° landward (to C 891,-844) — 103 m of palace, which the plan divides, from
the north-east end: Yamunaji 5.5 m, Badan Singh 32, Rani Laxmibai 23.5, the
pink block 9.2, Pandawala 26.8 + a 5.9 m end piece. **Check:** both
courtyards the imagery shows land inside the right kunj when the plan is laid
on the front — Rani Laxmibai's 13 m dark court at 55.5 m along, 16 m back;
Badan Singh's green court 21 m along the north-east run, 13 m back.

**The burjes:** eight, from the north-east end at 7.5, 14.4, 34.0, 41.0,
60.6, 67.6, 77.0 and 90.5 m — in pairs, a flight between each pair, each
joined to the promenade by a neck with a lamp at its root. From the
photographs: an octagonal shaft, plain below with two small arched niches at
the water, a moulded band, the upper shaft panelled in cusped outlines, a
deep bracketed chhajja, and a **flat top with a carved parapet** — people
stand on them. (The paper's text says "domed chhatris above"; no photograph
shows one on a burj, so none is built.)

**Where "Keshi Ghat" is:** the plan puts label 6 on the flight in front of
the Hanuman shrine, 25 m from the north-east end, and label 7 (Pandawala
Ghat) in front of Pandawala Kunj — which is exactly where OSM's "Keshi Ghat"
node falls. The map pin stays on OSM; the aarti anchor is the plan's Keshi
Ghat.

**Heights**, off the photograph from the river against the steps' drop:
Badan Singh 16 m over the promenade (an arcade and two storeys of galleries,
rooftop rooms); Rani Laxmibai 15 (arcade, a gallery, a plain dark-brick top
storey); the pink block 17; Pandawala 9.5 (arcade and one storey); Kishori
Rani 11. Colours from the same photograph: golden buff, brown-buff with dark
brick, pink plaster, weathered grey-buff, red-pink; the burjes pale buff.

**The promenade** (OSM ways 673572958 and 1537934884) is a walk, not a road:
the first is `motor_vehicle=no`, the importer now honours that, and the
second carries the same walk on along Badan Singh Kunj to the landing.

**Inferred, and said so in the builder:** storey heights within the totals;
arch counts the photograph is too small to count; the second shrine's
dedication; the boats' number and colours (photographs: blue, green, red,
yellow, plain wood). **Not built:** the pontoon in the river off the
south-west end; Kishori Rani Ghat's own detail beyond carrying the steps on.

## Guarded by

`tools/checks/keshi.mjs`, 21/21, mutation-tested four ways: without the wet
bank the water starts 27 m out and is dry at the foot of all 25 probes;
with the river back at -0.55 m, 387 points of town are flooded; with water
depth measured to the bed, the feet sink 0.56 m into a dry tread; without the
end flights you cannot climb back from the landing.
