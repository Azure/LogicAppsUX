/* eslint-disable */
export default {
  displayName: 'microsoft-logic-apps-data-mapper',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: ['@nrwl/react/babel'],
        plugins: [
          [
            'formatjs',
            {
              idInterpolationPattern: '[sha512:contenthash:base64:6]',
              ast: true,
            },
          ],
        ],
      },
    ],
    '^.+\\.svg$': '../../__mocks__/svgTransform.js',
  },
  moduleNameMapper: {
    '@fluentui/react/lib/(.*)$': '@fluentui/react/lib-commonjs/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/microsoft-logic-apps-data-mapper',
};
