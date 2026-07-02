# expo-repro-cleanup

🧹 Cleanup tool for Expo reproduction examples - removes potentially unsafe files and configurations before running untrusted code.

## Usage

```bash
bunx expo-repro-cleanup
```

By default it runs **interactively**, prompting before each change. Pass
`--non-interactive` (or set `CI`, so it works out of the box in CI) to clean without
prompts: it removes attack-surface and noise files automatically, and for a bare
project runs `expo prebuild --clean` to regenerate native code. Since the repo is under
git, you can review everything with `git diff`.

```
Options:
  -h, --help          Show this help message
  --version           Show version number
  --non-interactive   Run without prompts, cleaning automatically
                      (also enabled when the CI env var is set)
  --no-prebuild       Do not run `expo prebuild --clean` for bare projects
```

### Example Workflow

```bash
# 1. Clone a reproduction repo
git clone https://github.com/someone/expo-issue-repro.git
cd expo-issue-repro

# 2. Step through each change interactively (default)
bunx expo-repro-cleanup

# ...or clean automatically, then review what changed
bunx expo-repro-cleanup --non-interactive    # or: CI=1 bunx expo-repro-cleanup
git diff
```

## What it checks

In interactive mode (the default) you're prompted to keep or remove each item below.
With `--non-interactive` or `CI` set, the tool decides automatically:

Removed automatically (attack surface / noise — not needed to run the app):

- **Lock files** and IDE settings (`.vscode/`)
- **Build configs** — `metro.config.js`, `babel.config.js`, `.eslintrc.js`,
  `eslint.config.js`, `tsconfig.json`, etc. A config whose contents exactly match the
  pristine Expo default is left untouched; only *customized* configs are removed.
- **Git hooks** — scripts that run automatically during git operations
- **AI agent files** — `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `.mcp.json`, and
  `.claude/`. A malicious repro can use these to inject prompts into (or run commands
  through) any AI coding agent you point at it. Their contents are never printed, since
  echoing them could inject the agent running this tool.

Kept and printed for you to review (integral to the repro):

- **`app.config.*`**, **`package.json` scripts**, and root source files — including
  source files flagged with 🚨 suspicious patterns.
