import { mergeConfig } from 'vite';
import baseConfig from './vite.config';
import { localOnlyPreview } from './vite-plugins/localOnlyPreview';

export default mergeConfig(baseConfig, {
  plugins: [localOnlyPreview()],
});
