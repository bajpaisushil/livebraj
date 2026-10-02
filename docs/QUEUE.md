# Queue — everything asked for, and where it stands

*Rewritten 2026-09-30. Every request from the user goes here the moment it
arrives, before any work starts on it. The previous version was dated
2026-09-26 and had drifted; one request ("follow the vehicle as it changes
lanes") was dropped entirely between then and now, and was only found by
searching the backlog for it. That is the failure this file exists to stop.*

*"Verified" means a check in `tools/checks/` asserts it. Anything else says so.*

---

## NOW — in progress, in this order

1. ~~**Houses: "unable to enter any house like pokemon rpg as it should."**~~
   **DONE 2026-09-30.** Every doorway had a lila mural painted across it —
   120 of 120 in a mutation test — and the damp band ran across the
   threshold, reflected. Guarded by `houses.mjs`. Original notes follow.
   Measured: walking a test player from the street through the door, using
   the engine's own movement, gets into **150 of 150** sampled houses. So
   collision works and the fault is what the player SEES. Prime suspect is
   mine: the red-oxide skirting and damp band added 2026-09-27 are drawn as a
   full box round every building's base, straight across every doorway. Also
   to check: whether enterable doors read as different from painted ones, and
   whether entering feels like entering (the old queue already said "the view
   change on entering needs checking").
2. ~~**Arch orientation, codebase-wide.**~~ **DONE 2026-09-30, pending the
   full suite.** 211 of 254 judged arches stood across their walls; now 0 of
   267, guarded by `arches.mjs`. Causes: `rot + PI/2` copied onto long-axis
   walls; my eight builders from 2026-09-27 written in the mirror frame while
   drawing in the box frame; the ghat facades in the box frame behind steps
   cut in the mirror frame; Jaipur Mandir at an unsourced 15 degrees (the
   survey measures 2). Arch apertures now drawn on both faces, so none is
   buried inside its own wall. Also found on the way: **InteriorSystem read
   house rotations in the wrong frame** — 154 of 721 houses did not notice you
   step inside, 42 lifted the roof while you stood in the lane. Now 721/721
   both ways, guarded by `houses.mjs`. Original notes follow.
   **Arch orientation, codebase-wide.** Measured: `cuspedArch` given
   `rot + PI/2` in a wall along the builder's long axis draws the arch
   PERPENDICULAR to the wall — a fin, not an opening. Prem Mandir's whole
   colonnade and door, ISKCON's verandahs, and the Banke Bihari top arcade
   (mine, 2026-09-27) all do it. One audit, many buildings.
3. ~~**Prem Mandir faces the wrong way.**~~ **DONE 2026-09-30** (faces east;
   see the backlog). Then RE-FOUND the same day: **"vanished under stairs on
   walking instead of stepping up" was never fixed.** Walked with the
   player's own movement, the body went 34 m under the jagati from the east:
   the plaza was drawn 0.65 m up with no floor, so the first tread stood 1.0 m
   over the feet, and the jagati's sides were stand-only and stopped nothing.
   Also inside: the 1.35 m kursi was a SOLID block under the whole building
   with the floor left at its foot — chest-deep in marble. **FIXED 2026-09-30:**
   plaza at grade in the measured #ab8a82 with its diamond lattice, jagati and
   kursi solid-with-a-top, a door flight up the kursi, the chrome balustrade,
   the real musical fountain north (the three invented ones removed), the
   south avenue. Guarded by the new `platforms.mjs`, which walks into every
   raised floor in the world and onto every flight from its landing. It found
   the same fault at Krishna Balaram (hall floor, beside the flight) and a
   stair climbing up under Ashta Sakhi's upstairs slab (head through the
   floor); both fixed. Original notes follow.
   **Prem Mandir faces the wrong way.** Entrance and steps on the SOUTH; the
   checker measures a 35.5 m forecourt and the steps on the EAST, sanctum and
   shikhara at the WEST end (18.5% from it), building 11 m west of the
   platform's centre, an eastern bow with two ornamental pools, and the flag
   on its own mast beside the kalash rather than on it.

## NOW — added mid-turn

0a. **ISKCON: the golden Prabhupada room just inside the entry, on the LEFT,
   is missing, and the corridor is too narrow.** *"still iskcon vrindavan is
   not that exact, the golden prabhupada deities room present just after the
   entry on left side is not there see as attached and make some more space
   in the corridor of it it's very narrow as of now"* (2026-09-30, with a
   photograph: the view north through the white arch-bridge between the two
   domed towers, the chequer court, the curving white stair on the left, the
   temple door and domes beyond). Wanted: (a) the room with the golden murti
   of Srila Prabhupada on the left just after the entry — research what and
   where it really is before building it; (b) more room in the corridor —
   measure the real width off the photograph and OSM and widen what is too
   narrow. **BUILT 2026-09-30, pending the checks** — the golden murti's
   room behind the samadhi's door (walk-in), the approach opened into the
   forecourt it really is, the west corridor widened from 2.5 m to 4.8 m,
   both side doors, the road gate and GATE:2 as photographed, the peepal
   east of the gate; see the backlog. Still to come: the swan staircases'
   true run, the towers' openings under the arch, the museum room.
   **Added the same turn:** *"there is a small door on both left and right
   sides of deities room of iskcon temple allowing to walk in out of corridor
   alos"* — (c) a small door in EACH side wall of the deities room, so you can
   walk in and out from the corridor, not only through the front.

0b. **ISKCON: the golden Prabhupada room is on the wrong side.** *"no still
   not right prabhupada deity are after the top stairs and between the stairs
   and out of deity main temple room on elft side of enter and on right side
   is a shop currently prabhupada deities are beofre the stairs towards gate
   which is wrong"* (2026-09-30). Read as: past the swan staircases, in the
   small court between them and the main temple's door, on the LEFT as you
   walk up to the temple entrance, is Srila Prabhupada's murti; on the RIGHT
   a shop. It was built behind the samadhi's road face, before the stairs,
   toward the gate. Fix: the room's door on the samadhi's north-east face,
   which looks onto that court (the photograph of its black door up broad
   steps under a carved portico is taken from there, the cream temple behind);
   a shop on the museum's face opposite. **BUILT 2026-09-30** — the room,
   its steps and the Samadhi board moved onto the north-east face in its own
   frame (every figure kept); the road face is jali now; the "Gift Shop"
   booth of books and brass across the court; the two swan staircases up the
   buildings' diagonal faces to the path, as the photographs run them (the
   survey's double quarter turn removed). interior 30/30 walks you in from
   the new door; platforms, stairs, steps and 11 more green.

## NEXT — queued, in this order

0. ~~**ISKCON Krishna Balaram does not look like the real one.**~~ **BUILT
   2026-09-30** — see the backlog entry of that date. The site was turned
   102 degrees wrong and pinned 29 m off; it now sits on the temple's own OSM
   centre on the site grid, and the whole campus is laid on OSM's outlines:
   (a) shops — the Market Place strip, ATM and Post Office on the south edge,
   the six kiosks along the west fence; (b) the FRONT gate on Bhaktivedanta
   Swami Marg (the survey's cream gatehouse) and the BACK gate on the west
   lane, both with guards and a booth; (c) the outer arcaded approach, and the
   kiosk corridor along the temple's west wall; (d) Srila Prabhupada seated in
   his Samadhi Mandir between carved lions, seen through its door; (e) the
   Museum; and the great arch-bridge between them. Still to come, INFERRED
   where built and queued here: the Samadhi and Museum interiors as rooms you
   walk into; the arcade signage inside the temple court (GIFT SHOP, BOOK
   STALL, MAHAPRASAD, Govinda's); the temple block's true 35.3 m length (it is
   32); the guards' uniforms (unsourced); the west gate's exact place; where
   Govinda's really is; the MVT guesthouse outside the north fence.
   Original request:
   **ISKCON Krishna Balaram does not look like the real one.** *"still iskcon
   does not look at all how it actually is? there are lot of shops there with
   back and front gates with guards in real with outer corridors having srila
   prabhupada deity on some place and museum as well?"* (2026-09-30). Wanted,
   point by point: (a) the row of shops; (b) a FRONT gate and a BACK gate,
   each with guards; (c) the outer corridors; (d) Srila Prabhupada's murti
   where it really stands; (e) the museum. Research each first — the survey
   in docs/research/iskcon-krishna-balaram.md, then photographs and OSM —
   then build, photograph, measure. Next after Start from here ships.

4. **Eight surveyed temples — Shahji, Rangaji, Radha Vallabh, Madan Mohan and Radha Raman BUILT, three to go.** Each
   gets built from its survey AND its checker's corrections (re-paired
   correctly 2026-09-30 — see the backlog), photographed, and measured against
   the survey's own numbers. ~~Shahji~~ · ~~Rangaji~~ · ~~Radha Vallabh~~ ·
   ~~Madan Mohan~~ · ~~Radha Raman~~ · Radha Damodar · Radha Gopinath · Jugal Kishore.
   Radha Raman's open items (2026-10-02), queued: the appearance-place shrine
   and Gopala Bhatta's samadhi (sources disagree where); the inner steps' turn
   to the right; the porticos' real colours; the ghera's real plan.
   **Found while measuring it, queued as its own item: the day sun is in the
   NORTH.** `palette.js` day: azimuth 2.9 rad with world z south puts the sun
   at bearing ~14 degrees, 60 degrees up; at 27.6 N the midday sun is always
   due south. Every south face in the game stands in its own shadow at
   midday — Radha Raman's frontispiece measures V29-37 against the
   photographs' V60-79 at the right hue and saturation. Turning it is one
   number, but it relights the whole world, so it gets photographed across
   the temples first.
   Madan Mohan's open items (2026-10-02), queued: the trees in the court north
   of the sanctum; what stands south of the stair below the red building; the
   east approach Growse built in 1875; the choir, sanctum and gateway passage
   to walk into; the new temple's real plan (its place is Growse's plate on
   the imagery, its form inferred).
   Rangaji's open items, queued: the tank is on a raised terrace because the
   terrain cannot yet hold a sunken pit (see 19); the Sheesh Mahal, the rath
   in its shed, and the Brahmotsav garden 558 m south (OSM way 99427181) are
   not built; the gopuram count beyond the two principal ones is unresolved;
   the blue range by the tank is not given the temple's fabric.
   Shahji's open questions, queued: the Basanti Kamra at the court's east end
   (the checker: it may carry a dome — untested); the rooftop statues'
   individual poses; the heights, which rest on one 1883 phrase.
5. ~~**The vehicle camera follows the vehicle.**~~ **DONE 2026-09-30.**
   The heading is published every moving frame and the view eases round to
   it after 1.8 s of the look control being left alone (tau 0.7 s). Measured
   in GAME time — headless runs the loop at 0.28 updates per frame, which made
   the first version of the check wait 0.35 s and blame the camera: median lag
   2.9 degrees, 90th percentile 9.6, look-away respected, released within 4 s
   of moving. Guarded by `vehcam.mjs`. Original notes follow.
   **The vehicle camera follows the vehicle.** *"as the lane changes in
   vehicle change the view to that like update it to front view of vehicle
   moving direction."* DROPPED earlier, found 2026-09-30. Today the view
   points along the direction of travel once, at pull-away, and never again.
   Wanted: a chase view that keeps turning with the vehicle, and that eases
   back behind it a few seconds after you stop swinging it yourself.
6. **3D Deities.** *"try to make deities also real like instead of putting
   image with backgrounds … a good 3D like deities exact would look good …
   and real."* Needs research first, per temple: the murti's documented form
   — pose, stone and colour, height, what is held, how it is dressed — so
   nothing is invented. See the honest limits below before expecting
   photoreal.
7. **Live data.** *"can we have live data like crowd show here from iskcon
   vrindavan youtube channel or somewhat?"* Feasibility logged 2026-09-30:
   the official live darshan can be EMBEDDED (allowed); counting people out
   of the video cannot (terms, backend, offline). A crowd driven by the real
   calendar — weekday, arti hours, festivals — from published footfall
   figures needs no network at all.
8. **"Do proper research online and try to make everything exact."** Not a
   single task — it is the method for every item above, and it extends to the
   town: house interiors, bazaar shops, what is actually inside a Braj home.
9. **The D-pad sits on top of the virtual stick.** Measured at `left:12
   bottom:152, 150x150`, exactly where a thumb rests; `#touch-layer` receives
   nothing there. Was waiting on a decision; the user has since said "fix
   everything yourself", so the call is mine: show one scheme at a time.
10. **Offline on the web.** No service worker or manifest, so the browser
    build dies without a network while the APK does not. Would also make the
    site installable to a home screen.
11. **Fixed sleeps in the checks** — `chatter`, `dpad-dir`, `traffic` (its
    "vehicles rarely end up in the same place" runs 45 s of wall clock and
    fails under a parallel suite, passes alone) and a dozen probe tools still
    wait on a clock instead of a condition. This class caused every
    intermittent failure found so far. **`cheats` done 2026-09-30:** its jaldi
    and map-open rides now run Chhatikara to ISKCON in fixed steps over
    20-second stretches, and the rath test moves passing traffic on before
    asking what it is offered (5/5 alone, green in parallel).
    `verges` ("no vehicle is standing in somebody", 0.85 m) has missed by
    3-15 cm in some parallel runs since 2026-09-30 and passed 3/3 alone after;
    it now reports WHERE a strike is, so the next one can be looked at.

12. **The ghats stand in town with no river in sight.** Found photographing
    Kaliya Ghat for the arch fix. Research first, per ghat, what is actually
    there today — the Yamuna has moved away from many of Vrindavan's ghats, so
    "dry ghat facing a floodplain" may be the true picture — then build that.
13. **Jaipur Mandir's layout.** Its survey places the temple block at the WEST
    of its enclosures with the open ground EAST, and takes an east entrance as
    the working assumption (flagged unresolved). Our builder puts the gate in
    a long south range. Apply the survey's site plan.
14. **3D Deities research — PARTLY DONE, the rest blocked on the spend
    limit.** 2026-09-30: four of five surveys came back (87 murti entries,
    filed in `docs/research/deities/`); the ISKCON + Prem Mandir survey and
    three of the four checkers stopped when the organisation hit its monthly
    spend limit. Only Govind Dev / Shahji / Radha Shyamsundar is checked —
    and its checker says the survey MERGED two separate Govind Dev shrines
    into one altar. Re-run the missing five agents when the limit resets
    (the workflow resumes from cache: run wf_7ae47b98-f89). Build murtis only
    from the checked group until then.
16. **Prem Mandir's setting, still to come.** The south gate (ornate marble,
    cusped arch, peacocks, gold gates, neon at night — partly paint, per the
    checker); the musical fountain's show (19:00-19:30 winter, 19:30-20:00
    summer) — jets and light, with its music; the Satsang Bhavan at its true
    ~87 m and ~187 m; the 87 x 34 m hall north of the fountain; the parterre
    beds. The avenue's line and the fountain's centre are INFERRED.
19. **Holes in the terrain for sunken things.** The height field is 12 m to
    a cell and the ground mesh 22 m to a quad, so nothing can be sunk below
    grade: Rangaji's tank had to go on a terrace. Wanted: a location declares
    a basin, the ground mesh drops the quads it covers, and the builder draws
    the exact complement — the same will serve every kund in Braj.
18. **Every dome, spire and tree was drawn inside out — FIXED 2026-09-30.**
    Found building ISKCON: shikhara(), dome(), ribbedDome() and the tree
    canopy blob() wound their ring quads to face INWARD, and those meshes are
    single-sided, so from outside you saw the inner faces of the far half, lit
    from the wrong side. Measured on Prem Mandir's shikhara: 254 faces in, 2
    out; now 254 out. Canopies are now capped top and bottom.
17. **The crowd stands on the terrain, never on a floor.** Every CrowdSystem
    and GatheringSystem agent takes `groundHeight`. Harmless today only
    because they are kept out of landmark footprints; on Prem Mandir's paving
    they would stand 17 cm into it. Needs a grid-indexed `standHeight` —
    the player's version walks every standable in the world per call, which
    is fine once a frame and far too slow for a crowd.

15. **E-rickshaws doing 94 km/h.** Seen in the vehicle-camera trace: 26 m/s
    on a ride from Chhatikara. Ride pacing speeds the vehicle up to arrive
    inside a time cap. A real e-rickshaw in these lanes does roughly 15-25
    km/h. Research real speeds per vehicle type and road, then decide how a
    5 km ride stays bearable without driving through town at highway speed —
    the honest options are a faster vehicle class on the highway stretch, or
    a shorter world (the old queue's 12 km question), not a rickshaw at 94.

## OPEN — reported, not yet reproduced

- ~~**"start from here not working in map"**~~ and ~~**"still 'start from
  here' does not work?"**~~ **FIXED 2026-09-30, shipped in the push that
  follows this entry.** On foot it worked; in a rickshaw it failed three ways
  at once, all invisible to `map-search`, which called `placeAt()` and never
  touched the button: (1) the ride's window key listener ate the search box —
  the d in "Radha Raman" TOOK THE WHEEL, any s stopped the ride, and the box
  read "Raha Raman" and found nothing; (2) the ride bar stayed up over the map
  and sat exactly on the button; (3) a ride holds you to its seat every frame,
  so the move was undone at once. Now: ride keys ignore text fields and act
  only in the world; the ride bar is world-only; the button calls a new
  `RickshawSystem.leave()` first. Guarded by the new `starthere.mjs` — real
  taps on a Pixel 5 viewport, on foot and mid-ride, 8/8 — mutation-tested:
  each of the three fixes removed makes it fail.

- **"Lot of glitches."** No screen or repro yet.
- **Getting stuck between the ISKCON pillars.** The infinite-height rails are
  removed (escape distance 8.6 m → 20.9 m), an unstick and "Start from here"
  exist — but the person who kept getting trapped has not confirmed it is
  fixed. Every `[player] unstuck from X Z` in the console is a coordinate.

## WAITING ON THE USER — cannot be done from here without guessing

- **Ten road names.** OSM names 41 of 2,146 ways here. The Parikrama feeders,
  the Loi Bazar approaches, the Keshi Ghat road, the Raman Reti lanes.
- **Which OSM way is Jagadguru Kripalu Marg?**
- **Is Chhatikara Crossing the bus stand,** or is it further out on NH 44?
- **Deity photographs for Gaura-Nitai and Krishna-Balaram** — Commons holds
  exactly one freely licensed ISKCON Vrindavan altar photograph.

## HONEST LIMITS — said once, plainly, so they are not rediscovered

- **Photoreal 3D Deities cannot be generated procedurally.** Everything in
  this world is built from boxes in code. A respectful, stylised 3D murti
  that matches each temple's documented form — pose, stone, colour,
  ornament — IS buildable, and would sit in the same art style as the rest of
  the town. Photoreal needs authored, sculpted models: commissioned, or
  licensed. Downloading someone's scan of a temple's murti is not licensed
  use, and sacred images carry their own sensitivity on top of copyright.
- **No Google data.** Rule §5 of the brief, and repeated in DATA-SOURCES.md:
  OpenStreetMap under ODbL, public datasets, satellite for measurement only.
- **Photographs are not textures.** They are measured, never traced or baked.
- **Procedural geometry caps fidelity.** The old queue already raised this:
  "GTA Vice City quality needs authored art", and the Unity port is a
  decision still sitting with the user.

## DONE THIS SESSION — with the proof

| Asked for | What it was | Guarded by |
|---|---|---|
| Curtains 4am open / 9pm shut, every temple, even standing at the altar | Scene-wide `Night:` traversal, per-altar coverage, Braj wall clock. Proved itself at 21:01 IST by shutting while a check watched | `deities` 15/15 |
| Stuck between the ISKCON pillars | The hall rails had no `h` — infinitely tall walls down both sides | `_cage`, `_wedge` probes |
| A way out when stuck | Automatic unstick after 1.5 s wedged, plus "Start from here" on any searched place | `map-search` 26/26 — a real rescue from inside masonry |
| Could not type `m` in map search | A second window keydown listener with no typing guard | `map-search` |
| Rickshaw only offered eight places | Search the fare dialog by name, Devanagari or deity | `rickshaw` 31/31 |
| Vanished under Prem Mandir's stairs | First pass: the treads had no colliders. **That was not the whole of it** — re-found 2026-09-30: a floorless plaza made the first tread a 1.0 m step, the jagati's sides stopped nothing, and the kursi buried you inside the temple. Now solid platforms with tops, at grade, walked end to end | `platforms` 5/5 (new), `steps`, `stairs` |
| Nothing looks real — colour | One flat hex per building; palette data at median S 0.25 against measured 0.50–0.75; a pastel town | `BrajPalette.js`, measured on renders |
| Nothing looks real — the town | Oxide skirting, damp, roofs with tanks and monkey cages, the wires | photographs |
| Temples standing in fields | A circular keep-out, then a 0.8 m margin, then a 49 × 55 m plinth — three causes, one symptom | measured 3.3 m off the wall |
| Banke Bihari, Govind Dev, Jaipur Mandir, Prem Mandir, ISKCON details | From surveys; Govind Dev's onion dome was an interior vault drawn on the outside | photographs |
| Deploy to the web | Static site on Vercel, root `client`, no build step | booted off a bare `http.server`, 0 errors |
| Git + auto-deploy | Repo, `.gitignore` (98 MB → 12 MB), pushes deploy | — |
| Map accuracy | OSM positions within 0.2% of true great-circle distance | measured |
| "Start from here" failing mid-ride | Keys typed in the search drove the rickshaw; ride bar over the button; ride re-seated you | `starthere` 8/8, mutation-tested |
| Walked under Prem Mandir; into ISKCON's hall floor; head through Ashta Sakhi's floor | Stand-only platforms in the open, a floorless plaza, a solid kursi with the floor at its foot, a stair under a slab | `platforms` 5/5 (new), `halls` 6/6 (now carries the feet) |
