const { composePlugins, withNx } = require('@nx/webpack');
const { withReact } = require('@nx/react');

const { merge } = require('webpack-merge');
const webpack = require('webpack');
const fs = require('fs');
module.exports = composePlugins(withNx(), withReact(), (config) => {
  config.resolve.alias['https'] = false;
  config.resolve.alias['http'] = false;
  return merge(config, {
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
  });
});
