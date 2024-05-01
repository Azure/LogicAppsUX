// ../../../../Projects/LogicAppsUX/libs/data-mapper/vite.config.ts
import { defineProject } from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/vitest@1.5.0_@types+node@20.12.7_@vitest+ui@1.5.0_jsdom@24.0.0/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10/node_modules/@vitejs/plugin-react/dist/index.mjs";

// ../../../../Projects/LogicAppsUX/libs/data-mapper/package.json
var package_default = {
  name: "@microsoft/logic-apps-data-mapper",
  version: "4.13.0",
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

// ../../../../Projects/LogicAppsUX/libs/data-mapper/vite.config.ts
var __vite_injected_original_dirname = "C:\\Users\\hyehwalee\\Projects\\LogicAppsUX\\libs\\data-mapper";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy9kYXRhLW1hcHBlci92aXRlLmNvbmZpZy50cyIsICIuLi8uLi8uLi8uLi9Qcm9qZWN0cy9Mb2dpY0FwcHNVWC9saWJzL2RhdGEtbWFwcGVyL3BhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXGRhdGEtbWFwcGVyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxoeWVod2FsZWVcXFxcUHJvamVjdHNcXFxcTG9naWNBcHBzVVhcXFxcbGlic1xcXFxkYXRhLW1hcHBlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvaHllaHdhbGVlL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvZGF0YS1tYXBwZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVQcm9qZWN0IH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lUHJvamVjdCh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIG5hbWU6IHBhY2thZ2VKc29uLm5hbWUsXG4gICAgZGlyOiAnLi9zcmMnLFxuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbJ3Rlc3Qtc2V0dXAudHMnXSxcbiAgICBjb3ZlcmFnZTogeyBlbmFibGVkOiB0cnVlLCBwcm92aWRlcjogJ2lzdGFuYnVsJywgaW5jbHVkZTogWydzcmMvKiovKiddLCByZXBvcnRlcjogWydodG1sJywgJ2pzb24nXSB9LFxuICAgIHJlc3RvcmVNb2NrczogdHJ1ZSxcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAvXm1vbmFjby1lZGl0b3IkLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IGAke19fZGlybmFtZX0vbm9kZV9tb2R1bGVzL21vbmFjby1lZGl0b3IvZXNtL3ZzL2VkaXRvci9lZGl0b3IuYXBpYCxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pO1xuIiwgIntcbiAgXCJuYW1lXCI6IFwiQG1pY3Jvc29mdC9sb2dpYy1hcHBzLWRhdGEtbWFwcGVyXCIsXG4gIFwidmVyc2lvblwiOiBcIjQuMTMuMFwiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAZmx1ZW50dWkvYXp1cmUtdGhlbWVzXCI6IFwiOC41LjcwXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3RcIjogXCI4LjExMC4yXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtY29tcG9uZW50c1wiOiBcIjkuNDIuMFwiLFxuICAgIFwiQGZsdWVudHVpL3JlYWN0LWhvb2tzXCI6IFwiOC42LjIwXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtaWNvbnNcIjogXCIyLjAuMjI0XCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtbWlncmF0aW9uLXY4LXY5XCI6IFwiXjkuMi4xNlwiLFxuICAgIFwiQGZsdWVudHVpL3JlYWN0LXBvcnRhbC1jb21wYXRcIjogXCJeOS4wLjYwXCIsXG4gICAgXCJAbWljcm9zb2Z0L2FwcGxpY2F0aW9uaW5zaWdodHMtcmVhY3QtanNcIjogXCIzLjQuMFwiLFxuICAgIFwiQG1pY3Jvc29mdC9hcHBsaWNhdGlvbmluc2lnaHRzLXdlYlwiOiBcIjIuOC45XCIsXG4gICAgXCJAbWljcm9zb2Z0L2Rlc2lnbmVyLXVpXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkBtaWNyb3NvZnQvbG9naWMtYXBwcy1kZXNpZ25lclwiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAbWljcm9zb2Z0L2xvZ2ljLWFwcHMtc2hhcmVkXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkByZWFjdC1ob29rei93ZWJcIjogXCIyMi4wLjBcIixcbiAgICBcIkByZWR1eGpzL3Rvb2xraXRcIjogXCIxLjguNVwiLFxuICAgIFwiZnVzZS5qc1wiOiBcIjYuNi4yXCIsXG4gICAgXCJpbW1lclwiOiBcIjkuMC4xNVwiLFxuICAgIFwianMteWFtbFwiOiBcIjQuMS4wXCIsXG4gICAgXCJwYXRoZmluZGluZ1wiOiBcIjAuNC4xOFwiLFxuICAgIFwicmVhY3QtZG5kXCI6IFwiMTYuMC4xXCIsXG4gICAgXCJyZWFjdC1kbmQtaHRtbDUtYmFja2VuZFwiOiBcIjE2LjAuMVwiLFxuICAgIFwicmVhY3QtaWNvbnNcIjogXCI0LjguMFwiLFxuICAgIFwicmVhY3QtaW50bFwiOiBcIjYuMy4wXCIsXG4gICAgXCJyZWFjdC1yZWR1eFwiOiBcIjguMC4yXCIsXG4gICAgXCJyZWFjdGZsb3dcIjogXCIxMS4xMS4xXCIsXG4gICAgXCJyZWR1eC10aHVua1wiOiBcIjIuNC4yXCIsXG4gICAgXCJyZWR1eC11bmRvXCI6IFwiMS4xLjBcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAdHlwZXMvanMteWFtbFwiOiBcIl40LjAuOVwiLFxuICAgIFwiQHR5cGVzL3BhdGhmaW5kaW5nXCI6IFwiXjAuMC45XCJcbiAgfSxcbiAgXCJlbmdpbmVzXCI6IHtcbiAgICBcIm5vZGVcIjogXCI+PTEyXCJcbiAgfSxcbiAgXCJleHBvcnRzXCI6IHtcbiAgICBcIi5cIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL3NyYy9pbmRleC50c1wiXG4gICAgfSxcbiAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIlxuICB9LFxuICBcImZpbGVzXCI6IFtcbiAgICBcImJ1aWxkL2xpYi8qKi8qXCIsXG4gICAgXCJzcmNcIlxuICBdLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJtYWluXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwibW9kdWxlXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJyZWFjdFwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTYuNC4wIHx8IF4xNy4wLjAgfHwgXjE4LjAuMFwiLFxuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCI6IFwiNC4zNi4xXCIsXG4gICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnktZGV2dG9vbHNcIjogXCI0LjM2LjFcIlxuICB9LFxuICBcInB1Ymxpc2hDb25maWdcIjoge1xuICAgIFwibWFpblwiOiBcImJ1aWxkL2xpYi9pbmRleC5janNcIixcbiAgICBcIm1vZHVsZVwiOiBcImJ1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgIFwidHlwZXNcIjogXCJidWlsZC9saWIvaW5kZXguZC50c1wiLFxuICAgIFwiZXhwb3J0c1wiOiB7XG4gICAgICBcIi5cIjoge1xuICAgICAgICBcInR5cGVzOlwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICAgICAgXCJpbXBvcnRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgICAgICBcImRlZmF1bHRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5janNcIlxuICAgICAgfSxcbiAgICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiLFxuICAgICAgXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIlxuICAgIH1cbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkOmxpYlwiOiBcInRzdXAgJiYgdHNjIC0tZW1pdERlY2xhcmF0aW9uT25seVwiLFxuICAgIFwicHVibGlzaDpsb2NhbFwiOiBcInBucG0gdW5wdWJsaXNoIC0tZm9yY2UgJiYgcG5wbSBwdWJsaXNoIC0tbm8tZ2l0LWNoZWNrcyAtLXJlZ2lzdHJ5IGh0dHA6Ly9sb2NhbGhvc3Q6NDg3M1wiLFxuICAgIFwidGVzdDpsaWJcIjogXCJ2aXRlc3QgLS1yZXRyeT0zXCIsXG4gICAgXCJ1bnB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlXCJcbiAgfSxcbiAgXCJzaWRlRWZmZWN0c1wiOiBmYWxzZSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwidHlwZXNcIjogXCJzcmMvaW5kZXgudHNcIlxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VyxTQUFTLHFCQUFxQjtBQUN0WSxPQUFPLFdBQVc7OztBQ0RsQjtBQUFBLEVBQ0UsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsY0FBZ0I7QUFBQSxJQUNkLDBCQUEwQjtBQUFBLElBQzFCLG1CQUFtQjtBQUFBLElBQ25CLDhCQUE4QjtBQUFBLElBQzlCLHlCQUF5QjtBQUFBLElBQ3pCLHlCQUF5QjtBQUFBLElBQ3pCLG1DQUFtQztBQUFBLElBQ25DLGlDQUFpQztBQUFBLElBQ2pDLDJDQUEyQztBQUFBLElBQzNDLHNDQUFzQztBQUFBLElBQ3RDLDBCQUEwQjtBQUFBLElBQzFCLGtDQUFrQztBQUFBLElBQ2xDLGdDQUFnQztBQUFBLElBQ2hDLG9CQUFvQjtBQUFBLElBQ3BCLG9CQUFvQjtBQUFBLElBQ3BCLFdBQVc7QUFBQSxJQUNYLE9BQVM7QUFBQSxJQUNULFdBQVc7QUFBQSxJQUNYLGFBQWU7QUFBQSxJQUNmLGFBQWE7QUFBQSxJQUNiLDJCQUEyQjtBQUFBLElBQzNCLGVBQWU7QUFBQSxJQUNmLGNBQWM7QUFBQSxJQUNkLGVBQWU7QUFBQSxJQUNmLFdBQWE7QUFBQSxJQUNiLGVBQWU7QUFBQSxJQUNmLGNBQWM7QUFBQSxFQUNoQjtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsa0JBQWtCO0FBQUEsSUFDbEIsc0JBQXNCO0FBQUEsRUFDeEI7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULE1BQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFLO0FBQUEsTUFDSCxPQUFTO0FBQUEsTUFDVCxRQUFVO0FBQUEsTUFDVixTQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0Esa0JBQWtCO0FBQUEsRUFDcEI7QUFBQSxFQUNBLE9BQVM7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxFQUNYLE1BQVE7QUFBQSxFQUNSLFFBQVU7QUFBQSxFQUNWLGtCQUFvQjtBQUFBLElBQ2xCLE9BQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLHlCQUF5QjtBQUFBLElBQ3pCLGtDQUFrQztBQUFBLEVBQ3BDO0FBQUEsRUFDQSxlQUFpQjtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0gsVUFBVTtBQUFBLFFBQ1YsUUFBVTtBQUFBLFFBQ1YsU0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLE1BQ2xCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE9BQVM7QUFDWDs7O0FEbEZBLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsY0FBYztBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixNQUFNLGdCQUFZO0FBQUEsSUFDbEIsS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLElBQ1AsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLGVBQWU7QUFBQSxJQUM1QixVQUFVLEVBQUUsU0FBUyxNQUFNLFVBQVUsWUFBWSxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLE1BQU0sRUFBRTtBQUFBLElBQ25HLGNBQWM7QUFBQSxJQUNkLE9BQU87QUFBQSxNQUNMO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLEdBQUcsZ0NBQVM7QUFBQSxNQUMzQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
