import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

const externalFn = (str, _parent, _isResolved) => {
  if (str.includes('logic-apps-shared')) {
    return true;
  }
  if (str.includes('node_modules')) {
    return true;
  }
  return false;
};

const distFolder = '../../../dist/rollup/libs/designer-client-services';

export default {
  input: './src/index.ts',
  external: externalFn,
  output: {
    format: 'esm',
    dir: distFolder,
    entryFileNames: 'index.esm.js',

    name: '@microsoft/designer-client-services',
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json' }),
    nodeResolve({ modulePaths: ['../../node_modules'] }),
    commonjs(),
    json(),
    copy({ targets: [{ src: './package.json', dest: distFolder }] }),
  ],
};
