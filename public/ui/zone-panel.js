// Handles zones list and editing
(function () {
  const { el } = UI;

  const elements = {
    list: el('zoneList'),
    zoneName: el('zoneName'),
    btnDelete: el('btnZoneDelete')
  };

  function init() {
    elements.zoneName.onchange = handleNameChange;
    elements.btnDelete.onclick = handleDelete;
  }

  function handleNameChange() {
    const sel = State.getSelection();
    if (sel.kind !== 'zone' || sel.index < 0) return;
    State.updateZone(sel.index, { name: elements.zoneName.value });
  }

  function handleDelete() {
    const sel = State.getSelection();
    if (sel.kind === 'zone' && sel.index >= 0) {
      State.deleteZone(sel.index);
    }
  }

  function render(plan) {
    renderList(plan);
    renderSelected(plan);
  }

  function renderList(plan) {
    const sel = State.getSelection();
    elements.list.innerHTML = '';
    plan.zones.forEach((z, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = (sel.kind === 'zone' && i === sel.index);
      btn.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      btn.textContent = `${z.name || 'Zone ' + (i + 1)} (${z.vertices.length} pts)`;
      btn.onclick = () => State.setZoneSelection(i);
      elements.list.appendChild(btn);
    });
  }

  function renderSelected(plan) {
    const sel = State.getSelection();
    const zone = (sel.kind === 'zone') ? plan.zones[sel.index] : null;
    if (!zone) {
      elements.zoneName.value = '';
      return;
    }
    elements.zoneName.value = zone.name || `Zone ${sel.index + 1}`;
    MapView.focusZone(sel.index);
  }

  window.ZonePanel = { init, render };
})();
