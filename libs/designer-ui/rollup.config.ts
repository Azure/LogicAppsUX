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
    dir: '../../dist/libs/designer-ui',
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json' }),
    postcss(),
    image(),
    nodeResolve({
      modulePaths: ['../../node_modules'],
    }),
    commonjs(),
    json(),
  ],
};
