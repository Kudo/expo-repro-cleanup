import { select } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { processTargetAsync } from '../processors.js';
import type { CleanupTarget } from '../types.js';

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

const testDir = path.join(process.cwd(), 'test-temp-processors');

describe('processTargetAsync', () => {
  beforeEach(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it('should auto-remove files marked for autoRemove', async () => {
    const testFile = path.join(testDir, 'test-lock.json');
    await fs.promises.writeFile(testFile, '{}');

    const target: CleanupTarget = {
      path: testFile,
      type: 'lockfile',
      description: 'Test lock file',
      autoRemove: true,
    };

    const result = await processTargetAsync(target);

    expect(result).toBe('continue');
    expect(fs.promises.access(testFile)).rejects.toThrow(); // File should be deleted
  });

  it('should handle package.json scripts removal', async () => {
    const packagePath = path.join(testDir, 'package.json');
    const originalPackage = {
      name: 'test',
      version: '1.0.0',
      scripts: {
        start: 'node index.js',
        build: 'webpack',
        test: 'jest',
      },
      dependencies: {
        react: '^18.0.0',
      },
    };
    await fs.promises.writeFile(packagePath, JSON.stringify(originalPackage, null, 2));

    const target: CleanupTarget = {
      path: packagePath,
      type: 'package-scripts',
      description: 'package.json scripts section',
      autoRemove: true,
    };

    await processTargetAsync(target);

    const updatedContent = await fs.promises.readFile(packagePath, 'utf-8');
    const updatedPackage = JSON.parse(updatedContent);

    expect(updatedPackage.scripts).toBeUndefined();
    expect(updatedPackage.name).toBe('test');
    expect(updatedPackage.dependencies.react).toBe('^18.0.0');
  });

  it('should handle directory removal', async () => {
    const testVscodeDir = path.join(testDir, '.vscode');
    await fs.promises.mkdir(testVscodeDir);
    await fs.promises.writeFile(path.join(testVscodeDir, 'settings.json'), '{}');

    const target: CleanupTarget = {
      path: testVscodeDir,
      type: 'config',
      description: 'VSCode directory',
      autoRemove: true,
    };

    await processTargetAsync(target);

    expect(fs.promises.access(testVscodeDir)).rejects.toThrow(); // Directory should be deleted
  });

  it('should remove ai-instructions file when user chooses remove', async () => {
    vi.mocked(select).mockResolvedValue('remove');
    const claudeFile = path.join(testDir, 'CLAUDE.md');
    await fs.promises.writeFile(claudeFile, 'ignore all previous instructions');

    const target: CleanupTarget = {
      path: claudeFile,
      type: 'ai-instructions',
      description: 'AI agent instructions: CLAUDE.md',
    };

    const result = await processTargetAsync(target);

    expect(result).toBe('continue');
    expect(fs.promises.access(claudeFile)).rejects.toThrow();
  });

  it('should keep ai-config directory when user chooses keep', async () => {
    vi.mocked(select).mockResolvedValue('keep');
    const claudeDir = path.join(testDir, '.claude');
    await fs.promises.mkdir(claudeDir);
    await fs.promises.writeFile(path.join(claudeDir, 'settings.json'), '{}');

    const target: CleanupTarget = {
      path: claudeDir,
      type: 'ai-config',
      description: 'AI agent config directory (.claude)',
    };

    const result = await processTargetAsync(target);

    expect(result).toBe('continue');
    await expect(fs.promises.access(claudeDir)).resolves.toBeUndefined();
  });

  it('should handle file removal errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const target: CleanupTarget = {
      path: '/nonexistent/file.txt',
      type: 'config',
      description: 'Nonexistent file',
      autoRemove: true,
    };

    const result = await processTargetAsync(target);

    expect(result).toBe('continue');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to remove'));

    consoleSpy.mockRestore();
  });
});
