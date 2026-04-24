# Design Systems (65)

## Tier 1 — Platform Foundations (3)

| System | Company | Key Characteristics |
|--------|---------|-------------------|
| Material Design 3 | Google | HCT dynamic color, 8dp grid, Roboto Flex, M3 Expressive (2025) |
| Human Interface Guidelines | Apple | SF Pro/Symbols, Dynamic Type, Liquid Glass (2025), semantic colors |
| Fluent 2 | Microsoft | Acrylic/Mica materials, Segoe UI Variable, 4px grid, reveal effects |

## Tier 2 — Major Open Source (19)

| System | Company | Stack |
|--------|---------|-------|
| Carbon | IBM | React, Web Components, Svelte |
| Polaris | Shopify | React |
| Primer | GitHub | React, CSS, Figma |
| Atlassian Design | Atlassian | React |
| Spectrum | Adobe | React Spectrum, Web Components |
| Lightning | Salesforce | Web Components, React |
| Pajamas | GitLab | Vue |
| Base Web | Uber | React |
| Gestalt | Pinterest | React |
| Ring UI | JetBrains | React |
| Garden | Zendesk | React |
| Protocol | Mozilla | CSS/HTML |
| Orbit | Kiwi.com | React |
| Paste | Twilio | React |
| Evergreen | Segment | React |
| Grommet | HPE | React |
| Braid | SEEK | React |
| PatternFly | Red Hat | React, Web Components |
| Elastic UI | Elastic | React |

## Tier 3 — Component Libraries (10)

| Library | Key Traits |
|---------|------------|
| shadcn/ui | Copy-paste, Radix + Tailwind, customizable |
| Radix UI | Unstyled, accessible primitives, composable |
| Chakra UI | Styled, accessible, theme-able |
| Mantine | Full-featured, 100+ components, hooks |
| Ant Design | Enterprise-grade, Chinese ecosystem |
| NextUI | Beautiful defaults, Tailwind-based |
| DaisyUI | Tailwind component classes, theme system |
| Headless UI | Unstyled, accessible, by Tailwind Labs |
| Ark UI | Framework-agnostic, state machines |
| Park UI | Ark UI + styled, multiple themes |

## Tier 4 — Industry-Specific (8)

Mineral UI (CA Technologies), Thumbprint (Thumbtack), Canvas (Workday), Spark (Adevinta), Seeds (Sprout Social), Forma 36 (Contentful), Lunar (Nordea), Mesh (Midtrans)

## Tier 5 — Government/Public (4)

| System | Country | Notes |
|--------|---------|-------|
| USWDS | United States | Accessible, standards-compliant, bilingual |
| GOV.UK Design System | United Kingdom | Research-driven, progressive enhancement |
| Aurora | Canada | Bilingual (EN/FR), GC Web theme |
| NSW Design System | Australia | Component library + content guidelines |

## Selection Guide

| Need | Recommended |
|------|------------|
| Enterprise SaaS | Material 3 or Fluent 2 + Ant Design or Chakra |
| Startup / Modern | shadcn/ui + Tailwind (fastest to ship) |
| E-commerce | Polaris (Shopify) or Mantine (general) |
| Developer tools | Radix UI + Tailwind (maximum control) |
| Government / Public | USWDS (US), GOV.UK (UK), Aurora (CA) |
| Design system from scratch | Radix primitives + Tailwind + custom tokens |
| Quick prototype | DaisyUI or NextUI (beautiful defaults) |
| Cross-framework | Ark UI or Spectrum (framework-agnostic) |
