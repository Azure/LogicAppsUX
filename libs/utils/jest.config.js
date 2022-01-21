module.exports = {
  displayName: 'utils',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
    '^.+\\.[tj]sx?$': 'babel-jest',
    '^.+\\.svg$': '../../__mocks__/svgTransform.js',
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/utils',
};
