#!/usr/bin/env bun

import pc from 'picocolors';
import { parseArgs } from 'util';

import packageJson from './package.json' with { type: 'json' };
import { runCleanupAsync } from './src/index.js';

function showHelp() {
  console.log(`${pc.bold('expo-repro-cleanup')} v${packageJson.version}

${packageJson.description}

Usage: expo-repro-cleanup [options] [project-path]

Options:
  -h, --help     Show this help message
  --version      Show version number

Arguments:
  project-path   Path to the Expo project (default: current directory)`);
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
      version: {
        type: 'boolean',
      },
    },
    strict: false,
    allowPositionals: true,
  });

  if (values.version) {
    console.log(packageJson.version);
    return;
  }

  if (values.help) {
    showHelp();
    return;
  }

  // Get project path from positionals (skip the first two which are bun and script path)
  const projectRoot = positionals[2] || process.cwd();

  try {
    await runCleanupAsync(projectRoot);
  } catch (error) {
    console.error(pc.red(pc.bold('💥 Fatal error:')), error);
    process.exit(1);
  }
}

main().catch(console.error);
