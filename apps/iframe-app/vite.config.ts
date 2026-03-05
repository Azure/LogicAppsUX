import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import { execSync } from 'child_process';

// Resolve git version info at build time
function getGitVersion(): { tag: string; sha: string; branch: string; buildTime: string } {
  const run = (cmd: string) => {
    try {
      return execSync(cmd, { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  };
  return {
    tag: run('git describe --tags --abbrev=0 2>/dev/null || echo untagged'),
    sha: run('git rev-parse --short HEAD'),
    branch: run('git rev-parse --abbrev-ref HEAD'),
    buildTime: new Date().toISOString(),
  };
}

// HTML-escape a string for safe insertion into HTML attributes
function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Custom plugin to inject build version as a <meta> tag in HTML
function injectBuildVersion(version: ReturnType<typeof getGitVersion>): Plugin {
  return {
    name: 'inject-build-version',
    transformIndexHtml(html) {
      const tag = escapeHtmlAttr(version.tag);
      const sha = escapeHtmlAttr(version.sha);
      const branch = escapeHtmlAttr(version.branch);
      const buildTime = escapeHtmlAttr(version.buildTime);
      const versionString = `${tag}+${sha}`;
      const meta = `<meta name="build-version" content="${versionString}" data-tag="${tag}" data-sha="${sha}" data-branch="${branch}" data-build-time="${buildTime}" />`;
      return html.replace('</head>', `  ${meta}\n</head>`);
    },
  };
}

// Custom plugin to rename index.html to iframe.html after build
function renameIndexHtml(): Plugin {
  return {
    name: 'rename-index-html',
    closeBundle() {
      // closeBundle runs after all files are written to disk
      const outDir = resolve(__dirname, 'dist');
      const indexPath = resolve(outDir, 'index.html');
      const iframePath = resolve(outDir, 'iframe.html');

      if (existsSync(indexPath)) {
        renameSync(indexPath, iframePath);
      }
    },
  };
}

export default defineConfig(() => {
  const version = getGitVersion();
  return {
    plugins: [
      react(),
      injectBuildVersion(version),
      renameIndexHtml(),
      // Only use mkcert (HTTPS) locally, not in CI or E2E
      ...(process.env.CI || process.env.E2E ? [] : [mkcert()]),
    ],
    define: {
      __BUILD_VERSION__: JSON.stringify(`${version.tag}+${version.sha}`),
      __BUILD_TAG__: JSON.stringify(version.tag),
      __BUILD_SHA__: JSON.stringify(version.sha),
      __BUILD_BRANCH__: JSON.stringify(version.branch),
      __BUILD_TIME__: JSON.stringify(version.buildTime),
    },
    base: './', // Use relative paths instead of absolute
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: undefined,
          assetFileNames: '[name]-[hash].[ext]',
          chunkFileNames: '[name]-[hash].js',
          entryFileNames: '[name]-[hash].js',
        },
      },
    },
    server: {
      port: 3001,
      host: true,
    },
  };
});
