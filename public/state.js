// Global app state + undo/redo + persistence (with POIs & Zones & Placemark Defaults)
(function () {
  const VALIDATION = {
    MAX_WAYPOINTS: 2000,
    MIN_SEGMENT_LEN_M: 0.2,
    SPEED_MIN_MPS: 0.5,
    SPEED_MAX_MPS: 12.0,
    GIMBAL_PITCH_MIN: -90,
    GIMBAL_PITCH_MAX: 0,
    WAIT_S_MAX: 300
  };

  let selection = { kind: null, index: -1, segIndex: -1 };
  const subs = new Set();
  const undoStack = [];
  const redoStack = [];

  function pushUndo() {
    undoStack.push(JSON.stringify({ plan: Model.snapshot(), selection }));
    if (undoStack.length > 200) undoStack.shift();
    redoStack.length = 0;
  }

  function notify() {
    const plan = Model.getPlan();
    subs.forEach(cb => cb(plan));
    localStorage.setItem('fpe_plan_autosave', JSON.stringify({ plan }));
  }

  function getPlan() {
    return Model.getPlan();
  }

  function setPlan(next) {
    Model.setPlan(next);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }

  function newPlan() {
    pushUndo();
    Model.resetPlan();
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }

  function addPlacemark(pt) {
    pushUndo();
    Model.addPlacemark(pt);
    notify();
  }

  function insertPlacemarkAt(index, pt) {
    pushUndo();
    Model.insertPlacemarkAt(index, pt);
    notify();
  }

  function deletePlacemark(index) {
    if (index < 0 || index >= getPlan().placemarks.length) return;
    pushUndo();
    Model.deletePlacemark(index);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }

  function duplicatePlacemark(index) {
    if (!getPlan().placemarks[index]) return;
    pushUndo();
    Model.duplicatePlacemark(index);
    notify();
  }

  function reorderPlacemark(src, dst) {
    if (src === dst) return;
    Model.reorderPlacemark(src, dst);
    notify();
  }

  function updatePlacemark(index, patch) {
    if (!getPlan().placemarks[index]) return;
    pushUndo();
    Model.updatePlacemark(index, patch);
    notify();
  }

  function addPOI(pt) {
    pushUndo();
    Model.addPOI(pt);
    notify();
  }

  function deletePOI(index) {
    if (index < 0 || index >= getPlan().pois.length) return;
    pushUndo();
    Model.deletePOI(index);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }

  function updatePOI(index, patch) {
    if (!getPlan().pois[index]) return;
    pushUndo();
    Model.updatePOI(index, patch);
    notify();
  }

  function addZone(vertices, name) {
    if (!vertices || vertices.length < 3) return;
    pushUndo();
    Model.addZone(vertices, name);
    notify();
  }

  function deleteZone(index) {
    if (index < 0 || index >= getPlan().zones.length) return;
    pushUndo();
    Model.deleteZone(index);
    selection = { kind: null, index: -1, segIndex: -1 };
    notify();
  }

  function updateZone(index, patch) {
    if (!getPlan().zones[index]) return;
    pushUndo();
    Model.updateZone(index, patch);
    notify();
  }

  function computeTotals() {
    return Model.computeTotals(getPlan(), VALIDATION);
  }

  function setPmSelection(idx) {
    selection = { kind: 'pm', index: idx, segIndex: -1 };
    notify();
  }
  function setPoiSelection(idx) {
    selection = { kind: 'poi', index: idx, segIndex: -1 };
    notify();
  }
  function setZoneSelection(idx) {
    selection = { kind: 'zone', index: idx, segIndex: -1 };
    notify();
  }
  function setSelection(idx) { return setPmSelection(idx); }
  function getSelection() { return selection; }

  function onChange(cb) {
    subs.add(cb);
    cb(getPlan());
    return () => subs.delete(cb);
  }

  function exportJSON() {
    return JSON.stringify({ plan: getPlan(), version: 4 }, null, 2);
  }

  function loadJSON(text) {
    const obj = JSON.parse(text);
    setPlan(obj.plan || obj);
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify({ plan: Model.snapshot(), selection }));
    const prev = JSON.parse(undoStack.pop());
    Model.loadSnapshot(prev.plan);
    selection = prev.selection;
    notify();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify({ plan: Model.snapshot(), selection }));
    const next = JSON.parse(redoStack.pop());
    Model.loadSnapshot(next.plan);
    selection = next.selection;
    notify();
  }

  const saved = localStorage.getItem('fpe_plan_autosave');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const p = parsed.plan ? parsed.plan : parsed;
      setPlan(p);
    } catch (err) {
      console.warn('Failed to load autosave', err);
    }
  }

  window.State = {
    DEFAULTS: Model.DEFAULTS,
    VALIDATION,
    getPlan,
    setPlan,
    newPlan,
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
    onChange,
    exportJSON,
    loadJSON,
    setSelection,
    setPmSelection,
    setPoiSelection,
    setZoneSelection,
    getSelection,
    undo,
    redo
  };
})();
