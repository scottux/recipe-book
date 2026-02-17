#!/usr/bin/env node

/**
 * Script to properly fix remaining test files
 * Adds ensureConnection() to beforeAll and removes disconnects from afterAll
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FILES_TO_FIX = [
  'src/__tests__/integration/cloud-backup.test.js',
  'src/__tests__/integration/email-verification.test.js',
  'src/__tests__/integration/import-backup.test.js',
  'src/__tests__/integration/password-reset.test.js',
  'src/__tests__/integration/v1.1-features.test.js'
];

function fixFile(filePath) {
  console.log(`\nFixing: ${filePath}`);
  const fullPath = join(__dirname, filePath);
  let content = readFileSync(fullPath, 'utf8');
  let modified = false;

  // Add ensureConnection() at start of beforeAll if not present
  const beforeAllRegex = /beforeAll\(async \(\) => \{/g;
  if (beforeAllRegex.test(content) && !content.includes('await ensureConnection();')) {
    content = content.replace(
      /beforeAll\(async \(\) => \{/g,
      'beforeAll(async () => {\n    await ensureConnection();'
    );
    console.log('  ✓ Added ensureConnection() to beforeAll');
    modified = true;
  }

  // Replace afterAll with proper comment
  const afterAllWithDisconnect = /afterAll\(async \(\) => \{[\s\S]*?await mongoose\.disconnect\(\);[\s\S]*?\}\);?/g;
  if (afterAllWithDisconnect.test(content)) {
    content = content.replace(
      afterAllWithDisconnect,
      'afterAll(async () => {\n    // DO NOT disconnect - shared connection managed by global teardown\n  });'
    );
    console.log('  ✓ Fixed afterAll teardown');
    modified = true;
  }

  // Remove timeout parameters from hooks
  content = content.replace(/}, \d+\);/g, '});');
  if (content !== readFileSync(fullPath, 'utf8')) {
    console.log('  ✓ Removed timeout parameters');
    modified = true;
  }

  if (modified) {
    writeFileSync(fullPath, content, 'utf8');
    console.log('  ✅ File fixed');
    return true;
  } else {
    console.log('  ⚠️  No changes needed');
    return false;
  }
}

console.log('Fixing Remaining Test Files\n');

let fixedCount = 0;
for (const file of FILES_TO_FIX) {
  if (fixFile(file)) fixedCount++;
}

console.log(`\n✅ Fixed ${fixedCount} files`);
console.log('\nRun: npm test');