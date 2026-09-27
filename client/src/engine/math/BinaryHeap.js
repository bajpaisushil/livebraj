/**
 * A minimal binary min-heap, used as the A* open set.
 *
 * With ~24,000 nodes in the road graph, scanning the open set linearly for the
 * cheapest frontier node turns a route request into a visible hitch. This keeps
 * it at O(log n) and allocates nothing per query once warm.
 */
export class BinaryHeap {
  constructor() {
    this.items = [];
    this.scores = [];
  }

  get size() { return this.items.length; }

  clear() { this.items.length = 0; this.scores.length = 0; }

  push(item, score) {
    this.items.push(item);
    this.scores.push(score);
    this._up(this.items.length - 1);
  }

  pop() {
    const top = this.items[0];
    const lastItem = this.items.pop();
    const lastScore = this.scores.pop();
    if (this.items.length) {
      this.items[0] = lastItem;
      this.scores[0] = lastScore;
      this._down(0);
    }
    return top;
  }

  _up(i) {
    const item = this.items[i], score = this.scores[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.scores[parent] <= score) break;
      this.items[i] = this.items[parent];
      this.scores[i] = this.scores[parent];
      i = parent;
    }
    this.items[i] = item;
    this.scores[i] = score;
  }

  _down(i) {
    const n = this.items.length;
    const item = this.items[i], score = this.scores[i];
    for (;;) {
      const l = 2 * i + 1;
      if (l >= n) break;
      const r = l + 1;
      const child = (r < n && this.scores[r] < this.scores[l]) ? r : l;
      if (this.scores[child] >= score) break;
      this.items[i] = this.items[child];
      this.scores[i] = this.scores[child];
      i = child;
    }
    this.items[i] = item;
    this.scores[i] = score;
  }
}
