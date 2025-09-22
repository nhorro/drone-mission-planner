// Wire UI <-> State <-> Map (Modes: Waypoints, POIs, Zones) + Placemark Defaults editor
(function () {
  // ---------- Mode handling ----------
  let mode = 'wp';
  let draftZone = []; // array of {lat,lon}
  const modeBadge = el('modeBadge');
  const modeBtns = { wp: el('modeWp'), poi: el('modePoi'), zone: el('modeZone') };
  const btnZoneFinish = el('btnZoneFinish');
  const btnZoneCancel = el('btnZoneCancel');

  function setMode(m) {
    mode = m;
    Object.entries(modeBtns).forEach(([k, b]) => b.classList.toggle('active', k === m));
    modeBadge.textContent = `Mode: ${m === 'wp' ? 'Waypoints' : m === 'poi' ? 'POIs' : 'Zones'}`;
    const zoneOn = (m === 'zone');
    btnZoneFinish.classList.toggle('d-none', !zoneOn);
    btnZoneCancel.classList.toggle('d-none', !zoneOn);
    if (!zoneOn) clearDraftZone();
  }
  modeBtns.wp.onclick = () => setMode('wp');
  modeBtns.poi.onclick = () => setMode('poi');
  modeBtns.zone.onclick = () => setMode('zone');

  btnZoneFinish.onclick = () => {
    if (draftZone.length >= 3) {
      State.addZone(draftZone);
      clearDraftZone();
      State.setZoneSelection(State.getPlan().zones.length - 1);
    } else {
      alert('A zone needs at least 3 points.');
    }
  };
  btnZoneCancel.onclick = () => clearDraftZone();

  function clearDraftZone() {
    draftZone = [];
    MapView.setZoneDraft(draftZone);
  }

  // ---------- Map callbacks ----------
  window.onMapAddAt = (lat, lon) => {
    if (mode === 'wp') {
      State.addPlacemark({ lat, lon }); // defaults fill the rest
      State.setPmSelection(State.getPlan().placemarks.length - 1);
    } else if (mode === 'poi') {
      State.addPOI({ lat, lon, alt: 0 });
      State.setPoiSelection(State.getPlan().pois.length - 1);
    } else if (mode === 'zone') {
      draftZone.push({ lat, lon });
      MapView.setZoneDraft(draftZone);
    }
  };
  window.onMapClickPlacemark = (idx) => { if (mode === 'wp') State.setPmSelection(idx); };
  window.onMapMovePlacemark  = (idx, lat, lon) => { if (mode === 'wp') State.updatePlacemark(idx, { lat, lon }); };
  window.onMapClickPOI       = (idx) => { if (mode === 'poi') State.setPoiSelection(idx); };
  window.onMapMovePOI        = (idx, lat, lon) => { if (mode === 'poi') State.updatePOI(idx, { lat, lon }); };
  window.onMapClickZone      = (idx) => { State.setZoneSelection(idx); };

  // ---------- Elements ----------
  const planName = el('planName'), planNotes = el('planNotes');
  const statCount = el('statCount'), statLength = el('statLength'), statDuration = el('statDuration');
  const defaultSpeed = el('defaultSpeed'), shotLatency = el('shotLatency');
  const list = el('placemarkList');
  const pmLat = el('pmLat'), pmLon = el('pmLon'), pmAlt = el('pmAlt'), pmSpeed = el('pmSpeed');
  const pmYaw = el('pmYaw'), pmGimbalPitch = el('pmGimbalPitch'), pmGimbalYaw = el('pmGimbalYaw');
  const actionList = el('actionList');
  const fileOpen = el('fileOpen');
  const mapTilerKey = el('mapTilerKey');
  const validationJson = el('validationJson');

  const pmSpeedUse = el('pmSpeedUse');
  const pmYawUse = el('pmYawUse');
  const pmGimbalPitchUse = el('pmGimbalPitchUse');
  const pmGimbalYawUse = el('pmGimbalYawUse');
  const pmActionsUse = el('pmActionsUse');

  // POI elements
  const poiList = el('poiList');
  const poiLat = el('poiLat'), poiLon = el('poiLon'), poiAlt = el('poiAlt');
  const btnPoiDelete = el('btnPoiDelete');

  // Zone elements
  const zoneList = el('zoneList');
  const zoneName = el('zoneName');
  const btnZoneDelete = el('btnZoneDelete');

  // Settings (Placemark Defaults) elements
  const defaultSpeedModal = el('defaultSpeedModal');
  const shotLatencyModal  = el('shotLatencyModal');
  const defAlt = el('defAlt'), defSpeedOut = el('defSpeedOut'), defYaw = el('defYaw');
  const defGimbalPitch = el('defGimbalPitch'), defGimbalYaw = el('defGimbalYaw');
  const defActionList = el('defActionList');
  const btnDefAddAction = el('btnDefAddAction');

  // Working copy for default actions while editing the modal
  let defActionsWorking = [];

  // ---------- Top buttons ----------
  el('btnNew').onclick = () => State.newPlan();
  el('btnSave').onclick = () => download('plan.json', State.exportJSON());
  el('btnOpen').onclick = () => fileOpen.click();
  fileOpen.onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const text = await f.text();
    if (f.name.toLowerCase().endsWith('.xml') || f.name.toLowerCase().endsWith('.wpml')) {
      const obj = WPML.import(text);
      State.setPlan(obj.plan);
    } else {
      State.loadJSON(text);
    }
    fileOpen.value = '';
  };
  el('btnExportWPML').onclick = () => {
    const xml = WPML.export(State.getPlan());
    download('waylines.wpml', xml);
  };

  // Placemark buttons
  el('btnDuplicate').onclick = () => { const s = State.getSelection(); if (s.kind==='pm' && s.index>=0) State.duplicatePlacemark(s.index); };
  el('btnDelete').onclick = () => { const s = State.getSelection(); if (s.kind==='pm' && s.index>=0) State.deletePlacemark(s.index); };

  function onClick(id, handler) {
    const n = document.getElementById(id);
    if (n) n.onclick = handler;
    else console.warn('Missing element:', id);
  }

  onClick('btnUp',   moveSelectedPM(-1));
  onClick('btnDown', moveSelectedPM(+1));

  // Save Settings (plan + pm defaults + validation + tile key)
  el('btnSaveSettings').onclick = () => {
    localStorage.setItem('fpe_maptiler_key', (mapTilerKey.value || '').trim());
    try {
      const v = JSON.parse(validationJson.value || '{}');
      Object.assign(State.VALIDATION, v);
    } catch (e) { alert('Invalid validation JSON'); }

    // Persist defaults back into plan
    const p = State.getPlan();
    p.defaults.speed_mps = Number(defaultSpeedModal.value || p.defaults.speed_mps);
    p.defaults.shot_latency_s = Number(shotLatencyModal.value || p.defaults.shot_latency_s);
    const d = p.defaults.pm_defaults;
    d.alt_rel_m = Number(defAlt.value || d.alt_rel_m);
    d.yaw_abs_deg = Number(defYaw.value || d.yaw_abs_deg);
    d.gimbal_pitch_deg = Number(defGimbalPitch.value || d.gimbal_pitch_deg);
    d.gimbal_yaw_abs_deg = Number(defGimbalYaw.value || d.gimbal_yaw_abs_deg);
    d.speed_out_mps = defSpeedOut.value === '' ? null : Number(defSpeedOut.value);
    d.actions = JSON.parse(JSON.stringify(defActionsWorking || []));

    State.setPlan(p); // triggers re-render + autosave
    // (we keep the page without reload so the modal settings persist immediately)
  };

  // Add default action row
  btnDefAddAction.onclick = () => {
    defActionsWorking = defActionsWorking || [];
    defActionsWorking.push(Actions.defaultAction("TakePhoto"));
    renderDefaultActionsEditor();
  };

  // Actions: add default action to current placemark
  const btnAddAction = el('btnAddAction');
  btnAddAction.onclick = () => {
    const s = State.getSelection(); if (s.kind!=='pm' || s.index < 0) return;
    const plan = State.getPlan();
    const pm = plan.placemarks[s.index];
    pm.actions = pm.actions || [];
    pm.actions.push(Actions.defaultAction("TakePhoto"));
    State.updatePlacemark(s.index, { actions: pm.actions });
  };

  // Bind plan fields (quick header)
  planName.onchange = () => { const p = State.getPlan(); p.name = planName.value; State.setPlan(p); };
  planNotes.onchange = () => { const p = State.getPlan(); p.notes = planNotes.value; State.setPlan(p); };
  defaultSpeed.onchange = () => { const p = State.getPlan(); p.defaults.speed_mps = Number(defaultSpeed.value||5); State.setPlan(p); };
  shotLatency.onchange = () => { const p = State.getPlan(); p.defaults.shot_latency_s = Number(shotLatency.value||0.5); State.setPlan(p); };

  pmSpeedUse.onchange = () => {
    const s = State.getSelection(); if (s.kind!=='pm' || s.index<0) return;
    const p = State.getPlan().placemarks[s.index];
    if (pmSpeedUse.checked) {
      // enable and seed with current effective default if null
      if (p.speed_out_mps == null) p.speed_out_mps = State.getPlan().defaults.speed_mps;
    } else {
      p.speed_out_mps = null;
    }
    State.updatePlacemark(s.index, { speed_out_mps: p.speed_out_mps });
  };

  pmYawUse.onchange = () => {
    const s = State.getSelection(); if (s.kind!=='pm' || s.index<0) return;
    const d = State.getPlan().defaults.pm_defaults;
    const aircraft = { yaw_abs_deg: pmYawUse.checked ? (Number(pmYaw.value)||d.yaw_abs_deg) : null };
    State.updatePlacemark(s.index, { aircraft });
  };

  pmGimbalPitchUse.onchange = () => {
    const s = State.getSelection(); if (s.kind!=='pm' || s.index<0) return;
    const d = State.getPlan().defaults.pm_defaults;
    const gimbal = { pitch_deg: pmGimbalPitchUse.checked ? (Number(pmGimbalPitch.value)||d.gimbal_pitch_deg) : null };
    State.updatePlacemark(s.index, { gimbal });
  };

  pmGimbalYawUse.onchange = () => {
    const s = State.getSelection(); if (s.kind!=='pm' || s.index<0) return;
    const d = State.getPlan().defaults.pm_defaults;
    const gimbal = { yaw_abs_deg: pmGimbalYawUse.checked ? (Number(pmGimbalYaw.value)||d.gimbal_yaw_abs_deg) : null };
    State.updatePlacemark(s.index, { gimbal });
  };

  pmActionsUse.onchange = () => {
    const s = State.getSelection(); if (s.kind!=='pm' || s.index<0) return;
    const actions = pmActionsUse.checked ? [] : null; // start with empty when enabling
    State.updatePlacemark(s.index, { actions });
  };


  // Bind selected placemark fields
  [pmLat, pmLon, pmAlt, pmSpeed, pmYaw, pmGimbalPitch, pmGimbalYaw].forEach(inp => {
    inp.onchange = () => {
      const s = State.getSelection(); if (s.kind!=='pm' || s.index < 0) return;
      const patch = {
        lat: Number(pmLat.value), lon: Number(pmLon.value), alt_rel_m: Number(pmAlt.value),
        aircraft: { yaw_abs_deg: Number(pmYaw.value) },
        gimbal: { pitch_deg: Number(pmGimbalPitch.value), yaw_abs_deg: Number(pmGimbalYaw.value) },
        speed_out_mps: pmSpeed.value === '' ? null : Number(pmSpeed.value)
      };
      State.updatePlacemark(s.index, patch);
    };
  });

  // POI fields
  [poiLat, poiLon, poiAlt].forEach(inp => {
    inp.onchange = () => {
      const s = State.getSelection(); if (s.kind!=='poi' || s.index < 0) return;
      State.updatePOI(s.index, { lat: Number(poiLat.value), lon: Number(poiLon.value), alt_rel_m: Number(poiAlt.value) });
    };
  });
  btnPoiDelete.onclick = () => { const s = State.getSelection(); if (s.kind==='poi' && s.index>=0) State.deletePOI(s.index); };

  // Zone fields
  zoneName.onchange = () => {
    const s = State.getSelection(); if (s.kind!=='zone' || s.index < 0) return;
    State.updateZone(s.index, { name: zoneName.value });
  };
  btnZoneDelete.onclick = () => {
    const s = State.getSelection(); if (s.kind==='zone' && s.index>=0) State.deleteZone(s.index);
  };

  // Subscribe to state and render UI
  State.onChange((plan) => {
    MapView.renderPlan(plan);
    refreshStats(plan);
    refreshPmList(plan);
    refreshPmSelected(plan);
    refreshPoiList(plan);
    refreshPoiSelected(plan);
    refreshZoneList(plan);
    refreshZoneSelected(plan);

    // Populate Settings modal fields from plan
    mapTilerKey.value = localStorage.getItem('fpe_maptiler_key') || '';
    validationJson.value = JSON.stringify(State.VALIDATION, null, 2);
    defaultSpeedModal.value = plan.defaults.speed_mps;
    shotLatencyModal.value  = plan.defaults.shot_latency_s;

    const d = plan.defaults.pm_defaults;
    defAlt.value = d.alt_rel_m;
    defYaw.value = d.yaw_abs_deg;
    defGimbalPitch.value = d.gimbal_pitch_deg;
    defGimbalYaw.value = d.gimbal_yaw_abs_deg;
    defSpeedOut.value = (d.speed_out_mps ?? '');

    // Working copy for default actions
    defActionsWorking = JSON.parse(JSON.stringify(d.actions || []));
    renderDefaultActionsEditor();

    // Also keep quick header inputs in sync
    defaultSpeed.value = plan.defaults.speed_mps;
    shotLatency.value = plan.defaults.shot_latency_s;
  });

  // Init map and default mode
  MapView.init();
  setMode('wp');

  // ---------- Refresh helpers ----------
  function refreshStats(plan) {
    const t = State.computeTotals();
    statCount.textContent = String(t.count);
    statLength.textContent = `${t.length_m.toFixed(1)} m`;
    statDuration.textContent = secToMinSec(t.duration_s);
    planName.value = plan.name;
    planNotes.value = plan.notes;
  }

  function refreshPmList(plan) {
    const s = State.getSelection();
    list.innerHTML = '';
    plan.placemarks.forEach((p, i) => {
      const a = document.createElement('button');
      a.type = 'button';
      const active = (s.kind==='pm' && i===s.index);
      a.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      a.textContent = `${i+1}. (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}) alt ${p.alt_rel_m} m`;
      a.onclick = () => State.setPmSelection(i);
      list.appendChild(a);
    });
  }

  function refreshPmSelected(plan) {
    const s = State.getSelection();
    const p = (s.kind==='pm') ? plan.placemarks[s.index] : null;
    const d = plan.defaults.pm_defaults;

    if (!p) {
      [pmLat, pmLon, pmAlt, pmSpeed, pmYaw, pmGimbalPitch, pmGimbalYaw].forEach(i=> i.value='');
      [pmSpeedUse, pmYawUse, pmGimbalPitchUse, pmGimbalYawUse, pmActionsUse].forEach(i=> i.checked=false);
      actionList.innerHTML = '';
      return;
    }

    // Always explicit fields
    pmLat.value = p.lat;
    pmLon.value = p.lon;
    pmAlt.value = p.alt_rel_m;

    // Speed (nullable)
    pmSpeedUse.checked = (p.speed_out_mps != null);
    pmSpeed.disabled = !pmSpeedUse.checked;
    pmSpeed.placeholder = `default: ${plan.defaults.speed_mps}`;
    pmSpeed.value = (p.speed_out_mps != null) ? p.speed_out_mps : plan.defaults.speed_mps;

    // AC yaw (nullable)
    pmYawUse.checked = (p.aircraft?.yaw_abs_deg != null);
    pmYaw.disabled = !pmYawUse.checked;
    pmYaw.placeholder = `default: ${d.yaw_abs_deg}`;
    pmYaw.value = (p.aircraft?.yaw_abs_deg != null) ? p.aircraft.yaw_abs_deg : d.yaw_abs_deg;

    // Gimbal pitch (nullable)
    pmGimbalPitchUse.checked = (p.gimbal?.pitch_deg != null);
    pmGimbalPitch.disabled = !pmGimbalPitchUse.checked;
    pmGimbalPitch.placeholder = `default: ${d.gimbal_pitch_deg}`;
    pmGimbalPitch.value = (p.gimbal?.pitch_deg != null) ? p.gimbal.pitch_deg : d.gimbal_pitch_deg;

    // Gimbal yaw (nullable)
    pmGimbalYawUse.checked = (p.gimbal?.yaw_abs_deg != null);
    pmGimbalYaw.disabled = !pmGimbalYawUse.checked;
    pmGimbalYaw.placeholder = `default: ${d.gimbal_yaw_abs_deg}`;
    pmGimbalYaw.value = (p.gimbal?.yaw_abs_deg != null) ? p.gimbal.yaw_abs_deg : d.gimbal_yaw_abs_deg;

    // Actions override (nullable list)
    const actionsOverridden = (p.actions != null);
    pmActionsUse.checked = actionsOverridden;

    // Render actions; if not overridden, show defaults but disabled
    const fake = actionsOverridden ? p : { actions: d.actions || [] };
    Actions.renderList(actionList, fake, () => {
      // only called when editable
      State.updatePlacemark(s.index, { actions: p.actions });
    }, !actionsOverridden);

    MapView.focusPlacemark(s.index);
  }


  function refreshPoiList(plan) {
    const s = State.getSelection();
    poiList.innerHTML = '';
    plan.pois.forEach((p, i) => {
      const a = document.createElement('button');
      a.type = 'button';
      const active = (s.kind==='poi' && i===s.index);
      a.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      a.textContent = `POI ${i+1}: (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}) alt ${p.alt_rel_m} m`;
      a.onclick = () => State.setPoiSelection(i);
      poiList.appendChild(a);
    });
  }

  function refreshPoiSelected(plan) {
    const s = State.getSelection();
    const p = (s.kind==='poi') ? plan.pois[s.index] : null;
    if (!p) {
      [poiLat, poiLon, poiAlt].forEach(i=> i.value='');
      return;
    }
    poiLat.value = p.lat;
    poiLon.value = p.lon;
    poiAlt.value = p.alt_rel_m;
    MapView.focusPOI(s.index);
  }

  function refreshZoneList(plan) {
    const s = State.getSelection();
    zoneList.innerHTML = '';
    plan.zones.forEach((z, i) => {
      const a = document.createElement('button');
      a.type = 'button';
      const active = (s.kind==='zone' && i===s.index);
      a.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      a.textContent = `${z.name || 'Zone ' + (i+1)} (${z.vertices.length} pts)`;
      a.onclick = () => State.setZoneSelection(i);
      zoneList.appendChild(a);
    });
  }

  function refreshZoneSelected(plan) {
    const s = State.getSelection();
    const z = (s.kind==='zone') ? plan.zones[s.index] : null;
    if (!z) {
      zoneName.value = '';
      return;
    }
    zoneName.value = z.name || `Zone ${s.index+1}`;
    MapView.focusZone(s.index);
  }

  function renderDefaultActionsEditor() {
    // Reuse Actions UI with a fake placemark that only has actions
    const fake = { actions: defActionsWorking };
    Actions.renderList(defActionList, fake, () => {
      defActionsWorking = fake.actions;
    });
  }

  function moveSelectedPM(delta) {
    return () => {
      const s = State.getSelection();
      if (s.kind!=='pm') return;
      const i = s.index; if (i < 0) return;
      const dst = i + delta;
      if (dst < 0 || dst >= State.getPlan().placemarks.length) return;
      State.reorderPlacemark(i, dst);
      State.setPmSelection(dst);
    };
  }

  // ---------- helpers ----------
  function el(id){ return document.getElementById(id); }
  function secToMinSec(s){ const m = Math.floor(s/60), r = Math.round(s%60); return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }
  function download(name, content) {
    const blob = new Blob([content], {type: 'application/octet-stream'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  }
})();
