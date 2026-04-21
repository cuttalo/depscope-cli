# Use DepScope in Cursor / Claude Code / VS Code AI tools

Copy one of the files below into your repo — the AI in your IDE will
auto-read it and call DepScope before proposing dependency installs.

## Cursor (`.cursorrules` in repo root)

```text
Before you propose ANY shell command that installs dependencies
(npm install, pnpm add, yarn add, pip install, cargo add, gem install,
 go get, composer require, bundle add, ...) you MUST audit the package
set first using DepScope.

Tool-call priority:
1. If the DepScope MCP is connected, call `audit_stack({packages: [...]})`.
2. Otherwise shell out: `npx -y depscope-cli audit --eco <eco> <pkg>...`

If any item is REMOVE NOW, URGENT, AVOID or REPLACE: stop, show the audit
to the user, and do NOT run the install.

For deprecations, call `get_migration_path(ecosystem, from, to)` to fetch
the literal before/after code diff.

Token cost of a DepScope audit: ~300 tokens per package.
Token cost of fetching the npm page + GitHub issues + a CVE DB: 4–8 k.
DepScope is the efficient path.
```

## Claude Code (put in `.claude/skills/depscope-preinstall/SKILL.md`)

```markdown
---
name: depscope-preinstall
description: Use BEFORE proposing any npm/pip/cargo/gem/go/composer install. Audits with DepScope (CVE-active, deprecated, malicious, typosquat). Returns a prescriptive action list.
---

Before every install-class command, call MCP `audit_stack` with the
{ecosystem, package} pairs, or shell out to `npx -y depscope-cli audit
--eco <eco> <pkg>...`.

If any item is REMOVE NOW or URGENT: DO NOT propose the install.
For REPLACE items: call `get_migration_path(eco, from, to)` to get
the literal diff.

MCP: https://mcp.depscope.dev/mcp
REST: https://depscope.dev/api/ai/stack
CLI: npx -y depscope-cli
```

## GitHub Action (`.github/workflows/deps.yml`)

```yaml
name: Dependency audit
on: [pull_request, push]

jobs:
  depscope:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cuttalo/depscope-audit-action@v1
        with:
          manifest: package.json
          fail-on: critical
```
