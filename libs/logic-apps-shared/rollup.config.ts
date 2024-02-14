import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import  commonjs  from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
    input: './index.ts',
    output: 
        {
            format: 'esm',
            dir: '../../dist/libs/logic-apps-shared',
            entryFileNames: 'index.esm.js',
            sourcemap: true,
            name: "@microsoft/logic-apps-shared",
        }
    ,
    plugins: [
       typescript({'tsconfig': './tsconfig.lib.json'}), nodeResolve({ modulePaths: ['../../node_modules']}), commonjs(), json()
    ]
};
