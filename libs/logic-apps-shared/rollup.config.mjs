// @ts-check

import { defineConfig } from 'rollup';
import { buildConfigs } from '../../scripts/getRollupConfig.js';

export default defineConfig(
  buildConfigs({
    name: 'logic-apps-shared',
    jsName: 'LogicAppsShared',
    outputFile: 'index',
    entryFile: 'src/index.ts',
    external: ['react'],
    globals: {
      react: 'React',
    },
  })
);
