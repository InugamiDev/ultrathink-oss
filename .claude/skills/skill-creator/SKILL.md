---
name: skill-creator
description: Meta-skill for creating, validating, and maintaining UltraThink skill definitions
layer: utility
category: meta
triggers:
  - "create skill"
  - "new skill"
  - "add skill"
  - "skill template"
  - "define skill"
inputs:
  - skill_name: Identifier for the skill (kebab-case)
  - description: What the skill does
  - layer: hub | utility | domain
  - category: The skill's functional category
  - domain_knowledge: Core expertise the skill should encode
outputs:
  - skill_definition: Complete SKILL.md with frontmatter and body
  - validation_report: Frontmatter schema compliance check
  - integration_map: How the skill connects to existing skills
linksTo:
  - research
  - plan
linkedFrom:
  - team
  - cook
preferredNextSkills:
  - research
fallbackSkills:
  - sequential-thinking
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Creates new SKILL.md file
  - May update linksTo/linkedFrom in related skills
---

# Skill Creator (Meta-Skill)

## Purpose

Create new UltraThink skills that follow the established conventions, schema, and quality standards. This meta-skill ensures every new skill has proper YAML frontmatter, meaningful content, correct cross-references, and actionable guidance. It is the skill that makes skills.

## Key Concepts

### Skill Architecture

```
LAYERS:
  hub      -- Orchestration skills that coordinate other skills (plan, cook, ship)
  utility  -- General-purpose tools usable across domains (error-handling, logging)
  domain   -- Deep expertise in a specific technology or area (react, postgresql)

SKILL FILE STRUCTURE:
  .claude/skills/{skill-name}/SKILL.md

FRONTMATTER (YAML) -- Required Fields:
  name              (string, kebab-case)
  description       (string, one line, under 120 chars)
  layer             (hub | utility | domain)
  category          (string, grouping label)
  triggers          (array of activation phrases)
  inputs            (array of what the skill needs)
  outputs           (array of what the skill produces)
  linksTo           (array of skills this skill calls)
  linkedFrom        (array of skills that call this skill)
  preferredNextSkills (recommended follow-up skills)
  fallbackSkills    (alternative skills if this one cannot handle the task)
  riskLevel         (low | medium | high)
  memoryReadPolicy  (none | selective | full)
  memoryWritePolicy (none | selective | full)
  sideEffects       (array of side effects)

BODY (Markdown) -- Required Sections:
  # [Skill Name]
  ## Purpose
  ## Key Concepts / Key Patterns
  ## Workflow or Patterns
  ## Best Practices
  ## Common Pitfalls
  ## Examples
```

### Quality Standards

```
CONTENT REQUIREMENTS:
  - Minimum 100 lines of body content
  - At least one code example with comments
  - Best practices list with at least 5 items
  - Common pitfalls table with at least 4 entries
  - No placeholder text ("TODO", "TBD", "coming soon")

NAMING CONVENTIONS:
  - Skill name: kebab-case (e.g., "error-handling", "react-native")
  - Category: lowercase (e.g., "frontend", "ai-ml", "database")
  - Trigger phrases: lowercase, natural language
```

## Workflow

### Phase 1: Skill Definition

1. **Determine the layer**:
   - Orchestration skill calling others? -> `hub`
   - General tool useful across domains? -> `utility`
   - Deep expertise in specific tech? -> `domain`

2. **Determine the category**:
   - Group with related skills (e.g., `database`, `frontend`, `security`)
   - Check existing categories before creating new ones

3. **Define the interface**:
   - What triggers this skill?
   - What inputs does it need?
   - What outputs does it produce?

4. **Map relationships**:
   - linksTo: skills this skill calls
   - linkedFrom: skills that call this skill
   - preferredNextSkills: what to do after
   - fallbackSkills: alternatives if this skill cannot handle it

### Phase 2: Content Creation

5. **Purpose** -- one paragraph, what it does and why
6. **Key Concepts** -- core knowledge, decision frameworks, terminology
7. **Workflow/Patterns** -- step-by-step process or reusable code patterns
8. **Best Practices** -- minimum 5 items with rationale
9. **Pitfalls** -- minimum 4 entries in table format
10. **Examples** -- at least one concrete usage example

### Phase 3: Validation

11. Validate frontmatter against schema
12. Check all linksTo point to existing skills
13. Verify no circular dependencies
14. Test trigger phrases for uniqueness

## Skill Template

```markdown
---
name: {skill-name}
description: {One-line description under 120 chars}
layer: {hub | utility | domain}
category: {category}
triggers:
  - "{skill-name}"
  - "{trigger phrase 1}"
  - "{trigger phrase 2}"
inputs:
  - {input}: {description}
outputs:
  - {output}: {description}
linksTo:
  - {skill}
linkedFrom:
  - {skill}
preferredNextSkills:
  - {skill}
fallbackSkills:
  - {skill}
riskLevel: {low | medium | high}
memoryReadPolicy: {none | selective | full}
memoryWritePolicy: {none | selective | full}
sideEffects: []
---

# {Skill Title}

## Purpose
{What this skill does and when to use it.}

## Key Concepts
{Core knowledge and decision frameworks.}

## Workflow
{Step-by-step process or reusable patterns.}

## Best Practices
1. **{Practice}** -- {Rationale}

## Common Pitfalls
| Pitfall | Impact | Fix |
|---------|--------|-----|
| {problem} | {consequence} | {solution} |

## Examples
### Example: {Use Case}
{Concrete example with code.}
```

## Best Practices

1. **One skill, one responsibility** -- split bloated skills
2. **Triggers must be unambiguous** -- no two skills share the same trigger
3. **Content over metadata** -- body content is what makes a skill useful
4. **Keep skills self-contained** -- useful even if no other skills exist
5. **Update linkedFrom when adding linksTo** -- cross-references must be bidirectional
6. **Version through git** -- use git history to track skill evolution
7. **Test with real tasks** -- after creating a skill, verify it with actual requests

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Stub skills with no content | Triggered but provides no value | Minimum 100 lines of body |
| Overlapping triggers | Wrong skill activated | Audit triggers for uniqueness |
| Missing cross-references | Skill graph incomplete | Update both linksTo and linkedFrom |
| Too broad scope | Skill tries to do everything | Split into focused skills |
| No examples | Users cannot understand usage | Add at least one concrete example |
