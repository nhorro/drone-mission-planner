// Simple geodesy helpers (spherical earth)
(function () {
  const R = 6371008.8; // meters

  function toRad(d) { return d * Math.PI / 180; }
  function toDeg(r) { return r * 180 / Math.PI; }

  function distanceMeters(lat1, lon1, lat2, lon2) {
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const dφ = toRad(lat2 - lat1), dλ = toRad(lon2 - lon1);
    const a = Math.sin(dφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(dλ/2)**2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function initialBearing(lat1, lon1, lat2, lon2) {
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const λ1 = toRad(lon1), λ2 = toRad(lon2);
    const y = Math.sin(λ2-λ1) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
    const θ = Math.atan2(y, x);
    return (toDeg(θ) + 360) % 360;
  }

  function offset(lat, lon, bearingDeg, distM) {
    const δ = distM / R;
    const θ = toRad(bearingDeg);
    const φ1 = toRad(lat);
    const λ1 = toRad(lon);
    const φ2 = Math.asin(Math.sin(φ1)*Math.cos(δ) + Math.cos(φ1)*Math.sin(δ)*Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ)*Math.sin(δ)*Math.cos(φ1), Math.cos(δ)-Math.sin(φ1)*Math.sin(φ2));
    return { lat: toDeg(φ2), lon: ((toDeg(λ2)+540)%360)-180 };
  }

  window.Geo = { distanceMeters, initialBearing, offset };
})();
