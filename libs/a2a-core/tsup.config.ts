import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.ts',
    'react/styles': 'src/react/styles/index.css',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2020',
  platform: 'browser',
  splitting: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    // Handle CSS modules as simple objects for now
    options.loader = {
      ...options.loader,
      '.css': 'css',
    };
    options.plugins = [
      ...(options.plugins || []),
      {
        name: 'css-module-plugin',
        setup(build) {
          // Create a map to store CSS module class names

          build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
            const css = readFileSync(args.path, 'utf8');

            // Simple CSS module class name extraction
            const classNames: Record<string, string> = {};
            const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
            let match;

            while ((match = classRegex.exec(css)) !== null) {
              const className = match[1];
              // Add a prefix to avoid conflicts
              const prefixedClassName = `a2a-${className}`;
              classNames[className] = prefixedClassName;
            }

            // Export the class names as a module
            const contents = `
              const styles = ${JSON.stringify(classNames)};
              export default styles;
            `;
            return { contents, loader: 'js' };
          });
        },
      },
    ];
  },
  onSuccess: async () => {
    // Copy the main CSS file to dist
    const srcCss = resolve('./src/react/styles/index.css');
    const distCss = resolve('./dist/react/styles.css');
    const distDir = dirname(distCss);

    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }

    // Collect all CSS module content
    let cssModuleContent = '';

    function processCSSModules(dir: string) {
      const files = readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = join(dir, file.name);

        if (file.isDirectory()) {
          processCSSModules(fullPath);
        } else if (file.name.endsWith('.module.css')) {
          let css = readFileSync(fullPath, 'utf8');
          // Replace class names with prefixed versions
          css = css.replace(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g, '.a2a-$1');
          cssModuleContent += `\n/* ${file.name} */\n${css}\n`;
        }
      }
    }

    processCSSModules(resolve('./src/react/components'));

    if (existsSync(srcCss)) {
      let cssContent = readFileSync(srcCss, 'utf8');
      // Append CSS module styles
      cssContent += '\n/* CSS Modules */\n' + cssModuleContent;
      writeFileSync(distCss, cssContent);
      console.log('✓ Copied styles.css to dist/react/');
    }
  },
});
