import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['@fluentui/react-components', '@fluentui/react-icons'],
    alias: { '~@xyflow/react': '@xyflow/react' },
  },
  test: {
    server: { deps: { inline: [/@fluentui\//] } },
  },
});
