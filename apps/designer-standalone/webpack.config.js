const webpack = require('webpack');
const path = require('path');
const newpath = path.resolve(__dirname, '../../libs/logic-apps-shared/src/index.ts');
const distPath = path.resolve(__dirname, '../../dist/libs/logic-apps-shared/index.js');
console.log(distPath);
module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
    alias: {
      '@microsoft/logic-apps-shared': distPath,
      '@microsoft/logic-apps-designer': path.resolve(__dirname, '../../dist/libs/designer/index.js'),
      '@microsoft/designer-client-services-logic-apps': path.resolve(
        __dirname,
        '../../dist/libs/services/designer-client-services/index.js'
      ),
      '@microsoft/designer-ui': path.resolve(__dirname, '../../dist/libs/designer-ui/index.js'),
      '@microsoft/chatbot': path.resolve(__dirname, '../../dist/libs/chatbot/index.js'),
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
    ],
  },
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
  devtool: false,
  mode: 'production',
  output: {
    path: '/Users/daniellecogburn/code/logic_apps_designer/dist/webpack/apps/designer-standalone',
    filename: '[name].[contenthash:20].js',
    chunkFilename: '[name].[chunkhash:20].js',
    hashFunction: 'xxhash64',
    pathinfo: false,
    scriptType: 'module',
    publicPath: undefined,
    crossOriginLoading: false,
  },
  plugins: [
    new webpack.ProvidePlugin({
      // Make a global `process` variable that points to the `process` package,
      // because the `util` package expects there to be a global variable named `process`.
      // Thanks to https://stackoverflow.com/a/65018686/14239942
      process: 'process/browser',
    }),
  ],
};
