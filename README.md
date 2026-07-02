# expo-repro-cleanup

🧹 Cleanup tool for Expo reproduction examples - removes potentially unsafe files and configurations before running untrusted code.

## Usage

```bash
bunx expo-repro-cleanup
```

### Example Workflow

```bash
# 1. Clone a reproduction repo
git clone https://github.com/someone/expo-issue-repro.git
cd expo-issue-repro

# 2. Run cleanup (interactive)
bunx expo-repro-cleanup
```

## What it checks

- **Lock files** and IDE settings (`.vscode/`) — auto-removed as noise
- **Build/app configs** — `metro.config.js`, `babel.config.js`, `app.config.*`, etc.
- **`package.json` scripts** and root source files with suspicious patterns
- **Git hooks** — scripts that run automatically during git operations
- **AI agent files** — `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `.mcp.json`, and
  `.claude/`. A malicious repro can use these to inject prompts into (or run commands
  through) any AI coding agent you point at it. Their contents are never printed, since
  echoing them could inject the agent running this tool.
