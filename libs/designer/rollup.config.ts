import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.ts',
  output: {
    format: 'esm',
    dir: '../../dist/libs/designer',
    entryFileNames: 'index.esm.js',
    sourcemap: true,
    name: '@microsoft/logic-apps-designer',
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json' }),
    image(),
    nodeResolve({ modulePaths: ['../../node_modules'] }),
    postcss(),
    commonjs(),
    json(),
  ],
};
