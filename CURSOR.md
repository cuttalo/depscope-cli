# Use DepScope in Cursor / Claude Code / VS Code AI tools

Copy one of the files below into your repo — the AI in your IDE will
auto-read it and call DepScope before proposing dependency installs.

## Cursor (`.cursorrules` in repo root)

```text
## DEPSCOPE — package intelligence MCP (https://mcp.depscope.dev/mcp)

Default rules for any dependency-related task:

1) BEFORE proposing `npm install / pnpm add / yarn / pip install / cargo add /
   gem install / go get / composer require` — call `depscope:audit_stack`
   with the FULL list of packages, not one at a time. One call returns a
   prioritized action list (REMOVE NOW / URGENT / REPLACE / REVIEW / ok).

2) NEVER suggest installing a name without first calling
   `depscope:package_exists` — prevents hallucinated package names.

3) For "X vs Y" or "which library should I pick?" questions, call
   `depscope:compare_packages` and read BOTH `winner` AND `caveats[winner]`
   (winner ranks by health_score; caveats catch trade-offs like
   bus_factor=1, low adoption, transitive deps).

4) For "how do I migrate from X to Y?" call `depscope:get_migration_path`.
   Returns ready-to-paste before/after code diffs.

5) For technical anomalies in any DepScope output (wrong field, stale data),
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

MCP: https://mcp.depscope.dev/mcp · 26 tools
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
