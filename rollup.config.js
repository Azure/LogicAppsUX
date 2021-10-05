import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import postcss from 'rollup-plugin-postcss';
import svg from 'rollup-plugin-svg';
import { transform } from '@formatjs/ts-transformer';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.tsx', // our source file
  output: [
    {
      dir: 'dist/amd',
      format: 'amd',
    },
    {
      dir: 'dist/cjs',
      format: 'cjs',
    },
    {
      dir: 'dist',
      format: 'es', // the preferred format
    },
  ],
  external: [...Object.keys(pkg.dependencies || {})],
  plugins: [
    typescript({
      // eslint-disable-next-line no-undef
      typescript: require('typescript'),
      tsconfig: './tsconfig.lib.json',
      transformers: () => ({
        before: [
          transform({
            overrideIdFn: '[sha512:contenthash:base64:6]',
            ast: true,
          }),
        ],
      }),
    }),
    svg(),
    json(),
    postcss({
      plugins: [],
    }),
  ],
};
