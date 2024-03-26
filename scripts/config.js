// @ts-check

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const packages = [
  {
    name: '@microsoft/logic-apps-chatbot',
    packageDir: 'libs/chatbot',
  },
  {
    name: '@microsoft/logic-apps-data-mapper',
    packageDir: 'libs/data-mapper',
  },
  {
    name: '@microsoft/logic-apps-designer',
    packageDir: 'libs/designer',
  },
  {
    name: '@microsoft/designer-ui',
    packageDir: 'libs/designer-ui',
  },
  {
    name: '@microsoft/logic-apps-shared',
    packageDir: 'libs/logic-apps-shared',
  },
  {
    name: '@microsoft/vscode-extension-logic-apps',
    packageDir: 'extensions/vscode-extension',
  },
];

export const branchConfigs = {
  main: {
    prerelease: false,
  },
  next: {
    prerelease: true,
  },
  beta: {
    prerelease: true,
  },
  alpha: {
    prerelease: true,
  },
};

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const rootDir = resolve(__dirname, '..');
