// build-report.js

const fs = require('fs');
const path = require('path');

// Enhanced TypeScript error mappings
const errorMappings = {
    TS2339: { severity: 'HIGH', suggestion: 'Check if the property exists.' },
    TS2554: { severity: 'HIGH', suggestion: 'Verify the function call with correct parameters.' },
    TS2724: { severity: 'MEDIUM', suggestion: 'Check the type declarations.' },
    TS7053: { severity: 'LOW', suggestion: 'Ensure all keys are declared.' },
    TS2349: { severity: 'HIGH', suggestion: 'Investigate the provided argument types.' },
    TS1109: { severity: 'MEDIUM', suggestion: 'Check for syntax errors.' },
    TS2304: { severity: 'HIGH', suggestion: 'Check for undeclared variables.' },
    TS2322: { severity: 'HIGH', suggestion: 'Ensure type compatibility.' },
    TS2403: { severity: 'LOW', suggestion: 'Examine your class constructor.' },
    TS2363: { severity: 'MEDIUM', suggestion: 'Resolve ambient declaration issues.' },
    TS1005: { severity: 'LOW', suggestion: 'Watch out for missing tokens.' },
    TS2693: { severity: 'LOW', suggestion: 'Refer to documentation for correct usage.' }
};

function readBuildLog(logFilePath) {
    return fs.readFileSync(logFilePath, 'utf-8');
}

function parseLogs(logs) {
    const errorCounts = {};
    const summaries = [];

    logs.split('\n').forEach(line => {
        const match = line.match(/(TS\d{3})/);
        if (match) {
            const code = match[1];
            const { severity, suggestion } = errorMappings[code] || {};
            if (severity) {
                errorCounts[code] = errorCounts[code] || { count: 0, severity, suggestion };
                errorCounts[code].count++;
                summaries.push({ code, severity, suggestion });
            }
        }
    });

    return { errorCounts, summaries };
}

function generateAnalytics(parsedData) {
    const totalErrors = parsedData.summaries.length;
    const fileCounts = Object.keys(parsedData.errorCounts).length;
    return { totalErrors, fileCounts, errorCounts: parsedData.errorCounts };
}

function exportToJson(data, filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function generateHtmlDashboard(analytics) {
    // Basic structure of the dashboard (this should be expanded)
    return `<html>\n<head>\n<title>Build Report</title>\n</head>\n<body>\n<h1>Build Report Dashboard</h1>\n<pre>${JSON.stringify(analytics, null, 2)}</pre>\n</body>\n</html>`;
}

const logFilePath = path.join(__dirname, 'build.log');
const logs = readBuildLog(logFilePath);
const parsedData = parseLogs(logs);
const analytics = generateAnalytics(parsedData);
const jsonFilePath = path.join(__dirname, 'analytics.json');
exportToJson(analytics, jsonFilePath);
const htmlContent = generateHtmlDashboard(analytics);
fs.writeFileSync(path.join(__dirname, 'dashboard.html'), htmlContent);

console.log(`Total Errors: ${analytics.totalErrors}`);
console.log(`Total Files: ${analytics.fileCounts}`);