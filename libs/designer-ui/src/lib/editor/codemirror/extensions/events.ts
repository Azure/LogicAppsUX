import type { Extension } from '@codemirror/state';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import type { EditorContentChangedEvent, CursorPositionChangedEvent, ScrollChangedEvent } from '../types';

export interface EventExtensionOptions {
  onFocus?(): void;
  onFocusText?(): void;
  onBlur?(): void;
  onBlurText?(): void;
  onContentChanged?(e: EditorContentChangedEvent): void;
  onCursorPositionChanged?(e: CursorPositionChangedEvent): void;
  onScrollChanged?(e: ScrollChangedEvent): void;
  onMouseDown?(e: MouseEvent): void;
}

export const createEventExtensions = (options: EventExtensionOptions): Extension[] => {
  const extensions: Extension[] = [];

  // Focus/blur handling
  if (options.onFocus || options.onBlur || options.onFocusText || options.onBlurText) {
    extensions.push(
      EditorView.domEventHandlers({
        focus: () => {
          options.onFocus?.();
          options.onFocusText?.();
        },
        blur: () => {
          options.onBlur?.();
          options.onBlurText?.();
        },
      })
    );
  }

  // Content change and cursor position handling
  if (options.onContentChanged || options.onCursorPositionChanged) {
    extensions.push(
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && options.onContentChanged) {
          options.onContentChanged({
            value: update.state.doc.toString(),
          });
        }

        if (update.selectionSet && options.onCursorPositionChanged) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          options.onCursorPositionChanged({
            position: {
              lineNumber: line.number,
              column: pos - line.from + 1,
            },
          });
        }
      })
    );
  }

  // Scroll handling
  if (options.onScrollChanged) {
    extensions.push(
      EditorView.domEventHandlers({
        scroll: (_event, view) => {
          const scrollDOM = view.scrollDOM;
          options.onScrollChanged?.({
            scrollTop: scrollDOM.scrollTop,
            scrollLeft: scrollDOM.scrollLeft,
          });
        },
      })
    );
  }

  // Mouse down handling
  if (options.onMouseDown) {
    extensions.push(
      EditorView.domEventHandlers({
        mousedown: (event) => {
          options.onMouseDown?.(event);
        },
      })
    );
  }

  return extensions;
};
