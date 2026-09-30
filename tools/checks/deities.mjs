/**
 * Is every Deity on Their own altar?
 *
 * This exists because the darshan photographs were wrong twice, and both times
 * the numbers I had looked fine.
 *
 *   1. Seven temples were solid blocks with no inside, so the photographs were
 *      sealed in the masonry.
 *   2. `DeityImages` placed panels with a hardcoded 3.4 m sideways gap while
 *      Krishna Balaram's three bays are 7.2 m either side of centre, so the
 *      right altar's photograph hung on the PIER between two bays — reported
 *      as "the deities are showing in the right wall not in main area".
 *
 * The second one also had a mirrored lateral axis: (cos yaw, -sin yaw) against
 * the builders' (cos rot, sin rot). Those agree only at rot = 0, so the left
 * and right altars would have swapped at any temple not facing due north — at
 * ISKCON that puts Radha-Shyamasundara on Gaura-Nitai's altar. Nothing catches
 * a fault like that except asking which side the panel is actually on, so that
 * is what this does.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(process.cwd(), 'client');
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2' };
const server = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(ROOT,u==='/'?'index.html':u);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
await new Promise(r=>server.listen(8805,r));

const res=[]; const check=(n,pass,d)=>{res.push(pass);console.log(`  ${pass?'PASS':'FAIL'}  ${n}${d?'  — '+d:''}`);};
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:400,height:300} });
await p.goto('http://localhost:8805/',{waitUntil:'networkidle'});
await p.waitForFunction(()=>window.vrindavan?.ctx?.player && window.vrindavan?.ctx?.ui,null,{timeout:200000});
await p.evaluate(()=>window.vrindavan.ctx.ui.show('world'));
await p.waitForTimeout(1000);

const r = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  // the manifest is not on ctx.data — it is imported straight by DeityImages
  const { DEITIES } = await import('/src/content/deities.js');
  const THREE = await import('three');
  const out = { panels: [], manifest: [], occluded: [], sides: [] };

  /*
   * ASK THIS QUESTION DURING DARSHAN HOURS.
   *
   * "Nothing stands between the devotee and the Deity" is only true while the
   * temple is open. After 21:00 Braj time a curtain stands between them on
   * purpose, and this check has no business calling that a fault — it ran at
   * 21:01 IST and reported Night:radha-damodar as an obstruction, which is
   * the night veil doing exactly its job.
   *
   * So the clock is pinned to the middle of the afternoon for the sightline
   * probe and put back afterwards. A check that passes by day and fails by
   * night is not testing the thing it names.
   */
  const _liveWas = ctx.live && ctx.live.vrindavanTime
    ? ctx.live.vrindavanTime.bind(ctx.live) : null;
  const _settingWas = ctx.state.settings.liveTime;
  if (ctx.live) ctx.live.vrindavanTime = () => ({ decimal: 13, hour: 13, minute: 0, label: '13:00' });
  ctx.state.settings.liveTime = true;
  if (ctx.curtains && ctx.curtains._applyNight) ctx.curtains._applyNight(ctx);

  for (const [id, entry] of Object.entries(DEITIES || {})) {
    for (const a of entry.altars || []) {
      out.manifest.push({ id, name: a.name, side: a.side || 0, hasFile: !!a.file });
    }
  }

  for (const rec of ctx.deities.panels || []) {
    const id = rec.loc.id;
    const anchor = ctx.world.anchorFor(id);
    const side = rec.altar.side || 0;
    const known = (anchor.altars || []).find((x) => x.side === side);
    const target = known || anchor.altar;
    const m = rec.mesh.position;
    const img = rec.mat.map && rec.mat.map.image;
    const geo = rec.mesh.geometry.parameters;

    out.panels.push({
      id, side, name: rec.altar.name,
      visible: rec.mesh.visible,
      published: !!known,
      // how far from the altar it belongs to, on the ground plane
      fromAltar: +Math.hypot(m.x - target.x, m.z - target.z).toFixed(2),
      // the plane must carry the photograph's own shape, not a fixed rectangle
      imgAspect: img ? +(img.width / img.height).toFixed(3) : null,
      panelAspect: +(geo.width / geo.height).toFixed(3),
    });

    // which side of the altar row is it on, from where a devotee stands?
    if (anchor.darshan && side !== 0) {
      const centre = (anchor.altars || []).find((x) => x.side === 0) || anchor.altar;
      const fx = centre.x - anchor.darshan.x, fz = centre.z - anchor.darshan.z;
      const len = Math.hypot(fx, fz) || 1;
      // right = forward x up, for a devotee facing the altars
      const rx = -fz / len, rz = fx / len;
      const d = (m.x - centre.x) * rx + (m.z - centre.z) * rz;
      out.sides.push({ id, side, name: rec.altar.name, signedRight: +d.toFixed(2),
                       correct: Math.sign(d) === Math.sign(side) });
    }

    /*
     * Can a devotee SEE the Deity?
     *
     * This has to be a raycast against the rendered meshes, not an `isClear`
     * against the collider grid. `isClear` answers "can you WALK here", and the
     * two differ exactly where it matters: Krishna Balaram's altar platform is
     * railed off, as the real one is, so the collider grid says blocked while
     * the eye sees straight over the rail. The first version of this check
     * failed on that rail and the failure was its own.
     *
     * Measured from in front of THIS altar, not the temple's single darshan
     * anchor: at Krishna Balaram that anchor faces the CENTRE bay, and a line
     * from there to the right bay runs diagonally through the jambs between
     * them — true of the real temple too. You stand in front of the altar you
     * have come to see.
     */
    if (anchor.darshan) {
      const centre0 = (anchor.altars || []).find((x) => x.side === 0) || anchor.altar;
      const ox = target.x - centre0.x, oz = target.z - centre0.z;
      const eye = new THREE.Vector3(anchor.darshan.x + ox, m.y, anchor.darshan.z + oz);
      const dir = new THREE.Vector3(m.x - eye.x, 0, m.z - eye.z);
      const dist = dir.length();
      dir.normalize();
      const ray = new THREE.Raycaster(eye, dir, 0.05, dist - 0.02);
      const hit = ray.intersectObjects(ctx.scene.children, true)
        .filter((h) => h.object.visible && h.object !== rec.mesh && !/^Deity:/.test(h.object.name || ''))[0];
      if (hit) {
        out.occluded.push({ id, side, name: rec.altar.name, by: hit.object.name || hit.object.type,
                            blockedAt: +hit.distance.toFixed(1), dist: +dist.toFixed(1) });
      }
    }
  }
  // the sightline probe is done; give the town its own clock back
  if (_liveWas && ctx.live) ctx.live.vrindavanTime = _liveWas;
  ctx.state.settings.liveTime = _settingWas;
  if (ctx.curtains && ctx.curtains._applyNight) ctx.curtains._applyNight(ctx);

  /*
   * You must not be able to walk into the Deities, and EVERY altar must be
   * veiled at night — not just the temple's middle one.
   *
   * Krishna Balaram has three altars 14.4 m apart, and the night veil was
   * generated once per TEMPLE from `anchor.altar`, which is the centre one. So
   * the brothers were curtained at night and Gaura-Nitai and
   * Radha-Shyamasundara were not. And nothing stopped you walking through any
   * of it: "curtains only cover the centre deities in iskcon ... and i am able
   * to pass through as well."
   */
  const veils = [];
  ctx.scene.traverse((o) => { if (o.name && o.name.startsWith('Night:')) veils.push(o.name); });
  out.veils = veils.length;
  out.altarsTotal = 0; out.walkedInto = 0; out.unveiled = 0;
  for (const loc of ctx.data.LOCATIONS) {
    if (loc.type !== 'temple') continue;
    const a = ctx.world.anchorFor(loc.id);
    if (!a || !a.altar) continue;
    const seats = (a.altars && a.altars.length) ? a.altars : [a.altar];
    const yaw = a.darshan ? Math.atan2(a.darshan.x - a.altar.x, a.darshan.z - a.altar.z) : loc.rot;
    const mine = veils.filter((n) => n === 'Night:' + loc.id || n.startsWith('Night:' + loc.id + ':'));
    if (mine.length < seats.length) out.unveiled += seats.length - mine.length;
    for (const seat of seats) {
      out.altarsTotal++;
      const pt = { x: seat.x + Math.sin(yaw) * 6, y: 0, z: seat.z + Math.cos(yaw) * 6 };
      let best = 6;
      for (let k = 0; k < 90; k++) {
        pt.x -= Math.sin(yaw) * 0.12; pt.z -= Math.cos(yaw) * 0.12;
        ctx.world.collide(pt, 0.42, ctx.world.groundHeight(pt.x, pt.z));
        best = Math.min(best, Math.hypot(pt.x - seat.x, pt.z - seat.z));
      }
      if (best < 0.7) out.walkedInto++;
    }
  }

  return out;
});

const shipped = r.manifest.filter((m) => m.hasFile);
check('every shipped photograph became a panel', r.panels.length === shipped.length,
  r.panels.length + ' panels for ' + shipped.length + ' shipped files (' + r.manifest.length + ' altars named)');
check('no panel for an altar with no photograph', r.panels.length <= shipped.length,
  'named-but-empty slots: ' + r.manifest.filter((m) => !m.hasFile).map((m) => m.name).join(', '));
check('every panel is visible', r.panels.every((x) => x.visible),
  r.panels.filter((x) => !x.visible).map((x) => x.name).join(', ') || 'all ' + r.panels.length);

const stray = r.panels.filter((x) => x.fromAltar > 1.2);
check('every panel stands at its own altar', stray.length === 0,
  stray.length ? stray.map((x) => x.name + ' ' + x.fromAltar + ' m away').join('; ')
               : r.panels.map((x) => x.name.replace(/^Sri Sri /, '') + ' ' + x.fromAltar + ' m').join(', '));

const squashed = r.panels.filter((x) => x.imgAspect && Math.abs(x.imgAspect - x.panelAspect) > 0.06);
check('no photograph is stretched', squashed.length === 0,
  squashed.length ? squashed.map((x) => x.name + ' img ' + x.imgAspect + ' vs plane ' + x.panelAspect).join('; ')
                  : r.panels.map((x) => x.panelAspect).join(', '));

const wrongSide = r.sides.filter((x) => !x.correct);
check('left and right altars are not swapped', wrongSide.length === 0,
  r.sides.length ? r.sides.map((x) => x.name.replace(/^Sri Sri /, '') + ' side ' + x.side + ' -> ' + x.signedRight + ' m right').join('; ')
                 : 'no off-centre altar carries a photograph yet');

check('nothing stands between the devotee and the Deity', r.occluded.length === 0,
  r.occluded.length ? r.occluded.map((x) => x.name + ' blocked by ' + x.by + ' at ' + x.blockedAt + ' m of a ' + x.dist + ' m sightline').join('; ')
                    : 'clear at all ' + r.panels.length);

check('you cannot walk into the Deities', r.walkedInto === 0,
  `${r.walkedInto} of ${r.altarsTotal} altars let you reach Them`);
check('every altar is veiled at night, not just the middle one', r.unveiled === 0,
  `${r.veils} veils for ${r.altarsTotal} altars`
  + (r.unveiled ? `, ${r.unveiled} left uncovered` : ''));

/* ================================================================
 * The pujari, and whether he is doing anything
 *
 * "A sanctum with a murti in it and nobody tending it reads as a museum case."
 * So every temple gets a priest at its altar, the nearest few of them actually
 * circle a lamp, and — added because the temples now keep real hours — none of
 * them does it behind a drawn curtain at two in the morning.
 * ================================================================ */
const pujari = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  const rs = ctx.ritual, cu = ctx.curtains;
  if (!rs) return { none: true };
  const temples = ctx.data.LOCATIONS.filter((l) => l.type === 'temple');
  const missing = temples.filter((l) => !rs.rituals.some((r) => r.loc.id === l.id))
    .map((l) => l.id);

  // stand in front of a pujari and watch the lamp move
  const target = rs.rituals.find((r) => r.loc.id === 'iskcon-krishna-balaram') || rs.rituals[0];
  ctx.player.position.set(target.group.position.x + 6, target.group.position.y, target.group.position.z);

  const run = (shut, steps) => {
    if (cu) cu.shut = shut;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < steps; i++) {
      rs.update(1 / 60, ctx);
      lo = Math.min(lo, target.armPivot.rotation.x);
      hi = Math.max(hi, target.armPivot.rotation.x);
    }
    return { swing: hi - lo, lamp: target.light ? target.light.intensity : null, active: target.active };
  };

  const open = run(false, 400);      // a full turn of the lamp takes ~5.5 s
  const night = run(true, 400);
  if (cu) cu.shut = false;

  return {
    temples: temples.length, priests: rs.rituals.length, missing,
    open, night,
  };
});

if (pujari.none) {
  check('there is a pujari at the altar', false, 'no ritual system');
} else {
  check('every temple has a pujari at its altar', pujari.missing.length === 0,
    `${pujari.priests} pujaris for ${pujari.temples} temples`
    + (pujari.missing.length ? `, missing at ${pujari.missing.join(', ')}` : ''));

  check('he is performing arti, not standing there',
    pujari.open.active && pujari.open.swing > 1.0 && pujari.open.lamp > 1,
    `the lamp swings ${pujari.open.swing.toFixed(2)} rad and burns at `
    + `${pujari.open.lamp === null ? 'n/a' : pujari.open.lamp.toFixed(1)}`);

  check('and he stops when the temple shuts for the night',
    !pujari.night.active && pujari.night.swing < 0.6 && pujari.night.lamp < 0.4,
    `arms settle to ${pujari.night.swing.toFixed(2)} rad, lamp down to `
    + `${pujari.night.lamp === null ? 'n/a' : pujari.night.lamp.toFixed(2)}`);
}

/* ================================================================
 * The darshan timings — 4am to 9pm, every boundary
 *
 * Reported as "its more than 4am still curtains lock". The hours themselves
 * turned out to be right at every boundary, but nothing was checking them, so
 * the only way to know was to mock the clock by hand — which is not something
 * anyone should have to do to answer "is the temple open".
 *
 * Two separate things are asserted, because two separate things were wrong:
 * the veil across the Deities, and Bihari Ji's own minute-by-minute curtain,
 * which was cycling all night behind the veil in a temple that was shut.
 * ================================================================ */
const hours = await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx, cu = ctx.curtains;
  if (!cu) return { ok: false, why: 'no curtain system' };
  const orig = ctx.live.vrindavanTime.bind(ctx.live);
  const rows = [];
  for (const h of [0, 3.0, 3.99, 4.0, 4.5, 9, 15, 20.99, 21.0, 23.5]) {
    ctx.live.vrindavanTime = () => ({ decimal: h, hour: Math.floor(h), minute: 0, label: String(h) });
    const shut = cu._shutNow(ctx);
    cu._applyNight(ctx);
    // and step the sliding curtain a good while, to see whether it cycles
    /*
     * Let it SETTLE before measuring. Crossing into a shut hour while the
     * curtain is open is a curtain being drawn — real movement, and correct —
     * so sampling from the instant of the change measures the closing, not the
     * cycling. What is being asked is whether it keeps going afterwards.
     */
    let moved = 0;
    if (cu.leaves.length) {
      for (let i = 0; i < 60 * 4; i++) cu.update(1 / 60, ctx);
      const a = cu.leaves[0].mesh.position.clone();
      for (let i = 0; i < 60 * 40; i++) cu.update(1 / 60, ctx);
      moved = cu.leaves[0].mesh.position.distanceTo(a);
    }
    rows.push({ h, shut, veiled: cu.night.filter((m) => m.visible).length, moved: +moved.toFixed(2) });
  }
  ctx.live.vrindavanTime = orig;
  cu._applyNight(ctx);
  return { ok: true, rows, veils: cu.night.length, leaves: cu.leaves.length };
});

if (!hours.ok) {
  check('the temples keep 4am to 9pm', false, hours.why);
} else {
  const want = (h) => h >= 21 || h < 4;
  const wrong = hours.rows.filter((r2) => r2.shut !== want(r2.h));
  check('the temples keep 4am to 9pm', wrong.length === 0,
    wrong.length
      ? wrong.map((r2) => `${r2.h}h was ${r2.shut ? 'shut' : 'open'}`).join(', ')
      : 'shut at 0/3/3.99/21/23.5, open at 4/4.5/9/15/20.99');

  const veilWrong = hours.rows.filter((r2) => (r2.veiled > 0) !== r2.shut);
  check('and every altar is veiled exactly when they are', veilWrong.length === 0,
    veilWrong.length
      ? veilWrong.map((r2) => `${r2.h}h: ${r2.veiled} veils, shut=${r2.shut}`).join('; ')
      : `all ${hours.veils} veils follow the hours`);

  /*
   * Banke Bihari's curtain is drawn and reopened every few minutes DURING
   * darshan — that is the single most distinctive thing about the temple. It
   * was doing it all night as well, behind the night veil, in a temple that
   * was shut and had nobody in it to pull the rope.
   */
  const nightCycling = hours.rows.filter((r2) => r2.shut && r2.moved > 0.05);
  const dayStill = hours.rows.filter((r2) => !r2.shut && r2.moved <= 0.05);
  check('Bihari Ji\'s curtain draws during darshan and not at 3am',
    nightCycling.length === 0 && dayStill.length === 0,
    nightCycling.length ? `cycling while shut at ${nightCycling.map((q) => q.h + 'h').join(', ')}`
      : dayStill.length ? `never moved while open at ${dayStill.map((q) => q.h + 'h').join(', ')}`
        : `${hours.leaves} leaves, still at night and drawing by day`);
}

console.log('');
const passed=res.filter(Boolean).length;
console.log(`${passed}/${res.length} passed`);
await b.close(); server.close();
process.exit(passed===res.length ? 0 : 1);
