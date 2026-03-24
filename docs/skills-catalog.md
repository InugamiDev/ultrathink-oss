# Skills Catalog

## Overview

UltraThink contains **104 skills** organized across 4 layers. Skills are not isolated tools -- they form a mesh network where each skill declares explicit links to other skills it can call (`linksTo`) and skills that can call it (`linkedFrom`).

Every skill lives in `.claude/skills/[name]/SKILL.md` with YAML frontmatter (metadata) and Markdown body (instructions).

## Layer 1: Orchestrators (7 skills)

Orchestrators are top-level commanders that coordinate end-to-end workflows. They receive user intent and delegate work to hubs, utilities, and specialists.

| Skill | Description | Key Links |
|-------|-------------|-----------|
| **cook** | End-to-end feature builder: plan, research, scout, code, test, review, ship | plan, research, scout, code-review, test, fix, refactor, optimize |
| **team** | Multi-agent coordination for complex tasks requiring parallel workstreams | cook, plan, scout, debug |
| **ship** | Release management: version bumps, changelog generation, deployment | plan, test, code-review, git-workflow, changelog-writer, pr-writer |
| **bootstrap** | Project scaffolding: initialize new projects with structure, config, CI/CD | plan, scout, onboard |
| **onboard** | New contributor onboarding: explain codebase, conventions, and workflows | scout, docs-seeker, code-explainer |
| **skill-creator** | Create new skills: scaffold SKILL.md, validate metadata, register in graph | plan, scout |
| **audit** | Full codebase audit: security, performance, quality, dependency review | security-scanner, code-review, dependency-analyzer, performance-profiler |

## Layer 2: Workflow Hubs (15 skills)

Hubs are mid-level coordinators that perform scoped workflow orchestration. They call utilities and specialists, and can call each other.

| Skill | Description | Key Links |
|-------|-------------|-----------|
| **plan** | Create phased implementation plans with risks, assumptions, milestones | plan-validate, scout, research, brainstorm |
| **plan-validate** | Validate existing plans against user intent via reverse-questioning | plan, sequential-thinking |
| **plan-archive** | Archive completed plans with journey journals written to memory | plan, kanban |
| **debug** | Hypothesis-driven debugging: symptom analysis, hypothesis testing, root cause | fix, scout, test, code-review |
| **fix** | Apply targeted fixes to identified issues with minimal diff | debug, test, code-review |
| **test** | Test generation and execution: unit, integration, e2e | debug, testing-patterns, test-ui |
| **test-ui** | Multi-viewport UI testing with screenshot capture and report generation | test, chrome-devtools |
| **code-review** | Multi-pass code review: logic, security, performance, style | security-scanner, performance-profiler, testing-patterns |
| **scout** | Codebase exploration: structure mapping, pattern detection, dependency analysis | mermaid, dependency-analyzer, code-explainer |
| **brainstorm** | Divergent thinking: idea generation, option evaluation, recommendation | plan, research, sequential-thinking |
| **kanban** | Project board management: backlog, planned, in-progress, blocked, review, done | plan, plan-archive |
| **preview** | Read and present plans or markdown files in concise/full/executive modes | plan |
| **refactor** | Code restructuring: extract, rename, reorganize while preserving behavior | scout, test, code-review |
| **optimize** | Performance optimization: profiling, bottleneck identification, improvement | performance-profiler, scout |
| **migrate** | Data and schema migration planning and execution | data-modeling, postgresql, migration-planner |

## Layer 3: Utility Providers (30 skills)

Utilities are reusable, mostly stateless tools that provide focused capabilities. Multiple hubs can reference the same utility.

| Skill | Description |
|-------|-------------|
| **research** | Deep research via web search, Context7, and documentation retrieval |
| **docs-seeker** | Documentation lookup and retrieval for libraries and frameworks |
| **sequential-thinking** | Structured multi-step reasoning for complex decisions |
| **problem-solving** | Systematic problem decomposition and solution design |
| **ai-multimodal** | Multi-modal AI interactions: image analysis, generation, processing |
| **chrome-devtools** | Browser DevTools integration for debugging and inspection |
| **repomix** | Repository packaging and context preparation for AI consumption |
| **context-engineering** | Long-conversation context management and optimization |
| **mermaid** | Diagram generation: flowcharts, sequence diagrams, ERDs |
| **ui-ux-pro** | UI/UX design guidance: layouts, patterns, accessibility |
| **media-processing** | Image, video, and audio processing utilities |
| **commit-crafter** | Structured commit message generation following conventions |
| **pr-writer** | Pull request description generation with context |
| **changelog-writer** | Changelog generation from commit history |
| **docs-writer** | Technical documentation generation |
| **code-explainer** | Code explanation at varying depth levels |
| **dependency-analyzer** | Dependency graph analysis and vulnerability detection |
| **performance-profiler** | Performance profiling and bottleneck identification |
| **security-scanner** | Security vulnerability scanning and reporting |
| **testing-patterns** | Test pattern reference and best practice guidance |
| **data-modeling** | Database schema design and normalization |
| **api-designer** | API design: REST, GraphQL, contracts, versioning |
| **git-workflow** | Git workflow management: branching, merging, rebasing |
| **json-transformer** | JSON manipulation, transformation, and validation |
| **regex-builder** | Regular expression construction and testing |
| **migration-planner** | Migration strategy planning for databases and systems |
| **prompt-engineering** | Prompt design and optimization for AI systems |
| **error-handling** | Error handling patterns and strategies |
| **logging** | Logging architecture and implementation |
| **encryption** | Encryption and cryptographic pattern guidance |

## Layer 4: Domain Specialists (52 skills)

Domain specialists provide deep expertise in specific technologies, frameworks, and platforms. They are called by utilities and hubs when work touches their domain.

### Frontend

| Skill | Description |
|-------|-------------|
| **react** | React patterns: hooks, context, components, performance |
| **nextjs** | Next.js 15: App Router, Server Components, API routes |
| **vue** | Vue.js patterns and best practices |
| **svelte** | Svelte and SvelteKit development |
| **react-native** | React Native mobile development |
| **tailwindcss** | Tailwind CSS utility-first styling |
| **css-architecture** | CSS architecture: BEM, modules, design tokens |
| **typescript-frontend** | TypeScript patterns for frontend applications |
| **forms** | Form handling: validation, state management, accessibility |
| **state-management** | State management patterns: Context, Zustand, Redux, Jotai |
| **animation** | Animation: Framer Motion, CSS transitions, GSAP |
| **pwa** | Progressive Web App development |
| **threejs** | Three.js 3D graphics and WebGL |
| **design-systems** | Design system creation and maintenance |

### Backend

| Skill | Description |
|-------|-------------|
| **nodejs** | Node.js runtime patterns and best practices |
| **python** | Python development patterns |
| **golang** | Go language patterns and idioms |
| **rust** | Rust development patterns |
| **django** | Django framework development |
| **fastapi** | FastAPI framework development |
| **shell-scripting** | Shell scripting: bash, zsh, POSIX |
| **graphql** | GraphQL schema design and resolvers |
| **websockets** | WebSocket implementation and patterns |
| **message-queues** | Message queue patterns: Redis, RabbitMQ, Kafka |
| **microservices** | Microservices architecture and communication |
| **caching** | Caching strategies: Redis, CDN, application-level |

### Databases

| Skill | Description |
|-------|-------------|
| **postgresql** | PostgreSQL: queries, indexes, extensions, optimization |
| **mongodb** | MongoDB: schema design, aggregation, indexing |
| **redis** | Redis: data structures, caching, pub/sub |
| **prisma** | Prisma ORM: schema, migrations, queries |
| **drizzle** | Drizzle ORM: schema definition and queries |
| **supabase** | Supabase platform: auth, database, storage, realtime |

### DevOps & Infrastructure

| Skill | Description |
|-------|-------------|
| **docker** | Docker: images, containers, compose, multi-stage builds |
| **kubernetes** | Kubernetes: deployments, services, configmaps, helm |
| **terraform** | Terraform infrastructure-as-code |
| **cicd** | CI/CD pipeline design: GitHub Actions, GitLab CI |
| **aws** | AWS services: Lambda, S3, RDS, ECS, CloudFront |
| **vercel** | Vercel deployment and configuration |
| **cloudflare** | Cloudflare: Workers, Pages, R2, D1 |
| **nginx** | Nginx configuration and optimization |
| **linux-admin** | Linux system administration |
| **monitoring** | Monitoring: Prometheus, Grafana, alerting |

### Security & Auth

| Skill | Description |
|-------|-------------|
| **authentication** | Authentication patterns: JWT, OAuth, sessions |
| **better-auth** | Better Auth library integration |
| **owasp** | OWASP security reference and compliance |

### Business Logic

| Skill | Description |
|-------|-------------|
| **billing** | Billing system design and implementation |
| **stripe** | Stripe payment integration |
| **ecommerce** | E-commerce patterns and implementations |
| **shopify** | Shopify platform development |

### AI & ML

| Skill | Description |
|-------|-------------|
| **ai-agents** | AI agent design and implementation |
| **rag** | Retrieval-augmented generation patterns |
| **ml-ops** | ML operations: training, deployment, monitoring |

### Documentation & Release

| Skill | Description |
|-------|-------------|
| **release-manager** | Release process management |

## Skill Count Summary

| Layer | Count | Role |
|-------|-------|------|
| Orchestrators | 7 | End-to-end task coordination |
| Workflow Hubs | 15 | Domain-specific workflow management |
| Utility Providers | 30 | Reusable stateless capabilities |
| Domain Specialists | 52 | Deep technology expertise |
| **Total** | **104** | |

## Finding Skills

### By Trigger

Skills define natural language triggers in their YAML frontmatter. Saying "debug this" will match the `debug` skill's trigger list.

### By Layer

Use the dashboard's Skills page to browse skills by layer, or check the tables above.

### By Category

Skills are categorized in their frontmatter. Common categories: `orchestration`, `workflow`, `utility`, `frontend`, `backend`, `database`, `devops`, `security`, `ai`.

## Related Documentation

- [Skill Linking Model](./skill-linking-model.md) -- How skills connect to each other
- [How to Create a New Skill](./how-to-create-a-new-skill.md) -- Adding new skills
- [How to Link Skills](./how-to-link-skills.md) -- Connecting skills in the mesh
- [Command System](./command-system.md) -- Commands that trigger skills
