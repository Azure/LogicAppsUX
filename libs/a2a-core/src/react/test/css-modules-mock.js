// Mock CSS modules to return the original class names
module.exports = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop === '__esModule') {
        return true;
      }
      if (prop === 'default') {
        return new Proxy(
          {},
          {
            get: (_, className) => {
              // Return the class name as-is, matching the tsup config behavior
              return String(className);
            },
          }
        );
      }
      // Return the prop name as-is for named exports
      return String(prop);
    },
  }
);
