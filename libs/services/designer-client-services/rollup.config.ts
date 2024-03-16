import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import path from 'path';
import copy from 'rollup-plugin-copy';
import { fileURLToPath } from 'url';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  input: './src/index.ts',
  external: externalFn,
  output: {
    format: 'esm',
    dir: distFolder,
    entryFileNames: 'index.esm.js',
    sourcemap: true,
    name: '@microsoft/designer-client-services',
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json' }),
    nodeResolve({ modulePaths: ['../../node_modules'] }),
    commonjs(),
    json(),
    copy({ targets: [{ src: './package.json', dest: distFolder }] }),
    getBabelOutputPlugin({
      presets: ['@babel/preset-env'],
      configFile: path.resolve(__dirname, '../../../babel.config.json'),
    }),
  ],
};
