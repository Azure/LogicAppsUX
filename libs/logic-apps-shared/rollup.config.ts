import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import  commonjs  from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
    input: 'libs/index.ts',
    output: 
        {
            format: 'cjs',
            dir: '../../dist/libs/logic-apps-shared',
        }
    ,
    plugins: [
       typescript({'tsconfig': './tsconfig.lib.json'}), nodeResolve({ modulePaths: ['../../node_modules']}), commonjs(), json()
    ]
};
