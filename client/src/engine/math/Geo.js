/**
 * Local tangent-plane projection around the world origin.
 * Lets real WGS84 coordinates from OpenStreetMap flow straight into metres,
 * and lets the map screen show a real bearing and a real lat/lon readout.
 */
const R_EARTH = 6378137;

export function makeProjection(originLat, originLon) {
  const mPerLat = (Math.PI / 180) * R_EARTH;
  const mPerLon = (Math.PI / 180) * R_EARTH * Math.cos((originLat * Math.PI) / 180);
  return {
    originLat, originLon, mPerLat, mPerLon,
    /** lat/lon -> [x east, z south] in metres */
    toWorld(lat, lon) { return [(lon - originLon) * mPerLon, -(lat - originLat) * mPerLat]; },
    toGeo(x, z) { return [originLat - z / mPerLat, originLon + x / mPerLon]; },
  };
}

/** Compass bearing in degrees from a world-space direction. 0 = north. */
export function bearingFromVector(dx, dz) {
  const deg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return (deg + 360) % 360;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function compassLabel(bearing) {
  return COMPASS[Math.round(((bearing % 360) / 45)) % 8];
}
