/**
 * RitualSystem — the pujari, and the arti he is performing.
 *
 * A sanctum with a murti in it and nobody tending it reads as a museum case.
 * What makes a temple feel like a temple is that something is always going on:
 * a priest circling a lamp, a bell being rung, the smoke going up.
 *
 * Only the nearest few temples animate. Everything beyond that is a static
 * figure, because a town with twenty-four temples cannot afford twenty-four
 * running rituals and you would never see them anyway.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { rngAt } from '../../engine/math/Random.js';
import { damp, TAU } from '../../engine/math/MathUtils.js';

const ACTIVE_RANGE = 70;      // metres — beyond this the pujari simply stands
const ACTIVE_MAX = 3;         // how many rituals may animate at once

const _v = new THREE.Vector3();

export class RitualSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'Rituals';
    ctx.scene.add(this.group);

    this.rituals = [];
    this._t = 0;
    this._build();
    console.info(`[ritual] ${this.rituals.length} pujaris at the altars`);
  }

  _build() {
    const ctx = this.ctx;

    for (const loc of ctx.data.LOCATIONS) {
      if (loc.type !== 'temple') continue;
      const anchor = ctx.world.anchorFor(loc.id);
      if (!anchor) continue;

      const rng = rngAt('pujari-' + loc.id);
      const g = new THREE.Group();

      // he stands to one side of the altar, facing it, as a priest actually does
      const side = rng() < 0.5 ? -1 : 1;
      const cs = Math.cos(loc.rot), sn = Math.sin(loc.rot);
      const px = anchor.altar.x + cs * 1.5 * side;
      const pz = anchor.altar.z - sn * 1.5 * side;
      // the floor he is standing ON, which stops being the terrain the moment a
      // hall is raised over it — Krishna Balaram's altars are five risers up
      // from a sunken court, and the terrain height would bury him to the knee
      const ground = anchor.floor !== undefined
        ? anchor.floor : ctx.world.groundHeight(px, pz);

      g.position.set(px, ground, pz);
      g.rotation.y = Math.atan2(anchor.altar.x - px, anchor.altar.z - pz);

      // the priest: dhoti, bare chest with a sacred thread, tilak
      const b = new MeshBuilder();
      const skin = 0xc99464;
      const cloth = 0xf2e8d4;
      b.prism(0, 0, 0, 0.11, 0.11, 0.15, 0.15, 0.82, cloth);              // legs as a dhoti
      b.prism(0, 0.82, 0, 0.28, 0.18, 0.37, 0.22, 0.46, skin);            // torso
      b.prism(0.02, 1.0, 0.08, 0.03, 0.03, 0.03, 0.03, 0.30, cloth);      // sacred thread
      b.bevelBox(0, 1.30, 0, 0.19, 0.24, 0.20, skin, 0, 0.3);             // head
      b.box(0, 1.44, -0.02, 0.2, 0.06, 0.2, 0x241a12);                     // sikha-shaved crown
      b.box(0, 1.38, 0.10, 0.02, 0.07, 0.01, 0xd8c8a0);                    // tilak
      const body = b.toMesh('pujari', { castShadow: !!ctx.quality.shadows });
      body.matrixAutoUpdate = false;
      body.updateMatrix();
      g.add(body);

      // the arm that carries the lamp, as its own pivot so it can circle
      const armPivot = new THREE.Group();
      armPivot.position.set(0.22, 1.12, 0);
      const ab = new MeshBuilder();
      ab.prism(0, -0.30, 0, 0.07, 0.07, 0.095, 0.095, 0.30, skin);
      const arm = ab.toMesh('pujari-arm', {});
      arm.matrixAutoUpdate = false;
      arm.updateMatrix();
      armPivot.add(arm);

      // the lamp itself: a brass tray with five flames
      const lb = new MeshBuilder();
      lb.box(0, 0, 0, 0.18, 0.05, 0.18, 0xb8873b);
      lb.box(0, 0.05, 0, 0.07, 0.06, 0.07, 0xc9a03c);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        lb.box(Math.cos(a) * 0.06, 0.09, Math.sin(a) * 0.06, 0.035, 0.07, 0.035, 0xffb43c);
      }
      const lamp = lb.toMesh('arti-lamp', {});
      lamp.material.emissive = new THREE.Color(0xff9a2c);
      lamp.material.emissiveIntensity = 0.9;
      lamp.position.set(0, -0.34, 0.06);
      lamp.matrixAutoUpdate = true;
      armPivot.add(lamp);
      g.add(armPivot);

      // a small warm light that rides with the lamp, on the nearest temples only
      let light = null;
      if (ctx.quality.templeLights) {
        light = new THREE.PointLight(0xffa838, 0, 7, 2);
        light.position.copy(lamp.position);
        armPivot.add(light);
      }

      this.group.add(g);
      this.rituals.push({
        loc, group: g, armPivot, lamp, light,
        phase: rng() * TAU,
        active: false,
        bellAt: 4 + rng() * 8,
      });
    }
  }

  update(dt, ctx) {
    const p = ctx.player && ctx.player.position;
    if (!p) return;
    this._t += dt;

    /*
     * Arti stops when the temple does.
     *
     * The night veil goes across every altar at 9pm Braj time and comes back at
     * mangala arti, and the pujari keeps the same hours: the lamp goes out, the
     * bell stops, and he stands. Anything else has him offering a lamp to a
     * curtain.
     */
    const shut = !!(ctx.curtains && ctx.curtains.shut);

    // pick the handful worth animating
    let active = 0;
    for (const r of this.rituals) {
      const d = Math.hypot(r.group.position.x - p.x, r.group.position.z - p.z);
      const want = !shut && d < ACTIVE_RANGE && active < ACTIVE_MAX;
      if (want) active++;
      r.active = want;
      r.group.visible = d < ctx.quality.drawDistance;

      if (!r.group.visible) continue;

      if (want) {
        // the arti circle: a slow vertical loop in front of the deity, the way
        // the lamp is actually offered
        r.phase += dt * 1.15;
        const a = r.phase;
        r.armPivot.rotation.x = -0.55 + Math.sin(a) * 0.85;
        r.armPivot.rotation.z = Math.cos(a) * 0.42;
        if (r.light) r.light.intensity = damp(r.light.intensity, 2.4, 4, dt);

        // and a bell, now and then
        r.bellAt -= dt;
        if (r.bellAt <= 0) {
          r.bellAt = 16 + Math.random() * 26;
          ctx.bus.emit('sfx', { name: 'bell', position: r.group.position });
        }
      } else {
        // at rest, hands lowered
        r.armPivot.rotation.x = damp(r.armPivot.rotation.x, -0.1, 3, dt);
        r.armPivot.rotation.z = damp(r.armPivot.rotation.z, 0, 3, dt);
        if (r.light) r.light.intensity = damp(r.light.intensity, 0, 4, dt);
      }
    }
  }

  dispose() {
    this.ctx.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
