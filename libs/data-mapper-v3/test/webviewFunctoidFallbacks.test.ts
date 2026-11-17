// @vitest-environment jsdom
import { teamsHighContrastTheme, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { AddRegular, MathSymbolsRegular, WrenchRegular } from '@fluentui/react-icons';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { getFunctoidBrand, getFunctoidIcon } from '../webview/src/components/functoidCategoryIcons';
import { getFunctoidDisplayName, getFunctoidShortName } from '../webview/src/components/functoidDisplayName';
import { getVsCodeFluentTheme } from '../webview/src/fluentTheme';
import { StringCategory20Regular } from '../webview/src/icons/CategoryIcons';

afterEach(() => {
  document.body.className = '';
});

describe('functoid icon fallback precedence', () => {
  it.each(['String', 'Cumulative', 'VendorExtension', undefined])('renders an SVG fallback for category %s', (category) => {
    const Icon = getFunctoidIcon('Vendor Extension', category);
    for (const props of [{}, { height: 24, primaryFill: '#123456' }]) {
      const container = document.createElement('div');
      container.innerHTML = renderToStaticMarkup(React.createElement(Icon, { ...props, 'aria-label': 'Vendor Extension' }));
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('aria-label')).toBe('Vendor Extension');
      expect(svg?.querySelector('path')?.getAttribute('d')).toBeTruthy();
      if (category === 'Cumulative') {
        expect(svg?.getAttribute('height')).toBe(String(props.height ?? 10));
        expect(svg?.querySelector('path')?.getAttribute('fill')).toBe(props.primaryFill ?? 'currentColor');
      }
    }
  });

  it.each(['Math', 'Custom', 'VendorExtension', undefined])('keeps the known function icon for category %s', (category) => {
    expect(getFunctoidIcon('Addition', category)).toBe(AddRegular);
  });

  it.each(['VendorExtension', undefined])('uses the known category for an unrecognized or unset function %s', (name) => {
    expect(getFunctoidIcon(name, 'String')).toBe(StringCategory20Regular);
    expect(getFunctoidIcon(name, 'Math')).toBe(MathSymbolsRegular);
    expect(getFunctoidIcon(name, 'Scientific')).toBe(MathSymbolsRegular);
  });

  it.each(['Custom', 'VendorExtension', '', undefined])('uses the custom wrench for unknown/unset category %s', (category) => {
    expect(getFunctoidIcon('VendorExtension', category)).toBe(WrenchRegular);
    expect(getFunctoidIcon(undefined, category)).toBe(WrenchRegular);
  });
});

describe.each([
  { className: '', theme: webLightTheme },
  { className: 'vscode-dark', theme: webDarkTheme },
  { className: 'vscode-high-contrast vscode-dark', theme: teamsHighContrastTheme },
])('functoid branding with real DOM theme selection: $className', ({ className, theme }) => {
  it('uses the package theme helper and keeps custom/unknown/unset brands consistent', () => {
    document.body.className = className;
    expect(getVsCodeFluentTheme()).toBe(theme);
    for (const category of ['Custom', 'VendorExtension', '', undefined]) {
      expect(getFunctoidBrand(category)).toEqual({
        color: theme.colorPaletteDarkGreenBackground2,
        iconColor: theme.colorNeutralForegroundInverted,
      });
    }
  });

  it('preserves known category brands rather than falling back to custom', () => {
    document.body.className = className;
    const colors = {
      String: theme.colorPaletteDarkOrangeForeground3,
      Math: theme.colorPaletteMarigoldBorder2,
      Scientific: theme.colorPaletteMarigoldBorder2,
      Logical: '#F6CA30',
      DateTime: theme.colorPaletteLightTealBorderActive,
      Conversion: theme.colorPaletteBlueBorderActive,
      Cumulative: theme.colorPaletteNavyForeground2,
      DatabaseLookup: theme.colorPaletteMagentaBorderActive,
      Advanced: theme.colorPaletteMagentaBorderActive,
    };
    for (const [category, color] of Object.entries(colors)) {
      expect(getFunctoidBrand(category)).toEqual({ color, iconColor: theme.colorNeutralForegroundInverted });
    }
  });
});

describe('functoid labels', () => {
  it.each([
    ['String Concatenate', 'Concatenate', 'Conc'],
    ['Cumulative Average', 'Average', 'CAvg'],
    ['Addition', 'Addition', 'Add'],
    ['Vendor Extension', 'Vendor Extension', 'Vend'],
    ['String Vendor Extension', 'Vendor Extension', 'Vend'],
    ['Cumulative Vendor Extension', 'Vendor Extension', 'Vend'],
    ['My String Function', 'My String Function', 'My S'],
    ['Io', 'Io', 'Io'],
    ['', '', ''],
  ])('displays %j as %j with compact label %j', (name, displayName, shortName) => {
    expect(getFunctoidDisplayName(name)).toBe(displayName);
    expect(getFunctoidShortName(name)).toBe(shortName);
  });
});
