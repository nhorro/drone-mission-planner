/* global UI, WPML, Actions, MapView */

/**
 * Handles all sidebar interactions for editing waypoints, POIs, and zones.
 * The controller listens to DOM events, mutates the shared state façade, and
 * re-renders the form controls whenever the plan changes.
 */
export class WaypointsController {
  constructor(store, bus) {
    this.store = store;
    this.bus = bus;
    this.root = null;
    this.els = {};
    this.cleanup = [];
    this.unsubscribe = null;
    this.defActionsWorking = [];
  }

  /**
   * Register a DOM listener and remember the teardown callback for cleanup.
   */
  on(element, event, handler) {
    if (!element) return;
    element.addEventListener(event, handler);
    this.cleanup.push(() => element.removeEventListener(event, handler));
  }

  /**
   * Cache references to DOM elements within the rendered panel. Using helpers
   * keeps the rest of the controller concise.
   */
  cacheElements() {
    const get = (id) => document.getElementById(id);
    const within = (id) => this.root ? this.root.querySelector(`#${id}`) : null;

    this.els = {
      planName: within('planName'),
      planNotes: within('planNotes'),
      defaultSpeed: within('defaultSpeed'),
      shotLatency: within('shotLatency'),
      statCount: within('statCount'),
      statLength: within('statLength'),
      statDuration: within('statDuration'),
      btnUp: within('btnUp'),
      btnDown: within('btnDown'),
      placemarkList: within('placemarkList'),
      pmLat: within('pmLat'),
      pmLon: within('pmLon'),
      pmAlt: within('pmAlt'),
      pmSpeed: within('pmSpeed'),
      pmYaw: within('pmYaw'),
      pmGimbalPitch: within('pmGimbalPitch'),
      pmGimbalYaw: within('pmGimbalYaw'),
      pmSpeedUse: within('pmSpeedUse'),
      pmYawUse: within('pmYawUse'),
      pmGimbalPitchUse: within('pmGimbalPitchUse'),
      pmGimbalYawUse: within('pmGimbalYawUse'),
      pmActionsUse: within('pmActionsUse'),
      actionList: within('actionList'),
      btnDuplicate: within('btnDuplicate'),
      btnDelete: within('btnDelete'),
      btnAddAction: within('btnAddAction'),
      poiList: within('poiList'),
      poiLat: within('poiLat'),
      poiLon: within('poiLon'),
      poiAlt: within('poiAlt'),
      btnPoiDelete: within('btnPoiDelete'),
      zoneList: within('zoneList'),
      zoneName: within('zoneName'),
      btnZoneDelete: within('btnZoneDelete'),
      btnNew: get('btnNew'),
      btnOpen: get('btnOpen'),
      btnSave: get('btnSave'),
      btnExportWPML: get('btnExportWPML'),
      fileOpen: get('fileOpen'),
      btnSaveSettings: get('btnSaveSettings'),
      mapTilerKey: get('mapTilerKey'),
      validationJson: get('validationJson'),
      defaultSpeedModal: get('defaultSpeedModal'),
      shotLatencyModal: get('shotLatencyModal'),
      defAlt: get('defAlt'),
      defSpeedOut: get('defSpeedOut'),
      defYaw: get('defYaw'),
      defGimbalPitch: get('defGimbalPitch'),
      defGimbalYaw: get('defGimbalYaw'),
      defActionList: get('defActionList'),
      btnDefAddAction: get('btnDefAddAction')
    };
  }

  /**
   * Attach event listeners for plan/placemark/POI/zone editing controls.
   */
  bindEvents() {
    const { els } = this;
    this.on(els.btnNew, 'click', () => this.store.newPlan());
    this.on(els.btnSave, 'click', () => {
      const content = this.store.exportJSON();
      UI.download('plan.json', content);
    });
    this.on(els.btnOpen, 'click', () => els.fileOpen?.click());
    this.on(els.btnExportWPML, 'click', () => {
      const xml = WPML.export(this.store.getPlan());
      UI.download('waylines.wpml', xml);
    });
    this.on(els.fileOpen, 'change', (e) => this.handleFileOpen(e));
    this.on(els.planName, 'change', () => this.handlePlanNameChange());
    this.on(els.planNotes, 'change', () => this.handlePlanNotesChange());
    this.on(els.defaultSpeed, 'change', () => this.handleDefaultSpeedChange());
    this.on(els.shotLatency, 'change', () => this.handleShotLatencyChange());
    this.on(els.btnSaveSettings, 'click', () => this.handleSaveSettings());
    this.on(els.btnDefAddAction, 'click', () => this.handleAddDefaultAction());

    this.on(els.btnDuplicate, 'click', () => this.handleDuplicatePlacemark());
    this.on(els.btnDelete, 'click', () => this.handleDeletePlacemark());
    this.on(els.btnUp, 'click', () => this.moveSelectedPlacemark(-1));
    this.on(els.btnDown, 'click', () => this.moveSelectedPlacemark(1));
    this.on(els.btnAddAction, 'click', () => this.handlePlacemarkAddAction());

    this.on(els.pmSpeedUse, 'change', () => this.handleSpeedToggle());
    this.on(els.pmYawUse, 'change', () => this.handleYawToggle());
    this.on(els.pmGimbalPitchUse, 'change', () => this.handleGimbalPitchToggle());
    this.on(els.pmGimbalYawUse, 'change', () => this.handleGimbalYawToggle());
    this.on(els.pmActionsUse, 'change', () => this.handleActionsToggle());

    [els.pmLat, els.pmLon, els.pmAlt, els.pmSpeed,
      els.pmYaw, els.pmGimbalPitch, els.pmGimbalYaw].forEach(inp => {
      this.on(inp, 'change', () => this.handlePlacemarkFieldChange());
    });

    [els.poiLat, els.poiLon, els.poiAlt].forEach(inp => {
      this.on(inp, 'change', () => this.handlePoiChange());
    });
    this.on(els.btnPoiDelete, 'click', () => this.handlePoiDelete());

    this.on(els.zoneName, 'change', () => this.handleZoneNameChange());
    this.on(els.btnZoneDelete, 'click', () => this.handleZoneDelete());
  }

  /**
   * Import a plan from either JSON or WPML when the hidden file input changes.
   */
  async handleFileOpen(event) {
    const input = event.target;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.wpml')) {
        const obj = WPML.import(text);
        this.store.setPlan(obj.plan);
      } else {
        this.store.loadJSON(text);
      }
    } finally {
      input.value = '';
    }
  }

  /** Update the plan name when the text field changes. */
  handlePlanNameChange() {
    const plan = this.store.getPlan();
    plan.name = this.els.planName?.value ?? '';
    this.store.setPlan(plan);
  }

  /** Update the plan notes when the textarea changes. */
  handlePlanNotesChange() {
    const plan = this.store.getPlan();
    plan.notes = this.els.planNotes?.value ?? '';
    this.store.setPlan(plan);
  }

  /** Persist default waypoint speed changes back into the store. */
  handleDefaultSpeedChange() {
    const plan = this.store.getPlan();
    const value = Number(this.els.defaultSpeed?.value || plan.defaults.speed_mps);
    plan.defaults.speed_mps = value;
    this.store.setPlan(plan);
  }

  /** Persist default shot latency changes back into the store. */
  handleShotLatencyChange() {
    const plan = this.store.getPlan();
    const value = Number(this.els.shotLatency?.value || plan.defaults.shot_latency_s);
    plan.defaults.shot_latency_s = value;
    this.store.setPlan(plan);
  }

  /**
   * Add a default action template to the settings modal editor.
   */
  handleAddDefaultAction() {
    this.defActionsWorking = this.defActionsWorking || [];
    this.defActionsWorking.push(Actions.defaultAction('TakePhoto'));
    this.renderDefaultActionsEditor();
  }

  /**
   * Persist global plan defaults and modal preferences back into the store.
   */
  handleSaveSettings() {
    const { els } = this;
    localStorage.setItem('fpe_maptiler_key', (els.mapTilerKey?.value || '').trim());
    try {
      const v = JSON.parse(els.validationJson?.value || '{}');
      Object.assign(this.store.VALIDATION, v);
    } catch (err) {
      alert('Invalid validation JSON');
    }

    const plan = this.store.getPlan();
    plan.defaults.speed_mps = Number(els.defaultSpeedModal?.value || plan.defaults.speed_mps);
    plan.defaults.shot_latency_s = Number(els.shotLatencyModal?.value || plan.defaults.shot_latency_s);
    const d = plan.defaults.pm_defaults;
    d.alt_rel_m = Number(els.defAlt?.value || d.alt_rel_m);
    d.yaw_abs_deg = Number(els.defYaw?.value || d.yaw_abs_deg);
    d.gimbal_pitch_deg = Number(els.defGimbalPitch?.value || d.gimbal_pitch_deg);
    d.gimbal_yaw_abs_deg = Number(els.defGimbalYaw?.value || d.gimbal_yaw_abs_deg);
    d.speed_out_mps = els.defSpeedOut?.value === '' ? null : Number(els.defSpeedOut?.value);
    d.actions = JSON.parse(JSON.stringify(this.defActionsWorking || []));

    this.store.setPlan(plan);
  }

  /** Duplicate the currently selected placemark. */
  handleDuplicatePlacemark() {
    const sel = this.store.getSelection();
    if (sel.kind === 'pm' && sel.index >= 0) {
      this.store.duplicatePlacemark(sel.index);
    }
  }

  /** Remove the currently selected placemark. */
  handleDeletePlacemark() {
    const sel = this.store.getSelection();
    if (sel.kind === 'pm' && sel.index >= 0) {
      this.store.deletePlacemark(sel.index);
    }
  }

  /**
   * Move the active placemark up or down in the list.
   * @param {number} delta positive/negative offset within the array
   */
  moveSelectedPlacemark(delta) {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm') return;
    const index = sel.index;
    if (index < 0) return;
    const plan = this.store.getPlan();
    const dst = index + delta;
    if (dst < 0 || dst >= plan.placemarks.length) return;
    this.store.reorderPlacemark(index, dst);
    this.store.setPmSelection(dst);
  }

  /** Add a template action to the currently selected placemark. */
  handlePlacemarkAddAction() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const plan = this.store.getPlan();
    const pm = plan.placemarks[sel.index];
    pm.actions = pm.actions || [];
    pm.actions.push(Actions.defaultAction('TakePhoto'));
    this.store.updatePlacemark(sel.index, { actions: pm.actions });
  }

  /** Toggle whether the placemark overrides the plan's default speed. */
  handleSpeedToggle() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const plan = this.store.getPlan();
    const pm = plan.placemarks[sel.index];
    if (this.els.pmSpeedUse?.checked) {
      if (pm.speed_out_mps == null) {
        pm.speed_out_mps = plan.defaults.speed_mps;
      }
    } else {
      pm.speed_out_mps = null;
    }
    this.store.updatePlacemark(sel.index, { speed_out_mps: pm.speed_out_mps });
  }

  /** Toggle whether the placemark overrides the aircraft yaw. */
  handleYawToggle() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const defaults = this.store.getPlan().defaults.pm_defaults;
    const aircraft = {
      yaw_abs_deg: this.els.pmYawUse?.checked ? (Number(this.els.pmYaw?.value) || defaults.yaw_abs_deg) : null
    };
    this.store.updatePlacemark(sel.index, { aircraft });
  }

  /** Toggle whether the placemark overrides the gimbal pitch. */
  handleGimbalPitchToggle() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const defaults = this.store.getPlan().defaults.pm_defaults;
    const gimbal = {
      pitch_deg: this.els.pmGimbalPitchUse?.checked ? (Number(this.els.pmGimbalPitch?.value) || defaults.gimbal_pitch_deg) : null
    };
    this.store.updatePlacemark(sel.index, { gimbal });
  }

  /** Toggle whether the placemark overrides the gimbal yaw. */
  handleGimbalYawToggle() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const defaults = this.store.getPlan().defaults.pm_defaults;
    const gimbal = {
      yaw_abs_deg: this.els.pmGimbalYawUse?.checked ? (Number(this.els.pmGimbalYaw?.value) || defaults.gimbal_yaw_abs_deg) : null
    };
    this.store.updatePlacemark(sel.index, { gimbal });
  }

  /** Toggle whether the placemark uses custom actions or plan defaults. */
  handleActionsToggle() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const actions = this.els.pmActionsUse?.checked ? [] : null;
    this.store.updatePlacemark(sel.index, { actions });
  }

  /** Persist field edits for the currently selected placemark. */
  handlePlacemarkFieldChange() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const patch = {
      lat: Number(this.els.pmLat?.value),
      lon: Number(this.els.pmLon?.value),
      alt_rel_m: Number(this.els.pmAlt?.value),
      aircraft: { yaw_abs_deg: Number(this.els.pmYaw?.value) },
      gimbal: {
        pitch_deg: Number(this.els.pmGimbalPitch?.value),
        yaw_abs_deg: Number(this.els.pmGimbalYaw?.value)
      },
      speed_out_mps: this.els.pmSpeed?.value === '' ? null : Number(this.els.pmSpeed?.value)
    };
    this.store.updatePlacemark(sel.index, patch);
  }

  /** Persist edits to the active POI. */
  handlePoiChange() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'poi' || sel.index < 0) return;
    this.store.updatePOI(sel.index, {
      lat: Number(this.els.poiLat?.value),
      lon: Number(this.els.poiLon?.value),
      alt_rel_m: Number(this.els.poiAlt?.value)
    });
  }

  /** Delete the selected POI. */
  handlePoiDelete() {
    const sel = this.store.getSelection();
    if (sel.kind === 'poi' && sel.index >= 0) {
      this.store.deletePOI(sel.index);
    }
  }

  /** Persist the zone name when edited in the form. */
  handleZoneNameChange() {
    const sel = this.store.getSelection();
    if (sel.kind !== 'zone' || sel.index < 0) return;
    this.store.updateZone(sel.index, { name: this.els.zoneName?.value });
  }

  /** Delete the selected zone. */
  handleZoneDelete() {
    const sel = this.store.getSelection();
    if (sel.kind === 'zone' && sel.index >= 0) {
      this.store.deleteZone(sel.index);
    }
  }

  /**
   * Render all subsections of the panel when the plan or selection changes.
   */
  render(plan) {
    if (!this.root) return;
    const totals = this.store.computeTotals();
    this.renderPlan(plan, totals);
    this.renderPlacemarks(plan);
    this.renderPOIs(plan);
    this.renderZones(plan);
  }

  /** Render plan-level metadata and defaults. */
  renderPlan(plan, totals) {
    const { els } = this;
    if (!els.planName) return;
    els.statCount.textContent = String(totals.count);
    els.statLength.textContent = `${totals.length_m.toFixed(1)} m`;
    els.statDuration.textContent = UI.secToMinSec(totals.duration_s);
    els.planName.value = plan.name;
    els.planNotes.value = plan.notes;
    els.defaultSpeed.value = plan.defaults.speed_mps;
    els.shotLatency.value = plan.defaults.shot_latency_s;

    els.mapTilerKey && (els.mapTilerKey.value = localStorage.getItem('fpe_maptiler_key') || '');
    els.validationJson && (els.validationJson.value = JSON.stringify(this.store.VALIDATION, null, 2));
    if (els.defaultSpeedModal) els.defaultSpeedModal.value = plan.defaults.speed_mps;
    if (els.shotLatencyModal) els.shotLatencyModal.value = plan.defaults.shot_latency_s;

    const d = plan.defaults.pm_defaults;
    if (els.defAlt) els.defAlt.value = d.alt_rel_m;
    if (els.defYaw) els.defYaw.value = d.yaw_abs_deg;
    if (els.defGimbalPitch) els.defGimbalPitch.value = d.gimbal_pitch_deg;
    if (els.defGimbalYaw) els.defGimbalYaw.value = d.gimbal_yaw_abs_deg;
    if (els.defSpeedOut) els.defSpeedOut.value = d.speed_out_mps ?? '';

    this.defActionsWorking = JSON.parse(JSON.stringify(d.actions || []));
    this.renderDefaultActionsEditor();
  }

  /** Render the reusable actions editor used both in plan defaults and PMs. */
  renderDefaultActionsEditor() {
    const { els } = this;
    if (!els.defActionList) return;
    const fake = { actions: this.defActionsWorking };
    Actions.renderList(els.defActionList, fake, () => {
      this.defActionsWorking = fake.actions;
    });
  }

  /** Re-render the placemark list and detail inspector. */
  renderPlacemarks(plan) {
    this.renderPlacemarkList(plan);
    this.renderSelectedPlacemark(plan);
  }

  /** Render the clickable list of placemarks in the plan. */
  renderPlacemarkList(plan) {
    const { els } = this;
    if (!els.placemarkList) return;
    const sel = this.store.getSelection();
    els.placemarkList.innerHTML = '';
    plan.placemarks.forEach((p, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      const active = (sel.kind === 'pm' && i === sel.index);
      item.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      item.textContent = `${i + 1}. (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}) alt ${p.alt_rel_m} m`;
      item.addEventListener('click', () => this.store.setPmSelection(i));
      els.placemarkList.appendChild(item);
    });
  }

  /** Populate the placemark editor for the current selection. */
  renderSelectedPlacemark(plan) {
    const { els } = this;
    if (!els.pmLat) return;
    const sel = this.store.getSelection();
    const pm = (sel.kind === 'pm') ? plan.placemarks[sel.index] : null;
    const defaults = plan.defaults.pm_defaults;

    const inputs = [els.pmLat, els.pmLon, els.pmAlt, els.pmSpeed, els.pmYaw, els.pmGimbalPitch, els.pmGimbalYaw];
    const toggles = [els.pmSpeedUse, els.pmYawUse, els.pmGimbalPitchUse, els.pmGimbalYawUse, els.pmActionsUse];

    if (!pm) {
      inputs.forEach(inp => { if (inp) inp.value = ''; });
      toggles.forEach(cb => { if (cb) cb.checked = false; });
      if (els.pmSpeed) els.pmSpeed.disabled = true;
      if (els.pmYaw) els.pmYaw.disabled = true;
      if (els.pmGimbalPitch) els.pmGimbalPitch.disabled = true;
      if (els.pmGimbalYaw) els.pmGimbalYaw.disabled = true;
      if (els.actionList) els.actionList.innerHTML = '';
      return;
    }

    if (els.pmLat) els.pmLat.value = pm.lat;
    if (els.pmLon) els.pmLon.value = pm.lon;
    if (els.pmAlt) els.pmAlt.value = pm.alt_rel_m;

    if (els.pmSpeedUse) {
      els.pmSpeedUse.checked = (pm.speed_out_mps != null);
      if (els.pmSpeed) {
        els.pmSpeed.disabled = !els.pmSpeedUse.checked;
        els.pmSpeed.placeholder = `default: ${plan.defaults.speed_mps}`;
        els.pmSpeed.value = (pm.speed_out_mps != null) ? pm.speed_out_mps : plan.defaults.speed_mps;
      }
    }

    if (els.pmYawUse) {
      els.pmYawUse.checked = (pm.aircraft?.yaw_abs_deg != null);
      if (els.pmYaw) {
        els.pmYaw.disabled = !els.pmYawUse.checked;
        els.pmYaw.placeholder = `default: ${defaults.yaw_abs_deg}`;
        els.pmYaw.value = (pm.aircraft?.yaw_abs_deg != null) ? pm.aircraft.yaw_abs_deg : defaults.yaw_abs_deg;
      }
    }

    if (els.pmGimbalPitchUse) {
      els.pmGimbalPitchUse.checked = (pm.gimbal?.pitch_deg != null);
      if (els.pmGimbalPitch) {
        els.pmGimbalPitch.disabled = !els.pmGimbalPitchUse.checked;
        els.pmGimbalPitch.placeholder = `default: ${defaults.gimbal_pitch_deg}`;
        els.pmGimbalPitch.value = (pm.gimbal?.pitch_deg != null) ? pm.gimbal.pitch_deg : defaults.gimbal_pitch_deg;
      }
    }

    if (els.pmGimbalYawUse) {
      els.pmGimbalYawUse.checked = (pm.gimbal?.yaw_abs_deg != null);
      if (els.pmGimbalYaw) {
        els.pmGimbalYaw.disabled = !els.pmGimbalYawUse.checked;
        els.pmGimbalYaw.placeholder = `default: ${defaults.gimbal_yaw_abs_deg}`;
        els.pmGimbalYaw.value = (pm.gimbal?.yaw_abs_deg != null) ? pm.gimbal.yaw_abs_deg : defaults.gimbal_yaw_abs_deg;
      }
    }

    if (els.pmActionsUse) {
      const actionsOverridden = (pm.actions != null);
      els.pmActionsUse.checked = actionsOverridden;
      const fake = actionsOverridden ? pm : { actions: defaults.actions || [] };
      if (els.actionList) {
        Actions.renderList(els.actionList, fake, () => {
          this.store.updatePlacemark(sel.index, { actions: pm.actions });
        }, !actionsOverridden);
      }
    }

    MapView.focusPlacemark(sel.index);
  }

  /** Re-render the POI list and detail inspector. */
  renderPOIs(plan) {
    this.renderPoiList(plan);
    this.renderSelectedPoi(plan);
  }

  /** Render the list of POIs in the plan. */
  renderPoiList(plan) {
    const { els } = this;
    if (!els.poiList) return;
    const sel = this.store.getSelection();
    els.poiList.innerHTML = '';
    plan.pois.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = (sel.kind === 'poi' && i === sel.index);
      btn.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      btn.textContent = `POI ${i + 1}: (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}) alt ${p.alt_rel_m} m`;
      btn.addEventListener('click', () => this.store.setPoiSelection(i));
      els.poiList.appendChild(btn);
    });
  }

  /** Populate the POI editor for the active selection. */
  renderSelectedPoi(plan) {
    const { els } = this;
    if (!els.poiLat) return;
    const sel = this.store.getSelection();
    const poi = (sel.kind === 'poi') ? plan.pois[sel.index] : null;
    if (!poi) {
      [els.poiLat, els.poiLon, els.poiAlt].forEach(inp => { if (inp) inp.value = ''; });
      return;
    }
    els.poiLat.value = poi.lat;
    els.poiLon.value = poi.lon;
    els.poiAlt.value = poi.alt_rel_m;
    MapView.focusPOI(sel.index);
  }

  /** Re-render the zones list and detail view. */
  renderZones(plan) {
    this.renderZoneList(plan);
    this.renderSelectedZone(plan);
  }

  /** Render the list of exclusion zones for the plan. */
  renderZoneList(plan) {
    const { els } = this;
    if (!els.zoneList) return;
    const sel = this.store.getSelection();
    els.zoneList.innerHTML = '';
    plan.zones.forEach((z, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = (sel.kind === 'zone' && i === sel.index);
      btn.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      btn.textContent = `${z.name || 'Zone ' + (i + 1)} (${z.vertices.length} pts)`;
      btn.addEventListener('click', () => this.store.setZoneSelection(i));
      els.zoneList.appendChild(btn);
    });
  }

  /** Populate the zone editor for the current selection. */
  renderSelectedZone(plan) {
    const { els } = this;
    if (!els.zoneName) return;
    const sel = this.store.getSelection();
    const zone = (sel.kind === 'zone') ? plan.zones[sel.index] : null;
    if (!zone) {
      els.zoneName.value = '';
      return;
    }
    els.zoneName.value = zone.name || `Zone ${sel.index + 1}`;
    MapView.focusZone(sel.index);
  }

  /**
   * Called by the pager when the panel is shown. Sets up listeners and initial
   * render then subscribes to store updates.
   */
  async mount(rootSelector) {
    this.root = document.querySelector(rootSelector);
    if (!this.root) return;
    this.cacheElements();
    this.bindEvents();
    this.render(this.store.getPlan());
    this.unsubscribe = this.store.onChange((plan) => this.render(plan));
  }

  /**
   * Undo DOM bindings and store subscriptions when another feature becomes
   * active.
   */
  async unmount() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.els = {};
    this.root = null;
  }

  /**
   * Called by the pager when the feature is permanently removed. Mirrors
   * `unmount` in case the controller held additional resources in the future.
   */
  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.els = {};
    this.root = null;
  }
}
