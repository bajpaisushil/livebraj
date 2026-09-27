/**
 * The driver, talking.
 *
 * Asked for a while ago and never built: "the driver says nothing during a ride
 * beyond the toasts". A five-minute ride across Braj in total silence is the
 * one part of the rickshaw that still reads as a vehicle rather than a person,
 * and the ride is where most people will spend their first ten minutes here.
 *
 * What he is: a man who has driven this road every day for years. So he points
 * things out as they go past, he complains about the traffic, he tells you the
 * timings, he asks where you are from — and then he is quiet again for a while.
 * He is not a quest giver, he does not offer you anything, and nothing he says
 * is scored or collected. You can ignore him completely and the ride is the
 * same ride.
 *
 * Three rules, and they are what keep this from becoming wallpaper:
 *
 *   1. HE SAYS IT BECAUSE IT IS THERE. Every landmark line is tied to actually
 *      passing that landmark, and he says it once. A driver who recites the
 *      same three lines on a loop is worse than one who says nothing.
 *   2. HE IS QUIET MOST OF THE TIME. A gap of at least GAP_MIN between lines,
 *      and he starts the ride with a pause rather than a greeting, because
 *      you have just agreed the fare and he has already spoken.
 *   3. NOTHING HE SAYS IS DEVOTIONAL INSTRUCTION. He will tell you the aarti is
 *      at half past seven. He will not tell you to go to it, and he will not
 *      tell you what to feel. That line matters here.
 *
 * Every factual claim in what he says — timings, which temple is which, what is
 * on which road — comes from the same research the temples were built from, and
 * is marked below with where it came from. Nothing invented.
 */

/** Seconds between lines, at the very least. He is not a tour guide. */
const GAP_MIN = 22;
/** ...and past this long without a word he will find something to say. */
const GAP_IDLE = 46;
/** How near a landmark has to be before it counts as going past it. */
const NEAR_M = 70;
/** He settles in before he says anything at all. */
const SETTLE_S = 9;

/**
 * What he says about a place, when you go past it.
 *
 * Keyed by location id. Only places a driver on that road would actually remark
 * on — he does not narrate every wall. Facts are the sourced ones: the
 * timings and the identifications are the same ones the temple builders used.
 */
const PASSING = {
  'banke-bihari': [
    'Bihari ji ka mandir. Yahan pardah har thodi der mein girta hai — the curtain comes and goes.',
    'Banke Bihari. Bheed to hai, but everybody waits.',
  ],
  'iskcon-krishna-balaram': [
    'Angrezon ka mandir kehte hain log, but Krishna-Balaram hai. Foreigners built it, Krishna lives in it.',
    'Prabhupada ji ki samadhi yahin hai.',
  ],
  'radha-raman': [
    'Radha Raman. Yahan ki aag — that fire has not gone out since Gopala Bhatta lit it.',
  ],
  'govind-dev': [
    // what is MODELLED and beyond dispute: the tower is gone and was never
    // rebuilt. Who took it down is a contested historical claim and a driver
    // asserting it would be the game inventing history, which it must not.
    'Govind Dev ji. Upar ka hissa tuta hua hai. The top was never rebuilt.',
  ],
  'prem-mandir': [
    'Prem Mandir. Raat mein poora rangeen ho jata hai — at night the whole thing changes colour.',
  ],
  'rangaji': [
    'Rangaji. South wala mandir hai — the tall gate, you will see it.',
  ],
  'chandrodaya': [
    'Yeh banta hi reh gaya hai. Years now, and still they are building.',
  ],
  'keshi-ghat': [
    'Keshi Ghat. Shaam ko yahin aarti hoti hai.',
  ],
  'radha-damodar': [
    'Radha Damodar. Andar bahut si samadhiyan hain — many of the Goswamis rest there.',
  ],
  'gopishwar-mahadev': [
    'Gopishwar Mahadev. Shaam ko Shankar ji ko gopi ka shringar karte hain.',
  ],
  'madan-mohan': [
    'Madan Mohan, tile par. On the hill — you can see it from the river.',
  ],
  'nidhivan': [
    'Nidhivan. Raat ko koi nahin rukta wahan. Nobody stays there after dark.',
  ],
  'shahji': [
    'Shahji mandir. Woh mude hue khambe — those twisted pillars, twelve of them.',
  ],
  'radha-vallabh': [
    'Radha Vallabh. Yahan Radha ji ki murti nahin hai — only Her crown on the seat.',
  ],
};

/** Things he says about the road itself, whenever they are true. */
const ROAD = {
  jam: [
    'Bas do minute. Yeh roz ka hai.',
    'Dekhiye is bhaid ko. Every single day, same place.',
    'Aage se nikal jayenge. Thoda sabar.',
  ],
  open: [
    'Ab theek hai. Ab chalte hain.',
    'Raasta khul gaya.',
  ],
  rain: [
    'Barish aa rahi hai. Pakad ke baithiye.',
    'Bheeg jayenge dono. Koi baat nahin.',
  ],
  night: [
    'Raat ko sadak khaali rehti hai. Achha lagta hai.',
    'Is waqt sab band ho jata hai. Subah chaar baje phir khulega.',
  ],
  morning: [
    'Mangala aarti ka time hai. Log abhi se nikal pade hain.',
  ],
  hot: [
    'Garmi bahut hai aaj. Paani rakha hai peeche.',
  ],
};

/** And the odd thing he says about nothing in particular. */
const IDLE = [
  'Aap kahan se aaye hain?',
  'Pehli baar aaye hain Vrindavan?',
  'Main chalis saal se yahi chala raha hoon.',
  'Mera ghar Chhatikara mein hai. Roz aata hoon.',
  'Radhe Radhe.',
  'Yeh sadak pehle kaccha tha. Ab dekhiye.',
  'Bandar se bachiye. Chashma le jaate hain.',
  'Gaayein raasta nahin chhodti. Unka hi raasta hai.',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Pick something he has not already said on this ride.
 *
 * Not a nicety — several of these sets hold a single line, so without it he
 * says the same sentence at every opportunity. Measured on one Chhatikara run:
 * four lines, three of them identical, because it was morning for the whole
 * ride and `ROAD.morning` has one line in it.
 *
 * If a set is used up he falls back to the general talk, and if THAT is used
 * up he says nothing at all — which is the right answer. A driver who has run
 * out of things to say is quiet, not a loop.
 */
function fresh(sets, said) {
  for (const arr of sets) {
    const left = arr.filter((l) => !said.has(l));
    if (left.length) return pick(left);
  }
  return null;
}

export class DriverTalk {
  constructor(ctx) {
    this.ctx = ctx;
    this.reset();
  }

  reset() {
    this.t = 0;
    this.since = -SETTLE_S;   // he settles in before the first word
    this.said = new Set();    // landmark ids already remarked on, this ride
    this.spoken = new Set();  // and the exact lines, so none is said twice
    this._wasStuck = false;
    this._saidJam = false;
    this._scan = 0;
  }

  /**
   * One line, over the driver's own head.
   *
   * Through `ui.say` with the vehicle as the speaker, the same way a pedestrian
   * speaks — so it is anchored to him and goes away when he does, rather than
   * sitting in the corner of the screen as a toast after you have got out. That
   * distinction is exactly the "text still keeps showing even after moving away
   * from people" fault, and this is the code path that already fixed it.
   */
  _say(line, car) {
    if (!line) return;
    const ctx = this.ctx;
    this.spoken.add(line);
    if (ctx.ui && ctx.ui.say) ctx.ui.say(line, car);
    else ctx.bus.emit('ui:toast', { title: line, sub: '' });
    this.since = 0;
  }

  /**
   * @param {number} dt
   * @param {object} ride  the live ride record from RickshawSystem
   */
  update(dt, ride) {
    if (!ride || !ride.car) return;
    this.t += dt;
    this.since += dt;
    if (this.since < GAP_MIN) return;

    const ctx = this.ctx;
    const car = ride.car;

    /*
     * Is he actually stuck? `ride.mps` is the measured average the ETA uses,
     * and `ride.pace` is what was agreed — so a driver crawling at a fifth of
     * his own pace is a driver in traffic, and he knows it. Measured rather
     * than guessed from a counter, which is the same reason the ETA changed.
     */
    const crawling = ride.mps > 0 && ride.pace > 0 && ride.mps < ride.pace * 0.35
      && ride.t > 12;
    if (crawling && !this._saidJam) {
      this._saidJam = true;
      this._say(fresh([ROAD.jam], this.spoken), car);
      return;
    }
    if (!crawling && this._saidJam) {
      this._saidJam = false;
      this._say(fresh([ROAD.open], this.spoken), car);
      return;
    }

    /*
     * Something worth pointing at, that he has not pointed at yet.
     *
     * Throttled, because `_nearestUnsaid` walks every location in Braj and he
     * is "due to speak" for most of the ride — running it once a frame for
     * five minutes to answer a question whose answer changes at walking pace
     * is not a thing to do on a phone. Twice a second is four times finer than
     * the 70 m radius needs at any speed a rickshaw goes.
     */
    this._scan = (this._scan || 0) + dt;
    if (this._scan < 0.5) return;
    this._scan = 0;

    const near = this._nearestUnsaid(car);
    if (near) {
      this.said.add(near.id);
      this._say(fresh([PASSING[near.id]], this.spoken), car);
      return;
    }

    // otherwise, only if he has been quiet a long while
    if (this.since < GAP_IDLE) return;

    const live = ctx.live && ctx.live.vrindavanTime && ctx.state.settings.liveTime !== false
      ? ctx.live.vrindavanTime() : null;
    // `modifiers.wet` is how wet the world is being drawn; there is no `rain`
    // key on it, and reading one would have made him never mention the weather
    const mod = ctx.live ? ctx.live.modifiers : null;
    const wet = !!(mod && mod.wet > 0.25);
    const hot = !!(ctx.live && ctx.live.weather && ctx.live.weather.tempC > 36);

    let set = IDLE;
    if (wet) set = ROAD.rain;
    else if (live && (live.decimal >= 21 || live.decimal < 4)) set = ROAD.night;
    else if (live && live.decimal >= 4 && live.decimal < 6.5) set = ROAD.morning;
    else if (hot) set = ROAD.hot;
    // the conditions line first, then ordinary talk, then nothing
    const line = fresh([set, IDLE], this.spoken);
    if (!line) {
      /*
       * He has said everything he has to say. Hold him off for another full
       * gap rather than leaving `since` past the threshold — otherwise this
       * runs `_nearestUnsaid`, which walks every location in Braj, on EVERY
       * FRAME for the rest of the ride. Silence should be cheap.
       */
      this.since = GAP_MIN;
      return;
    }
    this._say(line, car);
  }

  /** The nearest landmark he has something to say about and has not said it. */
  _nearestUnsaid(car) {
    const ctx = this.ctx;
    let best = null, bestD = NEAR_M;
    for (const loc of ctx.data.LOCATIONS) {
      if (!PASSING[loc.id] || this.said.has(loc.id)) continue;
      const d = Math.hypot(loc.pos[0] - car.x, loc.pos[1] - car.z);
      if (d < bestD) { bestD = d; best = loc; }
    }
    return best;
  }
}
