// @ts-check
'use strict';

const path = require('path');

/** @type {import('webpack').ConfigurationFactory} */
module.exports = (_environment, arguments_) => ({
    target: 'node',
    entry: {
        extension: './src/extension.ts',
        compilerHost: './src/worker/compilerHost.ts'
    },
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        vscode: 'commonjs vscode'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    devtool: arguments_.mode === 'production' ? 'nosources-source-map' : 'source-map'
});
