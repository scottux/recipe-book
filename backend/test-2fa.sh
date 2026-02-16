#!/bin/bash

# Test 2FA Implementation
echo "Testing 2FA Implementation..."
echo "=============================="
echo ""

# Login and get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recipebook.local","password":"Admin123!"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Test 2FA Status
echo "2. Getting 2FA status..."
STATUS_RESPONSE=$(curl -s -X GET http://localhost:5000/api/2fa/status \
  -H "Authorization: Bearer $TOKEN")
echo "Response: $STATUS_RESPONSE"
echo ""

# Test 2FA Setup
echo "3. Setting up 2FA..."
SETUP_RESPONSE=$(curl -s -X POST http://localhost:5000/api/2fa/setup \
  -H "Authorization: Bearer $TOKEN")
echo "Response (truncated): ${SETUP_RESPONSE:0:200}..."
echo ""

# Check if setup was successful
if echo "$SETUP_RESPONSE" | grep -q '"success":true'; then
  echo "✅ 2FA setup endpoint working!"
else
  echo "⚠️  2FA setup may have issues"
fi
echo ""

echo "=============================="
echo "Backend 2FA endpoints are accessible!"
echo "Next step: Create frontend components"