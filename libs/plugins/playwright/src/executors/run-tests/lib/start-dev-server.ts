import type { PlaywrightExecutorSchema } from '../schema-types';
import type { ExecutorContext } from '@nrwl/devkit';
import { runExecutor } from '@nrwl/devkit';

export async function* startDevServer(opts: PlaywrightExecutorSchema, context: ExecutorContext) {
  // no dev server, return the provisioned base url
  if (!opts.devServerTarget || opts.skipServe) {
    yield opts.baseUrl;
    return;
  }

  const [project, target, configuration] = opts.devServerTarget.split(':');

  for await (const output of await runExecutor<{
    success: boolean;
    baseUrl?: string;
  }>({ project, target, configuration }, {}, context)) {
    if (!output.success) throw new Error('Could not compile application files');
    yield opts.baseUrl || (output.baseUrl as string);
  }
}
