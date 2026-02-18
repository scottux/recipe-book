# CI/CD Guide - Recipe Book Project

**Version**: 1.0  
**Last Updated**: February 18, 2026  
**Status**: Active

---

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Workflow](#github-actions-workflow)
3. [Workflow Jobs](#workflow-jobs)
4. [Running Tests Locally](#running-tests-locally)
5. [Branch Protection Rules](#branch-protection-rules)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Overview

The Recipe Book project uses **GitHub Actions** for Continuous Integration (CI) to automatically test and validate code changes. The CI pipeline runs on every push to `main` or `develop` branches, and on all pull requests.

### What Gets Tested

✅ **Code Quality** (ESLint, Prettier)  
✅ **Backend Tests** (Jest with MongoDB)  
✅ **Frontend Tests** (Vitest)  
✅ **Security Audits** (npm audit)  
✅ **Build Verification** (Frontend build)

### Workflow File

Location: `.github/workflows/ci.yml`

---

## GitHub Actions Workflow

### Trigger Events

The workflow runs automatically on:

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Workflow Structure

```
CI Pipeline
├── Lint Job (ESLint + Prettier)
├── Backend Tests (Jest + MongoDB)
├── Frontend Tests (Vitest)
├── Security Audit (npm audit)
├── Build Check (Vite build)
└── Status Check (Final verification)
```

---

## Workflow Jobs

### 1. Lint Job

**Purpose**: Check code quality and formatting

**Steps**:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (backend + frontend)
4. Run ESLint on backend
5. Run ESLint on frontend
6. Check Prettier formatting (non-blocking)

**Commands Run**:
```bash
npm run lint           # ESLint
npm run format:check   # Prettier
```

**When It Fails**:
- ESLint errors found (must fix)
- Prettier formatting issues (warning only)

---

### 2. Backend Tests Job

**Purpose**: Run backend integration and unit tests

**Infrastructure**:
- **MongoDB 7** service container
- Test database with auth enabled
- Health checks for MongoDB

**Steps**:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install backend dependencies
4. Run Jest tests with coverage
5. Upload coverage to Codecov (optional)

**Environment Variables**:
```bash
MONGODB_URI=mongodb://testuser:testpass@localhost:27017/recipe-book-test?authSource=admin
JWT_SECRET=test-secret-for-ci-pipeline
NODE_ENV=test
```

**Commands Run**:
```bash
npm test -- --coverage
```

**Test Results**:
- Must have 100% pass rate
- Coverage report uploaded to Codecov

**When It Fails**:
- Any test fails
- MongoDB connection issues
- Test timeout

---

### 3. Frontend Tests Job

**Purpose**: Run frontend component and unit tests

**Steps**:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install frontend dependencies
4. Run Vitest tests with coverage
5. Upload coverage to Codecov (optional)

**Commands Run**:
```bash
npm test -- --coverage
```

**When It Fails**:
- Any test fails
- Component rendering issues

---

### 4. Security Audit Job

**Purpose**: Check for known vulnerabilities in dependencies

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Audit backend dependencies (high+ severity)
4. Audit frontend dependencies (high+ severity)
5. Report known issues

**Commands Run**:
```bash
npm audit --audit-level=high
```

**Current Known Issues** (V2.3.0):
- `happy-dom <20.0.0` (critical) - Update planned for V2.3.1
- `nodemailer <=7.0.10` (high) - Update planned for V2.3.1

**Note**: This job is set to `continue-on-error: true` to avoid blocking PRs for known/acceptable vulnerabilities.

---

### 5. Build Check Job

**Purpose**: Verify the application builds successfully

**Dependencies**: Requires lint, backend tests, and frontend tests to pass first

**Steps**:
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Install dependencies (both backend + frontend)
4. Build frontend (Vite production build)
5. Verify backend starts (10-second smoke test)

**Commands Run**:
```bash
# Frontend
npm run build

# Backend (smoke test)
timeout 10s npm start
```

**When It Fails**:
- Frontend build errors
- Backend startup issues
- Missing dependencies

---

### 6. Status Check Job

**Purpose**: Final verification that all required checks passed

**Dependencies**: Runs after all other jobs complete

**Logic**:
```bash
if lint ✅ AND backend-tests ✅ AND frontend-tests ✅ AND build ✅:
  → Status: PASS ✅
else:
  → Status: FAIL ❌
```

**Note**: Security audit failures do not block this check.

---

## Running Tests Locally

### Prerequisites

```bash
# Node.js 20+
node --version  # Should be v20.x.x

# MongoDB (for integration tests)
mongod --version  # Should be 7.x
```

### Backend Tests

```bash
cd recipe-book/backend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test src/__tests__/integration/auth.test.js

# Run in watch mode
npm test -- --watch
```

### Frontend Tests

```bash
cd recipe-book/frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Linting

```bash
# Backend
cd recipe-book/backend
npm run lint
npm run format:check

# Frontend
cd recipe-book/frontend
npm run lint
npm run format:check
```

### Full Local CI Check

Run all checks locally before pushing:

```bash
# From recipe-book directory
cd backend
npm run lint && npm test

cd ../frontend
npm run lint && npm test && npm run build

cd ..
echo "✅ All local checks passed!"
```

---

## Branch Protection Rules

### Recommended Settings (GitHub Repository)

**For `main` branch**:

1. **General**
   - ✅ Require pull request before merging
   - ✅ Require approvals: 1
   - ✅ Dismiss stale approvals when new commits are pushed
   - ✅ Require conversation resolution before merging

2. **Status Checks**
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   
   **Required Checks**:
   - `lint`
   - `test-backend`
   - `test-frontend`
   - `build`
   - `status-check`

3. **Additional Rules**
   - ✅ Require linear history
   - ✅ Include administrators

### Setting Up Branch Protection

1. Go to repository **Settings**
2. Navigate to **Branches**
3. Click **Add rule**
4. Enter branch name pattern: `main`
5. Configure settings as above
6. Click **Create** or **Save changes**

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failures

**Symptom**: Backend tests fail with "MongoServerError"

**Solution**:
```yaml
# Verify MongoDB service is healthy
services:
  mongodb:
    options: >-
      --health-cmd "mongosh --eval 'db.adminCommand({ping:1})'"
      --health-interval 10s
```

**Local Fix**:
```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/data

# Or use Docker
docker run -d -p 27017:27017 mongo:7
```

---

#### 2. npm ci Fails

**Symptom**: "Cannot find module" or lock file errors

**Solution**:
```bash
# Regenerate package-lock.json
rm package-lock.json
npm install

# Commit updated lock file
git add package-lock.json
git commit -m "chore: update package-lock.json"
```

---

#### 3. Tests Pass Locally, Fail in CI

**Symptom**: Different behavior in CI vs local

**Common Causes**:
- Environment variables missing
- Timezone differences
- File path case sensitivity (Mac vs Linux)
- Race conditions in tests

**Debug Steps**:
```bash
# Run with CI environment variables
MONGODB_URI="mongodb://testuser:testpass@localhost:27017/recipe-book-test?authSource=admin" \
JWT_SECRET="test-secret-for-ci-pipeline" \
NODE_ENV="test" \
npm test
```

---

#### 4. Security Audit Blocking

**Symptom**: npm audit fails, blocking PR

**Solution**:
- Review vulnerabilities: `npm audit`
- Acceptable risk: Document in known issues
- Must fix: Update dependency or find alternative
- Override (temporary): Use `continue-on-error: true`

---

#### 5. Cache Issues

**Symptom**: Old dependencies causing issues

**Solution**:
```yaml
# In workflow, add cache-dependency-path
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: |
      recipe-book/backend/package-lock.json
      recipe-book/frontend/package-lock.json
```

**Or manually clear cache** (GitHub Actions UI):
- Go to **Actions** tab
- Click **Caches**
- Delete relevant caches

---

## Maintenance

### Regular Tasks

#### Weekly
- [ ] Review security audit results
- [ ] Check for dependency updates
- [ ] Monitor CI/CD run times

#### Monthly
- [ ] Update dependencies (`npm outdated`)
- [ ] Review and update this documentation
- [ ] Check GitHub Actions usage/limits

#### Quarterly
- [ ] Review and optimize workflow
- [ ] Update Node.js version if needed
- [ ] Audit test coverage

### Updating the Workflow

1. **Make changes** to `.github/workflows/ci.yml`
2. **Test on feature branch** first
3. **Verify all jobs pass**
4. **Merge to main** after approval

### Monitoring

**View Workflow Runs**:
- GitHub repository → **Actions** tab
- See all runs, filter by branch/status
- Click run for detailed logs

**Metrics to Track**:
- Pass rate (target: >95%)
- Average run time (target: <10 minutes)
- Security vulnerabilities (target: 0 high/critical)

---

## Quick Reference

### Workflow Status Badges

Add to README.md:

```markdown
![CI Status](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Continuous%20Integration/badge.svg)
```

### Manual Workflow Trigger

Currently not configured. To add:

```yaml
on:
  workflow_dispatch:  # Adds "Run workflow" button
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Skipping CI

To skip CI on a commit (use sparingly):

```bash
git commit -m "docs: update README [skip ci]"
```

---

## Support

### Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)

### Internal Documentation

- [Testing Guide](../backend/TESTING.md)
- [SDLC Process](./SDLC.md)
- [Tech Debt Plan](./planning/V2.3.0-TECH-DEBT-PLAN.md)

---

**Document Version**: 1.0  
**Last Updated**: February 18, 2026  
**Maintained By**: Development Team  
**Next Review**: March 18, 2026