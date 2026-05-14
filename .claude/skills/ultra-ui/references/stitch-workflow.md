# Stitch — AI Design Generation (Google)

Google Stitch generates UI designs from text prompts via MCP tools.

## Setup

Direct remote MCP — no local proxy needed. Get API key at [stitch.withgoogle.com](https://stitch.withgoogle.com) -> Settings -> API Keys.

Configured in `~/.mcp.json`:
```json
"stitch": {
  "url": "https://stitch.googleapis.com/mcp",
  "headers": { "X-Goog-Api-Key": "<your-api-key>" }
}
```

## Workflow

### 1. Project Setup
```
mcp__stitch__list_projects()
mcp__stitch__create_project({ title: "Project Name" })
```

### 2. Design System (optional)
```
mcp__stitch__create_design_system({
  projectId: "...",
  designSystem: {
    displayName: "My Theme",
    theme: { colorMode: "DARK", headlineFont: "GEIST", bodyFont: "INTER",
             customColor: "#7c6ef6", roundness: "ROUND_TWELVE" }
  }
})
mcp__stitch__update_design_system(...)  // always call after create
```

### 3. Generate Screen
```
mcp__stitch__generate_screen_from_text({
  projectId: "...",
  prompt: "detailed description...",
  deviceType: "DESKTOP",
  modelId: "GEMINI_3_1_PRO"
})
```
- Can take minutes — DO NOT RETRY on timeout
- Returns HTML/CSS + design system + output_components
- If output has suggestions, present to user and call again with accepted suggestion

### 4. Retrieve Details
```
mcp__stitch__get_screen({ name: "projects/{id}/screens/{id}" })
```

### 5. Variants (optional)
```
mcp__stitch__generate_variants({
  projectId: "...",
  selectedScreenIds: ["..."],
  prompt: "make it more minimal",
  variantOptions: { creativeRange: "EXPLORE", variantCount: 3 }
})
```

### 6. Edit (optional)
```
mcp__stitch__edit_screens({
  projectId: "...",
  selectedScreenIds: ["..."],
  prompt: "change the sidebar to dark theme"
})
```

## MCP Tools Reference (12 tools)

### Project Management
| Tool | Purpose | Key Params |
|------|---------|------------|
| `create_project` | Create new project | `title` (optional) |
| `get_project` | Get project details + screen instances | `name: "projects/{id}"` |
| `list_projects` | List all projects | `filter: "view=owned"` or `"view=shared"` |

### Screen Operations
| Tool | Purpose | Key Params |
|------|---------|------------|
| `list_screens` | List screens in project | `projectId` |
| `get_screen` | Get screen details + HTML/CSS | `name: "projects/{id}/screens/{id}"` |
| `generate_screen_from_text` | Generate from prompt | `projectId`, `prompt`, `deviceType?`, `modelId?` |
| `edit_screens` | Edit existing screens | `projectId`, `selectedScreenIds[]`, `prompt` |
| `generate_variants` | Generate design variants | `projectId`, `selectedScreenIds[]`, `prompt`, `variantOptions` |

### Design System
| Tool | Purpose | Key Params |
|------|---------|------------|
| `create_design_system` | Create DS | `designSystem: {displayName, theme}`, `projectId?` |
| `update_design_system` | Update DS | `name: "assets/{id}"`, `projectId`, `designSystem` |
| `list_design_systems` | List DSs | `projectId?` |
| `apply_design_system` | Apply DS to screens | `projectId`, `assetId`, `selectedScreenInstances[]` |

### Parameters

**deviceType**: `MOBILE` | `DESKTOP` | `TABLET` | `AGNOSTIC`
**modelId**: `GEMINI_3_FLASH` (fast) | `GEMINI_3_1_PRO` (best quality)
**projectId**: Always WITHOUT `projects/` prefix
**variantOptions**: `creativeRange` (`REFINE`|`EXPLORE`|`REIMAGINE`), `variantCount` (1-5), `aspects` (`LAYOUT`|`COLOR_SCHEME`|`IMAGES`|`TEXT_FONT`|`TEXT_CONTENT`)
**Design System Theme**: `colorMode`, `headlineFont`/`bodyFont` (29 fonts), `customColor` (hex), `roundness`, `colorVariant`, `designMd`

---

# Pencil.dev — Visual Design Editor

Pencil uses `.pen` files edited via MCP tools. **NEVER use `Read`/`Grep` on .pen files** — contents are encrypted. Only use `mcp__pencil__*` tools.

## Workflow

1. **Get editor state**: `get_editor_state({ include_schema })` — Check what's currently open
2. **Open/create**: `open_document(filePathOrNew)` — Pass `'new'` or a file path
3. **Get guidelines**: `get_guidelines(category?, name?, params?)` — Topics: `code`, `table`, `tailwind`, `landing-page`, `slides`, `design-system`, `mobile-app`, `web-app`
4. **Discover structure**: `batch_get(patterns, nodeIds)` — Search/read nodes
5. **Design**: `batch_design(operations)` — Insert/Copy/Update/Replace/Move/Delete/Image (max 25 ops per call)
6. **Check layout**: `snapshot_layout()` — See computed layout rectangles
7. **Visual validation**: `get_screenshot()` — Periodically verify visually
8. **Variables**: `get_variables()` / `set_variables()` — Extract or update themes
9. **Export**: `export_nodes()` — Export to PNG/JPEG/WEBP/PDF

## MCP Tools Reference (13 tools)

| Tool | Purpose |
|------|---------|
| `get_editor_state` | Current editor context |
| `open_document` | Open/create .pen file |
| `get_guidelines` | Design rules and styles |
| `batch_get` | Read nodes by pattern/ID |
| `batch_design` | Insert/copy/update/replace/move/delete operations |
| `get_screenshot` | Visual validation |
| `get_variables` | Extract variables/themes |
| `set_variables` | Update variables |
| `find_empty_space_on_canvas` | Layout planning |
| `search_all_unique_properties` | Property discovery |
| `replace_all_matching_properties` | Bulk property updates |
| `export_nodes` | Export to PNG/JPEG/WEBP/PDF |
| `snapshot_layout` | Layout structure check |

## batch_design Operations

```
foo=I("parent", { ... })           # Insert
baz=C("nodeid", "parent", { ... }) # Copy
foo2=R("nodeid1/nodeid2", { ... }) # Replace
U(foo+"/nodeid", { ... })          # Update
D("dfFAeg2")                       # Delete
M("nodeid3", "parent", 2)          # Move
G("baz", "ai", "...")              # Generate image
```

## Design Validation Loop

```
Design → snapshot_layout() → get_screenshot() → adjust → repeat
```

Always validate visually after significant changes. Screenshots reveal spacing, alignment, and visual hierarchy issues that node data alone cannot show.
