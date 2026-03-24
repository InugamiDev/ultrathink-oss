---
name: testing-library
description: React Testing Library — accessibility-driven queries, user-event interactions, async testing, jest-dom matchers
layer: domain
category: testing
triggers:
  - "testing library"
  - "react testing library"
  - "rtl"
  - "getByRole"
  - "getByText"
  - "user-event"
  - "jest-dom"
  - "screen.getBy"
linksTo:
  - react
  - testing-patterns
  - test
linkedFrom:
  - react
  - test
---

# Testing Library Skill

## Purpose

React Testing Library enforces testing from the user's perspective. Query by role, text, and label — not implementation details. If you can't find an element with RTL queries, your users and screen readers can't either.

## Query Priority

| Priority | Query | When |
|----------|-------|------|
| 1 | `getByRole` | Buttons, links, headings, inputs — always first |
| 2 | `getByLabelText` | Form fields with labels |
| 3 | `getByText` | Non-interactive elements |
| 4 | `getByAltText` | Images |
| 5 | `getByTestId` | Last resort only |

## Setup

```typescript
// test/utils.tsx
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider><QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider></ThemeProvider>;
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return { ...render(ui, { wrapper: AllProviders, ...options }), user: userEvent.setup() };
}

export { customRender as render };
export { screen, within, waitFor } from '@testing-library/react';
```

## Component Testing

```typescript
import { render, screen } from '@/test/utils';
import { ProfileCard } from './profile-card';

describe('ProfileCard', () => {
  it('renders user information', () => {
    render(<ProfileCard name="Jane" email="jane@example.com" role="Engineer" />);
    expect(screen.getByRole('heading', { name: /jane/i })).toBeInTheDocument();
    expect(screen.getByText(/engineer/i)).toBeInTheDocument();
  });

  it('hides edit button for other profiles', () => {
    render(<ProfileCard name="Jane" isOwnProfile={false} />);
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});
```

## User Interactions

```typescript
describe('LoginForm', () => {
  it('submits with valid credentials', async () => {
    const onSubmit = vi.fn();
    const { user } = render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'jane@example.com', password: 'secret123' });
  });

  it('shows validation error for empty email', async () => {
    const { user } = render(<LoginForm onSubmit={vi.fn()} />);
    await user.click(screen.getByLabelText(/email/i));
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent(/email is required/i);
  });
});
```

## Async Testing

```typescript
import { fetchUsers } from '@/lib/api';
vi.mock('@/lib/api', () => ({ fetchUsers: vi.fn() }));

it('shows loading then renders users', async () => {
  (fetchUsers as Mock).mockResolvedValue([{ id: '1', name: 'Alice' }]);
  render(<UserList />);

  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  await waitForElementToBeRemoved(() => screen.queryByRole('status'));
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

it('shows error on fetch failure', async () => {
  (fetchUsers as Mock).mockRejectedValue(new Error('Network error'));
  render(<UserList />);
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
  });
});
```

## Key jest-dom Matchers

```typescript
expect(el).toBeVisible();                          // Visibility
expect(input).toBeDisabled();                      // Form state
expect(input).toHaveValue('hello');                // Input value
expect(input).toBeChecked();                       // Checkbox/radio
expect(el).toHaveTextContent(/expected/i);         // Content
expect(el).toHaveAttribute('href', '/about');      // Attributes
expect(el).toHaveAccessibleName('Submit form');    // Accessibility
```

## Best Practices

1. **Query by role first** — if you can't, your component has accessibility issues
2. **Use `user-event` over `fireEvent`** — simulates real behavior (focus, keystrokes)
3. **Use `screen`** instead of destructuring from render
4. **Use `findBy*`** for async elements instead of waitFor + getBy
5. **Match text with regex** (`/submit/i`) for resilience to case changes
6. **Test behavior, not implementation** — don't test state or internal methods
7. **Mock at the boundary** — mock API calls, not internal functions
8. **One behavior per test** with clear arrange-act-assert structure
