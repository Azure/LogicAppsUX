import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const externalFn = (str, parent, _isResolved) => {
  if (str.includes('logic-apps-shared')) {
    //console.log(`Parent: ${parent} ${str}`);
    return true;
  }
  if (str.includes('node_modules')) {
    console.log(`Parent: ${parent} ${str}`);
    return true;
  }
  return false;
};

export default {
  input: 'src/index.ts',
  external: externalFn, //['@microsoft/logic-apps-shared', 'libs/logic-apps-shared/src/index.ts', '/node_modules/'],
  output: {
    format: 'esm',
    dir: '../../dist/rollup/lib/designer-ui',
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json', include: ['**/designer-ui/src/**'], exclude: ['**/logic-apps-shared/**'] }),
    postcss(),
    image(),
    nodeResolve(),
    commonjs(),
    json(),
  ],
};
