---
name: react-hook-form
description: Performant, flexible forms with minimal re-renders using React Hook Form
layer: domain
category: forms
triggers: ["react hook form", "useForm", "useFieldArray", "hookform", "rhf"]
inputs:
  - form_requirements: Fields, validation rules, submission behavior
  - ui_library: Controlled components in use (Select, DatePicker, etc.)
outputs:
  - form_implementation: useForm setup with validation and submission
  - schema: Zod schema with @hookform/resolvers integration
linksTo: [react, forms, zod, typescript-frontend]
linkedFrom: [forms, react, nextjs]
riskLevel: low
---
# React Hook Form

Performant, flexible forms with minimal re-renders. Embraces uncontrolled inputs by default and isolates component re-renders for optimal performance.

## When to Use
- Forms with 3+ fields where re-render performance matters
- Complex validation (async, cross-field, conditional)
- Dynamic fields (add/remove rows) or multi-step forms
- Integration with controlled UI libraries (Radix, MUI, Headless UI)

## Key Patterns

**useForm hook** -- `register`, `handleSubmit`, `watch`, `formState` (`errors`, `isSubmitting`, `isDirty`):
```ts
const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<T>({
  resolver: zodResolver(schema), defaultValues: { ... },
  mode: 'onBlur', // onSubmit | onChange | onBlur | onTouched | all
});
```
**Zod integration** via `@hookform/resolvers`:
```ts
import { zodResolver } from '@hookform/resolvers/zod';
const form = useForm({ resolver: zodResolver(mySchema) }); // z.infer<typeof mySchema>
```
**Controller** for controlled components (Select, DatePicker, etc.):
```tsx
<Controller name="role" control={control} render={({ field }) => (
  <Select onValueChange={field.onChange} value={field.value}>{/* options */}</Select>
)} />
```
**useFieldArray** for dynamic fields:
```ts
const { fields, append, remove, move } = useFieldArray({ control, name: 'items' });
// fields.map((f, i) => <input key={f.id} {...register(`items.${i}.name`)} />)
```
**FormProvider + useFormContext** for form composition:
```tsx
<FormProvider {...methods}><StepOne /><StepTwo /></FormProvider>
// Child: const { register } = useFormContext<T>();
```
**Server actions** -- validate client-side with RHF, then call `useFormState(serverAction, init)` on success.

**DevTools** -- `import { DevTool } from '@hookform/devtools'` for a floating state inspector in dev.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| `watch()` entire form | `watch('field')` or `useWatch` to limit re-renders |
| `register` on controlled components | Use `Controller` instead |
| Missing `key={field.id}` in useFieldArray | Always key by `field.id` |
| `mode: 'onChange'` by default | Use `onBlur` or `onTouched` |
| Recreating `defaultValues` each render | Memoize or define outside component |
| `setValue` in loops | Batch with `reset()` or `shouldValidate: false` |

## Related Skills
`react` -- `forms` -- `zod` -- `typescript-frontend`
