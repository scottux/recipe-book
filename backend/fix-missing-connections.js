#!/usr/bin/env node
/**
 * Script to add ensureConnection() to test files missing it
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = [
  'src/__tests__/integration/password-reset.test.js',
  'src/__tests__/integration/two-factor-auth.test.js',
  'src/__tests__/integration/account-management.test.js',
  'src/__tests__/integration/meal-planning.test.js',
  'src/__tests__/integration/import-backup.test.js',
  'src/__tests__/integration/cloud-backup.test.js'
];

function addEnsureConnection(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already has ensureConnection in beforeAll
  if (content.includes('beforeAll') && content.includes('ensureConnection')) {
    console.log(`✓ Already fixed: ${filePath}`);
    return false;
  }

  // Check if ensureConnection is imported
  if (!content.includes('ensureConnection')) {
    console.log(`⚠️  Missing import: ${filePath}`);
    // Add to import statement
    content = content.replace(
      /from ['"]\.\.\/setup\/mongodb\.js['"]/,
      match => {
        if (content.includes('{ clearDatabase }')) {
          return match.replace('{ clearDatabase }', '{ clearDatabase, ensureConnection }');
        } else if (content.includes('import {')) {
          return match.replace('import {', 'import { ensureConnection,');
        }
        return match;
      }
    );
  }

  // Find the first describe block and add beforeAll
  const describeRegex = /describe\(['"].*?['"],\s*\(\)\s*=>\s*{/;
  const match = content.match(describeRegex);
  
  if (!match) {
    console.log(`❌ Could not find describe block: ${filePath}`);
    return false;
  }

  const insertPoint = match.index + match[0].length;
  const beforeAllCode = `
  beforeAll(async () => {
    await ensureConnection();
  });
`;

  content = content.slice(0, insertPoint) + beforeAllCode + content.slice(insertPoint);

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
  return true;
}

console.log('🔧 Adding ensureConnection() to test files...\n');

let fixedCount = 0;
for (const file of testFiles) {
  if (addEnsureConnection(file)) {
    fixedCount++;
  }
}

console.log(`\n✓ Fixed ${fixedCount} files`);