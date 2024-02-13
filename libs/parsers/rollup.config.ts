import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import  commonjs  from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
    input: 'src/index.ts',
    output: 
        {
            format: 'cjs',
            dir: '../../dist/libs/parsers',
        }
    ,
    plugins: [
       typescript({'tsconfig': './tsconfig.lib.json'}),
    nodeResolve({ modulePaths: ['../../node_modules', '../../dist/libs', '../../dist/libs/services']}),
     commonjs(),
     json()
    ],
    external: [
        // Add any external dependencies here
    ],
    // Add any additional Rollup configuration options here
};