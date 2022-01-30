module.exports = {
  stories: [],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  webpackFinal: async (config) => {
    // https://stackoverflow.com/questions/61498644/storybook-failed-to-execute-createelement-on-svg-files-using-svgr-webpack

    // Default rule for images /\.(svg|ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/
    const fileLoaderRule = config.module.rules.find((rule) => rule.test && rule.test.test('.svg'));
    fileLoaderRule.exclude = /\.svg$/;

    config.module.rules.push({
      test: /\.svg$/,
      enforce: 'pre',
      loader: require.resolve('@svgr/webpack'),
    });

    // Return the altered config
    return config;
  },
};
