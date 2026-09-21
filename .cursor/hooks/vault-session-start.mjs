#!/usr/bin/env node
/**
 * Inject current sprint + last-session from Tier 0 card (cheap context).
 * Avoids dumping Tasks.md / Sessions.md at cold start.
 * Fail-open: never block session creation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VAULT_ROOT = "C:/Users/CLIET/.antigravity-ide/developer-io";
const CARD = join(VAULT_ROOT, "Projects/CRMC-Aims/_Card.md");

function section(md, heading) {
  const re = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
  const m = md.match(re);
  return m ? m[1].trim().split("\n")[0].trim() : "";
}

let sprint = "";
let last = "";
try {
  const md = readFileSync(CARD, "utf8");
  sprint = section(md, "Current sprint");
  last = section(md, "Last session");
} catch {
  /* card unreadable — still inject protocol */
}

const additional_context = [
  "Obsidian vault developer-io is source of truth. Prefer user-obsidian MCP; do not dump Tasks.md or Sessions.md at cold start.",
  "Cold start: vault_read Projects/CRMC-Aims/_Card.md, then Meta/Context-Loading-Protocol.md. Name extra notes before reading them.",
  "Write vault notes when sprint state actually changes (session end / meaningful milestone) — not every tiny prompt.",
  sprint ? `Current sprint: ${sprint}` : null,
  last ? `Last session: ${last}` : null,
]
  .filter(Boolean)
  .join("\n");

process.stdout.write(
  JSON.stringify({
    env: { DEVELOPER_IO_VAULT: VAULT_ROOT },
    additional_context,
  }),
);
process.stdout.write("\n");
