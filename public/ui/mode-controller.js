// Handles editing modes (waypoints / POIs / zones) and map callbacks
(function () {
  const { el } = UI;

  let mode = 'wp';
  let draftZone = [];

  let modeBadge;
  let modeBtns;
  let btnZoneFinish;
  let btnZoneCancel;

  function init() {
    modeBadge = el('modeBadge');
    modeBtns = {
      wp: el('modeWp'),
      poi: el('modePoi'),
      zone: el('modeZone')
    };
    btnZoneFinish = el('btnZoneFinish');
    btnZoneCancel = el('btnZoneCancel');

    modeBtns.wp.onclick = () => setMode('wp');
    modeBtns.poi.onclick = () => setMode('poi');
    modeBtns.zone.onclick = () => setMode('zone');

    btnZoneFinish.onclick = handleZoneFinish;
    btnZoneCancel.onclick = clearDraftZone;

    window.onMapAddAt = handleMapAddAt;
    window.onMapClickPlacemark = (idx) => { if (mode === 'wp') State.setPmSelection(idx); };
    window.onMapMovePlacemark = (idx, lat, lon) => { if (mode === 'wp') State.updatePlacemark(idx, { lat, lon }); };
    window.onMapClickPOI = (idx) => { if (mode === 'poi') State.setPoiSelection(idx); };
    window.onMapMovePOI = (idx, lat, lon) => { if (mode === 'poi') State.updatePOI(idx, { lat, lon }); };
    window.onMapClickZone = (idx) => { State.setZoneSelection(idx); };

    setMode('wp');
  }

  function setMode(newMode) {
    mode = newMode;
    Object.entries(modeBtns).forEach(([key, btn]) => {
      if (!btn) return;
      btn.classList.toggle('active', key === mode);
    });
    if (modeBadge) {
      const label = mode === 'wp' ? 'Waypoints' : mode === 'poi' ? 'POIs' : 'Zones';
      modeBadge.textContent = `Mode: ${label}`;
    }
    const zoneOn = (mode === 'zone');
    btnZoneFinish.classList.toggle('d-none', !zoneOn);
    btnZoneCancel.classList.toggle('d-none', !zoneOn);
    if (!zoneOn) clearDraftZone();
  }

  function handleZoneFinish() {
    if (draftZone.length >= 3) {
      State.addZone(draftZone);
      clearDraftZone();
      State.setZoneSelection(State.getPlan().zones.length - 1);
    } else {
      alert('A zone needs at least 3 points.');
    }
  }

  function handleMapAddAt(lat, lon) {
    if (mode === 'wp') {
      State.addPlacemark({ lat, lon });
      State.setPmSelection(State.getPlan().placemarks.length - 1);
    } else if (mode === 'poi') {
      State.addPOI({ lat, lon, alt: 0 });
      State.setPoiSelection(State.getPlan().pois.length - 1);
    } else if (mode === 'zone') {
      draftZone.push({ lat, lon });
      MapView.setZoneDraft(draftZone);
    }
  }

  function clearDraftZone() {
    draftZone = [];
    MapView.setZoneDraft(draftZone);
  }

  function getMode() {
    return mode;
  }

  window.ModeController = { init, setMode, getMode };
})();
