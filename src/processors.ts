import { select } from '@inquirer/prompts';
import fs from 'fs';
import pc from 'picocolors';

import type { CleanupTarget } from './types.js';

export async function processTargetAsync(target: CleanupTarget): Promise<'continue' | 'skip'> {
  if (target.autoRemove) {
    await performCleanupAsync(target);
    return 'continue';
  }

  console.log(pc.cyan(pc.bold(`\n📋 ${target.description}`)));
  console.log(pc.gray(`Path: ${target.path}`));

  if (target.content) {
    console.log(pc.gray('\nContent preview:'));
    console.log(pc.white(target.content));
  }

  showWarnings(target);

  const action = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Keep this file/section', value: 'keep' },
      { name: 'Remove this file/section', value: 'remove' },
      { name: 'Skip remaining files', value: 'skip' },
    ],
  });

  if (action === 'skip') {
    console.log(pc.yellow('Skipping remaining cleanup tasks.'));
    return 'skip';
  }

  if (action === 'remove') {
    await performCleanupAsync(target);
  } else {
    console.log(pc.green(`✅ Kept: ${target.description}`));
  }

  return 'continue';
}

function showWarnings(target: CleanupTarget): void {
  if (target.type === 'app-config') {
    console.log(pc.red(pc.bold('\n⚠️  APP CONFIG DETECTED')));
    console.log(pc.yellow('This file may contain sensitive configuration.'));
    console.log(pc.yellow('Please review the content above carefully.'));
  }

  if (target.type === 'git-hook') {
    console.log(pc.red(pc.bold('\n🚨 GIT HOOK DETECTED - HIGH SECURITY RISK')));
    console.log(pc.yellow('Git hooks are executable scripts that run during git operations.'));
    console.log(pc.yellow('Malicious hooks can execute arbitrary code on your system.'));
    console.log(pc.red('⚠️  STRONGLY RECOMMEND REMOVAL unless you trust the source.'));
  }

  if (target.type === 'source-file') {
    console.log(pc.yellow(pc.bold('\n📄 SOURCE FILE DETECTED')));
    if (target.description.includes('SUSPICIOUS PATTERNS DETECTED')) {
      console.log(pc.red('🚨 SUSPICIOUS PATTERNS FOUND - Review carefully!'));
      console.log(pc.yellow('Look for patterns marked with 🚨 in the content below.'));
    }
    console.log(pc.yellow('Review for malicious code, debugging statements, or secrets.'));
  }
}

async function performCleanupAsync(target: CleanupTarget): Promise<void> {
  try {
    if (target.type === 'package-scripts') {
      await cleanupPackageScriptsAsync(target.path);
    } else {
      const stats = await fs.promises.stat(target.path);
      if (stats.isDirectory()) {
        await fs.promises.rm(target.path, { recursive: true, force: true });
      } else {
        await fs.promises.unlink(target.path);
      }
    }
    console.log(pc.green(`✅ Removed: ${target.description}`));
  } catch (error) {
    console.error(pc.red(`❌ Failed to remove ${target.description}: ${error}`));
  }
}

async function cleanupPackageScriptsAsync(packagePath: string): Promise<void> {
  const content = await fs.promises.readFile(packagePath, 'utf-8');
  const pkg = JSON.parse(content);

  delete pkg.scripts;

  await fs.promises.writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
}
