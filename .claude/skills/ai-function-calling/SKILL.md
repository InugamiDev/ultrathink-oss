---
name: ai-function-calling
description: AI function calling / tool use patterns — schema definition, tool dispatch, streaming tool calls, and error handling.
layer: utility
category: ai-ml
triggers:
  - "function calling"
  - "tool use"
  - "tool call"
  - "ai tools"
  - "function schema"
  - "tool dispatch"
inputs:
  - "Tool schema definitions or requirements"
  - "Function calling integration questions"
  - "Streaming tool call patterns"
  - "Error handling for tool dispatch"
outputs:
  - "Type-safe tool schemas with validation"
  - "Tool dispatch implementations"
  - "Streaming tool call handlers"
  - "Error recovery patterns for failed tool calls"
linksTo:
  - ai-agents
  - claude-api
  - openai
  - ai-sdk
linkedFrom: []
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# AI Function Calling & Tool Use Patterns

## Purpose

Provide expert guidance on designing, implementing, and managing AI function calling (tool use) across major LLM providers. Covers schema definition, runtime dispatch, streaming tool calls, parallel execution, error handling, and security considerations.

## Key Patterns

### Tool Schema Definition

**Zod-based schemas** — Define tools with runtime validation and TypeScript inference:

```typescript
import { z } from 'zod';

// Define tool parameters with Zod
const getWeatherParams = z.object({
  location: z.string().describe('City name or coordinates'),
  units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
});

// Generic tool definition type
interface ToolDefinition<T extends z.ZodType> {
  name: string;
  description: string;
  parameters: T;
  execute: (args: z.infer<T>) => Promise<unknown>;
}

// Create a type-safe tool
const weatherTool: ToolDefinition<typeof getWeatherParams> = {
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: getWeatherParams,
  execute: async (args) => {
    const { location, units } = args;
    // ... fetch weather data
    return { temperature: 22, units, location };
  },
};
```

**JSON Schema generation** — Convert Zod schemas to JSON Schema for API calls:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

function toolToApiFormat(tool: ToolDefinition<z.ZodType>) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters, {
        $refStrategy: 'none',
        target: 'openAI',
      }),
    },
  };
}
```

### Anthropic Claude Tool Use

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
        units: { type: 'string', enum: ['celsius', 'fahrenheit'] },
      },
      required: ['location'],
    },
  },
];

// Agentic loop — keep calling until no more tool_use blocks
async function agentLoop(userMessage: string) {
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  while (true) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools,
      messages,
    });

    // Collect assistant response
    messages.push({ role: 'assistant', content: response.content });

    // Check if there are tool use blocks
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === 'tool_use'
    );

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      return response; // No more tools to call
    }

    // Execute tools and build tool_result blocks
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] =
      await Promise.all(
        toolUseBlocks.map(async (block) => {
          try {
            const result = await dispatch(block.name, block.input);
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: JSON.stringify(result),
            };
          } catch (error) {
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: `Error: ${(error as Error).message}`,
              is_error: true,
            };
          }
        })
      );

    messages.push({ role: 'user', content: toolResults });
  }
}
```

### Tool Dispatch Pattern

**Registry-based dispatch** — Type-safe, extensible tool routing:

```typescript
type ToolRegistry = Map<string, ToolDefinition<z.ZodType>>;

class ToolDispatcher {
  private registry: ToolRegistry = new Map();

  register(tool: ToolDefinition<z.ZodType>) {
    this.registry.set(tool.name, tool);
  }

  async dispatch(name: string, rawArgs: unknown): Promise<unknown> {
    const tool = this.registry.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Validate args against schema
    const parsed = tool.parameters.safeParse(rawArgs);
    if (!parsed.success) {
      throw new Error(
        `Invalid args for ${name}: ${parsed.error.issues.map((i) => i.message).join(', ')}`
      );
    }

    return tool.execute(parsed.data);
  }

  getToolDefinitions() {
    return Array.from(this.registry.values()).map(toolToApiFormat);
  }
}
```

### Streaming Tool Calls

**Anthropic streaming** — Handle tool use blocks as they arrive:

```typescript
async function streamWithTools(messages: Anthropic.Messages.MessageParam[]) {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools,
    messages,
  });

  // Accumulate the full response for tool use detection
  const response = await stream.finalMessage();

  // Process tool calls from the accumulated response
  const toolBlocks = response.content.filter(
    (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use'
  );

  // Stream text blocks to the UI while processing tools in background
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  return { response, toolBlocks };
}
```

### Vercel AI SDK Tool Calling

```typescript
import { generateText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const result = await generateText({
  model: anthropic('claude-sonnet-4-20250514'),
  tools: {
    getWeather: tool({
      description: 'Get weather for a location',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return { temperature: 22, location };
      },
    }),
  },
  maxSteps: 5, // Allow up to 5 tool call rounds
  prompt: 'What is the weather in Tokyo?',
});
```

### Parallel Tool Execution

```typescript
// When the model returns multiple tool_use blocks, execute in parallel
async function executeToolsParallel(
  toolBlocks: Anthropic.Messages.ToolUseBlock[],
  dispatcher: ToolDispatcher
) {
  const results = await Promise.allSettled(
    toolBlocks.map(async (block) => ({
      tool_use_id: block.id,
      result: await dispatcher.dispatch(block.name, block.input),
    }))
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return {
        type: 'tool_result' as const,
        tool_use_id: r.value.tool_use_id,
        content: JSON.stringify(r.value.result),
      };
    }
    return {
      type: 'tool_result' as const,
      tool_use_id: toolBlocks[i].id,
      content: `Error: ${r.reason?.message ?? 'Unknown error'}`,
      is_error: true,
    };
  });
}
```

### Security: Tool Sandboxing

```typescript
// Restrict tool capabilities based on user permissions
interface ToolPermission {
  allowedTools: string[];
  maxCallsPerTurn: number;
  timeout: number;
}

function createSandboxedDispatcher(
  dispatcher: ToolDispatcher,
  permissions: ToolPermission
) {
  let callCount = 0;

  return async (name: string, args: unknown) => {
    if (!permissions.allowedTools.includes(name)) {
      throw new Error(`Tool ${name} is not permitted`);
    }
    if (++callCount > permissions.maxCallsPerTurn) {
      throw new Error('Tool call limit exceeded');
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      permissions.timeout
    );

    try {
      return await dispatcher.dispatch(name, args);
    } finally {
      clearTimeout(timeout);
    }
  };
}
```

## Best Practices

1. **Always validate tool inputs** — Never trust model-generated arguments; parse with Zod or equivalent before execution.
2. **Return structured errors** — Use `is_error: true` (Anthropic) or structured error objects so the model can self-correct.
3. **Set a max step/loop limit** — Prevent infinite tool calling loops with a configurable maximum (5-10 steps is typical).
4. **Use descriptive tool names and descriptions** — The model selects tools based on name + description; vague names cause misrouting.
5. **Keep parameter schemas simple** — Flat objects with clear descriptions outperform deeply nested schemas.
6. **Implement timeouts** — All tool executions should have a timeout to prevent hanging.
7. **Log all tool calls** — Record tool name, input, output, and latency for debugging and cost tracking.
8. **Prefer `enum` over free-text** — Constrain parameters to known values where possible to reduce hallucination.
9. **Handle partial tool calls in streaming** — Accumulate JSON chunks before parsing; do not parse incomplete JSON.
10. **Test with adversarial inputs** — Models may generate unexpected argument combinations; fuzz your tool handlers.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Missing `tool_use_id` in results | API rejects the response | Always map result back to the original `tool_use_id` |
| No error handling in dispatch | Unhandled rejection crashes the loop | Wrap every tool execution in try/catch |
| Infinite tool loops | Model keeps calling tools forever | Set `maxSteps` or a manual iteration limit |
| Over-complex schemas | Model struggles with deeply nested params | Flatten schemas; use separate tools for complex operations |
| Forgetting `is_error` flag | Model treats error text as success data | Always set `is_error: true` on failures |
| Not validating tool output | Downstream code crashes on unexpected shape | Validate tool return values before serializing |
