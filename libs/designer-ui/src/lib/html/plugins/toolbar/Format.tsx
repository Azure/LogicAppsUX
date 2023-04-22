import { isApple } from '../../../helper';
import bold from '../icons/type-bold.svg';
import italic from '../icons/type-italic.svg';
import underline from '../icons/type-underline.svg';
import { ColorPicker } from './ColorPicker';
import { $patchStyleText } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { useCallback, useEffect, useState } from 'react';

interface FormatProps {
  fontColor: string;
  activeEditor: LexicalEditor;
}

export const Format = ({ fontColor, activeEditor }: FormatProps) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateFormat = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  const handleColorChange = useCallback(
    (option: string) => {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            color: option,
          });
        }
      });
    },
    [activeEditor]
  );

  useEffect(() => {
    return mergeRegister(
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateFormat();
        });
      })
    );
  }, [activeEditor, updateFormat]);

  return (
    <>
      <button
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        title={isApple() ? 'Bold (⌘B)' : 'Bold (Ctrl+B)'}
        aria-label={`Format text as bold. Shortcut: ${isApple() ? '⌘B' : 'Ctrl+B'}`}
      >
        <img className={'format'} src={bold} alt={'bold icon'} />
      </button>
      <button
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        title={isApple() ? 'Italic (⌘I)' : 'Italic (Ctrl+I)'}
        aria-label={`Format text as italics. Shortcut: ${isApple() ? '⌘I' : 'Ctrl+I'}`}
      >
        <img className={'format'} src={italic} alt={'italic icon'} />
      </button>
      <button
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        title={isApple() ? 'Underline (⌘U)' : 'Underline (Ctrl+U)'}
        aria-label={`Format text to underlined. Shortcut: ${isApple() ? '⌘U' : 'Ctrl+U'}`}
      >
        <img className={'format'} src={underline} alt={'underline icon'} />
      </button>
      <ColorPicker
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting text color"
        buttonIconClassName="icon font-color"
        color={fontColor}
        onChange={(color) => {
          handleColorChange(color);
        }}
        title="text color"
      />
    </>
  );
};
