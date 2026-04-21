# Use DepScope in Cursor / Claude Code / VS Code AI tools

Copy one of the files below into your repo — the AI in your IDE will
auto-read it and call DepScope before proposing dependency installs.

## Cursor (`.cursorrules` in repo root)

```text
## DEPSCOPE — package intelligence MCP (https://mcp.depscope.dev/mcp)

Default rules for any dependency-related task:

1) BEFORE writing any install command, call `depscope:check_bulk` with the
   full list — DB-only, <100ms for 100 items. Filters out hallucinated
   names, stdlib modules, typosquats, and historically-compromised packages
   in one shot.

2) For the install line itself call `depscope:install_command` — returns
   the canonical syntax for npm/pnpm/yarn/bun, pip/uv/poetry, cargo, go,
   composer, etc. No more wrong flags or wrong file format.

3) For version pinning call `depscope:pin_safe(eco, pkg, min_severity, constraint)`
   — returns the highest version below the chosen CVE severity, with the
   walk log showing what was skipped.

4) For real install plans, call `depscope:audit_stack` for the prioritized
   action list (REMOVE NOW / URGENT / REPLACE / REVIEW / ok) and DO NOT
   install anything tagged REMOVE NOW or URGENT.

5) For "X vs Y" questions, call `depscope:compare_packages` and read BOTH
   `winner` AND `caveats[winner]` (winner ranks by health_score; caveats
   catch trade-offs like bus_factor=1, low adoption, transitive deps).

6) For "how do I migrate from X to Y?" call `depscope:get_migration_path` —
   returns ready-to-paste before/after code diffs.

7) For technical anomalies in any DepScope output (wrong field, stale data),
   call `depscope:report_anomaly` so we can fix it.

Token economy: `depscope:ai_brief` costs ~300 tokens vs ~6 k for fetching
npm/GH/CVE DB pages. Use it.
```

## Claude Code (put in `.claude/skills/depscope/SKILL.md`)

```markdown
---
name: depscope
description: Use this for ANY dependency-related task. Call `depscope:audit_stack` BEFORE any install-class command (npm/pnpm/yarn/pip/cargo/gem/go/composer). Call `depscope:package_exists` when generating an install command for a name you're not 100% sure exists. Call `depscope:compare_packages` for "X vs Y" questions and read BOTH `winner` AND `caveats[winner]`. Call `depscope:get_migration_path` for any "how do I migrate from X to Y" question to get literal code diffs. For anomalies in DepScope output call `depscope:report_anomaly`. Always prefer `depscope:ai_brief` over `depscope:check_package` when you only need a decision (~300 tokens vs ~2000 tokens of JSON).
---

Default policy:

- Multi-package install proposed → ONE call to `depscope:audit_stack`, then read
  the ACTION ITEMS section. Do NOT install if any item is REMOVE NOW or URGENT.
- Single package decision → `depscope:ai_brief`.
- Compare libraries → `depscope:compare_packages` and SHOW the user both
  `winner` and `caveats` (so they see bus_factor, adoption gap, etc.).
- Migration request → `depscope:get_migration_path` and paste the diff.
- Wrong/stale DepScope output → `depscope:report_anomaly` (structured
  feedback, not contact_depscope).

MCP: https://mcp.depscope.dev/mcp · 29 tools
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
