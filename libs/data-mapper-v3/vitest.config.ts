import path from 'node:path';
import { defineProject } from 'vitest/config';
import packageJson from './package.json';

export default defineProject({
  ssr: { noExternal: [/@fluentui\//] },
  test: {
    name: packageJson.name,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    server: { deps: { inline: [/@fluentui\//] } },
  },
  resolve: {
    alias: { vscode: path.resolve(__dirname, 'test/__mocks__/vscode.ts') },
  },
});
