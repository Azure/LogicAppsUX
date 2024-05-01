// ../../../../Projects/LogicAppsUX/libs/data-mapper-v2/vite.config.ts
import { defineProject } from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/vitest@1.5.0_@types+node@20.12.7_@vitest+ui@1.5.0_jsdom@24.0.0/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10/node_modules/@vitejs/plugin-react/dist/index.mjs";

// ../../../../Projects/LogicAppsUX/libs/data-mapper-v2/package.json
var package_default = {
  name: "@microsoft/logic-apps-data-mapper-v2",
  version: "4.1.1",
  dependencies: {
    "@fluentui/azure-themes": "8.5.70",
    "@fluentui/react": "8.110.2",
    "@fluentui/react-components": "9.42.0",
    "@fluentui/react-hooks": "8.6.20",
    "@fluentui/react-icons": "2.0.224",
    "@fluentui/react-migration-v8-v9": "^9.2.16",
    "@fluentui/react-portal-compat": "^9.0.60",
    "@microsoft/applicationinsights-react-js": "3.4.0",
    "@microsoft/applicationinsights-web": "2.8.9",
    "@microsoft/designer-ui": "workspace:*",
    "@microsoft/logic-apps-designer": "workspace:*",
    "@microsoft/logic-apps-shared": "workspace:*",
    "@react-hookz/web": "22.0.0",
    "@reduxjs/toolkit": "1.8.5",
    "fuse.js": "6.6.2",
    immer: "9.0.15",
    "js-yaml": "4.1.0",
    pathfinding: "0.4.18",
    "react-dnd": "16.0.1",
    "react-dnd-html5-backend": "16.0.1",
    "react-icons": "4.8.0",
    "react-intl": "6.3.0",
    "react-redux": "8.0.2",
    reactflow: "11.11.1",
    "redux-thunk": "2.4.2",
    "redux-undo": "1.1.0"
  },
  devDependencies: {
    "@types/js-yaml": "^4.0.9",
    "@types/pathfinding": "^0.0.9"
  },
  engines: {
    node: ">=12"
  },
  exports: {
    ".": {
      types: "./src/index.ts",
      import: "./src/index.ts",
      default: "./src/index.ts"
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
    "@tanstack/react-query": "4.36.1",
    "@tanstack/react-query-devtools": "4.36.1"
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
    "build:lib": "tsup && tsc --emitDeclarationOnly",
    "publish:local": "pnpm unpublish --force && pnpm publish --no-git-checks --registry http://localhost:4873",
    "test:lib": "vitest --retry=3",
    "unpublish:local": "pnpm unpublish --force"
  },
  sideEffects: false,
  type: "module",
  types: "src/index.ts"
};

// ../../../../Projects/LogicAppsUX/libs/data-mapper-v2/vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\hyehwalee\\Projects\\LogicAppsUX\\libs\\data-mapper-v2";
var vite_config_default = defineProject({
  plugins: [react()],
  test: {
    name: package_default.name,
    dir: "./src",
    watch: false,
    environment: "jsdom",
    setupFiles: ["test-setup.ts"],
    coverage: { enabled: true, provider: "istanbul", include: ["src/**/*"], reporter: ["html", "json"] },
    restoreMocks: true,
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: `${__vite_injected_original_dirname}/node_modules/monaco-editor/esm/vs/editor/editor.api`
      }
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy9kYXRhLW1hcHBlci12Mi92aXRlLmNvbmZpZy50cyIsICIuLi8uLi8uLi8uLi9Qcm9qZWN0cy9Mb2dpY0FwcHNVWC9saWJzL2RhdGEtbWFwcGVyLXYyL3BhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXGRhdGEtbWFwcGVyLXYyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxoeWVod2FsZWVcXFxcUHJvamVjdHNcXFxcTG9naWNBcHBzVVhcXFxcbGlic1xcXFxkYXRhLW1hcHBlci12MlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvaHllaHdhbGVlL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvZGF0YS1tYXBwZXItdjIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVQcm9qZWN0IH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lUHJvamVjdCh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIG5hbWU6IHBhY2thZ2VKc29uLm5hbWUsXG4gICAgZGlyOiAnLi9zcmMnLFxuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbJ3Rlc3Qtc2V0dXAudHMnXSxcbiAgICBjb3ZlcmFnZTogeyBlbmFibGVkOiB0cnVlLCBwcm92aWRlcjogJ2lzdGFuYnVsJywgaW5jbHVkZTogWydzcmMvKiovKiddLCByZXBvcnRlcjogWydodG1sJywgJ2pzb24nXSB9LFxuICAgIHJlc3RvcmVNb2NrczogdHJ1ZSxcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAvXm1vbmFjby1lZGl0b3IkLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IGAke19fZGlybmFtZX0vbm9kZV9tb2R1bGVzL21vbmFjby1lZGl0b3IvZXNtL3ZzL2VkaXRvci9lZGl0b3IuYXBpYCxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pO1xuIiwgIntcbiAgXCJuYW1lXCI6IFwiQG1pY3Jvc29mdC9sb2dpYy1hcHBzLWRhdGEtbWFwcGVyLXYyXCIsXG4gIFwidmVyc2lvblwiOiBcIjQuMS4xXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBmbHVlbnR1aS9henVyZS10aGVtZXNcIjogXCI4LjUuNzBcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdFwiOiBcIjguMTEwLjJcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdC1jb21wb25lbnRzXCI6IFwiOS40Mi4wXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtaG9va3NcIjogXCI4LjYuMjBcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdC1pY29uc1wiOiBcIjIuMC4yMjRcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdC1taWdyYXRpb24tdjgtdjlcIjogXCJeOS4yLjE2XCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtcG9ydGFsLWNvbXBhdFwiOiBcIl45LjAuNjBcIixcbiAgICBcIkBtaWNyb3NvZnQvYXBwbGljYXRpb25pbnNpZ2h0cy1yZWFjdC1qc1wiOiBcIjMuNC4wXCIsXG4gICAgXCJAbWljcm9zb2Z0L2FwcGxpY2F0aW9uaW5zaWdodHMtd2ViXCI6IFwiMi44LjlcIixcbiAgICBcIkBtaWNyb3NvZnQvZGVzaWduZXItdWlcIjogXCJ3b3Jrc3BhY2U6KlwiLFxuICAgIFwiQG1pY3Jvc29mdC9sb2dpYy1hcHBzLWRlc2lnbmVyXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkBtaWNyb3NvZnQvbG9naWMtYXBwcy1zaGFyZWRcIjogXCJ3b3Jrc3BhY2U6KlwiLFxuICAgIFwiQHJlYWN0LWhvb2t6L3dlYlwiOiBcIjIyLjAuMFwiLFxuICAgIFwiQHJlZHV4anMvdG9vbGtpdFwiOiBcIjEuOC41XCIsXG4gICAgXCJmdXNlLmpzXCI6IFwiNi42LjJcIixcbiAgICBcImltbWVyXCI6IFwiOS4wLjE1XCIsXG4gICAgXCJqcy15YW1sXCI6IFwiNC4xLjBcIixcbiAgICBcInBhdGhmaW5kaW5nXCI6IFwiMC40LjE4XCIsXG4gICAgXCJyZWFjdC1kbmRcIjogXCIxNi4wLjFcIixcbiAgICBcInJlYWN0LWRuZC1odG1sNS1iYWNrZW5kXCI6IFwiMTYuMC4xXCIsXG4gICAgXCJyZWFjdC1pY29uc1wiOiBcIjQuOC4wXCIsXG4gICAgXCJyZWFjdC1pbnRsXCI6IFwiNi4zLjBcIixcbiAgICBcInJlYWN0LXJlZHV4XCI6IFwiOC4wLjJcIixcbiAgICBcInJlYWN0Zmxvd1wiOiBcIjExLjExLjFcIixcbiAgICBcInJlZHV4LXRodW5rXCI6IFwiMi40LjJcIixcbiAgICBcInJlZHV4LXVuZG9cIjogXCIxLjEuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkB0eXBlcy9qcy15YW1sXCI6IFwiXjQuMC45XCIsXG4gICAgXCJAdHlwZXMvcGF0aGZpbmRpbmdcIjogXCJeMC4wLjlcIlxuICB9LFxuICBcImVuZ2luZXNcIjoge1xuICAgIFwibm9kZVwiOiBcIj49MTJcIlxuICB9LFxuICBcImV4cG9ydHNcIjoge1xuICAgIFwiLlwiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vc3JjL2luZGV4LnRzXCJcbiAgICB9LFxuICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiXG4gIH0sXG4gIFwiZmlsZXNcIjogW1xuICAgIFwiYnVpbGQvbGliLyoqLypcIixcbiAgICBcInNyY1wiXG4gIF0sXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcIm1haW5cIjogXCJzcmMvaW5kZXgudHNcIixcbiAgXCJtb2R1bGVcIjogXCJzcmMvaW5kZXgudHNcIixcbiAgXCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcInJlYWN0XCI6IFwiXjE2LjQuMCB8fCBeMTcuMC4wIHx8IF4xOC4wLjBcIixcbiAgICBcInJlYWN0LWRvbVwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCIsXG4gICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIjogXCI0LjM2LjFcIixcbiAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeS1kZXZ0b29sc1wiOiBcIjQuMzYuMVwiXG4gIH0sXG4gIFwicHVibGlzaENvbmZpZ1wiOiB7XG4gICAgXCJtYWluXCI6IFwiYnVpbGQvbGliL2luZGV4LmNqc1wiLFxuICAgIFwibW9kdWxlXCI6IFwiYnVpbGQvbGliL2luZGV4LmpzXCIsXG4gICAgXCJ0eXBlc1wiOiBcImJ1aWxkL2xpYi9pbmRleC5kLnRzXCIsXG4gICAgXCJleHBvcnRzXCI6IHtcbiAgICAgIFwiLlwiOiB7XG4gICAgICAgIFwidHlwZXM6XCI6IFwiLi9idWlsZC9saWIvaW5kZXguZC50c1wiLFxuICAgICAgICBcImltcG9ydFwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmpzXCIsXG4gICAgICAgIFwiZGVmYXVsdFwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmNqc1wiXG4gICAgICB9LFxuICAgICAgXCIuL3BhY2thZ2UuanNvblwiOiBcIi4vcGFja2FnZS5qc29uXCIsXG4gICAgICBcIi4vYnVpbGQvbGliL2luZGV4LmNzc1wiOiBcIi4vYnVpbGQvbGliL2luZGV4LmNzc1wiXG4gICAgfVxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYnVpbGQ6bGliXCI6IFwidHN1cCAmJiB0c2MgLS1lbWl0RGVjbGFyYXRpb25Pbmx5XCIsXG4gICAgXCJwdWJsaXNoOmxvY2FsXCI6IFwicG5wbSB1bnB1Ymxpc2ggLS1mb3JjZSAmJiBwbnBtIHB1Ymxpc2ggLS1uby1naXQtY2hlY2tzIC0tcmVnaXN0cnkgaHR0cDovL2xvY2FsaG9zdDo0ODczXCIsXG4gICAgXCJ0ZXN0OmxpYlwiOiBcInZpdGVzdCAtLXJldHJ5PTNcIixcbiAgICBcInVucHVibGlzaDpsb2NhbFwiOiBcInBucG0gdW5wdWJsaXNoIC0tZm9yY2VcIlxuICB9LFxuICBcInNpZGVFZmZlY3RzXCI6IGZhbHNlLFxuICBcInR5cGVcIjogXCJtb2R1bGVcIixcbiAgXCJ0eXBlc1wiOiBcInNyYy9pbmRleC50c1wiXG59Il0sCiAgIm1hcHBpbmdzIjogIjtBQUFpWCxTQUFTLHFCQUFxQjtBQUMvWSxPQUFPLFdBQVc7OztBQ0RsQjtBQUFBLEVBQ0UsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsY0FBZ0I7QUFBQSxJQUNkLDBCQUEwQjtBQUFBLElBQzFCLG1CQUFtQjtBQUFBLElBQ25CLDhCQUE4QjtBQUFBLElBQzlCLHlCQUF5QjtBQUFBLElBQ3pCLHlCQUF5QjtBQUFBLElBQ3pCLG1DQUFtQztBQUFBLElBQ25DLGlDQUFpQztBQUFBLElBQ2pDLDJDQUEyQztBQUFBLElBQzNDLHNDQUFzQztBQUFBLElBQ3RDLDBCQUEwQjtBQUFBLElBQzFCLGtDQUFrQztBQUFBLElBQ2xDLGdDQUFnQztBQUFBLElBQ2hDLG9CQUFvQjtBQUFBLElBQ3BCLG9CQUFvQjtBQUFBLElBQ3BCLFdBQVc7QUFBQSxJQUNYLE9BQVM7QUFBQSxJQUNULFdBQVc7QUFBQSxJQUNYLGFBQWU7QUFBQSxJQUNmLGFBQWE7QUFBQSxJQUNiLDJCQUEyQjtBQUFBLElBQzNCLGVBQWU7QUFBQSxJQUNmLGNBQWM7QUFBQSxJQUNkLGVBQWU7QUFBQSxJQUNmLFdBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxJQUNmLGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsa0JBQWtCO0FBQUEsSUFDbEIsc0JBQXNCO0FBQUEsRUFDeEI7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULE1BQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFLO0FBQUEsTUFDSCxPQUFTO0FBQUEsTUFDVCxRQUFVO0FBQUEsTUFDVixTQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0Esa0JBQWtCO0FBQUEsRUFDcEI7QUFBQSxFQUNBLE9BQVM7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxFQUNYLE1BQVE7QUFBQSxFQUNSLFFBQVU7QUFBQSxFQUNWLGtCQUFvQjtBQUFBLElBQ2xCLE9BQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLHlCQUF5QjtBQUFBLElBQ3pCLGtDQUFrQztBQUFBLEVBQ3BDO0FBQUEsRUFDQSxlQUFpQjtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0gsVUFBVTtBQUFBLFFBQ1YsUUFBVTtBQUFBLFFBQ1YsU0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLE1BQ2xCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE9BQVM7QUFDWDs7O0FEbEZBLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsY0FBYztBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixNQUFNLGdCQUFZO0FBQUEsSUFDbEIsS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLElBQ1AsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLGVBQWU7QUFBQSxJQUM1QixVQUFVLEVBQUUsU0FBUyxNQUFNLFVBQVUsWUFBWSxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLE1BQU0sRUFBRTtBQUFBLElBQ25HLGNBQWM7QUFBQSxJQUNkLE9BQU87QUFBQSxNQUNMO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLEdBQUcsZ0NBQVM7QUFBQSxNQUMzQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
