import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

const externalFn = (str, parent, _isResolved) => {
  if (str.includes('node_modules')) {
    return true;
  }
  return false;
};

const distFolder = '../../dist/rollup/libs/logic-apps-shared';

export default {
  input: ['./src/index.ts'],
  external: externalFn,
  output: [
    {
      format: 'esm',
      dir: distFolder,
      entryFileNames: 'index.esm.js',
      name: '@microsoft/logic-apps-shared',
    }
  ],
  plugins: [
    babel(),
    typescript({ tsconfig: './tsconfig.lib.json' }),
    nodeResolve({ modulePaths: ['../../node_modules'] }),
    commonjs(),
    json(),
    copy({
      targets: [
        { src: './package.json', dest: distFolder },
      ]})
  ],
};
