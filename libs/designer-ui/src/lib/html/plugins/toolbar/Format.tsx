import constants from '../../../constants';
import { isApple } from '../../../helper';
import fontColorSvg from '../icons/font-color.svg';
import paintBucketSvg from '../icons/paint-bucket.svg';
import bold from '../icons/type-bold.svg';
import italic from '../icons/type-italic.svg';
import underline from '../icons/type-underline.svg';
import { DropdownColorPicker } from './DropdownColorPicker';
import { useTheme } from '@fluentui/react';
import { $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import { COMMAND_PRIORITY_CRITICAL, SELECTION_CHANGE_COMMAND, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { useCallback, useEffect, useState } from 'react';

interface FormatProps {
  activeEditor: LexicalEditor;
  readonly: boolean;
}

export const Format = ({ activeEditor, readonly }: FormatProps) => {
  const { isInverted } = useTheme();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [fontColor, setFontColor] = useState<string>(isInverted ? constants.INVERTED_TEXT_COLOR : constants.STANDARD_TEXT_COLOR);
  const [bgColor, setBgColor] = useState<string>(
    isInverted ? constants.INVERTED_EDITOR_BACKGROUND_COLOR : constants.STANDARD_EDITOR_BACKGROUND_COLOR
  );

  const updateFormat = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setFontColor(
        $getSelectionStyleValueForProperty(selection, 'color', isInverted ? constants.INVERTED_TEXT_COLOR : constants.STANDARD_TEXT_COLOR)
      );
      setBgColor(
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          isInverted ? constants.INVERTED_EDITOR_BACKGROUND_COLOR : constants.STANDARD_EDITOR_BACKGROUND_COLOR
        )
      );
    }
  }, [isInverted]);

  useEffect(() => {
    return activeEditor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload) => {
        updateFormat();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [activeEditor, updateFormat]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      activeEditor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
        }
      });
    },
    [activeEditor]
  );

  const onFontColorSelect = useCallback(
    (value: string) => {
      applyStyleText({ color: value });
    },
    [applyStyleText]
  );

  const onBgColorSelect = useCallback(
    (value: string) => {
      applyStyleText({ 'background-color': value });
    },
    [applyStyleText]
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        title={isApple() ? 'Bold (⌘B)' : 'Bold (Ctrl+B)'}
        aria-label={`Format text as bold. Shortcut: ${isApple() ? '⌘B' : 'Ctrl+B'}`}
        disabled={readonly}
      >
        <img className={'format'} src={bold} alt={'bold icon'} />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        title={isApple() ? 'Italic (⌘I)' : 'Italic (Ctrl+I)'}
        aria-label={`Format text as italics. Shortcut: ${isApple() ? '⌘I' : 'Ctrl+I'}`}
        disabled={readonly}
      >
        <img className={'format'} src={italic} alt={'italic icon'} />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        title={isApple() ? 'Underline (⌘U)' : 'Underline (Ctrl+U)'}
        aria-label={`Format text to underlined. Shortcut: ${isApple() ? '⌘U' : 'Ctrl+U'}`}
        disabled={readonly}
      >
        <img className={'format'} src={underline} alt={'underline icon'} />
      </button>
      <DropdownColorPicker
        editor={activeEditor}
        disabled={readonly}
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting text color"
        buttonIconSrc={fontColorSvg}
        color={fontColor}
        onChange={onFontColorSelect}
        title="text color"
      />
      <DropdownColorPicker
        editor={activeEditor}
        disabled={readonly}
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting background color"
        buttonIconSrc={paintBucketSvg}
        color={bgColor}
        onChange={onBgColorSelect}
        title="background color"
      />
    </>
  );
};
