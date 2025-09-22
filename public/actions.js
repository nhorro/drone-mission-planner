// Actions UI <-> JSON helpers (now supports disabled rendering)
(function () {
  const TYPES = ["StartVideo","StopVideo","TakePhoto","Wait","GimbalPitch","GimbalYaw","Custom"];

  function defaultAction(type = "TakePhoto") {
    switch (type) {
      case "Wait":        return { type, params: { seconds: 2 } };
      case "GimbalPitch": return { type, params: { deg: -45 } };
      case "GimbalYaw":   return { type, params: { deg: 0 } };
      case "Custom":      return { type, params: { note: "key=value;..." } };
      default:            return { type: "TakePhoto", params: {} };
    }
  }

  function validate(action) {
    const V = State.VALIDATION;
    const t = action.type, p = action.params || {}; const errors = [];
    if (t === "Wait") {
      const s = Number(p.seconds);
      if (!Number.isFinite(s) || s < 0 || s > V.WAIT_S_MAX) errors.push(`Wait.seconds must be 0..${V.WAIT_S_MAX}`);
    }
    if (t === "GimbalPitch") {
      const d = Number(p.deg);
      if (!Number.isFinite(d) || d < V.GIMBAL_PITCH_MIN || d > V.GIMBAL_PITCH_MAX)
        errors.push(`GimbalPitch.deg must be ${V.GIMBAL_PITCH_MIN}..${V.GIMBAL_PITCH_MAX}`);
    }
    if (t === "GimbalYaw") {
      const d = Number(p.deg);
      if (!Number.isFinite(d) || d < 0 || d >= 360) errors.push("GimbalYaw.deg must be 0..359");
    }
    return { ok: errors.length === 0, errors };
  }

  function paramsToInline(obj){ return Object.entries(obj).map(([k,v]) => `${k}=${v}`).join(';'); }
  function inlineToParams(str){
    const out = {}; (str||'').split(';').map(s=>s.trim()).filter(Boolean).forEach(kv=>{
      const [k,...r]=kv.split('='); const v=r.join('=');
      if (k) out[k.trim()] = (v??'').trim();
    }); return out;
  }

  function renderList(container, pmOrFake, onChange, disabled=false) {
    container.innerHTML = '';
    const list = pmOrFake.actions || [];
    list.forEach((act, i) => {
      const row = document.createElement('div');
      row.className = 'action-row';
      const sel = document.createElement('select'); sel.className='form-select form-select-sm';
      TYPES.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; sel.appendChild(o);});
      sel.value = act.type;

      const inp = document.createElement('input'); inp.className='form-control form-control-sm';
      inp.placeholder = hintFor(act.type); inp.value = paramsToInline(act.params || {});

      const btnUp = button('↑','btn-outline-secondary',()=>{ if(i>0){ const a=list.splice(i,1)[0]; list.splice(i-1,0,a); onChange(); }});
      const btnDown = button('↓','btn-outline-secondary',()=>{ if(i<list.length-1){ const a=list.splice(i,1)[0]; list.splice(i+1,0,a); onChange(); }});
      const btnDel = button('✕','btn-outline-danger',()=>{ list.splice(i,1); onChange(); });

      sel.onchange = () => { act.type = sel.value; ensureDefaultsForType(act); inp.placeholder = hintFor(act.type); inp.value = paramsToInline(act.params||{}); validateAndStyle(act, inp); onChange(); };
      inp.onchange = () => { act.params = inlineToParams(inp.value); validateAndStyle(act, inp); onChange(); };

      validateAndStyle(act, inp);

      // Disable if needed
      [sel, inp, btnUp, btnDown, btnDel].forEach(el => el.disabled = !!disabled);
      if (disabled) { btnUp.classList.add('disabled'); btnDown.classList.add('disabled'); btnDel.classList.add('disabled'); }

      row.appendChild(sel); row.appendChild(inp); row.appendChild(btnUp); row.appendChild(btnDown); row.appendChild(btnDel);
      container.appendChild(row);
    });
  }

  function ensureDefaultsForType(act){
    if (act.type==="Wait" && act.params?.seconds==null) act.params={seconds:2};
    if (act.type==="GimbalPitch" && act.params?.deg==null) act.params={deg:-45};
    if (act.type==="GimbalYaw" && act.params?.deg==null) act.params={deg:0};
  }

  function hintFor(type){ return type==="Wait"?"seconds=2": type==="GimbalPitch"?"deg=-45": type==="GimbalYaw"?"deg=0": type==="Custom"?"key=value;key2=value2":""; }
  function button(label, cls, onclick){ const b=document.createElement('button'); b.className='btn btn-sm '+cls; b.textContent=label; b.onclick=onclick; return b; }
  function validateAndStyle(action, inputEl){ const res=validate(action); inputEl.classList.toggle('is-invalid', !res.ok); inputEl.title = res.ok?"":res.errors.join('\n'); }

  window.Actions = { TYPES, defaultAction, validate, renderList };
})();
