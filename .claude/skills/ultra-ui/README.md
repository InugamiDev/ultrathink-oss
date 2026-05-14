<!--
intent: Short overview and attribution for the ultra-ui skill.
status: authored for the new skill package.
next: Keep in sync with SKILL.md when workflow commands change.
confidence: high
-->

# ultra-ui

`ultra-ui` combines the local `ui-ux-pro-max` design knowledge base with the upstream DESIGN.md format. It generates DESIGN.md files from CSV-backed style, palette, typography, and product recommendations, then validates them with the official `@google/design.md` CLI.

Use it when UI/UX design decisions need a durable machine-readable output: design tokens, Tailwind exports, version diffs, and WCAG-aware lint findings.

## Contents

- `SKILL.md`: decision tree and operating guide.
- `references/`: DESIGN.md spec notes plus copied ui-ux-pro-max design references.
- `data/`: copied ui-ux-pro-max CSV datasets and stack data.
- `scripts/`: copied ui-ux-pro-max Python search/generation scripts.
- `lib/`: TypeScript CLI wrappers and DESIGN.md generator.
- `examples/`: upstream DESIGN.md examples vendored for reference.

## Attribution

The DESIGN.md spec and examples are from `google-labs-code/design.md` by Google LLC. The upstream repository currently declares Apache License 2.0. See `THIRD_PARTY_NOTICES.md`.
