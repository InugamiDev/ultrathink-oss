---
name: ai-agents
description: AI agent architecture, tool use, memory systems, multi-agent orchestration, and safety patterns
layer: domain
category: ai-ml
triggers:
  - "ai agent"
  - "agent architecture"
  - "tool use"
  - "agent memory"
  - "multi-agent"
  - "agent orchestration"
  - "agentic workflow"
  - "ReAct pattern"
inputs:
  - objective: What the agent should accomplish
  - tools: Available tools and APIs the agent can use
  - constraints: Safety boundaries, cost limits, human-in-the-loop requirements
  - architecture: Single agent | multi-agent | hierarchical
outputs:
  - agent_design: Agent architecture with tool definitions and memory strategy
  - tool_definitions: Tool schemas with input/output specifications
  - orchestration_logic: How multiple agents coordinate
  - safety_guardrails: Input/output validation and boundary enforcement
linksTo:
  - prompt-engineering
  - rag
  - error-handling
  - logging
linkedFrom:
  - cook
  - plan
  - research
preferredNextSkills:
  - prompt-engineering
  - rag
fallbackSkills:
  - sequential-thinking
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - Agents may execute tools with real-world effects
  - Agents may make API calls
  - Agents consume LLM tokens (cost)
---

# AI Agents Skill

## Purpose

Design and implement AI agent systems that can reason, use tools, maintain memory, and coordinate with other agents. This skill covers the ReAct pattern, tool definition, memory architectures (short-term, long-term, episodic), multi-agent orchestration, and safety guardrails. Agents are not just chatbots -- they are autonomous systems that take actions in the world.

## Key Concepts

### Agent Architecture

```
PERCEPTION:
  Input parsing, context extraction, intent classification

REASONING:
  Chain-of-thought, planning, self-reflection, error correction

ACTION:
  Tool selection, parameter construction, execution

MEMORY:
  Working memory (current conversation)
  Short-term memory (recent interactions, scratch pad)
  Long-term memory (persistent knowledge, embeddings)
  Episodic memory (past task execution records)

LOOP:
  Observe -> Think -> Act -> Observe -> Think -> Act -> ... -> Done
```

### Agent Patterns

```
ReAct (Reason + Act):
  Thought: I need to find the user's order status.
  Action: query_database(order_id="ord_123")
  Observation: Order status is "shipped", tracking: "1Z999AA..."
  Thought: I have the information. I'll respond to the user.
  Answer: Your order has been shipped! Tracking: 1Z999AA...

Plan-and-Execute:
  Plan: [Step 1: Search products, Step 2: Compare prices, Step 3: Recommend]
  Execute each step, revise plan if needed

Reflection:
  After completing a task, evaluate quality and retry if insufficient

Multi-Agent:
  Researcher agent -> Analyst agent -> Writer agent -> Reviewer agent
  Each agent specialized for one part of the workflow
```

## Patterns

### Tool Definition

```typescript
// Tools are typed schemas that the LLM can invoke
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

const tools: ToolDefinition[] = [
  {
    name: 'search_products',
    description: 'Search the product catalog by query string. Returns matching products with prices.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Product category filter', enum: ['electronics', 'clothing', 'books'] },
        maxPrice: { type: 'number', description: 'Maximum price in dollars' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Get the current status of a customer order by order ID.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'The order ID (format: ord_xxx)' },
      },
      required: ['orderId'],
    },
  },
];
```

### Agent Loop with Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function runAgent(userMessage: string, tools: ToolDefinition[]) {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: 'You are a helpful assistant. Use tools when needed to answer questions.',
      tools,
      messages,
    });

    // Check if the model wants to use a tool
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block) => block.type === 'tool_use'
      );

      // Add assistant response to conversation
      messages.push({ role: 'assistant', content: response.content });

      // Execute each tool call
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result' as const,
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });
    } else {
      // Model is done, return the final response
      return response.content;
    }
  }

  throw new Error('Agent exceeded maximum iterations');
}

async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'search_products':
      return await searchProducts(input.query as string, input);
    case 'get_order_status':
      return await getOrderStatus(input.orderId as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

### Memory System

```typescript
interface Memory {
  // Working memory: current conversation context
  conversation: Message[];

  // Short-term memory: recent scratchpad
  scratchpad: Map<string, unknown>;

  // Long-term memory: persistent knowledge (vector store)
  retrieve(query: string, k?: number): Promise<MemoryEntry[]>;
  store(content: string, metadata?: Record<string, unknown>): Promise<void>;

  // Episodic memory: past task records
  getEpisode(taskId: string): Promise<Episode | null>;
  recordEpisode(episode: Episode): Promise<void>;
}

interface Episode {
  taskId: string;
  objective: string;
  steps: Array<{ thought: string; action: string; result: string }>;
  outcome: 'success' | 'failure';
  reflection: string;
  timestamp: Date;
}

// Before starting a new task, check if we have done something similar
async function planWithMemory(objective: string, memory: Memory) {
  const similarEpisodes = await memory.retrieve(objective, 3);
  const relevantKnowledge = await memory.retrieve(objective, 5);

  const context = `
    Similar past tasks:
    ${similarEpisodes.map(e => `- ${e.content} (${e.metadata?.outcome})`).join('\n')}

    Relevant knowledge:
    ${relevantKnowledge.map(k => `- ${k.content}`).join('\n')}
  `;

  return context;
}
```

### Multi-Agent Orchestration

```typescript
interface Agent {
  name: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  run(input: string): Promise<string>;
}

// Sequential pipeline
async function researchPipeline(question: string) {
  const researcher = createAgent('researcher', researcherPrompt, [webSearch, readDoc]);
  const analyst = createAgent('analyst', analystPrompt, [calculateMetrics]);
  const writer = createAgent('writer', writerPrompt, [formatReport]);

  const rawFindings = await researcher.run(question);
  const analysis = await analyst.run(`Analyze these findings:\n${rawFindings}`);
  const report = await writer.run(`Write a report from:\n${analysis}`);

  return report;
}

// Supervisor pattern
async function supervisorLoop(objective: string, agents: Agent[]) {
  const supervisor = createAgent('supervisor', supervisorPrompt, [
    { name: 'delegate', description: 'Assign a task to an agent', parameters: { ... } },
    { name: 'complete', description: 'Mark the objective as done', parameters: { ... } },
  ]);

  let result = '';
  for (let i = 0; i < 10; i++) {
    const action = await supervisor.run(`Objective: ${objective}\nProgress: ${result}`);
    if (action.tool === 'complete') return action.output;
    const agent = agents.find(a => a.name === action.delegateTo);
    result += await agent!.run(action.task);
  }
}
```

## Safety Guardrails

```
INPUT VALIDATION:
  - Sanitize user input before passing to LLM
  - Validate tool parameters before execution
  - Reject prompt injection attempts

OUTPUT VALIDATION:
  - Verify tool outputs are within expected bounds
  - Filter sensitive information from responses
  - Check for hallucinated tool calls

EXECUTION BOUNDARIES:
  - Maximum iterations per agent run
  - Token budget per task
  - Allowlist of permitted tools
  - Human-in-the-loop for destructive actions
  - Rate limiting on expensive operations

MONITORING:
  - Log all tool invocations with inputs and outputs
  - Track token usage and cost per agent run
  - Alert on unusual patterns (loops, excessive tool calls)
```

## Best Practices

1. **Start with a single agent** -- add multi-agent only when single agent hits capability limits
2. **Define tools precisely** -- vague descriptions cause the LLM to misuse tools
3. **Set iteration limits** -- agents can loop; always cap at a maximum
4. **Log everything** -- tool calls, reasoning steps, and outcomes for debugging
5. **Human-in-the-loop for irreversible actions** -- deletion, payments, sending emails
6. **Validate tool outputs** -- do not blindly trust external API responses
7. **Use structured output** -- JSON mode or tool use, not free-form text parsing
8. **Budget tokens** -- set max_tokens and track cumulative usage
9. **Test with adversarial inputs** -- prompt injection, impossible tasks, ambiguous requests
10. **Prefer retrieval over memorization** -- use RAG instead of stuffing context into the system prompt

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| No iteration limit | Infinite loop, cost explosion | Cap at 10-20 iterations |
| Vague tool descriptions | LLM calls wrong tool or wrong params | Write precise, example-rich descriptions |
| No human-in-the-loop | Agent takes irreversible destructive actions | Require confirmation for high-risk tools |
| Stuffing all context in prompt | Token limit exceeded, degraded quality | Use RAG for dynamic context |
| Not logging tool calls | Cannot debug agent failures | Log every tool invocation |
| Trusting LLM output as code | Injection, errors, hallucinations | Validate and sandbox all LLM-generated code |
