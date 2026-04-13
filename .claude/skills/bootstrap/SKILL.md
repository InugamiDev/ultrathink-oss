---
name: bootstrap
description: New project scaffolding orchestrator that sets up a complete project from scratch with the right stack, structure, configuration, and initial code.
layer: orchestrator
category: orchestration
triggers:
  - "/bootstrap"
  - "bootstrap a new project"
  - "scaffold a new app"
  - "start a new project"
  - "create a new project"
  - "init project"
inputs:
  - Project type or description (e.g., "Next.js SaaS app", "CLI tool in Rust")
  - Optional tech stack preferences
  - Optional feature requirements
  - Optional deployment target
outputs:
  - Complete project directory structure
  - Configuration files (package.json, tsconfig, eslint, etc.)
  - Initial source code with example components or modules
  - Development tooling setup (linting, formatting, testing)
  - Git repository initialized with first commit
  - README with setup instructions
linksTo:
  - plan
  - research
  - scout
  - brainstorm
  - sequential-thinking
  - git-workflow
  - commit-crafter
  - docs-writer
  - mermaid
linkedFrom:
  - team
preferredNextSkills:
  - cook
  - team
  - kanban
fallbackSkills:
  - plan
  - research
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: always
sideEffects:
  - Creates new directory structure
  - Creates configuration files
  - Creates initial source files
  - Initializes git repository
  - May install dependencies (npm install, cargo build, etc.)
  - Creates initial git commit
---

# Bootstrap

## Purpose

Bootstrap is the new project scaffolding orchestrator. It takes a project idea or specification and produces a complete, ready-to-develop project with the right directory structure, configuration, tooling, and initial code. Bootstrap doesn't just run `create-next-app` -- it makes informed decisions about project architecture, sets up quality tooling, and creates a foundation that follows best practices.

Bootstrap is opinionated but configurable. It will suggest a stack and structure based on the project type, but defers to user preferences when specified. It always errs on the side of a clean, maintainable foundation over a feature-packed but messy one.

## Workflow

### Phase 1: Discover & Decide
1. **Parse the project brief** -- Extract project type, target platform, scale expectations, and any specified technologies.
2. **Invoke `brainstorm`** (if underspecified) -- If the user gives a vague brief ("build me a SaaS"), brainstorm what the stack and structure should look like.
3. **Invoke `research`** -- Look up current best practices for the chosen stack. Check for latest versions, recommended configurations, and known pitfalls via Context7.
4. **Invoke `plan`** -- Create a scaffolding plan:
   - Directory structure
   - Configuration files needed
   - Dependencies (with versions)
   - Initial code files
   - Tooling (linter, formatter, test runner, CI)
5. **Present the plan** -- Show the user what will be created. Get confirmation before writing files.

### Phase 2: Scaffold Structure
6. **Create directory tree** -- Build out the full directory structure following conventions for the chosen stack.
7. **Write configuration files** -- Generate all config files:
   - Package manager config (package.json, Cargo.toml, pyproject.toml, etc.)
   - TypeScript/language config (tsconfig.json, etc.)
   - Linter config (eslint, clippy, ruff, etc.)
   - Formatter config (prettier, rustfmt, black, etc.)
   - Test config (jest, vitest, pytest, etc.)
   - Git config (.gitignore, .gitattributes)
   - Editor config (.editorconfig, .vscode/settings.json)
   - Environment config (.env.example)

### Phase 3: Write Initial Code
8. **Create entry points** -- Set up the main entry file(s) for the application.
9. **Create example components/modules** -- Write 1-2 example components or modules that demonstrate the project's conventions:
   - Naming conventions
   - File structure patterns
   - Import style
   - Component/module patterns
10. **Create example tests** -- Write tests for the example code to establish the testing pattern.
11. **Create shared utilities** -- Set up common utilities (error handling, logging, config loading) if appropriate for the project type.

### Phase 4: Tooling & CI
12. **Set up development scripts** -- Configure dev, build, test, lint, and format scripts.
13. **Set up CI/CD** (if requested) -- Generate GitHub Actions, GitLab CI, or other CI configuration.
14. **Set up pre-commit hooks** (if appropriate) -- Configure husky, lint-staged, or equivalent.

### Phase 5: Document & Commit
15. **Invoke `docs-writer`** -- Generate a README with:
    - Project description
    - Setup instructions
    - Available scripts
    - Project structure overview
    - Contributing guidelines (if team project)
16. **Invoke `git-workflow`** -- Initialize git repository.
17. **Invoke `commit-crafter`** -- Create the initial commit with a meaningful message.
18. **Present summary** -- Report what was created, how to get started, and suggested next steps.

## Stack Templates

### Next.js (App Router)
```
project/
  src/
    app/
      layout.tsx
      page.tsx
      globals.css
    components/
      ui/
    lib/
      utils.ts
    hooks/
    types/
  public/
  tests/
  .env.example
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
```

### Node.js API
```
project/
  src/
    routes/
    middleware/
    services/
    models/
    utils/
    config/
    index.ts
  tests/
    unit/
    integration/
  .env.example
  tsconfig.json
  package.json
```

### CLI Tool (TypeScript)
```
project/
  src/
    commands/
    utils/
    config/
    index.ts
  tests/
  bin/
  package.json
  tsconfig.json
```

### Python Package
```
project/
  src/
    package_name/
      __init__.py
      core.py
      utils.py
  tests/
    test_core.py
  pyproject.toml
  README.md
```

## Decision Points

| Condition | Action |
|-----------|--------|
| User specifies stack | Use specified stack, validate with `research` |
| User says "whatever is best" | Use `brainstorm` + `research` to recommend |
| Project is a monorepo | Set up workspace configuration (turborepo, nx, etc.) |
| Deployment target specified | Configure build output and CI for that target |
| User wants a database | Include ORM/driver setup and migration tooling |
| User wants auth | Include auth library setup and example middleware |

## Usage

Use Bootstrap at the very beginning of a new project. It sets the foundation that all subsequent development builds on.

**Best for:**
- Starting a new project from scratch
- Creating a new package or library
- Setting up a new microservice
- Scaffolding a proof of concept

**Not ideal for:**
- Adding features to existing projects (use `cook`)
- Migrating existing projects to new structures (use `migrate`)
- Restructuring an existing project (use `refactor`)

## Examples

### Example 1: SaaS application
```
User: /bootstrap Create a Next.js SaaS app with Supabase auth,
       Stripe billing, and Tailwind CSS

Bootstrap workflow:
1. research -> Latest Next.js App Router patterns, Supabase client setup,
               Stripe integration best practices
2. plan -> Directory structure, dependencies, config files
3. Scaffold -> Next.js app with app router, Tailwind, TypeScript
4. Initial code -> Auth middleware, Stripe webhook handler,
                   example dashboard page, pricing component
5. Tooling -> ESLint, Prettier, Vitest, GitHub Actions
6. docs-writer -> README with setup instructions for Supabase + Stripe
7. git-workflow + commit-crafter -> Init repo, first commit
```

### Example 2: CLI tool
```
User: /bootstrap Scaffold a Node.js CLI tool for managing Docker containers

Bootstrap workflow:
1. research -> Commander.js vs yargs vs clipanion, best CLI patterns
2. plan -> CLI structure with commands, config, output formatting
3. Scaffold -> TypeScript project with bin entry point
4. Initial code -> Help command, version command, example container-list command
5. Tooling -> ESLint, Vitest, build to CJS for Node
6. docs-writer -> README with installation and usage
7. git-workflow + commit-crafter -> Init repo, first commit
```

### Example 3: Monorepo
```
User: /bootstrap Set up a Turborepo monorepo with a Next.js frontend,
       Express API, and shared types package

Bootstrap workflow:
1. research -> Turborepo workspace config, shared package patterns
2. plan -> Root config, three packages, shared dependencies
3. Scaffold -> Turborepo root, apps/web, apps/api, packages/shared
4. Initial code -> Example page calling API, shared type definitions,
                   API route using shared types
5. Tooling -> Root ESLint, per-package tsconfig, Turborepo pipelines
6. docs-writer -> Root README + per-package READMEs
7. git-workflow + commit-crafter -> Init repo, first commit
```

## Guardrails

- **Always research before scaffolding.** Don't use stale patterns. Check current best practices.
- **Never over-scaffold.** Create what's needed, not everything possible. YAGNI applies to structure too.
- **Always include examples.** Empty directories are useless. Include at least one example file per key directory.
- **Always include tests.** The testing pattern must be established from day one.
- **Confirm before writing.** Show the plan and get user approval before creating the project.
- **Pin dependency versions.** Use exact versions or tight ranges, not `latest` or `*`.
- **Include .env.example.** Never create actual .env files, always .env.example with placeholder values.
