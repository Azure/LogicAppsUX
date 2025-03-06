import constants from '../../../constants';
import fontColorSvgDark from '../icons/dark/font-color.svg';
import paintBucketSvgDark from '../icons/dark/paint-bucket.svg';
import fontColorSvgLight from '../icons/light/font-color.svg';
import paintBucketSvgLight from '../icons/light/paint-bucket.svg';
import { FormatBoldButton } from './buttons/FormatBoldButton';
import { FormatItalicButton } from './buttons/FormatItalicButton';
import { FormatLinkButton } from './buttons/FormatLinkButton';
import { FormatUnderlineButton } from './buttons/FormatUnderlineButton';
import { DropdownColorPicker } from './DropdownColorPicker';
import { getSelectedNode, sanitizeUrl } from './helper/functions';
import { useTheme } from '@fluentui/react';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $getSelectionStyleValueForProperty, $patchStyleText } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import type { LexicalEditor } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  KEY_MODIFIER_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

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
  const [isLink, setIsLink] = useState(false);
  const intl = useIntl();

  const updateFormat = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }
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
    return mergeRegister(
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateFormat();
        });
      })
    );
  }, [activeEditor, updateFormat]);

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

  useEffect(() => {
    return activeEditor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (payload) => {
        const event: KeyboardEvent = payload;
        const { code, ctrlKey, metaKey } = event;

        if (code === 'KeyK' && (ctrlKey || metaKey)) {
          event.preventDefault();
          return activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl('https://'));
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [activeEditor, isLink]);

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

  const backgroundColorTitle = intl.formatMessage({
    defaultMessage: 'Background color',
    id: 'e04ebd695019',
    description: 'label to set background color',
  });
  const textColorTitle = intl.formatMessage({
    defaultMessage: 'Text color',
    id: '8f838a9149be',
    description: 'label to set text color',
  });

  return (
    <>
      <FormatBoldButton activeEditor={activeEditor} isToggledOn={isBold} readonly={readonly} />
      <FormatItalicButton activeEditor={activeEditor} isToggledOn={isItalic} readonly={readonly} />
      <FormatUnderlineButton activeEditor={activeEditor} isToggledOn={isUnderline} readonly={readonly} />
      <DropdownColorPicker
        editor={activeEditor}
        disabled={readonly}
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting text color"
        buttonIconSrc={isInverted ? fontColorSvgDark : fontColorSvgLight}
        color={fontColor}
        onChange={onFontColorSelect}
        title={textColorTitle}
      />
      <DropdownColorPicker
        editor={activeEditor}
        disabled={readonly}
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting background color"
        buttonIconSrc={isInverted ? paintBucketSvgDark : paintBucketSvgLight}
        color={bgColor}
        onChange={onBgColorSelect}
        title={backgroundColorTitle}
      />
      <FormatLinkButton activeEditor={activeEditor} isToggledOn={isLink} readonly={readonly} />
    </>
  );
};
