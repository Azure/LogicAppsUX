import babel from '@rollup/plugin-babel';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import path from 'path';
import copy from 'rollup-plugin-copy';
import postcss from 'rollup-plugin-postcss';
import { fileURLToPath } from 'url';

const distFolder = '../../dist/rollup/designer-ui';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const externalFn = (str, parent, _isResolved) => {
  if (str.includes('logic-apps-shared') || str.includes('designer-client-services')) {
    return true;
  }
  if (str.includes('node_modules')) {
    return true;
  }
  return false;
};

export default {
  input: 'src/index.ts',
  cache: false, // temporarily disable cache for testing
  external: externalFn,
  output: {
    format: 'esm',
    dir: distFolder,
    sourcemap: true,
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json' }),
    postcss({
      extract: true,
    }),
    babel(),
    image(),
    nodeResolve(),
    commonjs(),
    json(),
    copy({ targets: [{ src: './package.json', dest: distFolder }] }),
    getBabelOutputPlugin({
      presets: ['@babel/preset-env'],
      configFile: path.resolve(__dirname, '../../babel.config.json'),
    }),
  ],
};
