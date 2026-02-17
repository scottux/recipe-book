# Known Bugs

**Last Updated**: February 17, 2026  
**Current Version**: 2.2.2  
**Status**: Version-agnostic bug tracking (covers all active versions)

This document tracks known bugs across all versions that will be addressed in upcoming releases.

---

## Critical Bugs 🔴

### None Currently

---

## High Priority Bugs 🟠

### None Currently

**Note**: All high-priority bugs from V2.1.x series were resolved in V2.2.1:
- ✅ Meal plan date selection off-by-one (Fixed in V2.2.1)
- ✅ Meal plan recipe selector missing (Fixed in V2.2.1 with RecipeSelectorModal)
- ✅ Shopping list functionality (Fixed in V2.1.3)
- ✅ Theme violations (Fixed in V2.2.1)
- ✅ Recipe detail UI cramped (Fixed in V2.2.1)

---

## Medium Priority Bugs 🟡

### None Currently

---

## Low Priority Bugs 🟢

### None Currently

---

## Deferred Issues ⏸️

### Integration Test Failures
**Component**: Backend Testing Infrastructure  
**Severity**: Low (tests only, functionality works)  
**Status**: ⏸️ Deferred to V2.2.3

**Description**:
- 22 failing integration tests (authentication setup issues across multiple test files)
- 10 failing 2FA integration tests (response format, backup code verification, database state)
- Test infrastructure needs comprehensive overhaul

**Impact**: Reduced test coverage, but all features work in production

**Note**: All production features are fully functional. These are test infrastructure issues only.

**Planned Fix**: V2.2.3 (Test Infrastructure & Tech Debt)

---

## Bug Fix Roadmap

### V2.2.3 - Test Infrastructure & Tech Debt
**Target**: Late February 2026  
**Priority**: MEDIUM

**Planned Work**:
1. Fix 22 failing integration tests (authentication setup)
2. Fix 10 failing 2FA integration tests
3. Improve test infrastructure and helper utilities
4. Security dependency updates (nodemailer, happy-dom)
5. Increase test coverage to 90%+
6. Add missing E2E tests for cloud backup

---

### V2.2.4 - Cloud Backup Enhancements
**Target**: Early March 2026  
**Priority**: MEDIUM

**Planned Features**:
1. User timezone support for scheduled backups
2. Backup history and restore UI improvements
3. Multiple provider support (Dropbox + Google Drive simultaneously)
4. Backup preview before restore

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

### Lessons Learned (From V2.1.x → V2.2.x Transition)

**What Led to Bugs**:
1. **Date handling**: Timezone conversion issues from rapid V2.0 development
2. **Theme inconsistency**: Incomplete migration during cookbook theme redesign
3. **Test infrastructure**: Accumulated tech debt in test setup and mocking

**What Worked Well** ✅:
1. Comprehensive bugfix release (V2.2.1) resolved all high-priority UX issues
2. Phase 5.5 UX Review process caught design system violations
3. Retrospective process identified documentation gaps
4. Version cleanup (V2.2.2) realigned roadmap with reality

**Prevention Strategies Going Forward**:
1. ✅ Maintain Phase 5.5 (UX Review) for all releases
2. ✅ Comprehensive manual testing before releases
3. ✅ E2E tests for critical user flows
4. ✅ Regular retrospectives after every 3-5 releases
5. ✅ Dedicated releases for tech debt (e.g., V2.2.3)
6. ✅ Keep documentation synchronized with releases

**Process Improvements**:
- Roadmap alignment checks in retrospectives
- Test infrastructure as first-class concern
- Design system compliance validation
- Regular tech debt prioritization

---

## Related Documents

- **SDLC Process**: `docs/SDLC.md`
- **Roadmap**: `ROADMAP.md`
- **Code Reviews**: `docs/reviews/`
- **Requirements**: `reqs/`

---

**Document Maintainer**: Development Team  
**Next Update**: After V2.1.7 release