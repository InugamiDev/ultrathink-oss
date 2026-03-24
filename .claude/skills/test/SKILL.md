---
name: test
description: Test planning, generation, and execution -- unit, integration, and end-to-end testing workflows
layer: hub
category: workflow
triggers:
  - "/test"
  - "write tests"
  - "test this"
  - "add test coverage"
  - "run the tests"
  - "check if tests pass"
inputs:
  - target: Code, feature, or file(s) to test
  - testType: unit | integration | e2e | all (optional, defaults to appropriate type)
  - framework: Test framework to use (optional, auto-detected from project config)
outputs:
  - testPlan: Strategy document listing what to test and why
  - testFiles: Generated test file(s) with complete test cases
  - testResults: Output from running the tests
  - coverageReport: Coverage summary for the tested area (if available)
linksTo:
  - scout
  - debug
  - fix
  - code-review
linkedFrom:
  - fix
  - refactor
  - optimize
  - cook
  - team
  - ship
preferredNextSkills:
  - code-review
  - fix
fallbackSkills:
  - debug
  - scout
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates or modifies test files
  - Runs test commands
  - May install test dependencies
---

# Test Skill

## Purpose

Plan, generate, and execute tests that verify code correctness, prevent regressions, and document expected behavior. This skill covers the full testing lifecycle from strategy through execution.

Tests are not bureaucracy. Tests are executable documentation that proves your code works.

## Workflow

### Mode 1: Test Planning

Use when you need to decide WHAT to test before writing tests.

1. **Identify the testing target** -- What code/feature needs tests?
2. **Read the target code** -- Understand what it does, its inputs, outputs, and edge cases.
3. **Detect existing test infrastructure**
   - What test framework is in use? (Jest, Vitest, pytest, Go testing, etc.)
   - Where do tests live? (co-located, separate `tests/` directory, `__tests__` folders)
   - What testing utilities exist? (test helpers, factories, mocks, fixtures)
   - What is the test runner command?
4. **Categorize test needs**:
   - **Unit tests**: Individual functions/methods in isolation
   - **Integration tests**: Multiple components working together
   - **E2E tests**: Full user flows through the system
5. **Produce the test plan**:

```markdown
# Test Plan: [Target]

## Target
[What is being tested]

## Test Infrastructure
- **Framework**: [name + version]
- **Runner command**: [command]
- **Test location**: [where tests should go]

## Unit Tests
| Test | Input | Expected Output | Edge Case? |
|------|-------|----------------|------------|
| [function] handles valid input | [input] | [output] | No |
| [function] handles empty input | [] | [] or error | Yes |
| [function] handles null | null | throws TypeError | Yes |

## Integration Tests
| Test | Components | Scenario |
|------|-----------|----------|
| [feature] happy path | A + B + C | [description] |
| [feature] error propagation | A + B | [description] |

## Edge Cases to Cover
- [edge case 1]
- [edge case 2]

## Not Testing (and why)
- [thing]: [reason -- e.g., "covered by upstream tests"]
```

### Mode 2: Test Generation

Use when you need to WRITE tests.

1. **Read the target code** thoroughly.
2. **Read existing tests** in the same area to match conventions.
3. **Generate tests** following these principles:
   - **Arrange-Act-Assert** (AAA) pattern for every test
   - **One assertion per test** (prefer focused tests over multi-assert tests)
   - **Descriptive test names** that read as specifications: `it('returns 404 when user does not exist')`
   - **Test behavior, not implementation** -- tests should not break when internals are refactored
   - **Cover the testing triangle**:
     - Happy path (normal correct behavior)
     - Edge cases (empty inputs, boundaries, max values)
     - Error cases (invalid inputs, network failures, permission errors)
     - Null/undefined handling

4. **Test file structure**:
```typescript
describe('[ModuleName]', () => {
  describe('[functionName]', () => {
    // Setup shared across this function's tests
    beforeEach(() => { /* ... */ });

    it('does X when given Y', () => {
      // Arrange
      const input = createTestInput();

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it('throws when given invalid input', () => {
      expect(() => functionName(null)).toThrow(ValidationError);
    });

    it('handles edge case: empty array', () => {
      const result = functionName([]);
      expect(result).toEqual([]);
    });
  });
});
```

5. **Mocking strategy**:
   - Mock external dependencies (APIs, databases, file system)
   - Do NOT mock the code under test
   - Prefer dependency injection over module mocking where possible
   - Use factory functions for test data, not inline literals
   - Reset mocks between tests

6. **Write the test file** using the Write tool (new file) or Edit tool (adding to existing).

### Mode 3: Test Execution

Use when you need to RUN tests and interpret results.

1. **Determine the test command** from project configuration.
2. **Run tests**:
   - Specific test file: `npm test -- path/to/test.ts`
   - Specific test: `npm test -- --testNamePattern="test name"`
   - Full suite: `npm test`
   - With coverage: `npm test -- --coverage`
3. **Interpret results**:
   - **All pass**: Report success with summary
   - **Failures**: For each failure:
     - What test failed?
     - What was expected vs. actual?
     - Is this a test bug or a code bug?
   - **Errors**: Test infrastructure problems (missing deps, config issues)
4. **If tests fail**:
   - Determine if the test is correct and the code is wrong (hand off to `fix`)
   - Or if the code is correct and the test needs updating (fix the test)
   - Or if there is a test infrastructure issue (fix the setup)

### Mode 4: Coverage Analysis

1. **Run with coverage** enabled.
2. **Identify uncovered areas**:
   - Uncovered lines/branches in the target code
   - Missing edge case coverage
   - Untested error paths
3. **Prioritize coverage gaps** by risk:
   - High risk: Error handling, security-related, data mutation
   - Medium risk: Business logic branches, edge cases
   - Low risk: Logging, formatting, display-only code
4. **Generate additional tests** for high-priority gaps.

## Usage

### Plan tests
```
/test Plan tests for the authentication module
```

### Write tests
```
/test Write unit tests for src/lib/utils/formatDate.ts
```

### Run tests
```
/test Run the test suite and report results
```

### After a fix
```
/test Write a regression test for the bug fixed in src/lib/orders.ts
```

### Coverage improvement
```
/test Improve test coverage for the payment processing module
```

## Examples

### Example: Unit test generation

**Target**: `formatCurrency(amount: number, currency: string): string`

**Generated tests**:
- `formatCurrency(10.5, 'USD')` returns `'$10.50'`
- `formatCurrency(0, 'USD')` returns `'$0.00'`
- `formatCurrency(-5, 'USD')` returns `'-$5.00'`
- `formatCurrency(1000000, 'USD')` returns `'$1,000,000.00'`
- `formatCurrency(10.5, 'EUR')` returns `'EUR10.50'` (or locale-appropriate)
- `formatCurrency(10.5, 'INVALID')` throws `UnsupportedCurrencyError`
- `formatCurrency(NaN, 'USD')` throws `InvalidAmountError`
- `formatCurrency(Infinity, 'USD')` throws `InvalidAmountError`

### Example: Integration test

**Target**: User registration flow (API endpoint + database + email)

**Generated tests**:
- POST `/api/register` with valid data creates user and sends welcome email
- POST `/api/register` with existing email returns 409 Conflict
- POST `/api/register` with invalid email returns 400 with validation errors
- POST `/api/register` when email service is down creates user but logs email failure
- Verify password is hashed before storage (never stored in plaintext)

## Guidelines

- **Test behavior, not implementation** -- A test should still pass after a refactor that does not change behavior.
- **One test, one concern** -- If a test name has "and" in it, split it into two tests.
- **Tests are documentation** -- Someone reading only the tests should understand what the code does.
- **Fast tests are run more often** -- Keep unit tests fast. Save slow tests for CI.
- **Deterministic always** -- Tests must produce the same result every time. No random data, no time-dependent logic without mocking.
- **Independent tests** -- Tests must not depend on execution order or shared mutable state.
- **Match project conventions** -- Use the same test framework, file naming, and patterns as the rest of the project.
- **Do not test third-party code** -- Trust that libraries work. Test YOUR code's interaction with them.
- **Regression tests tell stories** -- A regression test's name should reference the bug it prevents: `it('does not crash when API returns error without items field (fixes #123)')`.
