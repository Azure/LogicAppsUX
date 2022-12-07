import { baseConfig } from '../../playwright.config.base';
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  ...baseConfig,
};

export default config;
