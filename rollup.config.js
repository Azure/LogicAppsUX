import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import {terser} from "rollup-plugin-terser";
export default {
 input: 'src/index.tsx', // our source file
 output: [
  {
   file: pkg.main,
   format: 'cjs'
  },
  {
   file: pkg.module,
   format: 'es' // the preferred format
  },
 ],
 external: [
  ...Object.keys(pkg.dependencies || {})
 ],
 plugins: [
  typescript({
   typescript: require('typescript'),
   tsconfig: './tsconfig.lib.json'
  }),
  terser() // minifies generated bundles
 ]
};