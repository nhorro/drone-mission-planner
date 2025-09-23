// Handles plan level inputs, file operations, statistics and defaults modal
(function () {
  const { el, download, secToMinSec } = UI;

  const elements = {
    planName: el('planName'),
    planNotes: el('planNotes'),
    defaultSpeed: el('defaultSpeed'),
    shotLatency: el('shotLatency'),
    statCount: el('statCount'),
    statLength: el('statLength'),
    statDuration: el('statDuration'),
    fileOpen: el('fileOpen'),
    btnNew: el('btnNew'),
    btnOpen: el('btnOpen'),
    btnSave: el('btnSave'),
    btnExportWPML: el('btnExportWPML'),
    btnSaveSettings: el('btnSaveSettings'),
    mapTilerKey: el('mapTilerKey'),
    validationJson: el('validationJson'),
    defaultSpeedModal: el('defaultSpeedModal'),
    shotLatencyModal: el('shotLatencyModal'),
    defAlt: el('defAlt'),
    defSpeedOut: el('defSpeedOut'),
    defYaw: el('defYaw'),
    defGimbalPitch: el('defGimbalPitch'),
    defGimbalYaw: el('defGimbalYaw'),
    defActionList: el('defActionList'),
    btnDefAddAction: el('btnDefAddAction')
  };

  let defActionsWorking = [];

  function init() {
    elements.btnNew.onclick = () => State.newPlan();
    elements.btnSave.onclick = () => download('plan.json', State.exportJSON());
    elements.btnOpen.onclick = () => elements.fileOpen.click();
    elements.btnExportWPML.onclick = () => {
      const xml = WPML.export(State.getPlan());
      download('waylines.wpml', xml);
    };

    elements.fileOpen.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.xml') || file.name.toLowerCase().endsWith('.wpml')) {
        const obj = WPML.import(text);
        State.setPlan(obj.plan);
      } else {
        State.loadJSON(text);
      }
      elements.fileOpen.value = '';
    };

    elements.planName.onchange = () => {
      const plan = State.getPlan();
      plan.name = elements.planName.value;
      State.setPlan(plan);
    };
    elements.planNotes.onchange = () => {
      const plan = State.getPlan();
      plan.notes = elements.planNotes.value;
      State.setPlan(plan);
    };
    elements.defaultSpeed.onchange = () => {
      const plan = State.getPlan();
      plan.defaults.speed_mps = Number(elements.defaultSpeed.value || plan.defaults.speed_mps);
      State.setPlan(plan);
    };
    elements.shotLatency.onchange = () => {
      const plan = State.getPlan();
      plan.defaults.shot_latency_s = Number(elements.shotLatency.value || plan.defaults.shot_latency_s);
      State.setPlan(plan);
    };

    elements.btnSaveSettings.onclick = handleSaveSettings;
    elements.btnDefAddAction.onclick = () => {
      defActionsWorking = defActionsWorking || [];
      defActionsWorking.push(Actions.defaultAction('TakePhoto'));
      renderDefaultActionsEditor();
    };
  }

  function handleSaveSettings() {
    localStorage.setItem('fpe_maptiler_key', (elements.mapTilerKey.value || '').trim());
    try {
      const v = JSON.parse(elements.validationJson.value || '{}');
      Object.assign(State.VALIDATION, v);
    } catch (err) {
      alert('Invalid validation JSON');
    }

    const plan = State.getPlan();
    plan.defaults.speed_mps = Number(elements.defaultSpeedModal.value || plan.defaults.speed_mps);
    plan.defaults.shot_latency_s = Number(elements.shotLatencyModal.value || plan.defaults.shot_latency_s);
    const d = plan.defaults.pm_defaults;
    d.alt_rel_m = Number(elements.defAlt.value || d.alt_rel_m);
    d.yaw_abs_deg = Number(elements.defYaw.value || d.yaw_abs_deg);
    d.gimbal_pitch_deg = Number(elements.defGimbalPitch.value || d.gimbal_pitch_deg);
    d.gimbal_yaw_abs_deg = Number(elements.defGimbalYaw.value || d.gimbal_yaw_abs_deg);
    d.speed_out_mps = elements.defSpeedOut.value === '' ? null : Number(elements.defSpeedOut.value);
    d.actions = JSON.parse(JSON.stringify(defActionsWorking || []));

    State.setPlan(plan);
  }

  function render(plan, totals) {
    elements.statCount.textContent = String(totals.count);
    elements.statLength.textContent = `${totals.length_m.toFixed(1)} m`;
    elements.statDuration.textContent = secToMinSec(totals.duration_s);
    elements.planName.value = plan.name;
    elements.planNotes.value = plan.notes;
    elements.defaultSpeed.value = plan.defaults.speed_mps;
    elements.shotLatency.value = plan.defaults.shot_latency_s;

    elements.mapTilerKey.value = localStorage.getItem('fpe_maptiler_key') || '';
    elements.validationJson.value = JSON.stringify(State.VALIDATION, null, 2);
    elements.defaultSpeedModal.value = plan.defaults.speed_mps;
    elements.shotLatencyModal.value = plan.defaults.shot_latency_s;

    const d = plan.defaults.pm_defaults;
    elements.defAlt.value = d.alt_rel_m;
    elements.defYaw.value = d.yaw_abs_deg;
    elements.defGimbalPitch.value = d.gimbal_pitch_deg;
    elements.defGimbalYaw.value = d.gimbal_yaw_abs_deg;
    elements.defSpeedOut.value = d.speed_out_mps ?? '';

    defActionsWorking = JSON.parse(JSON.stringify(d.actions || []));
    renderDefaultActionsEditor();
  }

  function renderDefaultActionsEditor() {
    const fake = { actions: defActionsWorking };
    Actions.renderList(elements.defActionList, fake, () => {
      defActionsWorking = fake.actions;
    });
  }

  window.PlanPanel = { init, render };
})();
