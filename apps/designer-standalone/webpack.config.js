const webpack = require('webpack');
const path = require('path');
var htmlWebpackPlugin = require('html-webpack-plugin');

const libsRelativePath = '../../dist/libs/';

const createLibPath = (lib) => path.resolve(__dirname, libsRelativePath + lib);

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
    alias: {
      '@microsoft/logic-apps-shared': path.resolve(__dirname, '../../dist/rollup/libs/logic-apps-shared/index.esm.js'), //createLibPath('rollup/logic-apps-shared/index.esm.js'),
      '@microsoft/logic-apps-designer': path.resolve(__dirname, '../../dist/rollup/libs/designer'),
      '@microsoft/designer-client-services-logic-apps': path.resolve(
        __dirname,
        '../../dist/rollup/libs/designer-client-services/index.esm.js'
      ),
      '@microsoft/designer-ui': path.resolve(__dirname, '../../dist/rollup/libs/designer-ui/index.js'),
      '@microsoft/chatbot': path.resolve(__dirname, '../../dist/libs/chatbot/index.js'),
      https: false,
      http: false,
    },
    aliasFields: ['browser', 'browser.esm'],
  },
  module: {
    rules: [
      // { //daniele follow up- look into function filterSourceMappingUrl
      //   test: /\.js$/,
      //   enforce: "pre",
      //   use: ["source-map-loader"],
      // },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
          },
        },
      },
      {
        test: /\.less$/i,
        use: [
          // compiles Less to CSS
          'style-loader',
          'css-loader',
          'less-loader',
        ],
      },
      {
        test: /\.m?js/, // danielle follow up https://github.com/facebook/create-react-app/issues/11865
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
    ],
  },
  cache: false,
  resolveLoader: {
    modules: ['node_modules'],
  },
  target: 'web',
  entry: {
    main: ['./src/main.tsx'],
    index: './src/index.html',
    polyfills: ['./src/polyfills.ts'],
    styles: ['./src/styles.less'],
  },
  devServer: {
    compress: true,
    port: 4200,
    static: {
      serveIndex: true,
    },
  },
  devtool: 'eval-source-map',
  mode: 'production',
  output: {
    path: path.resolve(__dirname, '../../dist/webpack/apps/designer-standalone'),
    filename: '[name].[contenthash:20].js',
    chunkFilename: '[name].[chunkhash:20].js',
    hashFunction: 'xxhash64',
    pathinfo: false,
    scriptType: 'text/javascript',
    publicPath: '',
    crossOriginLoading: false,
  },

  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      React: 'react',
    }),
    new htmlWebpackPlugin({
      inject: true,
      template: 'src/index.html',
    }),
  ],
};
