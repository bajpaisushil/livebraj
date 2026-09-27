/**
 * Photographs of the Deities, on the altars, with the curtain drawn back.
 *
 * Where `content/deities.js` names an image, this hangs it at that landmark's
 * altar anchor: a panel standing in the shrine, lit a little above the room so
 * it reads as the thing you came to see rather than a picture on a wall.
 *
 * Everything here degrades to nothing. No manifest entry, no file, a file that
 * will not decode, no network — in every case the altar keeps the carved
 * geometry it already had. The Deities are the core of this world and a
 * half-loaded photograph is worse than none, so nothing is shown until it has
 * actually decoded.
 */

import * as THREE from 'three';
import { altarsFor } from '../../content/deities.js';

/** How far apart three altars stand, in metres. */
const ALTAR_GAP = 3.4;

/**
 * Panel size, and where it sits.
 *
 * The Deities are what the building is for and they were the smallest thing in
 * it: a 1.5 x 2.0 m picture floating almost three metres up, because the
 * altar anchor is ALREADY 1.35 m above the hall floor and the panel then added
 * its own half-height plus a lift on top of that. It hung over the shrine
 * rather than standing in it.
 *
 * Now it is sized to fill the shrine opening and centred close to the anchor,
 * which the builder puts at the front of the plinth — roughly where a standing
 * Deity's chest is. RAISE is a small lift only, not a second storey.
 *
 * Three things were still wrong once it was standing at the right height, and
 * all three only showed up in a screenshot:
 *
 * 1. It stood BEHIND the carving. `buildDeities` puts robed figures at the
 *    anchor, 1.5 m tall and 0.3 m deep, so the photograph was cut in half by a
 *    brown slab. The nudge was 0.12 m toward the back wall; it wanted to be
 *    0.62 m toward the worshipper, in front of the figures and behind the two
 *    lamps, which stand 1.5 m out to either side and are not in the way.
 * 2. It was stretched. The geometry was a fixed 2.6 x 3.4 portrait and the
 *    photographs are landscape — Radha Damodar is 1024 x 687 — so the Deities
 *    were drawn a third narrower than They are. The plane is now rebuilt from
 *    the decoded image's own aspect, which is why `_fit` exists and why the
 *    geometry is not made until the texture has arrived.
 * 3. It was too big: 3.4 m tall in a shrine whose Deities are 1.5 m, so it
 *    overhung the arch. Height is the fixed dimension now and width follows.
 */
const PANEL_H = 1.9;        // a little over the carved figures, which are 1.5 m
const RAISE = 0.42;         // anchor is chest height; lift to centre on the figures
const FORWARD = 0.45;       // IN FRONT of the carving, not behind it
const MIN_ASPECT = 0.62;    // a portrait plate stays a plate
const MAX_ASPECT = 1.85;    // a wide darshan photo stays wide

/** A day, in ms. Daily darshan is daily. */
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeityImages {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = 'Deities';
    this.panels = [];
    this._loader = new THREE.TextureLoader();

    ctx.scene.add(this.group);
    this._build();

    const shown = this.panels.length;
    if (shown) console.info(`[deities] ${shown} photograph${shown === 1 ? '' : 's'} on the altars`);
  }

  _build() {
    const ctx = this.ctx;
    for (const loc of ctx.data.LOCATIONS) {
      const entry = altarsFor(loc.id);
      if (!entry) continue;
      const anchor = ctx.world.anchorFor(loc.id);
      if (!anchor || !anchor.altar) continue;

      for (const a of entry.altars) {
        if (!a.file) continue;                    // named but not supplied yet
        this._hang(loc, anchor, a, entry);
      }
    }
  }

  /**
   * One panel, at one altar.
   *
   * The mesh is created hidden and only revealed once the texture has decoded,
   * so a slow load never shows an empty white board where a Deity should be.
   */
  _hang(loc, anchor, altar, entry) {
    const url = 'assets/deities/' + altar.file;
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false });
    // a placeholder plane: `_fit` replaces it with one of the photograph's own
    // shape as soon as the image has decoded, and until then it is invisible
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_H, PANEL_H), mat);

    // face the way a worshipper stands, offset for a left/centre/right altar
    const yaw = anchor.darshan
      ? Math.atan2(anchor.darshan.x - anchor.altar.x, anchor.darshan.z - anchor.altar.z)
      : loc.rot;
    const side = altar.side || 0;
    /*
     * Where this altar actually is.
     *
     * A builder that authors several altars publishes their positions, and that
     * is what gets used. The fallback below — a fixed sideways gap — is only
     * for a temple that has not said, and it was the whole bug: Krishna
     * Balaram's three bays are 7.2 m either side of centre and this used 3.4,
     * so the right altar's photograph hung on the PIER between the centre and
     * right bays. "The deities are showing in the right wall not in main area."
     *
     * The improvised axis was wrong as well. (cos yaw, -sin yaw) is the MIRROR
     * of the builder's own local +x, (cos rot, sin rot) — they agree only at
     * rot = 0, so any temple not facing due north would have had its left and
     * right altars swapped. Asking the builder removes the guess entirely.
     */
    const known = (anchor.altars || []).find((a) => a.side === side);
    if (known) {
      mesh.position.set(known.x, known.y + RAISE, known.z);
    } else {
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      mesh.position.set(
        anchor.altar.x + rx * side * ALTAR_GAP,
        anchor.altar.y + RAISE,
        anchor.altar.z + rz * side * ALTAR_GAP,
      );
    }
    // toward the worshipper, clear of the carved figures standing at the anchor
    mesh.position.x += Math.sin(yaw) * FORWARD;
    mesh.position.z += Math.cos(yaw) * FORWARD;
    mesh.rotation.y = yaw;
    mesh.visible = false;
    mesh.name = 'Deity:' + loc.id + ':' + (altar.name || '');
    this.group.add(mesh);

    const rec = { mesh, mat, altar, entry, loc, lastFetch: 0 };
    this.panels.push(rec);
    this._load(rec, url);

    if (entry.daily) this._maybeRefresh(rec);
  }

  /** Load a texture and reveal the panel only once it is really there. */
  _load(rec, url) {
    this._loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const old = rec.mat.map;
        rec.mat.map = tex;
        rec.mat.needsUpdate = true;
        this._fit(rec, tex);
        rec.mesh.visible = true;
        rec.mat.opacity = 1;
        if (old) old.dispose();
      },
      undefined,
      () => {
        // missing or undecodable: the carved altar stands as it did
        console.info(`[deities] no image for ${rec.loc.id} (${url}) — using the carving`);
      },
    );
  }

  /**
   * Give the plane the photograph's own proportions.
   *
   * Height is fixed so the Deities always stand the same in Their shrine; width
   * follows the image. The aspect is clamped because a manifest can point at
   * anything, and a panorama 4 m wide would hang out through the side walls.
   */
  _fit(rec, tex) {
    const img = tex.image;
    if (!img || !img.width || !img.height) return;
    const aspect = Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, img.width / img.height));
    const w = PANEL_H * aspect;
    if (rec.fitW === w) return;
    rec.fitW = w;
    const old = rec.mesh.geometry;
    rec.mesh.geometry = new THREE.PlaneGeometry(w, PANEL_H);
    if (old) old.dispose();
  }

  /**
   * Daily darshan, if the manifest asked for it and the device is online.
   *
   * Never blocks and never replaces a good image with a failure. The packaged
   * photograph is already up; this only swaps it if a fresh one arrives.
   */
  _maybeRefresh(rec) {
    const now = Date.now();
    if (now - rec.lastFetch < DAY_MS) return;
    rec.lastFetch = now;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const url = rec.entry.daily;
    if (!url) return;
    // cache-busted by the day, not the millisecond: once a day is the point
    this._load(rec, url + (url.includes('?') ? '&' : '?') + 'd=' + Math.floor(now / DAY_MS));
  }

  update() { /* panels are static; the refresh is time-based, not per frame */ }

  dispose() {
    for (const rec of this.panels) {
      if (rec.mat.map) rec.mat.map.dispose();
      rec.mat.dispose();
      rec.mesh.geometry.dispose();
    }
    this.ctx.scene.remove(this.group);
    this.panels.length = 0;
  }
}
