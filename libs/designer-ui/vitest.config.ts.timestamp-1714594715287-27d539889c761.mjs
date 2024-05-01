// ../../../../Projects/LogicAppsUX/libs/designer-ui/vitest.config.ts
import { defineProject } from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/vitest@1.5.0_@types+node@20.12.7_@vitest+ui@1.5.0_jsdom@24.0.0/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10/node_modules/@vitejs/plugin-react/dist/index.mjs";

// ../../../../Projects/LogicAppsUX/libs/designer-ui/package.json
var package_default = {
  name: "@microsoft/designer-ui",
  version: "4.13.0",
  dependencies: {
    "@fluentui/react": "8.110.2",
    "@fluentui/react-components": "9.42.0",
    "@fluentui/react-hooks": "8.6.20",
    "@fluentui/react-icons": "2.0.224",
    "@fluentui/theme": "2.6.25",
    "@fluentui/utilities": "8.15.0",
    "@lexical/html": "0.14.5",
    "@lexical/table": "0.14.5",
    "@lexical/link": "0.14.5",
    "@lexical/list": "0.14.5",
    "@lexical/react": "0.14.5",
    "@lexical/rich-text": "0.14.5",
    "@lexical/selection": "0.14.5",
    "@lexical/utils": "0.14.5",
    "@microsoft/logic-apps-shared": "workspace:*",
    "@monaco-editor/react": "4.6.0",
    "@react-hookz/web": "22.0.0",
    dompurify: "3.0.11",
    "fuse.js": "6.6.2",
    lexical: "0.14.5",
    "monaco-editor": "0.44.0",
    "prism-react-renderer": "2.3.1",
    "react-dnd": "16.0.1",
    "react-infinite-scroll-component": "6.1.0",
    "react-intl": "6.3.0",
    "react-markdown": "8.0.5",
    "react-use": "17.4.0",
    reactflow: "11.11.1"
  },
  devDependencies: {
    "@types/dompurify": "3.0.5"
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

// ../../../../Projects/LogicAppsUX/libs/designer-ui/vitest.config.ts
var __vite_injected_original_dirname = "C:\\Users\\hyehwalee\\Projects\\LogicAppsUX\\libs\\designer-ui";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy9kZXNpZ25lci11aS92aXRlc3QuY29uZmlnLnRzIiwgIi4uLy4uLy4uLy4uL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvZGVzaWduZXItdWkvcGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcaHllaHdhbGVlXFxcXFByb2plY3RzXFxcXExvZ2ljQXBwc1VYXFxcXGxpYnNcXFxcZGVzaWduZXItdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXGRlc2lnbmVyLXVpXFxcXHZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2h5ZWh3YWxlZS9Qcm9qZWN0cy9Mb2dpY0FwcHNVWC9saWJzL2Rlc2lnbmVyLXVpL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVQcm9qZWN0IH0gZnJvbSAndml0ZXN0L2NvbmZpZyc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lUHJvamVjdCh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgdGVzdDoge1xuICAgIG5hbWU6IHBhY2thZ2VKc29uLm5hbWUsXG4gICAgZGlyOiAnLi9zcmMnLFxuICAgIHdhdGNoOiBmYWxzZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbJ3Rlc3Qtc2V0dXAudHMnXSxcbiAgICBjb3ZlcmFnZTogeyBlbmFibGVkOiB0cnVlLCBwcm92aWRlcjogJ2lzdGFuYnVsJywgaW5jbHVkZTogWydzcmMvKiovKiddLCByZXBvcnRlcjogWydodG1sJywgJ2pzb24nXSB9LFxuICAgIHJlc3RvcmVNb2NrczogdHJ1ZSxcbiAgICBhbGlhczogW1xuICAgICAge1xuICAgICAgICBmaW5kOiAvXm1vbmFjby1lZGl0b3IkLyxcbiAgICAgICAgcmVwbGFjZW1lbnQ6IGAke19fZGlybmFtZX0vbm9kZV9tb2R1bGVzL21vbmFjby1lZGl0b3IvZXNtL3ZzL2VkaXRvci9lZGl0b3IuYXBpYCxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSxcbn0pO1xuIiwgIntcbiAgXCJuYW1lXCI6IFwiQG1pY3Jvc29mdC9kZXNpZ25lci11aVwiLFxuICBcInZlcnNpb25cIjogXCI0LjEzLjBcIixcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGZsdWVudHVpL3JlYWN0XCI6IFwiOC4xMTAuMlwiLFxuICAgIFwiQGZsdWVudHVpL3JlYWN0LWNvbXBvbmVudHNcIjogXCI5LjQyLjBcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdC1ob29rc1wiOiBcIjguNi4yMFwiLFxuICAgIFwiQGZsdWVudHVpL3JlYWN0LWljb25zXCI6IFwiMi4wLjIyNFwiLFxuICAgIFwiQGZsdWVudHVpL3RoZW1lXCI6IFwiMi42LjI1XCIsXG4gICAgXCJAZmx1ZW50dWkvdXRpbGl0aWVzXCI6IFwiOC4xNS4wXCIsXG4gICAgXCJAbGV4aWNhbC9odG1sXCI6IFwiMC4xNC41XCIsXG4gICAgXCJAbGV4aWNhbC90YWJsZVwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvbGlua1wiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvbGlzdFwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvcmVhY3RcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL3JpY2gtdGV4dFwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvc2VsZWN0aW9uXCI6IFwiMC4xNC41XCIsXG4gICAgXCJAbGV4aWNhbC91dGlsc1wiOiBcIjAuMTQuNVwiLFxuICAgIFwiQG1pY3Jvc29mdC9sb2dpYy1hcHBzLXNoYXJlZFwiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAbW9uYWNvLWVkaXRvci9yZWFjdFwiOiBcIjQuNi4wXCIsXG4gICAgXCJAcmVhY3QtaG9va3ovd2ViXCI6IFwiMjIuMC4wXCIsXG4gICAgXCJkb21wdXJpZnlcIjogXCIzLjAuMTFcIixcbiAgICBcImZ1c2UuanNcIjogXCI2LjYuMlwiLFxuICAgIFwibGV4aWNhbFwiOiBcIjAuMTQuNVwiLFxuICAgIFwibW9uYWNvLWVkaXRvclwiOiBcIjAuNDQuMFwiLFxuICAgIFwicHJpc20tcmVhY3QtcmVuZGVyZXJcIjogXCIyLjMuMVwiLFxuICAgIFwicmVhY3QtZG5kXCI6IFwiMTYuMC4xXCIsXG4gICAgXCJyZWFjdC1pbmZpbml0ZS1zY3JvbGwtY29tcG9uZW50XCI6IFwiNi4xLjBcIixcbiAgICBcInJlYWN0LWludGxcIjogXCI2LjMuMFwiLFxuICAgIFwicmVhY3QtbWFya2Rvd25cIjogXCI4LjAuNVwiLFxuICAgIFwicmVhY3QtdXNlXCI6IFwiMTcuNC4wXCIsXG4gICAgXCJyZWFjdGZsb3dcIjogXCIxMS4xMS4xXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQHR5cGVzL2RvbXB1cmlmeVwiOiBcIjMuMC41XCJcbiAgfSxcbiAgXCJlbmdpbmVzXCI6IHtcbiAgICBcIm5vZGVcIjogXCI+PTEyXCJcbiAgfSxcbiAgXCJleHBvcnRzXCI6IHtcbiAgICBcIi5cIjoge1xuICAgICAgXCJ0eXBlc1wiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImltcG9ydFwiOiBcIi4vc3JjL2luZGV4LnRzXCIsXG4gICAgICBcImRlZmF1bHRcIjogXCIuL3NyYy9pbmRleC50c1wiXG4gICAgfSxcbiAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIlxuICB9LFxuICBcImZpbGVzXCI6IFtcbiAgICBcImJ1aWxkL2xpYi8qKi8qXCIsXG4gICAgXCJzcmNcIlxuICBdLFxuICBcImxpY2Vuc2VcIjogXCJNSVRcIixcbiAgXCJtYWluXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwibW9kdWxlXCI6IFwic3JjL2luZGV4LnRzXCIsXG4gIFwicGVlckRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJyZWFjdFwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTYuNC4wIHx8IF4xNy4wLjAgfHwgXjE4LjAuMFwiLFxuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCI6IFwiNC4zNi4xXCIsXG4gICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnktZGV2dG9vbHNcIjogXCI0LjM2LjFcIlxuICB9LFxuICBcInB1Ymxpc2hDb25maWdcIjoge1xuICAgIFwibWFpblwiOiBcImJ1aWxkL2xpYi9pbmRleC5janNcIixcbiAgICBcIm1vZHVsZVwiOiBcImJ1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgIFwidHlwZXNcIjogXCJidWlsZC9saWIvaW5kZXguZC50c1wiLFxuICAgIFwiZXhwb3J0c1wiOiB7XG4gICAgICBcIi5cIjoge1xuICAgICAgICBcInR5cGVzOlwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICAgICAgXCJpbXBvcnRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgICAgICBcImRlZmF1bHRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5janNcIlxuICAgICAgfSxcbiAgICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiLFxuICAgICAgXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIlxuICAgIH1cbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkOmxpYlwiOiBcInRzdXAgJiYgdHNjIC0tZW1pdERlY2xhcmF0aW9uT25seVwiLFxuICAgIFwicHVibGlzaDpsb2NhbFwiOiBcInBucG0gdW5wdWJsaXNoIC0tZm9yY2UgJiYgcG5wbSBwdWJsaXNoIC0tbm8tZ2l0LWNoZWNrcyAtLXJlZ2lzdHJ5IGh0dHA6Ly9sb2NhbGhvc3Q6NDg3M1wiLFxuICAgIFwidGVzdDpsaWJcIjogXCJ2aXRlc3QgLS1yZXRyeT0zXCIsXG4gICAgXCJ1bnB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlXCJcbiAgfSxcbiAgXCJzaWRlRWZmZWN0c1wiOiBmYWxzZSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwidHlwZXNcIjogXCJzcmMvaW5kZXgudHNcIlxufSJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFcsU0FBUyxxQkFBcUI7QUFDMVksT0FBTyxXQUFXOzs7QUNEbEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGNBQWdCO0FBQUEsSUFDZCxtQkFBbUI7QUFBQSxJQUNuQiw4QkFBOEI7QUFBQSxJQUM5Qix5QkFBeUI7QUFBQSxJQUN6Qix5QkFBeUI7QUFBQSxJQUN6QixtQkFBbUI7QUFBQSxJQUNuQix1QkFBdUI7QUFBQSxJQUN2QixpQkFBaUI7QUFBQSxJQUNqQixrQkFBa0I7QUFBQSxJQUNsQixpQkFBaUI7QUFBQSxJQUNqQixpQkFBaUI7QUFBQSxJQUNqQixrQkFBa0I7QUFBQSxJQUNsQixzQkFBc0I7QUFBQSxJQUN0QixzQkFBc0I7QUFBQSxJQUN0QixrQkFBa0I7QUFBQSxJQUNsQixnQ0FBZ0M7QUFBQSxJQUNoQyx3QkFBd0I7QUFBQSxJQUN4QixvQkFBb0I7QUFBQSxJQUNwQixXQUFhO0FBQUEsSUFDYixXQUFXO0FBQUEsSUFDWCxTQUFXO0FBQUEsSUFDWCxpQkFBaUI7QUFBQSxJQUNqQix3QkFBd0I7QUFBQSxJQUN4QixhQUFhO0FBQUEsSUFDYixtQ0FBbUM7QUFBQSxJQUNuQyxjQUFjO0FBQUEsSUFDZCxrQkFBa0I7QUFBQSxJQUNsQixhQUFhO0FBQUEsSUFDYixXQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsb0JBQW9CO0FBQUEsRUFDdEI7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULE1BQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFLO0FBQUEsTUFDSCxPQUFTO0FBQUEsTUFDVCxRQUFVO0FBQUEsTUFDVixTQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0Esa0JBQWtCO0FBQUEsRUFDcEI7QUFBQSxFQUNBLE9BQVM7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxFQUNYLE1BQVE7QUFBQSxFQUNSLFFBQVU7QUFBQSxFQUNWLGtCQUFvQjtBQUFBLElBQ2xCLE9BQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLHlCQUF5QjtBQUFBLElBQ3pCLGtDQUFrQztBQUFBLEVBQ3BDO0FBQUEsRUFDQSxlQUFpQjtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0gsVUFBVTtBQUFBLFFBQ1YsUUFBVTtBQUFBLFFBQ1YsU0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLE1BQ2xCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE9BQVM7QUFDWDs7O0FEbkZBLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sd0JBQVEsY0FBYztBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixNQUFNLGdCQUFZO0FBQUEsSUFDbEIsS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLElBQ1AsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLGVBQWU7QUFBQSxJQUM1QixVQUFVLEVBQUUsU0FBUyxNQUFNLFVBQVUsWUFBWSxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLE1BQU0sRUFBRTtBQUFBLElBQ25HLGNBQWM7QUFBQSxJQUNkLE9BQU87QUFBQSxNQUNMO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLEdBQUcsZ0NBQVM7QUFBQSxNQUMzQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
