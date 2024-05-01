// ../../../../Projects/LogicAppsUX/libs/designer/vitest.config.ts
import { defineProject } from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/vitest@1.5.0_@types+node@20.12.7_@vitest+ui@1.5.0_jsdom@24.0.0/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10/node_modules/@vitejs/plugin-react/dist/index.mjs";

// ../../../../Projects/LogicAppsUX/libs/designer/package.json
var package_default = {
  name: "@microsoft/logic-apps-designer",
  version: "4.13.0",
  dependencies: {
    "@fluentui/azure-themes": "8.5.70",
    "@fluentui/react": "8.110.2",
    "@fluentui/react-components": "9.42.0",
    "@fluentui/react-hooks": "8.6.20",
    "@fluentui/react-icons": "2.0.224",
    "@fluentui/utilities": "8.15.0",
    "@microsoft/applicationinsights-core-js": "2.8.9",
    "@microsoft/designer-ui": "workspace:*",
    "@microsoft/logic-apps-shared": "workspace:*",
    "@react-hookz/web": "22.0.0",
    "@reduxjs/toolkit": "1.8.5",
    elkjs: "0.8.2",
    "fuse.js": "6.6.2",
    immer: "9.0.15",
    "lodash.frompairs": "4.0.1",
    "lodash.merge": "4.6.2",
    "monaco-editor": "0.44.0",
    "react-dnd": "16.0.1",
    "react-dnd-accessible-backend": "1.0.1",
    "react-dnd-html5-backend": "16.0.1",
    "react-dnd-multi-backend": "8.0.0",
    "react-hotkeys-hook": "4.3.8",
    "react-intl": "6.3.0",
    "react-redux": "8.0.2",
    reactflow: "11.11.1",
    "redux-thunk": "2.4.2",
    reselect: "4.1.8",
    "to-title-case": "1.0.0",
    util: "0.12.5",
    "yocto-queue": "0.1.0"
  },
  devDependencies: {
    "@formatjs/intl": "^2.10.1",
    "@types/lodash.frompairs": "^4.0.9",
    "@types/lodash.merge": "^4.6.9",
    "@types/to-title-case": "^1.0.2"
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

// ../../../../Projects/LogicAppsUX/libs/designer/vitest.config.ts
var __vite_injected_original_dirname = "C:\\Users\\hyehwalee\\Projects\\LogicAppsUX\\libs\\designer";
var vitest_config_default = defineProject({
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
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy9kZXNpZ25lci92aXRlc3QuY29uZmlnLnRzIiwgIi4uLy4uLy4uLy4uL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvZGVzaWduZXIvcGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcaHllaHdhbGVlXFxcXFByb2plY3RzXFxcXExvZ2ljQXBwc1VYXFxcXGxpYnNcXFxcZGVzaWduZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXGRlc2lnbmVyXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2h5ZWh3YWxlZS9Qcm9qZWN0cy9Mb2dpY0FwcHNVWC9saWJzL2Rlc2lnbmVyL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVQcm9qZWN0IH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lUHJvamVjdCh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIG5hbWU6IHBhY2thZ2VKc29uLm5hbWUsXG4gICAgZGlyOiAnLi9zcmMnLFxuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbJ3Rlc3Qtc2V0dXAudHMnXSxcbiAgICBjb3ZlcmFnZTogeyBlbmFibGVkOiB0cnVlLCBwcm92aWRlcjogJ2lzdGFuYnVsJywgaW5jbHVkZTogWydzcmMvKiovKiddLCByZXBvcnRlcjogWydodG1sJywgJ2pzb24nXSB9LFxuICAgIHJlc3RvcmVNb2NrczogdHJ1ZSxcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAvXm1vbmFjby1lZGl0b3IkLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IGAke19fZGlybmFtZX0vbm9kZV9tb2R1bGVzL21vbmFjby1lZGl0b3IvZXNtL3ZzL2VkaXRvci9lZGl0b3IuYXBpYCxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pO1xuIiwgIntcbiAgXCJuYW1lXCI6IFwiQG1pY3Jvc29mdC9sb2dpYy1hcHBzLWRlc2lnbmVyXCIsXG4gIFwidmVyc2lvblwiOiBcIjQuMTMuMFwiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAZmx1ZW50dWkvYXp1cmUtdGhlbWVzXCI6IFwiOC41LjcwXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3RcIjogXCI4LjExMC4yXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtY29tcG9uZW50c1wiOiBcIjkuNDIuMFwiLFxuICAgIFwiQGZsdWVudHVpL3JlYWN0LWhvb2tzXCI6IFwiOC42LjIwXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtaWNvbnNcIjogXCIyLjAuMjI0XCIsXG4gICAgXCJAZmx1ZW50dWkvdXRpbGl0aWVzXCI6IFwiOC4xNS4wXCIsXG4gICAgXCJAbWljcm9zb2Z0L2FwcGxpY2F0aW9uaW5zaWdodHMtY29yZS1qc1wiOiBcIjIuOC45XCIsXG4gICAgXCJAbWljcm9zb2Z0L2Rlc2lnbmVyLXVpXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkBtaWNyb3NvZnQvbG9naWMtYXBwcy1zaGFyZWRcIjogXCJ3b3Jrc3BhY2U6KlwiLFxuICAgIFwiQHJlYWN0LWhvb2t6L3dlYlwiOiBcIjIyLjAuMFwiLFxuICAgIFwiQHJlZHV4anMvdG9vbGtpdFwiOiBcIjEuOC41XCIsXG4gICAgXCJlbGtqc1wiOiBcIjAuOC4yXCIsXG4gICAgXCJmdXNlLmpzXCI6IFwiNi42LjJcIixcbiAgICBcImltbWVyXCI6IFwiOS4wLjE1XCIsXG4gICAgXCJsb2Rhc2guZnJvbXBhaXJzXCI6IFwiNC4wLjFcIixcbiAgICBcImxvZGFzaC5tZXJnZVwiOiBcIjQuNi4yXCIsXG4gICAgXCJtb25hY28tZWRpdG9yXCI6IFwiMC40NC4wXCIsXG4gICAgXCJyZWFjdC1kbmRcIjogXCIxNi4wLjFcIixcbiAgICBcInJlYWN0LWRuZC1hY2Nlc3NpYmxlLWJhY2tlbmRcIjogXCIxLjAuMVwiLFxuICAgIFwicmVhY3QtZG5kLWh0bWw1LWJhY2tlbmRcIjogXCIxNi4wLjFcIixcbiAgICBcInJlYWN0LWRuZC1tdWx0aS1iYWNrZW5kXCI6IFwiOC4wLjBcIixcbiAgICBcInJlYWN0LWhvdGtleXMtaG9va1wiOiBcIjQuMy44XCIsXG4gICAgXCJyZWFjdC1pbnRsXCI6IFwiNi4zLjBcIixcbiAgICBcInJlYWN0LXJlZHV4XCI6IFwiOC4wLjJcIixcbiAgICBcInJlYWN0Zmxvd1wiOiBcIjExLjExLjFcIixcbiAgICBcInJlZHV4LXRodW5rXCI6IFwiMi40LjJcIixcbiAgICBcInJlc2VsZWN0XCI6IFwiNC4xLjhcIixcbiAgICBcInRvLXRpdGxlLWNhc2VcIjogXCIxLjAuMFwiLFxuICAgIFwidXRpbFwiOiBcIjAuMTIuNVwiLFxuICAgIFwieW9jdG8tcXVldWVcIjogXCIwLjEuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBmb3JtYXRqcy9pbnRsXCI6IFwiXjIuMTAuMVwiLFxuICAgIFwiQHR5cGVzL2xvZGFzaC5mcm9tcGFpcnNcIjogXCJeNC4wLjlcIixcbiAgICBcIkB0eXBlcy9sb2Rhc2gubWVyZ2VcIjogXCJeNC42LjlcIixcbiAgICBcIkB0eXBlcy90by10aXRsZS1jYXNlXCI6IFwiXjEuMC4yXCJcbiAgfSxcbiAgXCJlbmdpbmVzXCI6IHtcbiAgICBcIm5vZGVcIjogXCI+PTEyXCJcbiAgfSxcbiAgXCJleHBvcnRzXCI6IHtcbiAgICBcIi5cIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL3NyYy9pbmRleC50c1wiXG4gICAgfSxcbiAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIlxuICB9LFxuICBcImZpbGVzXCI6IFtcbiAgICBcImJ1aWxkL2xpYi8qKi8qXCIsXG4gICAgXCJzcmNcIlxuICBdLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJtYWluXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwibW9kdWxlXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJyZWFjdFwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTYuNC4wIHx8IF4xNy4wLjAgfHwgXjE4LjAuMFwiLFxuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCI6IFwiNC4zNi4xXCIsXG4gICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnktZGV2dG9vbHNcIjogXCI0LjM2LjFcIlxuICB9LFxuICBcInB1Ymxpc2hDb25maWdcIjoge1xuICAgIFwibWFpblwiOiBcImJ1aWxkL2xpYi9pbmRleC5janNcIixcbiAgICBcIm1vZHVsZVwiOiBcImJ1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgIFwidHlwZXNcIjogXCJidWlsZC9saWIvaW5kZXguZC50c1wiLFxuICAgIFwiZXhwb3J0c1wiOiB7XG4gICAgICBcIi5cIjoge1xuICAgICAgICBcInR5cGVzOlwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICAgICAgXCJpbXBvcnRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgICAgICBcImRlZmF1bHRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5janNcIlxuICAgICAgfSxcbiAgICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiLFxuICAgICAgXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIlxuICAgIH1cbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkOmxpYlwiOiBcInRzdXAgJiYgdHNjIC0tZW1pdERlY2xhcmF0aW9uT25seVwiLFxuICAgIFwicHVibGlzaDpsb2NhbFwiOiBcInBucG0gdW5wdWJsaXNoIC0tZm9yY2UgJiYgcG5wbSBwdWJsaXNoIC0tbm8tZ2l0LWNoZWNrcyAtLXJlZ2lzdHJ5IGh0dHA6Ly9sb2NhbGhvc3Q6NDg3M1wiLFxuICAgIFwidGVzdDpsaWJcIjogXCJ2aXRlc3QgLS1yZXRyeT0zXCIsXG4gICAgXCJ1bnB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlXCJcbiAgfSxcbiAgXCJzaWRlRWZmZWN0c1wiOiBmYWxzZSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwidHlwZXNcIjogXCJzcmMvaW5kZXgudHNcIlxufSJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVcsU0FBUyxxQkFBcUI7QUFDalksT0FBTyxXQUFXOzs7QUNEbEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGNBQWdCO0FBQUEsSUFDZCwwQkFBMEI7QUFBQSxJQUMxQixtQkFBbUI7QUFBQSxJQUNuQiw4QkFBOEI7QUFBQSxJQUM5Qix5QkFBeUI7QUFBQSxJQUN6Qix5QkFBeUI7QUFBQSxJQUN6Qix1QkFBdUI7QUFBQSxJQUN2QiwwQ0FBMEM7QUFBQSxJQUMxQywwQkFBMEI7QUFBQSxJQUMxQixnQ0FBZ0M7QUFBQSxJQUNoQyxvQkFBb0I7QUFBQSxJQUNwQixvQkFBb0I7QUFBQSxJQUNwQixPQUFTO0FBQUEsSUFDVCxXQUFXO0FBQUEsSUFDWCxPQUFTO0FBQUEsSUFDVCxvQkFBb0I7QUFBQSxJQUNwQixnQkFBZ0I7QUFBQSxJQUNoQixpQkFBaUI7QUFBQSxJQUNqQixhQUFhO0FBQUEsSUFDYixnQ0FBZ0M7QUFBQSxJQUNoQywyQkFBMkI7QUFBQSxJQUMzQiwyQkFBMkI7QUFBQSxJQUMzQixzQkFBc0I7QUFBQSxJQUN0QixjQUFjO0FBQUEsSUFDZCxlQUFlO0FBQUEsSUFDZixXQUFhO0FBQUEsSUFDYixlQUFlO0FBQUEsSUFDZixVQUFZO0FBQUEsSUFDWixpQkFBaUI7QUFBQSxJQUNqQixNQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsRUFDakI7QUFBQSxFQUNBLGlCQUFtQjtBQUFBLElBQ2pCLGtCQUFrQjtBQUFBLElBQ2xCLDJCQUEyQjtBQUFBLElBQzNCLHVCQUF1QjtBQUFBLElBQ3ZCLHdCQUF3QjtBQUFBLEVBQzFCO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxNQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsS0FBSztBQUFBLE1BQ0gsT0FBUztBQUFBLE1BQ1QsUUFBVTtBQUFBLE1BQ1YsU0FBVztBQUFBLElBQ2I7QUFBQSxJQUNBLGtCQUFrQjtBQUFBLEVBQ3BCO0FBQUEsRUFDQSxPQUFTO0FBQUEsSUFDUDtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFXO0FBQUEsRUFDWCxNQUFRO0FBQUEsRUFDUixRQUFVO0FBQUEsRUFDVixrQkFBb0I7QUFBQSxJQUNsQixPQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYix5QkFBeUI7QUFBQSxJQUN6QixrQ0FBa0M7QUFBQSxFQUNwQztBQUFBLEVBQ0EsZUFBaUI7QUFBQSxJQUNmLE1BQVE7QUFBQSxJQUNSLFFBQVU7QUFBQSxJQUNWLE9BQVM7QUFBQSxJQUNULFNBQVc7QUFBQSxNQUNULEtBQUs7QUFBQSxRQUNILFVBQVU7QUFBQSxRQUNWLFFBQVU7QUFBQSxRQUNWLFNBQVc7QUFBQSxNQUNiO0FBQUEsTUFDQSxrQkFBa0I7QUFBQSxNQUNsQix5QkFBeUI7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLGlCQUFpQjtBQUFBLElBQ2pCLFlBQVk7QUFBQSxJQUNaLG1CQUFtQjtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxhQUFlO0FBQUEsRUFDZixNQUFRO0FBQUEsRUFDUixPQUFTO0FBQ1g7OztBRHhGQSxJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHdCQUFRLGNBQWM7QUFBQSxFQUMzQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsTUFBTTtBQUFBLElBQ0osTUFBTSxnQkFBWTtBQUFBLElBQ2xCLEtBQUs7QUFBQSxJQUNMLE9BQU87QUFBQSxJQUNQLGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxlQUFlO0FBQUEsSUFDNUIsVUFBVSxFQUFFLFNBQVMsTUFBTSxVQUFVLFlBQVksU0FBUyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsUUFBUSxNQUFNLEVBQUU7QUFBQSxJQUNuRyxjQUFjO0FBQUEsSUFDZCxPQUFPO0FBQUEsTUFDTDtBQUFBLFFBQ0UsTUFBTTtBQUFBLFFBQ04sYUFBYSxHQUFHLGdDQUFTO0FBQUEsTUFDM0I7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
