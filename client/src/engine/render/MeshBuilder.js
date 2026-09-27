/**
 * MeshBuilder — accumulates triangles into one buffer, then emits a single mesh.
 *
 * The world has 1,055 roads, a few thousand buildings and 23 landmarks. Creating
 * a Mesh per object would be thousands of draw calls; merging afterwards with
 * mergeGeometries works but is fussy about matching attribute sets and wastes a
 * lot of intermediate memory.
 *
 * Writing straight into growable arrays avoids both problems, so every generator
 * in the world pipeline builds through this.
 */

import * as THREE from 'three';

const _n = new THREE.Vector3();
const _u = new THREE.Vector3();
const _v = new THREE.Vector3();
const _c = new THREE.Color();

export class MeshBuilder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.uv = [];
  }

  get triangleCount() { return this.pos.length / 9; }
  get isEmpty() { return this.pos.length === 0; }

  /** Counter-clockwise triangle with a flat normal and one colour. */
  /**
   * Turn on vertical weathering for every box() drawn until it is turned off.
   * @param {?function(number): number} fn  world Y -> brightness multiplier
   *
   * A real facade spans a wide value range from its foot to its head: rain
   * splash darkens the bottom, the head bleaches where nothing shelters it.
   * quad() paints one colour across all four corners, so before this a wall
   * could only ever be one flat hex — which is why no temple looked like
   * stone no matter how much geometry it had.
   *
   * Off by default. A builder that never calls this draws exactly as before.
   */
  weather(fn) { this._wg = fn || null; return this; }

  tri(ax, ay, az, bx, by, bz, cx, cy, cz, color, uvs, shade) {
    _u.set(bx - ax, by - ay, bz - az);
    _v.set(cx - ax, cy - ay, cz - az);
    _n.crossVectors(_u, _v).normalize();
    if (!isFinite(_n.x)) _n.set(0, 1, 0);

    _c.set(color);
    this.pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    for (let i = 0; i < 3; i++) {
      this.nor.push(_n.x, _n.y, _n.z);
      if (shade) {
        const k = shade[i];
        this.col.push(Math.min(1, _c.r * k), Math.min(1, _c.g * k),
          Math.min(1, _c.b * k));
      } else this.col.push(_c.r, _c.g, _c.b);
    }
    if (uvs) this.uv.push(...uvs);
    else this.uv.push(0, 0, 1, 0, 1, 1);
  }

  /** Quad a-b-c-d, wound so the front face is counter-clockwise. */
  quad(a, b, c, d, color, uvScale, shade) {
    const uv = uvScale
      ? [0, 0, uvScale[0], 0, uvScale[0], uvScale[1]]
      : null;
    const uv2 = uvScale
      ? [0, 0, uvScale[0], uvScale[1], 0, uvScale[1]]
      : null;
    this.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], color, uv,
      shade && [shade[0], shade[1], shade[2]]);
    this.tri(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2], color, uv2,
      shade && [shade[0], shade[2], shade[3]]);
  }

  /**
   * An axis-aligned box, optionally rotated about Y.
   * `faces` lets a caller skip hidden sides — the underside of a building or the
   * back of a wall is a third of its triangles for nothing.
   */
  box(cx, cy, cz, w, h, d, color, rot = 0, faces = 0b111111, topColor = null) {
    const hw = w * 0.5, hd = d * 0.5;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const p = (lx, ly, lz) => [cx + lx * cs - lz * sn, cy + ly, cz + lx * sn + lz * cs];

    const y0 = 0, y1 = h;
    const A = p(-hw, y0, -hd), B = p(hw, y0, -hd), C = p(hw, y0, hd), D = p(-hw, y0, hd);
    const E = p(-hw, y1, -hd), F = p(hw, y1, -hd), G = p(hw, y1, hd), H = p(-hw, y1, hd);

    // Every side face runs bottom-bottom-top-top in the same corner order,
    // so one pair of multipliers grades all four.
    const lo = this._wg ? this._wg(cy) : 0, hi = this._wg ? this._wg(cy + h) : 0;
    const side = this._wg ? [lo, hi, hi, lo] : undefined;

    if (faces & 0b000001) this.quad(E, H, G, F, topColor || color, null,   // top
      this._wg ? [hi, hi, hi, hi] : undefined);
    if (faces & 0b000010) this.quad(A, B, C, D, color, null,               // bottom
      this._wg ? [lo, lo, lo, lo] : undefined);
    if (faces & 0b000100) this.quad(A, E, F, B, color, null, side);        // -Z
    if (faces & 0b001000) this.quad(C, G, H, D, color, null, side);        // +Z
    if (faces & 0b010000) this.quad(D, H, E, A, color, null, side);        // -X
    if (faces & 0b100000) this.quad(B, F, G, C, color, null, side);        // +X
  }


  /**
   * A tapered box: different width and depth at top and bottom.
   * This one primitive is the difference between a figure made of stacked
   * blocks and one that reads as a person — limbs narrow toward the wrist and
   * ankle, and a torso can be broader at the chest than the waist.
   */
  prism(cx, cy, cz, bw, bd, tw, td, h, color, rot = 0, shadeTop) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const at = (lx, ly, lz) => [cx + lx * cs - lz * sn, cy + ly, cz + lx * sn + lz * cs];
    const bhw = bw * 0.5, bhd = bd * 0.5, thw = tw * 0.5, thd = td * 0.5;

    const A = at(-bhw, 0, -bhd), B = at(bhw, 0, -bhd), C = at(bhw, 0, bhd), D = at(-bhw, 0, bhd);
    const E = at(-thw, h, -thd), F = at(thw, h, -thd), G = at(thw, h, thd), H = at(-thw, h, thd);

    this.quad(E, H, G, F, shadeTop || color);  // top
    this.quad(A, B, C, D, color);              // bottom
    this.quad(A, E, F, B, color);              // -Z
    this.quad(C, G, H, D, color);              // +Z
    this.quad(D, H, E, A, color);              // -X
    this.quad(B, F, G, C, color);              // +X
  }

  /** A rounded mass — a head, a shoulder, a knee. Cheap, and never a cube. */
  bevelBox(cx, cy, cz, w, h, d, color, rot = 0, bevel = 0.22) {
    const b = Math.min(bevel, 0.45);
    // three stacked tapered sections read as rounded from any normal distance
    this.prism(cx, cy, cz, w * (1 - b), d * (1 - b), w, d, h * 0.22, color, rot);
    this.prism(cx, cy + h * 0.22, cz, w, d, w, d, h * 0.56, color, rot);
    this.prism(cx, cy + h * 0.78, cz, w, d, w * (1 - b), d * (1 - b), h * 0.22, color, rot);
  }

  /**
   * A flat panel lying on a wall face — a window, a shutter, a painted band.
   * Two triangles instead of the twelve a box costs. Across tens of thousands
   * of buildings that difference is the entire triangle budget.
   *
   * (cx, cy, cz) is the panel centre, rot is the wall facing, and lift pushes
   * it clear of the wall so it never z-fights.
   */
  panel(cx, cy, cz, w, h, color, rot = 0, lift = 0.02) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const hw = w * 0.5, hh = h * 0.5;
    const ox = sn * lift, oz = cs * lift;
    const at = (lx, ly) => [cx + lx * cs + ox, cy + ly, cz - lx * sn + oz];
    this.quad(at(-hw, -hh), at(hw, -hh), at(hw, hh), at(-hw, hh), color);
  }


  /**
   * A panel that takes an explicit UV rectangle, for anything drawn from a
   * texture atlas — shop signboards, posters, painted name plates.
   */
  panelUV(cx, cy, cz, w, h, uv, rot = 0, lift = 0.03, tint = 0xffffff) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const hw = w * 0.5, hh = h * 0.5;
    const ox = sn * lift, oz = cs * lift;
    const at = (lx, ly) => [cx + lx * cs + ox, cy + ly, cz - lx * sn + oz];

    const A = at(-hw, -hh), B = at(hw, -hh), C = at(hw, hh), D = at(-hw, hh);
    this.tri(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], tint,
      [uv.u0, uv.v0, uv.u1, uv.v0, uv.u1, uv.v1]);
    this.tri(A[0], A[1], A[2], C[0], C[1], C[2], D[0], D[1], D[2], tint,
      [uv.u0, uv.v0, uv.u1, uv.v1, uv.u0, uv.v1]);
  }

  /** Append another builder's contents. */
  append(other) {
    if (other.isEmpty) return;
    for (let i = 0; i < other.pos.length; i++) this.pos.push(other.pos[i]);
    for (let i = 0; i < other.nor.length; i++) this.nor.push(other.nor[i]);
    for (let i = 0; i < other.col.length; i++) this.col.push(other.col[i]);
    for (let i = 0; i < other.uv.length; i++) this.uv.push(other.uv[i]);
  }

  /** Merge an existing BufferGeometry, optionally transformed. */
  addGeometry(geo, matrix, color) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    // Carry the source's own vertex colours when it has them and no override
    // was asked for. Flattening them is how a dressed archetype — dhoti, sari,
    // tilak, the lot — arrives in a merged mesh as a blank white person.
    const col = color === undefined ? g.getAttribute('color') : null;
    _c.set(color === undefined ? 0xffffff : color);

    for (let i = 0; i < pos.count; i++) {
      _u.fromBufferAttribute(pos, i);
      if (matrix) _u.applyMatrix4(matrix);
      this.pos.push(_u.x, _u.y, _u.z);

      if (nor) {
        _v.fromBufferAttribute(nor, i);
        if (matrix) _v.transformDirection(matrix);
        this.nor.push(_v.x, _v.y, _v.z);
      } else this.nor.push(0, 1, 0);

      if (col) this.col.push(col.getX(i), col.getY(i), col.getZ(i));
      else this.col.push(_c.r, _c.g, _c.b);
      if (uv) this.uv.push(uv.getX(i), uv.getY(i));
      else this.uv.push(0, 0);
    }
    if (g !== geo) g.dispose();
  }

  build(smoothNormals = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (smoothNormals) g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }

  /** Build and wrap in a mesh with a vertex-coloured Lambert material. */
  toMesh(name, opts = {}) {
    const geo = this.build(opts.smooth);
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      map: opts.map || null,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      alphaTest: opts.alphaTest || 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = !!opts.castShadow;
    mesh.receiveShadow = opts.receiveShadow !== false;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }

  clear() { this.pos.length = 0; this.nor.length = 0; this.col.length = 0; this.uv.length = 0; }
}
