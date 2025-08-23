import path from 'path';
import pc from 'picocolors';

import { checkAndMaybeRunPrebuildAsync } from './prebuild.js';
import { processTargetAsync } from './processors.js';
import { scanDirectoryAsync } from './scanners.js';

export async function runCleanupAsync(projectRoot: string = process.cwd()): Promise<void> {
  const resolvedDir = path.resolve(projectRoot);

  console.log(pc.blue(pc.bold('🧹 Expo Repro Cleanup')));
  console.log(pc.gray(`Scanning directory: ${resolvedDir}`));
  console.log();

  const cleanupTargets = await scanDirectoryAsync(resolvedDir);

  if (cleanupTargets.length === 0) {
    console.log(pc.green('✅ No cleanup needed - directory is already clean!'));
    return;
  }

  console.log(pc.yellow(`Found ${cleanupTargets.length} items that can be cleaned up:`));
  console.log();

  for (const target of cleanupTargets) {
    const result = await processTargetAsync(target);
    if (result === 'skip') {
      break;
    }
  }

  console.log();
  console.log(pc.green(pc.bold('🎉 Cleanup completed!')));

  await checkAndMaybeRunPrebuildAsync(resolvedDir);
}
