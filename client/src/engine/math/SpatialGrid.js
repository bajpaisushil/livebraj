/**
 * Uniform grid broad-phase. Used for collision, building placement, flower
 * lookup and proximity — anywhere an O(n^2) scan would otherwise appear.
 */
/** One per grid, so two grids holding the same object cannot confuse each other. */
let GRID_N = 0;

export class SpatialGrid {
  constructor(cell = 24) {
    this.cell = cell; this.map = new Map(); this.count = 0;
    /*
     * A query stamp, and which field this grid writes it to.
     *
     * Anything bigger than a cell is deliberately inserted into EVERY cell it
     * covers — WorldService._index does this, because indexing a 176 m wall by
     * its centre alone leaves holes you can walk through along most of its
     * length. The cost is that the wall then comes back once per cell in any
     * query that touches it: measured on the ghat treads, the same collider
     * appeared eight times in one query, and `collide` tested it eight times,
     * twice a pass, every frame, for every walker.
     *
     * So each query gets a number and each item remembers the last one it was
     * returned for. One integer compare per hit, no allocation, no Set.
     */
    this._stamp = 0;
    this._mark = '_q' + (++GRID_N);
  }

  _key(x, z) { return `${Math.floor(x / this.cell)},${Math.floor(z / this.cell)}`; }

  insert(x, z, item) {
    const k = this._key(x, z);
    let arr = this.map.get(k);
    if (!arr) { arr = []; this.map.set(k, arr); }
    arr.push(item);
    this.count++;
    return item;
  }

  /**
   * Items in every cell overlapping the radius, each at most once.
   *
   * Still approximate — a cell that merely overlaps the radius contributes all
   * of its items, so callers must do their own exact test. What it no longer
   * does is hand you the same item several times.
   */
  query(x, z, radius, out = []) {
    out.length = 0;
    const c = this.cell;
    const mark = this._mark, q = ++this._stamp;
    const x0 = Math.floor((x - radius) / c), x1 = Math.floor((x + radius) / c);
    const z0 = Math.floor((z - radius) / c), z1 = Math.floor((z + radius) / c);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const arr = this.map.get(`${ix},${iz}`);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const it = arr[i];
          if (it[mark] === q) continue;
          it[mark] = q;
          out.push(it);
        }
      }
    }
    return out;
  }

  /**
   * Take things out again.
   *
   * There was no way to do this at all, which is why `GatheringSystem.dispose`
   * left 227 colliders standing in a world it had otherwise cleaned up: you
   * were shoved 1.42 m out of a person who was no longer drawn. Harmless while
   * the only caller disposed the whole world a moment later, but "harmless
   * because nothing does it yet" is how that kind of thing survives.
   *
   * A single sweep of every cell rather than a per-item index of where it was
   * put, because anything larger than a cell is deliberately inserted into
   * EVERY cell it covers (see WorldService._index) — so a per-item record
   * would have to be a list, and removal is a thing that happens once, on
   * teardown, while insertion happens tens of thousands of times at boot. Pay
   * the cost where it is not felt.
   *
   * @param {(item: any) => boolean} pred  true for the items to drop
   * @returns {number} how many were removed
   */
  removeWhere(pred) {
    let gone = 0;
    for (const [k, arr] of this.map) {
      let w = 0;
      for (let i = 0; i < arr.length; i++) {
        if (pred(arr[i])) { gone++; continue; }
        arr[w++] = arr[i];
      }
      arr.length = w;
      if (!w) this.map.delete(k);
    }
    // `count` is insertions, not distinct items, so it is decremented by the
    // number of cell entries dropped — which is what it counted going in.
    this.count -= gone;
    return gone;
  }

  clear() { this.map.clear(); this.count = 0; }
}
