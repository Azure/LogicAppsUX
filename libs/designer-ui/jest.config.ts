/* eslint-disable */
export default {
  displayName: 'designer-ui',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: ['@nx/react/babel'],
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
  transformIgnorePatterns: [
    // all exceptions must be first line
    '/node_modules/(?!@fluentui/react)',
    '/node_modules/(?!react-markdown)',
  ],
  moduleNameMapper: {
    '@fluentui/react/lib/(.*)$': '@fluentui/react/lib-commonjs/$1',
    'react-markdown': 'react-markdown/react-markdown.min.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/designer-ui',
};
