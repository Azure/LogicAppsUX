# VS Code Task Env Propagation (PATH, node, func host start)

Curated learnings from PR #9164 about how the VS Code extension emits the `func: host start`
task and how `options.env` propagates (or fails to propagate) PATH across Windows / Linux / macOS.
Misuse of `options.env.PATH` produced an `InlineCodeDependencyGeneratorFailure` on Linux that
looked like a "node not on PATH" runtime bug for **the entire 9164 investigation arc**
before being root-caused.

## Triggers → use this file

- `func: host start` task generation, `tasks.json`, `.vscode/launch.json`
- `InlineCodeDependencyGeneratorFailure` / "node not found on PATH" inside the Functions runtime
- `languageWorkers__node__defaultExecutablePath`
- Anything emitting `options.env` for a VS Code task
- Cross-platform PATH/env work in the extension host (Windows `;` vs POSIX `:`, `\` vs `/`)
- `validateInlineCodeNodePath`, `validatePreDebug.ts`

## Core Sources

- `apps/vs-code-designer/src/app/utils/codeless/funcHostTaskEnv.ts` — `getFuncHostTaskEnv()` (introduced in commit `b1b094abd`)
- `apps/vs-code-designer/src/app/utils/codeless/funcHostTaskEnv.spec.ts` — pure-function unit coverage
- `apps/vs-code-designer/src/app/commands/.../validatePreDebug.ts` — `validateInlineCodeNodePath()`
- VS Code task schema docs: platform-keyed `windows` / `linux` / `osx` blocks for task customization
- Commit `b1b094abd`: `fix(vscode): use platform-keyed PATH in func host start task to fix InlineCodeDependencyGeneratorFailure on Linux`

## The Bug

The extension emitted a Windows-style PATH literal into the `func: host start` task's
`options.env.PATH`, for example (illustrative):

```
"\\NodeJs;...\\DotNetSDK;$env:PATH"
```

On Windows that string is acceptable (semicolon-separated, backslashes, PowerShell-style
variable expansion). On **Linux** and **macOS** runners the same string was emitted verbatim
and:

- VS Code wrote it into the task `env` as a literal string.
- The shell that launched `func` saw `PATH` set to that literal — backslashes, semicolons,
  un-expanded `$env:PATH` — which **clobbered** the inherited PATH.
- `func` then could not find `node`, so the inline-code dependency generator failed with
  `InlineCodeDependencyGeneratorFailure`.

The misleading part: a test step would print PATH correctly and `which node` would work,
because that was the **test runner's** PATH, not the PATH inherited by the task spawned via VS Code.

## The Fix

Emit a **platform-keyed** task using VS Code's documented task schema. `getFuncHostTaskEnv()`
returns the right block per platform:

- `windows`: `;` separator, `\` separators, `${env:PATH}` (VS Code variable, not PowerShell).
- `linux`/`osx`: `:` separator, `/` separators, `${env:PATH}`.

The single source of truth is `apps/vs-code-designer/src/app/utils/codeless/funcHostTaskEnv.ts`.
Keep this file **pure** (no `vscode` imports) so it stays vitest-testable — see the coverage rule
in `ci-patterns.md`.

## Belt-and-Braces: `languageWorkers__node__defaultExecutablePath`

The extension also sets `languageWorkers__node__defaultExecutablePath` in `local.settings.json`
so that even if PATH resolution fails inside `func`, the node worker has an absolute path to
fall back to. See `validateInlineCodeNodePath()` in `validatePreDebug.ts`.

Use both:

1. Correct platform-keyed PATH in the task (so PATH is *actually* correct).
2. `languageWorkers__node__defaultExecutablePath` in `local.settings.json` (so a broken PATH
   does not cause inline-code dependency generation to fail).

## Verification Trick

If a "node not on PATH" error reproduces despite the test step proving node is on PATH:

```bash
env -i /usr/bin/node --version   # proves node resolves from an empty environment
```

If that succeeds and the runtime **still** says "node not on PATH," the bug is in the task's
`options.env`, not in the runner's PATH. That diagnostic alone would have saved most of the
PR #9164 debugging — see the "Diagnostics-First Discipline" section in `vscode-e2e-testing.md`.

## Anti-Patterns

- Emitting `options.env.PATH` as a single cross-platform string. Always use the platform-keyed
  task schema.
- Using `$env:PATH` (PowerShell) instead of `${env:PATH}` (VS Code variable substitution).
- Using `;` as a separator on Linux/macOS or `:` on Windows.
- Asserting "PATH is fine" from the test runner's environment — the task runs in a different
  child process with VS Code-emitted env.

## Applies to

`vscode`, `shared-services`, `test`, `vscode-test-specialist`, `senior-swe-critic`.

## Status

Verified. Root-caused and fixed in PR #9164 commit `b1b094abd`. Unit tested in
`funcHostTaskEnv.spec.ts`.
