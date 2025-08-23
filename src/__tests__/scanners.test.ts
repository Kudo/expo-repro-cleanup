import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { scanDirectoryAsync } from '../scanners.js';

const testDir = path.join(process.cwd(), 'test-temp');

describe('scanDirectoryAsync', () => {
  beforeEach(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it('should detect lock files', async () => {
    await fs.promises.writeFile(path.join(testDir, 'package-lock.json'), '{}');
    await fs.promises.writeFile(path.join(testDir, 'yarn.lock'), '');

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(2);
    expect(targets[0].type).toBe('lockfile');
    expect(targets[0].autoRemove).toBe(true);
    expect(targets[1].type).toBe('lockfile');
    expect(targets[1].autoRemove).toBe(true);
  });

  it('should detect config files', async () => {
    await fs.promises.writeFile(path.join(testDir, 'eslint.config.js'), 'module.exports = {}');
    await fs.promises.writeFile(path.join(testDir, '.babelrc'), '{}');

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(2);
    expect(targets.every((t) => t.type === 'config')).toBe(true);
    expect(targets.every((t) => !t.autoRemove)).toBe(true);
  });

  it('should detect app config files', async () => {
    await fs.promises.writeFile(path.join(testDir, 'app.config.js'), 'export default {}');

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('app-config');
    expect(targets[0].description).toContain('app.config.js');
  });

  it('should detect package.json with scripts', async () => {
    const pkg = {
      name: 'test',
      scripts: {
        start: 'node index.js',
        build: 'webpack',
      },
    };
    await fs.promises.writeFile(path.join(testDir, 'package.json'), JSON.stringify(pkg, null, 2));

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('package-scripts');
    expect(targets[0].content).toContain('start');
  });

  it('should detect .vscode directory', async () => {
    await fs.promises.mkdir(path.join(testDir, '.vscode'));
    await fs.promises.writeFile(path.join(testDir, '.vscode', 'settings.json'), '{}');

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('config');
    expect(targets[0].description).toContain('.vscode');
    expect(targets[0].autoRemove).toBe(true);
  });

  it('should detect git hooks', async () => {
    const gitDir = path.join(testDir, '.git');
    const hooksDir = path.join(gitDir, 'hooks');
    await fs.promises.mkdir(hooksDir, { recursive: true });
    await fs.promises.writeFile(path.join(hooksDir, 'pre-commit'), '#!/bin/sh\necho "test"');

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('git-hook');
    expect(targets[0].description).toContain('pre-commit');
  });

  it('should ignore git hook .sample files', async () => {
    const gitDir = path.join(testDir, '.git');
    const hooksDir = path.join(gitDir, 'hooks');
    await fs.promises.mkdir(hooksDir, { recursive: true });
    await fs.promises.writeFile(path.join(hooksDir, 'pre-commit.sample'), '#!/bin/sh\necho "test"');

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(0);
  });
});
