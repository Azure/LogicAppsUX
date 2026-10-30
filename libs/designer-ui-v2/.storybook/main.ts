import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  docs: { defaultName: 'Overview' },
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    return mergeConfig(viteConfig, {
      resolve: {
        alias: [
          {
            find: /^@microsoft\/designer-ui-v2\/metrics$/,
            replacement: fileURLToPath(new URL('../src/metrics.ts', import.meta.url)),
          },
          {
            find: /^@microsoft\/designer-ui-v2$/,
            replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)),
          },
        ],
        dedupe: [...(viteConfig.resolve?.dedupe ?? []), 'react', 'react-dom', '@fluentui/react-components', '@fluentui/react-icons'],
      },
    });
  },
};

export default config;
