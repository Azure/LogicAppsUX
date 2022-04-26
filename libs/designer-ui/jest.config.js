module.exports = {
  displayName: 'designer-ui',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: ["node_modules\/(?!(monaco-editor|monaco-editor-core)\/)"],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
    '^.+\\.svg$': '../../__mocks__/svgTransform.js',
  },
  moduleNameMapper: {
    '@fluentui/react/lib/(.*)$': '@fluentui/react/lib-commonjs/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/designer-ui',
  
};
