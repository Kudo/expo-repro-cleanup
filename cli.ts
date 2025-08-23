#!/usr/bin/env bun

import pc from 'picocolors';
import { runCleanupAsync } from './src/index.js';

async function main() {
  const projectRoot = process.argv[2] || process.cwd();

  try {
    await runCleanupAsync(projectRoot);
  } catch (error) {
    console.error(pc.red(pc.bold('💥 Fatal error:')), error);
    process.exit(1);
  }
}

main().catch(console.error);
