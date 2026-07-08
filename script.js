/* ===========================================================
   School Master Time Table Builder
   M Ijaz - GHS 124NB
   =========================================================== */

const STORAGE_KEY = 'ghs124nb_timetable_v1';

const PERIOD_KEYS = ['assembly','p1','p2','p3','p4','p5','p6','brk','p7','p8'];
const PERIOD_LABELS = {
  assembly:'Assembly', p1:'Period 1', p2:'Period 2', p3:'Period 3', p4:'Period 4',
  p5:'Period 5', p6:'Period 6', brk:'Break', p7:'Period 7', p8:'Period 8'
};
const TEACHING_PERIODS = ['p1','p2','p3','p4','p5','p6','p7','p8'];

function defaultTimes(season){
  const base = season === 'summer'
    ? ['07:45','08:00','08:40','09:20','10:00','10:40','11:20','11:40','12:20','13:00']
    : ['08:00','08:15','08:55','09:35','10:15','10:55','11:35','11:55','12:35','13:15'];
  return PERIOD_KEYS.map((key,i)=>({
    key, label:PERIOD_LABELS[key],
    start: base[i], end: base[i+1] || base[i]
  }));
}

function defaultState(){
  return {
    meta:{
      schoolName:'GHS 124NB',
      sessionYear:'2026-27',
      effectiveDate:new Date().toISOString().slice(0,10),
      session:'summer'
    },
    periodTimes:{
      summer: defaultTimes('summer'),
      winter: defaultTimes('winter')
    },
    rows:[]
  };
}

let state = loadState();
let editingRowId = null;
let activeTimeTab = 'summer';

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // merge with defaults to survive future field additions
    const d = defaultState();
    return {
      meta:{...d.meta, ...(parsed.meta||{})},
      periodTimes:{
        summer: (parsed.periodTimes && parsed.periodTimes.summer) || d.periodTimes.summer,
        winter: (parsed.periodTimes && parsed.periodTimes.winter) || d.periodTimes.winter
      },
      rows: parsed.rows || []
    };
  }catch(e){
    console.error('Load error', e);
    return defaultState();
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(){
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=>t.classList.add('hidden'), 2200);
}

/* ---------------- Meta / header binding ---------------- */
function bindMeta(){
  const schoolName = document.getElementById('schoolName');
  const sessionYear = document.getElementById('sessionYear');
  const effectiveDate = document.getElementById('effectiveDate');
  const sessionMode = document.getElementById('sessionMode');

  schoolName.value = state.meta.schoolName;
  sessionYear.value = state.meta.sessionYear;
  effectiveDate.value = state.meta.effectiveDate;
  sessionMode.value = state.meta.session;

  schoolName.addEventListener('input', ()=>{ state.meta.schoolName = schoolName.value; saveState(); });
  sessionYear.addEventListener('input', ()=>{ state.meta.sessionYear = sessionYear.value; saveState(); });
  effectiveDate.addEventListener('change', ()=>{ state.meta.effectiveDate = effectiveDate.value; saveState(); });
  sessionMode.addEventListener('change', ()=>{
    state.meta.session = sessionMode.value;
    saveState();
    renderTimeStrip();
  });
}

/* ---------------- Time strip ---------------- */
function renderTimeStrip(){
  const strip = document.getElementById('timeStrip');
  const modeLabel = document.getElementById('modeLabel');
  const season = state.meta.session;
  modeLabel.textContent = season === 'summer' ? 'Summer' : 'Winter';
  const times = state.periodTimes[season];
  strip.innerHTML = times.map(t=>`<span class="time-chip">${t.label}: ${t.start}-${t.end}</span>`).join('');
}

/* ---------------- Time Settings Modal ---------------- */
function openTimeModal(){
  activeTimeTab = state.meta.session;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.season===activeTimeTab));
  renderTimeModalBody();
  document.getElementById('timeModal').classList.remove('hidden');
}
function closeTimeModal(){
  document.getElementById('timeModal').classList.add('hidden');
}
function renderTimeModalBody(){
  const body = document.getElementById('timeSettingsBody');
  const times = state.periodTimes[activeTimeTab];
  body.innerHTML = times.map((t,i)=>`
    <div class="time-row">
      <span>${t.label}</span>
      <input type="time" data-idx="${i}" data-field="start" value="${t.start}">
      <input type="time" data-idx="${i}" data-field="end" value="${t.end}">
    </div>
  `).join('');
}
function saveTimeModal(){
  const inputs = document.querySelectorAll('#timeSettingsBody input');
  inputs.forEach(inp=>{
    const idx = +inp.dataset.idx;
    const field = inp.dataset.field;
    state.periodTimes[activeTimeTab][idx][field] = inp.value;
  });
  saveState();
  renderTimeStrip();
  closeTimeModal();
  showToast('Period timings saved');
}

/* ---------------- Main Table ---------------- */
function renderMainTable(){
  const tbody = document.getElementById('mainTableBody');
  if(state.rows.length === 0){
    tbody.innerHTML = `<tr><td colspan="13" style="padding:20px;color:#888;">Koi class row nahi hai. "Add Class Row" button dabayein.</td></tr>`;
    renderTeacherTable();
    return;
  }
  tbody.innerHTML = state.rows.map(row=>`
    <tr data-id="${row.id}">
      <td>${escapeHtml(row.incharge)}</td>
      <td><strong>${escapeHtml(row.className)}</strong></td>
      <td>${escapeHtml(row.assembly)}</td>
      <td>${escapeHtml(row.p1)}</td>
      <td>${escapeHtml(row.p2)}</td>
      <td>${escapeHtml(row.p3)}</td>
      <td>${escapeHtml(row.p4)}</td>
      <td>${escapeHtml(row.p5)}</td>
      <td>${escapeHtml(row.p6)}</td>
      <td>${escapeHtml(row.brk)}</td>
      <td>${escapeHtml(row.p7)}</td>
      <td>${escapeHtml(row.p8)}</td>
      <td class="no-print">
        <div class="row-actions">
          <button class="icon-btn edit" data-action="edit" data-id="${row.id}">✏️</button>
          <button class="icon-btn delete" data-action="delete" data-id="${row.id}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-action]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      if(btn.dataset.action === 'edit') openRowModal(id);
      else if(btn.dataset.action === 'delete') deleteRow(id);
    });
  });

  renderTeacherTable();
}

function escapeHtml(str){
  if(str == null) return '';
  return String(str)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function deleteRow(id){
  const row = state.rows.find(r=>r.id===id);
  if(!row) return;
  if(!confirm(`"${row.className}" wala row delete karna hai?`)) return;
  state.rows = state.rows.filter(r=>r.id!==id);
  saveState();
  renderMainTable();
  showToast('Row delete ho gaya');
}

/* ---------------- Row Modal (Add/Edit) ---------------- */
function openRowModal(id){
  editingRowId = id || null;
  const row = editingRowId ? state.rows.find(r=>r.id===editingRowId) : {
    id:null, incharge:'', className:'', assembly:'', p1:'', p2:'', p3:'', p4:'', p5:'', p6:'', brk:'', p7:'', p8:''
  };
  document.getElementById('rowModalTitle').textContent = editingRowId ? 'Edit Class Row' : 'Add Class Row';
  const body = document.getElementById('rowModalBody');
  body.innerHTML = `
    <div class="field-row"><label>Incharge Name</label><input id="f_incharge" value="${escapeAttr(row.incharge)}" placeholder="e.g. Mr. Ahmed"></div>
    <div class="field-row"><label>Class</label><input id="f_className" value="${escapeAttr(row.className)}" placeholder="e.g. 6th A"></div>
    <div class="field-row"><label>Assembly</label><input id="f_assembly" value="${escapeAttr(row.assembly)}" placeholder="Duty / Note"></div>
    <div class="field-row"><label>Period 1 (Teacher (Subject))</label><input id="f_p1" value="${escapeAttr(row.p1)}" placeholder="Ali Khan (Math)"></div>
    <div class="field-row"><label>Period 2</label><input id="f_p2" value="${escapeAttr(row.p2)}"></div>
    <div class="field-row"><label>Period 3</label><input id="f_p3" value="${escapeAttr(row.p3)}"></div>
    <div class="field-row"><label>Period 4</label><input id="f_p4" value="${escapeAttr(row.p4)}"></div>
    <div class="field-row"><label>Period 5</label><input id="f_p5" value="${escapeAttr(row.p5)}"></div>
    <div class="field-row"><label>Period 6</label><input id="f_p6" value="${escapeAttr(row.p6)}"></div>
    <div class="field-row"><label>Break</label><input id="f_brk" value="${escapeAttr(row.brk)}" placeholder="e.g. 10:30-10:50"></div>
    <div class="field-row"><label>Period 7</label><input id="f_p7" value="${escapeAttr(row.p7)}"></div>
    <div class="field-row"><label>Period 8</label><input id="f_p8" value="${escapeAttr(row.p8)}"></div>
  `;
  document.getElementById('rowModal').classList.remove('hidden');
}
function escapeAttr(s){ return escapeHtml(s); }

function closeRowModal(){
  document.getElementById('rowModal').classList.add('hidden');
  editingRowId = null;
}

function saveRowModal(){
  const get = id => document.getElementById(id).value.trim();
  const className = get('f_className');
  if(!className){
    alert('Class name likhna zaroori hai.');
    return;
  }
  const data = {
    incharge:get('f_incharge'),
    className,
    assembly:get('f_assembly'),
    p1:get('f_p1'), p2:get('f_p2'), p3:get('f_p3'), p4:get('f_p4'),
    p5:get('f_p5'), p6:get('f_p6'), brk:get('f_brk'), p7:get('f_p7'), p8:get('f_p8')
  };
  if(editingRowId){
    const idx = state.rows.findIndex(r=>r.id===editingRowId);
    state.rows[idx] = {...state.rows[idx], ...data};
  }else{
    state.rows.push({id:uid(), ...data});
  }
  saveState();
  renderMainTable();
  closeRowModal();
  showToast('Row save ho gaya');
}

/* ---------------- Teacher-wise Summary (auto) ---------------- */
function parseCell(cell){
  if(!cell) return null;
  const trimmed = cell.trim();
  if(!trimmed) return null;
  const m = trimmed.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if(m){
    return { teacher: m[1].trim(), subject: m[2].trim() };
  }
  return { teacher: trimmed, subject: 'N/A' };
}

function computeTeacherSummary(){
  const map = new Map(); // teacherName(lower) -> {name, subjects:Set, entries:[], total}
  state.rows.forEach(row=>{
    TEACHING_PERIODS.forEach((key, idx)=>{
      const parsed = parseCell(row[key]);
      if(!parsed) return;
      const nameKey = parsed.teacher.toLowerCase();
      if(!map.has(nameKey)){
        map.set(nameKey, { name:parsed.teacher, subjects:new Set(), entries:[], total:0 });
      }
      const entry = map.get(nameKey);
      entry.subjects.add(parsed.subject);
      entry.entries.push(`${row.className} - Period ${idx+1}`);
      entry.total += 1;
    });
  });
  return Array.from(map.values()).sort((a,b)=> b.total - a.total || a.name.localeCompare(b.name));
}

function renderTeacherTable(){
  const tbody = document.getElementById('teacherTableBody');
  const summary = computeTeacherSummary();
  if(summary.length === 0){
    tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;color:#888;">Abhi koi teacher data nahi mila.</td></tr>`;
    return;
  }
  tbody.innerHTML = summary.map((t,i)=>`
    <tr>
      <td>${i+1}</td>
      <td><strong>${escapeHtml(t.name)}</strong></td>
      <td>${escapeHtml(Array.from(t.subjects).join(', '))}</td>
      <td style="text-align:left;font-size:.72rem;">${t.entries.map(escapeHtml).join('<br>')}</td>
      <td><strong>${t.total}</strong></td>
    </tr>
  `).join('');
}

/* ---------------- Download / Save / Share ---------------- */
function downloadPdf(){
  window.print();
}

function saveJsonBackup(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fname = `timetable_${(state.meta.schoolName||'school').replace(/\s+/g,'_')}_${state.meta.sessionYear||''}.json`;
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Backup download ho gaya');
}

function loadJsonBackup(file){
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const parsed = JSON.parse(e.target.result);
      const d = defaultState();
      state = {
        meta:{...d.meta, ...(parsed.meta||{})},
        periodTimes:{
          summer: (parsed.periodTimes && parsed.periodTimes.summer) || d.periodTimes.summer,
          winter: (parsed.periodTimes && parsed.periodTimes.winter) || d.periodTimes.winter
        },
        rows: parsed.rows || []
      };
      saveState();
      bindMeta();
      renderTimeStrip();
      renderMainTable();
      showToast('Backup load ho gaya');
    }catch(err){
      alert('Yeh file valid backup nahi hai.');
    }
  };
  reader.readAsText(file);
}

async function shareData(){
  const summary = computeTeacherSummary();
  let text = `${state.meta.schoolName} - Master Time Table\nSession: ${state.meta.sessionYear} | Effective: ${state.meta.effectiveDate}\n\n`;
  state.rows.forEach(r=>{
    text += `Class ${r.className} (Incharge: ${r.incharge||'-'})\n`;
  });
  text += `\nTotal Teachers: ${summary.length}\n\nGenerated by M Ijaz - GHS 124NB`;

  if(navigator.share){
    try{
      await navigator.share({ title:'School Time Table', text });
    }catch(e){ /* user cancelled */ }
  }else if(navigator.clipboard){
    await navigator.clipboard.writeText(text);
    showToast('Summary copy ho gaya (clipboard)');
  }else{
    alert(text);
  }
}

/* ---------------- Init ---------------- */
function init(){
  bindMeta();
  renderTimeStrip();
  renderMainTable();

  document.getElementById('btnAddRow').addEventListener('click', ()=>openRowModal(null));
  document.getElementById('btnDownloadPdf').addEventListener('click', downloadPdf);
  document.getElementById('btnSaveJson').addEventListener('click', saveJsonBackup);
  document.getElementById('loadJsonInput').addEventListener('change', e=>{
    if(e.target.files[0]) loadJsonBackup(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('btnShare').addEventListener('click', shareData);

  document.getElementById('btnTimeSettings').addEventListener('click', openTimeModal);
  document.getElementById('btnCloseTimeModal').addEventListener('click', closeTimeModal);
  document.getElementById('btnSaveTimeModal').addEventListener('click', saveTimeModal);
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      activeTimeTab = btn.dataset.season;
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      renderTimeModalBody();
    });
  });

  document.getElementById('btnCloseRowModal').addEventListener('click', closeRowModal);
  document.getElementById('btnSaveRowModal').addEventListener('click', saveRowModal);

  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(err=>console.warn('SW register failed', err));
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
