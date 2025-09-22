// Leaflet map adapter (placemarks + POIs + Zones)
(function () {
  let map, pmMarkers = [], poiMarkers = [], zonePolys = [];
  let pmPolyline = null;                  // <— NEW
  let draftPoly = null, draftMarkers = [];

  function init() {
    map = L.map('map').setView([-41.13, -71.30], 13);

    const key = localStorage.getItem("fpe_maptiler_key") || "";
    const satellite = key
      ? L.tileLayer(`https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=${key}`, { maxZoom: 20, attribution: '&copy; MapTiler & OpenMapTiles' })
      : null;
    const osm = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' });

    (satellite || osm).addTo(map);

    map.on('mousemove', (e) => {
      const el = document.getElementById('mouseLatLon');
      el.textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    });

    map.on('click', (e) => {
      window.onMapAddAt?.(e.latlng.lat, e.latlng.lng);
    });
  }

  function clearLayer(arr) { arr.forEach(m => m.remove()); arr.length = 0; }
  function clearOverlay() {
    clearLayer(pmMarkers);
    clearLayer(poiMarkers);
    clearLayer(zonePolys);
    if (pmPolyline) { pmPolyline.remove(); pmPolyline = null; }   // <— NEW
    if (draftPoly) { draftPoly.remove(); draftPoly = null; }
    clearLayer(draftMarkers);
  }

  function renderPlan(plan) {
    if (!map) return;
    clearOverlay();

    // Placemarks
    const latlngs = [];
    plan.placemarks.forEach((p, idx) => {
      const m = L.marker([p.lat, p.lon], { draggable: true }).addTo(map);
      m.bindTooltip(`#${idx+1}`, { permanent: true, direction: 'top', offset: [0, -20] }).openTooltip();
      m.on('click', () => window.onMapClickPlacemark?.(idx));
      m.on('dragend', (ev) => {
        const ll = ev.target.getLatLng();
        window.onMapMovePlacemark?.(idx, ll.lat, ll.lng);
      });
      pmMarkers.push(m);
      latlngs.push([p.lat, p.lon]);
    });
    if (latlngs.length >= 2) {      
      pmPolyline = L.polyline(latlngs, { color: '#0d6efd' }).addTo(map); // <— CHANGED
    }

    // POIs
    const poiIcon = L.divIcon({
      className: '',
      html: '<div class="poi-marker"></div>',
      iconSize: [16,16],
      iconAnchor: [8,8]
    });
    plan.pois.forEach((p, idx) => {
      const m = L.marker([p.lat, p.lon], { draggable: true, icon: poiIcon }).addTo(map);
      m.bindTooltip(`POI ${idx+1}`, { permanent: true, direction: 'right', offset: [10, 0] }).openTooltip();
      m.on('click', () => window.onMapClickPOI?.(idx));
      m.on('dragend', (ev) => {
        const ll = ev.target.getLatLng();
        window.onMapMovePOI?.(idx, ll.lat, ll.lng);
      });
      poiMarkers.push(m);
    });

    // Zones
    plan.zones.forEach((z, idx) => {
      const latlngs = z.vertices.map(v => [v.lat, v.lon]);
      const poly = L.polygon(latlngs, { color: '#ffc107', weight: 2, fillOpacity: 0.2 });
      poly.addTo(map);
      poly.on('click', () => window.onMapClickZone?.(idx));
      zonePolys.push(poly);
    });

    // Draft stays as-is (app will call setZoneDraft)
  }

  function setZoneDraft(vertices) {
    // vertices: [{lat,lon}]
    if (!map) return;
    if (draftPoly) { draftPoly.remove(); draftPoly = null; }
    clearLayer(draftMarkers);
    if (!vertices || vertices.length === 0) return;
    const latlngs = vertices.map(v => [v.lat, v.lon]);
    draftPoly = L.polyline(latlngs, { color: '#ffc107', weight: 2, dashArray: '4,4' }).addTo(map);
    // draw small vertex dots
    vertices.forEach(v => {
      const dot = L.marker([v.lat, v.lon], { icon: L.divIcon({ className: '', html: '<div class="zone-vertex"></div>', iconSize: [10,10], iconAnchor: [5,5] }) });
      dot.addTo(map);
      draftMarkers.push(dot);
    });
  }

  function focusPlacemark(idx) { const m = pmMarkers[idx]; if (m) map.panTo(m.getLatLng()); }
  function focusPOI(idx)       { const m = poiMarkers[idx]; if (m) map.panTo(m.getLatLng()); }
  function focusZone(idx)      { const p = zonePolys[idx];  if (p) map.fitBounds(p.getBounds(), { maxZoom: 17 }); }

  window.MapView = { init, renderPlan, setZoneDraft, focusPlacemark, focusPOI, focusZone };
})();
