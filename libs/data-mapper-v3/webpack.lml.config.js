'use strict';

/* global __dirname, module, require */

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const workspace = path.resolve(__dirname, '../..');
const v2 = path.join(workspace, 'libs/data-mapper-v2');

module.exports = {
  context: __dirname,
  target: 'web',
  mode: 'production',
  entry: './webview/src/lml/index.tsx',
  output: {
    path: path.resolve(__dirname, 'out/webview'),
    filename: 'lml.js',
    assetModuleFilename: 'lml-assets/[name].[contenthash][ext]',
    publicPath: 'auto',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    modules: [path.join(__dirname, 'node_modules'), path.join(v2, 'node_modules'), 'node_modules'],
    alias: {
      '@babel/runtime/helpers/esm/objectSpread2$': require.resolve('@babel/runtime/helpers/objectSpread2', { paths: [v2] }),
      '@microsoft/logic-apps-data-mapper-v2$': path.join(v2, 'src/index.ts'),
      '@microsoft/logic-apps-shared$': path.join(workspace, 'libs/logic-apps-shared/src/index.ts'),
      '@microsoft/designer-ui$': path.join(workspace, 'libs/designer-ui/src/index.ts'),
      models$: path.join(v2, 'src/models/index.ts'),
      '~@xyflow/react': '@xyflow/react',
      react$: require.resolve('react'),
      'react-dom$': require.resolve('react-dom'),
      'react-redux$': require.resolve('react-redux', { paths: [v2, __dirname] }),
    },
    fallback: { fs: false, path: false },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'webview/tsconfig.lml.json'),
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
      },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      { test: /\.less$/, use: [MiniCssExtractPlugin.loader, 'css-loader', 'less-loader'] },
      { test: /\.(svg|png|jpe?g|gif|webp|ico|woff2?|eot|ttf|otf)$/i, type: 'asset/resource' },
    ],
  },
  plugins: [new MiniCssExtractPlugin({ filename: 'lml.css' }), new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })],
  optimization: { splitChunks: false, runtimeChunk: false },
  devtool: 'source-map',
};
