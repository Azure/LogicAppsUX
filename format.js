module.exports = {
  format: (msgs) => {
    return Object.keys(msgs).reduce((all, k) => {
      all[`_${k}.comment`] = `${
        msgs[k].description ? `${msgs[k].description}.` : ''
      } values inside of {} represent variables that will be inserted at runtime. PLEASE DO NOT TRANSLATE THOSE.`;

      all[k] = msgs[k].defaultMessage;

      return all;
    }, {});
  },
  compile: (msgs) => {
    return Object.keys(msgs).reduce((all, k) => {
      if (k.startsWith('_') && k.endsWith('.comment')) {
        return all;
      }
      all[k] = msgs[k];

      return all;
    }, {});
  },
};
