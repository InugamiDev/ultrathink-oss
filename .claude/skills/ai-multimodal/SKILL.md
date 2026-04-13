---
name: ai-multimodal
description: Image/vision analysis, generation prompt crafting, and multimodal AI workflow orchestration
layer: utility
category: ai-tools
triggers:
  - "analyze this image"
  - "describe this screenshot"
  - "generate an image"
  - "vision analysis"
  - "image prompt"
  - "multimodal"
  - "read this diagram"
inputs:
  - image_path: Path to an image file for analysis
  - analysis_goal: What to extract or understand from the image
  - generation_prompt: Description of image to generate
  - style: Visual style preferences for generation
outputs:
  - analysis: Structured description of image contents
  - extracted_data: Specific data pulled from the image (text, UI elements, diagrams)
  - generation_prompt: Optimized prompt for image generation APIs
  - recommendations: Suggestions based on visual analysis
linksTo:
  - ui-ux-pro
  - media-processing
  - chrome-devtools
linkedFrom:
  - orchestrator
  - planner
preferredNextSkills:
  - ui-ux-pro
  - media-processing
fallbackSkills:
  - chrome-devtools
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: selective
sideEffects: []
---

# AI Multimodal

## Purpose

This skill handles all interactions involving visual content — analyzing screenshots, interpreting diagrams, extracting information from images, crafting image generation prompts, and orchestrating multimodal AI workflows. It bridges the gap between visual and textual reasoning.

## Key Concepts

### Vision Analysis Modes

| Mode | Use Case | Output |
|------|----------|--------|
| **Descriptive** | "What is in this image?" | Detailed natural language description |
| **Extractive** | "Read the text/data from this image" | Structured data extraction |
| **Diagnostic** | "What's wrong with this UI?" | Issue identification with recommendations |
| **Comparative** | "How do these two designs differ?" | Structured comparison |
| **Interpretive** | "What does this diagram mean?" | Semantic interpretation of visual information |

### Image Understanding Framework

When analyzing any image, systematically assess:

```
LAYER 1 — COMPOSITION:
  - Type: screenshot / photo / diagram / chart / illustration / icon
  - Dimensions: aspect ratio and resolution implications
  - Layout: grid / freeform / hierarchical / sequential

LAYER 2 — CONTENT:
  - Primary subject(s): What dominates the image
  - Text content: Any readable text (OCR-level extraction)
  - Data content: Numbers, charts, graphs, tables
  - UI elements: Buttons, forms, navigation, cards (if screenshot)

LAYER 3 — CONTEXT:
  - Purpose: What this image is trying to communicate
  - Audience: Who this is designed for
  - Quality: Resolution, clarity, artifacts, compression

LAYER 4 — SEMANTICS:
  - Meaning: What information does this convey beyond literal content
  - Relationships: How elements relate to each other
  - Flow: What sequence or hierarchy is implied
```

## Workflows

### Workflow 1: Screenshot Analysis (UI Review)

```
INPUT: Screenshot of a UI

STEP 1: Identify the application type
  - Web app / mobile app / desktop app / CLI
  - Platform: browser, iOS, Android, desktop OS
  - Framework hints: React DevTools icon, specific component patterns

STEP 2: Catalog UI elements
  - Navigation: header, sidebar, tabs, breadcrumbs
  - Content: cards, lists, tables, forms
  - Actions: buttons, links, toggles, dropdowns
  - Feedback: alerts, toasts, loading states, empty states

STEP 3: Assess design quality
  - Spacing: consistent padding and margins
  - Typography: hierarchy, readability, font choices
  - Color: contrast ratios, palette consistency, accessibility
  - Alignment: grid adherence, visual balance
  - Depth: shadows, elevation, layering

STEP 4: Identify issues
  - Accessibility: contrast failures, missing labels, touch target sizes
  - Usability: unclear CTAs, information overload, hidden actions
  - Consistency: style deviations, mixed patterns
  - Responsiveness: overflow, truncation, broken layouts

OUTPUT FORMAT:
  SUMMARY: [1-2 sentence overview]
  POSITIVE: [What works well]
  ISSUES:
    - [SEVERITY] [Issue description] → [Recommendation]
  ACCESSIBILITY:
    - [WCAG criterion] [Pass/Fail] [Details]
```

### Workflow 2: Diagram Interpretation

```
INPUT: Architecture diagram, flowchart, ER diagram, or sequence diagram

STEP 1: Identify diagram type
  - Flowchart: process flow with decisions
  - Sequence: temporal message passing between actors
  - ER: entity relationships with cardinality
  - Architecture: system components and connections
  - Class: object-oriented structure
  - State: state machine with transitions

STEP 2: Extract elements
  - Nodes/entities: name, type, attributes
  - Connections: direction, labels, cardinality
  - Groupings: boundaries, clusters, swimlanes
  - Annotations: notes, constraints, legends

STEP 3: Interpret semantics
  - Data flow: where does data originate and terminate
  - Control flow: what drives decisions and transitions
  - Dependencies: what depends on what
  - Bottlenecks: single points of failure, high-fan-in nodes

STEP 4: Generate machine-readable representation
  - Convert to Mermaid syntax (hand off to mermaid skill)
  - Or convert to structured text description
```

### Workflow 3: Image Generation Prompt Engineering

```
INPUT: Description of desired image

STEP 1: Structure the prompt
  SUBJECT: [What is the main subject]
  ACTION: [What is the subject doing]
  SETTING: [Where / background]
  STYLE: [Art style, medium, aesthetic]
  MOOD: [Emotional tone, lighting, atmosphere]
  TECHNICAL: [Aspect ratio, quality, camera angle]

STEP 2: Apply prompt engineering principles
  - Front-load important elements (subject first)
  - Use specific, concrete descriptors over vague ones
  - Include negative prompts for unwanted elements
  - Specify style references when possible
  - Use weight/emphasis syntax for the target platform

STEP 3: Optimize for the target model
  DALL-E 3:
    - Natural language descriptions work best
    - Be descriptive and narrative
    - Specify "digital art", "photograph", "illustration" etc.

  Stable Diffusion:
    - Comma-separated tags work best
    - Include quality boosters: "masterpiece, best quality, highly detailed"
    - Use negative prompts extensively
    - Specify model-specific tags (e.g., "8k uhd, dslr")

  Midjourney:
    - Use /imagine with concise, evocative language
    - Append parameters: --ar 16:9 --v 6 --q 2
    - Reference artists or styles with "in the style of"
    - Use --no for negative prompts
```

### Workflow 4: Data Extraction from Images

```
INPUT: Image containing structured data (chart, table, form)

STEP 1: Identify data type
  - Table: rows and columns of data
  - Chart: bar, line, pie, scatter, etc.
  - Form: filled form fields
  - Document: structured text document
  - Receipt/Invoice: financial data

STEP 2: Extract raw data
  For tables:
    | Header 1 | Header 2 | Header 3 |
    |----------|----------|----------|
    | value    | value    | value    |

  For charts:
    CHART TYPE: [bar/line/pie/etc.]
    X-AXIS: [label and unit]
    Y-AXIS: [label and unit]
    DATA POINTS: [extracted values]
    TREND: [observed pattern]

  For forms:
    FIELD: [label] = [value]

STEP 3: Validate extraction
  - Cross-check totals if available
  - Verify units and scales
  - Flag uncertain readings with confidence levels
  - Note any obscured or illegible portions

OUTPUT FORMAT:
  FORMAT: [table/csv/json — most appropriate for the data]
  DATA: [Extracted data in chosen format]
  CONFIDENCE: [high/medium/low for each data point]
  NOTES: [Anything uncertain or partially readable]
```

## Prompt Templates

### UI Screenshot Review Prompt

```
Analyze this UI screenshot and provide:
1. A brief description of what the screen shows
2. UI element inventory (navigation, content areas, actions)
3. Design assessment (spacing, typography, color, alignment)
4. Accessibility issues (contrast, labels, touch targets)
5. Top 3 improvement recommendations with specific CSS/design fixes
```

### Architecture Diagram Interpretation Prompt

```
Interpret this architecture diagram:
1. List all system components and their roles
2. Map all connections with direction and purpose
3. Identify the data flow from user request to response
4. Note any potential single points of failure
5. Convert to Mermaid syntax for version control
```

### Error Screenshot Diagnosis Prompt

```
Analyze this error screenshot:
1. Read and transcribe the exact error message
2. Identify the error type (runtime, build, network, UI)
3. Identify the source (file path, line number if visible)
4. Suggest probable causes based on the error
5. Provide fix steps in order of likelihood
```

## Quality Guidelines

### For Image Analysis

- Always describe what you **see**, not what you **assume**
- Flag uncertain readings explicitly: "This appears to be X, but the resolution makes it difficult to confirm"
- When analyzing UI, reference specific coordinates or regions: "top-left navigation area", "the third card in the grid"
- Provide actionable output — descriptions alone are not useful without recommendations

### For Prompt Generation

- Test prompts mentally before delivering — would this produce the desired result?
- Include aspect ratio specifications — default square outputs are rarely what users want
- Always ask about the intended use (web, print, social media) to set appropriate quality parameters
- Provide 2-3 prompt variants so the user can iterate

## Anti-Patterns

1. **Over-interpreting**: Making assumptions about image content that are not visually supported. State only what is visible.
2. **Generic descriptions**: "This is a nice-looking website" provides zero value. Be specific about what works and what does not.
3. **Ignoring context**: A login screen for a banking app has different requirements than one for a gaming platform. Consider the domain.
4. **Platform-agnostic prompts**: Image generation prompts must be tailored to the specific model being used. DALL-E and Stable Diffusion require different approaches.
5. **Missing accessibility**: Every UI analysis must include accessibility assessment. It is not optional.

## Integration Notes

- Hand off to **ui-ux-pro** when screenshot analysis reveals design system issues.
- Hand off to **media-processing** when images need transformation (resize, format conversion, optimization).
- Hand off to **mermaid** when a diagram needs to be recreated in version-controllable format.
- Use **chrome-devtools** when a screenshot analysis suggests the need for live browser inspection.
