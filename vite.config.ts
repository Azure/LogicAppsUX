import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import {resolve} from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@designer": resolve(__dirname, "src"),
    },
  },
  plugins: [reactRefresh()]
})
