import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

//import type { RollupOptions } from 'rollup';

const options = {
  input: 'src/index.ts',
  output: {
    format: 'esm',
    dir: '../../../dist/libs/services/intl',
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.lib.json' }),
    nodeResolve({ modulePaths: ['../../node_modules', '../../dist/libs'] }),
    commonjs(),
    json(),
  ],
  external: [
    // Add any external dependencies here
  ],
  // Add any additional Rollup configuration options here
};

export default options;
