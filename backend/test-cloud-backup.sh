#!/bin/bash

# Cloud Backup Integration Test Runner
# This script sets up the required environment variables and runs the cloud backup tests

# Generate a random encryption key for tests
export CLOUD_TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Set test Dropbox credentials
export DROPBOX_CLIENT_ID=test_client_id
export DROPBOX_CLIENT_SECRET=test_secret
export DROPBOX_REDIRECT_URI=http://localhost:5000/api/cloud/dropbox/callback

# Run the cloud backup integration tests
npm test -- cloud-backup.test.js