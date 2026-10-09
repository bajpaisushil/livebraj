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
   **The towers' openings under the arch done 2026-10-09** (23dfaac): each
   opens onto the path in a cusped arch between carved pillars, jali over,
   where the arch's springing blocks stood seven metres of plain marble.
   The swan staircases were done in 0b. Left, and why: the temple block's
   35.3 m is OSM's main block (32.3 m, as built) and a 3 m porch 17 m wide
   on the road side that OSM sets against both the samadhi and the museum —
   the little court with Prabhupada's door, rebuilt at your word, is there,
   and it wants checking against the photographs before anything moves;
   the museum as a room: what is in it is not documented past "dioramas,
   rare artefacts and a photo timeline" (iskconvrindavan.com, vcm.org.in).
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

0f. ~~**The map shows a ghat and offers no way to walk to it.**~~ **DONE
   2026-10-09**, `mapwalk.mjs` 16/16, mutation-tested. *"it shows no option
   to walk to yamuna ghat that shows in map fix it"* (2026-10-09; a second
   message, *"also"*, arrived with nothing after it — waiting for the rest).
   Reproduced on a fresh save: the map draws every landmark's icon, faint
   until you have been there, and names KESHI GHAT and KALIYA GHAT across the
   whole-town view — but a tap only answered for places already visited, so
   tapping Keshi Ghat's icon gave a "Road by Keshi Ghat" toast and no panel.
   Search was no better past the landmarks: OSM's Surya, Varaha, Mohan Ter
   and Pani Ghats, every road and every locality closed the panel instead of
   opening it, and the Yamuna itself could be neither tapped nor searched.
   Now a tap picks any landmark the map draws, visited or not (**34 of 34**
   open with "Walk here"), and the names are buttons too — KESHI GHAT in the
   whole-town view opens Keshi Ghat. Every search hit opens the panel: an OSM
   ghat, a road (walking you to the point of it nearest you, 0.00 m off the
   road), a locality, and the Yamuna — new, found by "yamuna", "jamuna",
   "yamuna ghat" or यमुना, and by a tap on the water. "The Yamuna" is the
   water's edge nearest you that a path from where you stand comes down to.
   Not simply the nearest bank: from Chhatikara that was the FAR bank with no
   route, and from Banke Bihari a riverside path that never meets a street —
   one of 30 islands in the path network, which `NavGraph.componentOf` now
   labels. Measured from Chhatikara, Banke Bihari and Prem Mandir: dry ground
   6 m from the water, routes ending 0, 22 and 0 m short of it. Mutations
   caught: visited-only taps (0/34), a landmark-only search panel (all four
   other kinds fail), no island test (Banke Bihari: no route), no path-node
   reach (the route from Chhatikara ends 6,233 m short). Found on the way:
   `map-search` waited a fixed 1.6 s for the map to fly to a hit and failed
   under a 5-wide parallel run; it now waits for the map to land.

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

4. ~~**Eight surveyed temples.**~~ **ALL EIGHT BUILT 2026-10-02.** Each
   gets built from its survey AND its checker's corrections (re-paired
   correctly 2026-09-30 — see the backlog), photographed, and measured against
   the survey's own numbers. ~~Shahji~~ · ~~Rangaji~~ · ~~Radha Vallabh~~ ·
   ~~Madan Mohan~~ · ~~Radha Raman~~ · ~~Radha Damodar~~ · ~~Radha Gopinath~~ · ~~Jugal Kishore~~.
   Radha Gopinath's open items: the lane arch's identity (choir front or court
   gateway, unresolved); the haveli's real plan and how its court reaches the
   ruin's (INFERRED door); Madhu Pandit's samadhi; a walk check of its own.
   Radha Gopinath, the last, is the least certain: the imagery puts its ruin
   ~40 m SSW of the OSM node, beside a grassed court, with the 1821 haveli
   temple between; the checker leaves open whether the lane arch is the
   choir front or the court's gateway. Build it with that marked.
   Jugal Kishore's open items: the closets in the mandap walls, the stair to
   the room inside the sikhara.
   Radha Damodar's open items (2026-10-02), queued: the five other deity
   groups on its wide altar; the gaushala; the kitchen by Prabhupada's room;
   the real plan inside the compound (only OSM's five buildings are fixed).
   Radha Raman's open items (2026-10-02), queued: the appearance-place shrine
   and Gopala Bhatta's samadhi (sources disagree where); the inner steps' turn
   to the right; the porticos' real colours; the ghera's real plan.
   ~~**Found while measuring it: the day sun is in the NORTH.**~~ **FIXED
   2026-10-02.** `palette.js` day: azimuth 2.9 rad with world z south put the
   sun at bearing ~14 degrees, 60 degrees up; at 27.6 N the midday sun is
   always due south, so every south face stood in its own shadow at noon. It
   is 0.25 now (south-south-east, late morning). And the photograph tool
   (`_siteshots`) froze the sun over the player's start, kilometres away, so
   every site photograph had been lit by the sky alone; it carries the sun
   over the view now. Radha Raman's frontispiece: V29 before, V46 after, at
   the survey's hue and saturation; what remains is a quarter-low exposure
   across the renderer, not one building.
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
7. ~~**Live data.**~~ **THE CALENDAR CROWD DONE 2026-10-09** (see the
   commit "The crowd follows the calendar"), `crowdcal.mjs` 11/11,
   mutation-tested. The town is full at darshan and on a Sunday evening,
   three-quarters on a weekday morning, thin after the temples shut at noon
   and in the small hours (never below three in ten), and full all day on a
   festival — from Banke Bihari's summer and winter darshan hours, published
   footfall (30-40,000 a day, 1.5 lakh at weekends, 5 lakh on Janmashtami)
   and the 2026-27 festival dates (`CrowdCalendar.js` cites them). People
   come and go a few a second and only out of sight; a toast says why on a
   festival or a weekend. STILL OPEN: embedding the official live darshan
   stream (allowed, but needs a network and a screen to put it on).
   **The traffic too, 2026-10-09** (87c3070): a quarter of it in the small
   hours, all of it on a Sunday evening or a festival, two vehicles a second
   on or off the road and only out of sight; a ride you are on is never
   taken off; `crowdcal.mjs` 17/17, mutation-tested. Original notes follow.
   **Live data.** *"can we have live data like crowd show here from iskcon
   vrindavan youtube channel or somewhat?"* Feasibility logged 2026-09-30:
   the official live darshan can be EMBEDDED (allowed); counting people out
   of the video cannot (terms, backend, offline). A crowd driven by the real
   calendar — weekday, arti hours, festivals — from published footfall
   figures needs no network at all.
8. **"Do proper research online and try to make everything exact."** Not a
   single task — it is the method for every item above, and it extends to the
   town: house interiors, bazaar shops, what is actually inside a Braj home.
9. ~~**The D-pad sits on top of the virtual stick.**~~ **DONE 2026-10-09**
   (488023e). Settings > Movement > "Walk with: Arrows | Stick", the arrows by
   default; the other control is off the page, and InputManager never starts
   a stick while the arrows are up. Found on the way: the stick was never
   moved under the thumb (its last-placed position started as NaN, and
   `|x - NaN| > 0.4` is never true), so it drew in the top-left corner.
   `dpad-dir` 30/30, stepped at a fixed 1/30 s. Original notes follow.
   **The D-pad sits on top of the virtual stick.** Measured at `left:12
   bottom:152, 150x150`, exactly where a thumb rests; `#touch-layer` receives
   nothing there. Was waiting on a decision; the user has since said "fix
   everything yourself", so the call is mine: show one scheme at a time.
10. ~~**Offline on the web.**~~ **DONE 2026-10-09** (ec37fd4). A
    network-first service worker with no file list (the page reports what it
    loaded), a manifest and वृ icons; Chrome calls the site installable.
    `offline.mjs` 31/31: boots offline, shows a deploy on the next load and
    offline after it, and survives a new worker version. It caught the worker
    serving the OLD build after a deploy: Chrome's in-tab memory cache handed
    the page the copies an offline load had used, without asking the worker.
    Everything the worker hands the page is now marked no-cache. Original
    notes follow.
    **Offline on the web.** No service worker or manifest, so the browser
    build dies without a network while the APK does not. Would also make the
    site installable to a home screen.
11. ~~**Fixed sleeps in the checks**~~ **DONE 2026-10-09 for the whole
    suite.** `chatter`, `dpad-dir`, `traffic` (its
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
    **`chatter`, `traffic`, `verges` done 2026-10-09** (f008e13): the game
    loop never starts, the check calls `_frame()` at a fixed 1/30 s with
    Math.random on the game's seeded generator (seed 1, `--seed=N`), and the
    output is identical alone or three at once. Seed sweeps are in the checks:
    `verges` holds its lane median under 2 m on 26 of seeds 1-30, `traffic`
    reads 2 overlaps or fewer on 24. **`dpad-dir` done the same day.**
    **`gatherings`, `vehcam`, `starthere` done 2026-10-09** (a184f96): 977 s,
    599 s and 381 s in the slowest suite to 26 s, 6 s and 12 s, the three
    together under a minute, twice; vehcam no longer flaky. **`cheats` owns
    the clock too, 2026-10-09** (ab12734): its rides were stepped but the town
    ran on in real time between the steps, and "the ride keeps going while
    the map is open" failed one run in three on the build before as after;
    and `gatherings` pins Braj's clock to 10:00 (80f2979) — it failed when
    the suite ran after nine at night, when no gathering sits. Full suite
    48/48 in 38 min. **`driving` done
    2026-10-09** (04d005b): it owns the clock as well, 5.3 -> 6.4 -> 7.1 m/s
    every run. And the game no longer asks Open-Meteo anything under
    automation: a burst of parallel runs had drawn a 429 Too Many Requests
    that failed `weather`, which now opts back in. No check in the suite
    waits on the wall clock any more; only the probe tools, which are not in
    it. Full suite 46/46 green (44 min).

12. ~~**The ghats stand in town with no river in sight.**~~ **DONE
    2026-10-09**: the river and Keshi Ghat (cba9606), `keshi.mjs` 21/21, and
    Kaliya Ghat as it is now the river has gone (c7ba841), `kaliya.mjs`
    12/12 — every check mutation-tested. Found photographing Kaliya Ghat for the arch
    fix. Research first, per ghat, what is actually there today — the Yamuna
    has moved away from many of Vrindavan's ghats, so "dry ghat facing a
    floodplain" may be the true picture — then build that.
    Measured, where the water starts out from each ghat (imagery Feb 2024 /
    game before / now): Keshi 0 / 30 / 5 m, Chir 61 / 40 / 59, Imli Tala 80 /
    55 / 81, Yugal 171 / 167 / 162, Kaliya 546 / 511 / 541. The water is now
    OSM's riverbank polygon intersected with the low-water channel on its
    centreline, and at Keshi Ghat — outside the bend, where the current cuts
    the bank — a measured front the water comes right up to. The river's
    surface is 3.6 m below the town instead of 0.55 (the bluff Vrindavan
    stands on); 387 sampled points of flooded field are 0. Water depth is
    measured to what you stand on, not to the bed under a ghat. Keshi Ghat
    itself is rebuilt from the surveyed plan in Sinha & Dhariwal (ISVS 2024)
    laid on the front measured off the imagery: promenade, fifteen treads
    into the river, eight burjes, five kunjs and two shrines, boats, and the
    aarti on the last dry tread — `docs/research/keshi-ghat.md`.
    Kaliya Ghat was a 70 m arcade wall with four chhatris across the
    Parikrama Marg, its flight cut toward a river 540 m off. Now OSM's fenced
    strip on the marg, the kadamba at OSM's own node, the round Old Kaliya
    Temple at OSM's round building, and the ghat's floor a dry court 2.2 m
    down with its chhatri, pillar, lamp tower and Krishna on Kaliya's hoods —
    `docs/research/kaliya-ghat.md`. Its story now says the river moved.
    STILL OPEN: the river's south-eastern loop, never in the game; the
    highway and pontoon bridges, which still drown; seasons; Rani Laxmibai
    Kunj's court chapel (Growse: "a colonnade of five arches on a high plinth
    … unusually broad eaves").
13. ~~**Jaipur Mandir's layout.**~~ **DONE 2026-10-09** (137a53b). It had
    stood 1 km south-west of its own building from the first day: the curated
    pin named OSM way 679447890 and sat at 27.56720 / 77.68190. It is imported
    from that way now, and rebuilt in `JaipurMandir.js` to the survey and the
    plan measured off z19 imagery: the gate faces EAST (the drive meets the
    middle of the east range, coaches on the forecourt, the axial path), the
    shrine block in the west of a 124 x 74 m walled core, its terrace and five
    risers, the great arch with the altar glowing through it, the dark
    hypostyle hall (16 columns, one pier paired, plain arches, the central bay
    vaulted higher, a chequer floor) and three sanctums, the roof kiosk with
    its barrel roof and two domes, cloister ranges, the two-storey street
    range and its gateway, the formal court, the narrow court's single tree,
    the ragged court, the forecourt, the goshala's blue sheds. `jaipur.mjs`
    13/13 walks in from the drive to darshan. Original notes follow.
    **Jaipur Mandir's layout.** Its survey places the temple block at the WEST
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
16. ~~**Prem Mandir's setting.**~~ **DONE 2026-10-09** (954e815). Measured off
    z19 imagery first, which found the temple itself 11 m east of its own
    building (the importer's name match had found the platform's pin): its
    origin is the building's OSM outline now, surveyed. Then, in
    `PremMandirSetting.js`: the Prem Bhavan at its true 85 m and place, the
    86 x 34 m hall, the fountain moved and resized with its SHOW — jets that
    rise, glow and keep the bhajan's beat 19:00-19:30 in winter and 19:30-
    20:00 in summer by the clock in Braj, in the evening phase otherwise
    (`FountainShow.js`) — the south garden's two avenues and three beds, the
    gate (red soffit band, blue grilles, peacocks, gold gates), the Kaliya
    Naag pool, guest blocks, parterres and walls. The town's lamp posts and
    poles no longer follow footpaths into walled compounds. `premsetting`
    15/15. Heights are estimates (none published): flagged in the research.
    Original notes follow.
    **Prem Mandir's setting, still to come.** The south gate (ornate marble,
    cusped arch, peacocks, gold gates, neon at night — partly paint, per the
    checker); the musical fountain's show (19:00-19:30 winter, 19:30-20:00
    summer) — jets and light, with its music; the Satsang Bhavan at its true
    ~87 m and ~187 m; the 87 x 34 m hall north of the fountain; the parterre
    beds. The avenue's line and the fountain's centre are INFERRED.
19. ~~**Holes in the terrain for sunken things.**~~ **DONE 2026-10-09**
    (c7ba841), first used by Kaliya Ghat's court: a location declares
    `basin` in its frame; the ground mesh drops the quads it touches and the
    terrain lays back the very triangles it dropped with the basin cut out of
    them exactly (same heights, colours, normals, material — no seam, no gap,
    no lip); the builder draws the basin. `kaliya.mjs` guards it. Kunds and
    Rangaji's tank can use it next. The height field is 12 m to
    a cell and the ground mesh 22 m to a quad, so nothing can be sunk below
    grade: Rangaji's tank had to go on a terrace. Wanted: a location declares
    a basin, the ground mesh drops the quads it covers, and the builder draws
    the exact complement — the same will serve every kund in Braj.
    **Brahma Kund done the same day** (c30a484, c20c6f2), the second basin
    and the first deep one: the Braj Foundation's restoration, measured on
    the imagery — the walled pit 6 m below its street, the octagon of
    stepwell flights 3.2 m further to green water, Brahma on the lotus, the
    saints, the 39 plaques, the way in past the gatehouse
    (`docs/research/brahma-kund.md`). A basin that deep taught the world
    three things, now true of every basin: the river's plane (under the
    whole map at -3.6 m) is not drawn in one; down in one a ledge is a drop,
    not a lift to the street; the camera comes down with you (`floorUnder`).
    Basins can be several rectangles. Found on the way: the unstick search
    put you on the pool's water. `brahmakund.mjs` 16/16, mutation-tested five
    ways; `steps` walks all 66 flights in the world. **Rangaji's tank done
    the same day** (cf22d9b): off its 2.5 m terrace and into a basin, at the
    place the imagery shows (8 m east, 6 m south of the survey's; the
    imagery settles the checker's doubt — the NE quadrant), 2.8 m down from
    its court, the kiosks on their pedestals at the west and east edges,
    flat-roofed; both pools now in the river's own water material with a
    Fresnel sky term, because flat green read as a lawn. `rangajitank.mjs`
    11/11, mutation-tested.
18. **Every dome, spire and tree was drawn inside out — FIXED 2026-09-30.**
    Found building ISKCON: shikhara(), dome(), ribbedDome() and the tree
    canopy blob() wound their ring quads to face INWARD, and those meshes are
    single-sided, so from outside you saw the inner faces of the far half, lit
    from the wrong side. Measured on Prem Mandir's shikhara: 254 faces in, 2
    out; now 254 out. Canopies are now capped top and bottom.
17. ~~**The crowd stands on the terrain, never on a floor.**~~ **DONE
    2026-10-09** (94f0b05). `standHeightFast` hands the player's own rules
    (one function, `_standOn`) the one 10 m cell of an index of the
    standables: 0.028 us a call against 6.84 for the full scan, and the same
    answer to the bit at 56,360 points. Walkers, cows, waiting rickshaws and
    seated gatherings stand on what is under them; on Prem Mandir's paving
    they had stood 40 cm into it, not 17. A HIRED rickshaw keeps the terrain,
    because RickshawSystem seats its passenger by it: lift both together with
    item 15. `crowdfloor` 16/16. Original notes follow.
    **The crowd stands on the terrain, never on a floor.** Every CrowdSystem
    and GatheringSystem agent takes `groundHeight`. Harmless today only
    because they are kept out of landmark footprints; on Prem Mandir's paving
    they would stand 17 cm into it. Needs a grid-indexed `standHeight` —
    the player's version walks every standable in the world per call, which
    is fine once a frame and far too slow for a crowd.

15. ~~**E-rickshaws doing 94 km/h.**~~ **DONE 2026-10-09** (6e8bd3f). The hired
    vehicle and the one you drive keep the speed each really has on each kind
    of road (`RoadSpeeds.js`; sources in `docs/research/vehicle-speeds.md`:
    CMVR rule 2(cb) caps an e-rickshaw at 25 km/h, S.O. 1522(E) of 2018 the
    rest, and a 100-trip GPS study puts e-rickshaws at 17.4-18.3 km/h). A
    journey too long to sit through is a TIME-LAPSE of the whole town, said on
    the ride bar ("time-lapse x5"), never a faster vehicle: Chhatikara to
    ISKCON is 17 min of the town's time by e-rickshaw, shown at x5 in 3.4 min,
    and never above 20 km/h. Jaldi leans the driver toward the road's most
    and raises the rate; the five-minute promise is kept by the rate. Found
    on the way and fixed: every passenger stood up through the roof 1.4 s into
    every ride (the sitting-down's hold was never honoured, the seat height
    was applied to the feet, and the roofs were 0.3-0.4 m low); and on a phone
    the ride bar's status stood one word to a line. `timelapse` 11/11,
    `seated` 10/10 (mutation-tested), `rickshaw` 31/31, `cheats` 12/12,
    `driving` 9/9. Original notes follow.
    **E-rickshaws doing 94 km/h.** Seen in the vehicle-camera trace: 26 m/s
    on a ride from Chhatikara. Ride pacing speeds the vehicle up to arrive
    inside a time cap. A real e-rickshaw in these lanes does roughly 15-25
    km/h. Research real speeds per vehicle type and road, then decide how a
    5 km ride stays bearable without driving through town at highway speed —
    the honest options are a faster vehicle class on the highway stretch, or
    a shorter world (the old queue's 12 km question), not a rickshaw at 94.

20. ~~**The e-rickshaw is 1.4 m wide; real ones are 0.95-1.0 m**~~ **DONE
    2026-10-09** (0299d77): 1.0 m. Swept over seeds 1-60: `traffic` green on
    46 at 1.0 m against 49 at 1.4, `verges` on 43 either way — the traffic
    failures the same head-on standoffs reshuffled among the seeds (item 21).
    Original notes follow. (Saarthi, JSA, Neelam, Ele and E-Ashwa
    specifications, all 2.7-2.8 m long and 1.73-1.87 m tall, which the model
    now is). Narrowing it changes how traffic spaces itself, and so the
    seeded `traffic` and `verges` baselines: a pass of its own, with those
    seeds swept again.
21. ~~**Vehicles keep left.**~~ **DONE 2026-10-10** (3f916c1). Probed, the
    standoffs were not only head-on meetings: a vehicle chose its next leg
    among every edge out of a node, the one it had just driven included, and
    with a node every 8 m it turned round in the road about one leg in three
    (51 of 163 on seed 1), in front of whoever was following. Now: no U-turn
    unless the road ends (or nothing else a vehicle fits down leaves the
    node — NavGraph's `_edgeOpen`, which only the hired routes used), and no
    leg into a dead end where there is a way on; a lane — a little left of
    the middle on a street (0.6 m, the walkers being 2.6 m out), moving over
    only as far as what is coming needs, a lane each on the wider roads, the
    middle of a one-way carriageway; arrival level with the node AND near the
    lane (level alone let a vehicle that swung wide never come back); what is
    ahead measured as the gap from the nose by real lengths (the stop was
    3.2 m centre to centre and a cab is 4.1 m long, so cabs queued a metre
    into each other); held by something going nowhere, a vehicle waits a
    moment and goes round it — overtaking on the right, pulling in for what
    is coming, driving on past what is across its path — and of two holding
    each other, one goes, by a fixed order; walkers step round a vehicle
    instead of standing at its nose; recycled vehicles land on roads, not in
    the galis. `traffic` now counts two BODIES that touch (the old count,
    centres within 1.5 m, missed every one of those queued cabs: measured as
    bodies, the traffic before had a pair inside each other for 36-45 s on 16
    of 60 seeds) and asserts lanes pass, standoffs clear and U-turns are
    forced; `verges` measures from the lane and asserts keeping left. Over
    seeds 1-60: `traffic` 51 green (the old traffic, measured the same way:
    44), `verges` 52 (52); each new assertion mutation-tested. Full suite
    49/49. What is left is item 23. Original notes follow.
    **Vehicles keep left — PARTLY DONE 2026-10-09** (1a1ecb3). Found
    sweeping item 20: every remaining `traffic` failure, on 14 of 60 seeds,
    was two vehicles meeting head-on, each seeing the other dead ahead and
    stopping for good. Probed, the worst were on NH 44 by Chhatikara: OSM
    maps it as two carriageways, oneway=yes — 89 ways in all, 25 of the 32
    secondary roads — and the importer dropped the tag, so they were driven
    both ways. One-way roads are now one way (ambient traffic never goes
    against; a ride's route may, at 12x the cost): `traffic` 52 of 60 seeds
    (from 46), `verges` 52 (from 43). STILL OPEN: the four long standoffs left
    (seeds 40, 43, 56, 60) are true head-on meetings on two-way streets —
    vehicles drive a leg's centreline both ways. Keeping left was tried and
    REVERTED: alone it did not help `traffic` (46) and broke `verges`' lane
    measure; it also needs the node-reach test widened by the lane (a 2.2 m
    lane never came within 1.6 m of a node) and no lane on dual carriageways.
    Worth another go now the one-way cause is out of the way.

22. ~~**Garud Govind Kund and its temple, Chhatikara.**~~ **DONE 2026-10-09**
    (ea7d0cd), `garudgovind.mjs` 11/11; every check that walks all temples
    takes it in. `docs/research/garud-govind.md`. Original notes follow.
    **Garud Govind Kund and its temple, Chhatikara — QUEUED 2026-10-09.**
    Found looking for the next basin: 700 m from where every player starts,
    the game has only a surveyed point ("Stepped masonry tank (kund) at
    Chhatikara") and a walled complex beside it. ESRI z19 shows a tank about
    49 x 52 m, set diagonally, with paved stepped edges on its north-west and
    south-west sides, the walled Garud Govind temple against its east side,
    a second, natural pond north of it and the Shadang van forest round
    both. The Braj Foundation de-silted it from October 2007 ("upto the brim
    with clean water ... most of the year"); the temple keeps "a rare and
    exquisite idol of Krishna seated on a Garud" (brajfoundation.org).
    brajrasik.org's gallery (24 photographs, March 2024) has what a build
    needs: the kund's vertical rubble-stone walls whitewashed along the top,
    red sandstone coping with hexagonal-lattice jali railings, a railed
    platform out over the water about 2 m down, ghats with small chhatris at
    the far corners, a paved walk round it with sandstone benches and a big
    tree on its platform, a Shiva lingam; the temple painted lime green with
    a small white shikhara (not plain, as one guide has it), a white-flagged
    courtyard with a pillared veranda and a small white shrine, a blue wall
    mural of Garuda seizing a snake (the Kaliya boon), a white scalloped-arch
    gateway; Govind on Garuda in the sanctum; babool scrub all round.

23. **Vehicles held in the crowd round you; corners clipped at junctions —
    PARTLY DONE 2026-10-10** (5285982). Building Chhatikara (item 24) put the
    traffic among lanes and corners and made it plain: an auto took a village
    right angle at road speed into a tempo coming the other way, and a cab
    waited 26 s for two people standing at its bumper. Now vehicles pick
    their next leg 9 m out and slow for a sharp turn; people standing about
    step out of a vehicle's way; a way round keeps everything it has gone
    round; two holding each other give way in 0.8 s; a wedged vehicle backing
    to try again no longer counts as moving. On no seed of 60 does a pair
    touch for more than 4.5 s (16-26 s on four before); `traffic` 51 of 60,
    every red brief touches over the 15 allowed; `verges` 56 of 60. Still
    open: walkers still pass through vehicles (no collision between the two),
    and brief clips at junctions. Original notes follow. Left by item 21,
    measured: on 9 of 60 seeds a pair
    of vehicles still touches for more than 4 s, or more than 15 half-second
    samples in 45 s. The long ones (seeds 32 and 47, 16-18 s) are vehicles
    by the start held by walker after walker at the bumper — the crowd is
    thickest round you, and an ambient walker passes THROUGH a vehicle (no
    collision between the two), so one stands in its stop zone for as long
    as it takes to walk through it — with the next vehicle queued into it.
    The short ones are corners clipped at junctions: a vehicle turning onto
    its next leg finds one stopped across it (it now looks down the line it
    is steering for, for vehicles), and `_crossYield` does not see a merge
    once the two are within 40 degrees. What would fix it: walkers solid to
    vehicles and vehicles creeping through a crowd as they do here (people
    part for a horn), and one vehicle at a time through a junction's stitch.

24. **Chhatikara, where everyone starts — THE VILLAGE DONE 2026-10-10**
    (5285982); **the flyover, the rail over-bridge, the railway QUEUED.**
    Photographed before: open grass and scattered trees round the start, the
    farmland rule for the corridor (BuildingGenerator's `country`) covering
    the village at the highway too. ESRI z17-z19 on the world's 200 m grid:
    a dense core of flat-roofed houses between NH 44 and the railway, a
    cluster north-east of the highway, shops on both service roads, the
    Govardhan road to the rail over-bridge, the first stretch of the
    Vrindavan road — and the start pin in the middle of it. Built: four
    districts (`village` kind and three bazaar bands, which line the service
    roads), 598 lots at mid quality on a budget of their own, so Vrindavan's
    lots are untouched. QUEUED, measured: **the NH 44 flyover** — OSM ways
    973946074/5, 587-589 m, layer 1; z19 shows the central carriageways on a
    deck about 29 m wide with a parapet line and a shadow, the service roads
    at grade on both sides and the Vrindavan road's traffic passing under;
    today it is drawn flat, and NavGraph would join a deck to the road under
    it (it snaps nodes within 3 m and stitches within 9). **The Govardhan
    road's rail over-bridge** (671541219, 841 m) and **the railway** under it
    (the Delhi-Mathura line, with Chhatikara station), not in the game. The
    village's roofs take the town's bright palette; Chhatikara's are grey
    concrete with blue water tanks. The Yamuna: of 27 bridge ways in the
    import, two cross water — 670922315 (166 m, the pontoon north-east of
    town) and 972756778 (102 m, not imported) — and the river's south-eastern
    loop is dropped because the importer keeps only the longest stretch of
    the waterway inside the world (its riverbank polygon, 1423292, is there).

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
