const rootMain = require('../../../.storybook/main');
const webpack = require('webpack');

module.exports = {
  ...rootMain,

  core: { ...rootMain.core, builder: 'webpack5' },
  stories: [
    ...rootMain.stories,
    '../../**/*.stories.mdx',
    '../src/lib/docs/**/*.stories.@(js|jsx|ts|tsx)', // This makes sure any Designer Docs are ordered before others
    '../../../apps/**/*.stories.@(js|jsx|ts|tsx)',
    // Moving Editor story to end to address https://github.com/microsoft/monaco-editor/issues/2448
    '../../**/!(editor|peek|schemaeditor).stories.@(js|jsx|ts|tsx)',
    '../../**/(editor|peek|schemaeditor).stories.@(js|jsx|ts|tsx)',
  ],
  addons: [...rootMain.addons, '@nrwl/react/plugins/storybook'],
  webpackFinal: async (config, { configType }) => {
    // apply any global webpack configs that might have been specified in .storybook/main.js
    if (rootMain.webpackFinal) {
      config = await rootMain.webpackFinal(config, { configType });
    }

    config = {
      ...config,
      resolve: {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          http: require.resolve('stream-http'),
          https: require.resolve('https-browserify'),
        },
        aliasFields: ['browser', 'browser.esm'],
      },
      plugins: [
        ...config.plugins,
        new webpack.ProvidePlugin({
          // Make a global `process` variable that points to the `process` package,
          // because the `util` package expects there to be a global variable named `process`.
          // Thanks to https://stackoverflow.com/a/65018686/14239942
          process: 'process/browser',
        }),
      ],
    };
    // add your own webpack tweaks if needed

    return config;
  },
};
