/* eslint-disable */
export default {
  displayName: '@microsoft/logic-apps-chatbot',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: ['@nrwl/react/babel'],
      },
    ],
    '^.+\\.svg$': '../../__mocks__/svgTransform.js',
  },
  transformIgnorePatterns: [
    // all exceptions must be first line
    '/node_modules/(?!@fluentui/react)',
    '/node_modules/(?!(monaco-editor))',
  ],
  moduleNameMapper: {
    '@fluentui/react/lib/(.*)$': '@fluentui/react/lib-commonjs/$1',
    'react-markdown': 'react-markdown/react-markdown.min.js',
    '^monaco-editor$': '@monaco-editor/react',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/chatbot',
};
