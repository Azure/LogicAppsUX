import { baseConfig } from '../../playwright.config.base';
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  timeout: 10000,
};

export default config;
