import type { Extension } from '@codemirror/state';
import { keymap, EditorView } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';

export interface KeybindingExtensionOptions {
  openTokenPicker?(): void;
}

export const createKeybindingExtensions = (options: KeybindingExtensionOptions): Extension[] => {
  const extensions: Extension[] = [keymap.of(defaultKeymap), keymap.of(historyKeymap)];

  // Alt+/ to open token picker (matching Monaco behavior)
  // On macOS, Option+/ produces ÷ character, so we need to handle the keydown event directly
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

    // Add DOM event handler to catch Alt+/ on macOS before character is produced
    extensions.push(
      EditorView.domEventHandlers({
        keydown: (event: KeyboardEvent) => {
          // Check for Alt+/ (Option+/ on Mac)
          // Use event.code ('Slash') instead of event.key because on macOS
          // Option+/ produces '÷' character, changing event.key
          if (event.altKey && (event.key === '/' || event.code === 'Slash')) {
            event.preventDefault();
            event.stopPropagation();
            options.openTokenPicker?.();
            return true;
          }
          return false;
        },
      })
    );
  }

  return extensions;
};
