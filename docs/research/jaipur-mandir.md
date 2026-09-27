# jaipur-mandir

*Researched and independently verified 2026-09-27. Confidence: partial.*

## oneLine

The "Jaipur Mandir" — Shri Radha Madhav Mandir — a fortress-like Rajput palace-temple in dusty pink sandstone and cream plaster standing on open ground between the old Mathura–Vrindavan road and the disused railway at the south-west edge of Vrindavan, begun in 1881 by Maharaja Sawai Madho Singh II of Jaipur for his Nimbarka guru, with three altars behind one arcaded front, no tower at all, and a single arched-roof kiosk on the shrine roof as its only skyline.

## location

OpenStreetMap way 679447890, "Jaipur Mandir", amenity=place_of_worship, religion=hindu, building=yes. Centroid 27.57222 N, 77.69036 E (computed by me from the OSM node geometry via the OSM API; ODbL). The account's 27.57226 / 77.69031 is the same point within about 6 m.

[FIX] THE ROADS ARE THE WRONG WAY ROUND in the account. Measured from the centroid against the actual OSM geometry:
  - "Mathura Road", OSM ways 173006669 and 970964277 (a highway=tertiary one-way pair, i.e. a dual carriageway) runs NE–SW and its nearest point is 157 m and 165 m away at bearing 111–123 degrees — EAST-SOUTH-EAST, not west.
  - The north–south road about 140 m to the WEST is a different way: OSM way 99418406, highway=residential, named "Banki Bihari Bazar". Its nodes sit at a constant 139–155 m west of the temple. It is this road, not Mathura Road, that crosses the railway at the level crossing.
  So there is a road on each side. Placing the temple's front on the wrong one would mirror the entire site.

[FIX] THE RAILWAY IS DEAD. OSM way 671814558 "MTJ to BDB", railway=narrow_gauge, gauge=1000, passes NW; nearest approach 190 m. Level crossing node 1149772290 at 27.57342, 77.68891 is 196 m at bearing 313 degrees (not 155 m). A second level crossing, node 6290037071, is 358 m WSW. The line is the metre-gauge Mathura–Vrindavan branch opened by the Bombay, Baroda & Central India Railway on 26 August 1889; it closed on 17 March 2023 and Vrindavan station's tracks have been dismantled after the ₹402 crore broad-gauge conversion was permanently scrapped in June 2023. Vrindavan station platform (OSM way 396607635) is 548 m NE.

RELATIVE TO LANDMARKS (computed by me; distances and true bearings from the temple):
  - ISKCON Sri Sri Krishna-Balaram Mandir (27.5725, 77.6777): 1,248 m due WEST. So the temple is 1.25 km east of ISKCON — the account's figure is right.
  - Radha Damodar, old town (27.5836, 77.6957): 1,370 m NNE (bearing 23 degrees). The temple is 1.37 km SSW of it — right.
  - Banke Bihari cluster (approx 27.5835, 77.6975): 1,438 m NNE.
  - Vrindavan town node (OSM node 617987467): 487 m NE.
  - Ramakrishna Mission Sewashrama hospital: 290 m ENE.
  - Motuhil Kund: 392 m WNW; Ganga Kund 421 m NNW; Davanala Kund 475 m SW.
[FIX] WATER: the nearest mapped water is way 679447892, 154 m DUE NORTH (bearing 358), not east. Way 99430984 is 231 m SE and way 679447883 245 m S. "Immediately east and north-east" is wrong.

ADDRESS. Two published forms: "Kishorpura, Mathura–Vrindavan road / Parikrama Marg, Vrindavan 281121" (Indian temple sites) and "Swami Vivekanand Marg, Raman Reti" (Vrindavan Today). [FIX] Do not dismiss the second as the account does. OSM's nearest addressed nodes — the Ramakrishna Mission Sewashrama, 290–400 m ENE — carry addr:full "Swami Vivekananda Road, Near Anandmayee Maa Temple, Vrindaban, 281121". The two are locality names for the same stretch, not a contradiction.

ORIENTATION — STILL UNRESOLVED, and the account was right to flag it, but for the wrong reason (it reasoned from a road that is on the other side). The OSM rectangles' long axis runs almost exactly east–west (bearing 92 degrees), and all three nested enclosures put the large enclosed ground EAST of the tagged block. With the main Mathura Road also ESE, an EAST-FACING shrine entered from the east is the better working assumption, and it matches the Vrindavan norm and the sources' north/centre/south sanctums. Against it: a bazaar road runs 140 m due west, and one photograph looks out through a compound gate directly onto a busy lane with hanging cloth and people, which suits the west road better. All EXIF is stripped from the available photographs, so the sun gives nothing. Choose east, flag it, and keep the model's orientation cheap to flip.

There is no English Wikipedia article and no Wikidata item for this temple.

## scale

FOOTPRINT. I re-fetched the OSM geometry and confirm the account's measurement exactly: way 679447890 "Jaipur Mandir" is a five-node closed rectangle, edges 48.4 m and 35.8 m, long axis bearing 92 degrees, area 1,733 m². Treat as a hand trace, plus or minus 15%.

[FIX] But it is NOT the only trace. OSM has TWO untagged nested enclosures around it, all roughly axis-aligned:
  - way 679447888: 97.3 x 52.8 m, 4,691 m²
  - way 679447897: 126.8 x 78.8 m, 9,176 m²
So the walled core as mapped is about 127 x 79 m, roughly 1.0 hectare — not "several times 1,733 m² and on the order of 2–4 ha". Build that.
Both enclosures are shifted EAST relative to the tagged block (the tagged block spans E −25 to +25 in local metres; enclosure A spans −33 to +64; enclosure B −47 to +79), so the large open ground lies east of the block.
Outlying blocks 60–130 m to the south are separately traced — way 679447895 (55 x 51 m), way 679447878 (43 x 52 m), ways 679447874, 679447885, 679447887 — presumably the goshala yard, ancillary ranges and offices. With those the property may reach 180 x 200 m, roughly 3.5 ha, but no wall is traced round them, so do not treat that as documented. A natural=wood polygon of 15,533 m² (way 672984763, 218 x 102 m) lies immediately north.

HEIGHTS — my own photogrammetry, scaling against standing figures in the Braj Ras originals and cross-checking between three images. Error roughly plus or minus 20%; ratios are far more reliable than absolutes.
  - Great central cusped arch of the sanctum porch: [FIX] about 5.0 m to the apex, about 3.0 m wide. Measured two ways, 4.8 m and 5.4 m. The original's 6 m is high.
  - Shrine porch plinth above the court: about 1.0–1.3 m, 5–6 steps. (Original said 1.2–1.5 m, five steps — near enough.)
  - Shrine ground storey, court to first-floor gallery: [FIX] about 10–11 m. Very tall, with a deep carved band above the arch.
  - First-floor gallery arcade openings: [FIX] about 3.0–3.5 m, not 2.5–3.
  - Interior hall floor to ceiling: [FIX] about 9 m at the side bays, 11–12 m at the crown of the central bay.
  - Shrine block, court level to roof terrace/parapet: CONFIRMED about 16 m (I measure 16–17 m).
  - Crowning kiosk, terrace to finial tips: [FIX] about 8–11 m — bigger than the original's 6–9 m. The kiosk is roughly 11–12 m wide, with five bays of about 2.4 m.
  - TOTAL HEIGHT to the finial tips: about 24–27 m; call it 25 m. The original's 24 m is at the low end but defensible. Most reliable of all: the roof terrace sits at about 60% of total height, the kiosk assembly is the top 40%.
  - Street range, ground to parapet: about 11–13 m over two storeys.
  - Single-storey cloister ranges round the courts: about 4–5 m (unchanged).

Sanity check that ties it together: from the road at about 150 m, with the shrine roughly 100 m further back, a 25 m shrine projects to about 15 m-equivalent at the street range's distance — just 4 m above an 11 m parapet. That is exactly what the distant photograph shows, and it is why the kiosk is not a landmark from outside.

## architecture

VERDICT: the account is broadly sound and unusually good on the building itself. The architecture is largely CONFIRMED against the same photographs (I re-downloaded the 24 Braj Ras originals at 2048x1152 and the one Wikimedia Commons interior, and measured them myself). What is wrong is mostly the SITE — which road is on which side, the railway, the compound size — plus the colour, the kiosk roof form, and the Deities. Corrections marked [FIX].

WHAT IT IS — CONFIRMED. Not a tower-temple. A Rajput palace laid out as a temple: long two-storey ranges, flat roofs, parapets, deep chajjas on dense bracket courses, blind arcades of multi-cusped niches, jharokha balconies, cloistered courts, one grand carved gateway frontispiece, one great pillared hall. Coursed dressed ashlar.

[FIX] MATERIAL AND COLOUR — the single most useful correction after the site. It is NOT one colour. Within one frame (Braj Ras image of the shrine seen through the inner gate) the foreground gateway masonry is warm and the shrine block behind it is essentially NEUTRAL GREY — I measured 2% saturation on the shrine, 31% on the gateway range. In full daylight (the Commons photo) the shrine block and its kiosk read pale cream/ivory. So build two families:
  - OUTWARD RANGES, GATEWAYS, CLOISTER ARCADES: warm dusty salmon-tan sandstone. Lit ~#B5937D to #C2967D; in shade desaturating to ~#AFA19C / #A89892.
  - SHRINE BLOCK, CROWNING KIOSK, INNER COURT ARCADES: pale cream / ivory, reading as limewash or lime plaster (or a far paler stone). Lit ~#EFEBD1 to #F3E1B7; in shade ~#A8A5A4, near neutral.
  - Parts of the street range's upper storey are plain cream lime plaster with green-shuttered rectangular windows (~#DBD3BE), noticeably plainer than the stone below.
Caveat: white balance differs between cameras; the within-frame contrast is the reliable evidence, and it is unambiguous.

SITE PLAN (sequence a pilgrim walks) — confirmed, with [FIX]es:
1. A two-storey fortress-like street range on a raised paved forecourt reached by a broad flight of steps, with motorcycles, cars and tourist coaches parked on it.
2. One grand carved gateway frontispiece breaking forward and rising above the parapet: three cusped arches at ground level, a three-arched cusped loggia above behind a stone balustrade, richly carved spandrels and panel bands, a jharokha to one side, a deep bracketed cornice, a small pavilion above. Massive timber door leaves studded with round metal bosses (one source calls the main door ashtadhatu — the studding is visible, the alloy is not verifiable).
3. [FIX] Courts, plural and NOT uniform. One IS formal: axial flagstone path, clipped hedge beds, lamp standards, a flagpole with the national flag, a second arched gate on axis. Another is a long narrow court with a single tree in a raised bed between two arcaded ranges. A third is ragged — straggly UNCLIPPED shrubs, bare earth, litter. Do not build three tidy parterres.
4. Single-storey cloistered ranges of cusped arches on slender columns round the courts, on raised plinths. Window air-conditioners and wall fans are fixed to them.
5. The shrine block faced across a paved court.
6. A goshala yard with loose cattle drinking from hollowed-log troughs, enclosed by a pillared veranda where people sit. Named in sources as the Shripad Baba Goshala. Three cows visible in the one photograph.

SHRINE BLOCK — confirmed in detail:
- Ground storey, very tall [FIX: about 10–11 m to the first-floor gallery, taller than the account implies]. Projecting central porch on a plinth of 5–6 steps. ONE large multi-cusped arch (~9–11 cusps) in a moulded rectangular frame with deeply carved spandrels, [FIX] about 5.0 m to the apex and about 3.0 m wide — not 6 m; I measured it twice, against a standing figure at the porch plane (~51 px/m) and independently in a second photograph (~19 px/m), getting 4.8–5.4 m. [FIX] The opening is closed by a black steel grille/gate, with the gilded altar glowing through it. Flanking it, one smaller multi-cusped doorway each side (~3.4 m x 1.5 m) in its own moulded frame with a carved jali panel in a cusped surround above. Beyond, recessed cusped-arch bays with jali.
- First storey: continuous open gallery of small cusped arches on slender colonnettes behind a balustrade, taller central bays over the porch, bracketed balconies at intervals. [FIX] openings ~3.0–3.5 m, not 2.5–3.
- Deep chajja on brackets above the gallery, a plain attic/parapet band, then the flat roof terrace at [confirmed] ~16 m above the court.

CROWNING KIOSK — confirmed, with one important [FIX]:
Open pavilion on a solid moulded podium in the centre of the shrine roof. FIVE multi-cusped arches across the front on slender colonnettes, open on the sides, a projecting flat cornice slab with turned-down corners, then the roof. [FIX] The central roof is NOT a "bangla"/Bengal-hut roof. It is a broad SEMICIRCULAR BARREL/ARCHED roof with a moulded rim and a STRAIGHT HORIZONTAL EAVE LINE — the ordinary Rajasthani arched-roof (mehrabi) chhatri. A bangla roof has downward-curving eaves and a curved ridge; this has neither, so the Govind Dev Ji Jaipur analogy is a mis-analogy. Flanked by two ribbed/melon hemispherical domes on lotus-petal drums. About SEVEN slender pointed spike finials: one on each dome apex and about five along the vault.
[FIX] Scale: measured off the photographs the kiosk is roughly 11–12 m wide and about 8–11 m from terrace to finial tips — proportionally chunkier than the account allows. The reliable number is the RATIO: the roof terrace sits at about 60% of total height, the kiosk assembly is the top 40%.

[FIX] ROOFLINE — there is more than one thing up there. Besides the kiosk, the ranges carry at least three flat-roofed rectangular roof rooms / attic pavilions with cornices, clearly visible on the street range. The kiosk is the only DOMED element, not the only element above the parapet.

INTERIOR HALL — confirmed, and the account's best catch. A large, dark, ROOFED hypostyle hall, not a courtyard. Tall monolithic columns, round closely fluted/reeded shafts with carved lotus-petal bases on square plinths, heavy moulded capitals with pendant leaf carving and broad brackets. [FIX] At least one pier is a PAIR of shafts side by side, so do not force sixteen free-standing single columns to match the "16 pillars" in the sources. They carry BROAD, PLAIN, SEMICIRCULAR/SEGMENTAL arches — no cusping on anything structural. [FIX] The ceiling is VAULTED, not flat: shallow groin/domical vaults over the bays with transverse arches, the central bay markedly higher. [FIX] Clear height about 9 m at the sides, 11–12 m at the crown of the central bay. Cusped-arch niches and doorways line the side walls. A railed internal gallery overlooks the central bay at one end. [FIX] The floor is a black-and-white CHEQUER/LOZENGE tessellation with plain borders, not light and dark bands. [FIX] The wall and vault surfaces are pale grey-white plaster, not exposed pink stone. [FIX] It is gloomy but not unlit — modern electric wall lights are fixed round the walls, and a builder's ladder was standing in it.

INTERIOR SURFACES AND DOORS — confirmed and vivid (Commons photo). Pale cream lime plaster; slender engaged colonnettes with lotus-petal bases; doorways with multi-cusped (~9-cusp) heads filled with COLOURED GLASS in dark timber frames, an irregular chequer of rectangles in the arch head and down both jambs — red, blue, green, yellow, and also ORANGE and MAGENTA. Gallery parapets are pierced stone jali in a diamond/lozenge trellis. Upper-floor terrace floors are plain grey screed, not patterned stone.

FOUNDATION AND DATE — the account gave none; here it is with the conflict named. Begun 1881 by Maharaja Sawai Madho Singh II of Jaipur at the inspiration of the Nimbarka saint Brahmachari Shri Giridhari Sharan (Vrindavan Research Institute; Vrindavan Today; Bharatkosh). Construction took 30–40 years; the Maharaja is said to have inspected it yearly. DEITY INSTALLATION IS DISPUTED: 1886 (Vrindavan Today) versus 1916 (Braj Ras, Bharatkosh); several tourist sites give 1917 as completion, and two of them incoherently give 1916/1917 as the START. Do not state one as fact. Negative check: Growse's Mathura: A District Memoir (1880/1883) surveys Vrindavan's temples exhaustively and does NOT mention it — exactly what you expect of a building begun in 1881 and still rising, and proof that any source making it older is wrong.

[FIX] ADMINISTRATION — missed entirely, and diagnostic. A large signboard on the entrance frontispiece reads "राजस्थान सरकार / कार्यालय सहायक आयुक्त / देवस्थान विभाग राजस्थान / वृन्दावन" — Government of Rajasthan, Office of the Assistant Commissioner, DEVASTHAN VIBHAG, Vrindavan. Part of the street range is that department's office; a smaller red "Devasthan" sign stands at the forecourt edge. This is a Rajasthan state religious-endowments property, which is why it looks half like a government building. Also on site: the Shripad Baba Goshala and the Braj Akademi, a Braj culture and literature institute.

CONDITION — confirmed. Standing, in use, maintained but weathered: soot streaks, plaster loss, painted and printed signboards, hanging cables, a window AC and a wall fan on the cloister, steel grilles, parked motorcycles and coaches, scrub on the open ground outside.

## distinguishing

1. IT LOOKS LIKE A FORT OR A STATE PALACE, NOT A TEMPLE — and it now partly IS a government office. A long, low, two-storey range along the road, deep bracketed chajja, blind arcade of cusped niches, jharokhas, flat roofs and parapets, one concentrated burst of carving at the gateway, and a Government of Rajasthan Devasthan Vibhag signboard bolted across it. That contrast — austere long ranges, one carved gate, one kiosk — IS the design.

2. THE ROOF KIOSK, described correctly. A single open five-arched pavilion alone on the centre of the shrine roof: a broad semicircular arched roof with a straight horizontal eave between two small ribbed domes, pierced by about seven slender spike finials. Nothing else on the site is domed. But [FIX] it is NOT visible from a kilometre away — from the road the street range hides nearly all of it and in a distant frontal view it barely clears the parapet. It reads from inside the courts. Build it as a modest accent, not a beacon.

3. THE TWO-TONE MASONRY. Salmon-tan sandstone outside, pale cream shrine within. That shift as you pass through the gate is as recognisable as the kiosk and nobody describes it.

Supporting, each individually diagnostic:
- Three altars in one row behind ONE facade, entered by one ~5 m cusped arch flanked by two small ones, each with a jali panel above.
- A Nimbarka Sampradaya temple in a town of Gaudiya ones. The southern altar carries Hans Gopal, the four Kumaras (Sanaka, Sanandana, Sanatana, Sanatkumara) and Narada — which Growse in 1883 records as precisely the first three links of the Nimbarka guru-parampara ("1 Hansavatar; 2 Sanakadi; 3 Narada; 4 Nimbarak Swami"). That is independent academic corroboration of the sect attribution, not inference.
- A vast DARK roofed pillared hall of plain semicircular arches on fluted monolithic columns under groin vaults, with a black-and-white chequer floor — the exact antithesis of the cusped delicacy outside.
- Coloured glass (red, blue, green, yellow, orange, magenta) filling cusped door heads and jambs against cream plaster upstairs.
- Cloistered green courts inside the walls — quiet and near-empty, unlike the packed lanes of the old town.
- A working goshala with loose cattle and hollowed-log troughs, and a Braj Akademi, on the premises.
- It stands on open ground between two transport lines: the main Mathura Road dual carriageway about 160 m ESE, and the dead Mathura–Vrindavan railway about 190 m NW.

## doNotBuild

Everything in the original "do not build" list holds — no shikhara, no urushringas, no amalaka-kalasha; not Agra/Fatehpur red and not Jaipur "pink city" pink; no exterior white marble; do not carve everything, long stretches are plain cream plaster; the "16-pillar courtyard" is a ROOFED hall; the hall's arches are plain semicircular, cusping belongs only to facades, galleries, cloisters and doorways; "carved out of a single rock" is a garble of monolithic pillars; the altars are NOT upstairs (they are at ground/plinth level behind the great arch, up 5–6 steps); model it weathered, not gilded; no gopuram, no modern entrance plaza, no ring of shops, no large parikrama path; do not let "100 acres" or "7,000 cows" drive the geometry. Add to that:

- DO NOT PUT MATHURA ROAD ON THE WEST. This is the most damaging error in the account and would mirror the whole site. OSM's "Mathura Road" (ways 173006669 and 970964277, a one-way pair) runs NE–SW about 157–165 m to the EAST-SOUTH-EAST, bearing 111–123 degrees. The north–south road about 140 m to the WEST is a different road, OSM way 99418406, named "Banki Bihari Bazar" — and it is that road, not Mathura Road, which crosses the railway at the level crossing.

- DO NOT BUILD A LIVE RAILWAY OR A WORKING LEVEL CROSSING. This is a Chandrodaya-class trap: OSM still maps the line as if it runs. The Mathura–Vrindavan branch was closed on 17 March 2023 for broad-gauge conversion; the conversion was permanently scrapped in June 2023 as uneconomical; Vrindavan station is closed and its TRACKS ARE DISMANTLED. What is there is a cleared or derelict alignment and abandoned conversion earthworks, not a running metre-gauge line. No rail bus. No closing gates.

- DO NOT STATE THAT THE MAHARAJA BUILT THE RAILWAY TO CARRY THE STONE. The line's builder is documented: Bombay, Baroda & Central India Railway, opened 26 August 1889, eight years after the temple was begun. The attribution appears only in tourist copy. Place the alignment; do not caption it that way.

- DO NOT CALL IT NARROW GAUGE IN THE UI. OSM tags it railway=narrow_gauge, gauge=1000, but 1,000 mm in India is METRE gauge, a different category from 762/610 mm narrow gauge.

- DO NOT PAINT THE SHRINE BLOCK SALMON. It is pale cream/ivory in sun, near-neutral grey in shade. Only the outward ranges and gateways are salmon-tan.

- DO NOT GIVE THE KIOSK A BENGAL-HUT ROOF. No curved eaves, no curved ridge. A plain semicircular barrel roof with a straight horizontal eave, between two ribbed domes.

- DO NOT MODEL THE CENTRAL DEITY AS A PAINTED FIGURE. The original's "not black stone icons" is flatly wrong. At the Radha Madhav altar Krishna is a BLACK, highly polished standing image in tribhanga with a flute and a silver crown; Radha beside him has a gold/brass face. It is the SURROUNDING figures — roughly ten to twelve gopis, cowherds, a child and a calf, carrying pots, baskets and a churning staff — that are painted plaster/stucco. Not "eight standing gopis" flanking a painted couple. Backdrops are silk: gold-yellow at Radha Madhav, green at another altar, under a scalloped black-and-silver fabric valance.

- DO NOT MAKE THE COMPOUND 2–4 HECTARES ON THE ASSUMPTION NOBODY TRACED IT. Two untagged nested enclosures around the tagged block ARE in OSM. The traced walled core is about 127 x 79 m, roughly 1.0 ha.

- DO NOT MAKE THE KIOSK A DISTANT LANDMARK. From the road it barely clears the street range's parapet.

- DO NOT CONFUSE IT WITH RADHA MADAN MOHAN. srimandir.com's page on this very temple opens "Jaipur Temple, also known as the Radha Madan Mohan Temple". It is not. Radha Madan Mohan is the 16th-century Goswami temple on Dwadashaditya Tila above the Yamuna, founded in Sanatana Goswami's line — a red-sandstone tower-temple, an entirely different building 1.5 km away. Nor is it the Radha Madhav temple at Kanak Vrindavan in Jaipur city, whose vigraha came from Vrindavan.

- DO NOT BUILD ONE TIDY FORMAL GARDEN TYPE EVERYWHERE. One court is formal with clipped beds and lamp standards; another is a narrow alley-court with one tree; another is overgrown and littered.

- DO NOT LEAVE THE GREAT ARCH OPEN. It is closed by a black steel grille/gate, the altar glowing through it.

- DO NOT PUT THE NEAREST POND EAST. The nearest mapped water is 154 m DUE NORTH; the next is 231 m SE.

## deities

Three sanctums in one row behind one facade, named north to south. The names are given as the sources give them; the transliterations vary.

- NORTHERN sanctum: Shri Anand Bihari Ji (Ananda-bihari).
- CENTRAL sanctum: Shri Radha Madhav Ji — the temple's title Deities. From the photographs: Krishna is a BLACK, highly polished standing image in tribhanga with a flute and a silver crown; Radha stands beside him with a gold/brass face, both dressed in heavy gold brocade with pearl strands. Around and behind them, a tableau of roughly ten to twelve PAINTED PLASTER figures — gopis with pots and baskets, a woman with a churning staff, cowherds, a child, a calf — against a gold-yellow silk backdrop under a scalloped black-and-silver fabric valance. The central pair are images, not painted figures; the attendants are painted figures.
- SOUTHERN sanctum: Shri HANS GOPAL Ji, with Shri Giridhari Ji, the four Kumaras — Sanaka, Sanandana, Sanatana, Sanatkumara — and Shri Narad Ji.

NAME CONFLICT, unresolved: the southern Deity is "Hans Gopal" in the Vrindavan Research Institute listing, the Hindi Bharatkosh entry, Vrindavan Today and srimandir; "Nitya Gopal" in Braj Ras's English text and Bharatkosh's English rendering. Prefer Hans Gopal — Hansa is the correct parampara name, and Growse in 1883 records the Nimbarka guru-parampara as "1 Hansavatar; 2 Sanakadi; 3 Narada; 4 Nimbarak Swami", exactly the roster on this altar. Note the variant rather than suppressing it.

Another altar photographed (green silk backdrop, not gold) shows a black Krishna with a peacock-feather crown and a silver-faced consort flanked by two further standing female images on lower plinths — four images in that group. Which sanctum it belongs to is not stated in the album.

The sect is the NIMBARKA (Sanakadi / Hamsa) SAMPRADAYA, attributed by the Vrindavan Research Institute and corroborated by the altar roster against Growse. Sectarial mark, per Growse: two white vertical streaks with a black dot between.

## sources

- OpenStreetMap API (openstreetmap.org/api/0.6, ODbL) — geometry fetched and measured by me: way 679447890 'Jaipur Mandir' (48.4 x 35.8 m, bearing 92 deg, 1,733 m2, centroid 27.57222/77.69036); untagged nested enclosures way 679447888 (97.3 x 52.8 m) and way 679447897 (126.8 x 78.8 m); outlying blocks 679447895, 679447878, 679447874, 679447885, 679447887; natural=wood way 672984763; water ways 679447892, 99430984, 679447883; 'Mathura Road' ways 173006669 and 970964277 (nearest 157 m and 165 m, bearing 111-123 deg ESE); 'Banki Bihari Bazar' way 99418406 (139-155 m west, N-S); railway way 671814558 'MTJ to BDB' (railway=narrow_gauge, gauge=1000, nearest 190 m NW); level crossings node 1149772290 (196 m, bearing 313) and node 6290037071 (358 m WSW); Vrindavan platform way 396607635 (548 m NE). CORRECTS the account's claim that Mathura Road lies 150 m WEST, its 155 m level-crossing distance, its 'nobody has traced the compound', and its 'water immediately east and north-east'.
- Vrindavan Research Institute (vribharat.org), 'मंदिर एवं धार्मिक स्थल' — the strongest source on foundation: built by Raja Sawai Madho Singh of Jaipur in 1881 at the inspiration of the NIMBARKA SAMPRADAYA saint Giridharisharan; over 30 years to build; the Maharaja inspected it annually; Deities Radha-Madhav, Anand-Bihari and HANS-GOPAL. Supplies the sampradaya and the 1881 date the account omitted.
- F. S. Growse, 'Mathura: A District Memoir' (Internet Archive full text, item MathuraADistrictMemoir; djvu.txt downloaded and searched by me) — gives the Nimbarka/Sanakadi guru-parampara as '1 Hansavatar; 2 Sanakadi; 3 Narada; 4 Nimbarak Swami: all deified characters', which matches this temple's southern altar exactly and independently corroborates the sect attribution; also records the Nimbarkas' Vrindavan temple of Basak Bihari and their sectarial mark. NEGATIVE CHECK: Growse's exhaustive 1880/1883 survey of Vrindavan's temples does NOT mention this one, consistent with a building begun in 1881 and still rising, and refuting any source that dates it earlier.
- Vrindavan Today, 'Jaipur Mandir: Stunning Architectural Marvel of Vrindavan' (vrindavantoday.in/featured/radha-madhav-mandir-jaipur-mandir/) — Sawai Madho Singh II, 1881, Giridharisharan, 35-40 years, complete c.1917, DEITIES INSTALLED 1886 (conflicts with 1916 elsewhere), Shripad Baba Goshala and Braj Akademi on the premises, address Swami Vivekanand Marg / Raman Reti, and the unsupported railway claim.
- Braj Ras / brajrasik.org, 'Jaipur Temple, Vrindavan' photo album — 24 photographs, which I re-downloaded at full size (2048x1152) and measured myself; source of the three-sanctum N/C/S roster, 'deities enthroned 1916', '16 pillars', and the uncorroborated '100 acres' and 'seven thousand cows'. All architecture, colour and height corrections above are my own measurements off these originals, not the site's text.
- Wikimedia Commons, File:Jaipur Mandir vrindavan uttar pradesh india.jpg, CC BY-SA 4.0, NEELIMA DANWANI, 2020-09-29, Wiki Loves Monuments 2020 — the coloured-glass cusped doorway, cream plaster interior, lotus-petal colonnettes, lozenge jali balustrade, and the clearest daylight view of the shrine block and kiosk (establishing their pale cream colour). Its own uploader caption repeats the '1917 / marble finishing / single rock structure' errors and should not be used as text.
- bharatdiscovery.org (Bharatkosh), 'जयपुर मन्दिर वृन्दावन' — three chambers, Deities consecrated 1916, southern chamber with the four Sanatan Kumaras and Narada.
- Wikipedia, 'Vrindavan railway station' — the 11 km metre-gauge (1,000 mm) Mathura-Vrindaban branch opened by the Bombay, Baroda and Central India Railway in 1889, station closed 2023, TRACKS DISMANTLED. With Construction World, IBC World News and GKToday on the permanent cancellation of the Rs 402 crore gauge-conversion in June 2023. CORRECTS the account's treatment of the railway as a live feature.
- srimandir.com, 'Jaipur Temple Vrindavan' — cited as a source of ERROR, not fact: it opens 'Jaipur Temple, also known as the Radha Madan Mohan Temple' (a conflation with the 16th-century Goswami temple on Dwadashaditya Tila), says 'red sandstone and white marble', and places the Deities 'on the second floor'. Also the origin of the 'ashtadhatu' main door claim and of 'commissioned 1916/1917 and took 30 years', which is internally incoherent.
- mathuravrindavantemples.com, 'Jaipur Mandir in Vrindavan' — darshan timings (summer 5:00-12:00 and 15:00-21:00; winter 5:30-12:30 and 15:00-20:30), 'commissioned 1917', 'Mughal and Rajasthani'. Treat the dates as unreliable.
- Wikidata Special:Search — no item exists for this temple; there is no English Wikipedia article either. This is why confidence stays partial.
- My own photogrammetry and colour sampling (Python/PIL over the Braj Ras and Commons originals): great arch 4.8-5.4 m measured twice against standing figures; shrine ground storey 10-11 m; roof terrace ~16 m; total to finial tips 24-27 m; hall 9 m at sides and 11-12 m at the central crown; median lit-masonry colours #B5937D / #C2967D (outer ranges) versus #EFEBD1 / #F3E1B7 (shrine and kiosk), with a within-frame saturation contrast of 31% versus 2%.
