import { babel } from '@rollup/plugin-babel';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import path from 'path';
import copy from 'rollup-plugin-copy';
import { fileURLToPath } from 'url';

const externalFn = (str, parent, _isResolved) => {
  if (str.includes('node_modules')) {
    return true;
  }
  return false;
};

const distFolder = '../../dist/rollup/logic-apps-shared';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  input: ['./src/index.ts'],
  external: externalFn,
  output: [
    {
      format: 'esm',
      dir: distFolder,
      entryFileNames: 'index.esm.js',
      name: '@microsoft/logic-apps-shared',
      sourcemap: true,
    },
  ],
  plugins: [
    babel(),
    typescript({ tsconfig: './tsconfig.lib.json' }),
    nodeResolve({ modulePaths: ['../../node_modules'] }),
    commonjs(),
    getBabelOutputPlugin({
      presets: ['@babel/preset-env'],
      configFile: path.resolve(__dirname, '../../babel.config.json'),
    }),
    json(),
    copy({
      targets: [{ src: './package.json', dest: distFolder }],
    }),
  ],
};
