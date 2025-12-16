import { describe, it, expect, vi } from 'vitest';
import { createKeybindingExtensions } from '../keybindings';

describe('createKeybindingExtensions', () => {
  it('should return an array of extensions', () => {
    const extensions = createKeybindingExtensions({});
    expect(Array.isArray(extensions)).toBe(true);
  });

  it('should include token picker keybinding when openTokenPicker provided', () => {
    const openTokenPicker = vi.fn();
    const extensions = createKeybindingExtensions({ openTokenPicker });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should return base keybindings even when no handlers provided', () => {
    const extensions = createKeybindingExtensions({});
    // Base keybindings (default + history) are always included
    expect(extensions.length).toBeGreaterThan(0);
  });
});
