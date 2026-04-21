#!/usr/bin/env node
// depscope CLI — audit dependency stacks before install.
// Usage:
//   depscope audit express axios lodash           -> npm (default)
//   depscope audit --eco pypi requests fastapi
//   depscope audit --file package.json
//   depscope audit --file requirements.txt
//   depscope brief npm/express
//   depscope migration npm request axios

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const API_BASE = process.env.DEPSCOPE_API_URL || "https://depscope.dev";
const VERSION = "0.1.0";

const RED = "\x1b[31m", YEL = "\x1b[33m", GRN = "\x1b[32m", DIM = "\x1b[2m", RST = "\x1b[0m", BLD = "\x1b[1m";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) { args[key] = true; }
      else { args[key] = next; i++; }
    } else {
      args._.push(a);
    }
  }
  return args;
}

function colorVerdict(line) {
  if (/REMOVE NOW|URGENT|DO NOT INSTALL|MALICIOUS/i.test(line)) return RED + line + RST;
  if (/REPLACE|CAUTION|AVOID|DEPRECATED|RECONSIDER/i.test(line)) return YEL + line + RST;
  if (/SAFE|ok:/i.test(line)) return GRN + line + RST;
  return line;
}

async function http(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "User-Agent": `depscope-cli/${VERSION}`, ...(opts.headers || {}) },
  });
  return res;
}

function parseManifest(file) {
  const content = readFileSync(file, "utf8");
  const name = basename(file);
  const out = [];
  if (name === "package.json") {
    const j = JSON.parse(content);
    for (const [n] of Object.entries({ ...(j.dependencies || {}), ...(j.devDependencies || {}) })) {
      out.push({ ecosystem: "npm", package: n });
    }
  } else if (name === "requirements.txt" || name.endsWith(".txt")) {
    for (const ln of content.split(/\r?\n/)) {
      const s = ln.split("#")[0].trim();
      if (!s) continue;
      const m = s.match(/^([A-Za-z0-9_.\-]+)/);
      if (m) out.push({ ecosystem: "pypi", package: m[1] });
    }
  } else if (name === "Cargo.toml") {
    for (const ln of content.split(/\r?\n/)) {
      const m = ln.match(/^([A-Za-z0-9_\-]+)\s*=/);
      if (m && !["version","edition","name","authors","license","description","repository"].includes(m[1])) {
        out.push({ ecosystem: "cargo", package: m[1] });
      }
    }
  } else if (name === "Gemfile") {
    for (const ln of content.split(/\r?\n/)) {
      const m = ln.match(/^\s*gem\s+['"]([^'"]+)['"]/);
      if (m) out.push({ ecosystem: "rubygems", package: m[1] });
    }
  } else if (name === "go.mod") {
    for (const ln of content.split(/\r?\n/)) {
      const m = ln.match(/^\s*([\w.\-\/]+)\s+v/);
      if (m && !/^module\s/.test(ln)) out.push({ ecosystem: "go", package: m[1] });
    }
  }
  return out;
}

function help() {
  console.log(`${BLD}depscope${RST} — audit deps before install (${API_BASE})

COMMANDS
  audit <pkg> [pkg...]           Stack audit (default: npm)
  audit --eco <eco> <pkg>...     Specify ecosystem (npm|pypi|cargo|go|composer|maven|nuget|rubygems)
  audit --file <path>            Parse manifest (package.json, requirements.txt, Cargo.toml, Gemfile, go.mod)
  brief <eco>/<pkg>              One-package AI brief (300 tokens)
  migration <eco> <from> <to>    Code-diff migration path (e.g. npm request axios)
  check <eco>/<pkg>              Full JSON report
  version                        Print version

EXAMPLES
  depscope audit express axios lodash
  depscope audit --eco pypi django requests fastapi
  depscope audit --file package.json
  depscope brief npm/request
  depscope migration npm request axios
`);
}

async function cmdAudit(args) {
  let packages = [];
  if (args.file) {
    if (!existsSync(args.file)) { console.error(`${RED}File not found: ${args.file}${RST}`); process.exit(2); }
    packages = parseManifest(args.file);
    if (!packages.length) { console.error(`${RED}No dependencies parsed from ${args.file}${RST}`); process.exit(2); }
  } else {
    const eco = args.eco || "npm";
    packages = args._.slice(1).map(p => ({ ecosystem: eco, package: p }));
  }
  if (!packages.length) { help(); process.exit(2); }

  const res = await http("/api/ai/stack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packages, format: "text" }),
  });
  if (!res.ok) { console.error(`${RED}DepScope API error: ${res.status}${RST}`); process.exit(3); }
  const text = await res.text();
  for (const ln of text.split("\n")) console.log(colorVerdict(ln));
  const crit = res.headers.get("x-depscope-critical");
  if (crit && Number(crit) > 0) process.exit(1);
}

async function cmdBrief(args) {
  const target = args._[1];
  if (!target || !target.includes("/")) { console.error("Usage: depscope brief <eco>/<pkg>"); process.exit(2); }
  const [eco, pkg] = target.split("/", 2);
  const res = await http(`/api/ai/brief/${eco}/${encodeURIComponent(pkg)}`);
  if (!res.ok) { console.error(`${RED}API error: ${res.status}${RST}`); process.exit(3); }
  const text = await res.text();
  for (const ln of text.split("\n")) console.log(colorVerdict(ln));
  if (/DO NOT INSTALL|URGENT|DEPRECATED/i.test(text)) process.exit(1);
}

async function cmdMigration(args) {
  const [, eco, from, to] = args._;
  if (!eco || !from || !to) { console.error("Usage: depscope migration <eco> <from> <to>"); process.exit(2); }
  const res = await http(`/api/migration/${eco}/${encodeURIComponent(from)}/${encodeURIComponent(to)}`);
  if (!res.ok) { console.error(`${RED}API error: ${res.status}${RST}`); process.exit(3); }
  const j = await res.json();
  console.log(`${BLD}${eco} ${from} → ${to}${RST}  ${j.curated ? GRN + "curated" : YEL + "generic"}${RST}`);
  console.log(`Rationale: ${j.rationale}`);
  if (j.effort_minutes) console.log(`${DIM}Estimated effort: ${j.effort_minutes} min${RST}`);
  const diffs = j.diff_examples || [];
  const diffList = Array.isArray(diffs) ? diffs : (typeof diffs === "string" ? JSON.parse(diffs) : []);
  if (diffList.length) {
    console.log(`\n${BLD}CODE DIFFS:${RST}`);
    for (const d of diffList) {
      console.log(`\n--- ${d.title} ---`);
      console.log(RED + "[before]" + RST);
      console.log(d.before);
      console.log(GRN + "[after]" + RST);
      console.log(d.after);
    }
  }
  const bcs = j.breaking_changes || [];
  const bcList = Array.isArray(bcs) ? bcs : (typeof bcs === "string" ? JSON.parse(bcs) : []);
  if (bcList.length) {
    console.log(`\n${BLD}BREAKING CHANGES:${RST}`);
    bcList.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  }
  const refs = j.references || [];
  const refList = Array.isArray(refs) ? refs : (typeof refs === "string" ? JSON.parse(refs) : []);
  if (refList.length) {
    console.log(`\n${BLD}REFERENCES:${RST}`);
    refList.forEach(r => console.log(`  ${r}`));
  }
}

async function cmdCheck(args) {
  const target = args._[1];
  if (!target || !target.includes("/")) { console.error("Usage: depscope check <eco>/<pkg>"); process.exit(2); }
  const [eco, pkg] = target.split("/", 2);
  const res = await http(`/api/check/${eco}/${encodeURIComponent(pkg)}`);
  if (!res.ok) { console.error(`${RED}API error: ${res.status}${RST}`); process.exit(3); }
  const j = await res.json();
  console.log(JSON.stringify(j, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd || cmd === "help" || args.help) return help();
  if (cmd === "version" || args.version) return console.log(VERSION);
  if (cmd === "audit") return cmdAudit(args);
  if (cmd === "brief") return cmdBrief(args);
  if (cmd === "migration") return cmdMigration(args);
  if (cmd === "check") return cmdCheck(args);
  console.error(`Unknown command: ${cmd}`);
  help();
  process.exit(2);
}

main().catch(err => { console.error(`${RED}Error: ${err.message}${RST}`); process.exit(1); });
