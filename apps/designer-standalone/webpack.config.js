const webpack = require('webpack');
const path = require('path');
var htmlWebpackPlugin = require('html-webpack-plugin');

const libsRelativePath = '../../dist/libs/';

const createLibPath = (lib) => path.resolve(__dirname, libsRelativePath + lib);

module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
    alias: {
      '@microsoft/logic-apps-shared': createLibPath('logic-apps-shared/index.js'),
      '@microsoft/logic-apps-designer': createLibPath('designer/index.js'),
      '@microsoft/designer-client-services-logic-apps': createLibPath('services/designer-client-services/index.js'),
      '@microsoft/designer-ui': createLibPath('designer-ui/index.js'),
      '@microsoft/chatbot': createLibPath('chatbot/index.js'),
      https: false,
      http: false,
    },
    aliasFields: ['browser', 'browser.esm'],
  },
  module: {
    rules: [
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
    modules: [
      'node_modules',
      '/Users/daniellecogburn/code/logic_apps_designer/node_modules/@nrwl/webpack/node_modules',
      '/Users/daniellecogburn/code/logic_apps_designer/node_modules',
    ],
  },
  target: 'web',
  entry: {
    main: ['./src/main.tsx'],
    index: './src/index.html',
    polyfills: [
      '/Users/daniellecogburn/code/logic_apps_designer/node_modules/@nrwl/webpack/src/utils/webpack/safari-nomodule.js',
      './src/polyfills.ts',
    ],
    styles: ['./src/styles.less'],
  },
  // plugins: [
  //   DefinePlugin { definitions: [Object] },
  //   ForkTsCheckerWebpackPlugin { options: [Object] },
  //   LicenseWebpackPlugin { pluginOptions: [Object] },
  //   CopyPlugin { patterns: [Array], options: {} },
  //   MiniCssExtractPlugin {
  //     _sortedModulesCache: [WeakMap],
  //     options: [Object],
  //     runtimeOptions: [Object]
  //   },
  //   RemoveEmptyScriptsPlugin {
  //     options: [Object],
  //     apply: [Function: bound apply]
  //   },
  //   {},
  //   LicenseWebpackPlugin { pluginOptions: [Object] }
  // ],
  devServer: {
    compress: true,
    port: 4200,
    static: {
      serveIndex: true,
    },
  },
  devtool: false,
  mode: 'production',
  output: {
    path: '/Users/daniellecogburn/code/logic_apps_designer/dist/webpack/apps/designer-standalone',
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
      // Make a global `process` variable that points to the `process` package,
      // because the `util` package expects there to be a global variable named `process`.
      // Thanks to https://stackoverflow.com/a/65018686/14239942
      process: 'process/browser',
      React: 'react',
    }),
    new htmlWebpackPlugin({
      inject: true,
      template: 'src/index.html',
    }),
  ],
};
