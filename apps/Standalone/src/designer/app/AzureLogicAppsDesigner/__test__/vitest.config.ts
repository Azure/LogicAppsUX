import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [{ extends: true, test: { name: 'azure-standard-management' } }],
    environment: 'jsdom',
    include: [
      'apps/Standalone/src/designer/app/AzureLogicAppsDesigner/__test__/*.spec.ts?(x)',
      'apps/Standalone/src/designer/app/LocalDesigner/__test__/standardManagementHost.spec.tsx',
    ],
    restoreMocks: true,
  },
});
