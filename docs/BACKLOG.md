# Backlog

Every request logged as it arrived, with honest status. Read this at the start of a session.
Last reconciled: 2026-09-22.

**Status key** — `DONE` verified working · `PARTIAL` works but not finished · `NEXT` agreed next up
· `QUEUED` accepted, not started · `DEFERRED` decided against for now · `DECISION` needs your call

---

## Decisions already taken

| Decision | Detail |
|---|---|
| **Engine: Unity + C#** | IL2CPP compiles C# → C++ → native ARM, so "C++ for speed" is already satisfied. Unreal rejected on app size, low-end Android cost and team velocity |
| **Mobile first** | A real installable `.apk`. Not a claude.ai link, not Expo, not React Native. Web and desktop deferred |
| **World scale: true 1:1** | Real metres. Prem Mandir is a 2.5 km walk; parikrama is 10.17 km |
| **Geodata: OpenStreetMap** | ODbL licensed. Never proprietary Google Maps data — it would make the project undistributable |
| **Install size** | Under ~200 MB target. Currently **4.5 MB** |

---

## DONE — verified by automated test

| # | What | How it was proven |
|---|---|---|
| 1 | Real Vrindavan geography | 1,055 real OSM roads, 24 landmarks at true coordinates, named streets (Parikram Marg, Loi Bazar, Banki Bihari Bazar) |
| 2 | Parikrama route | **10.17 km** closed loop, 0.0 m gap, 17 stops — matches the real marg |
| 3 | Navigation | 24,585-node graph; every landmark reachable; worst route 2.2 ms |
| 4 | Offline-first | three.js and 29 font files vendored. **2.5 MB, zero network calls** |
| 5 | Live Vrindavan time and weather | Real IST clock drives lighting offline; Open-Meteo adds live temperature and cloud, cached, silent fallback |
| 6 | Resume where you left off | Position, heading, carried flower and picked flowers persist across close |
| 7 | Gesture flower picking | Two-bone arm IK: reach → grip → pull against resistance → snap, with escalating haptics |
| 8 | Temple accuracy from research | 23 temples researched with sources; corrected Radha Raman, Radha Damodar, Radha Shyamsundar to flat-roofed courtyard havelis; Govind Dev truncated; Shahji a marble colonnade. Shahji and Radha Vallabh added |
| 9 | Enterable buildings | **465** temples, homes and shops you can walk into, seamless both ways, named on entry |
| 10 | Interiors as shared templates | Three rooms — hut, house, shop — instanced, rather than 465 bespoke ones |
| 11 | D-pad controls | Was completely dead (applied before input was rebuilt). Verified at 390×844: visible, walks, strafes |
| 12 | Movement independent of camera | Camera swung 83° away; walked **1° off body, 81° off camera** |
| 13 | Left/right no longer mirrored | Camera-right vector was negated |
| 14 | WebGL context crash | Minimap canvas was **151 MB**, over every phone's limit. Capped to 16 MB |
| 15 | Hamburger and map unclickable | Location bar and touch-layer covering them. Added a hit test to the automated check |
| 16 | Location always visible | Persistent top bar: street name and district. Tap to shrink, Settings to hide |
| 17 | Map readable to navigate by | Every landmark, the Yamuna and the Parikrama Marg now labelled; zoom buttons; tap to identify a road |
| 18 | Avatar quality and jitter | Bob was fighting ground-snap on the same value. Rebuilt on tapered anatomy |
| 19 | Camera framing | Raised to 2.1 m, 6.8 m back, 18° down. Adjustable 2.5–12 m in Settings |
| 20 | Density — "alone in a desert" | Measured: 8% of street frontage built, 783 tris/building against a 120 budget. Windows rebuilt as panels (129 tris) → **18,404 buildings, and fps went 24 → 60** |
| 21 | Roads invisible | Quad winding produced downward-facing normals |
| 22 | Buildings blank from three sides | Windows only on the street face; now all four |
| 23 | Production codebase structure | `engine/` + `game/` + `content/`, 46 modules, maps 1:1 onto the Unity tree |
| 24 | Chhatikara crossing | Built at the world edge with highway, gantry, bus stand and welcome arch |

---

## JUST LANDED

| # | What | Detail |
|---|---|---|
| 42 | Map opens on the whole of Vrindavan | Opens fitted to the full 4.2 km so you can plan from it. The round button toggles whole-town / where-I-am; + and − zoom; drag pans; tap a temple for name, distance and "Walk here". Reached by the ◈ button beside the menu, or M on a keyboard |
| 41 | Greet devotees on the road | Walk up to anyone and "Pranam" appears. You fold your hands, **they stop, turn and fold theirs back**, and you get "Radhe Radhe / राधे राधे" |
| 40 | Pujari performing arti | A priest at every temple altar circling a five-flame lamp with a warm light that moves with it, and a bell now and then. Only the nearest three animate |
| 39 | E-rickshaw with real fares | Hail one, the driver asks "Kahan jaana hai?" and lists places **you have actually discovered** — each with the real routed distance, the real journey time, and a fare at genuine rates (₹10 base + ₹12/km, rounded to fives, as drivers quote). You ride the real road, seated. The wallet starts at ₹500 and **can never block you**: short of cash, the driver says "paise baad mein de dena" — authentic without becoming resource management |
| 35 | Aerial map, Vice City style | The map is now a **render of the actual city from above** — an orthographic camera draws the real roads, roofs, Yamuna and trees into a 2048² target at first open. You plan your route on the ground you will actually walk, with labels and the parikrama ring drawn over it |
| 36 | Pujari performing arti | A priest stands at every temple altar circling a five-flame lamp, with a bell now and then. Only the nearest three animate; the rest stand |
| 37 | Arrive at Chhatikara | You now start at the crossing on the highway, facing the town — the way everyone actually arrives in Vrindavan |
| 38 | Three shared interior templates | Hut, house and shop, instanced into 779 buildings rather than 779 bespoke rooms, and chunked so they cull |

## PARTIAL — works, not finished

| # | What | What is missing |
|---|---|---|
| 25 | Pokémon-style brightness and colour | Ground now vivid green, tan only on paths; saturated district palettes; coloured roofs; bigger greener trees with autumn variants; ACES tone mapping removed (it was desaturating everything); haze halved. **Still needs**: flowers and detail scattered on grass, stronger building silhouettes |
| 26 | Vehicles and traffic | 26 vehicles on the road graph. Sparse for a town this size, and they do not queue or yield convincingly |
| 27 | Temple geometry | Architecturally correct from research, but simple forms. Real fidelity needs authored art |
| 28 | Avatar realism | Tapered anatomy, proper face, shoes. Still a stylised primitive figure, not a rigged humanoid |

---

## NEXT

| # | What | Why now |
|---|---|---|
| 38 | **Voice start and stop** | Buttons and typed words work; speaking to the driver does not. Needs a microphone permission decision from you |
| 39 | **Narrated story audio** | "Listen" on each story card. Needs your call first: recorded voice, or speech synthesis? Synthesis in a WebView will mangle the Sanskrit names, which in this app is not a small thing — so I have not just picked one |

**37 — darshan timings — SETTLED 2026-09-27.** "4am-9pm darshan timings" —
your answer, so it is the rule rather than a placeholder. All sixteen temples
open at 04:00 Braj time and close at 21:00; the night veil goes across every
altar and the pujari stops his arti with it. Two named constants in
`Curtain.js` if it is ever wanted per temple.

**36 — traffic that queues and yields — DONE 2026-09-27.** Measured 78
overlapping vehicle pairs in 45 s of the town running; now 0, with the traffic
still moving. `traffic.mjs` 8/8.

**35 — named places with no shopfront — DONE 2026-09-27.** 113 of 118 now have
one; 32 were given a building of their own on the road they sit beside.

**29 — Deities and pujari inside temples — DONE 2026-09-27.** 16 pujaris for 16
temples, each performing arti at the altar, each stopping when the temple shuts
for the night. 3 sourced photographs on panels, 29 night veils across 18 altars.
`deities.mjs` 12/12.

**30 — Ordinary housing — DONE 2026-09-27.** **711** huts, single rooms and
shops you can walk into (602 before the named places got frontages of their
own), with the roof cut away on entry. `interior.mjs` 26/26.

---

## QUEUED

| # | What | Note |
|---|---|---|
| 31 | ~~Move the save off WebView localStorage~~ | **DONE 2026-09-27** — it was already built and simply had no test. Every write mirrors to Capacitor Preferences and `restoreFromNative` pulls it back at boot; now proved against a stub plugin, including wiping localStorage the way Android would |
| 32 | Per-limb control of hands and legs | Arm IK already exists and drives the pluck. Legs and spine need rigs, plus a control scheme that fits a phone |
| 33 | ~~Narrated story audio~~ | Moved up to NEXT as 39 |
| 34 | Optional account and cloud sync | The save document already matches the backend schema exactly |

---

## DEFERRED by decision

| What | Why |
|---|---|
| Web and desktop as deliverables | Mobile first; web stays the development surface |
| Expo / React Native for the 3D world | Cannot render this. Still a candidate for account and community screens around Unity |
| iOS TestFlight | Needs Xcode (~10 GB; 23 GB free) and $99/yr Apple Developer |
| Braj expansion — Mathura, Govardhan, Barsana, Gokul, 84 Kos | After Vrindavan is approved. Importer and content layer already parameterised for it |
| Photo-to-avatar | Designed, privacy commitment already shown in the avatar screen. Not in V1 |

---

## DECISION — needs your call

**1. Expand the world to 12 km to put Chhatikara at its true distance?**

| | Keep 4.2 km (current) | Grow to ~12 km |
|---|---|---|
| Chhatikara | represented at the world edge | at its real place, 6.3 km out |
| Area | 18 km² | 144 km² — 16× |
| Walk to Banke Bihari | n/a | ~70 minutes at 1:1 |
| Cost | none | a day of retuning; mostly empty highway |

*My recommendation: keep 4.2 km until vehicles exist, then revisit — arriving by bus makes a 6 km approach a pleasure rather than a chore.*

**2. When do we start the Unity port?** Visual fidelity is capped by procedural geometry. Unity with authored art is where "GTA Vice City quality" actually becomes reachable.

**3. Who reviews the story text?** This is the part most worth getting right, and it should not be signed off by an engineer.

---

## Added after the first phone test

| # | What | Status |
|---|---|---|
| 43 | **Talk to anyone** — Pokémon-style dialogue box with typewriter text, tap to advance. Lines written per archetype (sadhu, pilgrim, widow, shopkeeper, child, priest, porter, driver) and seeded per person, so the same sadhu always says the same thing | DONE |
| 44 | Vice City-style aerial map of the whole town | DONE |
| 45 | E-rickshaw with real fares, distances and times | DONE |
| 46 | Pujari performing arti at every temple | DONE |
| 47 | Start at Chhatikara Crossing | DONE |
| 48 | Greet devotees with pranam | DONE |

---

## How to reach things in the build

| Thing | How |
|---|---|
| **Map** | The **MAP** button, top-left beside ☰. Opens on the whole of Vrindavan. Round button toggles whole-town / where-I-am; + and − zoom; drag pans; tap a temple for name, distance and "Walk here" |
| Menu | ☰ top-left, or Esc / Tab |
| Move | D-pad bottom-left. Up/down walk, left/right strafe, centre toggles run. The floating stick also works anywhere on the left half |
| Look | Drag the right half of the screen |
| Talk | Walk up to anyone — "Talk" appears. Ends in a question with real options |
| Rickshaw | Walk up to one — "Talk to driver". Fares are real and vary by vehicle |
| Pick a flower | Walk to one, then **drag to reach and pull until the stem gives** |
| Location | Always shown at the top. Tap it to shrink; Settings can hide it |

**If something looks missing, you are probably on an older build.** The dev server at
`http://<mac-ip>:8080` is always current — pull to refresh. The APK in `dist/` only
updates when `./tools/build-apk.sh` is run.

| 49 | Tapping the radar shrank it instead of opening the map | **DONE** — tap now opens the full map, which is what it is for; a long press (550 ms) shrinks it, with a double haptic to confirm |
| 50 | Painted shop signboards | **DONE** — sixteen designs drawn once into a 1024px atlas (फूल माला, मिठाई भंडार, चाय, प्रसाद, पीतल भंडार, पूजा सामग्री, भोजनालय, चूड़ी, साइकिल मरम्मत…), so thousands of shopfronts cost one texture. The names are the ones actually painted on these streets |
| 51 | Denser crowd, recycled near you | **DONE** — 280 people and 55 vehicles at full quality; agents who drift out of sight respawn just inside it, so the street around you is populated rather than statistically populated across 18 km² |
| 52 | Chhatikara populated | **DONE** — parked rickshaws waiting for a fare, luggage on the platform, a chai stall, windows on the bus |
| 53 | Huts, single rooms, sheds | **DONE** — mud and tin-roofed huts in the outskirts, brick single-rooms with rebar standing for the next storey, corrugated sheds. Chosen by lot size and rank, so back lanes and small plots get modest housing |
| 54 | Shared tempo and cabs | **DONE** — five hireable vehicle types with real fares: tempo ₹10+₹7/km, e-rickshaw ₹10+₹12/km, auto ₹20+₹18/km, cycle rickshaw ₹10+₹15/km, cab ₹60+₹26/km. Spawned to a realistic mix; ride speed follows the vehicle |
| 55 | Bump reactions | **DONE** — walk into someone and they turn and object, escalating over repeats, then forget. No combat: it contradicts the brief's first principle |
| 56 | Pinch zoom dragged the player | **DONE** — a pinch with one finger on the left half was starting the walk joystick. A second finger now reclaims a just-started stick (under 320 ms, under 26 px of drift) and hands it to the pinch |
| 57 | Avatar drifted when walking straight | **DONE** — not the camera: with 196 people the new collision shoved the player every frame. Grazing contact under 15 mm ignored, push cut to 55% (18% for cows), and pedestrians now steer around you within 2.2 m. Walk direction is resolved from the camera once on press and then held |
| 58 | Left/right should move, not turn | **DONE** — all four arrows move the body. Left and right step sideways and the avatar turns to face its direction of travel; the camera is turned separately by dragging, exactly as GTA does it |
| 59 | Banke Bihari rebuilt from research | **DONE** — not a shikhara and not a gopuram, as the sources make clear, but a tiered arcaded Rajasthani structure: storeys of cusped arches stepping back, carved cornices, jharokha balconies, corner chhatris, a low three-dome crown, the torana and brass bell, and marigold garlands across the arch |
| 60 | "too movy, moves slightly here and there" | **DONE** — root cause: the walk heading was re-read from the camera **every frame**, so any camera drift continuously bent the path; holding forward traced a curve. The heading is now resolved once on press and held until you release. Swinging the camera 90° mid-walk no longer changes where you are going. The automated check was rewritten to measure exactly this |
| 61 | World ran in slow motion on slow devices | **DONE** — the loop clamped `dt` at 50 ms to stop physics tunnelling, which silently discarded the rest of a long frame: below 20 fps the whole world crawled, which reads as unresponsive controls rather than as a low frame rate. Measured it — 3.0 s of wall clock produced only 0.67 s of simulated time. Replaced with fixed sub-stepping: a long frame is walked in 1/30 s steps, so a struggling phone loses smoothness but never pace. Diagnosed by instrumenting simulated time against the wall clock |
| 62 | Everything olive-tinted underneath | **DONE** — the hemisphere light's ground colour had been set to grass green while making the terrain greener. That colour is bounce light from below, so every soffit, dome underside and eave in Vrindavan went olive. Warmed to dusty ground across all four times of day |
| 63 | Temple cornices read as painted stripes | **DONE** — replaced the single heavy band with a proud course over a recessed one, so it catches light as carving rather than banding the elevation |
| 64 | Arches were invisible from any distance | **DONE** — `cuspedArch` drew only the curved moulding ribbon with nothing inside it, so the motif vanished beyond a few metres and every temple, ghat, gateway and haveli read as a plain banded mass. Each arch now fills its aperture with a shadowed panel, so what the eye reads as an arch — the dark opening — is actually there. Affects every landmark in the world |
| 65 | Street and temple lamps never lit | **DONE** — the lamp bulbs were geometry that stayed dark. They are now their own mesh with an emissive material that rises at dusk and further at night, and the temple point-lights brighten with them. Nothing says evening in a town like this as clearly as the lamps coming on |
| 66 | Save could be evicted by Android | **DONE** — WebView localStorage can be cleared under storage pressure, which would silently lose somebody's whole journey. Writes now mirror to Capacitor Preferences (SharedPreferences on Android, UserDefaults on iOS), and boot restores from it whenever the native copy is newer. localStorage stays the fast path and the browser fallback |
| 67 | Traffic drove through everything | **DONE** — vehicles now look ~9 m down their own heading and check what is in the way: other vehicles, cows, people crossing, and you. Under 6.5 m they ease to a third speed, under 3.2 m they stop, and a held-up driver sounds the horn every few seconds. Cows asleep in the road genuinely hold up a queue now |
| 68 | Narrated story audio | **DONE** — a "Listen" button on every story card, using the browser's own speech synthesis: free, on-device, works offline on most phones. Prefers an Indian English voice where the device has one, slows the pace a little, and ducks the ambient beds while it reads. This matters more than it sounds — a lot of the people this is for would rather be told than read |

## Rickshaw rides — 2026-09-22

Reported: "how to take e-rickshaw ride i am in front of it", "it takes me to
wrong direction i wanna go to iskcon", "should properly show me sitting in
e-rickshaw while riding not like teleporter", "keywords like stop and start
should be there", "should feel real".

Five separate defects sat between you and a ride. All fixed, all covered by
`tools/checks/rickshaw.mjs` (16 assertions).

1. **The prompt was suppressed by passers-by.** `nearestSpeakable()` returned
   the nearest speakable of any kind, people and vehicles competing for one
   slot, and `RickshawSystem` discarded the result unless it was a driver. One
   pilgrim standing closer than the rickshaw meant no ride, on streets carrying
   196 people. It takes a `want` filter now and the hail asks for `'driver'`.
2. **No destinations at the start.** Offers were filtered to discovered
   locations, and you spawn at Chhatikara having discovered nothing — 5.1 km
   from ISKCON. The one thing an arriving pilgrim does at that chauraha was
   refused. `ALWAYS_KNOWN` now covers the six places every driver here knows.
3. **The quoted time was wrong by 2.3x.** The fare quote divided by
   `RIDE_SPEED` (7.5 m/s) while the ride drove at `vehicle.speed` (3.2 m/s for
   a cycle rickshaw). Both use the vehicle's real speed now.
4. **The ride never arrived.** 5.6 km at 3.2 m/s is 29 real minutes. Measured:
   started 5,373 m from ISKCON, ended 3,461 m away. Ride pace is now bounded to
   `RIDE_TARGET_S` (55 s) and never below the vehicle's own speed, so a short
   hop still moves like a rickshaw. Fares and quoted durations stay honest
   about the real journey. Measured after: ends 4 m from ISKCON.
5. **You were a teleporting passenger.** The player slid along the route at
   seat height while the rickshaw stayed parked where it was hailed. The
   vehicle is `chartered` now — `CrowdSystem` stops steering it, `RickshawSystem`
   drives it along the route, and the passenger is seated on it every frame.
   Measured gap between passenger and vehicle: never over 0.57 m.

Added with it: a riding HUD with destination, a progress bar and distance
remaining, a **STOP** button and the **S** key. Saying stop pulls the driver
over where you are, releases the vehicle back into traffic, steps you out onto
the roadside and gives you control back.

### Boarding, start and stop — done

Reported: "user should be able to enter it and if user said start and if user
said stop then it should stop rickshaw as well", "should feel real".

The ride is five beats now instead of one jump. State machine:
`idle -> boarding -> offered -> waiting -> riding -> idle`.

- **Get in.** The prompt reads "Get in E-rickshaw". Pressing it charters the
  vehicle so the driver holds still, then eases you from where you stood onto
  the seat over BOARD_S (1.15 s). Measured: you walk 3.43 m to the vehicle and
  end 0.57 m from its centre. Previously you appeared in it.
- **He asks where to**, once you are actually aboard, not before.
- **He waits.** Agreeing a fare no longer starts him. Measured: 0.00 m of drift
  over two seconds of holding. The HUD shows the fare, distance and duration
  with a START button.
- **Start.** The START button or the G key. Measured: rolls 295 m.
- **Stop.** The STOP button or the S key, mid-route or while still waiting —
  getting out before he moves is a real thing to want. He pulls over, the
  vehicle goes back into traffic, you step out onto the roadside and get
  control back.

Covered by `tools/checks/rickshaw.mjs`, 23 assertions, all passing.

Two defects found while writing those tests, both mine, both fixed:
- `this.board` was both the method and the boarding-state field, so the field
  shadowed the method and hailing threw. Field renamed `_boarding`.
- The test clicked `[data-go]`, which also matches the main menu Map button
  sitting earlier in the document. Scoped to `.rk-row[data-go]`.

### Still open from this thread
- Spoken keywords ("stop", "start") are buttons and keys, not voice. If you
  meant saying the words out loud, that is speech *recognition* — separate from
  the Web Speech synthesis already used for narration, and a separate ask.
- The driver has no dialogue during the ride. He says nothing between "chaliye"
  and arriving.

## Session of 2026-09-22, later — five bugs you hit in a row

### State was never saved — the big one
"and state is not yet saved?", "i am back to chhatikara?"

`migrate()` in StateSchema did `Object.keys(base)` on a base of `null`, which
throws. `typeof null` is 'object', so a null default fell past the primitive
check into the object branch. Three fields default to null — `lastPosition`,
`carrying`, `destination` — so the FIRST time you actually had a position worth
restoring, the whole document threw on load, SaveSystem caught it as "corrupt
document discarded", and you woke at Chhatikara with everything gone. Saving was
always fine; reading it back was not. One line: a null default takes the saved
value as-is. Covered by `tools/checks/save.mjs`, 9 assertions, real page reload.

### Walked distance inflated on every reload
Found while writing that test. The document held 4,567 m; after reload it read
6,085. Restoring your position emitted `player:moved` with the jump from the
spawn, and the journey counter added it — every single time you came back. A
step is now bounded by `TELEPORT_M`; anything larger is a placement, not a walk.

### The story card could not be closed, and looked black
"unable to remove the shri krishna balaram mandir description", "it shows black
entirely"

Two faults stacked. `#card` had no z-index while `#touch-layer` is full-screen
with z-index 1 and sits later in the document, so the card painted underneath it
and Close could not be pressed at all. And `#card.show` animated from
`translateY(100%)` with no fill mode: wherever that animation does not advance,
the card sat one full card-height low — heading visible, all three buttons below
the bottom of the screen. Measured at top 808 in an 844 px viewport. It fades in
now and its position is plain layout. New check `tools/checks/overlays.mjs` opens
every floating panel and asks the browser what is actually on top of each button;
7/7 reachable. This class of bug has now bitten three times.

### Endless "apna rasta dekhiye" / "side ho jao"
Bump remarks fired on any contact with a 2.6 s cooldown and forgave each person
after six seconds. Standing still in a lane with 196 people flowing past, that is
a scolding every couple of seconds forever. Now: you must be moving, nine seconds
between remarks, at most three in a stretch before people stop minding, and one
person stays quiet for forty-five seconds.

### The map tap readout hid under the search bar
`#map-tap` sat at top 78 px; the search bar occupies 58–100 px. Moved to 112 px,
and back up when the bar is collapsed.

### Ride was 367 km/h
My own regression. Capping every ride at 55 s meant Chhatikara to ISKCON ran at
102 m/s, which is why it looked like it went through buildings and people — it
crossed three metres per frame. Capped at `RIDE_MAX_SPEED` 12 m/s (~43 km/h).
Long rides are long now; STOP is always there.

### Ride camera was stuck side-on
The camera kept whatever heading it had when you hailed, and `setEnabled(false)`
disabled looking along with walking. It now aims down the road at the start, and
input stays on during the ride — RickshawSystem updates after the player and pins
you to the seat every frame, so you cannot walk off but you can look around.

### Still open
- Temple interiors show black, and the rickshaw sets you down inside the
  building rather than at the gate. Being built now against the user's own
  photograph of the Krishna Balaram Mandir courtyard.
- Voice keywords for start/stop (speech recognition, not synthesis).
- The driver says nothing during a ride.

---

## Gatherings — 2026-09-22

Reported: "have random places showing group of people performing yajnas etc."
and, separately, "it does not give me vrindavan feeling".

The two are the same note. Every person in the town was walking somewhere —
196 pedestrians, 39 vehicles, 24 cows, all in transit — and nobody had stopped.
A town of commuters. What Vrindavan is is people who have sat down.

**DONE.** `client/src/game/devotion/GatheringSystem.js`, covered by
`tools/checks/gatherings.mjs` (27 assertions).

**17 gatherings, 214 people**, placed once and never moving:

- **6 yajnas** — eight to eleven seated in a closed ring round a brick havan
  kund, everybody facing the fire, one of them sitting in a little closer with
  a hand out over it and a fistful of samagri. The flame flickers on two
  incommensurable rates so it never repeats on a beat you could tap along to,
  smoke rises and turns above it (dropped on the low tier, where transparency
  is the first thing to give up), and a warm point light rides behind the same
  `quality.templeLights` flag as the arti lamps.
- **4 kirtans** — a mridanga player at the front, two pairs of kartals beside
  him, singers seated on the durrie and a few more standing behind, everyone
  swaying on their own phase offset. The drum and the cymbals are new
  synthesised one-shots in `AudioEngine` on a real eight-beat cycle, positional,
  and only ever the nearest one: two kirtans overlapping sounds like a fault.
- **7 kathas** — a speaker up on a vyasasana under a canopy with the book in
  front of him, the audience in three rows fanned out on the ground. Silent:
  there is no voice in the synth and an oscillator pretending to read
  Bhagavatam would be worse than the quiet.

**Everyone in them is the crowd.** The twelve archetypes and everything above
the waist — the pallu and its border, the tulsi beads, the sacred thread, the
two clay lines of the urdhva-pundra — moved out of `CrowdSystem` into
`game/npc/Archetypes.js`, which now emits the same person standing or
cross-legged. The standing geometry is unchanged: the same 168-triangle set, all
twelve, compared vertex by vertex before and after the move.

**What it costs.** One `InstancedMesh` per pose and archetype that actually
turns up (31 of them), sized off the real rosters rather than guessed, rewritten
around the player every frame the way the crowd is. Standing in a gathering:
**+7 draw calls, +3.5k triangles**. With the nearest 1.2 km away: **nothing** —
0 instances written, 0 meshes handed to the renderer.

**Where they are.** Seeded from `rngAt('gatherings')`, so the town rebuilds
identically every launch and the pre-rendered aerial map cannot disagree with
it (asserted by reloading the page and comparing every person's position). A
site is rejected in the Yamuna, on the bank, inside a building or prop, standing
in any lane, within a ring's radius of anything a rickshaw drives down —
`Crowd._vehicleAhead` cannot see a gathering, so anyone sitting on a street gets
driven through every few seconds — on ground that varies by more than 0.85 m
across the ring, and within 210 m of another gathering.

**They are solid.** Every seated person pushes a static circle into the world
grid, so `Player` walks round them with no change to `Player` at all. You can
stand among them: at 1.98 m you are not nudged by a millimetre.

No points, no counter, no "attend three kirtans". The response to finding one is
the sound, the light, and the world naming it once.

**The camera goes over their heads.** A world collider is a circle on the
ground with no height, and `collideRay` — which is only ever the camera arm —
treated every one of them as a wall to the sky. That had never mattered: every
circle in this world was a lamp post or a trunk. Two hundred people sitting
down are the first waist-high ones, and the first pass of this had walking up
to a havan collapse the third-person camera from **6.55 m to 0.00 m** — you
ended up looking out of the inside of your own head, at the yajna and at the
katha both. Colliders may now declare a height (`h`); one without it is still
infinitely tall, so nothing else in the world changed. Guarded by two new
assertions in `tools/checks/gatherings.mjs`.

### Still open
- A gathering is scenery. You cannot sit down in one, and nobody in it can be
  greeted — `InteractionSystem` and `Crowd.nearestSpeakable` only scan the
  walking crowd's own slots.
- Gatherings do not change with the time of day. A havan at two in the morning
  is burning exactly as it is at noon.
- **A fifth gathering in range pops rather than fades, and it is reachable.**
  `ACTIVE_MAX = 4` was justified on "at most 4 were ever in range in testing";
  sweeping the whole rectangle at 20 m says otherwise — **5 in range on the low
  tier, 6 on mid, 7 on high**, the worst spot being around (-1500, 480) in the
  old town. The selector always drops the *farthest*, so what vanishes is
  580–610 m away and a few pixels across, which is why it was never seen. It is
  still a pop, not a fade.
- Walking crowd agents steer on the nav graph and never ask `world.collide`, so
  a pedestrian strolls straight through the middle of a kirtan. Only the player
  and the camera are stopped.
- `GatheringSystem.dispose()` removes the group from the scene and frees the
  geometry and materials, but the 227 colliders it pushed into
  `world.colliders` stay: after disposing it you are still shoved 1.42 m out of
  a person who is no longer drawn. Harmless today — `GameApp.dispose()` drops
  the world immediately afterwards — but `WorldService` has no
  `removeColliders`, and `SpatialGrid` has no `remove`, so there is nothing to
  call.

## "Works on laptop but not on phone" — 2026-09-22

Reported: "app ain't opening", "it just keeps loading vrindavan and does not
open", "it works in laptop but not in phone".

Not a crash and not a bad file. The world outgrew the device inside a single
synchronous block. Measured with Chrome DevTools CPU throttling at 6x, which
approximates a mid-range Android:

  before:  42.0 s to boot, with one 22.9 s block and one 13.9 s block
  after:   ~23 s median of three runs, no block over ~11 s, and it yields

During a synchronous block the browser cannot paint or accept a touch. The
loading screen sits frozen on whatever it last said, and a mobile browser may
decide the tab has hung and kill it. A laptop simply has the headroom to grind
through, which is exactly the shape of "works on laptop, not on phone".

What the world had become in one day:

  area        17.6 -> 38.7 km2      roads       1,055 -> 2,146
  grass      13,695 -> 35,819       nav nodes  24,585 -> 54,782
  triangles    ~4.5M -> 5.58M       boot          1.9 -> 4.1 s (desktop)

Fixes:
- `CELL` 8 -> 12 m in the height field. At 4.2 km square that was 551x551
  samples; at 9.2 x 4.8 km it had become 690,000. Braj is flat alluvium and
  12 m carries the relief that is actually there.
- Ground mesh `RES_X` 640 -> 420. 640 segments across 4.2 km was ~6 m of
  detail; across 9.2 km it was ~14 m, so the count had risen while the detail
  fell. 420 keeps the metres-per-segment and less than half the triangles.
- Grass thins with distance from town, and trees thin past 2.6 km. The corridor
  to Chhatikara is farmland you pass through, and it was being decorated at full
  town density. 35,819 -> 16,756 tufts.
- `buildTerrain` and `buildProps` are async and yield between passes. Same work,
  same result, but the device can breathe and the progress bar actually moves.

Net: 5.58M -> 4.54M triangles, 60 fps, `failed []`.

Also added while chasing this:
- `?reset` in the address clears the saved document before anything reads it —
  the only recovery available on a device with no console.
- A boot failure now prints its real message and stack in a bar at the bottom of
  the screen instead of leaving a silent black screen.

## Requested, not yet built — 2026-09-22

1. **Keep travelling while the map is open.** "no need to stop travel if in
   e-rickshaw on opening map so we can see map live kinda". The ride should
   continue with the map up, so you watch yourself move along the route.
2. **Talk to the driver mid-ride.** "add something text to e-rickshaw driver
   like if i say fast it should go fast". Wants words, not only buttons —
   at least fast/slow alongside the existing start/stop.
3. **Show every temple and famous place.** "so one can really see everything
   like 4 dham place that comes in the bhakti vedanta marg itself". 133 POIs are
   imported and searchable but only the 26 curated landmarks are built as
   architecture. The places along Bhaktivedanta Swami Marg specifically need to
   be visible as buildings, not just labels.
4. **Cheat codes, GTA style.** "as in gta vice city when we type panzer it
   throws it, so if we type rickshaw, rath it should land that vehicle here".
   Type a word, the vehicle appears beside you, you get in and drive off.

## Audit of this session — every request, and where it stands

Checked one by one against what you actually said, not against memory.

### Done and covered by a check
| you said | state | guarded by |
|---|---|---|
| "chhatikara stand to iskcon is a direct road" | 1.06x via Bhaktivedanta Swami Marg | route ratios |
| "asia rajmarg 1" | NH 44 / AH 1 imported, routed, labelled | import report |
| "search bar hides the names of roads, temples" | chrome reserved; `#map-tap` moved clear | overlays.mjs |
| "let search bar minimize also" | collapses to its glyph | — |
| "so many colors in map... dark some places" | base + aerial match the world rectangle, flat-lit | runtime.mjs |
| "still left control moves person to right" | rig basis is the single source | dpad-dir.mjs |
| "keeps showing chats after leaving a person" | closes past 7.5 m | — |
| "pedestrian cross way texts side ho jao" endlessly | must be moving, 9 s apart, 3 per stretch | — |
| "on clicking a road/temple show popup with name" | tap-to-name; readout is transient | runtime.mjs |
| "females in sarees with tilak, males dhoti kurta" | 12 archetypes, tilak on every face | — |
| "groups performing yajnas etc." | 17 gatherings, 214 people | runtime.mjs |
| "it does not store the state" / "back to chhatikara" | `migrate()` null bug | save.mjs 9/9 |
| "how to take e-rickshaw ride i am in front of it" | hail no longer blocked by passers-by | rickshaw.mjs |
| "wrong direction, i wanna go to iskcon" | ends 4 m from ISKCON | rickshaw.mjs |
| "sitting in e-rickshaw not like teleporter" | vehicle carries you, gap < 0.6 m | rickshaw.mjs |
| "keywords like stop and start" | board -> wait -> START -> STOP | rickshaw.mjs |
| "view should be straight, i can only see side" | camera aims down the road; look stays on | — |
| "goes through people, buildings" | speed cap; it was doing 367 km/h | — |
| "unable to remove the description" / "black entirely" | z-index + position no longer from animation | overlays.mjs 7/7 |
| "app ain't opening" / "works in laptop not phone" | 42 s -> ~23 s on a phone-class CPU, yields | _stages |
| "no need to stop travel on opening map" | sim no longer pauses mid-ride | cheats.mjs |
| "text to driver, if i say fast it should go fast" | JALDI / slow buttons and typed words | cheats.mjs |
| "hack texts like gta vice city, rickshaw, rath" | typed words spawn vehicles | cheats.mjs |
| "run inside the rickshaw should fasten its speed" | RUN = URGE_PACE while a passenger | — |
| "maximum of 5mins in e-rickshaw anywhere" | `RIDE_MAX_S` 300; longest route 5.0 min | measured |

### Open, and honestly not done
1. **Temple interiors are black, and the rickshaw drops you inside the building**
   rather than at the gate. Being built now from your photograph of the Krishna
   Balaram Mandir courtyard. Not verified, not claimed.
2. **"show all temples and famous places... 4 dham that comes in the
   bhaktivedanta marg itself"** — 133 POIs are imported, searchable and
   tappable, but only the 26 curated landmarks exist as architecture. The places
   along Bhaktivedanta Swami Marg need to be buildings, not labels. NOT STARTED.
3. **"still it does not feel like real vrindavan roads, shops"** — ~~35~~
   **113 of 118** shopfronts carry their real OSM name as of 2026-09-27, 32 of
   them on buildings planted for the purpose. The other lanes are still
   generic. Partial, but much less so.
4. **"lot of glitches here"** — no screen, no repro. Cannot act.
5. **Voice** start/stop, as opposed to buttons and typed words.
6. **The driver says nothing** during a ride beyond the toasts.
7. **The D-pad covers the virtual stick** on a phone. A decision for you, not a bug.

### Still waiting on you
- Which OSM way is **Jagadguru Kripalu Marg**?
- Is **Chhatikara Crossing** the bus stand, or is the stand further out on NH 44?
- **Ten road names** you can read off a map. OSM names 41 of 2,146 ways here.

## Vehicles driving through buildings — measured, improved, not solved

Reported: "e-rickshaw or any vehicle strikes buildings not following proper
path", "currently it goes through people, buildings which is unreal".

Measured properly rather than guessed at, by sampling the route every 2 m and
asking `world.isClear` — the same query that stops the player:

                                   planned route      after fixes (driven)
  Chhatikara -> ISKCON                  4.2%                 1.7%
  Banke Bihari -> Keshi Ghat            2.4%                  --
  ISKCON -> Prem Mandir                26.4%                10.4%

Two causes, both fixed:
1. `NavGraph.path()` replaced the first and last node with the raw endpoint
   unconditionally. A landmark's position is the MIDDLE of the building, so
   every route began and ended by cutting through the temple. It now only takes
   the raw endpoint when the hop to the road is actually clear, and nudges any
   waypoint sitting inside something out to clear ground.
2. `RickshawSystem._drive` assigned the position straight from the route and
   nothing else. The player has always been pushed out of colliders by
   `world.collide`; the vehicle carrying the player now is too.

STILL NOT SOLVED. 10.4% on the short ISKCON to Prem Mandir hop. The collision
pass pushes the vehicle out, but the next frame puts it back on the blocked
line, because the car is positioned FROM the path every frame rather than
steering along it. Fixing that properly means giving the vehicle real steering —
a heading it turns toward, momentum, and the collision result carried forward —
instead of sampling a polyline. That is the right fix and it is not done.

## Krishna Balaram Mandir — requested this session

| # | Your words | Status | What was done |
|---|---|---|---|
| A | "when i step in of temple it should show entire temple view as real iskcon vrindavan mandir is take instead of complete blackout" | **DONE** | Root cause found and fixed: `InteriorSystem._apply` multiplied the live lighting every frame against TimeOfDay's damp, compounding about x3 a frame — fog density reached 3e5 in five seconds and every fragment in the world rendered as the fog colour, and it kept climbing for ~158 s after you left. The interior is now a scale on TimeOfDay's target. Inside the court the sun holds at **89%** of its outdoor value; a closed sanctum sits at 57%. Guarded by `tools/checks/interior.mjs` |
| B | "design temple exactly as it is now, see online sources and attached image" | **DONE** | Built as the chatuhshala it is: a 32 x 24.5 m block round a 15 m open court (both measured — OSM way 334202009 and the shade net on ESRI imagery), black and white marble on the diagonal with concentric bands at the centre, a verandah on all four sides on cream pillars and serpentine cusped arches with pale blue-green recesses, salmon cornice, pale green jali gallery, framed murals between the piers, the tamal on its circular marble kerb, the broad black-and-white flight up to three altars, and the three ribbed domes over them |
| C | "e-rickshaw should drop at temple gate not inside" | **DONE** | The ride ended at `loc.pos`, the middle of the building. It now ends at the road node nearest the landmark: **51 m out, on a road, outside the compound wall** |

Also corrected while in there: ISKCON's deities were Radha and Krishna because
`buildDeities` matched "krishna" in the id — the temple named for two brothers
had no Balaram in it. It now carries the three researched altars.

### Known and deliberate, in that build
- **The altar hall is railed off at the foot of its steps.** Nothing in this
  engine climbs — WorldService pins the player to terrain height — so a hall
  0.78 m up is a hall you wade through. Darshan is taken from the court, which
  is where the photographs show everybody taking it. A proper fix is step
  climbing in the player controller, not a lower temple.
- **The green shade net over the court is not modelled.** It is really there in
  recent photographs, and it would hide the three domes, which you asked for.
- **The marble floor sits 60 mm above `ground`.** The terrain under the block
  runs ±76 mm around the single height sample the builder gets, so a slab laid
  flat at `ground` has grass through the middle of the courtyard.

## Requested, not built
- ~~**"let there be a chat to driver like i'll drive"**~~ — **DONE.** Take the
  controls, full speed control, drive where you like. `driving.mjs` 8/8:
  you can take the wheel, forward drives forward, steering turns the right way,
  it does not go through solids, jaldi stacks, and you can hand it back.
- **Long wall colliders leak at their ends everywhere except ISKCON.** The
  SpatialGrid indexes a collider at one point with a 24 m cell, so any wall
  longer than about 20 m is not found from beyond a cell along its length.
  Krishna Balaram now authors its walls in segments; `hollowColliders`, which
  every other enterable temple uses, still does not.

---

## Weather API — cost, cadence and licence — 2026-09-22

> "in what interval is weather api called" / "it could be called every 1min if
> it's costly" / "if it's free we can have it every second" / "how free is it?"
> / "make sure it's lifetime free?" / "how can we achieve best of it for free"

**DONE — guarded by `tools/checks/weather.mjs`, 12/12.**

### How free Open-Meteo actually is
Checked against their pricing page, terms and the live endpoint, not memory.

| | |
|---|---|
| Key / account / card | **None.** A raw request returns 200 with data |
| Caps | 600/min, 5,000/hour, **10,000/day**, 300,000/month, **per IP** |
| Weighting | **None.** A plain call count — variables and fields cost nothing extra |
| Licence | **CC BY 4.0 — attribution required.** We were not showing it |
| Commercial use | **Not permitted on the free tier.** Paid plans start at 1M calls/month |
| Uptime | **No guarantee** on free. Paid plans target 99.9% |
| Lifetime free | **Nobody can promise that.** See the mitigations below |

### Why not every second
`current` is published on a **15-minute grid** — the response says so itself
(`current.interval: 900`). The models behind it refresh hourly to 6-hourly.

| Interval | Calls/day | Against the 10,000/day cap |
|---|---|---|
| 30 min (was) | 48 | 0.5% |
| 1 min | 1,440 | 14%, for the same 96 readings |
| 1 second | 86,400 | **8.6x over — IP cut off after ~2h 47m** |
| **grid-following (now)** | **~96, ~192 worst case** | **~1.9%** |

Every second would also have burned the quota for every other user of the app on
the same carrier: mobile networks put large numbers of phones behind one CGNAT
address, and the 10,000 is shared across all of them.

### What it does now
Rather than a blind timer, it reads the schedule out of the response and waits
for it. `current.time` is the moment a reading is valid for and `current.interval`
is the step, so after each success it sleeps until just past the next step. If
the stamp has not moved, the reading is not published yet and it retries in a
minute until it is. Measured: **~1.9% of the free daily allowance, 58 KB/day**,
and what is on screen is never more than about a minute behind publication —
strictly fresher *and* 15x cheaper than polling every minute.

In `client/src/game/world/LiveConditions.js`:
- `_scheduleFrom()` computes the next due time from `current.time` + `interval`
  + 20 s publication slack, correcting for `utc_offset_seconds`. Clamped to
  [now+60 s, now+15 min] so a wrong device clock cannot stall or spam it.
- `CACHE_TTL_MS` split into `RETRY_MS` (60 s floor, never two calls inside a
  minute) and `CACHE_MAX_AGE_MS` (4 h). One constant used to do both jobs, so
  shortening the interval would silently have thrown away the offline reading.
- **No polling while the app is backgrounded**, forced refresh on resume — which
  is the one moment a stale reading is visible.
- One request in flight at a time; `weather:changed` and the console line only
  fire when the temperature, cloud or code actually moved.
- Tick gate 20 s -> 5 s so a due time is honoured promptly.

### Making it survive Open-Meteo, whoever owns it
No third party can be guaranteed forever, so the app does not depend on one:
- Weather was already an enhancement — never awaited at boot, silent fallback to
  a clear day. The check proves an offline refresh neither throws nor drops the
  held reading, and that no weather at all still renders a clear day.
- A stored reading is shown for up to 4 hours, so an offline boot has real
  weather.
- **The real escape hatch:** the Open-Meteo server is AGPLv3 open source with an
  official Docker image and Ubuntu package. If the hosted service ever goes away
  or goes paid, it can be self-hosted, with no third-party terms at all.
- **The one thing that would end the free tier for us: charging for the app.**
  The free tier is non-commercial. A paid APK or ads means a paid plan.

### Licence compliance — was missing, now fixed
CC BY 4.0 and OSM's ODbL both require the credit to be *shown*, not sat in a
source file. `credits()` in `content/deities.js` was exported and never rendered
anywhere. Added a **Sources** group to the settings screen crediting Open-Meteo
(CC BY 4.0) and OpenStreetMap (ODbL 1.0), and noting the Dham runs offline.

## 2026-09-26 — vehicles vs pedestrians

**"e rickshaw should go like without touching the devotees on road as currently
it always strikes everyone make it prper like vechicles drive in centres of
roads without pedestrians on both sides walking either sides"**

Three things in one, and the third is the fix for the first two:

1. The e-rickshaw hits people constantly.
2. Vehicles must keep to the CENTRE of the carriageway.
3. Pedestrians must walk along the SIDES — both verges — and not on the
   carriageway.

Right now the crowd and the vehicles are both using the road, so they share the
same strip of ground and collide by construction. Status: **DONE** - people hold a verge for life; clearance 10.8 -> 16.4 m. verges.mjs 4/4.

**"allow input of users to write jaldi and that should keep increasing the
speed instead of the jaldi chip that should show limit after ertiain number of
clicks"** — typing `jaldi` should keep stacking the speed up to the hard
ceiling; the JALDI chip in the ride bar should say so once the limit is reached
rather than silently doing nothing. Status: **DONE** - chip reads JALDI MAX, typed jaldi says "Aur tez nahin ho sakta".

**"it's been 1 min but not yet reached iskcon temple as it showed erlier"** —
the ride overruns its estimate. Probably the same root cause as the collisions:
the rickshaw is stopping for people standing in the carriageway. To be measured
after the verge fix, not assumed. Status: **OPEN** - the ride does arrive (rickshaw.mjs: 5,373 m away to 54 m), but the HUD minute estimate does not match what happens. The ETA arithmetic is the bug, not the ride.

**"make it very good and do thorough research on all temples as said earlier and
place properly as done for iskcon temple"** — every temple built to the Krishna
Balaram standard: researched plan and elevation with sources, a real interior
you walk into, correct Deities on correct altars, compound wall and gates where
there are any. 23 temples are researched in
`docs/research/temple-architecture.json`; 15 stand as architecture and only
Krishna Balaram is built to that standard. Status: **13 of 16 DONE** - Banke Bihari, Radha Raman, Govind Dev, Madan Mohan, Rangaji, Jugal Kishore, Radha Vallabh, Radha Gopinath, Prem Mandir, Katyayani, Gopishwar, Krishna Balaram, Chaar Dham. Left: Radha Damodar, Radha Shyamsundar, Chandrodaya.

**"chaar dham place also you didn't yet do told long back"** — the Char Dham on
Bhaktivedanta Swami Marg, first asked for as "4 dham place that comes in the
bhakti vedanta marg itself". Checked: it is NOT in the OSM extract at all — a
search of all 162 POIs for dham/char/chhota returns only "Shri Ji Dham ashram".
So it cannot be placed from the imported data and needs researching and adding
by hand. Status: RESEARCHING.

**"this has to be a very krishna concious app/game so make it so each and every
item say homes for now has different unique krishna's lila pics showing"** —
every building carries its own distinct Krishna lila scene, so the town is
Krishna conscious rather than merely set in Vrindavan. Status: **DONE** - 16 lilas, one per building from its own seed, +244 draws for about 3,700 murals.

Licensing note, decided before any of it is built: modern devotional paintings
of the lilas are copyrighted and cannot be shipped. Two lawful routes, and the
second is better:
  1. Paint the scenes ourselves into an atlas, as `Signage.js` already does for
     the shopboards — stylised, ours, no licence question, cheap.
  2. **Pahari, Kangra, Basohli and Mewar miniatures of the lilas.** These are
     18th and 19th century, long out of copyright, and many are on Wikimedia
     Commons as PD-old with museum provenance. They are also far more beautiful
     than anything procedural, and they are what Braj actually looks like on a
     painted wall.
The rule that governs the Deity photographs governs these too: nothing ships
without a licence recorded beside it in the manifest.

**"for case when user is driving then it should drive based on not only
controls but also phone behavior like tilting it left right etc."** — tilt
steering while you are at the wheel: lean the phone left or right and the
vehicle goes that way, alongside the on-screen controls rather than instead of
them. Status: **DONE** - gravity-vector tilt, at the wheel only, behind settings.tiltSteer. UNVERIFIED on a real phone: it cannot be tested headless.

Notes settled before building: neutral is wherever you are HOLDING the phone,
not flat, so it calibrates on entry rather than assuming zero. iOS 13+ needs
`DeviceOrientationEvent.requestPermission()` from a real tap. It must be a
setting, and the stick must always win when both are being used.

**"always keep the default view towards the vechilce moving later user can
modify if he wants"** — on taking the wheel, and on a ride pulling away, the
camera starts looking along the vehicle's direction of travel. Once. After that
it is yours to swing wherever you like and nothing drags it back. Status:
STARTED.

**"the entry exit gates are not visible from outside the teemple as i just
entered inside through walls itself"** — you walked through a temple wall
instead of finding its gate. This is the ISKCON fault again, which I said would
not be repeated, so the fix is not to patch one temple: a check that walks into
EVERY temple from all round and proves the only way in is a doorway. Status:
STARTED.

**"and text still keep showing even after moving away from people also"** — the
pedestrian chatter does not clear when you walk off. It was supposed to close
past 7.5 m and evidently does not, or something else is putting the text up and
not taking it down. Status: **DONE** - spoken lines moved off the toast rail onto the speaker head, and go when they do. chatter.mjs 6/6.

**"also put all deities images do find out online sources ? still only radha
shyamsundar is showing in iskcon although location is perfect now."** — the
placement fix is confirmed working. Now fill the empty altars: Gaura-Nitai and
Krishna-Balaram at ISKCON, and a photograph for every other temple that has
one. Searching Wikimedia Commons and other freely-licensed sources. The rule
does not change — a licence and a photographer recorded beside every file, or
it does not ship. Status: SEARCHING.

**"there is a way to outer hall from main darshan of iskcon to outer hall where
there is water filling tank and different shops"** — a passage from the darshan
courtyard out to an outer hall with the drinking-water station and the shop row.
Real and currently missing: the Krishna Balaram build has the court, the altars,
the samadhi and the gates, and stops there. Status: **DONE** - a covered hall between gate and temple with the water station and a five-stall shop row.

**"add a volume button in game to control it as it keeps blowing bell"** — a
volume control reachable IN the world, not buried in the menu. There are
`volume` and `sfxVolume` settings already; what is missing is a way to reach
them without leaving what you are doing.

The bell itself is worth looking at rather than only turning down: held-up
ambient drivers sound their horn on a 3-9 s timer whenever throttle drops below
0.2, so a vehicle that is stuck sounds it for ever. Fix the cause as well as
giving you the control. Status: **DONE** - a sound button on the HUD with master, effects and mute; and the cause fixed, three honks within 42 m instead of forever.

**Map references you supplied — 2026-09-26**
  - https://satellites.pro/plan/Vrindavan_map
  - Apple Maps, Vrindavan @ 27.578153, 77.696734
Licence position, unchanged and worth restating: the FACTS on a map — a road's
name, where a temple stands — are not owned and are free to use. The tiles and
the vector data are. So these are read for names and positions and nothing is
traced from them. Esri World Imagery remains the one raster we may trace from,
because Esri explicitly permits OSM contributors to do it.

**"there should be proper small buildings, home, huts etc. as discussed earlier
with proper gates like in pokemon rpg where entering changes the view to the
inside home as normal"** — ordinary housing, and doors you walk through that
take you INSIDE, the way an RPG does it. Two parts: the huts and small homes
themselves, and an interior transition on entering a door. Status: **PARTIAL** - 602 buildings you can walk into (274 shop, 94 house, 234 hut), up from about 205, with working doors visibly marked. The view transition on entering is NOT done.

### Lila murals — DONE 2026-09-26

Every building carries its own pastime, chosen from the lot's own seed so the
same house keeps the same mural across rebuilds. 16 lilas, each cited: thirteen
to a Bhagavata Purana tenth-canto chapter, three labelled `braj` because they
are Braj tradition and not a chapter — Jhulan, Nauka Vihar and Mayura Nritya —
rather than given a false citation.

Cost, measured: meshes 420 -> 617, draws 4,546 -> 4,790, triangles 2.40M ->
2.54M for about 3,700 murals. fps 60, failed []. One atlas, one draw call per
chunk, exactly as `Signage.js` does it.

They are EMBLEM and NAME, not figures — the butter pot, the lifted hill, the
serpent's hoods, the cloth in the kadamba, the flute. That is the same decision
`buildDeities` makes and says out loud: at this scale a suggested form reads as
a murti and a modelled one reads as a doll, and a badly drawn Krishna repeated
across nine hundred walls would be worse than none.

The miniatures remain the better long answer and are still open: Pahari, Kangra,
Basohli and Mewar, 18-19C, out of copyright, on Commons with museum provenance.
That needs each file checked and credited one at a time, which is its own job.

### Temples rebuilt to the research — running list

- **Banke Bihari** (2026-09-26). Was a solid mass under three domes; the sources
  say "NOT a curvilinear nagara shikhara and NOT a Dravidian gopuram" and "do
  not invent a big tower". Now a three-storey tiered arcaded courtyard block
  with jharokhas, jali, corner chhatris — and NO BELLS, because none hang in the
  real premises. Plus **the curtain**, drawn and reopened, which is the single
  most distinctive thing about the place.
- **Radha Raman** (2026-09-26). The Radharaman Ghera: TWO successive enclosed
  courtyards, the outer lined with the Goswami houses and the inner holding the
  temple. Behind it the two very plain buildings — the Deity's kitchen, dining
  room and bedroom — and the TEN-FOOT fire pit that has been alight since Gopala
  Bhatta's time. The sanctum takes an embossed silver double-leaved door.
- **Govind Dev** (2026-09-26). The one temple Growse measured himself, so it is
  built to his figures: a GREEK CROSS, nave and transepts each 100 ft, walls ten
  feet thick, on a 200 x 120 ft platform. Truncated as it really is — the
  sacrarium tower razed to its plinth over the rough 1854 BRICK rebuild, the two
  chapel towers NEVER COMPLETED and stopping flat, only the choir tower
  standing and itself missing stages. Pointed waggon vaults, a triforium whose
  arches carry nothing, no parapet, and the two broad approaches Growse cut in
  1873 — the great eastern portal and the south transept.

Three down. `temples.mjs` 4/4 throughout.

`temples.mjs` learned two things doing this, both recorded in the file: a
builder must DECLARE its wall, because `loc.build` is sometimes the building and
sometimes the plot; and a plan that is not a rectangle says so, because a Greek
cross's bounding square runs through open ground at the re-entrant corners and
reported a third of the wall missing when none of it was.
- **Rangaji** (2026-09-26). The only Dravidian temple in Braj, and per the
  research "the only place in India where a South Indian gopuram rises directly
  behind a Rajput carved-stone gate" — so that stack is built on one axis, the
  93 ft stone pavilion in front of a seven-storey gopuram. Five-storey east
  gopuram, the pushkarini, the garden with its fountains, long colonnades of
  square stone piers, and the gilded dhwaja stambha in front of the sanctum
  doorway. Lime-white stucco with polychrome tiers — the research says in terms
  "do NOT model this as a red-sandstone temple".
- **Jugal Kishore** (2026-09-26). A shell: Growse's 25 ft square choir on its
  plinth with the whole nave gone, marked only by its plinth line. The eight
  ELEPHANT brackets under the north and south door hoods, unique in this group.
  A HOLLOW tower with a real chamber inside it, because Growse cleared four
  feet of pigeons' dung out of that room. No gilding, none being documented.
  Its altar is empty; the Deity is at Panna.
- **Radha Vallabh** (2026-09-26). "It looks more like a medieval European hall
  than a North Indian temple." NO tower: a steep stone GABLE over a 63 x 20 ft
  vaulted hall with ten-foot walls. The east facade's stylistic sandwich —
  Hindu, purely Muhammadan, Hindu. A double tier of flank openings, bracketed
  below and arched above, with the gallery behind. The cella demolished by
  Aurangzeb, so a headless sanctum with only its plinth and a later room on it.
  And trees growing out of the roof joints, which are documented.
- **Radha Gopinath** (2026-09-26). Growse, 1883: "the nave has entirely
  disappeared; the three towers have been levelled with the roof; and the
  entrance gateway of the court-yard is tottering to its fall." All three built
  as stated — towers levelled rather than stumped, a leaning gateway. Plus the
  blind three-bracket-arch arcade on the south wall that "serves no structural
  purpose", and the plain living temple welded onto the north flank of the
  gutted shell.

Eight rebuilt, plus Krishna Balaram and the new Chaar Dham. `temples.mjs` 4/4
after every one.
- **Prem Mandir** (2026-09-26). "A white marble wedding cake standing alone in a
  park." Built to the published figures: a 37 x 35 m body on a 58 x 39 m
  platform with a forty-foot parikrama, NINE carved domes crowned by SEVENTEEN
  gold kalashas and a flag, 150 pillars — and the **84 panels of Radha-Krishna
  leelas** on the outer walls, drawn from the same lila atlas the town's house
  murals use, because they are the same pastimes. Plus the pillar-less
  dome-shaped Satsang Hall beside it and the fountains in the lawns.
- **Katyayani Peeth** (2026-09-26). The documented material contrast is the
  building: WHITE MARBLE with BLACK STONE pillars, several of them carrying
  inscribed verses. The gold lions on the steps. A vast courtyard with the FIVE
  sampradaya shrines around it — Shakta, Shaiva, Vaishnava, Ganapatya, Saura.
  The shikhara is deliberately modest: no source names one, and the research
  says to treat it as unverified.
- **Gopishwar Mahadev** (2026-09-26). The research here is mostly a list of
  things NOT to invent — material, tower and facade are all "NOT DOCUMENTED" —
  so it has no shikhara, no carved facade and no asserted stone. What IS
  documented is built: a large open courtyard that dominates a small plain
  cell, and the venerated Peepal on its platform.

  And **the GOPI-VESH**, which the research calls "a time-of-day mechanic,
  perfect for a walkable build": the SAME linga shown two completely different
  ways in one day — bare in the morning, dressed as a gopi with shringar in the
  evening for the Ras Lila. Two meshes, and `Curtains` shows whichever the hour
  calls for. `[vesh] 2 dressings that change with the hour`.

Eleven rebuilt, plus Krishna Balaram and the new Chaar Dham — thirteen of the
sixteen temples now stand to their sources. `temples.mjs` 4/4 after each.

**"still iskcon vrindavan does not look as it is really as it's really big and
it's showing only this much"** — the Krishna Balaram build is too small against
the real place. `loc.build` is 54 x 66 m with `grounds: 68`; the real walled
campus is bigger and carries far more inside it — the goshala, the guest house,
Govinda's, the gardens, the gurukula. Status: **DONE** - the wall went 66x78 to 150x176 m and the campus now holds the Gurukula, guest house, Govinda's, goshala, book stalls, bakery, Prabhupada's quarters and the Tulsi parikrama ring.

**"make sure to have the exact look of all temples by properly researching
their architecture, hall, even stairs if possible etc."** — the bar is the
exact look, halls and stairs included. Eleven are rebuilt to their sources
already; this raises the bar on all of them. Status: ONGOING.

**"also close the temples like after 9pm by having a curtain in front of
deities as it happens"** — temples shut at night and a curtain is drawn across
the Deities. Real, and universal in Braj rather than Banke Bihari's minute-by-
minute curtain, which is its own thing. The curtain mesh and the `Curtains`
system both exist, so this is a second, slower cycle on top: every altar veiled
from about 9pm and drawn back in the morning. Status: **DONE** - 27 altars veiled after 21:00, on Vrindavan own clock, announcing Shayan and Mangala arti.

**"still can't find prabhupada idol in iskcon which is golden in color and no
other stuff and iskcon floor is completely white inside i saw but here's it's
garden like"** — two things. Srila Prabhupada's murti, golden, on his
vyasasana in the temple room, is missing entirely. And the floor reads as
garden rather than as the polished white marble it is inside, over the
black-and-white chequered courtyard. Status: STARTED.

**"add a full speed cheat code also which is really fast"** — a cheat word that
goes straight to the ceiling rather than stacking there five jaldis at a time.
Status: STARTED.

**"also see i can't walk down the stairs near deities in iskcon ?" / "fix
everywhere"** — the altar flight at Krishna Balaram is five shallow risers up
from the sunken court, and you cannot get back down them. Not to be fixed at
ISKCON alone: a check that walks every flight in the world, up AND down, the
way `stairs.mjs` does for the ghats. Status: STARTED.

### The stairs by the Deities — 2026-09-26, and what it uncovered

You could not walk down the steps by the Deities at Krishna Balaram, and said to
fix it everywhere rather than there. That turned into six faults, all of the
same family: **geometry drawn and never made solid, or solid where it should
not have been.**

1. **The altar hall floor was drawn and never collided.** You climbed all five
   risers — measured 0.71, 0.92, 1.23, 1.38, 1.53 — stepped off the top tread
   and fell straight through the marble to the terrain at 0.69, stranded below
   with no way back up. This is the ISKCON compound-wall fault in a new place.
2. **Every other temple had the same hole.** Fixed centrally instead of one at
   a time: every builder already declares `interior.floor` and its volume, so
   the floor collider is generated there. Patching per builder is how the first
   one got missed.
3. **A floor was then a WALL.** A hall 0.55 m up sits just above STEP_UP, so
   the new slabs became chest-high barriers ringing every temple. `standOnly`
   added to WorldService: stood on, never bumped into. `isClear` skips them
   too, because a floor is ground — without that, every doorway in the world
   read as blocked and `temples.mjs` went from sixteen doorways to none.
4. **Prabhupada's vyasasana stood on the aisle.** Measured: the walk pinned at
   local z 7.2, shoved back 0.1 m every step. Moved — then it blocked
   GAURA-NITAI instead, at lx -7.5 against an altar at -7.2. Now between the
   altar lines.
5. **The three altar lines merged into a wall.** Each was 7.0 m wide with the
   altars 7.2 m apart — 0.2 m between them, a 21 m barrier across the hall, so
   the side altars were unreachable. Sized off the spacing now.
6. **Govind Dev's transept walls ran across its own crossing**, walling the
   nave off from the Deity, and its sacrarium sat between the door and the
   crossing with the altar inside the masonry. A Greek cross has no wall
   through its crossing; that is what makes it a crossing.

New check: `tools/checks/halls.mjs` — 4/4. It flood-fills from each temple's
door using the PLAYER's own collision (not `isClear`, which counts a step tread
as an obstruction and could not climb the altar flight) and asserts that every
altar is reachable, that no floor drops away, and that nothing lifts you more
than a stride. 18 altars, worst drop 0.00 m, all reachable.

`tools/checks/steps.mjs` also added, walking every tagged flight up and down.
Its grouping still splits wide ghats across buckets and misreports them —
`stairs.mjs` covers the ghats properly, so that is a known limitation and not a
world fault.

---

## 2026-09-27 — Chandrodaya, walking into houses, and an honest ETA

### Chandrodaya — built as a building site, because that is what it is

Sixteenth and last of the temple rebuilds. The research on this one is blunter
than any of the others:

> **CRITICAL FOR THE ARTIST: the 700 ft tower does not exist.** As of 2026 what
> stands on site is a large unfinished concrete structure amid construction
> plant, with a functioning small temple and goshala operating beside it. If you
> model the render, you are modelling something nobody has ever seen.

The builder was modelling the render — seven tapering clad stages with a token
crane. Foundation stone was laid 16 March 2014; completion has been missed in
2019, 2022, 2024, 2025 and 2026 and is now stated for December 2028.

So it is now a reinforced concrete frame: nine stages, only the lowest **three**
clad, the six above them bare columns and floor slabs with nothing between them
— which is the part you can see straight through from the road, and the reason
the thing reads as a site and not a temple. Starter bars left standing out of
the top pour. Two tower cranes, scaffold towers up the clad face, five site
huts, material stacks, a spoil heap, and hardstanding instead of landscaping.
Beside it, the two things that actually work: the small temple with its shikhara
and the goshala's open sheds.

**Sixteen of sixteen temples now built to their sources.** `temples.mjs` 4/4,
`halls.mjs` 4/4, `walls.mjs` 3/3.

### Walking into a house — the roof comes off

Asked for as *"proper gates like in pokemon rpg where entering changes the view
to the inside home as normal"*. The 602 enterable buildings and their marked
doors existed; the view change did not.

The problem is geometric. A hut is 5 m across and the follow camera sits 6.8 m
back, so standing in one puts the camera **outside the building looking at its
back wall**, with the roof between you and any view from above. The old RPGs
solved this decades ago by cutting to a view from over the room.

So: a single horizontal **clipping plane** parked at the room's ceiling. Walk in
and the world above that line stops being drawn — this building's roof, the
storey over it, the neighbours, the sky — and you are looking down into a lit
room. The camera goes to 46° down at 4.6 m, and a short warm fade covers the
change. Walk out and your own camera comes back, to the metre and the degree.

Two things that matter in how it is built:

- **The plane is installed once, at boot, and never taken off.** Adding or
  removing a clipping plane changes the clip-uniform count on every material in
  the scene, which recompiles every shader. Doing that on a doorway would stall
  a phone for a second. Moving the plane is a uniform write, so it is free. When
  nothing is being clipped it parks at y = 100000.
- **It is driven off state every frame, not set on the way in.** A clipping
  plane left on by accident renders the world as a black void. Opening the map,
  teleporting, or a reload throwing you out of a volume all park it on the next
  frame without anything having to remember to.

**Temples deliberately do not get this.** A temple here is a courtyard you are
still standing under the sky in, and cutting its shikhara off would be a lie
about the building. Only the little rooms are cut.

Eight new checks in `interior.mjs`, all passing.

### The ride that said one minute and took four

Reported as *"it's been 1 min but not yet reached iskcon temple as it showed
erlier"*, and the cause was that **the ETA quoted a plan the vehicle could never
achieve**. `pace` is computed up front to hit the 55 s target, capped at 26 m/s.
The road does not care: `pathLimit` slows for every bend, `prof.lat` holds him
down through them, traffic stops him, and he brakes for the last waypoints. On
the Chhatikara run the plan is 26 m/s and the measured average is nearer 11.

Now the ride **measures itself** — `r.mps` is the real running average — and
everything that talks about time uses the measurement instead of the plan, so
the countdown converges on the truth instead of running out.

And the five-minute promise is now *kept* rather than assumed: if the measured
average says the ride will overrun `RIDE_MAX_S`, the driver quietly finds up to
2.4x more, bounded. Deliberately separate from `paceMult` — jaldi is the
passenger leaning forward and the HUD reports it, and showing a jaldi the
passenger never asked for would be dishonest.

### The pujari keeps the temple's hours

The night veil goes across every altar at 9pm Braj time. The pujari did not
know that, so he was circling a lamp in front of a drawn curtain at two in the
morning. `Curtains` now publishes `shut`, `RitualSystem` reads it, and the lamp
goes out and the bell stops with the curtain.

### Three checks that were testing the clock, not the code

`interior.mjs` had been failing 3/23 quietly, and none of it was the game.

- Two light checks compared the scene's sun against a baseline captured minutes
  earlier, while `stand()` advances the clock 300 steps at a time. **Cross a
  phase boundary mid-test and the sun drops by a third on its own**, which reads
  as "walking into a courtyard turned the sun down" when the courtyard only ever
  asked for 10%. The run that exposed this was in phase `night`. The absolute
  readings still guard the original runaway (that bug showed fog density 3e5,
  and no clock does that); the questions about how *strongly* a place is graded
  are now asked of `interior.grade` directly. "Walking out puts the light back"
  is now exact — grade 1 across the board, which is the only thing that can
  never compound.
- The culling check asked that **every** interior mesh be visible. Fair when the
  courtyard was the only one; there are now 36 scattered over four kilometres
  against a 220 m draw radius, so "all of them are up" is the failure, not the
  pass. It now asks about distance.

`interior.mjs` 23/23.

### Darshan timings — 4am to 9pm — 2026-09-27, SETTLED

Asked for: *"also temple curtains should at 4am ? til 9pm for now every temple
later we'll decide time for each"*. The curtain now draws at 21:00 Braj time
and opens at 04:00 (was 04:30). One pair of hours for all sixteen temples, and
explicitly a placeholder — every temple in Braj keeps its own timings and
several close in the middle of the day too. Held as two named constants in
`Curtain.js` so the per-temple table is a data change when those are decided.

**Settled the same day:** asked whether these were the real timings and told
"4am-9pm darshan timings". So this is the rule, not a stand-in, and item 37
comes off the list. A per-temple table remains possible as a data change if it
is ever wanted.

### "I can't walk down the stairs near deities" — the fix had created a new one

This came back, in the same place, for the opposite reason. Found by rewriting
`steps.mjs` rather than by looking; it had been failing 1/2 for weeks.

The original fault was that ISKCON's altar hall was **drawn and never
collided**, so you climbed all five risers, stepped off the top tread and fell
through the marble. The fix laid a **blanket floor slab across every temple's
declared interior volume**, so no temple could ever do that again.

But a declared volume is the whole building. At Krishna Balaram that is the
altar hall, the court in front of it, **and the five-riser flight between
them** — so the slab paved the staircase. It sat 2 cm above the top tread, and
`standHeight` takes the highest surface within a step, so walking away from the
Deities the feet read **1.55 m at every step for four metres**. Measured: 0 m
descended of a 0.61 m flight. The steps were drawn, were solid, and could not
be used. Banke Bihari had it too — a 44 x 50 m slab at 0.55 m with the approach
steps running 0.27 to 0.71 straight through it, 0.16 m descended of 0.44 m.

Fixed in two places, both general rather than per-temple:

1. **A backstop is not a surface.** The blanket slab is now marked `soft`, and
   `standHeight` consults it only when nothing real is underfoot. That keeps
   exactly what it was added for — you cannot fall through a temple floor —
   without it overriding a tread, a plinth or a ghat.
2. **A builder that lays its own floor does not get the blanket one.** Detected
   by scanning the builder's returned colliders for a `temple-floor` tag rather
   than by a flag, because a flag is a thing the next builder forgets to set.

Also found on the way: ISKCON's `stepTops` loop was **dropping `standOnly`**
when it converted to colliders, which turned the hall's marble into a wall
across the top of the flight for anyone more than a step below it. And
`_addColliders` was dropping `standOnly` for circle colliders entirely — inert
today, since nothing authors one, and correct for the next thing that does.

`steps.mjs` went 1/6 flights walkable to 5/6 on this alone. `halls.mjs` 4/4 and
`deities.mjs` 12/12 throughout, so nothing regressed.

### `steps.mjs` — rewritten, and it had been testing itself

Three faults, all of which made the check lie rather than the game:

- **It grouped treads on an 18 m grid.** Keshi Ghat's flight is about fifty
  metres wide, so it was cut into slices whose treads were side by side rather
  than one above the other, and the walk set off ACROSS the face of the ghat.
  Now union-find on "within 3.6 m and the same tag", which gives the whole
  flight however wide.
- **It walked 160 steps of 9 cm — 14.4 m — whatever the flight.** A ghat's run
  is longer, so a long flight reported a partial descent because the walk
  stopped halfway. Adding margin then introduced the opposite: past the bottom
  tread the terrain is flat, so `standHeight` puts you back at bank level and
  the walk ENDS at the height it started. Measured as -0.01 m descended of a
  5.1 m flight — a perfect score for the failure. It now watches the LOWEST
  point reached, not where it stopped.
- **It walked a straight line.** Right for a stair, wrong for a ghat, which
  curves with the bank. Fitting a better line does not help because there is no
  line. It now groups treads into levels, takes each level's centroid and walks
  one down to the next — which follows a curve, handles several boxes per
  level, and is a fair description of what a pilgrim does.

### `driving.mjs` — the flakiness was not performance

Measured 8.4 m/s on a quiet machine, 2.4 on a moderately busy one and 0.2 on a
heavily loaded one, from an unchanged scene, which looked like a frame-rate
problem and was not: the stepping was already fixed at 1/30 of simulated time.

What moved was the **starting point**. The personal vehicle is spawned near
wherever the crowd has drifted to, and the crowd drifts in REAL time while the
page boots. A slow boot put the car in a gali facing a wall, and a car facing a
wall covers no ground however fast it can go.

It now starts on the longest straight run of wide road in the world, pointing
along it — found from `ctx.data.ROADS`, so it is the same road every time.
**8/8, and it reads 12.4 m/s.**

### Named places with nowhere to stand — DONE

Measured on the build rather than taken from the old note: 118 of the OSM names
earn a signboard, and **37** of them had no generated lot within 90 m — which
means walking to somewhere the map labels and the search finds and standing in
an empty field. They are out where the terraces stop — the
Chhatikara road, off the parikrama, the far bank — and widening the search
would not have helped, because there is nothing there to find.

Each now gets a building of its own on the road it actually sits beside, set
back from the kerb and facing it, placed by the **same rules as every other
lot**: off the carriageway, clear of water, out of the keep-out zones, not
overlapping a neighbour. If the kerb is taken it slides along the same road
rather than hopping to another one, because a named place is a real address and
belongs on its own street. A name with genuinely nowhere to stand still gets
nothing, rather than a shop in the Yamuna.

**Result: 113 of 118 named places now have a shopfront** — 81 on an existing
lot, 32 given one of their own, 5 with nowhere that passes the placement rules
(in the river, or inside a keep-out zone). Enterable buildings went 602 to 711
as a side effect, since some of the new lots are big enough to hold a room.

### The ghats had a wall across them — `steps.mjs` is green for the first time

Chasing the last failing flight found a real fault, in the game and not the
check. Kaliya Ghat descended four risers of sixteen and then you slid sideways
along something.

**A ghat was being built twice, in two different directions.** `TerrainBuilder`
cuts the flight toward the nearest river geometry — it works the angle out from
the water. `LandmarkGenerator`'s `ghat` builder draws the riverfront arcade 8 m
behind the steps using `loc.rot`. Those are not the same number, and where they
disagreed the arcade wall came down **across the middle of the flight**: a
70 x 6 m box, full height, untagged, sitting on the treads. Three of the four
ghats happened to have `loc.rot` close enough to the river direction to get
away with it. Kaliya Ghat did not.

The terrain now publishes `ghatFacing` — angle, crest height and run — and the
facade uses it. One source of truth for which way a ghat faces.

Worth recording how the first attempt at this failed: setting `this.ghatFacing`
on the Terrain instance had **no effect at all**, because `build()` hands back a
facade object rather than the instance, so nothing outside ever saw it. The
collider changing size in the next probe is what showed the new code was running
and the lookup was still coming back empty.

**`steps.mjs` 2/2 — all six flights, every one of them exact: 5.1 m of 5.1 m on
each of the four ghats, 0.44 of 0.44 at Banke Bihari, 0.61 of 0.61 at ISKCON.**

### `SpatialGrid` handed the same collider back nine times

Found while reading a probe whose results were entirely duplicates.

Anything bigger than a cell is deliberately inserted into every cell it covers —
`WorldService._index` does this, because indexing a 176 m wall by its centre
alone leaves holes you can walk through along most of its length. The cost,
which came in with that fix and was never paid attention to, is that the wall
then comes back **once per cell** in any query touching it. Measured on the
ghat treads: the same collider eight times in one query, and `collide` tested it
eight times, twice a pass, every frame, for every walker.

`query` now stamps each item with the query number and skips repeats — one
integer compare per hit, no allocation, no Set. Each grid writes to its own
field name, so two grids holding the same object cannot confuse each other.

### The save's native mirror was never tested — now it is

Item 31 on the queue was "move the save off WebView localStorage". It turned out
to be **already built**: every write is mirrored to Capacitor Preferences
(SharedPreferences on Android, UserDefaults on iOS, neither of which gets
evicted), and `restoreFromNative` pulls the native copy back at boot if it is
newer. What was missing was any evidence it works — the code path cannot run in
a browser, because there is no Capacitor there to find, so `save.mjs` walked
straight past it.

It is now driven directly against a stub plugin that behaves like the real one:
a write reaches the native side stamped, **localStorage is then wiped the way
Android would wipe it**, and the journey comes back. Plus the other direction —
a newer WebView document is not overwritten by an older native one.

### There was no way to run the checks — now there is

`tools/checks/all.mjs`:

```
node tools/checks/all.mjs            every check, one at a time
node tools/checks/all.mjs walls steps    just these
node tools/checks/all.mjs -j 3       three at a time
```

Until now the suite was a shell one-liner retyped whenever it needed running,
and that cost real things. `interior.mjs` sat at 20/23 for weeks because it was
never in the one-liner. And the one-liner's grep reported `dpad-dir` as "NO
RESULT" because that check prints its score in its own words rather than as
"n/n passed" — so a check that has been passing all along looked broken.

The runner therefore takes the **exit code** as the verdict, which every check
sets, and treats the summary line as decoration. It also prints the failing
lines from anything unhappy, rather than telling you a check failed and making
you run it again yourself to find out why — which is most of the reason a suite
stops being run.

**Serial by default, deliberately.** Each check boots a whole world in a
headless browser and several of them time things.

### Real-time waits in checks — a recurring class of lie

Two checks this session were measuring the machine rather than the game, and
both looked like different problems than they were:

- **`driving.mjs`** read 8.4 m/s quiet, 2.4 moderate, 0.2 loaded, from an
  unchanged scene. Not the frame rate — the stepping was already fixed. The
  *starting point* moved, because the vehicle spawns near the crowd and the
  crowd drifts in real time while the page boots.
- **`chatter.mjs`** read 6/6 alone and 5/6 inside the suite from identical
  code. It waited a flat 6.2 s for toasts to clear, which is enough on a quiet
  machine and not on a busy one. It now polls for the screen to actually be
  clear, with a generous deadline — no slower when things are quiet, and it
  does not lie when they are not.

Worth stating as a rule, since it has now cost time twice: **a check may wait
for a condition, but never for a number of milliseconds.** If something can only
be waited out in wall-clock time, poll for the thing itself.

### The driver talks now

Asked for a while back and never built: *"the driver says nothing during a ride
beyond the toasts"*. A five-minute ride across Braj in silence is the part of
the rickshaw that still reads as a vehicle rather than a person, and the ride is
where most people will spend their first ten minutes here.

He is a man who has driven this road every day for years, so he points things
out as they go past, complains about the traffic, mentions the timings, asks
where you are from — and is then quiet again. `client/src/game/transport/DriverTalk.js`.

Three rules, which are the whole difference between this and wallpaper:

1. **He says it because it is there.** Every landmark line is tied to actually
   passing that landmark, and he says it once.
2. **He is quiet most of the time** — at least 22 s between lines, 46 s before
   he will make conversation unprompted, and he settles in for 9 s at the start
   rather than greeting you, because you have just agreed the fare and he has
   already spoken.
3. **Nothing he says is devotional instruction.** He will tell you the aarti is
   at half past seven. He will not tell you to go to it, and he will not tell
   you what to feel.

Every factual claim — the timings, which temple is which, what stands on which
road — comes from the same research the temples were built from.

He also knows when he is stuck, from `ride.mps` against `ride.pace` — the same
measured average the ETA uses, so "bas do minute, yeh roz ka hai" is said
because he is genuinely crawling and not because a timer went off.

Two faults found by the check that went in with it:

- **He repeated himself**, three lines out of four, because several sets hold a
  single line and it was morning for the whole ride. He now tracks what he has
  said and falls back — conditions, then ordinary talk, then **silence**. A
  driver who has run out of things to say is quiet, not a loop.
- **The ETA's catch-up only ever went UP.** Once traffic forced it on he kept
  the extra pace for the rest of the journey and arrived well early: a ride
  quoted at seven minutes took under three, which is the original complaint
  with the sign flipped. It now decays when he is comfortably inside the
  budget, so the ride settles near the cap instead of overshooting it. And the
  countdown never quotes longer than `RIDE_MAX_S`, because that cap is
  enforced — a countdown reading past it is describing a ride that cannot
  happen.

### Traffic gives way at junctions — measured 78 overlapping pairs, now 0

Item 36, and the other half of "vehicles drive through each other".

Vehicles have always **queued** properly: `_vehicleAhead` reads a nine-metre
cone off the nose and lifts off for anything in it — another vehicle, a cow, a
person crossing, you. What it cannot see is anything **crossing**. At a junction
two vehicles are each outside the other's cone right up until they are in the
same place, and then they pass through one another.

Measured before the fix, on the town as it runs with nothing staged:
**78 overlapping pairs across 90 samples of 39 vehicles over 45 seconds.**

`CrowdSystem._crossYield` now projects both forward at the speed they are
actually doing, finds the moment of closest approach, and if they will be inside
each other's width at that moment, one of them lifts off. Three things keep it
from making the town worse than it was:

- **Only crossing traffic.** Headings within 40° are a queue, which
  `_vehicleAhead` already handles. Applying this to a queue makes a whole line
  of traffic brake at once.
- **Whoever gets there later yields.** Both what happens here and the stable
  answer — a vehicle already into the junction keeps going rather than stopping
  in the middle of it.
- **The tie breaks to exactly one of them.** Both yielding is a deadlock, and a
  deadlock on a through road is worse than a collision, because the collision
  clears.

**After: 0 overlapping pairs, same measurement.** And 0 of 90 samples had the
town halted, which is the check that matters most — a yield rule that stops the
traffic has not fixed anything.

Two bugs the check caught, both mine, both silent:

1. **The closest-approach time had its sign inverted.** Separation is
   `r - v·t`, minimised at `t = r·v / v·v`; I wrote `-r·v / v·v`, which puts
   every real conflict at a negative time, so every one is discarded as already
   past and the rule never fired once. It read as a clean pass on the three
   "must not brake" cases and 1.00 throttle everywhere.
2. **The dead-heat tie-break used `x + z`,** which is *equal* for a symmetric
   junction — precisely the case that needs deciding. Both vehicles concluded
   they had right of way. It is a total order now.

Also worth recording: the first version of this check staged a crash by setting
two vehicles' positions and headings in an empty field. They never met — the
steering puts every agent back on its own road, so a hand-set `yaw` lasts one
frame, and the "closest approach" it measured was nine metres of the two
wandering off. **It was measuring the steering, not the giving way.** The rule
is a pure function of two positions and two velocities, so it is now simply
asked, and the scene is left alone.

**Deliberately not done, so it is not mistaken for an oversight:** the vehicle
you are *riding in* does not use the junction yield. It is driven by
`RickshawSystem` along an agreed route, and it already has a collision response
— `HIRED.agents` is true, so `collideAgents` pushes it out of other vehicles
rather than through them. Adding anticipation on top would make the ride
hesitate at every crossing for a gain you would not see from the seat. Worth
revisiting only if a ride ever looks like it is barging.

### Two checks in the suite had never actually run

Both found the moment there was a runner rather than a shell one-liner, and
both were failing for reasons that had nothing to do with the game:

- **`parse.mjs`** builds `vm.SourceTextModule` to prove every file in the
  project is valid ESM. Without `--experimental-vm-modules` that constructor
  does not exist, so it reported **PARSE ERROR on every single file** and read
  as though the whole codebase was broken. The runner now passes the flag to
  every check — harmless where it is unused, and it means a check cannot be
  added that quietly needs a flag nobody remembers.
- **`nav-smoke.mjs`** imports the game's own modules into Node rather than a
  browser, and the chain reaches `VehicleDrive.js`, which imports `three`. The
  bare specifier resolves through the page's import map, which Node knows
  nothing about — `ERR_MODULE_NOT_FOUND`. A `client/node_modules/three`
  symlink onto `client/vendor/three` fixes it for good: Node walks up from the
  importing file and finds it, and the vendored copy already carries the
  `package.json` that makes it resolve.

Both green. `nav-smoke` reports all landmarks reachable, which is a thing
nobody had been told for some time.

### The camera could collapse into your own head

Found by `gatherings.mjs`, which had also never been in the suite.

`ThirdPersonCamera._collide` is a fraction of the arm and it could reach **zero**
— at which point `dist * 0` puts the camera exactly on the pivot, inside the
avatar, looking at the inside of its own mesh with no way to work out what
happened. Measured: 6.21 m of arm on open ground, **0.00 m** standing beside a
kirtan.

There is a floor on it now (`COLLIDE_MIN`, 0.75 m). A squeezed camera ends up
over the shoulder, not nowhere. This is not a kirtan problem — it could happen
anywhere the camera was fully blocked, which in a town this dense is a lot of
places.

**The check was also asserting something false.** It demanded the arm stay
within 10% of its open-ground length beside *every* gathering. That is not true
of a kirtan and should not be: a kirtan puts its **standing** members furthest
out, at 3.15 m against the seated ring's 2.35, so standing "just outside the
furthest member" stands you against a 1.9 m body — and a person that tall is a
wall to a camera arm. Tucking in there is what you would actually see.

It is now the two things it meant all along: **nowhere may the arm collapse**,
and **a gathering of seated people must not shorten it at all**, which is the
entire reason those colliders carry a height.

### The gatherings draw-call budget

`gatherings.mjs` asked for under 20 draw calls and measured 25. Rather than move
the number quietly, the check now says where the calls go, because "33 meshes"
on its own does not tell you whether the budget is wrong or the system is:

- **one instanced mesh per (pose, archetype)** — this is what stops a kirtan
  being twelve copies of one man, and it is shared by every gathering in the
  world rather than paid per gathering;
- **one prop mesh per gathering**, plus a flame and smoke for a yajna — these
  DO multiply, so they get an assertion of their own.

Budget moved to 30 with that reasoning recorded, and a second check added that
the per-gathering cost stays small. If the per-gathering number ever climbs,
that is the one that will say so.

---

## 2026-09-27, later — the gatherings were scenery, and the darshan hours settled

### Darshan timings — SETTLED

Asked whether 4am–9pm were the real timings and told: **"4am-9pm darshan
timings"**. So that is the rule, not a stand-in. All sixteen temples open at
04:00 Braj time and close at 21:00; the night veil goes across every altar and
the pujari stops his arti with it. Item 37 comes off the list. Still two named
constants in `Curtain.js` if a per-temple table is ever wanted.

### A gathering was scenery. Now it is people.

Four faults, all recorded in this file as open for weeks, all fixed together
because they are the same fault seen from four sides: **nothing outside
`GatheringSystem` knew these people existed.**

**1. Nobody in one could be spoken to.** `nearestSpeakable` scanned the walking
crowd and the drivers and nothing else, so you could stand in the middle of a
kirtan with twelve people around you and there was nobody to talk to. They are
the one group in this town who are not going anywhere, and they were the only
ones you could not address.

They answer now, and by **what they are doing** rather than by archetype — a
widow at a kirtan has more to say about the kirtan than about being a widow,
and it is the kirtan you walked into. Separate sets for the havan, the kirtan
and the katha. Nobody gets up, nobody turns to face you, the sway carries on:
they answer without breaking off, which is what actually happens if you speak
to someone in a kirtan, and it is why the lines are short.

**2. A havan burned at two in the morning** exactly as it burned at noon, with
eleven people round it, because nothing here had ever asked the time. Each kind
now keeps its own hours, and they are deliberately *not* the same as each
other:

| | opens | closes |
|---|---|---|
| havan | 5:00 | 11:30 — a morning thing, lit early, finished by midday |
| katha | 9:00 | 18:00 — the long mid-morning session and again after the heat |
| kirtan | 15:00 | 21:00 — afternoon into the night; the evening sankirtan is when the lanes are fullest |

Checked once a second against **Vrindavan's** clock, not the device's, so a
pilgrim in another timezone finds a havan burning when one is really burning.

**3. Their colliders stayed behind — twice over.** The people in a gathering
*are* its colliders, one circle each, and there was no way to take a collider
out of the world at all: `WorldService` had no `removeColliders` and
`SpatialGrid` had no `remove`. So a havan that finished at half past eleven
left its ring solid all night, and `GatheringSystem.dispose()` left **227**
invisible bodies standing in the road.

Both now exist. `SpatialGrid.removeWhere` sweeps every cell rather than keeping
a per-item record of where each thing was put — because anything larger than a
cell is deliberately inserted into *every* cell it covers, so a record would
have to be a list, and removal happens on teardown while insertion happens tens
of thousands of times at boot. Pay the cost where it is not felt.

**4. A fifth gathering in range popped rather than faded.** `ACTIVE_MAX = 4`
was justified on "at most 4 were ever in range in testing"; sweeping the
rectangle at 20 m says **5 on low, 6 on mid, 7 on high**. The selector always
dropped the farthest, so what vanished was 580–610 m away and a few pixels
across — which is why nobody saw it go, and also why it was still wrong: walk
toward it and it appears out of nothing.

Fixed with two changes, because the rank cap was the wrong tool on its own. A
gathering now stops being drawn at a **distance** — 300 m, where a 4 m huddle
is a smudge — and the rank cap is raised past the measured worst case to 8, so
it is a safety net rather than the thing doing the culling. `peak * 8` instead
of `peak * 4` is the entire memory cost.

**And pedestrians walked straight through them.** Crowd agents steer on the nav
graph and never ask `world.collide`, so a man walked through twelve people
sitting on the ground; only the player and the camera were ever stopped. They
now go round, steered off the gathering's **centre and radius** rather than off
each member — twelve circle tests times 196 pedestrians every frame is real
money, and the thing a person walks round is the kirtan, not each singer in it.
Gathered once per frame and only within 200 m of the player, because a
pedestrian walking through a gathering six hundred metres away is a thing
nobody can see.

### The ISKCON courtyard: "it's garden like?"

You reported it and the backlog had it filed under **"known and deliberate"**,
which it should not have been. Two separate faults were hiding behind that
heading, and the note defending them has been wrong since tonight.

**The grass really was coming through.** The slab sat at `ground + 0.06`, where
`ground` is ONE height sample at the centre and the 60 mm was measured against
it. The terrain under this block runs to **+76 mm at the outer corners of the
verandah** — so at the corners the marble was below the grass, which is exactly
what a lawn in the mandir looks like. It is now laid above the **highest**
ground under it, sampled on a 10×10 grid across the real footprint, corners
included, because the corners were where it was worst.

**And you were standing inside it.** The marble was drawn and never made solid,
so you walked the courtyard at terrain height with the slab around your ankles.
The old note said the choice was "a few centimetres of shoe or a lawn in the
mandir", because `WorldService` pinned the player to the terrain and nothing in
the builder could change that. That stopped being true tonight: `standHeight`
puts you on any surface within a step, so the court now carries a collider and
your feet are on the floor.

The court floor **stops at the foot of the flight and does not reach over it.**
A slab laid across a staircase is what paved ISKCON's five risers earlier
tonight and made them unwalkable; repeating it here would have undone that fix
in the one temple it was found in.

### Dandvat pranam — requested 2026-09-27

> "add dandvat pranam option also to do"

The full prostration — flat on the ground, straight as a *danda*, arms extended
toward the Deity — as distinct from the standing folded-hands pranam that is
already there. It is what is done before the Deities, at a temple threshold, and
on the parikrama marg, and for many pilgrims it is the whole point of arriving.

Building it now. Hard rules it must not break, from the brief:
- **not scored, not counted, not collected.** "Don't gamify devotion." No
  counter, no achievement, no progress bar. You do it or you do not.
- it must read as an act, not an emote — held long enough to mean something,
  and interruptible.

### An audit of every "still open" line in this file — 2026-09-27

Seventeen agents, one per claim, each reading the actual code rather than the
claim. Worth doing: **six of the seventeen were stale**, and two found faults
that were worse than recorded.

**Stale — already done, now struck from the list:**

| Claim | What is actually true |
|---|---|
| "Temple interiors render black" | Fixed structurally. `InteriorSystem` writes no light at all; it publishes bounded scales and `TimeOfDay` folds them into its damp targets. Verified the ONLY writer of sun/fog/exposure in the codebase is `TimeOfDay`. |
| "Narrated story audio does not exist" | **Every story card already has a working Listen button.** Item 39 was never blocked on a voice-vs-synthesis decision — it ships in the phone's own voice today. |
| "Vehicles drive through buildings — 10.4%" | Re-measured: **0.7%** on the exact route complained about, 0.0% on Chhatikara→ISKCON. Now guarded by `routes.mjs`. |
| "Nothing in this engine climbs" | It climbs. The ISKCON hall barrier is gone and `standHeight` takes any surface within a step. |
| "Grass through the ISKCON courtyard" | Fixed tonight, and further: the slab now sits above the *highest* ground under it, not one sample plus a guess. |
| "The driver says nothing during a ride" | He talks. |

**Found worse than recorded — both fixed:**

**1. The rickshaw was setting you down INSIDE Banke Bihari Mandir.** The backlog
had this as fixed, because ISKCON was fixed. `_setDown` stepped clear of the
footprint on one bearing, asked for the nearest road node to that point, and
**returned whatever came back without checking it** — so when the nearest node
to the stepped-out point was another gali node back inside the compound, you
were set down in the sanctum. Measured: 18.9 m out on a cold nav graph (passes),
**11.1 m after seventy-odd routing calls had warmed it** (inside the building),
with the interior mode actually engaging — camera pulled in, ceiling clipped.

The drift with warm-up is `NavGraph.nearestDrivable` treating an unmeasured edge
as drivable, so the same query answers differently depending on how much of the
graph has been walked. Rather than chase that, **the set-down now checks its own
answer**: a ring search over bearings and increasing radius, taking the first
node verified outside using the same `InteriorSystem._contains` test the game
uses to decide you are indoors. It does not care what the graph hands it.

And the check that would have caught it did not exist. The only arrival
assertion was `endDist < 60` for ISKCON — which passes trivially for a 54×66 m
building and says nothing about being indoors. There is now one over **every**
landmark, on a **warmed** graph, asking "is this inside the volume" rather than
"how far from the centre".

**2. My own pedestrian fix did not work.** Measured 7 cm from somebody sitting
down, an hour after I wrote it. It only pushed once the walker was already
inside the ring, and only pushed radially — so by the time it started they were
among the seated, and a radial push fights the nav target head-on, stalling
them against the edge until they slide through. It now uses a **look-ahead
band** 3.2 m wider than the gathering and a **tangential** component: pick the
way round that agrees with where they were already going and lean that way.
Which is how a person avoids a crowd — you see it coming and drift round it.

**Confirmed still open, no work done on them tonight:** voice recognition
(needs a microphone decision), the D-pad over the virtual stick (your call),
per-limb control, account/cloud sync, and the ISKCON shade net (genuine
conflict — it is really there, and it hides the domes you asked to see).

### "its more than 4am still curtains lock" — reported 2026-09-27

Past 4am Braj time and the Deities are still veiled. Measuring before changing
anything: the rule reads `decimal >= 21 || decimal < 4`, which at 04:30 should
be open, so either the clock, the veil or the thing being looked at is not what
I think it is.

### "its more than 4am still curtains lock" — measured, and it was Bihari Ji's own curtain

Measured every boundary before touching anything, by mocking the Braj clock:

| Braj time | temple | veils showing |
|---|---|---|
| 02:00 · 03:30 · 03:59 | shut | 29 |
| **04:00** · 04:30 · 06:00 · 12:00 · 20:54 | **open** | **0** |
| 21:00 · 22:00 | shut | 29 |

So the 4am–9pm rule and all 29 night veils were already correct, and the
`vrindavanTime` conversion is right for any device timezone (checked against
IST, UTC and a US offset). The report was real; the cause was elsewhere. Two
things, both found by going and looking rather than patching the likeliest line:

**1. Bihari Ji's own curtain was cycling all night.** Banke Bihari's curtain is
drawn and reopened every few minutes — the single most distinctive thing about
the temple, and the whole reason `Curtain.js` exists. But it was doing it at
three in the morning, behind the night veil, in a temple that was shut, with
nobody there to pull the rope. Stand in front of it at any hour and a curtain
closed in your face. **That is almost certainly what was seen.**

It now keeps the temple's hours. It *closes* rather than snapping shut — nine
o'clock arriving while the curtain is open is a curtain being drawn, which is
what you would see; teleporting it is a frame where the cloth was in two
places. And it does not announce a darshan nobody is having.

**2. The fallback quietly contradicted the rule.** With live time off,
`_shutNow` asked whether the SKY was night — and the sky is still night at half
past four, so the Deities stayed veiled until dawn, an hour and a half after
the temple had opened. There is one comparison now, against one rule, whichever
clock is answering; `PHASE_HOUR` maps a pinned sky to a representative hour.

Both guarded by a new section in `deities.mjs` that walks every boundary, so
"is the temple open" is never again a thing that has to be answered by mocking
a clock by hand.

The check caught a third thing on its first run: the close was a **snap**, not
a slide. Worth recording as the general case — a guard that forces a state
should let the animation reach it, not assign the end position.

### "cant come back from deties area near stairs in iskcon" — 2026-09-27

Two faults stacked on the same spot, and your own words were the diagnosis:
**"although its empty rea"**. Nothing is drawn there. The rail is a collider
with no mesh, and the floor simply stops.

**1. The staircase was narrower than the altars it serves.** The flight tapered
to `KB_COURT - 4 * 0.45` = **5.7 m** at its top tread. The outer Deities stand
at **7.2 m**. So a pilgrim who walked to Gaura-Nitai or Radha-Shyamasundara was
standing a metre and a half past the end of the stairs, with a 0.78 m drop
where the next tread should have been.

**2. An invisible rail began 0.3 m away.** The side rails — which stop you
wading into the hall over the verandah, where there are no steps — started at
`KB_COURT` = 7.5 m. A body has a 0.42 m radius. Standing at 7.2 m you were
already *inside* the rail and could not walk out past it.

Measured, straight out from each altar:

| altar | before | after |
|---|---|---|
| centre — Krishna-Balaram | 37.8 m ✓ | 37.8 m ✓ |
| side — Gaura-Nitai | **0.3 m** | **21 m** |
| side — Radha-Shyamasundara | **0.3 m** | **21 m** |

The flight now runs ±8.7 m at the bottom to ±7.7 m at the top, covering the
altar bays — which photographs of this hall show in any case, so it is the
truer building as well as the walkable one. The rails start at 8.9 m, clear of
anyone standing at an altar, and they carry a `hall-rail` tag instead of being
anonymous geometry.

**Why every check missed it: they all aim at the middle.** `halls.mjs` walked
door→altar. `steps.mjs` walked the tread centroids, which are on the axis.
`interior.mjs` stands on the axis. The centre altar was always fine.

**And nothing in this suite had ever walked OUT.** A night spent fixing walls
and the one that mattered was behind you. `halls.mjs` now walks out from every
altar a builder publishes, off-axis ones included, and fails anything sealed
within 4 m. Not "reaches the door" — a real building has one door and leaving a
side bay means crossing to it, which is what a person does and not something to
fail a temple for. What is caught is being sealed where you stand.

**Three wrong calls on the way, recorded because the pattern is the lesson.**
My first probe walked TOWARD the Deities and hit the altar rail doing its job;
I reported that as the bug. It was not — the rails measure correctly, seats at
local z 6.2 and rails at 5.15, exactly 1.05 m in front. My second read a
`tail`-truncated output and reasoned from fragments. Both times I listed
colliders NEAR the stuck point and drew a conclusion. The answer only came from
replicating `collide`'s own rejection — same overlap test, same step rule, same
radius — and reporting what was genuinely touching. **Proximity is not
causation, and a probe that lists neighbours will always give you a plausible
wrong answer.**

### "cant come back from deties area" — the whole hunt, and the question I should have asked first

Your report, twice, with the detail that cracked it the second time: **"although
its empty rea between pillars"**.

**Six real faults, all fixed and measured:**

1. **ISKCON's staircase was narrower than the altars it served.** Tapered to
   ±5.7 m at the top tread; the outer Deities stand at ±7.2 m. A pilgrim at
   Gaura-Nitai or Radha-Shyamasundara stood 1.5 m past the end of the stairs.
2. **Its side rails began 0.3 m from those altars.** A body is 0.42 m across,
   so standing at a side altar you were already inside the rail. Centre altar
   walked out 37.8 m; both side altars stopped dead at 0.3 m.
3. **The tamal tree's kerb was a cylinder to the sky.** What is drawn is a
   marble ring 0.45 m high. What was solid was 4.3 m across and infinitely
   tall, in the middle of the courtyard.
4. **Prabhupada's vyasasana likewise** — a seat, with a full-height block round
   it, between the steps and the Deities.
5. **Madan Mohan's sanctum was walled off from its choir.** `bay()` puts a
   solid wall the full width of the spine across every bay's far end. Right for
   the sanctum's back; wrong for the choir, whose far end faces the Deities. The
   cusped arch meant to be the doorway was drawn 0.55 m out of register and
   punched no hole in the collider. **The Deities were sealed in.**
6. **The altar veils were built in the mirror frame.** Centre offset by
   `(sin yaw, cos yaw)` — the panel convention — while `MeshBuilder.box` turns
   by `+rot`, whose local +z is `(-sin yaw, cos yaw)`. They agree only when
   `sin(yaw)` is 0, and every temple in Braj faces a multiple of 90° except
   two. At Madan Mohan (-45°) the 6.2 m veil lay ALONG the darshan aisle — long
   axis anti-parallel to the way out, thin axis perpendicular — so the Deities
   had no screen and a 6 m rail ran down Their own aisle. `-yaw` differs by 180°
   at a right angle, which for a box is no rotation, so the fix is provably a
   no-op at the fifteen that were right.

**And the question I took all night to ask.**

Six seeds and five formulations: flood from the door (not always declared),
from the darshan spot (legitimately outside a small shrine), from the cell
nearest the altar (pressed against a rail); then connected components; then
"does it open out". Each gave a confident wrong answer and I reported the
temple rather than the check, including telling you a set of altar rails were
misplaced when they measure correctly.

What finally showed the error was Govind Dev's stubborn 220 cells. **`collide`
and `standHeight` are symmetric.** If you cannot get INTO somewhere you cannot
get out of it, so a disconnected region is not a trap — it is somewhere nobody
can ever be. Govind Dev is a Greek cross inscribed in a square; those cells are
enclosed lawn in the corners of its platform, and they are fine.

What was reported is **asymmetry**: the step in was possible, the step back was
not. That is what a step-up limit does.

So the check is one line of question — **for every pair of neighbouring cells a
body can stand in, is the step possible in BOTH directions?** Frame-free,
seed-free, needs no door and no anchor, does not care about garden, and every
fault above is one of these. It reports where and how far: "at [x,z] a 0.78 m
drop, in only".

`halls.mjs` 6/6.

**The lesson worth keeping:** four of tonight's faults came from geometry
meaning something other than what the reader assumed — a collider with no `h`
is infinitely tall, `loc.build` is sometimes the building and sometimes the
plot, an anchor can sit inside masonry, and two rotation conventions differ
only where `sin(yaw) != 0`. None is visible. All are measurable. **Probes that
list what is NEAR a failure will always hand you a plausible wrong answer;**
only replicating the engine's own test finds the cause.

---

## Standing instruction — 2026-09-27

> "don't stop ever atleast till 10am as there is a lot of work for you to do and
> if youare done with what's told then continue researching on more places of
> vrindavan and build thme cleanly"

So: work through to 10am Braj time. When the reported list is clear, the work is
**researching more places of Vrindavan and building them cleanly** — same
standard as the sixteen temples: sourced first, built to the sources, no
invented history, and a check before it is called done.

**Standing instruction, 2026-09-27:** *"always show what's running in background
any agent work etc. so i know you are not sitting idle"* — every reply ends with
the running checks, agents and workflows, and what is queued behind them.

### Two live bugs, both mine, both reported after I called them fixed — 2026-09-27

> "still unable to move frmo between the pillars in front of deities and am
> stauck there can't back ? also still curtains are there although it's 4am-9pm
> in the time when curtains shouldn't be there"

**1. THE CURTAINS: two systems owned one `visible` flag.**

`InteriorSystem.update` writes `mesh.visible = (near enough)` to every mesh in
`interiorMeshes`, EVERY FRAME. The night veils are in that list, and `Curtains`
sets their visibility by the hour. InteriorSystem runs last, so walking up to a
temple forced its veil back on.

Measured on a fresh page at **10:26 Braj: `shut` false, and 1 of 37 veils
visible** — the one temple inside the draw distance. That is why it looked
intermittent, and why every check passed: they exercise `Curtains` alone, never
with `InteriorSystem` fighting it.

A mesh whose visibility belongs to another system is no longer offered for
distance culling. Re-measured after: **0 of 37 at 10:28.**

**2. THE PILLARS: Prabhupada's vyasasana was standing in the courtyard.**

`const VZ = HALL_Z + 8.5;` with the comment *"out in the hall, facing the
altars"*. `HALL_Z` is the hall's FRONT LINE, so `+8.5` put it eight and a half
metres out into the open court — a solid 2.6 x 2.2 m block on the walking route
between the steps and the gate. **The comment said one thing and the number did
the opposite**, which is exactly how it survived being read.

Measured on a grid of 36 points — four distances in front of the Deities by
nine across the colonnade — walking out from each:

| across | before | after |
|---|---|---|
| -9 .. -2.5 | 14-17 m | 14-17 m |
| 0 (centre aisle) | 27 m | 27 m |
| **+2.5** | 6.4 / 4.9 / **3.4** / **1.9** | **14.3 / 12.8** |
| **+5** | 6.4 / 4.9 / **3.4** / cannot stand | **14.3** |
| +7.2, +9 | 14-17 m | 14-17 m |

One side of the court only, and the seat was standing in it. It is now in the
hall, level with the altars and hard against the left wall — where a vyasasana
sits in a temple room — clear of the outer altar's rail and of the flight.

**This was my own error, twice compounded.** I moved that seat earlier the same
night, off the centre aisle and then off Gaura-Nitai, and each time solved the
collision in front of me without checking where it had landed.

**And the probe that found it had to be rebuilt first.** The first attempt used
`world.isClear` to decide whether a body could stand at each sample point.
`isClear` is FEET-BLIND — it counts a step as solid — so seven of nine points
reported "cannot stand" before walking at all. Third time that blindness has
misled me in one night. **`isClear` must not be used for anything involving
feet; use `collide` with a real feet height and `standHeight` after it.**

---

## Eight new places, researched and built — 2026-09-27

Standing instruction: *"if youare done with what's told then continue
researching on more places of vrindavan and build thme cleanly"*.

**Ten places researched by 20 agents** — one researching, one independently
verifying each, because the Goswami temples are routinely confused with one
another and three other temples called "Radha Gokulananda" dominate an image
search. ~3M tokens, 65 minutes. Notes kept in `docs/research/<id>.md`.

Locations live in `client/src/content/places.curated.js`, merged by
`content/index.js`. The OSM-generated file is untouched — hand-editing it means
the next import silently discards the work.

### Built

| place | what identifies it, and what would have been wrong |
|---|---|
| **Radha Gokulananda** | **The seventh Goswami temple — the set was incomplete without it.** Flat-roofed and single-storey throughout: no shikhara, no dome, no tower of any kind. The samadhi yard beside the deity hall is the temple — Lokanatha Goswami, Narottama Dasa Thakura and Vishvanatha Chakravarti as six *architecturally different* shrines, because "most visitors come for the three graves, not the altar" |
| **Jaipur Mandir** | A fort, not a temple silhouette. Sawai Madho Singh II's. Flat-roofed everywhere except ONE open five-arched kiosk on the shrine roof, which is the whole vertical event. Not Agra red, not Jaipur pink — dusty pale pink sandstone |
| **Pagal Baba** | A white marble ziggurat, eight storeys each stepping back with an open walk-round gallery. **Every guidebook calls it "Nagara style" and there is no shikhara on it at all.** Footprint 53.1 x 34.9 m measured off OSM, not estimated |
| **Ashta Sakhi** | **The altar is upstairs**, above the shops — a ground-floor sanctum would be the wrong building. Ten figures in a stepped arc on a fan of real peacock feathers |
| **Imli Tala** | The building is single-storey and flat-roofed; what carries the place is the **enormous leaning DEAD trunk in a bare sheet-metal jacket**, rising diagonally out of a white-tiled pedestal. Not living, not upright |
| **Vamsi Vat** | A fused-root banyan on a painted plinth in a court floored **entirely in black-and-white chequerboard marble**. **NOT a ghat** — every text places it on the Yamuna bank and the river has moved; steps down to water would be building the scripture instead of the place |
| **Prachin Mirabai** | **Mirabai stands on the altar as a third Deity**, beside Radha and Krishna — nothing else in Vrindavan does this. Not the Chittorgarh temple, which is what most images labelled "Meera Bai Mandir" actually show |
| **Seva Kunj** | Was a bare walled grove. **You do not enter Seva Kunj — you walk around it inside a green wire tunnel**, reading marble verse-plaques on a sandstone wall at your shoulder, under a corrugated barrel roof that is amber on one run and pale green on the next. Plus the Rang Mahal, its dome the tallest thing on site at 8-10 m, and not a shikhara |

### Researched, NOT built, and why

- **Ter Kadamba** — Rupa Goswami's bhajan-sthali is 33.4 km ESE, 1.7 km from
  Nandgaon village, ~50 km by road. Not in Vrindavan and far outside this
  world's 9.2 x 4.8 km rectangle.
- **Akrur Dham** — 3,127 m south of Banke Bihari against a world edge at 2,700.
  Caught by measurement, not by eye: `halls.mjs` put its altar at z 3127, so it
  was being built on ground that does not exist, which is why its wall line
  read 94.6% open.

Both belong to the Braj expansion, in the directions they lie — Mathura and
Nandgaon. Their research is complete and kept.

### Faults the checks caught in the new builders

- **Gokulananda's deity hall was a solid box with the altar sealed inside it**
  — `halls.mjs` got within 5.2 m and stopped. The same mistake Prem Mandir and
  Katyayani shipped with. Now side and back walls with an open arcaded front.
- **Jaipur had no way in**: the road range closed straight across. And its
  side ranges stopped exactly at the corners, so a ray crossing the ring
  slipped between them — 33.8% of the wall line open for a building with one
  4.2 m gate in a 151 m perimeter.
- **Jaipur's central shrine was a solid block** with the altar inside it.
- **Pagal Baba read 100% open** because the solid mass sits just inside the
  line the check samples, so no ray ever met it. It now has the ground-floor
  darshan hall it has in life.

Twenty-three temples, up from sixteen. `halls` 6/6 · `temples` 4/4 ·
`deities` 15/15 · `planting` 2/2.

### The three the suite caught in the new work — all fixed

- **Ashta Sakhi's internal stair was a ladder.** Fourteen risers over a 4.6 m
  rise is 0.33 m on a 0.30 m tread, a 47-degree pitch. `steps.mjs` measured a
  4.28 m drop over a 3.9 m run. Eased to eighteen at 0.26 on 0.34.
- **Ashta Sakhi was unreachable.** `nav-smoke` found no route to it. Measured:
  a nav node 20.7 m away, but in a DISCONNECTED piece of the graph — a lane
  that is in the map and joins nothing. It is also the one place of the ten
  whose coordinates the research could not settle; the verifying agent
  rejected the first account's position outright and no OSM footprint exists.
  Both accounts agree only that it is a couple of minutes' walk from Banke
  Bihari, so it is placed at 190 m from Banke Bihari on a lane that connects,
  chosen by sweeping for somewhere **beside** a lane, with clear ground for a
  17 x 21 m building, and **routable** — all three tested rather than moved
  and hoped for. The file says the position is approximate and why.
- **`cheats` "the ride keeps going while the map is open"** failed in the suite
  and passes alone: load flakiness, not a fault. Noted rather than chased.

Also measured while there: **Vamsi Vat's location centre reports `isClear`
false** — it is inside its own banyan plinth. Harmless for a marker, but worth
confirming the rickshaw does not try to set anyone down on it.

---

## "no single temple look exactly as it really is" — 2026-09-27

> "keep going with more temple improvements currently no single temple look
> exactly as it really is do research thoroughly and keep going"

**Accepted, and the photographs agree.** Jaipur Mandir came out as a long flat
box with a stripe along it. Ashta Sakhi is a pink box. Imli Tala is a grey wall
with a tree. The MASSING is researched and right — no shikhara where there is
none, a ziggurat where there is one, an altar upstairs where it is upstairs —
but massing is not architecture, and at the moment every temple is boxes plus
cusped arches plus a dome.

What is missing is the vocabulary that makes Indian architecture READ:

- **moulded plinths** (adhisthana) — every one of these buildings stands on a
  banded base, and mine sit flat on the ground
- **string courses and cornices** breaking a wall into horizontal registers
- **bracketed chhajja** with actual brackets, not a slab
- **jharokhas** — projecting balconied windows, which is most of what a Braj
  street front IS
- **parapets** with merlons or railings rather than a bare top edge
- **pilasters** dividing a blank wall into bays
- **colour and weathering** — flat single-tone walls read as cardboard

These are SHARED, not per-temple. The right answer is a detail vocabulary every
builder can call, so a correction to how a plinth works improves sixteen
temples at once — the same reasoning that made `cuspedArch`, `shikhara`,
`chhatri` and `dome` shared helpers in the first place.

### The Braj detail vocabulary — built 2026-09-27

Twelve agents (six features, each independently verified). The first run lost
all six to a network drop mid-flight; retried. Surveys in
`docs/research/detail-*.md` — **five of the six rated "transforms-it"**.

Five shared helpers in `LandmarkGenerator.js`, every number measured rather
than invented:

- **`mouldedPlinth`** — the *kursi*. Not an *adhisthana*: that is South Indian
  vocabulary and does not apply to late-Mughal/Rajput/Jat Braj work, and
  googling it leads to the wrong architecture entirely. Growse's own words for
  the courses are *dasa* (string-course) and *dila* (panel), Memoir p.428.
- **`chhajja`** — the eave ON BRACKETS, one every 1.05 m, with a drip groove.
- **`parapet`** — set back from the wall face, coped, merlons 0.45 x 0.5 m.
- **`jharokha`** — the projecting balconied window on two brackets.
- **`registers`** — string courses and pilasters.
- **`grade` / `weathered`** — "the free half of the fix", costing no triangles.

**Three corrections the research made to code I had already written:**

1. **"A KURSI IS NOT MONOTONIC. It goes out, out, then BACK IN, then out
   again... That one re-entrant neck is the entire difference between a
   moulding and a ziggurat."** My first plinth stepped monotonically inward —
   exactly the named mistake.
2. **Projections do not scale with height.** 0.10-0.18 m per side whether the
   base is 0.45 m or 2.4 m, because a stone course is a stone course whatever
   it carries. The *dila* absorbs the height at 0.40 of the total. Scaling
   everything together is what makes a wedding cake.
3. **The clearance rule** — "the bracket top must clear the arch below it;
   this is what makes it look right, more than the projection does". It is why
   the arch springs at 2.4 m and the eave sits at 3.8-4.2: the gap is where
   the brackets live.

Four plinth classes, far apart, because giving twenty-three temples the same
base is itself a way of looking wrong: lane 0.45 m, compound 1.05, raised
court 1.65, Akbari 1.85.

### Two bugs the photographs found that no check could

- **Five temples were invisible from outside.** They drew into the
  distance-culled interior mesh, right for Krishna Balaram's courtyard and
  wrong for a 27 m building. Photographed from the road, Radha Gokulananda was
  open ground. Every check walks up close, where the mesh is on.
- **A black dome across the sky in every shot.** The game was fine; the TOOL
  was wrong. `_templeshot` stubbed `ctx.time.update` to freeze the phase,
  which also killed the line that centres the sky — so the 4000 m dome stayed
  parked at the player while the camera stood kilometres away, looking at it
  from outside. Also fixed for real play: the sky now follows the CAMERA, not
  the player, which would have bitten on any long cinematic sweep.
- And the shot camera stood 189 m back because it added the whole of
  `grounds`. Right for "is the compound there", useless for "does this look
  like the building".

## 2026-09-27 — The colour correction

> "keep going with more temple improvements currently no single temple look
> exactly as it really is do research thoroughly and keep going"

The geometry work (kursi, chhajja, parapet, jharokha, registers) was real but
it was not the main fault. The research names the main fault flatly:

> "ONE HEX PER BUILDING. This is the actual bug behind 'no single temple looks
> exactly as it really is'. A flat fill cannot look like stone at any level of
> geometric detail."

Two separate causes, both now fixed, and both measured rather than guessed.

### 1. A wall could not vary, because the renderer could not express it

`MeshBuilder.quad()` painted one colour across all four corners, and `tri()`
pushed that same colour to all three vertices. So "one hex per building" was
not a choice any builder made — it was the only thing the vertex format
allowed. Added an optional per-vertex `shade` array down through
`box -> quad -> tri`, and a `b.weather(fn)` context that grades every box
drawn between turning it on and off.

Doing it at the LANDMARK DISPATCH rather than inside each builder means all
23 builders gained it at once and none of them can forget it. Ground, lanes,
walls and crowds are explicitly left unweathered.

Measured before believing it: a 4 m test box came back with a red-channel
range of 1.57:1 across its vertices, and the rendered temple went from flat to
a 1.82:1 value range.

### 2. The palette data itself was washed out

This is the one that mattered, and it was invisible until it was measured.
Sampling the rendered pixels of Radha Raman gave a median saturation of 0.217
— and then sampling the SOURCE data gave 0.244. The renderer was innocent.
Across all 27 landmarks the authored main colours sit at a median S of 0.25,
where photographs of Braj stone measure S 0.50-0.75. Only 8 of 27 were inside
the researched band.

No quantity of chhajjas fixes a building that is the wrong colour.

New `client/src/game/world/BrajPalette.js` carries the researched palette as
14 named constants with the source cited at each one, plus `stone()`,
`vMul()`, `sunTop()`, `dusted()`, `shade()` and `correct()`. `correct()` keeps
each building's authored HUE — that carries the intent — and fixes only
saturation and value, which do not. Marble is exempt, because white buildings
really are unsaturated and lifting them turns Prem Mandir pink.

### A disagreement inside the research, recorded rather than smoothed over

The colour survey gives a vertical ramp, `0.58 + 0.42 * min(1, y/(0.30H))`,
and separately gives the measurement it came from: Govind Dev at V 17% / 32% /
48% / 78% at 1 / 3 / 6 / 12 m, "ratio top:bottom = 4.5:1".

**The formula does not reproduce its own measurement.** It saturates at 0.30H
— full brightness from 5.1 m up on a 17 m building — while the measurement is
still climbing at 12 m. And 0.58-to-1.0 is 1.7:1, not 4.5:1. Fitting the four
measured points gives roughly `(y/H)^0.65`, normalised at 0.7H.

Implemented the FORMULA, not the fit, deliberately: the 4.5:1 is a photograph,
which already contains the lighting, and this engine lights the scene itself.
Pushing the whole photographic range into the albedo would count the sun
twice and read as soot. Noted here because the next person to measure a
screenshot against the research will find the same gap and should not have to
rediscover which half is which.

### Still to do

- Apply `stone()` per course in the builders. Only the vertical ramp is wired
  so far; the grade-swapping and course jitter are written and unused.
- §C shade multipliers, especially `arch: 0.16` — an arch should read as a
  HOLE, measured V 6% against a wall at V 78%.
- §E streaks: only ever below a cornice, drip edge or sill, never on plain
  ashlar, because "dirt lives where carving is". 24-40 triangles per temple.
- §F painted soffits — every chhajja underside is a different colour from the
  wall, and currently none of them are.

### A general rule must not overrule a specific measurement

`correct()` lifts washed-out colours into the researched band. It ran over
Jaipur Mandir and turned it brick red — and Jaipur Mandir's own survey says,
in as many words, "not Agra/Fatehpur red and not Jaipur 'pink city' pink".

The data was already right. Someone had measured the building off 24
photographs at 2048x1152 and written `#d8a898` into the file with a comment
explaining why. `correct()` saw a warm hue at S 0.30, could not tell a
measurement from a guess, assumed a guess, and destroyed it.

This is the same shape as four earlier faults in this project: a piece of code
reading geometry as meaning something other than what the author meant. The
fix is to make the distinction explicit rather than to tune the heuristic —
`measured: true` on a build block means hands off, and every place with a
survey in docs/research/ now carries it.

Worth stating plainly because the temptation was to adjust the saturation
threshold until Jaipur Mandir happened to fall on the right side of it. That
would have left the same bug in place for the next measured colour.

### And a note on what the photographs are for

Two conclusions I was about to act on, both wrong, both killed by checking:

- **Jaipur Mandir "needs a tower".** It reads as a long low red mass with no
  vertical accent, which looked like a bug. The survey: "no tower at all, and
  a single arched-roof kiosk on the shrine roof as its only skyline." The
  massing was correct and the colour was the fault.
- **Every temple looked like a roof.** The shot camera stood 44 m above a
  20 m building. Flattening the massing is precisely what a near-plan view
  does, and I nearly rebuilt a temple to fix a lens. The camera now derives
  its height from a fixed 18-degree look-down, which holds the same framing
  at 60 m and at 150 m — at head height it had been landing inside trees on
  the big sites.

## 2026-09-27 — The lane temple is the wrong building type

New survey, docs/research/lane-temple.md. It does not correct a detail; it
corrects the TYPE. The ordinary Vrindavan mandir is not a temple-shaped
object at all — it is a house with a gate.

> "…this being a house of a God, has had a garbhagriha facing the East and
> the arcades on the other three sides of the courtyard in a tri-partite
> composition. **While no domes or soaring shikhar towers drew attention to
> the building, the entry gate known as gokhe is emphasized by porches on
> either side of the main door and the jharokhas (balconies) above.** This
> introverted building type … has become the norm in Vrindavan."
> — Sinha & Dhariwal, ISVS e-journal 11.10 (2024), summarising Nath 1996
>   and Jain 2007

60-70% have no tower at all. They are party-walled slots, 5-9 m on the lane
and 2.5-3.5x that deep, with neighbours TALLER than them, ONE opening on the
ground floor, and a plinth that is a public bench running past the building
on both sides. Red sandstone is right for about 1% of them — it belongs to
the ASI sixteenth-century group, and this project had been applying the
Growse-era monumental vocabulary to buildings it was never about. That is
precisely why five documents of detail research had not fixed the ordinary
lane.

`temple-small-plain` rewritten accordingly: bench plinth buried 0.06 m, flat
roof, gokhe with flanking porches and a jharokha over it, name band, municipal
board, tin notice, raised parapet across the gate bay only, water tank, and a
shikhara on 18% of them standing at the BACK of the plot where the lane
cannot see it.

### Town-wide, from the same survey

- **The red-oxide skirting**, over a hard-edged damp band. "One of the most
  reliable small features in the whole town and it costs one box." The damp
  is what the oxide exists to hide, so the damp goes on first and the oxide
  covers its lower half.
- **The vertical ramp now runs on the town, not only on temples.** Every lot
  was one flat hex on all four faces at every height.
- **The roof kit**, rebuilt. The water tank was a 1 m cube lying on the slab
  at 55% of roofs; it is now on its mild-steel stand with an inlet pipe at
  84%, because the stand is most of what you see. Plus the monkey cage —
  "houses are grilled with metal so that monkeys can't enter", which is
  specific to this town and does more for recognisability than a shikhara
  would — and the mumty at the stair head.
- **The wires.** "If your lanes have no overhead wires they will look wrong
  no matter what the buildings do." Electric poles were turning up on about
  one site in six; the bundle is now three wires rather than one, there is a
  junction box and a coil of slack at half the poles, and every pole throws
  1-3 thin service drops across the lane to the facades.

### One thing that nearly shipped broken

The service-drop drawing loop did not get inserted — the edit's anchor did not
match and the replacement failed silently. `drop` was populated on every pole
and never drawn. `node -c` passes happily on that, and the checks would have
passed too, because nothing asserts on a wire. It was caught only by grepping
for the comment afterwards to confirm the edit had landed.

Worth the note: a scripted edit that silently no-ops is indistinguishable
from a successful one unless you go and look.

### Explicitly NOT built, because it would be inventing

The survey is unusually clear about its own limits and they are recorded in
the research file: no invented hex for the MVDA "postcard colour" or "heritage
colour" (the notice names them in words only), no MVDA height limit in metres
(the restriction "remained only on paper" and no number is published), no plan
geometry for any of the eleven named Madhya Pradesh-owned temples (the record
gives no measurements, no room counts, no areas), the "5,000 temples" figure
is flavour and never data, and no photograph pixels baked into textures.

### Half the `-plain` builders are dead code

Checked after rewriting `temple-small-plain` and photographing the result,
which showed no change at all. Every one of the 27 landmarks has a
purpose-built builder except Govind Dev. The three dispatchers override by id:

| dispatcher | overridden ids | fallback | fallback actually reached by |
|---|---|---|---|
| `temple-small` | katyayani, gopishwar-mahadev | `temple-small-plain` | **nothing** |
| `temple-redstone` | madan-mohan, jugal-kishore | `temple-redstone-plain` | **nothing** |
| `temple-truncated` | radha-gopinath | `temple-truncated-plain` | govind-dev |

So the haveli-temple rewrite is correct and renders on no building today. It
stays as the reference implementation of the type and as the fallback, and
that is now stated at the top of it so the next reader does not spend an
afternoon wondering why a photograph will not change.

This also retires the earlier audit that counted "23 builders lacking the
detail vocabulary" as a to-do list. Several of those 23 are unreachable. The
real remaining per-building work is the 25 named builders, and the two that
matter most are the two currently under research: Banke Bihari, which is the
most-visited temple in Vrindavan and renders as a cream barracks, and Govind
Dev, which is the only landmark still going through a `-plain` builder.

## 2026-09-27 — Banke Bihari rebuilt from survey

Full survey in docs/research/banke-bihari.md — Growse's eyewitness text,
photogrammetry off Commons photographs, ESRI satellite at z19, Overpass, and
a Hindi/English news-court-ASI search. Six faults named, in order of cost:

1. **The openings are not rectangular.** Multifoil cusped arches throughout,
   and the top storey is **81% void** — a screen of columns, not a wall with
   holes. Measured by automated void detection: nine bays in 3 | 3 | 3, pier
   gap 1.27x a normal bay, void:pitch 0.81. We drew a solid wall and punched
   arch reliefs into it, which gets the ratio backwards.
2. **Two colossal stacked chhajjas**, each a carved fascia + a dense
   continuous row of bulbous turned pendants at ~0.25 m pitch + a row of large
   tapering corbels. Growse's single adjectival phrase for this building in
   1883 is **"the extremely bold projection of its eaves."** We had a 0.42 m
   string course, which is a moulding, not an eave.
3. **The roofline is not flat** — a jali parapet full width, broken dead
   centre by one three-bay kiosk with a curved **bangaldar** roof and a
   flagstaff. Measured at x=2050 px against an arcade centre of x=2048, so
   dead-centre is a hard rule, not an approximation.
4. **It is not cream, it is red sandstone.**
5. **It does not stand in a field.**
6. **The courtyard is roofed**, on iron girders.

Also: the two storeys use DIFFERENT ARCH GRAMMARS — nine big lobes on the
ground arch, ~20 tiny scallops on the top arcade. Passing 5 lobes to both is
the easiest way to make this facade generic. And the middle storey is the one
place the arcuated language stops: short square piers, rectangular openings,
a low band largely in shadow. The storey heights were [5.2, 4.4, 3.6] —
descending, which inverts the building; they are now [6.5, 3.2, 5.0].

### Removed, each on an explicit finding

- **Four corner chhatris.** "Corner chhatris or corner towers: not visible."
- **The dome over the sanctum.** "The kiosk roof is a curved bangaldar barrel
  with rolled ends, not a dome."

It is a horizontal building with exactly one vertical accent.

### The shikhara trap, recorded because I nearly fell into it

The June 2026 ASI report in Amar Ujala says work will fill open joints in the
walls, chhajjas and the **शिखर**, and fill cracks on the शिखर. Read in
English that is a tower. In Hindi शिखर routinely means simply the top or the
crown, and every photograph shows a kiosk and no tower. The survey flags it by
name: "Do not build a shikhara on the strength of that word."

### Two states, and which one this is

State 1 is the dusty pink-buff of the 2010-2012 photographs and it is the one
with MEASURED hexes — #eadacb sunlit, #b79c89 in shade, hue drifting H 7-39 at
S 11-33%, which is why the same wall gets called cream and ochre and pink-red
by different people. State 2 is today: in June 2026 the ASI stripped the
yellowed polymer coating that had trapped moisture and hollowed the stone, and
polished it back to natural red sandstone.

**Built State 2, and the colour is INFERRED rather than measured** — from the
Braj red-sandstone family, because every exterior photograph that exists
predates the restoration. Said so at the value.

Height set to 17 m to the main parapet, from the survey's estimate range of
15-17. Explicitly NOT the 169.77 m that Hindi Wikipedia prints and every blog
copies: English Wikipedia labels that field *Elevation*, i.e. height above sea
level.

### Still wrong, and it is the fault that matters most

**The setting.** Satellite at 0.265 m/px shows no open ground of any kind
within 100 m — a continuous unbroken carpet of flat roofs, lanes appearing
only as thin dark cracks, many bridged by awnings and upper floors. The
approach is 1.8 m at its narrowest. **You cannot see the temple from any
distance. Zero.** Ours stands in a field. That is the keep-out radius, and it
needs the party-wall treatment a circle cannot express.

---

## 2026-09-27 — Govind Dev Mandir survey requested (research only, nothing built)

**Request.** "I am currently drawing it as a red sandstone block with a large
ONION DOME on top and a gold finial. I strongly suspect the dome is wrong."
Resolve the surviving silhouette, plan, elevation, material/colour, setting,
and a do-not-build list, from Growse 1883, ASI and academic sources.

**Status: RESEARCHED, NOT BUILT.** No code touched. Findings returned to the
caller; the model still has the wrong roof until someone changes it.

**The verdict, short.** The onion dome and the gold finial are both wrong and
must be deleted. There is a dome, but it is *internal only* — a Hindu corbel-
and-arch dome over the crossing, invisible from outside. Externally the
building is **flat and stepped, with no finial anywhere on the main mass.**
Growse, 3rd ed. p.243: the loss of the towers and parapet "has terribly marred
the effect of the exterior and given it a heavy stunted appearance."

**Nothing tall ever stood over the crossing.** Growse p.249: "The tower over
the central dome was also, as I conjecture, never carried higher than we now
see it." 2nd/3rd ed. p.256: the central dome "is perfect; but it is impossible
to determine ... what would have been the outline and proportions of the tower
that the architect proposed to raise over it." Five towers were *intended*; two
chapel towers were never finished, the sanctum tower was razed with the sanctum,
and only the choir (jagmohan) tower was ever completed — it stands west/behind,
truncated, a stepped saw-tooth pyramid with a **flat top and no finial**
(Growse restored it in 1873-77 but Sir John Strachey forbade replacing the
finial and top stages).

**Key numbers.** Cruciform body 117 ft E-W x 105 ft N-S (Fergusson/Burgess 1910,
Book VI); Growse rounds the interior to 100 x 100 ft. Walls 10 ft thick, two
stages, upper stage a true triforium. Arm vaults 23.5 ft span, crossing 35 ft.
Narthex 15 ft deep; choir, sanctum and each side chapel 20 x 20 ft. Whole
envelope from satellite ~56 x 34 m (184 x 113 ft). Surviving height ESTIMATED
15-20 m from photographs — no documented figure found.

**The "seven storeys" claim is tradition, not documentation.** Growse never
says it; nor does Fergusson. Build three external tiers, not seven minus four.

**The setting is the second error.** Ours stands in an empty field. It does not.
Murray's 1858 photograph shows houses against the walls; Growse cleared some in
1873; modern photographs show multi-storey buildings hard against the east front,
overhead power lines across the facade, and an ASI board at the foot of the
steps. The modern Govind Dev temple (c.1819) is attached immediately **behind**
(west), on the site of the destroyed sanctum.

### The setting: a circle could not say it

The keep-out that stops the town building on a landmark was a CIRCLE, and a
circle has only two settings here: leave a moat all the way round, or let a
generated house land on the spot the game walks you to for darshan. Neither is
Vrindavan. What the town actually does is build hard against the sides and the
back and leave only the approach.

So it is now an ORIENTED RECTANGLE — a deep pad on the front (half the
footprint plus 7 m, which clears the darshan anchor at +5.5) and a shallow one
on the other three sides. Landmarks with an explicit `grounds` keep their
circle: Krishna Balaram's campus and Prem Mandir's park are real open ground,
and crowding those would be the same mistake pointing the other way.

**Measured, not assumed:** the nearest building collider to Banke Bihari is
now 28.3 m from its centre against a 25 m half-footprint — **3.3 m off the
wall**. Before, nothing came within 32 m of the centre.

### A margin no check could have caught

The first version used 0.8 m, which is what "party-walled" sounds like. But
`w` and `d` are the WALLS and the builders draw past them: Banke Bihari's
plinth was `w + 5`, i.e. 2.5 m proud on each side, and a chhajja reaches
1.55 m. At 0.8 m the town would have built houses standing on the temple's own
plinth, and the suite would have stayed green through all of it — every check
in it asks whether you can walk somewhere, not whether two things are inside
each other. Widened to 3 m by reading what the builders actually draw.

### And the plinth itself was the plaza

After all that the photograph still showed a temple in a field, and the field
turned out to be the temple's own base: `w + 5` by `d + 5` is a 49 x 55 m
skirt of pale stone. There is no plaza at Banke Bihari — the corridor scheme
that would build one is at 14 registries and 1,386 m² in ten months as of May
2026. Narrowed to `w + 1.6`, with the one thing that IS there put at the gate:
a raised platform with a turned-baluster stone railing, where the flower
sellers stand.

Worth keeping in mind as a pattern: three separate causes, all producing the
identical symptom "the temple stands in a field", and fixing any one of them
alone would have looked like it had failed.

## 2026-09-27 — Four reports from play

Logged on arrival, per the standing rule.

1. **`m` could not be typed into the map search box.** Fixed. The UI
   registered a SECOND window keydown listener beside InputManager's, and
   only InputManager had the `_isTyping` guard it has carried since it was
   written. So `m` toggled the map out from under you on the first keystroke
   — and most of Vrindavan has an m in it: Madan Mohan, Prem Mandir, Imli
   Tala, and the word "mandir" itself. Escape now blurs the field instead of
   closing the screen, which is what every other search box does. Regression
   checks added to map-search.

2. **The e-rickshaw offers only a handful of destinations.** Radha Madan
   Mohan and others cannot be asked for at all. Wants search in the fare
   dialog, the same as the map has. NOT YET DONE.

3. **Prem Mandir does not look like Prem Mandir.** NOT YET DONE. A survey
   came back from the temple workflow tonight and has not been applied. Note
   for whoever picks this up: the ask was "same images as the real one", and
   photographs of Prem Mandir are under copyright — docs/DATA-SOURCES.md
   already rules out baking photograph pixels into textures. Model it from
   measurement instead, which is what every other temple here does.

4. **You vanish UNDER the stairs at Prem Mandir instead of stepping up.**
   NOT YET DONE, and this is the serious one — falling through a staircase is
   worse than being blocked by one. Suspect the same family as tonight's
   ISKCON cage: a step collider whose `h` is missing or whose `standOnly` is
   dropped, so `standHeight` never offers the tread and the body keeps the
   ground below.

## 2026-09-27 — Five temple surveys, and a disagreement kept rather than settled

A workflow ran five surveys with an independent checker on each whose brief
was to refute the first. All ten agents returned clean. Written up to
docs/research/{prem-mandir,radha-vallabh,iskcon-krishna-balaram,shahji,
rangaji}.md, each carrying its own "what NOT to build", its own uncertainty
list, and the checker's corrections.

Prem Mandir was applied in full — see the commit. The other four are queued.

### The ISKCON dome conflict, recorded and NOT resolved

The new survey says the main temple is "LOW, FLAT-ROOFED… with no spire at
all" and that the three-dome composition belongs on Prabhupada's Samadhi
instead: "You have the composition inverted, and you have it on the wrong
building."

The builder's existing comment says the opposite, and cites its evidence:
"Verified off two independent Commons photographs taken through the samadhi's
arch: the centre is an open chhatri on short dark columns under a large
ribbed dome with a stacked finial, the flanking two are lower solid domes on
square drums."

**The geometry was NOT changed.** The new survey lists this as THE BIGGEST
item in its own uncertainty section, and its evidence is inferential — where
a signboard places things, and a spire not appearing in street photographs.
Direct photographs of the object beat an argument from absence. If someone
resolves this later, the deciding evidence would be a photograph taken from
inside the courtyard looking up, which neither survey has.

What WAS taken from the survey, because it is unambiguous and additive:

- **The bangaldar eave.** "The single most distinctive line in the whole
  complex and it is easy to miss: the eave is NOT straight. It is a chain of
  shallow downward-curving ogee/cyma sweeps, one per bay." We drew a flat
  slab. Now a cosine dip per bay, deepest mid-bay, lifting at each pilaster.
- **The domes are gadrooned and LOW** — "20-28 fat lobes… wider than they are
  tall". They were 14 ribs and taller than wide, which reads as an onion.

Already present and confirmed by the survey rather than added: the great
cusped arch at 8.2 m span against its "roughly 8-11 m", the Samadhi's 70 ft
shikhara, the black-and-white chequerboard on the diagonal.

### The sunken courtyard, deliberately still flush

The survey says the court centre sits 0.45-0.60 m below the ambulatory. The
builder's comment declines to model it, reasoning that "nothing in this engine
climbs, so every centimetre of level change indoors is a centimetre the player
stands buried in".

**That reasoning is now wrong** — the engine climbs anything under STEP_UP
(0.52 m) given a collider, which is exactly what tonight's Prem Mandir fix
proved. But the decision stands for now, because the player is actively
reporting being trapped at this very temple and a new half-metre level change
is a new chance to trap them. Revisit once the collision complaints stop.

## 2026-09-28 06:30 — Stopping point

The "keep going till 10am" mandate was for 10am on the 27th, not the 28th.
Clarified by the user after the fact; work continued about 20 hours past it.
Recorded here so the next session does not read the earlier entries as a
standing instruction to run unattended.

Everything is committed and pushed. Working tree clean at c2edf87.

### Research filed and NOT yet built

Ten surveys are now on disk that no geometry has been drawn from. Each has
its own "what NOT to build" and its own uncertainty list, and each was
checked by a second agent whose brief was to refute the first.

| survey | what it says we have wrong |
|---|---|
| `rangaji.md` | a 236 x 135 m walled temple-city, five concentric prakaras, a 28.35 m gatehouse and a seven-tala gopuram. Ours is a 70 x 110 generic block. |
| `shahji.md` | "not a temple in any Indian temple sense at all: a single-storey Lucknow/Awadhi palace pavilion" |
| `radha-vallabh.md` | TWO buildings on one cramped bazaar plot — a derelict early-17th-century hall-temple and a later one. We build one generic gable temple. |
| `madan-mohan.md` | a RUINED 16th-century hall-and-sanctum temple |
| `radha-raman.md` | "a modest two-storey Braj haveli-temple rebuilt in 1826 by a Lucknow banker" |
| `radha-damodar.md` | "not a temple at all in the shikhara sense" |
| `radha-gopinath.md` | "a small, east-facing, LINEAR red-sandstone shrine" |
| `jugal-kishore.md` | ASI N-UP-A196, 1627 CE, two-storey |

Note the pattern across all eight: every one of them says the building is
SMALLER, PLAINER and LESS TOWER-LIKE than the generic builder assumes. That
is the same finding as docs/research/lane-temple.md — this project's default
instinct is to make Vrindavan grander than it is.

### The one thing still open from play

Whether the player can now get out of the ISKCON hall. The hall-rail cage is
removed and proven (escape distance 8.6 m -> 20.9 m) and an unstick is in, but
it has not been confirmed by the person who kept getting trapped. If it
recurs, the console now logs `[player] unstuck from X Z` and that coordinate
is worth more than any further probing from this end — four probes were
written against guessed positions and all four found my own errors instead.

## 2026-09-29 — "Start from here", and a note on recovery

> "i am stuck in somewhere so implement something like there sould be option
> in map as 'start from here' on searching a location so we directly start
> from there instead of chhatikara again? any other way to restart from
> somewhere"

Built. Search a place, open its panel, and there is a quiet second button
beside "Walk here". New `Player.placeAt()` does the placing.

Two decisions worth keeping:

- **It does not drop you on the coordinate asked for.** It lands on the
  DARSHAN ANCHOR where the builder publishes one — the spot the game already
  walks you to, therefore already proven standable — and then searches
  outward from there for ground a body can stand on. Teleporting somebody
  precisely into a wall would be a new way to be stuck, not a way out of the
  old one. If nothing standable is found within 30 m it says so and does
  nothing rather than moving you somewhere worse.
- **It uses collide() and standHeight(), never isClear().** isClear is
  feet-blind and has now caused three wrong diagnoses in this project.

### The test is a rescue, not a teleport

`map-search` now buries the player inside Banke Bihari's masonry, calls the
button, and then checks they can WALK — 8 directions probed with the engine's
own step rules, requiring at least 5 of them to give more than 1.5 m. A
placement that lands you somewhere you cannot move from would pass a "did the
position change" assertion and fail the person holding the phone. 26/26.

### Three layers of recovery now exist, and they are for different failures

1. **The automatic unstick** — you are pressing a direction and covering
   under 12% of it for 1.5 s. Silent wedges while walking.
2. **Start from here** — you are stuck in a way the unstick cannot solve, or
   simply want to be elsewhere. Needs you to open the map.
3. **`?reset`** — clears the save entirely. The last resort, and it puts you
   back at Chhatikara, which is exactly what the player was complaining about.

What is still missing is a reason for (1) and (2) to be needed at all. Every
`[player] unstuck from X Z` in the console is a geometry bug with a
coordinate attached, and nobody has yet read one back.

## 2026-09-29 — The curtains proved themselves by breaking a test

> "i hope in every temple it's added like cron such that at 4am curtains auto
> open and 9pm auto close even if user is in front of deities?"

Yes, and it demonstrated it without being asked. The suite failed with
`Night:radha-damodar` blocking the sightline to the Deity. The clock said
**21:01 IST**. The temples had shut one minute earlier, on their own, while a
check happened to be looking at one.

So the product was right and the CHECK was wrong. "Nothing stands between the
devotee and the Deity" is only true during darshan hours; after 21:00 a
curtain stands between them on purpose. That probe now pins the clock to
13:00 and restores it afterwards. A check that passes by day and fails by
night is not testing the thing it names — the same class as the fixed sleeps
found earlier, where a test depended on ambient state it never controlled.

### How the coverage is actually guaranteed

Not by a list of temples, which would rot. `Curtain` traverses the WHOLE
SCENE for meshes named `Night:`, so a temple is covered the moment its
builder emits one. And `deities` asserts `unveiled === 0` across every
location with an altar, counting per-ALTAR rather than per-temple — which is
how "curtains only cover the centre deities in iskcon" was caught before.

It re-checks once a second, every frame, and applies on change with no
proximity condition anywhere in it. That is what makes it a clock and not a
trigger.

It reads Vrindavan's wall clock through LiveConditions, not the device's, so
a pilgrim opening this abroad still finds the temples open when they are open
in Braj.

### One thing I nearly did badly

I wrote a fresh set of hour-boundary assertions before noticing deities.mjs
ALREADY had them, and more thorough ones — 0, 3.0, 3.99, 4.0, 4.5, 9, 15,
20.99, 21.0, 23.5. Removed mine rather than leave two tests drifting apart.
Worth a look before adding a check: this file is long enough that the
duplicate only surfaced as "Identifier 'hours' has already been declared".

## 2026-09-30 — Queued requests

> "go ahead doont stop without all these built"

The standing list, in working order: the eight surveyed temples (Rangaji,
Shahji, Radha Vallabh, Madan Mohan, Radha Raman, Radha Damodar, Radha
Gopinath, Jugal Kishore); the D-pad sitting over the virtual stick; offline
on the web (service worker + manifest); the fixed sleeps still in chatter,
cheats and dpad-dir. Road names and the Kripalu Marg way are still waiting
on the user and cannot be done from here without guessing.

> "make sure we are as good as live real ones"

Taken as the acceptance bar for every temple: build from the survey AND the
independent checker's corrections, photograph it, and measure the render
against the survey's own numbers before calling it done.

> "can we have live data like crowd show here from iskcon vrindavan youtube
> channel or somewhat?"

Feasibility, before any code:

- **Counting people out of a YouTube stream is not possible here.** It needs
  the video frames, which YouTube's terms do not allow downloading or
  processing, a backend to run vision on them, and a network — while the
  first constraint in the brief is that the world renders offline.
- **Embedding the official live darshan IS allowed** — that is what YouTube's
  embedded player exists for. Standing at the darshan spot could offer "Live
  darshan from ISKCON Vrindavan" through the privacy-enhanced
  youtube-nocookie.com player, degrading to a plain message offline. The
  channel id must be looked up and verified, not guessed.
- **A crowd that follows the real calendar needs no network at all.** The
  Supreme Court recited Banke Bihari's footfall on 15 May 2025 as
  30,000-40,000 a day, 1.5 lakh at weekends and 5 lakh on Janmashtami
  (docs/research/banke-bihari.md). Day of week, the arti hours and the real
  festival calendar can drive crowd density honestly, from published figures,
  with nothing to download.

Queued after the temples unless the user reorders it.

## 2026-09-30 — Eight of ten research files had the wrong fact-checker attached

Found while reading Rangaji's survey before building it: its "Independent
check" section was about the nave at Harideva and "Radhavallabh Ghera". It was
Radha Vallabh's checker.

Cause: the filing script paired `surveys[i]` with `verdicts[i]`, assuming both
lists came back from the workflow in the same order. They complete whenever
each agent finishes, so they did not:

| batch 1 survey order | batch 1 verdict order |
|---|---|
| prem-mandir, radha-vallabh, iskcon, shahji, rangaji | prem-mandir, shahji, rangaji, iskcon, radha-vallabh |

Only prem-mandir lined up in batch 1, only radha-damodar in batch 2. The
second batch "fixed" the surveys by matching on content — and then paired the
verdicts by index anyway, so the same fault survived its own supposed fix.

**Fixed from the authority, not by inference.** The workflow journal records a
`key` on every `started` event alongside its `label` (survey:rangaji,
verify:rangaji, ...), and the same `key` on the `result`. Joining on that key
is exact. All ten files rewritten; each now carries a line saying so. Spot
check: every checker's first correction now names its own temple.

### What the correct checkers changed

- **ISKCON, and it settles last night's argument.** The survey said the main
  temple is flat-roofed and domeless. The ISKCON checker — which I had not
  actually read, because Rangaji's was filed in its place — opens with "THE
  CENTRAL CLAIM IS WRONG: the main temple is NOT domeless." Keeping the three
  domes was right. It was right on reasoning (direct photographs beat an
  argument from absence); it is now right on evidence.
- **Prem Mandir, already built, has two real corrections** — see below.

The lesson generalises past this script: two lists that describe the same
things are only parallel if something MAKES them parallel. Completion order
never does.

## 2026-09-30 — "nothing looks real, and I cannot enter any house"

> "yes fix everything nothing looks real and am unable to enter any house like
> pokemon rpg as it should, we have to make it exact real feel with as much as
> near live data"

Logged on arrival. Three findings already in hand when it came in:

1. **An arch-orientation bug, measured.** `cuspedArch` spans along
   (cos R, sin R). Extracted and run in isolation with a 4 m arch at builder
   rot 0: passing `rot` spans 4.0 m along the long axis and 0.6 m across it;
   passing `rot + PI/2` spans 0.6 along and 4.0 across. So every call that
   passes `rot + PI/2` for an arch in a wall running along the builder's long
   axis draws that arch PERPENDICULAR to its own wall — a fin, not an opening.
   The ISKCON builder uses `rot` for its doorway and `rot + PI/2` for its
   verandah, on walls running the same way, so the codebase disagrees with
   itself. Prem Mandir's entire colonnade and door use the wrong one, and so
   does the Banke Bihari top arcade written on the 27th, copied from the
   verandah pattern.
2. **Prem Mandir faces the wrong way.** Its entrance and broad steps are on
   the south; the checker puts a 35.5 m forecourt and the steps on the EAST,
   the sanctum west, the shikhara at 18.5% from the west end. The shikhara was
   pushed NORTH.
3. **House entry has never been tested by walking.** interior.mjs puts the
   player in the middle of a room with `position.set` and asserts the room
   notices. A house whose doorway is blocked passes that test.

Order: houses first (a functional break the user cannot get past), then the
arch audit (one fix, many buildings), then Prem Mandir, then the rest.

### The houses: 120 of 120 doorways had a painting across them

Walking a test player from the street through the door got into 150 of 150
houses — the collision was never the fault. Photographing three doors from
where a person stands found it at once: every doorway was filled edge to edge
by a lila mural. Putana Uddhar over a courtyard house, Vastra Haran over a
tea stall, Jhulan over a hut. You do not walk into a painting.

`_mural`'s comment always said "above head height". It was centred at
2.05 m and up to 2.9 m square — spanning about 0.6-3.5 m against a door
opening of 0.7-3.2 m on the facade's own numbers. The words were right and
the arithmetic never was. It now goes in the only clear band a street face
has, between the ground-floor lintel and the first-floor sills, and only on
buildings actually tall enough to have that band.

The same photographs caught two faults of mine from 2026-09-27:

- **The red-oxide skirting and damp band were drawn reflected.** This file's
  own note says "Solids and colliders take `solid`; panels take `rot`" —
  box() and panel() are mirror frames — and I handed `rot` to a box. On every
  building not square to the axes they jutted diagonally into the street as a
  knee-high dark slab and a red one.
- **They ran straight across every doorway**, as one solid box round the
  base. Now four runs, the front split either side of the door.

And a quieter one: **`lot.h` was read in two places and set in none**, so the
weathering ramp used a flat 8 m for every building in town. Heights are now
measured from each kit's own vertices as it draws.

**`houses.mjs`**, new in the suite: walks into 120 houses AND casts rays from
a person's eye at each door opening, failing if a mural is the first thing
hit. Mutation-tested: restoring the old placement fails it with 120 of 120
doorways painted over. A check that cannot fail proves nothing.

> "make sure all temples, etc. look exactly as they really are do research for
> that and improve, currently nothing looks real"

Reaffirmation of QUEUE items 2-4 (arch orientation, Prem Mandir, the eight
surveyed temples), logged as such rather than as a new item.

### 211 arches stood across their own walls

An audit that knows nothing about any builder's conventions: every arch the
world builds is recorded with its call site (LandmarkGenerator's opt-in
recorder), matched to the wall collider it sits alongside, and tested for
parallel. First run: **211 of 254 judged arches — 83% — stood across their
walls**, over 18 landmarks. Banke Bihari 86 of 89 (mine, 2026-09-27), Prem
Mandir 38 of 39, Jaipur Mandir 44 of 85, every arch at Kaliya Ghat. Photographed
at Prem Mandir first: its south colonnade showed piers and thin pale slivers
between them — an arch seen edge-on — and not one arch shape.

Four causes, one symptom:

1. **`rot + PI/2` copied onto long-axis walls.** cuspedArch spans along
   (cos R, sin R). Measured in isolation, `rot` lies in a long-axis wall and
   `rot + PI/2` stands across it. The ISKCON builder used both on walls
   running the same way, and the wrong one spread. 16 call sites.
2. **My eight builders of 2026-09-27 were written in the mirror frame** — p()
   with lx along (cos, -sin) — while drawing every box, arch and collider in
   the box frame. At rot 0 invisible; at Jaipur Mandir's 15 degrees every
   part was positioned along one line and oriented along another, 30 degrees
   apart. Converted Jaipur to the box frame, and put it at the 2 degrees its
   survey measured off OSM (bearing 92). 15 was never sourced.
3. **The ghat facades** were drawn in the box frame behind steps TerrainBuilder
   cuts in the mirror frame. Everything now takes `solid = -rot`, as
   BuildingGenerator's houses do.
4. **The audit itself, twice.** Its first cut flagged correct ISKCON bays:
   once against the perpendicular wall ending at a corner, once against a
   staircase tread 3 m below the arch. It now judges an arch only against a
   wall it sits alongside and that actually reaches it. Read by hand, the
   ISKCON code was right.

Result: **0 across, 0 oblique, 267 judged**, guarded by `arches.mjs`.

Then the aperture. Fixed in orientation, Prem Mandir's arches were faint
outlines: the dark aperture was drawn once, to one side of the arch's mid-plane,
and on that face it was inside the wall's solid box. Drawn on both faces now.
That broke one thing, and the suite caught it — the haveli's SANCTUM arch,
which frames the Deities and is looked through, had been taking the default
aperture by omission; its near copy stood 0.2 m in front of Radha Damodar.
Now `null`, as an opening you look through should be.

Three photographs tell it: slivers; faint outlines; clear multi-lobed arches.

### The threshold, and InteriorSystem's frame

Houses are built in the mirror frame (see `solid`); InteriorSystem read their
rotation in the box frame. Measured over all 721: **154 did not notice you step
1.2 m in through the door, and 42 lifted the roof while you stood 1.2 m out in
the lane.** Crossing the threshold IS the Pokemon moment, so this is the one
place the rectangle has to be exact. Now 721/721 both ways, in `houses.mjs`.

Full suite: 29/29 after the sanctum fix.
