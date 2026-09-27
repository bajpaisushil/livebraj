# Vrindavan Dham — Technical Architecture

**Status:** V1 vertical slice, browser build complete; Unity port specified.
**Scope:** Vrindavan only. Braj expansion is architected for, not implemented.

---

## 0. The one-paragraph version

A third-person open world built from the real OpenStreetMap geometry of
Vrindavan, 4.2 km square, with 1,055 real roads, 23 landmarks at their true
coordinates and a 10.17 km parikrama ring routed through the actual street
network. Everything is generated procedurally at load — no asset downloads, no
server, no network. Progress is a single JSON document in local storage that a
backend could one day store verbatim. The web build is a real vertical slice and
simultaneously the reference implementation for the Unity port, because the
module boundaries were chosen to match Unity's.

---

## 1. Technical architecture

### 1.1 Layering

Three layers, strictly one-directional.

```
content/   pure data. No behaviour, no engine imports beyond math helpers.
engine/    reusable and game-agnostic. Knows nothing about Vrindavan.
game/      Vrindavan-specific systems. May import engine and content.
```

`engine/` must never import from `game/`. `content/` must never import from
`game/`. This is what makes the Braj expansion a content problem rather than a
refactor, and what makes the Unity port a translation rather than a redesign.

### 1.2 Composition root

`game/bootstrap/GameApp.js` is the only file that knows how to construct
anything. It builds one shared context object and hands it to every system:

```js
ctx = {
  renderer, scene, camera, clock,      // rendering
  bus, Events,                         // messaging
  save, state,                         // persistence
  data,                                // all static content
  quality, rng, rngAt, textures,       // services
  time, world, nav, player, cameraRig, // systems, filled in as constructed
  input, audio, interaction, map, route, parikrama, crowd, ui,
}
```

Systems read `ctx.X` lazily inside `update()`, never caching it at construction,
so construction order does not become a hidden dependency graph.

Every system is constructed inside a guard. A module that fails to load or throws
in its constructor is logged and skipped; the world still boots without it. In
development that is the difference between a broken feature and a black screen.

### 1.3 Messaging

Systems never hold references to each other. They publish and subscribe through
`engine/core/EventBus.js`, with the canonical names in the exported `Events`
table. The full list is in that file; the shape is `bus.emit(name, payload)` and
`const off = bus.on(name, fn)`.

Why: the interaction system needs to tell the audio engine to ring a bell, the
haptics to tick, the UI to show a line, and the save system to persist — without
knowing that any of them exist.

### 1.4 Update order

Fixed, in `GameApp._frame()`, with `dt` clamped to 50 ms so a backgrounded tab
cannot teleport anyone:

```
input → player → world → crowd → interaction → ritual → gatherings
      → rickshaw → dialogue → parikrama                      (paused behind menus)
cameraRig → time → live → interior → route → map → audio → ui (always running)
render
```

The second group keeps running behind a menu so the world stays alive underneath
it — the main menu renders over the live town, not a static image.

---

## 2. Project structure

See the README for the full tree. The important property: each folder under
`game/` is a **domain**, not a layer, and each maps to a Unity assembly
definition.

| Web | Unity |
|---|---|
| `engine/core/EventBus.js` | `Scripts/Core/EventHub.cs` |
| `engine/math/*` | `Scripts/Core/Math/*` |
| `engine/save/SaveSystem.js` | `Scripts/Save/SaveSystem.cs` |
| `engine/input/InputManager.js` | `Scripts/Input/` + Input System actions |
| `engine/audio/AudioEngine.js` | `Scripts/Audio/` + FMOD or Unity mixer |
| `game/world/*` | `Scripts/World/*` |
| `game/player/Player.js` | `Scripts/Player/` + Animator controller |
| `game/camera/ThirdPersonCamera.js` | `Scripts/Camera/` + Cinemachine |
| `game/navigation/NavGraph.js` | `Scripts/Navigation/` + NavMesh |
| `game/map/MapSystem.js` | `Scripts/Map/` |
| `game/npc/Archetypes.js` | `Scripts/NPC/Archetypes.cs` — one dressed-figure table, walking or seated |
| `game/devotion/*` | `Scripts/Devotion/` — the arti, and the yajna/kirtan/katha gatherings |
| `content/*` | `Assets/Content/*.asset` ScriptableObjects |

---

## 3. Scene architecture

**One scene.** No loading screens after boot. The world is 4.2 km across, which
is well inside what a single scene handles once geometry is merged and
instanced.

Boot sequence, with progress reported to the loading screen:

```
0.02  read content            parse the generated modules
0.04  TimeOfDay               sky dome, sun, hemisphere, fog
0.08  TerrainBuilder          ground, Yamuna, 1055 roads, ghat steps
0.34  LandmarkGenerator       23 landmarks
0.58  BuildingGenerator       ~3000 buildings along the real streets
0.82  PropScatter             5138 trees, street furniture, 354 flowers
0.80  NavGraph                24,585 nodes
0.84  input, player, camera
0.89  audio, interaction, map, route, parikrama
0.94  crowd, gatherings, rickshaw, dialogue
0.97  ui
1.00  intro or menu
```

Each stage yields a frame (`requestAnimationFrame`) so the loading screen stays
responsive rather than freezing on a long synchronous build.

**Expansion path.** When Braj is added, each region becomes an addressable scene
or content group loaded on approach. The seam is already there: `WorldService`
owns a group per builder, and `content/` is region-scoped data.

---

## 4. Player architecture

`game/player/Player.js`.

**Rig.** A stylised humanoid built from primitives, parented into a real bone
hierarchy — `hips → spine → chest → neck → head`, arms off the chest, legs off
the hips. Under 3k triangles. The hierarchy matters more than the mesh: it is
what makes the port to a Mixamo-rigged humanoid a swap rather than a rewrite.

**Animation is blended, never switched.** Each pose is a set of target eulers per
bone; every frame the current rotation damps toward the target. Action
animations (`pranam`, `offer`, `pluck`, `namaste`, `sit`) are keyframe timelines
— `[{ t, pose }]` interpolated with smoothstep — not `setTimeout` chains, so they
scrub, blend and cancel cleanly.

In Unity this becomes an Animator with a locomotion blend tree (idle → walk →
run driven by normalised ground speed) plus an action layer with avatar masks, so
the avatar can fold its hands while still walking.

**Locomotion.** Camera-relative input, walk 1.5 m/s, run 3.6 m/s, scaled by the
user's speed setting. Smooth acceleration; the body rotates toward its movement
direction with damping. Ground snapping through `world.groundHeight`, collision
through `world.collide`. Wading stops at knee depth.

**Appearance.** Six skin tones, four hair styles, five clothing styles, eight
cloth colours, five accessories. Stored as indices into `content/palette.js`
`AVATAR_OPTIONS`, so the save document stays tiny and the options can grow
without a migration.

---

## 5. World architecture

`game/world/WorldService.js` is the orchestrator and the single spatial-query
surface. It builds nothing itself. Four builders return geometry plus colliders:

| Builder | Produces |
|---|---|
| `TerrainBuilder` | ground height field, Yamuna, all road ribbons with mitred joints and junction quads, ghat steps |
| `LandmarkGenerator` | 23 landmarks, one builder per architectural kind, plus darshan/altar/bell anchors |
| `BuildingGenerator` | street-lining buildings, district-driven kits |
| `PropScatter` | trees, street furniture, dressing, pickable flowers |

**The queries every other system uses:**

```
groundHeight(x,z)   surfaceAt(x,z)   isWater(x,z)   waterDepth(x,z)
isNarrow(x,z)       nearestRoad(x,z,r,filter)       districtAt(x,z)
collide(vec3, r)    collideRay(from, to, r)         isClear(x,z,r,skipTag)
addColliders(list)
locationsNear(x,z,r)  getLocation(id)  anchorFor(id)  nearestFlower(x,z,d)
placeOffering(locId, mesh)
```

**Collision** is not a physics engine. Colliders are normalised to circles and
oriented boxes in a `SpatialGrid`; resolution is smallest-axis push-out, iterated
twice so a corner between two buildings resolves instead of jittering. Camera
occlusion is a marched segment test returning a blocked fraction. This is far
cheaper than a physics world and entirely sufficient for a game with no combat.

**The building algorithm** is the thing that makes it read as a city rather than
scattered boxes:

1. For each road, find its district.
2. March both sides at `width/2 + setback`, placing lots of district-appropriate
   frontage and depth.
3. Reject lots overlapping a landmark footprint, the river, or another lot —
   tested through a spatial grid, never an O(n²) scan.
4. **Rotate each building to face the road.** Its facade is the street-facing
   side. Never a random rotation. This single rule is what turns streets into
   corridors.
5. Leave a gap about 12% of the time — a courtyard, a tree square, a nook.

---

## 6. Map architecture

`game/map/MapSystem.js`, two views over the same data.

**Minimap.** The static layers — river, all 1,055 roads at their real widths,
district fills, landmark footprints — are pre-rendered **once** into an offscreen
canvas at ~1.6 px/m. Each frame is a rotated, translated blit of a crop. The city
is never redrawn per frame; that is the entire trick, and it is what keeps a
true top-down radar affordable on a phone.

Discovered locations show icons. **Undiscovered ones do not appear at all** —
discovery has to mean something.

**World map.** An illustrated pilgrimage map, not a Google Maps clone: aged paper
with procedural grain, the Yamuna as a soft ribbon, roads as warm ink strokes of
varying weight, and temples drawn as small *elevation icons* — a shikhara, a
gopuram, a ghat stair — rather than flat pins. Labels are placed by greedy
collision rejection across four candidate offsets.

**Routing** is `NavGraph` A*, shared with the crowd and tap-to-move. The route is
rendered into the actual 3D world by `RouteRenderer` as a ribbon of warm light
laid on the street surface, scrolling toward the destination.

---

## 7. Navigation architecture

`game/navigation/NavGraph.js`.

Roads are resampled every 8 m into nodes; consecutive samples link; nodes within
3 m collapse; and separate OSM ways whose nodes come within 9 m are **stitched**.
That last step matters: OSM is full of ways that visually meet but share no node,
and without stitching a route will refuse to cross a junction.

Result on the real data: **24,585 nodes, 28,112 edges, 3,969 stitches**, built in
34 ms.

A* with a binary-heap open set and a distance heuristic scaled by 0.8 — the
cheapest per-metre cost multiplier — so it stays admissible while road kinds are
weighted (a route prefers an open street to squeezing down a gali, which is what
a person actually does).

Measured over all 22 landmark routes from Banke Bihari: **average 0.6 ms, worst
2.2 ms**, detour ratios 1.12–1.87× straight line. Every landmark reachable.

The same graph shape is rebuilt at import time in `tools/osm-import/roadgraph.mjs`
to close the parikrama ring. Keep the two in step.

**Unity port:** bake a NavMesh from the road ribbons and use `NavMesh.CalculatePath`.
Keep this graph as the fallback and as the crowd's waypoint network — NavMesh
agents at crowd scale are more expensive than steering along a sampled graph.

---

## 8. Avatar-from-photo architecture

Not in V1, and the design is deliberately modest about what is achievable.

**What does not work:** a photograph does not become a high-quality 3D head. Any
product promising that is either using a heavy server pipeline or overselling.

**What does work, on-device:**

1. `FaceDetector` / MediaPipe Face Mesh → 468 landmarks, locally.
2. Derive a small parameter vector: face width/height ratio, jaw angle, eye
   spacing, nose width, brow height, plus a sampled skin tone.
3. Drive **blendshape weights on a pre-authored stylised head**, not a
   reconstructed mesh.
4. Project a cleaned, cropped face crop as a texture on that head, with the hair
   and the silhouette staying stylised.

The result looks *recognisably like the user* without attempting photorealism —
which is the stated goal.

**Privacy, as a hard constraint:**

- Processing happens on the device. The photo never leaves it.
- The photo is never written to storage; only the derived parameter vector is
  saved, and it is not reversible to an image.
- If a server pipeline is ever added it requires separate explicit consent,
  encrypted transport, minimal retention, and one-tap deletion.

The avatar screen already carries the row that states this, marked "coming soon",
so the commitment is visible before the feature exists.

---

## 9. Interaction architecture

`game/interaction/InteractionSystem.js`.

Proximity is polled at ~6 Hz against a spatial index, never a full scan.
Entering a location's radius for the first time ever fires discovery. While in
range, prompts appear for that location's available interactions and clear the
moment the player leaves.

**The devotional sequences are the product.** Offering a flower is not a button:

```
1. clear prompts, disable input
2. camera eases into a cinematic framing on the altar
3. the avatar walks the last metres to the darshan anchor and turns
4. the offer animation plays — hands cupped, raised, extended, head bowed
5. at the apex the flower leaves the hand and settles on the altar, permanently
6. one soft temple bell, a warm bloom of the temple light, a breath of incense
7. a single contextual line fades in
8. camera releases, input restored
```

No points. No "+10". No stars, streaks or score. The response is a bell and a
change in the light.

Every sequence runs under a `CancelToken` and **always** restores input and
camera, including when interrupted. A player who walks away mid-bow must never
be left stuck.

Offerings persist: `world.placeOffering` keeps them on the altar, so a temple you
return to visibly accumulates what you have brought it.

---

## 10. Save architecture

`engine/save/` — one document, `StateSchema.js`:

```js
{
  version, id, createdAt, updatedAt, firstLaunch,
  avatar:    { name, skin, hair, cloth, clothColor, accessory },
  discovered:[locationId],      flowers: { marigold, lotus, tulsi, jasmine },
  carrying,  offered:[{locId,kind}],  pranams:[id],  darshans:[id],
  metresWalked,
  parikrama: { active, metres, laps, lastPoint, startedAt },
  destination,
  settings:  { volume, sfxVolume, sensitivity, invertY, moveSpeed, quality,
               haptics, largeText, reduceMotion, tapToMove, timeOfDay }
}
```

localStorage, debounced 400 ms, every access wrapped in try/catch — private
windows and cleared site data must degrade to "starts fresh", never to a crash.
`migrate()` merges a loaded document onto current defaults so new fields appear
without a migration script.

This shape **is** the backend schema. Syncing later is uploading this object.

---

## 11. Backend architecture

**V1 has no backend, and the game must never require one.**

When an optional account is added:

```
User {
  id, name, email, avatar, progress, visitedLocations,
  completedParikrama, discoveredStories, settings, createdAt, updatedAt
}
```

One document-oriented collection. No tables for temples, flowers, actions,
journeys, stories or achievements — that is all static local content.

**Zero recurring cost options, in order of preference:**

| Need | Choice | Free tier |
|---|---|---|
| Auth | Supabase Auth, or Firebase Auth | 50k MAU / unlimited |
| Document store | Supabase (Postgres `jsonb` column), or Cloudflare D1/KV | 500 MB / 5 GB |
| Static hosting | Cloudflare Pages, GitHub Pages, Netlify | unlimited bandwidth |
| Analytics | none in V1 | — |

A single `jsonb` column holding the save document is enough. Guest mode is the
default; an account is an opt-in that adds cross-device sync and nothing else.

---

## 12. Asset strategy

**There are no assets.** Every mesh is generated in code, every texture is a
`CanvasTexture`, every sound is synthesised. The only external resource is Google
Fonts under the SIL OFL.

This was a deliberate choice and it pays for itself several times: no licensing
questions, a tiny download, instant iteration, and a world that can be
regenerated from data rather than re-modelled.

**For the Unity build**, where hand-authored art will raise the ceiling, the
free/open sources that are actually usable:

| Need | Source | Licence |
|---|---|---|
| Humanoid rig + animations | Mixamo | free with an Adobe account |
| Environment kitbash | Kenney.nl, Poly Haven, ambientCG | CC0 |
| Textures / HDRIs | Poly Haven, ambientCG | CC0 |
| Vegetation | Unity Terrain tools, SpeedTree free tier | — |
| Audio | Freesound (filter to CC0), or keep the synthesis | CC0 |
| Fonts | Google Fonts Devanagari | OFL |

Rule: CC0 or OFL only. Anything requiring attribution-in-app or forbidding
commercial use is rejected at intake, not discovered at ship.

---

## 13. Mobile optimisation strategy

| Technique | Where |
|---|---|
| Geometry merging per material | every world builder; 1,055 roads become a handful of meshes |
| `InstancedMesh` | 5,138 trees, street furniture, crowd, birds, gatherings |
| Spatial-grid broad phase | collision, building placement, proximity, flowers |
| Cached height field | terrain sampled from a Float32Array grid, not per-query noise |
| Pre-rendered minimap base | the city is drawn once, then blitted |
| Zero allocation in `update()` | module-scope scratch vectors throughout |
| Quality tiers | `engine/core/AppConfig.js`, auto-detected from device memory and cores |
| One shadow caster | a single directional light; nothing else casts |
| Throttled polling | proximity at 6 Hz, parikrama progress at 2 Hz |
| `dt` clamp | 50 ms, so a resumed tab does not teleport anyone |

**Tiers.**

| | low | mid | high |
|---|---|---|---|
| Shadows | off | 2048 | 2048 |
| Pixel ratio cap | 1.0 | 1.5 | 2.0 |
| Draw distance | 260 m | 420 m | 620 m |
| Crowd | 42% | 72% | 100% |
| Trees | ~45% | ~75% | 100% |
| Temple lights | off | on | on |

---

## 14. Performance budget

| Budget | Target |
|---|---|
| Frame time | 16.6 ms (60 fps) mid-tier; 33 ms floor on low |
| Draw calls | < 300 |
| Visible triangles | < 450k mid, < 250k low |
| Landmark triangles | < 200k across all 23 |
| Per building | < 120 triangles |
| Crowd agent | < 600 triangles |
| Avatar | < 3k triangles |
| Texture memory | < 64 MB (all procedural, mostly ≤ 256²) |
| Boot to playable | < 8 s mid-tier |
| Route query | < 5 ms — **measured 0.6 ms avg, 2.2 ms worst** |
| Graph build | < 100 ms — **measured 34 ms** |
| Download | < 2 MB (no assets) |

---

## 15. Android / iOS build strategy

**Web build (today).** Any static host. Cloudflare Pages is free with unlimited
bandwidth. Installable as a PWA with a service worker for true offline — worth
doing before the Unity port, because it makes the slice shareable by link.

**Unity build (next).**

- Unity 6 LTS, URP, Linear colour space, Forward+.
- Android: IL2CPP, ARM64, Vulkan with a GLES3 fallback, texture compression
  ASTC, minimum API 26.
- iOS: IL2CPP, Metal, minimum iOS 14.
- Addressables for content groups, so Braj regions download on demand.
- Baked lightmaps for the static town; one real-time directional light for
  shadows; light probes for the crowd.
- CI: GitHub Actions with GameCI — free minutes for a public repo. Unity Personal
  is free below the revenue threshold.

**Store considerations.** Religious content is permitted by both stores. The two
things to get right before submission: the photo-avatar feature needs a clear
privacy manifest entry and an in-context consent prompt (Apple is strict here),
and the app must not present itself as a substitute for religious obligation.
The stated product goal — encouraging a visit to the real Vrindavan — is the
right framing and should be in the store description.

---

## 16. Risks and technical limitations

| Risk | Severity | Mitigation |
|---|---|---|
| **Procedural buildings look repetitive** | high | district-specific kits, seeded variation per road, deliberate gaps. Accept that hand-authored landmarks carry the visual load. |
| **OSM road data has gaps in the galis** | medium | stitching already recovers most junctions; the smoke test proves reachability. Curated fallback coordinates for unmapped landmarks. |
| **ODbL share-alike is misunderstood** | medium | the derived database is isolated in `*.generated.js` and licensed ODbL; game code is separate. Documented in DATA-SOURCES.md. |
| **Photo-to-avatar disappoints** | high | scope it to blendshape parameters on a stylised head from the start, and say so in the UI. Never promise likeness. |
| **Religious accuracy** | **highest** | no invented history, sources per entry, traditional accounts labelled. This needs review by people who know the subject better than any of us; the content layer is isolated so their corrections are a text edit. |
| **Low-end Android thermal throttling** | medium | quality tiers, and the low tier is genuinely low, not cosmetic. |
| **Scope creep toward Braj** | high | V1 is Vrindavan. The architecture supports expansion; the milestone does not include it. |
| **Crowd cost at scale** | medium | pooled, distance-spawned, instanced. Counts scale with tier. |
| **WebAudio unavailable or suspended** | low | the engine never throws when audio is unavailable; the game is fully playable silent. |

**Honest limitations of the current slice.**

- The Yamuna trace is the longest single OSM river run in bounds; it covers the
  northern reach well and the eastern bend less well.
- OSM building footprints (176) were too sparse to use, so the fabric is
  procedural. It is convincing in aggregate and will not survive close
  comparison with a photograph of a specific street.
- Interiors ARE modelled and you walk into them — 777 houses and shops from
  three instanced room templates, plus eight temples. Seven of those temples
  share one generic pillared hall; only Sri Sri Krishna Balaram has a plan of
  its own, the chatuhshala courtyard it actually is, and it is the only landmark
  whose geometry is emitted as a separate, cullable mesh. Darshan is staged in
  the court in front of the altars rather than at the sanctum threshold.
- Nothing in the engine climbs. WorldService pins the player to the terrain
  height, so any floor inside a building that is not at ground level is a floor
  the player wades through — Krishna Balaram's raised altar hall is railed off
  at the foot of its steps for that reason, not for a devotional one.
- Three landmarks use curated coordinates rather than OSM nodes.

---

## 17. V1 milestone plan

| Phase | Deliverable | State |
|---|---|---|
| 1 | Project structure, engine layer, content pipeline | **done** |
| 2 | Real OSM import, world data, routing validated | **done** |
| 3 | Terrain, roads, buildings, landmarks, props | in build |
| 4 | Avatar, animation, camera, input | in build |
| 5 | Flower, offering, pranam, darshan, discovery | in build |
| 6 | Crowd, animals, procedural audio | in build |
| 7 | Parikrama | **done** |
| 8 | Save | **done** |
| 9 | Map, minimap, route rendering | in build |
| 10 | UI, screens, accessibility | in build |
| 11 | Polish pass, perf pass on a real phone | next |
| 12 | Unity port, Android/iOS builds | after slice approval |

**The milestone, restated:** a user opens the app, enters a beautiful small 3D
Vrindavan, controls a personalised avatar, walks around, recognises places,
picks a flower, offers it at a temple, performs pranam, opens the map, and walks
a short parikrama — with no backend anywhere.

---

## 18. Expansion to Braj

Not in V1. What makes it possible without a rewrite:

- The importer is parameterised by origin and bounds. Pointing it at Govardhan
  produces the same generated modules for Govardhan.
- `content/` is region-scoped data, and `WORLD` already carries an origin.
- The projection is a local tangent plane — regions can be laid out in a shared
  Braj-wide coordinate space by re-projecting against one origin.
- `NavGraph` is built from whatever roads it is given.
- Landmark builders are keyed by architectural kind, and Braj's kinds
  (Govardhan's parikrama, Barsana's hilltop temple, the kunds) are new entries,
  not new systems.

Travel between regions becomes a loading boundary — addressable content groups
in Unity, dynamic imports on the web.

---

## 19. What is deliberately absent

No leaderboards. No PvP. No combat. No weapons. No enemies. No timers. No fail
states. No energy. No lives. No loot boxes. No pay-to-win. No aggressive ads. No
fake scarcity. No daily-login pressure. No XP. No levels. No percentile
comparisons. No points for devotion.

These are not omissions to be filled in later. They are the product.

---

## 20. Open questions for you

1. **Content review.** Who reviews the story text? This is the part most worth
   getting right, and it should not be signed off by an engineer.
2. **Scale honesty.** The world is at true 1:1 metric scale, which makes
   Vrindavan feel large and walking it take real time. Compressing distances by
   ~30% would make exploration brisker. Which do you want?
3. **Unity timing.** Port after the slice is approved, or run both for a while?
4. **Avatar photo.** Ship V1 without it, as currently designed, or make it a V1
   blocker?
