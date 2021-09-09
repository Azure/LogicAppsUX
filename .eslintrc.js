// eslint-disable-next-line no-undef
module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  plugins: ['react', '@typescript-eslint', 'formatjs'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'formatjs/enforce-placeholders': [
      'error',
      {
        ignoreList: ['foo'],
      },
    ],
    'formatjs/enforce-default-message': ['error', 'literal'],
    'formatjs/no-multiple-whitespaces': [1],
    'formatjs/enforce-id': [
      'error',
      {
        idInterpolationPattern: '[sha512:contenthash:base64:6]',
      },
    ],
  },
  ignorePatterns: ['*/__test__/**/*.*', '**/*.spec.tsx', '**/*.spec.ts', '**/*.mdx', '**/*.svg', '**/*.less'],
};
