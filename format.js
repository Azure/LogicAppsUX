module.exports = {
  format: (msgs) => {
    return Object.keys(msgs).reduce((all, k) => {
      if (msgs[k].description) {
        all[`_${k}.comment`] = msgs[k].description;
      }
      all[k] = msgs[k].defaultMessage;

      return all;
    }, {});
  },
  compile: (msgs) => msgs,
};
