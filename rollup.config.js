import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
import { terser } from "rollup-plugin-terser";
import less from "rollup-plugin-less";
import postcss from "rollup-plugin-postcss";
export default {
  input: "src/index.tsx", // our source file
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "es", // the preferred format
    },
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
    typescript({
      typescript: require("typescript"),
      tsconfig: "./tsconfig.lib.json",
    }),
    postcss({
      plugins: [],
    }),
    terser(), // minifies generated bundles
  ],
};
