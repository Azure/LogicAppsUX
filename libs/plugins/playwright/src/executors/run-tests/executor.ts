import { startDevServer } from './lib/start-dev-server';
import type { PlaywrightExecutorSchema } from './schema-types';
import executorSchema from './schema.json';
import type { ExecutorContext } from '@nx/devkit';
import { exec } from 'child_process';
import { promisify } from 'util';

function getFlags(options: PlaywrightExecutorSchema): string {
  const headedOption = options.headed === true ? '--headed' : '';
  const browserOption = options.browser?.length ? `--browser=${options.browser}` : '';
  const reporterOption = options.reporter?.length ? `--reporter=${options.reporter}` : '';
  const timeoutOption = options.timeout !== undefined ? `--timeout=${options.timeout}` : '';
  const updateSnapshots = options.updateSnapshots ? '--update-snapshots' : '';
  const flagStrings = [headedOption, browserOption, reporterOption, timeoutOption, updateSnapshots].filter(Boolean);

  return flagStrings.join(' ');
}

const runPlaywright = async (baseUrl: string, options: PlaywrightExecutorSchema) => {
  try {
    const flags = getFlags(options);
    const runnerCommand = options.packageRunner ?? executorSchema.properties.packageRunner.default;

    const { stdout, stderr } = await promisify(exec)(
      `${runnerCommand} playwright test src --config ${options.e2eFolder}/playwright.config.ts ${flags}`.trim()
    );

    console.info(`${stdout}`);
    if (stderr) {
      console.log(stderr);
      return false;
    }
    return stdout.includes('passed');
  } catch (error) {
    console.log(error.stdout);
    return false;
  }
};
export default async function executor(options: PlaywrightExecutorSchema, context: ExecutorContext) {
  let success;
  for await (const baseUrl of startDevServer(options, context)) {
    try {
      success = await runPlaywright(baseUrl, options);
      break;
    } catch (e) {
      console.error(e.message);
      success = false;
      break;
    }
  }

  return { success };
}
