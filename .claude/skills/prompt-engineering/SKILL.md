---
name: prompt-engineering
description: Prompt design, chain-of-thought, few-shot learning, system prompts, and structured output patterns
layer: domain
category: ai-ml
triggers:
  - "prompt engineering"
  - "prompt design"
  - "system prompt"
  - "few-shot"
  - "chain of thought"
  - "prompt template"
  - "LLM prompt"
inputs:
  - task: What the LLM should accomplish
  - model: Claude | GPT-4 | Gemini | Llama (optional)
  - constraints: Output format, token budget, latency requirements
  - examples: Example inputs and expected outputs (optional)
outputs:
  - system_prompt: Optimized system prompt
  - user_prompt_template: Parameterized user prompt template
  - few_shot_examples: Curated examples for in-context learning
  - evaluation_criteria: How to measure prompt quality
linksTo:
  - ai-agents
  - rag
  - research
linkedFrom:
  - ai-agents
  - cook
  - plan
preferredNextSkills:
  - ai-agents
  - rag
fallbackSkills:
  - research
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Prompt Engineering Skill

## Purpose

Design effective prompts for large language models that produce accurate, consistent, and well-structured outputs. This skill covers system prompt design, chain-of-thought reasoning, few-shot learning, structured output, and prompt evaluation. Good prompts are precise about what they want, explicit about format, and include enough context for the model to succeed.

## Key Concepts

### Prompt Components

```
SYSTEM PROMPT:
  - Role and persona definition
  - Core instructions and constraints
  - Output format specification
  - Rules and boundaries

USER PROMPT:
  - The specific task or question
  - Context and background information
  - Input data to process
  - Examples (few-shot)

ASSISTANT PREFILL:
  - Partial response to guide format
  - First few tokens to steer output
  - JSON opening bracket for structured output
```

### Prompting Techniques

```
ZERO-SHOT:
  Just the instruction, no examples.
  "Classify this email as spam or not spam."

FEW-SHOT:
  Instruction + examples of input/output pairs.
  "Classify these emails:
   Email: 'Win a free iPhone!' -> spam
   Email: 'Meeting at 3pm tomorrow' -> not spam
   Email: '{input}' -> "

CHAIN-OF-THOUGHT (CoT):
  Ask the model to think step by step.
  "Think through this problem step by step before giving your answer."

SELF-CONSISTENCY:
  Generate multiple CoT paths and take the majority answer.

TREE OF THOUGHTS:
  Explore multiple reasoning branches, evaluate each, prune bad ones.

RETRIEVAL-AUGMENTED:
  Provide relevant context from a knowledge base before asking the question.
```

## Patterns

### System Prompt Template

```
You are [ROLE] with expertise in [DOMAIN].

Your task is to [OBJECTIVE].

## Rules
- [Rule 1]
- [Rule 2]
- [Rule 3]

## Output Format
[Exactly how the response should be structured]

## Examples
[Input/output examples if needed]

## Constraints
- Do not [boundary 1]
- Always [boundary 2]
- If uncertain, [fallback behavior]
```

### Classification Prompt (Few-Shot)

```
Classify the following customer support ticket into exactly one category.

Categories:
- billing: Payment issues, invoices, refunds, pricing questions
- technical: Bugs, errors, feature requests, integration help
- account: Login issues, password reset, account settings
- general: Everything else

Examples:
Ticket: "I was charged twice for my subscription"
Category: billing

Ticket: "The export button returns a 500 error"
Category: technical

Ticket: "I cannot log in with my Google account"
Category: account

Ticket: "{ticket_text}"
Category:
```

### Structured Output (JSON)

```
Extract the following information from the provided text and return it as JSON.

Required fields:
- name (string): Full name of the person
- email (string): Email address
- company (string): Company name
- role (string): Job title or role
- sentiment (string): "positive", "neutral", or "negative"

If a field cannot be determined from the text, use null.

Text: "{input_text}"

Return ONLY valid JSON, no other text.
```

### Chain-of-Thought for Complex Reasoning

```
Analyze the following code for security vulnerabilities.

For each vulnerability found:
1. First, identify the line(s) of code that are problematic
2. Then, explain what type of vulnerability this is (e.g., XSS, SQL injection)
3. Next, describe how an attacker could exploit it
4. Finally, provide the fixed code

Think through each potential vulnerability carefully before reporting it.
Do not report false positives. If the code is secure, say so.

Code:
```
{code}
```
```

### Self-Reflection Prompt

```
[After initial response]

Now review your answer:
1. Are there any errors in your reasoning?
2. Did you miss any important edge cases?
3. Is your answer complete and actionable?
4. Would a domain expert agree with your assessment?

If you find issues, provide a corrected answer. If your answer is correct, confirm it.
```

## Prompt Optimization Techniques

### Be Specific, Not Vague

```
BAD:  "Write something about databases"
GOOD: "Write a 3-paragraph explanation of PostgreSQL JSONB indexing
       for a developer who knows SQL but has not used JSONB before.
       Include one code example."
```

### Use Delimiters for Input Data

```
BAD:  "Summarize this: The quick brown fox..."
GOOD: "Summarize the text between the <article> tags.

       <article>
       The quick brown fox...
       </article>"
```

### Specify Output Format Explicitly

```
BAD:  "List the pros and cons"
GOOD: "List the pros and cons in this exact format:

       ## Pros
       1. [pro]
       2. [pro]

       ## Cons
       1. [con]
       2. [con]

       Limit to 3-5 items per section."
```

### Use Negative Instructions Sparingly

```
BAD:  "Don't use jargon, don't be verbose, don't include examples"
GOOD: "Use plain language that a non-technical reader can understand.
       Keep the response under 200 words.
       Focus on concepts, not code."
```

## Evaluation

### Prompt Quality Metrics

```
ACCURACY:     Does the output contain correct information?
RELEVANCE:    Does it answer what was asked?
COMPLETENESS: Are all required parts present?
FORMAT:       Does it match the specified output structure?
CONSISTENCY:  Does it produce similar quality across different inputs?
SAFETY:       Does it avoid harmful, biased, or inappropriate content?
```

### A/B Testing Prompts

```
Prompt A: "Summarize this article in 3 bullet points."
Prompt B: "Read the article carefully. Extract the 3 most important
           takeaways. Present each as a single sentence."

Test both with 20+ diverse inputs. Compare on:
- Information coverage
- Clarity of output
- Consistency across inputs
- Token efficiency
```

## Best Practices

1. **Be explicit about format** -- show the model exactly what the output should look like
2. **Provide examples** -- few-shot examples are the most reliable way to steer output
3. **Use chain-of-thought for reasoning** -- "think step by step" improves accuracy on complex tasks
4. **Separate instructions from data** -- use XML tags or delimiters to prevent prompt injection
5. **Start with the simplest prompt** -- add complexity only when simpler versions fail
6. **Test with diverse inputs** -- a prompt that works for one input may fail on edge cases
7. **Iterate systematically** -- change one thing at a time and measure the impact
8. **Use system prompts for persistent instructions** -- role, format, and rules go in system
9. **Avoid ambiguity** -- "a few" means different things to different people; use exact numbers
10. **Version control your prompts** -- prompts are code; track changes and roll back when needed

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Vague instructions | Inconsistent, low-quality output | Be specific about task, format, and constraints |
| Too many instructions | Model ignores some rules | Prioritize; fewer clear rules beat many vague ones |
| No examples | Model guesses at format | Add 2-3 representative examples |
| Prompt injection vulnerability | User input manipulates behavior | Use delimiters, validate input |
| Not testing edge cases | Fails on unusual inputs | Test with 20+ diverse examples |
| Over-engineering | Simple task, complex prompt | Start simple, add complexity as needed |
