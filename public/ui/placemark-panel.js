// Manages placemark list, selection details and actions
(function () {
  const { el } = UI;

  const elements = {
    list: el('placemarkList'),
    pmLat: el('pmLat'),
    pmLon: el('pmLon'),
    pmAlt: el('pmAlt'),
    pmSpeed: el('pmSpeed'),
    pmYaw: el('pmYaw'),
    pmGimbalPitch: el('pmGimbalPitch'),
    pmGimbalYaw: el('pmGimbalYaw'),
    pmSpeedUse: el('pmSpeedUse'),
    pmYawUse: el('pmYawUse'),
    pmGimbalPitchUse: el('pmGimbalPitchUse'),
    pmGimbalYawUse: el('pmGimbalYawUse'),
    pmActionsUse: el('pmActionsUse'),
    actionList: el('actionList'),
    btnDuplicate: el('btnDuplicate'),
    btnDelete: el('btnDelete'),
    btnUp: el('btnUp'),
    btnDown: el('btnDown'),
    btnAddAction: el('btnAddAction')
  };

  function init() {
    elements.btnDuplicate.onclick = () => {
      const sel = State.getSelection();
      if (sel.kind === 'pm' && sel.index >= 0) {
        State.duplicatePlacemark(sel.index);
      }
    };
    elements.btnDelete.onclick = () => {
      const sel = State.getSelection();
      if (sel.kind === 'pm' && sel.index >= 0) {
        State.deletePlacemark(sel.index);
      }
    };
    elements.btnUp.onclick = () => moveSelected(-1);
    elements.btnDown.onclick = () => moveSelected(+1);
    elements.btnAddAction.onclick = handleAddAction;

    elements.pmSpeedUse.onchange = handleSpeedToggle;
    elements.pmYawUse.onchange = handleYawToggle;
    elements.pmGimbalPitchUse.onchange = handleGimbalPitchToggle;
    elements.pmGimbalYawUse.onchange = handleGimbalYawToggle;
    elements.pmActionsUse.onchange = handleActionsToggle;

    [elements.pmLat, elements.pmLon, elements.pmAlt, elements.pmSpeed,
      elements.pmYaw, elements.pmGimbalPitch, elements.pmGimbalYaw].forEach(inp => {
      inp.onchange = handleFieldChange;
    });
  }

  function handleAddAction() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const plan = State.getPlan();
    const pm = plan.placemarks[sel.index];
    pm.actions = pm.actions || [];
    pm.actions.push(Actions.defaultAction('TakePhoto'));
    State.updatePlacemark(sel.index, { actions: pm.actions });
  }

  function handleSpeedToggle() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const plan = State.getPlan();
    const pm = plan.placemarks[sel.index];
    if (elements.pmSpeedUse.checked) {
      if (pm.speed_out_mps == null) {
        pm.speed_out_mps = plan.defaults.speed_mps;
      }
    } else {
      pm.speed_out_mps = null;
    }
    State.updatePlacemark(sel.index, { speed_out_mps: pm.speed_out_mps });
  }

  function handleYawToggle() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const defaults = State.getPlan().defaults.pm_defaults;
    const aircraft = {
      yaw_abs_deg: elements.pmYawUse.checked ? (Number(elements.pmYaw.value) || defaults.yaw_abs_deg) : null
    };
    State.updatePlacemark(sel.index, { aircraft });
  }

  function handleGimbalPitchToggle() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const defaults = State.getPlan().defaults.pm_defaults;
    const gimbal = {
      pitch_deg: elements.pmGimbalPitchUse.checked ? (Number(elements.pmGimbalPitch.value) || defaults.gimbal_pitch_deg) : null
    };
    State.updatePlacemark(sel.index, { gimbal });
  }

  function handleGimbalYawToggle() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const defaults = State.getPlan().defaults.pm_defaults;
    const gimbal = {
      yaw_abs_deg: elements.pmGimbalYawUse.checked ? (Number(elements.pmGimbalYaw.value) || defaults.gimbal_yaw_abs_deg) : null
    };
    State.updatePlacemark(sel.index, { gimbal });
  }

  function handleActionsToggle() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const actions = elements.pmActionsUse.checked ? [] : null;
    State.updatePlacemark(sel.index, { actions });
  }

  function handleFieldChange() {
    const sel = State.getSelection();
    if (sel.kind !== 'pm' || sel.index < 0) return;
    const patch = {
      lat: Number(elements.pmLat.value),
      lon: Number(elements.pmLon.value),
      alt_rel_m: Number(elements.pmAlt.value),
      aircraft: { yaw_abs_deg: Number(elements.pmYaw.value) },
      gimbal: {
        pitch_deg: Number(elements.pmGimbalPitch.value),
        yaw_abs_deg: Number(elements.pmGimbalYaw.value)
      },
      speed_out_mps: elements.pmSpeed.value === '' ? null : Number(elements.pmSpeed.value)
    };
    State.updatePlacemark(sel.index, patch);
  }

  function moveSelected(delta) {
    const sel = State.getSelection();
    if (sel.kind !== 'pm') return;
    const index = sel.index;
    if (index < 0) return;
    const dst = index + delta;
    if (dst < 0 || dst >= State.getPlan().placemarks.length) return;
    State.reorderPlacemark(index, dst);
    State.setPmSelection(dst);
  }

  function render(plan) {
    renderList(plan);
    renderSelected(plan);
  }

  function renderList(plan) {
    const sel = State.getSelection();
    elements.list.innerHTML = '';
    plan.placemarks.forEach((p, i) => {
      const item = document.createElement('button');
      item.type = 'button';
      const active = (sel.kind === 'pm' && i === sel.index);
      item.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      item.textContent = `${i + 1}. (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}) alt ${p.alt_rel_m} m`;
      item.onclick = () => State.setPmSelection(i);
      elements.list.appendChild(item);
    });
  }

  function renderSelected(plan) {
    const sel = State.getSelection();
    const pm = (sel.kind === 'pm') ? plan.placemarks[sel.index] : null;
    const defaults = plan.defaults.pm_defaults;

    if (!pm) {
      [elements.pmLat, elements.pmLon, elements.pmAlt, elements.pmSpeed,
        elements.pmYaw, elements.pmGimbalPitch, elements.pmGimbalYaw].forEach(inp => inp.value = '');
      [elements.pmSpeedUse, elements.pmYawUse, elements.pmGimbalPitchUse,
        elements.pmGimbalYawUse, elements.pmActionsUse].forEach(cb => cb.checked = false);
      elements.pmSpeed.disabled = true;
      elements.pmYaw.disabled = true;
      elements.pmGimbalPitch.disabled = true;
      elements.pmGimbalYaw.disabled = true;
      elements.actionList.innerHTML = '';
      return;
    }

    elements.pmLat.value = pm.lat;
    elements.pmLon.value = pm.lon;
    elements.pmAlt.value = pm.alt_rel_m;

    elements.pmSpeedUse.checked = (pm.speed_out_mps != null);
    elements.pmSpeed.disabled = !elements.pmSpeedUse.checked;
    elements.pmSpeed.placeholder = `default: ${plan.defaults.speed_mps}`;
    elements.pmSpeed.value = (pm.speed_out_mps != null) ? pm.speed_out_mps : plan.defaults.speed_mps;

    elements.pmYawUse.checked = (pm.aircraft?.yaw_abs_deg != null);
    elements.pmYaw.disabled = !elements.pmYawUse.checked;
    elements.pmYaw.placeholder = `default: ${defaults.yaw_abs_deg}`;
    elements.pmYaw.value = (pm.aircraft?.yaw_abs_deg != null) ? pm.aircraft.yaw_abs_deg : defaults.yaw_abs_deg;

    elements.pmGimbalPitchUse.checked = (pm.gimbal?.pitch_deg != null);
    elements.pmGimbalPitch.disabled = !elements.pmGimbalPitchUse.checked;
    elements.pmGimbalPitch.placeholder = `default: ${defaults.gimbal_pitch_deg}`;
    elements.pmGimbalPitch.value = (pm.gimbal?.pitch_deg != null) ? pm.gimbal.pitch_deg : defaults.gimbal_pitch_deg;

    elements.pmGimbalYawUse.checked = (pm.gimbal?.yaw_abs_deg != null);
    elements.pmGimbalYaw.disabled = !elements.pmGimbalYawUse.checked;
    elements.pmGimbalYaw.placeholder = `default: ${defaults.gimbal_yaw_abs_deg}`;
    elements.pmGimbalYaw.value = (pm.gimbal?.yaw_abs_deg != null) ? pm.gimbal.yaw_abs_deg : defaults.gimbal_yaw_abs_deg;

    const actionsOverridden = (pm.actions != null);
    elements.pmActionsUse.checked = actionsOverridden;
    const fake = actionsOverridden ? pm : { actions: defaults.actions || [] };
    Actions.renderList(elements.actionList, fake, () => {
      State.updatePlacemark(sel.index, { actions: pm.actions });
    }, !actionsOverridden);

    MapView.focusPlacemark(sel.index);
  }

  window.PlacemarkPanel = { init, render };
})();
