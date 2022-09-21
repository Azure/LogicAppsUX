import type { PackageRunner } from '../../types';

export interface PlaywrightExecutorSchema {
  e2eFolder: string;
  devServerTarget?: string;
  baseUrl?: string;
  slowMo?: number;
  devtools?: boolean;
  headed?: boolean;
  reporter?: string;
  browser?: 'chromium' | 'firefox' | 'webkit' | 'all';
  packageRunner?: PackageRunner;
  timeout?: number;
  skipServe?: boolean;
}
