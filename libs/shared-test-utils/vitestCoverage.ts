// Vitest matches substrings; disallow suffixes so .js does not also match .json.
export const coveragePathEnd = '!(+([\\s\\S]))';
export const coverageFileGlob = `*.{js,cjs,mjs,ts,mts,tsx,jsx,vue,svelte,marko,astro}${coveragePathEnd}`;

// Preserve the Vitest 3 coverage scope; Vitest 4 removed extension filtering and default exclusions.
export const coverageDefaults = {
  include: [`src/**/${coverageFileGlob}`],
  // Root-only exclusions are outside src; substring matching would wrongly exclude nested product folders.
  exclude: [
    '**/node_modules/**',
    '**/[.]**',
    '**/*.d.ts',
    '**/virtual:*',
    '**/__x00__*',
    // Picomatch strips literal NULs; an escaped character class preserves the virtual-module exclusion.
    '**/[\\x00]*',
    '**/*{.,-}{test,spec,bench,benchmark}?(-d).?(c|m)[jt]s?(x)',
    '**/__tests__/**',
    '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    '**/vitest.{workspace,projects}.[jt]s?(on)',
    '**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}',
  ],
};
