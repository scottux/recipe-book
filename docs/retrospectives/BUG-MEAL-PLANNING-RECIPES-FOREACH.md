# Bug Report: Critical Runtime Errors (Multiple Components)

**Date**: February 18, 2026  
**Severity**: High (Runtime Crashes)  
**Status**: ✅ Fixed  
**Version Affected**: V2.0+  
**Components**: Meal Planning Feature, Account Settings Page

---

## Problem Summary

Two critical runtime errors were discovered that prevented users from accessing key features:

### Bug 1: Meal Planning - recipes.forEach Error
```
recipes.forEach is not a function
    at RecipeSelectorModal.jsx:49:13
```
This occurred when users attempted to add recipes to a meal plan.

### Bug 2: Account Settings - useState Error
```
useState is not a function or its return value is not iterable
    at TimezoneSelector
```
This occurred when users visited the Account Settings page.

---

## Root Cause Analysis

### Bug 1: RecipeSelectorModal - Type Assumption

The `RecipeSelectorModal` component assumed the `recipes` prop would always be an array, but it could receive:
- `null` or `undefined` from API failures
- An object `{}` instead of an array `[]` due to unexpected API response format
- Other non-array data types

The component used array methods like `.forEach()`, `.filter()`, and `.find()` without defensive checks:

```javascript
// Line 49 - VULNERABLE CODE
recipes.forEach(recipe => {
  recipe.tags?.forEach(tag => tags.add(tag));
  if (recipe.cuisine) cuisines.add(recipe.cuisine);
});
```

### Bug 2: TimezoneSelector - Import Error

**Critical typo in imports:**
```javascript
// WRONG - imported from wrong package
import { useState } from 'prop-types';

// CORRECT - should import from React
import { useState } from 'react';
import PropTypes from 'prop-types';
```

This made `useState` undefined, causing immediate crash on component mount.

**Additional issue:** PropTypes were incorrectly defined:
```javascript
// WRONG
TimezoneSelector.propTypes = {
  value: String,      // Using JavaScript String constructor
  onChange: Function, // Using JavaScript Function constructor
  // ...
};

// CORRECT
TimezoneSelector.propTypes = {
  value: PropTypes.string,      // Using PropTypes validators
  onChange: PropTypes.func,
  // ...
};
```

### Why These Weren't Caught

#### Bug 1 (recipes.forEach)
1. **Testing Gap**: Tests only mocked successful API responses with correct data structures
2. **Happy Path Bias**: Testing focused on normal scenarios, not edge cases
3. **Type Safety**: JavaScript's dynamic typing allowed non-array values to pass through
4. **API Contract Assumptions**: Code assumed backend always returns arrays, but didn't verify

#### Bug 2 (useState import)
1. **No Build-Time Validation**: Import error wasn't caught by linter or build process
2. **Missing Tests**: TimezoneSelector had no unit tests to catch the crash
3. **Manual Testing Gap**: Account Settings page wasn't tested after recent changes
4. **Code Review Miss**: Import typo wasn't noticed during code review

---

## Impact

### Bug 1: Meal Planning
- **User Experience**: Complete feature failure - users couldn't add meals to plans
- **Data Loss Risk**: None (crash occurred before data modification)
- **Workaround**: None available to users
- **Affected Users**: All users attempting to use meal planning feature

### Bug 2: Account Settings
- **User Experience**: Complete page crash - users couldn't access account settings
- **Data Loss Risk**: None (crash occurred on page load)
- **Workaround**: None available to users
- **Affected Users**: All users attempting to view/update account settings
- **Additional Impact**: Users couldn't update timezone, preventing proper backup scheduling

---

## The Fix

### Code Changes

**1. TimezoneSelector.jsx** - Fixed import and PropTypes:

```javascript
// BEFORE (broken)
import { useState } from 'prop-types';

TimezoneSelector.propTypes = {
  value: String,
  onChange: Function,
  // ...
};

// AFTER (fixed)
import { useState } from 'react';
import PropTypes from 'prop-types';

TimezoneSelector.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  // ...
};
```

**2. RecipeSelectorModal.jsx** - Added defensive programming:

```javascript
// BEFORE (vulnerable)
const { allTags, allCuisines } = useMemo(() => {
  const tags = new Set();
  const cuisines = new Set();
  
  recipes.forEach(recipe => {
    recipe.tags?.forEach(tag => tags.add(tag));
    if (recipe.cuisine) cuisines.add(recipe.cuisine);
  });
  
  return {
    allTags: Array.from(tags).sort(),
    allCuisines: Array.from(cuisines).sort()
  };
}, [recipes]);

// AFTER (safe)
const { allTags, allCuisines } = useMemo(() => {
  const tags = new Set();
  const cuisines = new Set();
  
  // Ensure recipes is an array before iterating
  const recipeArray = Array.isArray(recipes) ? recipes : [];
  
  recipeArray.forEach(recipe => {
    recipe.tags?.forEach(tag => tags.add(tag));
    if (recipe.cuisine) cuisines.add(recipe.cuisine);
  });
  
  return {
    allTags: Array.from(tags).sort(),
    allCuisines: Array.from(cuisines).sort()
  };
}, [recipes]);
```

Applied the same defensive pattern to:
- `filteredRecipes` useMemo
- `selectedRecipe` find operation
- Recipe count display

**3. MealPlanningPage.jsx** - Improved data handling:

```javascript
// BEFORE (vulnerable)
setRecipes(recipesResponse.data || []);

// AFTER (safe)
const recipesData = recipesResponse.data;
setRecipes(Array.isArray(recipesData) ? recipesData : []);
```

### Test Coverage Added

**For Meal Planning Bug:**

Added three regression tests to prevent recurrence:

1. **Test: handles non-array recipes data gracefully**
   - Verifies component doesn't crash with `null` recipes
   - Ensures page still functions

2. **Test: handles non-array recipes data in RecipeSelectorModal**
   - Opens modal with `null` recipes data
   - Verifies empty state message appears

3. **Test: handles recipes data as an object instead of array**
   - Simulates wrong API response structure `{ recipes: [...] }`
   - Ensures graceful degradation

**For TimezoneSelector Bug:**

Need to add unit tests for TimezoneSelector component (currently missing).

---

## SDLC Process Failure Analysis

### What We Missed

#### Phase 2: Requirements Documentation ⚠️
- **Gap**: REQ-011 (Meal Planning) didn't specify error handling for malformed data
- **Should Have**: Included acceptance criteria for edge cases and error scenarios

#### Phase 4: Development 🔴
- **Gap**: Didn't use defensive programming practices (Bug 1)
- **Gap**: Typo in critical import statement (Bug 2)
- **Gap**: Incorrect PropTypes definition syntax (Bug 2)
- **Should Have**: Applied `Array.isArray()` checks before array operations
- **Should Have**: Validated data types at component boundaries
- **Should Have**: Used proper PropTypes syntax consistently

#### Phase 5: Testing 🔴 CRITICAL FAILURE
- **Gap**: Tests only covered happy paths with perfect data (Bug 1)
- **Gap**: TimezoneSelector component had NO tests at all (Bug 2)
- **Should Have**: Tested edge cases:
  - Null/undefined API responses
  - Malformed data structures
  - Network failures
  - Empty responses
- **Gap**: No integration tests for API contract violations
- **Gap**: No smoke tests for basic component rendering
- **Should Have**: Used property-based testing or fuzzing for data validation
- **Should Have**: 100% component test coverage (at least render tests)

#### Phase 6: Code Review ⚠️
- **Gap**: Review didn't catch lack of defensive programming (Bug 1)
- **Gap**: Review didn't catch import typo (Bug 2)
- **Gap**: Review didn't catch incorrect PropTypes syntax (Bug 2)
- **Should Have**: Checklist item: "Are array operations protected?"
- **Should Have**: Checklist item: "Are all imports correct?"
- **Should Have**: Checklist item: "Are PropTypes properly defined?"
- **Should Have**: Verification of error handling paths
- **Should Have**: Automated import validation

---

## Lessons Learned

### 1. Defensive Programming is Essential

**Principle**: Always validate data types before using type-specific methods.

```javascript
// ❌ NEVER assume data types
recipes.forEach(...)

// ✅ ALWAYS verify data types
const recipeArray = Array.isArray(recipes) ? recipes : [];
recipeArray.forEach(...)
```

### 2. Test Edge Cases, Not Just Happy Paths

**Before**:
```javascript
it('displays recipes', () => {
  // Only test with valid data
  const recipes = [{ id: 1, title: 'Test' }];
  render(<Component recipes={recipes} />);
});
```

**After**:
```javascript
it('displays recipes', () => {
  // Test with valid data
  const recipes = [{ id: 1, title: 'Test' }];
  render(<Component recipes={recipes} />);
});

it('handles null recipes', () => {
  render(<Component recipes={null} />);
  // Should not crash
});

it('handles object instead of array', () => {
  render(<Component recipes={{ data: [] }} />);
  // Should show empty state
});
```

### 3. TypeScript Would Have Prevented BOTH Bugs

Both bugs would have been caught at compile time with TypeScript:

**Bug 1 (recipes.forEach):**

```typescript
interface RecipeSelectorModalProps {
  recipes: Recipe[]; // Type enforced - must be array
  // ...
}

// This would fail to compile:
<RecipeSelectorModal recipes={null} />
```

**Bug 2 (useState import):**
```typescript
// TypeScript would error immediately
import { useState } from 'prop-types'; // ❌ Error: 'useState' not exported from 'prop-types'

// PropTypes would also be type-checked
interface TimezoneProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // ...
}
// No need for runtime PropTypes validation
```

**Recommendation**: Strongly consider TypeScript migration for V3.0

### 4. Update Testing Checklist

Add to our testing requirements:
- [ ] Test with null/undefined props
- [ ] Test with wrong data types
- [ ] Test with empty data
- [ ] Test with malformed API responses
- [ ] Test network failure scenarios
- [ ] **Every component must have at least a render test**
- [ ] Test component rendering doesn't crash
- [ ] Verify all imports are correct

---

## Action Items

### Immediate (Completed ✅)
- [x] Fix TimezoneSelector import error
- [x] Fix TimezoneSelector PropTypes syntax
- [x] Fix RecipeSelectorModal defensive programming
- [x] Fix MealPlanningPage data handling
- [x] Add regression tests for meal planning edge cases
- [x] Document both issues

### Short-Term (Next Sprint)
- [ ] Add unit tests for TimezoneSelector component  
- [ ] Audit all import statements across the codebase
- [ ] Audit all components for similar vulnerabilities
- [ ] Verify PropTypes syntax in all components
- [ ] Ensure 100% component render test coverage (minimum)
- [ ] Create comprehensive edge case test suite
- [ ] Update code review checklist with import verification
- [ ] Add ESLint rule to catch incorrect imports

### Long-Term (V3.0 Planning)
- [ ] Evaluate TypeScript migration
- [ ] Implement property-based testing framework
- [ ] Add API response validation middleware
- [ ] Create error boundary components for graceful failures

---

## Prevention Strategy

### Updated SDLC Phase 5: Testing

Add to testing requirements:

```markdown
## Component Testing Requirements

Minimum requirements for EVERY component:
- [ ] Component renders without crashing
- [ ] Component renders with default props
- [ ] Component renders with all prop variations
- [ ] Imports are correct and tests pass

## Edge Case Testing Checklist

For components that receive external data:
- [ ] Test with null values
- [ ] Test with undefined values
- [ ] Test with wrong data types (object vs array)
- [ ] Test with empty data
- [ ] Test with malformed nested structures
- [ ] Test with API errors
- [ ] Test with network failures

For array operations:
- [ ] Verify Array.isArray() check before .forEach()
- [ ] Verify Array.isArray() check before .map()
- [ ] Verify Array.isArray() check before .filter()
- [ ] Verify Array.isArray() check before .find()
```

### Updated Code Review Checklist

```markdown
## Imports and Dependencies
- [ ] All imports are from correct packages
- [ ] No typos in import statements
- [ ] PropTypes imported from 'prop-types'
- [ ] React hooks imported from 'react'
- [ ] No circular dependencies

## Data Validation
- [ ] All external data validated before use
- [ ] Array operations protected with Array.isArray()
- [ ] Object operations protected with typeof checks
- [ ] Optional chaining (?.) used appropriately
- [ ] Null coalescing (??) used for defaults

## PropTypes
- [ ] PropTypes properly defined using PropTypes.* syntax
- [ ] Not using JavaScript constructors (String, Function, etc.)
- [ ] Required props marked with .isRequired
- [ ] Default props defined when appropriate
```

---

## Related Issues

### Similar Vulnerabilities to Check
- Similar array operation pattern may exist in other components receiving API data
- Other components may have import typos
- Other components may use incorrect PropTypes syntax
- Other components may lack basic render tests

### Recommended Audits
- [ ] Audit all import statements for typos
- [ ] Review all PropTypes definitions for correct syntax
- [ ] Add ESLint rule to detect unprotected array operations
- [ ] Add ESLint rule to validate PropTypes usage
- [ ] Review all usages of `.forEach()`, `.map()`, `.filter()` without guards
- [ ] Identify components without test files

---

## References

- **Files Modified**:
  - `frontend/src/components/TimezoneSelector.jsx` (Bug 2)
  - `frontend/src/components/RecipeSelectorModal.jsx` (Bug 1)
  - `frontend/src/components/MealPlanningPage.jsx` (Bug 1)
  - `frontend/src/components/__tests__/MealPlanningPage.test.jsx` (Bug 1 tests)

- **Related Documentation**:
  - [SDLC.md](../SDLC.md) - Phase 5: Testing
  - [REQ-011-meal-planning.md](../../reqs/REQ-011-meal-planning.md)

---

**Document Version**: 1.0  
**Last Updated**: February 18, 2026  
**Author**: Development Team  
**Reviewed By**: [Pending]