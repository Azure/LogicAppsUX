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
      // Custom (non-generated) icons in the codebase call `wrapIcon(Icon, displayName)` at module
      // evaluation time to produce a component with the same shape as Fluent's generated icons.
      // Keep it callable and render the real Icon so these hand-authored icons still work, without
      // pulling in Fluent's generated SVG exports (which is what this mock exists to avoid).
      wrapIcon: (Icon: (props: unknown) => unknown, displayName?: string) => {
        const component = forwardRef((props, ref) => createElement(Icon as never, { ...(props as object), ref }));
        component.displayName = displayName ?? (Icon as { displayName?: string }).displayName ?? Icon.name;
        return component;
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
      has(target: Record<string, unknown>, prop: string | symbol) {
        // Symbols (e.g. Symbol.toStringTag) and `then` must fall through to the real
        // target so the mocked namespace isn't mistaken for a thenable by dynamic import
        // interop, and so built-in symbol checks behave normally.
        if (typeof prop === 'symbol' || prop === 'then') {
          return prop in target;
        }
        return true;
      },
      getOwnPropertyDescriptor(target: Record<string, unknown>, prop: string | symbol) {
        if (prop in target) {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        if (typeof prop === 'symbol') {
          return undefined;
        }
        if (!cache[prop]) {
          cache[prop] = createStub(prop);
        }
        return { configurable: true, enumerable: true, value: cache[prop], writable: true };
      },
    }
  );
});
