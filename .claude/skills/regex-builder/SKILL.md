---
name: regex-builder
description: Construct, test, explain, and debug regular expressions with clear documentation and edge case handling
layer: utility
category: text-processing
triggers:
  - "regex for"
  - "regular expression"
  - "match pattern"
  - "explain this regex"
  - "regex help"
  - "validate format"
  - "parse this string"
inputs:
  - Description of what to match (natural language)
  - Example strings that should match
  - Example strings that should NOT match
  - Target language/engine (JS, Python, Go, PCRE)
outputs:
  - Regex pattern with explanation
  - Commented/documented version
  - Test cases
  - Edge cases and known limitations
  - Alternative approaches if regex is not ideal
linksTo:
  - json-transformer
  - code-explainer
  - testing-patterns
linkedFrom:
  - shell-scripting
  - security-scanner
preferredNextSkills:
  - testing-patterns
fallbackSkills:
  - code-explainer
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# Regex Builder Skill

## Purpose

Regular expressions are powerful but notoriously hard to read and debug. This skill constructs correct, well-documented regex patterns from natural language descriptions, explains existing patterns in plain English, and always provides test cases to verify correctness.

## Key Concepts

### When to Use Regex (and When Not To)

**Use regex for:**
- Validating string formats (email, phone, date)
- Extracting structured parts from text
- Search and replace with patterns
- Log file parsing
- Simple tokenization

**Do NOT use regex for:**
- Parsing HTML/XML (use a DOM parser)
- Parsing JSON (use `JSON.parse`)
- Complex nested structures (use a proper parser/grammar)
- When a simple `string.includes()` / `string.startsWith()` suffices

### Engine Differences

| Feature | JavaScript | Python | Go | PCRE |
|---------|-----------|--------|-----|------|
| Lookahead `(?=...)` | Yes | Yes | No | Yes |
| Lookbehind `(?<=...)` | Yes (ES2018+) | Yes | No | Yes |
| Named groups `(?<name>...)` | Yes | `(?P<name>...)` | `(?P<name>...)` | Both |
| Unicode `\p{L}` | Yes (`/u` flag) | Yes (`regex` module) | Yes | Yes |
| Atomic groups | No | No | No | Yes |
| Possessive quantifiers | No | No | No | Yes |
| Backreferences | Yes | Yes | No | Yes |

### Regex Building Blocks

```
ANCHORS
  ^       Start of string (or line with /m)
  $       End of string (or line with /m)
  \b      Word boundary
  \B      Not a word boundary

CHARACTER CLASSES
  .       Any character (except newline unless /s)
  \d      Digit [0-9]
  \D      Non-digit
  \w      Word character [a-zA-Z0-9_]
  \W      Non-word character
  \s      Whitespace [\t\n\r\f\v ]
  \S      Non-whitespace
  [abc]   Character set (a, b, or c)
  [^abc]  Negated set (not a, b, or c)
  [a-z]   Range

QUANTIFIERS
  *       0 or more (greedy)
  +       1 or more (greedy)
  ?       0 or 1 (greedy)
  {n}     Exactly n
  {n,}    n or more
  {n,m}   Between n and m
  *?      0 or more (lazy)
  +?      1 or more (lazy)

GROUPS
  (...)       Capturing group
  (?:...)     Non-capturing group
  (?<name>...)  Named capturing group
  (?=...)     Positive lookahead
  (?!...)     Negative lookahead
  (?<=...)    Positive lookbehind
  (?<!...)    Negative lookbehind
  |           Alternation (OR)

FLAGS
  /g      Global (all matches)
  /i      Case insensitive
  /m      Multiline (^ and $ match line boundaries)
  /s      Dotall (. matches newline)
  /u      Unicode mode
```

## Workflow

### Step 1: Understand the Requirement

Break down the natural language description:
- What exact strings should match?
- What should NOT match?
- Are there edge cases (empty strings, unicode, very long input)?
- What parts need to be captured vs. just matched?

### Step 2: Build Incrementally

Never write the full regex at once. Build piece by piece:

```
Requirement: "Match a US phone number like (555) 123-4567 or 555-123-4567"

Step 1: Optional area code in parens
  (?:\(\d{3}\)\s?)?

Step 2: Three digits
  \d{3}

Step 3: Separator (dash or dot or space)
  [-.\s]

Step 4: Four digits
  \d{4}

Combined:
  (?:\(\d{3}\)\s?|\d{3}[-.\s])\d{3}[-.\s]\d{4}

Anchored:
  ^(?:\(\d{3}\)\s?|\d{3}[-.\s])\d{3}[-.\s]\d{4}$
```

### Step 3: Document with Comments

```javascript
// JavaScript verbose regex (using template literals)
const phoneRegex = new RegExp([
  '^',
  '(?:',
    '\\(\\d{3}\\)\\s?',  // (555) with optional space
    '|',
    '\\d{3}[-. ]',        // 555- or 555. or 555 (space)
  ')',
  '\\d{3}',               // 123
  '[-. ]',                 // separator
  '\\d{4}',               // 4567
  '$',
].join(''));
```

```python
# Python verbose regex (VERBOSE flag)
import re

phone_pattern = re.compile(r"""
    ^
    (?:
        \(\d{3}\)\s?     # (555) with optional space
        |
        \d{3}[-.\s]      # 555- or 555. or 555<space>
    )
    \d{3}                 # 123
    [-.\s]                # separator
    \d{4}                 # 4567
    $
""", re.VERBOSE)
```

### Step 4: Test Thoroughly

```typescript
function testRegex(pattern: RegExp, shouldMatch: string[], shouldNotMatch: string[]) {
  const results: { input: string; expected: boolean; actual: boolean; pass: boolean }[] = [];

  for (const input of shouldMatch) {
    const actual = pattern.test(input);
    results.push({ input, expected: true, actual, pass: actual === true });
  }

  for (const input of shouldNotMatch) {
    const actual = pattern.test(input);
    results.push({ input, expected: false, actual, pass: actual === false });
  }

  const failures = results.filter(r => !r.pass);
  if (failures.length > 0) {
    console.error('FAILURES:', failures);
  } else {
    console.log(`All ${results.length} tests passed`);
  }
}

// Usage
testRegex(phoneRegex,
  // Should match
  ['(555) 123-4567', '555-123-4567', '555.123.4567', '(555)123-4567'],
  // Should NOT match
  ['123-4567', '555-1234-567', '(555 123-4567', 'abc-def-ghij', '']
);
```

## Common Patterns Reference

### Email (RFC 5322 simplified)

```javascript
// Practical email validation (not RFC-complete, but covers 99.9% of real emails)
const email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// For production, prefer: just check for @ and non-empty parts, then send a confirmation email
```

### URL

```javascript
const url = /^https?:\/\/(?:[\w-]+\.)+[\w]{2,}(?:\/[^\s]*)?$/i;
// For production, use the URL constructor: new URL(input) and catch errors
```

### Date (YYYY-MM-DD)

```javascript
const isoDate = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
// Note: This does not validate day-of-month accuracy (e.g., Feb 30). Use Date parsing for that.
```

### Slug (URL-safe string)

```javascript
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Matches: "hello-world", "post-123", "a"
// Rejects: "Hello-World", "--double", "trailing-", ""
```

### Semantic Version

```javascript
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
```

### Password Strength (minimum requirements)

```javascript
// At least 8 chars, one upper, one lower, one digit, one special
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:,.<>?]{8,}$/;

// Better approach: check length >= 12 and zxcvbn score >= 3
```

### IP Addresses

```javascript
// IPv4
const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

// For IPv6, do not use regex. Use a library or built-in parser.
```

## Explanation Format

When explaining an existing regex, use this format:

```
Pattern: ^(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}$

Breakdown:
  ^                       Start of string
  (?:\+?1[-.\s]?)?       Optional country code: +1 or 1 with optional separator
  (?:                     Area code group (non-capturing):
    \(\d{3}\)               (555) — three digits in parentheses
    |                       OR
    \d{3}                   555 — three digits without parens
  )
  [-.\s]?                 Optional separator (dash, dot, or space)
  \d{3}                   Exchange: three digits
  [-.\s]?                 Optional separator
  \d{4}                   Subscriber: four digits
  $                       End of string

Matches:    +1 (555) 123-4567, 1-555-123-4567, 5551234567, (555)123.4567
No match:   123-4567, +44 555 123 4567, (55) 123-4567
```

## Performance Considerations

1. **Avoid catastrophic backtracking**: Patterns like `(a+)+b` on input `aaaaaaaac` cause exponential time. Use atomic groups or possessive quantifiers where available.
2. **Anchor your patterns**: `^...$` prevents the engine from trying every position in the string.
3. **Be specific**: `[a-z0-9]` is faster than `\S` when you know the character set.
4. **Compile once, use many**: Store compiled regex outside loops.
5. **Prefer non-capturing groups**: `(?:...)` instead of `(...)` when you do not need the capture.

```javascript
// BAD: Regex compiled on every call
function isValid(input: string) {
  return /^[a-z0-9]+$/.test(input); // Creates new RegExp each time in some engines
}

// GOOD: Compiled once
const VALID_PATTERN = /^[a-z0-9]+$/;
function isValid(input: string) {
  return VALID_PATTERN.test(input);
}
```
