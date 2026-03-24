---
name: cicd
description: GitHub Actions, GitLab CI, pipeline optimization, deployment automation, and CI/CD best practices
layer: domain
category: devops
triggers:
  - "ci/cd"
  - "cicd"
  - "github actions"
  - "gitlab ci"
  - "pipeline"
  - "workflow"
  - "continuous integration"
  - "continuous deployment"
inputs: [repository structure, deployment targets, test suites, build requirements]
outputs: [workflow files, pipeline configs, deployment scripts, caching strategies]
linksTo: [docker, kubernetes, terraform, vercel, monitoring]
linkedFrom: [ship, code-review, test]
preferredNextSkills: [docker, kubernetes, vercel]
fallbackSkills: [shell-scripting, git-workflow]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [deployments, test execution, artifact publishing]
---

# CI/CD Specialist

## Purpose

Design and implement efficient, secure, and maintainable CI/CD pipelines. This skill covers GitHub Actions (primary), GitLab CI, pipeline optimization, caching strategies, deployment workflows, and security scanning integration.

## Key Patterns

### GitHub Actions: Full CI/CD Pipeline

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

permissions:
  contents: read
  pull-requests: write

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    strategy:
      matrix:
        shard: [1, 2, 3]
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm test --shard=${{ matrix.shard }}/3
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/test_db

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build
        env:
          NEXT_TELEMETRY_DISABLED: 1

      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next
          retention-days: 1

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: production
      url: ${{ steps.deploy.outputs.url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: .next

      - id: deploy
        run: |
          # Deployment logic here
          echo "url=https://app.example.com" >> "$GITHUB_OUTPUT"
```

### Reusable Workflow Pattern

```yaml
# .github/workflows/reusable-docker.yml
name: Reusable Docker Build

on:
  workflow_call:
    inputs:
      image-name:
        required: true
        type: string
      context:
        required: false
        type: string
        default: "."
    secrets:
      registry-token:
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.registry-token }}

      - uses: docker/build-push-action@v6
        with:
          context: ${{ inputs.context }}
          push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}/${{ inputs.image-name }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Path-Based Conditional Execution

```yaml
on:
  push:
    paths:
      - "apps/web/**"
      - "packages/shared/**"
      - ".github/workflows/web.yml"
    paths-ignore:
      - "**/*.md"
      - "docs/**"
```

## Best Practices

### Speed Optimization
- Use `concurrency` groups to cancel outdated runs on PR branches
- Cache dependencies (pnpm store, node_modules, .next/cache)
- Use matrix strategy to parallelize tests across shards
- Use path filters to skip irrelevant builds in monorepos
- Upload/download artifacts between jobs rather than rebuilding
- Pin action versions by SHA for security and reproducibility

### Security
- Use `permissions` to follow the principle of least privilege
- Never echo secrets; use masked outputs
- Use GitHub Environments with required reviewers for production
- Pin actions to commit SHAs, not tags: `actions/checkout@abc123`
- Use OIDC for cloud provider auth instead of long-lived credentials
- Run `npm audit` / `trivy` in CI

### Reliability
- Use `--frozen-lockfile` to prevent lockfile drift
- Set explicit timeouts on jobs (`timeout-minutes: 15`)
- Use `services` for integration test dependencies
- Add status checks as required in branch protection rules

### Secrets Management
- Store secrets in GitHub Secrets, not in the repo
- Use environment-scoped secrets for different stages
- Rotate secrets regularly; use OIDC where possible

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Slow pipelines | Parallelize jobs, cache deps, use path filters |
| Flaky tests | Use retries sparingly; fix the root cause |
| Unpinned actions | Pin by SHA: `uses: actions/checkout@<sha>` |
| Missing concurrency groups | Add `concurrency` to cancel stale runs |
| Building on every path change | Use `paths` and `paths-ignore` filters |
| Secrets in logs | Use `::add-mask::` and avoid echoing env vars |
| No timeout | Set `timeout-minutes` to prevent hung jobs |

## Examples

### Cache Restoration for pnpm

```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.pnpm-store
      .next/cache
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

### Release Workflow with Changeset

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - uses: changesets/action@v1
        with:
          publish: pnpm release
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Slack Notification on Failure

```yaml
- if: failure()
  uses: slackapi/slack-github-action@v2
  with:
    webhook: ${{ secrets.SLACK_WEBHOOK }}
    webhook-type: incoming-webhook
    payload: |
      {
        "text": "CI failed on ${{ github.ref }} by ${{ github.actor }}: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
```
