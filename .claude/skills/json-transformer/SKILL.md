---
name: json-transformer
description: Transform, validate, convert, and restructure data between JSON, YAML, TOML, CSV, and XML formats with schema validation
layer: utility
category: data-processing
triggers:
  - "transform json"
  - "convert json"
  - "json to yaml"
  - "yaml to json"
  - "validate json"
  - "json schema"
  - "restructure data"
  - "flatten json"
  - "merge json"
  - "transform data"
inputs:
  - Source data (JSON, YAML, TOML, CSV, or XML)
  - Target format or structure
  - Transformation rules (field mapping, filtering, reshaping)
  - Validation schema (JSON Schema, Zod, or natural language)
outputs:
  - Transformed data in target format
  - Validation results with error details
  - Transformation code (reusable function)
  - Schema definitions (JSON Schema, Zod, TypeScript types)
linksTo:
  - regex-builder
  - api-designer
  - data-modeling
linkedFrom:
  - shell-scripting
  - migration-planner
preferredNextSkills:
  - testing-patterns
  - api-designer
fallbackSkills:
  - code-explainer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects:
  - May create or modify data files
  - May add validation library dependencies
---

# JSON Transformer Skill

## Purpose

Restructure, validate, and convert data between formats. Whether transforming API responses, migrating configuration formats, flattening nested structures, or generating schemas, this skill handles the full spectrum of data transformation tasks.

## Key Concepts

### Transformation Types

| Operation | Description | Example |
|-----------|-------------|---------|
| **Reshape** | Change structure without losing data | Nest flat fields into objects |
| **Map** | Transform values | Rename keys, format dates |
| **Filter** | Remove unwanted data | Drop null fields, select specific keys |
| **Flatten** | Reduce nesting depth | `{a: {b: 1}}` -> `{"a.b": 1}` |
| **Unflatten** | Increase nesting depth | `{"a.b": 1}` -> `{a: {b: 1}}` |
| **Merge** | Combine multiple sources | Deep merge config files |
| **Validate** | Check conformance to schema | JSON Schema, Zod |
| **Convert** | Change format | JSON <-> YAML <-> TOML <-> CSV |

### Data Format Quick Reference

```yaml
# YAML — human-friendly, supports comments, anchors
server:
  host: localhost
  port: 3000
  features:
    - auth
    - logging
```

```toml
# TOML — configuration-focused, unambiguous
[server]
host = "localhost"
port = 3000
features = ["auth", "logging"]
```

```json
{
  "server": {
    "host": "localhost",
    "port": 3000,
    "features": ["auth", "logging"]
  }
}
```

## Workflow

### Pattern 1: Restructure / Reshape

```typescript
// Transform flat API response to nested structure
interface APIResponse {
  user_id: string;
  user_name: string;
  user_email: string;
  address_street: string;
  address_city: string;
  address_zip: string;
}

interface UserModel {
  id: string;
  name: string;
  email: string;
  address: {
    street: string;
    city: string;
    zip: string;
  };
}

function transformUser(raw: APIResponse): UserModel {
  return {
    id: raw.user_id,
    name: raw.user_name,
    email: raw.user_email,
    address: {
      street: raw.address_street,
      city: raw.address_city,
      zip: raw.address_zip,
    },
  };
}
```

### Pattern 2: Flatten / Unflatten

```typescript
// Flatten nested object to dot-notation
function flatten(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value as Record<string, unknown>, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

// flatten({ a: { b: { c: 1 }, d: 2 }, e: 3 })
// => { "a.b.c": 1, "a.d": 2, "e": 3 }

// Unflatten dot-notation back to nested
function unflatten(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
}
```

### Pattern 3: Deep Merge

```typescript
function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}

// Merge config files with override precedence
const config = deepMerge(
  defaultConfig,
  envConfig,
  localOverrides
);
```

### Pattern 4: Schema Validation with Zod

```typescript
import { z } from 'zod';

// Define schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(['admin', 'user', 'moderator']),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    notifications: z.boolean().default(true),
  }).optional(),
  tags: z.array(z.string()).max(10).default([]),
  createdAt: z.string().datetime(),
});

type User = z.infer<typeof UserSchema>;

// Validate and parse
function validateUser(data: unknown): { success: true; data: User } | { success: false; errors: string[] } {
  const result = UserSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    ),
  };
}
```

### Pattern 5: JSON Schema Generation

```typescript
// Generate JSON Schema from TypeScript-like description
function generateJsonSchema(description: string): object {
  // This produces a JSON Schema draft-07 compatible schema
  return {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "name": { "type": "string", "minLength": 1, "maxLength": 100 },
      "email": { "type": "string", "format": "email" },
      "age": { "type": "integer", "minimum": 0, "maximum": 150 },
      "role": { "type": "string", "enum": ["admin", "user", "moderator"] },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "maxItems": 10,
        "default": []
      },
      "createdAt": { "type": "string", "format": "date-time" }
    },
    "required": ["id", "name", "email", "role", "createdAt"],
    "additionalProperties": false
  };
}
```

### Pattern 6: Format Conversion

```typescript
// JSON to YAML (using js-yaml)
import yaml from 'js-yaml';

function jsonToYaml(jsonData: unknown): string {
  return yaml.dump(jsonData, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,       // Don't use YAML anchors
    sortKeys: true,     // Alphabetical keys
    quotingType: '"',   // Double quotes for strings
  });
}

function yamlToJson(yamlString: string): unknown {
  return yaml.load(yamlString);
}

// JSON to TOML (using @iarna/toml)
import TOML from '@iarna/toml';

function jsonToToml(jsonData: Record<string, unknown>): string {
  return TOML.stringify(jsonData as TOML.JsonMap);
}

function tomlToJson(tomlString: string): unknown {
  return TOML.parse(tomlString);
}

// CSV to JSON
function csvToJson(csv: string, delimiter = ','): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

// JSON to CSV
function jsonToCsv(data: Record<string, unknown>[], delimiter = ','): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(delimiter) || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(delimiter)
  );
  return [headers.join(delimiter), ...rows].join('\n');
}
```

### Pattern 7: jq-Style Transformations in JavaScript

```typescript
// Chainable transformation pipeline
class JsonTransformer<T> {
  constructor(private data: T) {}

  static from<T>(data: T) {
    return new JsonTransformer(data);
  }

  select<R>(selector: (data: T) => R): JsonTransformer<R> {
    return new JsonTransformer(selector(this.data));
  }

  map<R>(fn: (item: T extends Array<infer U> ? U : never) => R): JsonTransformer<R[]> {
    if (!Array.isArray(this.data)) throw new Error('map requires array');
    return new JsonTransformer((this.data as unknown[]).map(fn as (item: unknown) => R));
  }

  filter(fn: (item: T extends Array<infer U> ? U : never) => boolean): JsonTransformer<T> {
    if (!Array.isArray(this.data)) throw new Error('filter requires array');
    return new JsonTransformer((this.data as unknown[]).filter(fn as (item: unknown) => boolean) as unknown as T);
  }

  pick(...keys: string[]): JsonTransformer<Partial<T>> {
    const obj = this.data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in obj) result[key] = obj[key];
    }
    return new JsonTransformer(result as Partial<T>);
  }

  value(): T {
    return this.data;
  }
}

// Usage
const result = JsonTransformer.from(apiResponse)
  .select(d => d.users)
  .filter(u => u.active)
  .map(u => ({ id: u.id, name: u.name }))
  .value();
```

## Validation Error Formatting

When validation fails, present errors clearly:

```
Validation Errors (3):

  1. $.email: Expected string with email format, received "not-an-email"
     Path: root > email
     Rule: format = "email"

  2. $.age: Expected integer >= 0, received -5
     Path: root > age
     Rule: minimum = 0

  3. $.tags[2]: Expected string, received 42
     Path: root > tags > [2]
     Rule: type = "string"
```

## CLI Quick Reference

```bash
# jq — JSON processing on command line
cat data.json | jq '.users[] | select(.active) | {name, email}'
cat data.json | jq '.items | length'
cat data.json | jq '.config.server.port'

# yq — YAML processing (similar syntax to jq)
yq '.server.port' config.yaml
yq -i '.server.port = 8080' config.yaml

# Convert between formats
yq -o=json config.yaml          # YAML to JSON
yq -P config.json               # JSON to YAML
cat data.csv | mlr --csv2json   # CSV to JSON (using Miller)
```
