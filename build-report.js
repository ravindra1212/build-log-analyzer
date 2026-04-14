const fs = require('fs');

const log = fs.readFileSync('build.log', 'utf-8');

function cleanLog(line) {
  return line.replace(/\x1B\[[0-9;]*m/g, '');
}

const lines = log.split('\n').map(cleanLog);

// ----------------------
// Helpers
// ----------------------
function getSuggestion(msg) {
  if (msg.includes('TS2339')) return "Use variantOptionQualifiers";
  if (msg.includes('TS2554')) return "Check arguments";
  if (msg.includes('TS2724')) return "Method renamed";
  return "Check error";
}

function getType(msg) {
  const m = msg.match(/TS\d+/);
  return m ? m[0] : 'GENERAL';
}

function getCategory(file) {
  if (!file || file === 'Unknown') return 'Other';
  const p = file.split('/');
  const i = p.indexOf('app');
  if (i !== -1) return p[i+2] ? `${p[i+1]}/${p[i+2]}` : p[i+1];
  return 'Other';
}

function getSource(msg, file) {
  if (msg.includes('@spartacus')) return 'Spartacus';
  if (msg.includes('@angular')) return 'Angular';
  if (msg.includes('ngx-')) return '3rd Party';
  if (file.includes('src/app')) return 'App Code';
  return 'Other';
}

// ----------------------
// Extract
// ----------------------
const items = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('ERROR') || lines[i].includes('WARNING')) {

    let file = 'Unknown';
    let lineNo = '-';

    const ctx = [lines[i-2], lines[i-1], lines[i], lines[i+1], lines[i+2]];

    for (const l of ctx) {
      if (!l) continue;

      const m = l.match(/((?:src|[A-Za-z]:\\|\/).*?\.(ts|html|js)):(\d+):(\d+)/);

      if (m) {
        file = m[1];
        lineNo = `${m[2]}:${m[3]}`;
        break;
      }
    }

    const msg = lines[i];

    items.push({
      file,
      line: lineNo,
      message: msg,
      suggestion: getSuggestion(msg),
      type: getType(msg),
      category: getCategory(file),
      source: getSource(msg, file),
      level: msg.includes('WARNING') ? 'WARNING' : 'ERROR',
      context: ctx.join('\n'),
      search: (msg + file).toLowerCase()
    });
  }
}

// ----------------------
// Aggregations
// ----------------------
const fileCount = {};
const typeCount = {};

items.forEach(e => {
  fileCount[e.file] = (fileCount[e.file] || 0) + 1;
  typeCount[e.type] = (typeCount[e.type] || 0) + 1;
});

const topFiles = Object.entries(fileCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

const categories = [...new Set(items.map(i => i.category))];
const files = [...new Set(items.map(i => i.file))];
const sources = [...new Set(items.map(i => i.source))];

const totalErrors = items.filter(i=>i.level==='ERROR').length;
const totalWarnings = items.filter(i=>i.level==='WARNING').length;
const totalFiles = [...new Set(items.map(i=>i.file))].length;

// ----------------------
// HTML
// ----------------------
const html = `
<!DOCTYPE html>
<html>
<head>
<title>Toko Build Dashboard</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>

<style>
body { background:#f5f6f8 }

.wrapper { display:flex }

.sidebar {
  width:320px;
  height:100vh;
  overflow:auto;
  background:#fff;
  border-right:1px solid #ddd;
  padding:12px;
}

.sidebar.hidden {
  width:0;
  overflow:hidden;
  padding:0;
  border:none;
}

.main { flex:1; padding:20px }

.card { margin-bottom:10px }

.btn {
  padding:4px 10px !important;
  font-size:12px;
  margin:2px;
}

.badge { font-size:11px }

details { margin-top:5px }

.count-bar {
  font-size:13px;
  margin:10px 0;
  color:#555;
}
</style>

</head>

<body>

<div class="wrapper">

<!-- SIDEBAR -->
<div class="sidebar">

<h6>Filters</h6>

<input id="search" class="form-control mb-2" placeholder="Search">

<select id="category" class="form-select mb-2">
<option value="">Category</option>
${categories.map(c=>`<option>${c}</option>`).join('')}
</select>

<select id="type" class="form-select mb-2">
<option value="">Type</option>
<option>ERROR</option>
<option>WARNING</option>
</select>

<select id="file" class="form-select mb-2">
<option value="">File</option>
${files.map(f=>`<option>${f}</option>`).join('')}
</select>

<select id="source" class="form-select mb-2">
<option value="">Source</option>
${sources.map(s=>`<option>${s}</option>`).join('')}
</select>

<div>
<button onclick="applyFilters()" class="btn btn-primary btn-sm">Apply</button>
<button onclick="resetFilters()" class="btn btn-secondary btn-sm">Reset</button>
<button onclick="saveFilters()" class="btn btn-info btn-sm">Save</button>
<button onclick="loadFilters()" class="btn btn-dark btn-sm">Load</button>
</div>

<hr/>

<h6>Error Types</h6>
${Object.entries(typeCount).map(([t,c])=>`
<button onclick="filterType('${t}')" class="btn btn-sm btn-dark">${t} (${c})</button>
`).join('')}

<hr/>

<h6>Top Files</h6>
${topFiles.map(([f,c])=>`
<div class="d-flex justify-content-between small">
<span>${f.split('/').pop()}</span>
<span class="badge bg-danger">${c}</span>
</div>
`).join('')}

</div>

<!-- MAIN -->
<div class="main">

<h4>Toko Build Dashboard</h4>

<!-- BUILD SUMMARY -->
<div class="row text-center mb-3">

<div class="col">
<div class="card shadow-sm p-2">
<small>Errors</small>
<h5 class="text-danger">${totalErrors}</h5>
</div>
</div>

<div class="col">
<div class="card shadow-sm p-2">
<small>Warnings</small>
<h5 class="text-warning">${totalWarnings}</h5>
</div>
</div>

<div class="col">
<div class="card shadow-sm p-2">
<small>Files</small>
<h5>${totalFiles}</h5>
</div>
</div>

<div class="col">
<div class="card shadow-sm p-2">
<small>Status</small>
<h5 class="${totalErrors ? 'text-danger':'text-success'}">
${totalErrors ? 'Failed':'Success'}
</h5>
</div>
</div>

</div>

<button onclick="toggleSidebar()" class="btn btn-outline-dark btn-sm">Toggle Panel</button>
<button onclick="exportExcel()" class="btn btn-success btn-sm">Export</button>

<div id="counts" class="count-bar"></div>

<div id="list"></div>

</div>

</div>

<script>

const items = ${JSON.stringify(items)};
let current = [...items];

// INIT
window.onload = () => {
  loadFilters();
  applyFilters();
};

// TOGGLE
function toggleSidebar(){
 document.querySelector('.sidebar').classList.toggle('hidden');
}

// COPY
function copyText(t){
 navigator.clipboard.writeText(t);
}

// FILTER
function applyFilters(){

 const s = search.value.toLowerCase();
 const c = category.value;
 const t = type.value;
 const f = file.value;
 const src = source.value;

 const filtered = items.filter(i =>
   (!c || i.category === c) &&
   (!t || i.level === t) &&
   (!f || i.file === f) &&
   (!src || i.source === src) &&
   (!s || i.search.includes(s))
 );

 saveFilters();
 render(filtered);
}

function resetFilters(){
 document.querySelectorAll('input,select').forEach(e=>e.value='');
 render(items);
}

function filterType(t){
 search.value = t;
 applyFilters();
}

// SAVE / LOAD
function saveFilters(){
 localStorage.setItem('filters', JSON.stringify({
  s:search.value,
  c:category.value,
  t:type.value,
  f:file.value,
  src:source.value
 }));
}

function loadFilters(){
 const d = JSON.parse(localStorage.getItem('filters')||'{}');
 search.value=d.s||'';
 category.value=d.c||'';
 type.value=d.t||'';
 file.value=d.f||'';
 source.value=d.src||'';
}

// RENDER (COLOR THEME INCLUDED)
function render(data){

 current = data;

 document.getElementById('counts').innerText =
  "Showing " + data.length + " of " + items.length + " records";

 const grouped = {};

 data.forEach(e=>{
   const key = e.type + e.message;
   if(!grouped[key]) grouped[key] = [];
   grouped[key].push(e);
 });

 let html = '';

 Object.values(grouped).forEach(group=>{
 const e = group[0];

 const isWarning = e.level === 'WARNING';
 const borderColor = isWarning ? '#f59e0b' : '#dc3545';
 const textColor = isWarning ? 'text-warning' : 'text-danger';
 const badgeColor = isWarning ? 'bg-warning text-dark' : 'bg-danger';

 html += \`
 <div class="card shadow-sm mb-3" style="border-left:4px solid \${borderColor}; border-radius:10px;">

 <div class="card-body">

 <div class="d-flex justify-content-between mb-2">

 <div>
 <b>\${e.type}</b>
 <span class="badge \${badgeColor} ms-2">\${group.length}</span>
 </div>

 <div>
 <button class="btn btn-outline-secondary btn-sm" onclick="copyText('\${e.file}')">Copy File</button>
 <button class="btn btn-outline-secondary btn-sm" onclick="copyText('\${e.message}')">Copy Error</button>
 <button class="btn btn-outline-secondary btn-sm" onclick="copyText('\${e.category}')">Copy Category</button>
 <a href="vscode://file/\${e.file}:\${e.line}" class="btn btn-outline-primary btn-sm">Open</a>
 </div>

 </div>

 <div class="\${textColor} mb-1">\${e.message}</div>

 <div class="text-success small mb-2">💡 \${e.suggestion}</div>

 <details>
 <summary class="small fw-semibold">Locations</summary>
 <div class="mt-2 ps-2">
 \${group.map(x=>\`<div class="small text-muted">📁 \${x.file} (\${x.line})</div>\`).join('')}
 </div>
 </details>

 </div>

 </div>
 \`;
 });

 document.getElementById('list').innerHTML = html;
}

// XLSX
function exportExcel(){
 const ws = XLSX.utils.json_to_sheet(current);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Errors");
 XLSX.writeFile(wb, "build-report.xlsx");
}

</script>

</body>
</html>
`;

fs.writeFileSync('build-report.html', html);

console.log('Build Report Generated...!!');
