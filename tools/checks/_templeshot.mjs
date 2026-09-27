import { chromium } from 'playwright';
const IDS = process.argv.slice(2);
const b = await chromium.launch({ args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport:{width:720,height:480} });
await p.goto('http://localhost:8080/', { waitUntil:'networkidle' });
await p.waitForFunction(()=>window.vrindavan?.ctx?.world && window.vrindavan?.ctx?.ui,null,{timeout:220000});
await p.evaluate(async () => {
  const ctx = window.vrindavan.ctx;
  ctx.ui.show('world');
  if (ctx.time) {
    // The phase is recomputed from the real solar position every frame, so
    // setPhase alone gets overwritten and every shot comes out at night.
    ctx.time.setPhase('day', true);
    ctx.time._apply(ctx.data.TIME_OF_DAY.day, true);
    /*
     * Freeze the PHASE, not the whole update.
     *
     * Stubbing `update` also killed the line that keeps the sky dome centred,
     * so the dome stayed parked wherever the player happened to be standing —
     * and these shots put the camera kilometres away from the player. Every
     * picture came back with a black dome across the sky, which is the inside
     * of a 4000 m sphere seen from outside it. The game was fine; the tool was
     * looking at the world from somewhere the world does not follow.
     */
    ctx.time.update = () => {
      const c = ctx.camera;
      if (c && ctx.time.sky) ctx.time.sky.position.set(c.position.x, 0, c.position.z);
    };
  }
  await new Promise(r => setTimeout(r, 900));
});
for (const id of IDS) {
  const info = await p.evaluate((which) => {
    const ctx = window.vrindavan.ctx;
    const loc = ctx.data.LOCATION_BY_ID.get(which);
    if (!loc) return { error: 'no such location' };
    // outside the compound wall, not inside it: the haveli ring stands at
    // d/2 + 7, so r*1.05 put the camera in the courtyard looking at a wall
    // Oblique and above the rooftops. At street level the camera lands inside
    // a neighbour — the town is dense and these temples are meant to be hard to
    // see coming — and a wall 2 m from the lens says nothing about the massing.
    /*
     * Close enough to JUDGE the building.
     *
     * This added the whole of `grounds` — 120 m at Jaipur Mandir — which puts
     * the camera 189 m out and makes every temple a smudge. That framing is
     * right for asking "is the compound there" and useless for asking "does
     * this look like the building", which is what these shots are for now.
     * A quarter of the grounds clears the compound wall and still lets you
     * read a chhajja.
     */
    /*
     * STAND WHERE A PILGRIM STANDS.
     *
     * This camera was h*1.5 + 14 metres up — 44 m over a 20 m temple, at 52 m
     * back. Every shot came out as a near-plan view, which flattens exactly
     * the thing these pictures exist to judge: a temple's MASSING. Jaipur
     * Mandir photographed like a red warehouse roof, and I was about to go
     * and rebuild a building whose real fault was that I was looking at it
     * from a helicopter.
     *
     * A three-quarter view from a little above head height is what every
     * reference photograph of these buildings is, so it is the only framing
     * that can be compared against one. Slightly off-axis, because a dead-on
     * elevation hides the depth too.
     */
    const size = Math.max(loc.build.w, loc.build.d);
    const r = size * 1.25 + loc.build.h * 0.9 + (loc.grounds || 0) * 0.12 + 16;
    const off = loc.rot + 0.42;                    // off the axis, not on it
    const cx = loc.pos[0] + Math.sin(off) * r;
    const cz = loc.pos[1] + Math.cos(off) * r;
    const g = ctx.world.groundHeight(cx, cz);
    const cam = ctx.camera.clone();
    cam.fov = 52; cam.near = 0.1; cam.updateProjectionMatrix();
    /*
     * Height from the VIEWING ANGLE, not from a fixed number of metres.
     *
     * A flat 2.2 + h*0.30 is right at 60 m and useless at 150: Jaipur
     * Mandir's grounds pushed the camera far enough out that head height put
     * the lens inside a tree, and the shot came back as a green wall. Tying
     * the height to a constant 18 degrees of look-down keeps the same
     * three-quarter framing at every distance and clears whatever is
     * standing between here and the building.
     *
     * 18 degrees is still a photograph a person could have taken, standing
     * on a roof across the lane. Above roughly 30 it becomes a plan view and
     * stops showing massing, which is the whole reason for these pictures.
     */
    cam.position.set(cx, g + Math.max(2.4 + loc.build.h * 0.22, r * 0.32), cz);
    cam.lookAt(loc.pos[0], g + loc.build.h * 0.52, loc.pos[1]);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
    return { id: which, kind: loc.build.kind, name: loc.name };
  }, id);
  console.log(JSON.stringify(info));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `docs/shots/temple-${id}.png`, timeout: 90000 });

  /*
   * THE GATE VIEW — standing in the lane, at eye height, facing the front.
   *
   * The three-quarter view is right for massing and useless for a building
   * whose neighbours are taller than it is. Gopishwar Mahadev photographed
   * from 40 m out is a picture of somebody else's roof, which is exactly
   * what the survey says a lane temple looks like from 40 m out — and
   * exactly why every reference photograph of one is taken from across the
   * lane instead.
   *
   * So: stand where a person stands, 9 m off the front, 1.7 m up, and look
   * slightly up at the gate rather than down at the roof.
   */
  await p.evaluate((which) => {
    const ctx = window.vrindavan.ctx;
    const loc = ctx.data.LOCATION_BY_ID.get(which);
    if (!loc) return;
    /*
     * Stand exactly on the DARSHAN ANCHOR — max(w,d)/2 + 5.5 along the
     * facing, which is the spot LandmarkGenerator already computes for the
     * player to stand on and which is therefore known to be clear. Picking
     * my own distance put the lens inside the neighbour's wall, which in a
     * town this dense is the default outcome rather than bad luck.
     */
    const r = Math.max(loc.build.w, loc.build.d) * 0.5 + 5.5;
    const cx = loc.pos[0] + Math.sin(loc.rot) * r;
    const cz = loc.pos[1] + Math.cos(loc.rot) * r;
    const g = ctx.world.groundHeight(cx, cz);
    const cam = ctx.camera.clone();
    cam.fov = 66; cam.near = 0.05; cam.updateProjectionMatrix();
    cam.position.set(cx, g + 1.7, cz);
    cam.lookAt(loc.pos[0], g + Math.min(loc.build.h * 0.5, 4.2), loc.pos[1]);
    ctx.camera = cam;
    ctx.renderer.render(ctx.scene, cam);
  }, id);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `docs/shots/gate-${id}.png`, timeout: 90000 });
}
await b.close(); process.exit(0);
