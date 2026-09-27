/**
 * LiveConditions — what it is actually like in Vrindavan right now.
 *
 * Two independent parts, because they have very different reliability:
 *
 *   1. LOCAL TIME is computed from the device clock plus the IST offset. It needs
 *      no network, never fails, and is the part that matters most: open the app at
 *      six in the evening in India and the lamps are being lit in the game too.
 *
 *   2. WEATHER is fetched from Open-Meteo — free, no API key, no account, and
 *      explicitly fine for this use. It is strictly an enhancement: the result is
 *      cached, the request is never awaited by the boot sequence, and if the
 *      network is absent the world simply runs on clear weather. Offline-first is
 *      not negotiable, so nothing here is allowed to block or throw.
 *
 * The player can turn this off and drive time of day by hand instead.
 */

import { clamp01, lerp } from '../../engine/math/MathUtils.js';

/** Vrindavan is UTC+5:30 and India observes no daylight saving. */
const IST_OFFSET_MIN = 330;
const CACHE_KEY = 'vrindavan-dham.weather.v1';

/**
 * How often we ask Open-Meteo.
 *
 * The free API is a plain count, hard-capped at 10,000 calls/day, 5,000/hour and
 * 600/minute per IP, non-commercial, CC BY 4.0. Nothing is weighted, so the only
 * question is how many times we ask.
 *
 * Asking blindly on a timer is the wasteful way to do it. Open-Meteo publishes
 * `current` on a 15-minute grid and hands us the grid in the response itself:
 * `current.time` is the moment the reading is valid for and `current.interval`
 * is the step in seconds. So we don't guess — after each success we schedule the
 * next call for just after the next step lands. If it has not been published yet
 * (`current.time` has not moved) we retry a minute later until it has.
 *
 * That is roughly 96 scheduled calls a day plus a few retries — around 2% of the
 * free allowance — and the reading on screen is never more than about a minute
 * behind the moment it exists. Polling every minute regardless would be 1,440
 * calls for exactly the same numbers; every second would be 86,400 and the IP is
 * blocked before lunch.
 *
 * RETRY_MS is also the floor: whatever else happens, never call twice inside a
 * minute. The stored reading is shown for up to four hours so an offline boot
 * still has real weather.
 */
const RETRY_MS = 60 * 1000;
const PUBLISH_SKEW_MS = 20 * 1000;   // models land a little after the stamp
const MAX_SLEEP_MS = 15 * 60 * 1000;
const CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/**
 * Open-Meteo does not weight a call by how much you ask for — a call is a call.
 * So asking for three variables and asking for sixteen cost exactly the same,
 * and there is no reason to leave the rest of it on the table. The extra 590
 * bytes buy real visibility in metres, the cloud deck split into three heights,
 * wind with a direction and a gust, and rain separated from showers.
 */
const API = 'https://api.open-meteo.com/v1/forecast'
  + '?latitude=27.5800&longitude=77.6905'
  + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,'
  + 'precipitation,rain,showers,weather_code,cloud_cover,cloud_cover_low,'
  + 'cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,'
  + 'wind_direction_10m,wind_gusts_10m,dew_point_2m,is_day'
  + '&timezone=Asia%2FKolkata';

/**
 * Air quality is a second free endpoint on the same allowance, and for Braj it
 * is not a footnote. The Gangetic plain sits under dust and smoke for much of
 * the year — aerosol optical depth was 0.74 when this was written, with PM2.5
 * at 65 µg/m³. That is the haze every photograph of Vrindavan has in it, and
 * the sky here was rendering as if the air were clean. Hourly data, so it is
 * fetched on its own slower grid: 24 calls a day.
 */
const AIR_API = 'https://air-quality-api.open-meteo.com/v1/air-quality'
  + '?latitude=27.5800&longitude=77.6905'
  + '&current=pm10,pm2_5,dust,aerosol_optical_depth,uv_index'
  + '&timezone=Asia%2FKolkata';

/**
 * Turning metres of visibility into fog.
 *
 * Meteorological visibility is the range at which contrast falls to 2%, so the
 * physically right density for three's FogExp2 is 1.978 / V. Used raw that
 * would erase the fog on a 10 km day and expose the draw distance, because the
 * scene's base density is an art choice for a few hundred metres, not a real
 * atmosphere. So visibility moves the fog *relative* to a clear Braj day rather
 * than setting it outright, clamped so neither a crystal morning nor a 200 m
 * winter fog breaks the look.
 */
const REF_VISIBILITY_M = 10000;
const FOG_MIN = 0.55;
const FOG_MAX = 7;

/** Haze has a colour, and it is not the same colour as fog or rain. */
const HAZE_DUST = 0xc9b191;   // Gangetic dust and smoke, warm dun
const HAZE_FOG  = 0xced3d6;   // winter river fog, cool and pale
const HAZE_RAIN = 0x8d97a0;   // monsoon slate

/** WMO weather codes, collapsed to what the renderer can actually express. */
const WMO = {
  0: ['Clear', 'clear'], 1: ['Mainly clear', 'clear'],
  2: ['Partly cloudy', 'cloudy'], 3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'],
  51: ['Light drizzle', 'rain'], 53: ['Drizzle', 'rain'], 55: ['Heavy drizzle', 'rain'],
  61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
  71: ['Light snow', 'cloudy'], 80: ['Rain showers', 'rain'],
  81: ['Rain showers', 'rain'], 82: ['Violent rain showers', 'rain'],
  95: ['Thunderstorm', 'rain'], 96: ['Thunderstorm', 'rain'], 99: ['Thunderstorm', 'rain'],
};

export class LiveConditions {
  constructor(ctx) {
    this.ctx = ctx;
    this.weather = null;          // { tempC, cloud, wind, humidity, code, label, kind, at }
    this.fetchedAt = 0;
    this._acc = 0;
    this._inflight = null;
    this._nextDueAt = 0;          // when Open-Meteo should have something new
    this._stamp = null;           // current.time of the reading we hold
    this.air = null;              // { pm25, pm10, dust, aod, uv, at }
    this._nextAirAt = 0;          // air quality is hourly, so it has its own grid

    this.local = this.vrindavanTime();
    this._loadCache();
    this.refresh();               // fire and forget
    this._watchVisibility();
  }

  /**
   * Coming back to the app is the one moment a stale reading is obvious, so ask
   * again immediately. While the app is hidden we stop polling altogether —
   * nobody is looking at the sky and the quota is better spent elsewhere.
   */
  _watchVisibility() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    this._onVisible = () => { if (!document.hidden) this.refresh(true); };
    document.addEventListener('visibilitychange', this._onVisible);
  }

  /* ================================================================
   * Local time — always available
   * ================================================================ */

  /** Current wall-clock time in Vrindavan, regardless of the device's zone. */
  vrindavanTime(now = new Date()) {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utcMs + IST_OFFSET_MIN * 60000);
    return {
      date: ist,
      hour: ist.getHours(),
      minute: ist.getMinutes(),
      decimal: ist.getHours() + ist.getMinutes() / 60,
      label: `${String(ist.getHours()).padStart(2, '0')}:${String(ist.getMinutes()).padStart(2, '0')}`,
    };
  }

  /**
   * Map the real hour onto one of the four lighting phases.
   * The boundaries follow Vrindavan's own rhythm rather than a clock: mangala
   * arti is before dawn, the middle of the day is long and bright, and the
   * evening arti sits in that warm hour before the light goes.
   */
  phaseForHour(h, date = null) {
    const sun = this.sunTimes(date);
    // dawn and dusk are civil twilight: the sun below the horizon but the sky
    // still carrying light, which is when mangala arti happens and when the
    // lamps go round in the evening
    if (h < sun.dawn || h >= sun.dusk) return 'night';
    // The warm windows are the hour either side of the sun crossing the
    // horizon, not two hours and ninety minutes of it. At 27.58 N in September
    // the old 90-minute evening began at 16:47, which is broad daylight and the
    // whole complaint: the lamps came on and the world went amber while it was
    // bright dhoop outside.
    if (h < sun.rise + 1.25) return 'morning';
    if (h >= sun.set - 1.0) return 'evening';
    return 'day';
  }

  /**
   * When the sun actually rises and sets over Vrindavan today, in IST hours.
   *
   * The phases used to be fixed clock hours, with evening starting at 16:30.
   * In late September that is broad afternoon daylight here — sunset is nearer
   * 18:30 — so the world went amber and lit its lamps while it was bright dhoop
   * outside. Vrindavan sits at 27.58 N, where sunset swings by about an hour
   * and a half across the year, so no fixed hour can be right in both June and
   * December. This is the standard solar-declination approximation: good to a
   * couple of minutes, which is far finer than the thing it decides.
   */
  sunTimes(date = null) {
    const d = date || new Date();
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);

    const LAT = 27.58 * Math.PI / 180;      // Vrindavan
    const LON = 77.69;
    const TZ = 5.5;                          // IST

    // solar declination, and the equation of time in minutes
    const g = (2 * Math.PI / 365) * (day - 1);
    const decl = 0.006918
      - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
      - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
      - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eot = 229.18 * (0.000075
      + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));

    // solar noon in local clock time
    const noon = 12 - (LON - TZ * 15) / 15 - eot / 60;

    // the hour angle for a given sun elevation, or null if it never gets there
    const ha = (elevDeg) => {
      const z = (90 - elevDeg) * Math.PI / 180;
      const c = (Math.cos(z) - Math.sin(LAT) * Math.sin(decl)) / (Math.cos(LAT) * Math.cos(decl));
      if (c < -1 || c > 1) return null;
      return Math.acos(c) * 180 / Math.PI / 15;
    };

    const hRise = ha(-0.833);               // upper limb, with refraction
    const hCivil = ha(-6);                  // civil twilight
    return {
      noon,
      rise: hRise === null ? 6 : noon - hRise,
      set: hRise === null ? 18 : noon + hRise,
      dawn: hCivil === null ? 5.4 : noon - hCivil,
      dusk: hCivil === null ? 18.6 : noon + hCivil,
    };
  }

  get phase() { return this.phaseForHour(this.vrindavanTime().decimal); }

  /* ================================================================
   * Weather — optional, cached, never blocking
   * ================================================================ */

  /**
   * Air quality, on its own hourly grid. Same allowance, same silent failure:
   * if it never answers, the haze simply falls back to what the cloud deck and
   * the visibility already say.
   */
  async _refreshAir() {
    if (Date.now() < this._nextAirAt) return;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(AIR_API, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) { this._nextAirAt = Date.now() + 15 * 60 * 1000; return; }

      const json = await res.json();
      const a = json && json.current;
      if (!a) { this._nextAirAt = Date.now() + 15 * 60 * 1000; return; }

      this.air = {
        pm25: a.pm2_5, pm10: a.pm10, dust: a.dust,
        aod: a.aerosol_optical_depth, uv: a.uv_index,
        at: Date.now(),
      };
      // interval is 3600 here, not 900
      const stepMs = (a.interval || 3600) * 1000;
      const validAt = Date.parse(`${a.time}:00Z`) - (json.utc_offset_seconds || 0) * 1000;
      const due = Number.isFinite(validAt)
        ? validAt + stepMs + PUBLISH_SKEW_MS : Date.now() + stepMs;
      this._nextAirAt = Math.min(Math.max(due, Date.now() + RETRY_MS),
        Date.now() + 60 * 60 * 1000);
    } catch {
      this._nextAirAt = Date.now() + 15 * 60 * 1000;
    }
  }

  /**
   * Work out when to ask again from the response itself.
   *
   * `current.time` is stamped in the requested timezone with no offset on it, so
   * we read it as UTC and subtract the `utc_offset_seconds` the response also
   * carries. Next reading = that moment + one interval, plus a little slack for
   * publication. If the stamp has not moved since last time, the next step is
   * simply not out yet and we try again in a minute.
   */
  _scheduleFrom(json, c) {
    const now = Date.now();
    const fresh = c.time && c.time !== this._stamp;
    this._stamp = c.time || this._stamp;

    if (!fresh) { this._nextDueAt = now + RETRY_MS; return; }

    const stepMs = (c.interval || 900) * 1000;
    const offsetMs = (json.utc_offset_seconds || 0) * 1000;
    const validAt = Date.parse(`${c.time}:00Z`) - offsetMs;

    if (!Number.isFinite(validAt)) { this._nextDueAt = now + RETRY_MS; return; }

    const due = validAt + stepMs + PUBLISH_SKEW_MS;
    // A device clock that is wrong must not push this into next week, or stall it.
    this._nextDueAt = Math.min(Math.max(due, now + RETRY_MS), now + MAX_SLEEP_MS);
  }

  _loadCache() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const c = JSON.parse(raw);
      if (c && c.at && Date.now() - c.at < CACHE_MAX_AGE_MS) {
        this.weather = c;
        this.fetchedAt = c.at;
      }
    } catch { /* storage unavailable — fine */ }
  }

  _saveCache() {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(this.weather)); }
    catch { /* ignore */ }
  }

  /** Refresh if stale. Always resolves; never throws; never blocks the game. */
  async refresh(force = false) {
    const now = Date.now();
    if (!force && now < this._nextDueAt) return this.weather;
    if (now - this.fetchedAt < RETRY_MS) return this.weather;   // hard floor
    if (typeof fetch !== 'function') return this.weather;
    if (navigator && navigator.onLine === false) return this.weather;
    if (this._inflight) return this._inflight;   // one request at a time
    this._inflight = this._fetchNow();
    try { return await this._inflight; } finally { this._inflight = null; }
  }

  async _fetchNow() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(API, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) return this.weather;

      const json = await res.json();
      const c = json && json.current;
      if (!c) return this.weather;

      // The response tells us when its own next reading is due. Believe it.
      this._scheduleFrom(json, c);
      this._refreshAir();          // hourly, on its own grid, never awaited

      const [label, kind] = WMO[c.weather_code] || ['Clear', 'clear'];
      const next = {
        tempC: Math.round(c.temperature_2m),
        feelsC: Math.round(c.apparent_temperature),
        humidity: Math.round(c.relative_humidity_2m),
        dewC: Math.round(c.dew_point_2m),
        cloud: clamp01((c.cloud_cover || 0) / 100),
        cloudLow: clamp01((c.cloud_cover_low || 0) / 100),
        cloudMid: clamp01((c.cloud_cover_mid || 0) / 100),
        cloudHigh: clamp01((c.cloud_cover_high || 0) / 100),
        visibility: c.visibility,                  // metres, as measured
        wind: c.wind_speed_10m,
        windDir: c.wind_direction_10m,             // degrees the wind comes FROM
        gust: c.wind_gusts_10m,
        precipitation: c.precipitation || 0,
        rain: c.rain || 0,
        showers: c.showers || 0,
        isDay: c.is_day === 1,
        code: c.weather_code,
        label, kind,
        at: Date.now(),
      };
      const before = this.weather;
      const changed = !before || before.code !== c.weather_code
        || before.tempC !== Math.round(c.temperature_2m)
        || Math.abs(before.cloud - clamp01((c.cloud_cover || 0) / 100)) > 0.01;

      this.weather = next;
      this.fetchedAt = next.at;
      this._saveCache();

      // Polling a minute apart mostly re-reads the same 15-minutely figure, so
      // only wake the listeners and the console when something actually moved.
      if (changed) {
        this.ctx.bus.emit('weather:changed', { weather: this.weather });
        console.info(`[live] Vrindavan ${this.weather.tempC}°C, ${label}`);
      }
    } catch {
      // offline, blocked, or slow. The Dham does not depend on it.
    }
    return this.weather;
  }

  /* ================================================================
   * Applying it
   * ================================================================ */

  /**
   * Modifiers the lighting rig folds on top of its phase preset.
   *
   * This used to be three numbers off the cloud percentage. It now works from
   * what the sky is actually doing: measured visibility sets the depth of the
   * haze, the aerosol load sets its colour and how much it eats the sun, and
   * the cloud deck is read at the height it sits at — low cloud kills a sun
   * that high cirrus only softens.
   */
  get modifiers() {
    const w = this.weather;
    if (!w) {
      return {
        sunScale: 1, fogScale: 1, ambientScale: 1, desaturate: 0, wet: 0,
        hazeTint: null, hazeK: 0, wind: 0, windDir: 0, gust: 0,
      };
    }

    const rain = w.kind === 'rain' ? 1 : 0;
    const fog = w.kind === 'fog' ? 1 : 0;

    /**
     * Cloud by deck. A low overcast is what actually puts the sun out; mid
     * cloud does about half of it and high cirrus mostly just takes the edge
     * off. Falls back to the single figure if the split is missing.
     */
    const low = Number.isFinite(w.cloudLow) ? w.cloudLow : w.cloud;
    const mid = Number.isFinite(w.cloudMid) ? w.cloudMid : 0;
    const high = Number.isFinite(w.cloudHigh) ? w.cloudHigh : 0;
    const shade = clamp01(low * 0.85 + mid * 0.45 + high * 0.18);

    /**
     * Aerosol optical depth is literally how much light the air column takes
     * out, so it belongs on the sun directly. Over Braj it runs from about 0.1
     * on a washed post-monsoon day to well past 1.0 in the winter smoke.
     */
    const a = this.air;
    const aod = a && Number.isFinite(a.aod) ? a.aod : 0;
    const dustK = clamp01(aod / 1.2);
    const pm = a && Number.isFinite(a.pm25) ? a.pm25 : 0;

    // Measured visibility, relative to a clear Braj day. See REF_VISIBILITY_M.
    let visK = 1;
    if (Number.isFinite(w.visibility) && w.visibility > 0) {
      visK = Math.min(Math.max((REF_VISIBILITY_M / w.visibility) ** 0.75, FOG_MIN), FOG_MAX);
    }

    /**
     * What colour the air is. Rain wins, then genuine fog, then dust — which is
     * the usual answer here and the one the app was missing entirely.
     */
    let hazeTint = null;
    let hazeK = 0;
    if (rain) { hazeTint = HAZE_RAIN; hazeK = 0.55; }
    else if (fog) { hazeTint = HAZE_FOG; hazeK = 0.75; }
    else if (dustK > 0.12 || pm > 45) {
      hazeTint = HAZE_DUST;
      hazeK = clamp01(Math.max(dustK, clamp01((pm - 35) / 120)) * 0.7);
    }

    return {
      // aerosol dims the sun on top of whatever the cloud deck is doing
      sunScale: lerp(1, 0.34, Math.max(shade * 0.9, rain * 0.85)) * lerp(1, 0.62, dustK),
      fogScale: visK * (1 + rain * 0.7 + fog * 1.4),
      ambientScale: lerp(1, 1.22, shade) * lerp(1, 1.1, dustK),  // haze scatters light about
      desaturate: clamp01(shade * 0.25 + rain * 0.3 + dustK * 0.22),
      wet: rain,
      hazeTint, hazeK,
      wind: w.wind || 0,
      windDir: Number.isFinite(w.windDir) ? w.windDir : 0,
      gust: w.gust || w.wind || 0,
    };
  }

  /** Where the wind is going, as a unit vector in world space. */
  get windVector() {
    const w = this.weather;
    // meteorological direction is where it blows FROM, so add half a turn
    const rad = ((Number.isFinite(w && w.windDir) ? w.windDir : 0) + 180) * Math.PI / 180;
    return { x: Math.sin(rad), z: Math.cos(rad), speed: (w && w.wind) || 0 };
  }

  /** How bad the air is, in the words people actually use. */
  get airLabel() {
    const a = this.air;
    if (!a || !Number.isFinite(a.pm25)) return null;
    const pm = a.pm25;
    if (pm < 12) return 'clean air';
    if (pm < 35) return 'light haze';
    if (pm < 55) return 'hazy';
    if (pm < 110) return 'heavy haze';
    return 'thick smoke';
  }

  /** A single line for the map and the pause screen. */
  get summary() {
    const t = this.vrindavanTime();
    const w = this.weather;
    if (!w) return `${t.label} in Vrindavan`;
    const air = this.airLabel;
    const haze = air && w.kind === 'clear' ? ` · ${air}` : '';
    return `${t.label} in Vrindavan · ${w.tempC}°C · ${w.label}${haze}`;
  }

  update(dt, ctx) {
    this._acc += dt;
    if (this._acc < 5) return;      // 5 s, so the one-minute weather gate lands on time
    this._acc = 0;

    this.local = this.vrindavanTime();

    // follow the real clock unless the player has taken manual control
    if (ctx.state.settings.liveTime !== false && ctx.time) {
      const want = this.phaseForHour(this.local.decimal);
      if (ctx.time.phase !== want) ctx.time.setPhase(want, true);
    }
    if (typeof document === 'undefined' || !document.hidden) this.refresh();
  }
}
