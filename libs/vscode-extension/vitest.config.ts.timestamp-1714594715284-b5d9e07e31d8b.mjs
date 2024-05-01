// ../../../../Projects/LogicAppsUX/libs/vscode-extension/vitest.config.ts
import { defineProject } from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/vitest@1.5.0_@types+node@20.12.7_@vitest+ui@1.5.0_jsdom@24.0.0/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/hyehwalee/Projects/LogicAppsUX/node_modules/.pnpm/@vitejs+plugin-react@4.2.1_vite@5.2.10/node_modules/@vitejs/plugin-react/dist/index.mjs";

// ../../../../Projects/LogicAppsUX/libs/vscode-extension/package.json
var package_default = {
  name: "@microsoft/vscode-extension-logic-apps",
  version: "4.13.0",
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

// ../../../../Projects/LogicAppsUX/libs/vscode-extension/vitest.config.ts
var vitest_config_default = defineProject({
  plugins: [react()],
  test: {
    name: package_default.name,
    dir: "./src",
    watch: false,
    environment: "jsdom",
    setupFiles: ["test-setup.ts"],
    coverage: { enabled: true, provider: "istanbul", include: ["src/**/*"], reporter: ["html", "json"] },
    restoreMocks: true
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy92c2NvZGUtZXh0ZW5zaW9uL3ZpdGVzdC5jb25maWcudHMiLCAiLi4vLi4vLi4vLi4vUHJvamVjdHMvTG9naWNBcHBzVVgvbGlicy92c2NvZGUtZXh0ZW5zaW9uL3BhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXHZzY29kZS1leHRlbnNpb25cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGh5ZWh3YWxlZVxcXFxQcm9qZWN0c1xcXFxMb2dpY0FwcHNVWFxcXFxsaWJzXFxcXHZzY29kZS1leHRlbnNpb25cXFxcdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvaHllaHdhbGVlL1Byb2plY3RzL0xvZ2ljQXBwc1VYL2xpYnMvdnNjb2RlLWV4dGVuc2lvbi92aXRlc3QuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lUHJvamVjdCB9IGZyb20gJ3ZpdGVzdC9jb25maWcnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgcGFja2FnZUpzb24gZnJvbSAnLi9wYWNrYWdlLmpzb24nXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZVByb2plY3Qoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHRlc3Q6IHtcbiAgICBuYW1lOiBwYWNrYWdlSnNvbi5uYW1lLFxuICAgIGRpcjogJy4vc3JjJyxcbiAgICB3YXRjaDogZmFsc2UsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWyd0ZXN0LXNldHVwLnRzJ10sXG4gICAgY292ZXJhZ2U6IHsgZW5hYmxlZDogdHJ1ZSwgcHJvdmlkZXI6ICdpc3RhbmJ1bCcsIGluY2x1ZGU6IFsnc3JjLyoqLyonXSwgcmVwb3J0ZXI6IFsnaHRtbCcsICdqc29uJ10gfSxcbiAgICByZXN0b3JlTW9ja3M6IHRydWUsXG5cbiAgfSxcbn0pIiwgIntcbiAgXCJuYW1lXCI6IFwiQG1pY3Jvc29mdC92c2NvZGUtZXh0ZW5zaW9uLWxvZ2ljLWFwcHNcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiNC4xMy4wXCIsXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBhcGlkZXZ0b29scy9zd2FnZ2VyLXBhcnNlclwiOiBcIjEwLjAuM1wiLFxuICAgIFwiQG1pY3Jvc29mdC9sb2dpYy1hcHBzLXNoYXJlZFwiOiBcIndvcmtzcGFjZToqXCIsXG4gICAgXCJAbWljcm9zb2Z0L3ZzY29kZS1hemV4dC1henVyZWFwcHNlcnZpY2VcIjogXCIwLjguMVwiLFxuICAgIFwiQG1pY3Jvc29mdC92c2NvZGUtYXpleHQtdXRpbHNcIjogXCIwLjQuNlwiLFxuICAgIFwiYXhpb3NcIjogXCIxLjYuOFwiLFxuICAgIFwicmVhY3QtaW50bFwiOiBcIjYuMy4wXCIsXG4gICAgXCJyZWFjdGZsb3dcIjogXCIxMS4xMS4xXCIsXG4gICAgXCJ0c2xpYlwiOiBcIjIuNC4wXCJcbiAgfSxcbiAgXCJkZXZEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQHR5cGVzL3ZzY29kZVwiOiBcIjEuNzYuMFwiLFxuICAgIFwiQHR5cGVzL3ZzY29kZS13ZWJ2aWV3XCI6IFwiMS41Ny4xXCJcbiAgfSxcbiAgXCJwZWVyRGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiOiBcIjQuMzYuMVwiLFxuICAgIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5LWRldnRvb2xzXCI6IFwiNC4zNi4xXCJcbiAgfSxcbiAgXCJlbmdpbmVzXCI6IHtcbiAgICBcIm5vZGVcIjogXCI+PTEyXCJcbiAgfSxcbiAgXCJleHBvcnRzXCI6IHtcbiAgICBcIi5cIjoge1xuICAgICAgXCJpbXBvcnRcIjogXCIuL3NyYy9pbmRleC50c1wiLFxuICAgICAgXCJkZWZhdWx0XCI6IFwiLi9zcmMvaW5kZXgudHNcIixcbiAgICAgIFwidHlwZXM6XCI6IFwiLi9zcmMvaW5kZXgudHNcIlxuICAgIH0sXG4gICAgXCIuL3BhY2thZ2UuanNvblwiOiBcIi4vcGFja2FnZS5qc29uXCJcbiAgfSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCJidWlsZC9saWIvKiovKlwiLFxuICAgIFwic3JjXCJcbiAgXSxcbiAgXCJsaWNlbnNlXCI6IFwiTUlUXCIsXG4gIFwibWFpblwiOiBcInNyYy9pbmRleC50c1wiLFxuICBcIm1vZHVsZVwiOiBcInNyYy9pbmRleC50c1wiLFxuICBcInB1Ymxpc2hDb25maWdcIjoge1xuICAgIFwibWFpblwiOiBcImJ1aWxkL2xpYi9pbmRleC5janNcIixcbiAgICBcIm1vZHVsZVwiOiBcImJ1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgIFwidHlwZXNcIjogXCJidWlsZC9saWIvaW5kZXguZC50c1wiLFxuICAgIFwiZXhwb3J0c1wiOiB7XG4gICAgICBcIi5cIjoge1xuICAgICAgICBcInR5cGVzOlwiOiBcIi4vYnVpbGQvbGliL2luZGV4LmQudHNcIixcbiAgICAgICAgXCJpbXBvcnRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5qc1wiLFxuICAgICAgICBcImRlZmF1bHRcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5janNcIlxuICAgICAgfSxcbiAgICAgIFwiLi9wYWNrYWdlLmpzb25cIjogXCIuL3BhY2thZ2UuanNvblwiLFxuICAgICAgXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIjogXCIuL2J1aWxkL2xpYi9pbmRleC5jc3NcIlxuICAgIH1cbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkOmxpYlwiOiBcInRzdXAgJiYgdHNjIC0tZW1pdERlY2xhcmF0aW9uT25seVwiLFxuICAgIFwicHVibGlzaDpsb2NhbFwiOiBcInBucG0gdW5wdWJsaXNoIC0tZm9yY2UgJiYgcG5wbSBwdWJsaXNoIC0tbm8tZ2l0LWNoZWNrcyAtLXJlZ2lzdHJ5IGh0dHA6Ly9sb2NhbGhvc3Q6NDg3M1wiLFxuICAgIFwidGVzdDpsaWJcIjogXCJ2aXRlc3QgLS1yZXRyeT0zXCIsXG4gICAgXCJ1bnB1Ymxpc2g6bG9jYWxcIjogXCJwbnBtIHVucHVibGlzaCAtLWZvcmNlXCJcbiAgfSxcbiAgXCJzaWRlRWZmZWN0c1wiOiBmYWxzZSxcbiAgXCJ0eXBlXCI6IFwibW9kdWxlXCIsXG4gIFwidHlwZXNcIjogXCJzcmMvaW5kZXgudHNcIlxufSJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlgsU0FBUyxxQkFBcUI7QUFDelosT0FBTyxXQUFXOzs7QUNEbEI7QUFBQSxFQUNFLE1BQVE7QUFBQSxFQUNSLFNBQVc7QUFBQSxFQUNYLGNBQWdCO0FBQUEsSUFDZCwrQkFBK0I7QUFBQSxJQUMvQixnQ0FBZ0M7QUFBQSxJQUNoQywyQ0FBMkM7QUFBQSxJQUMzQyxpQ0FBaUM7QUFBQSxJQUNqQyxPQUFTO0FBQUEsSUFDVCxjQUFjO0FBQUEsSUFDZCxXQUFhO0FBQUEsSUFDYixPQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsaUJBQW1CO0FBQUEsSUFDakIsaUJBQWlCO0FBQUEsSUFDakIseUJBQXlCO0FBQUEsRUFDM0I7QUFBQSxFQUNBLGtCQUFvQjtBQUFBLElBQ2xCLHlCQUF5QjtBQUFBLElBQ3pCLGtDQUFrQztBQUFBLEVBQ3BDO0FBQUEsRUFDQSxTQUFXO0FBQUEsSUFDVCxNQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsS0FBSztBQUFBLE1BQ0gsUUFBVTtBQUFBLE1BQ1YsU0FBVztBQUFBLE1BQ1gsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLGtCQUFrQjtBQUFBLEVBQ3BCO0FBQUEsRUFDQSxPQUFTO0FBQUEsSUFDUDtBQUFBLElBQ0E7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFXO0FBQUEsRUFDWCxNQUFRO0FBQUEsRUFDUixRQUFVO0FBQUEsRUFDVixlQUFpQjtBQUFBLElBQ2YsTUFBUTtBQUFBLElBQ1IsUUFBVTtBQUFBLElBQ1YsT0FBUztBQUFBLElBQ1QsU0FBVztBQUFBLE1BQ1QsS0FBSztBQUFBLFFBQ0gsVUFBVTtBQUFBLFFBQ1YsUUFBVTtBQUFBLFFBQ1YsU0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBLGtCQUFrQjtBQUFBLE1BQ2xCLHlCQUF5QjtBQUFBLElBQzNCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBVztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsWUFBWTtBQUFBLElBQ1osbUJBQW1CO0FBQUEsRUFDckI7QUFBQSxFQUNBLGFBQWU7QUFBQSxFQUNmLE1BQVE7QUFBQSxFQUNSLE9BQVM7QUFDWDs7O0FEMURBLElBQU8sd0JBQVEsY0FBYztBQUFBLEVBQzNCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixNQUFNO0FBQUEsSUFDSixNQUFNLGdCQUFZO0FBQUEsSUFDbEIsS0FBSztBQUFBLElBQ0wsT0FBTztBQUFBLElBQ1AsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLGVBQWU7QUFBQSxJQUM1QixVQUFVLEVBQUUsU0FBUyxNQUFNLFVBQVUsWUFBWSxTQUFTLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLE1BQU0sRUFBRTtBQUFBLElBQ25HLGNBQWM7QUFBQSxFQUVoQjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
