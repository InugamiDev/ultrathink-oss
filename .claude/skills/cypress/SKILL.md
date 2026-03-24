# Cypress

- **Layer**: domain
- **Category**: testing
- **Risk Level**: low
- **Triggers**: cypress, e2e test, end-to-end test, integration test, cy.get, cy.intercept

## Overview

JavaScript end-to-end testing framework that runs in the browser alongside your app. Features time-travel debugging, automatic waiting, real-time reloads, and network request stubbing.

## When to Use

- Writing end-to-end or integration tests for web applications
- Testing user flows across multiple pages or components
- Validating API interactions with request interception
- Component-level testing in isolation (Cypress Component Testing)
- Debugging flaky or failing UI tests

## Key Patterns

### Commands and Chaining
Cypress commands are asynchronous and chainable. Use `cy.get('[data-cy="submit"]')`, `cy.contains('Text')`, `.click()`, `.type('input')`, `.should('be.visible')`. Never assign return values to variables — chain assertions instead.

### Custom Commands
Extend Cypress via `Cypress.Commands.add('login', (email, pw) => { ... })` in `cypress/support/commands.ts`. Use for repeated flows like authentication. Type with `declare namespace Cypress { interface Chainable { ... } }`.

### Fixtures and Test Data
Store JSON fixtures in `cypress/fixtures/`. Load with `cy.fixture('user.json')` or reference in `cy.intercept()` responses. Keep fixtures minimal and deterministic.

### Network Interception
Use `cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers')` to stub or spy on requests. Wait with `cy.wait('@getUsers')`. Intercept before the action that triggers the request.

### Component Testing
Mount components with `cy.mount(<Component />)` in `cypress/component/` specs. Configure via `component` key in `cypress.config.ts`. Useful for testing components in isolation with full DOM access.

### Best Practices
- Use `data-cy` attributes for selectors — resilient to CSS/markup changes
- Avoid `cy.wait(ms)` — use `cy.intercept` aliases or assertions instead
- Each test should be independent — use `beforeEach` for setup, never rely on test order
- Keep tests deterministic by controlling data via fixtures and intercepts

### Screenshots, Videos, and Config
Cypress auto-captures screenshots on failure and records video in headless mode. Configure in `cypress.config.ts`: `screenshotsFolder`, `videosFolder`, `viewportWidth`, `baseUrl`, `retries`.

### Environment Variables and CI
Use `cypress.env.json` or `CYPRESS_*` env vars for environment-specific config. Access via `Cypress.env('key')`. In CI, run `npx cypress run --record --key <key>` with parallelization via `--parallel`.

## Anti-Patterns

- **Coupling to CSS classes or markup structure** — use `data-cy` attributes instead
- **Arbitrary waits** (`cy.wait(3000)`) — use intercept aliases or retry-able assertions
- **Sharing state between tests** — each `it()` block must be self-contained
- **Testing third-party sites** — only test what you control
- **Using the UI for repetitive setup** — use `cy.request()` or `cy.session()` for auth

## Related Skills

`test` | `testing-patterns` | `playwright` | `react`
