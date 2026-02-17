#!/usr/bin/env node
/**
 * Test Failure Analysis Script
 * 
 * Analyzes test output to categorize and prioritize failures
 */

import fs from 'fs';
import path from 'path';

const testOutputFile = 'test-output.txt';

if (!fs.existsSync(testOutputFile)) {
  console.error(`❌ Error: ${testOutputFile} not found. Run: npm test 2>&1 | tee ${testOutputFile}`);
  process.exit(1);
}

const output = fs.readFileSync(testOutputFile, 'utf-8');
const lines = output.split('\n');

const analysis = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  suitesPassed: 0,
  suitesFailed: 0,
  categories: {
    authentication: [],
    authorization: [],
    validation: [],
    database: [],
    api: [],
    email: [],
    cloudBackup: [],
    twoFactor: [],
    mealPlanning: [],
    passwordReset: [],
    imports: [],
    other: []
  }
};

// Parse summary
const summaryMatch = output.match(/Test Suites: (\d+) failed, (\d+) passed, (\d+) total/);
if (summaryMatch) {
  analysis.suitesFailed = parseInt(summaryMatch[1]);
  analysis.suitesPassed = parseInt(summaryMatch[2]);
}

const testsMatch = output.match(/Tests:\s+(\d+) failed, (\d+) passed, (\d+) total/);
if (testsMatch) {
  analysis.failed = parseInt(testsMatch[1]);
  analysis.passed = parseInt(testsMatch[2]);
  analysis.totalTests = parseInt(testsMatch[3]);
}

// Extract failed tests
const failedTestPattern = /●.*?›(.*?)$/gm;
let match;
while ((match = failedTestPattern.exec(output)) !== null) {
  const testName = match[1].trim();
  
  // Categorize
  if (testName.toLowerCase().includes('auth') && !testName.toLowerCase().includes('2fa')) {
    analysis.categories.authentication.push(testName);
  } else if (testName.toLowerCase().includes('2fa') || testName.toLowerCase().includes('two-factor')) {
    analysis.categories.twoFactor.push(testName);
  } else if (testName.toLowerCase().includes('permission') || testName.toLowerCase().includes('owner')) {
    analysis.categories.authorization.push(testName);
  } else if (testName.toLowerCase().includes('valid') || testName.toLowerCase().includes('reject') || testName.toLowerCase().includes('require')) {
    analysis.categories.validation.push(testName);
  } else if (testName.toLowerCase().includes('email') || testName.toLowerCase().includes('verification')) {
    analysis.categories.email.push(testName);
  } else if (testName.toLowerCase().includes('cloud') || testName.toLowerCase().includes('backup') || testName.toLowerCase().includes('dropbox')) {
    analysis.categories.cloudBackup.push(testName);
  } else if (testName.toLowerCase().includes('meal') || testName.toLowerCase().includes('plan')) {
    analysis.categories.mealPlanning.push(testName);
  } else if (testName.toLowerCase().includes('password') && testName.toLowerCase().includes('reset')) {
    analysis.categories.passwordReset.push(testName);
  } else if (testName.toLowerCase().includes('import')) {
    analysis.categories.imports.push(testName);
  } else {
    analysis.categories.other.push(testName);
  }
}

// Extract error patterns
const errorPatterns = {
  timeout: (output.match(/timeout/gi) || []).length,
  connection: (output.match(/connection|ECONNREFUSED/gi) || []).length,
  authentication: (output.match(/unauthorized|401/gi) || []).length,
  validation: (output.match(/validation|400/gi) || []).length,
  notFound: (output.match(/404|not found/gi) || []).length,
  serverError: (output.match(/500|Internal Server Error/gi) || []).length,
};

// Print report
console.log('\n' + '='.repeat(80));
console.log('TEST FAILURE ANALYSIS REPORT');
console.log('='.repeat(80) + '\n');

console.log('📊 SUMMARY');
console.log('-'.repeat(80));
console.log(`Total Tests:       ${analysis.totalTests}`);
console.log(`✅ Passed:         ${analysis.passed} (${Math.round(analysis.passed/analysis.totalTests*100)}%)`);
console.log(`❌ Failed:         ${analysis.failed} (${Math.round(analysis.failed/analysis.totalTests*100)}%)`);
console.log(`\nTest Suites:      ${analysis.suitesPassed + analysis.suitesFailed} total`);
console.log(`✅ Passed Suites:  ${analysis.suitesPassed}`);
console.log(`❌ Failed Suites:  ${analysis.suitesFailed}`);

console.log('\n\n📁 FAILURES BY CATEGORY');
console.log('-'.repeat(80));

const sortedCategories = Object.entries(analysis.categories)
  .sort((a, b) => b[1].length - a[1].length)
  .filter(([_, failures]) => failures.length > 0);

sortedCategories.forEach(([category, failures]) => {
  const percentage = Math.round(failures.length / analysis.failed * 100);
  console.log(`\n${category.toUpperCase()} (${failures.length} failures, ${percentage}%)`);
  console.log('-'.repeat(40));
  failures.slice(0, 5).forEach(test => {
    console.log(`  • ${test.substring(0, 70)}${test.length > 70 ? '...' : ''}`);
  });
  if (failures.length > 5) {
    console.log(`  ... and ${failures.length - 5} more`);
  }
});

console.log('\n\n🔍 ERROR PATTERNS');
console.log('-'.repeat(80));
Object.entries(errorPatterns)
  .sort((a, b) => b[1] - a[1])
  .forEach(([pattern, count]) => {
    if (count > 0) {
      console.log(`${pattern.padEnd(20)} ${count} occurrences`);
    }
  });

console.log('\n\n🎯 RECOMMENDED FIX ORDER (by impact)');
console.log('-'.repeat(80));
sortedCategories.forEach(([category, failures], index) => {
  const priority = index < 3 ? '🔴 HIGH' : index < 6 ? '🟡 MEDIUM' : '🟢 LOW';
  console.log(`${index + 1}. ${priority} - ${category.toUpperCase()} (${failures.length} failures)`);
});

console.log('\n\n💡 NEXT STEPS');
console.log('-'.repeat(80));
console.log('1. Start with high-priority categories (most failures)');
console.log('2. Fix one category at a time');
console.log('3. Run tests after each fix to verify');
console.log('4. Look for common patterns within each category');
console.log('5. Consider creating helper utilities for repeated patterns\n');

// Export detailed report
const detailedReport = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: analysis.totalTests,
    passed: analysis.passed,
    failed: analysis.failed,
    passRate: Math.round(analysis.passed/analysis.totalTests*100)
  },
  categories: sortedCategories.map(([name, failures]) => ({
    name,
    count: failures.length,
    percentage: Math.round(failures.length / analysis.failed * 100),
    tests: failures
  })),
  errorPatterns
};

fs.writeFileSync('test-analysis.json', JSON.stringify(detailedReport, null, 2));
console.log('📄 Detailed report saved to: test-analysis.json\n');