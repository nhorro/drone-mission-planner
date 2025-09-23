// Core data model for the mission planner (plan + helpers)
(function () {
  const DEFAULTS = {
    speed_mps: 5.0,
    shot_latency_s: 0.5,
    pm_defaults: {
      alt_rel_m: 30,
      yaw_abs_deg: 0,
      gimbal_pitch_deg: -45,
      gimbal_yaw_abs_deg: 0,
      speed_out_mps: null,
      actions: []
    }
  };

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function createEmptyPlan() {
    return {
      name: 'My Flight',
      notes: '',
      defaults: deepClone(DEFAULTS),
      battery_hint: { usable_min: 0, reserve_min: 0 },
      placemarks: [],
      pois: [],
      zones: []
    };
  }

  let plan = createEmptyPlan();

  function ensurePlanShape(p) {
    const next = Object.assign({}, p);
    next.name = next.name ?? 'My Flight';
    next.notes = next.notes ?? '';
    next.defaults = next.defaults
      ? Object.assign(deepClone(DEFAULTS), next.defaults)
      : deepClone(DEFAULTS);
    next.defaults.pm_defaults = Object.assign(
      deepClone(DEFAULTS.pm_defaults),
      next.defaults.pm_defaults || {}
    );
    next.placemarks = Array.isArray(next.placemarks) ? next.placemarks : [];
    next.pois = Array.isArray(next.pois) ? next.pois : [];
    next.zones = Array.isArray(next.zones) ? next.zones : [];
    next.battery_hint = next.battery_hint || { usable_min: 0, reserve_min: 0 };
    return next;
  }

  function getPlan() {
    return plan;
  }

  function setPlan(next) {
    plan = ensurePlanShape(deepClone(next));
    return plan;
  }

  function resetPlan() {
    plan = createEmptyPlan();
    return plan;
  }

  function snapshot() {
    return deepClone(plan);
  }

  function loadSnapshot(data) {
    plan = ensurePlanShape(deepClone(data));
    return plan;
  }

  function addPlacemark(pt, target = plan) {
    const defaults = target.defaults.pm_defaults;
    target.placemarks.push({
      id: crypto.randomUUID(),
      lat: pt.lat,
      lon: pt.lon,
      alt_rel_m: Number.isFinite(pt.alt) ? pt.alt : defaults.alt_rel_m,
      aircraft: { yaw_abs_deg: null },
      gimbal: { pitch_deg: null, yaw_abs_deg: null },
      speed_out_mps: null,
      actions: null
    });
    return target.placemarks[target.placemarks.length - 1];
  }

  function insertPlacemarkAt(index, pt, target = plan) {
    const d = target.defaults.pm_defaults;
    target.placemarks.splice(index, 0, {
      id: crypto.randomUUID(),
      lat: pt.lat,
      lon: pt.lon,
      alt_rel_m: Number.isFinite(pt.alt) ? pt.alt : d.alt_rel_m,
      aircraft: { yaw_abs_deg: d.yaw_abs_deg },
      gimbal: { pitch_deg: d.gimbal_pitch_deg, yaw_abs_deg: d.gimbal_yaw_abs_deg },
      speed_out_mps: (d.speed_out_mps === '' || d.speed_out_mps == null) ? null : Number(d.speed_out_mps),
      actions: deepClone(d.actions || [])
    });
    return target.placemarks[index];
  }

  function deletePlacemark(index, target = plan) {
    if (index < 0 || index >= target.placemarks.length) return;
    target.placemarks.splice(index, 1);
  }

  function duplicatePlacemark(index, target = plan) {
    const current = target.placemarks[index];
    if (!current) return;
    const next = target.placemarks[index + 1] ?? target.placemarks[index - 1] ?? current;
    const dist = Geo.distanceMeters(current.lat, current.lon, next.lat, next.lon);
    const bearing = Geo.initialBearing(current.lat, current.lon, next.lat, next.lon) || 0;
    const step = Math.min(1.0, dist * 0.1);
    const offset = Geo.offset(current.lat, current.lon, bearing, step);
    const copy = deepClone(current);
    copy.id = crypto.randomUUID();
    copy.lat = offset.lat;
    copy.lon = offset.lon;
    target.placemarks.splice(index + 1, 0, copy);
  }

  function reorderPlacemark(src, dst, target = plan) {
    if (src === dst) return;
    const arr = target.placemarks;
    const [item] = arr.splice(src, 1);
    arr.splice(dst, 0, item);
  }

  function updatePlacemark(index, patch, target = plan) {
    const item = target.placemarks[index];
    if (!item) return;
    Object.assign(item, patch);
    if (patch.aircraft) Object.assign(item.aircraft, patch.aircraft);
    if (patch.gimbal) Object.assign(item.gimbal, patch.gimbal);
  }

  function addPOI(pt, target = plan) {
    target.pois.push({
      id: crypto.randomUUID(),
      lat: pt.lat,
      lon: pt.lon,
      alt_rel_m: pt.alt ?? 0
    });
    return target.pois[target.pois.length - 1];
  }

  function deletePOI(index, target = plan) {
    if (index < 0 || index >= target.pois.length) return;
    target.pois.splice(index, 1);
  }

  function updatePOI(index, patch, target = plan) {
    const poi = target.pois[index];
    if (!poi) return;
    Object.assign(poi, patch);
  }

  function addZone(vertices, name, target = plan) {
    if (!vertices || vertices.length < 3) return;
    const idx = target.zones.length + 1;
    target.zones.push({
      id: crypto.randomUUID(),
      name: name || `Zone ${idx}`,
      vertices: vertices.map(v => ({ lat: v.lat, lon: v.lon }))
    });
    return target.zones[target.zones.length - 1];
  }

  function deleteZone(index, target = plan) {
    if (index < 0 || index >= target.zones.length) return;
    target.zones.splice(index, 1);
  }

  function updateZone(index, patch, target = plan) {
    const zone = target.zones[index];
    if (!zone) return;
    if (patch.name != null) zone.name = patch.name;
    if (patch.vertices) zone.vertices = patch.vertices.map(v => ({ lat: v.lat, lon: v.lon }));
  }

  function computeTotals(target = plan, validation) {
    const totals = { count: 0, length_m: 0, duration_s: 0 };
    if (!target || !Array.isArray(target.placemarks)) return totals;
    totals.count = target.placemarks.length;
    let length = 0;
    let duration = 0;
    const waitMax = validation?.WAIT_S_MAX ?? Number.POSITIVE_INFINITY;
    for (let i = 0; i + 1 < target.placemarks.length; i++) {
      const current = target.placemarks[i];
      const next = target.placemarks[i + 1];
      const seg = Geo.distanceMeters(current.lat, current.lon, next.lat, next.lon);
      length += seg;
      const speed = (current.speed_out_mps != null) ? current.speed_out_mps : target.defaults.speed_mps;
      duration += seg / Math.max(0.01, speed);
      const actions = (current.actions != null) ? current.actions : (target.defaults.pm_defaults.actions || []);
      for (const act of actions) {
        if (act.type === 'Wait') {
          const wait = Number(act.params?.seconds || 0);
          duration += Math.min(waitMax, wait);
        }
        if (act.type === 'TakePhoto') {
          duration += target.defaults.shot_latency_s;
        }
      }
    }
    totals.length_m = length;
    totals.duration_s = duration;
    return totals;
  }

  window.Model = {
    DEFAULTS,
    getPlan,
    setPlan,
    resetPlan,
    snapshot,
    loadSnapshot,
    addPlacemark,
    insertPlacemarkAt,
    deletePlacemark,
    duplicatePlacemark,
    reorderPlacemark,
    updatePlacemark,
    addPOI,
    deletePOI,
    updatePOI,
    addZone,
    deleteZone,
    updateZone,
    computeTotals,
    createEmptyPlan
  };
})();
