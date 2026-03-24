---
name: ai-prompts
description: AI prompt library covering system prompts, few-shot templates, structured output schemas, and prompt engineering patterns for production LLM applications
layer: domain
category: ai
triggers:
  - "system prompt"
  - "few-shot"
  - "prompt template"
  - "structured output"
  - "prompt engineering"
  - "LLM prompt"
  - "chain of thought"
  - "prompt library"
inputs:
  - "Task description requiring prompt design"
  - "Existing prompts needing optimization"
  - "Structured output format requirements"
  - "Few-shot example construction needs"
outputs:
  - "Production-ready system prompts"
  - "Few-shot template sets with examples"
  - "Structured output schemas (JSON, XML)"
  - "Prompt evaluation and improvement suggestions"
linksTo:
  - prompt-engineering
  - ai-agents
  - rag
linkedFrom:
  - ai-agents
  - prompt-engineering
preferredNextSkills:
  - prompt-engineering
  - ai-agents
fallbackSkills:
  - rag
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# AI Prompt Library

## Purpose

Provide ready-to-use prompt patterns, system prompt templates, few-shot designs, and structured output schemas for building reliable LLM-powered applications. Focuses on deterministic, testable prompts that produce consistent results across models.

## Key Patterns

### System Prompt Architecture

**Role-Task-Format-Constraints (RTFC) framework:**

```text
# System Prompt Template

## Role
You are a {role_description} with expertise in {domain}.

## Task
{clear_task_description}

## Input Format
You will receive: {input_description}

## Output Format
Respond with: {output_specification}

## Constraints
- {constraint_1}
- {constraint_2}
- If uncertain, {fallback_behavior}

## Examples
{few_shot_examples}
```

**Production system prompt example:**

```typescript
const CODE_REVIEWER_PROMPT = `
You are a senior code reviewer specializing in TypeScript and React.

## Task
Review the provided code diff and identify:
1. Bugs or logic errors
2. Security vulnerabilities
3. Performance issues
4. Style/readability improvements

## Output Format
Respond with a JSON array of findings:
\`\`\`json
[{
  "severity": "critical" | "warning" | "info",
  "line": number,
  "category": "bug" | "security" | "performance" | "style",
  "description": "What the issue is",
  "suggestion": "How to fix it"
}]
\`\`\`

## Constraints
- Only report genuine issues, not style preferences
- Maximum 10 findings, prioritize by severity
- If no issues found, return an empty array []
- Never suggest changes that alter behavior without flagging as "breaking"
`;
```

### Few-Shot Templates

**Consistent formatting drives better results:**

```typescript
function buildFewShotPrompt(
  task: string,
  examples: { input: string; output: string }[],
  query: string
): string {
  const exampleBlock = examples
    .map((ex, i) => [
      `### Example ${i + 1}`,
      `**Input:** ${ex.input}`,
      `**Output:** ${ex.output}`,
    ].join('\n'))
    .join('\n\n');

  return `${task}

${exampleBlock}

### Your Task
**Input:** ${query}
**Output:**`;
}

// Usage
const prompt = buildFewShotPrompt(
  'Classify the sentiment of the following customer review.',
  [
    { input: 'The product arrived broken and support was unhelpful.', output: '{"sentiment": "negative", "confidence": 0.95, "topics": ["quality", "support"]}' },
    { input: 'Works great, fast shipping, would buy again!', output: '{"sentiment": "positive", "confidence": 0.92, "topics": ["quality", "shipping"]}' },
    { input: 'It is okay, nothing special for the price.', output: '{"sentiment": "neutral", "confidence": 0.78, "topics": ["value"]}' },
  ],
  userReview
);
```

### Structured Output with JSON Schema

**Force deterministic output with schemas:**

```typescript
import { z } from 'zod';

// Define the schema
const ExtractionSchema = z.object({
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['person', 'organization', 'location', 'date', 'money']),
    confidence: z.number().min(0).max(1),
  })),
  summary: z.string().max(200),
  language: z.string(),
});

type Extraction = z.infer<typeof ExtractionSchema>;

// System prompt referencing the schema
const EXTRACTION_PROMPT = `
Extract named entities from the provided text.

Respond ONLY with valid JSON matching this schema:
{
  "entities": [{ "name": string, "type": "person"|"organization"|"location"|"date"|"money", "confidence": 0-1 }],
  "summary": "max 200 char summary",
  "language": "ISO 639-1 code"
}

Rules:
- confidence must reflect extraction certainty
- If no entities found, return empty array
- summary must be in the same language as the input
`;

// Parse and validate response
async function extractEntities(text: string): Promise<Extraction> {
  const response = await llm.chat({
    system: EXTRACTION_PROMPT,
    user: text,
    response_format: { type: 'json_object' },
  });

  return ExtractionSchema.parse(JSON.parse(response.content));
}
```

### Chain-of-Thought Prompting

```text
## System
You are a math tutor. Solve problems step by step.

## Instructions
For each problem:
1. Identify what is being asked
2. List known values and unknowns
3. Choose the appropriate formula or method
4. Show each calculation step
5. State the final answer clearly

Format your response as:
**Understanding:** ...
**Known:** ...
**Method:** ...
**Steps:**
  1. ...
  2. ...
**Answer:** ...
```

### Prompt Composition for Pipelines

**Chain prompts for complex tasks:**

```typescript
// Step 1: Extract key information
const EXTRACT_PROMPT = `Extract the key facts from this document as bullet points. Be exhaustive.`;

// Step 2: Analyze extracted facts
const ANALYZE_PROMPT = `Given these facts, identify:
- Contradictions or inconsistencies
- Missing information that would be needed for a complete picture
- Key relationships between facts
Respond as JSON: { contradictions: string[], gaps: string[], relationships: string[] }`;

// Step 3: Generate final report
const REPORT_PROMPT = `Write a concise analysis report based on:
**Facts:** {facts}
**Analysis:** {analysis}

Format: Executive summary (2-3 sentences), then bullet-point findings, then recommendations.`;

async function analyzeDocument(doc: string) {
  const facts = await llm.chat({ system: EXTRACT_PROMPT, user: doc });
  const analysis = await llm.chat({ system: ANALYZE_PROMPT, user: facts });
  const report = await llm.chat({
    system: REPORT_PROMPT
      .replace('{facts}', facts)
      .replace('{analysis}', analysis),
    user: 'Generate the report.',
  });
  return report;
}
```

### XML-Structured Prompts

**Use XML tags for clear section boundaries:**

```text
<system>
You are a technical writer creating API documentation.
</system>

<context>
API endpoint: {endpoint}
Method: {method}
Authentication: {auth_type}
</context>

<instructions>
Generate documentation including:
1. Description
2. Request parameters (table format)
3. Response schema
4. Error codes
5. Example request and response
</instructions>

<format>
Use markdown. Code blocks for examples. Tables for parameters.
</format>
```

## Best Practices

1. **Be explicit about output format** -- Never leave output structure ambiguous. Provide JSON schemas, examples, or templates.
2. **Use delimiters consistently** -- Wrap user input in tags (`<input>...</input>`) to prevent prompt injection.
3. **Provide 3-5 few-shot examples** -- Cover edge cases (empty input, ambiguous input, error cases), not just happy paths.
4. **Version your prompts** -- Store prompts in version control with changelogs. A/B test changes against labeled datasets.
5. **Separate instructions from data** -- System prompt for instructions, user message for data. Never mix.
6. **Add guardrails in the prompt** -- Define what to do when uncertain, when input is invalid, or when the task is out of scope.
7. **Test with adversarial inputs** -- Include prompt injection attempts, off-topic queries, and malformed data in your test suite.
8. **Keep prompts DRY** -- Use template functions that compose prompt sections rather than copy-pasting blocks.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Vague instructions | Model guesses format, inconsistent results | Specify exact output structure with schema or examples |
| No few-shot examples | Model interprets task differently than intended | Add 3-5 diverse examples covering edge cases |
| User input in system prompt | Prompt injection vulnerability | Always pass user data in the user message, never concatenate into system prompt |
| Over-long system prompts | Key instructions buried, model loses focus | Front-load critical rules, use headers for scanability |
| No error handling instruction | Model hallucinates when input is ambiguous | Add explicit "if uncertain" and "if input is invalid" clauses |
| Hardcoded examples only | Model overfits to example patterns | Vary example formats and include boundary cases |
| Ignoring token limits | Prompt + response exceeds context window | Track token usage, truncate context intelligently, use summarization chains |
| No output validation | Invalid JSON, wrong types, missing fields | Always validate LLM output against a schema (Zod, JSON Schema) before using |
