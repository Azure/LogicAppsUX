import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import monaco from 'rollup-plugin-monaco-editor';
import postcss from 'rollup-plugin-postcss';

export default {
  output: {
    format: 'es',
    dir: 'dist',
  },
  plugins: [
    postcss(),
    monaco({
      languages: ['json'],
    }),
    nodeResolve(),
    commonjs(),
  ],
};
