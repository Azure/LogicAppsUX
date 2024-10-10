import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'libs/*',
  'libs/data-mapper-v2/vitest.config.ts',
  'libs/designer/vitest.config.ts',
  'libs/designer-ui/vitest.config.ts',
  'libs/vscode-extension/vitest.config.ts',
]);
