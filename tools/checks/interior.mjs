/**
 * Does walking into a temple still work?
 *
 * This exists because of one bug. `InteriorSystem._apply` multiplied the live
 * sun, hemisphere and fog every frame while `TimeOfDay.update` damped them back
 * at about 3.6% a frame, so the product ran away: fog density went 0.000294
 * outside to 1.73 three seconds in to 3e5 at five, FogExp2 saturated at a metre
 * and every fragment in the world rendered as the fog colour, which the same
 * function was lerping to near-black. `_restore` restored nothing, so it kept
 * climbing after you left — about 158 seconds of black world for walking
 * through a door and back out again. Nothing caught it, because nothing here
 * ever went inside.
 *
 * So this goes inside, stays five seconds, and looks at the numbers. It also
 * checks the things that were wrong around it: a threshold that fired out in
 * the forecourt, a door corona on the opposite face of the building from the
 * only gap in its walls, a darshan anchor standing behind the deities, and a
 * rickshaw that drove through the compound wall to set you down in the middle
 * of the courtyard.
 *
 *   node tools/checks/interior.mjs
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client');
/* port: see __PORT */
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
});
await new Promise((r) => server.listen(0, r));
const __PORT = server.address().port;   // any free port, so parallel runs never collide

const results = [];
const errors = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(180000);
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/navigator\.vibrate/.test(t)) errors.push(t); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:${__PORT}/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.interior
  && window.vrindavan?.ctx?.world?._ready && window.vrindavan?.ctx?.ui, null, { timeout: 180000 });
await page.evaluate(() => window.vrindavan.ctx.ui.show('world'));
await page.waitForTimeout(600);

/* ---- how bright is it out here, before anything goes indoors? ---- */
const before = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  return { fog: ctx.scene.fog.density, sun: ctx.time.sun.intensity, hemi: ctx.time.hemi.intensity };
});

/**
 * Put the player at a point in a temple's own local frame and run the two
 * systems that used to fight each other, by hand, at a fixed step.
 *
 * Driving them rather than waiting on requestAnimationFrame is not a shortcut:
 * a headless page with nothing to present throttles its frames to almost
 * nothing, so a wall-clock wait measures the harness instead of the game. It is
 * also the honest reproduction, because the bug was a per-FRAME compounding:
 * 300 steps at 1/60 is 300 multiplications by up to 3.2 against 300 damps of
 * 3.6%. Replaying the old recurrence at exactly this step gives fog density
 * 1.97e19 after one second and 3.05e136 after five, against the 0.01 asserted
 * below — so a steady 60 fps was very much worse than the 3e5 that was measured
 * in a headless renderer limping along at six.
 */
const stand = async (id, lx, lz, seconds) => page.evaluate(({ id, lx, lz, seconds }) => {
  const ctx = window.vrindavan.ctx;
  const loc = ctx.data.LOCATIONS.find((l) => l.id === id);
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const x = loc.pos[0] + lx * cs - lz * sn;
  const z = loc.pos[1] + lx * sn + lz * cs;
  ctx.player.position.set(x, ctx.world.groundHeight(x, z), z);
  const dt = 1 / 60;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    ctx.time.update(dt, ctx);
    ctx.interior.update(dt, ctx);
  }
  return {
    inside: ctx.interior.inside ? ctx.interior.inside.loc.id : null,
    blend: ctx.interior.blend,
    fog: ctx.scene.fog.density,
    fogColour: ctx.scene.fog.color.getHexString(),
    sun: ctx.time.sun.intensity,
    hemi: ctx.time.hemi.intensity,
    /*
     * What the interior is ASKING the lighting for, separately from what the
     * lighting currently is.
     *
     * These two are not the same measurement and conflating them made two
     * checks below fail for a reason that had nothing to do with interiors:
     * `ctx.time.sun.intensity` is the phase preset times the weather times the
     * interior grade, and `stand` advances the clock 300 steps at a time. Cross
     * a phase boundary mid-test and the sun drops by a third on its own, which
     * reads as "walking into a courtyard turned the sun down" when the courtyard
     * only ever asked for 10%.
     *
     * So: the absolute readings below still guard the runaway (that bug showed
     * up as fog density 3e5, and no clock does that), and the questions about
     * how STRONGLY a place is graded are asked of the grade itself.
     */
    grade: { ...ctx.interior.grade, tint: undefined },
    phase: ctx.time.phase,
  };
}, { id, lx, lz, seconds });

/* ---- 1. five seconds inside the courtyard ---- */
const inside = await stand('iskcon-krishna-balaram', 0, 4.5, 5);
check('walking in is recognised as walking in', inside.inside === 'iskcon-krishna-balaram',
  `inside ${inside.inside}, blend ${inside.blend.toFixed(2)}`);
check('the fog does not run away', inside.fog < 0.01,
  `density ${inside.fog.toExponential(2)} after 5 s (outside ${before.fog.toExponential(2)})`);
check('the sun does not collapse', inside.sun > before.sun * 0.5,
  `${inside.sun.toFixed(2)} of ${before.sun.toFixed(2)}`);
check('the ambient does not collapse', inside.hemi > before.hemi * 0.5,
  `${inside.hemi.toFixed(2)} of ${before.hemi.toFixed(2)}`);

/* ---- 2. a courtyard is still under the sky, so it must barely dim at all ---- */
check('the open court is not graded like a sanctum',
  inside.grade.sun > 0.82 && inside.grade.fog < 1.25,
  `asks for ${(100 * inside.grade.sun).toFixed(0)}% of the sun `
  + `and ${inside.grade.fog.toFixed(2)}x the haze (scene sun ${inside.sun.toFixed(2)}, `
  + `phase ${inside.phase})`);

/* ---- 3. a closed hall may be dim, but not black ---- */
const sanctum = await stand('prem-mandir', 0, 0, 5);
check('a closed hall is dim rather than black',
  sanctum.fog < 0.01 && sanctum.grade.sun > 0.35 && sanctum.grade.sun < 0.85,
  `fog ${sanctum.fog.toExponential(2)}, asks for ${(100 * sanctum.grade.sun).toFixed(0)}% `
  + `of the sun (scene sun ${sanctum.sun.toFixed(2)})`);

/* ---- 4. and it ends when you leave ---- */
const out = await stand('iskcon-krishna-balaram', 0, 300, 4);
/*
 * The grade must come off COMPLETELY. This is the actual regression guard: the
 * original bug was that `_restore` restored nothing, so the multiplication kept
 * compounding after you left. A grade of exactly 1 across the board is the only
 * thing that can never run away, and it is checked exactly rather than loosely.
 */
check('walking out puts the light back', out.inside === null
  && out.grade.sun === 1 && out.grade.ambient === 1 && out.grade.fog === 1
  && out.grade.tintK === 0 && out.fog < 0.01,
  `grade sun ${out.grade.sun}, fog ${out.grade.fog}, tint ${out.grade.tintK}; `
  + `scene fog ${out.fog.toExponential(2)} after 4 s outside`);

/* ---- 5. the threshold is the building, not the plot ---- */
const forecourt = await stand('iskcon-krishna-balaram', 0, 26, 2);
check('standing in the forecourt is not standing inside', forecourt.inside === null,
  `26 m out on the entrance axis, beside the samadhi — inside ${forecourt.inside}`);

/* ---- 6. the door corona is on the face the door is on ---- */
const door = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const v = ctx.interior.volumes.find((q) => q.loc.id === 'iskcon-krishna-balaram');
  const loc = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  // the marker, expressed back in the temple's local frame
  const dx = v.marker.x - loc.pos[0], dz = v.marker.z - loc.pos[1];
  const mlz = -dx * sn + dz * cs;
  // can you actually walk through there, and is the opposite face solid?
  const at = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  const inDoor = at(0, 16);
  const atBack = at(0, -16);
  return {
    markerLz: mlz,
    doorClear: ctx.world.isClear(inDoor[0], inDoor[1], 0.35),
    backSolid: !ctx.world.isClear(atBack[0], atBack[1], 0.35),
  };
});
check('the corona is on the doorway, not the blank face', door.markerLz > 10,
  `marker at local lz ${door.markerLz.toFixed(1)}, the entrance face is +16`);
check('and you can walk through it', door.doorClear && door.backSolid,
  `doorway clear ${door.doorClear}, back wall solid ${door.backSolid}`);

/* ---- 7. long walls are solid along their whole length ---- */
const walls = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const loc = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const at = (lx, lz) => [loc.pos[0] + lx * cs - lz * sn, loc.pos[1] + lx * sn + lz * cs];
  /*
   * The builder DECLARES its side doors — "a small door on both left and
   * right sides of deities room" — and they are the only gaps allowed. Each
   * must really be open, and every other point on both walls solid.
   */
  const vol = ctx.world.landmarks.interiors['iskcon-krishna-balaram'] || {};
  const doors = vol.sideDoors || [];
  const inDoor = (lx, lz) => doors.some((d) => Math.sign(d.lx) === Math.sign(lx) && Math.abs(lz - d.lz) < d.w / 2 + 0.3);
  let leaks = 0, tested = 0, skipped = 0;
  for (let lz = -15; lz <= 15; lz += 1) {
    for (const lx of [-11.9, 11.9]) {
      if (inDoor(lx, lz)) { skipped++; continue; }
      const q = at(lx, lz);
      tested++;
      if (ctx.world.isClear(q[0], q[1], 0.3)) leaks++;
    }
  }
  const open = doors.filter((d) => { const q = at(d.lx, d.lz); return ctx.world.isClear(q[0], q[1], 0.3); }).length;
  return { leaks, tested, skipped, doors: doors.length, open };
});
check('the side walls are solid end to end, but for their declared doors', walls.leaks === 0,
  `${walls.tested - walls.leaks}/${walls.tested} sample points solid, ${walls.skipped} in ${walls.doors} doorways`);
check('and both small side doors are open to walk through', walls.doors === 2 && walls.open === 2,
  `${walls.open}/${walls.doors} side doors clear`);

/* ---- 8. darshan happens in front of the deities, standing on something ---- */
const anchors = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const a = ctx.world.anchorFor('iskcon-krishna-balaram');
  const loc = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const local = (x, z) => {
    const dx = x - loc.pos[0], dz = z - loc.pos[1];
    return [dx * cs + dz * sn, -dx * sn + dz * cs];
  };
  const d = local(a.darshan.x, a.darshan.z);
  const al = local(a.altar.x, a.altar.z);
  return {
    darshanLocal: d.map((n) => +n.toFixed(2)),
    altarLocal: al.map((n) => +n.toFixed(2)),
    altarY: a.altar.y,
    floor: a.floor,
    ground: ctx.world.groundHeight(a.darshan.x, a.darshan.z),
    standable: ctx.world.isClear(a.darshan.x, a.darshan.z, 0.35),
    pujari: (() => {
      const r = ctx.ritual.rituals.find((q) => q.loc.id === 'iskcon-krishna-balaram');
      return r ? { y: r.group.position.y } : null;
    })(),
  };
});
check('the darshan spot is in the court, in front of the altars',
  anchors.darshanLocal[1] > anchors.altarLocal[1] && anchors.standable,
  `darshan at local ${anchors.darshanLocal}, altar at ${anchors.altarLocal}`);
check('the pujari stands on the hall floor, not in it',
  !!anchors.pujari && Math.abs(anchors.pujari.y - anchors.floor) < 0.01,
  anchors.pujari ? `pujari y ${anchors.pujari.y.toFixed(2)}, hall floor ${anchors.floor.toFixed(2)}, terrain ${anchors.ground.toFixed(2)}` : 'no pujari');

/* ---- 9. the interior is its own mesh, and it goes away ---- */
const culled = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const lm = ctx.world.landmarks.interiorMeshes || [];
  const loc = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  /*
   * Standing at ISKCON, the ISKCON interior must be drawn and the ones across
   * town must not. This used to ask that EVERY interior mesh be visible, which
   * was fair when the courtyard was the only one; there are now 36, scattered
   * over four kilometres, and the draw radius is 220 m — so "all of them are
   * up" is the failure, not the pass. Ask it about distance instead.
   */
  const at = (x, z) => {
    ctx.player.position.set(x, 0, z);
    ctx.interior.update(1 / 60, ctx);
    return lm.map((m) => ({
      on: m.mesh.visible,
      d: Math.hypot(m.x - x, m.z - z),
      r: m.r,
    }));
  };
  const near = at(loc.pos[0], loc.pos[1]);
  const far = at(loc.pos[0] + 900, loc.pos[1]);
  const wrong = (rows) => rows.filter((q) => q.on !== (q.d < q.r + 220)).length;
  return {
    count: lm.length,
    nearOn: near.filter((q) => q.on).length,
    farOn: far.filter((q) => q.on).length,
    wrong: wrong(near) + wrong(far),
  };
});
check('an interior is its own mesh, drawn near and dropped from across town',
  culled.count > 0 && culled.nearOn > 0 && culled.farOn < culled.nearOn
  && culled.wrong === 0,
  `${culled.count} interior meshes — ${culled.nearOn} up at ISKCON, `
  + `${culled.farOn} up 900 m away, ${culled.wrong} on the wrong side of the draw radius`);

/* ---- 9b. Srila Prabhupada's samadhi: a room you walk into ---- */
/*
 * "the golden prabhupada deities room present just after the entry on left
 * side is not there". It is a room now, behind the samadhi's front door: walk
 * a body from the corona at the foot of its steps toward the murti with the
 * engine's own collide and standHeight, and it must get up the steps, through
 * the door and onto the room's floor, and the room must know it is inside.
 */
const sam = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx, W = ctx.world;
  const v = ctx.interior.volumes.find((q) => q.room && q.loc.id === 'iskcon-samadhi');
  if (!v) return { found: false };
  const R = 0.42, STEP_UP = 0.52;
  let x = v.door[0], z = v.door[1];
  const g0 = W.groundHeight(x, z);
  let feet = W.standHeight(x, z, g0);
  const startFeet = feet;
  for (let k = 0; k < 260; k++) {
    let vx = v.x - x, vz = v.z - z;
    const d = Math.hypot(vx, vz);
    if (d < 0.5) break;
    vx /= d; vz /= d;
    const q = { x: x + vx * 0.08, y: 0, z: z + vz * 0.08 };
    W.collide(q, R, feet);
    const h = W.standHeight(q.x, q.z, feet);
    if (h === null || h === undefined || h - feet > STEP_UP) break;
    x = q.x; z = q.z; feet = h;
  }
  return {
    found: true,
    left: +Math.hypot(v.x - x, v.z - z).toFixed(2),
    rose: +(feet - startFeet).toFixed(2),
    inside: ctx.interior._contains(v, x, z, 0.82),
    ceilOver: +(v.ceil - feet).toFixed(2),
  };
});
check('the samadhi is a room the game knows about', sam.found, sam.found ? 'iskcon-samadhi' : 'no room volume');
check('you can walk from the forecourt up its steps and into the room', sam.found && sam.left < 1.5 && sam.rose > 1.0,
  sam.found ? `ended ${sam.left} m from the room's middle, ${sam.rose} m up` : '');
check('and once in, the room knows you are inside, under its ceiling', sam.found && sam.inside && sam.ceilOver > 2.4,
  sam.found ? `inside ${sam.inside}, ceiling ${sam.ceilOver} m over the feet` : '');

/* ---- 10. the rickshaw stops at the gate ---- */
const setDown = await page.evaluate(() => {
  const ctx = window.vrindavan.ctx;
  const loc = ctx.data.LOCATIONS.find((l) => l.id === 'iskcon-krishna-balaram');
  const s = ctx.rickshaw._setDown(loc);
  const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
  const dx = s[0] - loc.pos[0], dz = s[1] - loc.pos[1];
  return {
    metres: Math.hypot(dx, dz),
    local: [+(dx * cs + dz * sn).toFixed(1), +(-dx * sn + dz * cs).toFixed(1)],
    onRoad: ctx.world.nearestRoad ? ctx.world.nearestRoad(s[0], s[1], 40).d : null,
  };
});
check('the e-rickshaw sets you down outside the building',
  setDown.metres > 20 && setDown.metres < 60,
  `${setDown.metres.toFixed(0)} m from the centre, local ${setDown.local}, `
  + `${setDown.onRoad === null ? 'road unknown' : setDown.onRoad.toFixed(1) + ' m from a road'}`);

/* ================================================================
 * Walking into a house — the roof has to come off
 *
 * A hut is 5 m across. The follow camera sits 6.8 m back, so standing in one
 * puts the camera outside the building looking at its back wall, and the roof
 * is between you and any view from above. "entering changes the view to the
 * inside home as normal" is the ask, and the way that has always been done is
 * to cut the world off at the ceiling and look down into the room.
 *
 * So: step into a real generated house and check the three things that make
 * that work, then step out and check all three are put back.
 * ================================================================ */
const house = await page.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const sys = ctx.interior;
  const iv = (ctx.world.buildings && ctx.world.buildings.interiors) || [];
  if (!iv.length || !sys) return { none: true, rooms: iv.length, sys: !!sys };

  const rig = ctx.cameraRig;
  const before = { dist: rig.distUser, pitch: rig.pitchTarget, clip: sys.clip ? sys.clip.constant : null };

  // pick a room and stand in the middle of it
  const lot = iv[Math.floor(iv.length / 2)];
  ctx.player.position.set(lot.x, ctx.world.groundHeight(lot.x, lot.z) + 0.1, lot.z);

  /*
   * WAIT FOR THE CONDITION, NOT FOR A NUMBER OF MILLISECONDS.
   *
   * This slept 1400 ms and then asserted. That is fine alone and wrong in the
   * suite: the checks share a machine, the headless browser gets starved of
   * frames, and InteriorSystem only notices where you are standing when it
   * gets a frame to notice it in. The check failed in a six-check run, passed
   * run alone, and failed again in the next six-check run — which reads as
   * flakiness and is really a clock being used as a proxy for progress.
   *
   * Two real frames is all the system needs. Waiting for two real frames is
   * therefore the honest condition, and it costs nothing when the machine is
   * idle.
   */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, budget = 15000) => {
    const t0 = performance.now();
    while (performance.now() - t0 < budget) {
      if (fn()) return true;
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
    return false;
  };
  await until(() => sys.inside);
  // and one more frame so the rig has moved to its inside pose
  await new Promise((r) => requestAnimationFrame(() => r()));

  const io = sys.inside;
  const inside = {
    entered: !!io,
    house: !!(io && io.house),
    name: io ? io.loc.name : null,
    clip: sys.clip ? sys.clip.constant : null,
    ceil: io ? io.ceil : null,
    pitchDeg: rig.pitchTarget * 180 / Math.PI,
    dist: rig.distUser,
    // is the plane actually above the player's head and below the roof?
    headroom: io ? io.ceil - (ctx.player.position.y + 1.7) : null,
    faded: sys._fadeT !== undefined || Number(sys.fade.style.opacity) > 0,
    planes: ctx.renderer.clippingPlanes.length,
  };

  // and back out into the lane
  ctx.player.position.set(lot.x + lot.w * 1.6 + 8, ctx.world.groundHeight(lot.x + lot.w * 1.6 + 8, lot.z) + 0.1, lot.z);
  /*
   * Leaving has to wait for the camera to come back too, not just for the
   * system to drop `inside` — "gives you your own camera back" compares the
   * rig against what it was, and the rig eases rather than snapping.
   */
  await until(() => sys.inside === null
    && Math.abs(rig.distUser - before.dist) < 0.01);
  await wait(60);
  return {
    before, inside,
    out: {
      left: sys.inside === null,
      clip: sys.clip ? sys.clip.constant : null,
      dist: rig.distUser,
      pitchDeg: rig.pitchTarget * 180 / Math.PI,
    },
    rooms: iv.length,
  };
});

if (house.none) {
  check('there are houses to walk into', false,
    `${house.rooms} rooms, interior system ${house.sys ? 'present' : 'missing'}`);
} else {
  check('stepping into a house is recognised as stepping inside',
    house.inside.entered && house.inside.house,
    house.inside.entered ? `"${house.inside.name}"` : 'never triggered');

  check('the roof comes off so you can see the room',
    house.inside.clip !== null && Math.abs(house.inside.clip - house.inside.ceil) < 0.01,
    house.inside.clip === null ? 'no clipping plane installed'
      : `world clipped at ${house.inside.clip.toFixed(2)} m, ceiling ${house.inside.ceil.toFixed(2)} m`);

  check('the cut is above your head, not through it',
    house.inside.headroom !== null && house.inside.headroom > 0.3,
    house.inside.headroom === null ? 'n/a' : `${house.inside.headroom.toFixed(2)} m of headroom`);

  check('the camera looks down into the room',
    house.inside.pitchDeg > 30 && house.inside.dist < 6,
    `${house.inside.pitchDeg.toFixed(0)}° down at ${house.inside.dist.toFixed(1)} m`);

  check('the change is covered by a cut', house.inside.faded, 'fade ran');

  check('the plane is installed once, not added at the door',
    house.inside.planes === 1 && house.before.clip !== null,
    `${house.inside.planes} plane, parked at ${house.before.clip} outside`);

  check('walking out puts the roof back on',
    house.out.left && house.out.clip > 1000,
    house.out.left ? `clip parked at ${house.out.clip}` : 'still reads as inside');

  check('and gives you your own camera back',
    Math.abs(house.out.dist - house.before.dist) < 0.01
    && Math.abs(house.out.pitchDeg - house.before.pitch * 180 / Math.PI) < 0.5,
    `${house.out.dist.toFixed(1)} m at ${house.out.pitchDeg.toFixed(0)}°, `
    + `was ${house.before.dist.toFixed(1)} m at ${(house.before.pitch * 180 / Math.PI).toFixed(0)}°`);
}

/* ================================================================
 * Opening the map from inside a room
 *
 * `_renderAerial` bakes the world from 2400 m up with its OWN camera, so it
 * does not go through the camera rig — which means the per-frame test that
 * parks the clipping plane never sees it. Bake the map while standing in a hut
 * and everything above the hut's ceiling is cut away, which is to say the
 * entire town. The plane has to be parked for the bake the same way the
 * shadows and the lights are.
 * ================================================================ */
const mapped = await page.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const sys = ctx.interior;
  const iv = (ctx.world.buildings && ctx.world.buildings.interiors) || [];
  if (!sys || !sys.clip || !iv.length || !ctx.map || !ctx.map._renderAerial) {
    return { skip: true };
  }

  // stand in a room and let the roof come off
  const lot = iv[Math.floor(iv.length / 3)];
  ctx.player.position.set(lot.x, ctx.world.groundHeight(lot.x, lot.z) + 0.1, lot.z);
  /*
   * Wait for the roof to actually come off, not for 1300 ms.
   *
   * Same fault as the block above and it survived the first fix because the
   * first fix only touched the block above. Under a parallel suite run the
   * browser is starved of frames, the clipping plane is still parked at
   * 100000 when the clock runs out, and the check reports that the map was
   * baked with the roof off — which is the opposite of what happened.
   */
  const t0 = performance.now();
  while (sys.clip.constant > 1000 && performance.now() - t0 < 15000) {
    await new Promise((r) => requestAnimationFrame(() => r()));
  }
  const insideClip = sys.clip.constant;

  // spy on what the plane is doing at the moment the map is actually drawn
  const seen = [];
  const realRender = ctx.renderer.render.bind(ctx.renderer);
  ctx.renderer.render = (scene, cam) => {
    seen.push(sys.clip.constant);
    return realRender(scene, cam);
  };
  try { ctx.map._renderAerial(); } catch (e) { /* reported below */ }
  ctx.renderer.render = realRender;

  return {
    skip: false,
    insideClip,
    renders: seen.length,
    clippedDuring: seen.filter((c) => c < 1000).length,
    after: sys.clip.constant,
  };
});

if (mapped.skip) {
  check('the map is drawn unclipped from inside a room', false, 'could not set up');
} else {
  check('the roof was off when the map was opened',
    mapped.insideClip < 1000,
    `clipped at ${mapped.insideClip.toFixed(2)} m standing in the room`);
  check('but the map itself is drawn with the roofs on',
    mapped.renders > 0 && mapped.clippedDuring === 0,
    `${mapped.clippedDuring} of ${mapped.renders} map render(s) were clipped`);
  check('and the room is still open afterwards',
    mapped.after < 1000,
    `back to ${mapped.after.toFixed(2)} m`);
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed, ${errors.length} console errors`);
if (errors.length) for (const e of errors.slice(0, 6)) console.log('  ! ' + e);
await browser.close();
server.close();
process.exit(passed === results.length && errors.length === 0 ? 0 : 1);
