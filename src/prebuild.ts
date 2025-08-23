import { select } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

export async function checkAndMaybeRunPrebuildAsync(projectRoot: string): Promise<void> {
  try {
    const iosDir = path.join(projectRoot, 'ios');
    const androidDir = path.join(projectRoot, 'android');

    const [iosExists, androidExists] = await Promise.all([
      fs.promises
        .access(iosDir)
        .then(() => true)
        .catch(() => false),
      fs.promises
        .access(androidDir)
        .then(() => true)
        .catch(() => false),
    ]);

    if (iosExists || androidExists) {
      console.log(pc.blue(pc.bold('\n📱 Bare Project Detected')));
      console.log(pc.yellow('Found ios/ and/or android/ directories.'));
      console.log(
        pc.yellow('This is a bare project. Running clean prebuild will regenerate native code.')
      );
      console.log(pc.yellow('You can review changes with `git diff` after prebuild completes.'));

      const shouldPrebuild = await select({
        message:
          'Run `bash -c "yes | npx expo prebuild --clean"` to regenerate native directories?',
        choices: [
          { name: 'Yes, run prebuild --clean', value: 'yes' },
          { name: 'No, skip prebuild', value: 'no' },
        ],
      });

      if (shouldPrebuild === 'yes') {
        await runPrebuildAsync(projectRoot);
      } else {
        console.log(pc.yellow('Skipped prebuild.'));
      }
    }
  } catch (error) {
    console.warn(pc.yellow(`Warning: Could not check for bare project: ${error}`));
  }
}

async function runPrebuildAsync(projectRoot: string): Promise<void> {
  console.log(pc.blue('\n🔄 Running expo prebuild --clean...'));

  try {
    const proc = Bun.spawn(['bash', '-c', 'yes | npx expo prebuild --clean'], {
      cwd: projectRoot,
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log(pc.green('\n✅ Prebuild completed successfully!'));
    } else {
      console.error(pc.red(`\n❌ Prebuild failed with exit code ${exitCode}`));
    }
  } catch (error) {
    console.error(pc.red(`\n❌ Prebuild failed: ${error}`));
  }
}
