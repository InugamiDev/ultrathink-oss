---
name: typescript-frontend
description: TypeScript for frontend development — generics, utility types, type-safe APIs, component typing, and developer experience patterns
layer: domain
category: frontend
triggers:
  - "typescript frontend"
  - "react types"
  - "generic component"
  - "type safe"
  - "type inference"
  - "discriminated union"
  - "typescript DX"
  - "as const"
  - "satisfies"
  - "zod schema"
inputs:
  - "Component prop typing requirements"
  - "API response typing needs"
  - "Generic pattern questions"
  - "Type-safe form or validation needs"
outputs:
  - "Type-safe component interfaces"
  - "Generic utility types and patterns"
  - "Zod schemas with TypeScript inference"
  - "Type-safe API client patterns"
linksTo:
  - react
  - nextjs
  - forms
  - state-management
linkedFrom:
  - code-writer
  - code-reviewer
  - refactorer
preferredNextSkills:
  - react
  - forms
  - nextjs
fallbackSkills: []
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# TypeScript for Frontend Development

## Purpose

Provide expert guidance on TypeScript patterns specific to frontend development — component typing, generic patterns, discriminated unions, type-safe APIs, schema validation inference, and patterns that maximize developer experience (DX) through autocompletion and compile-time safety.

## Key Patterns

### Component Prop Typing

**Basic component with proper HTML attribute forwarding:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  disabled,
  className,
  ...props // forwards onClick, aria-*, data-*, etc.
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
```

**Polymorphic `as` prop:**

```tsx
type PolymorphicProps<E extends React.ElementType, P = {}> = P &
  Omit<React.ComponentPropsWithoutRef<E>, keyof P> & {
    as?: E;
  };

type TextProps<E extends React.ElementType = 'p'> = PolymorphicProps<E, {
  size?: 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'bold';
}>;

export function Text<E extends React.ElementType = 'p'>({
  as,
  size = 'base',
  weight = 'normal',
  className,
  ...props
}: TextProps<E>) {
  const Component = as || 'p';
  return <Component className={cn(textVariants({ size, weight }), className)} {...props} />;
}

// Usage: fully typed, href only available when as="a"
<Text as="a" href="/about" size="lg">About Us</Text>
<Text as="h1" size="xl" weight="bold">Title</Text>
```

**Children typing patterns:**

```tsx
// Accepts any renderable content
type CardProps = {
  children: React.ReactNode;
};

// Accepts only a single element (for cloneElement patterns)
type SlotProps = {
  children: React.ReactElement;
};

// Render prop pattern
type DataListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
};

// Function as children
type AnimateProps = {
  children: (styles: { opacity: number; scale: number }) => React.ReactNode;
};
```

### Discriminated Unions

**For component variants with different props:**

```tsx
// Each variant has unique required props
type NotificationProps =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string; retry: () => void }
  | { type: 'loading'; progress: number }
  | { type: 'info'; message: string; action?: { label: string; onClick: () => void } };

function Notification(props: NotificationProps) {
  switch (props.type) {
    case 'success':
      return <div className="text-green-600">{props.message}</div>;
    case 'error':
      return (
        <div className="text-red-600">
          {props.message}
          <button onClick={props.retry}>Retry</button> {/* type-safe: retry exists */}
        </div>
      );
    case 'loading':
      return <ProgressBar value={props.progress} />; {/* type-safe: progress exists */}
    case 'info':
      return <div>{props.message}</div>;
  }
}
```

**For API responses:**

```tsx
type ApiResponse<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error; retryCount: number };

function useApiData<T>(fetcher: () => Promise<T>): ApiResponse<T> {
  // Implementation...
}

// Usage: TypeScript narrows automatically
const result = useApiData(fetchUser);
if (result.status === 'success') {
  console.log(result.data); // T is accessible
}
if (result.status === 'error') {
  console.log(result.error.message); // Error is accessible
}
```

### Generic Patterns

**Generic data table:**

```tsx
type Column<T> = {
  key: keyof T & string;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T extends { id: string | number }> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
};

function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  // Column keys are type-safe against T
  return (
    <table>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map(col => (
              <td key={col.key}>
                {col.render ? col.render(row[col.key], row) : String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage: columns are type-checked against User
type User = { id: string; name: string; email: string; role: 'admin' | 'user' };

<DataTable<User>
  data={users}
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (val) => <Badge>{val}</Badge> },
    // { key: 'age', header: 'Age' }, // ERROR: 'age' not in keyof User
  ]}
/>
```

**Generic select component:**

```tsx
type SelectOption<V extends string | number = string> = {
  value: V;
  label: string;
  disabled?: boolean;
};

type SelectProps<V extends string | number = string> = {
  options: SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
  placeholder?: string;
};

function Select<V extends string | number>({ options, value, onChange }: SelectProps<V>) {
  // onChange callback is type-safe — receives V, not string
}

// Usage
type Status = 'active' | 'inactive' | 'pending';
const [status, setStatus] = useState<Status>('active');

<Select<Status>
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ]}
  value={status}
  onChange={setStatus} // type-safe: (value: Status) => void
/>
```

### `satisfies` Operator

Use `satisfies` for type checking while preserving narrow literal types:

```tsx
// Routes configuration with type checking AND narrow types
const routes = {
  home: '/',
  dashboard: '/dashboard',
  settings: '/dashboard/settings',
  profile: '/profile/:id',
} satisfies Record<string, string>;

// routes.home is typed as '/' not string
// Enables autocomplete on route values

// Theme tokens
const colors = {
  brand: { 500: '#3b82f6', 600: '#2563eb' },
  success: { 500: '#22c55e', 600: '#16a34a' },
  danger: { 500: '#ef4444', 600: '#dc2626' },
} satisfies Record<string, Record<number, string>>;

// colors.brand[500] is '#3b82f6' not string
```

### `as const` for Literal Types

```tsx
// Define constant arrays and objects with narrowed types
const ROLES = ['admin', 'editor', 'viewer'] as const;
type Role = (typeof ROLES)[number]; // 'admin' | 'editor' | 'viewer'

// Useful for form options
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', icon: 'pencil' },
  { value: 'published', label: 'Published', icon: 'globe' },
  { value: 'archived', label: 'Archived', icon: 'archive' },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]['value'];
// 'draft' | 'published' | 'archived'
```

### Zod Schema Inference

```tsx
import { z } from 'zod';

// Define schema once, derive TypeScript type
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    notifications: z.boolean().default(true),
  }),
  createdAt: z.coerce.date(),
});

// Inferred type matches the schema exactly
type User = z.infer<typeof UserSchema>;

// Partial schema for updates
const UpdateUserSchema = UserSchema.pick({
  name: true,
  email: true,
  preferences: true,
}).partial();

type UpdateUser = z.infer<typeof UpdateUserSchema>;

// Form schema with refinements
const SignupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### Type-Safe API Client

```tsx
// Define API contract
type ApiRoutes = {
  'GET /users': { response: User[]; params: { role?: Role } };
  'GET /users/:id': { response: User; params: { id: string } };
  'POST /users': { response: User; body: CreateUserInput };
  'PUT /users/:id': { response: User; body: UpdateUserInput; params: { id: string } };
  'DELETE /users/:id': { response: void; params: { id: string } };
};

// Type-safe fetch wrapper
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

type RouteKey<M extends Method> = Extract<keyof ApiRoutes, `${M} ${string}`>;

async function api<M extends Method, R extends RouteKey<M>>(
  route: R,
  options?: ApiRoutes[R] extends { body: infer B } ? { body: B } : never
): Promise<ApiRoutes[R]['response']> {
  const [method, path] = (route as string).split(' ');
  const res = await fetch(path, {
    method,
    body: options && 'body' in options ? JSON.stringify(options.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
  return res.json();
}
```

### Event Handler Typing

```tsx
// Prefer specific event types
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  const value = e.target.value; // string, type-safe
}

function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
}

function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'Enter') submit();
}

// For custom event callbacks
type OnSelect<T> = (item: T, event: React.MouseEvent) => void;
```

### Utility Types for Frontend

```tsx
// Make specific fields required
type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
type UserWithEmail = WithRequired<Partial<User>, 'email'>;

// Make specific fields optional
type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract props from a component
type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

// Strict omit (errors if key doesn't exist)
type StrictOmit<T, K extends keyof T> = Omit<T, K>;

// Non-nullable nested type
type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object ? DeepRequired<T[K]> : NonNullable<T[K]>;
};
```

## Best Practices

1. **Infer over annotate** — Let TypeScript infer return types, state types, and callback types when they are obvious.
2. **Use discriminated unions** — For component variants, API states, and any branching logic.
3. **`satisfies` over `as`** — `satisfies` checks without widening; `as` silences errors.
4. **Schema-first typing** — Define Zod schemas and infer types; single source of truth.
5. **Avoid `any`** — Use `unknown` and narrow, or use generics. `any` defeats the purpose.
6. **Avoid `enum`** — Use `as const` arrays or union types. Enums have runtime overhead and quirks.
7. **Use `React.ComponentPropsWithoutRef`** — Not `React.HTMLAttributes` for proper HTML forwarding.
8. **Generic constraints** — Always constrain generics: `<T extends Record<string, unknown>>` not `<T>`.
9. **`readonly` arrays in props** — Accept `readonly T[]` to work with both mutable and immutable arrays.
10. **Strict mode always** — Enable `strict: true` in tsconfig. Non-negotiable.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| `as` for type assertions | Hides bugs, bypasses checking | Use `satisfies`, type guards, or Zod parsing |
| `any` in event handlers | Loses all type safety | Use `React.ChangeEvent<HTMLInputElement>` etc. |
| Enum for options | Runtime overhead, poor tree-shaking | `as const` arrays with `typeof` inference |
| `Object` or `{}` types | Too wide, accepts anything | Use `Record<string, unknown>` or specific shapes |
| Missing `null` checks | Runtime errors on optional data | Enable `strictNullChecks`, use optional chaining |
| Overtyping | Complex types that obscure intent | Simpler unions, let inference work |
| Not using `readonly` | Props can be accidentally mutated | `readonly` on array/object props |
| `!` non-null assertion | Bypasses null safety | Handle null case explicitly |
| Union type in props without discriminant | Can't narrow which variant | Add a `type` or `kind` discriminant field |
| Ignoring `strict` tsconfig | Allows `any` to leak in | `strict: true` plus `noUncheckedIndexedAccess` |
