// build-log-parser.js

// Enhanced TypeScript error mappings
function mapErrorToCategory(error: string): string {
    const errorMappings: { [key: string]: string } = {
        'SyntaxError': 'Parsing Error',
        'ReferenceError': 'Runtime Error',
        'TypeError': 'Type Error',
        // Add more mappings as needed
    };
    return errorMappings[error] || 'Unknown Error';
}

// Advanced filtering functions
function filterLogs(logs: string[], filter: (log: string) => boolean): string[] {
    return logs.filter(filter);
}

// Categorization function
function categorizeLogs(logs: string[]): { [category: string]: string[] } {
    return logs.reduce((acc, log) => {
        const category = mapErrorToCategory(log);
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(log);
        return acc;
    }, {} as { [category: string]: string[] });
}

// Dashboard generation function
function generateDashboard(categorizedLogs: { [category: string]: string[] }): string {
    let dashboard = 'Dashboard Summary:\n';
    for (const [category, logs] of Object.entries(categorizedLogs)) {
        dashboard += `Category: ${category} - Count: ${logs.length}\n`;
    }
    return dashboard;
}

// Example usage
const logs = ["SyntaxError: Unexpected token", "ReferenceError: x is not defined", "TypeError: Cannot read properties of undefined"];
const filteredLogs = filterLogs(logs, log => log.includes('Error'));
const categorizedLogs = categorizeLogs(filteredLogs);
console.log(generateDashboard(categorizedLogs));