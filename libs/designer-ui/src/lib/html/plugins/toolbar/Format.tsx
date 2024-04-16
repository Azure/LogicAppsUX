import constants from '../../../constants';
import fontColorSvgDark from '../icons/dark/font-color.svg';
import linkDark from '../icons/dark/link.svg';
import paintBucketSvgDark from '../icons/dark/paint-bucket.svg';
import boldDark from '../icons/dark/type-bold.svg';
import italicDark from '../icons/dark/type-italic.svg';
import underlineDark from '../icons/dark/type-underline.svg';
import fontColorSvgLight from '../icons/light/font-color.svg';
import linkLight from '../icons/light/link.svg';
import paintBucketSvgLight from '../icons/light/paint-bucket.svg';
import boldLight from '../icons/light/type-bold.svg';
import italicLight from '../icons/light/type-italic.svg';
import underlineLight from '../icons/light/type-underline.svg';
import { DropdownColorPicker } from './DropdownColorPicker';
import { getSelectedNode, sanitizeUrl } from './helper/functions';
import { useTheme } from '@fluentui/react';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import { isApple } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from 'lexical';
import {
  COMMAND_PRIORITY_NORMAL,
  KEY_MODIFIER_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  SELECTION_CHANGE_COMMAND,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
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

  const insertLink = useCallback(() => {
    if (isLink) {
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl('https://'));
    }
  }, [activeEditor, isLink]);

  const boldTitleMac = intl.formatMessage({
    defaultMessage: 'Bold (⌘B)',
    id: 'ciLkfU',
    description: 'Command for bold text for Mac users',
  });
  const boldTitleMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as bold. Shortcut: ⌘B',
    id: 'S138/4',
    description: 'label to make bold text for Mac users',
  });
  const boldTitleNonMac = intl.formatMessage({
    defaultMessage: 'Bold (Ctrl+B)',
    id: 'Lnqh6h',
    description: 'Command for bold text for non-mac users',
  });
  const boldTitleNonMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as bold. Shortcut: Ctrl+B',
    id: 'YR1uWE',
    description: 'label to make bold text for nonMac users',
  });

  const italicTitleMac = intl.formatMessage({
    defaultMessage: 'Italic (⌘I)',
    id: 'elD6+N',
    description: 'Command for italic text for Mac users',
  });
  const italicTitleMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as italic. Shortcut: ⌘I',
    id: 'YdQw4/',
    description: 'label to make italic text for Mac users',
  });
  const italicTitleNonMac = intl.formatMessage({
    defaultMessage: 'Italic (Ctrl+I)',
    id: 'dfmH55',
    description: 'Command for italic text for non-mac users',
  });
  const italicTitleNonMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as italic. Shortcut: Ctrl+I',
    id: 'gIx5ys',
    description: 'label to make italic text for nonMac users',
  });

  const underlineTitleMac = intl.formatMessage({
    defaultMessage: 'Underline (⌘U)',
    id: 'KYX5Do',
    description: 'Command for underline text for Mac users',
  });
  const underlineTitleMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as underline. Shortcut: ⌘U',
    id: 'qBkxGU',
    description: 'label to make underline text for Mac users',
  });
  const underlineTitleNonMac = intl.formatMessage({
    defaultMessage: 'Underline (Ctrl+U)',
    id: 'lwlg2K',
    description: 'Command for underline text for non-mac users',
  });
  const underlineTitleNonMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as underline. Shortcut: Ctrl+U',
    id: 'YJlS8E',
    description: 'label to make underline text for nonMac users',
  });
  const insertLinkLabel = intl.formatMessage({
    defaultMessage: 'Insert Link',
    id: 'tUCptx',
    description: 'label to insert link',
  });

  return (
    <>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={`toolbar-item spaced ${isBold ? 'active' : ''}`}
        title={isApple() ? boldTitleMac : boldTitleNonMac}
        aria-label={isApple() ? boldTitleMacAriaLabel : boldTitleNonMacAriaLabel}
        disabled={readonly}
      >
        <img className={'format'} src={isInverted ? boldDark : boldLight} alt={'bold icon'} />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={`toolbar-item spaced ${isItalic ? 'active' : ''}`}
        title={isApple() ? italicTitleMac : italicTitleNonMac}
        aria-label={isApple() ? italicTitleMacAriaLabel : italicTitleNonMacAriaLabel}
        disabled={readonly}
      >
        <img className={'format'} src={isInverted ? italicDark : italicLight} alt={'italic icon'} />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={`toolbar-item spaced ${isUnderline ? 'active' : ''}`}
        title={isApple() ? underlineTitleMac : underlineTitleNonMac}
        aria-label={isApple() ? underlineTitleMacAriaLabel : underlineTitleNonMacAriaLabel}
        disabled={readonly}
      >
        <img className={'format'} src={isInverted ? underlineDark : underlineLight} alt={'underline icon'} />
      </button>
      <button
        onMouseDown={(e) => e.preventDefault()}
        disabled={readonly}
        onClick={insertLink}
        className={`toolbar-item spaced ${isLink ? 'active' : ''}`}
        aria-label={insertLinkLabel}
        title={insertLinkLabel}
      >
        <img className={'format'} src={isInverted ? linkDark : linkLight} alt={'link icon'} />
      </button>
      <DropdownColorPicker
        editor={activeEditor}
        disabled={readonly}
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting text color"
        buttonIconSrc={isInverted ? fontColorSvgDark : fontColorSvgLight}
        color={fontColor}
        onChange={onFontColorSelect}
        title="text color"
      />
      <DropdownColorPicker
        editor={activeEditor}
        disabled={readonly}
        buttonClassName="toolbar-item color-picker"
        buttonAriaLabel="Formatting background color"
        buttonIconSrc={isInverted ? paintBucketSvgDark : paintBucketSvgLight}
        color={bgColor}
        onChange={onBgColorSelect}
        title="background color"
      />
    </>
  );
};
