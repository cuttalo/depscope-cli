# depscope — audit your deps before you install them

**Zero-auth. Zero setup. One command.**

```bash
npx depscope audit express request lodash
```

```
STACK AUDIT — 3 packages
  ok: 2  risk: 1  critical: 0  total_dl_week: 122,766,020

ACTION ITEMS:
  1. REPLACE: npm/request@2.88.2 deprecated → suggested: axios, got
```

## What it does

- Checks every dependency against DepScope's live intelligence: **CVE (active / likely exploited)**, **deprecated**, **malicious (OpenSSF)**, **typosquat candidates**, **maintainer health**.
- Returns a single ranked action list. Exit code 1 if any package needs action.
- **One HTTP call replaces dozens of registry fetches + GitHub issues + security DB lookups.**

## Install

```bash
npm i -g depscope
# or on demand
npx depscope audit express axios
```

## Commands

```text
depscope audit <pkg> [pkg...]            # npm by default
depscope audit --eco pypi django fastapi # any ecosystem
depscope audit --file package.json       # parse manifest
depscope audit --file requirements.txt
depscope audit --file Cargo.toml
depscope audit --file Gemfile
depscope audit --file go.mod

depscope brief npm/request               # AI-ready text brief (~300 tokens)
depscope migration npm request axios     # literal before/after code diff
depscope check npm/express               # full JSON
```

Ecosystems: `npm`, `pypi`, `cargo`, `go`, `composer`, `maven`, `nuget`, `rubygems`, `pub`, `hex`, `swift`, `cocoapods`, `cpan`, `hackage`, `cran`, `conda`, `homebrew`, `jsr`, `julia`.

## CI / pre-commit

```yaml
# .github/workflows/deps.yml
- run: npx depscope audit --file package.json
```

Non-zero exit on critical/deprecated — fail PR automatically.

## With AI agents

If you use Claude Code, Cursor, or any MCP-compatible client, DepScope is also available as an MCP server at `https://mcp.depscope.dev/mcp`. The CLI is the command-line companion.

## Why

Installing deprecated or malicious packages wastes time, burns tokens, and creates security debt. DepScope has indexed 26k+ packages across 19 ecosystems, cross-referenced against CISA KEV, EPSS, and OpenSSF malicious database, with curated migration paths. Free forever.

**Source**: [depscope.dev](https://depscope.dev) · **MCP**: [mcp.depscope.dev](https://mcp.depscope.dev/mcp) · [GitHub](https://github.com/depscope-dev/cli)
