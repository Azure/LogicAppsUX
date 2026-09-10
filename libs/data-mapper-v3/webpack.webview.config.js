// @ts-check
'use strict';

const path = require('path');

/** @type {import('webpack').ConfigurationFactory} */
module.exports = (_environment, arguments_) => ({
    target: 'web',
    entry: './webview/src/index.tsx',
    output: {
        path: path.resolve(__dirname, 'out', 'webview'),
        filename: 'webview.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    devtool: arguments_.mode === 'production' ? 'source-map' : 'eval-source-map'
});
