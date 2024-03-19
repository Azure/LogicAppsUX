import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const externalFn = (str, parent, _isResolved) => {
  if (str.includes('logic-apps-shared') || str.includes('designer-client-services')) {
    //console.log(`Parent: ${parent} ${str}`);
    return true;
  }
  if (str.includes('node_modules')) {
    //console.log(`Parent: ${parent} ${str}`);
    return true;
  }
  return false;
};

export default {
  input: 'src/index.ts',
  external: externalFn,
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
    postcss({
      extract: true,
    }),
    commonjs(),
    json(),
  ],
};
