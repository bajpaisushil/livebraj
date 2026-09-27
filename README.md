# Vrindavan Dham

> Don't just play. Visit the Dham.

A peaceful third-person open-world virtual pilgrimage through Vrindavan, Braj.
No combat, no enemies, no score, no leaderboards, no timers, no fail states.

The long-term goal is an interactive representation of the 84 Kos Braj region.
**V1 is Vrindavan only**, built as a polished vertical slice rather than a large
unfinished map.

---

## What exists today

A playable vertical slice under `client/`, built on real geography.

| | |
|---|---|
| World | 4.2 km × 4.2 km, centred on Shri Banke Bihari Mandir |
| Roads | 1,055 real OpenStreetMap ways, 192 km of network |
| Buildings | 18,404, lining the real streets; **779 you can walk into** |
| Landmarks | 26, each at its true coordinate, architecture from sourced research |
| Parikrama | 10.17 km closed loop along the real Parikrama Marg, 19 stops |
| Navigation | 24,585-node graph; every landmark routable, worst case 2.2 ms |
| Vegetation | ~3,000 trees, 13,756 grass tufts, 1,517 bushes — all instanced |
| Crowd | up to 280 people, 55 vehicles, cows, dogs, birds |
| Flowers | 354 pickable, placed by intent rather than noise |
| Map | an **aerial render of the actual city**, labelled, whole town on one screen |

**What you can do:** walk, run, hail an e-rickshaw or tempo or cab and pay a real
fare for a real routed distance, talk to anyone on the road, exchange pranam,
pick a flower by reaching and pulling until the stem gives, offer it at a temple,
take darshan, walk into homes and shops, and walk the parikrama. Lamps light at
dusk on Vrindavan's real clock, and a pujari circles an arti lamp at every altar.

Nothing is downloaded at runtime. No images, no audio files, no fonts beyond
Google Fonts, no API calls. Every mesh is generated in code, every texture is a
canvas, every sound is synthesised. The world renders with no backend at all.

---

## Running it

```bash
cd client
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static file server works. There is no build step, no bundler and no
dependency install — the client is plain ES modules.

On a phone, serve over your LAN and open the machine's IP on port 8080.

### Controls

| | Touch | Keyboard |
|---|---|---|
| Move | Floating joystick, left half of the screen | `W A S D` / arrows |
| Run | Push the stick past 80% | `Shift` |
| Look | Drag, right half of the screen | Mouse drag |
| Interact | Tap the context prompt | `E` / `Space` |
| Map | Map button | `M` |
| Menu | Menu button | `Tab` |

Accessibility: large text, reduced motion, adjustable camera sensitivity and
walking speed, and a tap-to-move mode for anyone who cannot use a joystick.

---

## Repository layout

```
client/                    the playable build
  index.html               shell, styles, DOM contract
  src/
    engine/                reusable, game-agnostic
      core/                EventBus, AppConfig, Lifecycle
      math/                MathUtils, Random, Noise, Curves, SpatialGrid, Geo, BinaryHeap
      render/              TextureCache
      input/               InputManager
      audio/               AudioEngine
      save/                SaveSystem, StateSchema
      ui/                  Haptics
    game/                  Vrindavan-specific
      bootstrap/           GameApp — composition root and loop
      world/               WorldService, TerrainBuilder, BuildingGenerator,
                           LandmarkGenerator, PropScatter, TimeOfDay
      player/              Player — avatar rig, animation, locomotion
      camera/              ThirdPersonCamera
      interaction/         InteractionSystem — proximity, discovery, devotion
      navigation/          NavGraph, RouteRenderer
      map/                 MapSystem — minimap and illustrated world map
      parikrama/           ParikramaSystem
      npc/                 CrowdSystem — people, cows, birds, rickshaws
      ui/                  UISystem — screens, HUD, story cards
    content/               static world content (the ScriptableObject layer)
      *.generated.js       produced by the OSM importer — do not hand-edit
      locations, stories, flora, palette
tools/
  osm-import/              OpenStreetMap -> game content pipeline
  checks/                  headless smoke tests
docs/                      architecture and data provenance
```

The `engine/` + `game/` split and the domain folders under `game/` map one-to-one
onto the intended Unity `Assets/Scripts/` tree, so the port is mechanical rather
than a rewrite.

---

## Rebuilding the world from OpenStreetMap

```bash
node tools/osm-import/import.mjs
```

Reads the cached Overpass extracts in `tools/osm-import/raw/`, projects them onto
a local tangent plane centred on Banke Bihari, simplifies and clips the geometry,
chains the Parikrama Marg into a closed ring, and writes the generated content
modules. Curated data — architecture, deity, story, district polygons — lives in
`tools/osm-import/config.mjs` and `client/src/content/`.

```bash
node tools/checks/nav-smoke.mjs                      # every landmark routable, timings
node --experimental-vm-modules tools/checks/parse.mjs # every module parses as an ES module
node tools/checks/imports.mjs                        # every import resolves, every named export exists
node tools/checks/runtime.mjs --shots                # boots the real client headless and checks behaviour
```

`runtime.mjs` is the one that matters. It boots the actual game in headless
Chromium and asserts on behaviour rather than appearance:

| Check | What it asserts |
|---|---|
| hit test | every HUD control is actually clickable, naming whatever is covering it |
| controls | the D-pad is on screen at phone size, and walks and strafes |
| camera independence | holding a direction while the camera swings 90° does not bend the path |
| locomotion | the avatar covers 1.5 m per **simulated** second |
| people | you cannot walk through a person or a vehicle |
| screens | Places, Journey, Settings, Avatar, Menu and the story card all render content |
| audio | the ambient beds and narration are live |

It found the real causes of several bugs that looked like something else —
notably that the world was running at 22% speed on slow frames, and that every
arch in the world was drawing as an outline with nothing inside it.

---

## Design rules

These are constraints, not preferences.

- **Devotion is never gamified.** No points for offerings, no XP, no streaks, no
  "you are better than 83% of visitors". Discovery is the only progression, and
  it is never scored.
- **No invented religious history.** Where an account is traditional rather than
  documented, the text says so. Sources are carried per location.
- **Offline-first.** The world must render with the network unplugged. A backend,
  if it ever exists, stores exactly one user document and nothing else.
- **The map is the world.** The minimap is a true top-down render of the same
  geometry you are standing in, never a decorative fake.
- **Privacy.** Avatar photo processing is designed to happen on the device.
  Nothing is uploaded without explicit consent.

---

## Licensing and attribution

Map data © OpenStreetMap contributors, licensed under the
[Open Database Licence](https://opendatacommons.org/licenses/odbl/) (ODbL 1.0).
No proprietary map data is used anywhere in this project. See
[docs/DATA-SOURCES.md](docs/DATA-SOURCES.md).
