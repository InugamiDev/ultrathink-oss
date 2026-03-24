---
name: storybook
description: UI component development environment for building, testing, and documenting components in isolation
layer: domain
category: documentation
triggers:
  - "storybook"
  - "component story"
  - "CSF"
  - "visual testing"
  - "chromatic"
linksTo: [react, design-systems, testing-patterns, tailwindcss]
linkedFrom: [code-writer, code-reviewer]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Storybook

UI component development environment for building, testing, and documenting components in isolation. Enables interactive exploration via args/controls, interaction testing with play functions, and visual regression via Chromatic.

## When to Use

- Building/documenting UI components in isolation outside the app
- Running interaction tests on individual components
- Visual regression testing in CI with Chromatic
- Establishing a shared component library across teams

## Key Patterns

**CSF3** — Default export for metadata, named exports for stories:

```tsx
const meta = { component: Button, tags: ['autodocs'] } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = { args: { variant: 'primary', children: 'Click me' } };
```

**Args & Controls** — Expose props as interactive knobs via `argTypes`.

**Decorators** — Wrap with providers/theme: `decorators: [(Story) => <Provider><Story /></Provider>]`

**Play Functions** — Interaction tests using `@storybook/test`:

```tsx
play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByRole('textbox'), 'hello');
  await expect(canvas.getByRole('button')).toBeEnabled();
}
```

**Autodocs** — `tags: ['autodocs']` on meta for automatic documentation pages.
**Add-ons** — `addon-a11y`, `addon-viewport`, `addon-backgrounds`, `addon-actions`.
**Chromatic** — Visual regression in CI. Exclude with `chromatic: { disableSnapshot: true }`.
**MSW** — Mock APIs per-story via `parameters.msw.handlers`.
**Composition** — Import from other Storybook instances via `refs` in `.storybook/main.ts`.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| Implementation details in play functions | Query by role/label, assert visible behavior |
| One mega-story with all variants | One story per meaningful state |
| Skipping autodocs tags | Add `tags: ['autodocs']` by default |
| Hardcoded data without args | Define args and argTypes on meta |
| App-level providers imported globally | Scope decorators per-story or per-meta |

## Related Skills

`react` | `design-systems` | `testing-patterns` | `tailwindcss`
