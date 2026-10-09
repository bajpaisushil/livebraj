# Kaliya Ghat — dry, and a basin the ground opens for

Queue item 12 (its last ghat) and item 19 (*holes in the terrain for sunken
things*).

## What is there today

The river is not. Growse, *Mathura: A District Memoir* (1883): "The river
front of the town has a succession of ghats reaching for a distance of about
a mile and a-half … The one highest up the stream is the Kali-mardan Ghat
with the kadamb tree from which Krishna plunged into the water to encounter
the great serpent Kaliya; and the lowest at the other end is Kesi Ghat." And
on Madan Mohan, "on a high cliff near the Kali-mardan, or as it is more
commonly called, the Kali-dah Ghat". The Yamuna has since moved: OSM's
riverbank and the February 2024 imagery both put the water 540–546 m north.
Every present-day account (tirthayatra.org, radhanathswamiyatras.com,
ausram.blogspot.com, thegaudiyatreasuresofbengal.com, faujitoursandtravels.com)
says the same three things: the river has moved away; the kadamba from which
Krishna leapt still stands, hollow and still growing; and the place is on the
Parikrama Marg a few minutes' walk from Madan Mohan.

## Sources for the build

| Source | What it gave |
|---|---|
| OSM way 334669919 "Kaliya Ghata" (`amenity=place_of_worship`, `barrier=fence`) | the enclosure: a strip 48 × 13 m along the Parikrama Marg, a bulge to 21 m at its south-west end |
| OSM node 3417299004 "Kadamba tree" (`natural=tree`) | the tree, in the bulge |
| OSM way 334669313 "Old Kaliya Temple" | a ROUND building 6.6 m across at the north-east end |
| OSM way 334669314 | Sripad Prabodhananda Sarasvati's samadhi, 25 m off behind the houses (not built here) |
| Photograph (faujitoursandtravels.com) | a dry sunken court in red sandstone, steps down one side, a domed chhatri on four pillars, a tall carved pillar, a tiered stone lamp tower, the hooded serpent with Krishna; above the court on a platform the temple — pink domes, a painted frieze round the drum, railings, three arched niches in the platform's face toward the court |
| ESRI z19, measurement only | the strip under its trees, the pink domes at OSM's round building |

## What is built (world/KaliyaGhat.js)

Frame: origin the game's pin, +lx north-east along the strip (bearing 57),
+lz away from the marg. The fence round OSM's outline — a low red sandstone
wall with an iron railing, a gate from the marg between the court and the
tree, another at the north-east end. Inside, red flags. The court 13 × 11 m
to its walls, its floor 2.2 m below the paving, eight steps down from the
south-east; in it the chhatri, the pillar, the lamp tower and the serpent
with Krishna dancing on the middle hood. The temple on its platform rising
out of the court, the three niches in the platform's face, the drum with its
frieze, the pink dome, a second small dome behind, a railing, a flight up
from the paving. The kadamba at OSM's node on a round railed platform: a
thick fluted trunk with a dark hollow at its foot, red thread wound round
it, broad crown, eleven clay pots hanging on strings. A board by the tree.

**Inferred, and said so in the builder:** the court's size and depth (eight
steps in the photograph; 2.2 m); which way the temple's door faces; the
second dome's place; the number of pots. **Not built:** the Kaliya Mardan
temple "around 100 m away", which no source places precisely.

## Basins (TerrainBuilder)

A location declares `basin: { lx0, lx1, lz0, lz1 }` in its own frame. The
ground mesh (22 m quads) drops every quad the basin touches; the terrain then
lays back the very triangles it dropped, each with the basin cut out of it
(a convex triangle minus a convex basin is a run of convex pieces, edge by
edge of the basin), every new corner given the triangle's own height, colour
and normal by barycentric weights — the same surface to the last vertex, so
no seam, no gap and no lip into the court. The builder draws the basin; the
court floor and treads are colliders, and `standHeight` already lets you
stand on a surface below the terrain when you came down to it. A first cut
that re-sampled the ground finely came out a lighter rectangle from the air:
the mesh only samples the ground's colour every 22 m. Kaliya's court opens 3
quads.

The same will serve every kund (they are stacked boxes sunk into a terrain
that covers them) and Rangaji's tank, which went onto a terrace for want of
it.

## Guarded by

`tools/checks/kaliya.mjs`, 12/12, mutation-tested three ways: without the
basin the ground covers the court (the first thing straight down is the
ground at 0.24 m); without the terrain's refill 94 of 94 points round the
court find a hole; without the court's floor you cannot get down into it.
