# Where things stand — paused 2026-09-22 15:17

## The build works right now
    parse      58/58        runtime    failed []   60 fps   4.55M tris
    imports    0 errors     save       9/9
    rickshaw   22/23        landmarks  26 built, 60k tris (10k in 1 culled interior)

The one rickshaw failure is almost certainly a workflow editing RickshawSystem.js
mid-run. It was 23/23 an hour ago and nothing was changed by hand since.

## Snapshot
`.snapshot/` holds the files the running workflows are editing, copied at 15:16
while the suite was green. If any of them is left half-written, restore from
there:

    cp .snapshot/*.js  client/src/game/...   (match each to its folder)
    cp .snapshot/import.mjs .snapshot/config.mjs tools/osm-import/
    cp -r .snapshot/content/* client/src/content/

## Three workflows were running when this paused
They may have finished, died, or left a file half-written. Check each before
trusting anything they touched.

1. **Temple interior** (wf_9472faa2-53a) — 99 min, 2 of 3 agents done. The
   courtyard IS already on disk and working: landmarks went 48k -> 60k triangles
   with a culled interior. Never visually verified — screenshots timed out
   because the machine was at load 52. FIRST THING TO DO ON RESUME: stand in
   ISKCON and look at it.
   Files: client/src/game/world/LandmarkGenerator.js, InteriorSystem.js
2. **Satellite survey** (wf_14ecd60b-cca) — 41 min, 1 of 6 agents done. Traces
   missing roads and places from Esri World Imagery, which Esri permits OSM
   contributors to trace from. Would write tools/osm-import/surveyed.mjs.
3. **Driving + steering** (wf_89340419-f41) — 39 min, 1 of 2 agents done.
   Replaces path-sampling with real steering, and adds "I'll drive".
   Files: RickshawSystem.js, CrowdSystem.js, NavGraph.js

## Next, in order
1. Verify whatever the three workflows left. Run the whole suite.
2. Wire the rickshaw fares, ride speeds and cheat codes into
   `client/src/content/tuning.js`. The values are already there; those two files
   were under active edit so they were not pointed at it yet. Until then there
   are two sources of truth for those numbers.
3. **Temples along Bhaktivedanta Swami Marg as actual buildings.** Still the
   largest thing asked for and never started. 133 POIs are searchable but only
   26 curated landmarks exist as architecture.
4. Open questions for the user: which OSM way is Jagadguru Kripalu Marg; is
   Chhatikara Crossing the bus stand; which screen has "lot of glitches".

## Lesson worth keeping
Three workflows at once put the machine at load average 52 and made everything
slower, not faster, including blocking my own verification. Two at a time is
probably the ceiling on this box.

Full history in docs/BACKLOG.md and docs/OPEN-BUGS.md.
