/* eslint-disable */
export default {
  displayName: 'services-designer',
  preset: '../../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'tsx', 'jsx', 'html'],
  coverageDirectory: '../../../coverage/libs/services/designer',
};
