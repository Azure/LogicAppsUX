const rootMain = require('../../../.storybook/main');

module.exports = {
  ...rootMain,

  core: { ...rootMain.core, builder: 'webpack5' },
  stories: [
    ...rootMain.stories,
    '../../**/*.stories.mdx',
    '../src/lib/docs/**/*.stories.@(js|jsx|ts|tsx)', // This makes sure any Designer Docs are ordered before others
    '../../../apps/**/*.stories.@(js|jsx|ts|tsx)',
    // Moving Editor story to end to address https://github.com/microsoft/monaco-editor/issues/2448
    '../../**/!(editor).stories.@(js|jsx|ts|tsx)',
    '../../**/editor.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [...rootMain.addons, '@nrwl/react/plugins/storybook'],
  webpackFinal: async (config, { configType }) => {
    // apply any global webpack configs that might have been specified in .storybook/main.js
    if (rootMain.webpackFinal) {
      config = await rootMain.webpackFinal(config, { configType });
    }

    // add your own webpack tweaks if needed

    return config;
  },
};
