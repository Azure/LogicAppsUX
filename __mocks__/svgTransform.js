/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const path = require('path');
module.exports = {
  process(src, filename) {
    return src;
  },
  // getCacheKey() {
  //     // The output is always the same.
  //     return 'svgTransform';
  // },
};
