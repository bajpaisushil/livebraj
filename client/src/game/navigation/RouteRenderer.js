/**
 * RouteRenderer — draws the walking route into the 3D world.
 *
 * The requirement was that a route selected on the map exists in the world, not
 * just on a HUD. So the path becomes a ribbon of warm light laid along the
 * actual street surface, following the terrain, with a slow scroll toward the
 * destination. It reads as a suggestion rather than an instruction.
 */

import * as THREE from 'three';
import { resample } from '../../engine/math/Curves.js';

const RIBBON_WIDTH = 1.15;
const LIFT = 0.09;

let _texture = null;

function routeTexture(ctx) {
  if (_texture) return _texture;
  _texture = ctx.textures.get('route-dash', () => {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 64;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 16, 64);
    // a soft dash with feathered ends — a hard-edged dash looks like a decal
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0.00, 'rgba(232,150,31,0)');
    grad.addColorStop(0.18, 'rgba(255,190,90,0.95)');
    grad.addColorStop(0.50, 'rgba(255,214,140,1)');
    grad.addColorStop(0.82, 'rgba(232,150,31,0.95)');
    grad.addColorStop(1.00, 'rgba(232,150,31,0)');
    g.fillStyle = grad;
    g.fillRect(3, 0, 10, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  return _texture;
}

export class RouteRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'Route';
    this.group.renderOrder = 4;
    ctx.scene.add(this.group);

    this.material = new THREE.MeshBasicMaterial({
      map: routeTexture(ctx),
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    this.mesh = null;
    this._targetOpacity = 0;
    this._scroll = 0;
  }

  /** Lay a new route. `points` is an array of [x, z]. Pass null to clear. */
  setPath(points) {
    this.clear();
    if (!points || points.length < 2) { this._targetOpacity = 0; return; }

    const world = this.ctx.world;
    const pts = resample(points, 2.2);
    const positions = [];
    const uvs = [];
    let travelled = 0;

    for (let i = 0; i < pts.length; i++) {
      const [x, z] = pts[i];
      const prev = pts[i - 1] || pts[i];
      const next = pts[i + 1] || pts[i];
      let dx = next[0] - prev[0];
      let dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      // left normal in the XZ plane
      const nx = -dz * RIBBON_WIDTH * 0.5;
      const nz = dx * RIBBON_WIDTH * 0.5;

      if (i > 0) travelled += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]);

      const yL = world.groundHeight(x + nx, z + nz) + LIFT;
      const yR = world.groundHeight(x - nx, z - nz) + LIFT;

      positions.push(x + nx, yL, z + nz);
      positions.push(x - nx, yR, z - nz);
      const v = travelled / 3.0;
      uvs.push(0, v, 1, v);
    }

    const indices = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, b, c, b, d, c);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeBoundingSphere();

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = true;
    this.group.add(this.mesh);
    this._targetOpacity = 0.85;
  }

  clear() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
  }

  update(dt) {
    // scroll toward the destination
    this._scroll -= dt * 0.35;
    if (this.material.map) this.material.map.offset.y = this._scroll;
    const o = this.material.opacity;
    this.material.opacity = o + (this._targetOpacity - o) * (1 - Math.exp(-4 * dt));
    if (this.material.opacity < 0.01 && this.mesh) this.clear();
  }

  dispose() {
    this.clear();
    this.material.dispose();
    this.ctx.scene.remove(this.group);
  }
}

/** Convenience used by MapSystem's contract. */
export function buildRouteRibbon(points, ctx) {
  const r = new RouteRenderer(ctx);
  r.setPath(points);
  return r;
}
