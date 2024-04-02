import merge from 'deepmerge-json';
import packageJSONCurrent from './package.json' assert { type: 'json' };
import fs from 'fs';
const packageJSONBuilt = {
  module: 'lib/index.js',
  main: 'lib/index.cjs',
  types: 'lib/index.d.ts',
  exports: {
    '.': {
      types: './lib/index.d.ts',
      import: './lib/index.js',
      default: './lib/index.cjs',
    },
    './package.json': './package.json',
    './lib/index.css': './build/lib/index.css',
  },
};
fs.writeFileSync('./build/package.json', JSON.stringify(merge(packageJSONCurrent, packageJSONBuilt), null, 2));
