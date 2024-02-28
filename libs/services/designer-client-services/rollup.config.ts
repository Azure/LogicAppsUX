import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
  input: './src/index.ts',
  output: {
    format: 'esm',
    dir: '../../../dist/libs/designer-client-services',
    entryFileNames: 'index.esm.js',

    name: '@microsoft/designer-client-servicesc',
  },
  plugins: [typescript({ tsconfig: './tsconfig.lib.json' }), nodeResolve({ modulePaths: ['../../node_modules'] }), commonjs(), json()],
};
