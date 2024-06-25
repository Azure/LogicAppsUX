// vitest.config.ts
import { defineProject } from "vitest/config";
import react from "@vitejs/plugin-react";

// package.json
var package_default = {
  name: "@microsoft/vscode-extension-logic-apps",
  version: "4.33.0",
  dependencies: {
    "@apidevtools/swagger-parser": "10.0.3",
    "@microsoft/logic-apps-shared": "workspace:*",
    "@microsoft/vscode-azext-azureappservice": "0.8.1",
    "@microsoft/vscode-azext-utils": "0.4.6",
    axios: "1.6.8",
    "react-intl": "6.3.0",
    reactflow: "11.11.1",
    tslib: "2.4.0"
  },
  devDependencies: {
    "@types/vscode": "1.76.0",
    "@types/vscode-webview": "1.57.1"
  },
  peerDependencies: {
    "@tanstack/react-query": "4.36.1",
    "@tanstack/react-query-devtools": "4.36.1"
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
    "build:lib": "tsup && tsc --emitDeclarationOnly",
    "publish:local": "pnpm unpublish --force && pnpm publish --no-git-checks --registry http://localhost:4873",
    "test:lib": "vitest --retry=3",
    "unpublish:local": "pnpm unpublish --force"
  },
  sideEffects: false,
  type: "module",
  types: "src/index.ts"
};

// vitest.config.ts
var vitest_config_default = defineProject({
  plugins: [react()],
  test: {
    name: package_default.name,
    dir: "./src",
    watch: false,
    environment: "jsdom",
    setupFiles: ["test-setup.ts"],
    coverage: { enabled: true, provider: "istanbul", include: ["src/**/*"], reporter: ["html", "cobertura"] },
    restoreMocks: true
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyIsICJwYWNrYWdlLmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxoeWVod2FsZWVcXFxcUHJvamVjdHNcXFxcTG9naWNBcHBzVVhcXFxcbGlic1xcXFx2c2NvZGUtZXh0ZW5zaW9uXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxoeWVod2FsZWVcXFxcUHJvamVjdHNcXFxcTG9naWNBcHBzVVhcXFxcbGlic1xcXFx2c2NvZGUtZXh0ZW5zaW9uXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2h5ZWh3YWxlZS9Qcm9qZWN0cy9Mb2dpY0FwcHNVWC9saWJzL3ZzY29kZS1leHRlbnNpb24vdml0ZXN0LmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZVByb2plY3QgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLmpzb24nO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVQcm9qZWN0KHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICB0ZXN0OiB7XG4gICAgbmFtZTogcGFja2FnZUpzb24ubmFtZSxcbiAgICBkaXI6ICcuL3NyYycsXG4gICAgd2F0Y2g6IGZhbHNlLFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIHNldHVwRmlsZXM6IFsndGVzdC1zZXR1cC50cyddLFxuICAgIGNvdmVyYWdlOiB7IGVuYWJsZWQ6IHRydWUsIHByb3ZpZGVyOiAnaXN0YW5idWwnLCBpbmNsdWRlOiBbJ3NyYy8qKi8qJ10sIHJlcG9ydGVyOiBbJ2h0bWwnLCAnY29iZXJ0dXJhJ10gfSxcbiAgICByZXN0b3JlTW9ja3M6IHRydWUsXG4gIH0sXG59KTtcbiIsICJ7XG4gIFwibmFtZVwiOiBcIkBtaWNyb3NvZnQvdnNjb2RlLWV4dGVuc2lvbi1sb2dpYy1hcHBzXCIsXG4gIFwidmVyc2lvblwiOiBcIjQuMzMuMFwiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAYXBpZGV2dG9vbHMvc3dhZ2dlci1wYXJzZXJcIjogXCIxMC4wLjNcIixcbiAgICBcIkBtaWNyb3NvZnQvbG9naWMtYXBwcy1zaGFyZWRcIjogXCJ3b3Jrc3BhY2U6KlwiLFxuICAgIFwiQG1pY3Jvc29mdC92c2NvZGUtYXpleHQtYXp1cmVhcHBzZXJ2aWNlXCI6IFwiMC44LjFcIixcbiAgICBcIkBtaWNyb3NvZnQvdnNjb2RlLWF6ZXh0LXV0aWxzXCI6IFwiMC40LjZcIixcbiAgICBcImF4aW9zXCI6IFwiMS42LjhcIixcbiAgICBcInJlYWN0LWludGxcIjogXCI2LjMuMFwiLFxuICAgIFwicmVhY3RmbG93XCI6IFwiMTEuMTEuMVwiLFxuICAgIFwidHNsaWJcIjogXCIyLjQuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkB0eXBlcy92c2NvZGVcIjogXCIxLjc2LjBcIixcbiAgICBcIkB0eXBlcy92c2NvZGUtd2Vidmlld1wiOiBcIjEuNTcuMVwiXG4gIH0sXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIjogXCI0LjM2LjFcIixcbiAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeS1kZXZ0b29sc1wiOiBcIjQuMzYuMVwiXG4gIH0sXG4gIFwiZW5naW5lc1wiOiB7XG4gICAgXCJub2RlXCI6IFwiPj0xMlwiXG4gIH0sXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcInR5cGVzOlwiOiBcIi4vc3JjL2luZGV4LnRzXCJcbiAgICB9LFxuICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiXG4gIH0sXG4gIFwiZmlsZXNcIjogW1xuICAgIFwiYnVpbGQvbGliLyoqLypcIixcbiAgICBcInNyY1wiXG4gIF0sXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcIm1haW5cIjogXCJzcmMvaW5kZXgudHNcIixcbiAgXCJtb2R1bGVcIjogXCJzcmMvaW5kZXgudHNcIixcbiAgXCJwdWJsaXNoQ29uZmlnXCI6IHtcbiAgICBcIm1haW5cIjogXCJidWlsZC9saWIvaW5kZXguY2pzXCIsXG4gICAgXCJtb2R1bGVcIjogXCJidWlsZC9saWIvaW5kZXguanNcIixcbiAgICBcInR5cGVzXCI6IFwiYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICBcImV4cG9ydHNcIjoge1xuICAgICAgXCIuXCI6IHtcbiAgICAgICAgXCJ0eXBlczpcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5kLnRzXCIsXG4gICAgICAgIFwiaW1wb3J0XCI6IFwiLi9idWlsZC9saWIvaW5kZXguanNcIixcbiAgICAgICAgXCJkZWZhdWx0XCI6IFwiLi9idWlsZC9saWIvaW5kZXguY2pzXCJcbiAgICAgIH0sXG4gICAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIixcbiAgICAgIFwiLi9idWlsZC9saWIvaW5kZXguY3NzXCI6IFwiLi9idWlsZC9saWIvaW5kZXguY3NzXCJcbiAgICB9XG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZDpsaWJcIjogXCJ0c3VwICYmIHRzYyAtLWVtaXREZWNsYXJhdGlvbk9ubHlcIixcbiAgICBcInB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlICYmIHBucG0gcHVibGlzaCAtLW5vLWdpdC1jaGVja3MgLS1yZWdpc3RyeSBodHRwOi8vbG9jYWxob3N0OjQ4NzNcIixcbiAgICBcInRlc3Q6bGliXCI6IFwidml0ZXN0IC0tcmV0cnk9M1wiLFxuICAgIFwidW5wdWJsaXNoOmxvY2FsXCI6IFwicG5wbSB1bnB1Ymxpc2ggLS1mb3JjZVwiXG4gIH0sXG4gIFwic2lkZUVmZmVjdHNcIjogZmFsc2UsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcInR5cGVzXCI6IFwic3JjL2luZGV4LnRzXCJcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlgsU0FBUyxxQkFBcUI7QUFDelosT0FBTyxXQUFXOzs7QUNEbEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGNBQWdCO0FBQUEsSUFDZCwrQkFBK0I7QUFBQSxJQUMvQixnQ0FBZ0M7QUFBQSxJQUNoQywyQ0FBMkM7QUFBQSxJQUMzQyxpQ0FBaUM7QUFBQSxJQUNqQyxPQUFTO0FBQUEsSUFDVCxjQUFjO0FBQUEsSUFDZCxXQUFhO0FBQUEsSUFDYixPQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsaUJBQWlCO0FBQUEsSUFDakIseUJBQXlCO0FBQUEsRUFDM0I7QUFBQSxFQUNBLGtCQUFvQjtBQUFBLElBQ2xCLHlCQUF5QjtBQUFBLElBQ3pCLGtDQUFrQztBQUFBLEVBQ3BDO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxNQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsS0FBSztBQUFBLE1BQ0gsUUFBVTtBQUFBLE1BQ1YsU0FBVztBQUFBLE1BQ1gsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLGtCQUFrQjtBQUFBLEVBQ3BCO0FBQUEsRUFDQSxPQUFTO0FBQUEsSUFDUDtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFXO0FBQUEsRUFDWCxNQUFRO0FBQUEsRUFDUixRQUFVO0FBQUEsRUFDVixlQUFpQjtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0gsVUFBVTtBQUFBLFFBQ1YsUUFBVTtBQUFBLFFBQ1YsU0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLE1BQ2xCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE9BQVM7QUFDWDs7O0FEMURBLElBQU8sd0JBQVEsY0FBYztBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixNQUFNLGdCQUFZO0FBQUEsSUFDbEIsS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLElBQ1AsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLGVBQWU7QUFBQSxJQUM1QixVQUFVLEVBQUUsU0FBUyxNQUFNLFVBQVUsWUFBWSxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLFdBQVcsRUFBRTtBQUFBLElBQ3hHLGNBQWM7QUFBQSxFQUNoQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
