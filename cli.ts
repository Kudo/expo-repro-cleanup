#!/usr/bin/env bun

import pc from 'picocolors';
import { parseArgs } from 'util';

import packageJson from './package.json' with { type: 'json' };
import { runCleanupAsync } from './src/index.js';

function showHelp() {
  console.log(`${pc.bold('expo-repro-cleanup')} v${packageJson.version}

${packageJson.description}

Usage: expo-repro-cleanup [options] [project-root]

Options:
  -h, --help     Show this help message
  --version      Show version number

Arguments:
  project-root   Path to the project (default: current directory)`);
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

  const entryPointIndex = positionals.findIndex((arg) => arg.endsWith('cli.ts'));
  const args = entryPointIndex >= 0 ? positionals.slice(entryPointIndex + 1) : [];
  const projectRoot = args[0] || process.cwd();

  try {
    await runCleanupAsync(projectRoot);
  } catch (error) {
    console.error(pc.red(pc.bold('💥 Fatal error:')), error);
    process.exit(1);
  }
}

main().catch(console.error);
