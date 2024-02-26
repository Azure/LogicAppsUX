const ReactConfig = require('@nrwl/react/plugins/webpack');
const { merge } = require('webpack-merge');
const {transform} = require('@formatjs/ts-transformer');
const webpack = require('webpack');
module.exports = (config, context) => {
  const webpackConfig = ReactConfig(config, context);
  webpackConfig.resolve.alias['https'] = false;
  webpackConfig.resolve.alias['http'] = false;
  return merge(webpackConfig, {
    resolve: {
      aliasFields: ['browser', 'browser.esm'],
    },
    plugins: [
      new webpack.ProvidePlugin({
        // Make a global `process` variable that points to the `process` package,
        // because the `util` package expects there to be a global variable named `process`.
        // Thanks to https://stackoverflow.com/a/65018686/14239942
        process: 'process/browser',
      }),
    ],
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                getCustomTransformers() {
                  return {
                    before: [
                      transform({
                        overrideIdFn: '[sha512:contenthash:base64:6]',
                        ast: true
                      }),
                    ],
                  };
                },
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
  });
};
