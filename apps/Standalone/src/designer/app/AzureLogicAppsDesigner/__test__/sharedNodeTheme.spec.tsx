import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FluentProvider, tokens, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { ActionNodeCard, DesignerUiScope } from '../../../../../../../libs/designer-ui-v2/src';

const tokenReferences = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return tokenReferences(file);
    }
    return /\.tsx?$/.test(entry.name) ? [...readFileSync(file, 'utf8').matchAll(/\btokens\.(\w+)/g)].map((match) => match[1]) : [];
  });

describe('real Standalone Fluent provider compatibility', () => {
  it('supplies every public Fluent token consumed by the shared presentation in both real themes', () => {
    const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../../../libs/designer-ui-v2/src');
    const references = new Set(tokenReferences(source));
    expect(references.size).toBeGreaterThan(0);
    for (const token of references) {
      expect(tokens[token as keyof typeof tokens], token).toBeDefined();
      expect(webLightTheme[token as keyof typeof webLightTheme], `light ${token}`).toBeDefined();
      expect(webDarkTheme[token as keyof typeof webDarkTheme], `dark ${token}`).toBeDefined();
    }
  });

  it.each([
    ['light', webLightTheme],
    ['dark', webDarkTheme],
  ] as const)('supplies the canonical action radius token in %s without a mocked provider', (mode, theme) => {
    expect(tokens.borderRadius2XLarge).toBe('var(--borderRadius2XLarge)');
    expect(theme.borderRadius2XLarge).toBe('12px');
    render(
      <FluentProvider theme={theme}>
        <DesignerUiScope mode={mode}>
          <ActionNodeCard title="Compose" />
        </DesignerUiScope>
      </FluentProvider>
    );
    const css = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => rule.cssText)
      .join('\n');
    expect(css).toContain('--borderRadius2XLarge: 12px');
    expect(css).toContain('border-radius: var(--borderRadius2XLarge)');
  });
});
