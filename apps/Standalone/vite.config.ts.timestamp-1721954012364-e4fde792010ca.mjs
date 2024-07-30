// vite.config.ts
import { defineConfig } from "file:///Users/krrishmittal/Documents/Code/LogicApps/LogicAppsUX/node_modules/.pnpm/vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2/node_modules/vite/dist/node/index.js";
import react from "file:///Users/krrishmittal/Documents/Code/LogicApps/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { NodeGlobalsPolyfillPlugin } from "file:///Users/krrishmittal/Documents/Code/LogicApps/LogicAppsUX/node_modules/.pnpm/@esbuild-plugins+node-globals-polyfill@0.2.3_esbuild@0.20.2/node_modules/@esbuild-plugins/node-globals-polyfill/dist/index.js";
import nodePolyfills from "file:///Users/krrishmittal/Documents/Code/LogicApps/LogicAppsUX/node_modules/.pnpm/rollup-plugin-polyfill-node@0.13.0_rollup@4.16.4/node_modules/rollup-plugin-polyfill-node/dist/index.js";
import { nodePolyfills as np } from "file:///Users/krrishmittal/Documents/Code/LogicApps/LogicAppsUX/node_modules/.pnpm/vite-plugin-node-polyfills@0.21.0_rollup@4.16.4_vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/vite-plugin-node-polyfills/dist/index.js";
import mkcert from "file:///Users/krrishmittal/Documents/Code/LogicApps/LogicAppsUX/node_modules/.pnpm/vite-plugin-mkcert@1.17.5_vite@5.2.10_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
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
    rollupOptions: {
      plugins: [nodePolyfills()],
      external: ["react", "react-dom", "@tanstack/react-query", "@tanstack/react-query-devtools"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMva3JyaXNobWl0dGFsL0RvY3VtZW50cy9Db2RlL0xvZ2ljQXBwcy9Mb2dpY0FwcHNVWC9hcHBzL1N0YW5kYWxvbmVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rcnJpc2htaXR0YWwvRG9jdW1lbnRzL0NvZGUvTG9naWNBcHBzL0xvZ2ljQXBwc1VYL2FwcHMvU3RhbmRhbG9uZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMva3JyaXNobWl0dGFsL0RvY3VtZW50cy9Db2RlL0xvZ2ljQXBwcy9Mb2dpY0FwcHNVWC9hcHBzL1N0YW5kYWxvbmUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBOb2RlR2xvYmFsc1BvbHlmaWxsUGx1Z2luIH0gZnJvbSAnQGVzYnVpbGQtcGx1Z2lucy9ub2RlLWdsb2JhbHMtcG9seWZpbGwnO1xuaW1wb3J0IG5vZGVQb2x5ZmlsbHMgZnJvbSAncm9sbHVwLXBsdWdpbi1wb2x5ZmlsbC1ub2RlJztcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgYXMgbnAgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscyc7XG5pbXBvcnQgbWtjZXJ0IGZyb20gJ3ZpdGUtcGx1Z2luLW1rY2VydCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IFtcbiAgICAgIHtcbiAgICAgICAgZmluZDogJ35AeHlmbG93L3JlYWN0JyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6ICdAeHlmbG93L3JlYWN0JyxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbih7XG4gICAgICBwcm9jZXNzOiB0cnVlLFxuICAgICAgYnVmZmVyOiB0cnVlLFxuICAgIH0pLFxuICAgIG5wKCksXG4gICAgbWtjZXJ0KCksXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDQyMDAsXG4gIH0sXG4gIGRlZmluZToge1xuICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnLFxuICAgICdwcm9jZXNzLmVudic6IHt9LFxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIHBsdWdpbnM6IFtub2RlUG9seWZpbGxzKCldLFxuICAgICAgZXh0ZXJuYWw6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsICdAdGFuc3RhY2svcmVhY3QtcXVlcnktZGV2dG9vbHMnXSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBZLFNBQVMsb0JBQW9CO0FBQ3ZhLE9BQU8sV0FBVztBQUNsQixTQUFTLGlDQUFpQztBQUMxQyxPQUFPLG1CQUFtQjtBQUMxQixTQUFTLGlCQUFpQixVQUFVO0FBQ3BDLE9BQU8sWUFBWTtBQUduQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTDtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYTtBQUFBLE1BQ2Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sMEJBQTBCO0FBQUEsTUFDeEIsU0FBUztBQUFBLE1BQ1QsUUFBUTtBQUFBLElBQ1YsQ0FBQztBQUFBLElBQ0QsR0FBRztBQUFBLElBQ0gsT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixlQUFlLENBQUM7QUFBQSxFQUNsQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsU0FBUyxDQUFDLGNBQWMsQ0FBQztBQUFBLE1BQ3pCLFVBQVUsQ0FBQyxTQUFTLGFBQWEseUJBQXlCLGdDQUFnQztBQUFBLElBQzVGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
