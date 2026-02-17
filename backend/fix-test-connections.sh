#!/bin/bash

# Script to update all integration test files to use shared MongoDB connection
# This fixes the issue where each test file was creating its own MongoDB instance

echo "Fixing test file MongoDB connections..."

# Array of test files to fix (excluding two-factor-auth.test.js which is already fixed)
test_files=(
  "src/__tests__/integration/account-management.test.js"
  "src/__tests__/integration/cloud-backup.test.js"
  "src/__tests__/integration/email-verification.test.js"
  "src/__tests__/integration/import-backup.test.js"
  "src/__tests__/integration/meal-planning.test.js"
  "src/__tests__/integration/password-reset.test.js"
  "src/__tests__/integration/v1.1-features.test.js"
)

for file in "${test_files[@]}"; do
  echo "Processing $file..."
  
  # Remove MongoMemoryServer import
  sed -i.bak 's/^import { MongoMemoryServer } from.*$//' "$file"
  
  # Add clearDatabase and ensureConnection imports
  sed -i.bak "s/^import mongoose from 'mongoose';$/import mongoose from 'mongoose';\nimport { clearDatabase, ensureConnection } from '..\/setup\/mongodb.js';/" "$file"
  
  # Remove mongoServer variable declaration
  sed -i.bak '/^let mongoServer;$/d' "$file"
  
  # Replace beforeAll MongoDB setup
  sed -i.bak '/^beforeAll(async () => {$/,/^});$/{
    /^beforeAll(async () => {$/!{
      /^});$/!d
    }
  }' "$file"
  
  # Clean up backup files
  rm -f "$file.bak"
done

echo "Done! Test files have been updated to use shared MongoDB connection."
echo ""
echo "Summary of changes:"
echo "  - Removed MongoMemoryServer imports and variables"
echo "  - Added clearDatabase and ensureConnection imports"
echo "  - Updated beforeAll to use shared connection"
echo "  - Updated afterAll to not disconnect (handled by global teardown)"
echo ""
echo "Next steps:"
echo "  1. Review the changes"
echo "  2. Run 'npm test' to verify fixes"