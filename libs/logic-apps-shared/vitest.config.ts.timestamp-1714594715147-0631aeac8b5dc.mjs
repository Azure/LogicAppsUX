// ../../../../Projects/LogicAppsUX/libs/logic-apps-shared/vitest.config.ts
import { defineProject } from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/vitest@1.5.0_@types+node@20.12.7_@vitest+ui@1.5.0_jsdom@24.0.0/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10/node_modules/@vitejs/plugin-react/dist/index.mjs";

// ../../../../Projects/LogicAppsUX/libs/logic-apps-shared/package.json
var package_default = {
  name: "@microsoft/logic-apps-shared",
  version: "4.13.0",
  dependencies: {
    "@apidevtools/swagger-parser": "10.0.3",
    "@formatjs/intl": "^2.10.1",
    axios: "1.6.8",
    "react-intl": "6.3.0",
    reactflow: "11.11.1"
  },
  engines: {
    node: ">=12"
  },
  exports: {
    ".": {
      import: "./src/index.ts",
      default: "./src/index.ts",
      "types:": "./src/index.ts"
    },
    "./package.json": "./package.json"
  },
  files: [
    "build/lib/**/*",
    "src"
  ],
  license: "MIT",
  main: "src/index.ts",
  module: "src/index.ts",
  peerDependencies: {
    react: "^16.4.0 || ^17.0.0 || ^18.0.0",
    "react-dom": "^16.4.0 || ^17.0.0 || ^18.0.0",
    "@tanstack/react-query": "4.36.1"
  },
  publishConfig: {
    main: "build/lib/index.cjs",
    module: "build/lib/index.js",
    types: "build/lib/index.d.ts",
    exports: {
      ".": {
        "types:": "./build/lib/index.d.ts",
        import: "./build/lib/index.js",
        default: "./build/lib/index.cjs"
      },
      "./package.json": "./package.json",
      "./build/lib/index.css": "./build/lib/index.css"
    }
  },
  scripts: {
    "build:lib": "tsup && tsc --emitDeclarationOnly -p tsconfig.json",
    "publish:local": "pnpm unpublish --force && pnpm publish --no-git-checks --registry http://localhost:4873",
    "test:lib": "vitest --retry=3",
    "unpublish:local": "pnpm unpublish --force"
  },
  sideEffects: false,
  type: "module",
  types: "src/index.ts"
};

// ../../../../Projects/LogicAppsUX/libs/logic-apps-shared/vitest.config.ts
var vitest_config_default = defineProject({
  plugins: [react()],
  test: {
    name: package_default.name,
    dir: "./src",
    watch: false,
    globals: true,
    environment: "jsdom",
    setupFiles: ["test-setup.ts"],
    coverage: { enabled: true, provider: "istanbul", include: ["src/**/*"], reporter: ["html", "json"] },
    typecheck: { enabled: true },
    restoreMocks: true
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy9sb2dpYy1hcHBzLXNoYXJlZC92aXRlc3QuY29uZmlnLnRzIiwgIi4uLy4uLy4uLy4uL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvbG9naWMtYXBwcy1zaGFyZWQvcGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcaHllaHdhbGVlXFxcXFByb2plY3RzXFxcXExvZ2ljQXBwc1VYXFxcXGxpYnNcXFxcbG9naWMtYXBwcy1zaGFyZWRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXGxvZ2ljLWFwcHMtc2hhcmVkXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2h5ZWh3YWxlZS9Qcm9qZWN0cy9Mb2dpY0FwcHNVWC9saWJzL2xvZ2ljLWFwcHMtc2hhcmVkL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVQcm9qZWN0IH0gZnJvbSAndml0ZXN0L2NvbmZpZydcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBwYWNrYWdlSnNvbiBmcm9tICcuL3BhY2thZ2UuanNvbidcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lUHJvamVjdCh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIG5hbWU6IHBhY2thZ2VKc29uLm5hbWUsXG4gICAgZGlyOiAnLi9zcmMnLFxuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIHNldHVwRmlsZXM6IFsndGVzdC1zZXR1cC50cyddLFxuICAgIGNvdmVyYWdlOiB7IGVuYWJsZWQ6IHRydWUsIHByb3ZpZGVyOiAnaXN0YW5idWwnLCBpbmNsdWRlOiBbJ3NyYy8qKi8qJ10sIHJlcG9ydGVyOiBbJ2h0bWwnLCAnanNvbiddIH0sXG4gICAgdHlwZWNoZWNrOiB7IGVuYWJsZWQ6IHRydWUgfSxcbiAgICByZXN0b3JlTW9ja3M6IHRydWUsXG4gIH0sXG59KSIsICJ7XG4gIFwibmFtZVwiOiBcIkBtaWNyb3NvZnQvbG9naWMtYXBwcy1zaGFyZWRcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiNC4xMy4wXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBhcGlkZXZ0b29scy9zd2FnZ2VyLXBhcnNlclwiOiBcIjEwLjAuM1wiLFxuICAgIFwiQGZvcm1hdGpzL2ludGxcIjogXCJeMi4xMC4xXCIsXG4gICAgXCJheGlvc1wiOiBcIjEuNi44XCIsXG4gICAgXCJyZWFjdC1pbnRsXCI6IFwiNi4zLjBcIixcbiAgICBcInJlYWN0Zmxvd1wiOiBcIjExLjExLjFcIlxuICB9LFxuICBcImVuZ2luZXNcIjoge1xuICAgIFwibm9kZVwiOiBcIj49MTJcIlxuICB9LFxuICBcImV4cG9ydHNcIjoge1xuICAgIFwiLlwiOiB7XG4gICAgICBcImltcG9ydFwiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL3NyYy9pbmRleC50c1wiLFxuICAgICAgXCJ0eXBlczpcIjogXCIuL3NyYy9pbmRleC50c1wiXG4gICAgfSxcbiAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIlxuICB9LFxuICBcImZpbGVzXCI6IFtcbiAgICBcImJ1aWxkL2xpYi8qKi8qXCIsXG4gICAgXCJzcmNcIlxuICBdLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJtYWluXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwibW9kdWxlXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJyZWFjdFwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTYuNC4wIHx8IF4xNy4wLjAgfHwgXjE4LjAuMFwiLFxuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCI6IFwiNC4zNi4xXCJcbiAgfSxcbiAgXCJwdWJsaXNoQ29uZmlnXCI6IHtcbiAgICBcIm1haW5cIjogXCJidWlsZC9saWIvaW5kZXguY2pzXCIsXG4gICAgXCJtb2R1bGVcIjogXCJidWlsZC9saWIvaW5kZXguanNcIixcbiAgICBcInR5cGVzXCI6IFwiYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICBcImV4cG9ydHNcIjoge1xuICAgICAgXCIuXCI6IHtcbiAgICAgICAgXCJ0eXBlczpcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5kLnRzXCIsXG4gICAgICAgIFwiaW1wb3J0XCI6IFwiLi9idWlsZC9saWIvaW5kZXguanNcIixcbiAgICAgICAgXCJkZWZhdWx0XCI6IFwiLi9idWlsZC9saWIvaW5kZXguY2pzXCJcbiAgICAgIH0sXG4gICAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIixcbiAgICAgIFwiLi9idWlsZC9saWIvaW5kZXguY3NzXCI6IFwiLi9idWlsZC9saWIvaW5kZXguY3NzXCJcbiAgICB9XG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZDpsaWJcIjogXCJ0c3VwICYmIHRzYyAtLWVtaXREZWNsYXJhdGlvbk9ubHkgLXAgdHNjb25maWcuanNvblwiLFxuICAgIFwicHVibGlzaDpsb2NhbFwiOiBcInBucG0gdW5wdWJsaXNoIC0tZm9yY2UgJiYgcG5wbSBwdWJsaXNoIC0tbm8tZ2l0LWNoZWNrcyAtLXJlZ2lzdHJ5IGh0dHA6Ly9sb2NhbGhvc3Q6NDg3M1wiLFxuICAgIFwidGVzdDpsaWJcIjogXCJ2aXRlc3QgLS1yZXRyeT0zXCIsXG4gICAgXCJ1bnB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlXCJcbiAgfSxcbiAgXCJzaWRlRWZmZWN0c1wiOiBmYWxzZSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwidHlwZXNcIjogXCJzcmMvaW5kZXgudHNcIlxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4WCxTQUFTLHFCQUFxQjtBQUM1WixPQUFPLFdBQVc7OztBQ0RsQjtBQUFBLEVBQ0UsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsY0FBZ0I7QUFBQSxJQUNkLCtCQUErQjtBQUFBLElBQy9CLGtCQUFrQjtBQUFBLElBQ2xCLE9BQVM7QUFBQSxJQUNULGNBQWM7QUFBQSxJQUNkLFdBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxNQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsS0FBSztBQUFBLE1BQ0gsUUFBVTtBQUFBLE1BQ1YsU0FBVztBQUFBLE1BQ1gsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLGtCQUFrQjtBQUFBLEVBQ3BCO0FBQUEsRUFDQSxPQUFTO0FBQUEsSUFDUDtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFXO0FBQUEsRUFDWCxNQUFRO0FBQUEsRUFDUixRQUFVO0FBQUEsRUFDVixrQkFBb0I7QUFBQSxJQUNsQixPQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYix5QkFBeUI7QUFBQSxFQUMzQjtBQUFBLEVBQ0EsZUFBaUI7QUFBQSxJQUNmLE1BQVE7QUFBQSxJQUNSLFFBQVU7QUFBQSxJQUNWLE9BQVM7QUFBQSxJQUNULFNBQVc7QUFBQSxNQUNULEtBQUs7QUFBQSxRQUNILFVBQVU7QUFBQSxRQUNWLFFBQVU7QUFBQSxRQUNWLFNBQVc7QUFBQSxNQUNiO0FBQUEsTUFDQSxrQkFBa0I7QUFBQSxNQUNsQix5QkFBeUI7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLGlCQUFpQjtBQUFBLElBQ2pCLFlBQVk7QUFBQSxJQUNaLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxhQUFlO0FBQUEsRUFDZixNQUFRO0FBQUEsRUFDUixPQUFTO0FBQ1g7OztBRHBEQSxJQUFPLHdCQUFRLGNBQWM7QUFBQSxFQUMzQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTTtBQUFBLElBQ0osTUFBTSxnQkFBWTtBQUFBLElBQ2xCLEtBQUs7QUFBQSxJQUNMLE9BQU87QUFBQSxJQUNQLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxlQUFlO0FBQUEsSUFDNUIsVUFBVSxFQUFFLFNBQVMsTUFBTSxVQUFVLFlBQVksU0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxNQUFNLEVBQUU7QUFBQSxJQUNuRyxXQUFXLEVBQUUsU0FBUyxLQUFLO0FBQUEsSUFDM0IsY0FBYztBQUFBLEVBQ2hCO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
