# Garud Govind — the temple and the kund at Chhatikara

Queue item 22. Seven hundred metres from where every player starts, and the
game had only a surveyed point ("Stepped masonry tank (kund) at Chhatikara")
and a walled complex beside it.

## What is there

**The legends** (brajfoundation.org): infant Krishna's *chhati* pujan was
held here, which is how Chhatikara has its name; the boy Krishna climbed on a
friend's shoulders playing that he was Garuda; and Krishna granted Kaliya
that here snakes need not fear Garuda — so it is a place for Kaal Sarp pujan.
The deity is Govind, Krishna in his Narayana form, seated on Garuda: "a rare
and exquisite idol of Krishna seated on a Garud" (brajfoundation.org); by some
accounts twelve-armed, with Lakshmi, Satyabhama and Rukmini
(vrindavanmathuraguide.com).

**The kund** was silted up; the Braj Foundation de-silted it from October
2007 with heavy machinery, dug its base deeper, spread the excavated soil in
the adjoining forest, and connected a larger water body to the Vrindavan
Minor canal. "The kund is upto the brim with clean water and remains so
during most of the year." Rs 3 lakh, funded by Kamal Morarka. The forest
round it is the 27-acre Shadang van.

## Sources for the build

| Source | What it gave |
|---|---|
| ESRI z19, measured on a 1 m grid | the tank's paved border 49.4 x 52.4 m, its long side turned 51 degrees from east, centred about (-6241, 1443); a border about 2.5 m wide on the north-west and south-west sides; the temple compound against its east corner, a white round top (the shikhara) at about (-6186, 1447); a natural pond north of the tank; the road past on the east; scrub forest round it all |
| brajrasik.org gallery, 24 photographs (March 2024) | the kund's vertical rubble-stone walls whitewashed along the top; a red sandstone coping with hexagonal-lattice jali railings and ball finials; a railed platform out over the water about 2 m down; ghats with small chhatris at the far corners; a paved walk round it with red sandstone benches, trees on round platforms, a Shiva lingam; the temple painted lime green with a small white nagara shikhara; a white-flagged courtyard with a pillared veranda; a small white shrine with a pyramidal roof; a blue wall mural of Garuda seizing a snake; a white scalloped-arch gateway at the road; Govind on Garuda in the sanctum, garlanded |
| brajfoundation.org | the restoration, the water, the forest |

## Not yet known

The temple's plan inside its walls; how the kund's ghats are laid out on the
side the imagery's trees hide; the gate's exact place on the road.

## What is built (world/GarudGovind.js)

The frame is the tank's own: origin its west corner, +lx along its
north-west side (bearing 40 degrees), +lz along its south-west side toward
the road. The location's pin is the temple's court, at (70, 82) of it.

**The kund**: the water 45 x 72.5 m, 2.1 m below the walk; the pit (the
water and the ghat) is the location's basin. Rubble-stone walls in courses,
whitewashed along the top; red sandstone coping and the jali railing on the
north-west, south-west and north-east sides, open where six steps go down to
the railed platform out over the water on the south-west side. At the far
end, by the temple, a ghat of eleven risers across the tank's width from its
head down to the water, between cheek walls, a small domed chhatri at each
end of its head. A paved walk round it with red sandstone benches, four
trees on round platforms, a Shiva lingam by the ghat's head. The water is
the pools' material (the river's, with its ripples and a Fresnel sky term).

**The temple**: its compound walled in lime green between the tank's east
side and the road; the court paved in white flags with black dots; rooms
round it in two storeys; a pillared veranda on its north-east side; the
small white shrine with its pyramid roof; the mural of Garuda seizing a
snake on the court face of the gate range; the white gate on the road, a
scalloped arch between two tall piers under a crest of small domes; a white
arched door in the west wall onto the ghat's head. The sanctum under the
white Nagara shikhara the imagery shows (1.5 m from it), its door on the
court, on a plinth with a pillared mandapa before it; Govind on Garuda
inside, before a yellow and gold backdrop.

## Guarded by

`tools/checks/garudgovind.mjs`, 11/11: the tank corner, the shikhara and the
surveyed point against the imagery; the kund sunk and the ground round it
whole; the walk in from the road to darshan, out to the kund and down the
ghat, the water's edge holding, back up, onto the platform; no house in the
compound. Every check that walks all temples takes it in: deities (veil,
pujari, hours), halls, steps, stairs, platforms, crowdfloor, mapwalk.
