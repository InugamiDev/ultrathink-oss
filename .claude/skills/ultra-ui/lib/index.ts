#!/usr/bin/env node
/*
intent: CLI entrypoint for ultra-ui lint, validate, diff, export, generate, and search.
status: authored for ultra-ui.
next: Keep command names stable for SKILL.md quick-start examples.
confidence: high
*/

import { Command } from "commander";
import { runDesignMdDiff, printDiffResult } from "./diff.js";
import {
  runDesignMdExport,
  printExportResult,
  type UltraUiExportFormat,
} from "./export.js";
import { generateDesignMd, printGenerateResult } from "./generate.js";
import { runDesignMdLint, printLintResult } from "./lint.js";
import { searchTopRow, type UltraUiSearchDomain } from "./search-cli.js";

const program = new Command();

program
  .name("ultra-ui")
  .description("Generate, lint, diff, and export DESIGN.md files for UltraThink UI workflows.")
  .version("0.1.0");

program
  .command("lint")
  .description("Validate a DESIGN.md file with @google/design.md lint.")
  .argument("<file>", "Path to DESIGN.md")
  .action((file: string) => {
    const result = runDesignMdLint(file);
    printLintResult(result);
    process.exitCode = result.status;
  });

program
  .command("validate")
  .description("Alias for lint; kept for workflow readability.")
  .argument("<file>", "Path to DESIGN.md")
  .action((file: string) => {
    const result = runDesignMdLint(file);
    printLintResult(result);
    process.exitCode = result.status;
  });

program
  .command("diff")
  .description("Compare two DESIGN.md files with @google/design.md diff.")
  .argument("<before>", "Before DESIGN.md")
  .argument("<after>", "After DESIGN.md")
  .action((before: string, after: string) => {
    const result = runDesignMdDiff(before, after);
    printDiffResult(result);
    process.exitCode = result.status;
  });

program
  .command("export")
  .description("Export DESIGN.md tokens to Tailwind or DTCG formats.")
  .argument("<file>", "Path to DESIGN.md")
  .requiredOption(
    "-f, --format <format>",
    "tailwind | json-tailwind | css-tailwind | tokens | dtcg",
  )
  .action((file: string, options: { format: UltraUiExportFormat }) => {
    const result = runDesignMdExport(file, options.format);
    printExportResult(result);
    process.exitCode = result.status;
  });

program
  .command("generate")
  .description("Generate a DESIGN.md file from style, palette, font, and product keywords.")
  .option("--style <keyword>", "Style keyword, e.g. bento grid")
  .option("--palette <keyword>", "Palette keyword, e.g. saas-blue")
  .option("--font <keyword>", "Font keyword, e.g. elegant")
  .option("--product <keyword>", "Product keyword, e.g. analytics dashboard")
  .requiredOption("--out <file>", "Output DESIGN.md path")
  .action(
    (options: {
      style?: string;
      palette?: string;
      font?: string;
      product?: string;
      out: string;
    }) => {
      try {
        const result = generateDesignMd(options);
        printGenerateResult(result);
        process.exitCode = result.lint.status;
      } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
      }
    },
  );

program
  .command("search")
  .description("Search the copied ui-ux-pro-max CSV data through scripts/search.py.")
  .argument("<keyword>", "Search keyword")
  .requiredOption(
    "-d, --domain <domain>",
    "style | color | palette | font | typography | product",
  )
  .action((keyword: string, options: { domain: UltraUiSearchDomain }) => {
    try {
      const result = searchTopRow(keyword, options.domain);
      process.stdout.write(`${JSON.stringify(result.row, null, 2)}\n`);
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    }
  });

program.parse();
