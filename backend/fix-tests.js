#!/usr/bin/env node

/**
 * Script to automatically fix test files to use shared MongoDB connection
 * Replaces individual MongoMemoryServer setup with shared connection
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXES = [
  {
    file: 'src/__tests__/integration/cloud-backup.test.js',
    needsFix: true
  },
  {
    file: 'src/__tests__/integration/email-verification.test.js',
    needsFix: true
  },
  {
    file: 'src/__tests__/integration/import-backup.test.js',
    needsFix: true
  },
  {
    file: 'src/__tests__/integration/meal-planning.test.js',
    needsFix: true
  },
  {
    file: 'src/__tests__/integration/password-reset.test.js',
    needsFix: true
  },
  {
    file: 'src/__tests__/integration/v1.1-features.test.js',
    needsFix: true
  }
];

function fixTestFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);
  
  const fullPath = join(__dirname, filePath);
  let content = readFileSync(fullPath, 'utf8');
  let modified = false;

  // 1. Remove MongoMemoryServer import
  if (content.includes("from 'mongodb-memory-server'")) {
    content = content.replace(/import \{ MongoMemoryServer \} from 'mongodb-memory-server';\n?/g, '');
    console.log('  ✓ Removed MongoMemoryServer import');
    modified = true;
  }

  // 2. Add clearDatabase and ensureConnection imports if not present
  if (content.includes("import mongoose from 'mongoose';") && 
      !content.includes('clearDatabase') && 
      !content.includes('ensureConnection')) {
    content = content.replace(
      "import mongoose from 'mongoose';",
      "import mongoose from 'mongoose';\nimport { clearDatabase, ensureConnection } from '../setup/mongodb.js';"
    );
    console.log('  ✓ Added shared MongoDB imports');
    modified = true;
  }

  // 3. Remove mongoServer variable declaration
  if (content.includes('let mongoServer;')) {
    content = content.replace(/let mongoServer;\n?/g, '');
    console.log('  ✓ Removed mongoServer variable');
    modified = true;
  }

  // 4. Replace beforeAll with MongoDB setup
  const beforeAllRegex = /beforeAll\(async \(\) => \{[^}]*mongoServer = await MongoMemoryServer\.create\(\);[^}]*await mongoose\.connect\([^)]*\);[^}]*\}\);/gs;
  if (beforeAllRegex.test(content)) {
    content = content.replace(
      beforeAllRegex,
      'beforeAll(async () => {\n  await ensureConnection();\n});'
    );
    console.log('  ✓ Fixed beforeAll setup');
    modified = true;
  }

  // 5. Replace afterAll with proper teardown
  const afterAllRegex = /afterAll\(async \(\) => \{[^}]*await mongoose\.disconnect\(\);[^}]*await mongoServer\.stop\(\);[^}]*\}\);/gs;
  if (afterAllRegex.test(content)) {
    content = content.replace(
      afterAllRegex,
      'afterAll(async () => {\n  // DO NOT disconnect - shared connection managed by global teardown\n});'
    );
    console.log('  ✓ Fixed afterAll teardown');
    modified = true;
  }

  // 6. Replace deleteMany with clearDatabase in beforeEach
  const beforeEachClearRegex = /\/\/ Clear all collections\n([\s\S]*?)(?=\n\n|\/\/ Create|$)/;
  if (beforeEachClearRegex.test(content) && content.includes('.deleteMany')) {
    const match = content.match(beforeEachClearRegex);
    if (match && match[0].includes('deleteMany')) {
      content = content.replace(
        match[0],
        '// Clear all collections using shared helper\n  await clearDatabase();'
      );
      console.log('  ✓ Replaced deleteMany with clearDatabase');
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(fullPath, content, 'utf8');
    console.log('  ✅ File updated successfully');
    return true;
  } else {
    console.log('  ⚠️  No changes needed');
    return false;
  }
}

console.log('MongoDB Test Connection Fixer');
console.log('==============================\n');

let fixedCount = 0;
for (const { file, needsFix } of FIXES) {
  if (needsFix) {
    const wasFixed = fixTestFile(file);
    if (wasFixed) fixedCount++;
  }
}

console.log(`\n==============================`);
console.log(`Fixed ${fixedCount} test files`);
console.log(`\nNext steps:`);
console.log(`  1. Review the changes with: git diff`);
console.log(`  2. Run tests: cd backend && npm test`);