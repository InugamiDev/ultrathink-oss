---
name: dependency-analyzer
description: Dependency tree analysis, version conflict resolution, update planning, and bundle size optimization
layer: utility
category: devtools
triggers:
  - "dependency"
  - "dependencies"
  - "package update"
  - "bundle size"
  - "dependency tree"
  - "version conflict"
  - "npm audit"
  - "outdated packages"
inputs:
  - manifest: Package manifest (package.json, requirements.txt, go.mod, Cargo.toml)
  - concerns: Security vulnerabilities, bundle size, version conflicts, update planning
  - constraints: Breaking change tolerance, framework compatibility requirements
outputs:
  - dependency_report: Analysis of current dependency state
  - update_plan: Prioritized list of updates with risk assessment
  - bundle_analysis: Bundle size impact of dependencies
  - conflict_resolution: Resolution steps for version conflicts
  - alternative_suggestions: Lighter or more maintained alternatives
linksTo:
  - security-scanner
  - optimize
  - cicd
linkedFrom:
  - audit
  - ship
  - code-review
preferredNextSkills:
  - security-scanner
  - optimize
fallbackSkills:
  - research
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May read package manifests and lockfiles
  - May run analysis commands (npm ls, npm audit)
---

# Dependency Analyzer Skill

## Purpose

Analyze, audit, and optimize project dependencies. This skill examines dependency trees for security vulnerabilities, version conflicts, bundle size bloat, and maintenance risk. It produces actionable update plans that balance security, stability, and performance.

## Key Concepts

### Dependency Health Metrics

```
SECURITY:      Are there known CVEs? How quickly are they patched?
MAINTENANCE:   Last publish date, open issues, commit frequency
POPULARITY:    Weekly downloads, GitHub stars (proxy for community support)
SIZE:          Install size, bundle size (for frontend deps)
ALTERNATIVES:  Are there lighter, more maintained alternatives?
LICENSE:       Is the license compatible with the project?
```

### Dependency Categories

```
DIRECT (listed in package.json dependencies):
  - You chose these. You are responsible for updating them.
  - Security vulnerabilities here are your highest priority.

TRANSITIVE (dependencies of your dependencies):
  - You did not choose these. They come along for the ride.
  - Vulnerabilities may or may not be exploitable via your usage.

DEV (devDependencies):
  - Not shipped to production. Lower security priority.
  - But still a supply chain risk (build-time attacks).

PEER (peerDependencies):
  - Version must be compatible with the host package.
  - Mismatches cause subtle runtime bugs.
```

## Workflow

### Phase 1: Current State Analysis

```bash
# Node.js ecosystem
npm ls --depth=0              # Direct dependencies
npm ls --all                  # Full tree
npm outdated                  # Check for updates
npm audit                     # Security vulnerabilities

# Bundle size analysis
npx @next/bundle-analyzer     # Next.js specific
npx source-map-explorer dist/main.js  # Generic
npx bundlephobia-cli react    # Check size before installing

# Unused dependency detection
npx depcheck                  # Find unused packages

# Python
pip list --outdated
pip-audit
pipdeptree

# Go
go list -m all
govulncheck ./...
```

### Phase 2: Risk Assessment

```
UPDATE RISK MATRIX:

               Low Breaking Risk        High Breaking Risk
High Security  | UPDATE IMMEDIATELY  |  UPDATE + TEST HEAVILY  |
Risk           | (patch/minor)       |  (major version)        |
               |---------------------|-------------------------|
Low Security   | UPDATE IN NEXT      |  PLAN MIGRATION         |
Risk           | SPRINT              |  (schedule + allocate)  |
```

### Phase 3: Update Planning

```markdown
# Dependency Update Plan

## Critical (Do Now)
| Package | Current | Target | Risk | Reason |
|---------|---------|--------|------|--------|
| express | 4.17.1 | 4.19.2 | Low | CVE-2024-xxxx |

## High Priority (This Sprint)
| Package | Current | Target | Risk | Reason |
|---------|---------|--------|------|--------|
| next | 14.1.0 | 14.2.18 | Low | Multiple security patches |

## Medium Priority (Next Sprint)
| Package | Current | Target | Risk | Reason |
|---------|---------|--------|------|--------|
| react | 18.2.0 | 19.0.0 | High | Major version |

## Low Priority (Backlog)
| Package | Current | Target | Risk | Reason |
|---------|---------|--------|------|--------|
| lodash | 4.17.21 | - | - | Consider removal |
```

### Phase 4: Bundle Optimization

```
COMMON BLOAT SOURCES AND REPLACEMENTS:

moment.js (300KB)  -> dayjs (2KB) or date-fns (tree-shakeable)
lodash (70KB)      -> lodash-es (tree-shakeable) or native methods
axios (13KB)       -> fetch API (built-in)
uuid (4KB)         -> crypto.randomUUID() (built-in)
classnames (1KB)   -> clsx (0.5KB) or template literals

ANALYSIS STEPS:
1. Run bundle analyzer to identify largest packages
2. Check if full package is needed or just one function
3. Look for tree-shakeable alternatives
4. Consider if native APIs can replace the dependency
5. Check for duplicate packages at different versions
```

## Automation

### Renovate Configuration

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "schedule": ["every weekend"],
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "branch"
    },
    {
      "matchUpdateTypes": ["minor"],
      "automerge": true,
      "requiredStatusChecks": ["ci"]
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["breaking-change"]
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

## Best Practices

1. **Pin exact versions in applications** -- use lockfiles for reproducible builds
2. **Use ranges in libraries** -- libraries should specify compatible ranges
3. **Read changelogs before major updates** -- check for breaking changes
4. **Update regularly** -- small frequent updates are safer than large infrequent ones
5. **Automate with Renovate or Dependabot** -- automatic PRs with CI checks
6. **Audit in CI** -- fail builds on high-severity vulnerabilities
7. **Check bundle impact before adding** -- use bundlephobia.com
8. **Prefer built-in APIs** -- `fetch`, `crypto.randomUUID()`, `structuredClone()`
9. **Remove unused dependencies** -- run `npx depcheck` periodically
10. **License compliance** -- ensure all licenses are compatible

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| No lockfile in repo | Non-reproducible builds | Commit `package-lock.json` |
| `npm install` in CI | May resolve different versions | Use `npm ci` in CI |
| Ignoring npm audit | Known vulnerabilities shipped | Audit in CI pipeline |
| Major version yolo | Breaking changes in production | Read changelog, test thoroughly |
| Duplicate React versions | Hooks break, state inconsistent | `npm ls react`, deduplicate |
| Unused dependencies | Bundle bloat, attack surface | Run `depcheck` periodically |
| Transitive vuln panic | Wasted effort on non-exploitable CVEs | Assess if vulnerable path is reachable |
