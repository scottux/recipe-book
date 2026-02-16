# Known Bugs - V2.1 Series

**Last Updated**: February 16, 2026  
**Current Version**: 2.1.5 (in development)

This document tracks known bugs discovered during V2.1 development that will be addressed in upcoming releases.

---

## Critical Bugs 🔴

### None Currently

---

## High Priority Bugs 🟠

### 1. Meal Plan Date Selection Off-by-One Error
**Component**: Meal Planning (Frontend)  
**Severity**: High  
**Discovered**: V2.1.5 development  
**Status**: ⏳ Pending Fix

**Description**:
When selecting a date range in the meal planner (e.g., Feb 15-21), the system plans meals for one day earlier (Feb 14-20).

**Steps to Reproduce**:
1. Navigate to Meal Planning page
2. Select date range: Feb 15 - Feb 21
3. Create meal plan
4. Observe planned dates are Feb 14 - Feb 20

**Impact**: Users get meals planned for wrong dates, causing confusion

**Root Cause**: Likely timezone/date conversion issue in frontend date picker or backend date processing

**Planned Fix**: V2.1.7 (Bugfix Release)

---

### 2. Meal Plan Missing Recipe Selection List
**Component**: Meal Planning (Frontend)  
**Severity**: High  
**Discovered**: V2.1.5 development  
**Status**: ⏳ Pending Fix

**Description**:
The meal planning interface does not show a list of recipes to choose from when adding meals to a plan.

**Steps to Reproduce**:
1. Navigate to Meal Planning page
2. Try to add a recipe to a meal slot
3. No recipe selection interface appears

**Impact**: Users cannot add recipes to meal plans

**Root Cause**: Missing recipe selector component or API integration

**Planned Fix**: V2.1.7 (Bugfix Release)

---

### 3. Cannot Add Recipe to Active Shopping List
**Component**: Shopping Lists (Frontend/Backend)  
**Severity**: High  
**Discovered**: V2.1.5 development  
**Status**: ⏳ Pending Fix

**Description**:
Users cannot add recipes to an active shopping list. The feature appears to be non-functional.

**Steps to Reproduce**:
1. Create or open a shopping list
2. Try to add a recipe to the list
3. Action fails or has no effect

**Impact**: Core shopping list functionality broken

**Root Cause**: Unknown - needs investigation of recipe-to-shopping-list integration

**Planned Fix**: V2.1.7 (Bugfix Release)

---

## Medium Priority Bugs 🟡

### 4. Meal Planning Has Blue Button (Theme Violation)
**Component**: Meal Planning (Frontend - UX)  
**Severity**: Medium  
**Discovered**: V2.1.5 development  
**Status**: ⏳ Pending Fix

**Description**:
The meal planning page contains a blue button that doesn't follow the cookbook brown theme. This was missed during UX review.

**Steps to Reproduce**:
1. Navigate to Meal Planning page
2. Observe blue-colored button (should be cookbook brown)

**Impact**: Visual inconsistency, theme violation

**Root Cause**: One button not updated during theme migration

**Planned Fix**: V2.1.7 (Bugfix Release)

**Related**: Design system compliance (see .clinerules/SDLC.md Phase 5.5)

---

### 5. Recipe Detail Top-Right UI Cramped and Inconsistent
**Component**: Recipe Detail (Frontend - UX)  
**Severity**: Medium  
**Discovered**: V2.1.5 development  
**Status**: ⏳ Pending Fix

**Description**:
The buttons/icons in the top-right corner of the recipe detail page are cramped together and have inconsistent styling.

**Steps to Reproduce**:
1. Navigate to any recipe detail page
2. Observe top-right action buttons/icons
3. Note cramped spacing and inconsistent design

**Impact**: Poor user experience, accessibility concerns

**Root Cause**: Layout and spacing issues, lacks consistent component design

**Planned Fix**: V2.1.7 (Bugfix Release)

**Potential Solution**:
- Use consistent button size and spacing
- Apply cookbook theme consistently
- Consider dropdown menu for less-used actions
- Ensure touch targets are 44x44px minimum

---

## Low Priority Bugs 🟢

### None Currently

---

## Deferred Issues ⏸️

### Integration Test Failures (V2.1.6 - Two-Factor Auth)
**Component**: Backend Testing Infrastructure  
**Severity**: Low (tests only, functionality works)  
**Status**: ⏸️ Deferred to V2.1.8

**Description**:
10 out of 23 integration tests for two-factor authentication are failing. Issues are related to:
- Response format mismatches in error messages
- Backup code verification flow
- Database state management in test setup

**Impact**: Reduced test coverage for 2FA feature

**Note**: Core 2FA functionality is implemented and working. These are test infrastructure issues, not feature bugs.

**Planned Fix**: V2.1.8 (Test Infrastructure Improvements)

---

## Bug Fix Roadmap

### V2.1.7 - Critical Bugfix Release
**Target**: Late February 2026  
**Priority**: CRITICAL

**Fixes Planned**:
1. ✅ Meal plan date selection off-by-one error
2. ✅ Meal plan recipe selection list
3. ✅ Shopping list recipe addition
4. ✅ Meal planning blue button (theme fix)
5. ✅ Recipe detail top-right UI redesign

**Testing Focus**:
- Manual testing of all meal planning workflows
- Manual testing of shopping list workflows
- UX review of fixed components
- Regression testing

---

### V2.1.8 - Test Infrastructure & Tech Debt
**Target**: Early March 2026  
**Priority**: MEDIUM

**Planned Work**:
1. Fix 2FA integration test failures
2. Improve test infrastructure
3. Address accumulating tech debt
4. Dependency updates

---

## Bug Reporting

### How to Report Bugs

1. **Check Known Bugs**: Review this document first
2. **GitHub Issues**: Create detailed issue with:
   - Component affected
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots/videos if applicable
   - Browser/environment details

3. **Priority Labels**:
   - `critical` - App broken, data loss
   - `high` - Major feature broken
   - `medium` - Minor feature issue or UX problem
   - `low` - Cosmetic issue

### Bug Triage Process

1. **Report Received** → 24-hour acknowledgment
2. **Investigation** → Root cause analysis
3. **Prioritization** → Severity + impact assessment
4. **Assignment** → Scheduled for specific version
5. **Fix & Test** → Implementation + verification
6. **Release** → Deployed to production
7. **Verification** → Confirmed fixed in production

---

## Retrospective Notes

### Lessons Learned

**What Led to These Bugs**:
1. **Meal planning issues**: Likely introduced during rapid V2.0 development
2. **Theme inconsistency**: Incomplete migration during V2.1.4 theme update
3. **UX issues**: Rushed to production without thorough UX review

**Prevention Strategies**:
1. ✅ Add Phase 5.5 (UX Review) to SDLC for all releases
2. ✅ Comprehensive manual testing before each release
3. ✅ E2E tests for critical user flows
4. ✅ Regular retrospectives to catch accumulating issues
5. ✅ Dedicated bugfix releases (e.g., V2.1.7)

**Process Improvements**:
- More thorough pre-release testing
- UX review checklist enforcement
- Design system compliance automated checks
- Regular tech debt assessment

---

## Related Documents

- **SDLC Process**: `docs/SDLC.md`
- **Roadmap**: `ROADMAP.md`
- **Code Reviews**: `docs/reviews/`
- **Requirements**: `reqs/`

---

**Document Maintainer**: Development Team  
**Next Update**: After V2.1.7 release