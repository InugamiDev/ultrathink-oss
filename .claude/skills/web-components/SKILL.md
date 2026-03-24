---
name: web-components
description: Native Web Components, custom elements API, Shadow DOM, HTML templates, slots, lifecycle callbacks, and framework-agnostic design patterns
layer: domain
category: frontend
triggers:
  - "web component"
  - "web components"
  - "custom element"
  - "custom elements"
  - "shadow dom"
  - "html template"
  - "slots"
  - "shadow root"
  - "framework agnostic"
  - "lit element"
  - "web component library"
inputs:
  - Component requirements (behavior, styling, API surface)
  - Framework interop needs (React, Vue, Angular, vanilla)
  - Browser support targets
  - Whether to use Shadow DOM or light DOM
outputs:
  - Custom element implementations
  - Shadow DOM styling strategies
  - Slot-based composition patterns
  - Framework wrapper code
  - Testing setup
linksTo:
  - css-architecture
  - design-systems
  - typescript-frontend
  - testing-patterns
linkedFrom:
  - react
  - vue
  - svelte
preferredNextSkills:
  - design-systems
  - testing-patterns
fallbackSkills:
  - css-architecture
  - typescript-frontend
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May add custom element definitions to global registry
  - May add Lit or other web component libraries
---

# Web Components Domain Skill

## Purpose

Web Components are browser-native, framework-agnostic UI primitives. They work in React, Vue, Angular, Svelte, or plain HTML without any build step. This skill covers building production-quality custom elements with Shadow DOM, slots, and lifecycle management -- focusing on the platform APIs directly, with Lit as the recommended abstraction for complex components.

## When to Use Web Components

| Scenario | Web Components? | Why |
|----------|----------------|-----|
| Shared design system across frameworks | Yes | Framework-agnostic, works everywhere |
| Micro-frontends with different frameworks | Yes | Encapsulated, no style conflicts |
| Embeddable widgets (chat, payments) | Yes | Shadow DOM isolates from host page |
| Single-framework app (all React) | Usually no | React components are simpler within React |
| Simple leaf components (button, badge) | Yes | Portable, no dependencies |
| Complex stateful apps | No | Frameworks handle state/routing better |

## Key Concepts

### The Three Standards

```
1. Custom Elements API
   - Define new HTML tags: <my-button>, <user-card>
   - Lifecycle callbacks: connectedCallback, disconnectedCallback, attributeChangedCallback
   - Must contain a hyphen: <my-thing> (single-word names reserved for future HTML)

2. Shadow DOM
   - Encapsulated DOM tree attached to an element
   - Styles don't leak in or out
   - DOM queries from outside cannot reach shadow internals
   - open mode: accessible via element.shadowRoot
   - closed mode: shadowRoot returns null (rarely needed)

3. HTML Templates & Slots
   - <template>: inert HTML parsed but not rendered until cloned
   - <slot>: insertion points for light DOM children (like React children)
   - Named slots: <slot name="header"> for multi-point composition
```

## Patterns

### 1. Basic Custom Element (Vanilla)

```typescript
// src/components/my-counter.ts

class MyCounter extends HTMLElement {
  static observedAttributes = ['count', 'min', 'max'];

  private _count = 0;
  private _min = -Infinity;
  private _max = Infinity;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // Called when element is added to the DOM
  connectedCallback() {
    this.render();
    this.shadowRoot!.querySelector('#decrement')!
      .addEventListener('click', () => this.decrement());
    this.shadowRoot!.querySelector('#increment')!
      .addEventListener('click', () => this.increment());
  }

  // Called when element is removed from the DOM
  disconnectedCallback() {
    // Event listeners on shadow DOM children are auto-cleaned
    // Clean up external subscriptions here if any
  }

  // Called when an observed attribute changes
  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    switch (name) {
      case 'count':
        this._count = Number(value) || 0;
        break;
      case 'min':
        this._min = value !== null ? Number(value) : -Infinity;
        break;
      case 'max':
        this._max = value !== null ? Number(value) : Infinity;
        break;
    }
    this.updateDisplay();
  }

  get count() { return this._count; }
  set count(val: number) {
    this._count = Math.min(this._max, Math.max(this._min, val));
    this.setAttribute('count', String(this._count));
    this.dispatchEvent(new CustomEvent('count-change', {
      detail: { count: this._count },
      bubbles: true,
      composed: true, // Crosses shadow DOM boundary
    }));
  }

  private increment() { this.count = this._count + 1; }
  private decrement() { this.count = this._count - 1; }

  private updateDisplay() {
    const display = this.shadowRoot?.querySelector('#display');
    if (display) display.textContent = String(this._count);
  }

  private render() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: system-ui, sans-serif;
        }

        :host([disabled]) {
          opacity: 0.5;
          pointer-events: none;
        }

        button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.625rem;
          height: 2.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          background: #ffffff;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 200ms;
          color: #374151;
        }

        button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        button:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        #display {
          min-width: 2.625rem;
          text-align: center;
          font-size: 1.25rem;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: #111827;
        }
      </style>

      <button id="decrement" aria-label="Decrease count">-</button>
      <span id="display" role="status" aria-live="polite">${this._count}</span>
      <button id="increment" aria-label="Increase count">+</button>
    `;
  }
}

// Register the element
customElements.define('my-counter', MyCounter);

// Usage in HTML:
// <my-counter count="5" min="0" max="10"></my-counter>

// TypeScript declaration for use in frameworks
declare global {
  interface HTMLElementTagNameMap {
    'my-counter': MyCounter;
  }
}
```

### 2. Slots and Composition

```typescript
// src/components/app-card.ts

class AppCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          transition: box-shadow 200ms;
        }

        :host(:hover) {
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .header {
          padding: 1.5rem 1.5rem 0;
        }

        .body {
          padding: 1rem 1.5rem;
        }

        .footer {
          padding: 1rem 1.5rem 1.5rem;
          border-top: 1px solid #f3f4f6;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        /* Hide footer section if no slot content provided */
        .footer:not(:has(::slotted(*))) {
          display: none;
        }

        ::slotted([slot="title"]) {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        ::slotted([slot="subtitle"]) {
          margin: 0.25rem 0 0;
          font-size: 0.875rem;
          color: #6b7280;
        }
      </style>

      <div class="header">
        <slot name="title"></slot>
        <slot name="subtitle"></slot>
      </div>

      <div class="body">
        <slot></slot> <!-- Default slot for main content -->
      </div>

      <div class="footer">
        <slot name="actions"></slot>
      </div>
    `;
  }
}

customElements.define('app-card', AppCard);

// Usage:
// <app-card>
//   <h2 slot="title">Card Title</h2>
//   <p slot="subtitle">Some subtitle text</p>
//   <p>This goes in the default slot (body)</p>
//   <button slot="actions">Cancel</button>
//   <button slot="actions">Save</button>
// </app-card>
```

### 3. Reactive Properties with Lit

```typescript
// For complex components, Lit removes boilerplate while staying close to the platform
// npm install lit

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('user-card')
export class UserCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.5rem;
      background: #ffffff;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      font-family: system-ui, sans-serif;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .avatar {
      width: 3rem;
      height: 3rem;
      border-radius: 50%;
      object-fit: cover;
    }

    .name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .role {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0.125rem 0 0;
    }

    .bio {
      font-size: 0.9375rem;
      color: #374151;
      line-height: 1.625;
    }

    .actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    button {
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 200ms;
      border: 1px solid transparent;
    }

    button:focus-visible {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    .primary {
      background: #2563eb;
      color: #ffffff;
    }

    .primary:hover {
      background: #1d4ed8;
    }

    .secondary {
      background: #ffffff;
      color: #374151;
      border-color: #d1d5db;
    }

    .secondary:hover {
      background: #f9fafb;
    }

    .loading {
      opacity: 0.6;
      pointer-events: none;
    }
  `;

  // Reflected attributes (appear in HTML, trigger attributeChangedCallback)
  @property({ type: String }) name = '';
  @property({ type: String }) role = '';
  @property({ type: String, attribute: 'avatar-url' }) avatarUrl = '';
  @property({ type: String }) bio = '';
  @property({ type: Boolean }) following = false;

  // Internal state (not reflected to attributes)
  @state() private _loading = false;

  render() {
    return html`
      <div class="header">
        ${this.avatarUrl
          ? html`<img class="avatar" src=${this.avatarUrl} alt=${this.name} />`
          : html`<div class="avatar" style="background: #e5e7eb"></div>`
        }
        <div>
          <p class="name">${this.name}</p>
          <p class="role">${this.role}</p>
        </div>
      </div>

      ${this.bio ? html`<p class="bio">${this.bio}</p>` : ''}

      <div class="actions">
        <button
          class="primary ${this._loading ? 'loading' : ''}"
          @click=${this._handleFollow}
        >
          ${this.following ? 'Unfollow' : 'Follow'}
        </button>
        <button class="secondary" @click=${this._handleMessage}>
          Message
        </button>
      </div>
    `;
  }

  private async _handleFollow() {
    this._loading = true;
    this.following = !this.following;

    this.dispatchEvent(new CustomEvent('follow-change', {
      detail: { following: this.following, userId: this.getAttribute('user-id') },
      bubbles: true,
      composed: true,
    }));

    this._loading = false;
  }

  private _handleMessage() {
    this.dispatchEvent(new CustomEvent('message-click', {
      detail: { userId: this.getAttribute('user-id') },
      bubbles: true,
      composed: true,
    }));
  }
}

// TypeScript declarations
declare global {
  interface HTMLElementTagNameMap {
    'user-card': UserCard;
  }
}

// Usage:
// <user-card
//   name="Alice Johnson"
//   role="Senior Engineer"
//   avatar-url="/avatars/alice.jpg"
//   bio="Building things that matter."
//   user-id="u_123"
// ></user-card>
```

### 4. Framework Integration

```tsx
// React wrapper for web components
// React 19+ handles custom elements natively. For React 18 and below:

import { useRef, useEffect } from 'react';

interface UserCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  following?: boolean;
  onFollowChange?: (detail: { following: boolean; userId: string }) => void;
  onMessageClick?: (detail: { userId: string }) => void;
}

export function UserCard({
  name, role, avatarUrl, bio, following, onFollowChange, onMessageClick,
}: UserCardProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleFollow = (e: Event) => {
      onFollowChange?.((e as CustomEvent).detail);
    };
    const handleMessage = (e: Event) => {
      onMessageClick?.((e as CustomEvent).detail);
    };

    el.addEventListener('follow-change', handleFollow);
    el.addEventListener('message-click', handleMessage);

    return () => {
      el.removeEventListener('follow-change', handleFollow);
      el.removeEventListener('message-click', handleMessage);
    };
  }, [onFollowChange, onMessageClick]);

  return (
    <user-card
      ref={ref}
      name={name}
      role={role}
      avatar-url={avatarUrl}
      bio={bio}
      following={following || undefined}
    />
  );
}

// For React 19+, this works directly:
// <user-card name="Alice" onfollow-change={handleFollow} />
```

```html
<!-- Vue integration -- works out of the box -->
<template>
  <user-card
    :name="user.name"
    :role="user.role"
    :avatar-url="user.avatarUrl"
    @follow-change="handleFollow"
    @message-click="handleMessage"
  />
</template>

<script setup lang="ts">
// Vue handles custom events and properties natively
function handleFollow(e: CustomEvent) {
  console.log('Follow:', e.detail);
}
function handleMessage(e: CustomEvent) {
  console.log('Message:', e.detail);
}
</script>
```

### 5. CSS Custom Properties for Theming

```typescript
// Expose CSS custom properties for external theming without piercing Shadow DOM

class AppButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: inline-block;
        }

        button {
          /* Theming via CSS custom properties -- consumers can override these */
          --_bg: var(--app-button-bg, #2563eb);
          --_color: var(--app-button-color, #ffffff);
          --_radius: var(--app-button-radius, 0.5rem);
          --_padding-x: var(--app-button-padding-x, 1.5rem);
          --_padding-y: var(--app-button-padding-y, 1rem);
          --_font-size: var(--app-button-font-size, 1rem);

          background: var(--_bg);
          color: var(--_color);
          border: none;
          border-radius: var(--_radius);
          padding: var(--_padding-y) var(--_padding-x);
          font-size: var(--_font-size);
          font-weight: 600;
          cursor: pointer;
          transition: all 200ms;
          font-family: inherit;
          line-height: 1;
          min-height: 2.625rem;
        }

        button:hover {
          filter: brightness(0.9);
        }

        button:focus-visible {
          outline: 2px solid var(--_bg);
          outline-offset: 2px;
        }

        button:active {
          transform: scale(0.98);
        }

        :host([variant="secondary"]) button {
          --_bg: var(--app-button-secondary-bg, #ffffff);
          --_color: var(--app-button-secondary-color, #374151);
          border: 1px solid #d1d5db;
        }

        :host([variant="danger"]) button {
          --_bg: var(--app-button-danger-bg, #dc2626);
          --_color: var(--app-button-danger-color, #ffffff);
        }

        :host([size="sm"]) button {
          --_padding-x: 1rem;
          --_padding-y: 0.5rem;
          --_font-size: 0.875rem;
        }

        :host([size="lg"]) button {
          --_padding-x: 2rem;
          --_padding-y: 1.25rem;
          --_font-size: 1.125rem;
        }

        :host([disabled]) button {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
      </style>

      <button part="button">
        <slot></slot>
      </button>
    `;
  }
}

customElements.define('app-button', AppButton);

// Consumer theming via CSS:
// app-button {
//   --app-button-bg: #059669;
//   --app-button-radius: 9999px;
// }
```

### 6. Form-Associated Custom Elements

```typescript
// Custom elements that participate in HTML forms natively

class AppInput extends HTMLElement {
  static formAssociated = true;
  static observedAttributes = ['value', 'name', 'required', 'placeholder', 'type'];

  private internals: ElementInternals;
  private input!: HTMLInputElement;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        input {
          padding: 0.75rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          min-height: 2.75rem;
          transition: all 200ms;
          font-family: inherit;
          color: #111827;
          background: #ffffff;
        }

        input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.15);
        }

        input:invalid {
          border-color: #ef4444;
        }

        .error {
          font-size: 0.8125rem;
          color: #ef4444;
          min-height: 1.25rem;
        }
      </style>

      <div class="wrapper">
        <label><slot name="label"></slot></label>
        <input />
        <div class="error" role="alert"></div>
      </div>
    `;

    this.input = this.shadowRoot!.querySelector('input')!;

    this.input.addEventListener('input', () => {
      this.internals.setFormValue(this.input.value);
      this.validate();
    });
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (!this.input) return;
    switch (name) {
      case 'value': this.input.value = value ?? ''; break;
      case 'placeholder': this.input.placeholder = value ?? ''; break;
      case 'type': this.input.type = value ?? 'text'; break;
      case 'required': this.input.required = value !== null; break;
    }
  }

  get value() { return this.input?.value ?? ''; }
  set value(val: string) {
    this.input.value = val;
    this.internals.setFormValue(val);
  }

  private validate() {
    if (this.input.validity.valueMissing) {
      this.internals.setValidity(
        { valueMissing: true },
        'This field is required',
        this.input
      );
    } else {
      this.internals.setValidity({});
    }
  }

  // Form lifecycle callbacks
  formResetCallback() {
    this.input.value = '';
    this.internals.setFormValue('');
  }

  formStateRestoreCallback(state: string) {
    this.input.value = state;
    this.internals.setFormValue(state);
  }
}

customElements.define('app-input', AppInput);

// Works in standard HTML forms:
// <form>
//   <app-input name="email" required placeholder="you@example.com">
//     <span slot="label">Email</span>
//   </app-input>
//   <button type="submit">Submit</button>
// </form>
```

## Best Practices

1. **Always include a hyphen in tag names** -- `<my-button>` not `<mybutton>`; single-word names are reserved
2. **Dispatch composed events** -- set `composed: true` so events cross shadow DOM boundaries
3. **Use CSS custom properties for theming** -- they pierce Shadow DOM; this is the designed API for external styling
4. **Expose `part` attributes** -- `::part(button)` lets consumers style specific internal elements
5. **Make attributes reflect properties** -- keep HTML attributes and JS properties in sync
6. **Use `observedAttributes` sparingly** -- only observe attributes that affect rendering
7. **Register elements once** -- guard with `if (!customElements.get('my-el'))` to avoid duplicate registration errors
8. **Keep shadow DOM optional for simple components** -- not everything needs style encapsulation
9. **Support SSR with Declarative Shadow DOM** -- use `<template shadowrootmode="open">` for server rendering
10. **Use Lit for complex components** -- vanilla API is fine for simple elements, but Lit removes significant boilerplate for reactive rendering

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Setting properties in constructor | Crash: DOM not ready | Use `connectedCallback` for DOM setup |
| Not calling `super()` first in constructor | TypeError | Always `super()` before anything else |
| Missing `composed: true` on events | Events stop at shadow boundary | Set `composed: true` and `bubbles: true` |
| Styling with external CSS | Styles blocked by Shadow DOM | Use CSS custom properties or `::part()` |
| Using `this.innerHTML` with Shadow DOM | Overwrites light DOM (slot content) | Use `this.shadowRoot.innerHTML` |
| Registering same tag name twice | `DOMException: already defined` | Guard with `customElements.get()` check |
| React 18 not passing events to custom elements | Event handlers silently ignored | Use ref + addEventListener, or upgrade to React 19 |
| Heavy work in `connectedCallback` | Blocks rendering, called on every DOM move | Defer heavy work with `requestAnimationFrame` or `setTimeout` |
| Not cleaning up in `disconnectedCallback` | Memory leaks from subscriptions/intervals | Clear intervals, remove global listeners, close connections |
| Assuming `adoptedCallback` is common | Rarely fires, only on `document.adoptNode()` | Do not rely on it for initialization logic |
