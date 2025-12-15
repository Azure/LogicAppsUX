import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';

export interface KeybindingExtensionOptions {
  openTokenPicker?(): void;
}

export const createKeybindingExtensions = (options: KeybindingExtensionOptions): Extension[] => {
  const extensions: Extension[] = [keymap.of(defaultKeymap), keymap.of(historyKeymap)];

  // Alt+/ to open token picker (matching Monaco behavior)
  if (options.openTokenPicker) {
    extensions.push(
      keymap.of([
        {
          key: 'Alt-/',
          run: () => {
            options.openTokenPicker?.();
            return true;
          },
        },
      ])
    );
  }

  return extensions;
};
