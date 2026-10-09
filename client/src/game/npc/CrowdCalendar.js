/**
 * HOW BUSY VRINDAVAN IS — the crowd follows the real calendar.
 *
 * Asked for as "live data like crowd show here from iskcon vrindavan youtube
 * channel". Counting people in a live stream cannot be done (its terms, a
 * server, and it would not work offline); the calendar can, and it is most of
 * what makes the town full or empty: the hour against the darshan timings,
 * the day of the week, the season and the festivals.
 *
 * What the numbers rest on:
 *   - Banke Bihari: 30-40,000 a day on average, about 1.5 lakh at weekends,
 *     up to 5 lakh on Janmashtami; and over the New Year period around 15
 *     lakh in the town (ETV Bharat, Dec 2025, quoting the temple and police).
 *   - Its darshan hours: summer 7:45-12:00 and 17:30-21:30, winter 8:45-13:00
 *     and 16:30-20:30, the change at Holi and Diwali; the quietest mornings
 *     Tuesday to Thursday; the busiest hours late morning and the evening;
 *     October to February the peak season (vrindavanmathuraguide.com).
 *   - Festival dates: 2026 from devaastha.com and bankbazaar.com, 2027 from
 *     samvat.in — New Delhi dates, which Braj keeps. Only dates found in a
 *     source are here.
 *
 * The level is 0-1 of the crowd the game carries, not a head count: a
 * weekday morning is about three-quarters full, a weekend evening and every
 * festival day full, the small hours a tenth — and CrowdSystem never lets the
 * town go below a floor, because there are always sadhus, chai, cows and
 * people going home.
 */

/* The hour curve: [hour, level], by Banke Bihari's two schedules. */
const SUMMER = [
  [0, 0.10], [4.0, 0.10], [5.0, 0.30], [6.5, 0.40], [7.75, 0.55], [10.5, 0.85], [12.0, 0.80],
  [12.5, 0.45], [14.0, 0.35], [16.0, 0.45], [17.5, 0.75], [19.5, 1.0], [21.5, 0.75], [22.5, 0.25], [24, 0.10],
];
const WINTER = [
  [0, 0.10], [5.0, 0.12], [6.0, 0.30], [7.5, 0.40], [8.75, 0.55], [11.5, 0.85], [13.0, 0.80],
  [13.5, 0.45], [15.5, 0.45], [16.5, 0.75], [18.5, 1.0], [20.5, 0.75], [21.5, 0.25], [24, 0.10],
];

/* Sunday to Saturday: Tuesday to Thursday quietest, the weekend busiest. */
const DAY = [1.25, 0.85, 0.75, 0.75, 0.8, 0.9, 1.15];
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* January to December: October-February the pilgrim season, the hot months thin. */
const SEASON = [1.1, 1.1, 1.0, 0.85, 0.85, 0.85, 0.95, 0.95, 0.95, 1.1, 1.1, 1.1];

/*
 * Festivals, as [first day, last day, factor, name, Hindi]. Inclusive, in
 * Braj's own date. Kartik — the Damodar month, Sharad Purnima to Kartik
 * Purnima — is Vrindavan's busiest month of pilgrimage, and the days inside
 * it carry their own peaks on top.
 */
export const FESTIVALS = [
  ['2026-09-04', '2026-09-04', 2.0, 'Janmashtami', 'जन्माष्टमी'],
  ['2026-09-19', '2026-09-19', 1.6, 'Radhashtami', 'राधाष्टमी'],
  ['2026-10-25', '2026-10-25', 1.6, 'Sharad Purnima', 'शरद पूर्णिमा'],
  ['2026-10-26', '2026-11-24', 1.25, 'Kartik, the Damodar month', 'कार्तिक मास'],
  ['2026-11-08', '2026-11-08', 1.4, 'Diwali', 'दीपावली'],
  ['2026-11-09', '2026-11-09', 1.6, 'Govardhan Puja', 'गोवर्धन पूजा'],
  ['2026-11-24', '2026-11-24', 1.5, 'Kartik Purnima', 'कार्तिक पूर्णिमा'],
  ['2026-12-25', '2026-12-31', 1.6, 'the year-end rush', 'साल के अंत की भीड़'],
  ['2027-01-01', '2027-01-01', 2.0, 'New Year\'s Day', 'नव वर्ष'],
  ['2027-03-17', '2027-03-24', 1.8, 'Holi week', 'होली'],
  ['2027-03-23', '2027-03-23', 2.0, 'Holi', 'होली'],
  ['2027-04-15', '2027-04-15', 1.3, 'Ram Navami', 'राम नवमी'],
  ['2027-07-18', '2027-07-18', 1.5, 'Guru Purnima', 'गुरु पूर्णिमा'],
  ['2027-08-04', '2027-08-04', 1.6, 'Hariyali Teej', 'हरियाली तीज'],
  ['2027-08-24', '2027-08-24', 2.0, 'Janmashtami', 'जन्माष्टमी'],
  ['2027-09-08', '2027-09-08', 1.6, 'Radhashtami', 'राधाष्टमी'],
  ['2027-10-29', '2027-10-29', 1.4, 'Diwali', 'दीपावली'],
];

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function curveAt(curve, h) {
  for (let i = 1; i < curve.length; i++) {
    const [h1, v1] = curve[i];
    if (h <= h1) {
      const [h0, v0] = curve[i - 1];
      return v0 + (v1 - v0) * ((h - h0) / (h1 - h0 || 1));
    }
  }
  return curve[curve.length - 1][1];
}

/**
 * The town's busyness at a moment in Braj.
 *
 * @param {Date} ist — a Date whose local fields read Vrindavan's clock, as
 *   LiveConditions.vrindavanTime().date is
 * @returns {{level:number, hourly:number, day:string, festival:object|null, because:string}}
 */
export function busyness(ist) {
  const h = ist.getHours() + ist.getMinutes() / 60;
  const month = ist.getMonth();
  // the winter schedule from Diwali to Holi: November to February
  const winter = month >= 10 || month <= 1;
  const hourly = curveAt(winter ? WINTER : SUMMER, h);
  const dow = ist.getDay();
  const today = ymd(ist);
  // the strongest festival on the day, if several overlap (Diwali inside Kartik)
  let fest = null;
  for (const f of FESTIVALS) {
    if (today >= f[0] && today <= f[1] && (!fest || f[2] > fest[2])) fest = f;
  }
  /*
   * A festival does not only add people, it fills the quiet hours: on
   * Janmashtami the town is packed at one in the afternoon, when the temples
   * would be shut, and at midnight for the birth. So it lifts the curve's
   * lows toward full by its own measure as well as scaling the whole.
   */
  const k = fest ? fest[2] : 1;
  const lifted = 1 - (1 - hourly) / k;
  const level = Math.min(1, lifted * DAY[dow] * SEASON[month] * k);
  let because;
  if (fest) because = fest[3];
  else if (dow === 0 || dow === 6) because = DAY_NAME[dow];
  else because = '';
  return {
    level, hourly, day: DAY_NAME[dow],
    festival: fest ? { name: fest[3], hindi: fest[4], factor: fest[2] } : null,
    because,
  };
}
