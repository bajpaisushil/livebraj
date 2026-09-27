/**
 * Procedural textures are generated once and shared. Nothing in this project
 * loads an image file, so every surface pattern lives in a CanvasTexture built
 * on first use and cached here for the life of the session.
 */
export class TextureCache {
  constructor() { this.map = new Map(); }

  get(key, factory) {
    let t = this.map.get(key);
    if (!t) { t = factory(); this.map.set(key, t); }
    return t;
  }

  /** Draw into a fresh canvas and return it — the common case for `factory`. */
  static canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    return c;
  }

  dispose() {
    for (const t of this.map.values()) if (t && t.dispose) t.dispose();
    this.map.clear();
  }
}
