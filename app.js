/* ═══════════════════════════════════════════════════════════════
   DATAMARK Checker Intelligence Dashboard — App Logic
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Credentials ──────────────────────────────────────────────
// IMPORTANT: Replace these with your actual manager credentials
// before going live. Add as many users as needed.
const USERS = {
  admin:    'datamark2025',
  manager:  'inspect123',
  john:     'datamark@john',
  // Add more users: username: 'password'
};

// ── State ────────────────────────────────────────────────────
let allData      = [];
let filteredData = [];
let charts       = {};
let currentUser  = '';

// ── Helpers ──────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const nf = n  => Math.round(n).toLocaleString();

const PALETTE = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
  teal:  '#14b8a6',
  blue:  '#3b82f6',
  accent:'#00b4d8',
  muted: '#264060',
};

const gridColor  = 'rgba(30,51,71,0.8)';
const tickColor  = '#4d7a96';
const font       = "'DM Sans', sans-serif";

function baseChartOpts(horizontal = false) {
  const axis = horizontal
    ? { x: { ticks: { color: tickColor, font: { family: font, size: 11 } }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: { family: font, size: 11 }, maxRotation: 0 }, grid: { display: false } } }
    : { x: { ticks: { color: tickColor, font: { family: font, size: 11 }, maxRotation: 35, autoSkip: true, maxTicksLimit: 20 }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: { family: font, size: 11 } }, grid: { color: gridColor }, beginAtZero: true } };
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0d1b2e',
        borderColor: '#1e3347',
        borderWidth: 1,
        titleColor: '#e8f4f8',
        bodyColor: '#8aaec4',
        titleFont: { family: font, weight: '600', size: 13 },
        bodyFont: { family: font, size: 12 },
        padding: 10,
        callbacks: { label: ctx => '  ' + nf(ctx.parsed[horizontal ? 'x' : 'y']) }
      }
    },
    scales: axis
  };
}

function mkChart(id, type, labels, data, color, horizontal = false) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  const canvas = $(id);
  if (!canvas) return;
  const borderRadius = type === 'bar' ? 5 : 0;
  charts[id] = new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: type === 'line' ? 'rgba(0,180,216,0.08)' : color,
        borderColor: color,
        borderWidth: type === 'line' ? 2 : 0,
        borderRadius,
        fill: type === 'line',
        tension: 0.35,
        pointRadius: type === 'line' ? 3 : 0,
        pointHoverRadius: type === 'line' ? 5 : 0,
        pointBackgroundColor: color,
      }]
    },
    options: baseChartOpts(horizontal)
  });
}

// ── Login ────────────────────────────────────────────────────
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
    setTimeout(() => $('file-input') && null, 100);
  } else {
    err.classList.add('visible');
    $('inp-pass').value = '';
    $('inp-pass').focus();
  }
}

function logout() {
  currentUser = '';
  allData = []; filteredData = [];
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
  $('screen-dash').style.display = 'none';
  $('screen-dash').classList.remove('active');
  $('screen-login').classList.add('active');
  $('inp-user').value = '';
  $('inp-pass').value = '';
  $('dash-content').style.display = 'none';
  $('upload-prompt').style.display = 'flex';
  $('topbar-client').textContent = 'No data loaded';
  $('login-error').classList.remove('visible');
}

function togglePw() {
  const inp = $('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// Enter key support on login
document.addEventListener('DOMContentLoaded', () => {
  ['inp-user', 'inp-pass'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });
});

// ── Sidebar / Navigation ─────────────────────────────────────
let sidebarOpen = true;

function toggleSidebar() {
  const sb = $('sidebar');
  if (window.innerWidth <= 768) {
    sb.classList.toggle('mobile-open');
  } else {
    sidebarOpen = !sidebarOpen;
    sb.classList.toggle('collapsed', !sidebarOpen);
  }
}

function switchView(btn, viewId) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  btn.classList.add('active');
  const view = $('view-' + viewId);
  if (view) {
    view.classList.add('active');
    renderView(viewId);
  }
  // Close sidebar on mobile after click
  if (window.innerWidth <= 768) $('sidebar').classList.remove('mobile-open');
}

// ── File Parsing ─────────────────────────────────────────────
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      allData = [];
      wb.SheetNames.forEach(sn => parseSheet(wb.Sheets[sn], sn));
      if (allData.length === 0) {
        alert('No inspection data found. Please check the file format.');
        return;
      }
      onDataLoaded(file.name);
    } catch (err) {
      alert('Error reading file: ' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}

function parseSheet(ws, sheetName) {
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!raw || raw.length < 2) return;

  // Find the header row (contains "Inspector" and "Inspection Date")
  let headerRow = -1;
  for (let i = 0; i < Math.min(raw.length, 6); i++) {
    const row = raw[i].map(c => String(c).toLowerCase());
    if (row.some(c => c.includes('inspector')) && row.some(c => c.includes('inspection date') || c.includes('date'))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow < 0) return;

  const headers = raw[headerRow].map(c => String(c).trim().toLowerCase());
  const idx = {
    date:     headers.findIndex(h => h.includes('inspection date') || h === 'date'),
    insp:     headers.findIndex(h => h.includes('inspector')),
    na:       headers.findIndex(h => h === 'n_a' || h === 'na'),
    nf:       headers.findIndex(h => h === 'n_f' || h === 'nf'),
    dg:       headers.findIndex(h => h === 'd_g' || h === 'dg'),
    dm:       headers.findIndex(h => h === 'dm'),
    location: headers.findIndex(h => h.includes('location') || h === 'code'),
    store:    headers.findIndex(h => h.includes('store name')),
  };

  for (let i = headerRow + 1; i < raw.length; i++) {
    const r = raw[i];
    const insp = String(r[idx.insp] || '').trim();
    if (!insp || insp.toLowerCase() === 'inspector' || insp === '') continue;

    // Parse date
    let dateStr = '';
    const dval = r[idx.date];
    if (typeof dval === 'number' && dval > 40000) {
      const d = XLSX.SSF.parse_date_code(dval);
      if (d) dateStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } else {
      const s = String(dval || '').trim();
      // Handle DD/MM/YYYY
      const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dm) dateStr = `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
      else dateStr = s.slice(0, 10);
    }
    if (!dateStr || dateStr.length < 7) continue;

    const loc = String(r[idx.location] || '').trim() || String(r[idx.store] || '').trim() || 'Unknown';

    allData.push({
      date:      dateStr,
      month:     dateStr.slice(0, 7),
      inspector: insp,
      na:        parseFloat(r[idx.na]) || 0,
      nf:        parseFloat(r[idx.nf]) || 0,
      dg:        parseFloat(r[idx.dg]) || 0,
      dm:        parseFloat(r[idx.dm]) || 0,
      location:  loc,
      client:    sheetName,
    });
  }
}

function onDataLoaded(filename) {
  const clients = [...new Set(allData.map(d => d.client))];
  $('topbar-client').textContent = 'Client: ' + clients.join(', ');
  populateFilters();
  filteredData = [...allData];
  $('upload-prompt').style.display = 'none';
  $('dash-content').style.display = 'block';
  $('record-count').textContent = nf(filteredData.length) + ' records';
  renderAll();
}

// ── Filters ──────────────────────────────────────────────────
function populateFilters() {
  const clients    = [...new Set(allData.map(d => d.client))].sort();
  const checkers   = [...new Set(allData.map(d => d.inspector))].sort();
  const months     = [...new Set(allData.map(d => d.month))].filter(Boolean).sort();
  const locations  = [...new Set(allData.map(d => d.location))].filter(l => l && l !== 'Unknown').sort();

  const setOpts = (id, arr) => {
    const el = $(id);
    const existing = el.value;
    el.innerHTML = el.options[0].outerHTML + arr.map(v => `<option value="${v}">${v}</option>`).join('');
    if (arr.includes(existing)) el.value = existing;
  };
  setOpts('filter-client',   clients);
  setOpts('filter-checker',  checkers);
  setOpts('filter-month',    months);
  setOpts('filter-location', locations);
}

function applyFilters() {
  const fk = $('filter-client').value;
  const fc = $('filter-checker').value;
  const fm = $('filter-month').value;
  const fl = $('filter-location').value;
  filteredData = allData.filter(d =>
    (fk === 'all' || d.client === fk) &&
    (fc === 'all' || d.inspector === fc) &&
    (fm === 'all' || d.month === fm) &&
    (fl === 'all' || d.location === fl)
  );
  $('record-count').textContent = nf(filteredData.length) + ' records';
  renderAll();
}

// ── Aggregations ─────────────────────────────────────────────
function byChecker(field) {
  const checkers = [...new Set(filteredData.map(d => d.inspector))].sort();
  return {
    labels: checkers,
    values: checkers.map(c => filteredData.filter(d => d.inspector === c).reduce((a, d) => a + d[field], 0))
  };
}

function byDate() {
  const dates = [...new Set(filteredData.map(d => d.date))].sort();
  return {
    labels: dates.map(d => d.slice(5)), // MM-DD
    full:   dates,
    values: dates.map(dt => filteredData.filter(d => d.date === dt).length)
  };
}

function byLocation() {
  const locs = [...new Set(filteredData.map(d => d.location))].filter(Boolean).sort();
  return {
    labels: locs,
    values: locs.map(l => filteredData.filter(d => d.location === l).length)
  };
}

function fieldByDate(field) {
  const dates = [...new Set(filteredData.map(d => d.date))].sort();
  return {
    labels: dates.map(d => d.slice(5)),
    values: dates.map(dt => filteredData.filter(d => d.date === dt).reduce((a, d) => a + d[field], 0))
  };
}

// ── Render ───────────────────────────────────────────────────
function renderAll() {
  renderStats();
  const activeView = document.querySelector('.nav-item.active');
  if (activeView) renderView(activeView.dataset.view || 'overview');
  else renderView('overview');
}

function renderStats() {
  const totalDM   = filteredData.reduce((a, d) => a + d.dm, 0);
  const totalNA   = filteredData.reduce((a, d) => a + d.na, 0);
  const totalDG   = filteredData.reduce((a, d) => a + d.dg, 0);
  const checkers  = new Set(filteredData.map(d => d.inspector)).size;
  const days      = new Set(filteredData.map(d => d.date)).size;
  $('stats-row').innerHTML = `
    <div class="stat-card c-accent"><div class="stat-label">Total Records</div><div class="stat-value">${nf(filteredData.length)}</div><div class="stat-sub">Inspection entries</div></div>
    <div class="stat-card c-green"><div class="stat-label">Total DM</div><div class="stat-value">${nf(totalDM)}</div><div class="stat-sub">Marks inspected</div></div>
    <div class="stat-card c-amber"><div class="stat-label">Total N/A</div><div class="stat-value">${nf(totalNA)}</div><div class="stat-sub">Not accessible</div></div>
    <div class="stat-card c-red"><div class="stat-label">Total DG</div><div class="stat-value">${nf(totalDG)}</div><div class="stat-sub">Damaged marks</div></div>
    <div class="stat-card c-teal"><div class="stat-label">Checkers</div><div class="stat-value">${checkers}</div><div class="stat-sub">Active inspectors</div></div>
    <div class="stat-card c-blue"><div class="stat-label">Active Days</div><div class="stat-value">${days}</div><div class="stat-sub">Inspection days</div></div>
  `;
}

function renderView(viewId) {
  switch (viewId) {
    case 'overview': renderOverview(); break;
    case 'dm':       renderDMView();   break;
    case 'na':       renderNAView();   break;
    case 'dg':       renderDGView();   break;
    case 'stores':   renderStores();   break;
  }
}

function renderOverview() {
  const dm   = byChecker('dm');
  const na   = byChecker('na');
  const dg   = byChecker('dg');
  const date = byDate();

  const checkers = dm.labels;
  const totalVals = checkers.map((_, i) => dm.values[i] + na.values[i] + dg.values[i]);

  mkChart('c-dm-ov',    'bar',  checkers, dm.values,    PALETTE.green);
  mkChart('c-na-ov',    'bar',  checkers, na.values,    PALETTE.amber);
  mkChart('c-dg-ov',    'bar',  checkers, dg.values,    PALETTE.red);
  mkChart('c-total-ov', 'bar',  checkers, totalVals,    PALETTE.blue);
  mkChart('c-date-ov',  'line', date.labels, date.values, PALETTE.accent);
}

function renderDMView() {
  const dm    = byChecker('dm');
  const trend = fieldByDate('dm');
  // Use horizontal bars for detail view (easier to read long names)
  const ht = Math.max(dm.labels.length * 42 + 60, 200);
  const wrap = $('dm-chart-area');
  if (wrap) wrap.style.height = ht + 'px';
  mkChart('c-dm-detail', 'bar', dm.labels, dm.values, PALETTE.green, true);
  mkChart('c-dm-trend',  'line', trend.labels, trend.values, PALETTE.green);
}

function renderNAView() {
  const na    = byChecker('na');
  const trend = fieldByDate('na');
  mkChart('c-na-detail', 'bar', na.labels, na.values, PALETTE.amber, true);
  mkChart('c-na-trend',  'line', trend.labels, trend.values, PALETTE.amber);
}

function renderDGView() {
  const dg    = byChecker('dg');
  const trend = fieldByDate('dg');
  mkChart('c-dg-detail', 'bar', dg.labels, dg.values, PALETTE.red, true);
  mkChart('c-dg-trend',  'line', trend.labels, trend.values, PALETTE.red);
}

function renderStores() {
  const date = byDate();
  const loc  = byLocation();
  const ht   = Math.max(loc.labels.length * 36 + 60, 200);
  const wrap = $('loc-chart-area');
  if (wrap) wrap.style.height = ht + 'px';
  mkChart('c-stores-date', 'line', date.labels, date.values, PALETTE.teal);
  mkChart('c-stores-loc',  'bar',  loc.labels,  loc.values,  PALETTE.accent, true);
}

// ── PDF Export ───────────────────────────────────────────────
async function downloadPDF() {
  if (!filteredData.length) { alert('No data loaded.'); return; }
  const overlay = $('pdf-overlay');
  overlay.style.display = 'flex';

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    // Header
    pdf.setFillColor(7, 17, 30);
    pdf.rect(0, 0, pw, ph, 'F');
    pdf.setFillColor(13, 27, 46);
    pdf.rect(0, 0, pw, 18, 'F');
    pdf.setTextColor(0, 180, 216);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATAMARK — Checker Intelligence Report', 14, 12);
    pdf.setTextColor(77, 122, 150);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const now = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
    pdf.text(`Generated: ${now}   Records: ${nf(filteredData.length)}`, pw - 14, 12, { align: 'right' });

    // Capture charts
    const chartAreas = document.querySelectorAll('.chart-area');
    let x = 14, y = 24, rowH = 0;
    const maxW = pw - 28;

    for (const area of chartAreas) {
      const card = area.closest('.chart-card');
      if (!card || card.closest('.view:not(.active)')) continue;
      const titleEl = card.querySelector('.chart-card-title');
      const title = titleEl ? titleEl.textContent : '';

      try {
        const canvas2 = await html2canvas(area, {
          backgroundColor: '#0d1b2e',
          scale: 1.5,
          logging: false,
          useCORS: true,
        });
        const imgData = canvas2.toDataURL('image/png');
        const iw = Math.min(maxW / 2 - 5, maxW);
        const ih = (canvas2.height / canvas2.width) * iw;

        if (x + iw > pw - 14) { x = 14; y += rowH + 10; rowH = 0; }
        if (y + ih + 10 > ph) { pdf.addPage(); pdf.setFillColor(7,17,30); pdf.rect(0,0,pw,ph,'F'); y = 14; x = 14; rowH = 0; }

        pdf.setTextColor(138, 174, 196);
        pdf.setFontSize(8);
        pdf.text(title, x, y);
        pdf.setFillColor(13,27,46);
        pdf.roundedRect(x, y + 2, iw, ih, 2, 2, 'F');
        pdf.addImage(imgData, 'PNG', x, y + 2, iw, ih);
        rowH = Math.max(rowH, ih + 8);
        x += iw + 10;
      } catch (e) { /* skip failed capture */ }
    }

    const clients = [...new Set(allData.map(d => d.client))].join(', ');
    const fname = `DATAMARK_Checker_Report_${clients.replace(/\s/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
    pdf.save(fname);
  } catch (err) {
    alert('PDF generation failed: ' + err.message);
  } finally {
    overlay.style.display = 'none';
  }
}
