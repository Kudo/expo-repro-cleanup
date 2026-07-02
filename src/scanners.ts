import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

import type { CleanupTarget } from './types.js';

export async function scanDirectoryAsync(projectRoot: string): Promise<CleanupTarget[]> {
  const cleanupTargets: CleanupTarget[] = [];

  try {
    const files = await fs.promises.readdir(projectRoot);

    for (const file of files) {
      const filePath = path.join(projectRoot, file);
      const stats = await fs.promises.stat(filePath);

      if (stats.isFile()) {
        const target = await analyzeFileAsync(file, filePath);
        if (target) {
          cleanupTargets.push(target);
        }
      } else if (stats.isDirectory() && file === '.git') {
        const gitTargets = await scanGitDirectoryAsync(filePath);
        cleanupTargets.push(...gitTargets);
      } else if (stats.isDirectory() && file === '.vscode') {
        cleanupTargets.push({
          path: filePath,
          type: 'config',
          description: 'VSCode settings directory (.vscode)',
          content: 'Contains IDE-specific settings and configurations',
          autoRemove: true,
        });
      } else if (stats.isDirectory() && file === '.claude') {
        // Can hold hooks, MCP configs, custom commands, and agent instructions
        // that run automatically once an AI agent opens the repo.
        cleanupTargets.push({
          path: filePath,
          type: 'ai-config',
          description: 'AI agent config directory (.claude)',
        });
      }
    }
  } catch (error) {
    console.error(pc.red(`Error scanning directory: ${error}`));
    process.exit(1);
  }

  return cleanupTargets;
}

async function scanGitDirectoryAsync(gitDir: string): Promise<CleanupTarget[]> {
  const gitTargets: CleanupTarget[] = [];

  try {
    const hooksDir = path.join(gitDir, 'hooks');
    try {
      const hookFiles = await fs.promises.readdir(hooksDir);

      for (const hookFile of hookFiles) {
        if (hookFile.endsWith('.sample')) continue;

        const hookPath = path.join(hooksDir, hookFile);
        const stats = await fs.promises.stat(hookPath);

        if (stats.isFile()) {
          const content = await fs.promises.readFile(hookPath, 'utf-8');
          gitTargets.push({
            path: hookPath,
            type: 'git-hook',
            description: `Git hook: ${hookFile}`,
            content: content.length > 500 ? content.substring(0, 500) + '...' : content,
          });
        }
      }
    } catch {
      // Hooks directory doesn't exist or can't be read
    }
  } catch (error) {
    console.warn(pc.yellow(`Warning: Could not scan .git directory: ${error}`));
  }

  return gitTargets;
}

async function analyzeFileAsync(filename: string, filePath: string): Promise<CleanupTarget | null> {
  // AI coding agents auto-load these as instructions, so a malicious repro can use
  // them to hijack the agent. We intentionally skip reading the content: echoing an
  // untrusted instruction file to stdout could inject the very agent running this tool.
  const aiInstructionFiles = ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md'];

  if (aiInstructionFiles.includes(filename)) {
    return {
      path: filePath,
      type: 'ai-instructions',
      description: `AI agent instructions: ${filename}`,
    };
  }

  if (filename === '.mcp.json') {
    return {
      path: filePath,
      type: 'ai-config',
      description: 'MCP server config: .mcp.json',
    };
  }

  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb'];

  if (lockFiles.includes(filename)) {
    return {
      path: filePath,
      type: 'lockfile',
      description: `Lock file: ${filename}`,
      autoRemove: true,
    };
  }

  const configFiles = [
    'eslint.config.js',
    '.eslintrc.js',
    'metro.config.js',
    'babel.config.js',
    '.babelrc',
    'tsconfig.json',
  ];

  if (configFiles.includes(filename)) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return {
      path: filePath,
      type: 'config',
      description: `Config file: ${filename}`,
      content: content.length > 500 ? content.substring(0, 500) + '...' : content,
    };
  }

  if (filename === 'app.config.js' || filename === 'app.config.ts') {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return {
      path: filePath,
      type: 'app-config',
      description: `App config: ${filename}`,
      content,
    };
  }

  if (filename === 'package.json') {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    try {
      const pkg = JSON.parse(content);
      if (pkg.scripts && Object.keys(pkg.scripts).length > 0) {
        return {
          path: filePath,
          type: 'package-scripts',
          description: 'package.json scripts section',
          content: JSON.stringify(pkg.scripts, null, 2),
        };
      }
    } catch (error) {
      console.warn(pc.yellow(`Warning: Could not parse package.json: ${error}`));
    }
  }

  if (filename.endsWith('.ts') || filename.endsWith('.js')) {
    return await analyzeSourceFileAsync(filename, filePath);
  }

  return null;
}

async function analyzeSourceFileAsync(filename: string, filePath: string): Promise<CleanupTarget> {
  const content = await fs.promises.readFile(filePath, 'utf-8');

  const suspiciousPatterns = [
    /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
    /import.*child_process/gi,
    /spawn|exec|fork/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /process\.exit/gi,
    /fs\.unlink|fs\.rm|fs\.rmdir/gi,
    /\.deleteFile|\.delete/gi,
    /system\s*\(/gi,
    /shell\s*\(/gi,
    /\.env\s*\[/gi,
    /process\.env\./gi,
    /Buffer\.from.*base64/gi,
    /atob|btoa/gi,
    /crypto\./gi,
    /net\.|http\.|https\./gi,
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /WebSocket/gi,
    /require.*\.\./gi,
  ];

  const foundPatterns = suspiciousPatterns.filter((pattern) => pattern.test(content));

  let displayContent = content.length > 1000 ? content.substring(0, 1000) + '...' : content;

  if (foundPatterns.length > 0) {
    suspiciousPatterns.forEach((pattern) => {
      displayContent = displayContent.replace(pattern, (match) => {
        return `🚨${match}🚨`;
      });
    });
  }

  return {
    path: filePath,
    type: 'source-file',
    description: `Source file: ${filename}${
      foundPatterns.length > 0 ? ' (⚠️ SUSPICIOUS PATTERNS DETECTED)' : ''
    }`,
    content: displayContent,
  };
}
