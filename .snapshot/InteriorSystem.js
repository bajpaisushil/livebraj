/**
 * InteriorSystem — crossing the threshold into a temple.
 *
 * Vice City made entering a building a moment: a glowing corona at the door, a
 * fade, and then you were somewhere else with its own sound. That moment is
 * what we want. What we do not want is its loading screen, because Vrindavan
 * should never stop being one continuous place.
 *
 * So the interiors are built in the same world and you simply walk in — but
 * everything that made it feel like a transition is still staged:
 *
 *   - a warm corona on the floor of every temple doorway, pulsing slowly
 *   - a short vignette as you pass through, not a cut
 *   - the street closing off: outside ambience ducks away, the temple drone and
 *     the bells come up
 *   - the lamps lifting, the sun falling off, the air going still
 *   - the camera drawing in, because the hall is not a street
 *   - the temple's name and its deity, the way Vice City named its interiors
 *
 * Walking back out reverses all of it. There is no load either way.
 */

import * as THREE from 'three';
import { MeshBuilder } from '../../engine/render/MeshBuilder.js';
import { damp } from '../../engine/math/MathUtils.js';
import { ENTERABLE } from './LandmarkGenerator.js';

const ENTER_MARGIN = 0.82;      // fraction of the footprint that counts as inside
const EXIT_MARGIN = 0.96;       // wider, so standing in the doorway does not flicker

/** Beyond this, an interior's own mesh is dropped entirely. */
const INTERIOR_DRAW = 220;

const _local = new THREE.Vector3();

export class InteriorSystem {
  constructor(ctx) {
    this.ctx = ctx;
    this.volumes = [];
    this.inside = null;
    this._t = 0;
    this.blend = 0;

    /**
     * How the lighting reads inside, published for TimeOfDay to fold into its
     * targets. See `_grade` — this object is mutated in place every frame and
     * read by TimeOfDay.update, so nothing else should hold a reference to it.
     */
    this.grade = { sun: 1, ambient: 1, fog: 1, tint: INTERIOR_FOG, tintK: 0 };

    // interiors that are their own mesh, so they can be dropped when far away
    const lm = ctx.world && ctx.world.landmarks;
    this.meshes = (lm && lm.interiorMeshes) || [];

    this._buildVolumes();
    this._buildMarkers();
    this._buildOverlay();
  }

  /* ================================================================
   * Volumes
   * ================================================================ */
  _buildVolumes() {
    const built = (this.ctx.world.landmarks && this.ctx.world.landmarks.interiors) || {};
    for (const loc of this.ctx.data.LOCATIONS) {
      // A builder that authored its own interior also says where its threshold
      // is, and that is not the same as its footprint: Krishna Balaram's
      // loc.build is the 54 x 66 m walled PLOT, so the footprint test used to
      // fire out in the forecourt beside the samadhi with the vignette, the
      // name card and the camera pull all going off in the open air.
      const vol = built[loc.id];
      if (!vol && !ENTERABLE.has(loc.build.kind)) continue;
      const anchor = this.ctx.world.anchorFor(loc.id);
      this.volumes.push({
        loc,
        x: vol ? vol.x : loc.pos[0], z: vol ? vol.z : loc.pos[1],
        hw: vol ? vol.hw : loc.build.w * 0.5,
        hd: vol ? vol.hd : loc.build.d * 0.5,
        rot: loc.rot,
        cos: Math.cos(-loc.rot), sin: Math.sin(-loc.rot),
        anchor,
        door: vol ? vol.door : null,
        open: vol ? !!vol.open : false,
      });
    }
    // house interiors: shops, homes and dharamshalas marked enterable by the
    // building generator. Same threshold, smaller rooms, no deity.
    const houses = (this.ctx.world.buildings && this.ctx.world.buildings.interiors) || [];
    for (const lot of houses) {
      this.volumes.push({
        loc: {
          id: 'house-' + Math.round(lot.x) + '-' + Math.round(lot.z),
          name: lot.interiorName || 'Inside',
          hindi: '',
          deity: null,
          type: 'house',
        },
        x: lot.x, z: lot.z,
        hw: lot.w * 0.5, hd: lot.d * 0.5,
        rot: lot.rot,
        cos: Math.cos(-lot.rot), sin: Math.sin(-lot.rot),
        anchor: null,
        house: true,
      });
    }

    console.info('[interior] ' + this.volumes.length + ' places you can walk into ('
      + houses.length + ' houses and shops)');
  }

  /** Is a world point inside this temple, with the given margin? */
  _contains(v, x, z, margin) {
    const dx = x - v.x, dz = z - v.z;
    _local.set(dx * v.cos - dz * v.sin, 0, dx * v.sin + dz * v.cos);
    return Math.abs(_local.x) < v.hw * margin && Math.abs(_local.z) < v.hd * margin;
  }

  /* ================================================================
   * Door markers — the corona you walk into
   * ================================================================ */
  _buildMarkers() {
    const b = new MeshBuilder();
    for (const v of this.volumes) {
      // Two opposite conventions for "front" live in LandmarkGenerator, and
      // this corona picked the wrong one for any temple whose builder authored
      // its own door: at ISKCON it pulsed on the blank face while the only gap
      // in the walls was on the other side of the building. A builder that
      // knows where its doorway is now says so.
      const cs = Math.cos(v.rot), sn = Math.sin(v.rot);
      const mx = v.door ? v.door[0] : v.x + sn * v.hd * 0.99;
      const mz = v.door ? v.door[1] : v.z + cs * v.hd * 0.99;
      const y = this.ctx.world.groundHeight(mx, mz) + 0.05;
      const r = v.house ? 1.1 : Math.min(2.4, v.hw * 0.4);

      // a ring of wedges, brighter at the centre
      const SEG = 20;
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
        b.tri(
          mx, y, mz,
          mx + Math.cos(a0) * r, y, mz + Math.sin(a0) * r,
          mx + Math.cos(a1) * r, y, mz + Math.sin(a1) * r,
          v.house ? 0xffd9a0 : 0xffb45c,
        );
      }
      v.marker = { x: mx, z: mz, y, r };
    }

    this.markerMesh = b.toMesh('DoorMarkers', { receiveShadow: false });
    this.markerMesh.material.transparent = true;
    this.markerMesh.material.opacity = 0.28;
    this.markerMesh.material.depthWrite = false;
    this.markerMesh.material.blending = THREE.AdditiveBlending;
    this.markerMesh.renderOrder = 3;
    this.ctx.scene.add(this.markerMesh);
  }

  /* ================================================================
   * Overlay — vignette and the interior name card
   * ================================================================ */
  _buildOverlay() {
    const el = document.createElement('div');
    el.id = 'interior-overlay';
    el.style.cssText = [
      'position:fixed', 'inset:0', 'pointer-events:none', 'z-index:45', 'opacity:0',
      'transition:opacity .55s ease',
      'background:radial-gradient(120% 90% at 50% 45%, transparent 38%, rgba(20,12,6,.72) 100%)',
    ].join(';');
    document.body.appendChild(el);
    this.vignette = el;

    const card = document.createElement('div');
    card.id = 'interior-card';
    card.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'bottom:16%', 'text-align:center',
      'pointer-events:none', 'z-index:46', 'opacity:0',
      'transition:opacity .5s ease, transform .5s ease', 'transform:translateY(10px)',
      'padding:0 20px',
    ].join(';');
    card.innerHTML = `
      <div id="ic-name" style="font:400 clamp(22px,6vw,34px)/1.15 Marcellus,Georgia,serif;
           color:#f2e6d0;text-shadow:0 3px 18px rgba(0,0,0,.85);letter-spacing:.01em"></div>
      <div id="ic-hindi" style="font:400 clamp(15px,4vw,20px)/1.3 'Tiro Devanagari Hindi',serif;
           color:#e8961f;margin-top:4px;text-shadow:0 2px 12px rgba(0,0,0,.8)"></div>
      <div id="ic-deity" style="font:400 12px/1.4 Jost,system-ui,sans-serif;letter-spacing:.22em;
           text-transform:uppercase;color:rgba(242,230,208,.6);margin-top:10px"></div>`;
    document.body.appendChild(card);
    this.card = card;
    this.cardName = card.querySelector('#ic-name');
    this.cardHindi = card.querySelector('#ic-hindi');
    this.cardDeity = card.querySelector('#ic-deity');
  }

  /* ================================================================
   * Frame
   * ================================================================ */
  update(dt, ctx) {
    const p = ctx.player && ctx.player.position;
    if (!p) return;
    this._t += dt;

    // slow pulse on the door coronas, and fade them out once you are inside
    if (this.markerMesh) {
      const pulse = 0.2 + Math.sin(this._t * 1.8) * 0.08;
      this.markerMesh.material.opacity = this.inside ? 0.06 : pulse;
    }

    // threshold test, with hysteresis so a doorway does not flicker
    if (!this.inside) {
      for (const v of this.volumes) {
        if (this._contains(v, p.x, p.z, ENTER_MARGIN)) { this._enter(v, ctx); break; }
      }
    } else if (!this._contains(this.inside, p.x, p.z, EXIT_MARGIN)) {
      this._exit(ctx);
    }

    // everything the transition touches is driven off one blend value, so
    // stepping half in and out again is smooth rather than a switch
    this.blend = damp(this.blend, this.inside ? 1 : 0, 3.2, dt);
    this._grade();

    // an interior nobody is near is not worth submitting
    for (let i = 0; i < this.meshes.length; i++) {
      const m = this.meshes[i];
      m.mesh.visible = Math.hypot(p.x - m.x, p.z - m.z) < m.r + INTERIOR_DRAW;
    }
  }

  _enter(v, ctx) {
    this.inside = v;
    const loc = v.loc;

    this.vignette.style.opacity = '1';
    this.cardName.textContent = loc.name;
    this.cardHindi.textContent = loc.hindi || '';
    this.cardDeity.textContent = loc.deity || loc.type;
    this.card.style.opacity = '1';
    this.card.style.transform = 'translateY(0)';

    clearTimeout(this._cardTimer);
    this._cardTimer = setTimeout(() => {
      this.card.style.opacity = '0';
      this.card.style.transform = 'translateY(-8px)';
    }, 3600);

    ctx.bus.emit('interior:enter', { loc });
    ctx.bus.emit('haptic', { pattern: 'soft' });
    if (!v.house) ctx.bus.emit('sfx', { name: 'bell', position: v.anchor ? v.anchor.altar : undefined });
    else ctx.bus.emit('sfx', { name: 'chime' });

    // the camera cannot sit five metres back inside a hall
    if (ctx.cameraRig && ctx.cameraRig.setDistance) ctx.cameraRig.setDistance(2.9);
    if (ctx.audio && ctx.audio.setSpace) ctx.audio.setSpace('interior');
  }

  _exit(ctx) {
    const loc = this.inside ? this.inside.loc : null;
    this.inside = null;
    this.vignette.style.opacity = '0';
    this.card.style.opacity = '0';
    clearTimeout(this._cardTimer);

    ctx.bus.emit('interior:exit', { loc });
    if (ctx.cameraRig && ctx.cameraRig.setDistance) ctx.cameraRig.setDistance(5.0);
    if (ctx.audio && ctx.audio.setSpace) ctx.audio.setSpace('exterior');
  }

  /**
   * How the light reads inside, as SCALES ON A TARGET.
   *
   * This function used to multiply the live sun, hemisphere and fog every
   * frame, and that is the whole of why walking into a temple turned the screen
   * black. TimeOfDay damps its values toward a target at about 3.6% a frame;
   * this multiplied fog density by 3.2 in the same frame, so the net factor was
   * about x3.08 per frame and it diverged at any frame rate above 2 fps.
   * Measured: density 0.000294 outside, 1.73 three seconds in, 3e5 at five
   * seconds — and FogExp2 saturates at a metre by then, so every fragment in
   * the scene renders as exactly scene.fog.color, which the same function was
   * lerping toward 0x2a1d12. `_restore` restored nothing, so it kept climbing
   * after you walked out: about 158 seconds of black world.
   *
   * Nothing here writes to the lighting any more. TimeOfDay folds these scales
   * into its targets the same way it folds in the weather (ctx.live.modifiers),
   * so the damp converges on a dark room instead of compounding toward zero,
   * and walking out converges straight back. Products run away; targets do not.
   *
   * The numbers are also much gentler than they were. A sanctum is dim; a
   * chatuhshala courtyard is not dim at all, because you are still standing
   * under the sky, and Krishna Balaram is a courtyard. There is also no lamp to
   * fall back on: LandmarkGenerator's and RitualSystem's point lights are both
   * gated on ctx.quality.templeLights, which is false on the `low` tier, which
   * is every phone. Whatever these scales take away on that tier is simply gone.
   */
  _grade() {
    const k = this.blend;
    const open = this.inside ? this.inside.open : false;
    const g = this.grade;
    if (k < 0.001) {
      g.sun = 1; g.ambient = 1; g.fog = 1; g.tintK = 0;
      return;
    }
    g.sun = 1 - k * (open ? 0.10 : 0.42);
    g.ambient = 1 + k * (open ? 0.04 : 0.18);   // a hall is flat, not black
    g.fog = 1 + k * (open ? 0.10 : 0.55);
    g.tintK = k * (open ? 0.12 : 0.45);
  }

  dispose() {
    if (this.markerMesh) {
      this.ctx.scene.remove(this.markerMesh);
      this.markerMesh.geometry.dispose();
      this.markerMesh.material.dispose();
    }
    if (this.vignette) this.vignette.remove();
    if (this.card) this.card.remove();
    clearTimeout(this._cardTimer);
  }
}

/** The colour the air takes indoors — lamp smoke and old plaster, not soot. */
const INTERIOR_FOG = new THREE.Color(0x4a3a28);
