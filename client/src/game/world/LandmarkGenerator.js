/**
 * LandmarkGenerator — the 23 named temples, ghats, groves and gates.
 *
 * These are the navigation anchors. Each architectural kind gets a distinct
 * silhouette you can read from across town: Rangaji's gopuram on the eastern
 * skyline, Govind Dev's red sandstone mass, the Chandrodaya tower, the white
 * cluster of Prem Mandir. Positions are the real OSM coordinates.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { lilaUV, lilaAtlas } from './LilaArt.js';
import { rngAt } from '../../engine/math/Random.js';
import { TAU } from '../../engine/math/MathUtils.js';
import { PEOPLE, buildSeated, buildStanding } from '../npc/Archetypes.js';
import { buildIskconCampus } from './IskconCampus.js';
import { buildShahji } from './ShahjiMandir.js';
import { buildRadhaVallabhMandir } from './RadhaVallabhMandir.js';
import { buildRangaji as buildRangajiCity } from './RangajiMandir.js';
import { signAtlas, signUV } from './Signage.js';
import { altarFor } from '../../content/altars.js';

import { vMul, correct as correctHex, PT_OCHRE, PT_VERM, W_ALGAE, shade as vShade }
  from './BrajPalette.js';
/*
 * AN ARCH RECORDER, for the orientation audit (tools/checks/arches.mjs).
 *
 * cuspedArch spans along (cos R, sin R). Measured in isolation: given `rot`
 * in a wall along a builder's long axis it lies IN the wall; given
 * `rot + PI/2` it stands PERPENDICULAR to it, a fin. With 77 call sites and
 * builders in two mirror-image local frames, reading them one by one is how
 * this went wrong in the first place — so every arch the world actually
 * builds is recorded, with the landmark that built it, and the check tests
 * each against the wall it sits in. Off unless `globalThis.__recordArches`
 * is set before boot; costs nothing in play.
 */
let ARCH_LOG = null;
let ARCH_OWNER = null;

export function buildLandmarks(ctx, terrain) {
  ARCH_LOG = globalThis.__recordArches ? [] : null;
  const group = new THREE.Group();
  group.name = 'Landmarks';
  const colliders = [];
  const anchors = {};
  const b = new MeshBuilder();
  const lights = [];
  const templeLights = [];
  // where the threshold into each walk-in interior really is, and any geometry
  // a builder asked to keep out of the shared mesh
  const interiors = {};
  const extra = [];
  // small rooms a builder authored inside its own campus, entered like a shop
  const rooms = [];

  for (const loc of ctx.data.LOCATIONS) {
    const kind = loc.build.kind;
    const fn = BUILDERS[kind] || BUILDERS['temple-small'];
    const ground = terrain.sampleHeight(loc.pos[0], loc.pos[1]);
    const rng = rngAt(loc.id);
    const c0 = colliders.length;       // this landmark's colliders start here

    /*
     * Weather every wall this builder draws, from its own ground up.
     *
     * "ONE HEX PER BUILDING is the actual bug behind 'no single temple looks
     * exactly as it really is'. A flat fill cannot look like stone at any
     * level of geometric detail." Doing it here rather than in each builder
     * means all ~40 of them gain it at once and none can forget it.
     *
     * The reference height is the building's own, so a 30 m shikhara and a
     * 4 m shrine each get a full run of the curve instead of the shrine
     * sitting entirely in the dark end of a town-sized gradient.
     */
    const wh = Math.max(4, (loc.build && loc.build.h) || 12);
    /*
     * Anything standing in the Yamuna's flood range weathers differently,
     * and for a documented reason: Mathura's danger level is 166 m and
     * floods run to 166.68 m, so the Keshi Ghat steps and the road go under
     * most monsoons. BrajPalette carries the separate ramp and the silt line.
     */
    const river = kind === 'ghat' || kind === 'kund';
    b.weather((y) => vMul(y - ground, wh, river));

    /*
     * Correct the authored palette into the measured one.
     *
     * The generated location data sits at a median saturation of 0.25 where
     * photographs of Braj stone measure 0.50-0.75. That single number is why
     * every temple rendered as washed-out grey-beige however much geometry
     * it had, and no amount of chhajjas and jharokhas fixes it. correct()
     * keeps each building's authored HUE, which carries the intent, and
     * fixes only saturation and value, which do not. Marble is exempt.
     *
     * Done on a shallow copy rather than in place: the minimap and the map
     * screen read loc.build.color too, and they are drawing a diagram, not
     * a photograph.
     */
    /*
     * `measured: true` means HANDS OFF.
     *
     * correct() exists to lift colours that were authored by eye and came out
     * pale. It has no way to tell those apart from colours that were measured
     * off a photograph and are legitimately pale — and it got that wrong the
     * first time it ran. Jaipur Mandir's data already carried the researched
     * #d8a898, "dusty pale pink sandstone, NOT Agra red and NOT Jaipur pink
     * city pink", and correct() saw a warm hue at S 0.30, assumed it was
     * another washed-out guess, and forced it to S 0.62 — brick red, which is
     * the one thing the research says it must not be.
     *
     * So a general rule may not overrule a specific measurement. Anything
     * with a survey behind it in docs/research/ carries this flag.
     */
    const built = loc.build && (loc.build.measured ? loc.build : {
      ...loc.build,
      color: correctCss(loc.build.color),
      accent: correctCss(loc.build.accent),
    });
    ARCH_OWNER = loc.id;
    const out = fn({ loc: built ? { ...loc, build: built } : loc,
      b, ground, rng, ctx, terrain });
    ARCH_OWNER = null;

    b.weather(null);   // ground, walls, lanes and crowds stay unweathered

    // where the player stands for darshan, and what the offering aims at
    const r = Math.max(loc.build.w, loc.build.d) * 0.5;
    const fx = loc.pos[0] + Math.sin(loc.rot) * (r + 5.5);
    const fz = loc.pos[1] + Math.cos(loc.rot) * (r + 5.5);
    anchors[loc.id] = {
      darshan: new THREE.Vector3(fx, terrain.sampleHeight(fx, fz), fz),
      facing: loc.rot + Math.PI,
      altar: new THREE.Vector3(
        loc.pos[0] + Math.sin(loc.rot) * (r * 0.3),
        ground + (out && out.altarY !== undefined ? out.altarY : 2.0),
        loc.pos[1] + Math.cos(loc.rot) * (r * 0.3),
      ),
      bell: new THREE.Vector3(
        loc.pos[0] + Math.sin(loc.rot) * (r + 1.5),
        ground + 3.4,
        loc.pos[1] + Math.cos(loc.rot) * (r + 1.5),
      ),
      // The floor a pujari at this altar is standing on, which is not the
      // terrain the moment a hall is raised over it: Krishna Balaram's altars
      // are five risers up from a sunken court, and RitualSystem placing its
      // arti at ground height would bury him to the knee in his own hall.
      floor: ground,
    };

    // A temple you can walk into gets wall colliders with a doorway gap, plus a
    // hall and an altar inside. Everything else stays a solid mass.
    //
    // A builder may instead author the whole interior itself and say so, which
    // is the only way to give one temple a plan of its own: `buildInterior` is
    // shared by eight locations and rewriting it for Krishna Balaram's
    // courtyard would have rebuilt Prem Mandir and Katyayani as courtyards too.
    if (out && out.interior) {
      const inner = out.interior;
      anchors[loc.id].altar.set(inner.altar[0], inner.altar[1], inner.altar[2]);
      anchors[loc.id].darshan.set(
        inner.darshan[0], terrain.sampleHeight(inner.darshan[0], inner.darshan[1]), inner.darshan[1],
      );
      anchors[loc.id].facing = inner.facing;
      anchors[loc.id].floor = inner.floor;
      // a builder that authors several altars says where they are; DeityImages
      // must not be left to work it out from a constant
      if (inner.altars) anchors[loc.id].altars = inner.altars;
      if (inner.volume) interiors[loc.id] = inner.volume;
      if (out.rooms) rooms.push(...out.rooms.map((r) => ({ ...r, owner: loc.id })));
    } else if (ENTERABLE.has(kind)) {
      colliders.push(...hollowColliders(loc));
      const inner = buildInterior(b, loc, ground);
      buildDeities(b, loc, ground, inner.altar);
      anchors[loc.id].altar.set(inner.altar[0], ground + inner.altarY, inner.altar[1]);
      anchors[loc.id].darshan.set(
        inner.altar[0] + Math.sin(loc.rot) * 3.4,
        ground,
        inner.altar[1] + Math.cos(loc.rot) * 3.4,
      );
    } else if (!(out && out.noCollider)) {
      colliders.push({
        type: 'box', x: loc.pos[0], z: loc.pos[1],
        w: loc.build.w * 0.9, d: loc.build.d * 0.9, rot: loc.rot,
      });
    }
    /*
     * A FLOOR YOU CAN STAND ON, in every temple.
     *
     * Krishna Balaram's altar hall was drawn and never made solid: you climbed
     * all five risers, stepped off the top tread and fell through the marble to
     * the terrain, stranded below with no way back up. Banke Bihari's sanctum
     * did the same, 0.66 m down.
     *
     * It is fixed HERE rather than in each builder because every builder
     * already declares `interior.floor` and the volume it belongs to. Patching
     * them one at a time is how the first one got missed, and how the next one
     * would.
     *
     * `top` is what `WorldService.standHeight` reads; a floor at or below the
     * terrain adds nothing and is skipped.
     */
    /*
     * ...but NOT over a builder that has already laid its own.
     *
     * This blanket slab is the whole DECLARED VOLUME at the raised floor's
     * height, and at Krishna Balaram the declared volume is the whole building
     * — the altar hall, the court in front of it, AND the five-riser flight
     * between them. So it paved the staircase: measured, walking away from the
     * Deities the feet read 1.55 m at every step for four metres, because the
     * slab sat 2 cm above the top tread and `standHeight` takes the highest
     * surface it can reach. The steps were drawn, were solid, and could not be
     * used. Which is "i can't walk down the stairs near deities" again — the
     * fix for falling THROUGH a floor had quietly replaced it with a floor you
     * could not get off.
     *
     * A builder that has pushed its own `temple-floor` knows the shape of its
     * hall and this does not. Detected rather than flagged, because a flag is
     * a thing the next builder forgets to set.
     */
    const ownsFloor = out && out.colliders
      && out.colliders.some((c) => c && c.tag === 'temple-floor');

    if (!ownsFloor && out && out.interior && out.interior.volume
        && out.interior.floor !== undefined) {
      const v = out.interior.volume;
      const fy = out.interior.floor;
      if (fy > ground + 0.05) {
        colliders.push({
          type: 'box', x: v.x !== undefined ? v.x : loc.pos[0],
          z: v.z !== undefined ? v.z : loc.pos[1],
          w: v.hw * 2, d: v.hd * 2, rot: v.rot !== undefined ? v.rot : loc.rot,
          h: fy - ground, tag: 'temple-floor',
          // stood on, never bumped into: see WorldService.collide
          standOnly: true,
          // and only when nothing real is underfoot: see WorldService.standHeight
          soft: true,
        });
      }
    }

    /*
     * THE NIGHT VEIL, for every altar in Braj.
     *
     * Temples here shut for the night and a curtain is drawn across the
     * Deities — about nine, and back before mangala arti. That is the ordinary
     * practice at every altar, and it is different from Banke Bihari's
     * minute-by-minute curtain, which is its own tradition and runs as well.
     *
     * It is built HERE rather than in each builder, because every builder
     * already declares where its altar is and which way it faces. Adding it
     * per-builder got four of sixteen and would have kept missing new ones.
     */
    {
      const a = anchors[loc.id];
      if (a && a.altar) {
        const yaw = a.darshan
          ? Math.atan2(a.darshan.x - a.altar.x, a.darshan.z - a.altar.z)
          : loc.rot;
        const base = (a.floor !== undefined ? a.floor : ground) + 0.1;
        /*
         * ONE VEIL PER ALTAR, not one per temple.
         *
         * Krishna Balaram has THREE — Gaura-Nitai, Krishna-Balaram and
         * Radha-Shyamasundara, 14.4 m apart — and this drew a single curtain at
         * `anchor.altar`, which is the centre one. So the brothers were veiled
         * at night and the other two were not. A builder that authored several
         * altars publishes them; use them.
         */
        const seats = (a.altars && a.altars.length) ? a.altars : [a.altar];
        /*
         * Each line must be narrower than the GAP between altars, or three of
         * them merge into one wall across the hall.
         *
         * Krishna Balaram's bays are 7.2 m apart and this made each line 7.0 m
         * wide, leaving 0.2 m between them — a 21 m barrier you could not walk
         * past, so the side altars became unreachable. Sized off the spacing
         * now, leaving a real gap to walk through.
         */
        let wide;
        if (seats.length > 1) {
          let gap = Infinity;
          for (let i = 1; i < seats.length; i++) {
            gap = Math.min(gap, Math.hypot(seats[i].x - seats[i - 1].x, seats[i].z - seats[i - 1].z));
          }
          wide = Math.max(2.4, Math.min(5.0, gap * 0.58));
        } else {
          wide = Math.min(6.2, Math.max(2.6, Math.min(loc.build.w, loc.build.d) * 0.34));
        }
        seats.forEach((seat, i) => {
          const vb = new MeshBuilder();
          const sy = seat.y !== undefined ? seat.y : a.altar.y;
          const vx = seat.x + Math.sin(yaw) * 1.05;
          const vz = seat.z + Math.cos(yaw) * 1.05;
          const hh = Math.max(2.4, sy - base + 1.5);
          /*
           * `-yaw`, not `yaw`, and this is a real bug rather than a nicety.
           *
           * The veil's CENTRE is offset by (sin yaw, cos yaw) * 1.05, which is
           * the panel convention; `MeshBuilder.box` turns by +rot, whose local
           * +z is (-sin yaw, cos yaw). The two agree only when sin(yaw) is 0 —
           * and every temple in Braj happens to face a multiple of 90 degrees
           * except two, so the mirror was invisible.
           *
           * Madan Mohan faces -45 degrees, and there the 6.2 m veil lay ALONG
           * the darshan aisle instead of across it: measured, its long axis was
           * exactly anti-parallel to the way out (dot -1.0000) and its thin
           * axis exactly perpendicular (dot 0.0000). So the Deities had no
           * screen in front of Them and a 6 m rail down the middle of Their
           * own aisle.
           *
           * At a 90-degree multiple `-yaw` differs from `yaw` by 180 degrees,
           * which for a box is no rotation at all — so this is provably a
           * no-op at the fifteen temples that were already right, and a fix at
           * the two that were not.
           */
          vb.box(vx, base, vz, wide, hh, 0.12, 0xa8321e, -yaw);
          vb.box(vx, base + hh, vz, wide + 0.3, 0.22, 0.2, 0xc9a03c, -yaw);
          if (vb.isEmpty) return;
          extra.push({
            name: 'Night:' + loc.id + (seats.length > 1 ? ':' + i : ''), builder: vb,
            x: loc.pos[0], z: loc.pos[1], r: Math.max(loc.build.w, loc.build.d),
          });
          /*
           * And you cannot walk through it. The altar is not somewhere a
           * pilgrim goes — in life it is railed or screened off — so the line
           * in front of the Deities is solid whether or not the curtain is
           * drawn. "I am able to pass through as well."
           */
          colliders.push({
            type: 'box', x: vx, z: vz, w: wide, d: 0.5, rot: -yaw, tag: 'altar-line',
          });
        });
      }
    }
    if (out && out.colliders) colliders.push(...out.colliders);
    if (out && out.mesh && !out.mesh.builder.isEmpty) extra.push(out.mesh);
    // a builder may hand back more than one: a textured atlas needs its own
    if (out && out.meshes) for (const m of out.meshes) if (!m.builder.isEmpty) extra.push(m);
    // moving parts: the same path into the scene, but named so they can be
    // found again and given an `open` direction to slide along
    if (out && out.curtain) {
      for (const c of out.curtain) if (!c.builder.isEmpty) extra.push(c);
    }
    // the night veil, which every altar has and which shuts at about nine
    if (out && out.night && !out.night.builder.isEmpty) extra.push(out.night);

    if (ctx.quality.templeLights && loc.type === 'temple') {
      // kept so the evening can brighten them
      const l = new THREE.PointLight(0xffb45c, 2.4, 26, 2);
      l.position.set(
        loc.pos[0] + Math.sin(loc.rot) * (r * 0.35),
        ground + 3.2,
        loc.pos[1] + Math.cos(loc.rot) * (r * 0.35),
      );
      lights.push(l);
      templeLights.push(l);
    }

    /*
     * A HEIGHT IS FROM THIS BUILDER'S GROUND, NOT THE TERRAIN UNDER THE
     * COLLIDER.
     *
     * Every builder draws from one `ground`, sampled at loc.pos, and states
     * its heights against it — `h: FL - ground`. WorldService added `h` to
     * the terrain at the collider's OWN centre instead, so any surface away
     * from loc.pos on sloping ground came out wherever the slope put it.
     * Measured at Prem Mandir: the jagati 0.18 m under its own marble, the
     * broad flight's treads the same. Pinned here, every landmark surface is
     * exactly as high as it is drawn.
     */
    for (let i = c0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c && c.h != null && c.top == null) c.top = ground + c.h;
    }
  }

  const mesh = b.toMesh('LandmarkGeometry', {
    castShadow: !!ctx.quality.shadows,
    receiveShadow: true,
  });
  group.add(mesh);
  for (const l of lights) group.add(l);

  /**
   * Geometry that is only ever seen from one room gets its own mesh.
   *
   * Everything else in this file lands in one LandmarkGeometry whose single
   * bounding sphere spans the whole 9.2 x 4.8 km world, so THREE's frustum cull
   * can never reject any of it — the town is cheap enough for that to be the
   * right trade. An interior is not: it is thousands of triangles nobody can
   * see from outside, and submitting them from the far side of Vrindavan is
   * pure waste. Its own mesh has its own tight bounds, so the frustum rejects
   * it, and InteriorSystem drops it entirely once you are well away.
   */
  const interiorMeshes = [];
  let extraTris = 0;
  for (const e of extra) {
    const m = e.builder.toMesh(e.name, {
      castShadow: !!ctx.quality.shadows,
      receiveShadow: true,
      // an extra mesh may carry its own atlas — Prem Mandir's 84 lila panels
      // are UV'd into the same one the town's house murals use
      ...(e.map ? { map: e.map(ctx) } : {}),
    });
    extraTris += e.builder.triangleCount;
    group.add(m);
    // a moving part carries the direction it moves in, so nothing downstream
    // has to know which way its temple faces
    if (e.open) m.userData.openBy = e.open;
    if (e.vesh) m.userData.vesh = e.vesh;
    /*
     * TWO SYSTEMS MUST NOT OWN ONE `visible` FLAG.
     *
     * Everything in `extra` was handed to `interiorMeshes`, and
     * `InteriorSystem.update` writes `mesh.visible = (near enough)` to every
     * one of them EVERY FRAME. The night veils and the Gopishwar vesh are in
     * `extra` too, and `Curtains` decides their visibility by the hour — so
     * whichever ran last won, and InteriorSystem runs last. Walk up to a
     * temple at ten in the morning and its veil is forced back on.
     *
     * Reported exactly that way: "still curtains are there although it's
     * 4am-9pm in the time when curtains shouldn't be there". Measured on a
     * fresh page at 10:26 Braj: one of 37 veils visible, and it was the one
     * temple within the draw distance.
     *
     * So a mesh whose visibility BELONGS to another system is not offered for
     * distance culling. It costs a draw call when you are near its temple,
     * which is exactly when you would be looking at it.
     */
    const owned = e.name.startsWith('Night:') || e.name.startsWith('Vesh:')
      || e.name.startsWith('Curtain:');
    if (!owned) interiorMeshes.push({ mesh: m, x: e.x, z: e.z, r: e.r });
  }

  console.info(`[landmarks] ${ctx.data.LOCATIONS.length} built, `
    + `${Math.round((b.triangleCount + extraTris) / 1000)}k triangles`
    + (interiorMeshes.length ? ` (${Math.round(extraTris / 1000)}k in ${interiorMeshes.length} culled interior)` : ''));
  // hand the lamps back so TimeOfDay can raise them as the sun goes
  if (ARCH_LOG) globalThis.__archLog = ARCH_LOG;
  return { group, colliders, anchors, templeLights, interiors, interiorMeshes, rooms };
}

/* ================================================================
 * Shared architectural helpers
 * ================================================================ */

/** A cusped (multifoil) arch outline — the defining Braj temple motif. */
function cuspedArch(b, cx, y0, cz, w, h, depth, rot, color, lobes = 5, shade = 0x241a12) {
  if (ARCH_LOG) {
    // the CALL SITE, so a fix can be made line by line rather than blanket
    const st = (new Error().stack || '').split('\n')[2] || '';
    const m = st.match(/(\w+)\.js:(\d+)/);
    ARCH_LOG.push({ x: cx, z: cz, y: y0, rot, w, h, owner: ARCH_OWNER,
      line: m ? (m[1] === 'LandmarkGenerator' ? +m[2] : m[1] + ':' + m[2]) : 0 });
  }
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, ly) => [cx + lx * cs, ly, cz + lx * sn];
  const pd = (lx, ly, off) => [cx + lx * cs - off * sn, ly, cz + lx * sn + off * cs];

  const half = w * 0.5;
  const springY = y0 + h * 0.52;
  const SEG = lobes * 4;
  const prev = { in: null, out: null };

  // --- arch infill: the dark aperture, which is what actually reads as an arch.
  //
  // `shade = null` leaves it out. A colonnade bay between a courtyard and its
  // verandah is an opening you walk through, not an aperture, and filling it in
  // turns an arcade into a row of blind panels with a wall behind them.
  if (shade !== null) {
    /*
     * BOTH FACES. The aperture used to be drawn once, `inset` to one side of
     * the arch's mid-plane, facing one way. An arch set into a wall has that
     * wall's solid box through its middle, so whichever side the aperture
     * landed on was either in front of the wall — and read as an opening —
     * or inside the box, buried, leaving only a pale rim. Which one you got
     * depended on which face of the building the arch was on, which is why
     * Prem Mandir's colonnade showed arches on one face and faint outlines
     * on the other. Drawn on both faces, the one outside the wall always
     * shows and the buried one costs a few triangles nobody sees.
     */
    const inset = depth * 0.45;
    let last = null;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const a = Math.PI * t;
      const ripple = 1 - 0.085 * (1 - Math.cos(a * lobes * 2)) * 0.5;
      const x = -Math.cos(a) * half * ripple;
      const yy = springY + Math.sin(a) * (h - h * 0.52) * ripple;
      const top = pd(x, yy, -inset), foot = pd(x, y0, -inset);
      const top2 = pd(x, yy, inset), foot2 = pd(x, y0, inset);
      if (last) {
        b.quad(last.foot, last.top, top, foot, shade);
        b.quad(foot2, top2, last.top2, last.foot2, shade);   // reversed winding
      }
      last = { top, foot, top2, foot2 };
    }
  }

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    const a = Math.PI * t;
    // a semicircle modulated by a cosine ripple gives the cusped profile
    const ripple = 1 - 0.085 * (1 - Math.cos(a * lobes * 2)) * 0.5;
    const x = -Math.cos(a) * half * ripple;
    const yy = springY + Math.sin(a) * (h - h * 0.52) * ripple;

    const inner = pd(x, yy, -depth * 0.5);
    const outer = pd(x, yy, depth * 0.5);
    if (prev.in) {
      b.quad(prev.in, inner, outer, prev.out, color);
    }
    prev.in = inner; prev.out = outer;
  }

  // jambs down to the ground
  for (const side of [-1, 1]) {
    const x = side * half;
    b.quad(
      pd(x, y0, -depth * 0.5), pd(x, springY, -depth * 0.5),
      pd(x, springY, depth * 0.5), pd(x, y0, depth * 0.5),
      color,
    );
  }
}

/** Lathe profile for a curvilinear (nagara) shikhara. */
/* ================================================================
 * THE BRAJ DETAIL VOCABULARY
 *
 * "currently no single temple look exactly as it really is." The massing was
 * researched and right; the ARCHITECTURE was absent. Every temple was boxes
 * plus cusped arches plus a dome, and what makes a Braj building read is the
 * horizontal grammar: a moulded base, a wall divided into registers, a
 * bracketed eave throwing a hard shadow, and a parapet breaking the sky.
 *
 * Shared on purpose. A correction here improves twenty-three buildings at
 * once, which is why `cuspedArch`, `shikhara` and `chhatri` are shared too.
 *
 * The numbers are MEASURED, from the project's own verified research in
 * docs/research — 34 dimensioned statements across ten surveys. The
 * recurring Braj single-storey temple is:
 *
 *     plinth            0.50 - 0.60 m, four or five steps
 *     arch springing    ~2.4 m
 *     chhajja/cornice   3.8 - 5.0 m
 *     parapet           0.9 - 1.0 m tall, top at 4.5 - 5.5 m
 *     piers             0.30 - 0.35 m square
 *     merlons           0.45 m wide, 0.5 - 0.6 m tall
 *
 * Everything here is stacked and offset BOXES. A moulding is three slabs of
 * decreasing width, not a turned profile: on a phone the silhouette and the
 * shadow line are the whole of the effect, and a profile nobody can resolve
 * costs triangles for nothing.
 * ================================================================ */

/**
 * Stone grade, and weathering. "The free half of the fix."
 *
 * Every temple here is currently ONE FLAT HEX, and that is a large part of
 * why they read as boxes: "on a real Braj temple, no two square metres are
 * the same colour, and the variation is not random noise — it is four
 * stacked, rule-governed layers."
 *
 * LAYER 1, THE STONE FAMILY. Braj red sandstone comes from the Bansi
 * Paharpur quarries in Bharatpur — Growse names the source over and over
 * (Hari Deva "red sandstone from the Bharatpur quarries", p.305; the Tikari
 * piers "brought from the Paharpur quarry", p.263) — and it is still sold in
 * THREE named grades: pink, red, and barra. One building carries all three,
 * "because it was built from whatever the barge brought". So a course varies
 * from its neighbour, and the variation runs in bands rather than speckle.
 *
 * LAYER 2, WEATHERING. Rain splash darkens the bottom metre; the underside of
 * every projection stays pale because nothing washes it; and streaks run DOWN
 * from sills and drip courses. Cheap: a darker tint low on the wall and a
 * paler one under an eave, which is where the eye expects them.
 *
 * Deterministic, never random — a building must look the same on every load.
 */
function grade(color, i) {
  /*
   * PLUS OR MINUS 20% COURSE TO COURSE. The survey is specific: "a real
   * facade shifts +/-20% value course to course", and my first pass used
   * +/-8%, which is invisible. Banded, not speckled — Bansi Paharpur sells
   * pink, red and barra, and a building carries all three "because it was
   * built from whatever the barge brought", which arrives a barge-load at a
   * time and therefore a course at a time.
   */
  const k = [1.18, 0.86, 1.02, 0.80, 1.10, 0.92][((i % 6) + 6) % 6];
  return tint(color, k);
}

/**
 * How a wall's colour changes up its own height.
 * @param {number} t  0 at the base, 1 at the wall head
 *
 * "ONE HEX PER BUILDING. This is the actual bug behind 'no single temple
 * looks exactly as it really is'. A real facade spans a 4.5:1 value range top
 * to bottom... A flat fill cannot look like stone at any level of geometric
 * detail."
 *
 * The full 4.5:1 includes what the LIGHTING does — deep shade at the foot of
 * a wall against sun on its head — so the vertex colour carries about 1.6:1
 * of it and the sun supplies the rest. Pushing the whole range into the
 * vertex colour would double-count and read as soot.
 *
 * The shape is not linear. Rain splash darkens the bottom 0.4 m hard, there
 * is a long even middle, and the head bleaches where nothing shelters it.
 */
/**
 * @param {number} t  0 at the building's foot, 1 at its head
 *
 * Kept as a thin wrapper over BrajPalette.vMul so there is exactly ONE
 * vertical ramp in the project. My first version of this curve was invented
 * and had the shape wrong — it ramped all the way to the parapet, where the
 * measurement off Govind Dev says a wall reaches full brightness at 30% of
 * its height and is flat above that. All the drama is in the bottom third,
 * where the rain splashes.
 */
function weathered(color, t) {
  return tint(color, vMul(t, 1));
}

/**
 * Red Braj sandstone, which is NOT fire-engine red.
 *
 * "The instinct is #c0392b or #b22222. Measured reality is H 14-22 degrees,
 * S 50-75%, and crucially V 42-78% in SUN — the moment it is in shade it
 * falls to V 17-32% while keeping its hue. 'Red sandstone' in Braj is a
 * dusty terracotta-to-rust."
 *
 * Passed a hue index so one quarry run differs from the next.
 */
function brajStone(i = 0) {
  const H = [16, 19, 14, 22, 17][((i % 5) + 5) % 5];
  const S = [0.62, 0.55, 0.71, 0.58, 0.66][((i % 5) + 5) % 5];
  const V = [0.62, 0.70, 0.52, 0.66, 0.58][((i % 5) + 5) % 5];
  // HSV to RGB, kept local because this is the only caller
  const c = V * S, x = c * (1 - Math.abs(((H / 60) % 2) - 1)), m = V - c;
  const [r, g, bl] = H < 60 ? [c, x, 0] : [x, c, 0];
  return (Math.round((r + m) * 255) << 16) | (Math.round((g + m) * 255) << 8)
    | Math.round((bl + m) * 255);
}

/**
 * The moulded plinth every Braj temple stands on.
 *
 * Not decoration — a building sitting flat on the ground reads as a prop. The
 * courses step IN going up, so the shadow under each lip draws the horizontal
 * line that says "this is masonry and it is heavy at the bottom".
 *
 * @param {number} h  total height, 0.55 m if you have nothing better
 */
function mouldedPlinth(b, cx, y, cz, w, d, rot, color, h = 0.55) {
  /*
   * THE NECK IS THE WHOLE POINT, and the first version of this got it wrong.
   *
   * It stepped monotonically inward, which the research names exactly:
   * "A KURSI IS NOT MONOTONIC. It goes out, out, then BACK IN, then out
   * again... That one re-entrant neck is the entire difference between a
   * moulding and a ziggurat."
   *
   * It is a KURSI, not an adhisthana — that is South Indian vocabulary and
   * does not apply to late-Mughal/Rajput/Jat Braj work. Growse's own words
   * for the courses are DASA (string-course) and DILA (panel), Memoir p.428,
   * and his two adjectives for a good Braj base are "BOLD in outline and
   * DELICATE in finish" (p.307). Bold means the SHADOW, not the overhang.
   *
   * Two rules that stop it looking like a wedding cake:
   *   - projections DO NOT scale with height. 0.10-0.18 m per side whether
   *     the base is 0.45 m or 2.4 m, because a stone course is a stone course
   *     whatever it carries;
   *   - the DADO absorbs the height instead, at about 0.40 of the total.
   */
  const PROFILE = [
    // [projection per side, share of height, tint]   + is out, - is RECESSED
    [0.16, 0.12, 0.90],   // apron: meets the paving, and gets buried over time
    [0.13, 0.16, 1.04],   // the bold roll — the heaviest shadow on the building
    [-0.05, 0.13, 0.80],  // THE NECK. recessed behind the wall face
    [0.02, 0.40, 0.98],   // the dila: the tall panelled field
    [0.11, 0.11, 1.05],   // the drip course, which is what reads across a lane
    [0.04, 0.08, 1.10],   // the floor slab you actually stand on
  ];
  /*
   * Below about 0.6 m there is not room for six courses — three is what a
   * lane-class plinth has, and a course under 0.08 m is one pixel on a phone
   * and costs the same triangles as one you can see.
   */
  const use = h < 0.62 ? [PROFILE[0], PROFILE[3], PROFILE[4]] : PROFILE;
  const span = use.reduce((t, c) => t + c[1], 0);
  let yy = y, ci = 0;
  for (const [proj, share, k] of use) {
    const hh = Math.max(0.08, (share / span) * h);
    // each course its own grade, banded — see `grade`
    b.box(cx, yy, cz, w + proj * 2, hh, d + proj * 2, tint(grade(color, ci++), k), rot);
    yy += hh;
  }
}

/**
 * How tall a plinth this building wants.
 *
 * Four classes, from the survey, and they are far apart — giving all
 * twenty-three temples the same base is itself a way of looking wrong.
 */
function plinthFor(kind) {
  return ({
    lane: 0.45,       // goswami house, samadhi shrine, small street temple
    compound: 1.05,   // the Vrindavan default: shrine porch above its own court
    court: 1.65,      // the whole compound lifted over the street
    akbari: 1.85,     // Govind Dev, Madan Mohan, Gopinath, Jugal Kishor
  })[kind] || 0.55;
}

/**
 * A chhajja: the projecting eave, ON BRACKETS.
 *
 * The brackets are the point. A plain slab reads as a shelf; a slab with a
 * row of stone brackets under it reads as Braj, because the shadow between
 * them is what the eye picks up from across the street. Spacing is close —
 * roughly a bracket every 1.1 m, which is what the photographs show.
 */
/**
 * Rain streaks hanging below a cornice.
 *
 * Growse's most useful single sentence, on Lala Babu's temple (p.257-58): the
 * two sikharas "are singularly plain, but have been wisely so designed that
 * their smooth polished surface may remain unsullied by rain and dust."
 *
 * DIRT LIVES WHERE CARVING IS. Flat polished surfaces stay clean. So streaks
 * hang below cornices, drip edges, carved bands and window sills — and never
 * on plain ashlar, which is why this is called from chhajja() and from
 * nowhere else. Scattering grime over a whole wall is the thing that makes a
 * render look dirty rather than old.
 *
 * And the black is chemistry, not soot: studies of Indian red sandstone
 * monuments find the crust is amorphous carbon and heavy metals bound in
 * gypsum, forming on rain-SHELTERED surfaces while rain-washed faces stay
 * red. Hence it hangs in the lee of the projection, not on it.
 *
 * Two triangles each, so a whole temple's streaking is 24-40 triangles.
 */
function streaks(b, cx, y, cz, w, d, rot, color, seed) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const wet = vShade(color, 0.42);
  let n = 0;
  const run = (len, across, along) => {
    // 2-5 per 6 m of cornice run
    const count = Math.max(2, Math.min(9, Math.round(len / 6 * 3.5)));
    for (let i = 0; i < count; i++) {
      const r = hashAt(seed, n++);
      const t = (i + 0.18 + r * 0.64) / count - 0.5;
      const wide = 0.10 + r * 0.15;                  // 0.10 - 0.25 m
      const drop = 0.8 + ((r * 7.3) % 1) * 1.4;      // 0.8 - 2.2 m
      /*
       * The shaded quadrant grows algae instead of carbon. 30% of streaks
       * there, and "there" is the side the sun never reaches: north, which
       * in this world's frame is -Z.
       */
      const north = Math.cos(rot + (across ? 0 : Math.PI / 2)) < 0;
      const col = (north && ((r * 13.7) % 1) < 0.3) ? W_ALGAE : wet;
      const lx = across ? t * w : along;
      const lz = across ? along : t * d;
      b.box(cx + lx * cs + lz * sn, y - drop, cz - lx * sn + lz * cs,
        across ? wide : 0.03, drop, across ? 0.03 : wide, col, rot);
    }
  };
  // 0.015 m proud of the wall, on all four faces
  for (const side of [1, -1]) run(w, true, side * (d * 0.5 + 0.015));
  for (const side of [1, -1]) run(d, false, side * (w * 0.5 + 0.015));
}

/** Deterministic 0..1. No Math.random in world building — the same town has
 *  to come back identical on every load. */
function hashAt(seed, n) {
  let x = 2166136261 ^ n;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  x ^= x >>> 15;
  return ((x >>> 0) % 100000) / 100000;
}

function chhajja(b, cx, y, cz, w, d, rot, color, out = 0.78, paint = PT_OCHRE) {
  /*
   * "THE CLEARANCE RULE: this is what makes it look right, more than the
   * projection does" — the bracket TOP must clear the arch below it. A
   * bracket that collides with the arch head is the commonest way to get a
   * Braj eave wrong, and it is why the arch springs at 2.4 m and the eave
   * sits at 3.8-4.2: the gap between them is where the brackets live.
   *
   * Measured eave lines, from the surveys:
   *   single-storey Braj temple      3.8 - 5.0 m   (default 4.2)
   *   domestic court, storey band    3.2 - 3.5 m
   *   two-storey street front        3.2-3.6 and 6.6-7.4
   *   three-storey lane front        3.4 / 6.6 / 9.6
   * and Growse's one hard number, Hari Deva at Govardhan: 30 ft to the
   * cornice on a hall 20 ft broad, so a cornice sits at about 1.5x the width
   * of the hall it caps — a sanity check for the big ones.
   *
   * The eave line falls at 0.82-0.88 of the total front height measured to
   * the top of the parapet, which is what leaves room for the parapet above.
   */
  const cs = Math.cos(rot), sn = Math.sin(rot);
  /*
   * CLOSELY-SET. Every written source says so, and 1.05 m was at the ceiling
   * of what the photographs allow: Growse records EIGHT brackets under one
   * small doorway at Jugal Kishor, which is 0.28 m centres, and this project's
   * own Meera Bai survey says "closely spaced flat corbels". 0.75 m on a long
   * run is the honest reading; a hood over a door goes tighter still.
   */
  const STEP = 0.75;
  const BR = 0.42;                            // bracket drop below the slab
  const put = (px, pz, bw, bd) => b.box(px, y - BR, pz, bw, BR, bd, tint(color, 0.86), rot);
  for (const side of [1, -1]) {
    const across = side * (d * 0.5 + out * 0.42);
    const n = Math.max(2, Math.round(w / STEP));
    for (let i = 0; i <= n; i++) {
      const lx = (i / n - 0.5) * w;
      put(cx + lx * cs + across * sn, cz - lx * sn + across * cs, 0.17, out * 0.82);
    }
  }
  for (const sx of [-1, 1]) {
    const ax = sx * (w * 0.5 + out * 0.42);
    const n = Math.max(2, Math.round(d / STEP));
    for (let i = 0; i <= n; i++) {
      const lz = (i / n - 0.5) * d;
      put(cx + ax * cs + lz * sn, cz - ax * sn + lz * cs, out * 0.82, 0.17);
    }
  }
  /*
   * The slab, and its DRIP. A chhajja is cut with a groove on the underside
   * of its outer edge so rain lets go instead of running back along the
   * soffit — modelled as a thin darker lip, which is all that is visible and
   * is the line the eye reads the eave by.
   */
  b.box(cx, y, cz, w + out * 2, 0.15, d + out * 2, tint(color, 1.06), rot);
  b.box(cx, y - 0.09, cz, w + out * 2 + 0.06, 0.1, d + out * 2 + 0.06, tint(color, 0.8), rot);
  b.box(cx, y + 0.15, cz, w + out * 1.6, 0.1, d + out * 1.6, tint(color, 0.92), rot);

  /*
   * THE PAINTED SOFFIT — the underside of the eave is never the wall colour.
   *
   * Growse on the modern Mathura/Vrindavan style: the balconies are
   * "protected from the weather by broad eaves, THE UNDER-SURFACE OF WHICH IS
   * BRIGHTLY PAINTED" (p.155), and at Rani Lachhmi's kunj by Keshi Ghat,
   * "unusually broad eaves which have a wavy pattern on their under-surface"
   * (p.264). It is the single most-forgotten piece of colour on these
   * buildings, and it is the one you actually stand under.
   *
   * Slightly inset so the dark drip lip still reads as the eave's edge, and
   * deliberately drawn OUTSIDE the weathering ramp's logic by being flat
   * paint: it is sheltered, so it neither bleaches nor takes rain splash.
   */
  b.box(cx, y - 0.14, cz, w + out * 1.86, 0.04, d + out * 1.86, paint, rot);

  streaks(b, cx, y - 0.2, cz, w, d, rot, color, Math.round(cx * 7 + cz * 13 + y));
}

/** Where the eave line goes, by how many storeys the front has. */
function chhajjaLines(storeys) {
  return [[4.2], [3.4, 7.0], [3.4, 6.6, 9.6]][Math.min(3, Math.max(1, storeys)) - 1];
}

/**
 * The parapet, with merlons.
 *
 * What a flat-roofed temple has instead of a roofline. Without it the wall
 * just stops, which is the single thing that made these buildings read as
 * boxes in the photographs. Merlons 0.45 m wide and 0.5 m tall, from the
 * survey, with a gap of about their own width between them.
 */
function parapet(b, cx, y, cz, w, d, rot, color, merlons = true) {
  /*
   * Measured from the ROOF DECK — the top of the wall, behind the chhajja —
   * and SET BACK from the wall face, which is the detail that stops it
   * reading as the wall simply continuing upward.
   *
   * Growse's wall heads for scale: Madan Mohan about 22 ft (6.7 m), Hari Deva
   * 30 ft to the cornice (9.1 m). So a Braj single-storey temple wall head is
   * 6.5-9.1 m and the parapet sits on top of that, about 1.15 m of it.
   *
   * Merlons 0.45 m wide, 0.5 m tall, with a gap about their own width — and
   * they sit on a coping, not straight on the wall.
   */
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const BACK = 0.12;                  // set back behind the wall face
  const H = 0.62;                     // the solid part
  const W = w - BACK * 2, D = d - BACK * 2;
  for (const [ax, az, ww, dd, len, alongX] of [
    [0, D * 0.5, W, 0.26, W, true], [0, -D * 0.5, W, 0.26, W, true],
    [W * 0.5, 0, 0.26, D, D, false], [-W * 0.5, 0, 0.26, D, D, false],
  ]) {
    const q = [cx + ax * cs + az * sn, cz - ax * sn + az * cs];
    b.box(q[0], y, q[1], ww, H, dd, tint(color, 1.03), rot);
    // the coping, which oversails the parapet slightly on both faces
    b.box(q[0], y + H, q[1], ww + 0.14, 0.12, dd + 0.14, tint(color, 0.88), rot);
    if (!merlons) continue;
    /*
     * A KANGURA ROW IS 74% SOLID. A castle battlement is 50%, and that one
     * ratio is the difference between Braj and Bodiam: "0.42 base, 0.15 gap,
     * 0.57 pitch — halving the pitch is one number and changes the whole
     * reading."
     *
     * And the merlon sits ON the corner. `(i + 0.5) / n` put a VOID exactly
     * where two runs meet, which is what you look at from every diagonal
     * approach — the one place the eye checks.
     */
    const n = Math.max(3, Math.round(len / 0.57));
    for (let i = 0; i <= n; i++) {
      const t = i / n - 0.5;
      const mx = ax + (alongX ? t * len : 0), mz = az + (alongX ? 0 : t * len);
      const mq = [cx + mx * cs + mz * sn, cz - mx * sn + mz * cs];
      // a merlon is a block with a stepped shoulder, not a plain tooth
      b.box(mq[0], y + H + 0.12, mq[1], alongX ? 0.42 : 0.28, 0.34, alongX ? 0.28 : 0.42,
        tint(grade(color, i), 1.07), rot);
      b.box(mq[0], y + H + 0.46, mq[1], alongX ? 0.28 : 0.18, 0.18, alongX ? 0.18 : 0.28,
        tint(color, 1.1), rot);
    }
  }
}

/**
 * A jharokha: the projecting balconied window.
 *
 * Most of what a Braj street front IS. A blank wall with one of these every
 * few metres stops being a wall and becomes a building somebody lives above.
 * Carried on two brackets, sill at about 1.3 m above its floor level, with a
 * small canopy over it.
 */
function jharokha(b, cx, y, cz, wide, rot, color, accent) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const OUT = 0.62;
  const f = (o) => [cx + o * sn, cz + o * cs];
  // the two brackets that carry it
  for (const sx of [-1, 1]) {
    const q = [cx + sx * wide * 0.36 * cs + OUT * 0.5 * sn,
      cz - sx * wide * 0.36 * sn + OUT * 0.5 * cs];
    b.box(q[0], y - 0.5, q[1], 0.18, 0.55, OUT, tint(color, 0.85), rot);
  }
  const p0 = f(OUT * 0.5);
  b.box(p0[0], y, p0[1], wide, 0.16, OUT, tint(color, 1.04), rot);      // its floor
  b.box(p0[0], y + 0.16, p0[1], wide, 0.5, 0.1, accent, rot);           // the railing
  for (const sx of [-1, 1]) {
    const q = [cx + sx * wide * 0.45 * cs + OUT * 0.5 * sn,
      cz - sx * wide * 0.45 * sn + OUT * 0.5 * cs];
    b.box(q[0], y + 0.16, q[1], 0.14, 1.5, OUT, tint(color, 1.02), rot);  // its jambs
  }
  cuspedArch(b, p0[0], y + 0.16, p0[1], wide * 0.68, 1.25, 0.22,
    rot, accent, 7, 0x241a12);
  b.box(p0[0], y + 1.66, p0[1], wide + 0.3, 0.14, OUT + 0.24, accent, rot);   // the canopy
  b.box(p0[0], y + 1.8, p0[1], wide * 0.8, 0.3, OUT * 0.7, tint(color, 1.05), rot);
}

/**
 * A string course, and the pilasters that divide a wall into bays.
 *
 * The cheapest thing on this list and close to the most effective: a blank
 * plastered wall six metres long is cardboard, and the same wall with a band
 * at two metres and shallow pilasters every three is a building.
 */
/**
 * @param {number[]} at  band heights as FRACTIONS of `wallH`, never metres.
 *
 * This defaulted to an absolute `[2.0]`, which "lands at mid-wall on a 4.6 m
 * temple and at ankle height on Govind Dev", and derived the pilaster top as
 * `max(at) * 1.7` — arbitrary, and stopping every pilaster at 3.4 m whatever
 * it was attached to.
 */
function registers(b, cx, y, cz, w, d, rot, color, at = [0.46], bays = 0, wallH = 4.4) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  for (const f of at) {
    const h = f * wallH;
    b.box(cx, y + h, cz, w + 0.22, 0.18, d + 0.22, tint(color, 0.9), rot);
    b.box(cx, y + h + 0.18, cz, w + 0.12, 0.1, d + 0.12, tint(color, 1.05), rot);
  }
  if (bays < 2) return;
  // a pilaster runs to the eave, which is what it is carrying
  const top = wallH * 0.94;
  for (const [ax, az, len, alongX] of [[0, d * 0.5, w, true], [0, -d * 0.5, w, true]]) {
    for (let i = 0; i <= bays; i++) {
      const t = i / bays - 0.5;
      const q = [cx + (ax + t * len) * cs + az * sn, cz - (ax + t * len) * sn + az * cs];
      b.box(q[0], y, q[1], 0.3, top, 0.16, tint(color, 1.04), rot);
      b.box(q[0], y + top, q[1], 0.42, 0.16, 0.22, tint(color, 0.9), rot);
    }
  }
}

function shikhara(b, cx, y0, cz, r, h, color, sides = 12) {
  const RINGS = 12;
  let prevRing = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    // the classic parabolic taper with a slight inward curve near the top
    const rr = r * Math.pow(1 - t, 0.62) * (1 - t * 0.12);
    const y = y0 + h * t;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * TAU;
      // gentle fluting so it is not a smooth cone
      const flute = 1 + Math.sin(a * sides * 0.5) * 0.035;
      ring.push([cx + Math.cos(a) * rr * flute, y, cz + Math.sin(a) * rr * flute]);
    }
    if (prevRing) {
      const shade = new THREE.Color(color).multiplyScalar(0.92 + t * 0.14).getHex();
      /*
       * OUTWARD. These quads were wound (bottom, next bottom, next top, top),
       * which faces the INSIDE of the ring — and the landmark mesh is single-
       * sided, so from outside every spire and dome showed the inner faces of
       * its far half, lit from the wrong side. Measured on Prem Mandir's
       * shikhara: 254 faces pointing in, 2 out. (bottom, top, next top, next
       * bottom) faces out.
       */
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prevRing[s], ring[s], ring[n], prevRing[n], shade);
      }
    }
    prevRing = ring;
  }
  // amalaka and kalasha finial
  const topY = y0 + h;
  b.box(cx, topY, cz, r * 0.5, r * 0.18, r * 0.5, 0xd8c9a0);
  b.box(cx, topY + r * 0.18, cz, r * 0.16, r * 0.5, r * 0.16, 0xc9a03c);
}

/** A chhatri: four columns, a slab, a small dome. */
function chhatri(b, cx, y, cz, r, h, color) {
  for (let s = 0; s < 4; s++) {
    const a = (s / 4) * TAU + Math.PI / 4;
    b.box(cx + Math.cos(a) * r * 0.7, y, cz + Math.sin(a) * r * 0.7, 0.26, h, 0.26, color);
  }
  b.box(cx, y + h, cz, r * 2.1, 0.22, r * 2.1, color);
  dome(b, cx, y + h + 0.22, cz, r * 0.95, r * 0.8, color);
}

function dome(b, cx, y, cz, r, h, color, sides = 12) {
  const RINGS = 6;
  let prev = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const a = t * Math.PI * 0.5;
    const rr = Math.cos(a) * r;
    const yy = y + Math.sin(a) * h;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * TAU;
      ring.push([cx + Math.cos(ang) * rr, yy, cz + Math.sin(ang) * rr]);
    }
    if (prev) {
      // outward: see shikhara()
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prev[s], ring[s], ring[n], prev[n], color);
      }
    }
    prev = ring;
  }
  b.box(cx, y + h, cz, 0.16, r * 0.45, 0.16, 0xc9a03c);
}

/** Compound wall with an arched gate on the entrance side. */
function compound(b, loc, ground, color, h = 2.6) {
  const { w, d } = loc.build;
  const W = w * 0.5 + 6, D = d * 0.5 + 6;
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const sides = [
    [[-W, -D], [W, -D]], [[W, -D], [W, D]],
    [[W, D], [-W, D]], [[-W, D], [-W, -D]],
  ];
  sides.forEach((s, i) => {
    const [a0, a1] = s;
    const A = p(a0[0], a0[1]), B = p(a1[0], a1[1]);
    const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    // leave the entrance side open in the middle
    if (i === 2) {
      const gap = 7;
      for (const side of [-1, 1]) {
        const seg = (len - gap) / 2;
        const ox = Math.cos(ang) * side * (gap / 2 + seg / 2);
        const oz = Math.sin(ang) * side * (gap / 2 + seg / 2);
        b.box(mx + ox, ground, mz + oz, seg, h, 0.5, color, ang);
      }
    } else {
      b.box(mx, ground, mz, len, h, 0.5, color, ang);
    }
  });
  return { W, D };
}

/* ================================================================
 * Per-kind builders
 * ================================================================ */

/**
 * Archetypes that open into a real interior you can walk through.
 *
 * Exported because InteriorSystem used to keep an identical literal copy, and
 * two copies of this set means either a temple with an interior you cannot
 * enter or a threshold into a solid block, depending which one you edited.
 */
export const ENTERABLE = new Set([
  'temple-rajasthani', 'temple-redstone', 'temple-marble',
  'temple-modern', 'temple-small', 'temple-gopuram',
]);

/*
 * Why the other four kinds are not on that list.
 *
 * `temple-haveli`, `temple-truncated`, `temple-colonnade` and `temple-gable`
 * cover seven of the fifteen temples — Radha Damodar, Radha Raman, Radha
 * Shyamsundar, Govind Dev, Radha Gopinath, Shahji and Radha Vallabh — and every
 * one of them was a SOLID BLOCK: you could walk all the way round and never
 * reach a Deity. All three temples whose real photographs ship are among them,
 * and a solid landmark's altar anchor is a notional point 0.3 of the footprint
 * in from the front, which is masonry. The photographs were sealed in stone.
 *
 * Adding them here was the first thing I tried and it is wrong: `buildInterior`
 * lays a 17.6 x 21.6 m hall inside a footprint whose builder has already put a
 * solid 16.4 x 15.8 m shrine block in the middle of it, so the altar ends up
 * inside the block again. These builders author their own mass, so they must
 * author their own inside — which is what `out.interior` is for, and what
 * Krishna Balaram already does.
 */

/**
 * Wall colliders with a gap where the door is, so a temple is a building you
 * enter rather than a solid block you walk around. The gap sits on the
 * entrance side, which loc.rot already defines.
 */
function hollowColliders(loc) {
  const { w, d } = loc.build;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const W = w * 0.5, D = d * 0.5;
  const t = 0.9;
  const door = Math.min(w * 0.3, 6);
  const out = [];
  const at = (lx, lz, bw, bd) => {
    out.push({
      type: 'box',
      x: loc.pos[0] + lx * cs - lz * sn,
      z: loc.pos[1] + lx * sn + lz * cs,
      w: bw, d: bd, rot,
    });
  };
  at(0, -D, w, t);                 // back
  at(-W, 0, t, d);                 // left
  at(W, 0, t, d);                  // right
  const side = (w - door) / 2;     // front, split around the doorway
  at(-(door / 2 + side / 2), D, side, t);
  at(door / 2 + side / 2, D, side, t);
  return out;
}

/**
 * The inside: a floor, a pillared mandapa, and the garbhagriha at the back with
 * the deities on their altar. Kept deliberately simple in geometry and rich in
 * light, because what carries a sanctum is the darkness and the lamps.
 */
function buildInterior(b, loc, ground) {
  const { w, d, color, accent } = loc.build;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const W = w * 0.5 - 1.2, D = d * 0.5 - 1.2;

  // polished floor
  const f = p(0, 0);
  b.box(f[0], ground + 0.02, f[1], W * 2, 0.08, D * 2, 0xd8cbb0, rot);

  // a chequer of inlay so the floor is not a flat slab
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if ((i + j) % 2) continue;
      const q = p(i * W * 0.36, j * D * 0.36);
      b.box(q[0], ground + 0.1, q[1], W * 0.3, 0.02, D * 0.3, 0xc4b189, rot);
    }
  }

  // Mandapa pillars — an EVEN number across, so none of them stands on the
  // axis. With three columns the middle one sat at lx = 0, which is the line
  // from the door to the Deities: you walked in for darshan and a 0.44 m
  // pillar was in front of Them. Nothing stands on that line in a real mandapa
  // and nothing stands on it here.
  const rows = 2, cols = 4;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lx = (i / (cols - 1) - 0.5) * W * 1.3;
      const lz = (j / Math.max(1, rows - 1) - 0.1) * D * 0.9;
      const q = p(lx, lz);
      b.box(q[0], ground + 0.1, q[1], 0.44, 3.4, 0.44, accent, rot);
      b.box(q[0], ground + 3.5, q[1], 0.66, 0.35, 0.66, color, rot);   // capital
      b.box(q[0], ground + 0.1, q[1], 0.6, 0.3, 0.6, color, rot);       // base
    }
  }

  // inner wall faces and a ceiling, so from inside it is a room and not a box
  // seen from behind its own backfaces
  const t = 0.35;
  const back = p(0, -D);
  b.box(back[0], ground + 0.1, back[1], W * 2, 5.2, t, 0xbfae8b, rot);
  const left = p(-W, 0), right = p(W, 0);
  b.box(left[0], ground + 0.1, left[1], t, 5.2, D * 2, 0xc4b191, rot);
  b.box(right[0], ground + 0.1, right[1], t, 5.2, D * 2, 0xc4b191, rot);
  const doorW = Math.min(W * 0.6, 3);
  const frontSeg = (W * 2 - doorW * 2) / 2;
  for (const sgn of [-1, 1]) {
    const q = p(sgn * (doorW + frontSeg / 2), D);
    b.box(q[0], ground + 0.1, q[1], frontSeg, 5.2, t, 0xc4b191, rot);
  }
  const ceil = p(0, 0);
  b.box(ceil[0], ground + 5.0, ceil[1], W * 2, 0.3, D * 2, 0x6a5540, rot);

  // Garbhagriha at the back: a raised plinth, a dark recess BEHIND the Deities,
  // and a gilt arch framing the opening.
  //
  // The dark mass used to be D * 0.42 deep and centred on the shrine, so it
  // swallowed the altar — the carved figures stood inside it, and a darshan
  // photograph hung at the altar was cut in half by a brown slab. A
  // garbhagriha's darkness belongs behind the Deities, as the thing They are
  // seen against. It is a back wall now, not a block.
  const gz = -D * 0.68;
  const g0 = p(0, gz);
  b.box(g0[0], ground + 0.1, g0[1], W * 0.95, 0.55, D * 0.5, 0xc8b38c, rot);
  const bk = p(0, gz - D * 0.13);
  b.box(bk[0], ground + 0.65, bk[1], W * 0.8, 3.6, D * 0.16, 0x3a2a1e, rot);
  // side returns, so the recess reads as a chamber and not as a painted wall
  for (const sgn of [-1, 1]) {
    const q = p(sgn * W * 0.4, gz - D * 0.02);
    b.box(q[0], ground + 0.65, q[1], D * 0.16, 3.6, D * 0.22, 0x3a2a1e, rot);
  }
  // the arch sits on the shrine's own axis: this took p() before it was
  // written, and adding 0.1 to a world z instead leaned it whenever rot != 0
  const ar = p(0, gz + 0.1);
  cuspedArch(b, ar[0], ground + 0.65, ar[1], W * 0.62, 3.2, 0.6, rot + Math.PI / 2, 0xc9a03c, 5);

  return { altar: p(0, gz + 0.4), altarY: 1.6 };
}

/**
 * The deities. Rendered as dressed standing figures rather than faces: at this
 * scale a suggested form under cloth and a crown reads as murti, where an
 * attempt at features would only read as a doll.
 */
function buildDeities(b, loc, ground, altar) {
  const rot = loc.rot;
  const [ax, az] = altar;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const entry = altarFor(loc.id);

  /*
   * An empty altar is a fact, not an omission.
   *
   * Jugal Kishore's Deity was removed to escape desecration and is worshipped
   * at Panna. Drawing a Radha-Krishna pair there — which the old id regex did,
   * because the id contains 'jugal' — is a false claim about a monument people
   * visit. The lamps still stand: the shrine is tended, it is simply empty.
   */
  if (entry && entry.form === 'empty') {
    lamps(b, ax, az, ground, cs, sn);
    return;
  }

  /** One dressed standing figure, at `ox` along the altar's own width. */
  const figure = (ox, cloth, skin, h, crown, extra) => {
    const x = ax + ox * cs, z = az + ox * sn;
    b.box(x, ground + 1.2, z, 0.42, h * 0.62, 0.3, cloth);            // robed body
    b.box(x, ground + 1.2 + h * 0.62, z, 0.22, h * 0.2, 0.22, skin);  // head
    if (crown) b.box(x, ground + 1.2 + h * 0.82, z, 0.3, h * 0.26, 0.3, 0xc9a03c);
    b.box(x, ground + 1.2 + h * 0.5, z + 0.16, 0.34, 0.12, 0.12, 0xe8891f); // garland
    b.box(x, ground + 1.15, z, 0.56, 0.12, 0.42, 0xc9a03c);           // pedestal
    if (extra === 'raised') {
      // Giridhari: the arm up, holding the hill. Growse documents the form;
      // he does not document the colour, so the hill takes the stone's.
      b.box(x, ground + 1.2 + h * 0.74, z, 0.5, 0.1, 0.12, skin, rot + 0.5);
      b.box(x, ground + 1.2 + h * 0.9, z, 0.7, 0.26, 0.5, 0x8a8478, rot);
    } else if (extra === 'staff') {
      // the walking stick of the South Indian bridegroom convention
      b.box(x + 0.3 * cs, ground + 1.2, z + 0.3 * sn, 0.06, h * 0.86, 0.06, 0x7a5a32);
    }
  };

  if (entry && entry.form === 'figures') {
    for (const f of entry.figures) figure(f.x, f.cloth, f.skin, f.h, f.crown, f.arm || (f.staff ? 'staff' : null));
    if (entry.crownBeside) {
      // Radha Raman and Radha Vallabh: a crown on its own stand stands for
      // Radha. There is no second murti and one must not be drawn.
      const cx2 = ax + entry.crownBeside * cs, cz2 = az + entry.crownBeside * sn;
      b.box(cx2, ground + 1.15, cz2, 0.3, 0.1, 0.26, 0xc9a03c);
      b.box(cx2, ground + 1.25, cz2, 0.12, 0.34, 0.12, 0xb8873b);
      b.box(cx2, ground + 1.59, cz2, 0.3, 0.26, 0.3, 0xc9a03c);
    }
  } else if (entry && entry.form === 'lingam') {
    // a lingam on its yoni base, which is what is actually there
    b.box(ax, ground + 1.15, az, 0.8, 0.18, 0.62, 0x6a6a62);
    b.box(ax, ground + 1.33, az, 0.34, 0.62, 0.34, 0x4a4a46);
    b.box(ax, ground + 1.95, az, 0.3, 0.1, 0.3, 0xc9a03c);
  } else if (entry && entry.form === 'devi-seated') {
    // multi-armed and seated on a lotus: the one thing the sources agree on
    b.box(ax, ground + 1.15, az, 0.9, 0.16, 0.7, 0xc9a03c);            // lotus seat
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.box(ax + Math.cos(a) * 0.36, ground + 1.24, az + Math.sin(a) * 0.3,
        0.3, 0.07, 0.16, 0xe8c07a, a);                                  // petals
    }
    b.box(ax, ground + 1.31, az, 0.56, 0.5, 0.42, entry.cloth);         // seated body
    const arms = entry.arms || 8;
    for (let i = 0; i < arms; i++) {
      const s2 = i % 2 ? 1 : -1;
      const t = Math.floor(i / 2) / Math.max(1, arms / 2 - 1);
      b.box(ax + s2 * (0.3 + t * 0.22) * cs, ground + 1.62 + t * 0.2, az + s2 * (0.3 + t * 0.22) * sn,
        0.34, 0.08, 0.08, entry.skin, rot + s2 * (0.3 + t * 0.7));
    }
    b.box(ax, ground + 1.81, az, 0.24, 0.24, 0.24, entry.skin);         // head
    b.box(ax, ground + 2.05, az, 0.32, 0.3, 0.32, 0xc9a03c);            // crown
  } else {
    /*
     * Nothing sourced for this landmark. A plainly dressed single figure —
     * NOT a Radha-Krishna pair, which is what the old regex produced for
     * anything whose id happened to contain 'radha' or 'krishna'. A generic
     * figure says "a Deity is worshipped here"; a pair makes a specific claim.
     */
    figure(0, 0xe8891f, 0xd8a878, 1.5, true, null);
  }

  lamps(b, ax, az, ground, cs, sn);
}

/** The two lamps either side of an altar. They stand whether or not a Deity does. */
function lamps(b, ax, az, ground, cs, sn) {
  for (const s of [-1, 1]) {
    const lx = ax + s * 1.5 * cs, lz = az + s * 1.5 * sn;
    b.box(lx, ground + 1.15, lz, 0.16, 0.5, 0.16, 0xb8873b);
    b.box(lx, ground + 1.65, lz, 0.26, 0.1, 0.26, 0xb8873b);
  }
}

/* ================================================================
 * Sri Sri Krishna Balaram Mandir, Raman Reti
 * ================================================================ */

/**
 * The palette, corrected against the photographs.
 *
 * Travel writing calls this a white marble temple. It is not — that is Srila
 * Prabhupada's samadhi, standing in front of it, which genuinely is carved
 * white Rajasthani marble. The mandir itself is cream and ivory painted
 * plaster picked out in salmon and terracotta, with pale blue-green in the
 * recess of every arch and a pale green jali gallery over the cornice. The only
 * marble in it is underfoot: black and white, and the step treads.
 */
const KB_CREAM = 0xefe2c2;          // the plaster everything is painted
const KB_IVORY = 0xf7efdc;          // the same plaster in sun
const KB_SALMON = 0xdd9b78;         // picked-out mouldings, spandrel scrollwork
const KB_TEAL = 0x6f9b9a;           // the recess behind every cusped arch
const KB_JALI = 0xc3d8a8;           // the first-floor pierced balustrade
const KB_MARBLE_W = 0xe9e5db;       // white marble tread
const KB_MARBLE_B = 0x24232c;       // black marble riser and chequer
const KB_DOME = 0xf2e4bc;           // cream to pale gold
const KB_RIB = 0xe0a882;            // the pink-peach ribbing on the domes
const KB_GOLD = 0xc9a03c;
const KB_SAFFRON = 0xe8891f;
const KB_WHITE_MARBLE = 0xf2efe6;   // the samadhi, which really is marble
const KB_DARKWOOD = 0x4a3220;

/**
 * Krishna Balaram, measured rather than composed.
 *
 * `loc.build.w/d` describe the walled plot; they are not the building. The OSM
 * building outline (way 334202009) gives a block about 32 m long by 24.5 m
 * wide, and the green shade net stretched over the open court reads about 15 m
 * square off ESRI imagery at 0.066 m/px. The two measurements close on each
 * other — 15 m of court plus about 4 m of verandah each side is the 24.5 m
 * width, and 15 + 4 + the altar hall is the 32 m length — which is the only
 * reason to trust either of them.
 */
const KB_LEN = 32;          // entrance face to the back of the altar hall
const KB_WID = 24.5;        // across
const KB_COURT = 7.5;       // half the open court
const KB_CZ = 4.5;          // the court's centre, measured from the block's
const KB_BAY = 3.0;         // pillar centre to pillar centre
const KB_HALL_Y = 0.78;     // the altar hall floor, five shallow risers up
const KB_TILE = 0.55;       // one chequer square

// scratch for placing an archetype's geometry into the merged interior
const _kbM = new THREE.Matrix4();
const _kbV = new THREE.Vector3();
const _kbQ = new THREE.Quaternion();
const _kbE = new THREE.Euler();
const _kbS = new THREE.Vector3(1, 1, 1);

/** A shade of a colour, for baking light in where no lamp is going to reach. */
/** correct() on a CSS hex string, returning the same form the content uses. */
function correctCss(css) {
  if (typeof css !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(css)) return css;
  const out = correctHex(parseInt(css.slice(1), 16));
  return '#' + out.toString(16).padStart(6, '0');
}

function tint(color, k) {
  return new THREE.Color(color).multiplyScalar(k).getHex();
}

/**
 * A bulbous ribbed dome on a square base. Not `shikhara`, and the difference
 * matters.
 *
 * Krishna Balaram's three towers get written up as shikharas, which suggests
 * the tall curvilinear nagara spire `shikhara` draws. The photographs say
 * otherwise: they are onion domes with vertical ribs, a fluted amalaka and a
 * kalash, on square drums, the centre one carried on an open pillared chhatri.
 * The ribbing is the alternating quad colour rather than a radius wobble,
 * because at sixteen sides a wobble is invisible and a colour change reads from
 * the far side of the courtyard, which is where you see these from.
 */
/**
 * A BANGALDAR EAVE — a cornice that undulates.
 *
 * "This is the single most distinctive line in the whole complex and it is
 * easy to miss: the eave is NOT straight. It is a chain of shallow
 * downward-curving ogee/cyma sweeps, one per bay — the Bengali bangaldar
 * curve, borrowed into Rajput marble."
 *
 * Drawn as a run of short segments whose height follows a cosine, so each bay
 * dips at its middle and lifts at the pilaster that carries it. Cheap: it is
 * the same slab the straight cornice was, cut into pieces and moved.
 */
function bangaldarEave(b, cx, y, cz, w, d, rot, color, bays = 5, drop = 0.42) {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const run = (len, across, along) => {
    const n = Math.max(6, Math.round(len / 0.5));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      // one full dip per bay, deepest at the middle of each
      const phase = (t * bays) % 1;
      const dy = -drop * Math.sin(phase * Math.PI);
      const o = (t - 0.5) * len;
      const lx = across ? o : along, lz = across ? along : o;
      b.box(cx + lx * cs - lz * sn, y + dy, cz + lx * sn + lz * cs,
        across ? len / n + 0.03 : 0.42, 0.34, across ? 0.42 : len / n + 0.03,
        color, rot);
    }
  };
  for (const side of [1, -1]) run(w, true, side * d * 0.5);
  for (const side of [1, -1]) run(d, false, side * w * 0.5);
}

function ribbedDome(b, cx, y0, cz, r, h, color, rib, sides = 16) {
  const RINGS = 8;
  let prev = null;
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const a = t * Math.PI * 0.5;
    // the onion profile: the radius swells past r above the springing, then closes
    const rr = r * Math.pow(Math.cos(a), 0.58) * (1 + 0.18 * Math.sin(a * 2));
    const yy = y0 + Math.sin(a) * h;
    const ring = [];
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * TAU;
      ring.push([cx + Math.cos(ang) * rr, yy, cz + Math.sin(ang) * rr]);
    }
    if (prev) {
      // outward: see shikhara()
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        b.quad(prev[s], ring[s], ring[n], prev[n], s % 2 ? rib : color);
      }
    }
    prev = ring;
  }
  // fluted amalaka, then the stacked kalash and its flag
  const top = y0 + h;
  b.box(cx, top - 0.06, cz, r * 0.66, r * 0.17, r * 0.66, tint(color, 0.95));
  b.box(cx, top + r * 0.11, cz, r * 0.30, r * 0.34, r * 0.30, KB_DOME);
  b.bevelBox(cx, top + r * 0.45, cz, r * 0.26, r * 0.30, r * 0.26, KB_GOLD);
  b.box(cx, top + r * 0.75, cz, r * 0.07, r * 0.46, r * 0.07, KB_GOLD);
  b.panel(cx + r * 0.24, top + r * 1.02, cz, r * 0.44, r * 0.26, KB_SAFFRON, 0, 0);
}

/**
 * The whole of Krishna Balaram: the courtyard you walk into, the hall and the
 * three altars at the end of it, the domes over them, and the samadhi standing
 * in front on the road side.
 *
 * What was here before was a solid 54 x 66 x 9.5 m block with the generic
 * `buildInterior` hall inside it — a 51.6 x 63.6 m room, six pillars, a 5 m
 * ceiling — which is an aircraft hangar with a shrine at one end. The actual
 * building is a chatuhshala: four ranges round an open court. You come in off
 * Bhaktivedanta Swami Marg past the samadhi, under the cusped doorway, and you
 * are standing on black and white marble laid on the diagonal with a covered
 * verandah on all four sides, murals on the walls behind the arcade, the tamal
 * tree to one side, and three altars up a broad flight of shallow steps.
 *
 * The interior goes into its own MeshBuilder so it can be culled; everything
 * else in this file shares one mesh whose bounding sphere spans the world.
 */
function buildKrishnaBalaram({ loc, b, ground, rng, terrain }) {
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);

  /**
   * Local frame: +lx across the front, +lz INTO the temple from the entrance.
   *
   * This is `compound`/`hollowColliders`/`buildInterior`'s convention rather
   * than the per-kind builders' — the two point opposite ways and this file has
   * been carrying both. This one wins here for a reason that is not taste: the
   * nearest road to Krishna Balaram is 48 m off its -X face, so the entrance
   * has to be on the -X face, which is local +Z. `b.box(..., rot)` is aligned to
   * this frame, which is what keeps the trim honest.
   */
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

  /**
   * panel() and box() use transposed rotation matrices — panel(rot) lies on
   * box(rot)'s -Z face — so the wall bearings are named once, here, rather than
   * rediscovered every time a mural goes up.
   */
  const PN_X = Math.PI / 2 - rot;             // a panel whose face looks toward +lx
  const PN_NX = Math.PI * 1.5 - rot;          // ... toward -lx
  const PN_NZ = Math.PI - rot;                // ... back toward the entrance

  // which way somebody in the court is looking when they look at the altars
  const faceAltar = Math.atan2(sn, -cs);

  const ib = new MeshBuilder();               // the interior, kept out of the shared mesh
  const colliders = [];
  const HW = KB_WID * 0.5, HL = KB_LEN * 0.5;
  const g0 = ground;

  /**
   * The marble clears the grass, and you stand ON it.
   *
   * This used to be `ground + 0.06` — one height sample at the centre plus a
   * measured 60 mm — with a note saying the choice was "a few centimetres of
   * shoe or a lawn in the mandir", because WorldService pinned the player to
   * the terrain and nothing here could change that.
   *
   * Both halves of that are now wrong, and you reported the first half:
   * "iskcon floor is completely white inside i saw but here's it's garden
   * like?". 60 mm was measured against ONE sample, and the terrain under this
   * block runs to +76 mm at the outer corners of the verandah — so at the
   * corners the grass still came through, which is exactly what a lawn in the
   * mandir looks like.
   *
   * So the slab is laid at the HIGHEST ground under it rather than at a guess
   * about the average, sampled across the actual footprint. And the second
   * half stopped being true tonight: `standHeight` puts you on any surface
   * within a step, so the marble gets a collider and your feet are on the
   * floor instead of a few centimetres inside it.
   */
  const FL = (() => {
    let hi = g0;
    if (terrain && terrain.sampleHeight) {
      // a grid over the whole block, corners included, because the corners are
      // where it was worst
      const N = 9;
      for (let i = 0; i <= N; i++) {
        for (let j = 0; j <= N; j++) {
          const lx = (i / N - 0.5) * KB_WID, lz = (j / N - 0.5) * KB_LEN;
          const h = terrain.sampleHeight(
            loc.pos[0] + lx * cs + lz * sn,
            loc.pos[1] - lx * sn + lz * cs,
          );
          if (h > hi) hi = h;
        }
      }
    }
    return hi + 0.02;          // two centimetres of marble over the highest blade
  })();
  const WT = 0.7;                             // wall thickness
  const DOOR = 5.0;                           // the studded doorway
  const WALL_H = 8.8;
  const SOFFIT = g0 + 5.80, TERRACE = g0 + 6.35;
  const HALL_Z = KB_CZ - KB_COURT;            // the altar hall's front line
  const HALL_FLOOR = FL + KB_HALL_Y;
  const HALL_TOP = g0 + 8.2;

  /**
   * Wall colliders are authored in short segments on purpose. WorldService
   * indexes every collider at its CENTRE POINT ONLY and SpatialGrid's cell is
   * 24 m, so a 54 m wall registered at one point is not found from more than a
   * cell away along its own length — measured, the old ISKCON walls went
   * unsolid 16.5 m out from their middles, which is how anyone was getting in
   * at all. Nothing below is longer than 16 m.
   */
  const wall = (lx, lz, w, d) => {
    const q = p(lx, lz);
    colliders.push({ type: 'box', x: q[0], z: q[1], w, d, rot });
  };

  /* ---------------- the block: outer walls and the doorway ---------------- */

  /*
   * A SMALL DOOR IN EACH SIDE WALL, at the altar end of the court.
   *
   * "there is a small door on both left and right sides of deities room of
   * iskcon temple allowing to walk in out of corridor also" — and Commons
   * "In and around of Sri Krishna-Balaram Mandir, Vrindavan 13" and "14" show
   * the west one from the corridor: a single wooden leaf with a mesh window
   * in the mural wall, "निकास EXIT" over it. "Sri Krishna Balaram Mandir
   * Vrindavan 15" and "16" show a small door under a mural in the verandah
   * wall beside the altar flight, which is where these are cut. Its size is
   * read off those photographs against the people in them, not measured.
   */
  const SIDE_DOOR_Z = KB_CZ - KB_COURT + 1.9;         // where the first verandah mural hung
  const SIDE_DOOR_W = 1.4, SIDE_DOOR_H = 2.5;
  for (const sx of [-1, 1]) {
    const lx = sx * (HW - WT * 0.5);
    const z0 = SIDE_DOOR_Z - SIDE_DOOR_W * 0.5, z1 = SIDE_DOOR_Z + SIDE_DOOR_W * 0.5;
    for (const [a, c] of [[-HL, z0], [z1, HL]]) {
      const q = p(lx, (a + c) * 0.5);
      b.box(q[0], g0, q[1], WT, WALL_H, c - a, KB_CREAM, rot);
    }
    const dq = p(lx, SIDE_DOOR_Z);
    b.box(dq[0], g0 + SIDE_DOOR_H, dq[1], WT, WALL_H - SIDE_DOOR_H, SIDE_DOOR_W, KB_CREAM, rot);
    // the threshold, a marble sill level with the floor either side
    b.box(dq[0], FL - 0.12, dq[1], WT + 0.3, 0.12, SIDE_DOOR_W, KB_MARBLE_W, rot);
    // a plain salmon architrave round it, both faces — the photographs show a
    // square-headed wooden door, not an arch
    for (const face of [HW + 0.02, HW - WT - 0.02]) {
      const fx = sx * face;
      for (const zz of [z0 - 0.08, z1 + 0.08]) {
        const jq = p(fx, zz);
        b.box(jq[0], g0, jq[1], 0.06, SIDE_DOOR_H + 0.16, 0.16, KB_SALMON, rot);
      }
      const hq = p(fx, SIDE_DOOR_Z);
      b.box(hq[0], g0 + SIDE_DOOR_H, hq[1], 0.06, 0.16, SIDE_DOOR_W + 0.32, KB_SALMON, rot);
    }
    // the leaf, wood with a mesh window, swung in flat against the wall
    {
      const lf = p(sx * (HW - WT - 0.04), z0 - SIDE_DOOR_W * 0.5 - 0.02);
      b.box(lf[0], FL, lf[1], 0.06, SIDE_DOOR_H - 0.05, SIDE_DOOR_W - 0.08, 0x6a4424, rot);
      const wq = p(sx * (HW - WT - 0.075), z0 - SIDE_DOOR_W * 0.5 - 0.02);
      b.box(wq[0], FL + 1.35, wq[1], 0.02, 0.8, SIDE_DOOR_W - 0.5, 0xb9a57a, rot);
    }
    // colliders in short runs (see `wall`), the doorway left open
    wall(lx, (-HL + z0) * 0.5, WT, z0 + HL);
    const mid = (z1 + HL) * 0.5;
    wall(lx, (z1 + mid) * 0.5, WT, mid - z1);
    wall(lx, (mid + HL) * 0.5, WT, HL - mid);
  }
  {
    const q = p(0, -(HL - WT * 0.5));
    b.box(q[0], g0, q[1], KB_WID, WALL_H, WT, KB_CREAM, rot);
    wall(-KB_WID * 0.25, -(HL - WT * 0.5), KB_WID * 0.5, WT);
    wall(KB_WID * 0.25, -(HL - WT * 0.5), KB_WID * 0.5, WT);
  }
  {
    const seg = (KB_WID - DOOR) * 0.5;
    for (const sx of [-1, 1]) {
      const lx = sx * (DOOR * 0.5 + seg * 0.5);
      const q = p(lx, HL - WT * 0.5);
      b.box(q[0], g0, q[1], seg, WALL_H, WT, KB_CREAM, rot);
      wall(lx, HL - WT * 0.5, seg, WT);
    }
    // the doorway: very large studded wooden leaves, standing open, under a
    // cusped surround. The header above it is what keeps the opening an opening
    // rather than a 5 x 9.8 m hole in the front of the building.
    const d0 = p(0, HL - WT * 0.5);
    b.box(d0[0], g0 + 5.55, d0[1], DOOR, WALL_H - 5.55, WT, KB_CREAM, rot);
    b.box(d0[0], g0 + WALL_H, d0[1], KB_WID + 0.4, 0.45, WT + 0.4, KB_SALMON, rot);
    cuspedArch(b, d0[0], g0 + 2.6, d0[1], DOOR + 0.9, 3.0, WT + 0.3, rot, KB_SALMON, 5, null);
    for (const sx of [-1, 1]) {
      const l = p(sx * (DOOR * 0.5 - 0.35), HL - WT - 0.2);
      b.box(l[0], g0, l[1], 0.7, 3.9, 0.16, KB_DARKWOOD, rot);
    }
    // the porch: a small domed pavilion over the doors, as the campus map draws it
    const c0 = p(0, HL + 0.1);
    b.box(c0[0], g0 + 6.6, c0[1], DOOR + 3.2, 0.55, 1.2, KB_SALMON, rot);
    chhatri(b, c0[0], g0 + 7.15, c0[1], 1.6, 1.9, KB_DOME);
  }

  /* ---------------- roofs, and the roofline ---------------- */

  /**
   * The verandah roof is a ring of slabs so the court itself stays open sky —
   * which is the whole point of a courtyard temple, and the reason you can see
   * the domes from inside it. `topColor` keeps the terrace bright while the
   * soffit under it stays the deep shade the arcade actually sits in; a light
   * ceiling here reads as a lit room, and on the `low` tier there is no lamp in
   * this building at all, so shade has to be painted in rather than lit in.
   */
  const SOFF = tint(KB_CREAM, 0.68);
  for (const sx of [-1, 1]) {
    const q = p(sx * (KB_COURT + (HW - KB_COURT) * 0.5), 0);
    b.box(q[0], SOFFIT, q[1], HW - KB_COURT, TERRACE - SOFFIT, KB_LEN, SOFF, rot,
      0b111111, KB_IVORY);
  }
  {
    const d = HL - KB_COURT - KB_CZ;
    const q = p(0, KB_COURT + KB_CZ + d * 0.5);
    b.box(q[0], SOFFIT, q[1], KB_COURT * 2, TERRACE - SOFFIT, d, SOFF, rot, 0b111111, KB_IVORY);
  }
  {
    // the altar hall stands taller than the rest and carries the domes
    const q = p(0, (HALL_Z - HL) * 0.5);
    b.box(q[0], g0 + 6.55, q[1], KB_WID, 2.05, HL + HALL_Z, KB_CREAM, rot);
    b.box(q[0], HALL_TOP, q[1], KB_WID + 0.5, 0.7, HL + HALL_Z + 0.5, KB_SALMON, rot);
    // the first floor over the hall front, with its own small arched openings —
    // without them the wall between the cornice and the domes is four blank
    // metres of cream and the whole side of the court dies
    for (let i = -3; i <= 3; i++) {
      const o = p(i * 3.1, HALL_Z + 0.05);
      b.box(o[0], g0 + 6.9, o[1], 1.5, 1.4, 0.16, KB_TEAL, rot);
      cuspedArch(b, o[0], g0 + 6.7, o[1], 1.9, 1.9, 0.3, rot, KB_SALMON, 5, null);
    }
  }

  /**
   * Three domes, the centre one tallest, standing OVER the altars rather than
   * back over the hall. Where they sit is not decoration: the hall's parapet is
   * 8.9 m and 7.5 m from the middle of the court, which subtends 50 degrees, so
   * a dome set six metres further back disappears behind it and you are left
   * with a courtyard temple whose towers you cannot see from the courtyard.
   * Over the sanctums they clear it, which is also where they belong.
   *
   * The rest: Verified off two independent Commons
   * photographs taken through the samadhi's arch: the centre is an open chhatri
   * on short dark columns under a large ribbed dome with a stacked finial, the
   * flanking two are lower solid domes on square drums with ochre devotional
   * markings painted down them. No published height exists for any of them, so
   * what follows is proportion read off photographs, not figures.
   */
  const DOME_Y = HALL_TOP + 0.7;
  const DOME_Z = HALL_Z - 4.2;
  for (const sx of [-1, 1]) {
    const q = p(sx * 7.2, DOME_Z);
    b.box(q[0], DOME_Y, q[1], 4.8, 2.9, 4.8, KB_IVORY, rot);
    /*
     * "Broad, LOW, deeply GADROONED (20-28 fat lobes), WIDER THAN THEY ARE
     * TALL." These were 14 ribs and taller than wide, which reads as an onion.
     */
    ribbedDome(b, q[0], DOME_Y + 2.9, q[1], 2.7, 2.3, KB_DOME, KB_RIB, 24);
    for (const a of [0.42, -0.42]) {
      b.panel(q[0] + Math.sin(rot + a) * 2.45, DOME_Y + 4.2, q[1] + Math.cos(rot + a) * 2.45,
        0.5, 1.5, KB_SAFFRON, rot + a, 0.22);
    }
  }
  {
    const q = p(0, DOME_Z);
    b.box(q[0], DOME_Y, q[1], 6.8, 2.0, 6.8, KB_IVORY, rot);
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * TAU + Math.PI / 8;
      b.box(q[0] + Math.cos(a) * 2.7, DOME_Y + 2.0, q[1] + Math.sin(a) * 2.7,
        0.36, 2.8, 0.36, KB_DARKWOOD);
    }
    b.box(q[0], DOME_Y + 4.8, q[1], 7.0, 0.55, 7.0, KB_IVORY, rot);
    ribbedDome(b, q[0], DOME_Y + 5.35, q[1], 3.7, 3.3, KB_DOME, KB_RIB, 26);
  }

  /* ---------------- the courtyard floor ---------------- */

  /**
   * Black and white marble on the diagonal, which is the first thing anybody
   * describes about this place, resolving into concentric bands at the centre.
   * It is drawn as one white slab with the black diamonds laid over it, because
   * a diamond is two triangles where a tile would be twelve, and the black half
   * of a 15 m court at a 0.55 m module is about 370 of them.
   *
   * The court is really SUNKEN below the verandah — ISKCON's own writing calls
   * it "a sunken black and white checkered marble courtyard" and you ascend
   * steps to the deities. It is flush here, deliberately: WorldService puts the
   * player's feet at terrain height and nothing in this engine climbs, so every
   * centimetre of level change indoors is a centimetre the player stands buried
   * in. The one place that earns it is the altar flight, which is railed off.
   */
  {
    const f = p(0, 0);
    b.box(f[0], FL - 0.5, f[1], KB_WID - WT * 1.4, 0.5, KB_LEN - WT * 1.4,
      KB_MARBLE_W, rot, 0b111111, KB_MARBLE_W);

    const e = Math.SQRT1_2 * KB_TILE;
    const N = Math.ceil(KB_COURT * 2 / KB_TILE) + 2;
    const y = FL + 0.012;
    for (let i = -N; i <= N; i++) {
      for (let j = -N; j <= N; j++) {
        if ((i + j) & 1) continue;
        // the tile lattice is i*E1 + j*E2 with E1 = (e, e) and E2 = (-e, e),
        // so a black tile (i + j even) lands every 2e in both axes and the
        // white ones fall into the gaps between their corners
        const clx = (i - j) * e;
        const clz = (i + j) * e;
        if (Math.abs(clx) > KB_COURT - 0.4 || Math.abs(clz) > KB_COURT - 0.4) continue;
        if (Math.hypot(clx, clz) < 3.05) continue;     // the bands take over here
        const A = p(clx - e, KB_CZ + clz);
        const C = p(clx + e, KB_CZ + clz);
        const D = p(clx, KB_CZ + clz - e);
        const E = p(clx, KB_CZ + clz + e);
        ib.quad([A[0], y, A[1]], [E[0], y, E[1]], [C[0], y, C[1]], [D[0], y, D[1]], KB_MARBLE_B);
      }
    }

    const ctr = p(0, KB_CZ);
    const SEG = 28;
    const bands = [0.55, 1.15, 1.70, 2.20, 2.65, 3.05];
    for (let k = 0; k < bands.length - 1; k++) {
      const r0 = bands[k], r1 = bands[k + 1];
      const col = k % 2 ? KB_MARBLE_W : KB_MARBLE_B;
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * TAU, a1 = ((s + 1) / SEG) * TAU;
        ib.quad(
          [ctr[0] + Math.cos(a0) * r0, y, ctr[1] + Math.sin(a0) * r0],
          [ctr[0] + Math.cos(a1) * r0, y, ctr[1] + Math.sin(a1) * r0],
          [ctr[0] + Math.cos(a1) * r1, y, ctr[1] + Math.sin(a1) * r1],
          [ctr[0] + Math.cos(a0) * r1, y, ctr[1] + Math.sin(a0) * r1],
          col,
        );
      }
    }
    for (let s = 0; s < SEG; s++) {
      const a0 = (s / SEG) * TAU, a1 = ((s + 1) / SEG) * TAU;
      ib.tri(ctr[0], y, ctr[1],
        ctr[0] + Math.cos(a1) * 0.55, y, ctr[1] + Math.sin(a1) * 0.55,
        ctr[0] + Math.cos(a0) * 0.55, y, ctr[1] + Math.sin(a0) * 0.55,
        KB_MARBLE_B);
    }
  }

  /* ---------------- the colonnade ---------------- */

  /**
   * Cream pillars on square plinths carrying serpentine cusped arches, five
   * bays a side at about 3 m centres — photo-scaled off a standing adult, which
   * is the only measure anyone has. Each bay is drawn twice: the cream band in
   * front and, set back behind it, a slightly smaller arch in the pale
   * blue-green the recesses are painted. That second arch is what makes the
   * arcade read as dark blue-green in shade, which is how it looks in every
   * photograph of the place.
   *
   * Neither carries an infill. A colonnade bay is an opening you walk through,
   * and `cuspedArch`'s dark aperture would turn the verandah into a painted
   * wall with nothing behind it.
   */
  const pillar = (lx, lz) => {
    const q = p(lx, lz);
    ib.box(q[0], FL - 0.04, q[1], 0.86, 0.26, 0.86, KB_IVORY, rot);
    ib.box(q[0], g0 + 0.22, q[1], 0.68, 0.95, 0.68, KB_CREAM, rot);       // square plinth
    ib.box(q[0], g0 + 1.17, q[1], 0.52, 0.20, 0.52, KB_IVORY, rot);
    ib.box(q[0], g0 + 1.37, q[1], 0.40, 1.92, 0.40, KB_IVORY, rot);       // shaft
    ib.bevelBox(q[0], g0 + 3.29, q[1], 0.62, 0.42, 0.62, KB_CREAM, rot, 0.34);   // capital
    ib.box(q[0], g0 + 3.71, q[1], 0.78, 0.22, 0.78, KB_IVORY, rot);       // abacus
  };

  /** One bay: the recess set back by (bx, bz) in the local frame, band in front. */
  const arch = (clx, clz, bx, bz, width, ar) => {
    const back = p(clx + bx, clz + bz);
    cuspedArch(ib, back[0], g0 + 3.28, back[1], width * 0.88, 2.00, 0.28, ar, KB_TEAL, 5, null);
    const q = p(clx, clz);
    cuspedArch(ib, q[0], g0 + 3.35, q[1], width, 2.15, 0.52, ar, KB_CREAM, 5, null);
  };

  const BAYS = Math.round(KB_COURT * 2 / KB_BAY);
  const AW = KB_BAY - 0.1;
  for (let i = 0; i <= BAYS; i++) {
    const t = -KB_COURT + (i / BAYS) * KB_COURT * 2;
    pillar(t, KB_CZ - KB_COURT);
    pillar(t, KB_CZ + KB_COURT);
    if (i > 0 && i < BAYS) {
      pillar(-KB_COURT, KB_CZ + t);
      pillar(KB_COURT, KB_CZ + t);
    }
    if (i < BAYS) {
      const m = t + KB_BAY * 0.5;
      arch(m, KB_CZ - KB_COURT, 0, -0.55, AW, rot);
      arch(m, KB_CZ + KB_COURT, 0, 0.55, AW, rot);
      arch(-KB_COURT, KB_CZ + m, -0.55, 0, AW, rot + Math.PI / 2);
      arch(KB_COURT, KB_CZ + m, 0.55, 0, AW, rot + Math.PI / 2);
    }
  }

  /**
   * Entablature: the spandrel band with its salmon scrollwork, the cornice, and
   * above it the pale green pierced jali balustrade of the first-floor gallery.
   * The jali is drawn as posts rather than pierced trefoils — at 6.6 m over a
   * 15 m court the openings are two pixels and the rhythm is all you see.
   */
  const entab = (clx, clz, len, alongZ) => {
    const q = p(clx, clz);
    const w = alongZ ? 0.60 : len, d = alongZ ? len : 0.60;
    ib.box(q[0], g0 + 5.50, q[1], w, 0.62, d, KB_CREAM, rot);
    ib.box(q[0], g0 + 6.12, q[1], w + 0.34, 0.30, d + 0.34, KB_SALMON, rot);
    ib.box(q[0], g0 + 6.42, q[1], w + 0.12, 0.16, d + 0.12, KB_IVORY, rot);
    const n = Math.round(len / 0.62);
    for (let i = 0; i < n; i++) {
      const o = -len * 0.5 + (i + 0.5) * (len / n);
      const r = alongZ ? p(clx, clz + o) : p(clx + o, clz);
      ib.box(r[0], g0 + 6.58, r[1], alongZ ? 0.30 : 0.26, 0.62, alongZ ? 0.26 : 0.30,
        KB_JALI, rot);
    }
    ib.box(q[0], g0 + 7.20, q[1], w + 0.18, 0.16, d + 0.18, KB_JALI, rot);
  };
  entab(0, KB_CZ + KB_COURT, KB_COURT * 2 + 0.6, false);
  entab(0, KB_CZ - KB_COURT, KB_COURT * 2 + 0.6, false);
  entab(-KB_COURT, KB_CZ, KB_COURT * 2, true);
  entab(KB_COURT, KB_CZ, KB_COURT * 2, true);

  /* ---------------- the verandah walls and their murals ---------------- */

  /**
   * "The temple courtyard is surrounded by verandahs which have beautiful wall
   * paintings depicting the life of Sri Radha-Krishna and Sri Gaur-Nitai" —
   * mostly framed canvases set into cusped-head recesses, with some painted
   * plaster relief. Nobody has published who painted them, when, or which
   * pastime is in which bay, so these are arched panels with a blue-skinned
   * figure against green and gold and nothing that claims to be a named scene.
   *
   * They are panels, not boxes: two triangles each, flat on the wall, which is
   * also the only way to stop a painting standing proud of its own wall.
   */
  const mural = (clx, clz, face, w, seed) => {
    const q = p(clx, clz);
    const y = g0 + 2.55;
    ib.panel(q[0], y, q[1], w + 0.34, 3.5, KB_SALMON, face, 0.02);
    cuspedArch(ib, q[0] + Math.sin(face) * 0.04, y + 1.2, q[1] + Math.cos(face) * 0.04,
      w + 0.5, 1.5, 0.08, -face, KB_SALMON, 5, null);
    ib.panel(q[0], y, q[1], w, 3.2, 0x3d6b45, face, 0.05);
    ib.panel(q[0], y - 1.25, q[1], w, 0.7, 0x54803f, face, 0.06);          // the ground
    ib.panel(q[0], y + 1.34, q[1], w * 0.9, 0.62, tint(KB_GOLD, 0.85), face, 0.07);
    const tan = (d) => [Math.cos(face) * d, -Math.sin(face) * d];
    const figure = (d, cloth, skin, h) => {
      const [ox, oz] = tan(d);
      ib.panel(q[0] + ox, y - 0.52 + h * 0.3, q[1] + oz, w * 0.22, h, cloth, face, 0.09);
      ib.panel(q[0] + ox, y - 0.52 + h + 0.16, q[1] + oz, w * 0.13, 0.30, skin, face, 0.11);
      ib.panel(q[0] + ox, y - 0.52 + h + 0.36, q[1] + oz, w * 0.17, 0.22, KB_GOLD, face, 0.11);
    };
    // blue-skinned Krishna against green and gold, which is the one thing every
    // description of these panels agrees on, and a companion beside him
    const side = seed % 2 ? -1 : 1;
    figure(side * w * 0.15, 0xe8c04c, 0x2f4f8a, 1.30);
    figure(-side * w * 0.17, 0xc8452a, 0xd8a878, 1.16);
  };

  const WALL_X = HW - WT - 0.05;
  for (let i = 1; i < 4; i++) {
    // i = 0 hung where the small side doors are cut now
    const lz = KB_CZ - KB_COURT + 1.9 + i * 3.7;
    mural(-WALL_X, lz, PN_X, 2.6, i);
    mural(WALL_X, lz, PN_NX, 2.6, i + 1);
  }
  for (const sx of [-1, 1]) mural(sx * 4.6, HL - WT - 0.05, PN_NZ, 2.6, sx > 0 ? 2 : 3);

  /* ---------------- the altar-side steps ---------------- */

  /**
   * A broad flight of shallow marble steps across the whole altar side: white
   * treads, black risers and nosings, so the flight reads as strong horizontal
   * stripes, with the ends stepping back. Photographs suggest four or five
   * risers of about 150 mm; five is the reading taken here and nothing
   * documents it either way.
   *
   * The hall at the top is walled off at the foot of the flight, because
   * nothing in this engine climbs and a hall 0.78 m up is a hall you wade
   * through. Standing in the court to take darshan is what everybody in the
   * photographs is doing in any case.
   */
  /** Tread tops, turned into colliders once the ground height is known. */
  const stepTops = [];
  const RISERS = 5, RISE = KB_HALL_Y / RISERS, TREAD = 0.64;
  for (let i = 0; i < RISERS; i++) {
    const front = HALL_Z + (RISERS - i) * TREAD;
    /*
     * The flight has to be as wide as the altars it serves.
     *
     * It used to taper to `KB_COURT - 4 * 0.45` = 5.7 m at the top tread, and
     * the outer altars stand at 7.2 m. So a pilgrim who walked to Gaura-Nitai
     * or Radha-Shyamasundara was standing 1.5 m beyond the end of the
     * staircase, with a 0.78 m drop where the next tread should have been —
     * and the side rail beginning at 7.5 m, which a body of 0.42 m radius
     * standing at 7.2 m is already touching. Reported as "cant come back from
     * deties area near stairs in iskcon ... although its empty rea", and the
     * empty area is exactly right: nothing is drawn there, the rail is
     * invisible, and the floor simply ends.
     *
     * Measured: the CENTRE altar walked out 37.8 m and down the steps without
     * trouble; both side altars stopped dead after 0.3 m. Which is also why
     * every check passed — they all aim at the middle.
     *
     * Photographs of this hall show the marble running the full width of the
     * altar bays in any case, so a flight that spans them is the truer thing
     * as well as the walkable one.
     */
    const hw = KB_COURT + 1.2 - i * 0.25;
    const q = p(0, front - TREAD * 0.5);
    ib.box(q[0], FL + i * RISE, q[1], hw * 2, RISE, TREAD, KB_MARBLE_B, rot,
      0b111111, KB_MARBLE_W);
    const n = p(0, front - 0.04);
    ib.box(n[0], FL + i * RISE, n[1], hw * 2, RISE + 0.02, 0.10, KB_MARBLE_B, rot);

    // And something to stand on. Each riser is 156 mm — a shallow step, well
    // inside what a person walks up without thinking. `h` is the tread's top
    // above the terrain, which is what WorldService.standHeight reads.
    stepTops.push({
      type: 'box', x: q[0], z: q[1], w: hw * 2, d: TREAD, rot,
      top: FL + (i + 1) * RISE, tag: 'temple-step',
    });
  }

  /* ---------------- the altar hall ---------------- */

  {
    const q = p(0, (HALL_Z - HL) * 0.5);
    ib.box(q[0], HALL_FLOOR - 0.12, q[1], KB_WID - WT * 2, 0.12, HL + HALL_Z,
      KB_MARBLE_W, rot, 0b111111, KB_MARBLE_W);
    /*
     * AND SOMETHING TO STAND ON.
     *
     * The altar hall's marble was DRAWN and never made solid, so you climbed
     * all five risers — measured 0.71, 0.92, 1.23, 1.38, 1.53 — stepped off
     * the top tread and fell straight through the floor to the terrain at
     * 0.69, stranded below the flight with no way back up. That is the
     * "can't walk down the stairs near deities" you hit.
     *
     * Exactly the ISKCON compound-wall fault in another place: geometry drawn
     * without a collider. `h` is the top above the terrain, which is what
     * `WorldService.standHeight` reads, and `tag` keeps it out of the props'
     * own queries.
     */
    /*
     * SOLID FROM THE COURT, a floor from the hall.
     *
     * The flight spans the altar bays, not the hall's whole width, and this
     * was `standOnly` — so beside the flight, from the court, you walked
     * straight into the 0.78 m floor at court height and stood in the marble
     * to the knee (platforms.mjs, two sides). Solid with a top blocks you
     * from below and lets you walk on it, and still lets you step DOWN off
     * its edge between the pillars, which is what "in between pillars also
     * it should work" asked for. No infinite side rail: that was the cage.
     */
    stepTops.push({
      type: 'box', x: q[0], z: q[1],
      w: KB_WID - WT * 2, d: HL + HALL_Z, rot,
      top: HALL_FLOOR, tag: 'temple-floor', floor: true,
    });

    /*
     * AND THE COURT ITSELF, which is the floor you actually spend the time on.
     *
     * The marble was drawn and never made solid, so you walked the courtyard
     * at TERRAIN height — a few centimetres inside the slab, with the grass
     * under it at your ankles. Reported as "iskcon floor is completely white
     * inside i saw but here's it's garden like?", and it is the same fault as
     * the altar hall in a different place: geometry drawn without a collider.
     *
     * It stops at the FOOT OF THE FLIGHT and does not reach over it. A slab
     * laid across a staircase is what paved ISKCON's five risers earlier
     * tonight and made them unwalkable, and doing it again here would undo
     * that fix in the one temple it was found in.
     */
    const courtFront = HALL_Z + RISERS * TREAD + 0.1;    // outside the bottom tread
    const courtDepth = HL - courtFront;
    if (courtDepth > 1) {
      const cq = p(0, courtFront + courtDepth * 0.5);
      stepTops.push({
        type: 'box', x: cq[0], z: cq[1],
        w: KB_WID - WT * 2, d: courtDepth, rot,
        top: FL, tag: 'temple-floor', standOnly: true,
      });
    }
    ib.box(q[0], g0 + 6.40, q[1], KB_WID - WT * 2, 0.16, HL + HALL_Z,
      tint(KB_CREAM, 0.84), rot);
    // the hall's own side and back walls, pale, because a Lambert surface under
    // a ceiling gets hemisphere light and nothing else, and 0x2a1f18 under a
    // ceiling is simply black
    const bk = p(0, -(HL - WT - 0.3));
    ib.box(bk[0], HALL_FLOOR, bk[1], KB_WID - WT * 2, 6.3, 0.3, tint(KB_CREAM, 0.9), rot);
    for (const sx of [-1, 1]) {
      const sw = p(sx * (HW - WT - 0.15), (HALL_Z - HL) * 0.5);
      ib.box(sw[0], HALL_FLOOR, sw[1], 0.3, 6.3, HL + HALL_Z, tint(KB_CREAM, 0.88), rot);
    }
  }

  /**
   * The three altars, side by side, each its own chamber behind its own arched
   * opening. Facing them, left to right:
   *
   *   LEFT    Sri Sri Gaura-Nitai — Chaitanya Mahaprabhu and Nityananda, with
   *           murtis of Srila Prabhupada and Srila Bhaktisiddhanta Sarasvati.
   *   CENTRE  Sri Sri Krishna-Balaram, the presiding deities.
   *   RIGHT   Sri Sri Radha-Shyamasundara with Lalita and Vishakha, standing in
   *           the order Lalita, Krishna, Radharani, Vishakha.
   *
   * Four independent sources give exactly this arrangement and this order:
   * Wikipedia (citing radha.name), vrajvrindavan.com, ISKCON Vrindavan's own
   * darshan listing, and theharekrishnamovement.org. Every one of them writes
   * "left altar" and "right altar" without saying from where; this reads it as
   * the devotee's left and right facing the deities, which is standard usage
   * and is the order ISKCON itself lists them in. All three sets were installed
   * together by Srila Prabhupada on Rama Navami, 20 April 1975.
   *
   * What is NOT in any source is which brother stands on which side of the
   * centre altar, so nothing here should be read as saying. The murtis are
   * dressed forms under cloth and a crown rather than attempts at faces, for
   * the same reason `buildDeities` gives: at this scale a suggested figure
   * reads as a murti and a modelled one reads as a doll.
   */
  const ALTAR_Z = HALL_Z - 3.2;

  const murti = (lx, lz, cloth, skin, h) => {
    const q = p(lx, lz);
    const base = HALL_FLOOR + 0.92;
    ib.box(q[0], base, q[1], 0.58, 0.14, 0.46, KB_GOLD, rot);
    ib.prism(q[0], base + 0.14, q[1], 0.40, 0.30, 0.34, 0.26, h * 0.60, cloth, rot);
    ib.box(q[0], base + 0.14 + h * 0.60, q[1], 0.24, h * 0.20, 0.24, skin, rot);
    ib.bevelBox(q[0], base + 0.14 + h * 0.80, q[1], 0.32, h * 0.28, 0.32, KB_GOLD, rot, 0.3);
    const g = p(lx, lz + 0.20);
    ib.box(g[0], base + 0.14 + h * 0.46, g[1], 0.40, 0.12, 0.10, KB_SAFFRON, rot);
    return q;
  };

  const seatedMurti = (lx, lz, cloth, skin) => {
    const q = p(lx, lz);
    const base = HALL_FLOOR + 0.92;
    ib.box(q[0], base, q[1], 0.50, 0.12, 0.44, KB_GOLD, rot);
    ib.prism(q[0], base + 0.12, q[1], 0.52, 0.42, 0.32, 0.26, 0.52, cloth, rot);
    ib.box(q[0], base + 0.64, q[1], 0.20, 0.22, 0.20, skin, rot);
  };

  /**
   * One altar: a marble plinth, a painted backdrop, and the arched opening it
   * is seen through.
   *
   * The arch needs a wall round it. On its own, `cuspedArch` with no infill is
   * a thin band in mid-air, and in a hall with no lamp on it that reads as a
   * pale wisp rather than as a doorway — which is exactly what the first pass
   * looked like. The tympanum over it and a jamb each side turn it back into an
   * opening with a lit chamber behind.
   */
  const altarBay = (lx) => {
    const plinth = p(lx, ALTAR_Z);
    ib.box(plinth[0], HALL_FLOOR, plinth[1], 6.4, 0.92, 2.0, KB_MARBLE_W, rot,
      0b111111, KB_MARBLE_W);
    const back = p(lx, ALTAR_Z - 1.5);
    ib.box(back[0], HALL_FLOOR, back[1], 6.4, 4.8, 0.5, 0x7a5a30, rot);
    ib.panel(back[0], HALL_FLOOR + 2.3, back[1], 5.0, 3.0, 0xb08c44, PN_NZ, 0.28);
    const screen = p(lx, ALTAR_Z + 1.5);
    cuspedArch(ib, screen[0], HALL_FLOOR + 0.6, screen[1], 5.2, 3.9, 0.7, rot, KB_GOLD, 7, null);
    ib.box(screen[0], HALL_FLOOR + 4.5, screen[1], 7.4, 1.8, 0.5, KB_CREAM, rot);
    for (const sx of [-1, 1]) {
      const j = p(lx + sx * 3.2, ALTAR_Z + 1.5);
      ib.box(j[0], HALL_FLOOR, j[1], 1.0, 4.5, 0.5, KB_CREAM, rot);
      const l = p(lx + sx * 2.35, ALTAR_Z + 1.2);
      ib.box(l[0], HALL_FLOOR, l[1], 0.20, 0.78, 0.20, 0xb8873b, rot);
      ib.box(l[0], HALL_FLOOR + 0.78, l[1], 0.30, 0.12, 0.30, 0xb8873b, rot);
    }
  };

  // LEFT — Gaura-Nitai, with Srila Prabhupada and Srila Bhaktisiddhanta
  /*
   * The three bays are 7.2 m either side of centre — 14.4 m apart. That number
   * has to leave this builder, because `DeityImages` had no way to know it and
   * was using a hardcoded 3.4 m gap: the right altar's darshan photograph came
   * out 3.4 m off centre, which is ON THE PIER between the centre and right
   * bays, not in an altar. Reported as "the deities are showing in the right
   * wall not in main area", and that is exactly what it was.
   *
   * The lateral direction was wrong too. `DeityImages` built its own sideways
   * axis as (cos yaw, -sin yaw); this builder's local +x is (cos rot, sin rot).
   * Those agree only when rot is 0, and mirror each other otherwise — so on any
   * temple not facing due north the left and right altars would have swapped.
   * Publishing the positions removes both faults and the guesswork with them.
   */
  const ALTAR_LX = { '-1': -7.2, 0: 0, 1: 7.2 };

  altarBay(-7.2);
  murti(-7.8, ALTAR_Z, KB_SAFFRON, 0xe6c68a, 1.62);
  murti(-6.6, ALTAR_Z, 0xf2ece0, 0xe6c68a, 1.62);
  seatedMurti(-9.2, ALTAR_Z + 0.1, KB_SAFFRON, 0xd8a878);
  seatedMurti(-5.2, ALTAR_Z + 0.1, KB_SAFFRON, 0xd8a878);

  // CENTRE — Krishna and Balaram, the divine brothers the temple is named for
  altarBay(0);
  const kb = murti(0.62, ALTAR_Z, KB_SAFFRON, 0x2f4f8a, 1.58);
  murti(-0.62, ALTAR_Z, 0x2f5d5a, 0xf0e4c6, 1.62);
  ib.box(kb[0], HALL_FLOOR + 2.02, kb[1], 0.50, 0.05, 0.05, KB_GOLD, rot + 0.4);

  // RIGHT — Radha-Shyamasundara, with Lalita and Vishakha
  altarBay(7.2);
  murti(5.7, ALTAR_Z, 0xc8452a, 0xd8a878, 1.42);        // Lalita
  murti(6.75, ALTAR_Z, KB_SAFFRON, 0x2f4f8a, 1.56);     // Shyamasundara
  murti(7.75, ALTAR_Z, 0xe8c04c, 0xd8a878, 1.48);       // Radharani
  murti(8.8, ALTAR_Z, 0x7a4a86, 0xd8a878, 1.42);        // Vishakha

  /* ---------------- Srila Prabhupada, on his vyasasana ---------------- */
  /*
   * "Still can't find prabhupada idol in iskcon which is golden in color."
   * He was not built at all — the altars were there and the founder-acharya
   * was not, which is the wrong way round for this temple.
   *
   * His murti sits on a VYASASANA in the temple room, raised, facing the
   * altars across the hall so that he has darshan of the Deities and the
   * devotees have him at their back as they face forward. Gilded, garlanded,
   * with the seat itself carved and cushioned.
   */
  {
    /*
     * OFF THE AXIS. Again.
     *
     * Put at lx = 0 this stood in the middle of the court, directly between
     * the devotees and the altar steps, and its collider stopped you dead —
     * measured: the walk was pinned at local z 7.2 and shoved back 0.1 m every
     * step, never reaching the first tread. Exactly what Prabhupada's samadhi
     * did to the main gate.
     *
     * His vyasasana stands to ONE SIDE of the hall, as it does in life. The
     * aisle from the court to the Deities is not something to put furniture in.
     */
    /*
     * -7.5 was straight in front of GAURA-NITAI, whose altar is at -7.2 — so
     * moving it off the centre aisle simply blocked a different altar, and the
     * reachability fill found it. It goes BETWEEN two altar lines, where
     * nothing is trying to be seen past it.
     */
    /*
     * Prabhupada's vyasasana belongs IN THE HALL, against a side, facing the
     * Deities — which is where it is in life and which is not where this put
     * it.
     *
     * `HALL_Z + 8.5` is eight and a half metres OUT from the hall's front
     * line: in the middle of the open courtyard, on the walking route between
     * the steps and the gate, as a solid 2.6 x 2.2 m block. Measured on a grid
     * of thirty-six points across the colonnade, walking out from in front of
     * the Deities:
     *
     *     across  -9 .. -2.5   14-17 m, clear
     *     across   0           27 m, clear
     *     across  +2.5        6.4 -> 4.9 -> 3.4 -> 1.9 m
     *     across  +5          6.4 -> 4.9 -> 3.4 -> cannot stand
     *     across  +7.2, +9     14-17 m, clear
     *
     * One side of the court only, and the seat is what is standing in it.
     * Reported as "still unable to move frmo between the pillars in front of
     * deities and am stauck there can't back".
     *
     * It moves to the hall's left side, level with the altars and hard against
     * the wall: clear of the outermost altar's rail, clear of the flight, and
     * out of the court entirely. The comment above it said "out in the hall"
     * while the number said the opposite, which is how it survived.
     */
    const VX = -10.1;
    const VZ = ALTAR_Z + 0.5;                   // beside the altars, against the side wall
    const q = p(VX, VZ);
    // the vyasasana: a stepped, carved, gilded seat
    ib.box(q[0], HALL_FLOOR, q[1], 2.6, 0.45, 2.2, KB_MARBLE_W, rot);
    ib.box(q[0], HALL_FLOOR + 0.45, q[1], 2.2, 0.5, 1.9, KB_GOLD, rot);
    ib.box(q[0], HALL_FLOOR + 0.95, q[1], 1.9, 0.22, 1.6, 0xc4415c, rot);   // the cushion
    // its back, carved and gilded
    const bq = p(VX, VZ - 0.85);
    ib.box(bq[0], HALL_FLOOR + 1.17, bq[1], 1.9, 1.9, 0.18, KB_GOLD, rot);
    ib.box(bq[0], HALL_FLOOR + 3.07, bq[1], 2.1, 0.3, 0.3, KB_GOLD, rot);
    for (const sgn of [-1, 1]) {                                            // arms
      const a2 = p(VX + sgn * 0.95, VZ);
      ib.box(a2[0], HALL_FLOOR + 1.17, a2[1], 0.18, 0.55, 1.7, KB_GOLD, rot);
    }
    // and Srila Prabhupada himself: seated, saffron, golden
    const base = HALL_FLOOR + 1.17;
    ib.prism(q[0], base, q[1], 0.78, 0.62, 0.48, 0.40, 0.72, KB_SAFFRON, rot);
    ib.box(q[0], base + 0.72, q[1], 0.30, 0.32, 0.30, 0xe6c68a, rot);       // his face
    ib.box(q[0], base + 0.30, q[1], 0.86, 0.12, 0.12, 0xe8891f, rot);       // garland
    for (const sgn of [-1, 1]) {                                            // his hands
      const h = p(VX + sgn * 0.30, VZ + 0.24);
      ib.box(h[0], base + 0.38, h[1], 0.18, 0.14, 0.22, 0xe6c68a, rot);
    }
    // the low table before him, with his books on it
    const t2 = p(VX, VZ + 1.5);
    ib.box(t2[0], HALL_FLOOR, t2[1], 1.3, 0.55, 0.8, 0x6a4a2a, rot);
    ib.box(t2[0], HALL_FLOOR + 0.55, t2[1], 0.5, 0.12, 0.36, 0xc0562f, rot);
    /*
     * The seat's own footprint, and only as tall as the seat.
     *
     * 2.6 x 2.6 with no height was a full-height block a third deeper than the
     * vyasasana it stands for, in the middle of the hall between the steps and
     * the Deities. The seat is 2.6 x 2.2 and its back reaches 3.07 m, so that
     * is what is solid; nothing above it is.
     */
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 2.6, d: 2.2, rot,
      h: (HALL_FLOOR + 3.4) - ground, tag: 'kb-vyasasana' });
  }

  /* ---------------- the tamal tree ---------------- */

  /**
   * The tamal was here before the temple was, and is most of why this land was
   * taken: tamals were nearly absent from Vrindavan in the early seventies and
   * Srila Prabhupada was very pleased to find one, said kirtan would be held
   * under it, and instructed that it be worshipped. He sat under it, especially
   * in 1977.
   *
   * The photographs show a low circular marble kerb about seat height with bare
   * earth inside, and a separate small square plaque block beside it — not the
   * single square platform a first description suggested. The circular kerb is
   * what is built, because that is what two photographs show.
   */
  {
    const TX = -5.3, TZ = KB_CZ - 3.0;
    const t0 = p(TX, TZ);
    const R = 1.85;
    for (let s = 0; s < 18; s++) {
      const a0 = (s / 18) * TAU, a1 = ((s + 1) / 18) * TAU;
      const ox = t0[0] + Math.cos(a0) * R, oz = t0[1] + Math.sin(a0) * R;
      const qx = t0[0] + Math.cos(a1) * R, qz = t0[1] + Math.sin(a1) * R;
      ib.quad([ox, FL, oz], [ox, FL + 0.45, oz], [qx, FL + 0.45, qz], [qx, FL, qz], KB_MARBLE_W);
      ib.tri(t0[0], FL + 0.45, t0[1], qx, FL + 0.45, qz, ox, FL + 0.45, oz, KB_MARBLE_W);
    }
    ib.box(t0[0], FL + 0.44, t0[1], R * 1.2, 0.05, R * 1.2, 0x6a5138, rot);   // bare earth
    ib.prism(t0[0], FL + 0.45, t0[1], 0.62, 0.62, 0.30, 0.30, 6.4, 0x6a5138);
    // the canopy rides clear of the verandah roof, so it reads as a tree in a
    // courtyard rather than an awning over it
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.6;
      const rr = 0.8 + rng() * 0.7;
      ib.bevelBox(t0[0] + Math.cos(a) * rr, FL + 6.3 + rng() * 0.8, t0[1] + Math.sin(a) * rr,
        2.6, 1.7, 2.6, i % 2 ? 0x3a6330 : 0x437239, a, 0.42);
    }
    ib.bevelBox(t0[0], FL + 7.5, t0[1], 3.2, 1.8, 3.2, 0x3d6a33, 0.3, 0.42);
    const pl = p(TX + 2.5, TZ - 0.5);
    ib.box(pl[0], FL, pl[1], 1.0, 1.15, 0.8, KB_MARBLE_W, rot);
    ib.panel(pl[0], FL + 0.74, pl[1], 0.8, 0.5, 0x2f5d5a, PN_NZ, 0.42);
    /*
     * The KERB is knee-high and the TRUNK is thin. Two colliders, not one.
     *
     * This was a single circle of radius 2.15 with no height — a cylinder 4.3 m
     * across going up to the sky, in the middle of the courtyard, where all
     * anyone can see is a marble ring 0.45 m tall with a tree out of it. You
     * walked between the pillars and hit nothing you could see. Reported
     * exactly that way: "it blocks walking akthough its empty rea between
     * pillars".
     *
     * A collider with no `h` is a wall to the sky — that is what "no height"
     * means to `collide` — and this one was a third wider than the kerb it was
     * standing in for.
     */
    // the kerb: low enough to step up onto and sit on, which is what it is for
    colliders.push({ type: 'circle', x: t0[0], z: t0[1], r: R, h: (FL + 0.45) - ground,
      tag: 'kb-kerb' });
    // and the trunk, which really is solid
    colliders.push({ type: 'circle', x: t0[0], z: t0[1], r: 0.46, tag: 'kb-tamal' });
  }

  /* ---------------- the people who are in it ---------------- */

  /**
   * A handful of devotees, sitting. Not a crowd: the photographs show six or
   * seven on the steps and one or two standing in the shade, and that is what
   * the place is like outside arti.
   *
   * They are the crowd's own archetypes from npc/Archetypes.js, which is the
   * point — authoring figures here would put a row of undressed grey people in
   * a temple whose street outside is full of dhotis, saris and tilak. They are
   * baked into the interior mesh rather than instanced because they never move
   * and there are eight of them; RitualSystem's per-figure Groups are the one
   * unmerged thing in the world pipeline and not a pattern to copy.
   */
  {
    const spots = [[-5.4, 2], [-3.6, 1], [1.2, 0], [2.7, 2], [5.2, 1], [-1.5, 3]];
    for (const [lx, step] of spots) {
      const t = PEOPLE[Math.floor(rng() * PEOPLE.length) % PEOPLE.length];
      const lz = HALL_Z + (RISERS - step) * TREAD + TREAD * 0.5;
      const q = p(lx, lz);
      const geo = buildSeated(t, 'lap', null);
      _kbM.compose(
        _kbV.set(q[0], FL + step * RISE, q[1]),
        _kbQ.setFromEuler(_kbE.set(0, faceAltar + Math.PI + (rng() - 0.5) * 0.5, 0)),
        _kbS,
      );
      ib.addGeometry(geo, _kbM);
      geo.dispose();
    }
    for (const sx of [-1, 1]) {
      const q = p(sx * (KB_COURT + 2.0), KB_CZ + (rng() - 0.5) * 7);
      const t = PEOPLE[Math.floor(rng() * PEOPLE.length) % PEOPLE.length];
      const geo = buildStanding(t, 'down');
      _kbM.compose(
        _kbV.set(q[0], FL, q[1]),
        _kbQ.setFromEuler(_kbE.set(0, faceAltar + (rng() - 0.5) * 1.2, 0)),
        _kbS,
      );
      ib.addGeometry(geo, _kbM);
      geo.dispose();
    }
  }

  /* ---------------- the campus ---------------- */
  /*
   * Everything outside the temple block — the fence and both gates with their
   * guards, the arcaded approach, the Samadhi with Srila Prabhupada in it, the
   * Museum, the great arch that bridges them, the kiosks, the market, the
   * offices and halls, the building site, and the road with its peepal and
   * garland sellers — is laid out from OpenStreetMap's own outlines in
   * IskconCampus.js. What stood here before was sized "to hold what is
   * listed, and labelled an estimate", before the survey existed: a 150 x 176
   * m wall against the real 124 x 132, the goshala INSIDE it (the survey:
   * "DO NOT put the goshala inside the compound"), the Gurukula on the wrong
   * side and no arch at all.
   */
  const signB = new MeshBuilder();
  const place = (geo, lx, y, lz, faceLocal) => {
    const q = p(lx, lz);
    const wa = rot + faceLocal;
    // an archetype faces +z at yaw 0, i.e. (sin yaw, cos yaw)
    const yaw = Math.atan2(Math.cos(wa), Math.sin(wa));
    _kbM.compose(_kbV.set(q[0], y, q[1]), _kbQ.setFromEuler(_kbE.set(0, yaw, 0)), _kbS);
    b.addGeometry(geo, _kbM);
    geo.dispose();
  };
  const campus = buildIskconCampus({
    b, signB, p, rot, ground, terrain, colliders, rng, signUV,
    roadDistance: terrain && terrain.roadDistance ? (qx, qz) => terrain.roadDistance(qx, qz) : null,
    helpers: { cuspedArch, shikhara, ribbedDome, tint, buildSeated, buildStanding, PEOPLE, place },
  });

  /* ---------------- what the rest of the game needs back ---------------- */

  /**
   * The flight is walkable; only the sides are railed.
   *
   * There used to be a solid collider straight across the FOOT of the steps —
   * a wall where the stairs are — because when this was written nothing in the
   * engine could climb, so the only way to stop you standing inside a hall
   * 0.78 m up was to stop you reaching it at all. Climbing exists now:
   * WorldService.standHeight puts you on anything within 0.52 m of your feet,
   * and each riser here is 156 mm. So the steps became steps, and the barrier
   * across them came out. Walking up to take darshan is the entire point of
   * the building.
   *
   * The side rails stay. They stop you wading into the hall over the verandah,
   * which is not a step and never was.
   */
  {
    const gy = ground;
    for (const t of stepTops) {
      // `standOnly` was being dropped here, which turned the altar hall's
      // marble into a wall across the top of the flight for anyone whose feet
      // were more than a step below it — see WorldService.collide.
      colliders.push({ type: 'box', x: t.x, z: t.z, w: t.w, d: t.d, rot: t.rot,
        h: t.top - gy, tag: t.tag, standOnly: t.standOnly, floor: t.floor });
    }
    /*
     * THE SIDE RAILS ARE GONE, AND THEY WERE THE CAGE.
     *
     * They were added to "stop you wading into the hall over the verandah,
     * where there are no steps", then moved twice to clear the altars. Both
     * changes missed the real fault, which is that the collider carried NO
     * `h` — and in this codebase a collider with no height is INFINITELY
     * TALL. So each rail was a full-height wall running the entire side of
     * the hall. You could walk in down the steps at the front and then never
     * get out except by walking all the way back to those same steps, which
     * is exactly what was reported four times: "I have to go to the end of
     * the poles to get out."
     *
     * They also prevented nothing. The hall floor stands at 1.54 m over a
     * courtyard at 0.70 — a 0.84 m rise against a STEP_UP of 0.52 — so
     * `standHeight` already refuses to let anyone climb in over the verandah.
     * The rails guarded a wall that was already there.
     *
     * Removing them makes the gaps between the pillars behave the way the
     * pillars themselves do: the pillars are solid, the gaps are not. Walking
     * out between two of them steps you off the hall edge down into the
     * court, which is what a person would do.
     *
     * Found by replicating collide()'s own filter — including its `radius + 6`
     * query and its `top <= feetY + STEP_UP` skip — at the point the body
     * TRIED to reach rather than the point it was pushed back to. Sampling
     * where the body ended up reports nothing, because collide has by
     * definition already pushed it clear of whatever stopped it. Three
     * earlier probes reported "no blocker" for that reason.
     */
  }

  /**
   * The altar anchor sits at the FRONT of the plinth rather than on the murtis.
   * Three things aim at it: the camera's focus during darshan, where an
   * offering settles, and — 1.5 m to one side of it — where RitualSystem stands
   * its pujari. On the murtis it would have put him on top of the plinth and
   * buried him to the waist in it.
   */
  const altarW = p(0, HALL_Z - 0.9);
  const darshanW = p(0, HALL_Z + (RISERS + 1) * TREAD + 0.35);
  return {
    colliders,
    mesh: { name: 'IskconInterior', builder: ib, x, z, r: KB_LEN },
    // the campus's painted boards, on the town's sign atlas
    meshes: [{ name: 'IskconSigns', builder: signB, x, z, r: 140, map: signAtlas }],
    // rooms inside the campus you can walk into: Srila Prabhupada's samadhi
    rooms: campus.rooms || [],
    interior: {
      altar: [altarW[0], HALL_FLOOR + 1.35, altarW[1]],
      darshan: [darshanW[0], darshanW[1]],
      facing: faceAltar,
      floor: HALL_FLOOR,
      // The threshold is the BUILDING and not the plot. loc.build is 54 x 66 m,
      // so the footprint test used to declare you inside anywhere within
      // 44 x 54 m of the centre — out in the forecourt, past the samadhi,
      // nowhere near a door, with the vignette and the name card already up.
      // `open` says this interior is a courtyard: it is still under the sky and
      // must not be graded down like a sanctum.
      /*
       * The COMPOUND wall, which is not the temple block and not `loc.build`.
       * It moved from 33 x 39 to 75 x 88 when the campus was given room for
       * the Gurukula, the guest house, Govinda's, the goshala, the stalls and
       * the Tulsi garden — and `gates.mjs` was still sampling the old extents,
       * so it reported all four walls missing when none of them were. A check
       * must read the wall a builder declares, never infer one.
       *
       * It rides INSIDE `volume` because `volume` is the only part of this
       * record the world keeps: `interiors[loc.id] = inner.volume`. Hung
       * beside it, it was silently dropped.
       */
      volume: {
        x, z, hw: HW, hd: HL, rot, open: true, door: p(0, HL + 0.9),
        // the fence's line and both gates, from OSM, in this builder's frame
        compound: campus,
        // the small doors cut through both side walls, in this builder's frame:
        // walls declared open here, and nowhere else
        sideDoors: [-1, 1].map((sx) => ({ lx: sx * (HW - WT * 0.5), lz: SIDE_DOOR_Z, w: SIDE_DOOR_W })),
      },
      // where each altar actually is, in world coordinates. `side` matches the
      // `side` on each entry in content/deities.js.
      altars: Object.entries(ALTAR_LX).map(([side, lx]) => {
        const q = p(lx, ALTAR_Z);
        return { side: Number(side), x: q[0], y: HALL_FLOOR + 1.35, z: q[1] };
      }),
    },
  };
}

/**
 * Hollow out a temple that authors its own mass.
 *
 * Four builders — haveli, truncated, colonnade, gable — each drew their shrine
 * as ONE solid box, so seven of the fifteen temples had no inside. You could
 * walk all the way round Radha Damodar, Radha Raman, Radha Shyamsundar, Govind
 * Dev, Radha Gopinath, Shahji or Radha Vallabh and never reach a Deity, and the
 * darshan photographs hung at their notional altars were sealed in the stone.
 *
 * `ENTERABLE` + `buildInterior` cannot help here: that lays a hall sized from
 * the whole footprint, and these builders have already put a solid block in the
 * middle of it. So this replaces the block with its own walls, and hands back
 * the `interior` record the anchor code is looking for.
 *
 * `openings` are the front doorways, in the builder's local frame, given as
 * {c, hw} so the walls line up with whatever arcade the facade already draws.
 * Anything not covered by an opening becomes a pier.
 */
function hollowShrine(b, loc, o) {
  const { hx, hz, floorY: FL, height: H, color, t = 0.75, openings } = o;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p2 = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const colliders = [];

  const wall = (lx, lz, lw, ld) => {
    const q = p2(lx, lz);
    b.box(q[0], FL, q[1], lw, H, ld, color, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld, rot });
  };
  wall(0, -hz + t / 2, hx * 2, t);                      // back
  wall(-hx + t / 2, 0, t, hz * 2);                      // left
  wall(hx - t / 2, 0, t, hz * 2);                       // right

  // front: piers between the openings
  let edge = -hx;
  for (const op of [...openings].sort((a, c) => a.c - c.c)) {
    const lo = op.c - op.hw;
    if (lo > edge + 0.12) wall((edge + lo) / 2, hz - t / 2, lo - edge, t);
    edge = Math.max(edge, op.c + op.hw);
  }
  if (hx > edge + 0.12) wall((edge + hx) / 2, hz - t / 2, hx - edge, t);

  // polished floor
  const c0 = p2(0, 0);
  b.box(c0[0], FL + 0.02, c0[1], (hx - t) * 2, 0.1, (hz - t) * 2, 0xd8cbb0, rot);

  /* ---- the garbhagriha, at the back ---- */
  const gz = -hz * 0.62;
  const g0 = p2(0, gz);
  b.box(g0[0], FL + 0.05, g0[1], hx * 1.1, 0.55, hz * 0.5, 0xc8b38c, rot);
  // the darkness belongs BEHIND the Deities, as the thing They are seen
  // against — built around Them it simply swallowed the altar
  const bk = p2(0, gz - hz * 0.17);
  b.box(bk[0], FL + 0.6, bk[1], hx * 1.0, 3.0, hz * 0.14, 0x3a2a1e, rot);
  for (const sgn of [-1, 1]) {
    const q = p2(sgn * hx * 0.5, gz - hz * 0.03);
    b.box(q[0], FL + 0.6, q[1], hz * 0.14, 3.0, hz * 0.26, 0x3a2a1e, rot);
  }
  const ar = p2(0, gz + hz * 0.12);
  /*
   * NO APERTURE: this arch FRAMES the Deities, and you look through it.
   *
   * cuspedArch's default dark infill is for blind arches. This one took the
   * default by omission, and it only ever worked because the infill happened
   * to be drawn on the far side, behind the altar. Once the aperture was drawn
   * on both faces — so blind arches set into walls stop burying theirs — the
   * near copy stood 0.2 m in front of the Deities and the sightline check
   * caught it: "Radha Damodar blocked by LandmarkGeometry at 2.7 m of a 2.9 m
   * sightline". The comment above already says where the darkness belongs.
   */
  cuspedArch(b, ar[0], FL + 0.6, ar[1], hx * 0.8, 2.7, 0.55, rot,
    o.doorMetal || 0xc9a03c, 5, null);
  if (o.silverDoor) {
    /*
     * "At the rear an embossed silver double-leaved door leads into the
     * sanctum." Two leaves, embossed, bright against pale stone — the research
     * is specific, and it is what photographs of this sanctum are of. Only
     * where a source says so; the others keep their gilt arch.
     */
    for (const sgn of [-1, 1]) {
      const q = p2(sgn * hx * 0.2, gz + hz * 0.1);
      b.box(q[0], FL + 0.6, q[1], hx * 0.38, 2.5, 0.14, 0xd8dade, rot);
      for (let r2 = 0; r2 < 4; r2++) {
        b.box(q[0], FL + 0.85 + r2 * 0.55, q[1], hx * 0.3, 0.32, 0.2, 0xbfc4ca, rot);
      }
    }
  }

  // `buildDeities` measures from the ground it is given and puts its pedestal
  // 1.15 m up, so hand it a datum that lands the pedestal on the plinth
  const al = p2(0, gz + 0.5);
  buildDeities(b, loc, FL + 0.6 - 1.15, al);
  const dp = p2(0, gz + 0.5 + Math.min(3.4, hz * 0.9));

  return {
    colliders,
    interior: {
      // chest height above the plinth: DeityImages lifts its panel from here
      altar: [al[0], FL + 1.13, al[1]],
      darshan: [dp[0], dp[1]],
      facing: rot + Math.PI,
      floor: FL,
      volume: { x: loc.pos[0], z: loc.pos[1], hw: hx, hd: hz, rot, door: p2(0, hz + 0.9) },
    },
  };
}


/* ================================================================
 * Shri Banke Bihari Mandir, old town
 * ================================================================ */

/**
 * The most visited temple in Vrindavan, and the one the research corrected most.
 *
 * What was here before was a solid mass under three domes. The sources are
 * explicit that this is wrong: it is "NOT a curvilinear nagara shikhara and NOT
 * a Dravidian gopuram", but a TIERED Rajasthani block — a three-storey arcaded
 * temple-palace with "arched windows and meticulous stonework", "carved arched
 * ceilings", latticed marble, "courtyards and verandas", and small domed
 * pavilions rather than one dominant spire. The research says in terms: do not
 * invent a big tower. So there is no tower.
 *
 * Colour was corrected too. It reads as a much later, lighter building than the
 * sixteenth-century group — cream and buff render with marble lattice — and the
 * note is emphatic: do not copy Govind Dev's red. The red in `loc.build.accent`
 * is used for cloth and awnings, which is where red actually is here, and never
 * for the fabric of the building.
 *
 * Three documented things drive the plan:
 *
 *   THE COURTYARD. Not a long axial hall. You come through a gate into an open
 *   court and face the sanctum across it, arcaded verandas and jali on all
 *   sides. The court is bright and open to the sky; the shrine recess is dark.
 *
 *   THE CURTAIN. Darshan here is not continuous. A curtain is drawn shut and
 *   reopened every few minutes, because Bihari Ji's gaze is held to be too
 *   overpowering to rest on. It is the single most distinctive thing about this
 *   temple and it is built as a moving mesh, not painted on.
 *
 *   NO BELLS. None hang anywhere in the premises. `compound` and the other
 *   builders hang them by default; this one must not, and the absence is as
 *   much a part of the place as anything present.
 *
 * The approach — vehicles stopping well short, the bazaar tunnel, the numbered
 * gates, the shoe stand — is documented as the iconic sequence. The gate and
 * the shoe stand are here; the bazaar is BuildingGenerator's job.
 *
 * Footprint is an ESTIMATE and the research says so: no source gives one, only
 * that the temple is hemmed in and occupies a small fraction of the 4.74-acre
 * corridor acquisition. 44 x 50 m is the data's figure and is treated as a
 * guess, not a measurement.
 */
const BB_MARBLE = 0xf0ece2;
const BB_JALI = 0xe6e0d2;
const BB_SHADE = 0x3a2c1e;
const BB_GOLD = 0xc9a03c;

function buildBankeBihari({ loc, b, ground, rng }) {
  const { w, d, h, color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

  const HW = w * 0.5, HD = d * 0.5;       // 22 x 25
  const T = 1.7;                           // masonry, thick
  const FL = ground + 0.55;                // the court floor, up on the plinth
  /*
   * Storey heights [ESTIMATE in the survey, and honestly labelled there: a
   * tilted-camera photogrammetric solve "is wildly unstable at these angles,
   * swinging 5-11 m for the same storey", and the researcher declined to
   * dress that up as a measurement].
   *
   * What IS firm is the SHAPE: the middle storey is "a low band, largely in
   * shadow… proportionally the shortest storey", and the top is the tall open
   * one. This was [5.2, 4.4, 3.6] — descending, which inverts the building.
   */
  const TIER = [6.5, 3.2, 5.0];            // to the main parapet, ~15-17 m
  const SD = 10.5;                         // depth of the sanctum range at the back
  const VER = 3.2;                         // veranda depth inside each wall
  const GATE = 5.5;                        // the numbered gate
  const colliders = [];
  const ib = new MeshBuilder();            // the inside, culled separately

  /* ---------------- plinth and court floor ---------------- */
  /*
   * A NARROW plinth, not an apron.
   *
   * This was `w + 5` by `d + 5` — a 49 x 55 m skirt of pale stone, which
   * reads as a temple plaza. There is no plaza. The corridor scheme that
   * would create one is still at the land-registry stage: 14 registries and
   * 1,386 m² acquired in ten months as of May 2026. Satellite at 0.265 m/px
   * shows an unbroken carpet of flat roofs with the lanes as thin dark
   * cracks, and the nearest mapped lane is 3.6 m from the temple node.
   *
   * What IS immediately outside is "a raised platform with a turned-baluster
   * stone railing, and flower sellers with cane baskets of marigold, rose and
   * tuberose on red plastic sheets" — a platform at the gate, not a ring.
   */
  b.box(x, ground - 0.5, z, w + 1.6, 1.05, d + 1.6, 0xc8b9a0, rot);
  {
    const plat = p(0, HD + 2.6);
    b.box(plat[0], ground - 0.5, plat[1], GATE + 7, 1.0, 5.2, 0xc8b9a0, rot);
    // the turned-baluster railing along its outer edge
    for (let i = 0; i <= 12; i++) {
      const q = p((i / 12 - 0.5) * (GATE + 6.2), HD + 5.0);
      b.box(q[0], ground + 0.5, q[1], 0.16, 0.72, 0.16, 0xd6cdb8, rot);
      b.box(q[0], ground + 0.74, q[1], 0.24, 0.2, 0.24, 0xd6cdb8, rot);
    }
    const rl = p(0, HD + 5.0);
    b.box(rl[0], ground + 1.22, rl[1], GATE + 6.6, 0.16, 0.3, 0xd6cdb8, rot);
  }
  b.box(x, FL - 0.1, z, w - T * 2, 0.12, d - T * 2, 0xd9d2c2, rot);
  // crowd-worn polished stone underfoot, which the research calls out
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      if ((i + j) % 2) continue;
      const q = p(i * (HW - T) * 0.28, j * (HD - T) * 0.24);
      b.box(q[0], FL - 0.02, q[1], (HW - T) * 0.24, 0.03, (HD - T) * 0.2, 0xcfc6b2, rot);
    }
  }

  /* ---------------- the tiered outer wall ---------------- */
  /*
   * A wall ring, not a solid block: the courtyard is the point. Each tier steps
   * back a little and carries its own arcade, which is the "tiers of arcaded
   * openings" the facade description asks for.
   */
  const wall = (lx, lz, lw, ld, y0, hh, col, solid = true) => {
    const q = p(lx, lz);
    b.box(q[0], y0, q[1], lw, hh, ld, col, rot);
    if (solid) colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld + 0.3, rot });
  };

  let y = FL;
  for (let t = 0; t < TIER.length; t++) {
    const back = t * 0.9;                        // each storey a little narrower
    const hw = HW - back, hd = HD - back;
    const th = TIER[t];
    const tone = t === 0 ? color : tint(color, 1 + t * 0.03);

    // back and sides, full width
    wall(0, -hd + T / 2, hw * 2, T, y, th, tone, t === 0);
    wall(-hw + T / 2, 0, T, hd * 2, y, th, tone, t === 0);
    wall(hw - T / 2, 0, T, hd * 2, y, th, tone, t === 0);

    /*
     * THE TOP STOREY IS FOUR-FIFTHS AIR.
     *
     * Measured off the photographs by automated void detection: nine bays
     * arranged 3 | 3 | 3, within-group pitch 239 px against a between-group
     * pitch of 304 px (so the pier gap is 1.27x a normal bay), and an opening
     * width of 193 px mean — "void : pitch = 0.81".
     *
     * Drawing a solid wall here and then punching arch reliefs into it, which
     * is what this did, gets the ratio backwards: it was a wall with holes
     * where the building is a screen of columns. So on the top storey the
     * front is PIERS ONLY.
     */
    if (t === 2) {
      const BAYS = 9, PITCH = (hw * 2 - 2.4) / BAYS;
      for (let i = 0; i <= BAYS; i++) {
        // the two group divisions carry heavier square piers
        const heavy = i === 3 || i === 6;
        const lx = (i / BAYS - 0.5) * (hw * 2 - 2.4);
        const q = p(lx, hd - T / 2);
        b.box(q[0], y, q[1], heavy ? 0.85 : 0.42, th, T * 0.7, tone, rot);
        if (!heavy) {                       // slender round colonnette reading
          b.box(q[0], y + th - 0.5, q[1], 0.62, 0.22, T * 0.8, tint(tone, 1.08), rot);
          b.box(q[0], y + 0.28, q[1], 0.6, 0.2, T * 0.8, tint(tone, 1.05), rot);
        }
      }
      /*
       * MICRO-CUSPED, not multifoil. "The two storeys use different arch
       * grammars": nine big lobes on the ground arch, and up here "a dense
       * band of ~20+ tiny scallops around the intrados". Passing 5 lobes to
       * both is the single easiest way to make this facade generic.
       */
      for (let i = 0; i < BAYS; i++) {
        const lx = ((i + 0.5) / BAYS - 0.5) * (hw * 2 - 2.4);
        const q = p(lx, hd - T / 2);
        cuspedArch(b, q[0], y + th * 0.34, q[1], PITCH * 0.81, th * 0.6, T * 0.6,
          rot, tint(tone, 1.06), 20, null);
      }
      // the lintel the arcade carries
      const lt = p(0, hd - T / 2);
      b.box(lt[0], y + th - 0.28, lt[1], hw * 2, 0.34, T * 0.75, tint(tone, 1.04), rot);
    } else if (t === 1) {
      /*
       * The low middle storey is the ONE place the arcuated language stops —
       * "short square piers with rectangular (not arched) openings, a
       * trabeated gallery". (~70% confidence it is a real gallery rather than
       * a deep bracketed soffit read at a steep angle; flagged, not asserted.)
       */
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const lx = (i / n - 0.5) * (hw * 2 - 1.2);
        const q = p(lx, hd - T / 2);
        b.box(q[0], y, q[1], 0.7, th, T * 0.8, tone, rot);
      }
      const lt = p(0, hd - T / 2);
      b.box(lt[0], y, lt[1], hw * 2, 0.5, T * 0.85, tone, rot);            // sill
      b.box(lt[0], y + th - 0.4, lt[1], hw * 2, 0.4, T * 0.85, tone, rot); // lintel
    } else {
      // the ground floor front, with the gate left open
      const seg = (hw * 2 - GATE) / 2;
      for (const sgn of [-1, 1]) {
        wall(sgn * (GATE / 2 + seg / 2), hd - T / 2, seg, T, y, th, tone, true);
      }
    }

    /*
     * THE CHHAJJAS — the signature, and we had none of it.
     *
     * Growse's single adjectival phrase for this building in 1883 is "THE
     * EXTREMELY BOLD PROJECTION OF ITS EAVES". This was a 0.42 m string
     * course, which is a moulding, not an eave.
     *
     * Each one is three parts, in this order going down: a carved fascia
     * band, then a DENSE CONTINUOUS ROW of bulbous turned pendants at about
     * 0.25 m pitch, then a row of large tapering corbels at a wider pitch.
     * The second chhajja projects further than the first.
     */
    if (t < 2) {
      const OUT = t === 0 ? 1.15 : 1.55;         // chhajja 2 is the bigger
      const c0 = p(0, 0);
      const ey = y + th - 0.42;
      // the corbels, wide pitch, tapering
      const cn = Math.max(6, Math.round(hw * 2 / 1.5));
      for (let i = 0; i <= cn; i++) {
        const lx = (i / cn - 0.5) * (hw * 2);
        for (const sgn of [1, -1]) {
          const q = p(lx, sgn * hd);
          b.box(q[0], ey - 0.62, q[1], 0.34, 0.62, OUT * 0.8, tint(tone, 0.82), rot);
        }
      }
      // the bulbous pendants, dense and continuous
      const pn = Math.max(10, Math.round(hw * 2 / 0.25));
      for (let i = 0; i <= pn; i++) {
        const lx = (i / pn - 0.5) * (hw * 2);
        for (const sgn of [1, -1]) {
          const q = p(lx, sgn * (hd + OUT * 0.52));
          b.box(q[0], ey - 0.3, q[1], 0.17, 0.3, 0.17, tint(tone, 0.9), rot);
        }
      }
      // the slab and its painted soffit — Growse: "the under-surface of which
      // is brightly painted", a different brighter colour, not a darker tint
      b.box(c0[0], ey, c0[1], hw * 2 + OUT * 2, 0.3, hd * 2 + OUT * 2,
        tint(tone, 1.06), rot);
      b.box(c0[0], ey - 0.08, c0[1], hw * 2 + OUT * 1.8, 0.07, hd * 2 + OUT * 1.8,
        PT_OCHRE, rot);
      b.box(c0[0], ey + 0.3, c0[1], hw * 2 + OUT * 1.2, 0.26, hd * 2 + OUT * 1.2,
        tint(tone, 0.94), rot);              // the carved fascia band above
    }

    /* the arcade: cusped openings around the outside of this storey */
    const bays = 7;
    for (let i = 0; i < bays; i++) {
      const lx = ((i / (bays - 1)) - 0.5) * (hw * 2 - 5.5);
      // front, skipping the gate bay on the ground floor — and skipping the
      // front entirely on the upper storeys, which draw their own above
      if (t === 0 && !(Math.abs(lx) < GATE * 0.6)) {
        const q = p(lx, hd + 0.05);
        cuspedArch(b, q[0], y + 0.5, q[1], 3.0, th * 0.62, 0.55, rot, BB_MARBLE, 5, BB_SHADE);
      }
      const r2 = p(lx, -hd - 0.05);
      cuspedArch(b, r2[0], y + 0.5, r2[1], 3.0, th * 0.62, 0.55, rot, BB_MARBLE, 5, BB_SHADE);
    }
    const sideBays = 8;
    for (let i = 0; i < sideBays; i++) {
      const lz = ((i / (sideBays - 1)) - 0.5) * (hd * 2 - 6);
      for (const sgn of [-1, 1]) {
        const q = p(sgn * (hw + 0.05), lz);
        cuspedArch(b, q[0], y + 0.5, q[1], 3.0, th * 0.62, 0.55, rot + Math.PI / 2, BB_MARBLE, 5, BB_SHADE);
      }
    }

    /* jharokha balconies and jali, on the upper storeys where they belong */
    if (t > 0) {
      for (const sgn of [-1, 1]) {
        const q = p(sgn * (hw * 0.52), hd + 0.5);
        b.box(q[0], y + th * 0.3, q[1], 3.4, 0.28, 1.5, BB_MARBLE, rot);   // sill
        b.box(q[0], y + th * 0.3 + 0.28, q[1], 3.4, 1.15, 0.18, BB_JALI, rot); // screen
        b.box(q[0], y + th * 0.82, q[1], 3.8, 0.3, 1.7, BB_MARBLE, rot);   // hood
      }
      for (const sgn of [-1, 1]) {
        const q = p(sgn * (hw + 0.5), 0);
        b.box(q[0], y + th * 0.3, q[1], 1.5, 0.28, 4.2, BB_MARBLE, rot);
        b.box(q[0], y + th * 0.3 + 0.28, q[1], 0.18, 1.15, 4.2, BB_JALI, rot);
        b.box(q[0], y + th * 0.82, q[1], 1.7, 0.3, 4.6, BB_MARBLE, rot);
      }
    }
    y += th;
  }

  /* ---------------- the roofline ---------------- */
  /*
   * "The roofline is not flat. It is a jali parapet running the full width,
   * broken dead centre by a single three-bay kiosk with a curved bangaldar
   * roof and a flagstaff. That silhouette alone makes it recognisable."
   *
   * REMOVED from here, each on an explicit finding:
   *   - the four corner chhatris. "Corner chhatris or corner towers: not
   *     visible." Nor corner towers.
   *   - the dome over the sanctum. "A dome. The kiosk roof is a curved
   *     bangaldar barrel with rolled ends, not a dome."
   * It is a HORIZONTAL building with exactly one vertical accent.
   *
   * And not a shikhara, however tempting: the June 2026 ASI report in Amar
   * Ujala says work will fill cracks on the "शिखर", but in Hindi शिखर
   * routinely means simply the top or crown, and the photographs show a
   * kiosk. The survey flags this as a trap by name.
   */
  const PARA = 1.0;                              // jali parapet, 0.9-1.1 m
  {
    // posts with small turned finials, and pierced screens between them
    const pn = Math.max(8, Math.round(HW * 2 / 1.5));
    for (const sgn of [1, -1]) {
      for (let i = 0; i <= pn; i++) {
        const lx = (i / pn - 0.5) * (HW * 2);
        const q = p(lx, sgn * (HD - 1.8));
        b.box(q[0], y, q[1], 0.24, PARA, 0.24, tint(color, 1.02), rot);
        b.box(q[0], y + PARA, q[1], 0.16, 0.14, 0.16, tint(color, 1.1), rot);
      }
      const q = p(0, sgn * (HD - 1.8));
      /*
       * "The jali patterns vary panel to panel — at least three distinct
       * lattices. Do not repeat one texture." Three tones stepping along the
       * run is the cheapest honest way to say that without three meshes.
       */
      for (let i = 0; i < pn; i++) {
        const lx = ((i + 0.5) / pn - 0.5) * (HW * 2);
        const g2 = p(lx, sgn * (HD - 1.8));
        b.box(g2[0], y + 0.12, g2[1], (HW * 2 / pn) * 0.78, PARA * 0.72, 0.1,
          tint(BB_JALI, [1.0, 0.92, 1.07][i % 3]), rot);
      }
      b.box(q[0], y + PARA * 0.86, q[1], HW * 2, 0.12, 0.3, tint(color, 1.05), rot);
    }
  }

  /*
   * THE KIOSK. Three bays, and it sits EXACTLY over the middle group of three
   * arches — measured at x=2050 px against an arcade centre of x=2048 px, so
   * the survey says to treat dead-centre as a hard compositional rule.
   */
  {
    const KW = 7.6, KD = 4.6, KH = 3.6;
    const k0 = p(0, HD - 5.2);
    for (let i = 0; i <= 3; i++) {
      const lx = (i / 3 - 0.5) * KW;
      for (const sgn of [1, -1]) {
        const q = p(lx, HD - 5.2 + sgn * KD * 0.5);
        b.box(q[0], y, q[1], 0.36, KH, 0.36, tint(color, 1.03), rot);
      }
    }
    for (let i = 0; i < 3; i++) {
      const lx = ((i + 0.5) / 3 - 0.5) * KW;
      const q = p(lx, HD - 5.2 + KD * 0.5);
      cuspedArch(b, q[0], y + KH * 0.4, q[1], KW / 3 * 0.8, KH * 0.5, 0.4,
        rot, tint(color, 1.07), 20, null);
    }
    // its own jali balustrade
    b.box(k0[0], y, k0[1], KW + 0.6, 0.8, KD + 0.6, tint(BB_JALI, 1.0), rot);
    b.box(k0[0], y + KH, k0[1], KW + 1.0, 0.3, KD + 1.0, tint(color, 1.05), rot);

    /*
     * The BANGALDAR roof — "a segmental barrel with rolled, downturned ends
     * and deep curved overhangs sweeping out each side", panelled in a
     * rectangular coffer grid. Built as a stack of narrowing courses whose
     * ENDS turn down, which is what separates a bangla roof from a vault.
     */
    const RN = 7;
    for (let i = 0; i < RN; i++) {
      const t2 = i / (RN - 1);
      const rise = Math.sin(t2 * Math.PI * 0.5);
      const drop = 0.55 * (1 - Math.cos(t2 * Math.PI * 0.5));   // the roll
      b.box(k0[0], y + KH + 0.3 + rise * 1.9 - drop * 0.35, k0[1],
        (KW + 1.6) * (1 - t2 * 0.42), 0.4, (KD + 1.6) * (1 - t2 * 0.3),
        tint(color, 1.02 - i * 0.012), rot);
    }
    const fin = p(0, HD - 5.2);
    b.box(fin[0], y + KH + 2.5, fin[1], 0.1, 2.6, 0.1, 0x8a8278);          // flagstaff
    b.box(fin[0] + 0.5, y + KH + 4.4, fin[1], 1.0, 0.55, 0.04, 0xe8b02a);  // flag
    b.box(fin[0], y + KH + 5.1, fin[1], 0.04, 1.1, 0.04, 0x8a8278);        // lightning rod
  }

  /* ---------------- the numbered gate, and the shoe stand ---------------- */
  {
    const g = p(0, HD - T / 2);
    cuspedArch(b, g[0], FL, g[1], GATE, 5.4, T + 0.5, rot + Math.PI / 2, BB_MARBLE, 7, BB_SHADE);
    // the number plate: every gate here is numbered, and No. 2 is the usual way in
    const pl = p(0, HD + 0.35);
    b.box(pl[0], FL + 5.6, pl[1], 2.4, 1.0, 0.16, BB_MARBLE, rot);
    b.box(pl[0], FL + 5.85, pl[1] + 0.02, 0.5, 0.5, 0.06, BB_SHADE, rot);
    for (const sgn of [-1, 1]) {
      const q = p(sgn * (GATE / 2 + 0.9), HD + 0.2);
      b.box(q[0], FL, q[1], 1.5, 6.2, 1.5, color, rot);
      b.box(q[0], FL + 6.2, q[1], 1.9, 0.5, 1.9, BB_MARBLE, rot);
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.85 });
    }
    // shoes, belts and bags are surrendered at the gate for a token
    const sh = p(GATE / 2 + 3.4, HD - 2.6);
    b.box(sh[0], FL, sh[1], 3.6, 0.9, 1.6, 0x8a6a42, rot);
    b.box(sh[0], FL + 0.9, sh[1], 3.8, 0.14, 1.8, accent, rot);
    for (let i = 0; i < 5; i++) {
      const q = p(GATE / 2 + 2.1 + i * 0.6, HD - 2.6);
      b.box(q[0], FL + 0.95, q[1], 0.26, 0.12, 0.5, tint(0x6a4a2a, 0.9 + i * 0.05), rot);
    }
    colliders.push({ type: 'box', x: sh[0], z: sh[1], w: 3.6, d: 1.6, rot });
  }

  /* ---------------- verandas around the court ---------------- */
  const vy = FL;
  const vh = TIER[0] - 0.6;
  const colonnade = (ax, az, along, count, vertical) => {
    for (let i = 0; i < count; i++) {
      const t2 = (i / (count - 1) - 0.5) * along;
      const q = vertical ? p(ax, az + t2) : p(ax + t2, az);
      ib.box(q[0], vy, q[1], 0.56, vh, 0.56, BB_MARBLE, rot);
      ib.box(q[0], vy + vh, q[1], 0.8, 0.34, 0.8, color, rot);
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.42 });
    }
  };
  const cw = HW - T - VER, cd = HD - T - VER;
  colonnade(0, cd, cw * 2, 9, false);              // front, along the gate side
  colonnade(-cw, -1, cd * 1.5, 8, true);           // left
  colonnade(cw, -1, cd * 1.5, 8, true);            // right
  // the veranda roofs, which is what makes them verandas
  for (const [ax, az, lw, ld] of [
    [0, HD - T - VER * 0.5, (HW - T) * 2, VER],
    [-(HW - T - VER * 0.5), -1, VER, (HD - T) * 1.6],
    [HW - T - VER * 0.5, -1, VER, (HD - T) * 1.6],
  ]) {
    const q = p(ax, az);
    ib.box(q[0], vy + vh + 0.34, q[1], lw, 0.4, ld, color, rot);
  }

  /* ---------------- the sanctum, across the court ---------------- */
  const SZ = -HD + T + SD * 0.5;                   // centre of the sanctum range
  const FRONT = SZ + SD * 0.5;                     // its face onto the court
  // three shallow steps up to it
  for (let i = 0; i < 3; i++) {
    const q = p(0, FRONT + 1.5 - i * 0.5);
    ib.box(q[0], FL + i * 0.22, q[1], 15, 0.24, 0.52, 0xe4ddcc, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 15, d: 0.52, rot, h: (i + 1) * 0.22, tag: 'bb-step' });
  }
  const SFL = FL + 0.66;                            // the sanctum floor
  // its framing wall, with the opening in the middle
  const openW = 6.2;
  for (const sgn of [-1, 1]) {
    const segW = (17 - openW) / 2;
    const q = p(sgn * (openW / 2 + segW / 2), FRONT);
    ib.box(q[0], SFL, q[1], segW, 6.2, 1.1, color, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: segW, d: 1.4, rot });
  }
  const arch = p(0, FRONT);
  cuspedArch(ib, arch[0], SFL, arch[1], openW, 4.6, 1.2, rot, BB_GOLD, 7, BB_SHADE);
  // the dark recess behind Him
  const back = p(0, SZ - SD * 0.36);
  ib.box(back[0], SFL, back[1], 15, 6.0, 1.2, BB_SHADE, rot);
  for (const sgn of [-1, 1]) {
    const q = p(sgn * 7.4, SZ);
    ib.box(q[0], SFL, q[1], 1.2, 6.0, SD * 0.8, BB_SHADE, rot);
  }
  ib.box(back[0], SFL + 6.0, back[1], 16, 0.5, SD, color, rot);   // its ceiling
  // the altar itself: a raised, ornamented plinth
  const alt = p(0, SZ + 0.6);
  ib.box(alt[0], SFL, alt[1], 8.5, 1.05, 3.4, 0xd8c9a4, rot);
  ib.box(alt[0], SFL + 1.05, alt[1], 7.6, 0.16, 3.0, BB_GOLD, rot);

  /* ---------------- the curtain ---------------- */
  /*
   * Its own mesh, and its own name, because it MOVES — every few minutes it is
   * drawn shut and reopened. `Curtain:<id>` is the handle the devotion code
   * looks it up by. Modelled as two leaves so they can part.
   */
  const leaves = [];
  for (const sgn of [-1, 1]) {
    const cm = new MeshBuilder();
    const q = p(sgn * (openW / 4), FRONT - 0.35);
    cm.box(q[0], SFL + 0.2, q[1], openW / 2, 4.3, 0.14, accent, rot);
    cm.box(q[0], SFL + 4.3, q[1], openW / 2 + 0.2, 0.3, 0.22, BB_GOLD, rot);
    leaves.push({
      name: 'Curtain:' + loc.id + (sgn < 0 ? ':L' : ':R'),
      builder: cm, x, z, r: Math.max(HW, HD),
      // the direction this leaf slides when it is drawn back, in world terms
      open: [Math.cos(rot) * sgn * (openW * 0.52), Math.sin(rot) * sgn * (openW * 0.52)],
    });
  }

  /* ---------------- NO BELLS ---------------- */
  // Deliberate. Not one hangs anywhere in these premises, and no mangala arti
  // is performed except once a year at Janmashtami. `compound` would hang them,
  // so `compound` is not called here — the town is the compound.

  const darsh = p(0, FRONT + 6.5);
  return {
    altarY: 2.4,
    colliders,
    mesh: { name: 'BankeBihariInterior', builder: ib, x, z, r: Math.max(HW, HD) },
    curtain: leaves,
    interior: {
      altar: [alt[0], SFL + 1.15, alt[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      // open: the court is under the sky and must not be graded like a sanctum
      volume: { x, z, hw: HW, hd: HD, rot, open: true, door: p(0, HD + 1.2) },
    },
  };
}


/* ================================================================
 * Chaar Dham, Chhatikara
 * ================================================================ */

/**
 * The first thing you see on the road into Vrindavan, and it was not in the
 * world at all — it is in no OSM extract, so it had to be placed by hand.
 *
 * Opened 8 February 2025. Four shrines on one campus, named by the
 * establishment's own site: SHIV DHAM, MAA VAISHNO DEVI DHAM, RADHA KRISHNA
 * DHAM and SHANI DHAM. It is NOT the classical Badrinath / Dwarka / Puri /
 * Rameshwaram set — one guide site infers that, no source states it, and it is
 * not built that way here.
 *
 * Two figures are agreed by every source and are the whole silhouette from the
 * highway: a 141 ft (43 m) Maa Vaishno Devi seated on her lion, and a 187 ft
 * (57 m) trident. At that height they are visible from Chhatikara Crossing 629
 * m away, which is where you start, so they are modelled at full scale rather
 * than politely reduced.
 *
 * The site's older identity is the VAISHNO DEVI CAVE, which predates the wider
 * complex and is still what most people come for — a walk-through cave rather
 * than a hall, so it is built as one.
 */
const CD_STONE = 0xf4efe4;
const CD_ROCK = 0x9a8f7e;
const CD_STEEL = 0xb9bcc0;

function buildChaarDham({ loc, b, ground, rng }) {
  const { w, d, h, color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const HW = w * 0.5, HD = d * 0.5;
  const colliders = [];
  const FL = ground + 0.6;

  /* ---------------- the campus ---------------- */
  b.box(x, ground - 0.5, z, w + 30, 1.1, d + 30, 0xd6cdb8, rot);          // apron
  b.box(x, FL - 0.12, z, w + 8, 0.16, d + 8, 0xe8e2d2, rot);              // paved court

  /* ---------------- the trident: 57 m, and the tallest thing here -------- */
  {
    const q = p(-HW * 0.62, -HD * 0.3);
    const TH = 57;
    b.box(q[0], FL, q[1], 3.6, 1.6, 3.6, CD_STONE, rot);                  // base
    b.box(q[0], FL + 1.6, q[1], 1.5, TH * 0.72, 1.5, CD_STEEL, rot);      // shaft
    // the three prongs
    const head = FL + 1.6 + TH * 0.72;
    b.box(q[0], head, q[1], 5.4, 1.1, 1.3, CD_STEEL, rot);                // cross piece
    for (const sgn of [-1, 0, 1]) {
      const t = p(-HW * 0.62 + sgn * 2.4, -HD * 0.3);
      const ph = sgn === 0 ? TH * 0.26 : TH * 0.2;
      b.box(t[0], head + 1.1, t[1], sgn === 0 ? 1.2 : 0.9, ph, sgn === 0 ? 1.2 : 0.9, CD_STEEL, rot);
      b.box(t[0], head + 1.1 + ph, t[1], 0.5, ph * 0.22, 0.5, accent, rot);
    }
    colliders.push({ type: 'circle', x: q[0], z: q[1], r: 2.4 });
  }

  /* ---------------- Maa Vaishno Devi: 43 m, on her lion ---------------- */
  {
    const q = p(HW * 0.3, -HD * 0.42);
    const SH = 43;
    // the plinth she is raised on, which is most of why she reads so tall
    b.box(q[0], FL, q[1], 16, 5.5, 14, CD_STONE, rot);
    b.box(q[0], FL + 5.5, q[1], 17.5, 0.7, 15.5, accent, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 16, d: 14, rot });
    const base = FL + 6.2;
    // the lion beneath her
    b.box(q[0], base, q[1], 9.5, 5.2, 5.0, 0xd8a24a, rot);
    const lh = p(HW * 0.3, -HD * 0.42 + 3.4);
    b.box(lh[0], base + 3.2, lh[1], 4.2, 4.0, 3.4, 0xd8a24a, rot);        // its head
    b.box(lh[0], base + 3.0, lh[1], 5.6, 4.6, 4.6, 0xb8822e, rot);        // mane
    // the Devi: seated, robed, crowned
    const sy = base + 5.2;
    b.box(q[0], sy, q[1], 9.0, SH * 0.30, 7.0, 0xc4172e, rot);            // lap and robe
    b.box(q[0], sy + SH * 0.30, q[1], 7.0, SH * 0.30, 5.2, 0xc4172e, rot); // torso
    for (const sgn of [-1, 1]) {
      const a2 = p(HW * 0.3 + sgn * 4.3, -HD * 0.42);
      b.box(a2[0], sy + SH * 0.34, a2[1], 1.6, SH * 0.24, 1.6, 0xe0b48a, rot);
    }
    b.box(q[0], sy + SH * 0.60, q[1], 3.2, SH * 0.11, 3.0, 0xe0b48a, rot); // head
    b.box(q[0], sy + SH * 0.71, q[1], 4.4, SH * 0.16, 4.4, accent, rot);   // crown
    b.box(q[0], sy + SH * 0.87, q[1], 1.2, SH * 0.06, 1.2, accent, rot);   // finial
  }

  /* ---------------- the four dhams, one shrine each ---------------- */
  /*
   * Named from the establishment's own site. Each gets a small shrine of its
   * own around the court, distinguished only by its crowning form — no source
   * describes their architecture, so nothing here claims to.
   */
  const DHAMS = [
    { lx: -HW * 0.55, lz: HD * 0.45, form: 'shikhara' },   // Radha Krishna Dham
    { lx: -HW * 0.18, lz: HD * 0.6, form: 'dome' },        // Shiv Dham
    { lx: HW * 0.18, lz: HD * 0.6, form: 'dome' },         // Shani Dham
    { lx: HW * 0.55, lz: HD * 0.45, form: 'shikhara' },    // Maa Vaishno Devi Dham
  ];
  for (const dh of DHAMS) {
    const q = p(dh.lx, dh.lz);
    b.box(q[0], FL, q[1], 13, 1.0, 13, CD_STONE, rot);
    b.box(q[0], FL + 1.0, q[1], 10.5, 6.4, 10.5, color, rot);
    b.box(q[0], FL + 7.4, q[1], 11.6, 0.6, 11.6, accent, rot);
    const fr = p(dh.lx, dh.lz + 5.4);
    cuspedArch(b, fr[0], FL + 1.0, fr[1], 3.6, 4.2, 0.8, rot + Math.PI / 2, accent, 5);
    if (dh.form === 'shikhara') shikhara(b, q[0], FL + 8.0, q[1], 4.2, 11, color);
    else { dome(b, q[0], FL + 8.0, q[1], 4.4, 5.4, color); b.box(q[0], FL + 13.4, q[1], 0.8, 2.2, 0.8, accent, rot); }
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 10.5, d: 10.5, rot });
  }

  /* ---------------- the Vaishno Devi cave ---------------- */
  /*
   * The site's older identity and still the thing most people queue for. A
   * walk-through, not a hall: a rocky mass with a mouth at one end and a way
   * out at the other, so the colliders leave a passage rather than a room.
   */
  {
    const c0 = p(0, -HD * 0.86);
    b.box(c0[0], FL, c0[1], 34, 9.5, 15, CD_ROCK, rot);
    for (let i = 0; i < 7; i++) {
      const q = p(-14 + i * 4.6, -HD * 0.86 + (i % 2 ? -3.4 : 3.4));
      b.box(q[0], FL + 6.0, q[1], 6.5, 4.5 + (i % 3) * 1.4, 6.5, tint(CD_ROCK, 0.92 + (i % 4) * 0.04), rot + i * 0.3);
    }
    // the mouth, and the way out: two gaps, and a wall either side of each
    for (const sgn of [-1, 1]) {
      const q = p(sgn * 12.5, -HD * 0.86 + 7.6);
      b.box(q[0], FL, q[1], 9, 4.5, 1.2, CD_ROCK, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 9, d: 1.5, rot });
    }
    const arch = p(0, -HD * 0.86 + 7.6);
    cuspedArch(b, arch[0], FL, arch[1], 5.0, 4.0, 1.4, rot + Math.PI / 2, accent, 5, 0x241a12);
    // the flanks and back are solid; only the front has a way in
    colliders.push({ type: 'box', x: c0[0], z: c0[1], w: 34, d: 15, rot });
  }

  /* ---------------- gate and boundary ---------------- */
  {
    const g = p(0, HD + 10);
    const GAP = 9;

    /*
     * The boundary wall, which this did not have.
     *
     * It had gate piers and no wall between them, so 88.8% of its perimeter was
     * open and you walked onto the campus from anywhere — exactly the fault you
     * reported at a temple. An eleven-acre walled campus has a wall; the gate
     * is the way in and the rest is masonry.
     */
    const BW = HW + 10, BD = HD + 10, BT = 0.8, BH = 3.2;
    const bwall = (lx, lz, lw, ld) => {
      const q = p(lx, lz);
      b.box(q[0], FL, q[1], lw, BH, ld, color, rot);
      b.box(q[0], FL + BH, q[1], lw + 0.5, 0.3, ld + 0.5, accent, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld + 0.3, rot });
    };
    bwall(0, -BD, BW * 2, BT);                        // back
    bwall(-BW, 0, BT, BD * 2);                        // left
    bwall(BW, 0, BT, BD * 2);                         // right
    const fseg = (BW * 2 - GAP) / 2;                  // front, split at the gate
    for (const sgn of [-1, 1]) bwall(sgn * (GAP / 2 + fseg / 2), BD, fseg, BT);
    for (const sgn of [-1, 1]) {
      const q = p(sgn * (GAP / 2 + 2.2), HD + 10);
      b.box(q[0], FL, q[1], 4.4, 9.5, 2.4, color, rot);
      b.box(q[0], FL + 9.5, q[1], 5.2, 0.8, 3.2, accent, rot);
      dome(b, q[0], FL + 10.3, q[1], 1.9, 2.6, color);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 4.4, d: 2.4, rot });
    }
    b.box(g[0], FL + 9.5, g[1], GAP + 4.4, 1.1, 2.6, accent, rot);
    b.box(g[0], FL + 10.6, g[1], GAP + 2.0, 0.6, 2.0, color, rot);
  }

  const darsh = p(0, HD * 0.02);
  return {
    altarY: 2.2,
    colliders,
    interior: {
      // the court, between the cave and the four shrines
      altar: [darsh[0], FL + 1.4, darsh[1]],
      darshan: p(0, HD * 0.3),
      facing: rot + Math.PI,
      floor: FL,
      // the volume is the WALLED campus, which is what you are inside when you
      // are inside — and it is what `temples.mjs` scans for a wall
      volume: { x, z, hw: HW + 10, hd: HD + 10, rot, open: true, door: p(0, HD + 10) },
    },
  };
}


/* ================================================================
 * Shri Govind Dev Ji Mandir, 1590
 * ================================================================ */

/**
 * The one temple in Vrindavan that F. S. Growse measured himself, and the
 * research is correspondingly exact — so this is built to his figures and not
 * to a style.
 *
 * It was a battered rectangular mass here. It is a GREEK CROSS: a nave 100 ft
 * (30.5 m) long, the breadth across the transepts the same 100 ft, walls
 * averaging TEN FEET (3.05 m) thick, on an outer platform of roughly
 * 60 x 37 m. The mass is enormous relative to the space inside, and that is
 * the point of it.
 *
 * TRUNCATED, and that is the single most important fact. Five towers were
 * designed — one over the crossing, four over choir, sacrarium and two side
 * chapels. Today the sacrarium tower is RAZED to its plinth, the two chapel
 * towers were NEVER COMPLETED, and only the choir tower survives, itself
 * missing several upper stages. So: one stump with a flat top, one bare
 * plinth, two chapels that simply stop. Nothing here is finished, and none of
 * it should be drawn as if it were.
 *
 * TWO STAGES, and the upper one lies. The lower stage is purely Hindu and
 * trabeate — lintels on straight jambs. The upper is a regular triforium of
 * Mughal character whose arches are DECORATIVE ONLY: Growse notes the
 * spandrels could be knocked out leaving lintel and jambs with no loss of
 * stability, and most of them HAD been knocked out before being re-inserted.
 *
 * NO PARAPET. The original lofty arcaded parapet that crowned the walls is
 * gone, and the research says in terms not to model one.
 *
 * THE BRICK. The 1854 rebuild of the sanctum is rough brick, not ashlar — a
 * deliberate material break at the west end, and it is visible.
 */
const GD_RED = 0xa8563c;
const GD_SHADE = 0x7a3c28;
const GD_BRICK = 0x9c6a52;
const GD_WEATHER = 0x8a7060;

function buildGovindDev({ loc, b, ground }) {
  const { w, d, h, color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];

  const ARM = 15.25;          // half of Growse's 100 ft, each way
  const CROSS = 9.5;          // half-width of each arm of the cross
  const WALL = 3.05;          // "walls average ten feet thick"
  const FL = ground + 1.1;    // the moulded plinth, proud again since 1873
  const LOW = 7.4;            // the trabeate Hindu stage
  const UP = 4.6;             // the decorative Mughal triforium above it

  /* ---------------- the platform, 200 x 120 ft ---------------- */
  b.box(x, ground - 0.55, z, 60, 1.1, 37, 0xbfae8e, rot);
  b.box(x, ground + 0.55, z, 56, 0.55, 33, 0xc8b89a, rot);
  // the moulded plinth Growse dug out from under eight feet of debris
  b.box(x, ground + 1.1 - 0.5, z, ARM * 2 + 3.4, 0.5, ARM * 2 + 3.4, GD_SHADE, rot);

  /**
   * One arm of the cross: two stages, and the upper one only pretends to arch.
   * `open` leaves the end wall out where the arm meets a portal.
   */
  /*
   * WALLS, not a solid box.
   *
   * The first cut of this drew each arm as one filled mass, which made a
   * cathedral you could not enter — 0% of its wall line open, no doorway
   * anywhere. Growse's whole point is the INSIDE: "the general effect of the
   * interior is not unlike that produced by Saint Paul's Cathedral in London."
   * So each arm is four faces, ten feet thick, with the two approaches he cut
   * in 1873 left open.
   */
  const face = (lx, lz, fw, fd) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], fw, LOW, fd, color, rot);
    b.box(q[0], FL + LOW, q[1], fw + 0.7, 0.55, fd + 0.7, accent, rot);
    b.box(q[0], FL + LOW + 0.55, q[1], fw - 0.5, UP, fd - 0.5, tint(color, 1.05), rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.3, rot });
  };
  // the polished floor, so the crossing is a room and not a hole
  const f0 = p(0, 0);
  b.box(f0[0], FL - 0.06, f0[1], CROSS * 2, 0.12, ARM * 2, 0xc9bda2, rot);
  b.box(f0[0], FL - 0.06, f0[1], ARM * 2, 0.12, CROSS * 2, 0xc9bda2, rot);

  const DOOR = 5.5;                              // the great eastern portal
  const SDOOR = 4.4;                             // the south transept
  // nave: long side walls, the sacrarium end closed, the east end open
  {
    const run = (ARM - CROSS);
    for (const sgn of [-1, 1]) {
      for (const side of [-1, 1]) {
        face(sgn * (CROSS - WALL / 2), side * (CROSS + run / 2), WALL, run);
      }
    }
  }
  face(0, -ARM + WALL / 2, CROSS * 2, WALL);     // west: the sacrarium end, closed
  {
    const seg = (CROSS * 2 - DOOR) / 2;
    for (const sgn of [-1, 1]) face(sgn * (DOOR / 2 + seg / 2), ARM - WALL / 2, seg, WALL);
  }
  /*
   * Transept side walls, IN TWO PIECES each, leaving the crossing open.
   *
   * Drawn full width they ran right across the middle of the church at
   * lz = ±7.98 and walled the nave off from the crossing — you came in at the
   * great eastern portal and could get no further, 10 m short of the Deity.
   * A Greek cross has no wall through its crossing; that is what makes it a
   * crossing.
   */
  {
    const run = (ARM - CROSS);
    for (const sgn of [-1, 1]) {
      for (const side of [-1, 1]) {
        face(side * (CROSS + run / 2), sgn * (CROSS - WALL / 2), run, WALL);
      }
    }
  }
  face(-ARM + WALL / 2, 0, WALL, CROSS * 2);     // north transept end, closed
  {
    const seg = (CROSS * 2 - SDOOR) / 2;
    for (const sgn of [-1, 1]) face(ARM - WALL / 2, sgn * (SDOOR / 2 + seg / 2), WALL, seg);
  }

  /* ---------------- the triforium arcade ---------------- */
  /*
   * Decorative only, and drawn as such: a lintel on straight jambs with a
   * shallow arch laid over it, because that is exactly what it is.
   */
  const triforium = (lx, lz, along, n, vertical) => {
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * along;
      const q = vertical ? p(lx, lz + t) : p(lx + t, lz);
      const ang = vertical ? rot : rot + Math.PI / 2;
      cuspedArch(b, q[0], FL + LOW + 1.0, q[1], 2.1, UP * 0.66, 0.42, ang, accent, 3, GD_SHADE);
      // the lintel the arch is not doing the work of
      b.box(q[0], FL + LOW + 1.0 + UP * 0.66, q[1], 2.5, 0.28, 0.5, GD_SHADE, rot);
    }
  };
  triforium(CROSS, 0, ARM * 1.5, 7, true);
  triforium(-CROSS, 0, ARM * 1.5, 7, true);
  triforium(0, CROSS, ARM * 1.5, 7, false);
  triforium(0, -CROSS, ARM * 1.5, 7, false);

  /* ---------------- the waggon vaults over the four arms ---------------- */
  /*
   * "A POINTED WAGGON VAULT ... built of TRUE RADIATING ARCHES like a Gothic
   * cathedral, not the corbelled brackets normal in Hindu work." Stepped
   * courses rising to a ridge, which is what a pointed barrel reads as at this
   * scale.
   */
  const vault = (lx, lz, along, across, vertical) => {
    const N = 7;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const q = p(lx, lz);
      const ww = across * (1 - t * 0.86);
      b.box(q[0], FL + LOW + UP + 0.55 + i * 0.62,
        q[1], vertical ? ww : along, 0.62, vertical ? along : ww,
        i % 2 ? accent : color, rot);
    }
  };
  vault(0, 0, ARM * 2 - 1.5, CROSS * 2 - 1.2, true);
  vault(0, 0, ARM * 2 - 1.5, CROSS * 2 - 1.2, false);

  /* ---------------- the towers: one, a stump, and two that stop --------- */
  const TOP = FL + LOW + UP + 0.55 + 7 * 0.62;
  /*
   * THE DOME IS REAL AND IT IS INVISIBLE.
   *
   * This drew a ribbed ONION DOME with a stacked kalash and a flag on top of
   * the crossing, on the strength of Growse's "the central dome of the nave
   * is perfect". He is describing the INSIDE. The dome is a Hindu vault over
   * the crossing, and externally it is cased in a flat-topped, stepped,
   * rectangular masonry block — which is why the 1949 government photograph
   * shows a broad chamfered FLAT-TOPPED mass at the summit, and why John
   * Murray could photograph a blank wall standing on it in c.1858.
   *
   * "The pointed waggon vaults over the arms and the dome over the crossing
   * are entirely concealed by flat stepped terraces and parapet slabs. This
   * is the single most important fact for your silhouette."
   *
   * And no finial: "the tower over the central dome was also, as I conjecture,
   * never carried higher than we now see it" (p.249). A lightning conductor
   * is the only thing that projects.
   *
   * Growse's restoration also "renewed" the "porches at the four corners of
   * the central dome" (p.247) — small flat-topped pillared elements, not
   * chhatris, because a chhatri ends in a dome and nothing here is domed.
   */
  b.box(x, TOP, z, CROSS * 2 + 1.6, 1.4, CROSS * 2 + 1.6, accent, rot);
  {
    const AT = [                              // [halfWidth, height, tone]
      [CROSS * 1.02, 2.6, color],
      [CROSS * 0.92, 2.2, accent],
      [CROSS * 0.84, 1.5, color],
    ];
    let ay = TOP + 1.4;
    for (const [hwv, hv, tone] of AT) {
      b.box(x, ay, z, hwv * 2, hv, hwv * 2, tone, rot);
      // the very heavy moulded cornice that caps each stage
      b.box(x, ay + hv, z, hwv * 2 + 1.5, 0.55, hwv * 2 + 1.5, GD_SHADE, rot);
      b.box(x, ay + hv + 0.55, z, hwv * 2 + 1.1, 0.3, hwv * 2 + 1.1, tint(tone, 1.05), rot);
      // the saw-tooth chevron band, which is the building's signature course
      const n = Math.max(6, Math.round(hwv * 2 / 0.85));
      for (let k = 0; k <= n; k++) {
        const o = (k / n - 0.5) * hwv * 2;
        for (const [ox, oz] of [[o, hwv + 0.72], [o, -hwv - 0.72],
          [hwv + 0.72, o], [-hwv - 0.72, o]]) {
          const q2 = p(ox, oz);
          b.box(q2[0], ay + hv - 0.42, q2[1], 0.32, 0.3, 0.32,
            tint(GD_SHADE, 1.12), rot + Math.PI / 4);
        }
      }
      ay += hv + 0.85;
    }
    // the cusped-arched opening in the attic face
    const ao = p(0, CROSS * 0.84);
    cuspedArch(b, ao[0], TOP + 1.4 + 5.6, ao[1], 3.0, 2.4, 0.5,
      rot + Math.PI / 2, tint(color, 1.05), 5);
    // and it terminates FLAT
    b.box(x, ay, z, CROSS * 1.75, 0.5, CROSS * 1.75, tint(color, 1.03), rot);
    b.box(x, ay + 0.5, z, 0.07, 2.4, 0.07, 0x6f6a62);        // lightning conductor

    // the four renewed corner porches, flat-topped
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const q2 = p(sx * CROSS * 0.86, sz * CROSS * 0.86);
      for (let k = 0; k < 4; k++) {
        const a2 = (k / 4) * TAU + Math.PI / 4;
        b.box(q2[0] + Math.cos(a2) * 0.8, TOP + 1.4, q2[1] + Math.sin(a2) * 0.8,
          0.22, 1.9, 0.22, tint(color, 1.05));
      }
      b.box(q2[0], TOP + 3.3, q2[1], 2.5, 0.26, 2.5, GD_SHADE, rot);
      b.box(q2[0], TOP + 3.56, q2[1], 2.1, 0.16, 2.1, tint(color, 1.04), rot);
    }
  }

  // the choir tower: survives best, and has lost several upper stages, so it
  // ends flat and unfinished rather than in a finial
  {
    const q = p(0, -ARM * 0.62);
    let cy = TOP + 1.4;
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.17;
      b.box(q[0], cy, q[1], 7.4 * k, 3.0, 7.4 * k, i % 2 ? accent : color, rot);
      b.box(q[0], cy + 3.0, q[1], 7.4 * k + 0.6, 0.4, 7.4 * k + 0.6, GD_SHADE, rot);
      cy += 3.4;
    }
    b.box(q[0], cy, q[1], 5.0, 0.6, 5.0, GD_WEATHER, rot);   // a flat, broken top
  }

  // the sacrarium: razed to the ground, ONLY A PLINTH SURVIVES — and the 1854
  // rebuild below it is rough brick, not ashlar
  {
    /*
     * OPPOSITE the entrance. The great eastern portal is at +ARM, and this sat
     * at +ARM*0.66 — between the door and the crossing, with the altar inside
     * it. A sacrarium stands at the far end from the way in; Growse's plan is
     * nave, crossing, then sacrarium.
     */
    const q = p(0, -ARM * 0.66);
    b.box(q[0], FL, q[1], 11.5, LOW * 0.82, 11.5, GD_BRICK, rot);
    b.box(q[0], FL + LOW * 0.82, q[1], 12.2, 0.5, 12.2, GD_WEATHER, rot);
    b.box(q[0], FL + LOW * 0.82 + 0.5, q[1], 8.0, 1.1, 8.0, GD_SHADE, rot);  // the bare plinth
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 11.5, d: 11.5, rot });
  }

  // the two side chapels: NEVER COMPLETED. They stop, squarely, part way up.
  for (const sgn of [-1, 1]) {
    const q = p(sgn * ARM * 0.66, 0);
    b.box(q[0], TOP, q[1], 6.2, 2.4, 6.2, color, rot);
    b.box(q[0], TOP + 2.4, q[1], 6.6, 0.45, 6.6, GD_WEATHER, rot);
  }

  /* ---------------- the two approaches Growse cut in 1873 ---------------- */
  /*
   * "Before 1873 the ONLY access was a narrow winding lane ... there was not a
   * single point from which you could see the whole building." He demolished
   * houses and cut two broad approaches: one from the great EASTERN PORTAL on
   * the main axis, one from the SOUTH TRANSEPT. Both are doorways in the mass,
   * square-headed, because the lower stage is trabeate.
   */
  const portal = (lx, lz, wide, ang) => {
    const q = p(lx, lz);
    // square-headed, because the lower stage is trabeate: a lintel on straight
    // jambs, and nothing arched about it
    b.box(q[0], FL + LOW * 0.66, q[1], wide + 1.6, 0.8, WALL + 0.5, accent, rot);
    for (const sgn of [-1, 1]) {
      const j = ang === 0 ? p(lx + sgn * (wide / 2 + 0.4), lz) : p(lx, lz + sgn * (wide / 2 + 0.4));
      b.box(j[0], FL, j[1], 0.8, LOW * 0.66, WALL + 0.5, GD_SHADE, rot);
    }
    // the rich canopy of sculpture Growse describes over the choir doorway
    b.box(q[0], FL + LOW * 0.66 + 0.8, q[1], wide + 0.8, 0.5, WALL + 0.2, GD_SHADE, rot);
  };
  portal(0, ARM - WALL / 2, DOOR, 0);            // the great eastern portal
  portal(ARM - WALL / 2, 0, SDOOR, Math.PI / 2); // the south transept

  const inner = p(0, 0);
  const darsh = p(0, ARM * 0.18);
  return {
    altarY: 2.4,
    colliders,
    interior: {
      // the sacrarium end, which is where the altar is
      /*
       * IN FRONT OF the sacrarium, not inside it.
       *
       * The razed sacrarium is a solid brick mass spanning lz 4.3 to 15.8 —
       * the 1854 rebuild, correctly solid — and the altar was declared at
       * lz 7.6, which is inside it. You could not reach the Deity because the
       * Deity was in the masonry.
       */
      altar: [p(0, -3.0)[0], FL + 1.35, p(0, -3.0)[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      /*
       * A GREEK CROSS has no rectangular wall: its bounding square runs
       * through open ground at the four re-entrant corners between the arms.
       * So the volume stays the bounding square — that is what "am I inside"
       * means — and the WALL is declared separately as the two arms, for
       * anything that needs to know where the masonry actually is.
       */
      volume: {
        x: inner[0], z: inner[1], hw: ARM, hd: ARM, rot, door: p(0, ARM + 1.2),
        arms: [{ hw: CROSS, hd: ARM }, { hw: ARM, hd: CROSS }],
      },
    },
  };
}


/* ================================================================
 * Shri Radha Madan Mohan Mandir, on the bluff
 * ================================================================ */

/**
 * "THE SILHOUETTE ON THE BLUFF, seen from the river or from Kali-dah Ghat
 * below — a red stone temple standing clear on a cliff above the Yamuna, with
 * the gateway's pyramid and two curvilinear spires stacked against the sky."
 * The research calls it the one you see from a distance rather than stumble
 * into, so the silhouette is what this builds for.
 *
 * It is NOT a squat block. Growse's figures make it a long narrow spine:
 * nave 57 ft, choir 20 ft square, sanctuary 20 ft square — about 29.5 m end to
 * end and only 6 to 8 m wide — with the tower-crowned chapel bulging off the
 * SOUTH flank. Slender, axial, nave to choir to sanctum in a line.
 *
 * THREE THINGS ARE BROKEN, and each is documented:
 *   - the nave's vaulted roof has ENTIRELY DISAPPEARED, so the nave stands
 *     open to the sky and is bright where it was once dark;
 *   - the choir tower has had its upper part destroyed and is a stump;
 *   - only the sacrarium tower is whole — a PLAIN OCTAGON of curvilinear
 *     outline tapering to the summit, an eight-sided sugarloaf, unornamented.
 *     No finial is documented, so none is invented.
 *
 * THE BRICK. The nave was rebuilt reusing old stone and "where the old stone
 * ran short they used brick", so the nave is visibly patchwork while choir,
 * sanctum and chapel are coherent stone. The brick reads duller, smaller and
 * browner-pink, and it is drawn that way.
 *
 * THE CHAPEL is the decorated element — "the whole of its exterior surface
 * being covered with sculptured panels" — against a main body that is
 * restrained and massive.
 */
const MM_RED = 0xa8563c;
const MM_BRICK = 0xa0705e;
const MM_SHADE = 0x7a3c28;

function buildMadanMohan({ loc, b, ground, rng }) {
  const { color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);

  const HW = 4.0;             // "only about 6-8 m wide"
  const NAVE = 17.4;          // 57 ft
  const BAY = 6.1;            // 20 ft, choir and sanctum alike
  /*
   * The spine is measured from the SANCTUM at 0, because that is how Growse
   * gives it — sanctum, then choir, then a 57 ft nave. But the landmark's
   * position is the middle of the temple, not its back wall, so the whole
   * spine is shifted half its length to sit centred on its bluff. Without this
   * it ran off one end of the platform and left the other half bare.
   */
  const SPINE = BAY * 2 + NAVE;
  const Z0 = -SPINE * 0.5;
  const p = (lx, lz) => [x + lx * cs - (lz + Z0) * sn, z + lx * sn + (lz + Z0) * cs];
  const colliders = [];
  const WALL = 1.1;
  const NAVE_H = 6.7;         // "low, about 22 ft"
  const BAY_H = 8.4;

  // the bluff it stands clear on
  b.box(x, ground - 2.2, z, 46, 4.4, 26, 0xb8a486, rot);
  b.box(x, ground + 2.2, z, 40, 0.7, 21, 0xc4b092, rot);
  const FL = ground + 2.9;

  /* ---------------- the spine: nave -> choir -> sanctum ---------------- */
  /*
   * The nave begins where the CHOIR ends, not where the sanctum does. With
   * `BAY + NAVE/2` the nave sat on top of the choir for six metres of its
   * length — two bays of the spine occupying the same ground.
   */
  const NZ = BAY * 2 + NAVE * 0.5;            // nave centre, past sanctum AND choir
  const face = (lx, lz, fw, fd, hh, col) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], fw, hh, fd, col, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.2, rot });
  };

  // THE NAVE: three openings a side, a square door at the east end, and NO ROOF
  for (const sgn of [-1, 1]) {
    // the wall between the three openings, in four piers
    const span = NAVE, op = 2.6, n = 3;
    const pier = (span - op * n) / (n + 1);
    for (let i = 0; i <= n; i++) {
      const lz = NZ - span / 2 + pier / 2 + i * (pier + op);
      // patchwork: brick where the old stone ran short
      face(sgn * (HW - WALL / 2), lz, WALL, pier, NAVE_H, i % 2 ? MM_BRICK : color);
    }
    // the lintel band over the openings, which is stone throughout
    const q = p(sgn * (HW - WALL / 2), NZ);
    b.box(q[0], FL + NAVE_H, q[1], WALL + 0.4, 0.6, NAVE, accent, rot);
  }
  // the east end: a square door, because this body is trabeate and restrained
  {
    const seg = (HW * 2 - 2.4) / 2;
    for (const sgn of [-1, 1]) face(sgn * (2.4 / 2 + seg / 2), NZ + NAVE / 2, seg, WALL, NAVE_H, color);
    const q = p(0, NZ + NAVE / 2);
    b.box(q[0], FL + 3.4, q[1], 3.2, 0.7, WALL + 0.5, accent, rot);
    b.box(q[0], FL + NAVE_H, q[1], HW * 2 + 0.6, 0.6, WALL + 0.5, accent, rot);
  }
  // the floor. Deliberately NO vault above it: "the nave's vaulted roof has
  // entirely disappeared", so the nave is open to the sky and bright.
  {
    const q = p(0, NZ);
    b.box(q[0], FL - 0.12, q[1], HW * 2, 0.16, NAVE, 0xc9bda2, rot);
  }

  /* ---- the choir and the sanctum: 20 ft squares, coherent stone ---- */
  /**
   * One 20 ft bay. `backDoor` is the width of the opening in its far wall.
   *
   * Every bay used to get a SOLID wall the full width of the spine across its
   * low end. That is right for the sanctum, whose far end is the back of the
   * temple — and wrong for the choir, whose far end faces the SANCTUM. So a
   * solid wall stood between the choir and the Deities, and the sanctum was
   * sealed: measured, 688 of its 865 standable cells were cut off from the
   * rest of the building, and walking out from the altar got 0.9 m before
   * stopping against it.
   *
   * A sanctum opens into its choir through an arch. That is what a temple of
   * this plan IS — Growse's own description has the spine running sanctum,
   * choir, nave, one into the next.
   */
  const bay = (lz, hh, backDoor = 0) => {
    for (const sgn of [-1, 1]) face(sgn * (HW - WALL / 2), lz, WALL, BAY, hh, color);
    const bz = lz - BAY / 2 + WALL / 2;
    if (backDoor > 0) {
      const seg = (HW * 2 - backDoor) / 2;
      for (const sgn of [-1, 1]) face(sgn * (backDoor / 2 + seg / 2), bz, seg, WALL, hh, color);
      // the arch over the opening, carried on the two piers
      const aq = p(0, bz);
      b.box(aq[0], FL + hh * 0.62, aq[1], backDoor + 0.8, 0.55, WALL + 0.3, accent, rot);
      b.box(aq[0], FL + hh * 0.62 + 0.55, aq[1], HW * 2, hh * 0.38 - 0.55, WALL, color, rot);
    } else {
      face(0, bz, HW * 2, WALL, hh, color);
    }
    const q = p(0, lz);
    b.box(q[0], FL + hh, q[1], HW * 2 + 0.8, 0.7, BAY + 0.8, accent, rot);
    return q;
  };
  // the choir opens back into the sanctum; the sanctum's own far wall does not
  const choir = bay(BAY * 1.5, BAY_H, 2.6);
  const sanct = bay(BAY * 0.5, BAY_H);
  // the arch between them, and into the nave
  for (const lz of [BAY, BAY * 2]) {
    const q = p(0, lz);
    cuspedArch(b, q[0], FL, q[1], 3.2, 4.4, WALL + 0.3, rot + Math.PI / 2, accent, 3, 0x241a12);
  }

  /* ---- the towers: one whole, one a stump ---- */
  /*
   * "The tower over the SACRARIUM is a PLAIN OCTAGON of curvilinear outline
   * tapering towards the summit — an eight-sided sugarloaf, unornamented."
   */
  {
    let ry = FL + BAY_H + 0.7, r = HW * 0.92, y2 = 0;
    const H = 11.5, N = 12;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      // curvilinear: the sides bow outward before drawing in to the summit
      const rr = r * (1 - Math.pow(t, 1.6) * 0.82);
      const seg = H / N;
      b.box(sanct[0], ry + y2, sanct[1], rr * 2, seg, rr * 2, i % 2 ? color : tint(color, 1.05), rot + Math.PI / 8);
      b.box(sanct[0], ry + y2, sanct[1], rr * 1.86, seg, rr * 1.86, i % 2 ? color : tint(color, 1.05), rot);
      y2 += seg;
    }
    b.box(sanct[0], ry + y2, sanct[1], 1.3, 0.5, 1.3, MM_SHADE, rot);
  }
  // the choir tower, its upper part destroyed: a stump that stops flat
  {
    let ry = FL + BAY_H + 0.7, y2 = 0;
    for (let i = 0; i < 4; i++) {
      const rr = HW * 0.9 * (1 - i * 0.09);
      b.box(choir[0], ry + y2, choir[1], rr * 2, 1.1, rr * 2, i % 2 ? color : tint(color, 1.04), rot);
      y2 += 1.1;
    }
    b.box(choir[0], ry + y2, choir[1], HW * 1.5, 0.5, HW * 1.5, 0x8a7060, rot);   // broken off
  }

  /* ---- the south chapel: the one decorated thing here ---- */
  {
    const CX = HW + 3.2, CZ = BAY * 1.2;
    const q = p(CX, CZ);
    b.box(q[0], FL, q[1], 6.4, 6.0, 7.2, color, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 6.4, d: 7.2, rot });
    // "the whole of its exterior surface being covered with sculptured panels"
    for (let i = 0; i < 4; i++) {
      for (let k = -1; k <= 1; k++) {
        const s2 = p(CX + 3.3, CZ + k * 2.1);
        b.box(s2[0], FL + 0.7 + i * 1.3, s2[1], 0.22, 1.0, 1.6, i % 2 ? accent : MM_SHADE, rot);
      }
    }
    // its single east door, carrying the raised Sanskrit inscription
    const dr = p(CX, CZ + 3.7);
    b.box(dr[0], FL, dr[1], 1.4, 2.6, 0.24, 0x3f2a1e, rot);
    b.box(dr[0], FL + 2.7, dr[1], 2.6, 0.5, 0.3, accent, rot);
    // and its own tower
    let ty = FL + 6.0, y3 = 0;
    for (let i = 0; i < 7; i++) {
      const rr = 2.5 * (1 - Math.pow(i / 7, 1.5) * 0.76);
      b.box(q[0], ty + y3, q[1], rr * 2, 0.95, rr * 2, i % 2 ? color : tint(color, 1.05), rot);
      y3 += 0.95;
    }
  }

  /* ---- the gateway, whose pyramid is part of the skyline ---- */
  {
    const g = p(0, NZ + NAVE / 2 + 7.5);
    for (const sgn of [-1, 1]) {
      const q = p(sgn * 3.2, NZ + NAVE / 2 + 7.5);
      b.box(q[0], FL - 0.6, q[1], 2.4, 5.4, 2.4, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 2.4, d: 2.4, rot });
    }
    b.box(g[0], FL + 4.8, g[1], 8.8, 0.9, 2.8, accent, rot);
    let py = FL + 5.7, y4 = 0;
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.17;
      b.box(g[0], py + y4, g[1], 7.2 * k, 0.8, 2.6 * k, i % 2 ? color : accent, rot);
      y4 += 0.8;
    }
  }

  /* ---- the red stone ghat, running down to the water ---- */
  {
    for (let i = 0; i < 9; i++) {
      const q = p(-HW - 9 - i * 1.15, NZ * 0.3);
      b.box(q[0], FL - 0.3 - i * 0.52, q[1], 1.15, 0.52, 13, i % 2 ? MM_RED : MM_SHADE, rot);
    }
  }

  /*
   * Where a pilgrim STANDS, which has to be somewhere a body fits.
   *
   * This was `p(0, BAY * 1.15)` — local z 7.0, which is inside the CHOIR, and
   * `world.isClear` says so: solid. Everything that reads this anchor was
   * therefore aiming at a point in the masonry. The walk-out check starts
   * 1.9 m from the altar heading toward it and got 0.9 m before stopping,
   * which is the paradox I could not resolve by reading the geometry — the
   * walker was not walking out at all, it was walking into the choir wall.
   *
   * The spine runs sanctum (z 3.05) -> choir (z 9.15) -> nave (z 12.2 to
   * 29.6). Darshan is taken from the NAVE, looking back down it to the
   * sanctum, which is both where there is floor and where anyone actually
   * stands in a temple of this plan.
   */
  const darsh = p(0, BAY * 2 + 2.2);
  return {
    altarY: 2.2,
    colliders,
    interior: {
      altar: [sanct[0], FL + 1.35, sanct[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      // the spine runs 0 to BAY*2 + NAVE, so its middle is half of that
      volume: {
        x: p(0, (BAY * 2 + NAVE) * 0.5)[0], z: p(0, (BAY * 2 + NAVE) * 0.5)[1],
        hw: HW, hd: (NAVE + BAY * 2) * 0.5, rot,
        door: p(0, NZ + NAVE / 2 + 1.5),
      },
    },
  };
}


/* ================================================================
 * Shri Rangaji Mandir, Goda Vihar
 * ================================================================ */

/**
 * The only Dravidian temple in Braj, and — the research is emphatic about this
 * — "the only place in India where a South Indian gopuram rises directly
 * behind a Rajput carved-stone gate". That stack is the set piece and it is
 * what this builds for: a carved stone pavilion 93 ft high in the local north
 * Indian idiom standing IN FRONT of the Tamil tower, on one axis.
 *
 * Growse measured the enclosure in 1883: 773 x 440 ft, which is 236 x 134 m,
 * about 3.2 hectares, with FIVE concentric prakara walls inside it. The built
 * temple occupies only a modest fraction — "most of the walled area is open
 * ground, tank and garden", and you "step off a crowded Vrindavan street and
 * are suddenly in a huge, empty, sunlit precinct". That emptiness is the
 * experience, so the precinct is built at Growse's size and left mostly empty.
 *
 * COLOUR: the research says in terms "do NOT model this as a red-sandstone
 * temple". Dravidian stucco gopurams of this type are lime-white to cream with
 * polychrome painted figure tiers; the stone gates and colonnades are the
 * warmer note, not the towers.
 *
 * The west gopuram is SEVEN storeys and the east FIVE, each tier a row of
 * pilastered niches under a barrel-vaulted shala roof carrying kalashas. In
 * between: the pushkarini, the garden, and the gilded dhwaja stambha standing
 * directly in front of the sanctum doorway.
 */
const RG_STUCCO = 0xf0e9db;
const RG_STONE = 0xd8c4a0;
const RG_PAINT = [0xc0562f, 0x2f6f7a, 0xb8902e, 0x6a4a86, 0x2f6f4f];

function buildRangaji({ loc, b, ground, rng }) {
  const { color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];
  const FL = ground + 0.4;

  // Growse's enclosure, halved. The town is built around this footprint
  // already, so it is kept to the location's own w/d rather than forced to
  // 236 x 134 and pushed through the neighbours.
  const HW = loc.build.w * 0.5, HD = loc.build.d * 0.5;
  const T = 1.2, WALLH = 5.0;

  /* ---------------- the outer prakara ---------------- */
  b.box(x, ground - 0.3, z, HW * 2 + 6, 0.7, HD * 2 + 6, 0xcfc2a6, rot);
  const GAP = 8.5;
  const pw = (lx, lz, lw, ld) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], lw, WALLH, ld, RG_STONE, rot);
    b.box(q[0], FL + WALLH, q[1], lw + 0.5, 0.4, ld + 0.5, accent, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld + 0.3, rot });
  };
  pw(-HW + T / 2, 0, T, HD * 2);
  pw(HW - T / 2, 0, T, HD * 2);
  for (const end of [1, -1]) {                 // west and east, each with a gate
    const seg = (HW * 2 - GAP) / 2;
    for (const sgn of [-1, 1]) pw(sgn * (GAP / 2 + seg / 2), end * (HD - T / 2), seg, T);
  }

  /**
   * A gopuram: tiered, battering inward, each tier a row of pilastered niches
   * with painted stucco figures, capped by a barrel-vaulted shala carrying
   * kalashas.
   */
  const gopuram = (lz, storeys, baseW, baseD, H) => {
    const q = p(0, lz);
    // the stone base the tower sits on, with the passage through it
    const seg = (baseW - GAP) / 2;
    for (const sgn of [-1, 1]) {
      const s2 = p(sgn * (GAP / 2 + seg / 2), lz);
      b.box(s2[0], FL, s2[1], seg, 7.0, baseD, RG_STONE, rot);
      colliders.push({ type: 'box', x: s2[0], z: s2[1], w: seg, d: baseD, rot });
    }
    b.box(q[0], FL + 7.0, q[1], baseW, 1.2, baseD + 0.6, RG_STUCCO, rot);
    let y = FL + 8.2;
    for (let i = 0; i < storeys; i++) {
      const k = 1 - (i / storeys) * 0.55;
      const th = H / storeys;
      b.box(q[0], y, q[1], baseW * k, th * 0.82, baseD * k, RG_STUCCO, rot);
      // the row of pilastered niches, painted
      const n = Math.max(3, Math.round(6 * k));
      for (let j = 0; j < n; j++) {
        const lx = (j / (n - 1) - 0.5) * baseW * k * 0.8;
        for (const side of [1, -1]) {
          const nq = p(lx, lz + side * (baseD * k * 0.5 + 0.12));
          b.box(nq[0], y + th * 0.16, nq[1], baseW * k * 0.09, th * 0.5, 0.3,
            RG_PAINT[(i + j) % RG_PAINT.length], rot);
        }
      }
      b.box(q[0], y + th * 0.82, q[1], baseW * k + 0.7, th * 0.18, baseD * k + 0.7, accent, rot);
      y += th;
    }
    // the barrel-vaulted shala, and its row of kalashas
    b.box(q[0], y, q[1], baseW * 0.42, 1.5, baseD * 0.5, RG_STUCCO, rot);
    b.box(q[0], y + 1.5, q[1], baseW * 0.46, 0.9, baseD * 0.34, accent, rot);
    const nk = 5;
    for (let j = 0; j < nk; j++) {
      const kq = p((j / (nk - 1) - 0.5) * baseW * 0.36, lz);
      b.box(kq[0], y + 2.4, kq[1], 0.5, 1.1, 0.5, 0xc9a03c, rot);
    }
    return q;
  };

  // WEST: seven storeys, and the Rajput gate in front of it
  gopuram(HD - 9, 7, 17, 7.5, 21);
  // EAST: five
  gopuram(-HD + 9, 5, 14, 6.5, 14);

  /* ---------------- the Rajput pavilion, IN FRONT of the west tower ------ */
  /*
   * "A carved stone pavilion 93 ft (28.3 m) high in the local north-Indian
   * style stands in FRONT of the Dravidian gopura, which rises immediately
   * behind it." Two languages, one axis, and nowhere else in India.
   */
  {
    const gz = HD + 4.5;
    for (const sgn of [-1, 1]) {
      const q = p(sgn * 6.0, gz);
      b.box(q[0], FL, q[1], 3.4, 11.0, 3.4, RG_STONE, rot);
      // Jaipur-style carved work: cusped niches up the piers
      for (let i = 0; i < 3; i++) {
        const nq = p(sgn * 6.0, gz + 1.8);
        cuspedArch(b, nq[0], FL + 1.2 + i * 3.1, nq[1], 1.7, 2.2, 0.25, rot + Math.PI / 2, accent, 5, 0x3a2a1e);
      }
      chhatri(b, q[0], FL + 11.0, q[1], 1.5, 2.6, RG_STONE);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 3.4, d: 3.4, rot });
    }
    const g = p(0, gz);
    cuspedArch(b, g[0], FL, g[1], GAP, 8.5, 2.2, rot + Math.PI / 2, RG_STONE, 7, 0x241a12);
    b.box(g[0], FL + 11.0, g[1], 15.5, 1.3, 3.6, RG_STONE, rot);
    // and up: ninety-three feet of it
    let py = FL + 12.3, y2 = 0;
    for (let i = 0; i < 6; i++) {
      const k = 1 - i * 0.13;
      b.box(g[0], py + y2, g[1], 13 * k, 1.5, 3.4 * k, i % 2 ? RG_STONE : accent, rot);
      y2 += 1.5;
    }
    chhatri(b, g[0], py + y2, g[1], 2.0, 3.2, RG_STONE);
  }

  /* ---------------- the pushkarini, and the garden opposite -------------- */
  {
    const tq = p(-HW * 0.42, HD * 0.18);
    b.box(tq[0], FL, tq[1], 26, 0.5, 20, RG_STONE, rot);
    for (let i = 0; i < 5; i++) {              // the steps down into it
      b.box(tq[0], FL - i * 0.42, tq[1], 26 - i * 2.2, 0.42, 20 - i * 1.7, tint(RG_STONE, 0.96), rot);
    }
    b.box(tq[0], FL - 2.1, tq[1], 26 - 5 * 2.2, 0.3, 20 - 5 * 1.7, 0x3f6f78, rot);   // water
    colliders.push({ type: 'box', x: tq[0], z: tq[1], w: 26, d: 20, rot, tag: 'rg-tank' });

    // the garden with its stone fountains, opposite the tank
    const gq = p(HW * 0.42, HD * 0.18);
    b.box(gq[0], FL - 0.34, gq[1], 24, 0.2, 20, 0x6a8a4a, rot);
    for (const sgn of [-1, 1]) {
      const fq = p(HW * 0.42 + sgn * 6, HD * 0.18);
      b.box(fq[0], FL - 0.14, fq[1], 3.2, 0.5, 3.2, RG_STONE, rot);
      b.box(fq[0], FL + 0.36, fq[1], 0.5, 1.1, 0.5, RG_STONE, rot);
      b.box(fq[0], FL + 1.46, fq[1], 1.5, 0.3, 1.5, RG_STONE, rot);
    }
  }

  /* ---------------- the sanctum, and the gilded flagstaff --------------- */
  const SZ = -HD * 0.34;
  {
    const q = p(0, SZ);
    /*
     * HOLLOW. This was a filled 20 x 18 m block with the altar inside it, so
     * the sanctum could not be entered and the walk stopped 13.9 m short of
     * the Deities. Walls with a doorway, like every other temple here.
     */
    {
      const ST = 1.2, SDOOR = 3.6;
      const sface = (lx, lz, fw, fd) => {
        const f = p(lx, lz);
        b.box(f[0], FL, f[1], fw, 8.5, fd, RG_STUCCO, rot);
        colliders.push({ type: 'box', x: f[0], z: f[1], w: fw, d: fd + 0.25, rot });
      };
      sface(0, SZ - 9 + ST / 2, 20, ST);
      sface(-10 + ST / 2, SZ, ST, 18);
      sface(10 - ST / 2, SZ, ST, 18);
      const seg = (20 - SDOOR) / 2;
      for (const sgn of [-1, 1]) sface(sgn * (SDOOR / 2 + seg / 2), SZ + 9 - ST / 2, seg, ST);
      const f0 = p(0, SZ);
      b.box(f0[0], FL - 0.08, f0[1], 20 - ST, 0.14, 18 - ST, 0xe8e2d4, rot);
    }
    b.box(q[0], FL + 8.5, q[1], 21, 0.8, 19, accent, rot);
    // the vimana over it, small beside the gopurams, which is correct here
    let vy = FL + 9.3, y3 = 0;
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.16;
      b.box(q[0], vy + y3, q[1], 11 * k, 1.5, 10 * k, i % 2 ? RG_STUCCO : accent, rot);
      y3 += 1.5;
    }
    dome(b, q[0], vy + y3, q[1], 3.2, 3.4, RG_STUCCO);
    // the doorway
    const dr = p(0, SZ + 9);
    cuspedArch(b, dr[0], FL, dr[1], 3.6, 5.0, 1.2, rot + Math.PI / 2, 0xc9a03c, 5, 0x241a12);
    // "the gilded dhwaja stambha standing directly in front"
    const fq = p(0, SZ + 13);
    b.box(fq[0], FL, fq[1], 1.6, 0.6, 1.6, RG_STONE, rot);
    b.box(fq[0], FL + 0.6, fq[1], 0.42, 13.5, 0.42, 0xc9a03c, rot);
    b.box(fq[0], FL + 14.1, fq[1], 0.9, 0.7, 0.9, 0xc9a03c, rot);
    colliders.push({ type: 'circle', x: fq[0], z: fq[1], r: 0.5 });
  }

  /* ---------------- the long colonnaded corridors ---------------- */
  for (const sgn of [-1, 1]) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const lz = (i / (n - 1) - 0.5) * HD * 1.2;
      const q = p(sgn * (HW - 7), lz);
      b.box(q[0], FL, q[1], 0.7, 4.4, 0.7, RG_STONE, rot);     // square stone piers
      b.box(q[0], FL + 4.4, q[1], 1.0, 0.35, 1.0, accent, rot);
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.45 });
    }
    const cq = p(sgn * (HW - 5.2), 0);
    b.box(cq[0], FL + 4.75, cq[1], 4.4, 0.45, HD * 1.3, RG_STONE, rot);
  }

  const darsh = p(0, SZ + 16);
  return {
    altarY: 2.4,
    colliders,
    interior: {
      altar: [p(0, SZ)[0], FL + 1.4, p(0, SZ)[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      // the precinct is open to the sky and mostly empty, which is the point
      volume: { x, z, hw: HW, hd: HD, rot, open: true, door: p(0, HD + 1.5) },
    },
  };
}


/* ================================================================
 * Shri Jugal Kishore Mandir, above Kesi Ghat
 * ================================================================ */

/**
 * A shell, and it should look like one.
 *
 * "A red sandstone shell standing directly above Kesi Ghat with its whole nave
 * gone — you walk up to a tall, roofless-fronted, square sanctum block with a
 * curvilinear tower." Growse measured the choir at 25 FEET SQUARE, slightly
 * larger than the 20 ft choirs of Madan Mohan and Gopinath, and the nave that
 * once preceded it is COMPLETELY DESTROYED, so the standing footprint is
 * essentially that one 7.6 m square block on its plinth.
 *
 * Two details you cannot miss, and both are documented:
 *   - small doorways on BOTH NORTH AND SOUTH as well as the usual east end,
 *     each under a projecting hood carried on EIGHT CLOSELY-SET BRACKETS
 *     CARVED AS ELEPHANTS. Unique in this group.
 *   - a HOLLOW tower. Growse cleared "an accumulation of pigeons' dung more
 *     than four feet deep" from the UPPER ROOM OF THE TOWER, so there is a
 *     real chamber inside the spire above the sanctum.
 *
 * "Daylight now floods a space that was designed to be dark." The nave is
 * marked only by its plinth line, and nothing is roofed over it.
 *
 * And the altar is EMPTY — the Deity is worshipped at Panna. That is handled
 * in `content/altars.js`, not here, but it is why this is a monument and not a
 * temple, and why no gilding is invented for it.
 */
function buildJugalKishore({ loc, b, ground }) {
  const { color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];

  const CH = 3.8;               // half of Growse's 25 ft
  const WALL = 1.05;
  const FL = ground + 1.0;
  const H = 9.2;                // "a single TALL stone chamber"

  // the plinth, and the line of the lost nave marked on it and nothing more
  b.box(x, ground - 0.4, z, 26, 1.4, 15, 0xbfae8e, rot);
  {
    const nq = p(0, CH + 7.5);
    b.box(nq[0], ground + 1.0, nq[1], 8.5, 0.5, 14, 0xa8967a, rot);   // the nave's plinth
    for (const sgn of [-1, 1]) {                                       // stumps of its walls
      const q = p(sgn * 4.0, CH + 7.5);
      b.box(q[0], ground + 1.5, q[1], 0.9, 1.3, 14, tint(color, 0.94), rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 0.9, d: 14, rot });
    }
  }

  /* ---- the choir block: 25 ft square, three doorways ---- */
  const DOOR = 2.0;
  const face = (lx, lz, fw, fd) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], fw, H, fd, color, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.2, rot });
  };
  // west end, closed
  face(0, -CH + WALL / 2, CH * 2, WALL);
  // east, north and south each split around a doorway
  for (const [lx, lz, horiz] of [[0, CH - WALL / 2, true], [-CH + WALL / 2, 0, false], [CH - WALL / 2, 0, false]]) {
    const seg = (CH * 2 - DOOR) / 2;
    for (const sgn of [-1, 1]) {
      if (horiz) face(sgn * (DOOR / 2 + seg / 2), lz, seg, WALL);
      else face(lx, sgn * (DOOR / 2 + seg / 2), WALL, seg);
    }
  }
  // the floor of the chamber
  {
    const q = p(0, 0);
    b.box(q[0], FL - 0.1, q[1], CH * 2, 0.14, CH * 2, 0xc9bda2, rot);
  }

  /*
   * The elephant brackets: eight closely set under a projecting hood, over the
   * north and south doorways. This is the thing you cannot miss, so it is
   * drawn small but deliberately — a row of stubby heads, then the hood.
   */
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const t = (i / 7 - 0.5) * 2.9;
      const q = p(sgn * (CH + 0.18), t);
      b.box(q[0], FL + 2.5, q[1], 0.42, 0.34, 0.26, accent, rot);      // the head
      b.box(q[0] , FL + 2.36, q[1], 0.5, 0.16, 0.14, tint(accent, 0.9), rot);  // its trunk
    }
    const h = p(sgn * (CH + 0.5), 0);
    b.box(h[0], FL + 2.84, h[1], 1.0, 0.34, 3.6, accent, rot);          // the hood
  }
  // and the tracery fanlight over the choir arch at the east end
  {
    const q = p(0, CH - WALL / 2);
    cuspedArch(b, q[0], FL, q[1], DOOR + 0.6, 4.2, WALL + 0.3, rot + Math.PI / 2, accent, 7, 0x241a12);
    for (let i = 0; i < 5; i++) {
      const t = (i / 4 - 0.5) * 1.7;
      const f2 = p(t, CH + 0.1);
      b.box(f2[0], FL + 4.2, f2[1], 0.16, 0.9 - Math.abs(t) * 0.35, 0.16, accent, rot);
    }
  }

  /* ---- the tower: curvilinear, and HOLLOW, with a room inside it ---- */
  b.box(x, FL + H, z, CH * 2 + 0.9, 0.7, CH * 2 + 0.9, accent, rot);
  {
    let ty = FL + H + 0.7, y2 = 0;
    const TH = 13.5, N = 14;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const rr = CH * 0.95 * (1 - Math.pow(t, 1.55) * 0.84);
      const seg = TH / N;
      // hollow: four faces rather than a filled box, so the upper chamber is
      // a chamber and not a solid mass with a story attached
      const wallT = Math.max(0.35, rr * 0.3);
      for (const [ox, oz, fw, fd] of [
        [0, rr - wallT / 2, rr * 2, wallT], [0, -rr + wallT / 2, rr * 2, wallT],
        [rr - wallT / 2, 0, wallT, rr * 2], [-rr + wallT / 2, 0, wallT, rr * 2],
      ]) {
        const q = p(ox, oz);
        b.box(q[0], ty + y2, q[1], fw, seg, fd, i % 2 ? color : tint(color, 1.05), rot);
      }
      y2 += seg;
    }
    // the amalaka and finial; no gilding, because none is documented
    b.box(x, ty + y2, z, 2.2, 0.55, 2.2, accent, rot);
    b.box(x, ty + y2 + 0.55, z, 1.3, 0.9, 1.3, color, rot);
    b.box(x, ty + y2 + 1.45, z, 0.5, 0.7, 0.5, accent, rot);
  }

  const darsh = p(0, CH + 3.2);
  return {
    altarY: 2.0,
    colliders,
    interior: {
      altar: [p(0, -CH * 0.35)[0], FL + 1.2, p(0, -CH * 0.35)[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      volume: { x, z, hw: CH, hd: CH, rot, door: p(0, CH + 1.2) },
    },
  };
}


/* ================================================================
 * Shri Radha Vallabh Mandir — the old temple
 * ================================================================ */



/* ================================================================
 * Shri Radha Gopinath Mandir
 * ================================================================ */

/**
 * Growse, 1883, on the old temple: "the nave has entirely disappeared; the
 * three towers have been levelled with the roof; and the entrance gateway of
 * the court-yard is tottering to its fall." Every one of those is built here.
 *
 * He also says it "corresponds very closely both in style and DIMENSIONS with
 * that of Madan Mohan" — so the plan is the same 20 ft choir and 20 ft
 * sanctuary, with the 57 ft nave gone, and a lateral chapel on the south.
 *
 * THREE THINGS FIND THIS PLACE, and the research names them:
 *   - "the truncated, almost pyramidal red sandstone tower that just clears
 *     the rooftops and is the only way to find the place";
 *   - "the blind three-bracket-arch arcade stuck on the south wall like a
 *     screen" — Growse notes it serves NO structural purpose;
 *   - "a plain, busy living temple welded onto the north flank of a gutted
 *     Mughal-era shell", which is the honest state of it.
 *
 * "No documented chhatris, kalasha or flag on the old temple", so there are
 * none.
 */
function buildRadhaGopinath({ loc, b, ground }) {
  const { color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];

  const BAY = 6.1;              // 20 ft, as at Madan Mohan
  const HW = 4.0;
  const WALL = 1.0;
  const FL = ground + 0.9;
  const H = 8.6;

  b.box(x, ground - 0.35, z, 30, 1.25, 26, 0xbfae8e, rot);
  // "a fine boldly moulded plinth"
  b.box(x, ground + 0.9 - 0.45, z, HW * 2 + 2.4, 0.45, BAY * 2 + 2.4, accent, rot);

  const face = (lx, lz, fw, fd) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], fw, H, fd, color, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.2, rot });
  };

  /* ---- choir and sanctuary, each a 20 ft square. The nave is gone. ---- */
  const DOOR = 2.4;
  for (const sgn of [-1, 1]) face(sgn * (HW - WALL / 2), 0, WALL, BAY * 2);
  face(0, -BAY + WALL / 2, HW * 2, WALL);
  {
    const seg = (HW * 2 - DOOR) / 2;
    for (const sgn of [-1, 1]) face(sgn * (DOOR / 2 + seg / 2), BAY - WALL / 2, seg, WALL);
  }
  {
    const q = p(0, 0);
    b.box(q[0], FL - 0.1, q[1], HW * 2, 0.14, BAY * 2, 0xc9bda2, rot);
  }
  // "a richly carved arabesque choir arch"
  {
    const q = p(0, BAY - WALL / 2);
    cuspedArch(b, q[0], FL, q[1], DOOR + 0.5, 4.6, WALL + 0.3, rot + Math.PI / 2, accent, 7, 0x241a12);
    for (let i = -3; i <= 3; i++) {
      const a2 = p(i * 0.55, BAY + 0.1);
      b.box(a2[0], FL + 4.7, a2[1], 0.3, 0.42, 0.14, tint(accent, 1.04), rot);
    }
  }
  // the line of the lost nave, marked and not rebuilt
  {
    const nq = p(0, BAY + 8.7);
    b.box(nq[0], ground + 0.9, nq[1], HW * 2 + 1.4, 0.4, 17.4, 0xa8967a, rot);
    for (const sgn of [-1, 1]) {
      const q = p(sgn * HW, BAY + 8.7);
      b.box(q[0], ground + 1.3, q[1], 0.9, 1.1, 17.4, tint(color, 0.94), rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 0.9, d: 17.4, rot });
    }
  }

  /* ---- the three towers, LEVELLED WITH THE ROOF ---- */
  /*
   * Not stumps rising a little: levelled. What is left reads as an almost
   * pyramidal mass that "just clears the rooftops", so it is three low
   * pyramidal masses and nothing above them.
   */
  b.box(x, FL + H, z, HW * 2 + 0.8, 0.7, BAY * 2 + 0.8, accent, rot);
  for (const lz of [-BAY * 0.5, BAY * 0.5]) {
    const q = p(0, lz);
    let ty = FL + H + 0.7, y2 = 0;
    for (let i = 0; i < 4; i++) {
      const k = 1 - i * 0.2;
      b.box(q[0], ty + y2, q[1], HW * 1.7 * k, 0.85, BAY * 0.85 * k, i % 2 ? color : tint(color, 1.04), rot);
      y2 += 0.85;
    }
    b.box(q[0], ty + y2, q[1], HW * 1.0, 0.45, BAY * 0.5, 0x8a7060, rot);   // levelled off
  }

  /* ---- the blind three-bracket-arch arcade on the SOUTH wall ---- */
  /*
   * "Serves no structural purpose" — purely an ornamental screen applied to a
   * wall that already had a fine moulded plinth. So it stands proud of the
   * wall and carries nothing.
   */
  {
    const TZ = 0;
    const tq = p(HW + 1.3, TZ);
    b.box(tq[0], FL - 0.45, tq[1], 2.6, 0.5, BAY * 1.8, accent, rot);      // its terrace
    for (let i = -1; i <= 1; i++) {
      const q = p(HW + 0.35, TZ + i * 3.0);
      // a BRACKET arch: brackets corbelling in to a flat head, not a true arch
      for (const sgn of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const br = p(HW + 0.35, TZ + i * 3.0 + sgn * (1.15 - k * 0.26));
          b.box(br[0], FL + 2.0 + k * 0.42, br[1], 0.5, 0.42, 0.55 + k * 0.2, tint(accent, 0.94), rot);
        }
      }
      b.box(q[0], FL + 3.26, q[1], 0.55, 0.4, 2.5, accent, rot);           // the flat head
      for (const sgn of [-1, 1]) {
        const pq = p(HW + 0.35, TZ + i * 3.0 + sgn * 1.32);
        b.box(pq[0], FL, pq[1], 0.5, 2.0, 0.45, tint(color, 0.96), rot);   // its jambs
      }
    }
    // the carved stone railing along the terrace
    for (let i = 0; i < 9; i++) {
      const rq = p(HW + 2.5, TZ + (i / 8 - 0.5) * BAY * 1.7);
      b.box(rq[0], FL + 0.05, rq[1], 0.22, 0.95, 0.22, accent, rot);
    }
  }

  /* ---- the living temple welded onto the NORTH flank ---- */
  {
    const q = p(-HW - 5.5, BAY * 0.2);
    b.box(q[0], ground + 0.4, q[1], 10.5, 6.2, 13, 0xe0d4ba, rot);          // plain, busy
    b.box(q[0], ground + 6.6, q[1], 11.2, 0.5, 13.8, 0xc05a33, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 10.5, d: 13, rot });
    const dr = p(-HW - 5.5, BAY * 0.2 + 6.8);
    cuspedArch(b, dr[0], ground + 0.4, dr[1], 2.6, 3.4, 0.5, rot + Math.PI / 2, 0xc05a33, 5, 0x241a12);
  }

  /* ---- "the entrance gateway of the court-yard is tottering to its fall" -- */
  {
    const g = p(0, BAY + 17.4 + 2.5);
    for (const sgn of [-1, 1]) {
      const q = p(sgn * 3.0, BAY + 17.4 + 2.5);
      // leaning, and missing its upper courses
      b.box(q[0], ground + 0.5, q[1], 2.0, 4.6, 2.0, tint(color, 0.92), rot + sgn * 0.035);
      b.box(q[0], ground + 5.1, q[1], 2.3, 0.4, 2.3, 0x8a7060, rot + sgn * 0.035);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 2.0, d: 2.0, rot });
    }
    b.box(g[0], ground + 4.2, g[1], 8.2, 0.7, 2.2, accent, rot + 0.02);
  }

  const darsh = p(0, BAY + 3.0);
  return {
    altarY: 2.0,
    colliders,
    interior: {
      altar: [p(0, -BAY * 0.45)[0], FL + 1.3, p(0, -BAY * 0.45)[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      volume: { x, z, hw: HW, hd: BAY, rot, door: p(0, BAY + 1.2) },
    },
  };
}


/* ================================================================
 * Prem Mandir, Raman Reti
 * ================================================================ */

/**
 * "A white marble wedding cake standing alone in a park, floodlit at night in
 * cycling colours." The research calls it the only temple in Braj built and
 * operated like an attraction, and that is how it is built here: free-standing
 * in lawns, not hemmed in like the old town temples.
 *
 * The numbers are unusually well published. Body about 37 x 35 m on a raised
 * platform of 58 x 39 m, with a FORTY-FOOT (12 m) parikrama running round the
 * platform. Thirty-eight metres tall. NINE carved domes crowned by SEVENTEEN
 * gold-coloured kalashas, the flag taking it to 125 ft. Not one spire — "a
 * cluster of curvilinear shikhara and dome forms".
 *
 * And the facade: "84 PANELS of Radha-Krishna leelas on the outer walls; 150
 * carved pillars". The 84 panels are the lila atlas this project already
 * paints for the town's walls, which is the same thing the real building does
 * — the pastimes, carved round the outside, one after another.
 */
function buildPremMandir({ loc, b, ground, rng, terrain }) {
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  // The box frame: lx along (cos, sin). At rot 0, +lx is EAST and +lz SOUTH.
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];

  /*
   * PREM MANDIR FACES EAST. Rebuilt 2026-09-30 from docs/research/prem-mandir.md
   * and — this time — its independent checker, which the first rebuild never
   * saw because the filing script had attached another temple's checker to
   * this file.
   *
   * The first rebuild put the entrance and the broad flight on the SOUTH and
   * pushed the shikhara NORTH, because it treated the building's short axis
   * as front-to-back. The checker, working from the two OSM polygons and a
   * percentage grid laid over full-resolution photographs, fixes all of it:
   *   - the long axis is east-west and the forecourt is EAST: aprons W 13.4,
   *     E 35.5, S 12.9, N 14.9 m, so the building sits 11 m west of the
   *     platform's centre and 1 m south of it;
   *   - the sanctum is at the WEST end, and the shikhara over it stands at
   *     18.5% of the facade from the west; the central samvarana at 50%, the
   *     secondary roof at 74%, the corner turrets at 87%;
   *   - heights shikhara : central : secondary = 1.00 : 0.60 : 0.55, the
   *     parapet at 0.39 of the shikhara;
   *   - "the white marble terrace continues about 17 m further east" as a
   *     BOW, with "two uniform dark-teal quadrants … set INTO the eastern bow,
   *     symmetrically flanking a fine grid-patterned central panel" — pools;
   *   - "THE FLAG IS NOT ON THE KALASH … a slender metal mast offset to one
   *     side of the kalash axis, rising from the shikhara shoulder".
   *
   * DO NOT PAINT IT WHITE (the survey's words, and confirmed by the checker's
   * own 777,705-pixel measurement: mean luminance 62%, p50 68%, lit-marble
   * saturation 9.8%). Measured, overcast: ground storey #e5e7e1, upper
   * #dfddd1. The vertical ramp does the rest.
   */
  const MARBLE = 0xe5e7e1, UPPER = 0xdfddd1, SHADOW = 0xc9c7bb;
  const GOLD = 0xc9a03c;

  const HL = 30.65, HB = 20.3;        // the building: 61.3 x 40.6 m (OSM way 673573044)
  const PL = 55.1, PB = 34.2;         // the jagati: 110.2 x 68.4 m (OSM way 491803653)
  const PX = 11.05, PZ = -1.0;        // its centre, relative to the building's
  const BOW = 17.0;                   // how far the terrace bows out past the east edge
  const EAST = PX + PL;               // the platform's straight east edge, in lx
  const PAVE = 0xab8a82;              // "red sandstone plaza paving #ab8a82", MEASURED

  /** The highest terrain under a rectangle, so nothing drawn flat is buried at one end. */
  const highest = (cx, cz, w, d, n = 12) => {
    let hi = -Infinity;
    if (terrain && terrain.sampleHeight) {
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n; j++) {
          const q = p(cx + (i / n - 0.5) * w, cz + (j / n - 0.5) * d);
          const h = terrain.sampleHeight(q[0], q[1]);
          if (h > hi) hi = h;
        }
      }
    }
    return hi === -Infinity ? ground : hi;
  };

  /*
   * THREE LEVELS, AND EVERY ONE OF THEM IS A FLOOR YOU STAND ON.
   *
   * "i get vanished under stairs on walking instead of stepping up". The
   * first rebuild drew a plaza 0.65 m above the park and never made it a
   * floor, so the feet stayed on the terrain and the broad flight's first
   * tread came out a full metre over them — too tall to take. With nothing
   * to climb, the body walked on at ground level straight into the jagati,
   * whose sides were stand-only and stopped nothing. Walked with the
   * player's own movement: 34 m under the marble from the east. And the
   * 1.35 m kursi was a solid block under the whole building with the floor
   * left at its foot, so inside you stood sunk to the chest.
   *
   *   PLZ  the plaza: "the campus ground plane is RED SANDSTONE paving" — at
   *        grade, laid at the highest ground under it (0.37 m of fall
   *        across this site, measured), so the low kerb is still a step
   *   FL   the jagati: "~1.3-2.0 m above the red-paved plaza (ESTIMATED from
   *        6-12 visible risers)" — 1.75, five risers of 0.35
   *   FLI  the temple floor: "temple plinth a further 1.2-1.6 m" (ESTIMATED)
   *        — 1.35, four risers at the east door. The measured 13.3 m parapet
   *        stays measured from the jagati, where the survey took it.
   */
  const PAVE_X = PX + 8, PAVE_W = PL * 2 + BOW * 2 + 26, PAVE_D = PB * 2 + 26;
  const PLZ = highest(PAVE_X, PZ, PAVE_W, PAVE_D, 16) + 0.05;
  const FL = PLZ + 1.75;              // jagati top
  const KURSI = 1.35;
  const FLI = FL + KURSI + 0.01;      // the floor inside, a hair over the kursi's top course
  const H = 13.3;                     // parapet / roof deck over FL, MEASURED
  const SHIK_X = -HL + 0.185 * HL * 2;  // -19.3: shikhara axis, 18.5% from the west

  /* ---- the plaza: red sandstone at grade, in a diamond lattice ---- */
  {
    const q = p(PAVE_X, PZ);
    b.box(q[0], PLZ - 0.6, q[1], PAVE_W, 0.6, PAVE_D, PAVE, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: PAVE_W, d: PAVE_D, rot,
      top: PLZ, tag: 'prem-plaza', standOnly: true });
    /*
     * "laid in a bold diamond-lattice pattern with white marble cross-bands".
     * The pitch is not measured; 6 m reads as bold at the scale of the
     * building. Each band is clipped to the paving rectangle in the plaza's
     * own frame: u - v = c for one diagonal, u + v = c for the other.
     */
    const A = PAVE_W / 2, B = PAVE_D / 2, PITCH = 6.0;
    for (const sgn of [1, -1]) {
      for (let c = -(A + B) + PITCH / 2; c < A + B; c += PITCH) {
        // points (u, sgn * (u - c)) inside |u| <= A, |v| <= B
        const lo = Math.max(-A, c - B), hi = Math.min(A, c + B);
        if (hi - lo < 0.5) continue;
        const um = (lo + hi) / 2, vm = sgn * (um - c);
        const m = p(PAVE_X + um, PZ + vm);
        b.box(m[0], PLZ - 0.01, m[1], (hi - lo) * Math.SQRT2, 0.02, 0.32, 0xe8e4da,
          rot + sgn * Math.PI / 4);
      }
    }
  }
  /* ---- the processional avenue from the south gate ---- */
  {
    // "a ~22 m wide red-paved processional avenue run ~70 m from the
    // platform to the main gate on the road" — its line across the platform
    // is not measured; on the platform's centre is the INFERRED choice. The
    // gate itself is queued: it has its own survey to come.
    const from = PZ + PAVE_D / 2 - 0.5, to = PZ + PB + 70;
    const q = p(PX, (from + to) / 2);
    const AG = highest(PX, (from + to) / 2, 22, to - from, 8) + 0.05;
    const top = Math.min(AG, PLZ);
    b.box(q[0], top - 0.6, q[1], 22, 0.6, to - from, PAVE, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 22, d: to - from, rot,
      top, tag: 'prem-plaza', standOnly: true });
  }

  /* ---- the jagati: a moulded edge you cannot walk into, a bow, one broad flight ---- */
  {
    const q = p(PX, PZ);
    b.box(q[0], PLZ - 0.05, q[1], PL * 2, FL - 0.1 - (PLZ - 0.05), PB * 2, SHADOW, rot);
    b.box(q[0], FL - 0.1, q[1], PL * 2 - 0.5, 0.1, PB * 2 - 0.5, MARBLE, rot);
    // the moulded edge: an apron at the paving and a cornice under the marble
    b.box(q[0], PLZ, q[1], PL * 2 + 0.3, 0.3, PB * 2 + 0.3, tint(SHADOW, 0.92), rot);
    b.box(q[0], FL - 0.34, q[1], PL * 2 + 0.36, 0.24, PB * 2 + 0.36, MARBLE, rot);
    /*
     * SOLID, with a top. collide() lets you through a box only when its top
     * is within a step of your feet, so from the paving this is a wall and
     * from the marble it is the floor. `standOnly` here was the whole fault.
     * `floor` keeps it ground to isClear, which places people and things;
     * the tag stays 'temple-floor' so the blanket slab knows it is not needed.
     */
    colliders.push({ type: 'box', x: q[0], z: q[1], w: PL * 2 + 0.36, d: PB * 2 + 0.36, rot,
      top: FL, tag: 'temple-floor', floor: true });

    // the broad flight's numbers first: the bow stops where it begins
    const N = 5, RISE = (FL - PLZ) / N, TREAD = 0.62, SW = 16;
    const outAt = (t) => BOW * Math.sqrt(Math.max(0, 1 - t * t));
    const tip = EAST + outAt(SW / 2 / PB) - 0.3;

    // the bow: strips across the width, each running out as far as the arc.
    // 28 of them — at 14 the outline read as a staircase from the road.
    const NS = 28;
    const strips = [];
    for (let i = 0; i < NS; i++) {
      const t0 = (i / NS) * 2 - 1, t1 = ((i + 1) / NS) * 2 - 1;
      const z0 = PZ + t0 * PB, z1 = PZ + t1 * PB, lz = (z0 + z1) / 2, dz = z1 - z0;
      // In front of the flight a strip ends at the top tread, so the marble
      // does not cover the treads or stand across them as a wall.
      const flight = z1 > PZ - SW / 2 && z0 < PZ + SW / 2;
      const out = flight ? tip - EAST : outAt((t0 + t1) / 2);
      strips.push({ z0, z1, out, flight });
      const c = p(EAST + out / 2, lz);
      b.box(c[0], PLZ - 0.05, c[1], out, FL - 0.1 - (PLZ - 0.05), dz + 0.02, SHADOW, rot);
      b.box(c[0], FL - 0.1, c[1], out - (flight ? 0 : 0.25), 0.1, dz + 0.02, MARBLE, rot);
      const reach = flight ? out : out + 0.27;
      if (!flight) {
        const ce = p(EAST + out + 0.09, lz);
        b.box(ce[0], FL - 0.34, ce[1], 0.36, 0.24, dz + 0.02, MARBLE, rot);
        b.box(ce[0], PLZ, ce[1], 0.3, 0.3, dz + 0.02, tint(SHADOW, 0.92), rot);
      }
      const cc = p(EAST + reach / 2, lz);
      colliders.push({ type: 'box', x: cc[0], z: cc[1], w: reach, d: dz + 0.02, rot,
        top: FL, tag: 'temple-floor', floor: true });
    }
    // two ornamental pools in the bow, and the grid-paved panel between them.
    // The teal is INFERRED from satellite tone; the geometry is the checker's.
    for (const sz of [-1, 1]) {
      const c = p(EAST + 7.5, PZ + sz * 11.5);
      b.box(c[0], FL - 0.02, c[1], 11.4, 0.5, 12.4, SHADOW, rot);              // coping
      b.box(c[0], FL + 0.06, c[1], 10.2, 0.44, 11.2, 0x2f5f63, rot);           // water
      // a rim you do not step over: you walk round a pool, not across it
      colliders.push({ type: 'box', x: c[0], z: c[1], w: 11.4, d: 12.4, rot,
        top: FL + 1.0, tag: 'prem-pool' });
    }
    {
      const c = p(EAST + 7.5, PZ);
      b.box(c[0], FL - 0.06, c[1], 9.0, 0.08, 7.0, 0xdcd8cc, rot);
      for (let k = -3; k <= 3; k++) {
        const g1 = p(EAST + 7.5 + k * 1.25, PZ);
        b.box(g1[0], FL + 0.02, g1[1], 0.06, 0.02, 7.0, SHADOW, rot);
        const g2 = p(EAST + 7.5, PZ + k * 1.0);
        b.box(g2[0], FL + 0.02, g2[1], 9.0, 0.02, 0.06, SHADOW, rot);
      }
    }
    // the broad flight, EAST, at the tip of the bow, from the paving to the marble
    for (let i = 0; i < N; i++) {
      const lx = tip + (N - i) * TREAD - TREAD * 0.5;
      const c = p(lx, PZ);
      const top = PLZ + (i + 1) * RISE;
      b.box(c[0], PLZ - 0.05 + i * RISE, c[1], TREAD, RISE + 0.05, SW, MARBLE, rot);
      colliders.push({ type: 'box', x: c[0], z: c[1], w: TREAD, d: SW, rot,
        top, tag: 'temple-step', standOnly: true });
    }
    // its cheeks, which rise with it: nobody steps off the side of a flight
    for (const sz of [-1, 1]) {
      const c = p(tip + N * TREAD * 0.5, PZ + sz * (SW / 2 + 0.35));
      b.box(c[0], PLZ - 0.05, c[1], N * TREAD, FL + 0.9 - (PLZ - 0.05), 0.5, SHADOW, rot);
      colliders.push({ type: 'box', x: c[0], z: c[1], w: N * TREAD, d: 0.5, rot,
        top: FL + 0.9, tag: 'temple-rail' });
    }

    /*
     * "Moulded white marble edge, ornate metal balustrade", and "stainless/
     * chrome ornamental railings, which read as bright specular lines in
     * every photograph". Round the whole edge but the flight, so the only
     * way off the marble is the way you came up. It follows the edge as
     * drawn, strip by strip: a smooth curve would cut across the stepped
     * outline and leave rail hanging over the paving at the ends of the bow.
     */
    const RAIL = 0xd7dbde;
    const rail = (ax, az, bx, bz) => {
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.15) return;
      const ang = rot + Math.atan2(bz - az, bx - ax);
      const m = p((ax + bx) / 2, (az + bz) / 2);
      b.box(m[0], FL + 0.92, m[1], L + 0.06, 0.07, 0.09, RAIL, ang);
      b.box(m[0], FL + 0.16, m[1], L + 0.06, 0.05, 0.06, RAIL, ang);
      const n = Math.max(1, Math.round(L / 1.6));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const g = p(ax + (bx - ax) * t, az + (bz - az) * t);
        b.box(g[0], FL, g[1], 0.07, 0.95, 0.07, RAIL, ang);
      }
      colliders.push({ type: 'box', x: m[0], z: m[1], w: L + 0.1, d: 0.3, rot: ang,
        top: FL + 1.0, tag: 'temple-rail' });
    };
    const IN = 0.35;                                  // set back from the edge
    const W0 = PX - PL + IN, N0 = PZ - PB + IN, S0 = PZ + PB - IN;
    const gapLo = PZ - SW / 2 - 0.1, gapHi = PZ + SW / 2 + 0.1;
    const alongZ = (ax, z0, z1) => {                  // a run along lz, minus the flight
      const lo = Math.min(z0, z1), hi = Math.max(z0, z1);
      if (hi <= gapLo || lo >= gapHi) { rail(ax, lo, ax, hi); return; }
      if (lo < gapLo) rail(ax, lo, ax, gapLo);
      if (hi > gapHi) rail(ax, gapHi, ax, hi);
    };
    rail(W0, N0, EAST + strips[0].out - IN, N0);
    rail(W0, S0, EAST + strips[NS - 1].out - IN, S0);
    rail(W0, N0, W0, S0);
    // where strip i-1's run meets strip i's: an edge offset inward turns
    // into the strip that sticks out further
    const zb = [N0];
    for (let i = 1; i < NS; i++) {
      const a0 = strips[i - 1].out, a1 = strips[i].out, z = strips[i].z0;
      zb.push(Math.abs(a1 - a0) < 0.01 ? z : z + (a1 > a0 ? IN : -IN));
    }
    zb.push(S0);
    for (let i = 0; i < NS; i++) {
      alongZ(EAST + strips[i].out - IN, zb[i], zb[i + 1]);
      if (i > 0 && (zb[i] < gapLo || zb[i] > gapHi)) {
        const a0 = strips[i - 1].out, a1 = strips[i].out;
        if (Math.abs(a1 - a0) > 0.01) rail(EAST + Math.min(a0, a1) - IN, zb[i], EAST + Math.max(a0, a1) - IN, zb[i]);
      }
    }
  }

  /* ---- the body: walls, with the way in on the EAST face ---- */
  const WT = 1.0, DOOR = 5.0;
  const face = (lx, lz, fw, fd, col = MARBLE) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], fw, H, fd, col, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.25, rot });
  };
  face(0, -HB + WT / 2, HL * 2, WT);                  // north
  face(0, HB - WT / 2, HL * 2, WT);                   // south
  face(-HL + WT / 2, 0, WT, HB * 2);                  // west, behind the sanctum
  {
    const seg = (HB * 2 - DOOR) / 2;                  // east, split round the door
    for (const sgn of [-1, 1]) face(HL - WT / 2, sgn * (DOOR / 2 + seg / 2), WT, seg);
    const g = p(HL - WT / 2, 0);
    // an east-face opening spans along lz: rot + PI/2 (see arches.mjs)
    cuspedArch(b, g[0], FLI, g[1], DOOR, H * 0.62 - KURSI, WT + 0.4, rot + Math.PI / 2, MARBLE, 9, null);
  }
  // the upper storey reads a shade warmer than the lower, measured
  {
    const q = p(0, 0);
    b.box(q[0], FL + H * 0.53, q[1], HL * 2 + 0.06, 0.25, HB * 2 + 0.06, SHADOW, rot);   // floor line
    b.box(q[0], FLI - 0.12, q[1], HL * 2 - WT, 0.12, HB * 2 - WT, 0xefe9dc, rot);        // floor
  }
  /*
   * The kursi, 1.35 m of mouldings, is a SOLID with the temple floor on top
   * of it — drawn as one before, but the floor was left at its foot. Its
   * widest course runs 0.16 m proud of the 0.2 m apron, so the collider is
   * the whole drawn outline.
   */
  mouldedPlinth(b, x, FL, z, HL * 2 + 0.4, HB * 2 + 0.4, rot, SHADOW, KURSI);
  colliders.push({ type: 'box', x, z, w: HL * 2 + 0.72, d: HB * 2 + 0.72, rot,
    top: FLI, tag: 'temple-floor', floor: true });
  // and the way up it, at the east door: four risers, with cheeks
  {
    const N = 4, RISE = (FLI - FL) / N, TREAD = 0.5, SW = DOOR + 1.2;
    const x0 = HL + 0.36;
    for (let i = 0; i < N; i++) {
      const c = p(x0 + (N - i) * TREAD - TREAD * 0.5, 0);
      b.box(c[0], FL - 0.05 + i * RISE, c[1], TREAD, RISE + 0.05, SW, MARBLE, rot);
      colliders.push({ type: 'box', x: c[0], z: c[1], w: TREAD, d: SW, rot,
        top: FL + (i + 1) * RISE, tag: 'temple-step', standOnly: true });
    }
    for (const sz of [-1, 1]) {
      const c = p(x0 + N * TREAD * 0.5, sz * (SW / 2 + 0.3));
      b.box(c[0], FL - 0.05, c[1], N * TREAD, FLI + 0.8 - FL, 0.45, SHADOW, rot);
      colliders.push({ type: 'box', x: c[0], z: c[1], w: N * TREAD, d: 0.45, rot,
        top: FLI + 0.8, tag: 'temple-rail' });
    }
  }

  /* ---- the colonnade: pilasters and cusped arches on all four faces ---- */
  for (const [ax, az, n, alongZ] of [
    [0, HB, 11, false], [0, -HB, 11, false], [HL, 0, 8, true], [-HL, 0, 8, true],
  ]) {
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * (alongZ ? HB * 1.9 : HL * 1.9);
      const q = alongZ ? p(ax, t) : p(t, az);
      b.box(q[0], FLI, q[1], 0.7, H * 0.62 - KURSI, 0.7, MARBLE, rot);
      b.box(q[0], FL + H * 0.62, q[1], 1.0, 0.4, 1.0, SHADOW, rot);
      if (i < n - 1) {
        const t2 = ((i + 0.5) / (n - 1) - 0.5) * (alongZ ? HB * 1.9 : HL * 1.9);
        // keep the east face's door bay clear of a blind arch
        if (alongZ && ax > 0 && Math.abs(t2) < DOOR * 0.75) continue;
        const a2 = alongZ ? p(ax, t2) : p(t2, az);
        cuspedArch(b, a2[0], FL + H * 0.28, a2[1], 2.4, H * 0.32, 0.4,
          alongZ ? rot + Math.PI / 2 : rot, MARBLE, 7, SHADOW);
      }
    }
  }

  /* ---- the 84 lila panels ---- */
  /*
   * "80 panels = 48 ground + 32 first floor" (sourced), and the checker
   * confirms "polychrome painted narrative scenes … recessed behind plain
   * white marble frames". 22 on each long face, 20 on each short one — the
   * east face skips the door bay.
   */
  const lilaB = new MeshBuilder();
  {
    const PANEL = 1.55, Y = FL + H * 0.66;
    const runs = [
      [0, HB + 0.14, 22, false, rot + Math.PI / 2],
      [0, -HB - 0.14, 22, false, rot + Math.PI / 2],
      [HL + 0.14, 0, 20, true, rot],
      [-HL - 0.14, 0, 20, true, rot],
    ];
    let n84 = 0;
    for (const [ax, az, n, alongZ, ang] of runs) {
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * (alongZ ? HB * 1.86 : HL * 1.86);
        if (alongZ && ax > 0 && Math.abs(t) < DOOR * 0.7) { n84++; continue; }
        const q = alongZ ? p(ax, t) : p(t, az);
        lilaB.panelUV(q[0], Y, q[1], PANEL, PANEL, lilaUV(n84), ang, 0.04);
        n84++;
      }
    }
  }

  /* ---- the roof: one shikhara at the WEST, samvaranas along the axis ---- */
  b.box(x, FL + H, z, HL * 2 + 1.6, 1.1, HB * 2 + 1.6, SHADOW, rot);
  // the shikhara: 21.5 m above the parapet on a base about 13.4 m wide,
  // to the top of its kalash at 34.8 m (photogrammetry pinned to the 38.1 m flag)
  {
    const q = p(SHIK_X, 0);
    shikhara(b, q[0], FL + H, q[1], 6.7, 21.5, UPPER);
  }
  /*
   * A samvarana is not a dome: "many stacked horizontal courses of small
   * ribbed bell elements rising to a small crowning pavilion". Courses, then
   * a low gadrooned bell, then a kalash.
   */
  let kalasha = 1;                                   // the shikhara's own
  const samvarana = (lx, lz, baseW, rise) => {
    const q = p(lx, lz);
    const C = 5;
    let y = FL + H + 1.1;
    for (let i = 0; i < C; i++) {
      const k = 1 - (i / C) * 0.55;
      const ch = rise * 0.12;
      b.box(q[0], y, q[1], baseW * k, ch, baseW * k, i % 2 ? UPPER : SHADOW, rot);
      b.box(q[0], y + ch, q[1], baseW * k + 0.3, 0.12, baseW * k + 0.3, MARBLE, rot);
      y += ch + 0.12;
    }
    const bell = rise - (y - (FL + H + 1.1)) - 0.9;
    ribbedDome(b, q[0], y, q[1], baseW * 0.24, Math.max(0.8, bell), UPPER, SHADOW, 24);
    b.box(q[0], y + Math.max(0.8, bell), q[1], baseW * 0.07 + 0.25, 0.9, baseW * 0.07 + 0.25, GOLD, rot);
    kalasha++;
  };
  // MEASURED along the axis: central 50% (apex 21.5 m), secondary 74% (19.1 m),
  // corner turrets 87%
  samvarana(0, 0, 11.0, 21.5 - H - 1.1);
  samvarana(-HL + 0.74 * HL * 2, 0, 8.0, 19.1 - H - 1.1);
  for (const sz of [-1, 1]) samvarana(-HL + 0.87 * HL * 2, sz * HB * 0.72, 3.4, 3.6);
  // INFERRED, to reach the sourced "9 domes": a pair flanking the centre and a
  // pair flanking the secondary roof. Their positions are not measured.
  for (const sz of [-1, 1]) samvarana(0, sz * HB * 0.62, 4.0, 4.4);
  for (const sz of [-1, 1]) samvarana(-HL + 0.74 * HL * 2, sz * HB * 0.55, 3.6, 3.8);
  // "17 golden-coloured kalash" in all: the rest stand along the parapet
  for (let i = kalasha; i < 17; i++) {
    const a2 = ((i - kalasha) / (17 - kalasha)) * Math.PI * 2;
    const q = p(Math.cos(a2) * HL * 0.9, Math.sin(a2) * HB * 0.9);
    b.box(q[0], FL + H + 1.1, q[1], 0.7, 1.7, 0.7, GOLD, rot);
  }
  // the flag on its OWN mast, beside the kalash, from the shikhara's shoulder
  // to 38.1 m, and saffron
  {
    const q = p(SHIK_X, 4.2);
    b.box(q[0], FL + H + 11.5, q[1], 0.22, 38.1 - H - 11.5, 0.22, 0x8a8a86, rot);
    const f = p(SHIK_X, 5.6);
    b.box(f[0], FL + 35.4, f[1], 0.1, 1.4, 2.6, 0xe8891f, rot);
  }

  /* ---- the Satsang Bhavan's dome, west, where it was ---- */
  /*
   * Kept at its earlier position and size. The checker measures it at about
   * 87 m across, ~187 m from the platform centre — both larger and further
   * than this. Queued rather than moved: at that size it needs its own
   * keep-out and its own survey before it goes into a town.
   */
  {
    const q = p(PX - PL - 24, PZ);
    b.box(q[0], ground + 0.2, q[1], 42, 1.0, 38, 0xe4ded0, rot);
    ribbedDome(b, q[0], ground + 1.2, q[1], 20, 13.5, MARBLE, SHADOW, 20);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 40, d: 36, rot });
  }

  /* ---- the musical fountain, north ---- */
  /*
   * There is ONE fountain, and it is not where the three before this stood
   * (north, south and east of the platform, 17-20 m out — none of them in
   * the survey). "THE MUSICAL FOUNTAIN. MEASURED, ~64 m NORTH of the
   * platform's north edge. It is an OVAL/vesica, not a circle: outer
   * ornamental oval ~116 x 70 m, with pointed triangular terminations east
   * and west; white elliptical basin ~49 x 30 m; inner rectangular pool
   * ~32 x 19 m." The 64 m is taken to its centre and its east-west line to
   * the platform's centre: both INFERRED. The show, 19:00-19:30 in winter
   * and 19:30-20:00 in summer, is queued.
   */
  {
    const FX = PX, FZ = PZ - PB - 64;
    const VL = 58, VW = 35;
    // a vesica is two arcs; with half-length VL and half-width VW their
    // centres sit `ev` either side of the long axis
    const ev = (VL * VL - VW * VW) / (2 * VW), Rv = ev + VW;
    const halfW = (u) => Math.max(0, Math.sqrt(Math.max(0, Rv * Rv - u * u)) - ev);
    const FG = highest(FX, FZ, VL * 2, VW * 2, 10) + 0.05;
    const NV = 58;
    for (let i = 0; i < NV; i++) {
      const u0 = (i / NV) * 2 * VL - VL, u1 = ((i + 1) / NV) * 2 * VL - VL;
      const hw = halfW((u0 + u1) / 2);
      if (hw < 0.3) continue;
      const c = p(FX + (u0 + u1) / 2, FZ);
      b.box(c[0], FG - 0.6, c[1], u1 - u0 + 0.02, 0.6, hw * 2, PAVE, rot);
      colliders.push({ type: 'box', x: c[0], z: c[1], w: u1 - u0 + 0.02, d: hw * 2, rot,
        top: FG, tag: 'prem-plaza', standOnly: true });
    }
    // the white elliptical basin: a rim you walk round, water inside it,
    // and the rectangular pool in the middle. Drawn as true ellipses; its
    // collider is strips, all inside the drawn rim.
    const BA = 24.5, BB = 15.0, RIM = 1.0, NE = 64;
    const ell = (ra, rb, th, y) => { const q = p(FX + ra * Math.cos(th), FZ + rb * Math.sin(th)); return [q[0], y, q[1]]; };
    const WATER = FG + 0.42, RTOP = FG + 0.62;
    const ctr = p(FX, FZ);
    for (let k = 0; k < NE; k++) {
      const t0 = (k / NE) * Math.PI * 2, t1 = t0 - (Math.PI * 2) / NE;   // top faces wind this way
      // water
      const w0 = ell(BA - RIM, BB - RIM, t0, WATER), w1 = ell(BA - RIM, BB - RIM, t1, WATER);
      b.tri(ctr[0], WATER, ctr[1], w0[0], w0[1], w0[2], w1[0], w1[1], w1[2], 0x2f5f63);
      // the rim's top, its outer face down to the paving, its inner face down to the water
      const o0 = ell(BA, BB, t0, RTOP), o1 = ell(BA, BB, t1, RTOP);
      const i0 = ell(BA - RIM, BB - RIM, t0, RTOP), i1 = ell(BA - RIM, BB - RIM, t1, RTOP);
      b.quad(o0, o1, i1, i0, MARBLE);
      const ob0 = ell(BA, BB, t0, FG - 0.05), ob1 = ell(BA, BB, t1, FG - 0.05);
      b.quad(ob1, o1, o0, ob0, SHADOW);
      const ib0 = ell(BA - RIM, BB - RIM, t0, WATER), ib1 = ell(BA - RIM, BB - RIM, t1, WATER);
      b.quad(ib0, i0, i1, ib1, SHADOW);
    }
    {
      b.box(ctr[0], WATER - 0.02, ctr[1], 32.8, 0.08, 19.8, MARBLE, rot);  // the inner pool's coping
      b.box(ctr[0], WATER - 0.01, ctr[1], 32.0, 0.08, 19.0, 0x264f55, rot); // and its deeper water
    }
    // Solid round the rim, in chords along its centre line: 64 of them keep
    // within 5 cm of the drawn curve. The rim is higher than a step, so the
    // water inside needs no collider of its own.
    for (let k = 0; k < NE; k++) {
      const t0 = (k / NE) * Math.PI * 2, t1 = ((k + 1) / NE) * Math.PI * 2;
      const a0 = [FX + (BA - RIM / 2) * Math.cos(t0), FZ + (BB - RIM / 2) * Math.sin(t0)];
      const a1 = [FX + (BA - RIM / 2) * Math.cos(t1), FZ + (BB - RIM / 2) * Math.sin(t1)];
      const m = p((a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2);
      colliders.push({ type: 'box', x: m[0], z: m[1], w: Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) + 0.1,
        d: RIM, rot: rot + Math.atan2(a1[1] - a0[1], a1[0] - a0[0]), top: RTOP, tag: 'prem-fountain' });
    }
  }

  /* ---- where the Deities are, and where you stand to see them ---- */
  // the ground-floor sanctum is under the shikhara at the WEST end, so you
  // stand east of it and look west
  const altar = p(SHIK_X, 0);
  const darsh = p(SHIK_X + 9.5, 0);
  return {
    altarY: FLI + 1.4 - ground,
    colliders,
    mesh: { name: 'PremMandirLilas', builder: lilaB, x, z, r: Math.max(HL, HB) + 4, map: lilaAtlas },
    interior: {
      altar: [altar[0], FLI + 1.4, altar[1]],
      darshan: [darsh[0], darsh[1]],
      facing: Math.atan2(altar[0] - darsh[0], altar[1] - darsh[1]),
      floor: FLI,
      volume: { x, z, hw: HL, hd: HB, rot, door: p(HL + 1.5, 0) },
    },
  };
}
function buildKatyayani({ loc, b, ground }) {
  const { color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];
  const MARBLE = 0xf2efe6, BLACK = 0x2a2a2e, GOLD = 0xc9a03c;

  const HW = loc.build.w * 0.5, HD = loc.build.d * 0.5;
  const CW = HW + 13, CD = HD + 13;          // "a VAST courtyard"
  const FL = ground + 0.9;

  /* ---- the walled compound, and its courtyard ---- */
  b.box(x, ground - 0.3, z, CW * 2 + 4, 0.7, CD * 2 + 4, 0xd8d2c2, rot);
  const T = 0.8, WH = 4.2, GAP = 5.0;
  const cw = (lx, lz, lw, ld) => {
    const q = p(lx, lz);
    b.box(q[0], ground + 0.4, q[1], lw, WH, ld, MARBLE, rot);
    b.box(q[0], ground + 0.4 + WH, q[1], lw + 0.4, 0.3, ld + 0.4, accent, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld + 0.3, rot });
  };
  cw(0, -CD, CW * 2, T); cw(-CW, 0, T, CD * 2); cw(CW, 0, T, CD * 2);
  {
    const seg = (CW * 2 - GAP) / 2;
    for (const sgn of [-1, 1]) cw(sgn * (GAP / 2 + seg / 2), CD, seg, T);
    const g = p(0, CD);
    cuspedArch(b, g[0], ground + 0.4, g[1], GAP, 4.6, T + 0.5, rot + Math.PI / 2, GOLD, 5, 0x241a12);
  }

  /* ---- the shrine: white marble, BLACK pillars, inscribed ---- */
  b.box(x, FL - 0.35, z, HW * 2 + 3.5, 0.45, HD * 2 + 3.5, MARBLE, rot);
  {
    const WT = 0.85, DOOR = 2.8;
    const face = (lx, lz, fw, fd) => {
      const q = p(lx, lz);
      b.box(q[0], FL, q[1], fw, 7.0, fd, MARBLE, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.25, rot });
    };
    face(0, -HD + WT / 2, HW * 2, WT);
    face(-HW + WT / 2, 0, WT, HD * 2);
    face(HW - WT / 2, 0, WT, HD * 2);
    const seg = (HW * 2 - DOOR) / 2;
    for (const sgn of [-1, 1]) face(sgn * (DOOR / 2 + seg / 2), HD - WT / 2, seg, WT);
    const g = p(0, HD - WT / 2);
    cuspedArch(b, g[0], FL, g[1], DOOR, 4.4, WT + 0.4, rot + Math.PI / 2, GOLD, 7, 0x241a12);
    const f0 = p(0, 0);
    b.box(f0[0], FL - 0.08, f0[1], HW * 2 - WT, 0.14, HD * 2 - WT, 0xe8e2d4, rot);
  }
  for (const [ax, az, n, vert] of [
    [0, HD + 0.9, 5, false], [HW + 0.9, 0, 4, true], [-HW - 0.9, 0, 4, true],
  ]) {
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1) - 0.5) * (vert ? HD * 1.7 : HW * 1.7);
      const q = vert ? p(ax, t) : p(t, az);
      b.box(q[0], FL, q[1], 0.6, 5.4, 0.6, BLACK, rot);          // the black stone
      b.box(q[0], FL + 5.4, q[1], 0.9, 0.35, 0.9, MARBLE, rot);
      // "several PILLARS carry inscribed verses" — carved text as a facade element
      for (let k = 0; k < 4; k++) {
        b.box(q[0], FL + 1.1 + k * 0.95, q[1], 0.64, 0.12, 0.64, tint(BLACK, 1.6), rot);
      }
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.4 });
    }
  }
  b.box(x, FL + 7.0, z, HW * 2 + 1.2, 0.6, HD * 2 + 1.2, accent, rot);
  // a modest shikhara, because no source names one
  {
    let ty = FL + 7.6, y2 = 0;
    for (let i = 0; i < 7; i++) {
      const k = 1 - Math.pow(i / 7, 1.4) * 0.72;
      b.box(x, ty + y2, z, HW * 1.1 * k, 0.9, HD * 1.1 * k, i % 2 ? MARBLE : tint(MARBLE, 0.96), rot);
      y2 += 0.9;
    }
    b.box(x, ty + y2, z, 1.2, 0.5, 1.2, GOLD, rot);
  }

  /* ---- the gold lions on the steps ---- */
  for (const sgn of [-1, 1]) {
    const q = p(sgn * (HW * 0.62), HD + 2.6);
    b.box(q[0], FL - 0.35, q[1], 1.5, 0.7, 2.2, MARBLE, rot);
    b.box(q[0], FL + 0.35, q[1], 1.1, 1.1, 2.0, GOLD, rot);           // body
    const h = p(sgn * (HW * 0.62), HD + 3.5);
    b.box(h[0], FL + 1.2, h[1], 0.85, 0.9, 0.8, GOLD, rot);           // head
    b.box(h[0], FL + 1.1, h[1], 1.25, 1.25, 0.5, tint(GOLD, 0.88), rot);  // mane
  }
  // and the steps up
  for (let i = 0; i < 4; i++) {
    const q = p(0, HD + 1.6 + i * 0.5);
    b.box(q[0], FL - 0.35 - i * 0.24, q[1], HW * 1.5, 0.24, 0.5, MARBLE, rot);
  }

  /* ---- the five sampradaya shrines round the courtyard ---- */
  const FIVE = [[-CW * 0.62, CD * 0.5], [CW * 0.62, CD * 0.5], [-CW * 0.7, -CD * 0.3],
                [CW * 0.7, -CD * 0.3], [0, -CD * 0.68]];
  for (const [lx, lz] of FIVE) {
    const q = p(lx, lz);
    b.box(q[0], ground + 0.4, q[1], 5.2, 4.2, 5.2, MARBLE, rot);
    b.box(q[0], ground + 4.6, q[1], 5.8, 0.4, 5.8, accent, rot);
    dome(b, q[0], ground + 5.0, q[1], 1.9, 2.6, MARBLE);
    b.box(q[0], ground + 7.6, q[1], 0.5, 0.9, 0.5, GOLD, rot);
    const dr = p(lx, lz + 2.8);
    cuspedArch(b, dr[0], ground + 0.4, dr[1], 1.8, 2.6, 0.4, rot, GOLD, 5, 0x241a12);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: 5.2, d: 5.2, rot });
  }

  const darsh = p(0, HD + 6.5);
  return {
    altarY: 2.2,
    colliders,
    interior: {
      altar: [p(0, -HD * 0.4)[0], FL + 1.3, p(0, -HD * 0.4)[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      volume: { x, z, hw: HW, hd: HD, rot, door: p(0, HD + 1.2) },
    },
  };
}


/* ================================================================
 * Shri Gopishwar Mahadev Mandir
 * ================================================================ */

/**
 * The research on this one is mostly a list of things NOT to invent, and that
 * is respected here rather than papered over.
 *
 *   material — "NOT DOCUMENTED ... Do not commit to red sandstone or marble on
 *   my authority."
 *   towerForm — "NOT DOCUMENTED ... too vague to model from. Do not build a
 *   specific shikhara on this basis."
 *   facade — "NOT DOCUMENTED. No source I found describes arches, jali,
 *   columns, carved bands or balconies for this temple."
 *
 * So there is no shikhara, no carved facade and no asserted stone. What IS
 * documented is the plan — "a LARGE OPEN COURTYARD for rituals and prayer,
 * containing a venerated Peepal tree", with the courtyard dominating a single
 * cell shrine — and that is what gets built: mostly courtyard, mostly tree,
 * and a small plain cell.
 *
 * THE GOPI-VESH is the thing, and the research calls it "a time-of-day
 * mechanic, which is perfect for a walkable build". The SAME linga is
 * presented two completely different ways in one day: a bare linga in the
 * morning, and dressed as a gopi with special shringar in the evening for the
 * Ras Lila. Both are built, as two named meshes, and `Curtains` shows whichever
 * the hour calls for.
 */
function buildGopishwar({ loc, b, ground }) {
  const { color, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot;
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
  const colliders = [];

  // the courtyard dominates; the shrine is small
  const CW = loc.build.w * 0.5 + 9, CD = loc.build.d * 0.5 + 9;
  const SH = 3.6;                       // half-width of the cell
  const FL = ground + 0.45;

  b.box(x, ground - 0.2, z, CW * 2 + 3, 0.5, CD * 2 + 3, 0xd4c9ae, rot);
  b.box(x, ground + 0.3, z, CW * 2 - 1, 0.2, CD * 2 - 1, 0xc9bda2, rot);

  /* ---- the courtyard wall, with one way in ---- */
  const T = 0.7, WH = 3.4, GAP = 3.2;
  const cwall = (lx, lz, lw, ld) => {
    const q = p(lx, lz);
    b.box(q[0], ground + 0.3, q[1], lw, WH, ld, color, rot);
    b.box(q[0], ground + 0.3 + WH, q[1], lw + 0.35, 0.25, ld + 0.35, accent, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld + 0.3, rot });
  };
  cwall(0, -CD, CW * 2, T); cwall(-CW, 0, T, CD * 2); cwall(CW, 0, T, CD * 2);
  {
    const seg = (CW * 2 - GAP) / 2;
    for (const sgn of [-1, 1]) cwall(sgn * (GAP / 2 + seg / 2), CD, seg, T);
  }

  /* ---- the venerated Peepal, which the courtyard is built around ---- */
  {
    const q = p(-CW * 0.42, CD * 0.3);
    b.box(q[0], ground + 0.3, q[1], 3.6, 0.55, 3.6, accent, rot);       // its platform
    b.box(q[0], ground + 0.85, q[1], 1.0, 5.5, 1.0, 0x6a5240, rot);     // trunk
    for (let i = 0; i < 4; i++) {
      const r = 4.4 - i * 0.75;
      b.box(q[0], ground + 5.0 + i * 1.15, q[1], r * 2, 1.5, r * 2,
        i % 2 ? 0x4a7a3a : 0x5c8a46, rot + i * 0.4);
    }
    colliders.push({ type: 'circle', x: q[0], z: q[1], r: 1.9 });
  }

  /* ---- the cell: small, plain, flat-roofed. Nothing asserted. ---- */
  const WALLT = 0.6, DOOR = 1.6, CH = 4.0;
  const face = (lx, lz, fw, fd) => {
    const q = p(lx, lz);
    b.box(q[0], FL, q[1], fw, CH, fd, color, rot);
    colliders.push({ type: 'box', x: q[0], z: q[1], w: fw, d: fd + 0.2, rot });
  };
  face(0, -SH + WALLT / 2, SH * 2, WALLT);
  face(-SH + WALLT / 2, 0, WALLT, SH * 2);
  face(SH - WALLT / 2, 0, WALLT, SH * 2);
  {
    const seg = (SH * 2 - DOOR) / 2;
    for (const sgn of [-1, 1]) face(sgn * (DOOR / 2 + seg / 2), SH - WALLT / 2, seg, WALLT);
  }
  b.box(x, FL + CH, z, SH * 2 + 0.9, 0.5, SH * 2 + 0.9, accent, rot);
  {
    const q = p(0, 0);
    b.box(q[0], FL - 0.08, q[1], SH * 2, 0.12, SH * 2, 0xd8cbb0, rot);
  }

  /* ---- the two dresses of the same linga ---- */
  const al = p(0, -SH * 0.3);
  const dayB = new MeshBuilder();
  const eveB = new MeshBuilder();
  // BY DAY: a bare linga on its yoni base, and nothing else
  dayB.box(al[0], FL + 0.05, al[1], 1.5, 0.28, 1.15, 0x6a6a62, rot);
  dayB.box(al[0], FL + 0.33, al[1], 0.5, 0.95, 0.5, 0x4a4a46, rot);
  dayB.box(al[0], FL + 1.28, al[1], 0.42, 0.14, 0.42, 0x5a5a54, rot);
  // BY EVENING: the gopi-vesh — dressed, garlanded, crowned, for the Ras Lila
  eveB.box(al[0], FL + 0.05, al[1], 1.5, 0.28, 1.15, 0x6a6a62, rot);
  eveB.box(al[0], FL + 0.33, al[1], 0.72, 1.05, 0.72, 0xc4415c, rot);      // the sari
  eveB.box(al[0], FL + 0.55, al[1], 0.86, 0.22, 0.86, 0xe8c04c, rot);      // its border
  eveB.box(al[0], FL + 1.05, al[1], 0.5, 0.18, 0.5, 0xe8891f, rot);        // garland
  eveB.box(al[0], FL + 1.38, al[1], 0.62, 0.34, 0.62, 0xc9a03c, rot);      // the crown
  eveB.box(al[0], FL + 1.72, al[1], 0.22, 0.26, 0.22, 0xc9a03c, rot);

  const darsh = p(0, SH + 3.0);
  return {
    altarY: 1.5,
    colliders,
    // shown and hidden by the hour: the same Deity, two presentations
    curtain: [
      { name: 'Vesh:gopishwar-mahadev:day', builder: dayB, x, z, r: CW, vesh: 'day' },
      { name: 'Vesh:gopishwar-mahadev:evening', builder: eveB, x, z, r: CW, vesh: 'evening' },
    ],
    interior: {
      altar: [al[0], FL + 1.15, al[1]],
      darshan: [darsh[0], darsh[1]],
      facing: rot + Math.PI,
      floor: FL,
      volume: { x, z, hw: SH, hd: SH, rot, door: p(0, SH + 1.0) },
    },
  };
}

/**
 * Seva Kunj — THE CAGED CORRIDOR.
 *
 * A walled sacred grove of low twisted trees in old Vrindavan, south-south-west
 * of Radha Damodar. Verified enclosure from OpenStreetMap way 99418412:
 * 9,313 m², 158 m east-west.
 *
 * What makes it, and what a generic grove loses entirely: "You walk Seva Kunj
 * inside a green wire tunnel under a corrugated translucent barrel roof that is
 * amber in one run and pale green in the next, reading marble verse-plaques on
 * an ochre sandstone wall at your shoulder while the grove stays on the other
 * side of the mesh." You never actually enter the grove. You walk around it,
 * caged, looking in.
 *
 * "NOT a shikhara temple. No spire, no tower, no urushringas. The tallest thing
 * on site is a dome finial at roughly 8-10 m." And the Rang Mahal, where the
 * bed is laid each night and nobody stays after dark.
 */
function buildSevaKunj({ loc, b, ground, rng }) {
  const { w, d, accent } = loc.build;
  const [x, z] = loc.pos;
  const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
  const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  const colliders = [];
  const HW = w * 0.5, HD = d * 0.5;
  const CORR = 3.0;                       // the corridor you walk in
  const IW = HW - CORR, ID = HD - CORR;   // the grove, inside the cage

  const SANDSTONE = 0xc99a63, MESH = 0x4e7a52, ROOF_A = 0xd9a648, ROOF_B = 0xa9c08a;

  /*
   * The corridor runs the whole way round. Built as four runs of: an ochre
   * sandstone wall at shoulder height on the OUTSIDE, green mesh posts on the
   * INSIDE so the grove stays behind wire, and a translucent barrel roof over
   * the top that alternates amber and pale green run by run.
   */
  const runs = [
    { hx: HW - CORR * 0.5, hz: 0, len: d, along: 'z', tone: 0 },
    { hx: -(HW - CORR * 0.5), hz: 0, len: d, along: 'z', tone: 1 },
    { hx: 0, hz: HD - CORR * 0.5, len: w - CORR * 2, along: 'x', tone: 1 },
    { hx: 0, hz: -(HD - CORR * 0.5), len: w - CORR * 2, along: 'x', tone: 0 },
  ];
  for (const r of runs) {
    const q = p(r.hx, r.hz);
    const alongX = r.along === 'x';
    const ww = alongX ? r.len : CORR, dd = alongX ? CORR : r.len;

    // the sandstone wall on the outer face, shoulder height
    const oq = p(r.hx + (alongX ? 0 : Math.sign(r.hx) * (CORR * 0.5 - 0.2)),
      r.hz + (alongX ? Math.sign(r.hz) * (CORR * 0.5 - 0.2) : 0));
    b.box(oq[0], ground, oq[1], alongX ? r.len : 0.4, 1.55, alongX ? 0.4 : r.len,
      SANDSTONE, rot);
    colliders.push({ type: 'box', x: oq[0], z: oq[1],
      w: alongX ? r.len : 0.4, d: alongX ? 0.4 : r.len, rot });

    // the marble verse-plaques set into it at shoulder height
    const N = Math.max(4, Math.round(r.len / 6));
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N - 0.5;
      const pq = p(r.hx + (alongX ? t * r.len : Math.sign(r.hx) * (CORR * 0.5 - 0.42)),
        r.hz + (alongX ? Math.sign(r.hz) * (CORR * 0.5 - 0.42) : t * r.len));
      b.box(pq[0], ground + 1.0, pq[1], alongX ? 1.5 : 0.1, 0.62, alongX ? 0.1 : 1.5,
        0xf2efe6, rot);
    }

    // the green mesh on the inner face, so the grove stays behind wire
    const M = Math.max(6, Math.round(r.len / 2.4));
    for (let i = 0; i <= M; i++) {
      const t = i / M - 0.5;
      const mq = p(r.hx + (alongX ? t * r.len : -Math.sign(r.hx) * (CORR * 0.5 - 0.15)),
        r.hz + (alongX ? -Math.sign(r.hz) * (CORR * 0.5 - 0.15) : t * r.len));
      b.box(mq[0], ground, mq[1], 0.12, 2.5, 0.12, MESH, rot);
    }
    const iq = p(r.hx - (alongX ? 0 : Math.sign(r.hx) * (CORR * 0.5 - 0.15)),
      r.hz - (alongX ? Math.sign(r.hz) * (CORR * 0.5 - 0.15) : 0));
    b.box(iq[0], ground + 1.2, iq[1], alongX ? r.len : 0.06, 2.4, alongX ? 0.06 : r.len,
      MESH, rot);
    colliders.push({ type: 'box', x: iq[0], z: iq[1],
      w: alongX ? r.len : 0.3, d: alongX ? 0.3 : r.len, rot });

    /*
     * The barrel roof. Corrugated and translucent, and it alternates amber and
     * pale green from one run to the next — which is a small thing and the
     * kind of small thing that makes a place recognisable.
     */
    const tone = r.tone ? ROOF_B : ROOF_A;
    for (let k = 0; k < 5; k++) {
      const a = (k / 4 - 0.5) * Math.PI * 0.8;
      const off = Math.sin(a) * CORR * 0.5;
      const hy = ground + 2.5 + Math.cos(a) * 0.65;
      const rq = p(r.hx + (alongX ? 0 : off), r.hz + (alongX ? off : 0));
      b.box(rq[0], hy, rq[1], alongX ? r.len : CORR * 0.34, 0.1,
        alongX ? CORR * 0.34 : r.len, tone, rot);
    }
  }

  // the gateway into the corridor, on the entrance face
  { const g = p(0, HD - CORR * 0.5);
    cuspedArch(b, g[0], ground, g[1], 2.6, 3.0, 0.5, rot, accent, 7, 0x241a12); }

  /* ---- the grove itself, low and twisted, behind the wire ---- */
  for (let i = 0; i < 46; i++) {
    const lx = (rng() - 0.5) * IW * 1.9, lz = (rng() - 0.5) * ID * 1.9;
    if (Math.abs(lx) > IW - 2 || Math.abs(lz) > ID - 2) continue;
    const q = p(lx, lz);
    const lean = (rng() - 0.5) * 0.5;
    b.prism(q[0], ground, q[1], 0.5, 0.42, 0.34, 0.3, 1.8 + rng() * 1.2, 0x5a4530);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + rng();
      b.bevelBox(q[0] + Math.cos(a) * (0.9 + lean), ground + 2.0 + rng() * 0.8,
        q[1] + Math.sin(a) * (0.9 + lean), 2.6, 1.5, 2.6,
        k % 2 ? 0x3f6a32 : 0x4c7a3a, a, 0.42);
    }
    colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.4 });
  }

  /* ---- the Rang Mahal, where the bed is laid ---- */
  const rz = -(ID - 7.0);
  {
    const q = p(0, rz);
    const RW = 11, RD = 8.5, RWT = 0.5;
    for (const sx of [-1, 1]) {
      const c2 = p(sx * (RW * 0.5 - RWT * 0.5), rz);
      b.box(c2[0], ground, c2[1], RWT, 4.4, RD, 0xf0e8d6, rot);
      colliders.push({ type: 'box', x: c2[0], z: c2[1], w: RWT, d: RD, rot });
    }
    const bk = p(0, rz - RD * 0.5 + RWT * 0.5);
    b.box(bk[0], ground, bk[1], RW, 4.4, RWT, 0xf0e8d6, rot);
    colliders.push({ type: 'box', x: bk[0], z: bk[1], w: RW, d: RWT, rot });
    b.box(q[0], ground + 4.4, q[1], RW + 0.9, 0.3, RD + 0.9, accent, rot);
    // the dome — at 8-10 m the tallest thing on the site, and NOT a shikhara
    dome(b, q[0], ground + 4.7, q[1], 2.6, 3.4, 0xf4efe2);
    b.box(q[0], ground + 8.1, q[1], 0.4, 1.0, 0.4, accent, rot);
    cuspedArch(b, q[0], ground, q[1] + RD * 0.5, 2.2, 3.0, 0.45,
      rot + Math.PI / 2, accent, 9, 0x241a12);
    // the bed itself, laid and never seen used
    const bq = p(0, rz - 1.0);
    b.box(bq[0], ground + 0.1, bq[1], 3.2, 0.55, 2.0, 0x8a6a42, rot);
    b.box(bq[0], ground + 0.65, bq[1], 3.3, 0.22, 2.1, 0xf2ece0, rot);
    colliders.push({ type: 'box', x: bq[0], z: bq[1], w: 3.2, d: 2.0, rot });
  }

  return { altarY: 1.1, noCollider: true, colliders };
}

const BUILDERS = {
  /* ================================================================
   * THE EIGHT PLACES ADDED 2026-09-27
   *
   * Researched and independently verified — notes in docs/research/<id>.md,
   * two agents each, one researching and one checking the first against
   * separate sources. The "do not build" warning from each is quoted at the
   * builder it applies to, because that warning is the part that gets
   * forgotten: Chandrodaya was modelled as a finished tower for months
   * because everybody has seen the render and nobody has seen the site.
   * ================================================================ */

  /**
   * Imli Tala — THE LEANING DEAD TRUNK.
   *
   * The tamarind on the old Yamuna bank where Mahaprabhu sat daily.
   *
   * "DO NOT build a shikhara over the visible temple. The main temple block
   * facing the courtyard is SINGLE-STOREY AND FLAT-ROOFED with a plain
   * parapet." What carries the place is not the building at all: it is "the
   * enormous LEANING DEAD TRUNK of the ancient tamarind, wrapped in a bare
   * sheet-metal jacket, rising diagonally out of a white-tiled pedestal".
   * Not living, not upright, and not a tree anyone would model by instinct.
   */
  'temple-imli': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const colliders = [];
        /*
     * Drawn into the SHARED mesh, not an interior one.
     *
     * An `out.mesh` goes into `interiorMeshes`, which `InteriorSystem` culls
     * at 220 m — right for Krishna Balaram's courtyard, which is enormous and
     * only worth submitting when you are in it, and wrong for a building this
     * size. Photographed from outside, this temple was simply NOT THERE: open
     * ground where it should stand. That is the whole of what the pictures
     * caught and no check could, because every check walks up close.
     */
    const ib = b;
    const HW = w * 0.5, HD = d * 0.5, WT = 0.5;
    const FL = ground + 0.12;

    // the court wall, with a plain opening toward the lane
    const DOOR = 2.4, seg = (w - DOOR) / 2;
    for (const sx of [-1, 1]) {
      const q = p(sx * (DOOR / 2 + seg / 2), HD - WT * 0.5);
      ib.box(q[0], ground, q[1], seg, 3.4, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
    }
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - WT * 0.5), 0);
      ib.box(q[0], ground, q[1], WT, 3.4, d, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d, rot });
    }
    { const q = p(0, -(HD - WT * 0.5));
      ib.box(q[0], ground, q[1], w, 3.4, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w, d: WT, rot }); }
    { const q = p(0, 0);
      ib.box(q[0], FL - 0.1, q[1], w - WT * 2, 0.2, d - WT * 2, 0xd6cbb2, rot); }

    /* ---- the tree: a dead trunk in a metal jacket, leaning ---- */
    {
      const tq = p(-w * 0.18, d * 0.12);
      // the white-tiled pedestal it rises out of
      ib.box(tq[0], FL, tq[1], 3.0, 0.7, 3.0, 0xf2f0ea, rot);
      colliders.push({ type: 'box', x: tq[0], z: tq[1], w: 3.0, d: 3.0, rot,
        h: (FL + 0.7) - ground, tag: 'imli-plinth' });
      /*
       * The jacket. Sheet metal, dull, and it LEANS — segments stepped off
       * the vertical so the whole thing drives diagonally up out of the
       * pedestal. An upright cylinder would be a different tree.
       */
      /*
       * It has to DOMINATE. Photographed, the trunk was a small grey diagonal
       * lost among the town's ordinary trees — and this trunk is the entire
       * reason anybody stands here. The research calls it "the enormous
       * leaning dead trunk", so: half as wide again, half as tall again, and
       * a paler metal so it reads against the green rather than into it.
       */
      const LEAN = 0.42;
      let lx = 0, ly = FL + 0.7;
      for (let i = 0; i < 12; i++) {
        const q = p(-w * 0.18 + lx, d * 0.12 + lx * 0.4);
        const rr = 1.62 - i * 0.075;
        ib.box(q[0], ly, q[1], rr, 1.02, rr, i % 2 ? 0xb6bcbe : 0xc6ccce, rot + i * 0.04);
        // the banding where the sheets are lapped and wired
        if (i % 2 === 0) ib.box(q[0], ly + 0.9, q[1], rr + 0.14, 0.12, rr + 0.14, 0x8a9092, rot + i * 0.04);
        lx += LEAN; ly += 0.95;
      }
      colliders.push({ type: 'circle', x: tq[0], z: tq[1], r: 1.3, tag: 'imli-trunk' });
      // the few living branches left at the head
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + 0.5;
        const q = p(-w * 0.18 + lx + Math.cos(a) * 1.4, d * 0.12 + lx * 0.4 + Math.sin(a) * 1.4);
        ib.bevelBox(q[0], ly + rng() * 0.8, q[1], 2.2, 1.3, 2.2,
          i % 2 ? 0x4a6b34 : 0x567a3c, a, 0.4);
      }
    }

    /* ---- the temple block: single storey, flat roof, plain parapet ---- */
    const bz = -(HD - WT - d * 0.22);
    {
      const q = p(0, bz);
      const BW = w * 0.62, BD = d * 0.34, BWT = 0.6;
      for (const sx of [-1, 1]) {
        const c2 = p(sx * (BW * 0.5 - BWT * 0.5), bz);
        ib.box(c2[0], FL, c2[1], BWT, h, BD, tint(color, 1.03), rot);
        colliders.push({ type: 'box', x: c2[0], z: c2[1], w: BWT, d: BD, rot });
      }
      const bk = p(0, bz - BD * 0.5 + BWT * 0.5);
      ib.box(bk[0], FL, bk[1], BW, h, BWT, tint(color, 1.0), rot);
      colliders.push({ type: 'box', x: bk[0], z: bk[1], w: BW, d: BWT, rot });
      // the flat roof and its plain parapet — no shikhara
      ib.box(q[0], FL + h, q[1], BW + 0.8, 0.26, BD + 0.8, accent, rot);
      ib.box(q[0], FL + h + 0.26, q[1], BW + 0.8, 0.44, 0.22, tint(color, 1.05), rot);
      cuspedArch(ib, q[0], FL, q[1] + BD * 0.5, 2.4, h * 0.66, 0.42,
        rot + Math.PI / 2, accent, 7, 0x241a12);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: BW, d: BD, rot,
        h: FL - ground, tag: 'temple-floor', standOnly: true });
    }

    const altar = p(0, bz - d * 0.08);
    const darshan = p(0, bz + d * 0.26);
    return {
      altarY: 1.25, colliders,
      interior: {
        altar: [altar[0], FL + 1.25, altar[1]],
        darshan: [darshan[0], darshan[1]],
        facing: rot + Math.PI, floor: FL, open: true,
        volume: { x, z, hw: HW - WT, hd: HD - WT, rot, open: true, door: p(0, HD + 1.0) },
      },
    };
  },

  /**
   * Prachin Mirabai Mandir — MIRABAI STANDS ON THE ALTAR AS A THIRD DEITY.
   *
   * A small 19th-century courtyard house-temple in the Govind Bagh lanes
   * behind Nidhivan. "Not a portrait, not a samadhi — a crowned, brocaded
   * murti of her on the main throne beside Radha and Krishna." There is no
   * other altar in Vrindavan like it.
   *
   * "Do not build the Chittorgarh Meera Temple. This remains the single most
   * likely error" — most images labelled "Meera Bai Mandir" are the one
   * inside Chittorgarh Fort, a different building in a different state.
   */
  'temple-house-court': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const colliders = [];
        /*
     * Drawn into the SHARED mesh, not an interior one.
     *
     * An `out.mesh` goes into `interiorMeshes`, which `InteriorSystem` culls
     * at 220 m — right for Krishna Balaram's courtyard, which is enormous and
     * only worth submitting when you are in it, and wrong for a building this
     * size. Photographed from outside, this temple was simply NOT THERE: open
     * ground where it should stand. That is the whole of what the pictures
     * caught and no check could, because every check walks up close.
     */
    const ib = b;
    const HW = w * 0.5, HD = d * 0.5, WT = 0.45;
    const FL = ground + 0.1;

    // a house front on the lane, with one low door — you would walk past it
    const DOOR = 1.7, seg = (w - DOOR) / 2;
    for (const sx of [-1, 1]) {
      const q = p(sx * (DOOR / 2 + seg / 2), HD - WT * 0.5);
      ib.box(q[0], ground, q[1], seg, h, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
    }
    { const g = p(0, HD - WT * 0.5);
      cuspedArch(ib, g[0], ground, g[1], DOOR, 2.6, 0.38, rot, accent, 7, 0x241a12);
      ib.box(g[0], ground + h, g[1], w + 0.7, 0.24, WT + 0.5, accent, rot); }
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - WT * 0.5), 0);
      ib.box(q[0], ground, q[1], WT, h, d, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d, rot });
    }
    { const q = p(0, -(HD - WT * 0.5));
      ib.box(q[0], ground, q[1], w, h, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w, d: WT, rot }); }
    { const q = p(0, 0);
      ib.box(q[0], FL - 0.1, q[1], w - WT * 2, 0.2, d - WT * 2, 0xdccfb4, rot); }

    // the verandah round the little court, on square piers
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const q = p(sx * (HW - WT - 1.6), -d * 0.22 + i * d * 0.22);
        ib.box(q[0], FL, q[1], 0.28, h * 0.72, 0.28, 0xf0e8d6, rot);
        colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.26 });
      }
    }

    /* ---- the shrine at the back, and the THREE on its throne ---- */
    const sz2 = -(HD - WT - 2.6);
    {
      const q = p(0, sz2);
      const BW = w * 0.62, BWT = 0.5;
      for (const sx of [-1, 1]) {
        const c2 = p(sx * (BW * 0.5 - BWT * 0.5), sz2);
        ib.box(c2[0], FL, c2[1], BWT, h * 0.86, 3.4, tint(color, 1.04), rot);
        colliders.push({ type: 'box', x: c2[0], z: c2[1], w: BWT, d: 3.4, rot });
      }
      const bk = p(0, sz2 - 1.7 + BWT * 0.5);
      ib.box(bk[0], FL, bk[1], BW, h * 0.86, BWT, tint(color, 1.02), rot);
      colliders.push({ type: 'box', x: bk[0], z: bk[1], w: BW, d: BWT, rot });
      ib.box(q[0], FL + h * 0.86, q[1], BW + 0.7, 0.24, 4.1, accent, rot);
      cuspedArch(ib, q[0], FL, q[1] + 1.7, 1.9, h * 0.58, 0.38, rot, accent, 9, 0x241a12);
      // the throne: wide enough for THREE, which is the whole point
      const t2 = p(0, sz2 - 0.5);
      ib.box(t2[0], FL, t2[1], BW * 0.76, 0.85, 0.9, 0xe4d6b4, rot);
      colliders.push({ type: 'box', x: t2[0], z: t2[1], w: BW * 0.76, d: 0.9, rot });
      colliders.push({ type: 'box', x: q[0], z: q[1], w: BW, d: 3.4, rot,
        h: FL - ground, tag: 'temple-floor', standOnly: true });
    }

    const altar = p(0, sz2 - 0.5);
    const darshan = p(0, sz2 + 3.0);
    return {
      altarY: 1.15, colliders,
      interior: {
        altar: [altar[0], FL + 1.15, altar[1]],
        darshan: [darshan[0], darshan[1]],
        facing: rot + Math.PI, floor: FL,
        volume: { x, z, hw: HW - WT, hd: HD - WT, rot, door: p(0, HD + 1.0) },
      },
    };
  },

  /**
   * Shri Akrur Dham — THE DEVOTEE IS ON THE THRONE, AND IT IS NOT A GHAT.
   *
   * Where Akrura took Krishna and Balarama to Mathura. Everyone calls it
   * "Akrura Ghat" and "DO NOT build a riverfront ghat. No flight of stone
   * steps down to water exists at this temple. Do not place the Yamuna at its
   * foot." It is a walled temple garden standing alone in farmland.
   *
   * And the altar is unique in Braj: "Akrura stands in the middle with Krishna
   * and Balarama one on each side" — the devotee in the centre and in front,
   * larger than the Lord. Four independent sources say exactly this.
   */
  'temple-walled-garden': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const colliders = [];
    const HW = w * 0.5, HD = d * 0.5, WT = 0.6;

    // the boundary wall round the garden, with a gate
    const DOOR = 3.2, seg = (w - DOOR) / 2;
    for (const sx of [-1, 1]) {
      const q = p(sx * (DOOR / 2 + seg / 2), HD - WT * 0.5);
      b.box(q[0], ground, q[1], seg, 2.6, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
    }
    { const g = p(0, HD - WT * 0.5);
      b.box(g[0], ground, g[1], DOOR + 2.4, 4.2, WT + 0.4, tint(color, 1.05), rot);
      cuspedArch(b, g[0], ground, g[1], DOOR, 3.0, 0.5, rot + Math.PI / 2, accent, 7, 0x241a12);
      for (const sx of [-1, 1]) chhatri(b, g[0] + sx * (DOOR * 0.5 + 1.0) * cs,
        ground + 4.2, g[1] - sx * (DOOR * 0.5 + 1.0) * sn, 0.8, 1.5, 0xf0e6d2); }
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - WT * 0.5), 0);
      b.box(q[0], ground, q[1], WT, 2.6, d, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d, rot });
    }
    { const q = p(0, -(HD - WT * 0.5));
      b.box(q[0], ground, q[1], w, 2.6, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w, d: WT, rot }); }

    // the garden: trees in rows, which is what the photographs show
    for (let i = 0; i < 10; i++) {
      const lx = (-0.5 + ((i % 5) + 0.5) / 5) * (w - WT * 4);
      const lz = (i < 5 ? 0.22 : -0.10) * d;
      const q = p(lx, lz);
      b.prism(q[0], ground, q[1], 0.5, 0.42, 0.3, 0.26, 3.2 + rng() * 1.0, 0x6a5138);
      b.bevelBox(q[0], ground + 3.4, q[1], 3.2, 2.2, 3.2,
        i % 2 ? 0x46753a : 0x3d6a33, rng() * TAU, 0.42);
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: 0.42 });
    }

    /* ---- the shrine at the back ---- */
    const sz2 = -(HD - WT - d * 0.20);
    {
      const q = p(0, sz2);
      const BW = w * 0.46, BD = d * 0.26, BWT = 0.6;
      for (const sx of [-1, 1]) {
        const c2 = p(sx * (BW * 0.5 - BWT * 0.5), sz2);
        b.box(c2[0], ground, c2[1], BWT, h, BD, tint(color, 1.04), rot);
        colliders.push({ type: 'box', x: c2[0], z: c2[1], w: BWT, d: BD, rot });
      }
      const bk = p(0, sz2 - BD * 0.5 + BWT * 0.5);
      b.box(bk[0], ground, bk[1], BW, h, BWT, tint(color, 1.02), rot);
      colliders.push({ type: 'box', x: bk[0], z: bk[1], w: BW, d: BWT, rot });
      b.box(q[0], ground + h, q[1], BW + 1.0, 0.3, BD + 1.0, accent, rot);
      shikhara(b, q[0], ground + h + 0.3, q[1], BW * 0.2, h * 0.7, tint(color, 1.06), 12);
      cuspedArch(b, q[0], ground, q[1] + BD * 0.5, 2.6, h * 0.62, 0.45,
        rot + Math.PI / 2, accent, 9, 0x241a12);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: BW, d: BD, rot,
        h: 0.12, tag: 'temple-floor', standOnly: true });
    }

    const altar = p(0, sz2 - d * 0.05);
    const darshan = p(0, sz2 + d * 0.20);
    return {
      altarY: 1.4, noCollider: true, colliders,
      interior: {
        altar: [altar[0], ground + 1.4, altar[1]],
        darshan: [darshan[0], darshan[1]],
        facing: rot + Math.PI, floor: ground + 0.12, open: true,
        volume: { x, z, hw: HW - WT, hd: HD - WT, rot, open: true, door: p(0, HD + 1.2) },
      },
    };
  },

  /**
   * Ashta Sakhi — THE ALTAR IS UPSTAIRS.
   *
   * Two minutes' walk from Banke Bihari and on everybody's route. The
   * research's first and loudest warning: "DO NOT put the main altar at
   * ground level facing the street door. The temple's own tour says the
   * stairs beside the commercial frontage go up to it." A ground-floor
   * sanctum would be the wrong building.
   *
   * The altar is a fan of REAL PEACOCK FEATHERS in concentric rows filling a
   * white marble arch, with ten figures in a stepped arc — Radha and Krishna
   * in the centre, the eight sakhis around Them, a white feather chhatra
   * behind. Plot-filling carved pink sandstone, squeezed into a lane.
   */
  'temple-upstairs-sakhi': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    /*
     * THE BOX FRAME. This read `x + lx*cs + lz*sn, z - lx*sn + lz*cs`, the
     * mirror, while every box and collider here is turned the box frame's way
     * — which agree only at rot 0 and 180, where the temple happened to sit.
     * Moved onto its OSM node and turned to face its lane, its walls and their
     * colliders parted company: temples.mjs found 79% of the wall line open,
     * platforms.mjs walked into the upstairs floor. At 180 the two frames are
     * the same, so nothing that was right before has moved.
     */
    const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
    const colliders = [];
        /*
     * Drawn into the SHARED mesh, not an interior one.
     *
     * An `out.mesh` goes into `interiorMeshes`, which `InteriorSystem` culls
     * at 220 m — right for Krishna Balaram's courtyard, which is enormous and
     * only worth submitting when you are in it, and wrong for a building this
     * size. Photographed from outside, this temple was simply NOT THERE: open
     * ground where it should stand. That is the whole of what the pictures
     * caught and no check could, because every check walks up close.
     */
    const ib = b;
    const HW = w * 0.5, HD = d * 0.5, WT = 0.5;
    const G_H = 4.2;                              // the commercial ground floor
    const FL = ground + 0.15;
    const UP = FL + G_H + 0.4;                    // the darshan floor, upstairs

    /*
     * Ground floor: shops either side of the stair door. The temple fills its
     * plot to the lane, which is why it has no forecourt and no gate.
     */
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - WT * 0.5), 0);
      ib.box(q[0], ground, q[1], WT, h, d, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d, rot });
    }
    { const q = p(0, -(HD - WT * 0.5));
      ib.box(q[0], ground, q[1], w, h, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w, d: WT, rot }); }
    {
      // the street front: a stair door in the middle, shutters either side
      const DOOR = 2.0, seg = (w - DOOR) / 2;
      for (const sx of [-1, 1]) {
        const q = p(sx * (DOOR / 2 + seg / 2), HD - WT * 0.5);
        ib.box(q[0], ground, q[1], seg, G_H, WT, 0xbf8f72, rot);        // shutter bay
        ib.box(q[0], ground + G_H, q[1], seg + 0.3, 0.3, WT + 0.5, accent, rot);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
      }
      const g = p(0, HD - WT * 0.5);
      cuspedArch(ib, g[0], ground, g[1], DOOR, 3.2, 0.42, rot, accent, 9, 0x241a12);
      // the carved upper storey, which is the temple proper
      ib.box(g[0], ground + G_H + 0.3, g[1], w, h - G_H - 0.3, WT, tint(color, 1.04), rot);
      const N = 3;
      for (let i = 0; i < N; i++) {
        const lx = (i / (N - 1) - 0.5) * w * 0.66;
        const c2 = p(lx, HD - WT);
        cuspedArch(ib, c2[0], ground + G_H + 0.9, c2[1], w / (N * 1.9), 2.4, 0.34,
          rot, accent, 9, null);
      }
      ib.box(g[0], ground + h, g[1], w + 1.2, 0.34, WT + 0.8, accent, rot);
    }

    /* ---- the stair, and the hall it lands in ---- */
    {
      /*
       * Eighteen risers, not fourteen.
       *
       * Fourteen over a 4.6 m rise is a 0.33 m riser on a 0.30 m tread — a
       * 47-degree stair, which is a ladder with the treads filled in.
       * `steps.mjs` measured a 4.28 m drop over a 3.9 m run and failed it.
       * Real temple stairs in Braj are shallow; these are 0.26 on 0.34, which
       * is a comfortable domestic pitch and still fits the plot.
       */
      const RISERS = 18, RISE = (UP - FL) / RISERS, TREAD = 0.34;
      for (let i = 0; i < RISERS; i++) {
        const q = p(0, HD - WT - 1.0 - i * TREAD);
        ib.box(q[0], FL + i * RISE, q[1], 2.0, RISE, TREAD, 0xd8cdb6, rot);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: 2.0, d: TREAD, rot,
          h: (FL + (i + 1) * RISE) - ground, tag: 'temple-step' });
      }
      /*
       * The upstairs floor, which is where darshan happens — WITH A STAIRWELL.
       *
       * It was one slab over the whole plan, and the stair climbs up under
       * it: from the tenth riser on, a person's head was through the marble
       * above (platforms.mjs found it as a walk-in under the floor). So the
       * floor stops round the opening the stair comes up through, and the
       * opening has a rail down both sides.
       */
      const IW = w - WT * 2, F0 = -(HD - WT), F1 = F0 + (d - WT * 2 - 5.0);
      const topTread = HD - WT - 1.0 - (RISERS - 1) * TREAD - TREAD * 0.5;
      const WELL = 1.15;                                // half-width of the opening
      const slab = (lx0, lx1, lz0, lz1) => {
        const q = p((lx0 + lx1) / 2, (lz0 + lz1) / 2);
        ib.box(q[0], UP - 0.16, q[1], lx1 - lx0, 0.22, lz1 - lz0, 0xe8e2d2, rot);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: lx1 - lx0, d: lz1 - lz0,
          rot, h: UP - ground, tag: 'temple-floor', standOnly: true });
      };
      slab(-IW / 2, IW / 2, F0, topTread);             // behind the opening, full width
      slab(-IW / 2, -WELL, topTread, F1);               // and either side of it
      slab(WELL, IW / 2, topTread, F1);
      for (const sx of [-1, 1]) {
        const q = p(sx * (WELL + 0.08), (topTread + F1) / 2);
        ib.box(q[0], UP, q[1], 0.08, 0.95, F1 - topTread, 0x8a6a3a, rot);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: 0.16, d: F1 - topTread, rot,
          h: UP + 1.0 - ground, tag: 'temple-rail' });
      }
    }

    /* ---- the peacock-feather altar, ten figures in a stepped arc ---- */
    const az = -(HD - WT - 2.4);
    {
      const q = p(0, az);
      ib.box(q[0], UP, q[1], w - WT * 2, 3.6, 2.4, 0xf2ece0, rot);
      // the white marble arch, filled with the feather fan
      { const qa = p(0, az + 1.2); cuspedArch(ib, qa[0], UP, qa[1], 5.2, 2.9, 0.4, rot, 0xf6f2e8, 9, null); }   // on the altar's front face, round the fan (a world +z, it had stood at the block's back)
      for (let ring = 0; ring < 3; ring++) {
        const rr = 1.5 + ring * 0.7;
        const N2 = 9 + ring * 4;
        for (let i = 0; i < N2; i++) {
          const a = Math.PI * (0.12 + 0.76 * (i / (N2 - 1)));
          const c2 = p(Math.cos(a) * rr, az + 1.0);
          ib.box(c2[0], UP + 0.7 + Math.sin(a) * rr, c2[1], 0.16, 0.5, 0.06,
            ring % 2 ? 0x1f6b5a : 0x2f8f6a, rot);
        }
      }
      // the stepped plinth the ten stand on
      for (let t = 0; t < 3; t++) {
        const c2 = p(0, az + 0.9 + t * 0.32);
        ib.box(c2[0], UP + 0.1 + (2 - t) * 0.22, c2[1], 5.0 - t * 0.5, 0.24, 0.34,
          t % 2 ? 0xf0e8d6 : 0xe4d9c0, rot);
      }
      colliders.push({ type: 'box', x: q[0], z: q[1], w: w - WT * 2, d: 2.4, rot });
    }

    /*
     * A ROOF. Photographed from above, the upper hall was open to the sky —
     * the street front carries its own upper storey but the side and back
     * walls simply stopped, so the temple read as a pink box with the altar
     * sitting in the open. No check looks up.
     */
    {
      const q = p(0, -1.0);
      ib.box(q[0], ground + h, q[1], w - 0.4, 0.34, d - 0.4, tint(color, 1.05), rot);
      ib.box(q[0], ground + h + 0.34, q[1], w + 0.8, 0.28, d + 0.8, accent, rot);
      // a low parapet round the roof, which every building on this lane has
      for (const sx of [-1, 1]) {
        const e1 = p(sx * (w * 0.5 - 0.2), -1.0);
        ib.box(e1[0], ground + h + 0.62, e1[1], 0.24, 0.5, d, tint(color, 1.08), rot);
      }
      const e2 = p(0, -1.0 - d * 0.5 + 0.2);
      ib.box(e2[0], ground + h + 0.62, e2[1], w, 0.5, 0.24, tint(color, 1.08), rot);
    }

    const altar = p(0, az + 0.6);
    const darshan = p(0, az + 5.0);
    return {
      altarY: UP - ground + 1.1, colliders,
      interior: {
        altar: [altar[0], UP + 1.1, altar[1]],
        darshan: [darshan[0], darshan[1]],
        // the way a devotee faces, from where he stands to the altar
        facing: Math.atan2(altar[0] - darshan[0], altar[1] - darshan[1]), floor: UP,
        volume: { x, z, hw: HW - WT, hd: HD - WT, rot, door: p(0, HD + 1.0) },
      },
    };
  },

  /**
   * Pagal Baba (Leeladham) — A WHITE MARBLE ZIGGURAT.
   *
   * "NOT a Nagara shikhara temple, whatever the guidebooks say. There is no
   * curvilinear rekha-shikhara and no garbhagriha under a spire." Three
   * separate tourism sources print "Nagara" and all three are wrong, which is
   * the Chandrodaya mistake in another town: everybody repeats the label and
   * nobody looks at the building.
   *
   * What it is: eight or so storeys of white marble, each stepping back from
   * the one below, each leaving an open walk-round gallery with a deep eave
   * slab and a low square-post balustrade, with two stair towers rising
   * through the mass. One of the tallest things in Vrindavan.
   *
   * Footprint 53.1 x 34.9 m is MEASURED off OSM way 672984768, recomputed
   * from its four nodes by the verifying agent, not estimated.
   */
  'temple-stepped-marble': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const colliders = [];
    const STAGES = loc.build.stages || 8;

    // the podium it all stands on, and its steps
    b.box(x, ground - 0.5, z, w + 10, 1.0, d + 10, 0xe8e2d4, rot);
    for (let i = 0; i < 4; i++) {
      const q = p(0, d * 0.5 + 5 + i * 0.9);
      b.box(q[0], ground - 0.5 + i * 0.22, q[1], w * 0.42, 0.24, 0.9, 0xf0ebe0, rot);
    }

    let cy = ground + 0.5, cw = w, cd = d;
    for (let i = 0; i < STAGES; i++) {
      const sh = (h - 6) / STAGES;
      // the storey
      b.box(x, cy, z, cw, sh * 0.82, cd, i % 2 ? color : tint(color, 1.02), rot);
      // the deep eave slab that makes the whole silhouette read as steps
      b.box(x, cy + sh * 0.82, z, cw + 1.6, 0.30, cd + 1.6, accent, rot);
      /*
       * The walk-round gallery. It is what makes this a ziggurat rather than a
       * tapering tower — every storey has a floor you could stand on outside
       * the wall, and from the road you read the shadow under each eave.
       */
      const RAIL = 14;
      for (let k = 0; k < RAIL; k++) {
        const t = (k + 0.5) / RAIL;
        for (const side of [-1, 1]) {
          const q = p((t - 0.5) * cw, side * (cd * 0.5 + 0.55));
          b.box(q[0], cy + sh * 0.82 + 0.3, q[1], 0.16, 0.52, 0.16, 0xf4f1ea, rot);
        }
      }
      cy += sh; cw *= 0.88; cd *= 0.88;
    }
    // the two stair towers, which rise through the whole mass
    for (const side of [-1, 1]) {
      const q = p(side * w * 0.3, 0);
      b.box(q[0], ground + 0.5, q[1], 5.2, h - 2.4, 5.2, tint(color, 0.99), rot);
      b.box(q[0], ground + 0.5 + h - 2.4, q[1], 6.0, 0.4, 6.0, accent, rot);
      dome(b, q[0], ground + 0.9 + h - 2.4, q[1], 2.4, 2.2, 0xf6f3ec);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 5.2, d: 5.2, rot });
    }
    // and a single kalasha on the topmost stage, which photographs do show
    b.box(x, cy, z, 1.0, 1.6, 1.0, accent, rot);

    /*
     * AND A GROUND FLOOR YOU CAN WALK INTO.
     *
     * A temple you cannot enter is a disappointment, and this one has a
     * darshan hall under all that marble. Built as walls with a doorway
     * rather than as the solid mass the first pass made it: `temples.mjs`
     * reported 100% of its wall line open, because the mass sat just inside
     * the line the check samples and no ray ever met it.
     */
    const IW = w * 0.62, ID = d * 0.62, WT = 0.8;
    const FL = ground + 0.5;
    for (const sx of [-1, 1]) {
      const q = p(sx * (IW * 0.5 - WT * 0.5), 0);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d: ID, rot });
    }
    { const q = p(0, -(ID * 0.5 - WT * 0.5));
      colliders.push({ type: 'box', x: q[0], z: q[1], w: IW, d: WT, rot }); }
    { const DOOR = 3.4, seg = (IW - DOOR) / 2;
      for (const sx of [-1, 1]) {
        const q = p(sx * (DOOR / 2 + seg / 2), ID * 0.5 - WT * 0.5);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
      }
      const g = p(0, ID * 0.5);
      b.box(g[0], FL, g[1], 4.6, 4.4, 0.5, accent, rot);
      cuspedArch(b, g[0], FL, g[1], DOOR, 3.2, 0.5, rot + Math.PI / 2, 0xf4f1ea, 7, 0x241a12);
    }
    const altar = p(0, -(ID * 0.5 - 2.2));
    const darshan = p(0, ID * 0.5 - 5.0);
    return {
      altarY: 1.5, noCollider: true, colliders,
      interior: {
        altar: [altar[0], FL + 1.5, altar[1]],
        darshan: [darshan[0], darshan[1]],
        facing: rot + Math.PI, floor: FL,
        volume: { x, z, hw: IW * 0.5 - WT, hd: ID * 0.5 - WT, rot, door: p(0, ID * 0.5 + 1.2) },
      },
    };
  },

  /**
   * The Jaipur Mandir (Shri Radha Madhav) — A FORT, NOT A TEMPLE SILHOUETTE.
   *
   * Built by Sawai Madho Singh II of Jaipur. "It looks like a fort or a state
   * palace, not a temple — and it now partly IS a government office."
   *
   * "NO SHIKHARA. No nagara tower, no urushringas, no curvilinear spire, no
   * amalaka-and-kalasha summit. Nothing like Govind Dev, Madan Mohan, Jugal
   * Kishor or Radha Raman." The entire complex is flat-roofed except for ONE
   * thing: a single open five-arched pavilion standing on the centre of the
   * shrine roof. That kiosk is the whole vertical event and it is what
   * identifies the building.
   *
   * Colour matters and is easy to get wrong: "not Agra/Fatehpur red and not
   * Jaipur 'pink city' pink" — dusty pale pink sandstone with cream plaster.
   */
  'temple-fort-palace': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    /*
     * THE BOX FRAME, like every older builder in this file.
     *
     * This builder was written with p() in the MIRROR frame — lx along
     * (cos, -sin) — while every b.box(..., rot) it draws, and every collider
     * and cuspedArch, works in the BOX frame, lx along (cos, sin). At rot 0
     * the two agree. At Jaipur Mandir's 15 degrees every part was POSITIONED
     * along one line and ORIENTED along another, 30 degrees apart, and the
     * arch audit found 19 of its blind-arcade arches standing across their
     * own wall. Same class of fault as the town's, where footprints once sat
     * "a mean 44 degrees off their own street".
     */
    const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
    const colliders = [];
    const HW = w * 0.5, HD = d * 0.5;

    b.box(x, ground - 0.4, z, w + 16, 0.8, d + 16, 0xddd2bb, rot);

    /*
     * The long low two-storey range along the road. Deep bracketed chhajja
     * between the storeys and a blind arcade of cusped niches along it — that
     * horizontal banding is what makes it read as a palace front.
     */
    const rangeD = d * 0.30;
    const GATE = 4.2;
    for (const side of [-1, 1]) {
      /*
       * THE FULL BRAJ GRAMMAR, because this range is the building you see
       * from the road and it photographed as a flat box with a stripe.
       *
       * A palace-temple front is: kursi, then a wall broken into registers
       * and bays, then a bracketed chhajja at the storey line, then the upper
       * storey with its jharokhas, then the eave, then the parapet. Every one
       * of those is a horizontal shadow, and the shadows are the building.
       */
      const q = p(0, side * (HD - rangeD * 0.5));
      const PL = plinthFor('compound');
      mouldedPlinth(b, q[0], ground, q[1], w, rangeD, rot, color, PL);
      const y0 = ground + PL;

      // the lower storey, its registers and its bays
      b.box(q[0], y0, q[1], w, h * 0.46, rangeD, weathered(color, 0.2), rot);
      registers(b, q[0], y0, q[1], w, rangeD, rot, color, [0.62], 9, h * 0.46);
      // the storey chhajja, on brackets, at the measured 3.2-3.6 m line
      chhajja(b, q[0], y0 + h * 0.46, q[1], w, rangeD, rot, color, 0.85);

      // the upper storey, and the jharokhas that make it a palace front
      const y1 = y0 + h * 0.46 + 0.3;
      b.box(q[0], y1, q[1], w, h * 0.40, rangeD, weathered(color, 0.7), rot);
      registers(b, q[0], y1, q[1], w, rangeD, rot, color, [0.58], 0, h * 0.40);
      {
        const cs2 = Math.cos(rot), sn2 = Math.sin(rot);
        const NJ = 5;
        for (let i = 0; i < NJ; i++) {
          const lx = (i / (NJ - 1) - 0.5) * w * 0.78;
          const az = side * (rangeD * 0.5);
          jharokha(b, q[0] + lx * cs2 - az * sn2, y1 + 0.7, q[1] + lx * sn2 + az * cs2,
            2.0, rot + (side > 0 ? 0 : Math.PI), color, accent);
        }
      }
      // the eave, and the parapet against the sky
      chhajja(b, q[0], y0 + h * 0.88, q[1], w, rangeD, rot, color, 0.95);
      parapet(b, q[0], y0 + h * 0.88 + 0.28, q[1], w + 1.2, rangeD + 1.2, rot, color, true);
      // the blind arcade
      const N = Math.max(9, Math.round(w / 5.2));
      for (let i = 0; i < N; i++) {
        const lx = (i / (N - 1) - 0.5) * w * 0.92;
        const c2 = p(lx, side * (HD - rangeD + 0.1));
        cuspedArch(b, c2[0], ground + 0.5, c2[1], w / (N * 1.5), h * 0.3, 0.3,
          rot, accent, 5, 0x2a1d12);
        cuspedArch(b, c2[0], ground + h * 0.52, c2[1], w / (N * 1.5), h * 0.26, 0.3,
          rot, accent, 5, 0x2a1d12);
      }
      /*
       * The ROAD range carries the gateway, so it is solid in two pieces with
       * a gap between them. Built that way here rather than punched out
       * afterwards — the first attempt added a full-width collider and then
       * spliced a differently-tagged one, so the doorway never opened and the
       * court had no way in at all.
       */
      if (side > 0) {
        const seg = (w - GATE) / 2;
        for (const sx of [-1, 1]) {
          const c2 = p(sx * (GATE / 2 + seg / 2), side * (HD - rangeD * 0.5));
          colliders.push({ type: 'box', x: c2[0], z: c2[1], w: seg, d: rangeD, rot });
        }
      } else {
        colliders.push({ type: 'box', x: q[0], z: q[1], w, d: rangeD, rot });
      }
    }
    /*
     * The side ranges run the FULL depth, so the corners are masonry.
     *
     * They used to stop at `d - rangeD * 2`, which ends exactly where the
     * court's declared volume ends — so a ray crossing the ring near a corner
     * slipped between the side range and the front one and found open air.
     * Measured 33.8% of the wall line open for a building with one 4.2 m gate
     * in a 151 m perimeter, which should be 2.8%. A corner is a corner: the
     * two ranges meet there.
     */
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - rangeD * 0.5), 0);
      const PL2 = plinthFor('compound');
      mouldedPlinth(b, q[0], ground, q[1], rangeD, d, rot, color, PL2);
      b.box(q[0], ground + PL2, q[1], rangeD, h * 0.86, d, weathered(color, 0.4), rot);
      registers(b, q[0], ground + PL2, q[1], rangeD, d, rot, color, [0.36, 0.72], 0, h * 0.86);
      chhajja(b, q[0], ground + PL2 + h * 0.86, q[1], rangeD, d, rot, color, 0.9);
      parapet(b, q[0], ground + PL2 + h * 0.86 + 0.28, q[1], rangeD + 1.2, d + 1.2, rot, color, true);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: rangeD, d, rot });
    }

    /* ---- the shrine in the middle of the court, and its ONE kiosk ---- */
    const SW = w * 0.34, SD = d * 0.34, SWT = 0.8;
    b.box(x, ground, z, SW, h * 0.92, SD, tint(color, 1.05), rot);
    b.box(x, ground + h * 0.92, z, SW + 1.6, 0.44, SD + 1.6, accent, rot);
    /*
     * Walls with a doorway, not a block. The altar stands inside this and a
     * solid box seals it in — `halls.mjs` got within 13.5 m of it and stopped,
     * which is the Prem Mandir mistake for the third time in one file.
     */
    for (const sx of [-1, 1]) {
      const q = p(sx * (SW * 0.5 - SWT * 0.5), 0);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: SWT, d: SD, rot });
    }
    { const q = p(0, -(SD * 0.5 - SWT * 0.5));
      colliders.push({ type: 'box', x: q[0], z: q[1], w: SW, d: SWT, rot }); }
    { const SDOOR = 2.8, seg = (SW - SDOOR) / 2;
      for (const sx of [-1, 1]) {
        const q = p(sx * (SDOOR / 2 + seg / 2), SD * 0.5 - SWT * 0.5);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: SWT, rot });
      }
      const g = p(0, SD * 0.5);
      cuspedArch(b, g[0], ground, g[1], SDOOR, h * 0.5, 0.5, rot + Math.PI / 2, accent, 9, 0x241a12); }

    /*
     * THE ROOF KIOSK. Five open arches on a plinth, carrying a chhatri. It is
     * the only thing standing above the parapet line anywhere on the site, and
     * a viewer who knows the building knows it by this alone.
     */
    {
      const ky = ground + h * 0.92 + 0.44;
      const KW = SW * 0.72, KD = SD * 0.5;
      b.box(x, ky, z, KW + 1.2, 0.4, KD + 1.2, accent, rot);
      const BAYS = loc.build.kiosk || 5;
      for (let i = 0; i <= BAYS; i++) {
        const lx = (i / BAYS - 0.5) * KW;
        const q = p(lx, 0);
        for (const sz of [-1, 1]) {
          const c2 = p(lx, sz * KD * 0.5);
          b.box(c2[0], ky + 0.4, c2[1], 0.3, 3.0, 0.3, 0xf0e6d2, rot);
        }
      }
      for (let i = 0; i < BAYS; i++) {
        const lx = ((i + 0.5) / BAYS - 0.5) * KW;
        const c2 = p(lx, -KD * 0.5);
        cuspedArch(b, c2[0], ky + 0.4, c2[1], KW / (BAYS * 1.25), 2.2, 0.3,
          rot, 0xf0e6d2, 7, null);
      }
      b.box(x, ky + 3.4, z, KW + 1.4, 0.34, KD + 1.4, accent, rot);
      chhatri(b, x, ky + 3.74, z, KW * 0.2, 1.9, 0xf0e6d2);
    }

    /*
     * THE GATEWAY, and the court it lets you into.
     *
     * The first pass closed the road range right across, so there was no way
     * in at all — `temples.mjs` read 74.2% of the wall line as open because
     * the ranges are only two of its four sides and nothing declared the
     * inside. A palace-temple of this plan is entered through a gate in the
     * middle of its front range.
     */
    // the gateway itself, drawn over the gap the range already leaves
    {
      const g = p(0, HD + 0.2);
      b.box(g[0], ground, g[1], GATE + 3.0, h * 0.82, 1.2, tint(color, 1.06), rot);
      cuspedArch(b, g[0], ground, g[1], GATE, h * 0.58, 0.6, rot + Math.PI / 2, accent, 9, 0x241a12);
      b.box(g[0], ground + h * 0.82, g[1], GATE + 4.0, 0.4, 1.8, accent, rot);
      for (const sx of [-1, 1]) chhatri(b, g[0] + sx * (GATE * 0.5 + 1.4) * cs,
        ground + h * 0.86, g[1] + sx * (GATE * 0.5 + 1.4) * sn, 0.9, 1.8, 0xf0e6d2);
    }

    const jAltar = p(0, -SD * 0.3);
    const jDarshan = p(0, SD * 0.5 + 3.0);
    return {
      altarY: 1.9, noCollider: true, colliders,
      interior: {
        altar: [jAltar[0], ground + 1.9, jAltar[1]],
        darshan: [jDarshan[0], jDarshan[1]],
        facing: rot + Math.PI, floor: ground + 0.1, open: true,
        volume: { x, z, hw: HW - rangeD, hd: HD - rangeD, rot, open: true,
          door: p(0, HD + 1.6) },
      },
    };
  },

  /**
   * Vamsi Vat — THE BANYAN IN A CHEQUERBOARD COURT, AND NOT A GHAT.
   *
   * Where Krishna played the flute to call the gopis. Every text places it on
   * the bank of the Yamuna — Bhakti-ratnakara 5/2379-81, the Chaitanya-
   * charitamrita, Sur Das — and "IT IS NOT, TODAY." The river has moved. To
   * build it with steps down to water would be building the text instead of
   * the place, which is the one thing this project must not do.
   *
   * What identifies it, confirmed in photographs from 2006 to 2020: a heavy
   * fused-root banyan on a low painted masonry plinth in the middle of a small
   * enclosed court whose floor is ENTIRELY BLACK-AND-WHITE CHEQUERBOARD
   * MARBLE.
   */
  'temple-banyan-court': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const colliders = [];
        /*
     * Drawn into the SHARED mesh, not an interior one.
     *
     * An `out.mesh` goes into `interiorMeshes`, which `InteriorSystem` culls
     * at 220 m — right for Krishna Balaram's courtyard, which is enormous and
     * only worth submitting when you are in it, and wrong for a building this
     * size. Photographed from outside, this temple was simply NOT THERE: open
     * ground where it should stand. That is the whole of what the pictures
     * caught and no check could, because every check walks up close.
     */
    const ib = b;
    const HW = w * 0.5, HD = d * 0.5, WT = 0.5;
    const FL = ground + 0.1;

    // the precinct wall, with the gate on the entrance face
    const DOOR = 2.6, seg = (w - DOOR) / 2;
    for (const sx of [-1, 1]) {
      const q = p(sx * (DOOR / 2 + seg / 2), HD - WT * 0.5);
      ib.box(q[0], ground, q[1], seg, h * 0.62, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
    }
    { const g = p(0, HD - WT * 0.5);
      cuspedArch(ib, g[0], ground, g[1], DOOR, h * 0.42, 0.42, rot + Math.PI / 2, accent, 7, 0x241a12);
      ib.box(g[0], ground + h * 0.62, g[1], DOOR + 1.6, 0.3, WT + 0.4, accent, rot); }
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - WT * 0.5), 0);
      ib.box(q[0], ground, q[1], WT, h * 0.62, d, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d, rot });
    }
    { const q = p(0, -(HD - WT * 0.5));
      ib.box(q[0], ground, q[1], w, h * 0.62, WT, color, rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w, d: WT, rot }); }

    /*
     * THE CHEQUERBOARD. Laid as real alternating slabs rather than a texture,
     * because it is the first thing anybody describes about this court and a
     * flat grey floor would lose it entirely.
     */
    /*
     * 1.8 m slabs, not 1.2.
     *
     * At 1.2 the court was 1,813 separate boxes — about 22,000 triangles for a
     * FLOOR, every one of them casting a shadow, and the shot came back with a
     * large black artefact across the sky. A marble chequer in a temple court
     * is a big slab anyway; 1.8 m reads as marble rather than as a chessboard
     * and costs a third as much.
     */
    const TILE = 1.8;
    const NX = Math.floor((w - WT * 2) / TILE), NZ = Math.floor((d - WT * 2) / TILE);
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NZ; j++) {
        const lx = (i - (NX - 1) / 2) * TILE, lz = (j - (NZ - 1) / 2) * TILE;
        const q = p(lx, lz);
        ib.box(q[0], FL - 0.06, q[1], TILE, 0.12, TILE,
          (i + j) % 2 ? 0xf2eee6 : 0x2b2723, rot);
      }
    }

    /* ---- the banyan on its painted plinth, in the middle ---- */
    {
      const R = 3.4;
      ib.box(x, FL, z, R * 2 + 1.0, 0.55, R * 2 + 1.0, 0xe8dcbe, rot);
      ib.box(x, FL + 0.55, z, R * 2, 0.16, R * 2, 0xb0603a, rot);           // the painted band
      colliders.push({ type: 'box', x, z, w: R * 2 + 1.0, d: R * 2 + 1.0,
        rot, h: (FL + 0.71) - ground, tag: 'vamsi-plinth' });
      /*
       * A FUSED-ROOT banyan: not one trunk but a knot of them grown together,
       * which is what "heavy fused-root" means and what the photographs show.
       */
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + 0.4;
        const rr = 0.5 + rng() * 0.8;
        ib.prism(x + Math.cos(a) * rr, FL + 0.71, z + Math.sin(a) * rr,
          0.62 + rng() * 0.3, 0.5, 0.34, 0.28, 5.2 + rng() * 1.6, 0x6a5138);
      }
      ib.prism(x, FL + 0.71, z, 1.5, 1.4, 0.9, 0.8, 6.4, 0x6a5138);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + 0.2;
        const rr = 1.6 + rng() * 2.2;
        ib.bevelBox(x + Math.cos(a) * rr, FL + 6.4 + rng() * 1.2, z + Math.sin(a) * rr,
          3.4, 2.0, 3.4, i % 2 ? 0x3a6330 : 0x437239, a, 0.45);
      }
      ib.bevelBox(x, FL + 8.0, z, 4.4, 2.2, 4.4, 0x3d6a33, 0.3, 0.45);
    }

    // the small shrine against the back wall, flat-roofed and low
    const sz2 = -(HD - WT - 3.0);
    { const q = p(0, sz2);
      ib.box(q[0], FL, q[1], 7.0, h * 0.7, 5.0, tint(color, 1.04), rot);
      ib.box(q[0], FL + h * 0.7, q[1], 8.0, 0.3, 6.0, accent, rot);
      cuspedArch(ib, q[0], FL, q[1] + 2.6, 2.2, h * 0.46, 0.4, rot, accent, 7, 0x241a12);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: 7.0, d: 5.0, rot }); }

    const altar = p(0, sz2 - 0.6);
    const darshan = p(0, sz2 + 4.6);
    return {
      altarY: 1.3, colliders,
      interior: {
        altar: [altar[0], FL + 1.3, altar[1]],
        darshan: [darshan[0], darshan[1]],
        facing: rot + Math.PI, floor: FL, open: true,
        volume: { x, z, hw: HW - WT, hd: HD - WT, rot, open: true, door: p(0, HD + 1.2) },
      },
    };
  },

  /**
   * Shri Radha Gokulananda — THE SEVENTH GOSWAMI TEMPLE.
   *
   * The other six were built and this was not, which left a hole in a
   * canonical set a pilgrim would notice.
   *
   * "No shikhara. No dome over the temple. No tower of any kind. The compound
   * is flat-roofed and single-storey throughout." So the whole thing is low,
   * whitewashed, late-Mughal Braj domestic: cusped arches on slender
   * colonnettes, chhajja eaves on small brackets, plain parapets.
   *
   * What makes it is the SAMADHI YARD beside the deity hall — Lokanatha
   * Goswami, Narottama Dasa Thakura and Vishvanatha Chakravarti — as five or
   * six architecturally DIFFERENT little shrines standing free in one walled
   * enclosure. "Most visitors come for the three graves, not the altar," so
   * the yard is built as a distinct second enclosure and not as decoration.
   */
  'temple-samadhi-yard': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const HW = w * 0.5, HD = d * 0.5, WT = 0.55;
    const colliders = [];
        /*
     * Drawn into the SHARED mesh, not an interior one.
     *
     * An `out.mesh` goes into `interiorMeshes`, which `InteriorSystem` culls
     * at 220 m — right for Krishna Balaram's courtyard, which is enormous and
     * only worth submitting when you are in it, and wrong for a building this
     * size. Photographed from outside, this temple was simply NOT THERE: open
     * ground where it should stand. That is the whole of what the pictures
     * caught and no check could, because every check walks up close.
     */
    const ib = b;
    const FL = ground + 0.12;
    const HALL_D = d * 0.42;                     // the deity hall, at the back
    const YARD_D = d - HALL_D - WT;              // the samadhi yard in front of it

    // the street wall, with the carved gate — battered plaster, not stone
    for (const sx of [-1, 1]) {
      const q = p(sx * (HW - WT * 0.5), 0);
      ib.box(q[0], ground, q[1], WT, h, d, tint(color, 0.97), rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w: WT, d, rot });
    }
    {
      const DOOR = 2.2, seg = (w - DOOR) / 2;
      for (const sx of [-1, 1]) {
        const q = p(sx * (DOOR / 2 + seg / 2), HD - WT * 0.5);
        ib.box(q[0], ground, q[1], seg, h, WT, tint(color, 0.97), rot);
        colliders.push({ type: 'box', x: q[0], z: q[1], w: seg, d: WT, rot });
      }
      // the gate: a pink-buff aedicule standing proud of the wall, a cusped
      // arch in relief, and the white signboard with its blue edge
      const g = p(0, HD - WT * 0.5);
      ib.box(g[0], ground, g[1], DOOR + 1.5, h * 0.92, WT + 0.3, 0xd9b39c, rot);
      cuspedArch(ib, g[0], ground, g[1], DOOR, h * 0.6, 0.45, rot, 0xc79a82, 9, 0x241a12);
      ib.box(g[0], ground + h * 0.62, g[1], DOOR + 0.5, 0.34, WT + 0.4, 0xf2ece0, rot);
      ib.box(g[0], ground + h * 0.92, g[1], DOOR + 1.9, 0.26, WT + 0.5, accent, rot);
      // the yellow-ochre timber doors, which is what everyone photographs
      ib.box(g[0], ground, g[1], DOOR, h * 0.5, 0.14, 0xd8a33c, rot);
    }
    // back wall
    { const q = p(0, -(HD - WT * 0.5));
      ib.box(q[0], ground, q[1], w, h, WT, tint(color, 0.94), rot);
      colliders.push({ type: 'box', x: q[0], z: q[1], w, d: WT, rot }); }

    // the floor of the whole compound
    { const q = p(0, 0);
      ib.box(q[0], FL - 0.1, q[1], w - WT * 2, 0.2, d - WT * 2, 0xd0c6b0, rot); }

    /* ---- the deity hall at the back, flat-roofed ---- */
    const hallZ = -(HD - WT - HALL_D * 0.5);
    {
      const q = p(0, hallZ);
      // arcade of cusped arches across its front, on slender piers
      const BAYS = 3, span = (w - WT * 2) / BAYS;
      for (let i = 0; i <= BAYS; i++) {
        const lx = -(w - WT * 2) * 0.5 + i * span;
        const c2 = p(lx, hallZ + HALL_D * 0.5);
        ib.box(c2[0], FL, c2[1], 0.32, h * 0.78, 0.32, 0xf0e8d8, rot);
        colliders.push({ type: 'circle', x: c2[0], z: c2[1], r: 0.3 });
      }
      for (let i = 0; i < BAYS; i++) {
        const lx = -(w - WT * 2) * 0.5 + (i + 0.5) * span;
        const c2 = p(lx, hallZ + HALL_D * 0.5);
        cuspedArch(ib, c2[0], FL + h * 0.34, c2[1], span * 0.86, h * 0.4, 0.3,
          rot + Math.PI / 2, 0xf0e8d8, 11, null);
      }
      /*
       * SIDE AND BACK WALLS ONLY. The front is the arcade above, and it is
       * open — that is what an arcade IS.
       *
       * This was a solid box the size of the whole hall with the altar
       * sealed inside it, which is the same mistake Prem Mandir and Katyayani
       * were built with: `halls.mjs` reported the altar unreachable, getting
       * within 5.2 m of it and no closer.
       */
      const hw2 = (w - WT * 2) * 0.5;
      for (const sx of [-1, 1]) {
        const c2 = p(sx * (hw2 - 0.3), hallZ);
        ib.box(c2[0], FL, c2[1], 0.6, h * 0.78, HALL_D, tint(color, 1.03), rot);
        colliders.push({ type: 'box', x: c2[0], z: c2[1], w: 0.6, d: HALL_D, rot });
      }
      const bk = p(0, hallZ - HALL_D * 0.5 + 0.3);
      ib.box(bk[0], FL, bk[1], w - WT * 2, h * 0.78, 0.6, tint(color, 1.0), rot);
      colliders.push({ type: 'box', x: bk[0], z: bk[1], w: w - WT * 2, d: 0.6, rot });
      /*
       * The roof is the WALL's colour with only a thin band at its edge.
       * Photographed, a full slab in `accent` read as a solid terracotta plane
       * floating over the hall; a chhajja is a projecting eave on brackets,
       * which is a line of shadow and not a coloured roof.
       */
      ib.box(q[0], FL + h * 0.78, q[1], w - WT * 2 + 0.2, 0.26, HALL_D + 0.2,
        tint(color, 1.02), rot);
      ib.box(q[0], FL + h * 0.78 - 0.1, q[1], w - WT * 2 + 0.9, 0.14, HALL_D + 0.9, accent, rot);
      // the grey-and-white marble dado, on the walls rather than filling the room
      for (const sx of [-1, 1]) {
        const c2 = p(sx * (hw2 - 0.62), hallZ);
        ib.box(c2[0], FL, c2[1], 0.12, 1.35, HALL_D - 0.6, 0xdad6cc, rot);
      }
      // the altar plinth at the back, which IS solid
      const ap = p(0, hallZ - HALL_D * 0.28);
      ib.box(ap[0], FL, ap[1], (w - WT * 2) * 0.5, 1.1, 1.1, 0xe8e0cc, rot);
      colliders.push({ type: 'box', x: ap[0], z: ap[1], w: (w - WT * 2) * 0.5, d: 1.1, rot });
      // and the floor of the hall, so you stand on it
      colliders.push({ type: 'box', x: q[0], z: q[1], w: w - WT * 2, d: HALL_D, rot,
        h: FL - ground, tag: 'temple-floor', standOnly: true });
    }

    /* ---- the samadhi yard: the reason people come ---- */
    const TOMBS = loc.build.tombs || 6;
    const yardZ = HD - WT - YARD_D * 0.5;
    for (let i = 0; i < TOMBS; i++) {
      /*
       * Each one a DIFFERENT design — that is stated in the research and it is
       * the whole character of the yard. A row of identical boxes would read
       * as a colonnade, which is precisely what it is not.
       */
      const col = i % 3;
      const lx = (-0.5 + ((i % 3) + 0.5) / 3) * (w - WT * 2 - 2.2);
      const lz = yardZ + (i < 3 ? YARD_D * 0.22 : -YARD_D * 0.22);
      const q = p(lx, lz);
      const big = i === 0;                        // Vishvanatha's is the finest
      const tw = big ? 1.7 : 1.15 + col * 0.16;
      const th = big ? 3.1 : 2.0 + col * 0.28;
      ib.box(q[0], FL, q[1], tw + 0.5, 0.5, tw + 0.5, 0xe6dcc6, rot);          // plinth
      ib.box(q[0], FL + 0.5, q[1], tw, th * 0.62, tw, 0xf0e8d6, rot);          // the cube
      cuspedArch(ib, q[0], FL + 0.5, q[1] + 0.02, tw * 0.5, th * 0.4, 0.22,
        rot + Math.PI / 2, 0xcbb89a, 9, 0x241a12);
      if (col === 0) {
        shikhara(ib, q[0], FL + 0.5 + th * 0.62, q[1], tw * 0.46, th * 0.38, 0xf0e8d6, 8);
      } else if (col === 1) {
        dome(ib, q[0], FL + 0.5 + th * 0.62, q[1], tw * 0.5, th * 0.3, 0xf4eddc);
      } else {
        ib.box(q[0], FL + 0.5 + th * 0.62, q[1], tw + 0.34, 0.2, tw + 0.34, accent, rot);
        chhatri(ib, q[0], FL + 0.7 + th * 0.62, q[1], tw * 0.38, th * 0.26, 0xf4eddc);
      }
      colliders.push({ type: 'circle', x: q[0], z: q[1], r: tw * 0.62,
        h: (FL + 0.5 + th * 0.62) - ground, tag: 'samadhi' });
    }

    const altar = p(0, hallZ - HALL_D * 0.28);
    const darshan = p(0, hallZ + HALL_D * 0.5 + 2.4);
    return {
      altarY: 1.35, colliders,
      interior: {
        altar: [altar[0], FL + 1.35, altar[1]],
        darshan: [darshan[0], darshan[1]],
        facing: rot + Math.PI, floor: FL,
        volume: { x, z, hw: HW - WT, hd: HD - WT, rot, door: p(0, HD + 1.2) },
      },
    };
  },

  /**
   * Radha Raman, Radha Damodar, Radha Shyamsundar.
   * Research corrected a real error here: these are NOT shikhara temples. They
   * are low, flat-roofed courtyard havelis that you cannot see coming — a
   * gateway in a street wall, a house-lined court, then a plain stone front of
   * cusped arches. The whole effect is concealment, not height.
   */
  'temple-haveli': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const arches = loc.build.arches || 3;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p2 = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    // The shrine block: low, flat-roofed, unremarkable from outside — and
    // hollow, because these are temples people walk into. It was one solid box
    // until now, which is why Radha Damodar's darshan photograph was inside the
    // stone rather than on the altar.
    /*
     * A KURSI, not a slab.
     *
     * This was a single 0.6 m box under the whole building — the thing the
     * research names as reading like a prop rather than masonry. Radha Raman,
     * Radha Damodar and Radha Shyamsundar all come through here, so the
     * moulded base, the bracketed eave and the parapet below improve three
     * temples from one edit. That is the whole reason the vocabulary is
     * shared.
     *
     * `compound` class: the Vrindavan default, a shrine raised above its own
     * court at 0.9-1.3 m. These are goswami havelis off a lane, so the lower
     * end of it.
     */
    const PL = plinthFor('compound') * 0.85;
    mouldedPlinth(b, x, ground - 0.1, z, w + 1.2, d + 1.2, rot, color, PL);
    const FL = ground - 0.1 + PL;
    // the doorways are the facade's own cusped arches, or the two never line up
    const archHW = w / (arches * 3.8);
    const openings = [];
    for (let i = 0; i < arches; i++) {
      openings.push({ c: (i / (arches - 1) - 0.5) * w * 0.62, hw: archHW });
    }
    /*
     * Radharaman Ghera. The research is specific to this one temple, so the
     * detail is too — the other two havelis keep the plain plan.
     *
     * "A walled compound called Radharaman Ghera, entered from the street; TWO
     * successive enclosed courtyards, the first lined with the houses of the
     * Goswami families, the second holding the temple." Behind it, by a narrow
     * passage, the original late-16th-century building and a larger one beside
     * it, both very plain, used as the Deity's kitchen, dining room and
     * bedroom — where "a fire has been kept burning in a TEN-FOOT-LONG fire pit
     * since Gopala Bhatta's time; all the deity's food is cooked from it."
     */
    const ghera = loc.id === 'radha-raman';
    const damodar = loc.id === 'radha-damodar';
    const shyam = loc.id === 'radha-shyamsundar';
    const shrine = hollowShrine(b, loc, {
      hx: w * 0.41, hz: d * 0.33, floorY: FL, height: h * 0.72, color, openings,
      silverDoor: ghera, doorMetal: ghera ? 0xd8dade : undefined,
    });
    /*
     * A BRACKETED EAVE AND A PARAPET, where there was a plain accent slab.
     *
     * The slab was the roofline, and a wall that simply stops is the single
     * thing that made these read as boxes. The chhajja throws the hard
     * horizontal shadow that says Braj, and the parapet breaks the sky.
     *
     * The eave lands at 0.72h, and the arcade below springs well under it —
     * the survey's clearance rule, "the bracket top must clear the arch
     * below it", which matters more than the projection does.
     */
    chhajja(b, x, FL + h * 0.72, z, w * 0.88, d * 0.72, rot, color, 0.7);
    parapet(b, x, FL + h * 0.72 + 0.3, z, w * 0.88 + 0.7, d * 0.72 + 0.7, rot, color, true);

    // the antechamber front: the cusped arcade that is the whole facade
    const front = d * 0.33 + 0.2;
    for (let i = 0; i < arches; i++) {
      const lx = (i / (arches - 1) - 0.5) * w * 0.62;
      const q = p2(lx, front);
      cuspedArch(b, q[0], ground + 0.35, q[1],
        w / (arches * 1.9), h * 0.5, 0.55, rot + Math.PI / 2,
        i === Math.floor(arches / 2) ? 0x8a7355 : accent, 5);
    }

    // the two-storey Goswami houses that shut out the light
    const W = w * 0.5 + 7, D = d * 0.5 + 7;
    const sides = [[-W, -D, W, -D], [W, -D, W, D], [W, D, -W, D], [-W, D, -W, -D]];
    sides.forEach((sd, i) => {
      const A = p2(sd[0], sd[1]), B = p2(sd[2], sd[3]);
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      if (i === 2) {
        // the street gateway, with its heavy wooden doors
        const gap = 4.5;
        const seg = (len - gap) / 2;
        for (const side of [-1, 1]) {
          b.box(mx + Math.cos(ang) * side * (gap / 2 + seg / 2), ground,
                mz + Math.sin(ang) * side * (gap / 2 + seg / 2), seg, 6.4, 1.0, 0xd6c8ab, ang);
        }
        cuspedArch(b, mx, ground, mz, gap, 4.4, 1.1, ang, 0x6b4a32, 5);
      } else {
        b.box(mx, ground, mz, len, 6.4, 1.0, 0xd6c8ab, ang);
        // shuttered windows on the upper floor
        const n2 = Math.max(2, Math.round(len / 4));
        for (let k = 0; k < n2; k++) {
          const t = (k / (n2 - 1) - 0.5) * len * 0.8;
          b.box(mx + Math.cos(ang) * t, ground + 3.6, mz + Math.sin(ang) * t,
            0.85, 1.2, 1.15, 0x4a3a2a, ang);
        }
      }
    });

    if (damodar) {
      /*
       * "A compound of TOMBS, not a temple with a forecourt."
       *
       * The rear and northern courts are described as a "courtyard of one
       * hundred samadhis", tombs in rows, including Rupa Goswami's. That is the
       * place — not the shrine, which is small and plastered and peeling. The
       * vertical incident comes from these compact chhatri-like tombs and from
       * nothing else: no shikhara, no gopuram, no dome of any scale.
       */
      const tomb = (lx, lz, sc) => {
        const q = p2(lx, lz);
        b.box(q[0], ground, q[1], 2.0 * sc, 0.45, 2.0 * sc, 0xc2ad8c, rot);
        b.box(q[0], ground + 0.45, q[1], 1.5 * sc, 1.9 * sc, 1.5 * sc, 0xd6c8ab, rot);
        b.box(q[0], ground + 0.45 + 1.9 * sc, q[1], 1.9 * sc, 0.3, 1.9 * sc, accent, rot);
        dome(b, q[0], ground + 0.75 + 1.9 * sc, q[1], 0.7 * sc, 0.85 * sc, 0xd6c8ab);
        shrine.colliders.push({ type: 'box', x: q[0], z: q[1], w: 1.5 * sc, d: 1.5 * sc, rot });
      };
      // the northern court, in rows
      for (let r2 = 0; r2 < 3; r2++) {
        for (let c2 = 0; c2 < 7; c2++) {
          tomb(-w * 0.42 + c2 * 2.9, -d * 0.5 - 5 - r2 * 3.4, 0.85 + (c2 % 3) * 0.08);
        }
      }
      // and a few larger ones against the east wall
      for (let r2 = 0; r2 < 4; r2++) tomb(w * 0.5 + 4.5, -d * 0.2 + r2 * 4.2, 1.15);

      /*
       * The tulasi in the courtyard, and the narrow rectangular corridor
       * between the buildings that pilgrims circle FOUR times. That corridor is
       * why this is "one of the most walked-in places in Vrindavan", so it is
       * left deliberately clear of anything to walk into.
       */
      {
        const tq = p2(0, d * 0.5 + 4.5);
        b.box(tq[0], ground, tq[1], 2.2, 0.7, 2.2, accent, rot);
        b.box(tq[0], ground + 0.7, tq[1], 1.0, 0.35, 1.0, 0xc0562f, rot);
        b.box(tq[0], ground + 1.05, tq[1], 0.7, 1.0, 0.7, 0x3f7a42, rot);
        b.box(tq[0], ground + 1.9, tq[1], 0.45, 0.5, 0.45, 0x4f8a4a, rot);
        shrine.colliders.push({ type: 'circle', x: tq[0], z: tq[1], r: 1.2 });
      }
      // the Giriraj shila, on its own small seat
      {
        const gq = p2(-w * 0.3, d * 0.5 + 3.2);
        b.box(gq[0], ground, gq[1], 1.1, 0.55, 1.1, 0xc8b38c, rot);
        b.box(gq[0], ground + 0.55, gq[1], 0.6, 0.42, 0.5, 0x6a6a62, rot);
        b.box(gq[0], ground + 0.97, gq[1], 0.34, 0.1, 0.3, 0xc9a03c, rot);
      }
      // crumbling render, exposing brick
      for (let i = 0; i < 9; i++) {
        const q = p2((i / 8 - 0.5) * w * 0.7, d * 0.33 + 0.26);
        b.box(q[0], ground + 1.2 + (i % 3) * 1.1, q[1], 1.1, 0.8, 0.08, 0xa0705e, rot);
      }
    }

    if (shyam) {
      /*
       * Shyamananda's courtyard. The research gives three things this has and
       * Radha Damodar does not, and all three are here.
       */
      // the small Vrinda Devi shrine in the courtyard
      {
        const q = p2(w * 0.34, d * 0.5 + 5.5);
        b.box(q[0], ground, q[1], 3.4, 0.5, 3.4, 0xc2ad8c, rot);
        b.box(q[0], ground + 0.5, q[1], 2.6, 3.0, 2.6, color, rot);
        b.box(q[0], ground + 3.5, q[1], 3.0, 0.35, 3.0, accent, rot);
        dome(b, q[0], ground + 3.85, q[1], 1.1, 1.5, color);
        const dr = p2(w * 0.34, d * 0.5 + 6.9);
        cuspedArch(b, dr[0], ground + 0.5, dr[1], 1.3, 2.0, 0.35, rot + Math.PI / 2, accent, 5, 0x241a12);
        shrine.colliders.push({ type: 'box', x: q[0], z: q[1], w: 2.6, d: 2.6, rot });
      }
      /*
       * The UNDERGROUND bhajan-sthali — "the original cave where Shyamananda
       * worshipped the small Lala-Lali deities". A stair going down, not a
       * building: the point of it is that it is below the court.
       */
      {
        const q = p2(-w * 0.3, d * 0.5 + 5.0);
        b.box(q[0], ground - 0.05, q[1], 3.0, 0.3, 3.4, 0xb8a684, rot);
        for (let i = 0; i < 5; i++) {
          const st = p2(-w * 0.3, d * 0.5 + 5.0 - 0.55 + i * 0.4);
          b.box(st[0], ground - 0.25 - i * 0.32, st[1], 2.2, 0.32, 0.4, 0xa89070, rot);
        }
        // its head, so you can see it is a way down and not a pit
        for (const sgn of [-1, 1]) {
          const j = p2(-w * 0.3 + sgn * 1.4, d * 0.5 + 5.6);
          b.box(j[0], ground, j[1], 0.3, 1.0, 1.4, accent, rot);
        }
      }
      // Shyamananda Prabhu's samadhi, facing the entrance
      {
        const q = p2(0, -d * 0.5 - 5.5);
        b.box(q[0], ground, q[1], 4.6, 0.6, 4.6, 0xc2ad8c, rot);
        b.box(q[0], ground + 0.6, q[1], 3.4, 3.4, 3.4, 0xd6c8ab, rot);
        b.box(q[0], ground + 4.0, q[1], 3.9, 0.35, 3.9, accent, rot);
        let sy = ground + 4.35, y2 = 0;
        for (let i = 0; i < 5; i++) {
          const k = 1 - i * 0.16;
          b.box(q[0], sy + y2, q[1], 2.6 * k, 0.8, 2.6 * k, i % 2 ? 0xd6c8ab : accent, rot);
          y2 += 0.8;
        }
        shrine.colliders.push({ type: 'box', x: q[0], z: q[1], w: 3.4, d: 3.4, rot });
      }
      // donor plaques in Odia script, set about the fabric
      for (let i = 0; i < 6; i++) {
        const q = p2((i / 5 - 0.5) * w * 0.62, d * 0.33 + 0.26);
        b.box(q[0], ground + 1.5, q[1], 0.75, 0.5, 0.07, 0xb9a888, rot);
      }
    }

    if (ghera) {
      /* ---- the second courtyard, between the houses and the temple ---- */
      const IW = w * 0.5 + 3.4, ID = d * 0.5 + 3.4, IT = 0.7, IH = 4.2;
      const iwall = (lx, lz, lw, ld) => {
        const q = p2(lx, lz);
        b.box(q[0], ground, q[1], lw, IH, ld, 0xd6c8ab, rot);
        b.box(q[0], ground + IH, q[1], lw + 0.4, 0.28, ld + 0.4, 0xc2ad8c, rot);
        shrine.colliders.push({ type: 'box', x: q[0], z: q[1], w: lw, d: ld + 0.3, rot });
      };
      const IGAP = 3.4;
      iwall(0, -ID, IW * 2, IT);
      iwall(-IW, 0, IT, ID * 2);
      iwall(IW, 0, IT, ID * 2);
      const iseg = (IW * 2 - IGAP) / 2;
      for (const sgn of [-1, 1]) iwall(sgn * (IGAP / 2 + iseg / 2), ID, iseg, IT);
      const ig = p2(0, ID);
      cuspedArch(b, ig[0], ground, ig[1], IGAP, 3.8, IT + 0.4, rot + Math.PI / 2, accent, 5, 0x241a12);

      /* ---- behind the temple: the old buildings, and the fire pit ---- */
      const BZ = -d * 0.5 - 5.5;
      for (const [ox, bw, bd] of [[-4.5, 7.5, 8.0], [4.8, 9.0, 8.0]]) {
        const q = p2(ox, BZ);
        b.box(q[0], ground, q[1], bw, 4.0, bd, 0xd2c3a4, rot);      // "both very plain"
        b.box(q[0], ground + 4.0, q[1], bw + 0.6, 0.4, bd + 0.6, 0xb8a684, rot);
        const dr = p2(ox, BZ + bd * 0.5);
        b.box(dr[0], ground, dr[1], 1.3, 2.3, 0.2, 0x3f2a1e, rot);
        shrine.colliders.push({ type: 'box', x: q[0], z: q[1], w: bw, d: bd, rot });
      }
      {
        const q = p2(-4.5, BZ);
        b.box(q[0], ground + 0.02, q[1], 3.05, 0.34, 1.1, 0x6a5240, rot);   // ten feet
        b.box(q[0], ground + 0.36, q[1], 2.7, 0.12, 0.8, 0x3a2a1e, rot);
        for (let k = -1; k <= 1; k++) {
          const f2 = p2(-4.5 + k * 0.95, BZ);
          b.box(f2[0], ground + 0.46, f2[1], 0.3, 0.42, 0.3, 0xe8891f, rot);
          b.box(f2[0], ground + 0.88, f2[1], 0.16, 0.3, 0.16, 0xf2c24a, rot);
        }
      }
    }

    return { altarY: 1.7, ...shrine };
  },

  /**
   * Govind Dev and Radha Gopinath: both truncated.
   * Govind Dev's five towers were never finished and what survives reads, in
   * Growse's words, more like a cathedral than a temple. So: a great vaulted
   * mass, heavy walls, and a flat stub where the tower should rise.
   */
  /**
   * Govind Dev and Radha Gopinath, both truncated — but only one of them is
   * the cathedral Growse measured, and it gets its own builder.
   */
  'temple-truncated': (args) => (args.loc.build.cathedral
    ? buildGovindDev(args)
    : args.loc.id === 'radha-gopinath'
      ? buildRadhaGopinath(args)
      : BUILDERS['temple-truncated-plain'](args)),

  'temple-truncated-plain': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const cathedral = !!loc.build.cathedral;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    b.box(x, ground - 0.6, z, w + 8, 1.5, d + 8, 0x9c8e6e, rot);
    // Battered walls, stepping slightly inward — and hollow. Growse's
    // "more like a cathedral than a temple" is about a space you stand in, and
    // this was a solid mass until now.
    const shrine = hollowShrine(b, loc, {
      hx: w * 0.5, hz: d * 0.5, floorY: ground + 0.9, height: h * 0.74, color,
      t: 1.1,                                   // heavy walls, which is the point
      openings: [{ c: 0, hw: w * 0.12 }],       // the one great front arch
    });
    let cy = ground + 0.9;
    for (let i = 0; i < 3; i++) {
      const t = i / 3;
      // the batter is a band ON the wall now, not the wall itself
      if (i) b.box(x, cy, z, w * (1 - t * 0.14), (h * 0.74) / 3, d * (1 - t * 0.14), i % 2 ? accent : color, rot);
      b.box(x, cy + (h * 0.74) / 3 - 0.4, z, w * (1 - t * 0.14) + 0.8, 0.5, d * (1 - t * 0.14) + 0.8, accent, rot);
      cy += (h * 0.74) / 3;
    }
    // the vaulted crossing — and then nothing above it
    b.box(x, cy, z, w * 0.42, h * 0.16, d * 0.42, color, rot);
    b.box(x, cy + h * 0.16, z, w * 0.46, 0.7, d * 0.46, accent, rot);   // the flat stub

    if (cathedral) {
      // a tall clerestory nave, which is what makes it read as a cathedral
      b.box(x, ground + 0.9, z, w * 0.3, h * 0.92, d * 0.86, color, rot);
      for (const side of [-1, 1]) {
        for (let k = -2; k <= 2; k++) {
          const lx = side * w * 0.16, lz = k * d * 0.16;
          cuspedArch(b, x + lx * cs - lz * sn, ground + h * 0.55,
            z + lx * sn + lz * cs, 2.2, 3.0, 0.5, rot, 0x6b3325, 3);
        }
      }
    }
    /*
     * FOUR PORCHES, NOT FOUR CHHATRIS.
     *
     * Growse's 1873-77 restoration "renewed" the "porches at the four corners
     * of the central dome" (p.247) — small pillared elements, flat-topped.
     * chhatri() ends in a dome(), so this was putting four domes on a
     * building whose defining fact is that NOTHING on it is domed from
     * outside. The only genuinely domed thing on the whole site is Rani
     * Bhim's chhattri, which stands at GROUND level at the west end, where
     * Growse re-erected it in 1877 "on the platform that marks the site of
     * the old sacrarium, where it serves to conceal the bare rubble wall
     * that rises behind it".
     */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = sx * w * 0.26, lz = sz * d * 0.17;
      const px = x + lx * cs - lz * sn, pz = z + lx * sn + lz * cs;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4;
        b.box(px + Math.cos(a) * 0.95, cy, pz + Math.sin(a) * 0.95,
          0.24, 2.0, 0.24, tint(color, 1.04));
      }
      b.box(px, cy + 2.0, pz, 2.9, 0.26, 2.9, tint(color, 1.06), rot);   // flat
      b.box(px, cy + 2.26, pz, 2.4, 0.18, 2.4, tint(color, 0.96), rot);
    }

    /*
     * THE CHOIR TOWER — the one vertical accent, and it stands at the BACK.
     *
     * Growse's own plate facing p.246 shows it as a square stepped pyramid of
     * receding tiers, each tier edged with a saw-tooth course, with small
     * jharokha-like openings on the faces, TERMINATING FLAT, with small
     * kalash-like pinnacles at the corners of the top terrace.
     *
     * It is flat-topped because he was refused permission to finish it: the
     * finial "and a few stages of stone-work immediately under it were not
     * added; for they had entirely perished and, in the absence of the
     * original design, Sir John Strachey would not allow me to replace them"
     * (p.247). He thought it left the tower "stunted" and said so. It is
     * still stunted, so it is built stunted.
     *
     * Not a nagara shikhara, not a dome, and NOT over the crossing — "the
     * tower over the central dome was also, as I conjecture, never carried
     * higher than we now see it".
     *
     * Flagged uncertain by the survey: no modern photograph of the west
     * elevation was found, so whether it still stands as Growse restored it,
     * and whether the 1819 temple now hides it, is unverified. Kept modest
     * for that reason.
     */
    {
      const lz = -d * 0.30;                  // west, behind the crossing
      const tx = x - lz * sn, tz = z + lz * cs;
      const TN = 5;
      let ty = cy - h * 0.06;
      for (let i = 0; i < TN; i++) {
        const t = i / TN;
        const sw = w * 0.30 * (1 - t * 0.42);
        const th = h * 0.055;
        b.box(tx, ty, tz, sw, th, sw, tint(color, 1 - i * 0.012), rot);
        // the saw-tooth course edging every tier
        const n = Math.max(4, Math.round(sw / 0.8));
        for (let k = 0; k <= n; k++) {
          const o = (k / n - 0.5) * sw;
          for (const [ox, oz] of [[o, sw * 0.5], [o, -sw * 0.5], [sw * 0.5, o], [-sw * 0.5, o]]) {
            b.box(tx + ox * cs - oz * sn, ty + th, tz + ox * sn + oz * cs,
              0.3, 0.26, 0.3, tint(accent, 1.05), rot + Math.PI / 4);
          }
        }
        ty += th + 0.26;
      }
      // flat terrace, with small kalash only at its CORNERS
      const topW = w * 0.30 * (1 - 0.42) + 0.5;
      b.box(tx, ty, tz, topW, 0.34, topW, tint(color, 1.05), rot);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const ox = sx * topW * 0.42, oz = sz * topW * 0.42;
        b.box(tx + ox * cs - oz * sn, ty + 0.34, tz + ox * sn + oz * cs,
          0.34, 0.62, 0.34, tint(accent, 1.1), rot);
      }
    }

    const front = d * 0.5 + 0.3;
    cuspedArch(b, x + front * sn, ground + 0.9, z + front * cs,
      w * 0.24, h * 0.4, 0.9, rot + Math.PI / 2, 0x6b3325, 3);
    return { altarY: 2.4, ...shrine };
  },

  /**
   * Shahji: white marble, flat and terraced, a classical pediment over a
   * colonnade, and the twelve spiral columns the town names it for —
   * Tedhe Khambe Wala Mandir, the temple of the crooked pillars.
   */
  /**
   * Shahji Mandir: the Lucknow palace pavilion of 1860-68, built in
   * ShahjiMandir.js from its survey and checker. What stood here drew twelve
   * twisted square-section screws in TWO rows, a stepped triangle for a
   * pediment and nothing else — the survey's first three do-not-builds.
   */
  'temple-colonnade': ({ loc, b, ground, rng, terrain }) => {
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
    const colliders = [];
    const signB = new MeshBuilder();
    const place = (geo, lx, y, lz, faceLocal) => {
      const q = p(lx, lz);
      const wa = rot + faceLocal;
      const yaw = Math.atan2(Math.cos(wa), Math.sin(wa));
      _kbM.compose(_kbV.set(q[0], y, q[1]), _kbQ.setFromEuler(_kbE.set(0, yaw, 0)), _kbS);
      b.addGeometry(geo, _kbM);
      geo.dispose();
    };
    const o = { b, signB, loc, ground, terrain, colliders, rng };
    const r = buildShahji({ ...o, h: {
      cuspedArch, ribbedDome, tint, buildStanding, PEOPLE, signUV, place,
      // the generic trades on the town's atlas that a Vrindavan bazaar court has
      SIGN: { GARLANDS: 0, PRASAD: 3, CLOTH: 5, PUJA: 6, PHOTO: 9, BANGLES: 13 },
    } });
    const A = p(r.altar.lx, r.altar.lz), D = p(r.darshan.lx, r.darshan.lz);
    const V = p(0, (r.hall.lz0 + r.hall.lz1) / 2), door = p(0, r.hall.lz1 + 1.5);
    return {
      altarY: r.altar.y - ground,
      colliders,
      meshes: [{ name: 'ShahjiSigns', builder: signB, x: loc.pos[0], z: loc.pos[1], r: 90, map: signAtlas }],
      interior: {
        altar: [A[0], r.altar.y, A[1]],
        darshan: [D[0], D[1]],
        facing: Math.atan2(A[0] - D[0], A[1] - D[1]),
        floor: r.FL,
        volume: { x: V[0], z: V[1], hw: r.hall.hw, hd: (r.hall.lz1 - r.hall.lz0) / 2, rot, door },
      },
    };
  },

  /**
   * Radha Vallabh: the old temple (Hit Mandir) with its steep stone gable and
   * its headless octagonal sanctum, and the living temple on its south side,
   * in the Radhavallabh Ghera — built in RadhaVallabhMandir.js from its
   * survey and checker. What stood here had Govind Dev's ten-foot walls, a
   * square sanctum and a clerestory band for a top storey, 430 m off.
   */
  'temple-gable': ({ loc, b, ground, rng, terrain }) => {
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
    const colliders = [];
    const signB = new MeshBuilder();
    const place = (geo, lx, y, lz, faceLocal) => {
      const q = p(lx, lz);
      const wa = rot + faceLocal;
      const yaw = Math.atan2(Math.cos(wa), Math.sin(wa));
      _kbM.compose(_kbV.set(q[0], y, q[1]), _kbQ.setFromEuler(_kbE.set(0, yaw, 0)), _kbS);
      b.addGeometry(geo, _kbM);
      geo.dispose();
    };
    const r = buildRadhaVallabhMandir({ b, signB, loc, ground, terrain, colliders, rng, h: {
      cuspedArch, tint, buildStanding, buildSeated, PEOPLE, place, signUV, buildDeities,
      SIGN: { GARLANDS: 0, PRASAD: 3, CLOTH: 5, PUJA: 6, PHOTO: 9, BANGLES: 13 },
    } });
    const A = p(r.altar.lx, r.altar.lz), D = p(r.darshan.lx, r.darshan.lz);
    const H = r.hall;
    const V = p((H.lx0 + H.lx1) / 2, (H.lz0 + H.lz1) / 2);
    return {
      altarY: r.altar.y - ground,
      colliders,
      meshes: [{ name: 'RadhaVallabhSigns', builder: signB, x: loc.pos[0], z: loc.pos[1], r: 60, map: signAtlas }],
      rooms: r.rooms,
      interior: {
        altar: [A[0], r.altar.y, A[1]],
        darshan: [D[0], D[1]],
        facing: Math.atan2(A[0] - D[0], A[1] - D[1]),
        floor: r.FL,
        volume: { x: V[0], z: V[1], hw: (H.lx1 - H.lx0) / 2, hd: (H.lz1 - H.lz0) / 2, rot, door: p(H.door[0], H.door[1]) },
      },
    };
  },

  'temple-gable-plain': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p2 = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    b.box(x, ground - 0.4, z, w + 4, 1.0, d + 4, 0x9c8e6e, rot);
    // Hollow, under the gable. This was a solid box, so Radha Vallabh's hall
    // was a hall you could only walk around.
    const shrine = hollowShrine(b, loc, {
      hx: w * 0.4, hz: d * 0.42, floorY: ground + 0.6, height: h * 0.58, color,
      openings: [{ c: 0, hw: w * 0.15 }],    // the front arch the facade draws
    });

    // the steep gable: stepped courses rising to a ridge
    const STEPS = 10;
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS;
      b.box(x, ground + 0.6 + h * 0.58 + i * (h * 0.34 / STEPS), z,
        w * 0.8 * (1 - t * 0.92), h * 0.34 / STEPS, d * 0.86, i % 2 ? accent : color, rot);
    }

    // two-tier arcaded flank with clerestory windows over the street
    for (const side of [-1, 1]) {
      for (let k = -2; k <= 2; k++) {
        const q = p2(side * w * 0.41, k * d * 0.17);
        cuspedArch(b, q[0], ground + 0.6, q[1], 2.0, h * 0.28, 0.45, rot, accent, 5);
        b.box(q[0], ground + 0.6 + h * 0.36, q[1], 0.5, 1.0, 1.0, 0x5a3a28, rot);
      }
    }
    const front = d * 0.44;
    cuspedArch(b, x + front * sn, ground + 0.6, z + front * cs,
      w * 0.3, h * 0.38, 0.7, rot + Math.PI / 2, 0x6b3325, 5);
    return { altarY: 2.0, ...shrine };
  },

  /** Banke Bihari: a broad ornate arched facade under three domes. */
  /**
   * Banke Bihari. This build kind has exactly one user, so it is his temple
   * and not a style.
   */
  'temple-rajasthani': (args) => buildBankeBihari(args),

  /** Chaar Dham, Chhatikara — the 2025 complex at the highway junction. */
  'temple-chaardham': (args) => buildChaarDham(args),

  /**
   * Madan Mohan and Jugal Kishore. Madan Mohan is documented in detail and gets
   * its own builder; the other keeps the shared red-sandstone mass.
   */
  'temple-redstone': (args) => (args.loc.id === 'madan-mohan'
    ? buildMadanMohan(args)
    : args.loc.id === 'jugal-kishore'
      ? buildJugalKishore(args)
      : BUILDERS['temple-redstone-plain'](args)),

  'temple-redstone-plain': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;

    b.box(x, ground - 0.5, z, w + 7, 1.4, d + 7, 0x9c8e6e, rot);           // plinth
    // receding stages
    const STAGES = 4;
    let cy = ground + 0.9;
    for (let i = 0; i < STAGES; i++) {
      const t = i / STAGES;
      const sw = w * (1 - t * 0.3), sd = d * (1 - t * 0.3);
      const sh = (h * 0.72) / STAGES;
      const shade = i % 2 ? accent : color;
      b.box(x, cy, z, sw, sh, sd, shade, rot);
      // deep string course
      b.box(x, cy + sh - 0.35, z, sw + 0.7, 0.45, sd + 0.7, accent, rot);
      cy += sh;
    }
    // heavy vaulted hall roof
    dome(b, x, cy, z, w * 0.3, h * 0.24, color, 10);

    // corner chhatris
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * w * 0.38, lz = sz * d * 0.38;
        chhatri(b, x + lx * cs - lz * sn, cy, z + lx * sn + lz * cs, 1.3, 2.3, 0xc4a884);
      }
    }

    // entrance recess
    const front = d * 0.5 + 0.3;
    cuspedArch(b, x + front * sn, ground + 0.9, z + front * cs, w * 0.26, h * 0.4, 0.9, rot + Math.PI / 2, 0x6b3325, 3);
    return { altarY: 2.6 };
  },

  /** Rangaji: a tall South Indian gopuram, the eastern skyline marker. */
  /** Rangaji — the only Dravidian temple in Braj, and built to Growse's figures. */
  /**
   * Sri Rangji Mandir at full size — the 236 x 135 m temple-city, its five
   * rings, gopurams, north-Indian gatehouse, tank, garden and forecourt — in
   * RangajiMandir.js. The half-size builder below it is no longer used.
   */
  'temple-gopuram': ({ loc, b, ground, rng, terrain }) => {
    const rot = loc.rot, cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
    const colliders = [];
    const r = buildRangajiCity({ b, loc, ground, terrain, colliders, rng, h: { cuspedArch, ribbedDome, tint } });
    const A = p(r.altar.lx, r.altar.lz), D = p(r.darshan.lx, r.darshan.lz);
    const V = p(r.hall.lx, r.hall.lz), door = p(r.hall.door[0], r.hall.door[1]);
    return {
      altarY: r.altar.y - ground,
      colliders,
      interior: {
        altar: [A[0], r.altar.y, A[1]],
        darshan: [D[0], D[1]],
        facing: Math.atan2(A[0] - D[0], A[1] - D[1]),
        floor: r.hall.floor,
        volume: { x: V[0], z: V[1], hw: r.hall.hw, hd: r.hall.hd, rot, door },
      },
    };
  },

  'temple-gopuram-plain': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    // long compound
    const { D } = compound(b, loc, ground, 0xd2c4a4, 3.2);

    // the gopuram itself sits on the entrance side
    const gx = x + Math.sin(rot) * (D - 2);
    const gz = z + Math.cos(rot) * (D - 2);

    b.box(gx, ground, gz, w * 0.5, 4.2, 12, color, rot);                    // base block
    const TIERS = 8;
    let cy = ground + 4.2;
    let tw = w * 0.46, td = 11;
    for (let i = 0; i < TIERS; i++) {
      const th = (h - 6) / TIERS;
      const band = i % 2 ? accent : color;
      b.box(gx, cy, gz, tw, th * 0.82, td, band, rot);
      // cornice
      b.box(gx, cy + th * 0.82, gz, tw + 0.9, th * 0.18, td + 0.9, 0xe8dcc0, rot);
      // suggestion of niche figures: a row of small blocks
      const n = Math.max(3, Math.round(tw / 1.6));
      for (let k = 0; k < n; k++) {
        const lx = (k / (n - 1) - 0.5) * tw * 0.86;
        for (const face of [-1, 1]) {
          const lz = face * td * 0.5;
          b.box(gx + lx * cs - lz * sn, cy + th * 0.2, gz + lx * sn + lz * cs,
            0.5, th * 0.5, 0.35, i % 3 === 0 ? 0xc05a33 : 0xdcc9a0, rot);
        }
      }
      cy += th;
      tw *= 0.9; td *= 0.93;
    }
    // barrel-vaulted crown
    b.box(gx, cy, gz, tw, 1.6, td, 0xe4d8c0, rot);
    dome(b, gx, cy + 1.6, gz, td * 0.42, 1.8, 0xe4d8c0, 8);
    for (let k = -1; k <= 1; k++) {
      b.box(gx + k * tw * 0.3 * cs, cy + 3.4, gz + k * tw * 0.3 * sn, 0.24, 1.3, 0.24, 0xc9a03c);
    }

    // the sanctum inside the compound
    b.box(x, ground, z, w * 0.5, 7, d * 0.3, color, rot);
    shikhara(b, x, ground + 7, z, w * 0.2, 9, color);
    return { altarY: 2.4, colliders: [{ type: 'box', x: gx, z: gz, w: w * 0.5, d: 12, rot }] };
  },

  /** Prem Mandir: white marble, a cluster of shikharas, arcaded ground storey. */
  /** Prem Mandir — thirty thousand tonnes of Carrara marble in a park. */
  'temple-marble': (args) => buildPremMandir(args),

  'temple-marble-plain': ({ loc, b, ground }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    b.box(x, ground - 0.6, z, w + 12, 1.6, d + 12, 0xe8e2d4, rot);          // broad plinth
    b.box(x, ground + 1.0, z, w, h * 0.4, d, color, rot);                    // arcaded storey

    // arcade on all four sides
    for (const [nx, nz, len, ang] of [
      [0, 1, w, rot], [0, -1, w, rot],
      [1, 0, d, rot + Math.PI / 2], [-1, 0, d, rot + Math.PI / 2],
    ]) {
      const off = (nz ? d : w) * 0.5 + 0.3;
      const n = Math.max(4, Math.round(len / 4.2));
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * len * 0.88;
        const lx = nz ? t : nx * off;
        const lz = nz ? nz * off : t;
        cuspedArch(b, x + lx * cs - lz * sn, ground + 1.0,
          z + lx * sn + lz * cs, 2.6, h * 0.3, 0.6, ang, accent, 7);
      }
    }

    b.box(x, ground + 1.0 + h * 0.4, z, w * 0.72, h * 0.16, d * 0.72, color, rot);

    // shikhara cluster
    const baseY = ground + 1.0 + h * 0.56;
    shikhara(b, x, baseY, z, w * 0.17, h * 0.44, color, 14);
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.5], [0, 1.5]]) {
      const lx = ox * w * 0.26, lz = oz * d * 0.2;
      shikhara(b, x + lx * cs - lz * sn, baseY, z + lx * sn + lz * cs,
        w * 0.085, h * 0.24, color, 10);
    }
    return { altarY: 3.0 };
  },

  /**
   * ISKCON Sri Sri Krishna Balaram Mandir — the courtyard temple, which is the
   * only one in the file that authors its own interior rather than taking
   * `buildInterior`'s hall. Exclusive to this location, so it is safe to be as
   * particular as it is. See buildKrishnaBalaram above.
   */
  'temple-modern': (args) => buildKrishnaBalaram(args),

  /** The many small mandirs: a single shikhara over a square sanctum. */
  /** Katyayani and Gopishwar Mahadev, which have almost nothing in common. */
  'temple-small': (args) => (args.loc.id === 'katyayani'
    ? buildKatyayani(args)
    : args.loc.id === 'gopishwar-mahadev'
      ? buildGopishwar(args)
      : BUILDERS['temple-small-plain'](args)),

  /**
   * The ordinary Vrindavan lane mandir — a HAVELI-TEMPLE, not a temple.
   *
   * This builder used to draw a cuboid, a shikhara and a flag, which is a
   * Nagara-temple diagram and is the wrong building type entirely. Sinha &
   * Dhariwal (ISVS e-journal 11.10, 2024), summarising Nath 1996 and Jain
   * 2007, on the type that "has become the norm in Vrindavan":
   *
   *   "…this being a house of a God, has had a garbhagriha facing the East
   *   and the arcades on the other three sides of the courtyard in a
   *   tri-partite composition. WHILE NO DOMES OR SOARING SHIKHAR TOWERS DREW
   *   ATTENTION TO THE BUILDING, THE ENTRY GATE KNOWN AS GOKHE IS EMPHASIZED
   *   by porches on either side of the main door and the jharokhas
   *   (balconies) above."
   *
   * So: an introverted courtyard house whose whole architectural effort goes
   * into one gateway. 60-70% of them have no tower at all. The court is
   * BEHIND the gate, never in front of it — there is no forecourt, and a
   * temple set back behind an apron is the commonest way to get this wrong.
   *
   * Full survey in docs/research/lane-temple.md.
   *
   * NOTE ON REACH: nothing in the world currently renders through this.
   * Both `temple-small` locations — Katyayani and Gopishwar Mahadev — have
   * their own researched builders, so this is the FALLBACK for a kind with
   * no dedicated builder, plus the reference implementation of the type. It
   * is worth keeping accurate for exactly that reason, but do not expect a
   * change here to show up in a photograph.
   */
  'temple-small-plain': ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const r = rng || (() => 0.5);

    const FRONT = d * 0.5;
    const PL = 0.45;                       // IS 1080 practice, 2-3 risers
    const WALL = Math.max(6.0, h * 0.82);  // to the wall head
    const y0 = ground + PL;

    /*
     * THE PLINTH IS A BENCH, and it runs wider than the building.
     *
     * "Devotees sit on plinths extending from houses in the ghera along the
     * street AND AT THE TEMPLE ENTRY (gokhe) for the temple doors to open in
     * the mornings and evenings." So it is not a pedestal under a building;
     * it is a continuous street ledge at sitting height that the building
     * happens to stand on, and it carries on past both neighbours.
     *
     * Buried 0.06 m, because the lane level rises — Growse dug 2.44 m of
     * accumulated debris off Govind Dev's base in 1873, and a plinth sitting
     * exactly on the ground plane reads as a prop.
     */
    b.box(x, ground - 0.06, z, w + 4.4, PL + 0.06, d + 1.2, tint(color, 0.88), rot);
    for (let i = 0; i < 3; i++) {          // riser 0.16, tread 0.33
      const t = p(0, FRONT + 0.33 * (3 - i));
      b.box(t[0], ground - 0.06 + i * 0.16, t[1], w * 0.42, 0.16, 0.34,
        tint(color, 0.84), rot);
    }

    // the body: two storeys, flat-roofed, flush to the lane
    b.box(x, y0, z, w, WALL, d, color, rot);

    /*
     * THE FRONT FACE IS A DIFFERENT COLOUR FROM THE OTHER THREE.
     *
     * True by ordinary practice and, on the Parikrama Marg, by regulation:
     * the MVDA requires every owner to paint the FRONT ELEVATION "light
     * yellow colour (postcard colour)". No hex has ever been published for
     * that phrase, so none is invented here — this is the front simply being
     * repainted more recently and more brightly than the flanks, which is
     * the part that is universally true.
     */
    b.box(x + FRONT * sn * 1.001, y0, z + FRONT * cs * 1.001,
      w * 0.995, WALL, 0.08, tint(accent, 1.04), rot);

    /*
     * THE GOKHE. One opening on the ground floor — that is the whole
     * elevation. Ground-floor void is 12-25%, and the commonest modelling
     * error in the other direction is punching a row of windows.
     */
    const GW = Math.min(2.5, Math.max(1.5, w * 0.30));
    const gate = p(0, FRONT + 0.12);
    cuspedArch(b, gate[0], y0, gate[1], GW, 3.2, 0.55, rot + Math.PI / 2,
      tint(accent, 0.94), 5);              // 5 lobes for a gateway, 3 for a window

    // the porches either side of the main door that the citation names
    for (const sx of [-1, 1]) {
      const c0 = p(sx * (GW * 0.5 + 0.45), FRONT + 0.55);
      b.box(c0[0], y0, c0[1], 0.34, 2.9, 0.34, tint(accent, 0.9), rot);
      const br = p(sx * (GW * 0.5 + 0.45), FRONT + 0.55);
      b.box(br[0], y0 + 2.9, br[1], 0.52, 0.26, 0.52, tint(accent, 1.02), rot);
    }

    /*
     * THE NAME BAND — yellow field, red Devanagari, over the arch.
     * Half the visual identity of a Vrindavan temple front, and the single
     * most identifying feature after the gate itself.
     */
    const band = p(0, FRONT + 0.16);
    b.box(band[0], y0 + 3.35, band[1], GW + 1.5, 0.44, 0.1, 0xe9c23f, rot);
    b.box(band[0], y0 + 3.46, band[1], GW + 1.0, 0.16, 0.13, 0xa8231b, rot);

    /* The municipal board on the jamb: blue field, white and red text. */
    const mb = p(-(GW * 0.5 + 0.95), FRONT + 0.2);
    b.box(mb[0], y0 + 2.1, mb[1], 0.62, 0.9, 0.06, 0x1d3f7a, rot);
    b.box(mb[0], y0 + 2.34, mb[1], 0.5, 0.1, 0.09, 0xe8e4dc, rot);

    /* And the tin notice on the other jamb — no shoes, no phones. */
    const tn = p(GW * 0.5 + 0.9, FRONT + 0.2);
    b.box(tn[0], y0 + 2.2, tn[1], 0.26, 0.34, 0.05, 0xc23a2a, rot);

    /*
     * Chhajjas at the documented eave lines: the shop hood over the gate at
     * 3.8-4.4, and the wall-head eave. The soffit of each is painted, never
     * the wall colour — chhajja() handles that.
     */
    chhajja(b, x, y0 + 4.1, z, w * 0.55, d * 0.2, rot, accent, 0.62);
    chhajja(b, x, y0 + WALL - 0.3, z, w, d, rot, color, 0.7);

    /* The floor-line string course. A string course must sit on every floor
     * line, because from outside that is what a floor line IS. */
    b.box(x, y0 + 4.85, z, w + 0.22, 0.24, d + 0.22, tint(color, 1.05), rot);

    /*
     * ONE jharokha, centred over the gate. Not one per bay — that is the
     * rich commercial frontage of the high street, not a lane mandir.
     */
    const jh = p(0, FRONT);
    jharokha(b, jh[0], y0 + 4.25, jh[1], 1.6, rot, color, accent);

    // first-floor openings either side, 3-lobe heads on a window
    for (const sx of [-1, 1]) {
      const wq = p(sx * w * 0.3, FRONT + 0.1);
      cuspedArch(b, wq[0], y0 + 5.1, wq[1], 0.95, 1.7, 0.3, rot + Math.PI / 2,
        tint(accent, 0.9), 3);
    }

    /*
     * The parapet, RAISED ACROSS THE GATE BAY. "A parapet at one height all
     * round is the flattest possible answer" — the gokhe is where the
     * emphasis goes, so it steps up 0.4 m over the entrance and back down.
     */
    parapet(b, x, y0 + WALL, z, w, d, rot, color, false);
    const pb = p(0, FRONT - 0.1);
    b.box(pb[0], y0 + WALL + 0.72, pb[1], GW + 2.2, 0.4, 0.34, tint(color, 1.03), rot);

    /*
     * The roof. Flat, with a tank — not a tower. A shikhara appears on only
     * 10-20% of these, and when it does it stands over the sanctum at the
     * BACK of the plot, where it is usually invisible from the lane.
     */
    const tank = p(w * 0.22, -d * 0.2);
    for (const [ox, oz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      b.box(tank[0] + ox * 0.38, y0 + WALL, tank[1] + oz * 0.38, 0.07, 0.9, 0.07, 0x6b6257);
    }
    b.box(tank[0], y0 + WALL + 0.9, tank[1], 1.0, 0.85, 1.0, 0x2b2b2e, rot);

    if (r() < 0.18) {
      const sp = p(0, -d * 0.3);           // over the sanctum, at the BACK
      shikhara(b, sp[0], y0 + WALL, sp[1], w * 0.17, Math.min(4.0, h * 0.42), color);
    }

    /* The dhvaja goes on the gate pavilion, not the sanctum. */
    const fl = p(0, FRONT - 0.5);
    b.box(fl[0], y0 + WALL + 0.8, fl[1], 0.08, 2.8, 0.08, 0x8a8278);
    b.box(fl[0] + 0.45, y0 + WALL + 2.9, fl[1], 0.9, 0.5, 0.04, 0xe8891f);

    return { altarY: 1.9 };
  },

  /** A riverfront facade above the stepped terrace the terrain already cut. */
  ghat: ({ loc, b, ground, terrain }) => {
    const { w, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    /*
     * Face the water, not `loc.rot`.
     *
     * TerrainBuilder cuts the flight toward the nearest river geometry and
     * publishes the angle it used. This facade sits BEHIND that flight, so it
     * has to be in the same frame — where the two disagreed the arcade wall
     * came down across the middle of the steps as a 70 x 6 m full-height box,
     * and you walked four risers down and then slid along it.
     *
     * It also now steps back past the END of the flight rather than a flat
     * eight metres, because eight metres is inside a sixteen-tread run.
     */
    const face = (terrain && terrain.ghatFacing && terrain.ghatFacing[loc.id]) || null;
    const rot = face ? face.ang : loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    /*
     * THE STEPS' FRAME, for everything. TerrainBuilder cuts the flight in the
     * MIRROR frame — lx along (cos, -sin), lz toward the water along
     * (sin, cos) — and this facade's positions already followed it. Its boxes,
     * arches and collider did not: they were handed `rot`, which box(),
     * cuspedArch and the collider grid all read in the BOX frame, lx along
     * (cos, sin). At a ghat's own angle the wall was therefore turned 2 x rot
     * away from the steps it stands behind — 72 degrees at Kaliya Ghat's 36,
     * 108 at Yugal Ghat's 54 — and the arch audit found every one of Kaliya's
     * arches standing across its wall. `solid` is the same idea as
     * BuildingGenerator's field of that name.
     */
    const solid = -rot;

    // the arcade wall set back from the steps
    const back = -8;
    /*
     * `p()` in TerrainBuilder maps local (lx, lz) to
     *   [cx + lx*cs + lz*sn, cz - lx*sn + lz*cs]
     * with the flight running from lz 0 to lz `run` toward the water. So the
     * land side is NEGATIVE lz in that same frame, which is what this uses.
     */
    const bx = x + back * sn, bz = z + back * cs;
    b.box(bx, ground, bz, w, h * 0.55, 6, color, solid);

    const n = Math.max(5, Math.round(w / 7));
    for (let i = 0; i < n; i++) {
      const lx = (i / (n - 1) - 0.5) * w * 0.9;
      cuspedArch(b, bx + lx * cs + 3.1 * sn, ground, bz - lx * sn + 3.1 * cs,
        w / (n * 1.5), h * 0.44, 0.7, solid, accent, 7);
    }

    b.box(bx, ground + h * 0.55, bz, w + 1.2, 0.5, 7, accent, solid);

    // chhatris along the parapet and flanking towers
    for (let i = 0; i < 4; i++) {
      const lx = (i / 3 - 0.5) * w * 0.74;
      chhatri(b, bx + lx * cs, ground + h * 0.6, bz - lx * sn, 1.5, 2.6, 0xd8c8a4);
    }
    for (const side of [-1, 1]) {
      const lx = side * w * 0.52;
      b.box(bx + lx * cs, ground, bz - lx * sn, 5, h * 0.82, 6, color, solid);
      dome(b, bx + lx * cs, ground + h * 0.82, bz - lx * sn, 2.4, 2.2, accent);
    }
    /*
     * The collider is the ARCADE, and only the arcade.
     *
     * It is deliberately a little narrower and shallower than the drawn wall:
     * the steps come right up to it, and a collider that overhangs its own
     * masonry is a wall you bump into before you can see why.
     */
    return { altarY: 1.6, noCollider: true, colliders: [
      { type: 'box', x: bx, z: bz, w: w * 0.98, d: 5.4, rot: solid },
    ] };
  },

  /** Nidhivan / Seva Kunj: the enclosure. The grove itself is planted by PropScatter. */
  grove: (args) => {
    /*
     * Seva Kunj is not a generic grove and must not be built as one.
     *
     * "You walk Seva Kunj inside a green wire tunnel with an amber corrugated
     * barrel roof, reading marble verse-plaques on a sandstone wall at your
     * shoulder while the grove stays on the other side of the mesh." Nothing
     * else in Braj is walked that way, and a plain walled enclosure with a
     * gateway — which is what this builder makes — throws away the one thing
     * anybody remembers about the place.
     *
     * Dispatched on id, the way Banke Bihari and Govind Dev already are
     * within their kinds. Nidhivan keeps the plain grove.
     */
    if (args.loc.id === 'seva-kunj') return buildSevaKunj(args);
    const { w, d, accent } = args.loc.build;
    const { b, ground } = args;
    const loc = args.loc;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);

    const W = w * 0.5, D = d * 0.5;
    const sides = [
      [[-W, -D], [W, -D]], [[W, -D], [W, D]], [[W, D], [-W, D]], [[-W, D], [-W, -D]],
    ];
    sides.forEach((s, i) => {
      const [a0, a1] = s;
      const A = [x + a0[0] * cs - a0[1] * sn, z + a0[0] * sn + a0[1] * cs];
      const B = [x + a1[0] * cs - a1[1] * sn, z + a1[0] * sn + a1[1] * cs];
      const mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      if (i === 2) {
        const gap = 6;
        for (const side of [-1, 1]) {
          const seg = (len - gap) / 2;
          b.box(mx + Math.cos(ang) * side * (gap / 2 + seg / 2), ground,
                mz + Math.sin(ang) * side * (gap / 2 + seg / 2), seg, 3.2, 0.6, accent, ang);
        }
        // arched gateway
        cuspedArch(b, mx, ground, mz, gap, 4.6, 0.8, ang, 0xb08a5c, 5);
        b.box(mx, ground + 4.6, mz, gap + 2, 1.0, 1.2, accent, ang);
      } else {
        b.box(mx, ground, mz, len, 3.2, 0.6, accent, ang);
      }
    });

    // a raised stone platform at the centre
    b.box(x, ground, z, 7, 0.5, 7, 0xc8b894, rot);
    return { altarY: 1.0, noCollider: true };
  },

  /** A stepped tank. */
  kund: ({ loc, b, ground }) => {
    const { w, d, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const STEPS = 7, RISE = 0.5, TREAD = 1.1;
    for (let s = 0; s < STEPS; s++) {
      const inset = s * TREAD;
      const y = ground - s * RISE;
      const sw = w - inset * 2, sd = d - inset * 2;
      if (sw < 3 || sd < 3) break;
      b.box(x, y - RISE, z, sw, RISE, sd, s % 2 ? color : 0xc4b088, 0,
        0b111111, s === STEPS - 1 ? 0x3f6d74 : null);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      chhatri(b, x + sx * w * 0.5, ground, z + sz * d * 0.5, 1.2, 2.2, accent);
    }
    return { altarY: 0.8, noCollider: true };
  },

  /** A ceremonial gateway spanning the road. */
  gate: ({ loc, b, ground }) => {
    const { w, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    for (const side of [-1, 1]) {
      const lx = side * w * 0.45;
      b.box(x + lx * cs, ground, z - lx * sn, 4, h * 0.82, 4.5, color, rot);
      dome(b, x + lx * cs, ground + h * 0.82, z - lx * sn, 2.1, 2.0, accent);
    }
    cuspedArch(b, x, ground, z, w * 0.62, h * 0.72, 4.2, rot, accent, 7);
    b.box(x, ground + h * 0.74, z, w * 0.72, 1.8, 3.2, color, rot);
    b.box(x, ground + h * 0.78, z, w * 0.5, 1.0, 3.5, accent, rot);
    return { altarY: 1.5, noCollider: true, colliders: [
      { type: 'circle', x: x + Math.cos(rot) * w * 0.45, z: z - Math.sin(rot) * w * 0.45, r: 2.6 },
      { type: 'circle', x: x - Math.cos(rot) * w * 0.45, z: z + Math.sin(rot) * w * 0.45, r: 2.6 },
    ] };
  },

  /** Chandrodaya: the unfinished tower, visible from everywhere. */
  /**
   * Vrindavan Chandrodaya Mandir — a building site, because that is what it is.
   *
   * The research could not be blunter: "CRITICAL FOR THE ARTIST: the 700 ft
   * tower does not exist. As of 2026 what stands on site is a large unfinished
   * concrete structure amid construction plant, with a functioning small temple
   * and goshala operating beside it. If you model the render, you are modelling
   * something nobody has ever seen."
   *
   * Foundation stone 16 March 2014; completion targets missed in 2019, 2022,
   * 2024, 2025 and 2026; currently stated for December 2028. So this is a
   * REINFORCED CONCRETE FRAME — the engineering is real and documented, an IIT
   * structural design for Richter 8.0 and 170 km/h winds, about 511 pillars —
   * clad only at the bottom and open columns and slabs above, with plant, stacks
   * and cranes around it. The working temple and the goshala stand beside it.
   *
   * Nothing here is the render. When it is finished, it can be built finished.
   */
  tower: ({ loc, b, ground, rng }) => {
    const { w, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const CONCRETE = 0xb8b4ab, RAW = 0x9c9890, REBAR = 0x8a6a42;
    const colliders = [];

    // the site: hardstanding, not landscaping
    b.box(x, ground - 0.8, z, w + 60, 1.6, w + 60, 0xbfb6a2);
    b.box(x, ground - 0.2, z, w + 26, 0.5, w + 26, 0xa8a196);

    /* ---- the frame ---- */
    const STAGES = 9, CLAD = 3;          // only the lowest three are clad
    let cy = ground + 0.8, cw = w;
    for (let i = 0; i < STAGES; i++) {
      const sh = h / STAGES;
      if (i < CLAD) {
        b.box(x, cy, z, cw, sh * 0.9, cw, i % 2 ? accent : color);
        b.box(x, cy + sh * 0.9, z, cw + 1.4, sh * 0.1, cw + 1.4, CONCRETE);
      } else {
        /*
         * Above the cladding: columns and floor slabs, and nothing between
         * them. This is the part you can see through from the road, and the
         * reason the thing reads as a site and not a temple.
         */
        const n = 4;
        for (let a2 = 0; a2 < n; a2++) {
          for (let b2 = 0; b2 < n; b2++) {
            const ox = (a2 / (n - 1) - 0.5) * cw * 0.86;
            const oz = (b2 / (n - 1) - 0.5) * cw * 0.86;
            b.box(x + ox, cy, z + oz, 0.9, sh * 0.9, 0.9, RAW);
          }
        }
        b.box(x, cy + sh * 0.9, z, cw, sh * 0.12, cw, CONCRETE);
        // starter bars left standing out of the pour, which they always are
        if (i === STAGES - 1) {
          for (let k = 0; k < 14; k++) {
            const a3 = (k / 14) * Math.PI * 2;
            b.box(x + Math.cos(a3) * cw * 0.4, cy + sh, z + Math.sin(a3) * cw * 0.4,
              0.1, 1.6, 0.1, REBAR);
          }
        }
      }
      cy += sh; cw *= 0.9;
    }
    colliders.push({ type: 'box', x, z, w: w * 0.92, d: w * 0.92, rot: 0 });

    /* ---- plant ---- */
    // two tower cranes, which is what a job this size carries
    for (const [cxo, czo, ch] of [[w * 0.5 + 9, -4, h * 1.12], [-w * 0.5 - 11, 7, h * 0.86]]) {
      b.box(x + cxo, ground, z + czo, 2.2, 1.2, 2.2, 0xc0562f);
      b.box(x + cxo, ground + 1.2, z + czo, 1.0, ch, 1.0, 0xd8a03c);
      b.box(x + cxo + 11, ground + 1.2 + ch, z + czo, 26, 0.7, 0.7, 0xd8a03c);
      b.box(x + cxo - 5, ground + 1.2 + ch, z + czo, 11, 0.9, 0.9, 0xd8a03c);
      b.box(x + cxo + 17, ground + 1.2 + ch - 4.5, z + czo, 0.3, 4.5, 0.3, 0x6a6a62);
      colliders.push({ type: 'circle', x: x + cxo, z: z + czo, r: 1.4 });
    }
    // scaffold towers up the clad face
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = x + sx * (w * 0.5 + 2.2), pz = z + sz * (w * 0.5 + 2.2);
      for (let k = 0; k < 9; k++) {
        b.box(px, ground + k * (h * 0.42 / 9), pz, 0.22, h * 0.42 / 9 * 0.9, 0.22, REBAR);
        b.box(px, ground + k * (h * 0.42 / 9), pz, 1.9, 0.1, 0.16, REBAR);
      }
    }
    // site huts, material stacks and a spoil heap
    for (let i = 0; i < 5; i++) {
      const px = x - w * 0.5 - 22, pz = z - 16 + i * 7.5;
      b.box(px, ground, pz, 7.0, 2.8, 3.4, [0xd8d2c2, 0x6a8a9a, 0xd8d2c2, 0xc0a878, 0x6a8a9a][i]);
      b.box(px, ground + 2.8, pz, 7.4, 0.25, 3.8, 0x8a8478);
      colliders.push({ type: 'box', x: px, z: pz, w: 7.0, d: 3.4, rot: 0 });
    }
    for (let i = 0; i < 6; i++) {
      const px = x + w * 0.5 + 16 + (i % 3) * 5, pz = z + 12 + Math.floor(i / 3) * 5;
      b.box(px, ground, pz, 4.0, 0.9 + (i % 2) * 0.5, 3.2, i % 2 ? 0x9c7a52 : 0xa8a196);
      colliders.push({ type: 'box', x: px, z: pz, w: 4.0, d: 3.2, rot: 0 });
    }
    b.box(x - w * 0.5 - 12, ground, z + 26, 14, 3.2, 11, 0x9c8e6e);   // spoil

    /* ---- the temple that actually works, and the goshala ---- */
    {
      const tx = x + w * 0.5 + 34, tz = z - 22;
      b.box(tx, ground - 0.2, tz, 22, 0.6, 20, 0xd8cfb8);
      b.box(tx, ground + 0.4, tz, 16, 6.2, 14, 0xf0e9db);
      b.box(tx, ground + 6.6, tz, 17, 0.5, 15, accent);
      shikhara(b, tx, ground + 7.1, tz, 3.2, 8.0, 0xf0e9db, 12);
      cuspedArch(b, tx, ground + 0.4, tz + 7.2, 2.6, 3.6, 0.5, Math.PI / 2, accent, 5, 0x241a12);
      colliders.push({ type: 'box', x: tx, z: tz, w: 16, d: 14, rot: 0 });

      // the goshala beside it: open sheds and a yard
      const gx = x + w * 0.5 + 36, gz = z + 16;
      b.box(gx, ground - 0.15, gz, 30, 0.3, 24, 0xc0b092);
      for (const oz of [-7, 7]) {
        b.box(gx, ground + 0.15, gz + oz, 26, 0.35, 6.5, 0xb8a684);
        for (let i = 0; i < 8; i++) {
          const cxp = gx - 11 + i * 3.1;
          b.box(cxp, ground + 0.5, gz + oz, 0.3, 2.8, 0.3, 0x8a6a42);
          colliders.push({ type: 'circle', x: cxp, z: gz + oz, r: 0.26 });
        }
        b.box(gx, ground + 3.3, gz + oz, 27, 0.35, 7.4, 0xc0562f);
      }
    }

    return { altarY: 2.0, colliders };
  },

  /**
   * Chhatikara: the crossing you arrive through. A divided highway, an overhead
   * sign gantry, the bus stand with its shelter, and the welcome arch that tells
   * you Braj has begun.
   */
  crossing: ({ loc, b, ground, rng }) => {
    const { w, d, h, color, accent } = loc.build;
    const [x, z] = loc.pos;
    const rot = loc.rot;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];

    // central median of the divided highway
    for (let i = -4; i <= 4; i++) {
      const q = p(i * 7, 0);
      b.box(q[0], ground, q[1], 5.2, 0.35, 1.6, 0xbfb49c, rot);
      if (i % 2 === 0) b.box(q[0], ground + 0.35, q[1], 0.7, 0.9, 0.7, 0x4f7a3a, rot);
    }

    // sign gantry over the road
    for (const side of [-1, 1]) {
      const q = p(0, side * 11);
      b.box(q[0], ground, q[1], 0.6, 7.2, 0.6, 0x6a6a62, rot);
    }
    const g0 = p(0, 0);
    b.box(g0[0], ground + 7.0, g0[1], 0.8, 0.5, 23, 0x6a6a62, rot);
    b.box(g0[0], ground + 5.4, g0[1], 0.35, 1.7, 7.5, 0x1d6a3f, rot);

    // the welcome arch
    const a0 = p(-w * 0.34, 0);
    for (const side of [-1, 1]) {
      const q = p(-w * 0.34, side * 10);
      b.box(q[0], ground, q[1], 3.2, h * 0.8, 3.2, color, rot);
      dome(b, q[0], ground + h * 0.8, q[1], 1.7, 1.6, accent);
    }
    cuspedArch(b, a0[0], ground, a0[1], 19, h * 0.72, 3.0, rot + Math.PI / 2, accent, 7);
    b.box(a0[0], ground + h * 0.74, a0[1], 21, 1.7, 2.6, color, rot);
    b.box(a0[0], ground + h * 0.8, a0[1], 15, 0.9, 2.9, accent, rot);

    // bus stand: a long shelter, a platform, and waiting benches
    const s0 = p(w * 0.3, 15);
    b.box(s0[0], ground, s0[1], 26, 0.4, 7, 0xc4b79f, rot);
    for (let i = -3; i <= 3; i++) {
      const q = p(w * 0.3 + i * 4, 17.4);
      b.box(q[0], ground + 0.4, q[1], 0.28, 3.2, 0.28, 0x6a6a62, rot);
    }
    b.box(s0[0], ground + 3.6, s0[1], 27, 0.3, 8, 0x2f5d5a, rot);
    for (let i = -2; i <= 2; i++) {
      const q = p(w * 0.3 + i * 5, 13.6);
      b.box(q[0], ground + 0.4, q[1], 3.4, 0.45, 0.8, 0x8a7458, rot);
    }
    // a parked bus, because the stand should never be empty
    const bus = p(w * 0.3 - 4, 23);
    b.box(bus[0], ground, bus[1], 10.5, 3.1, 2.7, 0xd8c04c, rot);
    b.box(bus[0], ground + 3.1, bus[1], 10.0, 0.3, 2.6, 0xc8452a, rot);
    for (let i = 0; i < 6; i++) {
      const q = p(w * 0.3 - 9 + i * 1.9, 22.6);
      b.panel(q[0], ground + 1.6, q[1], 1.5, 1.0, 0x2f3b3a, rot, 0.02);   // windows
    }

    // parked rickshaws waiting for a fare
    for (let i = 0; i < 5; i++) {
      const q = p(w * 0.3 - 13 + i * 3.4, 29 + (i % 2) * 1.2);
      const ang = rot + (rng() - 0.5) * 0.5;
      b.box(q[0], ground, q[1], 1.4, 1.1, 2.8, i % 2 ? 0x3f8f6a : 0x2f5d5a, ang);
      b.box(q[0], ground + 1.35, q[1], 1.5, 0.12, 1.8, i % 2 ? 0xf2ece0 : 0xc8452a, ang);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        b.box(q[0] + sx * 0.6, ground + 0.72, q[1] + sz * 0.7, 0.06, 0.5, 0.06, 0x5a5a52, ang);
      }
    }

    // waiting passengers: luggage, a tea bench, a stack of crates
    for (let i = 0; i < 7; i++) {
      const q = p(w * 0.3 - 11 + i * 3.2, 13.2);
      b.box(q[0], ground + 0.4, q[1], 0.6, 0.5, 0.45, [0xc8452a, 0x2f5d5a, 0x8a6a42, 0xc9a03c][i % 4], rot);
    }
    const chai = p(w * 0.3 + 14, 16);
    b.box(chai[0], ground, chai[1], 2.4, 2.0, 1.8, 0x8a7458, rot);
    b.box(chai[0], ground + 2.0, chai[1], 3.2, 0.14, 2.6, 0xc8452a, rot);
    b.box(chai[0], ground + 0.95, chai[1] + 1.2, 2.0, 0.12, 0.7, 0xa89878, rot);

    return { altarY: 1.5, noCollider: true, colliders: [
      { type: 'box', x: s0[0], z: s0[1], w: 26, d: 7, rot },
    ] };
  },

  /** Loi Bazar: an open square of stalls. */
  market: ({ loc, b, ground, rng }) => {
    const { w, d } = loc.build;
    const [x, z] = loc.pos;
    const COLORS = [0xc8452a, 0xe8891f, 0x2f5d5a, 0xf6f2e8, 0xc9a03c];
    for (let i = 0; i < 16; i++) {
      const lx = (rng() - 0.5) * w, lz = (rng() - 0.5) * d;
      const ang = rng() * 0.6 - 0.3;
      b.box(x + lx, ground, z + lz, 2.6, 2.1, 2.0, 0x8a7458, ang);           // stall body
      b.box(x + lx, ground + 2.1, z + lz, 3.4, 0.18, 3.0,
        COLORS[Math.floor(rng() * COLORS.length)], ang);                      // awning
      for (const sx of [-1, 1]) {
        b.box(x + lx + sx * 1.5, ground, z + lz + 1.4, 0.1, 2.1, 0.1, 0x6a5a42);
      }
    }
    b.box(x, ground, z, 5, 0.45, 5, 0xc4b08a);
    return { altarY: 1.0, noCollider: true };
  },
};
