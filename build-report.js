const fs = require('fs');

const log = fs.readFileSync('build.log', 'utf-8');

function cleanLog(line) {
  return line.replace(/\x1B\[[0-9;]*m/g, '');
}

const lines = log.split('\n').map(cleanLog);

// =============================================
// ERROR TYPE DETECTION SYSTEM
// =============================================

/**
 * Detects error type based on error message patterns
 * Types: SYNTAX_ERROR, IMPORT_ERROR, MODULE_ERROR, TYPE_ERROR, 
 *        RUNTIME_ERROR, DEPENDENCY_ERROR, CONFIG_ERROR, TEMPLATE_ERROR, WARNING
 */
function detectErrorType(msg, file) {
  // SYNTAX ERROR - missing tokens, unexpected characters
  if (msg.match(/TS1005|TS1109|Expected|unexpected|Unexpected token|syntax error/i)) {
    return 'SYNTAX_ERROR';
  }
  
  // IMPORT ERROR - missing modules, cannot find
  if (msg.match(/TS2307|cannot find module|Cannot find|Module not found|import/i)) {
    return 'IMPORT_ERROR';
  }
  
  // MODULE ERROR - module issues, exports, decorators
  if (msg.match(/TS1030|TS2564|decorator|module|export|NgModule/i)) {
    return 'MODULE_ERROR';
  }
  
  // TYPE ERROR - type mismatch, assignment, incompatibility
  if (msg.match(/TS2339|TS2322|TS2345|TS2363|type|assignable|property.*does not exist|not assignable/i)) {
    return 'TYPE_ERROR';
  }
  
  // RUNTIME ERROR - reference, undefined, null
  if (msg.match(/TS2304|TS2693|ReferenceError|is not defined|Cannot find name|undefined|null/i)) {
    return 'RUNTIME_ERROR';
  }
  
  // DEPENDENCY ERROR - npm, peer, package
  if (msg.match(/peer dependency|npm|package|dependency|peerDependencies/i)) {
    return 'DEPENDENCY_ERROR';
  }
  
  // CONFIG ERROR - tsconfig, angular.json, config
  if (msg.match(/config|tsconfig|angular\.json|environment|configuration/i)) {
    return 'CONFIG_ERROR';
  }
  
  // TEMPLATE ERROR - HTML, template
  if (msg.match(/template|html|\.html|ng-|component.*template/i) || file.endsWith('.html')) {
    return 'TEMPLATE_ERROR';
  }
  
  // WARNING
  if (msg.includes('WARNING')) {
    return 'WARNING';
  }
  
  // DEFAULT
  return 'OTHER';
}

// Enhanced TS Error Mappings with type detection
const errorSuggestions = {
  'TS2339': { 
    type: 'TYPE_ERROR',
    severity: 'HIGH', 
    suggestion: 'Property does not exist on type',
    fix: 'Check type definition and property name spelling'
  },
  'TS2554': { 
    type: 'TYPE_ERROR',
    severity: 'HIGH', 
    suggestion: 'Expected X arguments but got Y',
    fix: 'Verify function parameters and argument count'
  },
  'TS2724': { 
    type: 'MODULE_ERROR',
    severity: 'MEDIUM', 
    suggestion: 'This context is not assignable',
    fix: 'Check method binding or context'
  },
  'TS7053': { 
    type: 'TYPE_ERROR',
    severity: 'MEDIUM', 
    suggestion: 'Element implicitly has any type',
    fix: 'Add explicit type annotations'
  },
  'TS2349': { 
    type: 'TYPE_ERROR',
    severity: 'HIGH', 
    suggestion: 'Expression is not callable',
    fix: 'Verify the variable is a function'
  },
  'TS1109': { 
    type: 'SYNTAX_ERROR',
    severity: 'HIGH', 
    suggestion: 'Expression expected',
    fix: 'Check for missing operators or brackets'
  },
  'TS2304': { 
    type: 'RUNTIME_ERROR',
    severity: 'HIGH', 
    suggestion: 'Cannot find name',
    fix: 'Import module or declare variable'
  },
  'TS2307': { 
    type: 'IMPORT_ERROR',
    severity: 'HIGH', 
    suggestion: 'Cannot find module',
    fix: 'Install missing package or fix import path'
  },
  'TS2322': { 
    type: 'TYPE_ERROR',
    severity: 'HIGH', 
    suggestion: 'Type not assignable to type',
    fix: 'Convert or cast to compatible type'
  },
  'TS2403': { 
    type: 'MODULE_ERROR',
    severity: 'MEDIUM', 
    suggestion: 'Variable declarations must have same type',
    fix: 'Use consistent types'
  },
  'TS2363': { 
    type: 'TYPE_ERROR',
    severity: 'MEDIUM', 
    suggestion: 'Right side must be number',
    fix: 'Ensure arithmetic operands are numeric'
  },
  'TS1005': { 
    type: 'SYNTAX_ERROR',
    severity: 'HIGH', 
    suggestion: 'Expected token',
    fix: 'Check for missing semicolons or brackets'
  },
  'TS2693': { 
    type: 'IMPORT_ERROR',
    severity: 'HIGH', 
    suggestion: 'Cannot find namespace',
    fix: 'Import the required module'
  },
  'TS1030': { 
    type: 'MODULE_ERROR',
    severity: 'MEDIUM', 
    suggestion: 'Static members cannot reference class type parameters',
    fix: 'Remove type parameter from static context'
  },
  'TS2507': { 
    type: 'TYPE_ERROR',
    severity: 'HIGH', 
    suggestion: 'Cannot create instance of abstract class',
    fix: 'Create concrete class extending abstract class'
  },
};

function getSuggestion(msg) {
  const match = msg.match(/TS(\d+)/);
  if (match) {
    const code = 'TS' + match[1];
    return errorSuggestions[code] || { 
      type: 'OTHER',
      suggestion: 'Check error documentation', 
      severity: 'LOW', 
      fix: 'Review error message'
    };
  }
  return { 
    type: 'OTHER',
    suggestion: 'Check error details', 
    severity: 'LOW', 
    fix: 'Review logs'
  };
}

function getType(msg) {
  const m = msg.match(/TS\d+/);
  return m ? m[0] : 'GENERAL';
}

function getSeverity(msg) {
  const suggestion = getSuggestion(msg);
  return suggestion.severity || 'LOW';
}

function getErrorType(msg, file) {
  const suggestion = getSuggestion(msg);
  return suggestion.type || detectErrorType(msg, file);
}

function getCategory(file) {
  if (!file || file === 'Unknown') return 'Other';
  const parts = file.split('/');
  const appIndex = parts.indexOf('app');
  if (appIndex !== -1) {
    const moduleName = parts[appIndex + 1] || 'App';
    if (file.includes('.component')) return moduleName + ' / Component';
    if (file.includes('.module')) return moduleName + ' / Module';
    if (file.includes('.service')) return moduleName + ' / Service';
    if (file.includes('.pipe')) return moduleName + ' / Pipe';
    if (file.includes('.guard')) return moduleName + ' / Guard';
    if (file.includes('.interceptor')) return moduleName + ' / Interceptor';
    if (file.includes('.resolver')) return moduleName + ' / Resolver';
    if (file.includes('.directive')) return moduleName + ' / Directive';
    return moduleName;
  }
  return 'Other';
}

function getSource(msg, file) {
  if (msg.includes('@spartacus')) return 'Spartacus';
  if (msg.includes('@angular')) return 'Angular';
  if (msg.includes('ngx-')) return '3rd Party';
  if (file.includes('src/app')) return 'App Code';
  if (file.includes('node_modules')) return 'Dependencies';
  return 'Other';
}

function getIcon(errorType) {
  const icons = {
    'SYNTAX_ERROR': '🔴',
    'IMPORT_ERROR': '📦',
    'MODULE_ERROR': '⚙️',
    'TYPE_ERROR': '🔵',
    'RUNTIME_ERROR': '⚡',
    'DEPENDENCY_ERROR': '📚',
    'CONFIG_ERROR': '⚙️',
    'TEMPLATE_ERROR': '📄',
    'WARNING': '⚠️',
    'OTHER': '❓'
  };
  return icons[errorType] || '❓';
}

// =============================================
// PARSE ERRORS
// =============================================
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
    const suggestion = getSuggestion(msg);
    const errorType = getErrorType(msg, file);

    items.push({
      file,
      line: lineNo,
      message: msg,
      suggestion: suggestion.suggestion,
      fix: suggestion.fix,
      type: getType(msg),
      errorType: errorType,
      icon: getIcon(errorType),
      category: getCategory(file),
      source: getSource(msg, file),
      level: msg.includes('WARNING') ? 'WARNING' : 'ERROR',
      severity: getSeverity(msg),
      context: ctx.join('\n'),
      search: (msg + file).toLowerCase(),
      timestamp: new Date().toISOString()
    });
  }
}

// =============================================
// AGGREGATIONS
// =============================================
const fileCount = {};
const typeCount = {};
const categoryCount = {};
const errorTypeCount = {};
const severityCount = { HIGH: 0, MEDIUM: 0, LOW: 0 };
const sourceCount = {};

items.forEach(e => {
  fileCount[e.file] = (fileCount[e.file] || 0) + 1;
  typeCount[e.type] = (typeCount[e.type] || 0) + 1;
  categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
  errorTypeCount[e.errorType] = (errorTypeCount[e.errorType] || 0) + 1;
  severityCount[e.severity] = (severityCount[e.severity] || 0) + 1;
  sourceCount[e.source] = (sourceCount[e.source] || 0) + 1;
});

const topFiles = Object.entries(fileCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
const categories = [...new Set(items.map(i => i.category))];
const errorTypes = [...new Set(items.map(i => i.errorType))];
const files = [...new Set(items.map(i => i.file))];
const sources = [...new Set(items.map(i => i.source))];

const totalErrors = items.filter(i=>i.level==='ERROR').length;
const totalWarnings = items.filter(i=>i.level==='WARNING').length;
const totalFiles = [...new Set(items.map(i=>i.file))].length;
const totalIssues = items.length;
const healthScore = totalErrors === 0 ? 100 : Math.max(0, 100 - (totalErrors * 5));

// =============================================
// EXPORT FUNCTIONS
// =============================================
function exportToJSON() {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalIssues,
      totalErrors,
      totalWarnings,
      totalFiles,
      healthScore: healthScore.toFixed(1),
      severity: severityCount,
      errorTypes: errorTypeCount
    },
    items,
    analytics: {
      fileCount,
      typeCount,
      categoryCount,
      errorTypeCount,
      severityCount,
      sourceCount
    }
  };
  fs.writeFileSync('build-report.json', JSON.stringify(report, null, 2));
}

function exportToCSV() {
  let csv = 'Type,Error Type,Severity,File,Line,Category,Source,Message,Suggestion,Fix\n';
  items.forEach(item => {
    const escapedMsg = `"${item.message.replace(/"/g, '""')}"`;
    const escapedSug = `"${item.suggestion.replace(/"/g, '""')}"`;
    const escapedFix = `"${item.fix.replace(/"/g, '""')}"`;
    csv += `${item.type},${item.errorType},${item.severity},${item.file},${item.line},${item.category},${item.source},${escapedMsg},${escapedSug},${escapedFix}\n`;
  });
  fs.writeFileSync('build-report.csv', csv);
}

exportToJSON();
exportToCSV();

// =============================================
// HTML DASHBOARD
// =============================================
const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏗️ Build Log Analyzer - Enhanced Dashboard</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
  body { background: #f5f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
  .wrapper { display: flex; }
  .sidebar { width: 320px; height: 100vh; overflow-y: auto; background: #fff; border-right: 1px solid #ddd; padding: 12px; }
  .sidebar.hidden { width: 0; overflow: hidden; padding: 0; border: none; }
  .main { flex: 1; padding: 20px; overflow-y: auto; }
  .stat-card { text-align: center; padding: 15px; background: #fff; border-radius: 8px; }
  .stat-value { font-size: 28px; font-weight: bold; }
  .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
  .error-group { border-left: 5px solid; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
  .error-type-badge { 
    display: inline-block; 
    padding: 5px 10px; 
    border-radius: 4px; 
    font-size: 11px; 
    font-weight: 600;
    margin: 2px;
  }
  .syntax-error { background: #ffebee; color: #c62828; }
  .import-error { background: #e3f2fd; color: #0d47a1; }
  .module-error { background: #f3e5f5; color: #4a148c; }
  .type-error { background: #e8f5e9; color: #1b5e20; }
  .runtime-error { background: #fff3e0; color: #e65100; }
  .dependency-error { background: #fce4ec; color: #880e4f; }
  .config-error { background: #f1f8e9; color: #33691e; }
  .template-error { background: #ede7f6; color: #311b92; }
  .warning { background: #fffde7; color: #f57f17; }
  .sidebar h6 { margin-top: 15px; margin-bottom: 10px; font-weight: 600; }
  .btn { padding: 4px 10px !important; font-size: 12px; margin: 2px; }
  .count-bar { font-size: 13px; margin: 10px 0; color: #555; }
</style>
</head>
<body>

<div class="wrapper">

  <!-- SIDEBAR -->
  <div class="sidebar">
    <h6>🔍 Filters</h6>
    <input id="search" class="form-control mb-2" placeholder="Search...">

    <select id="errorType" class="form-select mb-2">
      <option value="">🔧 Error Type</option>
      ${errorTypes.map(t=>`<option>${t}</option>`).join('')}
    </select>

    <select id="severity" class="form-select mb-2">
      <option value="">⚡ Severity</option>
      <option>HIGH</option>
      <option>MEDIUM</option>
      <option>LOW</option>
    </select>

    <select id="category" class="form-select mb-2">
      <option value="">📁 Category</option>
      ${categories.map(c=>`<option>${c}</option>`).join('')}
    </select>

    <select id="type" class="form-select mb-2">
      <option value="">📊 Level</option>
      <option>ERROR</option>
      <option>WARNING</option>
    </select>

    <select id="source" class="form-select mb-2">
      <option value="">📦 Source</option>
      ${sources.map(s=>`<option>${s}</option>`).join('')}
    </select>

    <div class="mt-2">
      <button onclick="applyFilters()" class="btn btn-primary btn-sm">✅ Apply</button>
      <button onclick="resetFilters()" class="btn btn-secondary btn-sm">🔄 Reset</button>
    </div>

    <hr/>

    <h6>🎯 Error Types Breakdown</h6>
    ${Object.entries(errorTypeCount).map(([et,c])=>`
      <button onclick="filterErrorType('${et}')" class="btn btn-sm btn-outline-dark mb-1" style="width:100%;">
        ${getIcon(et)} ${et} <span class="badge bg-danger">${c}</span>
      </button>
    `).join('')}

    <hr/>

    <h6>🏆 Top Failing Files</h6>
    ${topFiles.map(([f,c])=>`
      <div class="d-flex justify-content-between small mb-1">
        <span class="text-truncate" title="${f}">${f.split('/').pop()}</span>
        <span class="badge bg-danger">${c}</span>
      </div>
    `).join('')}
  </div>

  <!-- MAIN -->
  <div class="main">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4>🏗️ Build Log Analyzer</h4>
      <button onclick="toggleSidebar()" class="btn btn-outline-dark btn-sm">☰ Toggle</button>
    </div>

    <!-- SUMMARY -->
    <div class="row mb-4">
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-value text-danger">${totalErrors}</div>
          <div class="stat-label">Errors</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-value text-warning">${totalWarnings}</div>
          <div class="stat-label">Warnings</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-value">${totalFiles}</div>
          <div class="stat-label">Files</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card">
          <div class="stat-value" style="color: ${healthScore >= 80 ? '#28a745' : healthScore >= 50 ? '#ff9800' : '#dc3545'}">${healthScore.toFixed(0)}%</div>
          <div class="stat-label">Health</div>
        </div>
      </div>
    </div>

    <div id="counts" class="alert alert-info"></div>
    <div id="list"></div>
  </div>

</div>

<script>
const items = ${JSON.stringify(items)};

window.onload = () => {
  applyFilters();
};

function getIcon(type) {
  const icons = {
    'SYNTAX_ERROR': '🔴',
    'IMPORT_ERROR': '📦',
    'MODULE_ERROR': '⚙️',
    'TYPE_ERROR': '🔵',
    'RUNTIME_ERROR': '⚡',
    'DEPENDENCY_ERROR': '📚',
    'CONFIG_ERROR': '⚙️',
    'TEMPLATE_ERROR': '📄',
    'WARNING': '⚠️'
  };
  return icons[type] || '❓';
}

function getBadgeClass(type) {
  const classes = {
    'SYNTAX_ERROR': 'syntax-error',
    'IMPORT_ERROR': 'import-error',
    'MODULE_ERROR': 'module-error',
    'TYPE_ERROR': 'type-error',
    'RUNTIME_ERROR': 'runtime-error',
    'DEPENDENCY_ERROR': 'dependency-error',
    'CONFIG_ERROR': 'config-error',
    'TEMPLATE_ERROR': 'template-error',
    'WARNING': 'warning'
  };
  return classes[type] || '';
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('hidden');
}

function applyFilters() {
  const s = document.getElementById('search').value.toLowerCase();
  const et = document.getElementById('errorType').value;
  const sev = document.getElementById('severity').value;
  const c = document.getElementById('category').value;
  const t = document.getElementById('type').value;
  const src = document.getElementById('source').value;

  const filtered = items.filter(i =>
    (!s || i.search.includes(s)) &&
    (!et || i.errorType === et) &&
    (!sev || i.severity === sev) &&
    (!c || i.category === c) &&
    (!t || i.level === t) &&
    (!src || i.source === src)
  );

  render(filtered);
}

function filterErrorType(et) {
  document.getElementById('errorType').value = et;
  applyFilters();
}

function resetFilters() {
  document.querySelectorAll('input,select').forEach(e=>e.value='');
  render(items);
}

function render(data) {
  document.getElementById('counts').innerHTML = 
    \`<strong>📊 Showing \${data.length} of \${items.length} records</strong>\`;

  const grouped = {};
  data.forEach(e => {
    const key = e.type + e.message;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  let html = '';
  Object.values(grouped).forEach(group => {
    const e = group[0];
    const badgeClass = getBadgeClass(e.errorType);

    html += \`
    <div class="error-group" style="border-left-color: \${e.level === 'ERROR' ? '#dc3545' : '#ff9800'};">
      <div class="mb-2">
        <span class="error-type-badge \${badgeClass}">\${e.icon} \${e.errorType}</span>
        <span class="badge bg-danger">\${e.type}</span>
        <span class="badge bg-secondary">\${e.severity}</span>
        <span class="badge bg-primary">\${group.length}x</span>
      </div>
      <p class="mb-2"><strong>\${e.message}</strong></p>
      <div class="alert alert-success p-2 mb-2"><small>💡 \${e.suggestion}</small></div>
      <div class="alert alert-info p-2 mb-2"><small>🔧 \${e.fix}</small></div>
      <details>
        <summary class="small fw-semibold">📍 Locations (\${group.length})</summary>
        <div class="mt-2 ps-3 small">
          \${group.map(x => \`<div class="text-muted">📄 \${x.file}:\${x.line}</div>\`).join('')}
        </div>
      </details>
    </div>\`;
  });

  document.getElementById('list').innerHTML = html;
}
</script>

</body>
</html>
`;

fs.writeFileSync('build-report.html', html);

// =============================================
// CONSOLE OUTPUT
// =============================================
console.log('\n✅ Build Report Generated Successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 SUMMARY:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔴 Total Errors:    ' + totalErrors);
console.log('🟠 Total Warnings:  ' + totalWarnings);
console.log('📁 Files Affected:  ' + totalFiles);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚡ SEVERITY BREAKDOWN:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔴 HIGH:    ' + severityCount.HIGH + ' issues');
console.log('🟠 MEDIUM:  ' + severityCount.MEDIUM + ' issues');
console.log('🟡 LOW:     ' + severityCount.LOW + ' issues');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 ERROR TYPE BREAKDOWN:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
Object.entries(errorTypeCount).forEach(([type, count]) => {
  const icon = getIcon(type);
  console.log(`${icon} ${type}: ${count} issues`);
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🏥 Health Score: ' + healthScore.toFixed(1) + '%');
console.log('📄 Reports Generated:');
console.log('   ✅ build-report.html (Interactive Dashboard)');
console.log('   ✅ build-report.json (Data Export)');
console.log('   ✅ build-report.csv (Spreadsheet)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
