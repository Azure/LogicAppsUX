// vitest.config.ts
import { defineProject } from "file:///C:/Users/rileyevans/Documents/dev/Designer/node_modules/.pnpm/vitest@2.1.3_@types+node@20.12.7_@vitest+ui@2.1.3_jsdom@24.0.0_less@4.2.0_terser@5.30.2/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/rileyevans/Documents/dev/Designer/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.4.11_@types+node@20.12.7_less@4.2.0_terser@5.30.2_/node_modules/@vitejs/plugin-react/dist/index.mjs";

// package.json
var package_default = {
  name: "@microsoft/designer-ui",
  version: "5.10.0",
  dependencies: {
    "@fluentui/react": "8.110.2",
    "@fluentui/react-components": "9.56.0",
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
    "@xyflow/react": "^12.3.5",
    dompurify: "3.1.3",
    "fuse.js": "6.6.2",
    lexical: "0.14.5",
    "monaco-editor": "0.44.0",
    "prism-react-renderer": "2.3.1",
    "react-dnd": "16.0.1",
    "react-infinite-scroll-component": "6.1.0",
    "react-intl": "6.3.0",
    "react-markdown": "8.0.5",
    "react-use": "17.4.0"
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
    "test:lib": "vitest run --retry=3",
    "unpublish:local": "pnpm unpublish --force"
  },
  sideEffects: false,
  type: "module",
  types: "src/index.ts"
};

// vitest.config.ts
var __vite_injected_original_dirname = "C:\\Users\\rileyevans\\Documents\\dev\\Designer\\libs\\designer-ui";
var vitest_config_default = defineProject({
  plugins: [react()],
  test: {
    name: package_default.name,
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyIsICJwYWNrYWdlLmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxyaWxleWV2YW5zXFxcXERvY3VtZW50c1xcXFxkZXZcXFxcRGVzaWduZXJcXFxcbGlic1xcXFxkZXNpZ25lci11aVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxccmlsZXlldmFuc1xcXFxEb2N1bWVudHNcXFxcZGV2XFxcXERlc2lnbmVyXFxcXGxpYnNcXFxcZGVzaWduZXItdWlcXFxcdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvcmlsZXlldmFucy9Eb2N1bWVudHMvZGV2L0Rlc2lnbmVyL2xpYnMvZGVzaWduZXItdWkvdml0ZXN0LmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZVByb2plY3QgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLmpzb24nO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVQcm9qZWN0KHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICB0ZXN0OiB7XG4gICAgbmFtZTogcGFja2FnZUpzb24ubmFtZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbJ3Rlc3Qtc2V0dXAudHMnXSxcbiAgICBnbG9iYWxTZXR1cDogJy4vdGVzdC1nbG9iYWxzLnRzJyxcbiAgICBjb3ZlcmFnZTogeyBlbmFibGVkOiB0cnVlLCBwcm92aWRlcjogJ2lzdGFuYnVsJywgaW5jbHVkZTogWydzcmMvKiovKiddLCByZXBvcnRlcjogWydodG1sJywgJ2NvYmVydHVyYSddIH0sXG4gICAgcmVzdG9yZU1vY2tzOiB0cnVlLFxuICAgIGFsaWFzOiBbXG4gICAgICB7XG4gICAgICAgIGZpbmQ6IC9ebW9uYWNvLWVkaXRvciQvLFxuICAgICAgICByZXBsYWNlbWVudDogYCR7X19kaXJuYW1lfS9ub2RlX21vZHVsZXMvbW9uYWNvLWVkaXRvci9lc20vdnMvZWRpdG9yL2VkaXRvci5hcGlgLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxufSk7XG4iLCAie1xuICBcIm5hbWVcIjogXCJAbWljcm9zb2Z0L2Rlc2lnbmVyLXVpXCIsXG4gIFwidmVyc2lvblwiOiBcIjUuMTAuMFwiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAZmx1ZW50dWkvcmVhY3RcIjogXCI4LjExMC4yXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtY29tcG9uZW50c1wiOiBcIjkuNTYuMFwiLFxuICAgIFwiQGZsdWVudHVpL3JlYWN0LWhvb2tzXCI6IFwiOC42LjIwXCIsXG4gICAgXCJAZmx1ZW50dWkvcmVhY3QtaWNvbnNcIjogXCIyLjAuMjI0XCIsXG4gICAgXCJAZmx1ZW50dWkvdGhlbWVcIjogXCIyLjYuMjVcIixcbiAgICBcIkBmbHVlbnR1aS91dGlsaXRpZXNcIjogXCI4LjE1LjBcIixcbiAgICBcIkBsZXhpY2FsL2h0bWxcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL2xpbmtcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL2xpc3RcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL3JlYWN0XCI6IFwiMC4xNC41XCIsXG4gICAgXCJAbGV4aWNhbC9yaWNoLXRleHRcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL3NlbGVjdGlvblwiOiBcIjAuMTQuNVwiLFxuICAgIFwiQGxleGljYWwvdGFibGVcIjogXCIwLjE0LjVcIixcbiAgICBcIkBsZXhpY2FsL3V0aWxzXCI6IFwiMC4xNC41XCIsXG4gICAgXCJAbWljcm9zb2Z0L2xvZ2ljLWFwcHMtc2hhcmVkXCI6IFwid29ya3NwYWNlOipcIixcbiAgICBcIkBtb25hY28tZWRpdG9yL3JlYWN0XCI6IFwiNC42LjBcIixcbiAgICBcIkByZWFjdC1ob29rei93ZWJcIjogXCIyMi4wLjBcIixcbiAgICBcIkB4eWZsb3cvcmVhY3RcIjogXCJeMTIuMy41XCIsXG4gICAgXCJkb21wdXJpZnlcIjogXCIzLjEuM1wiLFxuICAgIFwiZnVzZS5qc1wiOiBcIjYuNi4yXCIsXG4gICAgXCJsZXhpY2FsXCI6IFwiMC4xNC41XCIsXG4gICAgXCJtb25hY28tZWRpdG9yXCI6IFwiMC40NC4wXCIsXG4gICAgXCJwcmlzbS1yZWFjdC1yZW5kZXJlclwiOiBcIjIuMy4xXCIsXG4gICAgXCJyZWFjdC1kbmRcIjogXCIxNi4wLjFcIixcbiAgICBcInJlYWN0LWluZmluaXRlLXNjcm9sbC1jb21wb25lbnRcIjogXCI2LjEuMFwiLFxuICAgIFwicmVhY3QtaW50bFwiOiBcIjYuMy4wXCIsXG4gICAgXCJyZWFjdC1tYXJrZG93blwiOiBcIjguMC41XCIsXG4gICAgXCJyZWFjdC11c2VcIjogXCIxNy40LjBcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAdHlwZXMvZG9tcHVyaWZ5XCI6IFwiMy4wLjVcIixcbiAgICBcInRpbWV6b25lLW1vY2tcIjogXCJeMS4zLjZcIlxuICB9LFxuICBcImVuZ2luZXNcIjoge1xuICAgIFwibm9kZVwiOiBcIj49MTJcIlxuICB9LFxuICBcImV4cG9ydHNcIjoge1xuICAgIFwiLlwiOiB7XG4gICAgICBcInR5cGVzXCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwiZGVmYXVsdFwiOiBcIi4vc3JjL2luZGV4LnRzXCJcbiAgICB9LFxuICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiXG4gIH0sXG4gIFwiZmlsZXNcIjogW1xuICAgIFwiYnVpbGQvbGliLyoqLypcIixcbiAgICBcInNyY1wiXG4gIF0sXG4gIFwibGljZW5zZVwiOiBcIk1JVFwiLFxuICBcIm1haW5cIjogXCJzcmMvaW5kZXgudHNcIixcbiAgXCJtb2R1bGVcIjogXCJzcmMvaW5kZXgudHNcIixcbiAgXCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiOiBcIjQuMzYuMVwiLFxuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5LWRldnRvb2xzXCI6IFwiNC4zNi4xXCIsXG4gICAgXCJyZWFjdFwiOiBcIl4xNi40LjAgfHwgXjE3LjAuMCB8fCBeMTguMC4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTYuNC4wIHx8IF4xNy4wLjAgfHwgXjE4LjAuMFwiXG4gIH0sXG4gIFwicHVibGlzaENvbmZpZ1wiOiB7XG4gICAgXCJtYWluXCI6IFwiYnVpbGQvbGliL2luZGV4LmNqc1wiLFxuICAgIFwibW9kdWxlXCI6IFwiYnVpbGQvbGliL2luZGV4LmpzXCIsXG4gICAgXCJ0eXBlc1wiOiBcImJ1aWxkL2xpYi9pbmRleC5kLnRzXCIsXG4gICAgXCJleHBvcnRzXCI6IHtcbiAgICAgIFwiLlwiOiB7XG4gICAgICAgIFwidHlwZXM6XCI6IFwiLi9idWlsZC9saWIvaW5kZXguZC50c1wiLFxuICAgICAgICBcImltcG9ydFwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmpzXCIsXG4gICAgICAgIFwiZGVmYXVsdFwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmNqc1wiXG4gICAgICB9LFxuICAgICAgXCIuL3BhY2thZ2UuanNvblwiOiBcIi4vcGFja2FnZS5qc29uXCIsXG4gICAgICBcIi4vYnVpbGQvbGliL2luZGV4LmNzc1wiOiBcIi4vYnVpbGQvbGliL2luZGV4LmNzc1wiXG4gICAgfVxuICB9LFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwiYnVpbGQ6bGliXCI6IFwidHN1cCAmJiB0c2MgLS1lbWl0RGVjbGFyYXRpb25Pbmx5XCIsXG4gICAgXCJwdWJsaXNoOmxvY2FsXCI6IFwicG5wbSB1bnB1Ymxpc2ggLS1mb3JjZSAmJiBwbnBtIHB1Ymxpc2ggLS1uby1naXQtY2hlY2tzIC0tcmVnaXN0cnkgaHR0cDovL2xvY2FsaG9zdDo0ODczXCIsXG4gICAgXCJ0ZXN0OmxpYlwiOiBcInZpdGVzdCBydW4gLS1yZXRyeT0zXCIsXG4gICAgXCJ1bnB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlXCJcbiAgfSxcbiAgXCJzaWRlRWZmZWN0c1wiOiBmYWxzZSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwidHlwZXNcIjogXCJzcmMvaW5kZXgudHNcIlxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1WCxTQUFTLHFCQUFxQjtBQUNyWixPQUFPLFdBQVc7OztBQ0RsQjtBQUFBLEVBQ0UsTUFBUTtBQUFBLEVBQ1IsU0FBVztBQUFBLEVBQ1gsY0FBZ0I7QUFBQSxJQUNkLG1CQUFtQjtBQUFBLElBQ25CLDhCQUE4QjtBQUFBLElBQzlCLHlCQUF5QjtBQUFBLElBQ3pCLHlCQUF5QjtBQUFBLElBQ3pCLG1CQUFtQjtBQUFBLElBQ25CLHVCQUF1QjtBQUFBLElBQ3ZCLGlCQUFpQjtBQUFBLElBQ2pCLGlCQUFpQjtBQUFBLElBQ2pCLGlCQUFpQjtBQUFBLElBQ2pCLGtCQUFrQjtBQUFBLElBQ2xCLHNCQUFzQjtBQUFBLElBQ3RCLHNCQUFzQjtBQUFBLElBQ3RCLGtCQUFrQjtBQUFBLElBQ2xCLGtCQUFrQjtBQUFBLElBQ2xCLGdDQUFnQztBQUFBLElBQ2hDLHdCQUF3QjtBQUFBLElBQ3hCLG9CQUFvQjtBQUFBLElBQ3BCLGlCQUFpQjtBQUFBLElBQ2pCLFdBQWE7QUFBQSxJQUNiLFdBQVc7QUFBQSxJQUNYLFNBQVc7QUFBQSxJQUNYLGlCQUFpQjtBQUFBLElBQ2pCLHdCQUF3QjtBQUFBLElBQ3hCLGFBQWE7QUFBQSxJQUNiLG1DQUFtQztBQUFBLElBQ25DLGNBQWM7QUFBQSxJQUNkLGtCQUFrQjtBQUFBLElBQ2xCLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxpQkFBbUI7QUFBQSxJQUNqQixvQkFBb0I7QUFBQSxJQUNwQixpQkFBaUI7QUFBQSxFQUNuQjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsTUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFNBQVc7QUFBQSxJQUNULEtBQUs7QUFBQSxNQUNILE9BQVM7QUFBQSxNQUNULFFBQVU7QUFBQSxNQUNWLFNBQVc7QUFBQSxJQUNiO0FBQUEsSUFDQSxrQkFBa0I7QUFBQSxFQUNwQjtBQUFBLEVBQ0EsT0FBUztBQUFBLElBQ1A7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLEVBQ1gsTUFBUTtBQUFBLEVBQ1IsUUFBVTtBQUFBLEVBQ1Ysa0JBQW9CO0FBQUEsSUFDbEIseUJBQXlCO0FBQUEsSUFDekIsa0NBQWtDO0FBQUEsSUFDbEMsT0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLGVBQWlCO0FBQUEsSUFDZixNQUFRO0FBQUEsSUFDUixRQUFVO0FBQUEsSUFDVixPQUFTO0FBQUEsSUFDVCxTQUFXO0FBQUEsTUFDVCxLQUFLO0FBQUEsUUFDSCxVQUFVO0FBQUEsUUFDVixRQUFVO0FBQUEsUUFDVixTQUFXO0FBQUEsTUFDYjtBQUFBLE1BQ0Esa0JBQWtCO0FBQUEsTUFDbEIseUJBQXlCO0FBQUEsSUFDM0I7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixpQkFBaUI7QUFBQSxJQUNqQixZQUFZO0FBQUEsSUFDWixtQkFBbUI7QUFBQSxFQUNyQjtBQUFBLEVBQ0EsYUFBZTtBQUFBLEVBQ2YsTUFBUTtBQUFBLEVBQ1IsT0FBUztBQUNYOzs7QURwRkEsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyx3QkFBUSxjQUFjO0FBQUEsRUFDM0IsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLE1BQU07QUFBQSxJQUNKLE1BQU0sZ0JBQVk7QUFBQSxJQUNsQixhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsZUFBZTtBQUFBLElBQzVCLGFBQWE7QUFBQSxJQUNiLFVBQVUsRUFBRSxTQUFTLE1BQU0sVUFBVSxZQUFZLFNBQVMsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLFFBQVEsV0FBVyxFQUFFO0FBQUEsSUFDeEcsY0FBYztBQUFBLElBQ2QsT0FBTztBQUFBLE1BQ0w7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGFBQWEsR0FBRyxnQ0FBUztBQUFBLE1BQzNCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
