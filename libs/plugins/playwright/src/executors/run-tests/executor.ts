import { startDevServer } from './lib/start-dev-server';
import type { PlaywrightExecutorSchema } from './schema-types';
import executorSchema from './schema.json';
import type { ExecutorContext } from '@nrwl/devkit';
import { exec } from 'child_process';
import { promisify } from 'util';

function getFlags(options: PlaywrightExecutorSchema): string {
  const headedOption = options.headed === true ? '--headed' : '';
  const browserOption = options.browser?.length ? `--browser=${options.browser}` : '';
  const reporterOption = options.reporter?.length ? `--reporter=${options.reporter}` : '';
  const timeoutOption = options.timeout !== undefined ? `--timeout=${options.timeout}` : '';

  const flagStrings = [headedOption, browserOption, reporterOption, timeoutOption].filter(Boolean);

  return flagStrings.join(' ');
}

const runPlaywright = async (baseUrl: string, options: PlaywrightExecutorSchema) => {
  try {
    const flags = getFlags(options);
    const runnerCommand = options.packageRunner ?? executorSchema.properties.packageRunner.default;

    const { stdout, stderr } = await promisify(exec)(
      `${runnerCommand} playwright test src --config ${options.e2eFolder}/playwright.config.ts ${flags}`.trim()
    );

    console.info(`Playwright output ${stdout}`);
    if (stderr) {
      console.error(`Playwright errors ${stderr}`);
    }
    console.log('passed');
    return stdout.includes('passed');
  } catch (error) {
    console.error('Unexpected error', error);
    return false;
  }
};
export default async function executor(options: PlaywrightExecutorSchema, context: ExecutorContext) {
  await startDevServer(options, context);
  let success;
  for await (const baseUrl of startDevServer(options, context)) {
    try {
      success = await runPlaywright(baseUrl, options);
    } catch (e) {
      console.error(e.message);
      success = false;
    }
  }

  return { success };
}
