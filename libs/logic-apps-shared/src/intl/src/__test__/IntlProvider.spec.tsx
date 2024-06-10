import { describe, test, expect } from 'vitest';
import { loadLocaleData } from '../IntlProvider';

describe('loadLocaleData', () => {
  test('returns correct messages for each non english locale', async () => {
    const locales = [
      'nl',
      'pl',
      'pt',
      'pt-BR',
      'zh-Hans',
      'en-XA',
      'ru',
      'sv',
      'tr',
      'zh',
      'fr',
      'cs',
      'de',
      'es',
      'hu',
      'id',
      'it',
      'ja',
      'ko',
    ];
    const englishMessages = await loadLocaleData('en-US');
    for (const locale of locales) {
      const messages = await loadLocaleData(locale);
      expect(messages).toBeDefined();
      expect(messages).not.toEqual(englishMessages);
      // Add more specific checks here based on the expected structure of your messages
    }
  });
  test('returns correct messages for english locale, same as default messages', async () => {
    const messages = await loadLocaleData('en-US');
    const defaultMessages = await loadLocaleData('');
    expect(messages).toBeDefined();
    expect(messages).toEqual(defaultMessages);
    // Add more specific checks here based on the expected structure of your messages
  });

  test('returns english messages for unsupported locale', async () => {
    const messages = await loadLocaleData('unsupported-locale');
    const englishMessages = await loadLocaleData('en-US');
    expect(messages).toBeDefined();
    expect(messages).toEqual(englishMessages);
    // Add more specific checks here based on the expected structure of your default messages
  });

  test('merges string overrides into messages', async () => {
    const stringOverrides = {
      g5A6Bn: 'Connector Type',
      TRpSCQ: 'Action or Trigger',
      '/VcZ9g': 'Test String Override',
    };
    const messages = await loadLocaleData('en', stringOverrides);
    expect(messages).toBeDefined();
    expect(messages.g5A6Bn).toEqual('Connector Type');
    expect(messages.TRpSCQ).toEqual('Action or Trigger');
    expect(messages['/VcZ9g']).toEqual('Test String Override');
  });
});
