import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import { terser } from 'rollup-plugin-terser';
import postcss from 'rollup-plugin-postcss';
import svg from 'rollup-plugin-svg';
export default {
  input: 'src/index.tsx', // our source file
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es', // the preferred format
    },
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
   
    typescript({
      typescript: require('typescript'),
      tsconfig: './tsconfig.lib.json',
    }),
    svg(),
    postcss({
      plugins: [],
    }),
    terser(), // minifies generated bundles
  ],
};
