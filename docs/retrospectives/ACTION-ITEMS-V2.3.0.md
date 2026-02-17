# Action Items: V2.3.0 Tech Debt Sprint

**Created**: February 17, 2026  
**Due**: March 3, 2026 (Target Release)  
**Status**: 🚧 Ready to Start

---

## Quick Reference

This document tracks action items from the V2.2.4 Retrospective to be completed in V2.3.0.

**See Also**:
- [RETROSPECTIVE-V2.2.4-FEB-2026.md](./RETROSPECTIVE-V2.2.4-FEB-2026.md) - Full retrospective
- [V2.3.0-TECH-DEBT-PLAN.md](../planning/V2.3.0-TECH-DEBT-PLAN.md) - Detailed planning

---

## Critical Priority (Week 1)

### 1. CI/CD Pipeline Implementation
**Owner**: Developer  
**Due**: Feb 21, 2026  
**Effort**: 3 days  
**Status**: 🟡 Not Started

**Tasks**:
- [ ] Create `.github/workflows/ci.yml`
- [ ] Configure lint workflow (ESLint, Prettier)
- [ ] Configure test workflows (backend, frontend)
- [ ] Configure security audit workflow
- [ ] Setup branch protection rules on main
- [ ] Add required status checks
- [ ] Test workflow on feature branch
- [ ] Update README with CI badges
- [ ] Document CI/CD process

**Success Criteria**:
- ✅ Tests run automatically on every PR
- ✅ Main branch requires passing checks to merge
- ✅ Security scans run on every push
- ✅ Team can troubleshoot workflow issues

**Reference**:
- V2.3.0 Plan: Phase 1 (CI/CD Setup)
- Example workflow in plan document

---

### 2. Email Service Testing Strategy
**Owner**: Developer  
**Due**: Feb 24, 2026  
**Effort**: 3 days  
**Status**: 🟡 Not Started

**Tasks**:
- [ ] Research Ethereal Email integration
- [ ] Create test transporter helper
- [ ] Update email verification tests to use Ethereal
- [ ] Update password reset email tests
- [ ] Update backup failure email tests
- [ ] Update 2FA email tests
- [ ] Create email template rendering tests
- [ ] Add template snapshot tests
- [ ] Document email testing strategy
- [ ] Remove old fragile mocks (where possible)

**Success Criteria**:
- ✅ All email tests use Ethereal Email
- ✅ Tests are reliable (no flaky failures)
- ✅ Can view sent emails during tests
- ✅ Template tests verify HTML/text content
- ✅ Team understands how to test emails

**Reference**:
- V2.3.0 Plan: Phase 2 (Email Testing)
- Ethereal Email docs: https://ethereal.email
- Example code in plan document

---

## High Priority (Week 2)

### 3. Security Audit & Dependency Updates
**Owner**: Developer  
**Due**: Feb 26, 2026  
**Effort**: 3 days  
**Status**: 🟡 Not Started

**Tasks**:
- [ ] Run `npm audit` on backend and frontend
- [ ] Document all vulnerabilities
- [ ] Create dependency update plan
- [ ] Fix nodemailer vulnerabilities (upgrade to v7.x)
- [ ] Test email functionality after nodemailer update
- [ ] Upgrade happy-dom (review breaking changes)
- [ ] Test frontend after happy-dom update
- [ ] Update other critical dependencies
- [ ] Update minor/patch versions (low-risk)
- [ ] Run full test suite after each update
- [ ] Document any breaking changes
- [ ] Verify zero high/critical vulnerabilities

**Success Criteria**:
- ✅ Zero high or critical npm audit findings
- ✅ All dependencies up-to-date (or update plan documented)
- ✅ All tests passing after updates
- ✅ Email service working correctly
- ✅ Frontend tests passing

**Reference**:
- V2.3.0 Plan: Phase 3 (Security & Dependencies)
- Retrospective: Tech Debt #3

**Known Issues**:
- nodemailer: Has CVE-2024-XXXX (low severity)
- happy-dom: Breaking changes in v14.x
- Review changelogs before updating

---

### 4. API Documentation Updates
**Owner**: Developer  
**Due**: Feb 27, 2026  
**Effort**: 1 day  
**Status**: 🟡 Not Started

**Tasks**:
- [ ] Review API reference document
- [ ] Document cloud backup endpoints:
  - POST /api/cloud/google-drive/auth
  - POST /api/cloud/google-drive/backup
  - GET /api/cloud/google-drive/backups
  - DELETE /api/cloud/google-drive/disconnect
- [ ] Document import endpoints:
  - POST /api/import/backup (local)
  - POST /api/import/google-drive (from cloud)
- [ ] Add request/response examples for each
- [ ] Document authentication requirements
- [ ] Document error response codes
- [ ] Add usage examples
- [ ] Review and update existing docs

**Success Criteria**:
- ✅ All V2.2.x endpoints documented
- ✅ Request/response examples included
- ✅ Error codes documented
- ✅ Authentication requirements clear

**Reference**:
- V2.3.0 Plan: Phase 4 (Documentation)
- Current API docs: `docs/api/api-reference.md`

---

### 5. Test & CI/CD Documentation
**Owner**: Developer  
**Due**: Feb 27, 2026  
**Effort**: 1 day  
**Status**: 🟡 Not Started

**Tasks**:
- [ ] Create test troubleshooting guide
- [ ] Enhance test helper documentation
- [ ] Add email testing guide
- [ ] Document CI/CD workflows
- [ ] Document CI/CD maintenance procedures
- [ ] Add troubleshooting for CI/CD issues
- [ ] Document pre-commit hook usage
- [ ] Add examples to helper README

**Success Criteria**:
- ✅ Team can troubleshoot test failures
- ✅ Test helpers are well-documented
- ✅ Email testing is documented
- ✅ CI/CD maintenance is clear

**Reference**:
- V2.3.0 Plan: Phase 4 (Documentation)
- Current test helpers: `backend/src/__tests__/helpers/README.md`

---

## Medium Priority (Week 2 - End)

### 6. Bug Fixes & Polish
**Owner**: Developer  
**Due**: Feb 28, 2026  
**Effort**: 1 day  
**Status**: 🟡 Not Started

**Tasks**:
- [ ] Fix Mongoose duplicate index warning
- [ ] Review test output for other warnings
- [ ] Fix any cosmetic warnings
- [ ] Install husky for git hooks
- [ ] Install lint-staged
- [ ] Configure pre-commit hooks:
  - ESLint on staged .js/.jsx files
  - Prettier on staged files
- [ ] Configure pre-push hooks:
  - Run tests before push
- [ ] Test pre-commit flow
- [ ] Document how to bypass hooks (if needed)
- [ ] Update CHANGELOG.md for V2.3.0
- [ ] Prepare release notes

**Success Criteria**:
- ✅ No warnings in test output
- ✅ Pre-commit hooks prevent bad commits
- ✅ Pre-push hooks run tests
- ✅ CHANGELOG updated
- ✅ Release notes ready

**Reference**:
- V2.3.0 Plan: Phase 5 (Bug Fixes & Polish)
- Retrospective: Tech Debt #4

---

## Pre-Release Checklist

Before releasing V2.3.0:

**Testing**:
- [ ] All backend tests passing (run: `npm test`)
- [ ] All integration tests passing
- [ ] Frontend tests passing
- [ ] CI/CD workflow successful on feature branch
- [ ] Manual smoke test of key features

**CI/CD**:
- [ ] GitHub Actions workflows committed
- [ ] Branch protection rules active
- [ ] Status checks required for merge
- [ ] CI badges in README
- [ ] Workflow tested on actual PR

**Security**:
- [ ] `npm audit` shows no high/critical issues
- [ ] Dependencies updated
- [ ] Security scanning in CI/CD working

**Documentation**:
- [ ] API docs updated
- [ ] Test documentation complete
- [ ] CI/CD docs complete
- [ ] Email testing guide complete
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if needed)

**Code Quality**:
- [ ] Pre-commit hooks working
- [ ] No lint errors
- [ ] No warnings in test output
- [ ] Code formatted with Prettier

**Release**:
- [ ] Version bumped to 2.3.0 (all package.json files)
- [ ] Git tag created: `v2.3.0`
- [ ] Release notes prepared
- [ ] CODE_REVIEW_V2.3.0.md created

---

## Post-Release Checklist

After releasing V2.3.0:

**Verification** (Week 1):
- [ ] Monitor CI/CD on first few PRs
- [ ] Verify email tests are reliable
- [ ] Confirm no new vulnerabilities
- [ ] Check for any issues from team

**Documentation** (Week 1):
- [ ] Gather feedback on new docs
- [ ] Update docs based on feedback
- [ ] Fix any doc gaps

**Planning** (Week 2):
- [ ] Schedule V2.3.0 retrospective (mini)
- [ ] Begin planning V2.4.0 (Frontend Quality)
- [ ] Update process based on learnings

**Maintenance** (Ongoing):
- [ ] Schedule monthly dependency audit
- [ ] Review CI/CD metrics
- [ ] Monitor test reliability

---

## Progress Tracking

### Week 1 Progress

| Task | Status | Notes |
|------|--------|-------|
| CI/CD Pipeline | 🟡 Not Started | - |
| Email Testing | 🟡 Not Started | - |

### Week 2 Progress

| Task | Status | Notes |
|------|--------|-------|
| Security Audit | 🟡 Not Started | - |
| API Docs | 🟡 Not Started | - |
| Test Docs | 🟡 Not Started | - |
| Bug Fixes | 🟡 Not Started | - |

**Status Key**:
- 🟡 Not Started
- 🔵 In Progress
- 🟢 Complete
- 🔴 Blocked

---

## Resources

### Documentation
- [V2.2.4 Retrospective](./RETROSPECTIVE-V2.2.4-FEB-2026.md)
- [V2.3.0 Planning](../planning/V2.3.0-TECH-DEBT-PLAN.md)
- [Updated Roadmap](../../ROADMAP.md)

### External Resources
- Ethereal Email: https://ethereal.email
- GitHub Actions: https://docs.github.com/en/actions
- Husky: https://typicode.github.io/husky/
- lint-staged: https://github.com/okonet/lint-staged

### Contact
- Questions? See planning documents
- Blockers? Document in progress notes
- Need help? Refer to retrospective

---

## Notes

**Key Reminders**:
- Test each change thoroughly
- Update documentation as you go
- Commit frequently with clear messages
- Ask questions early if blocked

**Success Factors**:
- CI/CD is the foundation - get it right
- Email testing must be reliable
- Security is non-negotiable
- Documentation enables future work

**Timeline Flexibility**:
- Critical items (1-3) are must-have
- High priority items (4-5) are important
- Medium priority items (6) are nice-to-have
- Adjust timeline if critical items take longer

---

**Document Version**: 1.0  
**Last Updated**: February 17, 2026  
**Next Review**: February 28, 2026 (pre-release)

**Status**: ✅ Ready for V2.3.0 Sprint