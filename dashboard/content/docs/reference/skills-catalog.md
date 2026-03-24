# Skills Catalog

Complete catalog of all skills organized by layer.

## Layer 1: Orchestrators (7 skills)

Top-level commanders that coordinate end-to-end workflows.

| Skill | Description | Key Links |
|-------|-------------|-----------|
| **cook** | End-to-end feature builder: plan, research, scout, code, test, review, ship | plan, research, scout, code-review, test, fix, refactor, optimize |
| **team** | Multi-agent coordination for complex tasks requiring parallel workstreams | cook, plan, scout, debug |
| **ship** | Release management: version bumps, changelog generation, deployment | plan, test, code-review, git-workflow, changelog-writer, pr-writer |
| **bootstrap** | Project scaffolding: initialize new projects with structure, config, CI/CD | plan, scout, onboard |
| **onboard** | New contributor onboarding: explain codebase, conventions, workflows | scout, docs-seeker, code-explainer |
| **skill-creator** | Create new skills: scaffold SKILL.md, validate metadata, register in graph | plan, scout |
| **audit** | Full codebase audit: security, performance, quality, dependency review | security-scanner, code-review, dependency-analyzer, performance-profiler |

## Layer 2: Workflow Hubs (15 skills)

Mid-level coordinators for scoped workflow orchestration.

| Skill | Description | Key Links |
|-------|-------------|-----------|
| **plan** | Create phased implementation plans with risks, assumptions, milestones | plan-validate, scout, research, brainstorm |
| **plan-validate** | Validate existing plans against user intent via reverse-questioning | plan, sequential-thinking |
| **plan-archive** | Archive completed plans with journey journals written to memory | plan, kanban |
| **debug** | Hypothesis-driven debugging: symptom analysis, hypothesis testing | fix, scout, test, code-review |
| **fix** | Apply targeted fixes to identified issues with minimal diff | debug, test, code-review |
| **test** | Test generation and execution: unit, integration, e2e | debug, testing-patterns, test-ui |
| **test-ui** | Multi-viewport UI testing with screenshot capture and reports | test, chrome-devtools |
| **code-review** | Multi-pass code review: logic, security, performance, style | security-scanner, performance-profiler, testing-patterns |
| **scout** | Codebase exploration: structure mapping, pattern detection | mermaid, dependency-analyzer, code-explainer |
| **brainstorm** | Divergent thinking: idea generation, option evaluation | plan, research, sequential-thinking |
| **kanban** | Project board management: backlog through done | plan, plan-archive |
| **preview** | Read and present plans or markdown in concise/full/executive modes | plan |
| **refactor** | Code restructuring while preserving behavior | scout, test, code-review |
| **optimize** | Performance optimization: profiling, bottleneck identification | performance-profiler, scout |
| **migrate** | Data and schema migration planning and execution | data-modeling, postgresql, migration-planner |

## Layer 3: Utility Providers (30 skills)

Reusable, mostly stateless tools.

| Skill | Description |
|-------|-------------|
| **research** | Deep research via web search, Context7, and documentation |
| **docs-seeker** | Documentation lookup and retrieval |
| **sequential-thinking** | Structured multi-step reasoning |
| **problem-solving** | Systematic problem decomposition |
| **ai-multimodal** | Multi-modal AI interactions |
| **chrome-devtools** | Browser DevTools integration |
| **repomix** | Repository packaging for AI consumption |
| **context-engineering** | Long-conversation context management |
| **mermaid** | Diagram generation: flowcharts, sequence, ERD |
| **ui-ux-pro** | UI/UX design guidance and accessibility |
| **media-processing** | Image, video, and audio processing |
| **commit-crafter** | Structured commit message generation |
| **pr-writer** | Pull request description generation |
| **changelog-writer** | Changelog generation from commit history |
| **docs-writer** | Technical documentation generation |
| **code-explainer** | Code explanation at varying depth |
| **dependency-analyzer** | Dependency graph analysis |
| **performance-profiler** | Performance profiling |
| **security-scanner** | Security vulnerability scanning |
| **testing-patterns** | Test pattern reference |
| **data-modeling** | Database schema design |
| **api-designer** | API design: REST, GraphQL, contracts |
| **git-workflow** | Git workflow management |
| **json-transformer** | JSON manipulation and validation |
| **regex-builder** | Regular expression construction |
| **migration-planner** | Migration strategy planning |
| **prompt-engineering** | Prompt design and optimization |
| **error-handling** | Error handling patterns |
| **logging** | Logging architecture |
| **encryption** | Encryption and cryptographic patterns |

## Layer 4: Domain Specialists (52 skills)

Deep expertise in specific technologies.

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
| **typescript-frontend** | TypeScript patterns for frontend |
| **forms** | Form handling: validation, state, accessibility |
| **state-management** | State management: Context, Zustand, Redux, Jotai |
| **animation** | Animation: Framer Motion, CSS transitions, GSAP |
| **pwa** | Progressive Web App development |
| **threejs** | Three.js 3D graphics and WebGL |
| **design-systems** | Design system creation and maintenance |

### Backend

| Skill | Description |
|-------|-------------|
| **nodejs** | Node.js runtime patterns |
| **python** | Python development patterns |
| **golang** | Go language patterns |
| **rust** | Rust development patterns |
| **django** | Django framework |
| **fastapi** | FastAPI framework |
| **shell-scripting** | Shell scripting: bash, zsh, POSIX |
| **graphql** | GraphQL schema design and resolvers |
| **websockets** | WebSocket implementation |
| **message-queues** | Message queues: Redis, RabbitMQ, Kafka |
| **microservices** | Microservices architecture |
| **caching** | Caching strategies: Redis, CDN, app-level |

### Databases

| Skill | Description |
|-------|-------------|
| **postgresql** | PostgreSQL: queries, indexes, extensions |
| **mongodb** | MongoDB: schema design, aggregation |
| **redis** | Redis: data structures, caching, pub/sub |
| **prisma** | Prisma ORM: schema, migrations, queries |
| **drizzle** | Drizzle ORM: schema and queries |
| **supabase** | Supabase: auth, database, storage, realtime |

### DevOps & Infrastructure

| Skill | Description |
|-------|-------------|
| **docker** | Docker: images, containers, compose |
| **kubernetes** | Kubernetes: deployments, services, helm |
| **terraform** | Terraform infrastructure-as-code |
| **cicd** | CI/CD: GitHub Actions, GitLab CI |
| **aws** | AWS: Lambda, S3, RDS, ECS, CloudFront |
| **vercel** | Vercel deployment and configuration |
| **cloudflare** | Cloudflare: Workers, Pages, R2, D1 |
| **nginx** | Nginx configuration and optimization |
| **linux-admin** | Linux system administration |
| **monitoring** | Monitoring: Prometheus, Grafana |

### Security & Auth

| Skill | Description |
|-------|-------------|
| **authentication** | Auth patterns: JWT, OAuth, sessions |
| **better-auth** | Better Auth library integration |
| **owasp** | OWASP security reference |

### Business Logic

| Skill | Description |
|-------|-------------|
| **billing** | Billing system design |
| **stripe** | Stripe payment integration |
| **ecommerce** | E-commerce patterns |
| **shopify** | Shopify platform development |

### AI & ML

| Skill | Description |
|-------|-------------|
| **ai-agents** | AI agent design |
| **rag** | Retrieval-augmented generation |
| **ml-ops** | ML operations: training, deployment |

### Documentation & Release

| Skill | Description |
|-------|-------------|
| **release-manager** | Release process management |

## Summary

| Layer | Count | Role |
|-------|-------|------|
| Orchestrators | 7 | End-to-end task coordination |
| Workflow Hubs | 15 | Domain-specific workflow management |
| Utility Providers | 30 | Reusable stateless capabilities |
| Domain Specialists | 52 | Deep technology expertise |
| **Total** | **104** | |

## Finding Skills

- **By trigger**: Skills define natural language triggers. Saying "debug this" matches the `debug` skill.
- **By layer**: Use the dashboard's Skills page or the tables above.
- **By category**: Skills are categorized in frontmatter: `orchestration`, `workflow`, `utility`, `frontend`, `backend`, `database`, `devops`, `security`, `ai`.
