# Brahma Kund — the old walled pit, the octagon, Brahma on the lotus

Queue item 19's second place (Kaliya Ghat's court was the first): a kund
sunk below its street, which the ground mesh could not show until a place
could declare a basin.

## What is there today

The Braj Foundation restored it. Before: "the Brahma kund was in an abject
state of neglect. It had become very filthy, with a strong foul smell, as it
was being used as a dump site for the local municipal garbage carts for
several decades … encroached upon from all four sides and one of the ghats
was converted to a house" (Amita Bhaduri, India Water Portal, 23 September
2017). From July 2006, thirty months of work: "earthmovers dug till the water
level was reached. The silt thus excavated was used for landscaping the
surroundings of the kund … Once the kund was desilted, the natural aquifers
opened up filling it with naturally sweet water" — the shallow unconfined
aquifer, 30-80 m. Built: "Octagonal ghats with steps were built and
sculptures of fish and turtles were kept on the steps to give it a natural
look. An 8 ft high Brahma sitting over the 13 ft wide lotus flower has been
installed in the center of the kund. Each petal of the lotus throws the pond
water back into the kund"; "39 stone plaques of 5 ft x 3 ft" of the Brahma
Samhita; life-size statues of Chaitanya Mahaprabhu, Rupa and Sanatana
Goswami, Meera Bai, Karmaiti Bai "and others" (brajfoundation.org). "One of
the ancient pillars of the Brahma Kund had been left intact during the
renovation to tell people how old the kund is" (Down To Earth, 18 September
2014). Funded by the Piramal Foundation.

The legends (brajrasik.org): formed, some say, from Brahma's tears; Vrinda
Devi bathed Narada here into a gopi so he could see the rasa; Rupa Goswami
found her deity here, now at Kamyavan. "Located on the Northern Periphery of
Rangnath Temple … considered to be the Brahma Sthan."

## Sources for the build

| Source | What it gave |
|---|---|
| ESRI z19, measured on a 1 m grid | the octagon 28.4 m across its flats, centred (1076.0, -375.0); the water about 17.6 m; the lotus a pale disc at the exact centre; the north wall's top with a notch for the statue bay and a row of dots in it (the saints' heads); the entrance strip south to the lane, a building on it, broad steps at its lane end; trees over the east side |
| OSM way 671678180 (the enclosure) | fits the walls; the frame is turned to it (-0.7 degrees) |
| OSM way 671678179 (water) | a circle 11 m north of the real tank, on the north garden — not used |
| Braj Foundation photographs, 2006-2008 | the dig; the old walls 6 m high with houses on them and round bastions; the octagon in red sandstone, two tiers of about ten risers with zigzag flights; the round well ring at the centre that became the lotus's ring; the finished garden with hedges along the rim, the saints on their ledge between two bastions, plaques in rows |
| martinsatte.livejournal.com (2014), brajrasik.org (2017) | the walls painted pink; the entrance — a pink gatehouse with a door and two windows on the garden, a flight down each side of it from a railed terrace on its roof, an old unpainted brick bastion either side; green water; Brahma white, four heads with gold crowns, a red book in one hand, on a pink lotus, a white swan beside him, facing north toward the saints |

## What is built (world/BrahmaKund.js)

Frame: origin the octagon's centre, +lx east, +lz south. The street is the
terrain's highest point round the pit (+0.05); the garden 6.0 m below it;
the octagon's mid landing 1.6 m below the garden and its water landing 1.6 m
further, the water 0.35 m below that, two more steps under the water to a
muddy floor. Each of the eight sides: from each corner a flight of nine
treads runs down along the upper wall to a bay at the mid level; the mid
landing goes all the way round; from the middle of each side a flight runs
down each way to the corners; the water landing goes all the way round.
Hedges along the rim, open at the corners where the flights start; a paved
walk behind them; grass to the walls. The walls rendered and painted pink,
courses every 1.2 m, a parapet and railing along their tops; two pink
bastions on stepped round feet flanking the bay; the eight saints on a 2.4 m
ledge with eight plaques under them; the other 31 plaques along the north,
west and east walls and either side of the way in, a lamp over each; two
old brick bastions at the entrance, unpainted, broken off short. The way in:
a paved forecourt off the lane, a broad flight of 18 risers down to a
landing, the terrace over the gatehouse with its railings, a flight of 18
risers down either side of the gatehouse to the garden. In the middle: the
old well ring in red stone, the lotus of 22 petals 4.1 m across, the seed
pod, Brahma 2.46 m with four heads and beards, gold crowns, four arms with
the water pot, the Vedas, the rosary and the ladle, a marigold garland, the
swan. Two trees over the east side and two palms in the north corners.

**Inferred, and said so in the builder:** the depths (the photographs give
two tiers of about ten risers and walls about four times a tier above the
rim); the stepwell pattern on all eight sides; the broad flight's risers;
which saint stands where; the trees' species. Brahma faces north as in every
photograph since 2014; the 2008 statue faced the entrance.

## What the world had to learn (item 19)

A basin 9 m deep is not Kaliya's 2.2 m court, and three things that never
had to think about one did:

- **The river.** The Yamuna is one plane under the whole map at -3.6 m,
  hidden by the ground except in its channel. The garden is at -6.1 m: from
  above, the pit read as a flooded tank. The plane's shader now discards
  inside every basin (TerrainBuilder, `onBeforeCompile`).
- **Standing.** No surface within a step meant "stand on the terrain" — in
  a basin, the street. Step off an open-sided flight and you rose 7.6 m
  through the masonry. In a basin a drop is now a drop (WorldService
  `_standOn`); over a gap in what was built you keep your height.
- **The camera.** "Never let the rig dip under the street" held it 6 m
  over anyone in the garden, and its collision ray counted everything below
  the street as solid. Both now ask `floorUnder`: the ground, or in a basin
  what is built under the camera.

Basins can now be several rectangles (the pit and the flight down into it),
and a builder's extra mesh can be glossy (the pool, which in the town's matt
material read as a lawn).

Found while checking: the unstick search — "pressing into something for a
second and a half means you are wedged" — took a standable water surface for
open ground and dropped you on the pool. The pool is solid to a body now,
knee-high like its edge.

## Guarded by

`tools/checks/brahmakund.mjs`, 16/16: the centre against the imagery, the
depths, seeing down into it and not the street, the ground round it whole,
no river pixel in the pit, the walk from the lane to darshan at the water and
back, the water's edge (and the unstick) holding, a ledge as a drop, the
camera coming down and staying off your head, no house in the compound.
Mutation-tested five ways: see the queue.
