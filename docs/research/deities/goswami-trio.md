# Deity forms: Radha Damodar, Madan Mohan, Radha Gopinath (and Jugal Kishore)

Filed from workflow run wf_7ae47b98-f89, paired by journal key (survey and checker results joined on the `key` of their `started` events, never by completion order).

**Status:** UNVERIFIED: its checker did not run (org spend limit, 2026-09-30). Build nothing from a claim here that the survey itself marks ESTIMATED or UNKNOWN.

These are living, worshipped murtis. The survey's own sensitivity notes come first and bind everything below them.

## Sensitivity

- These are consecrated murtis and shilas, worshipped as Krishna's actual presence (arca-vigraha). The tradition holds a pratibhu to be non-different from the original, with 'exactly the same potency' [SOURCED: Gaudiya Treasures; radha.name; theharekrishnamovement.org]. Present them as objects of worship, never as props, statues, trophies or collectibles.
- Always show them dressed as at darshan. An undressed or bare-stone murti would be both disrespectful and invented.
- No interaction. Players must not touch, select, rotate or zoom into a murti, stand on the altar, step behind the altar rail or enter the sanctum; colliders should keep the avatar at the darshan line. No points, badges or quests tied to darshan (the project's own 'no gamified devotion' rule). No glow, halo particles, animation, blinking or flute music coming from the murti.
- Honour the curtain. When the curtain is closed the deities are resting, being dressed or being fed: keep it shut and do not let the camera see past it. Use each temple's own hours, not one global schedule.
- Photography is refused at the real altars: Madan Mohan has a 'No Photography' sign on the wooden door [SOURCED: Vrindavan Today 2021], and Radha Damodar a 'Photography is strictly prohibited' board [SOURCED: project survey]. Consider disabling photo mode or screenshots at altars, or at least close-up zoom.
- Do not adjudicate 'original versus replica'. Both the Vrindavan and Jaipur communities claim Jiva Goswami's Radha Damodar. Never put 'replica', 'copy' or 'fake' on screen, and do not call any of these the original. If a label is needed, use the temple's own name, e.g. 'Shri Radha Damodar ji'.
- Jahnava Thakurani is a revered historical saint (Nityananda's consort) and is identified with Ananga Manjari. Name her as the temple does, and do not dramatise the dream legends as cut-scenes.
- Shilas (Govardhan/Giriraj) are Krishna himself to worshippers. Never place one on the floor, use it as a seat or step, or let the avatar point its feet at it.
- The saints' murtis and samadhis (Rupa, Jiva, Krishnadas Kaviraja, Bhugarbha, Sanatana, Madhu Pandit, Prabhupada) are venerated shrines, not waxworks. Keep them garlanded, in their own rooms, and unanimated.
- Etiquette: shoes come off before the parikrama at Madan Mohan [SOURCED: Vrindavan Today] and in temple halls generally. Show the avatar barefoot inside, or leave the shoes at the threshold.
- Faces must follow the photographs — large eyes, Gaudiya tilak, painted features — without stylising them into caricature. A devotee recognises the deity first by the face.

## Do not model

- The Radha Damodar centre figure is not an eight-inch miniature. Two dated licensed photographs show a black flute-playing Krishna of roughly 0.6–1.0 m. altars.js and temple-architecture.json treat the eight-inch figure as the one on view, and the JSON dismisses the 'five-foot' account; both need correcting. The dispute over which murti is the original does change what a visitor sees, contrary to the JSON's 'no visual difference'.
- Radha Damodar is not three figures. Seven principal figures (three black Krishnas and four metal-faced females) stand in one row, with small figures on the step and the Govardhan shila on its own table in front, in both 2023 and 2026. altars.js models three.
- The female murtis at these temples are not black stone. At Radha Damodar their faces read as gold-brass metal: #A89165, #9F8D64, #A99767, #A38E63 [MEASURED]. Gopinath's two side figures are also gold-brass-faced (all-rights-reserved photographs), and Madan Mohan's are pale or yellow painted. altars.js sets Radha at Radha Damodar to BLACK_STONE, which is wrong.
- Gopinath and Madan Mohan do not have a light 'SKIN' tone. Both are black in every photograph found, 2019–2026.
- Lalita at Radha Damodar is not crown:false as a fixed trait. She wore a tall headdress in April 2026. Headdress, crown, turban, peacock feather, fan-halo, flute, garlands and possibly the large eyes and tilak are shringar: build each as a separate swappable layer, not carved into the murti.
- No invented anatomy under the clothes. Legs and feet are hidden in every photograph except Gopinath's (one foot crossed and resting on its toes). Never produce an undressed murti.
- Damodar has no rope round the waist and no crawling or mortar (ulukhala) pose. The name Damodar does not show in the form, which is a standing flute-player.
- At Vrindavan Gopinath, do not place Lalita and Vishakha as full-size flanking figures. No photograph of the Vrindavan three-bay simhasan shows them. The five-figure layout with two veiled sakhis at the ends is the JAIPUR altar of the originals (CC0 photograph, 2025).
- Do not pick Gopinath's female sides by guess, and do not make Radharani the taller. altars.js puts Ananga Manjari at His own left, which matches the tradition's wording, but it makes Radharani taller. The larger female (viewer's right) is the one the tradition calls Ananga Manjari. Braj Ras's captions reverse the identities. Until the temple confirms, show two unlabelled metal-faced female figures, the viewer's-right one ~15–20% larger.
- Do not use Karauli (original Madan Mohan), Jaipur (original Gopinath; the disputed Radha Damodar) or Radha Kund branch temples as references for the Vrindavan murtis.
- Other temples of the same names are traps: Bishnupur, Cooch Behar, Khardaha, Bankura (Ghutgoria), Birbhum (Suri), Junagadh, ISKCON Ujjain (Commons 'RadhaMadanMohan.jpg' is ISKCON Ujjain), and Vrindavan's own Athkhamba Madan Mohan of Raghunath Bhatta Goswami. Braj Ras's 'Radha Madan Mohan' album includes an Athkhamba signboard, so none of its deity pictures is safe to use.
- Growse's 'the god is fed seven times a day' schedule is not Vrindavan's. It follows directly after his account of the Karauli establishment. temple-architecture.json currently uses it to animate the Vrindavan scene.
- The temples do not share one curtain schedule. The project's uniform 04:00–21:00 curtain differs from each temple's real hours, which include a midday closure: Radha Damodar ~12:30/13:00 to 16:15/17:00; Madan Mohan opens ~07:00, with Mangal 04:30 only in Kartik; Gopinath Mangla 05:00.
- No deities inside the ruined sandstone sanctums of Madan Mohan or Gopinath. Growse: 'seldom, if ever, used for religious service'. Gopinath's pratibhu is in the 19th-century temple, and its only side-room deity is Muralidhar Mahaprabhu.
- The Radha Damodar Govardhan shila does not go on the main altar platform or get a face. It lies on its own low draped table in front and has four marks, no eyes. It is the Gopinath Giriraj shila that has painted eyes and tilak.
- Do not model the unidentified objects as named deities: the dark stone under the serpent canopy, the green-faced object and the small marked items at Radha Damodar; the lower-step faces and the two tall side-bay figures at Madan Mohan. The doll-like crowned female standing on the floor at Radha Damodar's right-hand column (2023) is not a deity either.
- Colours from Aliva Sahoo's April 2026 Commons photographs are not ground truth. The images look AI-enhanced (painterly edges, boosted saturation, blown highlights on the Madan Mohan central face). Use them for proportion and layout, and for colour only within ±15%.
- Do not copy, trace or bake Braj Ras, Vrindavan Today or Gaudiya Treasures photographs into textures. They are all rights reserved, and they are sacred images.

## The murtis, one by one

### Shri Damodar

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Shri Damodar: the black flute-playing Krishna at the CENTRE of the altar. This is the figure a visitor sees. Whether it is Rupa Goswami's original or a pratibhu is CONTESTED (see uncertain).

**posture:** Standing and playing the flute. The flute is held level at the mouth with both hands and runs out to His own right, the viewer's left [MEASURED: File:Deities of Radha Damodar.jpg, 19 Apr 2026, and File:Radha Damodar temple in Vrindavan.jpg, 15 Jun 2023]. Legs, feet and any tribhanga are UNKNOWN because the dress covers them in every photograph. The name Damodar (the child bound by a rope) does NOT show in the pose: this is a standing flute-player, with no rope and no crawling or mortar pose [MEASURED]. The Jaipur temple calls ITS Damodar the Lord's 'bal swaroop' (child form) [SOURCED: ETV Bharat, about the Jaipur murti only].

**height:** Original: 'about eight inches' (~20 cm), carved by Rupa Goswami [SOURCED: Vrindavan Today; vrindavanforest.com; rvcdarshan blog]. The figure on view today: ESTIMATED 0.6–1.0 m from crown top to visible base, central value ~0.75 m. Face from hairline to chin ~10–18 cm. Scaled from marigold heads, assumed 4.5–6.5 cm and measuring 70–85 px, in the 2026 photograph; ±35%. It is clearly NOT an eight-inch figure: the face alone is 180 px wide, about 2.3 marigold heads. vrindavanforest.com says the present figure is a 'five foot tall black marble ... prati-bhu-murti' [SOURCED, single devotional source]. That is larger than this estimate and remains unresolved.

**material:** Original: 'black marble' / 'a piece of black stone from the Vindhya mountains' (Vindhya Parvat, Madhya Pradesh), carved and installed in Kartik 1542 [SOURCED: IDT, holydham, Gaudiya Treasures, Vrindavan Today, rvcdarshan — the texts disagree between marble and stone]. The figure on view: material UNKNOWN. It reads as polished black stone [ESTIMATED]. vrindavanforest.com calls it 'black marble' [SOURCED, single source].

**murtiColour:** #241B16, warm near-black: median of the darkest 5–25% of face pixels [MEASURED: File:Deities of Radha Damodar.jpg, CC BY-SA 3.0. The image looks AI-enhanced, so treat the value as ±15%]. Painted ornament over the face reads #412D24–#7E6754 and changes with the day's shringar. The flute reads #D4CDC0.

**attributes:**
- Flute (venu), silver-white, held across the mouth toward His own right [MEASURED]. Almost certainly a separate ornament placed in the hands [ESTIMATED].
- Two arms, both on the flute [MEASURED].
- Very large white eyes with black pupils, and a cream tilak on forehead and nose, in both 2023 and 2026 [MEASURED]. Whether they are inlaid, painted or attached is UNKNOWN.
- Headdress: turban/crown with a peacock-feather element. In April 2026 a large orange circular fan-halo stood behind the head [MEASURED — shringar, changes].
- Marigold and jasmine garlands, necklaces [MEASURED — daily].
- Tradition that the deity combines Madan Mohan's feet, Govindadev's face and Gopinath's torso [SOURCED: Gaudiya Treasures — devotional; NOT a visual specification].

**arrangement:** At the centre of seven principal figures. Radharani stands at His OWN LEFT (viewer's right) and Lalita Sakhi at His OWN RIGHT (viewer's left) [SOURCED: Vrindavan Today; Gaudiya Treasures; vrindavanforest.com — and consistent with both photographs, MEASURED]. The whole row, viewer's left to right: Krishna (large, standing highest) · female · female (Lalita) · DAMODAR · female (His Radha) · smaller Krishna · female [MEASURED, 2023 and 2026 identical in layout].

**altarSetting:** One wide, shallow common altar, ~4–5 m across [SOURCED: project survey], with all the figures in a single row on a draped platform. No carved stone simhasan is visible. The altar is framed by two pale fluted columns with foliate capitals, a crystal chandelier hangs in front, and above it run a blue lattice-pattern valance, a red banner with Hindi text and marigold festoons [MEASURED 2023]. Backdrop textile: dark green velvet with white floral vines (2026) or dark glittered hangings (2023). A silver/gilt repoussé crest of paired elephants sits at the top centre [MEASURED 2023 and 2026; 'heavy silver work in the background' SOURCED: mathuravrindavantourism.co.in]. Altar-front cloth: purple sequinned (2023), red printed (2026) — it changes.

**fixedVsChanging:** FIXED: a black two-armed murti in flute-playing position, at the centre of the row. CHANGING: all dress (orange/saffron in Apr 2026, yellow in Jun 2023), crown, turban, fan-halo, garlands, jewellery and face painting [MEASURED across two dated photographs]. Darshan hours, from tourism listings: summer 06:30–12:30 and 17:00–21:30; winter 07:30–13:00 and 16:15–20:45 [SOURCED, low reliability]. The curtain is closed outside these hours. Kartik (the Damodar month, Oct–Nov) is the chief festival season, when devotees offer lamps and circle the shila [SOURCED: Vrindavan Today].

### Shri Radharani of Radha-Damodar (the female murti at Damodar's own left)

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Shri Radharani of Radha-Damodar (the female murti at Damodar's own left)

**posture:** Standing. Hands mostly hidden by cloth and garlands; small white objects (flowers) sit in the hands in 2026 [MEASURED qualitatively]. What she permanently holds is UNKNOWN.

**height:** ESTIMATED 0.45–0.8 m from crown to visible base. Face width 0.61× Damodar's [MEASURED ratio, 2026 photograph].

**material:** UNKNOWN in any text. Face and hands read as polished gold-brass metal [ESTIMATED from photos — possibly ashtadhatu or brass; not sourced]. Legend: she and Lalita were found by a Bengal fisherman and sent to Jiva Goswami on a king's dream [SOURCED: Gaudiya Treasures; Vrindavan Today — devotional].

**murtiColour:** #A99767, median of the gold-hued face pixels [MEASURED: File:Deities of Radha Damodar.jpg, CC BY-SA 3.0, processed image]. NOT black.

**attributes:**
- Large painted white eyes, red lips [MEASURED]
- Large gilt headdress and a circular white-and-pink fan-halo (Apr 2026) [MEASURED — shringar]
- Long black hair or braid [MEASURED; whether attached hair is UNKNOWN]
- Nose ornament, necklaces, garlands [MEASURED — changing]

**arrangement:** Immediately at Damodar's OWN LEFT (viewer's right) [SOURCED + MEASURED]. Beyond her, further to Damodar's left, stands the smaller Krishna of the right-hand set.

**altarSetting:** The same common altar as Damodar [MEASURED].

**fixedVsChanging:** FIXED: a metal-faced standing female at Damodar's left. CHANGING: sari/lehenga (red 2026, yellow 2023), veil, headdress, halo, jewellery, garlands.

### Lalita Sakhi (the female murti at Damodar's own right)

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Lalita Sakhi (the female murti at Damodar's own right)

**posture:** Standing. Hands hidden [MEASURED qualitatively].

**height:** ESTIMATED 0.4–0.65 m. The smallest principal face on the altar: 0.56× Damodar's [MEASURED ratio, 2026 photograph].

**material:** UNKNOWN. Metal face, gold-brass [ESTIMATED]. Same fisherman legend as Radharani [SOURCED, devotional].

**murtiColour:** #9F8D64, gold-hued face pixels [MEASURED, CC BY-SA 3.0 photograph, processed]. NOT stone-coloured.

**attributes:**
- Tall headdress with peacock-motif ornaments in Apr 2026 [MEASURED — shringar]. The project's crown:false for Lalita is contradicted.
- White/silver-grey dress in 2026, yellow in 2023 [changing]
- Painted white eyes [MEASURED]

**arrangement:** At Damodar's OWN RIGHT (viewer's left), between Damodar and the Radha of the far-left set [SOURCED + MEASURED].

**altarSetting:** The same common altar [MEASURED].

**fixedVsChanging:** FIXED: a metal-faced standing female at Damodar's right. CHANGING: all dress and headdress.

### Krishna of the far-left set (as you face the altar). ESTIMATED to be Shri Vrindavanchandra, Krishnadas Kaviraja's deity 

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Krishna of the far-left set (as you face the altar). ESTIMATED to be Shri Vrindavanchandra, Krishnadas Kaviraja's deity — identity not confirmed.

**posture:** Standing and playing the flute, which runs to His own right (viewer's left) [MEASURED 2023 and 2026]. Legs UNKNOWN.

**height:** ESTIMATED: murti ~0.6–1.0 m (face width 0.94× Damodar's). It stands the HIGHEST of all the figures — face about 0.2 m above Damodar's [MEASURED in both photographs] — so it sits on a raised pedestal or is taller. Crown top ~1.0–1.3 m above the altar platform [ESTIMATED].

**material:** UNKNOWN. Reads as black stone [ESTIMATED]. The sources name the set (Radha-Vrindavanchandra, worshipped by Krishnadas Kaviraja) but give no material, size or position [SOURCED: IDT, holydham, Wikipedia].

**murtiColour:** #0D0A04–#17110A, darkest 5–40% of face pixels, near-black [MEASURED, CC BY-SA 3.0 photograph, processed].

**attributes:**
- Flute [MEASURED]
- Painted white eyes and tilak [MEASURED]
- Tall turban-crown with peacock feather (2026) [shringar]
- Black hands with gold painted designs visible in 2026 [MEASURED — decoration, changing]

**arrangement:** The leftmost figure as seen from the front, with his Radha at his own left (viewer's right). A tourism site says 'on his [Damodar's] right side is Radha Vrindavan Chandra' [SOURCED: mathuravrindavantourism.co.in — frame not stated]. Read in Damodar's own frame, that puts this set on the viewer's left [ESTIMATED].

**altarSetting:** The same common altar, far-left end [MEASURED].

**fixedVsChanging:** FIXED: a black flute-playing Krishna at the far left, raised above the rest. CHANGING: dress (red-pink 2026, yellow 2023), crown, garlands.

### Radha of the far-left set (ESTIMATED Radha of Vrindavanchandra)

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Radha of the far-left set (ESTIMATED Radha of Vrindavanchandra)

**posture:** Standing, hands near the chest holding small white objects (2026) [MEASURED qualitatively].

**height:** ESTIMATED 0.45–0.8 m. Face 0.61× Damodar's [MEASURED ratio].

**material:** UNKNOWN. Metal face [ESTIMATED].

**murtiColour:** #A89165, gold-hued face pixels [MEASURED, CC BY-SA 3.0, processed].

**attributes:**
- Painted eyes, headdress, veil [MEASURED — changing]

**arrangement:** At the far-left Krishna's OWN LEFT (viewer's right), between him and Lalita [MEASURED].

**altarSetting:** The same common altar [MEASURED].

**fixedVsChanging:** FIXED: a metal-faced female beside the far-left Krishna. CHANGING: dress (mauve 2026, yellow 2023).

### Krishna of the right-hand set. ESTIMATED to be Shri Madhava, Jayadeva Goswami's Radha-Madhava — identity not confirmed.

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Krishna of the right-hand set. ESTIMATED to be Shri Madhava, Jayadeva Goswami's Radha-Madhava — identity not confirmed.

**posture:** Standing and playing the flute, which runs to His own right (viewer's left) [MEASURED]. Legs UNKNOWN.

**height:** ESTIMATED 0.45–0.75 m. Face 0.72× Damodar's — noticeably smaller [MEASURED ratio].

**material:** UNKNOWN. Reads as black stone [ESTIMATED].

**murtiColour:** #151211, darkest face pixels, near-black [MEASURED, CC BY-SA 3.0, processed].

**attributes:**
- Flute [MEASURED]
- Tall crown, painted eyes [MEASURED — crown changes]

**arrangement:** Viewer's right of centre, with his Radha at his own left (the far right). Tourism site: 'On the left side, we have Radha Madhava ... and Sri Radha Chailacikan' [SOURCED — frame not stated]. Radha-Chhailchikan is NOT identifiable in either photograph.

**altarSetting:** The same common altar [MEASURED].

**fixedVsChanging:** FIXED: a smaller black flute-playing Krishna to the viewer's right of Damodar's Radha. CHANGING: dress (red 2026, yellow 2023).

### Radha of the right-hand set (ESTIMATED Radha of Madhava)

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Radha of the right-hand set (ESTIMATED Radha of Madhava)

**posture:** Standing [MEASURED qualitatively]. Partly out of frame in the 2026 photograph.

**height:** ESTIMATED 0.45–0.8 m. Face 0.61× Damodar's [MEASURED ratio].

**material:** UNKNOWN. Metal face [ESTIMATED].

**murtiColour:** #A38E63, gold-hued face pixels [MEASURED, CC BY-SA 3.0, processed].

**attributes:**
- Painted eyes, headdress [changing]

**arrangement:** At the right-hand Krishna's OWN LEFT: the rightmost principal figure as seen from the front [MEASURED].

**altarSetting:** The same common altar; she is the last figure before the right-hand column [MEASURED 2023].

**fixedVsChanging:** FIXED: a metal-faced female at the right end. CHANGING: dress (purple 2026, yellow 2023).

### Small pair at the foot of the altar, left of centre

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Small pair at the foot of the altar, left of centre: two figures with both arms raised. ESTIMATED to be Gaura-Nitai (Chaitanya and Nityananda).

**posture:** Standing with both arms raised above the head — the kirtan pose [MEASURED, 2023 photograph]. Garlanded in 2026.

**height:** ESTIMATED 0.15–0.3 m. Small beside the principal figures [MEASURED relative].

**material:** UNKNOWN. Pale/gold faces [MEASURED qualitatively].

**murtiColour:** UNKNOWN (too small to sample reliably); pale gold [qualitative].

**attributes:**
- Arms raised [MEASURED 2023]
- Red/pink dresses in both 2023 and 2026 [changing]

**arrangement:** Side by side, left of centre, below the principal row [MEASURED]. Wikipedia lists Gaur-Nitai (and Jagannath) among the temple's deities [SOURCED]. Matching THESE figures to that list is an ESTIMATE.

**altarSetting:** On the altar step, in front of the Radha of the far-left set and Lalita [MEASURED].

**fixedVsChanging:** FIXED: two small raised-arm figures side by side. CHANGING: dress.

### Govardhan (Giriraj) Shila of Sanatana Goswami — Giriraj Charan Shila

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Govardhan (Giriraj) Shila of Sanatana Goswami — Giriraj Charan Shila

**posture:** Not a figure: an oblong stone lying flat, 'shaped like a banyan leaf' [SOURCED: vrindavanforest.com; MEASURED consistent].

**height:** Length 'one-and-a-half cubits' [SOURCED: vrindavanforest.com, single source], about 0.65–0.7 m [ESTIMATED conversion]. Thickness UNKNOWN.

**material:** A shila from Govardhan Hill, worshipped as Krishna [SOURCED]. The stone type is UNKNOWN.

**murtiColour:** Stone #282018 (darkest half); its marks are picked out in yellow #CFB573 [MEASURED: File:Deities of Radha Damodar.jpg, CC BY-SA 3.0].

**attributes:**
- Four marks: Krishna's footprint (the RIGHT foot, per vrindavanforest), a calf's hoofprint, His flute and His stick (lakuti) [SOURCED: Wikipedia, IDT, holydham, vrindavanforest; Braj Ras Hindi: 'char chinh' — four marks]
- The marks are outlined in yellow paste or paint, with dotted outlines, a wavy line, a hoof-like U and floral motifs [MEASURED 2026]. Take the geometry from the photograph; do not invent it.
- Encircled by marigold garlands [MEASURED]
- NO painted eyes or face (unlike the Giriraj shila at Gopinath) [MEASURED]

**arrangement:** Front and centre, below Damodar [MEASURED]. Not part of any Radha-Krishna pair.

**altarSetting:** On its own low wooden table draped in yellow, standing on the floor in FRONT of and below the main altar (2023); on orange cloth in the foreground (2026) [MEASURED; the project's own checker agrees]. It is NOT on the altar platform.

**fixedVsChanging:** FIXED: the stone and its four marks. CHANGING: the yellow highlighting, garlands and cloth. Display varies: 'from behind a tattered curtain the head priest calls out Giriraj Maharaj ki Jai' [SOURCED: vrindavanforest.com]; 'on Janmashtami a large Govardhan stone is displayed' [SOURCED: Entwistle 1987]. It was on view during darshan in Jun 2023 and Apr 2026 [MEASURED]. Four circuits of it are said to equal a Govardhan parikrama [SOURCED, devotional].

### Unidentified small objects on the altar step — do NOT model as named deities

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Unidentified small objects on the altar step — do NOT model as named deities

**posture:** (1) A dark stone under a white/silver serpent canopy of about seven hoods, left of centre. (2) A small green-faced object inside a ring of marigold garland, right of centre. (3) Small dark objects with white marks near the centre [all MEASURED, 2026].

**height:** Roughly 10–25 cm each [ESTIMATED].

**material:** UNKNOWN. Item (1) may be a shalagrama or another shila; one of (3) may be the small Jagannath that Wikipedia lists [ESTIMATE only].

**murtiColour:** UNKNOWN (too small to sample reliably).

**attributes:**
- Serpent-hood canopy with white thread garland (item 1) [MEASURED]

**arrangement:** Scattered along the step in front of the principal row [MEASURED].

**altarSetting:** On the lower step of the common altar [MEASURED].

**fixedVsChanging:** UNKNOWN which of these are permanent.

### Murti of Srila Jiva Goswami in his samadhi temple

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Murti of Srila Jiva Goswami in his samadhi temple

**posture:** Seated, wrapped in a grey shawl, head covered with a white cloth, an orange cloth at the neck. Right hand raised with the palm outward in blessing [MEASURED: File:Statue of Jiva Goswami in his tomb in Vrindavan.png, 2011].

**height:** UNKNOWN. Appears roughly life-size, seated [ESTIMATED — no scale reference].

**material:** UNKNOWN.

**murtiColour:** Painted flesh tone, cheek ~#9F8479; shawl #696968; head cloth #9D9F9D [MEASURED from a small 283×395 CC BY-SA 3.0 image; low confidence].

**attributes:**
- Marigold garland [changing]
- Blessing hand [MEASURED]

**arrangement:** A single figure in its own shrine, not on the main altar.

**altarSetting:** In his samadhi temple behind the main temple, against a plain white wall with a framed picture above [MEASURED 2011]. Behind the temple are the samadhis of Rupa, Jiva, Krishnadas Kaviraja and others [SOURCED: Entwistle].

**fixedVsChanging:** Garlands and cloths change. The seated figure is fixed.

### Murti of Srila A. C. Bhaktivedanta Swami Prabhupada in his ground-floor room

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Murti of Srila A. C. Bhaktivedanta Swami Prabhupada in his ground-floor room

**posture:** Seated on a low wooden seat, hands resting at a marble-topped wooden table, head turned toward the table; saffron robes with a brown shawl [MEASURED: File:Srila Prabhupada Room at Radha Damodar Mandir in Vrindavan.jpg, 2019].

**height:** Life-size seated [ESTIMATED from the ~2 m door in the same view].

**material:** UNKNOWN. A realistically painted portrait figure [MEASURED qualitatively].

**murtiColour:** Skin #A3683D; robe #CF8B53 [MEASURED, CC BY-SA 4.0, 2019].

**attributes:**
- Garland of jasmine and roses [changing]
- Low bed, table, stanchions with red rope, a red donation box, framed pictures [MEASURED]

**arrangement:** His room within the temple courtyard (1962–65 residence) [SOURCED: Commons description].

**altarSetting:** A plastered room with a cream wall over a pink dado, a six-panel timber door, a ceiling fan and an air-conditioner [MEASURED].

**fixedVsChanging:** Garlands change. The room arrangement was stable in 2019 photographs.

### Second murti of Srila Prabhupada

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Second murti of Srila Prabhupada: seated and writing, with a lantern

**posture:** Seated cross-legged behind a low wooden desk, pen in the right hand, an open book on the desk, a blue hurricane lantern beside it [MEASURED: File:Prabhupada at Radha Damodar Mandir.jpg, 21 Apr 2026].

**height:** Life-size seated [ESTIMATED].

**material:** UNKNOWN.

**murtiColour:** Face #8E6B4E; robe #D59666 [MEASURED, CC BY-SA 3.0, 2026].

**attributes:**
- Gaudiya tilak, garland, saffron robes [MEASURED]
- Bilingual plaques either side; a framed photograph of Bhaktisiddhanta Saraswati above; a 'JALADUTA' ship mural at the right [MEASURED]

**arrangement:** A separate display from the ground-floor room figure. The two are distinct murtis [MEASURED — different pose and room].

**altarSetting:** A yellow-cream plastered room with a red-brown pilaster strip and timber cupboards [MEASURED].

**fixedVsChanging:** Garland changes. The display is fixed.

### Small image in the square niche above the street-portal door (identity UNKNOWN)

**temple:** Shri Radha Damodar Mandir, Seva Kunj, Vrindavan

**name:** Small image in the square niche above the street-portal door (identity UNKNOWN)

**posture:** UNKNOWN. Seen only draped in orange cloth [SOURCED: the project's survey of the Mathura district photograph].

**height:** Small — the niche is roughly 0.3–0.4 m [ESTIMATED from the survey's portal dimensions].

**material:** UNKNOWN.

**murtiColour:** UNKNOWN.

**attributes:**
- Orange cloth drape [SOURCED: project survey]

**arrangement:** Above the entrance, facing the lane. Model only as a small draped shape.

**altarSetting:** A niche inside the arch head of the carved buff-sandstone portal [SOURCED: project survey].

**fixedVsChanging:** UNKNOWN.

### Shri Gopinath — the pratibhu (substitute) murti worshipped in Vrindavan today. The ORIGINAL Gopinath, with its Radha and

**temple:** Shri Radha Gopinath Mandir, Vrindavan (the 1819–1821 temple built beside the ruined Akbar-period sandstone temple)

**name:** Shri Gopinath — the pratibhu (substitute) murti worshipped in Vrindavan today. The ORIGINAL Gopinath, with its Radha and an image of Jahnavi, was taken by Goswami Bhavanand to Kaman and then installed at Jaipur [SOURCED: Entwistle §30, after Gopal Kavi].

**posture:** Standing and playing the flute. The flute runs level to His own right (viewer's left) [MEASURED qualitatively: Braj Ras 2019–2023 and Gaudiya Treasures 2023, all rights reserved, inspected only]. Feet: one foot flat, the other crossed in front and resting on its toes with the heel raised — the crossed-leg venu-gopala stance [MEASURED qualitatively, Braj Ras 4K 'Lotus feet' photograph]. Hence a tribhanga with crossed legs [ESTIMATED].

**height:** UNKNOWN in any source. ESTIMATED 0.9–1.4 m from footstool to top of turban (central ~1.1 m); face from hairline to chin ~17–22 cm. Scaled from ~55 px marigold heads in the Braj Ras 4K frame, assumed 4–6.5 cm; ±35%.

**material:** UNKNOWN for the Vrindavan pratibhu. Reads as polished black stone [ESTIMATED]. The original is traditionally Vajranabha's image, found at Vamshivat by Paramananda Bhattacharya and served by Madhu Pandit [SOURCED as tradition].

**murtiColour:** UNKNOWN as a licensed measurement: Commons holds no photograph of this altar. Qualitatively glossy near-black in every photograph inspected (all rights reserved). NOT the light 'SKIN' tone the project currently uses.

**attributes:**
- Silver flute with an ornamental end [MEASURED qualitatively; separate ornament ESTIMATED]
- Two arms [MEASURED]
- Very large white eyes with black pupils, a white U-shaped Gaudiya tilak down forehead and nose, white brows, pink-red lips [MEASURED qualitatively; permanence UNKNOWN]
- Feet: heavy silver chain anklets with bells, red alta along the edges of the soles, white sandal-paste dots [MEASURED qualitatively]
- Turban (pagdi) or crown with peacock feather, heavy necklaces, garlands [changing]
- Tradition that Gopinath's chest resembles Krishna's [SOURCED: IDT; Gaudiya Treasures; Jan Prahari — said of the ORIGINAL; NOT a modelling specification]

**arrangement:** Alone in the central bay, with one female murti in each side bay [MEASURED]. Which female is which is UNRESOLVED — see the next two entries.

**altarSetting:** A dark-stained carved wooden simhasan of THREE bays with multifoil (cusped) arch heads and carved panels above. Paired dark turned colonnettes stand between the bays, and a small brass chhatra (parasol) hangs in each bay. It stands on a white-marble platform, with a black-and-white chequer marble floor and a star medallion in front [MEASURED qualitatively: Braj Ras, Gaudiya Treasures]. Two metal cows flank His feet, and there is a silver-covered footstool and silver panels [MEASURED qualitatively]. A rasa-lila mural is painted on the temple wall, and a large drum is played in worship [SOURCED: Gaudiya Treasures].

**fixedVsChanging:** FIXED: a black flute-playing figure alone in the central bay. CHANGING: dress (white; green with a yellow backdrop; blue-and-green; pink-and-white with a blue velvet backdrop — Braj Ras sets 2019–2023), backdrop cloth, turban, garlands, winter shawls. Aartis: Mangla 05:00, Shringar 08:30, Rajbhog 11:30 (printed as 'PM', evidently AM), Sandhya 18:00, Shayan 20:00 [SOURCED: Braj Ras article, 2017].

### Female murti in the bay at Gopinath's OWN LEFT (viewer's right). The tradition's own words place Shri Ananga Manjari (Ja

**temple:** Shri Radha Gopinath Mandir, Vrindavan

**name:** Female murti in the bay at Gopinath's OWN LEFT (viewer's right). The tradition's own words place Shri Ananga Manjari (Jahnava Thakurani) here, but Braj Ras's photo captions call this figure Shri Radharani. UNRESOLVED.

**posture:** Standing. One hand raised to about shoulder height, the other lowered [MEASURED qualitatively].

**height:** UNKNOWN in text. ESTIMATED 0.5–0.8 m. Her face is ~0.55–0.6× Gopinath's, ~15–20% larger than the other female's face, and sits higher. The same pattern appears in three Braj Ras sets [MEASURED ratio, all rights reserved photographs].

**material:** UNKNOWN. Face and hands read as polished gold-brass metal [ESTIMATED].

**murtiColour:** UNKNOWN as a licensed measurement. Qualitatively a gold-brass face with painted white eyes and tilak and white dots on the cheeks.

**attributes:**
- Crown: paisley or peacock-style in the photographs [changing]
- Long black hair or braid [MEASURED]
- Pearl and bead necklaces, garlands [changing]
- In winter: embroidered velvet hand-covers and a rust shawl [MEASURED, Braj Ras]

**arrangement:** At Gopinath's OWN LEFT (viewer's right). FOR Ananga Manjari here: Gopinath's instruction 'Place her on My left and Radhika on My right' [SOURCED: Braj Ras article]. IDT and Gaudiya Treasures also contrast this with Radha's usual place 'on the left-hand side of Krishna', which reads in the deity's own frame [SOURCED]. A Hindi source says 'वाम पार्श्व' (left flank) [SOURCED]. The legend makes the Jahnava-commissioned figure the TALLER one, and this figure is the larger [MEASURED]. The Jaipur altar of the originals also has its taller female on the viewer's right [MEASURED: CC0 photograph]. AGAINST: Braj Ras captions label this bay 'Shri Radharani on the right side of Shri Gopinath Ji' and 'Full darshan of Shri Radharani' [SOURCED].

**altarSetting:** Her own bay of the three-bay wooden simhasan [MEASURED].

**fixedVsChanging:** FIXED: a metal-faced standing female in the viewer's-right bay. CHANGING: all dress, crown, hand-covers and jewellery.

### Female murti in the bay at Gopinath's OWN RIGHT (viewer's left). By the tradition's wording this is Shri Radharani (the 

**temple:** Shri Radha Gopinath Mandir, Vrindavan

**name:** Female murti in the bay at Gopinath's OWN RIGHT (viewer's left). By the tradition's wording this is Shri Radharani (the small Radhika moved to His right); Braj Ras's captions call this figure Shri Jahnava Thakurani. UNRESOLVED.

**posture:** Standing. Hands partly covered; one hand holds an object near the waist in a close-up [MEASURED qualitatively].

**height:** UNKNOWN. ESTIMATED 0.45–0.7 m. The smaller of the two side figures [MEASURED ratio].

**material:** UNKNOWN. Polished gold-brass metal face and hands [ESTIMATED].

**murtiColour:** UNKNOWN as a licensed measurement. Qualitatively gold-brass with painted features.

**attributes:**
- Crown: in one set a snake-hood/peacock-style crown worn over a red cap [changing]
- Dark bodice under the jewellery in the white-attire set [changing]
- Long black hair [MEASURED]

**arrangement:** At Gopinath's OWN RIGHT (viewer's left). The tradition also says 'Lalita Sakhi and a small deity of Radhika are seated on His right' [SOURCED: Braj Ras article; vrindavanguide.com]. No second small figure is visible in this bay in any photograph [MEASURED].

**altarSetting:** Her own bay of the three-bay wooden simhasan [MEASURED].

**fixedVsChanging:** FIXED: a metal-faced standing female in the viewer's-left bay. CHANGING: all dress and crown.

### Shri Giriraj (Govardhan) Shila at Gopinath's feet

**temple:** Shri Radha Gopinath Mandir, Vrindavan

**name:** Shri Giriraj (Govardhan) Shila at Gopinath's feet

**posture:** A rounded upright stone, not a figure [MEASURED qualitatively: Braj Ras 'Shri Giriraj Ji Darshan at Radha Gopinath Temple'].

**height:** UNKNOWN. Roughly 15–25 cm wide [ESTIMATED against the metal cows beside it].

**material:** A Govardhan shila [SOURCED: caption]. The stone type is UNKNOWN.

**murtiColour:** UNKNOWN as a licensed measurement. Qualitatively a dark grey-black stone.

**attributes:**
- Painted face: large white eyes with black pupils, a white U-tilak with a nose leaf, white brow bars, white dots [MEASURED qualitatively]
- Small gold nose or mouth ornament and a gold ear stud [MEASURED qualitatively]
- Flowers around it [changing]

**arrangement:** Directly below and in front of Gopinath's feet [MEASURED].

**altarSetting:** On a cushion at the front of the central bay, between the two metal cows [MEASURED qualitatively].

**fixedVsChanging:** The stone is fixed. The painted features are applied in worship [ESTIMATED; permanence UNKNOWN]. Flowers change.

### Shri Muralidhar Mahaprabhu, in the small old temple room

**temple:** Shri Radha Gopinath Mandir, Vrindavan

**name:** Shri Muralidhar Mahaprabhu, in the small old temple room

**posture:** Gaura (Chaitanya Mahaprabhu) holding a flute [SOURCED: IDT; holydham; Gaudiya Treasures]. Stance UNKNOWN.

**height:** UNKNOWN.

**material:** UNKNOWN.

**murtiColour:** UNKNOWN as a measurement. The sources describe Him as 'golden like Radharani' [SOURCED: IDT].

**attributes:**
- Flute — shown so that the public know He is also Krishna, 'Radha and Krishna in one form' [SOURCED: IDT]

**arrangement:** A single deity in the side room [SOURCED]. It is not on the main altar.

**altarSetting:** 'In the hall leading to Radha-Gopinath's current altar there is a doorway on the right leading down a step into a small temple room' [SOURCED: IDT]. This room is where the original deities lived before the Mughal period [SOURCED: holydham, Gaudiya Treasures — tradition]. Installed 'after the Mughal invasion' [SOURCED: IDT].

**fixedVsChanging:** UNKNOWN. No photograph was found.

### Pair captioned by Braj Ras as 'Old deities at Shri Radha Gopinath Temple' (identity and location UNKNOWN)

**temple:** Shri Radha Gopinath Mandir, Vrindavan

**name:** Pair captioned by Braj Ras as 'Old deities at Shri Radha Gopinath Temple' (identity and location UNKNOWN)

**posture:** A black Krishna standing and playing the flute, with a metal-faced female beside Him [MEASURED qualitatively: Braj Ras, all rights reserved].

**height:** UNKNOWN. They appear smaller than the main-altar figures [ESTIMATED].

**material:** UNKNOWN. Black figure plus a brass-faced female [ESTIMATED].

**murtiColour:** UNKNOWN as a licensed measurement. The Krishna's face carries gold or yellow painted designs.

**attributes:**
- Flute, turban, garlands [MEASURED qualitatively]

**arrangement:** The female stands at the Krishna's own left (viewer's right) [MEASURED qualitatively]. Do not model until identified.

**altarSetting:** Against a dark stained wall — possibly the small old room, but that room's deity is described as the golden Muralidhar Mahaprabhu, so this may be another shrine [UNKNOWN].

**fixedVsChanging:** UNKNOWN.

### Shri Madan Mohan — the replica (pratibhu) worshipped in Vrindavan. A replica was established in 1748 [SOURCED

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan (Sanatana Goswami's temple, Dwadashaditya Tila)

**name:** Shri Madan Mohan — the replica (pratibhu) worshipped in Vrindavan. A replica was established in 1748 [SOURCED: Wikipedia; Braj Ras]. The ORIGINAL went to Jaipur (Sawai Jai Singh's haveli) and was moved to Karauli in 1728 by Raja Gopal Singh, 'where it has remained ever since' [SOURCED: Entwistle; Growse p.252].

**posture:** Standing and playing the flute, which runs level to His own right (viewer's left) [MEASURED qualitatively: Vrindavan Today 2021 photograph captioned 'Thakur Shri Madan Mohan ji worshipped at new temple in Vrindavan' (all rights reserved); outline visible in File:Radha Madan Mohan Temple.jpg, 2026]. Legs and feet UNKNOWN (covered).

**height:** UNKNOWN in text. ESTIMATED 0.75–1.2 m of visible height (central ~0.95 m), scaled from ~38 px marigolds in the 2026 photograph, assumed 4–6.5 cm; ±35%.

**material:** UNKNOWN for the Vrindavan replica. Reads as black stone [ESTIMATED]. The original was obtained by Sanatana 'from the wife of a Chaube who had been worshipping it as Bhairava'; he 'washed off the vermilion ... revealing it to be an image of Krishna' [SOURCED: Entwistle]. Its material is not stated either.

**murtiColour:** UNKNOWN as a licensed measurement: the only licensed photograph (2026) is overexposed and processed on this face. Qualitatively black (Vrindavan Today 2021, all rights reserved). NOT the light 'SKIN' tone the project uses.

**attributes:**
- Flute [MEASURED]
- Two arms [MEASURED]
- Large white-and-black eyes, white tilak [MEASURED qualitatively]
- Peacock-feather crown; in 2021 a flared red-orange Braj-style skirt with pearl strands [changing]
- Tradition that the ORIGINAL 'exactly resembles Krishna from the waist down' [SOURCED: Wikipedia; Gaudiya Treasures — of the original; NOT a specification]

**arrangement:** At the centre of the central bay, with a female murti on either side [MEASURED 2026; SOURCED: Wikipedia, mathura.nic.in, 'on either side']. No source states which side Radha stands on in VRINDAVAN. For the originals at Karauli: 'Radha (right), Krishna (at center), Lalita Gopi (left)' [SOURCED: Wikipedia caption, viewer's frame] — Radha at His own left. It is an ESTIMATE that the replica follows this.

**altarSetting:** As photographed on 19 Apr 2026: a shrine with THREE arched bays (the central one wider) behind a carved wooden door frame. Turned brown wooden colonnettes, red cloth backdrops, a sequinned dark valance, a hanging lamp in the central bay and a painted ceiling. A wall clock hangs in front of the central bay (transient). A signboard over the door reads 'विशेष कृपा पात्र महन्त श्री दीनबन्धुदास बाबा जी महाराज' [MEASURED]. The ruined sandstone sanctum is 'seldom, if ever, used for religious service' [SOURCED: Growse 1883].

**fixedVsChanging:** FIXED: a black flute-playing Krishna at the centre of the central bay. CHANGING: all dress, crown and garlands. Aartis: Bhog 12:00, Sandhya 19:30, Shayan 20:30; Mangal 04:30 in Kartik only; the temple opens ~07:00, varying by season [SOURCED: Vrindavan Today, Oct 2021]. 'No Photography' sign on the wooden door; 'the Deities are kept at a distance from visitors, in the traditional style' [SOURCED].

### Female murti at Madan Mohan's OWN RIGHT in the central bay (viewer's left). ESTIMATED to be Lalita Sakhi.

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Female murti at Madan Mohan's OWN RIGHT in the central bay (viewer's left). ESTIMATED to be Lalita Sakhi.

**posture:** Standing, veiled [MEASURED qualitatively 2026].

**height:** ESTIMATED 0.7–1.1 m. Her face is about level with Madan Mohan's [MEASURED relative].

**material:** UNKNOWN. Pale painted or metal face [ESTIMATED].

**murtiColour:** #E5DCBB, pale cream [MEASURED: File:Radha Madan Mohan Temple.jpg, CC BY-SA 3.0 — heavily processed image, low confidence].

**attributes:**
- Tall white/silver crown, white veil, garlands [changing]

**arrangement:** At Madan Mohan's own right. For the originals, 'the temple authorities deemed the bigger one to be Lalita ... while the smaller one is Radhika'. The two were sent from Puri by Purushottama Jana, son of King Prataparudra [SOURCED: Satyaraja Dasa, BTG 2024]; Entwistle: 'the Raja of Puri sent two female figures' [SOURCED]. Identification here is an ESTIMATE.

**altarSetting:** The central bay with Madan Mohan [MEASURED].

**fixedVsChanging:** The dress changes. Position assumed fixed.

### Female murti at Madan Mohan's OWN LEFT in the central bay (viewer's right). ESTIMATED to be Shri Radharani.

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Female murti at Madan Mohan's OWN LEFT in the central bay (viewer's right). ESTIMATED to be Shri Radharani.

**posture:** Standing [MEASURED qualitatively]. Largely hidden behind the clock and garlands in the 2026 photograph.

**height:** UNKNOWN. ESTIMATED similar to or slightly smaller than the other female. For the originals, Radha is the smaller of the pair [SOURCED: BTG].

**material:** UNKNOWN.

**murtiColour:** UNKNOWN (face not visible in the licensed photograph).

**attributes:**
- White crown visible [MEASURED — changing]

**arrangement:** At Madan Mohan's own left: the Karauli original's layout, followed as an ESTIMATE.

**altarSetting:** The central bay [MEASURED].

**fixedVsChanging:** The dress changes.

### Tall figure in the LEFT side bay (viewer's left) — identity UNKNOWN (possibly Gaura or Nitai; not sourced)

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Tall figure in the LEFT side bay (viewer's left) — identity UNKNOWN (possibly Gaura or Nitai; not sourced)

**posture:** Standing on a pink lotus-shaped base, hands held in front at the chest [MEASURED qualitatively 2026].

**height:** ESTIMATED 1.2–1.9 m including the tall crown (central ~1.45 m). Face ~1.4× the central Krishna's [MEASURED relative; absolute ±35%].

**material:** UNKNOWN. Realistically painted face with yellow skin and long black hair [MEASURED qualitatively].

**murtiColour:** #DBCF6B, yellow painted skin [MEASURED: CC BY-SA 3.0 2026 photograph, processed].

**attributes:**
- Tall silver crown, purple/lilac dress, marigold garlands [changing]

**arrangement:** Flanks the central bay on the viewer's left [MEASURED]. Do NOT label or model it as a named deity until the temple confirms who it is.

**altarSetting:** Its own arched side bay with a red backdrop [MEASURED].

**fixedVsChanging:** The dress changes. Figure and base are fixed.

### Tall figure in the RIGHT side bay (viewer's right) — identity UNKNOWN

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Tall figure in the RIGHT side bay (viewer's right) — identity UNKNOWN

**posture:** Standing on a pink lotus base, one hand raised above the shoulder [MEASURED qualitatively 2026].

**height:** ESTIMATED 1.2–1.9 m, the same scale as the left-bay figure.

**material:** UNKNOWN. Painted yellow skin [MEASURED qualitatively].

**murtiColour:** #9F7E3E [MEASURED, same photograph, darker light]. The gap from the left figure's #DBCF6B shows how much the lighting dominates.

**attributes:**
- Tall silver crown, purple dress, garlands [changing]
- Raised hand [MEASURED]

**arrangement:** Flanks the central bay on the viewer's right [MEASURED]. Identity UNKNOWN.

**altarSetting:** Its own arched side bay [MEASURED].

**fixedVsChanging:** The dress changes.

### Small figures on the lower step (identities UNKNOWN)

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Small figures on the lower step (identities UNKNOWN)

**posture:** A black face with large round white eyes and a red mouth (Jagannath-type), a light-blue-faced crowned figure with round eyes, and small figures at the lower left [MEASURED qualitatively 2026].

**height:** ~0.15–0.4 m [ESTIMATED].

**material:** UNKNOWN.

**murtiColour:** The black round-eyed face reads #2D2822 [MEASURED, CC BY-SA 3.0, processed]. Others UNKNOWN.

**attributes:**
- Garlands and cloths [changing]

**arrangement:** Below the central trio [MEASURED]. Do not name them.

**altarSetting:** On the lower step in front of the central bay, draped in orange [MEASURED].

**fixedVsChanging:** UNKNOWN.

### Murti of Srila Sanatana Goswami in his samadhi shrine

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Murti of Srila Sanatana Goswami in his samadhi shrine

**posture:** Seated, shaved head, wrapped in a patterned shawl. In one photograph the right hand is raised in blessing [MEASURED qualitatively: Braj Ras; Gaudiya Treasures — both all rights reserved].

**height:** UNKNOWN. Roughly life-size, seated [ESTIMATED].

**material:** UNKNOWN. White-painted figure [MEASURED qualitatively].

**murtiColour:** UNKNOWN as a licensed measurement. Qualitatively a white/cream face with a yellow gopi-chandan tilak.

**attributes:**
- Marigold garland [changing]
- Beside it: the samadhi marker, a white rounded form draped in printed cloth, garlanded and hung with a silver chain [MEASURED qualitatively]

**arrangement:** A single seated figure to the viewer's right of the draped samadhi marker [MEASURED qualitatively].

**altarSetting:** A small room with a white-and-black marble step, cusped blind niches and a timber door. Small framed pictures and a clay pot stand in front [MEASURED qualitatively]. The samadhi lies in a courtyard behind the new temple [SOURCED: Entwistle]. Sanatana's bhajan kutir survives in the ashram [SOURCED: Vrindavan Today; Gaudiya Treasures].

**fixedVsChanging:** Cloths and garlands change.

### Large Govardhan shila in the ashram (form UNKNOWN)

**temple:** Shri Radha Madan Mohan Mandir, Vrindavan

**name:** Large Govardhan shila in the ashram (form UNKNOWN)

**posture:** UNKNOWN.

**height:** 'large' [SOURCED: Vrindavan Today 2021]. Size otherwise UNKNOWN.

**material:** A Govardhan shila [SOURCED].

**murtiColour:** UNKNOWN.

**attributes:**
- Among several tulasi plants [SOURCED]

**arrangement:** Not on the Madan Mohan altar [SOURCED].

**altarSetting:** In the ashram near Sanatana Goswami's bhajan kutir [SOURCED: Vrindavan Today].

**fixedVsChanging:** UNKNOWN.

## Uncertain

- RADHA DAMODAR — WHICH MURTI IS THE ORIGINAL, AND WHERE. (a) The ORIGINAL IS IN JAIPUR, with a pratibhu in Vrindavan: Entwistle 1987, citing VDA and A. K. Roy — taken to Kaman, moved to Jaipur 1760, brought back to Vrindavan 1796, 'returned in 1821' [SOURCED]; also Bharatkosh (per the project's research), rvcdarshan ('The original Deities were all moved to Jaipur'), theharekrishnamovement.org, vrindavanforest.com ('prati-bhu-murti'), and the Jaipur temple's own account via holydham/radha.name ('The smaller set ... is Jiva Goswami's original'). (b) The ORIGINALS RETURNED in 1739 and the pratibhu is in Jaipur: Wikipedia, IDT (arguing that Jaipur's is smaller), Vrindavan Today, Gaudiya Treasures, Hindi Wikipedia. The photographs show the Vrindavan centre figure at ~0.6–1.0 m, which is hard to reconcile with 'the eight-inch original is on the Vrindavan altar' — unless the original is some smaller figure I could not identify. Leave this unresolved.
- Radha Damodar: I could not match three of the four listed sets to the visible Krishnas — Vrindavanchandra, Madhava and Chhailchikan (Bhugarbha's); Bharatkosh also lists a Radha-Vinod. The far-left and right-hand identifications rest on one tourism site whose frame is not stated. Chhailchikan is not identifiable in either photograph.
- Radha Damodar: the small raised-arm pair is ESTIMATED to be Gaura-Nitai, and one small dark object may be Jagannath. Wikipedia lists both, but nothing labels these objects.
- GOPINATH SIDES: the tradition's wording, the Hindi 'वाम पार्श्व', the legend's 'taller' figure, the measured sizes and the Jaipur layout all point to Ananga Manjari at Gopinath's own left (viewer's right). Braj Ras's own captions (2019–2020), internally consistent across two same-day photographs, put Radharani there instead. Braj Ras's article text agrees with the tradition, so its text and its captions conflict. Only asking the temple's goswamis will settle it.
- Gopinath: Lalita and Vishakha 'flank them on both sides' [SOURCED: IDT, Gaudiya Treasures], a 'Deity of Lord Caitanya' is on the altar [SOURCED: radhagopinathmandir blog], and 'Lalita Sakhi and a small deity of Radhika are seated on His right' [SOURCED: Braj Ras]. None is visible in any Vrindavan photograph. One small crowned figure stands to the right of the simhasan on top of a framed portrait, unidentified.
- Gopinath pratibhu installation date: no source found. The project's '1748' appears to be borrowed from Madan Mohan's replica date.
- Gopinath: Braj Ras's 'Old deities' pair (a black flute-playing Krishna and a brass-faced female) — who they are and which room they stand in is UNKNOWN.
- MADAN MOHAN — WHICH BUILDING. Growse 1883: worship happens in 'an elegant and substantial edifice erected on the other side of the street'. Entwistle 1987: 'Beneath the mound on the south side is a new temple of Madanmohan ... now the centre of activity'. Vrindavan Today 2021 reaches 'the Deities' after climbing the stairs and circling past Sanatana's bhajan kutir. Wikipedia: Nanda Kumar Basu 'rebuilt the temple at the top of the hill'. The on-site location of today's altar is unresolved, and so is whether the Commons 2026 altar is that one.
- Madan Mohan: the identity of the two tall side-bay figures (possibly Gaura-Nitai, not sourced) and of the lower-step figures (a Jagannath-type black face, a blue-faced figure) is UNKNOWN. So is which of the two central-bay females is Radha in Vrindavan.
- Heights: every height in this brief is ESTIMATED from marigold heads, assumed 4–6.5 cm, measured in single photographs (±35%). No source gives the height of any Vrindavan murti at these three temples. The only sourced size is the Radha Damodar original's 'eight inches'.
- Materials: no source gives the material of ANY murti a Vrindavan visitor sees at these temples. The 'black stone' and 'gold-brass metal' readings are visual only. vrindavanforest.com's 'black marble' for the present Damodar is a single devotional source.
- Whether the very large white eyes and the tilak are fixed inlays, paint or daily ornaments is UNKNOWN. They appear in every photograph, 2019–2026.
- The Govardhan shila's length ('one-and-a-half cubits') comes from one devotional web source.
- Braj Ras's Radha Madan Mohan album mixes in the Athkhamba Madan Mohan temple of Raghunath Bhatta Goswami. Its two deity photographs — a black Krishna with flute beside Radha on a Holi-stained white throne, and a yellow-dressed four-figure altar — may belong to either temple, so they were not used.
- Radha Damodar portal niche image, and the doll-like crowned female on the floor at the right-hand column (2023): both unidentified.

## Freely licensed references (measurement and proportion only; never traced or used as textures)

- File:Deities of Radha Damodar.jpg — Aliva Sahoo, 19 Apr 2026, CC BY-SA 3.0, 4096×2748. https://commons.wikimedia.org/wiki/File:Deities_of_Radha_Damodar.jpg. The whole Radha Damodar altar at close range: all seven principal figures, the small raised-arm pair, the serpent-canopy object and the Govardhan shila. This is the source of every Radha Damodar hex and face ratio in this brief. It appears AI-enhanced: measure proportions freely; treat colour as ±15%.
- File:Radha Damodar temple in Vrindavan.jpg — Kridha20, 15 Jun 2023, CC BY-SA 4.0, 2936×2168. https://commons.wikimedia.org/wiki/File:Radha_Damodar_temple_in_Vrindavan.jpg. The whole altar frame (fluted columns, chandelier, valance, banner), the same seven-figure row with everyone in yellow, and the shila on its own yellow-draped table in front.
- File:Sri Sri Radha Damodar.jpg — Aliva Sahoo, 19 Apr 2026, CC BY-SA 3.0, 2000×1428. Described as the deities of Radha Damodar, Vrindavan. NOT inspected in this pass (tool image limit): check it before relying on it.
- File:Radha Madan Mohan Temple.jpg — Aliva Sahoo, 19 Apr 2026, CC BY-SA 3.0, 4096×3360. https://commons.wikimedia.org/wiki/File:Radha_Madan_Mohan_Temple.jpg. A three-bay altar under a signboard naming Mahant Dinabandhu Das Baba: the central trio, two tall side-bay figures and lower-step figures. The file description is generic, copied across the uploader's set, so treat this as ESTIMATED to be the principal Madan Mohan shrine. The central face is overexposed.
- File:Madanmohan-ji.jpg — Seoduniya / Karauli administration, 13 Jun 2017, CC BY-SA 4.0, 526×722. The ORIGINAL Madan Mohan at KARAULI, flanked by two gold-clad female figures. Context only — not what a Vrindavan visitor sees.
- File:Shri Radha Gopinath Ji Temple Jaipur.jpg — Anildiggiwal, 8 May 2025, CC0, 1080×796. The JAIPUR Gopinath altar (the originals, per Entwistle): a smaller female on the viewer's left, a taller female on the viewer's right, and two veiled sakhis at the ends. Context only, and evidence for the size-side pattern.
- File:Statue of Jiva Goswami in his tomb in Vrindavan.png — Cinosaur, 25 Jan 2011, CC BY-SA 3.0, 283×395 (small).
- File:Srila Prabhupada Room at Radha Damodar Mandir in Vrindavan.jpg — Aman Kumar (Amankashyap108), 17 Nov 2019, CC BY-SA 4.0, 1940×2232.
- File:Prabhupada at Radha Damodar Mandir.jpg — Aliva Sahoo, 21 Apr 2026, CC BY-SA 3.0, 3072×4096.
- Leads, not inspected: File:Shri Chaitanya Mahaprabhu.jpg, File:Radhe Krishna (23137).jpg, File:Radhe Krishna (78936).jpg and File:Sri Krishna (54880).jpg — Aliva Sahoo, 20–21 Apr 2026, CC BY-SA 3.0. The temple is not stated; they may be Vrindavan altars from the same trip.
- RADHA GOPINATH, VRINDAVAN: NO freely licensed photograph of this altar exists on Commons. The category does not exist, and name searches on 30 Sep 2026 return only Jaipur, Bengal and Odisha temples. Close photographs exist only from Braj Ras (© Braj Ras, All Rights Reserved; album https://www.brajrasik.org/media/radha-gopinath-temple-vrindavan) and The Gaudiya Treasures of Bengal (watermarked, no licence). They were inspected here for facts only, which is why every Gopinath colour is UNKNOWN as a licensed measurement.

## Sources

- F. S. Growse, 'Mathurá: A District Memoir', 2nd ed. (Allahabad 1883), pp. 250–254 and 257 — Madan Mohan (the original now at Karauli; worship in the new temple across the street; the seven-offering schedule stated right after the Karauli Gosain), Gopinath (new temple c.1821 by Nand Kumar Ghos), and Radha Damodar (samadhis only). Full text: https://archive.org/details/b29352095 (djvu text read directly).
- A. W. Entwistle, 'Braj: Centre of Krishna Pilgrimage' (Groningen 1987). The Gaudiya deities to Kaman; Govind Dev to Amber by 1714; Radhadamodar to Jaipur 1760; note 471: A. K. Roy, brought back to Vrindaban 1796, 'returned in 1821'. Madanmohan to Jaipur under Subalanand, then Karauli 1728; 'the Raja of Puri sent two female figures'; the Chaube's wife worshipping it as Bhairava. §30 Gopinath: 'Apart from Radha, the main deity was also accompanied by an image of Jahnavi. Goswami Bhavanand ... took all three images to Kaman ... later ... Jaipur'. Jahnavi 'as in Vrindaban, is enshrined next to the deity of the Gopinath temple'. §13 Radhadamodar: Govardhan stone displayed on Janmashtami. Full text: https://archive.org/stream/entwistles-braj-center-of-krsna-pilgramage/
- Wikipedia: 'Radha Damodar Temple, Vrindavan'; 'Radha Madan Mohan Temple, Vrindavan' (replica 1748; the Karauli caption 'Radha (right), Krishna (at center), Lalita Gopi (left)'); 'Madan Mohan Temple, Karauli'. Hindi Wikipedia 'राधा दामोदर मंदिर'.
- ISKCON Desire Tree: https://iskcondesiretree.com/page/sri-sri-radha-damodar-temple ; https://iskcondesiretree.com/page/sri-sri-radha-gopinath (Ananga Manjari to His left; the Muralidhar Mahaprabhu side room) ; https://iskcondesiretree.com/page/sri-sri-radha-madan-mohan-temple ; https://iskcondesiretree.com/groups/vrindavan/forum/radha-madanamohana-temple
- The Gaudiya Treasures of Bengal: Radha Damodar (2023-04-27); Radha Gopinath (2023-04-18); Radha Madan Mohan (2023-04-12) — https://thegaudiyatreasuresofbengal.com/
- Vrindavan Today: 'Damodar: Lord of the holy month of Kartik' (https://vrindavantoday.in/damodar-lord-of-the-holy-month-of-kartik/) and 'Madan Mohan Temple: A beacon calling to the world', 16 Oct 2021 (https://vrindavantoday.in/madan-mohan-temple-a-beacon-calling-to-the-world/) — aarti times, the No Photography sign, the photo captioned 'worshipped at new temple'.
- Vrindaban Forest, 'Sri Sri Radha Damodar temple' — https://www.vrindavanforest.com/sri-sri-radha-damodar-temple/ (eight inches; 'five foot tall black marble ... prati-bhu-murti'; shila 'one-and-a-half cubits ... banyan leaf'; kept behind a curtain).
- Braj Ras: the Radha Gopinath article, 2017 (https://www.brajrasik.org/articles/5884f98058f4ac271a08b947/radha-gopinath-temple-vrindavan — 'Place her on My left and Radhika on My right'; aarti times); the Radha Gopinath photo album (captions, all rights reserved); the Radha Damodar and Radha Madan Mohan articles and albums.
- Satyaraja Dasa, 'Madana Mohana: Mesmerizer of Mesmerizers', Back to Godhead, 2024 — https://btg.krishna.com/madana-mohana-mesmerizer-of-mesmerizers/ (two female deities sent from Puri; 'the bigger one to be Lalita').
- holydham.com: 'Sri Sri Radha Damodara Temple' (Vrindavan); 'Radha Damodara Temple' (Jaipur: 'The smaller deity is Jiva Goswami's original'); 'Sri Sri Radha Gopinatha Temple' (Muralidhar Mahaprabhu). radha.name galleries for Radha Damodara, Jaipur and Vrindavan.
- rvcdarshan.blogspot.com, 'Sri Sri Radha Damodar Mandir' (2011); radhagopinathmandir.blogspot.com (World Vaishnava Association; Lalita, Visakha and a Deity of Lord Caitanya).
- mathuravrindavantourism.co.in/radha-damodar-temple-vrindavan (Vrindavanchandra 'on his right', Radha-Madhava and Chhailchikan 'on the left', 'heavy silver work in the background'). mathura.nic.in/madan-mohan-mandir/ . vrindavanguide.com/radhaGopinathMandir . theharekrishnamovement.org, 'The Seven Goswami Temples of Vrindavan' (2025).
- ETV Bharat Hindi on the Jaipur Radha Damodar temple (2024, 2025, 2026: brought from Vrindavan about 300 years ago; 'bal swaroop'). Jan Prahari, on the Gopinath vigraha: Jahnava's larger Radha 'वामभाग में प्रतिष्ठा'.
- Wikimedia Commons files listed under licensedReferences, with metadata pulled through the Commons API on 30 Sep 2026.
- Project files checked, not repeated: /Users/sushilbajpai/Desktop/Projects/livebraj/client/src/content/altars.js ; /Users/sushilbajpai/Desktop/Projects/livebraj/docs/research/temple-architecture.json ; docs/research/radha-damodar.md ; radha-gopinath.md ; madan-mohan.md
- Measurement crops (local only, not for publication): /private/tmp/claude-501/-Users-sushilbajpai-Desktop-Projects-livebraj/7fcafe1c-f37a-48dc-90d1-37908875b73c/scratchpad/view/ (rd_*, rd23_*, gop_*, mm_*, bg_*); sampling script scratchpad/sample.py
