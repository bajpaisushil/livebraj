# Open bugs and requests

Live queue. Nothing leaves the "fixed" list until it has a test that would have
caught it.

## Still open

### 1. The D-pad covers where your thumb wants the stick
NOT a direction bug — the stick is correct. Verified: all four directions on
all three input paths now read right, 0 wrong-way inputs across 16 measurements.

What the investigation actually found. `InputManager` binds the stick to
`touchstart`/`touchmove`/`touchend` on `#touch-layer`; the old test sent
*mouse* events, which never reached it, so every reading was the avatar
drifting. With real touches dispatched over CDP the stick reads correctly
(drag up gives `stick.y = 0.82`, straight forward).

But the touch point a thumb naturally falls on — lower left, ~74% down the
screen — lands on the D-pad RUN button, and `#touch-layer` receives **nothing
at all**. The D-pad sits at `left:12 bottom:152, 150x150`, exactly over the
stick. The stick is only reachable above it, which is not where a thumb rests.

So: with the D-pad on, the virtual stick is effectively unreachable on a phone.
Both are shown at once. Worth deciding whether that is intended — one control
scheme at a time, a settings toggle, or move one of them.

### 2. "Lot of glitches"
Reported without a screen or a repro. Waiting on detail.

### 3. Real Vrindavan texture beyond signage
35 shopfronts carry their real OSM name. The other ~1,750 unnamed lanes still
generate generic frontage. More real names (see "Waiting on you") is the
highest-value input.

## Fixed this session

Each line is a bug you reported, what actually caused it, and the check that
now guards it.

- **"when i step in of temple it should show entire temple view ... instead of
  complete blackout"** — `InteriorSystem._apply` MULTIPLIED the live sun,
  hemisphere and fog every frame, while `TimeOfDay.update` damps them back
  toward a target at about 3.6% a frame. Net factor about **x3.08 per frame**,
  which diverges at any frame rate above 2 fps. Measured in headless Chromium:
  fog density 0.000294 outside, **1.73** three seconds in, **3e5** at five
  seconds. FogExp2 saturates at one metre by then, so every fragment in the
  world renders as exactly `scene.fog.color`, which the same function was
  lerping toward 0x2a1d12 — a near-black brown. The sun landed at 0.8% and the
  hemisphere at 4% of nominal, so even the fog-exempt parts were black. And
  `_restore()` restored nothing, so it kept climbing after you walked out:
  about **158 seconds** of black world. The interior is now a scale on
  TimeOfDay's TARGET, folded in beside the weather at `TimeOfDay.js:161`, so
  the damp converges on a dark room and converges straight back out of one.
  Nothing outside TimeOfDay writes to the lights. Guarded by
  `tools/checks/interior.mjs`, which stands inside for five simulated seconds
  at a fixed step and asserts fog < 0.01 and the sun above half its outdoor
  value. Replaying the old recurrence at that same fixed step gives fog density
  1.97e19 after one second and 3.05e136 after five, so a steady 60 fps was far
  worse than the 3e5 measured in a headless renderer limping along at six.
- **"e-rickshaw should drop at temple gate not inside"** — the route ended at
  `loc.pos`, the centre of the building, and `NavGraph.path` overwrites its last
  point with exactly the coordinates it is given, so the last leg left the road,
  crossed the compound and stopped in the middle of the courtyard.
  `RickshawSystem._setDown` now ends the ride at the road node nearest the
  landmark, stepping clear of the footprint first when the graph runs through
  it. ISKCON: **51 m from the centre, on a road**, outside the compound wall.
  Guarded by `interior.mjs`. NOTE for whoever reads this next: `rickshaw.mjs`
  asserts that asking for ISKCON ends you at ISKCON within 60 m, and it passed
  at 53 m when this landed. It does not pass now — the ride stops a couple of
  hundred metres short with the ride still running — and that is the vehicle
  steering, not the set-down: stubbing `_setDown` back to `loc.pos` in the page
  fails identically, 4941 m against 4937 m from the same start. The route's
  last point is the gate either way.
- **The door was on the far side of the building from the doorway** — two
  opposite conventions for "front" were both in use. The per-kind builders, the
  darshan anchor and InteriorSystem's corona used `(sin rot, cos rot)`;
  `hollowColliders`, `compound` and `buildInterior` used the opposite face. At
  ISKCON the pulsing corona was at x = -1242.9 and the only gap in the wall
  colliders at x = -1308.6, 66 m away. The corona now follows the doorway the
  builder declares, and Krishna Balaram's entrance faces the road — which is the
  fact that settles it: the nearest street is 48 m off its -X face.
- **ISKCON's deities were the wrong deities** — `buildDeities` dispatches on a
  regex over `loc.id + loc.deity`, and `iskcon-krishna-balaram` matched the
  `pair` pattern on "krishna", so the temple named for two brothers was given
  Radha and Krishna with a flute. It now has its three researched altars:
  Gaura-Nitai with Srila Prabhupada and Srila Bhaktisiddhanta on the left,
  Krishna-Balaram in the centre, Radha-Shyamasundara with Lalita and Vishakha on
  the right. Four independent sources agree on that order.
- **Long wall colliders had unsolid ends** — `WorldService._addColliders`
  inserts each collider into the grid at its CENTRE POINT ONLY and SpatialGrid's
  cell is 24 m, so a 54 m wall was not found from more than a cell away along
  its own length. Measured: the old ISKCON walls went clear 16.5 m out from
  their middles, which is how anyone was getting inside at all. Krishna
  Balaram's walls are authored in segments of 16 m and under; `interior.mjs`
  walks both side walls at 1 m intervals and asserts 62/62 sample points solid.
  **The general fix is still open**: every other landmark that uses
  `hollowColliders` still emits single walls the full width of its footprint.
- **A merged archetype arrived undressed** — `MeshBuilder.addGeometry` ignored
  the source geometry's colour attribute and wrote flat white, so any of the
  crowd's dhoti/sari/tilak figures baked into a merged mesh came out blank. It
  now carries the source's vertex colours when no override is asked for.

- **"random places showing group of people performing yajnas etc." / "it does
  not give me vrindavan feeling"** — the town was full of people walking
  somewhere and nobody who had stopped. **17 gatherings** now stand across the
  map: 6 yajnas (a ring seated round a brick havan kund with a fire someone is
  feeding), 4 kirtans (a mridanga, two pairs of kartals, singers seated and
  standing, swaying on the beat) and 7 kathas (a speaker on a vyasasana under a
  canopy, the audience in a fan on the ground) — **214 people**. They are the
  *same* twelve archetypes the walking crowd is built from, sitting down: the
  table and everything above the waist moved to `game/npc/Archetypes.js`, so the
  dhoti, the sari's border and the urdhva-pundra are the identical geometry in
  both — proven by comparing the standing triangle set before and after the
  move, which is byte-identical for all twelve. Placement is seeded
  (`rngAt('gatherings')`) and rebuilds identically every launch; a site is
  rejected in the river, on the bank, inside a building, in any lane, within a
  ring's radius of anything a rickshaw drives down, and within 210 m of another
  gathering. Cost is **+7 draw calls and 3.5k triangles** standing in one, and
  **nothing at all** — 0 instances, 0 meshes — when the nearest is 1.2 km away.
  Everyone sitting is solid, so you walk round them rather than through them —
  and, after review, the *camera* is not: a collider may now declare a height,
  because 214 waist-high circles were blocking the camera arm as if they were
  walls, collapsing it from 6.55 m to 0.00 m at a havan or a katha.
  Guarded by `tools/checks/gatherings.mjs`: **27/27**.

- **"chhatikara stand to iskcon is a direct road"** — it is: Bhaktivedanta
  Swami Marg, 4.74 km at 1.01x straight-line. The world was a 4.2 km square,
  so the importer silently clamped Chhatikara to the world edge, 1.1 km from
  ISKCON instead of 5.1 km, and every route from it was measured against a
  place that was not Chhatikara. World is a 9.2 x 4.8 km rectangle now and the
  route is **1.06x**. Clamping a landmark is a hard error in the importer
  rather than a log line. Guarded by `/tmp/route3.mjs`-style route ratios.
- **Missing highway** — `trunk` and `primary` had no entry in `ROAD_CLASSES`,
  so all six NH 44 ways were dropped as unclassed. Imported, rendered, routed
  and labelled **NH 44 / AH 1** from `local-knowledge.mjs`.
- **A* returning non-shortest paths** — `MIN_COST` was hardcoded to `0.86`
  while `trunk` was added at `0.84`, making the heuristic inadmissible. Now
  derived from the cost table so it cannot drift again.
- **"map is dark some places light some other"** — two separate causes. The
  base texture and aerial camera were square while the world is not, so ~48%
  of both was ground that does not exist (black). And the aerial was rendered
  with the live low sun and shadows, so half of what did exist was in shade.
  Both now match the world rectangle (2048x1069), and the aerial renders under
  flat sourceless light. Visible detail went from 3,840 to **6,656** lit cells.
- **Hard seam across the map** — `TerrainBuilder` had `HALF = 2200`; there was
  no ground at all west of that. Terrain, props and input clamps now read
  `world.generated.js`. Grass 13,695 -> **35,819**, bushes 1,481 -> **3,923**.
- **"left control moves person to right"** — `Player` computed the D-pad
  heading as `camYaw + atan2(x, y)` while the camera rig defines right as
  `yaw - pi/2`. Two definitions of "right" with opposite signs; because the
  error was a reflection it looked correct whenever the camera faced the other
  way, which is why it kept coming back. Player now asks the rig for its basis.
  Guarded by `tools/checks/dpad-dir.mjs`: **D-pad 4/4, keyboard 4/4**.
- **"Raman Reti everywhere"** — the coarse district polygons outranked road
  names, and Raman Reti alone is 1.8 x 1.6 km. A named road wins now. The
  readout at spawn reads "Lane by Chhatikara Crossing / Chhatikara Crossing".
- **Search bar hid road and place names** — `_reserveChrome` measures the real
  bar and results list and reserves both; the compass moved below the bar.
- **Search bar could not be got out of the way** — it collapses to its glyph.
- **Readout always on screen** — it now shows for 4.5 s when you arrive
  somewhere new or tap, then gets out of the way.
- **Tap anything to name it** — raycast to the ground, then name the nearest
  landmark, then the nearest named shop, then the road.
- **Chat popup survived walking away** — nothing closed a dialogue but the last
  page or a screen change. Closes past 7.5 m now.
- **Only 26 places in a town with 205** — all 133 non-duplicate named OSM
  places are imported as `POIS`: temples, dharamshalas, bhojnalayas, banks,
  parks. Searchable, tappable, and 35 of them are painted on real shopfronts.
- **Search** — over places, roads, localities and POIs, with folded diacritics,
  a dropped "Shri", and an alias table so "iskon" finds ISKCON. Landmarks
  outrank POIs of equal match quality. **17/17** in `tools/checks/map-search.mjs`.
- **Select a result** — flies to it, rings it, and shows straight-line distance,
  walking distance and the road carrying most of the walk.
- **Crowd looked like anywhere** — sarees with pallu and border, dhoti with
  bare calf, tulsi beads, sacred thread, braids, shaven heads with sikha, and
  **tilak on every face** (urdhva-pundra, with the bindu for women). Twelve
  archetypes, up from nine.
- **State not persisting** — the exit hooks were right but nothing saved during
  play, so a killed tab lost everything. Autosaves every 20 s now.
  Note: `localStorage` is per-origin — `localhost:8787` and `192.168.x.x:8787`
  are different stores. That alone can look like "it forgot".

## Waiting on you

- **Jagadguru Kripalu Marg** — which OSM way? Prem Mandir is 127 m off
  Bhaktivedanta Swami Marg with only unnamed residential ways closer
  (`973513776`, `973513777`). Held as unconfirmed so it cannot reach the map
  on a guess.
- **Ten more road names.** OSM names 41 of 2,146 ways here. The Parikrama
  feeders, the Loi Bazar approaches, the Keshi Ghat road and the Raman Reti
  lanes would change the map more than anything else on this list.
- **Is Chhatikara Crossing the bus stand**, or is the stand further out on
  NH 44 itself?

## On Google Maps

Asked three times, so the reasoning in full:

- **I cannot browse it.** No browser here, and Maps is a JavaScript app — a
  fetch returns an empty shell, not roads.
- **It cannot be the game world.** Google renders a picture into its own native
  view. This needs geometry: buildings to collide with, a road graph to route
  on, interiors to enter. And it needs the network, while the first constraint
  in the brief is that the world renders offline. Caching its tiles for offline
  use is specifically prohibited.
- **The facts are not owned.** That a road is called Jagadguru Kripalu Marg is
  a fact. You reading names off Google and typing them here is legitimate and
  is how `local-knowledge.mjs` gets filled. Bulk-extracting the dataset is not.
- **It would not have helped.** Bhaktivedanta Swami Marg was in OSM the whole
  time, correctly classified. The bug was that our world was 4.2 km wide and
  the road is 4.74 km.
- **Friends on the map needs none of it.** Player positions are your data. The
  map already draws you with a heading cone; friends is the same call with
  more positions.

Available from OSM, free and offline: **205** named places in this world (we
use 133 + 26 curated), and **1,128** features across the 84-kos Braj box —
931 villages, 173 temples, 12 towns — for the expansion.

## 2026-09-22, late — three found by finally LOOKING

Every one of these was invisible to numeric checks and obvious in a screenshot.
I had verified the deity panels "numerically, not visually" and said so; this is
what the picture showed.

### 1. You can walk through any long wall  — FIXED

`WorldService._addColliders` put every collider in the spatial grid keyed on
its CENTRE. `collide()` and `isClear()` query that grid at `radius + 6`. A wall
is ONE box as long as the wall — ISKCON's front wall is a single 57 m collider —
so 57 m of stone lived in one 24 m cell, and standing against it twenty metres
from its midpoint queried cells the box was not in. The box was never tested.

This is "i am able to bypass the walls", and it is why the gate work passed:
`gates.mjs` sampled near the middle of each side, which is the one place the bug
does not show.

Fixed by `WorldService._index`, which stamps a collider into every cell its
circumradius reaches, once per cell so `query` never returns it twice. Small
colliders still take the single-cell path. New check: `tools/checks/walls.mjs`.

### 2. Seven of the fifteen temples had no inside  — FIXED

`ENTERABLE` listed six build kinds. `temple-haveli`, `temple-truncated`,
`temple-colonnade` and `temple-gable` were not among them, and those four cover
Radha Damodar, Radha Raman, Radha Shyamsundar, Govind Dev, Radha Gopinath,
Shahji and Radha Vallabh — all three of the temples whose real photographs are
shipped. A solid landmark's altar anchor is a notional point 0.3 of the
footprint in from the front, which is masonry, so the Deities were sealed inside
the stone. You could circle any of these seven and never reach a Deity.

### 3. A pillar stood on the darshan axis, and the shrine swallowed the altar  — FIXED

`buildInterior` laid mandapa pillars in 3 columns, so the middle column sat at
lx = 0 — the line from the door to the Deities. Now 4 columns, so nothing stands
on that line, which is also how a real mandapa is set out.

The garbhagriha's dark mass was `D * 0.42` deep and centred ON the shrine, so it
contained the altar: the carved figures stood inside it and the photograph was
cut in half by a brown slab. It is a back wall now, with side returns, and the
Deities stand in front of it. The cusped arch was also positioned by adding
0.1 to a world z instead of going through the builder's `p()`, so it leaned
whenever `rot != 0`.

### Still open

- **`stairs.mjs` 5/6** — "every flight's treads lie square across it" fails for
  the ghats. `TerrainBuilder._buildGhats` maps its local frame as the transpose
  of every other builder's. Predates this work.
- **4 planted bushes stand inside building walls**, up to 0.76 m through. The
  bush lane's own verifier found them. `isClear` missed the compound walls for
  exactly the reason in (1) above, so this may now be fixed as a side effect —
  needs re-measuring.
- **Deity photographs for Gaura-Nitai and Krishna-Balaram**: manifest slots
  named and deliberately empty. Needs your images or ISKCON's permission.

### 4. The ghat treads lay diagonally across the flight  — FIXED

`TerrainBuilder._buildGhats` maps its local frame as
`p(lx,lz) = [cx + lx*cs + lz*sn, cz - lx*sn + lz*cs]` — the TRANSPOSE of the one
`MeshBuilder.box`, `BuildingGenerator` and `LandmarkGenerator` all use. So the
angle that orients the drawn tread is the negative of the one the collider
wants, and every tread was handed over as `rot: ang`. A tread is 0.95 m deep and
up to 120 m wide, so one turned out of true is a long diagonal bar lying across
the whole flight at the height of a single step: you climbed back onto it as
fast as you stepped off it, and the ghats could not be walked down.

`rot: -ang`, with a comment saying not to tidy it back. `stairs.mjs` 6/6:
descends 5.09 of a 5.1 m flight at all four ghats and climbs back up all 5.09.

### 5. Bushes standing in walls  — FIXED

58 of 4,006 bushes stood inside a solid, up to 2 m in. The deliberate planting
pass tested `isClear` and the general scatter did not — its comment argued "a
tuft lost to a wall is one of sixteen thousand", which is true of grass and not
of a bush: a bush is waist high and reads as an object, so one in a wall is
seen. The bush branch tests now (about 1,600 calls, not 16,000); grass still
does not. 0 of 3,916. New check: `tools/checks/planting.mjs`.

### 6. The ISKCON back gate — the GATE was fine, the CHECK was wrong

`gates.mjs` drove the walk with `player.setYaw`, but body-relative movement
takes its heading from the CAMERA RIG and latches it — `setYaw` turns the
avatar's body, not its heading. So both walks set off in the same world
direction: the front one went in, the back one went out, and the back gate was
blamed for standing still. The check points the rig now and re-latches by
releasing the stick before pressing it. 6/6, back gate reached 16 m.

Two real things did come out of chasing it: the walk had been spawning INSIDE a
building 53 m behind the temple (harmless until the wall fix made buildings
solid, which is why this surfaced now — the check asserts its start is clear),
and the back gate measured only 3.0 m of walkable width once the piers were
counted. `BACK_HALF` 2.6 -> 3.4, so 6.8 m clear.

## 2026-09-22, later — the altars were decided by a regular expression

Not a crash, and the worst thing in the file.

`buildDeities` chose the form of the Deities by testing the landmark's id
against `/radha|banke|govind|gopinath|damodar|madan|jugal|shyam|krishna|bihari|raman|vallabh/`
and drawing a gold Radha beside a blue Krishna whenever it matched. That is
inventing religious history. Checked against the research, which carries its
sources, it was wrong at seven of the fifteen temples:

- **Jugal Kishore's altar is EMPTY.** The Deity was removed to escape
  desecration and is worshipped at Panna, Madhya Pradesh. The regex matched
  'jugal' and put a Radha-Krishna pair in a monument that has none. This is the
  one that matters most: it is a false claim about a place people visit.
- **Govind Dev is in Jaipur**, in the City Palace complex. What Growse
  documents, first-hand, in the rebuilt Vrindavan sacrarium is Krishna as
  GIRIDHARI with Mahaprabhu and Nityananda.
- **Radha Raman, Radha Vallabh and Banke Bihari are single Deities.** At Radha
  Raman and Radha Vallabh a CROWN stands for Radha — there is no second murti.
  The regex drew two figures at all three.
- **Radha Damodar and Madan Mohan carry three figures**, and **Radha Gopinath
  five**, including Ananga Manjari, who stands on no other altar in Vrindavan.
- **Katyayani is seated on a lotus and multi-armed**, not a standing figure.
- **Radha Shyamsundar**: Shyamsundar is the LARGE central figure in near-black
  nila-shila; His Radharani is cast in eight-metal alloy, not painted gold.

Now `client/src/content/altars.js`, one sourced entry per altar, and a builder
that reads it. Where the research says a thing is not documented the entry says
`undocumented: true` and the builder uses a plainly dressed figure rather than
inventing a colour — and where nothing is sourced at all it falls back to ONE
generic figure, not a pair, because a generic figure says "a Deity is
worshipped here" while a pair makes a specific claim. `form: 'empty'` is a
positive statement that there is no Deity and is not the same as silence.

Rangaji is followed from the temple trust's own site (Sri Goda-Rangamannar,
Krishna as a bridegroom with a walking stick, Andal to his right and Garuda to
his left) against the tourist sites, and Katyayani's material is recorded as
contested rather than settled.

Verified by screenshot: Jugal Kishore's plinth stands empty with its lamps still
lit; Banke Bihari is one black-stone Deity; Katyayani is seated on her lotus
with eight arms.

### 7. "The deities are showing in the right wall not in main area"  — FIXED

You were right and it was two faults in the same four lines of
`DeityImages._hang`.

**The gap was a guess.** Krishna Balaram's three altar bays are at the builder's
local `lx = -7.2, 0, +7.2` — 14.4 m apart. `DeityImages` had no way to know that
and used `ALTAR_GAP = 3.4`, so the right altar's photograph hung 3.4 m off
centre, which is ON THE PIER between the centre and right bays. That pier is the
"right wall" you saw it on.

**The sideways axis was mirrored.** It built its own lateral direction as
`(cos yaw, -sin yaw)`, while every builder's local +x is `(cos rot, sin rot)`.
Those agree only when `rot` is 0 and mirror each other otherwise — so at any
temple not facing due north the left and right altars would have swapped. At
ISKCON that would have put Radha-Shyamasundara on Gaura-Nitai's altar.

Fixed by making the builder publish what it knows: the Krishna Balaram interior
now returns `altars: [{side, x, y, z}]` in world coordinates, the anchor carries
them, and `_hang` uses them when they exist. The constant survives only as a
fallback for a temple that has not said.

Measured: the panel is now 0.45 m from its own altar — which is exactly the
forward offset that keeps it in front of the carved murtis — and the published
bays are 14.4 m apart. Screenshot `docs/shots/iskcon-altar-1.png` shows Sri Sri
Radha-Shyamasundara standing in the right bay, unobstructed.

### 8. `walls.mjs` went 3/3 -> 2/3, and the CHECK was wrong

"collide() pushes you out of a wall near its end — pushed 0 m". The check took
the world's longest box collider, and after the ghat treads were fixed that is a
120 m GHAT TREAD. `collide()` deliberately does not stop you on one: a collider
carrying `top` within a step of your feet is something you walk ONTO. The check
now picks the longest box with no `top` — a real wall — and passes, pushing
3.42 m out of a 120 m wall.

### 9. `tools/checks/deities.mjs` — new, 7/7

The panels were wrong twice and both times the numbers I had looked fine, so
this asks the questions that would have caught them:

    PASS  every shipped photograph became a panel     3 for 3 (7 altars named)
    PASS  no panel for an altar with no photograph    4 named-but-empty slots
    PASS  every panel is visible                      all 3
    PASS  every panel stands at its own altar         0.45 m each
    PASS  no photograph is stretched                  1.491, 0.75, 1.333
    PASS  left and right altars are not swapped       side 1 -> 7.2 m right
    PASS  nothing stands between devotee and Deity    clear at all 3

The side check is the one that matters most: it is what stops the mirrored
lateral axis putting Radha-Shyamasundara on Gaura-Nitai's altar.

Two of the seven were wrong when first written, and both were worth fixing
rather than relaxing:

- The sightline used `isClear`, which answers "can you WALK here" and not "can
  you SEE". It failed on Krishna Balaram's altar RAIL — correct geometry, since
  the real platform is railed and devotees stand behind it. It is a raycast
  against the rendered meshes now.
- It measured every sightline from the temple's single darshan anchor, which at
  Krishna Balaram faces the CENTRE bay, so the line to the right bay ran
  diagonally through the jambs between them. It measures from in front of each
  altar now, which is where a devotee actually stands.

### A note on the audit that failed

Three agents were launched to audit panel placement, the altar table and
same-class bugs. All three stalled and returned nothing after 779k tokens: each
was given Playwright on a machine already running the dev server, every boot
takes 30-90 s under that load, and the no-progress watchdog killed them
mid-boot. Nothing was recoverable — they had made tool calls but never reached a
conclusion.

The lesson is in the split that replaced it. Panel placement became
`deities.mjs`, which is deterministic, runs in one boot and runs again every
time; only the two lanes that never needed a browser stayed as agents. A check
beats an agent wherever the question has a numeric answer.

## The check suite — 19 files

cheats, deities, dpad-dir, driving, gates, gatherings, imports, interior,
map-search, nav-smoke, overlays, parse, planting, rickshaw, runtime, save,
stairs, walls, weather.

`deities`, `walls` and `planting` are new today and all three exist because
something was wrong that no existing check could see.

## 2026-09-23 — the street names doubled

You asked twice for this: "still it does not feel like real vrindavan roads,
shops" and "show all temples and famous places... so one can really see
everything like 4 dham place that comes in the bhaktivedanta marg itself".

**54 of the 162 imported places stand within 180 m of Bhaktivedanta Swami Marg**
— the road you walk from Chhatikara to ISKCON. Dakshin Mukhi Hanuman Mandir at
18 m, Bikanerwala at 41, Brijwasi at 52, the UCO Bank at 133. They were
searchable and tappable and almost none of them had a name in the world.

Two faults, both in `Signage.js`:

1. **Which names got painted was an accident of file order.** 89 places
   qualified, there were 48 atlas slots, and the code took them with
   `.slice(0, 48)` — so 41 real shopfronts were dropped, and which 41 depended
   on the order the importer happened to emit them. They are ranked now by
   distance to a road a pilgrim actually walks (trunk, highway, main, street,
   parikrama — galis and footpaths are deliberately excluded, since a board up
   a back lane is a board nobody passes).
2. **Every temple was excluded.** The filter was `p.kind !== 'temple'`, on the
   reasoning that a temple gets built as architecture — but only 26 of 162
   places are built that way, so **34 real temples had no name on them anywhere
   in the world**. A temple that is not built now gets its board. There is
   already a `मंदिर / MANDIR` design for exactly this; nothing was using it.

The atlas went from 8x8 to 12x12 — 126 real slots instead of 48 — at the same
2048px and therefore **the same texture memory**. Cells drop from 256px to
171px, which a screenshot confirms is still comfortably legible: "Dakshin Mukhi
Hanuman Mandir / MANDIR" and "HDFC Bank / SERVICES" read cleanly
(`docs/shots/sign-atlas.png`). Several absolute pixel values in the painter —
border widths, insets, the minimum font size — were made cell-relative, or a
171px cell would have been given a 256px border.

**Result: 71 of 118 real names now carry a shopfront, against 35 before.** Cost:
nothing. 4,546 draw calls and 2.40M triangles, both unchanged; fps 60; boot 4.8s.

### Still to do here

**47 names have no building lot within 90 m** — they sit inside campuses and on
open ground where the generator lays no frontage. Giving them a small standalone
shopfront at their real coordinates is the next increment, and it is the rest of
your "show all temples and famous places".

### Two things I suspected and checked, and both were fine

- I thought temple POIs near a built landmark were duplicates. They are not:
  Radha Gokulanand, Ashta Sakhi, Advaita Vat, Shringar Vat and Vrinda Kunj are
  separate real places 68-134 m from their neighbours. The old town is that
  dense. Widening the 45 m exclusion would have deleted real temples.
- "Shri Krishna Balram Temple" looked like a duplicate of ISKCON. It is 1,892 m
  away — a different temple entirely.

### One open question

`Vrinda Kunj` is tagged a temple in OSM and gets a MANDIR board. An earlier
research pass reported it is a guesthouse, not a Sapta Devalaya temple — but
that finding is not in `docs/research/temple-architecture.json` and I have no
source in the repo for it. Rather than override OSM on an agent's say-so, the
board stands and the question is written down here.
