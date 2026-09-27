/**
 * The lila murals — one painted pastime on every wall that will take one.
 *
 * Same machinery as `Signage.js`, and for the same reason: every mural in the
 * town is painted once into a single atlas, and a wall takes one cell by its
 * UVs. Nine hundred murals then cost ONE texture and ONE draw call rather than
 * a material each. Anything else would not survive on a phone.
 *
 * Each panel is an emblem and a name, not a figure. That decision is argued in
 * `content/lilas.js`, and it is the same one `buildDeities` makes out loud: at
 * this scale a suggested form reads as a murti and a modelled one reads as a
 * doll. A badly drawn Krishna repeated across a town would be worse than none.
 *
 * The emblems are what each pastime is KNOWN by — the butter pot, the lifted
 * hill, the serpent's hoods, the cloth in the kadamba, the flute — so a wall
 * reads at a glance from down the lane, which is what a painted wall is for.
 */

import * as THREE from 'three';
import { LILAS, LILA_COUNT, EMBLEM } from '../../content/lilas.js';

export const LILA_COLS = 4;
export const LILA_ROWS = 4;

/** Atlas cell for the nth mural. */
export function lilaUV(index) {
  const i = ((index % LILA_COUNT) + LILA_COUNT) % LILA_COUNT;
  const u = (i % LILA_COLS) / LILA_COLS;
  const v = 1 - (Math.floor(i / LILA_COLS) + 1) / LILA_ROWS;
  return { u0: u, v0: v, u1: u + 1 / LILA_COLS, v1: v + 1 / LILA_ROWS };
}

let cached = null;

/** One atlas for every painted wall in Braj. */
export function lilaAtlas(ctx) {
  if (cached) return cached;
  cached = ctx.textures.get('lila-atlas', () => {
    const S = 2048;
    const cell = S / LILA_COLS;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    LILAS.forEach((l, i) => {
      if (i >= LILA_COLS * LILA_ROWS) return;
      const cx = (i % LILA_COLS) * cell;
      const cy = Math.floor(i / LILA_COLS) * cell;
      paint(g, cx, cy, cell, l);
    });

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
  return cached;
}

/** One mural: a washed ground, a painted border, the emblem, and its name. */
function paint(g, cx, cy, cell, l) {
  const P = (fx, fy) => [cx + fx * cell, cy + fy * cell];

  // the wall behind it, then the painted field
  g.fillStyle = '#e8dfc9';
  g.fillRect(cx, cy, cell, cell);
  g.fillStyle = l.bg;
  g.fillRect(cx + cell * 0.04, cy + cell * 0.04, cell * 0.92, cell * 0.92);

  // a double border, the way these are painted
  g.strokeStyle = l.mark;
  g.globalAlpha = 0.85;
  g.lineWidth = cell * 0.012;
  g.strokeRect(cx + cell * 0.07, cy + cell * 0.07, cell * 0.86, cell * 0.86);
  g.globalAlpha = 0.45;
  g.lineWidth = cell * 0.006;
  g.strokeRect(cx + cell * 0.10, cy + cell * 0.10, cell * 0.80, cell * 0.80);
  g.globalAlpha = 1;

  g.save();
  g.translate(...P(0.5, 0.44));
  g.scale(cell, cell);
  g.lineWidth = 0.016;
  g.lineJoin = 'round';
  emblem(g, l);
  g.restore();

  // the name: Devanagari over roman, the way a painted wall carries it
  g.textAlign = 'center';
  g.fillStyle = l.fg;
  g.font = `600 ${Math.round(cell * 0.082)}px "Tiro Devanagari Hindi", serif`;
  g.fillText(l.deva, ...P(0.5, 0.80));
  g.globalAlpha = 0.82;
  g.font = `500 ${Math.round(cell * 0.042)}px Jost, system-ui, sans-serif`;
  g.fillText(l.roman, ...P(0.5, 0.875));
  g.globalAlpha = 1;
}

/**
 * The emblems, drawn in a unit square centred on the origin.
 *
 * Flat shapes and a single accent, because that is what survives being 40 px
 * across on a phone at the far end of a lane — and because it is honest about
 * being a painted sign rather than pretending to be a picture.
 */
function emblem(g, l) {
  const fg = l.fg, mk = l.mark;
  const fill = (col, path) => { g.fillStyle = col; g.fill(path); };
  const line = (col, path) => { g.strokeStyle = col; g.stroke(path); };
  const p = () => new Path2D();

  switch (l.emblem) {
    case EMBLEM.POT: {                        // makhan chori: the butter pot
      const a = p();
      a.moveTo(-0.13, -0.10); a.bezierCurveTo(-0.22, 0.02, -0.19, 0.16, 0, 0.16);
      a.bezierCurveTo(0.19, 0.16, 0.22, 0.02, 0.13, -0.10); a.closePath();
      fill(mk, a);
      const rim = p(); rim.ellipse(0, -0.11, 0.16, 0.045, 0, 0, Math.PI * 2);
      fill(fg, rim);
      const drip = p(); drip.ellipse(0.02, 0.05, 0.055, 0.075, 0, 0, Math.PI * 2);
      fill(fg, drip);
      break;
    }
    case EMBLEM.HILL: {                       // govardhan, lifted
      const h = p();
      h.moveTo(-0.26, 0.14); h.lineTo(-0.06, -0.14); h.lineTo(0.05, -0.02);
      h.lineTo(0.14, -0.16); h.lineTo(0.28, 0.14); h.closePath();
      fill(mk, h);
      const arm = p(); arm.moveTo(-0.02, 0.17); arm.lineTo(-0.02, 0.05);
      g.lineWidth = 0.034; line(fg, arm); g.lineWidth = 0.016;
      break;
    }
    case EMBLEM.SERPENT: {                    // kaliya's hoods
      for (let k = -2; k <= 2; k++) {
        const hd = p();
        hd.ellipse(k * 0.095, -0.02 + Math.abs(k) * 0.035, 0.045, 0.085, 0, 0, Math.PI * 2);
        fill(k === 0 ? fg : mk, hd);
      }
      const coil = p(); coil.ellipse(0, 0.14, 0.24, 0.06, 0, 0, Math.PI * 2);
      fill(mk, coil);
      break;
    }
    case EMBLEM.CLOTH: {                      // vastra haran: cloth in the kadamba
      const tr = p(); tr.moveTo(-0.03, 0.18); tr.lineTo(0.03, 0.18); tr.lineTo(0.02, -0.06); tr.lineTo(-0.02, -0.06);
      fill(mk, tr);
      const cr = p(); cr.ellipse(0, -0.10, 0.20, 0.11, 0, 0, Math.PI * 2);
      fill(mk, cr);
      for (let k = -1; k <= 1; k++) {
        const cl = p();
        cl.moveTo(k * 0.13 - 0.035, -0.04);
        cl.quadraticCurveTo(k * 0.13, 0.06, k * 0.13 + 0.035, -0.04);
        cl.lineTo(k * 0.13 + 0.02, 0.10); cl.lineTo(k * 0.13 - 0.02, 0.10);
        fill(fg, cl);
      }
      break;
    }
    case EMBLEM.FLUTE: {                      // venu gita
      const f = p(); f.moveTo(-0.24, 0.06); f.lineTo(0.24, -0.06);
      g.lineWidth = 0.05; line(mk, f); g.lineWidth = 0.016;
      for (let k = -2; k <= 2; k++) {
        const hole = p(); hole.ellipse(k * 0.075, -k * 0.019, 0.013, 0.013, 0, 0, Math.PI * 2);
        fill(l.bg, hole);
      }
      for (let k = 0; k < 3; k++) {           // the sound going out
        const n = p(); n.arc(0.22, -0.16 - k * 0.05, 0.05 + k * 0.05, -1.1, 0.5);
        g.globalAlpha = 0.5 - k * 0.12; line(fg, n); g.globalAlpha = 1;
      }
      break;
    }
    case EMBLEM.SWING: {                      // jhulan
      const bar = p(); bar.moveTo(-0.24, -0.16); bar.lineTo(0.24, -0.16);
      g.lineWidth = 0.03; line(mk, bar);
      const r1 = p(); r1.moveTo(-0.12, -0.16); r1.lineTo(-0.12, 0.06);
      const r2 = p(); r2.moveTo(0.12, -0.16); r2.lineTo(0.12, 0.06);
      g.lineWidth = 0.014; line(fg, r1); line(fg, r2); g.lineWidth = 0.016;
      const seat = p(); seat.rect(-0.17, 0.06, 0.34, 0.045);
      fill(mk, seat);
      break;
    }
    case EMBLEM.BOAT: {                       // nauka vihar
      const b2 = p();
      b2.moveTo(-0.24, -0.02); b2.quadraticCurveTo(0, 0.16, 0.24, -0.02); b2.closePath();
      fill(mk, b2);
      const m = p(); m.moveTo(0, -0.02); m.lineTo(0, -0.20);
      g.lineWidth = 0.018; line(fg, m); g.lineWidth = 0.016;
      for (let k = 0; k < 2; k++) {
        const w2 = p(); w2.moveTo(-0.26, 0.08 + k * 0.055);
        w2.quadraticCurveTo(-0.1, 0.13 + k * 0.055, 0.04, 0.08 + k * 0.055);
        w2.quadraticCurveTo(0.16, 0.04 + k * 0.055, 0.28, 0.09 + k * 0.055);
        g.globalAlpha = 0.6; line(fg, w2); g.globalAlpha = 1;
      }
      break;
    }
    case EMBLEM.COW: {                        // go-charan
      const body = p(); body.ellipse(-0.02, 0.02, 0.17, 0.10, 0, 0, Math.PI * 2);
      fill(mk, body);
      const head = p(); head.ellipse(0.17, -0.04, 0.07, 0.055, 0, 0, Math.PI * 2);
      fill(mk, head);
      const horn = p(); horn.moveTo(0.16, -0.09); horn.lineTo(0.20, -0.17);
      line(fg, horn);
      for (let k = -1; k <= 1; k += 2) {
        const leg = p(); leg.moveTo(k * 0.10, 0.10); leg.lineTo(k * 0.10, 0.19);
        g.lineWidth = 0.022; line(mk, leg); g.lineWidth = 0.016;
      }
      break;
    }
    case EMBLEM.CART: {                       // shakata bhanjan
      const bed = p(); bed.rect(-0.20, -0.08, 0.40, 0.07);
      fill(mk, bed);
      for (const k of [-1, 1]) {
        const wh = p(); wh.arc(k * 0.13, 0.08, 0.075, 0, Math.PI * 2);
        g.lineWidth = 0.022; line(fg, wh); g.lineWidth = 0.016;
      }
      const brk = p(); brk.moveTo(-0.06, -0.14); brk.lineTo(0.02, -0.01); brk.lineTo(0.10, -0.16);
      g.globalAlpha = 0.8; line(fg, brk); g.globalAlpha = 1;
      break;
    }
    case EMBLEM.TREE: {                       // the twin arjunas, the talavan
      for (const k of [-1, 1]) {
        const t2 = p(); t2.moveTo(k * 0.09 - 0.022, 0.19); t2.lineTo(k * 0.09 + 0.022, 0.19);
        t2.lineTo(k * 0.09 + 0.014, -0.06); t2.lineTo(k * 0.09 - 0.014, -0.06);
        fill(mk, t2);
        const cr = p(); cr.ellipse(k * 0.09, -0.11, 0.105, 0.075, 0, 0, Math.PI * 2);
        fill(fg, cr);
      }
      break;
    }
    case EMBLEM.WHIRL: {                      // trinavarta, and the universe
      for (let k = 0; k < 4; k++) {
        const s2 = p();
        s2.arc(0, 0, 0.055 + k * 0.05, k * 1.5, k * 1.5 + 4.2);
        g.lineWidth = 0.020 - k * 0.003;
        g.globalAlpha = 1 - k * 0.18;
        line(k % 2 ? mk : fg, s2);
      }
      g.globalAlpha = 1; g.lineWidth = 0.016;
      break;
    }
    case EMBLEM.ROPE: {                       // damodar, bound at the waist
      const pot = p(); pot.ellipse(0, 0.02, 0.15, 0.14, 0, 0, Math.PI * 2);
      fill(mk, pot);
      for (let k = -1; k <= 1; k++) {
        const r3 = p();
        r3.ellipse(0, 0.02 + k * 0.055, 0.165, 0.035, 0, 0, Math.PI * 2);
        g.lineWidth = 0.016; line(fg, r3);
      }
      const knot = p(); knot.ellipse(0.16, 0.02, 0.035, 0.035, 0, 0, Math.PI * 2);
      fill(fg, knot);
      break;
    }
    case EMBLEM.LOTUS: {                      // the ras mandal
      for (let k = 0; k < 8; k++) {
        const a2 = (k / 8) * Math.PI * 2;
        const pt = p();
        pt.ellipse(Math.cos(a2) * 0.155, Math.sin(a2) * 0.155, 0.055, 0.032, a2, 0, Math.PI * 2);
        fill(k % 2 ? mk : fg, pt);
      }
      const mid = p(); mid.arc(0, 0, 0.055, 0, Math.PI * 2);
      fill(mk, mid);
      break;
    }
    case EMBLEM.PEACOCK: {
      const body = p(); body.ellipse(-0.08, 0.06, 0.06, 0.09, 0, 0, Math.PI * 2);
      fill(mk, body);
      for (let k = 0; k < 5; k++) {
        const a2 = -1.5 + k * 0.42;
        const fe = p();
        fe.moveTo(-0.06, 0.04);
        fe.quadraticCurveTo(Math.cos(a2) * 0.16, 0.04 + Math.sin(a2) * 0.16,
          Math.cos(a2) * 0.26, 0.02 + Math.sin(a2) * 0.26);
        line(k % 2 ? fg : mk, fe);
        const eye = p();
        eye.arc(Math.cos(a2) * 0.26, 0.02 + Math.sin(a2) * 0.26, 0.026, 0, Math.PI * 2);
        fill(fg, eye);
      }
      const nk = p(); nk.moveTo(-0.10, -0.01); nk.lineTo(-0.13, -0.14);
      g.lineWidth = 0.026; line(mk, nk); g.lineWidth = 0.016;
      break;
    }
    default: {
      const d2 = p(); d2.arc(0, 0, 0.14, 0, Math.PI * 2);
      fill(mk, d2);
    }
  }
}
