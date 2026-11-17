export default {
  '*.{js,ts,tsx}': [() => 'npm run extract', 'eslint --cache --fix', 'biome check --write'],
};
