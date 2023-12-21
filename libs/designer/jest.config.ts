/* eslint-disable */
export default {
  displayName: '@microsoft/logic-apps-designer',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: ['@nx/react/babel'],
        plugins: [
          ['@babel/plugin-transform-private-methods', { loose: true }],
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
  transformIgnorePatterns: [
    // all exceptions must be first line
    '<rootDir>/node_modules/(?!${transformIgnoreNodeModules})',
  ],
  moduleNameMapper: {
    '@fluentui/react/lib/(.*)$': '@fluentui/react/lib-commonjs/$1',
    'react-markdown': 'react-markdown/react-markdown.min.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/designer',
};

const transformIgnoreNodeModules = ['@fluentui/react'].join('|');
