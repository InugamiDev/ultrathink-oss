---
name: server-actions
description: Next.js Server Actions — "use server", form actions, revalidation, optimistic updates with useOptimistic, progressive enhancement
layer: domain
category: frontend
triggers:
  - "server action"
  - "server actions"
  - "use server"
  - "form action"
  - "revalidatePath"
  - "revalidateTag"
  - "useOptimistic"
  - "optimistic update"
linksTo:
  - nextjs
  - forms
  - react
linkedFrom:
  - nextjs
  - forms
---

# Server Actions Skill

## Purpose

Server Actions are Next.js's RPC mechanism: async functions on the server, callable from client components. They replace API routes for mutations, provide progressive enhancement, and integrate with React's concurrent features.

## Server Action with Validation

```typescript
// app/actions/posts.ts
'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(10, 'Content must be at least 10 characters'),
});

export type ActionState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export async function createPost(prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { success: false, errors: parsed.error.flatten().fieldErrors };

  const session = await getSession();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    await db.post.create({ data: { ...parsed.data, authorId: session.user.id } });
  } catch {
    return { success: false, message: 'Failed to create post' };
  }

  revalidateTag('posts');
  redirect('/posts');
}
```

## Form with useActionState

```typescript
'use client';

import { useActionState } from 'react';
import { createPost, type ActionState } from '@/app/actions/posts';

export function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(createPost, { success: false });

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required className="w-full rounded-lg border px-4 py-3" />
        {state.errors?.title && <p className="text-sm text-red-600">{state.errors.title[0]}</p>}
      </div>
      <div>
        <label htmlFor="content">Content</label>
        <textarea id="content" name="content" required className="w-full rounded-lg border px-4 py-3" />
        {state.errors?.content && <p className="text-sm text-red-600">{state.errors.content[0]}</p>}
      </div>
      <button type="submit" disabled={isPending}
        className="rounded-lg bg-blue-600 px-6 py-4 text-white transition-all duration-200 hover:bg-blue-700 disabled:opacity-50">
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

## Optimistic Updates

```typescript
'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleLike } from '@/app/actions/likes';

export function LikeButton({ postId, liked, count }: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    { liked, count },
    (current, newLiked: boolean) => ({
      liked: newLiked,
      count: current.count + (newLiked ? 1 : -1),
    })
  );

  return (
    <button onClick={() => startTransition(async () => {
      setOptimistic(!optimistic.liked);
      await toggleLike(postId);
    })} disabled={isPending}>
      {optimistic.liked ? 'Unlike' : 'Like'} ({optimistic.count})
    </button>
  );
}
```

## Revalidation Strategies

```typescript
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

revalidatePath('/posts');                    // Revalidate a specific page
revalidatePath('/posts/[slug]', 'page');     // Revalidate all post pages
revalidatePath('/', 'layout');               // Revalidate everything

revalidateTag('posts');                      // Tag-based (more precise)
revalidateTag(`post-${id}`);                 // Revalidate specific post data

// Tag fetches for invalidation
const posts = await fetch(url, { next: { tags: ['posts'] } });
```

## Best Practices

1. **Always validate inputs** with Zod — never trust client data
2. **Check auth inside the action**, not just in middleware
3. **Return structured errors** instead of throwing — enables field-level UI messages
4. **Use `revalidateTag`** over `revalidatePath` for precise invalidation
5. **Don't call `redirect()` inside try/catch** — redirect throws internally
6. **Use `useActionState`** over manual useState + startTransition for forms
7. **Keep actions in separate `'use server'` files** for clear boundaries
