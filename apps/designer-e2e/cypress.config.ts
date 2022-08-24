/* eslint-disable */

export default {
  fileServerFolder: '.',
  fixturesFolder: './src/fixtures',

  // modifyObstructiveCode: false,
  video: true,

  videosFolder: '../../dist/cypress/apps/designer-e2e/videos',
  screenshotsFolder: '../../dist/cypress/apps/designer-e2e/screenshots',
  chromeWebSecurity: false,
  retries: 3,

  e2e: {
    setupNodeEvents(on, config) {},
    specPattern: './src/integration/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: './src/support/index.ts',
    baseUrl: 'http://localhost:4400',
  },

  // component: {
  //   devServer: {
  //     framework: "react",
  //     bundler: "webpack",
  //   },
  // },
};
