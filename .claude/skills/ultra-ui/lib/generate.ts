/*
intent: Generate DESIGN.md files from ui-ux-pro-max CSV-backed choices, then lint them.
status: authored for ultra-ui.
next: Add fixture tests once upstream @google/design.md CLI behavior is pinned.
confidence: high
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { formatFindings, runDesignMdLint, type LintResult } from "./lint.js";
import { searchTopRow, type SearchResult } from "./search-cli.js";

export interface GenerateOptions {
  style?: string;
  palette?: string;
  font?: string;
  product?: string;
  out: string;
}

export interface GenerateResult {
  out: string;
  markdown: string;
  selections: {
    style?: SearchResult;
    palette?: SearchResult;
    font?: SearchResult;
    product?: SearchResult;
  };
  lint: LintResult;
}

const DEFAULT_PALETTE: Record<string, string> = {
  "Product Type": "SaaS (General)",
  Primary: "#2563EB",
  "On Primary": "#FFFFFF",
  Secondary: "#3B82F6",
  "On Secondary": "#FFFFFF",
  Accent: "#EA580C",
  "On Accent": "#FFFFFF",
  Background: "#F8FAFC",
  Foreground: "#1E293B",
  Card: "#FFFFFF",
  "Card Foreground": "#1E293B",
  Muted: "#E9EFF8",
  "Muted Foreground": "#475569",
  Border: "#CBD5E1",
  Destructive: "#DC2626",
  "On Destructive": "#FFFFFF",
  Ring: "#2563EB",
  Notes: "Trust blue with accessible orange CTA contrast.",
};

const DEFAULT_TYPOGRAPHY: Record<string, string> = {
  "Font Pairing Name": "Modern Professional",
  Category: "Sans",
  "Heading Font": "Inter",
  "Body Font": "Inter",
  "Mood/Style Keywords": "modern, professional, readable, neutral",
  "Best For": "SaaS dashboards, productivity tools, and dense operational interfaces",
  Notes: "Use one flexible sans family for reliable hierarchy and fast loading.",
};

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function get(row: Record<string, string>, key: string, fallback: string): string {
  const value = row[key]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function getHex(row: Record<string, string>, key: string, fallback: string): string {
  const value = get(row, key, fallback);
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value) ? value : fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const scaled = channel / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : Math.pow((scaled + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableForeground(background: string, candidates: string[]): string {
  const uniqueCandidates = [...new Set([...candidates, "#FFFFFF", "#000000"])];
  const passing = uniqueCandidates.find(
    (candidate) => contrastRatio(candidate, background) >= 4.5,
  );

  if (passing) {
    return passing;
  }

  return uniqueCandidates
    .map((candidate) => ({
      candidate,
      ratio: contrastRatio(candidate, background),
    }))
    .sort((a, b) => b.ratio - a.ratio)[0].candidate;
}

function titleCase(input: string): string {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function compactSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

function buildFrontmatter(
  options: GenerateOptions,
  styleRow: Record<string, string> | undefined,
  paletteRow: Record<string, string>,
  fontRow: Record<string, string>,
  productRow: Record<string, string> | undefined,
): string {
  const productName = productRow
    ? get(productRow, "Product Type", options.product ?? "Product")
    : options.product
      ? titleCase(options.product)
      : get(paletteRow, "Product Type", "Ultra UI");
  const styleName = styleRow
    ? get(styleRow, "Style Category", options.style ?? "Purposeful Interface")
    : options.style
      ? titleCase(options.style)
      : "Purposeful Interface";
  const systemName = `${productName} ${styleName}`;
  const headingFont = get(fontRow, "Heading Font", "Inter");
  const bodyFont = get(fontRow, "Body Font", headingFont);

  const colors = {
    primary: getHex(paletteRow, "Primary", DEFAULT_PALETTE.Primary),
    "on-primary": getHex(paletteRow, "On Primary", DEFAULT_PALETTE["On Primary"]),
    secondary: getHex(paletteRow, "Secondary", DEFAULT_PALETTE.Secondary),
    "on-secondary": getHex(paletteRow, "On Secondary", DEFAULT_PALETTE["On Secondary"]),
    accent: getHex(paletteRow, "Accent", DEFAULT_PALETTE.Accent),
    "on-accent": getHex(paletteRow, "On Accent", DEFAULT_PALETTE["On Accent"]),
    background: getHex(paletteRow, "Background", DEFAULT_PALETTE.Background),
    foreground: getHex(paletteRow, "Foreground", DEFAULT_PALETTE.Foreground),
    card: getHex(paletteRow, "Card", DEFAULT_PALETTE.Card),
    "card-foreground": getHex(
      paletteRow,
      "Card Foreground",
      DEFAULT_PALETTE["Card Foreground"],
    ),
    muted: getHex(paletteRow, "Muted", DEFAULT_PALETTE.Muted),
    "muted-foreground": getHex(
      paletteRow,
      "Muted Foreground",
      DEFAULT_PALETTE["Muted Foreground"],
    ),
    border: getHex(paletteRow, "Border", DEFAULT_PALETTE.Border),
    destructive: getHex(paletteRow, "Destructive", DEFAULT_PALETTE.Destructive),
    "on-destructive": getHex(
      paletteRow,
      "On Destructive",
      DEFAULT_PALETTE["On Destructive"],
    ),
    ring: getHex(paletteRow, "Ring", DEFAULT_PALETTE.Ring),
  };

  colors["on-primary"] = readableForeground(colors.primary, [
    colors["on-primary"],
    colors.background,
    colors.foreground,
  ]);
  colors["on-secondary"] = readableForeground(colors.secondary, [
    colors["on-secondary"],
    colors.background,
    colors.foreground,
  ]);
  colors["on-accent"] = readableForeground(colors.accent, [
    colors["on-accent"],
    colors.background,
    colors.foreground,
  ]);
  colors["muted-foreground"] = readableForeground(colors.muted, [
    colors["muted-foreground"],
    colors.foreground,
    colors["card-foreground"],
  ]);
  colors["on-destructive"] = readableForeground(colors.destructive, [
    colors["on-destructive"],
    colors.background,
    colors.foreground,
  ]);

  const colorYaml = Object.entries(colors)
    .map(([key, value]) => `  ${key}: ${yamlString(value)}`)
    .join("\n");

  return `---
version: alpha
name: ${yamlString(systemName)}
description: ${yamlString(`Generated by ultra-ui from ${styleName}, ${get(paletteRow, "Product Type", "a semantic palette")}, and ${get(fontRow, "Font Pairing Name", "a typography pairing")}.`)}
colors:
${colorYaml}
typography:
  display:
    fontFamily: ${yamlString(headingFont)}
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.02em
  headline:
    fontFamily: ${yamlString(headingFont)}
    fontSize: 2rem
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: -0.01em
  body:
    fontFamily: ${yamlString(bodyFont)}
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em
  label:
    fontFamily: ${yamlString(bodyFont)}
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.01em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  none: 0px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  muted-surface:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  destructive-action:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-destructive}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.foreground}"
    height: 1px
    width: 100%
  focus-indicator:
    backgroundColor: "{colors.ring}"
    textColor: "{colors.background}"
    rounded: "{rounded.full}"
    size: 3px
---`;
}

function buildBody(
  options: GenerateOptions,
  styleRow: Record<string, string> | undefined,
  paletteRow: Record<string, string>,
  fontRow: Record<string, string>,
  productRow: Record<string, string> | undefined,
): string {
  const productName = productRow
    ? get(productRow, "Product Type", options.product ?? "product")
    : options.product
      ? titleCase(options.product)
      : "the product";
  const styleName = styleRow
    ? get(styleRow, "Style Category", options.style ?? "Purposeful Interface")
    : options.style
      ? titleCase(options.style)
      : "Purposeful Interface";
  const styleBestFor = styleRow
    ? compactSentence(get(styleRow, "Best For", "clear hierarchy and efficient scanning"))
    : "clear hierarchy and efficient scanning";
  const styleEffects = styleRow
    ? compactSentence(get(styleRow, "Effects & Animation", "subtle state changes"))
    : "subtle state changes";
  const paletteName = get(paletteRow, "Product Type", "semantic palette");
  const paletteNotes = compactSentence(get(paletteRow, "Notes", DEFAULT_PALETTE.Notes));
  const fontName = get(fontRow, "Font Pairing Name", "Modern Professional");
  const headingFont = get(fontRow, "Heading Font", "Inter");
  const bodyFont = get(fontRow, "Body Font", headingFont);
  const fontNotes = compactSentence(get(fontRow, "Notes", DEFAULT_TYPOGRAPHY.Notes));
  const productNotes = productRow
    ? compactSentence(
        get(
          productRow,
          "Key Considerations",
          get(productRow, "Primary Style Recommendation", "product-fit interface patterns"),
        ),
      )
    : "product-fit interface patterns";

  return `
## Overview

${productName} uses ${styleName} to create a focused, durable interface system for ${styleBestFor}. The product direction emphasizes ${productNotes}, while motion stays intentional through ${styleEffects}. Use the tokens in the frontmatter as the implementation source of truth and use this prose to preserve the design rationale.

## Colors

The palette is based on ${paletteName}: ${paletteNotes}. Primary and secondary colors carry main actions and navigation emphasis, accent is reserved for high-signal calls to action, background/card/muted tokens define the surface stack, and destructive/ring tokens keep feedback states explicit and accessible.

## Typography

The typography direction uses ${fontName}: ${headingFont} for display and headline roles, with ${bodyFont} for body and labels. ${fontNotes}. The scale favors strong hierarchy without excessive font variation so dense UI can remain readable across desktop and mobile.

## Layout

Use a compact 4px-derived spacing scale with 16px as the default rhythm, 24px for grouped content, and 32-48px for major separations. Prefer responsive grids that keep the primary workflow visible at 375px, 768px, 1024px, and 1440px.

## Elevation & Depth

Use tonal separation first: background, card, muted, and border tokens establish hierarchy before shadows. Add shadow only where it clarifies interactivity or stacking.

## Shapes

The default shape system uses 8px radius for controls, 12px for cards, 16px for large panels, and full radius only for pills, toggles, or focus indicators.

## Components

Primary buttons use primary/on-primary, secondary buttons use secondary/on-secondary, and accent buttons are reserved for the most important conversion action. Cards use card/card-foreground, muted surfaces use muted/muted-foreground, and destructive actions always use destructive/on-destructive.

## Do's and Don'ts

- Do implement from DESIGN.md tokens rather than hardcoded component colors.
- Do keep component foreground/background pairs at WCAG AA contrast.
- Do reserve accent for rare high-signal actions.
- Don't add decorative colors that are not represented as tokens.
- Don't introduce new type sizes without extending the typography scale.
`;
}

export function generateDesignMd(options: GenerateOptions): GenerateResult {
  if (!options.out) {
    throw new Error("Missing required --out path.");
  }

  const selections: GenerateResult["selections"] = {};

  if (options.style) {
    selections.style = searchTopRow(options.style, "style");
  }

  if (options.palette) {
    selections.palette = searchTopRow(options.palette, "color");
  }

  if (options.font) {
    selections.font = searchTopRow(options.font, "font");
  }

  if (options.product) {
    selections.product = searchTopRow(options.product, "product");
  }

  const styleRow = selections.style?.row;
  const paletteRow = selections.palette?.row ?? DEFAULT_PALETTE;
  const fontRow = selections.font?.row ?? DEFAULT_TYPOGRAPHY;
  const productRow = selections.product?.row;
  const markdown = `${buildFrontmatter(options, styleRow, paletteRow, fontRow, productRow)}${buildBody(
    options,
    styleRow,
    paletteRow,
    fontRow,
    productRow,
  )}`;

  const outPath = resolve(options.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, markdown, "utf8");

  const lint = runDesignMdLint(outPath);
  return {
    out: outPath,
    markdown,
    selections,
    lint,
  };
}

export function printGenerateResult(result: GenerateResult): void {
  if (result.lint.report) {
    const { summary } = result.lint.report;
    if (summary.errors > 0 || summary.warnings > 0) {
      for (const line of formatFindings(result.lint.report)) {
        process.stderr.write(`${line}\n`);
      }
    } else {
      process.stdout.write(`Generated ${result.out}; DESIGN.md lint passed with no findings.\n`);
    }

    if (summary.errors === 0 && summary.warnings > 0) {
      process.stdout.write(
        `Generated ${result.out}; DESIGN.md lint passed with ${summary.warnings} warning(s).\n`,
      );
    }
    return;
  }

  if (result.lint.stderr) {
    process.stderr.write(result.lint.stderr);
  }

  process.stdout.write(`Generated ${result.out}; lint output was not parseable.\n`);
}
