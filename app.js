/* DATAMARK Checker Intelligence Dashboard — App Logic */
'use strict';

// ── Credentials ──────────────────────────────────────────────
const USERS = {
  admin:   'datamark2025',
  laura:   'datamark2026',
  john:    'datamark@john',
};

// ── State ─────────────────────────────────────────────────────
let allData      = [];
let filteredData = [];
let charts       = {};
let currentUser  = '';

// Multi-select filter state
const filterState = {
  client:   new Set(),   // empty = all selected
  checker:  new Set(),
  month:    new Set(),
  location: new Set(),
};

// ── Helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const nf = n => Math.round(n).toLocaleString();

const CHECKER_COLORS = [
  '#00b4d8','#22c55e','#f59e0b','#ef4444','#a78bfa',
  '#14b8a6','#f97316','#3b82f6','#ec4899','#84cc16'
];

function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
function isDark()   { return getTheme() === 'dark'; }

function chartColors() {
  return {
    grid: isDark() ? 'rgba(30,51,71,0.8)' : 'rgba(0,0,0,0.07)',
    tick: isDark() ? '#4d7a96' : '#4a6580',
    tooltip: {
      bg:    isDark() ? '#0d1b2e' : '#ffffff',
      border:isDark() ? '#1e3347' : '#d0dce8',
      title: isDark() ? '#e8f4f8' : '#1a2c3d',
      body:  isDark() ? '#8aaec4' : '#4a6580',
    }
  };
}

// ── Data Label Plugin ─────────────────────────────────────────
const dataLabelPlugin = {
  id: 'dataLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || meta.type !== 'bar') return;
    ctx.save();
    meta.data.forEach((bar, i) => {
      const val = chart.data.datasets[0].data[i];
      if (!val || val === 0) return;
      const label = val >= 10000 ? (val/1000).toFixed(1)+'k' : val >= 1000 ? (val/1000).toFixed(1)+'k' : String(Math.round(val));
      ctx.font = '600 10px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const isHoriz = chart.options.indexAxis === 'y';
      if (isHoriz) {
        const barW = bar.width;
        const labelW = ctx.measureText(label).width + 10;
        if (barW > labelW + 6) {
          ctx.fillStyle = isDark() ? 'rgba(232,244,248,0.9)' : 'rgba(255,255,255,0.95)';
          ctx.fillText(label, bar.x - labelW/2, bar.y);
        } else {
          ctx.fillStyle = isDark() ? 'rgba(138,174,196,0.9)' : 'rgba(74,101,128,0.9)';
          ctx.fillText(label, bar.x + labelW/2 + 2, bar.y);
        }
      } else {
        ctx.fillStyle = isDark() ? 'rgba(232,244,248,0.85)' : 'rgba(26,44,61,0.85)';
        ctx.fillText(label, bar.x, bar.y - 7);
      }
    });
    ctx.restore();
  }
};

// ── Chart factory ─────────────────────────────────────────────
function baseOpts(horizontal=false, xLabel='', yLabel='') {
  const C = chartColors();
  const axisTitle = t => t
    ? { display:true, text:t, color:C.tick, font:{family:'DM Sans, sans-serif', size:11, weight:'500'}, padding:{top:4} }
    : { display:false };
  const xAxis = {
    title: axisTitle(xLabel),
    ticks: { color:C.tick, font:{family:'DM Sans, sans-serif', size:11}, maxRotation:35, autoSkip:true, maxTicksLimit:20 },
    grid:  { color:C.grid }
  };
  const yAxis = {
    title: axisTitle(yLabel || 'No. of Components'),
    ticks: { color:C.tick, font:{family:'DM Sans, sans-serif', size:11} },
    grid:  { color:C.grid }, beginAtZero:true
  };
  const yAxisH = {
    title: axisTitle(yLabel || 'Inspector / Checker'),
    ticks: { color:C.tick, font:{family:'DM Sans, sans-serif', size:11}, maxRotation:0 },
    grid:  { display:false }
  };
  const xAxisH = {
    title: axisTitle(xLabel || 'No. of Components'),
    ticks: { color:C.tick, font:{family:'DM Sans, sans-serif', size:11} },
    grid:  { color:C.grid }, beginAtZero:true
  };
  return {
    responsive:true, maintainAspectRatio:false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display:false },
      tooltip: {
        backgroundColor:C.tooltip.bg, borderColor:C.tooltip.border, borderWidth:1,
        titleColor:C.tooltip.title, bodyColor:C.tooltip.body,
        titleFont:{family:'DM Sans, sans-serif', weight:'600', size:13},
        bodyFont:{family:'DM Sans, sans-serif', size:12}, padding:10,
        callbacks:{ label: ctx => '  ' + nf(ctx.parsed[horizontal?'x':'y']) + ' components' }
      }
    },
    scales: horizontal ? { x:xAxisH, y:yAxisH } : { x:xAxis, y:yAxis }
  };
}

function mkChart(id, type, labels, data, color, horizontal=false, xLabel='', yLabel='') {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const canvas = $(id); if (!canvas) return;
  charts[id] = new Chart(canvas, {
    type, plugins: type==='bar' ? [dataLabelPlugin] : [],
    data: { labels, datasets:[{
      data, borderRadius: type==='bar'?5:0,
      backgroundColor: type==='line' ? (isDark()?'rgba(0,180,216,0.08)':'rgba(0,120,160,0.06)') : color,
      borderColor: color, borderWidth: type==='line'?2:0,
      fill: type==='line', tension:0.35,
      pointRadius: type==='line'?3:0, pointHoverRadius: type==='line'?5:0,
      pointBackgroundColor: color,
    }]},
    options: baseOpts(horizontal, xLabel, yLabel)
  });
}

function mkGroupedChart(id, labels, datasets, xLabel='', yLabel='') {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const canvas = $(id); if (!canvas) return;
  const C = chartColors();
  charts[id] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: {
          display:true, position:'bottom',
          labels: { color:C.tick, font:{family:'DM Sans, sans-serif', size:11}, boxWidth:12, padding:16, usePointStyle:true }
        },
        tooltip: {
          backgroundColor:C.tooltip.bg, borderColor:C.tooltip.border, borderWidth:1,
          titleColor:C.tooltip.title, bodyColor:C.tooltip.body,
          titleFont:{family:'DM Sans, sans-serif', weight:'600', size:12},
          bodyFont:{family:'DM Sans, sans-serif', size:11}, padding:10,
          callbacks:{ label: ctx => `  ${ctx.dataset.label}: ${nf(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: { title:{display:true,text:xLabel,color:C.tick,font:{family:'DM Sans, sans-serif',size:11,weight:'500'}}, ticks:{color:C.tick,font:{family:'DM Sans, sans-serif',size:11}}, grid:{color:C.grid} },
        y: { title:{display:true,text:yLabel||'No. of Components',color:C.tick,font:{family:'DM Sans, sans-serif',size:11,weight:'500'}}, ticks:{color:C.tick,font:{family:'DM Sans, sans-serif',size:11}}, grid:{color:C.grid}, beginAtZero:true }
      }
    }
  });
}

function mkStackedChart(id, labels, datasets) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const canvas = $(id); if (!canvas) return;
  const C = chartColors();
  charts[id] = new Chart(canvas, {
    type:'bar', data:{ labels, datasets },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { display:true, position:'bottom', labels:{ color:C.tick, font:{family:'DM Sans, sans-serif',size:11}, boxWidth:12, padding:16, usePointStyle:true } },
        tooltip: {
          backgroundColor:C.tooltip.bg, borderColor:C.tooltip.border, borderWidth:1,
          titleColor:C.tooltip.title, bodyColor:C.tooltip.body,
          titleFont:{family:'DM Sans, sans-serif',weight:'600',size:12},
          bodyFont:{family:'DM Sans, sans-serif',size:11}, padding:10,
          mode:'index', intersect:false,
          callbacks:{ label: ctx => `  ${ctx.dataset.label}: ${nf(ctx.parsed.y)}` }
        }
      },
      scales: {
        x: { stacked:true, ticks:{color:C.tick,font:{family:'DM Sans, sans-serif',size:11}}, grid:{color:C.grid} },
        y: { stacked:true, ticks:{color:C.tick,font:{family:'DM Sans, sans-serif',size:11}}, grid:{color:C.grid}, beginAtZero:true,
             title:{display:true,text:'No. of Components',color:C.tick,font:{family:'DM Sans, sans-serif',size:11,weight:'500'}} }
      }
    }
  });
}

// Rebuild all charts after theme change
function rebuildAllCharts() {
  const active = document.querySelector('.nav-item.active');
  const viewId = active ? active.dataset.view : 'overview';
  renderStats();
  renderView(viewId);
}

// ── Theme ─────────────────────────────────────────────────────
function toggleTheme() {
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  $('theme-label').textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
  if (filteredData.length) rebuildAllCharts();
}

// ── Login ─────────────────────────────────────────────────────
function doLogin() {
  const u = $('inp-user').value.trim().toLowerCase();
  const p = $('inp-pass').value;
  const err = $('login-error');
  if (USERS[u] && USERS[u] === p) {
    currentUser = u;
    err.classList.remove('visible');
    $('screen-login').classList.remove('active');
    $('screen-dash').style.display = 'flex';
    $('screen-dash').classList.add('active');
    $('user-name-display').textContent = u.charAt(0).toUpperCase() + u.slice(1);
    $('user-avatar').textContent = u.charAt(0).toUpperCase();
  } else {
    err.classList.add('visible');
    $('inp-pass').value = '';
    $('inp-pass').focus();
  }
}

function logout() {
  currentUser = ''; allData = []; filteredData = [];
  Object.values(charts).forEach(c => c.destroy()); charts = {};
  Object.keys(filterState).forEach(k => filterState[k].clear());
  $('screen-dash').style.display = 'none';
  $('screen-dash').classList.remove('active');
  $('screen-login').classList.add('active');
  $('inp-user').value = ''; $('inp-pass').value = '';
  $('dash-content').style.display = 'none';
  $('upload-prompt').style.display = 'flex';
  $('topbar-client').textContent = 'No data loaded';
  $('login-error').classList.remove('visible');
}

function togglePw() {
  const inp = $('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', () => {
  ['inp-user','inp-pass'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.multi-select-wrap')) closeAllDropdowns();
  });
});

// ── Sidebar ───────────────────────────────────────────────────
let sidebarOpen = true;
function toggleSidebar() {
  const sb = $('sidebar');
  if (window.innerWidth <= 768) { sb.classList.toggle('mobile-open'); }
  else { sidebarOpen = !sidebarOpen; sb.classList.toggle('collapsed', !sidebarOpen); }
}

function switchView(btn, viewId) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  btn.classList.add('active');
  const view = $('view-'+viewId);
  if (view) { view.classList.add('active'); renderView(viewId); }
  if (window.innerWidth <= 768) $('sidebar').classList.remove('mobile-open');
}

// ── File Parsing ──────────────────────────────────────────────
function handleFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      allData = [];
      wb.SheetNames.forEach(sn => parseSheet(wb.Sheets[sn], sn));
      if (allData.length === 0) { alert('No inspection data found. Check file format.'); return; }
      onDataLoaded(file.name);
    } catch(err) { alert('Error reading file: '+err.message); }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}

function parseSheet(ws, sheetName) {
  const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
  if (!raw || raw.length < 2) return;
  let headerRow = -1;
  for (let i=0; i<Math.min(raw.length,6); i++) {
    const row = raw[i].map(c => String(c).toLowerCase());
    if (row.some(c=>c.includes('inspector')) && row.some(c=>c.includes('inspection date')||c==='date')) { headerRow=i; break; }
  }
  if (headerRow < 0) return;
  const headers = raw[headerRow].map(c => String(c).trim().toLowerCase());
  const idx = {
    date:     headers.findIndex(h=>h.includes('inspection date')||h==='date'),
    insp:     headers.findIndex(h=>h.includes('inspector')),
    na:       headers.findIndex(h=>h==='n_a'||h==='na'),
    nf:       headers.findIndex(h=>h==='n_f'||h==='nf'),
    dg:       headers.findIndex(h=>h==='d_g'||h==='dg'),
    dm:       headers.findIndex(h=>h==='dm'),
    loctype:  headers.findIndex(h=>h.includes('location type')||h.includes('loctype')),
    location: headers.findIndex(h=>h==='location'||h==='code'||h==='location name'),
    store:    headers.findIndex(h=>h.includes('store name')),
  };
  for (let i=headerRow+1; i<raw.length; i++) {
    const r = raw[i];
    const insp = String(r[idx.insp]||'').trim();
    if (!insp || insp.toLowerCase()==='inspector' || insp==='') continue;
    let dateStr = '';
    const dval = r[idx.date];
    if (typeof dval==='number' && dval>40000) {
      const d = XLSX.SSF.parse_date_code(dval);
      if (d) dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } else {
      const s = String(dval||'').trim();
      const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dm) dateStr = `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
      else dateStr = s.slice(0,10);
    }
    if (!dateStr || dateStr.length < 7) continue;
    const loc = String(r[idx.location]||'').trim() || String(r[idx.store]||'').trim() || 'Unknown';
    const loctype = String(r[idx.loctype]||'').trim();
    allData.push({
      date:      dateStr,
      month:     dateStr.slice(0,7),
      inspector: insp,
      na:        parseFloat(r[idx.na])||0,
      nf:        parseFloat(r[idx.nf])||0,
      dg:        parseFloat(r[idx.dg])||0,
      dm:        parseFloat(r[idx.dm])||0,
      location:  loc,
      loctype:   loctype,
      client:    sheetName,
    });
  }
}

function onDataLoaded(filename) {
  const clients = [...new Set(allData.map(d=>d.client))];
  $('topbar-client').textContent = 'Client: '+clients.join(', ');
  buildFilterDropdowns();
  filteredData = [...allData];
  $('upload-prompt').style.display = 'none';
  $('dash-content').style.display = 'block';
  $('record-count').textContent = nf(filteredData.length)+' records';
  renderAll();
}

// ── Multi-select filters ──────────────────────────────────────
function buildFilterDropdowns() {
  const clients   = [...new Set(allData.map(d=>d.client))].sort();
  const checkers  = [...new Set(allData.map(d=>d.inspector))].sort();
  const months    = [...new Set(allData.map(d=>d.month))].filter(Boolean).sort();
  const locations = [...new Set(allData.map(d=>d.location))].filter(l=>l&&l!=='Unknown').sort();

  buildDropdown('client',   clients,   'Client');
  buildDropdown('checker',  checkers,  'Checker');
  buildDropdown('month',    months,    'Month');
  buildDropdown('location', locations, 'Location');
}

function buildDropdown(key, items, label) {
  const dropdown = $(`ms-dropdown-${key}`);
  dropdown.innerHTML = `
    <div class="ms-dropdown-actions">
      <button class="ms-action-btn" onclick="selectAll('${key}')">All</button>
      <button class="ms-action-btn" onclick="selectNone('${key}')">None</button>
    </div>
    ${items.map(v => `
      <label class="ms-option" id="ms-opt-${key}-${CSS.escape(v)}">
        <input type="checkbox" checked value="${v}" onchange="onCheckChange('${key}','${v}',this.checked)" />
        ${v}
      </label>`).join('')}
  `;
  updateBtnLabel(key, items.length, items.length);
}

function onCheckChange(key, val, checked) {
  if (!checked) { filterState[key].add(val); }   // add to EXCLUDED set
  else          { filterState[key].delete(val); }
  const allItems = allData.map(d => d[key === 'client' ? 'client' : key === 'checker' ? 'inspector' : key === 'location' ? 'location' : 'month']);
  const total = [...new Set(allItems)].length;
  const excluded = filterState[key].size;
  updateBtnLabel(key, total - excluded, total);
  applyFilters();
}

function updateBtnLabel(key, selected, total) {
  const btn = $(`ms-${key}`).querySelector('.ms-btn');
  const labels = { client:'Client', checker:'Checker', month:'Month', location:'Location' };
  btn.textContent = selected === total ? `All ${labels[key]}s` : `${selected} of ${total} selected`;
  // re-append chevron
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','10'); svg.setAttribute('height','10'); svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','3');
  const poly = document.createElementNS('http://www.w3.org/2000/svg','polyline');
  poly.setAttribute('points','6 9 12 15 18 9'); svg.appendChild(poly);
  btn.appendChild(svg);
}

function selectAll(key) {
  filterState[key].clear();
  $(`ms-dropdown-${key}`).querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; });
  const allItems = allData.map(d => keyToField(key, d));
  const total = [...new Set(allItems)].length;
  updateBtnLabel(key, total, total);
  applyFilters();
}

function selectNone(key) {
  const allItems = [...new Set(allData.map(d => keyToField(key, d)))];
  filterState[key] = new Set(allItems);
  $(`ms-dropdown-${key}`).querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  updateBtnLabel(key, 0, allItems.length);
  applyFilters();
}

function keyToField(key, d) {
  if (key==='client')   return d.client;
  if (key==='checker')  return d.inspector;
  if (key==='month')    return d.month;
  if (key==='location') return d.location;
  return '';
}

function toggleDropdown(key) {
  const dropdown = $(`ms-dropdown-${key}`);
  const btn = $(`ms-${key}`).querySelector('.ms-btn');
  const isOpen = dropdown.classList.contains('open');
  closeAllDropdowns();
  if (!isOpen) { dropdown.classList.add('open'); btn.classList.add('open'); }
}

function closeAllDropdowns() {
  ['client','checker','month','location'].forEach(key => {
    const dd = $(`ms-dropdown-${key}`);
    const btn = $(`ms-${key}`) && $(`ms-${key}`).querySelector('.ms-btn');
    if (dd) dd.classList.remove('open');
    if (btn) btn.classList.remove('open');
  });
}

function clearAllFilters() {
  ['client','checker','month','location'].forEach(key => selectAll(key));
}

function applyFilters() {
  filteredData = allData.filter(d =>
    !filterState.client.has(d.client) &&
    !filterState.checker.has(d.inspector) &&
    !filterState.month.has(d.month) &&
    !filterState.location.has(d.location)
  );
  $('record-count').textContent = nf(filteredData.length)+' records';
  renderAll();
}

// ── Aggregations ──────────────────────────────────────────────
function byChecker(field, data) {
  data = data || filteredData;
  const checkers = [...new Set(data.map(d=>d.inspector))].sort();
  return { labels:checkers, values:checkers.map(c=>data.filter(d=>d.inspector===c).reduce((a,d)=>a+d[field],0)) };
}

function byDate(data) {
  data = data || filteredData;
  const dates = [...new Set(data.map(d=>d.date))].sort();
  return { labels:dates.map(d=>d.slice(5)), values:dates.map(dt=>data.filter(d=>d.date===dt).length) };
}

function fieldByDate(field, data) {
  data = data || filteredData;
  const dates = [...new Set(data.map(d=>d.date))].sort();
  return { labels:dates.map(d=>d.slice(5)), values:dates.map(dt=>data.filter(d=>d.date===dt).reduce((a,d)=>a+d[field],0)) };
}

function byLocation(data) {
  data = data || filteredData;
  const locs = [...new Set(data.map(d=>d.location))].filter(Boolean).sort();
  return { labels:locs, values:locs.map(l=>data.filter(d=>d.location===l).length) };
}

// ── Render all ────────────────────────────────────────────────
function renderAll() {
  renderStats();
  const active = document.querySelector('.nav-item.active');
  renderView(active ? active.dataset.view : 'overview');
}

function renderView(viewId) {
  switch(viewId) {
    case 'overview':    renderOverview();     break;
    case 'performance': renderPerformance();  break;
    case 'dm':          renderDMView();       break;
    case 'na':          renderNAView();       break;
    case 'dg':          renderDGView();       break;
    case 'stores':      renderStores();       break;
  }
}

function renderStats() {
  const totalDM  = filteredData.reduce((a,d)=>a+d.dm, 0);
  const totalNA  = filteredData.reduce((a,d)=>a+d.na, 0);
  const totalNF  = filteredData.reduce((a,d)=>a+d.nf, 0);
  const totalDG  = filteredData.reduce((a,d)=>a+d.dg, 0);
  const checkers = new Set(filteredData.map(d=>d.inspector)).size;
  const days     = new Set(filteredData.map(d=>d.date)).size;
  $('stats-row').innerHTML = `
    <div class="stat-card c-accent"><div class="stat-label">Total Records</div><div class="stat-value">${nf(filteredData.length)}</div><div class="stat-sub">Components inspected</div></div>
    <div class="stat-card c-green"><div class="stat-label">DM — Marked</div><div class="stat-value">${nf(totalDM)}</div><div class="stat-sub">Datamark found &amp; scanned</div></div>
    <div class="stat-card c-amber"><div class="stat-label">N/A — Not Accessible</div><div class="stat-value">${nf(totalNA)}</div><div class="stat-sub">Could not be reached</div></div>
    <div class="stat-card c-blue"><div class="stat-label">N/F — Not Found</div><div class="stat-value">${nf(totalNF)}</div><div class="stat-sub">Component missing</div></div>
    <div class="stat-card c-red"><div class="stat-label">D/G — Damaged</div><div class="stat-value">${nf(totalDG)}</div><div class="stat-sub">Mark damaged/unreadable</div></div>
    <div class="stat-card c-teal"><div class="stat-label">Checkers</div><div class="stat-value">${checkers}</div><div class="stat-sub">Active inspectors</div></div>
    <div class="stat-card c-blue"><div class="stat-label">Active Days</div><div class="stat-value">${days}</div><div class="stat-sub">Inspection days</div></div>
  `;
}

function renderOverview() {
  const dm    = byChecker('dm');
  const na    = byChecker('na');
  const dg    = byChecker('dg');
  const date  = byDate();
  const total = dm.labels.map((_,i) => dm.values[i]+na.values[i]+dg.values[i]);
  mkChart('c-dm-ov',    'bar',  dm.labels,    dm.values,    '#22c55e', false, 'Inspector / Checker', 'DM Marks Found');
  mkChart('c-na-ov',    'bar',  na.labels,    na.values,    '#f59e0b', false, 'Inspector / Checker', 'N/A Components');
  mkChart('c-dg-ov',    'bar',  dg.labels,    dg.values,    '#ef4444', false, 'Inspector / Checker', 'Damaged Components');
  mkChart('c-total-ov', 'bar',  dm.labels,    total,        '#3b82f6', false, 'Inspector / Checker', 'Total Components');
  mkChart('c-date-ov',  'line', date.labels,  date.values,  '#14b8a6', false, 'Date', 'No. of Inspections');
}

// ── Performance Comparison ────────────────────────────────────
function renderPerformance() {
  const metric = ($('perf-metric') && $('perf-metric').value) || 'dm';
  const months  = [...new Set(filteredData.map(d=>d.month))].sort();
  const checkers = [...new Set(filteredData.map(d=>d.inspector))].sort();

  // Grouped: X=months, each checker=one dataset (side-by-side bars per month)
  const groupedDatasets = checkers.map((c, i) => ({
    label: c,
    data: months.map(m => {
      const subset = filteredData.filter(d=>d.inspector===c && d.month===m);
      if (metric==='total') return subset.reduce((a,d)=>a+d.dm+d.na+d.nf+d.dg,0);
      return subset.reduce((a,d)=>a+d[metric],0);
    }),
    backgroundColor: CHECKER_COLORS[i % CHECKER_COLORS.length],
    borderColor:     CHECKER_COLORS[i % CHECKER_COLORS.length],
    borderWidth: 0,
    borderRadius: 4,
  }));

  const monthLabels = months.map(m => {
    const [y,mo] = m.split('-');
    return new Date(+y, +mo-1).toLocaleString('default',{month:'short', year:'2-digit'});
  });

  mkGroupedChart('c-perf-grouped', monthLabels, groupedDatasets, 'Month', metricLabel(metric));

  // Stacked: X=checkers, metric datasets stacked
  const stackDatasets = [
    { label:'DM — Marked',        data: checkers.map(c=>filteredData.filter(d=>d.inspector===c).reduce((a,d)=>a+d.dm,0)), backgroundColor:'#22c55e' },
    { label:'N/A — Not Accessible',data: checkers.map(c=>filteredData.filter(d=>d.inspector===c).reduce((a,d)=>a+d.na,0)), backgroundColor:'#f59e0b' },
    { label:'N/F — Not Found',     data: checkers.map(c=>filteredData.filter(d=>d.inspector===c).reduce((a,d)=>a+d.nf,0)), backgroundColor:'#3b82f6' },
    { label:'D/G — Damaged',       data: checkers.map(c=>filteredData.filter(d=>d.inspector===c).reduce((a,d)=>a+d.dg,0)), backgroundColor:'#ef4444' },
  ];
  mkStackedChart('c-perf-stacked', checkers, stackDatasets);
}

function metricLabel(m) {
  const map = { dm:'DM Marks Found', na:'N/A Components', nf:'N/F Components', dg:'Damaged Components', total:'Total Components' };
  return map[m] || 'Components';
}

function renderDMView() {
  const dm    = byChecker('dm');
  const trend = fieldByDate('dm');
  const ht    = Math.max(dm.labels.length*42+60, 200);
  const wrap  = $('dm-chart-area'); if (wrap) wrap.style.height = ht+'px';
  mkChart('c-dm-detail', 'bar', dm.labels, dm.values, '#22c55e', true, 'DM Marks Found', 'Inspector / Checker');
  mkChart('c-dm-trend',  'line', trend.labels, trend.values, '#22c55e', false, 'Date', 'DM Marks Found');
}

function renderNAView() {
  const na    = byChecker('na');
  const trend = fieldByDate('na');
  mkChart('c-na-detail', 'bar', na.labels, na.values, '#f59e0b', true, 'N/A Components', 'Inspector / Checker');
  mkChart('c-na-trend',  'line', trend.labels, trend.values, '#f59e0b', false, 'Date', 'N/A Components');
}

function renderDGView() {
  const dg    = byChecker('dg');
  const trend = fieldByDate('dg');
  const ht    = Math.max(dg.labels.length*42+60, 200);
  const wrap  = $('dg-chart-area'); if (wrap) wrap.style.height = ht+'px';
  mkChart('c-dg-detail', 'bar', dg.labels, dg.values, '#ef4444', true, 'Damaged Components', 'Inspector / Checker');
  mkChart('c-dg-trend',  'line', trend.labels, trend.values, '#ef4444', false, 'Date', 'Damaged Components');
}

// ── Store Inspections ─────────────────────────────────────────
function renderStores() {
  // Determine which location type is selected
  const loctypeSel = $('store-loctype') ? $('store-loctype').value : 'all';

  // For the timeline chart: use filtered data scoped to selected loctype
  const chartData = loctypeSel === 'all'
    ? filteredData
    : filteredData.filter(d => d.loctype === loctypeSel);

  renderStoreTable(chartData, loctypeSel);
}

function renderStoreTable(data, loctypeSel) {
  const mode      = ($('store-view-mode') && $('store-view-mode').value) || 'date';
  const container = $('store-table-container');

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);padding:2rem;text-align:center">No inspection data for this selection. Try adjusting your filters.</p>';
    return;
  }

  // Update subtitle dynamically
  const subtitleEl = document.querySelector('#view-stores .chart-card:last-child .chart-card-sub');
  if (subtitleEl) {
    const typeLabel = loctypeSel === 'all' ? 'All Locations' : loctypeSel + 's';
    subtitleEl.textContent = `Rows = ${typeLabel} · Columns = ${mode==='month'?'Month':'Date'} · Values = Total inspections. Blank = not inspected that day.`;
  }

  // Rows: individual location names (B17, Hydraulic Room, Tyre Bay, etc.)
  const locations = [...new Set(data.map(d => d.location))].filter(Boolean).sort();

  // Columns: dates or months
  let cols, colLabel;
  if (mode === 'month') {
    cols = [...new Set(data.map(d => d.month))].sort();
    colLabel = m => {
      const [y, mo] = m.split('-');
      return new Date(+y, +mo-1).toLocaleString('default', {month:'short', year:'2-digit'});
    };
  } else {
    // Date mode — show all unique dates sorted descending (newest left, like the image)
    cols = [...new Set(data.map(d => d.date))].filter(Boolean).sort().reverse();
    colLabel = d => d.slice(5).replace('-', '/'); // MM/DD display
  }

  // Build matrix: rows=location, cols=date/month, value=inspection count
  const matrix = {};
  locations.forEach(loc => {
    matrix[loc] = {};
    cols.forEach(col => { matrix[loc][col] = 0; });
  });
  data.forEach(d => {
    const col = mode === 'month' ? d.month : d.date;
    if (matrix[d.location] !== undefined && col in matrix[d.location]) {
      matrix[d.location][col]++;
    }
  });

  // Column totals (Grand Total row at bottom)
  const colTotals = {};
  cols.forEach(col => {
    colTotals[col] = locations.reduce((a, loc) => a + (matrix[loc][col] || 0), 0);
  });
  const grandTotal = Object.values(colTotals).reduce((a, v) => a + v, 0);

  // Color scale based on max value in this dataset
  const allVals = locations.flatMap(loc => cols.map(col => matrix[loc][col] || 0)).filter(v => v > 0);
  const maxVal  = allVals.length ? Math.max(...allVals) : 1;

  function valClass(v) {
    if (v === 0)            return 'val-zero';
    if (v < maxVal * 0.15)  return 'val-low';
    if (v < maxVal * 0.5)   return 'val-mid';
    return 'val-high';
  }

  // Only show rows that have at least one inspection
  const activeLocations = locations.filter(loc => cols.some(col => (matrix[loc][col] || 0) > 0));

  const thead = `<thead><tr>
    <th>${loctypeSel === 'Vehicle' ? 'Vehicle' : loctypeSel === 'Store' ? 'Store / Location' : 'Location'}</th>
    ${cols.map(c => `<th>${colLabel(c)}</th>`).join('')}
    <th>Total</th>
  </tr></thead>`;

  const tbody = `<tbody>${activeLocations.map(loc => {
    const rowTotal = cols.reduce((a, col) => a + (matrix[loc][col] || 0), 0);
    return `<tr>
      <td>${loc}</td>
      ${cols.map(col => {
        const v = matrix[loc][col] || 0;
        return `<td class="${valClass(v)}">${v || ''}</td>`;
      }).join('')}
      <td style="font-weight:700;color:var(--accent)">${rowTotal || ''}</td>
    </tr>`;
  }).join('')}</tbody>`;

  const tfoot = `<tfoot><tr>
    <td>Grand Total</td>
    ${cols.map(col => `<td>${colTotals[col] || ''}</td>`).join('')}
    <td>${grandTotal}</td>
  </tr></tfoot>`;

  container.innerHTML = `<table class="store-table">${thead}${tbody}${tfoot}</table>`;
}

// ── Glossary ──────────────────────────────────────────────────
function toggleGlossary() {
  const overlay = $('glossary-overlay');
  overlay.classList.toggle('open');
  document.body.style.overflow = overlay.classList.contains('open') ? 'hidden' : '';
}
function closeGlossaryOutside(e) { if (e.target===$('glossary-overlay')) toggleGlossary(); }
document.addEventListener('keydown', e => {
  if (e.key==='Escape' && $('glossary-overlay') && $('glossary-overlay').classList.contains('open')) toggleGlossary();
});

// ── PDF Export ────────────────────────────────────────────────
async function downloadPDF() {
  if (!filteredData.length) { alert('No data loaded.'); return; }
  const overlay = $('pdf-overlay'); overlay.style.display='flex';
  try {
    const {jsPDF} = window.jspdf;
    const pdf = new jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setFillColor(7,17,30); pdf.rect(0,0,pw,ph,'F');
    pdf.setFillColor(13,27,46); pdf.rect(0,0,pw,18,'F');
    pdf.setTextColor(0,180,216); pdf.setFontSize(14); pdf.setFont('helvetica','bold');
    pdf.text('DATAMARK — Checker Intelligence Report', 14, 12);
    pdf.setTextColor(77,122,150); pdf.setFontSize(9); pdf.setFont('helvetica','normal');
    const now = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    pdf.text(`Generated: ${now}   Records: ${nf(filteredData.length)}`, pw-14, 12, {align:'right'});
    const chartAreas = document.querySelectorAll('.view.active .chart-area');
    let x=14, y=24, rowH=0;
    for (const area of chartAreas) {
      const card = area.closest('.chart-card');
      if (!card) continue;
      const titleEl = card.querySelector('.chart-card-title');
      const title = titleEl ? titleEl.textContent : '';
      try {
        const c2 = await html2canvas(area, {backgroundColor: isDark()?'#0d1b2e':'#ffffff', scale:1.5, logging:false, useCORS:true});
        const imgData = c2.toDataURL('image/png');
        const iw = Math.min(pw/2-5, pw-28);
        const ih = (c2.height/c2.width)*iw;
        if (x+iw>pw-14) { x=14; y+=rowH+10; rowH=0; }
        if (y+ih+10>ph) { pdf.addPage(); pdf.setFillColor(7,17,30); pdf.rect(0,0,pw,ph,'F'); y=14; x=14; rowH=0; }
        pdf.setTextColor(138,174,196); pdf.setFontSize(8); pdf.text(title, x, y);
        pdf.setFillColor(13,27,46); pdf.roundedRect(x, y+2, iw, ih, 2, 2, 'F');
        pdf.addImage(imgData, 'PNG', x, y+2, iw, ih);
        rowH = Math.max(rowH, ih+8); x += iw+10;
      } catch(e) { /* skip */ }
    }
    const clients = [...new Set(allData.map(d=>d.client))].join(', ');
    pdf.save(`DATAMARK_Checker_Report_${clients.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`);
  } catch(err) { alert('PDF failed: '+err.message); }
  finally { overlay.style.display='none'; }
}
