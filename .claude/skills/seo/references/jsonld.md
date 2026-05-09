# JSON-LD Structured Data

Schema.org markup helps Google build rich snippets (review stars, FAQ accordions, breadcrumbs, product cards, etc.). One JSON-LD block per page is the modern norm — it's faster than micro-data and easier to keep in sync with your content.

## Pick the right type

| Page kind | schema.org type | Template |
|---|---|---|
| Blog post / article | `Article` (or `BlogPosting`, `NewsArticle`) | `assets/templates/article-jsonld.json` |
| Product page | `Product` + nested `Offer` and `AggregateRating` | `assets/templates/product-jsonld.json` |
| About / org page | `Organization` (top-level), `Corporation`, `LocalBusiness` if local | `assets/templates/organization-jsonld.json` |
| Local business | `LocalBusiness` (or specific subtype: `Restaurant`, `Dentist`, etc.) | `assets/templates/local-business-jsonld.json` |
| Recipe | `Recipe` | — |
| FAQ section | `FAQPage` with `mainEntity` array | — |
| How-to | `HowTo` with `step` array | — |
| Event | `Event` + nested `Place` and `Offer` | — |
| Person | `Person` | — |
| Software | `SoftwareApplication` | — |
| Course | `Course` | — |
| Video | `VideoObject` | — |
| Job | `JobPosting` | — |

## Embedding pattern (Next.js App Router)

```typescript
// components/json-ld.tsx
import "server-only";

interface Props {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // server-rendered + serialised — safe with our own data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

Use it from a page:
```typescript
import { JsonLd } from "@/components/json-ld";
import articleTemplate from "@/lib/seo/article.json";

export default async function Page({ params }: Props) {
  const post = await getPost(params.slug);
  const jsonLd = {
    ...articleTemplate,
    headline: post.title,
    image: post.coverImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: {
      "@type": "Organization",
      name: "My App",
      logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://example.com/blog/${post.slug}` },
  };
  return <>
    <JsonLd data={jsonLd} />
    <ArticleBody post={post} />
  </>;
}
```

## Validate before shipping

- Google's Rich Results Test: `https://search.google.com/test/rich-results`
- Schema.org validator: `https://validator.schema.org/`
- Programmatically (CI):
  ```bash
  curl -s "https://search.google.com/test/rich-results?url=$(urlencode $URL)" -o /tmp/r.json
  ```

## Pitfalls

- **Escape `</script>` inside JSON strings**. If a description contains `</script>`, the parser breaks. Use `JSON.stringify` (Node.js does the right escaping) or a sanitiser.
- **Don't add fake reviews / fake ratings**. Google penalises invalid AggregateRating values.
- **Match what the user sees**. JSON-LD claiming "$10" while the page shows "$15" gets the page demoted.
- **One graph per page**. Use `@graph` to nest multiple types if needed:
  ```json
  {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", ... },
      { "@type": "WebSite", ... },
      { "@type": "BreadcrumbList", ... }
    ]
  }
  ```
- **`@id` matters for joining graph nodes**. Use canonical URLs as the `@id` and reference them by `{ "@id": "..." }` from other nodes.

## Common combos

**Article page**: `Article` + `BreadcrumbList` + `Person` (author).

**Product page**: `Product` (with `Offer`, `AggregateRating`, `Review`) + `BreadcrumbList`.

**Homepage**: `Organization` + `WebSite` (with `potentialAction` for sitelinks search).

**Local business landing**: `LocalBusiness` (subtype) + `Place` + `OpeningHoursSpecification` + `AggregateRating`.
