# i18n

- **layer**: domain
- **category**: internationalization
- **riskLevel**: low
- **triggers**: ["i18n", "internationalization", "translation", "locale", "RTL", "multilingual"]

## Overview

Internationalization patterns for web apps — translations, locale formatting, RTL support.

## When to Use

- Adding multi-language support to a web application
- Formatting dates, numbers, or currencies for different locales
- Implementing RTL layout support
- Organizing translation files and namespaces
- Setting up locale-based routing

## Key Patterns

### next-intl (Next.js App Router)

- `useTranslations('namespace')` for scoped translation access
- `useFormatter()` for locale-aware date/number formatting
- `useLocale()` to read the active locale
- Middleware-based locale detection with `createMiddleware()`

### react-intl / FormatJS

- `<FormattedMessage id="key" defaultMessage="..." values={{name}} />`
- `useIntl()` hook for imperative formatting (`intl.formatMessage()`)
- `IntlProvider` wrapping the app with locale and messages

### i18next / react-i18next

- `useTranslation('namespace')` hook returning `t()` function
- `<Trans>` component for JSX interpolation
- Backend plugins for lazy-loading translation files

### Translation Organization

- Namespace-based file structure: `messages/{locale}/{namespace}.json`
- ICU message format for plurals: `{count, plural, one {# item} other {# items}}`
- ICU select for gender/variants: `{gender, select, female {She} male {He} other {They}}`

### Locale Formatting

- `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`
- Currency: `new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })`
- Always pass locale explicitly — never rely on browser defaults in SSR

### RTL Support

- Set `dir="rtl"` on `<html>` based on locale
- Use logical CSS properties: `margin-inline-start` instead of `margin-left`
- Tailwind: `rtl:` variant or logical utilities (`ms-4`, `me-4`, `ps-4`, `pe-4`)

### Dynamic Locale Loading

- Lazy-import translation files: `const messages = await import(\`./messages/${locale}.json\`)`
- Split by namespace to reduce bundle size per route

### Type-Safe Keys

- Generate types from default locale JSON (`next-intl` and `i18next` both support this)
- Catch missing keys at build time, not runtime

### URL-Based Locale Routing

- Pattern: `/{locale}/path` (e.g., `/en/about`, `/ja/about`)
- Next.js: use `[locale]` segment with middleware redirect
- Canonical URLs with `hreflang` tags for SEO

## Anti-Patterns

- Hardcoding user-visible strings instead of using translation keys
- Concatenating translated fragments — use ICU interpolation instead
- Storing locale in local state instead of the URL or cookie
- Assuming LTR layout — always plan for bidirectional text
- Loading all locales upfront instead of lazy-loading per locale
- Using raw `Date.toLocaleDateString()` without consistent options

## Related Skills

- [nextjs](../nextjs/SKILL.md)
- [react](../react/SKILL.md)
- [typescript-frontend](../typescript-frontend/SKILL.md)
