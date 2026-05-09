/**
 * Prints context tree summary to stdout — used by session-start hook
 */
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getContextTreeSummary } from "./context-tree.js";

const summary = await getContextTreeSummary();
process.stdout.write(summary);
process.exit(0);
