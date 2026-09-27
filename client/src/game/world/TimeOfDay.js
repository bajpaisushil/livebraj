/**
 * TimeOfDay — sky, sun, ambient and fog for each phase of the day.
 *
 * Lighting does more for the feeling of the Dham than any amount of geometry,
 * so this is a first-class system rather than three lines in the bootstrap.
 * Morning is the default: low warm sun, long shadows, cool haze in the lanes.
 *
 * The phases are data (content/palette.js TIME_OF_DAY), so adding weather or a
 * continuous clock later means adding entries, not rewriting this file.
 */

import * as THREE from 'three';
import { damp } from '../../engine/math/MathUtils.js';

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();

const SKY_VERT = `
varying vec3 vWorld;
void main() {
  vWorld = normalize((modelMatrix * vec4(position, 1.0)).xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 top;
uniform vec3 mid;
uniform vec3 low;
uniform vec3 sunDir;
uniform vec3 sunColor;
uniform float haze;
varying vec3 vWorld;

void main() {
  float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
  // two-stage gradient: horizon band is much tighter than the upper sky
  vec3 col = mix(low, mid, smoothstep(0.42, 0.56, h));
  col = mix(col, top, smoothstep(0.55, 0.92, h));

  // sun bloom, and a broad forward-scatter haze along the horizon
  float sd = max(dot(normalize(vWorld), normalize(sunDir)), 0.0);
  col += sunColor * pow(sd, 220.0) * 1.6;
  col += sunColor * pow(sd, 6.0) * 0.16 * haze;

  // dust band just above the horizon — Braj is never entirely clear
  float band = exp(-pow((h - 0.5) * 9.0, 2.0));
  col = mix(col, col * 1.06 + vec3(0.05, 0.04, 0.03), band * haze * 0.5);

  gl_FragColor = vec4(col, 1.0);
}`;

export class TimeOfDay {
  constructor(ctx) {
    this.ctx = ctx;
    this.phase = ctx.state.settings.timeOfDay || 'morning';
    this.config = ctx.data.TIME_OF_DAY[this.phase] || ctx.data.TIME_OF_DAY.morning;
    this.sunDir = new THREE.Vector3();

    // --- sky dome ---
    this.skyUniforms = {
      top: { value: new THREE.Color(this.config.skyTop) },
      mid: { value: new THREE.Color(this.config.skyMid) },
      low: { value: new THREE.Color(this.config.skyLow) },
      sunDir: { value: this.sunDir },
      sunColor: { value: new THREE.Color(this.config.sun.color) },
      haze: { value: 1.0 },
    };
    const skyGeo = new THREE.SphereGeometry(4000, 32, 16);
    this.sky = new THREE.Mesh(skyGeo, new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }));
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1000;
    ctx.scene.add(this.sky);

    // --- lights ---
    this.sun = new THREE.DirectionalLight(this.config.sun.color, this.config.sun.intensity);
    this.sun.castShadow = !!ctx.quality.shadows;
    if (this.sun.castShadow) {
      const s = ctx.quality.shadowMapSize;
      this.sun.shadow.mapSize.set(s, s);
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 340;
      const half = 85;
      Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
      this.sun.shadow.bias = -0.0009;
      this.sun.shadow.normalBias = 0.035;
    }
    ctx.scene.add(this.sun);
    ctx.scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(
      this.config.ambient.sky, this.config.ambient.ground, this.config.ambient.intensity,
    );
    ctx.scene.add(this.hemi);

    // --- fog ---
    ctx.scene.fog = new THREE.FogExp2(
      this.config.fog, ctx.quality.fogDensity * this.config.fogScale,
    );

    this._apply(this.config, true);
  }

  setPhase(name, silent = false) {
    const cfg = this.ctx.data.TIME_OF_DAY[name];
    if (!cfg) return;
    this.phase = name;
    this.config = cfg;
    this._target = cfg;
    this.ctx.state.settings.timeOfDay = name;
    if (!silent) this.ctx.save.write();
    this.ctx.bus.emit('time:changed', { phase: name });
  }

  _apply(cfg, instant) {
    this._target = cfg;
    if (!instant) return;
    this.skyUniforms.top.value.set(cfg.skyTop);
    this.skyUniforms.mid.value.set(cfg.skyMid);
    this.skyUniforms.low.value.set(cfg.skyLow);
    this.skyUniforms.sunColor.value.set(cfg.sun.color);
    this.sun.color.set(cfg.sun.color);
    this.sun.intensity = cfg.sun.intensity;
    this.hemi.color.set(cfg.ambient.sky);
    this.hemi.groundColor.set(cfg.ambient.ground);
    this.hemi.intensity = cfg.ambient.intensity;
    this.ctx.scene.fog.color.set(cfg.fog);
    this.ctx.scene.fog.density = this.ctx.quality.fogDensity * cfg.fogScale;
    this.ctx.renderer.toneMappingExposure = cfg.exposure;
    this._updateSunDir(cfg);
  }

  _updateSunDir(cfg) {
    const { azimuth, elevation } = cfg.sun;
    this.sunDir.set(
      Math.cos(elevation) * Math.sin(azimuth),
      Math.sin(elevation),
      Math.cos(elevation) * Math.cos(azimuth),
    ).normalize();
  }

  /** Temple lamps rise as the daylight falls. */
  _updateLamps(dt, ctx) {
    const lamps = ctx.world && ctx.world.landmarks ? ctx.world.landmarks.templeLights : null;
    if (!lamps || !lamps.length) return;
    const phase = this.phase;
    const want = phase === 'night' ? 4.2 : phase === 'evening' ? 3.4 : 2.0;
    for (const l of lamps) l.intensity = damp(l.intensity, want, 2, dt);
  }

  update(dt, ctx) {
    this._updateLamps(dt, ctx);
    const cfg = this._target || this.config;
    // live weather flattens the sun and lifts the haze on top of the phase preset
    const mod = ctx.live ? ctx.live.modifiers : null;
    /**
     * ...and being indoors does the same again, as a scale on the TARGET.
     *
     * InteriorSystem used to reach in and multiply `this.sun.intensity` and
     * `scene.fog.density` directly, once a frame, while this function damped
     * them back at 3.6% a frame. The product ran away — fog density reached
     * 3e5 in five seconds and every fragment in the world rendered as the fog
     * colour — and it kept running after you left, because nothing restored
     * anything. Folding the interior in here instead means the damp converges
     * on a dark room and converges straight back out of it. Nothing outside
     * this file writes to the lights.
     */
    const io = ctx.interior ? ctx.interior.grade : null;
    const sunI = cfg.sun.intensity * (mod ? mod.sunScale : 1) * (io ? io.sun : 1);
    const ambI = cfg.ambient.intensity * (mod ? mod.ambientScale : 1) * (io ? io.ambient : 1);
    const fogS = cfg.fogScale * (mod ? mod.fogScale : 1) * (io ? io.fog : 1);

    // crossfade rather than cut, so a settings change is a sunrise not a switch
    const k = 2.2;
    this.skyUniforms.top.value.lerp(_c1.set(cfg.skyTop), 1 - Math.exp(-k * dt));
    this.skyUniforms.mid.value.lerp(_c1.set(cfg.skyMid), 1 - Math.exp(-k * dt));
    this.skyUniforms.low.value.lerp(_c1.set(cfg.skyLow), 1 - Math.exp(-k * dt));
    this.skyUniforms.sunColor.value.lerp(_c1.set(cfg.sun.color), 1 - Math.exp(-k * dt));

    this.sun.color.lerp(_c2.set(cfg.sun.color), 1 - Math.exp(-k * dt));
    this.sun.intensity = damp(this.sun.intensity, sunI, k, dt);
    this.hemi.color.lerp(_c1.set(cfg.ambient.sky), 1 - Math.exp(-k * dt));
    this.hemi.groundColor.lerp(_c2.set(cfg.ambient.ground), 1 - Math.exp(-k * dt));
    this.hemi.intensity = damp(this.hemi.intensity, ambI, k, dt);

    const fog = ctx.scene.fog;
    _c1.set(cfg.fog);
    if (io && io.tintK > 0) _c1.lerp(io.tint, io.tintK);
    fog.color.lerp(_c1, 1 - Math.exp(-k * dt));
    fog.density = damp(fog.density, ctx.quality.fogDensity * fogS, k, dt);
    ctx.renderer.toneMappingExposure = damp(ctx.renderer.toneMappingExposure, cfg.exposure, k, dt);

    this._updateSunDir(cfg);

    // keep the shadow frustum and the sky centred on the player
    const p = ctx.player ? ctx.player.position : ctx.camera.position;
    /*
     * The sky follows the CAMERA, not the player.
     *
     * It used to track the player, and the dome is finite — so any camera far
     * from the player ends up OUTSIDE it and renders black. Caught in the
     * temple photographs: a large black wedge across the top of the frame
     * wherever the shot camera stood away from where the player was standing.
     * It would do the same in play at the far end of a long cinematic sweep,
     * or looking back from across the river.
     */
    const cam = this.ctx.camera;
    this.sky.position.set(cam ? cam.position.x : p.x, 0, cam ? cam.position.z : p.z);
    this.sun.target.position.set(p.x, 0, p.z);
    this.sun.position.set(
      p.x + this.sunDir.x * 160,
      this.sunDir.y * 160 + 20,
      p.z + this.sunDir.z * 160,
    );
  }

  dispose() {
    this.ctx.scene.remove(this.sky, this.sun, this.sun.target, this.hemi);
    this.sky.geometry.dispose();
    this.sky.material.dispose();
  }
}
