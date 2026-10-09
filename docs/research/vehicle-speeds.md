# How fast the Dham's vehicles really go

*Researched 2026-10-09 for queue item 15, "E-rickshaws doing 94 km/h". The
law (the Central Motor Vehicles Rules and the 2018 national speed-limit
notification), a GPS-logged e-rickshaw driving cycle, a measured auto-rickshaw
study, ITDP on cycle rickshaws, and guide-book journey times between Mathura
and Vrindavan.*

Confidence is labelled as in the other research files: **[SOURCED]** a
document says it, **[MEASURED]** a study logged it, **[DERIVED]** arithmetic
from those, **[ESTIMATE]** defensible but not established.

## What was wrong

A ride from Chhatikara to ISKCON is 5.5 km of real road, and a ride was
promised to take five minutes at most ("it should be maximum of 5mins in
e-rickshaw anywhere"). It kept that promise by driving faster: a pace planned
up to 26 m/s and allowed to 34, so the vehicle-camera trace caught an
e-rickshaw at 94 km/h, and five jaldis asked for 122. Through a town of
pilgrims on foot, in a vehicle the law will not let past 25.

## What the law says

- **E-rickshaw: not more than 25 km/h.** CMVR rule 2(cb): a special-purpose
  battery-operated three-wheeler for last-mile passenger transport, at most
  four passengers and 40 kg of luggage, motor at most 2,000 W, and a
  maximum speed of not more than 25 km/h. Made law by the Central Motor
  Vehicles (Sixteenth Amendment) Rules, 2014, notified that October.
  [SOURCED]
- **Every other class: S.O. 1522(E), 6 April 2018** (MoRTH), maximum speeds
  by road. [SOURCED]
  - three-wheelers (the auto, the tempo): **50 km/h on every road**;
  - M1, a car or a cab: 120 on an expressway, 100 on a four-lane divided
    highway, **70 within municipal limits** and on other roads;
  - motorcycles: 80 on an expressway and a four-lane highway, **60 within
    municipal limits** and on other roads;
  - M2/M3, buses of nine seats or more: 100 / 90 / 60 / 60.
  No violation is taken if the speed is within 5% of these.

## What they actually do

- **E-rickshaws average 17.4-18.3 km/h.** Chandrashekar, Agrawal, Chatterjee
  and Pawar, "Development of E-rickshaw driving cycle (ERDC) based on
  micro-trip segments using random selection and K-means clustering
  techniques", *IATSS Research* 45(4), 2021, pp. 551-560: 100 trips logged by
  GPS at 10 Hz on a road through rural and urban settings, morning and
  evening peaks, November-December 2019. Average speed 18.30 km/h over all
  the data, 17.40 km/h for the representative cycle. Cruising speeds
  15-25 km/h. [MEASURED]
- **Autos spend most of a peak hour between 6 and 28 km/h**, accelerating
  between -1 and +1 m/s² with a few sharp peaks, and take more than twice as
  long in the peak as off it. Choudhary et al., "Variability in Emission Rate
  of Auto-Rickshaw Based on Real World Driving Profile: A Case Study in
  Guwahati City", URSI AP-RASC 2019. [MEASURED]
- **The common auto, a Bajaj RE, tops out at 63 km/h** (the RE 4S at 65), so
  the 50 km/h limit and not the machine is what holds it. [SOURCED]
- **A cycle rickshaw is "three times the walking speed"** — ITDP, "Why Delhi
  needs cycle-rickshaws" (2006): about 13-15 km/h. No Indian logged
  measurement was found. [SOURCED, loosely]
- **Mathura to Vrindavan, 12-13 km: 25-30 minutes by private auto (₹150-200),
  40-55 by shared auto, 20-30 by taxi** in ordinary traffic, 60-90 during
  Janmashtami and Holi. Guide-book figures, consistent across several Mathura
  and Vrindavan travel sites. [SOURCED, loosely] — 12.5 km in 27 minutes is
  28 km/h for an auto on the Mathura road. [DERIVED]

## The table the game uses

`client/src/game/transport/RoadSpeeds.js`, in km/h. Each cell is `cruise -
max`: the driver's own unhurried pace with a passenger aboard, and the same
driver asked to hurry. `top` is the vehicle's ceiling. Road kinds are the OSM
import's (trunk: NH 44 and the primary roads; highway: secondary, the
Chhatikara road; main: tertiary; street: residential; parikrama: the Parikrama
Marg; gali: lanes; path: footways and tracks).

| Vehicle | top | trunk | highway | main | street | parikrama | gali | path | pull-away m/s² |
|---|---|---|---|---|---|---|---|---|---|
| cycle-rickshaw | 16 | 12-16 | 12-16 | 11-15 | 11-13 | 8-11 | 7-9 | 5-7 | 0.7 |
| e-rickshaw | 25 | 22-25 | 20-25 | 18-24 | 16-20 | 10-14 | 8-12 | 6-8 | 1.2 |
| auto | 50 | 40-50 | 32-42 | 25-35 | 19-27 | 12-16 | 10-14 | 6-8 | 1.5 |
| tempo | 50 | 35-45 | 28-38 | 22-30 | 15-22 | 10-14 | 8-12 | 5-7 | 1.0 |
| taxi, car | 70 | 55-70 | 40-55 | 30-40 | 22-30 | 12-18 | 10-15 | 6-8 | 2.0 |
| bike | 70 | 55-70 | 40-55 | 32-42 | 24-32 | 14-20 | 12-18 | 8-10 | 2.5 |

- The **ceilings** are [SOURCED]: the e-rickshaw's design limit and the 2018
  limits. The cycle rickshaw's 16 is [ESTIMATE], just above ITDP's 13-15.
- **Where each road sits under its ceiling** is [ESTIMATE], anchored on the
  measurements above: the e-rickshaw's 16-20 on a street brackets the ERDC
  averages; the auto's 32-42 on the Chhatikara road is the open-road end of
  Guwahati's 6-28 peak band, and the guide books' 28 km/h average on the
  Mathura road; galis and the Parikrama Marg, full of people on foot, are
  walking pace to twice it. Where an estimate had a choice it took the
  slower answer.
- The **pull-away** is [ESTIMATE], a little generous on Guwahati's -1 to +1
  m/s². Every vehicle used to launch at 5 m/s², half a g.
- **Traffic** keeps the town speeds CrowdSystem already gave it — an
  e-rickshaw 15-18 km/h, an auto about 19, a cab about 24 — which sit under
  every ceiling here.

## How a long ride stays bearable: a time-lapse, said out loud

Honest speeds make Chhatikara to ISKCON 17 minutes by e-rickshaw and 28 by
cycle rickshaw. The five-minute promise stands, so a journey longer than four
minutes (`RIDE_BUDGET_S`, a minute inside the promise) is shown as a
**time-lapse**: the whole town runs faster together — walkers, traffic, cows
and the ride — at the smallest of x1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12 that
fits, and the ride bar says so ("5.4 km to go · about 3 min · time-lapse
x5"). The vehicle never goes faster than the table: what is compressed is
time, not speed. Jaldi does both honest things: the driver leans toward the
road's `max`, and the rate rises by the same factor, to x12 at most. If
traffic makes the ride overrun the promise anyway, the rate (never the speed)
rises up to x2 more, a few per cent a second, and eases back. Taking the wheel
yourself always runs at x1: nobody steers a time-lapse.

Measured, Chhatikara to ISKCON, 5.55 km (`tools/checks/timelapse.mjs`,
`rickshaw.mjs`, and a probe at fixed steps):

| Vehicle | journey, town's time | shown at | yours | fastest |
|---|---|---|---|---|
| cycle rickshaw | 28 min | x8 | 3.5 min | 12 km/h |
| e-rickshaw | 17 min | x5 | 3.4 min | 20 km/h |
| auto | 11 min | x3 | 3.7 min | 32 km/h |
| cab | 9 min | x3 | 3.0 min | 40 km/h |

ISKCON to Prem Mandir, 714 m by e-rickshaw, is 3 minutes of the town's time
and is not sped up at all.

## Sources

- [Maximum speed of e-rickshaws to be 25 kmph, licence must — Business
  Standard / PTI, 2014](https://www.business-standard.com/article/pti-stories/maximum-speed-of-e-rickshaws-to-be-25-kmph-licence-must-114091600906_1.html)
- [Understanding Section 2A: E-cart and E-rickshaw in India — Dr. Abhishek
  Gandhi](https://advocategandhi.com/understanding-section-2a-legal-definition-regulation-and-impact-of-e-cart-and-e-rickshaw-in-india/)
- [Speed limit on National Highways — PIB, 2018](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1539335&reg=48&lang=2)
- [Speed limit notified for on-road vehicles in India — SCC Online, 17 April
  2018](https://www.scconline.com/blog/post/2018/04/17/speed-limit-notified-for-on-roads-vehicles-in-india/)
- [Speed limits in India — Wikipedia](https://en.wikipedia.org/wiki/Speed_limits_in_India)
- [Development of E-rickshaw driving cycle (ERDC) — IATSS Research, 2021](https://www.sciencedirect.com/science/article/pii/S0386111221000297),
  and its [SafetyLit abstract](https://www.safetylit.org/citations/index.php?fuseaction=citations.viewdetails&citationIds%5B%5D=citjournalarticle_708375_9)
- [Variability in Emission Rate of Auto-Rickshaw Based on Real World Driving
  Profile: Guwahati — URSI AP-RASC 2019](https://www.ursi.org/proceedings/procAP19/papers2019/URSISummaryPaperArtiChoudhary.pdf)
- [Why Delhi needs cycle-rickshaws — ITDP, 2006](https://itdp.org/2006/10/22/why-delhi-needs-cycle-rickshaws/)
- [Mathura to Vrindavan distance, fare and transport options](https://mathuravrindavantourguides.com/mathura-to-vrindavan-distance)
- [Bajaj RE specifications — CarDekho Trucks](https://trucks.cardekho.com/en/trucks/bajaj/compact-4s/specifications)
  (top speed 63 km/h) and [Bajaj RE 4S — Bajaj Auto](https://www.globalbajaj.com/global/english/brands/intracity/re/re-4s/specifications/) (65)
