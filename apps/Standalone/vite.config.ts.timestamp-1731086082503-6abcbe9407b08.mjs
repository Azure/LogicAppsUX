// vite.config.ts
import { defineConfig } from "file:///C:/Users/wue/LogicAppsUX/node_modules/.pnpm/vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/wue/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { NodeGlobalsPolyfillPlugin } from "file:///C:/Users/wue/LogicAppsUX/node_modules/.pnpm/@esbuild-plugins+node-globals-polyfill@0.2.3_esbuild@0.20.2/node_modules/@esbuild-plugins/node-globals-polyfill/dist/index.js";
import nodePolyfills from "file:///C:/Users/wue/LogicAppsUX/node_modules/.pnpm/rollup-plugin-polyfill-node@0.13.0_rollup@4.16.4/node_modules/rollup-plugin-polyfill-node/dist/index.js";
import { nodePolyfills as np } from "file:///C:/Users/wue/LogicAppsUX/node_modules/.pnpm/vite-plugin-node-polyfills@0.21.0_rollup@4.16.4_vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/vite-plugin-node-polyfills/dist/index.js";
import mkcert from "file:///C:/Users/wue/LogicAppsUX/node_modules/.pnpm/vite-plugin-mkcert@1.17.5_vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
var vite_config_default = defineConfig({
  resolve: {
    alias: [
      {
        find: "~@xyflow/react",
        replacement: "@xyflow/react"
      }
    ]
  },
  plugins: [
    react(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true
    }),
    np(),
    mkcert()
  ],
  server: {
    port: 4200
  },
  define: {
    global: "globalThis",
    "process.env": {}
  },
  build: {
    // sourcemap: true,
    minify: false,
    rollupOptions: {
      plugins: [nodePolyfills()]
      //external: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/react-query-devtools'],
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx3dWVcXFxcTG9naWNBcHBzVVhcXFxcYXBwc1xcXFxTdGFuZGFsb25lXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx3dWVcXFxcTG9naWNBcHBzVVhcXFxcYXBwc1xcXFxTdGFuZGFsb25lXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy93dWUvTG9naWNBcHBzVVgvYXBwcy9TdGFuZGFsb25lL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbiB9IGZyb20gJ0Blc2J1aWxkLXBsdWdpbnMvbm9kZS1nbG9iYWxzLXBvbHlmaWxsJztcbmltcG9ydCBub2RlUG9seWZpbGxzIGZyb20gJ3JvbGx1cC1wbHVnaW4tcG9seWZpbGwtbm9kZSc7XG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIGFzIG5wIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xuaW1wb3J0IG1rY2VydCBmcm9tICd2aXRlLXBsdWdpbi1ta2NlcnQnO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiBbXG4gICAgICB7XG4gICAgICAgIGZpbmQ6ICd+QHh5Zmxvdy9yZWFjdCcsXG4gICAgICAgIHJlcGxhY2VtZW50OiAnQHh5Zmxvdy9yZWFjdCcsXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIE5vZGVHbG9iYWxzUG9seWZpbGxQbHVnaW4oe1xuICAgICAgcHJvY2VzczogdHJ1ZSxcbiAgICAgIGJ1ZmZlcjogdHJ1ZSxcbiAgICB9KSxcbiAgICBucCgpLFxuICAgIG1rY2VydCgpLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiA0MjAwLFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICBnbG9iYWw6ICdnbG9iYWxUaGlzJyxcbiAgICAncHJvY2Vzcy5lbnYnOiB7fSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBzb3VyY2VtYXA6IHRydWUsXG4gICAgbWluaWZ5OiBmYWxzZSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBwbHVnaW5zOiBbbm9kZVBvbHlmaWxscygpXSxcbiAgICAgIC8vZXh0ZXJuYWw6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsICdAdGFuc3RhY2svcmVhY3QtcXVlcnktZGV2dG9vbHMnXSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNULFNBQVMsb0JBQW9CO0FBQ25WLE9BQU8sV0FBVztBQUNsQixTQUFTLGlDQUFpQztBQUMxQyxPQUFPLG1CQUFtQjtBQUMxQixTQUFTLGlCQUFpQixVQUFVO0FBQ3BDLE9BQU8sWUFBWTtBQUduQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTDtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYTtBQUFBLE1BQ2Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sMEJBQTBCO0FBQUEsTUFDeEIsU0FBUztBQUFBLE1BQ1QsUUFBUTtBQUFBLElBQ1YsQ0FBQztBQUFBLElBQ0QsR0FBRztBQUFBLElBQ0gsT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixlQUFlLENBQUM7QUFBQSxFQUNsQjtBQUFBLEVBQ0EsT0FBTztBQUFBO0FBQUEsSUFFTCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixTQUFTLENBQUMsY0FBYyxDQUFDO0FBQUE7QUFBQSxJQUUzQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
