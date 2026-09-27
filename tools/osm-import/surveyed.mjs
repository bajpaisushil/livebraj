/**
 * Features traced from satellite imagery, and what we were sure of.
 *
 * OpenStreetMap's Vrindavan is good geometry and thin coverage: it knows the
 * roads somebody walked with a GPS and not the lanes between them. This file
 * is the rest, read off Esri World Imagery — which Esri explicitly permits
 * OpenStreetMap contributors to trace from, and which is the licence this
 * whole file stands on. The imagery itself is not copied or shipped; only our
 * own description of what is visibly there.
 *
 * Five sectors were surveyed: ISKCON and Raman Reti, the old town and Loi
 * Bazar, the Yamuna ghats, the Parikrama Marg where it runs north and west,
 * and the Chhatikara corridor. 28 roads and 32 places that our map
 * did not have.
 *
 * CONFIDENCE IS LOAD-BEARING. A pale line in a satellite photograph might be a
 * lane, a field boundary, a drain or a wall, and at this resolution you often
 * cannot tell. Every entry carries the surveyor's own reasoning, and anything
 * they were not sure of is `confirmed: false` and is NOT imported — it sits
 * here as a question for somebody who has walked there, exactly as the
 * unconfirmed Jagadguru Kripalu Marg does in local-knowledge.mjs. Inventing a
 * road is worse than missing one: a routed line through a wall is a bug you
 * cannot see until you drive it.
 *
 * Roads: 10 high confidence, 9 medium, 9 low (held back).
 *
 * Source: Esri World Imagery, traced 2026-09-22.
 * Map data (c) OpenStreetMap contributors, ODbL 1.0, for everything else.
 */

/** Roads and lanes visible in imagery that OSM does not carry. */
export const SURVEYED_ROADS = [
  {
    sector: 'parikrama-north-west',
    name: 'Yamuna embankment causeway across the backwater mouth, from the west bank to the boat landing north of Madan …',
    kind: 'street',
    confirmed: true,
    confidence: 'high',
    why: 'high - a built causeway, not a natural bank: uniform 6-7 m width, clean parapet edges on both sides, a dark vehicle-siz…',
    points: [[27.583097, 77.687176], [27.58318, 77.687343], [27.583223, 77.687529], [27.583193, 77.687718], [27.583157, 77.687906], [27.583109, 77.688091], [27.583062, 77.688276], [27.583014, 77.688461], [27.582965, 77.688644], [27.582929, 77.688833], [27.582906, 77.689023], [27.582891, 77.689215], [27.582884, 77.689407], [27.582873, 77.6896], [27.582864, 77.68977]],
  },
  {
    sector: 'parikrama-north-west',
    name: 'West-edge graded road, from the large walled yard south to the existing east-west village road',
    kind: 'street',
    confirmed: true,
    confidence: 'high',
    why: 'high - a continuous graded unpaved road 7-8 m wide, with a masonry boundary wall running along its west side for most o…',
    points: [[27.583798, 77.671872], [27.583585, 77.671791], [27.583368, 77.671726], [27.58315, 77.671663], [27.582937, 77.671583], [27.582726, 77.671497], [27.582515, 77.671411], [27.582308, 77.671315], [27.582099, 77.671221], [27.58189, 77.671128], [27.581683, 77.671031], [27.581476, 77.670932], [27.581266, 77.67084], [27.581057, 77.67075], [27.580852, 77.670646], [27.580647, 77.670543], [27.580443, 77.670439], [27.580237, 77.670337], [27.580024, 77.670255], [27.579872, 77.6702]],
  },
  {
    sector: 'parikrama-north-west',
    name: 'Branch track across the grazing ground, joining the west-edge graded road from the north-west',
    kind: 'path',
    confirmed: true,
    confidence: 'medium',
    why: 'medium - an unambiguous pale wheel-track across open grazing land, and it demonstrably meets the graded road at a widen…',
    points: [[27.583654, 77.670524], [27.583552, 77.670678], [27.583448, 77.670831], [27.583349, 77.670987], [27.583245, 77.671141], [27.583147, 77.671298], [27.583079, 77.671467]],
  },
  {
    sector: 'parikrama-north-west',
    name: 'Track across the barren fallow ground south-east from the existing road, towards the field road',
    kind: 'path',
    confirmed: true,
    confidence: 'medium',
    why: 'medium - a 4-5 m braided vehicle track over a large bare/fallow patch, connecting an already-mapped road at its north-w…',
    points: [[27.583331, 77.678277], [27.583123, 77.678374], [27.582922, 77.678487], [27.582722, 77.678601], [27.582524, 77.67872], [27.582333, 77.678854], [27.582149, 77.678998], [27.581972, 77.679153], [27.581824, 77.679344], [27.581725, 77.679568], [27.581681, 77.679816], [27.581633, 77.680122]],
  },
  {
    sector: 'parikrama-north-west',
    name: 'Field track in the north-west farmland, running south-east between field blocks',
    kind: 'path',
    confirmed: false,
    confidence: 'low',
    why: 'low - a continuous pale sinuous line between cultivated blocks, consistent with a farm track, but I cannot separate it …',
    points: [[27.593949, 77.674548], [27.59372, 77.674708], [27.593517, 77.674904], [27.593324, 77.675115], [27.593116, 77.675309], [27.592869, 77.675427], [27.592613, 77.675522], [27.59236, 77.675624], [27.592105, 77.675724], [27.591847, 77.675809], [27.591584, 77.675872], [27.591317, 77.675967]],
  },
  {
    sector: 'parikrama-north-west',
    name: 'Line along the north edge of the riverside settlement, running south-west from the causeway\'s west end',
    kind: 'path',
    confirmed: false,
    confidence: 'low',
    why: 'low - a straight dark line with a pale strip beside it, marking the boundary between the green riverside fields and the…',
    points: [[27.582864, 77.686882], [27.582731, 77.686666], [27.582593, 77.686452], [27.582455, 77.686239], [27.582317, 77.686028], [27.582176, 77.685817], [27.582037, 77.685635]],
  },
  {
    sector: 'parikrama-north-west',
    name: 'Foreshore connector from the causeway\'s east end across the sand to the existing road head at the boat landi…',
    kind: 'path',
    confirmed: false,
    confidence: 'low',
    why: 'low - the causeway plainly ends on an open sandy foreshore and an already-mapped road head begins about 75 m away, so a…',
    points: [[27.582864, 77.68977], [27.58281, 77.689943], [27.582747, 77.690115], [27.582675, 77.690297], [27.582585, 77.690459]],
  },
  {
    sector: 'chhatikara-corridor',
    name: 'Unpaved road along the east side of the lined drain, running NNE-SSW past the CHC/hotel block towards Vrindav…',
    kind: 'street',
    confirmed: true,
    confidence: 'high',
    why: 'medium-high - verified by drawing the trace back over the imagery (tiles/try_canal.png): it sits on a broad 20-30 m san…',
    points: [[27.559732, 77.675825], [27.55948, 77.675739], [27.559229, 77.675652], [27.558977, 77.675592], [27.558726, 77.675531], [27.558474, 77.67543], [27.558223, 77.675328], [27.557971, 77.675242], [27.55772, 77.675156], [27.557468, 77.675049], [27.557217, 77.674943], [27.557015, 77.674847], [27.556812, 77.67475]],
  },
  {
    sector: 'chhatikara-corridor',
    name: 'Lane through the roadside hamlet, running WNW-ESE from the mapped north-south lane to the field track',
    kind: 'street',
    confirmed: true,
    confidence: 'high',
    why: 'medium-high - verified by overlay (tiles/try_h06.png); the trace follows the lane between the two facing rows of houses…',
    points: [[27.561097, 77.643272], [27.560936, 77.643485], [27.560774, 77.643697], [27.560608, 77.643925], [27.560442, 77.644153], [27.560244, 77.644549], [27.560118, 77.644914], [27.559912, 77.645258]],
  },
  {
    sector: 'chhatikara-corridor',
    name: 'Footpath through the grove from the north to the stepped masonry tank (kund) at Chhatikara',
    kind: 'path',
    confirmed: true,
    confidence: 'medium',
    why: 'medium in the middle section (lat 27.5675-27.5666, where it is a clear pale line on open ground beside the kund), low a…',
    points: [[27.568068, 77.626701], [27.567781, 77.626752], [27.56752, 77.626793], [27.567233, 77.626843], [27.566927, 77.626813], [27.566622, 77.626843], [27.56638, 77.626914], [27.566119, 77.627026]],
  },
  {
    sector: 'chhatikara-corridor',
    name: 'North-west boundary lane of the unmapped plotted colony west of the village (runs along the field edge, past …',
    kind: 'street',
    confirmed: false,
    confidence: 'low',
    why: 'low - the colony itself is certain and almost entirely unmapped, but this particular line is my third attempt and it st…',
    points: [[27.557298, 77.648745], [27.557028, 77.648542], [27.556777, 77.64837], [27.556525, 77.648207], [27.556273, 77.648045], [27.556022, 77.647883], [27.555779, 77.647731], [27.555618, 77.64763]],
  },
  {
    sector: 'chhatikara-corridor',
    name: 'Main graded spine through the new plotted layout east of the brick-kiln fields',
    kind: 'street',
    confirmed: false,
    confidence: 'low',
    why: 'low - the site is unmistakable (a large freshly graded plot layout with no magenta anywhere on it) but in Feb 2024 it w…',
    points: [[27.556911, 77.663622], [27.55675, 77.66385], [27.556588, 77.664079], [27.556426, 77.664312], [27.556264, 77.664545], [27.556103, 77.664773], [27.555941, 77.665001], [27.555775, 77.665229], [27.555609, 77.665457], [27.555384, 77.665761]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Yamuna riverside embankment crest, SW riverfront (from the SW sector edge toward Chir Ghat) — masonry revetme…',
    kind: 'path',
    confirmed: false,
    confidence: 'low',
    why: 'low-medium — the linear structure itself is unambiguous (sharp straight river-side edge, ~3-5 m wide, continuous 184 m,…',
    points: [[27.584049, 77.693622], [27.584211, 77.693855], [27.584373, 77.694088], [27.584534, 77.694321], [27.584696, 77.694554], [27.584885, 77.694838], [27.585055, 77.695101]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Yamuna riverfront promenade / ghat apron, Chir Ghat to Keshi Ghat — the broad paved strip at the water\'s edg…',
    kind: 'path',
    confirmed: true,
    confidence: 'high',
    why: 'high that an open, used way exists here; medium on the exact centreline. Seen directly in bank_540.png at 11.3 cm/px: a…',
    points: [[27.585109, 77.695273], [27.585244, 77.695456], [27.58537, 77.695628], [27.585496, 77.695821], [27.58563, 77.696003], [27.585765, 77.696206], [27.5859, 77.696398], [27.586026, 77.696591], [27.586151, 77.696773]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Gali running south off the Keshi Ghat–Mathura Road frontage into the block east of Radha Gopinath (no name le…',
    kind: 'gali',
    confirmed: true,
    confidence: 'medium',
    why: 'medium — a continuous N-S corridor ~2 m wide seen at 10.7 cm/px in z1_ov.png, with a bare-earth/brown surface distinct …',
    points: [[27.587023, 77.701598], [27.586726, 77.701598], [27.586538, 77.701598], [27.586349, 77.701557], [27.586107, 77.701527]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Gali through the Radha Raman / Radha Gokulananda / Gopal Bhatta Samadhi block, running N-S between the Gopina…',
    kind: 'gali',
    confirmed: true,
    confidence: 'medium',
    why: 'medium-low — this is the single largest genuinely unserved built block in the old core (median separation 54.5 m from a…',
    points: [[27.586071, 77.699206], [27.585918, 77.699216], [27.585756, 77.699206], [27.585603, 77.699196], [27.585442, 77.699186], [27.58528, 77.699206], [27.585127, 77.699236], [27.584966, 77.699256]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Unpaved track from the Keshi Ghat boat-landing road north into the Yamuna riverbed vegetable plots',
    kind: 'path',
    confirmed: true,
    confidence: 'medium',
    why: 'medium — clear pale cart track ~3 m wide in b09_ov.png running between the striped riverbed vegetable beds. Starts ON a…',
    points: [[27.588442, 77.703959], [27.588658, 77.703989], [27.588837, 77.70404], [27.58899, 77.704101], [27.589143, 77.704202], [27.589287, 77.704314], [27.58943, 77.704385]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Path network inside the walled Seva Kunj grove, from the north gate south past the courtyard',
    kind: 'path',
    confirmed: false,
    confidence: 'low',
    why: 'low-medium — pale sinuous lines through the dark canopy in b04_ov.png, forming a connected route from the north gate to…',
    points: [[27.582747, 77.694959], [27.58254, 77.695051], [27.582316, 77.695061], [27.582073, 77.694899]],
  },
  {
    sector: 'ghats-yamuna',
    name: 'Short interior gali in the block north-east of Gopishwar Mahadev',
    kind: 'gali',
    confirmed: false,
    confidence: 'low',
    why: 'low — shadowed corridor in b05_ov.png. Median separation 29 m but its north end is only 8 m from r101864893, so part of…',
    points: [[27.585603, 77.703888], [27.585406, 77.703888], [27.585217, 77.703868], [27.585038, 77.703858], [27.584903, 77.703837]],
  },
  {
    sector: 'iskcon-raman-reti',
    name: 'Unpaved N-S lane east of the barrel-vaulted hall, linking the E-W street at Z~364 to the E-W street at Z~603 …',
    kind: 'street',
    confirmed: true,
    confidence: 'high',
    why: 'high - continuous bare-earth corridor 8-10 m wide with parked vehicles visible on it at z19; it is a through-route, not…',
    points: [[27.576714, 77.676377], [27.576513, 77.676415], [27.576261, 77.676392], [27.576009, 77.676354], [27.575758, 77.676324], [27.575506, 77.676305], [27.575255, 77.676301], [27.575003, 77.676324], [27.574752, 77.67635], [27.574567, 77.676377]],
  },
  {
    sector: 'iskcon-raman-reti',
    name: 'N-S track along the west wall of the walled nursery south-west of ISKCON, from the street at Z~1095 to the st…',
    kind: 'gali',
    confirmed: true,
    confidence: 'high',
    why: 'medium-high - clear 4-5 m bare-earth lane between the residential block and the nursery wall, running the full 205 m be…',
    points: [[27.57014, 77.675444], [27.569925, 77.675432], [27.569676, 77.675417], [27.569427, 77.675407], [27.569177, 77.6754], [27.568928, 77.675396], [27.568679, 77.6754], [27.568461, 77.67541], [27.568298, 77.675432]],
  },
  {
    sector: 'iskcon-raman-reti',
    name: 'E-W working track inside the walled nursery south-west of ISKCON (representative of an internal network of ro…',
    kind: 'path',
    confirmed: true,
    confidence: 'medium',
    why: 'medium - unambiguous bare-earth track between planting beds, 47 m mean and 87 m max from our nearest polyline so genuin…',
    points: [[27.569302, 77.675417], [27.569305, 77.675642], [27.56931, 77.675906], [27.569302, 77.676169], [27.569294, 77.67638], [27.569279, 77.676494]],
  },
  {
    sector: 'iskcon-raman-reti',
    name: 'Field/cart track across farmland on the north fringe, running south-east to the settlement edge near the wall…',
    kind: 'path',
    confirmed: false,
    confidence: 'low',
    why: 'low-medium - 65-104 m from anything we hold, so certainly not in our data. I believe it is a trodden path rather than a…',
    points: [[27.577923, 77.675844], [27.577832, 77.675936], [27.57774, 77.67604], [27.577659, 77.676143], [27.577593, 77.676246], [27.577542, 77.67635], [27.577491, 77.676465]],
  },
  {
    sector: 'old-town-bazaar',
    name: 'Yamuna embankment walkway / ghat frontage, Kesi Ghat side NE towards Chir Ghat',
    kind: 'path',
    confirmed: true,
    confidence: 'high',
    why: 'high - a built embankment wall with a continuous walkable top, boats moored along its whole length, people visible on i…',
    points: [[27.58343, 77.692162], [27.58351, 77.692375], [27.583591, 77.692588], [27.583681, 77.692801], [27.583771, 77.693013], [27.583843, 77.693226], [27.583915, 77.693439], [27.584004, 77.693652], [27.584094, 77.693865], [27.584193, 77.694078], [27.584292, 77.69429], [27.584445, 77.694574], [27.584606, 77.694858]],
  },
  {
    sector: 'old-town-bazaar',
    name: 'unpaved track along the broad sandy corridor between the old-town edge and Parikrama Marg (SE of town)',
    kind: 'path',
    confirmed: true,
    confidence: 'high',
    why: 'medium-high that a used track exists here; medium on this exact centreline. The corridor is 60-90 m of bare sand runnin…',
    points: [[27.577357, 77.695851], [27.577186, 77.695608], [27.577016, 77.695365], [27.576858, 77.695111], [27.576701, 77.694858], [27.576544, 77.694605], [27.576387, 77.694351], [27.576243, 77.694098], [27.576099, 77.693844], [27.575965, 77.693591], [27.57583, 77.693338], [27.575695, 77.693084], [27.57556, 77.692831], [27.575426, 77.692578], [27.575291, 77.692324], [27.575129, 77.69202]],
  },
  {
    sector: 'old-town-bazaar',
    name: 'causeway / bund out into the Yamuna, enclosing a backwater, N of the compound at Sanatana Goswami bhajan kutir',
    kind: 'path',
    confirmed: true,
    confidence: 'high',
    why: 'high that the structure exists and is trafficable - a continuous pale built embankment with a compacted top, arcing nor…',
    points: [[27.583088, 77.687226], [27.583142, 77.687328], [27.583187, 77.68747], [27.583205, 77.687642], [27.583187, 77.687835], [27.583142, 77.688047], [27.58307, 77.68826], [27.582998, 77.688473], [27.582944, 77.688696], [27.5829, 77.68896], [27.582873, 77.689223], [27.582846, 77.689466]],
  },
  {
    sector: 'old-town-bazaar',
    name: 'north-south gali east of the Loi Bazar street, from the street at Z-172 south to the street at Z-118',
    kind: 'gali',
    confirmed: true,
    confidence: 'medium',
    why: 'medium - a continuous 2-3 m dark slot connecting two mapped streets at both ends, which is the signature of a through-g…',
    points: [[27.581507, 77.692618], [27.581372, 77.692608], [27.581238, 77.692598], [27.581112, 77.692588], [27.581031, 77.692578]],
  },
  {
    sector: 'old-town-bazaar',
    name: 'east-west gali running east from the previous lane to the street at X292',
    kind: 'gali',
    confirmed: true,
    confidence: 'medium',
    why: 'medium - a consistent narrow gap between roof blocks, straight, ending on a mapped street at its east end (10 m away) a…',
    points: [[27.581426, 77.69275], [27.581426, 77.692932], [27.581426, 77.693115], [27.581417, 77.693297], [27.581399, 77.693459]],
  },
];

/** Places visible in imagery that OSM does not carry. */
export const SURVEYED_PLACES = [
  {
    sector: 'parikrama-north-west', name: 'Boat landing and sandy foreshore north of Madan Mohan Mandir', kind: 'boat landing / ghat foreshore',
    confirmed: true, confidence: 'high',
    at: [27.582926, 77.690044],
  },
  {
    sector: 'parikrama-north-west', name: 'Open ground used for vehicle parking, with a market stall row, beside the Parikrama Marg', kind: 'parking ground and stall row',
    confirmed: true, confidence: 'high',
    at: [27.580923, 77.68675],
  },
  {
    sector: 'parikrama-north-west', name: 'Large walled complex with blue-roofed halls, west of the boat landing', kind: 'walled institutional complex',
    confirmed: true, confidence: 'medium',
    at: [27.582046, 77.689233],
  },
  {
    sector: 'parikrama-north-west', name: 'Large walled yard with blue-roofed sheds and laid-out foundations, north end of the west-edge road', kind: 'walled yard / development site',
    confirmed: true, confidence: 'medium',
    at: [27.584561, 77.672055],
  },
  {
    sector: 'parikrama-north-west', name: 'Active construction site with earthworks, brick stacks and plant, west of the west-edge road', kind: 'construction site',
    confirmed: true, confidence: 'high',
    at: [27.581417, 77.670433],
  },
  {
    sector: 'parikrama-north-west', name: 'Circular masonry well head in the grazing ground east of the west-edge road', kind: 'well',
    confirmed: false, confidence: 'low',
    at: [27.583277, 77.671436],
  },
  {
    sector: 'chhatikara-corridor', name: 'Stepped masonry tank (kund) at Chhatikara', kind: 'kund / water tank',
    confirmed: true, confidence: 'high',
    at: [27.56691, 77.62736],
  },
  {
    sector: 'chhatikara-corridor', name: 'Walled complex on the east bank of the kund (courtyards, pavilion, steps down to the water)', kind: 'walled compound, possibly an ashram or temple complex',
    confirmed: true, confidence: 'medium',
    at: [27.567044, 77.62807],
  },
  {
    sector: 'chhatikara-corridor', name: 'Pond north-east of the kund', kind: 'pond',
    confirmed: true, confidence: 'high',
    at: [27.567493, 77.627512],
  },
  {
    sector: 'chhatikara-corridor', name: 'Unnamed place of worship south of Bhaktivedanta Swami Marg (large white domed building)', kind: 'place_of_worship',
    confirmed: true, confidence: 'high',
    at: [27.563451, 77.638285],
  },
  {
    sector: 'chhatikara-corridor', name: 'Elevated water tower in the plotted colony west of the village', kind: 'water_tower',
    confirmed: true, confidence: 'high',
    at: [27.555546, 77.647589],
  },
  {
    sector: 'chhatikara-corridor', name: 'Unmapped plotted colony west of the village (built: walled plots, concrete streets, houses, water tower)', kind: 'residential colony',
    confirmed: true, confidence: 'high',
    at: [27.556354, 77.648947],
  },
  {
    sector: 'chhatikara-corridor', name: 'New graded plotted layout (bare earth, plots pegged, largely unbuilt as of Feb 2024)', kind: 'land development / plotted layout',
    confirmed: true, confidence: 'high',
    at: [27.556264, 77.664656],
  },
  {
    sector: 'chhatikara-corridor', name: 'Large institutional building under construction inside a walled compound', kind: 'building under construction',
    confirmed: true, confidence: 'medium',
    at: [27.568571, 77.630401],
  },
  {
    sector: 'chhatikara-corridor', name: 'Large construction site, rows of excavated foundation trenches', kind: 'construction site',
    confirmed: true, confidence: 'high',
    at: [27.564709, 77.629184],
  },
  {
    sector: 'ghats-yamuna', name: 'Jetty / pontoon lying in the Yamuna off Keshi Ghat', kind: 'pier / boat jetty',
    confirmed: true, confidence: 'medium',
    at: [27.587095, 77.69801],
  },
  {
    sector: 'ghats-yamuna', name: 'Boat landing and vehicle apron north-east of Keshi Ghat', kind: 'boat landing / informal parking apron',
    confirmed: true, confidence: 'high',
    at: [27.588119, 77.70105],
  },
  {
    sector: 'ghats-yamuna', name: 'Walled compound of parallel red-roofed halls around an open yard, east side of the sector', kind: 'walled institutional compound (function not determined)',
    confirmed: false, confidence: 'low',
    at: [27.587283, 77.704598],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Large hall with a barrel-vaulted rooflight (unidentified - deliberately NOT called a temple)', kind: 'hall',
    confirmed: true, confidence: 'high',
    at: [27.575002, 77.675898],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Walled nursery / market garden south-west of ISKCON (about 5.5 ha)', kind: 'horticulture',
    confirmed: true, confidence: 'high',
    at: [27.569333, 77.675959],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Prem Mandir nursery and horticulture yard (shade-houses, packing sheds, planting beds)', kind: 'horticulture',
    confirmed: true, confidence: 'high',
    at: [27.574776, 77.671926],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Sports ground with grandstand and hard court', kind: 'sports',
    confirmed: true, confidence: 'high',
    at: [27.566415, 77.67021],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Cricket ground with practice nets, on the large institutional campus east of ISKCON', kind: 'sports',
    confirmed: true, confidence: 'high',
    at: [27.571823, 77.680458],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Swimming pool complex', kind: 'leisure',
    confirmed: true, confidence: 'high',
    at: [27.573009, 77.684514],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Solar array and utility yard with cylindrical tanks', kind: 'utility',
    confirmed: true, confidence: 'high',
    at: [27.57459, 77.683953],
  },
  {
    sector: 'iskcon-raman-reti', name: 'Very large active construction site immediately east of Krishna Balaram Mandir (about 200 x 130 m)', kind: 'construction-as-of-2024-02',
    confirmed: true, confidence: 'high',
    at: [27.572434, 77.677933],
  },
  {
    sector: 'old-town-bazaar', name: 'Goshala / cattle shelter (unnamed) - walled compound with a large herd in an open yard', kind: 'animal_shelter / goshala',
    confirmed: true, confidence: 'high',
    at: [27.575991, 77.69499],
  },
  {
    sector: 'old-town-bazaar', name: 'Freestanding domed structure (~9 m dome on a drum) in a walled courtyard, W side of the old town', kind: 'domed structure - shrine/samadhi-like, function NOT confirm…',
    confirmed: true, confidence: 'high',
    at: [27.578255, 77.686497],
  },
  {
    sector: 'old-town-bazaar', name: 'Large walled compound with two big blue metal-roofed halls and an open yard, N of Madan Mohan', kind: 'institutional compound - function unknown',
    confirmed: true, confidence: 'high',
    at: [27.581992, 77.689223],
  },
  {
    sector: 'old-town-bazaar', name: 'Marked sports field / playing ground immediately west of the blue-hall compound', kind: 'pitch / sports ground',
    confirmed: true, confidence: 'high',
    at: [27.582172, 77.688645],
  },
  {
    sector: 'old-town-bazaar', name: 'Riverside boat landing and ghat apron, Yamuna bank NE of Yugal Ghat', kind: 'boat landing / ghat apron',
    confirmed: true, confidence: 'high',
    at: [27.583304, 77.692527],
  },
  {
    sector: 'old-town-bazaar', name: 'Large walled complex with a formal four-square garden courtyard, south of the old town', kind: 'walled institutional/religious complex - function unknown',
    confirmed: true, confidence: 'high',
    at: [27.575273, 77.690439],
  },
];

/** Only what the surveyor stood behind. */
export function confirmedRoads() { return SURVEYED_ROADS.filter((r) => r.confirmed); }
export function confirmedPlaces() { return SURVEYED_PLACES.filter((p) => p.confirmed); }

/** Held back pending someone who has walked there. Printed by the importer. */
export function pending() {
  return [...SURVEYED_ROADS, ...SURVEYED_PLACES].filter((e) => !e.confirmed);
}
