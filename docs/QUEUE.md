# Queue — 2026-09-26

Everything you have asked for, and where it actually stands. "Verified" means a
check in `tools/checks/` proves it and names the numbers; anything else says so.

## DONE — verified by a check

| What you asked | Where it stands | Guarded by |
|---|---|---|
| "e-rickshaw ... without touching the devotees ... vehicles drive in centres, pedestrians either side" | Both were steering at NavGraph nodes, which sit on the road CENTRELINE, so the crowd walked down the carriageway. People hold a verge for life now. Median clearance vehicle→person **10.8 m → 16.4 m** | `verges.mjs` 4/4 |
| "entry exit gates are not visible ... i just entered inside through walls" | **All 16 temples** measure solid with a doorway; wall openness 2.1–15.4% | `temples.mjs` 4/4 |
| "i am able to bypass the walls" | Colliders were indexed by centre in a 24 m grid, so a 57 m wall existed only near its midpoint. **368 of 680 samples stood inside solid stone; now 0** | `walls.mjs` 3/3 |
| "the deities ... showing in the right wall not in main area" | ISKCON's bays are 14.4 m apart; the code used a hardcoded 3.4 m gap, so the photograph hung on the pier. Builders publish their altars now | `deities.mjs` 7/7 |
| "real images of deities not yet showing" | Seven temples had no inside at all — the photographs were sealed in masonry. All have sanctums now | `deities.mjs` 7/7 |
| "unable to climb stairs" / ghats | Treads were laid diagonally (transposed frame). You walk 5.09 m down to the Yamuna and back | `stairs.mjs` 6/6 |
| "add a volume button ... it keeps blowing bell" | ♪ on the HUD, master + effects + mute. And the CAUSE: a wedged driver honked every 3–9 s forever. Three honks, 42 m range | `overlays.mjs` 7/7, 0 page errors |
| "jaldi ... should show limit after certain number of clicks" | Chip reads `JALDI · MAX`; typing jaldi again says "Aur tez nahin ho sakta" | `cheats.mjs` 11/11 |
| "bushes ... some on road which is not good" | 58 of 4,006 stood inside solids. Now 0 of 3,916 | `planting.mjs` 2/2 |

## DONE — built, not yet verified by a check

| What | Why not verified |
|---|---|
| **Chaar Dham, Chhatikara** — 141 ft Vaishno Devi, 187 ft trident, four shrines, cave, boundary wall | In **no** OSM data; researched and placed by hand at 27.560892 N, 629 m from Chhatikara Crossing. Wall is in `temples.mjs`; the rest is eyeballed |
| **Banke Bihari rebuilt** — three-storey tiered arcaded courtyard, jharokhas, jali, chhatris, no bells | The old build was a solid mass under three domes, which the sources explicitly rule out |
| **The curtain at Banke Bihari** — drawn shut and reopened, two sliding leaves | Boots and finds its leaves; the cycle itself is not asserted |
| **602 buildings you can walk into** (274 shop, 94 house, 234 hut), up from ~205, with working doors visibly marked | Counted at boot, photographed once |
| **ISKCON outer hall** — water station, shop row, between darshan and the gate | Built; not photographed |
| **Tilt steering** — lean the phone at the wheel. Gravity vector, not `gamma` | **Needs a real phone.** Cannot be tested headless |
| **Default view along the direction of travel** | Was snapping to the PARKED heading, so you pulled away facing sideways |
| **Spoken lines on the speaker's head**, not the toast rail | `chatter.mjs` 5/6 — see below |
| **`altars.js`** — sourced Deity table replacing an id regex. Jugal Kishore's altar is empty; Govind Dev is in Jaipur; three temples are single Deities | Three of my own errors found and fixed by auditing it against the research |
| **71 of 118 real place names** on shopfronts, up from 35 | Atlas 8×8 → 12×12 at the same texture memory |

## LEFT — mine

1. **Krishna lila murals on every building.** Not started. Licensing decided: Pahari/Kangra/Basohli/Mewar miniatures are 18–19C, out of copyright, on Commons with provenance — and better than anything procedural.
2. **The remaining temples to the Krishna Balaram standard.** Banke Bihari is done, 14 to go. Research for 23 exists with sources.
3. **A pujari performing arti.** The interiors and murtis exist; the priest does not.
4. **Pokémon-style interior transition** — rooms and marked doors exist; the view change on entering needs checking.
5. **`chatter.mjs` 5/6** — one toast survives; I believe it's InteractionSystem correctly announcing the place my test teleports into, but I have not confirmed it.
6. **Ride ETA honesty** — "1 min" then not arriving. Chhatikara→ISKCON is 5.4 km and the ride caps at 5 min; the ETA arithmetic doesn't match what actually happens.
7. **47 real names still have no shopfront** within 90 m — they need a standalone frontage at their real coordinates.
8. Traffic that queues and yields · save off WebView localStorage · narrated story audio · avatar realism.

## BLOCKED ON YOU

1. **Deity photographs for Gaura-Nitai and Krishna-Balaram.** I searched Wikimedia Commons directly: there is exactly **one** freely-licensed ISKCON Vrindavan altar photograph in existence there, and it is the Radha-Shyamasundara already shipped. Needs your images or the temple's permission.
2. **Which OSM way is Jagadguru Kripalu Marg?**
3. **Is Chhatikara Crossing the bus stand,** or is it further out on NH 44?
4. **Ten road names** you can read off a map. OSM names 41 of 2,146 ways here.

## DECISIONS — yours, not mine

1. **Expand the world to 12 km** so Chhatikara sits at its true distance? (18 km² → 144 km².) My view: keep 4.2 km until vehicles are solid, then revisit.
2. **When do we start the Unity port?** Procedural geometry caps fidelity; "GTA Vice City quality" needs authored art.
3. **Who reviews the story text?** It shouldn't be signed off by an engineer.

## Map references you supplied

satellites.pro and Apple Maps. Position unchanged: the FACTS on a map — a road's
name, where a temple stands — are not owned. The tiles and vector data are. So
they are read for names and positions and nothing is traced from them. Esri
World Imagery stays the one raster we may trace, because Esri explicitly permits
OSM contributors to.
