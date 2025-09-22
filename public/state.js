// Global app state + undo/redo + persistence (with POIs & Zones & Placemark Defaults)
(function () {
  const DEFAULTS = {
    speed_mps: 5.0,
    shot_latency_s: 0.5,
    pm_defaults: {
      alt_rel_m: 30,
      yaw_abs_deg: 0,
      gimbal_pitch_deg: -45,
      gimbal_yaw_abs_deg: 0,
      speed_out_mps: null, // null = use plan default speed
      actions: []          // default actions for NEW placemarks
    }
  };

  const VALIDATION = {
    MAX_WAYPOINTS: 2000,
    MIN_SEGMENT_LEN_M: 0.2,
    SPEED_MIN_MPS: 0.5,
    SPEED_MAX_MPS: 12.0,
    GIMBAL_PITCH_MIN: -90,
    GIMBAL_PITCH_MAX: 0,
    WAIT_S_MAX: 300
  };

  let plan = newPlanObject();
  let selection = { kind: null, index: -1, segIndex: -1 };
  const subs = new Set();

  const undoStack = [], redoStack = [];

  function newPlanObject() {
    return {
      name: "My Flight",
      notes: "",
      defaults: deepClone(DEFAULTS),
      battery_hint: { usable_min: 0, reserve_min: 0 },
      placemarks: [],
      pois: [],
      zones: []
    };
  }

  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }

  function pushUndo() {
    undoStack.push(JSON.stringify({ plan, selection }));
    if (undoStack.length > 200) undoStack.shift();
    redoStack.length = 0;
  }

  function notify() {
    subs.forEach(cb => cb(getPlan()));
    localStorage.setItem("fpe_plan_autosave", JSON.stringify(plan));
  }

  function getPlan() { return plan; }
  function setPlan(p) {
    plan = p;
    // migrations
    plan.defaults = plan.defaults || deepClone(DEFAULTS);
    plan.defaults.pm_defaults = Object.assign(
      deepClone(DEFAULTS.pm_defaults),
      plan.defaults.pm_defaults || {}
    );
    plan.pois = plan.pois || [];
    plan.zones = plan.zones || [];
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }
  function newPlan() { pushUndo(); plan = newPlanObject(); selection = { kind: null, index: -1, segIndex: -1 }; notify(); }

  // ---------- Placemark ops ----------
  function addPlacemark(pt) {
    pushUndo();
    // optional fields start as null ⇒ inherit defaults unless user overrides
    plan.placemarks.push({
      id: crypto.randomUUID(),
      lat: pt.lat, lon: pt.lon,
      alt_rel_m: Number.isFinite(pt.alt) ? pt.alt : plan.defaults.pm_defaults.alt_rel_m, // altitude is required → keep explicit
      aircraft: { yaw_abs_deg: null },
      gimbal:   { pitch_deg: null, yaw_abs_deg: null },
      speed_out_mps: null,
      actions: null // null ⇒ use plan.defaults.pm_defaults.actions
    });
    notify();
  }

  function insertPlacemarkAt(index, pt) {
    pushUndo();
    const d = plan.defaults.pm_defaults;
    plan.placemarks.splice(index, 0, {
      id: crypto.randomUUID(),
      lat: pt.lat, lon: pt.lon,
      alt_rel_m: Number.isFinite(pt.alt) ? pt.alt : d.alt_rel_m,
      aircraft: { yaw_abs_deg: d.yaw_abs_deg },
      gimbal:   { pitch_deg: d.gimbal_pitch_deg, yaw_abs_deg: d.gimbal_yaw_abs_deg },
      speed_out_mps: (d.speed_out_mps === '' || d.speed_out_mps == null) ? null : Number(d.speed_out_mps),
      actions: deepClone(d.actions || [])
    });
    notify();
  }
  function deletePlacemark(i) {
    if (i < 0 || i >= plan.placemarks.length) return;
    pushUndo();
    plan.placemarks.splice(i, 1);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }
  function duplicatePlacemark(i) {
    const p = plan.placemarks[i];
    if (!p) return;
    const next = plan.placemarks[i + 1] ?? plan.placemarks[i - 1] ?? p;
    const dist = Geo.distanceMeters(p.lat, p.lon, next.lat, next.lon);
    const bearing = Geo.initialBearing(p.lat, p.lon, next.lat, next.lon) || 0;
    const step = Math.min(1.0, dist * 0.1);
    const { lat, lon } = Geo.offset(p.lat, p.lon, bearing, step);
    const copy = deepClone(p);
    copy.id = crypto.randomUUID();
    copy.lat = lat; copy.lon = lon; // preserve spacing rule
    pushUndo();
    plan.placemarks.splice(i + 1, 0, copy);
    notify();
  }
  function reorderPlacemark(src, dst) {
    if (src === dst) return;
    const arr = plan.placemarks;
    const [m] = arr.splice(src, 1);
    arr.splice(dst, 0, m);
    notify();
  }
  function updatePlacemark(i, patch) {
    const p = plan.placemarks[i];
    if (!p) return;
    pushUndo();
    Object.assign(p, patch);
    if (patch.aircraft) Object.assign(p.aircraft, patch.aircraft);
    if (patch.gimbal)   Object.assign(p.gimbal,   patch.gimbal);
    notify();
  }

  // ---------- POI ops ----------
  function addPOI(pt) {
    pushUndo();
    plan.pois.push({ id: crypto.randomUUID(), lat: pt.lat, lon: pt.lon, alt_rel_m: pt.alt ?? 0 });
    notify();
  }
  function deletePOI(i) {
    if (i < 0 || i >= plan.pois.length) return;
    pushUndo();
    plan.pois.splice(i, 1);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }
  function updatePOI(i, patch) {
    const p = plan.pois[i]; if (!p) return;
    pushUndo(); Object.assign(p, patch); notify();
  }

  // ---------- Zone ops ----------
  function addZone(vertices, name) {
    if (!vertices || vertices.length < 3) return;
    pushUndo();
    const idx = plan.zones.length + 1;
    plan.zones.push({
      id: crypto.randomUUID(),
      name: name || `Zone ${idx}`,
      vertices: vertices.map(v => ({ lat: v.lat, lon: v.lon }))
    });
    notify();
  }
  function deleteZone(i) {
    if (i < 0 || i >= plan.zones.length) return;
    pushUndo();
    plan.zones.splice(i, 1);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }
  function updateZone(i, patch) {
    const z = plan.zones[i]; if (!z) return;
    pushUndo();
    if (patch.name != null) z.name = patch.name;
    if (patch.vertices) z.vertices = patch.vertices.map(v => ({ lat: v.lat, lon: v.lon }));
    notify();
  }

  // ---------- Totals ----------
  function computeTotals() {
    const a = plan.placemarks;
    let length = 0, duration = 0;
    for (let i = 0; i + 1 < a.length; i++) {
      const p = a[i], q = a[i+1];
      const seg = Geo.distanceMeters(p.lat, p.lon, q.lat, q.lon);
      length += seg;
      const speed = (p.speed_out_mps != null) ? p.speed_out_mps : plan.defaults.speed_mps;
      duration += seg / Math.max(0.01, speed);
      const acts = (p.actions != null) ? p.actions : (plan.defaults.pm_defaults.actions || []);
      for (const act of acts) {
        if (act.type === "Wait") duration += Math.min(VALIDATION.WAIT_S_MAX, Number(act.params?.seconds || 0));
        if (act.type === "TakePhoto") duration += plan.defaults.shot_latency_s;
      }
    }
    return { count: a.length, length_m: length, duration_s: duration };
  }


  // ---------- Selection ----------
  function setPmSelection(idx)  { selection = { kind: 'pm',  index: idx, segIndex: -1 }; notify(); }
  function setPoiSelection(idx) { selection = { kind: 'poi', index: idx, segIndex: -1 }; notify(); }
  function setZoneSelection(idx){ selection = { kind: 'zone',index: idx, segIndex: -1 }; notify(); }
  function setSelection(idx)    { return setPmSelection(idx); }
  function getSelection()       { return selection; }

  // ---------- Persistence ----------
  function onChange(cb) { subs.add(cb); cb(getPlan()); return () => subs.delete(cb); }
  function exportJSON() { return JSON.stringify({ plan, version: 4 }, null, 2); }
  function loadJSON(text) {
    const obj = JSON.parse(text);
    setPlan(obj.plan || obj);
  }

  function undo() { if (!undoStack.length) return;
    redoStack.push(JSON.stringify({ plan, selection }));
    const prev = JSON.parse(undoStack.pop());
    plan = prev.plan; selection = prev.selection; notify();
  }
  function redo() { if (!redoStack.length) return;
    undoStack.push(JSON.stringify({ plan, selection }));
    const next = JSON.parse(redoStack.pop());
    plan = next.plan; selection = next.selection; notify();
  }

  // autosave restore (migrate older versions)
  const saved = localStorage.getItem("fpe_plan_autosave");
  if (saved) { try {
      const parsed = JSON.parse(saved);
      const p = parsed.plan ? parsed.plan : parsed;
      setPlan(p);
    } catch {}
  }

  window.State = {
    DEFAULTS, VALIDATION,
    getPlan, setPlan, newPlan,
    addPlacemark, insertPlacemarkAt,
    deletePlacemark, duplicatePlacemark,
    reorderPlacemark, updatePlacemark,
    addPOI, deletePOI, updatePOI,
    addZone, deleteZone, updateZone,
    computeTotals, onChange,
    exportJSON, loadJSON,
    setSelection, setPmSelection, setPoiSelection, setZoneSelection, getSelection,
    undo, redo
  };
})();
