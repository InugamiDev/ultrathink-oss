# E-E-A-T audit

Google's quality framework: **Experience, Expertise, Authoritativeness, Trust**. Strongest ranking signal for YMYL (Your Money or Your Life) topics — health, finance, legal — but applies everywhere.

## Audit per page

### Experience
- [ ] Author has firsthand experience with the topic? (Visible on the page, not implied)
- [ ] Real photos / screenshots / case studies, not stock?
- [ ] First-person language where appropriate?
- [ ] Original data, not just summaries of other articles?

### Expertise
- [ ] Author bio shown? (linked Person schema, credentials, links to LinkedIn / publications)
- [ ] Topic-relevant credentials (degree, years in field, certs)?
- [ ] Co-authored / reviewed by an expert when the author is a generalist?
- [ ] Updated dates visible — content is maintained?

### Authoritativeness
- [ ] Site has topical authority? (Many quality pages on the same topic, not scattered)
- [ ] External citations link to primary sources, not other blogs?
- [ ] Inbound links from authoritative sites in the niche?
- [ ] Brand mentions in trade publications?

### Trust
- [ ] HTTPS, valid cert, no mixed content?
- [ ] Contact info, physical address, phone present?
- [ ] Author bylines on every article?
- [ ] Editorial / fact-checking policy linked?
- [ ] Privacy policy + terms?
- [ ] Schema.org `Organization` with `sameAs` links to social profiles?
- [ ] Reviews / ratings if e-commerce or services (with valid AggregateRating schema)?
- [ ] No scraped / spun / AI-generated content without disclosure or human review?

## Common gaps

| Gap | Fix |
|---|---|
| Anonymous "Admin" author bylines | Real names + headshots + bio links per author |
| No "About" / "Editorial Policy" page | Write one. Mention review process, sourcing standards, conflict-of-interest policy |
| Citations link to Wikipedia / other listicles | Replace with primary sources (papers, official docs, gov/edu) |
| No author Person schema | Add to author pages; link from Article schema's `author` |
| YMYL topic with no expert review | Add a "Reviewed by Dr. X, MD" line or pull the page |
| Old content with no update history | Add `dateModified` + a visible "Last updated" line |

## Schema.org wiring

```typescript
// Author Person schema on /authors/[slug]
const author = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Author Name",
  url: "https://example.com/authors/author-name",
  image: "https://example.com/authors/author-name.jpg",
  sameAs: [
    "https://linkedin.com/in/...",
    "https://twitter.com/...",
    "https://orcid.org/...",
    "https://scholar.google.com/...",
  ],
  jobTitle: "Senior X at Y",
  worksFor: { "@type": "Organization", name: "..." },
  alumniOf: { "@type": "EducationalOrganization", name: "..." },
  knowsAbout: ["topic1", "topic2"],
};

// Article — reference the author and a reviewer
const article = {
  "@context": "https://schema.org",
  "@type": "Article",
  author: { "@id": "https://example.com/authors/author-name" },
  // For YMYL: add a reviewer
  reviewedBy: { "@type": "Person", name: "Dr. Reviewer", honorificSuffix: "MD" },
};
```

## What signals you cannot fake

Google's been at this 25 years. They distinguish:

- **Genuine expertise:** consistent posts on a tight topic over time, citations *to* you from authoritative sites in that topic
- **Performance art:** bought backlinks, spun content, fake reviews, hidden authorship

Don't bother with the second category. The cleanup costs more than the lift.
