import merge from 'deepmerge-json';
import packageJSONCurrent from './package.json' assert { type: 'json' };
import fs from 'fs';
import logicAppsSharedPJSON from '../logic-apps-shared/package.json' assert { type: 'json' };
import designerUIPJSON from '../designer-ui/package.json' assert { type: 'json' };
import designerPJSON from '../designer/package.json' assert { type: 'json' };
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
  dependencies: {
    '@microsoft/logic-apps-shared': `${logicAppsSharedPJSON.version}`,
    '@microsoft/designer-ui': `${designerUIPJSON.version}`,
    '@microsoft/designer': `${designerPJSON.version}`,
  },
};
fs.writeFileSync('./build/package.json', JSON.stringify(merge(packageJSONCurrent, packageJSONBuilt), null, 2));
