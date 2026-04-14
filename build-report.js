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
  if (msg.includes('TS2339')) return "Use variantOptionQualifiers?.[0]?.value";
  if (msg.includes('TS2554')) return "Check missing arguments";
  if (msg.includes('TS2724')) return "Method renamed";
  return "Check manually";
}

function getType(msg) {
  const m = msg.match(/TS\d+/);
  return m ? m[0] : 'GENERAL';
}

function getCategory(file) {
  if (!file || file === 'Unknown') return 'Unknown';
  const p = file.split('/');
  const i = p.indexOf('app');
  if (i !== -1) return p[i+2] ? `${p[i+1]}/${p[i+2]}` : p[i+1];
  return 'Other';
}

function getSource(msg, file) {
  if (msg.includes('@spartacus')) return 'Spartacus';
  if (msg.includes('@angular/material')) return 'Angular Material';
  if (msg.includes('@angular')) return 'Angular';
  if (msg.includes('@ngrx')) return 'NgRx';
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

      const m = l.match(/((src|[A-Za-z]:\\|\/).*?\.(ts|html|js)):(\d+):(\d+)/);
      if (m) {
        file = m[1];
        lineNo = `${m[4]}:${m[5]}`;
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
      search: (msg + file + getCategory(file)).toLowerCase()
    });
  }
}

// ----------------------
// Stats
// ----------------------
const totalErrors = items.filter(i => i.level === 'ERROR').length;
const totalWarnings = items.filter(i => i.level === 'WARNING').length;
const totalFiles = [...new Set(items.map(i => i.file))].length;

const categories = [...new Set(items.map(i => i.category))];
const files = [...new Set(items.map(i => i.file))];
const sources = [...new Set(items.map(i => i.source))];

// ----------------------
// HTML
// ----------------------
const html = `
<!DOCTYPE html>
<html>
<head>
<title>Build Dashboard</title>

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<style>
pre { font-size:12px;background:#f1f3f5;padding:10px;border-radius:6px }
.row-item:hover { background:#f8f9fa }
.sticky { position:sticky;top:0;z-index:10 }
</style>

</head>

<body class="bg-light">

<div class="container-fluid py-3">

<h4>🚀 Build Dashboard</h4>

<!-- KPI -->
<div class="row text-center mb-2">
<div class="col"><div class="card p-2"><small>Errors</small><b class="text-danger">${totalErrors}</b></div></div>
<div class="col"><div class="card p-2"><small>Warnings</small><b class="text-warning">${totalWarnings}</b></div></div>
<div class="col"><div class="card p-2"><small>Files</small><b>${totalFiles}</b></div></div>
<div class="col"><div class="card p-2"><small>Status</small><b>${totalErrors ? '❌ Failed':'✅ Success'}</b></div></div>
</div>

<!-- FILTER -->
<div class="card p-2 mb-2 sticky">

<div class="row g-2">

<div class="col"><input id="search" class="form-control form-control-sm" placeholder="Search"></div>

<div class="col">
<select id="category" class="form-select form-select-sm">
<option value="">Category</option>
${categories.map(c=>`<option>${c}</option>`).join('')}
</select>
</div>

<div class="col">
<select id="type" class="form-select form-select-sm">
<option value="">Type</option>
<option>ERROR</option>
<option>WARNING</option>
</select>
</div>

<div class="col">
<select id="file" class="form-select form-select-sm">
<option value="">File</option>
${files.map(f=>`<option>${f}</option>`).join('')}
</select>
</div>

<div class="col">
<select id="source" class="form-select form-select-sm">
<option value="">Source</option>
${sources.map(s=>`<option>${s}</option>`).join('')}
</select>
</div>

<div class="col-auto d-flex gap-1">
<button onclick="apply()" class="btn btn-primary btn-sm">Apply</button>
<button onclick="reset()" class="btn btn-outline-dark btn-sm">Reset</button>
<button onclick="save()" class="btn btn-info btn-sm">Save</button>
<button onclick="load()" class="btn btn-secondary btn-sm">Load</button>
<button onclick="exportExcel(false)" class="btn btn-success btn-sm">Export All</button>
<button onclick="exportExcel(true)" class="btn btn-success btn-sm">Export Filtered</button>
</div>

</div>

</div>

<div id="stats" class="small mb-2"></div>

<!-- TABLE -->
<div class="table-responsive">
<table class="table table-sm table-hover">

<thead>
<tr>
<th>Type</th><th>Category</th><th>Source</th><th>File</th><th>Line</th><th>Error</th>
</tr>
</thead>

<tbody id="tbody"></tbody>

</table>
</div>

</div>

<script>

const items = ${JSON.stringify(items)};
let current = [...items];

function render(data){

 current = data;

 let html = '';

 data.forEach(e=>{

 html += \`
 <tr class="row-item">
 <td>\${e.type}</td>
 <td>\${e.category}</td>
 <td>\${e.source}</td>
 <td>\${e.file}</td>
 <td>\${e.line}</td>
 <td class="text-danger small">\${e.message}</td>
 </tr>
 \`;

 });

 document.getElementById('tbody').innerHTML = html;
 document.getElementById('stats').innerText = "Showing "+data.length+" results";
}

// ----------------------
// FILTER
// ----------------------
function apply(){

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

 render(filtered);
}

function reset(){
 document.querySelectorAll('input,select').forEach(e=>e.value='');
 render(items);
}

// ----------------------
// SAVE / LOAD
// ----------------------
function save(){
 localStorage.setItem('filters', JSON.stringify({
  s:search.value,c:category.value,t:type.value,f:file.value,src:source.value
 }));
}

function load(){
 const d = JSON.parse(localStorage.getItem('filters')||'{}');
 search.value=d.s||'';
 category.value=d.c||'';
 type.value=d.t||'';
 file.value=d.f||'';
 source.value=d.src||'';
 apply();
}

// ----------------------
// EXPORT EXCEL
// ----------------------
function exportExcel(filtered){

 const data = (filtered ? current : items).map(e => ({
   Type: e.type,
   Level: e.level,
   Category: e.category,
   Source: e.source,
   File: e.file,
   Line: e.line,
   Error: e.message,
   Suggestion: e.suggestion
 }));

 let csv = Object.keys(data[0]).join(',') + '\\n';

 data.forEach(r=>{
   csv += Object.values(r)
     .map(v => '"' + String(v).replace(/"/g,'""') + '"')
     .join(',') + '\\n';
 });

 const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
 const link = document.createElement('a');

 link.href = URL.createObjectURL(blob);
 link.download = 'build-report.csv';
 link.click();
}

render(items);

</script>

</body>
</html>
`;

fs.writeFileSync('build-report.html', html);

console.log('🚀 FINAL v9.2 WITH EXCEL READY');
