// vitest.config.ts
import { defineProject } from "vitest/config";
import react from "@vitejs/plugin-react";

// package.json
var package_default = {
  name: "@microsoft/designer-ui",
  version: "4.33.0",
  dependencies: {
    "@fluentui/react": "8.110.2",
    "@fluentui/react-components": "9.42.0",
    "@fluentui/react-hooks": "8.6.20",
    "@fluentui/react-icons": "2.0.224",
    "@fluentui/theme": "2.6.25",
    "@fluentui/utilities": "8.15.0",
    "@lexical/html": "0.14.5",
    "@lexical/link": "0.14.5",
    "@lexical/list": "0.14.5",
    "@lexical/react": "0.14.5",
    "@lexical/rich-text": "0.14.5",
    "@lexical/selection": "0.14.5",
    "@lexical/table": "0.14.5",
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
    "@types/dompurify": "3.0.5",
    "timezone-mock": "^1.3.6"
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
    "@tanstack/react-query": "4.36.1",
    "@tanstack/react-query-devtools": "4.36.1",
    react: "^16.4.0 || ^17.0.0 || ^18.0.0",
    "react-dom": "^16.4.0 || ^17.0.0 || ^18.0.0"
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

// vitest.config.ts
var __vite_injected_original_dirname = "C:\\Users\\hyehwalee\\Projects\\LogicAppsUX\\libs\\designer-ui";
var vitest_config_default = defineProject({
  plugins: [react()],
  test: {
    name: package_default.name,
    dir: "./src",
    watch: false,
    environment: "jsdom",
    setupFiles: ["test-setup.ts"],
    globalSetup: "./test-globals.ts",
    coverage: { enabled: true, provider: "istanbul", include: ["src/**/*"], reporter: ["html", "cobertura"] },
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyIsICJwYWNrYWdlLmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxoeWVod2FsZWVcXFxcUHJvamVjdHNcXFxcTG9naWNBcHBzVVhcXFxcbGlic1xcXFxkZXNpZ25lci11aVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcaHllaHdhbGVlXFxcXFByb2plY3RzXFxcXExvZ2ljQXBwc1VYXFxcXGxpYnNcXFxcZGVzaWduZXItdWlcXFxcdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvaHllaHdhbGVlL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvZGVzaWduZXItdWkvdml0ZXN0LmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZVByb2plY3QgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLmpzb24nO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVQcm9qZWN0KHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICB0ZXN0OiB7XG4gICAgbmFtZTogcGFja2FnZUpzb24ubmFtZSxcbiAgICBkaXI6ICcuL3NyYycsXG4gICAgd2F0Y2g6IGZhbHNlLFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIHNldHVwRmlsZXM6IFsndGVzdC1zZXR1cC50cyddLFxuICAgIGdsb2JhbFNldHVwOiAnLi90ZXN0LWdsb2JhbHMudHMnLFxuICAgIGNvdmVyYWdlOiB7IGVuYWJsZWQ6IHRydWUsIHByb3ZpZGVyOiAnaXN0YW5idWwnLCBpbmNsdWRlOiBbJ3NyYy8qKi8qJ10sIHJlcG9ydGVyOiBbJ2h0bWwnLCAnY29iZXJ0dXJhJ10gfSxcbiAgICByZXN0b3JlTW9ja3M6IHRydWUsXG4gICAgYWxpYXM6IFtcbiAgICAgIHtcbiAgICAgICAgZmluZDogL15tb25hY28tZWRpdG9yJC8sXG4gICAgICAgIHJlcGxhY2VtZW50OiBgJHtfX2Rpcm5hbWV9L25vZGVfbW9kdWxlcy9tb25hY28tZWRpdG9yL2VzbS92cy9lZGl0b3IvZWRpdG9yLmFwaWAsXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG59KTtcbiIsICJ7XG4gIFwibmFtZVwiOiBcIkBtaWNyb3NvZnQvZGVzaWduZXItdWlcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiNC4zMy4wXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBmbHVlbnR1aS9yZWFjdFwiOiBcIjguMTEwLjJcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdC1jb21wb25lbnRzXCI6IFwiOS40Mi4wXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtaG9va3NcIjogXCI4LjYuMjBcIixcbiAgICBcIkBmbHVlbnR1aS9yZWFjdC1pY29uc1wiOiBcIjIuMC4yMjRcIixcbiAgICBcIkBmbHVlbnR1aS90aGVtZVwiOiBcIjIuNi4yNVwiLFxuICAgIFwiQGZsdWVudHVpL3V0aWxpdGllc1wiOiBcIjguMTUuMFwiLFxuICAgIFwiQGxleGljYWwvaHRtbFwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvbGlua1wiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvbGlzdFwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvcmVhY3RcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL3JpY2gtdGV4dFwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvc2VsZWN0aW9uXCI6IFwiMC4xNC41XCIsXG4gICAgXCJAbGV4aWNhbC90YWJsZVwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvdXRpbHNcIjogXCIwLjE0LjVcIixcbiAgICBcIkBtaWNyb3NvZnQvbG9naWMtYXBwcy1zaGFyZWRcIjogXCJ3b3Jrc3BhY2U6KlwiLFxuICAgIFwiQG1vbmFjby1lZGl0b3IvcmVhY3RcIjogXCI0LjYuMFwiLFxuICAgIFwiQHJlYWN0LWhvb2t6L3dlYlwiOiBcIjIyLjAuMFwiLFxuICAgIFwiZG9tcHVyaWZ5XCI6IFwiMy4wLjExXCIsXG4gICAgXCJmdXNlLmpzXCI6IFwiNi42LjJcIixcbiAgICBcImxleGljYWxcIjogXCIwLjE0LjVcIixcbiAgICBcIm1vbmFjby1lZGl0b3JcIjogXCIwLjQ0LjBcIixcbiAgICBcInByaXNtLXJlYWN0LXJlbmRlcmVyXCI6IFwiMi4zLjFcIixcbiAgICBcInJlYWN0LWRuZFwiOiBcIjE2LjAuMVwiLFxuICAgIFwicmVhY3QtaW5maW5pdGUtc2Nyb2xsLWNvbXBvbmVudFwiOiBcIjYuMS4wXCIsXG4gICAgXCJyZWFjdC1pbnRsXCI6IFwiNi4zLjBcIixcbiAgICBcInJlYWN0LW1hcmtkb3duXCI6IFwiOC4wLjVcIixcbiAgICBcInJlYWN0LXVzZVwiOiBcIjE3LjQuMFwiLFxuICAgIFwicmVhY3RmbG93XCI6IFwiMTEuMTEuMVwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkB0eXBlcy9kb21wdXJpZnlcIjogXCIzLjAuNVwiLFxuICAgIFwidGltZXpvbmUtbW9ja1wiOiBcIl4xLjMuNlwiXG4gIH0sXG4gIFwiZW5naW5lc1wiOiB7XG4gICAgXCJub2RlXCI6IFwiPj0xMlwiXG4gIH0sXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwidHlwZXNcIjogXCIuL3NyYy9pbmRleC50c1wiLFxuICAgICAgXCJpbXBvcnRcIjogXCIuL3NyYy9pbmRleC50c1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9zcmMvaW5kZXgudHNcIlxuICAgIH0sXG4gICAgXCIuL3BhY2thZ2UuanNvblwiOiBcIi4vcGFja2FnZS5qc29uXCJcbiAgfSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCJidWlsZC9saWIvKiovKlwiLFxuICAgIFwic3JjXCJcbiAgXSxcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwibWFpblwiOiBcInNyYy9pbmRleC50c1wiLFxuICBcIm1vZHVsZVwiOiBcInNyYy9pbmRleC50c1wiLFxuICBcInBlZXJEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCI6IFwiNC4zNi4xXCIsXG4gICAgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnktZGV2dG9vbHNcIjogXCI0LjM2LjFcIixcbiAgICBcInJlYWN0XCI6IFwiXjE2LjQuMCB8fCBeMTcuMC4wIHx8IF4xOC4wLjBcIixcbiAgICBcInJlYWN0LWRvbVwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCJcbiAgfSxcbiAgXCJwdWJsaXNoQ29uZmlnXCI6IHtcbiAgICBcIm1haW5cIjogXCJidWlsZC9saWIvaW5kZXguY2pzXCIsXG4gICAgXCJtb2R1bGVcIjogXCJidWlsZC9saWIvaW5kZXguanNcIixcbiAgICBcInR5cGVzXCI6IFwiYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICBcImV4cG9ydHNcIjoge1xuICAgICAgXCIuXCI6IHtcbiAgICAgICAgXCJ0eXBlczpcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5kLnRzXCIsXG4gICAgICAgIFwiaW1wb3J0XCI6IFwiLi9idWlsZC9saWIvaW5kZXguanNcIixcbiAgICAgICAgXCJkZWZhdWx0XCI6IFwiLi9idWlsZC9saWIvaW5kZXguY2pzXCJcbiAgICAgIH0sXG4gICAgICBcIi4vcGFja2FnZS5qc29uXCI6IFwiLi9wYWNrYWdlLmpzb25cIixcbiAgICAgIFwiLi9idWlsZC9saWIvaW5kZXguY3NzXCI6IFwiLi9idWlsZC9saWIvaW5kZXguY3NzXCJcbiAgICB9XG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJidWlsZDpsaWJcIjogXCJ0c3VwICYmIHRzYyAtLWVtaXREZWNsYXJhdGlvbk9ubHlcIixcbiAgICBcInB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlICYmIHBucG0gcHVibGlzaCAtLW5vLWdpdC1jaGVja3MgLS1yZWdpc3RyeSBodHRwOi8vbG9jYWxob3N0OjQ4NzNcIixcbiAgICBcInRlc3Q6bGliXCI6IFwidml0ZXN0IC0tcmV0cnk9M1wiLFxuICAgIFwidW5wdWJsaXNoOmxvY2FsXCI6IFwicG5wbSB1bnB1Ymxpc2ggLS1mb3JjZVwiXG4gIH0sXG4gIFwic2lkZUVmZmVjdHNcIjogZmFsc2UsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcInR5cGVzXCI6IFwic3JjL2luZGV4LnRzXCJcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFcsU0FBUyxxQkFBcUI7QUFDMVksT0FBTyxXQUFXOzs7QUNEbEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGNBQWdCO0FBQUEsSUFDZCxtQkFBbUI7QUFBQSxJQUNuQiw4QkFBOEI7QUFBQSxJQUM5Qix5QkFBeUI7QUFBQSxJQUN6Qix5QkFBeUI7QUFBQSxJQUN6QixtQkFBbUI7QUFBQSxJQUNuQix1QkFBdUI7QUFBQSxJQUN2QixpQkFBaUI7QUFBQSxJQUNqQixpQkFBaUI7QUFBQSxJQUNqQixpQkFBaUI7QUFBQSxJQUNqQixrQkFBa0I7QUFBQSxJQUNsQixzQkFBc0I7QUFBQSxJQUN0QixzQkFBc0I7QUFBQSxJQUN0QixrQkFBa0I7QUFBQSxJQUNsQixrQkFBa0I7QUFBQSxJQUNsQixnQ0FBZ0M7QUFBQSxJQUNoQyx3QkFBd0I7QUFBQSxJQUN4QixvQkFBb0I7QUFBQSxJQUNwQixXQUFhO0FBQUEsSUFDYixXQUFXO0FBQUEsSUFDWCxTQUFXO0FBQUEsSUFDWCxpQkFBaUI7QUFBQSxJQUNqQix3QkFBd0I7QUFBQSxJQUN4QixhQUFhO0FBQUEsSUFDYixtQ0FBbUM7QUFBQSxJQUNuQyxjQUFjO0FBQUEsSUFDZCxrQkFBa0I7QUFBQSxJQUNsQixhQUFhO0FBQUEsSUFDYixXQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsb0JBQW9CO0FBQUEsSUFDcEIsaUJBQWlCO0FBQUEsRUFDbkI7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULE1BQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxLQUFLO0FBQUEsTUFDSCxPQUFTO0FBQUEsTUFDVCxRQUFVO0FBQUEsTUFDVixTQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0Esa0JBQWtCO0FBQUEsRUFDcEI7QUFBQSxFQUNBLE9BQVM7QUFBQSxJQUNQO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxFQUNYLE1BQVE7QUFBQSxFQUNSLFFBQVU7QUFBQSxFQUNWLGtCQUFvQjtBQUFBLElBQ2xCLHlCQUF5QjtBQUFBLElBQ3pCLGtDQUFrQztBQUFBLElBQ2xDLE9BQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxlQUFpQjtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0gsVUFBVTtBQUFBLFFBQ1YsUUFBVTtBQUFBLFFBQ1YsU0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLE1BQ2xCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE9BQVM7QUFDWDs7O0FEcEZBLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sd0JBQVEsY0FBYztBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixNQUFNLGdCQUFZO0FBQUEsSUFDbEIsS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLElBQ1AsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLGVBQWU7QUFBQSxJQUM1QixhQUFhO0FBQUEsSUFDYixVQUFVLEVBQUUsU0FBUyxNQUFNLFVBQVUsWUFBWSxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLFdBQVcsRUFBRTtBQUFBLElBQ3hHLGNBQWM7QUFBQSxJQUNkLE9BQU87QUFBQSxNQUNMO0FBQUEsUUFDRSxNQUFNO0FBQUEsUUFDTixhQUFhLEdBQUcsZ0NBQVM7QUFBQSxNQUMzQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
