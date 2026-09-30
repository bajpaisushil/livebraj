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
3. **Prem Mandir faces the wrong way.** Entrance and steps on the SOUTH; the
   checker measures a 35.5 m forecourt and the steps on the EAST, sanctum and
   shikhara at the WEST end (18.5% from it), building 11 m west of the
   platform's centre, an eastern bow with two ornamental pools, and the flag
   on its own mast beside the kalash rather than on it.

## NEXT — queued, in this order

4. **Eight surveyed temples, none built.** Each gets built from its survey
   AND its checker's corrections (re-paired correctly 2026-09-30 — see the
   backlog), photographed, and measured against the survey's own numbers.
   Rangaji · Shahji · Radha Vallabh · Madan Mohan · Radha Raman ·
   Radha Damodar · Radha Gopinath · Jugal Kishore.
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
11. **Fixed sleeps in the checks** — `chatter`, `cheats`, `dpad-dir` and a
    dozen probe tools still wait on a clock instead of a condition. This class
    caused every intermittent failure found so far.

12. **The ghats stand in town with no river in sight.** Found photographing
    Kaliya Ghat for the arch fix. Research first, per ghat, what is actually
    there today — the Yamuna has moved away from many of Vrindavan's ghats, so
    "dry ghat facing a floodplain" may be the true picture — then build that.
13. **Jaipur Mandir's layout.** Its survey places the temple block at the WEST
    of its enclosures with the open ground EAST, and takes an east entrance as
    the working assumption (flagged unresolved). Our builder puts the gate in
    a long south range. Apply the survey's site plan.
14. **3D Deities research is running** — five groups, each checked by a
    refuter, building on `altars.js`, which already records each altar's
    documented form and marks `undocumented: true` rather than guessing.

15. **E-rickshaws doing 94 km/h.** Seen in the vehicle-camera trace: 26 m/s
    on a ride from Chhatikara. Ride pacing speeds the vehicle up to arrive
    inside a time cap. A real e-rickshaw in these lanes does roughly 15-25
    km/h. Research real speeds per vehicle type and road, then decide how a
    5 km ride stays bearable without driving through town at highway speed —
    the honest options are a faster vehicle class on the highway stretch, or
    a shorter world (the old queue's 12 km question), not a rickshaw at 94.

## OPEN — reported, not yet reproduced

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
| Vanished under Prem Mandir's stairs | The treads were meshes with no colliders | `steps`, `stairs` |
| Nothing looks real — colour | One flat hex per building; palette data at median S 0.25 against measured 0.50–0.75; a pastel town | `BrajPalette.js`, measured on renders |
| Nothing looks real — the town | Oxide skirting, damp, roofs with tanks and monkey cages, the wires | photographs |
| Temples standing in fields | A circular keep-out, then a 0.8 m margin, then a 49 × 55 m plinth — three causes, one symptom | measured 3.3 m off the wall |
| Banke Bihari, Govind Dev, Jaipur Mandir, Prem Mandir, ISKCON details | From surveys; Govind Dev's onion dome was an interior vault drawn on the outside | photographs |
| Deploy to the web | Static site on Vercel, root `client`, no build step | booted off a bare `http.server`, 0 errors |
| Git + auto-deploy | Repo, `.gitignore` (98 MB → 12 MB), pushes deploy | — |
| Map accuracy | OSM positions within 0.2% of true great-circle distance | measured |
