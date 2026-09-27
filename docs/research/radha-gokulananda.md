# radha-gokulananda

*Researched and independently verified 2026-09-27. Confidence: partial.*

## oneLine

A small single-storey courtyard temple off the Vrindavan parikrama route between Keshi Ghat and Radha Raman, where the personal Deities of three Gaudiya teachers were gathered onto one altar — and where those same three men's samadhis stand as separate carved shrines in an enclosure beside the deity hall.

## location

**27.586176 N, 77.698756 E** — corrected centroid of OSM way 335852213 (the account's 27.58623 is ~6 m north of true). Tagged `amenity=place_of_worship`, `religion=hindu`, `name=श्री राधा गोकुलानंद मंदिर`, `name:en=Sri Radha Gokulanand Temple`, `name:ru=Радха-Гокулананда` — all verified against the live API. Vrindavan, Mathura district, Uttar Pradesh, PIN 281121.

**Neighbour distances — I re-ran these independently via Overpass and every one checks out** (small differences are the account's centroid offset; bearings are mine):

| Landmark | Account | Recomputed | Bearing |
|---|---|---|---|
| Keshi Ghat | 115 m N | 120 m | 359° — due north ✓ |
| Radha Raman Mandir | 94 m S | 88 m | 182° — due south ✓ |
| Gopal Bhatta Samadhi Mandir | 59 m S | 53 m | 190° ✓ |
| Radha Gopinath Mandir | 88 m E | 87 m | 099° ✓ |
| Vamshi Gopala / Gadadhara Danta samadhi | 49 m W | 52 m | 292° — WNW, not due west |
| Yugala Kishora temple | 84 m N | 89 m | 356° ✓ |
| Nidhivan | 213 m SSW | 207 m | 193° ✓ |
| Chir Ghat | 224 m W | 223 m | 250° — WSW |
| Gopinath Bazar | 231 m | 226 m | 130° (SE) |
| Radha Damodar Mandir | 414 m SW | 410 m | 229° ✓ |

I also confirmed **Gopal Bhatta's samadhi is a separate compound** (way 335527342, no nodes inside this polygon) — correctly treated as a neighbour, not part of this temple.

**The "between Keshi Ghat and Radha Raman" claim is confirmed geometrically**, not just repeated: at 120 m and 88 m on bearings of 359° and 182°, the temple lies within 3° of the straight line between them. Every source says it — the Mathura district administration, Braj Ras, Holy Dham, The Gaudiya Treasures of Bengal — and the geometry bears it out.

**CORRECTED — how it meets the parikrama route.** The account's conclusion is right but its geometry is not. Parikram Marg (way 970910718) does **not** run along the west boundary; traced node by node it runs **8–9 m west** of it, then bends around the **north-west corner** and continues **east along the north side**. The single point where it comes within ~2 m of the compound is that corner.

The temple is instead reached by a **mapped 8.7 m spur** (way 335852218) running east off Parikram Marg to a node it **shares with the compound polygon** (3429648616) — a surveyed entrance at **E +0.5 m, N +9.7 m**, about 10 m north of the south-west corner on the west wall.

So the account's headline conclusion stands and is strengthened: **the gate faces west onto the parikrama route, reached by a short narrow spur, and pilgrims on the Vrindavan parikrama pass its door.** Approach it from the parikrama path, never from a plaza. Dense old-town fabric, Gopinath Bazar quarter.

## scale

**Compound footprint — I re-derived this from the OSM API rather than trusting it, and the account's survey is sound.** Way 335852213 returned exactly the five nodes quoted, with exactly the tags quoted. Independent recomputation:

| Quantity | Account | Recomputed | Verdict |
|---|---|---|---|
| N–S extent | 42.2 m | 42.0 m | ✓ |
| E–W extent | 35.5 m | 35.5 m | ✓ |
| Area | ≈1,110 m² | **1,106 m²** | ✓ |
| West edge | 29.3 + 9.8 m | 29.2 + 9.7 m | ✓ |
| South edge | 35.5 m | 35.5 m (bearing 088°) | ✓ |
| East edge | 43.4 m | 43.2 m (bearing 341°) | ✓ |
| North edge | 19.6 m | 19.6 m (bearing 261°) | ✓ |

Two small corrections. **Centroid: 27.586176 N, 77.698756 E**, not 27.58623 — the account's figure is ~6 m too far north (it looks like a bounding-box centre, and even that gives 27.58620). And the node order is **counter-clockwise**, not "clockwise from the north-west corner" as stated; harmless, since the corners are listed in order.

**Corner coordinates all verified exact.** Trapezoid, broad at the south (35.5 m), narrow at the north (19.6 m).

**Buildable local frame** — origin at the south-west corner (node 3429648613), x east, y north:
- SW (613): E 0.0, N 0.0 · W (616, **the gate**): E 0.5, N 9.7 · NW (629): E 1.9, N 38.9 · NE (630): E 21.3, N 42.0 · SE (614): E 35.5, N 1.2

**CORRECTED — the samadhi enclosure is too small in the account.** It gives "~9 × 7 m". But the three OSM-mapped samadhis span **N 19.7 to N 35.0 — about 15 m north–south** — and E 11 to E 19, ~8 m east–west. With the two or three further shrines the account describes, the enclosure must be nearer **10 × 16 m**. A 9 × 7 m room cannot hold what is mapped there.

**Also adjust:** the account puts Vishvanatha's samadhi at 1.7 m wide × 1.5 m deep; OSM traces it at **3.1 × 2.4 m**. Satellite tracing of a 3 m object is crude, so I would build the carved shrine body at the account's photographic 1.7 m but allow a **plinth and step bringing the overall footprint to ~2.5–3 m** — which reconciles both. Narottama's chhatri needs no adjustment: account 3 × 3 m, OSM 3.1 × 2.4 m.

**Heights — all photographic estimates from the reviewed account, ±15%, and I could not verify any of them.** Carried forward as the best available: boundary wall 1.5–2.0 m; monkey-mesh grid 3.5–4.0 m; gate aedicule ~4.5 m overall with a 1.6 × 2.6 m door opening; arcade piers 0.30–0.35 m square, arch springing ~2.4 m, chhajja ~3.8 m, parapet ~4.5 m; darshan hall ~8.5–9 × ~11 m with a ~4.5 m ceiling on steel joists; marble dado 1.2–1.5 m; sanctum frame ~2.6 m wide, opening ~1.3 × 2.0 m, altar platform ~0.9 m; samadhi hall ceiling ~3.5 m, window sills ~1.1 m, heads ~3.0 m; Vishvanatha samadhi 3.0–3.2 m tall; Narottama chhatri ~2.8 m overall on a 0.35 m platform; Lokanatha chamber ceiling ~3.2 m, doorway ~1.1 × 2.0 m; minor samadhis 2.1–2.3 m with conical caps.

**Approach lane: 8.7 m long — now measured, not estimated** (OSM way 335852218), at the account's estimated 2.5–3.0 m width.

**Storeys: one.** Two- and three-storey neighbouring blocks press against the compound along the entrance passage and behind the samadhi yard and should be modelled, since they are what you see over the parapet.

## architecture

The reviewed account's architectural description is internally coherent, matches the building's documented origin, and I found nothing contradicting it — but a modeller must know how thinly it is sourced. **Wikimedia Commons holds no photograph of this temple at all** (searches return only the Bengal, Salem and Watford namesakes), and **there is no Wikipedia article for it**, unlike its six Sapta Devalaya companions. So every fine visual detail below rests on photo albums (Braj Ras, ISKCON Desire Tree, Holy Dham, radha.name) that I cannot independently corroborate. Treat the *forms* as reliable and the *fine detail* as one observer's reading.

**What independent evidence does support.** The documented origin corroborates the humble, domestic character. The sources say the temple began as **Lokanatha Goswami's bhajan-kutir** (meditation hermitage) and that Vishvanatha Chakravarti had the present temple built only after the original Radha-Vinoda temple "fell apart." A bhajan-kutir that grew into a courtyard compound is exactly the haveli-like, single-storey, flat-roofed fabric described — not a monumental foundation.

**Carried forward from the reviewed account (unchallenged):** single-storey, plastered and limewashed, flat-roofed, **no tower of any kind**; late-Mughal/Braj domestic vocabulary — cusped multifoil arches on slender plastered piers (~0.30–0.35 m square), projecting chhajja eaves on small brackets, plain parapets, marble dados, marble floors. Salmon-pink and cream limewash with a terracotta-red band at pier bases, heavily weathered. Verandah floor in black-and-white checkerboard marble on a low plinth; open court in grey-green flagstone.

The **street gate** — a carved buff/pale-pink stone aedicule projecting ~0.3 m from a battered rubble-and-brick wall, cusped arch in relief with rosette medallions in the spandrels, a low triangular white-and-blue signboard lettered in red in Devanagari and Roman, and two tall yellow-ochre panelled timber doors onto a dark green metal grille. Three or four steps up from the lane.

The **darshan hall** — whitewashed, grey-and-white veined marble dado 1.2–1.5 m, large-format marble paving, **flat ceiling on exposed dark steel I-beams**, three-bay cusped arcade on the end wall, central sanctum opening. The **sanctum opening is plain**: a grey-painted timber frame ~2.6 m overall with wire-mesh side panels and a waist-high mesh grille — not a carved stone garbha-griha door.

The **samadhi enclosure** — see `distinguishing`; this is the part to get right.

**The cage** — green steel mesh walls and overhead wire mesh on rusted angle-iron over the approach lane, the garden and the samadhi hall's window openings. Monkey-proofing, and it governs how light falls.

**CORRECTED — the approach and gate position, now exact.** The reviewed account said "Parikrama Marg runs along the temple's western edge — within about 2 m of the compound boundary." That is true only at the north-west corner. Tracing OSM way 970910718 node by node: the parikrama lane runs **8–9 m west** of the west boundary for its whole length alongside the compound, then **wraps around the north-west corner and turns east along the north side**. It never runs flush against the west wall.

The gate is better located than the account managed. OSM way **335852218**, an 8.7 m residential spur, runs east off Parikram Marg and **terminates on a node shared with the compound polygon** (node 3429648616) — a deliberately mapped entrance. In a local frame with the origin at the south-west corner, x east and y north:

- **Gate: E +0.5 m, N +9.7 m on the west boundary** — i.e. about 10 m north of the south-west corner.
- Approach spur: 8.7 m long, running due west from the gate to the parikrama lane.

That 8.7 m spur is precisely the caged, red-oxide-floored approach passage the account describes, and its length is now a measured number rather than an estimate.

## distinguishing

**1. Three men's Deities, three men's graves, one compound.** This is the feature nothing else in Vrindavan repeats, and the reviewed account states only half of it. Radha-Vinoda, Vijaya Govinda and Radha-Gokulananda stand together on one altar because their owners' worship converged here; Lokanatha, Narottama and Vishvanatha lie in the yard alongside. Altar and yard are one story.

**2. The samadhi enclosure — and OpenStreetMap independently confirms all three.** This is the strongest corroboration in the whole review. OSM carries three separate mapped buildings inside the compound polygon, named in Russian by the surveyor, and all three sit inside it (local frame, origin at the south-west corner):

| Shrine | OSM way | Centre | Footprint |
|---|---|---|---|
| Lokanatha Goswami samadhi | 335527347 | E 14.5, N 22.9 | **7.1 × 6.3 m** |
| Vishvanatha Chakravarti samadhi | 335527345 | E 17.6, N 30.4 | 3.1 × 2.4 m |
| Narottama Dasa samadhi | 335527346 | E 16.8, N 33.7 | 3.1 × 2.4 m |

Two things fall straight out. Lokanatha's is **more than five times the footprint of the other two** — independently confirming the account's observation that it is now an *enclosed chamber*, not a free-standing shrine. And Narottama's 3.1 × 2.4 m matches the account's "platform ~3 × 3 m" for the chhatri almost exactly. The group occupies the **north-east quadrant**, running roughly north–south.

**3. Vishvanatha Chakravarti's samadhi is the signature object** — a densely carved stone shrine ~3 m tall whose cornice sweeps up in a shallow curve into a **Bengali bangla/chala roof** carrying a **fluted, lotus-petal-scaled dome** and kalasha. A Bengal roof form, not a North Indian one, now limewashed cream-yellow over the carving with a maroon plinth flaking to cream. Beside it Narottama's **open white marble chhatri on lotus-capitalled columns**; beside that Lokanatha's **pale blue chamber with a barred teak door under a pink lintel band**, ringed with white marble verse plaques.

**4. Narottama's is a pushpa-samadhi, and its contents are documented** — his garland, kaupins, cloth and mala. He departed at Prema Ghat, Kheturi, in Bengal; this is a memorial, not a grave. The account had this right.

**5. It is caged**, and **6. decay is the finish** — both as the account describes. A clean render of this building is a wrong render.

**7. Cusped arches and flat roofs on a single storey throughout.** Nothing rises above the parapet line except the samadhi shrines themselves, and none of those exceeds ~3.5 m.

## doNotBuild

**1. DO NOT build any of the three other "Radha Gokulananda" temples — the reviewed account missed all three, and they dominate image search.**
- **Bhaktivedanta Manor, Watford, England.** ISKCON's presiding Deities there are Sri Sri Radha-Gokulananda, installed by Prabhupada on Janmashtami 1973. This is the **top Wikipedia hit** for "Gokulananda temple Vrindavan" and the **only Commons image** named "Radha gokulananda." It is a mock-Tudor English country house.
- **Radha Gokulananda Ek-Ratna temple, Alangiri, Purba Medinipur, West Bengal.** The most dangerous one: a genuine historic Bengali brick temple of nearly the same name, with an **ek-ratna pinnacle/tower** and a rasmancha, and six images on Commons. Because the Vrindavan site's Vishvanatha samadhi genuinely carries a *Bengal* roof form, a modeller reaching for Bengali references will land on Alangiri and import a tower. Do not.
- **ISKCON Sri Sri Radha Gokulananda, Salem, Tamil Nadu.** Modern South Indian ISKCON temple, on Commons.

**2. "No source gives a patron" is WRONG — the account's own cited source contradicts it.** It claimed "No source I could find — including the Mathura district administration — gives a construction year, a patron, or a mason." But **mathura.nic.in, the very page cited, states: "Viswanath Cakravarti arranged to have this temple built,"** and gives the sequence: he worshipped Gokulananda at Radha Kunda, moved to Vrindavan, stayed with Lokanatha Goswami, and "when the original temple of Radha-Vinoda fell apart, Viswanath Cakravarti had another temple built and called it the Gokulananda Temple." Braj Ras carries the same — *and also* "Radha Gokulanand temple is built by Shri Loknath Swami" as a bhajan-kutir, on the same page. The record is not blank; it is **contradictory**, and the two claims reconcile plausibly (Lokanatha's kutir and Radha-Vinoda Deity first; Vishvanatha's rebuilding later). **Report the conflict in-world, do not erase it.**

**3. Still put NO founding DATE on a plaque.** That part of the account stands. No source gives a construction year. The floating **"1674" is Gaudiya Treasures' claimed *samadhi* (death) year for Vishvanatha Chakravarti — not a temple founding date** — and it conflicts with Wikipedia's "c. 1626 – c. 1708". Wikipedia gives only "He died on the Vasanta-pancami in the month of Magha," with no year.

**4. Do not call it flatly "the seventh" of the Sapta Devalaya.** The list is contested: some published lists give the seven as Govind Dev, Gopinath, Madan Mohan, Radha Raman, Radha Damodar, **Radha Vallabh** and Shyamsundar — **excluding Gokulananda**. The UPBTVP circuit scheme's official list *does* include "Shri Gokulananda Ji Temple" and excludes Radha Vallabh. Say "one of the seven," not "the seventh"; the ordinal is a convention, not a rank.

**5. Not red sandstone, and not a miniature Govind Dev or Madan Mohan.** The account was right and there is a historical reason to give a modeller: the red-sandstone monumental group (Govind Dev 1590 under Man Singh, Madan Mohan c. 1580) is late-16th-century Rajput-patronised architecture. Gokulananda is a **later, humbler foundation grown out of a bhajan-kutir**. The travel-site claim of "traditional red-sandstone architecture" is a category error.

**6. No shikhara, no dome over the temple, no tower.** Flat-roofed and single-storey throughout. The only curved and domed forms on the site are the samadhi shrines, each under ~3.5 m.

**7. Do not copy the header image from mathuravrindavantourism.co.in** — it shows a different Sapta Devalaya temple.

**8. The "Radha Gokulananda1-v.jpg" caution is CONFIRMED — heed it.** Holy Dham publishes that image under the literal header *"Sri Sri Radha Shyamasundar: (Is the below picture relevant to Radha Shyamasundar or Radha Gokulananda?)"*. Its own publisher does not know what it shows. Do not build a signature elevation from it.

**9. Do not build the Sapta Devalaya Circuit — CONFIRMED proposed only.** ₹18 crore, UPBTVP, reported 19 June 2025, in future tense throughout ("has proposed", "once completed"). No corridor, plaza or new gateway exists. The lane outside is narrow, cabled and crumbling.

**10. The Govardhana-shila is tiny** and kept away, shown on request for a small donation. Do not model a boulder on a platform.

**11. Do not state flatly that Lokanatha Goswami left his body here — CONFIRMED.** The sources say he entered nitya-lila at **Yugala Kunda, Khadiravan (Khoyra/Khayra village), c. 1583–1588**. The Vrindavan shrine is plainly labelled his samadhi; a pushpa-samadhi also stands at Yugala Kunda. Build the shrine; leave the claim as the temple's own. Likewise **Narottama Dasa departed at Prema Ghat, Kheturi, Bengal** — the Vrindavan shrine is a pushpa-samadhi.

**12. Do not expect Growse to help.** I searched the full text of *Mathura: A District Memoir* (1874). It contains **no architectural account of this temple** — the only occurrence is a festival-calendar entry, "Srávan Badi 8 — Gokulanand ká dhio dhio. Mourning for the death of Gosáin Gokulanand," which concerns a person, not the building. "Lokanath," "Narottam" and "Visvanath" do not appear at all. Do not cite Growse for this temple.

**13. Do not build the samadhi yard open to the sky if modelling today** — but know this rests on photographs alone. Every *text* source still says "a small courtyard next to the temple," and I found no news of the roofing work. The account's claim that it is now roofed on steel I-beams with mesh-screened windows is photo-derived and textually uncorroborated. It is probably right; flag it in the project as an observation, not a citation.

## deities

THE ACCOUNT UNDER REVIEW LEFT THIS FIELD EMPTY. That is its single largest gap, because the altar is the reason the samadhi yard exists. Four independent sources — the Mathura district administration (mathura.nic.in), Braj Ras, Holy Dham and The Gaudiya Treasures of Bengal — carry the same list, near-verbatim:

- **Sri Sri Radha-Vinoda** — "the small Radha-Vinoda Deities of Lokanatha Gosvami".
- **Sri Sri Vijaya Govinda** — "the larger Deities of Vijaya Govinda of Baladeva Vidyabhusana".
- **Sri Sri Radha-Gokulananda** — "the Radha Gokulananda Deities of Viswanath Cakravarti"; the temple is named for these.
- **A small Krishna standing before Gokulananda, and a Deity of Chaitanya Mahaprabhu** — both recorded as worshipped by Narottama Dasa Thakura.
- **The Govardhana-shila given by Chaitanya Mahaprabhu to Raghunatha Dasa Goswami**, said to bear His thumbprint. mathura.nic.in: it "can be seen if you give a small donation" — confirming the reviewed account's note that it is brought out on request, not displayed.

The relative sizes are stated in the sources and are buildable: Radha-Vinoda **small**, Vijaya Govinda **larger**. Do not size Them uniformly.

**Why this matters for the model.** The sources say each of these Deities was formerly "worshiped alone, in their own temples," and were consolidated here. That is the logic of the whole site: the three samadhis in the yard are the three Deity-owners — Lokanatha (Radha-Vinoda), Vishvanatha (Gokulananda), and Narottama (the Chaitanya and small Krishna Deities). Build the altar and the yard as one idea, not two.

## sources

- OpenStreetMap API, way 335852213 (compound outline; tags and all five node coordinates fetched live and recomputed — area 1,106 m², centroid 27.586176/77.698756). Retrieved 27 Sep 2026.
- OpenStreetMap ways 335527345 (Visvanatha Cakravarti samadhi), 335527346 (Narottama Dasa samadhi), 335527347 (Lokanatha Goswami samadhi) — three separate mapped buildings, all confirmed by point-in-polygon test to lie INSIDE the compound. Independent corroboration of the samadhi yard and of Lokanatha's shrine being an enclosed chamber (7.1 x 6.3 m vs 3.1 x 2.4 m for the others).
- OpenStreetMap way 335852218 (8.7 m entrance spur) and way 970910718 (Parikram Marg) — traced node by node; the spur terminates on node 3429648616, shared with the compound polygon, fixing the gate at E+0.5 m, N+9.7 m from the south-west corner.
- Overpass API — independent recomputation of all ten neighbour distances and bearings quoted in the reviewed account; all confirmed within a few metres.
- Mathura district administration, mathura.nic.in/radha-gokulananda-mandir/ — names the three Deity groups, the Govardhana-shila given by Chaitanya to Raghunatha Dasa Goswami, and states 'Viswanath Cakravarti arranged to have this temple built.' This page DIRECTLY CONTRADICTS the reviewed account's claim that no source names a patron.
- The Gaudiya Treasures of Bengal, 'Radha Gokulananda temple, Vrindavan - founded by Viswanath Chakravarti' (1 May 2023) — Deities, the three samadhis 'in a small courtyard next to the temple', pushpa-samadhis of Ganga Narayana Chakravarti and Krishnadeva Sarvabhauma, and the source of the disputed '1674' (a samadhi year for Vishvanatha, NOT a founding date).
- Braj Ras / brajrasik.org, Shri Radha Gokulananda Temple — carries BOTH founder attributions on one page: 'Viswanath Cakravarti arranged to have this temple built' and 'built by Shri Loknath Swami' as a bhajan-kutir.
- Holy Dham, holydham.com/sri-sri-radha-gokulananda-temple/ — Deities and shila; and CONFIRMS the reviewed account's image caution, publishing the disputed photograph under the header 'Sri Sri Radha Shyamasundar: (Is the below picture relevant to Radha Shyamasundar or Radha Gokulananda?)'.
- Wikipedia, 'Vishvanatha Chakravarti' — 'c. 1626 - c. 1708'; no year of death given, no mention of 1674. Confirms the reviewed account's caution against the circulating dates.
- Vrindavan Today, 'Sapta Devalaya Circuit to boost religious tourism' (19 June 2025) — CONFIRMS the circuit is PROPOSED ONLY: Rs 18 crore, UPBTVP, future tense throughout. Also supplies the official seven-temple list, which includes 'Shri Gokulananda Ji Temple' and excludes Radha Vallabh.
- Wikimedia Commons API search (negative result, and a confusion hazard): NO image of this temple exists on Commons. Searches return only the namesakes - 'Radha Gokulananda Ek Ratna temple at Alangiri, Purba Medinipur, West Bengal' (6 images, a Bengali ek-ratna temple WITH a tower), 'SRI SRI RADHA GOKULANANDA TEMPLE (ISKCON), SALEM', and 'File:Radha gokulananda.jpg' whose metadata reads 'the preciding deities in Bhakti Vedanta Manor (ISKCON), London, UK'.
- Wikipedia API search — no article exists for this temple, unlike its six Sapta Devalaya companions; the top hit for 'Gokulananda temple Vrindavan' is Bhaktivedanta Manor, Watford.
- F. S. Growse, 'Mathura: A District Memoir' (1874), full text via archive.org (in.ernet.dli.2015.32120) — searched directly. NEGATIVE RESULT: no architectural account of this temple. Sole occurrence is a festival-calendar entry, 'Sravan Badi 8 - Gokulanand ka dhio dhio. Mourning for the death of Gosain Gokulanand.' 'Lokanath', 'Narottam' and 'Visvanath' do not appear.
- ISKCON Desire Tree / Gaudiya History — Lokanatha Goswami entered nitya-lila at Yugala Kunda, Khadiravan (Khoyra/Khayra), c. 1583-1588; Narottama Dasa departed at Prema Ghat, Kheturi, Bengal, his Vrindavan pushpa-samadhi holding his garland, kaupins, cloth and mala. Both CONFIRM the reviewed account's cautions.
