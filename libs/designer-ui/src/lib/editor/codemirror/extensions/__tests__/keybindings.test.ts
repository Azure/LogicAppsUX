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

  it('should include indent with tab keybinding when indentWithTab is true', () => {
    const extensions = createKeybindingExtensions({ indentWithTab: true });
    // Should contain base keybindings (2) + tabSize (1) + keymap (1)
    expect(extensions.length).toBe(4);
    // This is a bit of a hack, but there's no easy way to inspect the keymap
    const keymapExtension = extensions[3] as any;
    expect(keymapExtension.value.length).toBe(2);
    expect(keymapExtension.value[0].key).toBe('Tab');
    expect(keymapExtension.value[1].key).toBe('Shift-Tab');
  });

  it('should not include indent with tab keybinding when indentWithTab is false', () => {
    const extensions = createKeybindingExtensions({ indentWithTab: false });
    expect(extensions.length).toBe(2);
  });
});
