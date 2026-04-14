# Agent Reference for GSD (get-shit-done)

This file is a comprehensive guide for AI coding agents working on the **GSD** (`get-shit-done-cc`) project. GSD is a
meta-prompting, context-engineering, and spec-driven development system for AI coding assistants.

---

## Project Overview

**GSD** is a lightweight but powerful framework that sits between users and AI coding agents (Claude Code, OpenCode,
Gemini CLI, Kilo, Codex, Copilot, Cursor, Windsurf, Antigravity, Augment, Trae, Qwen Code, Cline, CodeBuddy, Kimi Code
CLI). It solves "context rot" by engineering structured artifacts and orchestrating specialized subagents with fresh
context windows.

- **Package name:** `get-shit-done-cc`
- **Repository:** `https://github.com/gsd-build/get-shit-done`
- **License:** MIT
- **Author:** TÂCHES
- **Node.js requirement:** `>=22.0.0`

The project has two main layers:

1. **The Installer + Runtime Layer** (`bin/install.js`, `commands/`, `agents/`, `hooks/`, `get-shit-done/`) — Installs
   GSD as custom commands/skills into various AI coding runtimes.
2. **The SDK** (`sdk/`) — A TypeScript programmatic interface for running GSD plans headlessly via the Anthropic Agent
   SDK.

---

## Technology Stack

- **Runtime:** Node.js 22+ (CommonJS for core, ESM for SDK)
- **Core Dependencies:** None — `gsd-tools.cjs` and all library modules use only Node.js built-ins
- **Dev Dependencies:**
    - `c8` — Code coverage
    - `esbuild` — Hook bundling (legacy)
    - `vitest` — SDK testing
- **SDK Dependencies:**
    - `@anthropic-ai/claude-agent-sdk`
    - `ws` (WebSocket)
    - `typescript`

---

## Code Organization

```
├── bin/
│   └── install.js                    # Multi-runtime installer (~6,600 lines)
├── commands/gsd/
│   └── *.md                          # 69 slash-command definitions (YAML frontmatter + prompts)
├── get-shit-done/
│   ├── bin/gsd-tools.cjs             # Main CLI utility for workflows/agents
│   ├── bin/lib/*.cjs                 # 19 domain modules (state, phase, config, verify, etc.)
│   ├── workflows/*.md                # 68 workflow orchestrators
│   ├── references/*.md               # 35+ shared knowledge documents
│   ├── templates/                    # Markdown templates for planning artifacts
│   └── contexts/                     # Context payloads
├── agents/
│   └── gsd-*.md                      # 24 specialized agent definitions
├── hooks/
│   ├── gsd-*.js                      # JavaScript runtime hooks
│   ├── gsd-*.sh                      # Shell runtime hooks
│   └── dist/                         # Copied hooks for distribution
├── sdk/
│   ├── src/                          # TypeScript source + co-located tests
│   ├── prompts/                      # SDK prompt templates
│   ├── package.json                  # Separate SDK package: @gsd-build/sdk
│   └── tsconfig.json
├── tests/
│   ├── *.test.cjs                    # 191 core test files
│   └── helpers.cjs                   # Shared test utilities
├── scripts/
│   ├── build-hooks.js                # Copies hooks to dist/ with syntax validation
│   ├── run-tests.cjs                 # Cross-platform test runner
│   ├── secret-scan.sh                # Secret scanning script
│   └── prompt-injection-scan.sh      # Prompt injection scanning
└── docs/
    ├── AGENTS.md                     # Agent-specific reference (in docs/)
    ├── ARCHITECTURE.md               # System architecture
    ├── CLI-TOOLS.md                  # gsd-tools.cjs API reference
    ├── CONFIGURATION.md              # Config schema
    ├── COMMANDS.md                   # Command reference
    └── FEATURES.md                   # Feature reference
```

### Key Modules in `get-shit-done/bin/lib/`

| Module            | Responsibility                                                           |
|-------------------|--------------------------------------------------------------------------|
| `core.cjs`        | Error handling, argument parsing, shared utilities                       |
| `state.cjs`       | STATE.md parsing, updating, progression                                  |
| `phase.cjs`       | Phase directories, decimal numbering, plan indexing                      |
| `roadmap.cjs`     | ROADMAP.md parsing, phase extraction                                     |
| `config.cjs`      | config.json read/write                                                   |
| `verify.cjs`      | Plan/phase/commit/reference validation                                   |
| `template.cjs`    | Template selection and variable substitution                             |
| `frontmatter.cjs` | YAML frontmatter CRUD                                                    |
| `init.cjs`        | Compound context loading for workflows                                   |
| `security.cjs`    | Path traversal prevention, prompt injection detection, safe JSON parsing |
| `workstream.cjs`  | Workstream CRUD and active pointer                                       |

---

## Build and Test Commands

### Install Dependencies

```bash
npm install
```

### Build

```bash
# Build hooks (required before testing installs or publishing)
npm run build:hooks

# Build SDK
npm run build --workspace=sdk
# or: cd sdk && npm run build
```

### Run Tests

```bash
# Run all core tests (uses node:test via scripts/run-tests.cjs)
npm test

# Run with coverage (c8, 70% line threshold)
npm run test:coverage

# Run SDK tests
npm run test --workspace=sdk
# or: cd sdk && npm test

# Run a single core test file
node --test tests/core.test.cjs

# Run SDK unit/integration tests separately
cd sdk && npm run test:unit
cd sdk && npm run test:integration
```

---

## Code Style Guidelines

- **CommonJS only for core** — Use `.cjs` and `require()` / `module.exports`. Do **not** use ESM `import` in core CLI
  tools or tests.
- **No external runtime dependencies in core** — `gsd-tools.cjs` and all `lib/*.cjs` files must use only Node.js
  built-in modules.
- **YAML frontmatter on all `.md` commands and agents** — Every file in `commands/gsd/` and `agents/` must have valid
  frontmatter (`name`, `description`, `tools`, etc.).
- **Conventional commits** — Use prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`
- **Config defaults follow "absent = enabled"** — If a key is missing from `config.json`, it defaults to `true`.

---

## Testing Instructions

### Core Tests

- **Framework:** Node.js built-in `node:test` and `node:assert/strict`
- **Location:** `tests/*.test.cjs` (191 files)
- **Runner:** `scripts/run-tests.cjs` resolves globs via Node.js to avoid shell-expansion issues on Windows.
- **Concurrency:** Controlled via `TEST_CONCURRENCY` env var (default: 4).
- **Coverage:** `c8` checks 70% line coverage on `get-shit-done/bin/lib/*.cjs`.

### SDK Tests

- **Framework:** Vitest
- **Location:** `sdk/src/**/*.test.ts` and `sdk/src/**/*.integration.test.ts`
- **Config:** `vitest.config.ts` at repo root defines two projects:
    - `unit` — excludes `*.integration.test.ts`
    - `integration` — includes only `*.integration.test.ts`, 120s timeout

### Test Patterns

Use the approved cleanup patterns from `tests/helpers.cjs`:

```javascript
const {describe, it, test, beforeEach, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const {createTempProject, createTempGitProject, cleanup, runGsdTools} = require('./helpers.cjs');

describe('my feature', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = createTempProject();
    });

    afterEach(() => {
        cleanup(tmpDir);
    });

    test('does the thing', () => {
        assert.strictEqual(result, expected);
    });
});
```

**Do NOT use `try/finally` inside test bodies.** It is an anti-pattern in this codebase.

### Fixture Data

Construct multi-line strings with array `join()` to avoid indentation bleed:

```javascript
const content = [
    'line one',
    'line two',
].join('\n');
```

---

## Development Conventions

### File Naming

- Core library: `.cjs`
- Core tests: `.test.cjs`
- SDK source: `.ts`
- Commands / agents / workflows / references: `.md`
- Shell scripts: `.sh` (checked for CRLF/LF issues)

### Security Requirements

- **Path validation:** Use `validatePath()` from `security.cjs` for any user-supplied paths.
- **No shell injection:** Use `execFileSync` (array args) instead of `execSync` (string interpolation).
- **GitHub Actions:** Never use `${{ }}` in `run:` blocks — bind to `env:` first.

### Agent/Command Frontmatter

All `.md` files in `commands/gsd/` and `agents/` must have valid YAML frontmatter. Tests enforce this. If you add or
modify an agent/command, ensure frontmatter passes `agent-frontmatter.test.cjs` and `agent-install-validation.test.cjs`.

### Hooks

When modifying `hooks/*.js`, the `build:hooks` step validates JavaScript syntax via `vm.Script` before copying to
`hooks/dist/`. If syntax validation fails, the build exits with an error. This prevents shipping broken hooks.

---

## CI / CD and GitHub Workflows

The `.github/workflows/` directory contains:

| Workflow                 | Purpose                                                              |
|--------------------------|----------------------------------------------------------------------|
| `test.yml`               | Runs tests on Ubuntu (Node 22, 24) and macOS (Node 24) with coverage |
| `security-scan.yml`      | Security scanning                                                    |
| `pr-gate.yml`            | PR validation                                                        |
| `release.yml`            | Release automation                                                   |
| `branch-naming.yml`      | Enforces branch naming conventions                                   |
| `close-draft-prs.yml`    | Auto-closes draft PRs                                                |
| `require-issue-link.yml` | Enforces issue linkage in PRs                                        |
| `stale.yml`              | Stale issue management                                               |
| `auto-branch.yml`        | Auto-branch creation                                                 |
| `auto-label-issues.yml`  | Auto-labeling                                                        |
| `hotfix.yml`             | Hotfix workflow                                                      |
| `branch-cleanup.yml`     | Branch cleanup                                                       |

**Important:** CI must pass on all matrix jobs. PRs without linked issues are closed automatically.

---

## Contribution Workflow

GSD enforces an **issue-first rule**:

1. **Fixes:** Open a bug report, get `confirmed-bug` label, then fix it with a regression test.
2. **Enhancements:** Open an enhancement issue, get `approved-enhancement` label, then code.
3. **Features:** Open a feature request with a full spec, get `approved-feature` label, then code.

**No code before approval.** PRs without properly labeled linked issues are closed without review.

For full details, see `CONTRIBUTING.md`.

---

## Security Considerations

GSD implements defense-in-depth security:

- **Path traversal prevention** — All user-supplied file paths are validated to resolve within the project directory.
- **Prompt injection detection** — `security.cjs` and `gsd-prompt-guard.js` scan for injection patterns in user-supplied
  text before it enters planning artifacts.
- **Safe JSON parsing** — Malformed arguments are caught before they corrupt state.
- **Shell argument validation** — User text is sanitized before shell interpolation.
- **Secret scanning** — `scripts/secret-scan.sh` runs in CI to catch accidental secret commits.
- **Base64 scanning** — Detects embedded secrets encoded in base64.

Because GSD generates markdown files that become LLM system prompts, any user-controlled text flowing into planning
artifacts is treated as a potential indirect prompt injection vector.

---

## Working with the Installer

`bin/install.js` is a large (~6,600 lines), self-contained Node.js script that handles deployment to 14+ AI runtimes.
It:

- Detects the target runtime via interactive prompt or CLI flags (`--claude`, `--codex`, `--opencode`, etc.)
- Supports `--global` and `--local` installs
- Transforms file content per runtime (tool name mapping, hook event names, agent frontmatter)
- Backs up locally modified files to `gsd-local-patches/`
- Tracks installed files in `gsd-file-manifest.json` for clean uninstall

**Key flags:**

- `--all` — Install to all supported runtimes
- `--sdk` — Also install the GSD SDK CLI (`gsd-sdk`)
- `--uninstall` / `-u` — Remove GSD from the selected runtime(s)

---

## Working with the SDK

The SDK (`sdk/`) is a separate TypeScript package published as `@gsd-build/sdk`. It provides a programmatic interface
for headless GSD execution.

Key source areas:

- `sdk/src/index.ts` — Public API exports
- `sdk/src/cli.ts` — SDK CLI entry point
- `sdk/src/query/` — Query handlers that mirror `gsd-tools.cjs` functionality
- `sdk/src/phase-runner.ts` — Phase execution orchestration
- `sdk/src/prompt-builder.ts` — Prompt assembly
- `sdk/src/context-engine.ts` — Context truncation and enrichment

When modifying SDK code, run both unit and integration tests:

```bash
cd sdk && npm run test:unit && npm run test:integration
```

---

## Common Tasks for Agents

### Adding a new command

1. Create `commands/gsd/my-command.md` with valid YAML frontmatter.
2. Create `get-shit-done/workflows/my-command.md` if an orchestrator is needed.
3. Add tests in `tests/my-command.test.cjs`.
4. Update relevant documentation in `docs/`.

### Adding a new agent

1. Create `agents/gsd-my-agent.md` with valid YAML frontmatter.
2. Reference it from the spawning workflow.
3. Add to `docs/AGENTS.md` if appropriate.
4. Ensure `agent-frontmatter.test.cjs` and install validation tests pass.

### Modifying `gsd-tools.cjs` or a lib module

1. Edit `get-shit-done/bin/lib/<module>.cjs`.
2. Run `npm test` to verify.
3. Run `npm run test:coverage` to ensure coverage stays above 70%.
4. If behavior changes, update `docs/CLI-TOOLS.md`.

### Modifying hooks

1. Edit the source file in `hooks/`.
2. Run `npm run build:hooks`.
3. Verify syntax validation passes.
4. Run related tests (hook tests are in `tests/`).

---

## Useful References

- `docs/ARCHITECTURE.md` — Deep dive into system architecture, data flow, and runtime abstraction
- `docs/AGENTS.md` — Detailed reference for all 24 specialized agents
- `docs/CLI-TOOLS.md` — Complete `gsd-tools.cjs` command reference
- `docs/CONFIGURATION.md` — Full `config.json` schema and defaults
- `docs/COMMANDS.md` — User-facing command reference
- `CONTRIBUTING.md` — Contribution types, process, and standards
