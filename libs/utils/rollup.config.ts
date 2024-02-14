import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import  commonjs  from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.ts',
    output: 
        {
            format: 'esm',
            dir: '../../dist/libs/utils',
            entryFileNames: 'index.esm.js',
            sourcemap: true,
            name: "@microsoft/utils-logic-apps",
        }
    ,
    plugins: [
       typescript({'tsconfig': './tsconfig.lib.json'}), nodeResolve({ modulePaths: ['../../node_modules']}), commonjs()
    ],
    external: [
        // Add any external dependencies here
    ],
    // Add any additional Rollup configuration options here
};
