const copy = require('recursive-copy');

const func = async () => {
  try {
    const results = await copy('node_modules', 'dist/apps/vs-code-designer/node_modules', {
      filter: ['**/*.svg'],
    });
    console.info('Copied ' + results.length + ' files');
  } catch (error) {
    console.error('Copy failed: ' + error);
  }
};

func();
