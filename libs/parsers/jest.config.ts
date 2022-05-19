/* eslint-disable */
export default {
  displayName: 'parsers',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
    '^.+\\.svg$': '../../__mocks__/svgTransform.js',
  },
  moduleNameMapper: {
    '@fluentui/react/lib/(.*)$': '@fluentui/react/lib-commonjs/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/parsers',
};
