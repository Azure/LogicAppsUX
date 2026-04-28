/* eslint-disable react/display-name */
// Setup file that mocks @fluentui/react-icons to avoid importing hundreds of SVG modules.
// Add this file to the `setupFiles` array in vitest.config.ts.

import { createElement, forwardRef } from 'react';
import { vi } from 'vitest';

vi.mock('@fluentui/react-icons', () => {
  const cache: Record<string, unknown> = {};

  function createStub(name: string) {
    const component = forwardRef<HTMLSpanElement>((props, ref) => {
      return createElement('span', { ...props, ref, 'data-icon-name': name });
    });
    component.displayName = name;
    return component;
  }

  return new Proxy(
    {
      bundleIcon: (_filled: unknown, _regular: unknown) => {
        return forwardRef<HTMLSpanElement>((props, ref) => {
          return createElement('span', { ...props, ref, 'data-testid': 'fluent-icon' });
        });
      },
    },
    {
      get(target: Record<string, unknown>, prop: string) {
        if (prop in target) {
          return target[prop];
        }
        if (!cache[prop]) {
          cache[prop] = createStub(prop);
        }
        return cache[prop];
      },
    }
  );
});
