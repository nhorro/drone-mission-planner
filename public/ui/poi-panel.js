// Handles points of interest list and editor
(function () {
  const { el } = UI;

  const elements = {
    list: el('poiList'),
    poiLat: el('poiLat'),
    poiLon: el('poiLon'),
    poiAlt: el('poiAlt'),
    btnDelete: el('btnPoiDelete')
  };

  function init() {
    [elements.poiLat, elements.poiLon, elements.poiAlt].forEach(inp => {
      inp.onchange = handleChange;
    });
    elements.btnDelete.onclick = handleDelete;
  }

  function handleChange() {
    const sel = State.getSelection();
    if (sel.kind !== 'poi' || sel.index < 0) return;
    State.updatePOI(sel.index, {
      lat: Number(elements.poiLat.value),
      lon: Number(elements.poiLon.value),
      alt_rel_m: Number(elements.poiAlt.value)
    });
  }

  function handleDelete() {
    const sel = State.getSelection();
    if (sel.kind === 'poi' && sel.index >= 0) {
      State.deletePOI(sel.index);
    }
  }

  function render(plan) {
    renderList(plan);
    renderSelected(plan);
  }

  function renderList(plan) {
    const sel = State.getSelection();
    elements.list.innerHTML = '';
    plan.pois.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = (sel.kind === 'poi' && i === sel.index);
      btn.className = 'list-group-item list-group-item-action' + (active ? ' active' : '');
      btn.textContent = `POI ${i + 1}: (${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}) alt ${p.alt_rel_m} m`;
      btn.onclick = () => State.setPoiSelection(i);
      elements.list.appendChild(btn);
    });
  }

  function renderSelected(plan) {
    const sel = State.getSelection();
    const poi = (sel.kind === 'poi') ? plan.pois[sel.index] : null;
    if (!poi) {
      [elements.poiLat, elements.poiLon, elements.poiAlt].forEach(inp => inp.value = '');
      return;
    }
    elements.poiLat.value = poi.lat;
    elements.poiLon.value = poi.lon;
    elements.poiAlt.value = poi.alt_rel_m;
    MapView.focusPOI(sel.index);
  }

  window.PoiPanel = { init, render };
})();
