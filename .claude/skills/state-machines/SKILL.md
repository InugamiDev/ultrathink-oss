---
name: state-machines
description: State machines with XState — modeling complex UI flows, form wizards, async processes, and actor-based architecture
layer: domain
category: state-management
triggers:
  - "state machine"
  - "xstate"
  - "finite state"
  - "statechart"
  - "state transition"
  - "actor model"
  - "complex flow"
inputs: [flow requirements, states, transitions, side effects]
outputs: [state machine definitions, React integration, visualizations, tests]
linksTo: [state-management, react, forms, typescript-patterns]
linkedFrom: [ui-ux-pro, testing-patterns]
preferredNextSkills: [state-management, testing-patterns]
fallbackSkills: [react]
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# State Machines with XState

## Purpose

State machines make complex, stateful UI flows explicit and predictable. Instead of scattered boolean flags and useEffect chains, you define all possible states, transitions, and side effects in a single, testable machine. XState (v5) is the standard implementation for JavaScript/TypeScript.

## When to Use

- Multi-step forms / wizards
- Authentication flows (idle > loading > authenticated > error)
- Payment / checkout processes
- Media players (play, pause, buffer, error)
- Complex modals with conditional steps
- Any flow with more than 3 states or conditional transitions

## XState v5 Basics

### Defining a Machine

```typescript
import { setup, assign, fromPromise } from 'xstate';

interface AuthContext {
  user: User | null;
  error: string | null;
  retries: number;
}

type AuthEvent =
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'RETRY' };

const authMachine = setup({
  types: {
    context: {} as AuthContext,
    events: {} as AuthEvent,
  },
  actors: {
    loginUser: fromPromise(async ({ input }: { input: { email: string; password: string } }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Invalid credentials');
      return response.json() as Promise<User>;
    }),
  },
  guards: {
    canRetry: ({ context }) => context.retries < 3,
  },
}).createMachine({
  id: 'auth',
  initial: 'idle',
  context: { user: null, error: null, retries: 0 },
  states: {
    idle: {
      on: {
        LOGIN: { target: 'authenticating' },
      },
    },
    authenticating: {
      invoke: {
        src: 'loginUser',
        input: ({ event }) => ({
          email: (event as { type: 'LOGIN'; email: string; password: string }).email,
          password: (event as { type: 'LOGIN'; email: string; password: string }).password,
        }),
        onDone: {
          target: 'authenticated',
          actions: assign({ user: ({ event }) => event.output, error: null }),
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
            retries: ({ context }) => context.retries + 1,
          }),
        },
      },
    },
    authenticated: {
      on: { LOGOUT: { target: 'idle', actions: assign({ user: null }) } },
    },
    error: {
      on: {
        RETRY: { target: 'authenticating', guard: 'canRetry' },
        LOGIN: { target: 'authenticating' },
      },
    },
  },
});
```

### React Integration

```typescript
import { useMachine } from '@xstate/react';

function LoginPage() {
  const [state, send] = useMachine(authMachine);

  if (state.matches('authenticated')) {
    return <Dashboard user={state.context.user!} onLogout={() => send({ type: 'LOGOUT' })} />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        send({
          type: 'LOGIN',
          email: formData.get('email') as string,
          password: formData.get('password') as string,
        });
      }}
    >
      <input name="email" type="email" required disabled={state.matches('authenticating')} />
      <input name="password" type="password" required disabled={state.matches('authenticating')} />

      {state.matches('error') && (
        <p role="alert" className="text-red-600">{state.context.error}</p>
      )}

      <button type="submit" disabled={state.matches('authenticating')}>
        {state.matches('authenticating') ? 'Signing in...' : 'Sign In'}
      </button>

      {state.matches('error') && state.can({ type: 'RETRY' }) && (
        <button type="button" onClick={() => send({ type: 'RETRY' })}>
          Retry ({3 - state.context.retries} attempts left)
        </button>
      )}
    </form>
  );
}
```

### Multi-Step Form Wizard

```typescript
const checkoutMachine = setup({
  types: {
    context: {} as { shipping: ShippingData | null; payment: PaymentData | null },
    events: {} as
      | { type: 'NEXT' }
      | { type: 'BACK' }
      | { type: 'SET_SHIPPING'; data: ShippingData }
      | { type: 'SET_PAYMENT'; data: PaymentData }
      | { type: 'CONFIRM' },
  },
}).createMachine({
  id: 'checkout',
  initial: 'shipping',
  context: { shipping: null, payment: null },
  states: {
    shipping: {
      on: {
        SET_SHIPPING: { actions: assign({ shipping: ({ event }) => event.data }) },
        NEXT: { target: 'payment', guard: ({ context }) => context.shipping !== null },
      },
    },
    payment: {
      on: {
        SET_PAYMENT: { actions: assign({ payment: ({ event }) => event.data }) },
        NEXT: { target: 'review', guard: ({ context }) => context.payment !== null },
        BACK: { target: 'shipping' },
      },
    },
    review: {
      on: {
        CONFIRM: { target: 'processing' },
        BACK: { target: 'payment' },
      },
    },
    processing: {
      invoke: {
        src: 'submitOrder',
        onDone: 'success',
        onError: 'error',
      },
    },
    success: { type: 'final' },
    error: {
      on: { CONFIRM: 'processing' },
    },
  },
});
```

### Testing State Machines

```typescript
import { createActor } from 'xstate';

describe('authMachine', () => {
  it('transitions from idle to authenticating on LOGIN', () => {
    const actor = createActor(authMachine).start();
    expect(actor.getSnapshot().value).toBe('idle');

    actor.send({ type: 'LOGIN', email: 'test@test.com', password: 'pass' });
    expect(actor.getSnapshot().value).toBe('authenticating');
  });

  it('prevents retry after 3 attempts', () => {
    const actor = createActor(authMachine, {
      snapshot: { ...authMachine.resolveState({ value: 'error', context: { user: null, error: 'fail', retries: 3 } }) },
    }).start();

    expect(actor.getSnapshot().can({ type: 'RETRY' })).toBe(false);
  });
});
```

## Common Pitfalls

1. **Using state machines for simple state** — A boolean toggle does not need a machine. Use them when you have 3+ states with conditional transitions.
2. **Putting business logic outside the machine** — Guards, actions, and invoked actors should live in the machine definition, not in React components.
3. **Forgetting guards** — Transitions without guards allow invalid state changes. Always validate preconditions.
4. **Not using `state.matches()`** — Comparing `state.value === 'string'` breaks with nested/parallel states. Use `matches()`.
5. **Skipping the visualizer** — XState has an inspector at `stately.ai/viz`. Use it to validate your machine design visually.
