import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: { noExternal: [/@fluentui\//] },
  test: {
    projects: [{ extends: true, test: { name: 'azure-standard-management' } }],
    environment: 'jsdom',
    include: [
      'apps/Standalone/src/designer/app/AzureLogicAppsDesigner/__test__/*.spec.ts?(x)',
      'apps/Standalone/src/designer/app/LocalDesigner/__test__/*.spec.ts?(x)',
    ],
    setupFiles: ['libs/shared-test-utils/fluentui-react-icons-mock.ts'],
    server: { deps: { inline: [/@fluentui\//] } },
    restoreMocks: true,
  },
});
