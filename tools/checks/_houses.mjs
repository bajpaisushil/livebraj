/**
 * CAN YOU WALK INTO A HOUSE?
 *
 * "am unable to enter any house like pokemon rpg as it should"
 *
 * interior.mjs has always put the player in the middle of a room with
 * position.set() and asserted that the room noticed. A house whose doorway is
 * blocked passes that test perfectly. So this one does what the player does:
 * stand in the street three metres in front of the door, walk straight at it,
 * and see whether they end up inside.
 *
 * Movement replicates Player._updateMovement exactly:
 *   step, world.collide(p, 0.42, feet), crowd.collideAgents(p, 0.42),
 *   world.standHeight(p.x, p.z, feet)
 * and when a walk is stopped it names the blocker the way the ISKCON probe
 * finally learned to: at the point the body TRIED to reach, with collide()'s
 * own `radius + 6` query and its own `top <= feet + STEP_UP` skip.
 */
import { chromium } from 'playwright';

const SAMPLE = +(process.argv[2] || 120);

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.vrindavan?.ctx?.world?.buildings?.interiors?.length,
  null, { timeout: 220000 });

const out = await p.evaluate((SAMPLE) => {
  const ctx = window.vrindavan.ctx, W = ctx.world, C = ctx.crowd;
  const R = 0.42, STEP_UP = 0.52;
  const all = ctx.world.buildings.interiors;
  const pick = [];
  for (let i = 0; i < all.length && pick.length < SAMPLE; i += Math.max(1, Math.floor(all.length / SAMPLE))) pick.push(all[i]);

  const blockersAt = (x, z, feet) => {
    const step = feet + STEP_UP;
    return (W.grid.query(x, z, R + 6) || []).filter((c) => {
      if (c.standOnly) return false;
      if (c.top !== undefined && c.top <= step) return false;
      return W._overlaps(c, x, z, R);
    }).map((c) => ({
      tag: c.tag || '(untagged)', type: c.type,
      size: c.type === 'box' ? [+(c.hw * 2).toFixed(2), +(c.hd * 2).toFixed(2)] : +c.r.toFixed(2),
      top: c.top === undefined ? 'inf' : +c.top.toFixed(2),
    }));
  };

  const rows = [];
  for (const lot of pick) {
    if (!lot.doorAt) { rows.push({ ok: false, why: 'no doorAt' }); continue; }
    const [dx, dz] = lot.doorAt;
    // outward normal: from the room centre through the door
    let nx = dx - lot.x, nz = dz - lot.z;
    const L = Math.hypot(nx, nz) || 1; nx /= L; nz /= L;
    let x = dx + nx * 3.0, z = dz + nz * 3.0;
    let feet = W.standHeight(x, z, W.groundHeight(x, z));
    if (feet === null || feet === undefined) { rows.push({ ok: false, why: 'no ground outside the door' }); continue; }

    // is the START itself clear? a door that opens onto a wall is its own bug
    const startBlocked = blockersAt(x, z, feet);

    let lastWant = null, why = null, stalls = 0;
    const target = { x: lot.x, z: lot.z };
    for (let k = 0; k < 160; k++) {
      let vx = target.x - x, vz = target.z - z;
      const d = Math.hypot(vx, vz);
      if (d < 0.6) break;
      vx /= d; vz /= d;
      const wx = x + vx * 0.09, wz = z + vz * 0.09;
      const q = { x: wx, y: 0, z: wz };
      W.collide(q, R, feet);
      if (C && C.collideAgents) C.collideAgents(q, R);
      if (Math.hypot(q.x - wx, q.z - wz) > 0.02) lastWant = { x: wx, z: wz, feet };
      const h = W.standHeight(q.x, q.z, feet);
      if (h === null || h === undefined) { why = { r: 'no floor' }; break; }
      if (h - feet > STEP_UP) { why = { r: 'riser too tall', rise: +(h - feet).toFixed(2) }; break; }
      const moved = Math.hypot(q.x - x, q.z - z);
      x = q.x; z = q.z; feet = h;
      if (moved < 0.01) { if (++stalls > 25) break; } else stalls = 0;
    }
    const insideBy = Math.hypot(x - lot.x, z - lot.z);
    // "inside" = past the door plane, toward the room
    const depthPastDoor = (dx - x) * nx + (dz - z) * nz;
    const ok = depthPastDoor > 0.8;
    if (!ok && !why) {
      const at = lastWant || { x, z, feet };
      why = { r: 'stopped', blockers: blockersAt(at.x, at.z, at.feet).slice(0, 4),
        distFromDoor: +Math.hypot(at.x - dx, at.z - dz).toFixed(2) };
    }
    rows.push({ ok, depthPastDoor: +depthPastDoor.toFixed(2), insideBy: +insideBy.toFixed(2),
      startBlocked: startBlocked.length ? startBlocked.slice(0, 3) : null, why,
      kind: lot.roomKind, w: +lot.w.toFixed(1), d: +lot.d.toFixed(1), doorW: lot.doorW });
  }
  return { total: all.length, tested: rows.length, rows };
}, SAMPLE);

const okN = out.rows.filter((r) => r.ok).length;
const tally = {};
for (const r of out.rows) {
  if (r.ok) continue;
  let k;
  if (r.why && r.why.blockers && r.why.blockers.length) {
    k = 'blocked by ' + r.why.blockers.map((bb) => bb.tag + ' ' + (Array.isArray(bb.size) ? bb.size.join('x') : 'r' + bb.size) + ' top ' + bb.top).join(' + ');
  } else if (r.why) k = r.why.r + (r.why.rise !== undefined ? ' ' + r.why.rise : '');
  else k = 'unknown';
  tally[k] = (tally[k] || 0) + 1;
}
console.log('HOUSES ' + JSON.stringify({
  interiorsInWorld: out.total, tested: out.tested,
  walkedIn: okN, failed: out.tested - okN,
  failureKinds: Object.fromEntries(Object.entries(tally).sort((a, bb) => bb[1] - a[1]).slice(0, 12)),
  startBlocked: out.rows.filter((r) => r.startBlocked).length,
  sampleFailure: out.rows.find((r) => !r.ok) || null,
}, null, 1));
await b.close();
process.exit(0);
