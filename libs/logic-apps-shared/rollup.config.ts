import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const externalFn = (str, parent, _isResolved) => {
  if (str.includes('node_modules')) {
    //console.log(`Parent: ${parent} ${str}`);
    return true;
  }
  return false;
};

export default {
  input: './src/index.ts',
  external: externalFn,
  output: {
    format: 'esm',
    dir: '../../dist/rollup/libs/logic-apps-shared',
    entryFileNames: 'index.esm.js',

    name: '@microsoft/logic-apps-shared',
  },
  plugins: [typescript({ tsconfig: './tsconfig.lib.json' }), nodeResolve({ modulePaths: ['../../node_modules'] }), commonjs(), json()],
};
