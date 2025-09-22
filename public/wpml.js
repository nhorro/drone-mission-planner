// Minimal WPML export/import with simple Actions mapping
(function () {
  const mapping = {
    root: 'waylines',
    waypoint: 'waypoint',
    lat: 'latitude', lon: 'longitude', height: 'height',
    heading: { tag: 'heading', modeAttr: 'mode', valueAttr: 'value' },
    gimbal:  { tag: 'gimbal', pitchAttr: 'pitch', yawAttr: 'yaw', modeAttr: 'mode' },
    speed:   { tag: 'speed', valueAttr: 'value' },
    action:  { tag: 'action', typeAttr: 'type' }
  };

  // Our simple action attribute mapping (adjust to your DJI sample if needed)
  // This keeps the XML human-readable and round-trippable by this tool.
  function actionToXml(a) {
    const t = a.type;
    const p = a.params || {};
    if (t === "Wait")         return `<action type="Wait" seconds="${esc(p.seconds ?? 0)}"/>`;
    if (t === "GimbalPitch")  return `<action type="GimbalPitch" deg="${esc(p.deg ?? -45)}"/>`;
    if (t === "GimbalYaw")    return `<action type="GimbalYaw" deg="${esc(p.deg ?? 0)}"/>`;
    if (t === "StartVideo")   return `<action type="StartVideo"/>`;
    if (t === "StopVideo")    return `<action type="StopVideo"/>`;
    if (t === "TakePhoto")    return `<action type="TakePhoto"/>`;
    // Custom: stash params JSON inside the tag body
    return `<action type="Custom">${esc(JSON.stringify(p))}</action>`;
  }

  function xmlToAction(el) {
    const t = el.getAttribute('type') || 'Custom';
    if (t === 'Wait')         return { type: 'Wait',        params: { seconds: num(el.getAttribute('seconds'), 0) } };
    if (t === 'GimbalPitch')  return { type: 'GimbalPitch', params: { deg: num(el.getAttribute('deg'), -45) } };
    if (t === 'GimbalYaw')    return { type: 'GimbalYaw',   params: { deg: num(el.getAttribute('deg'), 0) } };
    if (t === 'StartVideo')   return { type: 'StartVideo',  params: {} };
    if (t === 'StopVideo')    return { type: 'StopVideo',   params: {} };
    if (t === 'TakePhoto')    return { type: 'TakePhoto',   params: {} };
    // Custom or unknown: try parse JSON body
    const txt = (el.textContent || '').trim();
    try { return { type: 'Custom', params: txt ? JSON.parse(txt) : {} }; }
    catch { return { type: 'Custom', params: { note: txt } }; }
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function num(x, d) { const v = Number(x); return Number.isFinite(v) ? v : d; }

  function exportXML(plan) {
    const d = plan.defaults?.pm_defaults || {};
    const wps = plan.placemarks.map((p) => {
      const lines = [];
      const yaw   = (p.aircraft?.yaw_abs_deg != null) ? p.aircraft.yaw_abs_deg : d.yaw_abs_deg;
      const gpitch= (p.gimbal?.pitch_deg     != null) ? p.gimbal.pitch_deg     : d.gimbal_pitch_deg;
      const gyaw  = (p.gimbal?.yaw_abs_deg   != null) ? p.gimbal.yaw_abs_deg   : d.gimbal_yaw_abs_deg;
      const acts  = (p.actions != null) ? p.actions : (d.actions || []);

      lines.push(`<waypoint latitude="${esc(p.lat)}" longitude="${esc(p.lon)}" height="${esc(p.alt_rel_m)}">`);
      lines.push(`  <heading mode="absolute" value="${esc(yaw)}"/>`);
      lines.push(`  <gimbal mode="absolute" pitch="${esc(gpitch)}" yaw="${esc(gyaw)}"/>`);
      if (p.speed_out_mps != null) {
        lines.push(`  <speed value="${esc(p.speed_out_mps)}"/>`);
      }
      for (const a of acts) {
        lines.push('  ' + actionToXml(a));
      }
      lines.push(`</waypoint>`);
      return lines.join('\n');
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<waylines>\n${wps}\n</waylines>\n`;
  }


  function importXML(xmlStr) {
    const doc = new DOMParser().parseFromString(xmlStr, "text/xml");
    const nodes = Array.from(doc.getElementsByTagName(mapping.waypoint));
    const placemarks = nodes.map((el) => {
      const lat = parseFloat(el.getAttribute(mapping.lat));
      const lon = parseFloat(el.getAttribute(mapping.lon));
      const alt = parseFloat(el.getAttribute(mapping.height) || "0");
      const h = el.getElementsByTagName(mapping.heading.tag)[0];
      const g = el.getElementsByTagName(mapping.gimbal.tag)[0];
      const s = el.getElementsByTagName(mapping.speed.tag)[0];
      const actionEls = Array.from(el.getElementsByTagName('action'));
      const actions = actionEls.map(xmlToAction);

      return {
        id: crypto.randomUUID(),
        lat, lon, alt_rel_m: alt,
        aircraft: { yaw_abs_deg: h ? parseFloat(h.getAttribute(mapping.heading.valueAttr)||"0") : 0 },
        gimbal:   { pitch_deg: g ? parseFloat(g.getAttribute(mapping.gimbal.pitchAttr)||"-45") : -45,
                    yaw_abs_deg: g ? parseFloat(g.getAttribute(mapping.gimbal.yawAttr)||"0") : 0 },
        speed_out_mps: s ? parseFloat(s.getAttribute(mapping.speed.valueAttr)||"") : null,
        actions
      };
    });
    return { plan: { name: "Imported", notes: "", defaults: { speed_mps: 5, shot_latency_s: 0.5 }, battery_hint: { usable_min:0, reserve_min:0 }, placemarks }, version: 1 };
  }

  window.WPML = { export: exportXML, import: importXML, mapping };
})();
