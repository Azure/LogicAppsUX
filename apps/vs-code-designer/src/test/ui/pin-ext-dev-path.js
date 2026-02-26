/**
 * Preload script: prevents ExTester from overriding EXTENSION_DEV_PATH to undefined.
 *
 * ExTester's CodeUtil.runTests() does:
 *   process.env.EXTENSION_DEV_PATH = this.coverage ? process.cwd() : undefined;
 *
 * Without --coverage, this wipes our custom EXTENSION_DEV_PATH. This preload
 * intercepts the assignment and blocks the undefined write, preserving the
 * value we set in the parent process.
 *
 * Loaded via NODE_OPTIONS="--require ./pin-ext-dev-path.js"
 */

const savedPath = process.env.EXTENSION_DEV_PATH;

if (savedPath) {
  const originalEnv = process.env;
  // Replace process.env with a Proxy that blocks setting EXTENSION_DEV_PATH to falsy
  process.env = new Proxy(originalEnv, {
    set(target, prop, value) {
      if (prop === 'EXTENSION_DEV_PATH' && !value) {
        // Block the override to undefined — keep our pinned value
        return true;
      }
      return Reflect.set(target, prop, value);
    },
    get(target, prop) {
      return Reflect.get(target, prop);
    },
    deleteProperty(target, prop) {
      if (prop === 'EXTENSION_DEV_PATH') {
        return true; // block deletion too
      }
      return Reflect.deleteProperty(target, prop);
    },
  });
}
