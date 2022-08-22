import { FontDropDown } from '../FontDropDown';
import clockWiseArrow from './icons/arrow-clockwise.svg';
import counterClockWiseArrow from './icons/arrow-counterclockwise.svg';
import bold from './icons/type-bold.svg';
import italic from './icons/type-italic.svg';
import underline from './icons/type-underline.svg';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';

export function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [activeEditor] = useState(editor);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [fontSize, setFontSize] = useState<string>('15px');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      //   const anchorNode = selection.anchor.getNode();
      //   const element = anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      //   const elementKey = element.getKey();
      //   const elementDOM = activeEditor.getElementByKey(elementKey);

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      //   setIsStrikethrough(selection.hasFormat('strikethrough'));
      //   setIsSubscript(selection.hasFormat('subscript'));
      //   setIsSuperscript(selection.hasFormat('superscript'));
      //   setIsCode(selection.hasFormat('code'));
      //   setIsRTL($isParentElementRTL(selection));

      // Update links
      //   const node = getSelectedNode(selection);
      //   const parent = node.getParent();
      //   if ($isLinkNode(parent) || $isLinkNode(node)) {
      //     setIsLink(true);
      //   } else {
      //     setIsLink(false);
      //   }

      //   if (elementDOM !== null) {
      //     setSelectedElementKey(elementKey);
      //     if ($isListNode(element)) {
      //       const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
      //       const type = parentList ? parentList.getListType() : element.getListType();
      //       setBlockType(type);
      //     } else {
      //       const type = $isHeadingNode(element) ? element.getTag() : element.getType();
      //       if (type in blockTypeToBlockName) {
      //         setBlockType(type as keyof typeof blockTypeToBlockName);
      //       }
      //       if ($isCodeNode(element)) {
      //         const language = element.getLanguage() as keyof typeof CODE_LANGUAGE_MAP;
      //         setCodeLanguage(language ? CODE_LANGUAGE_MAP[language] || language : '');
      //         return;
      //       }
      //     }
      //   }
      // Handle buttons
      //   setFontColor($getSelectionStyleValueForProperty(selection, 'color', '#000'));
      //   setBgColor($getSelectionStyleValueForProperty(selection, 'background-color', '#fff'));
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
      setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '12px'));
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [activeEditor, updateToolbar]);

  return (
    <div className="toolbar">
      <button
        disabled={!canUndo}
        onClick={() => {
          activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        title={'Undo (Ctrl+Z)'}
        className="toolbar-item spaced"
        aria-label="Undo"
      >
        <img className={'format'} src={counterClockWiseArrow} alt={'counter clockwise arrow'} />
      </button>
      <button
        disabled={!canRedo}
        onClick={() => {
          activeEditor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        title={'Redo (Ctrl+Y)'}
        className="toolbar-item"
        aria-label="Redo"
      >
        <img className={'format'} src={clockWiseArrow} alt={'clockwise arrow'} />
      </button>
      <Divider />
      <FontDropDown hasStyle={'font-family'} value={fontFamily} editor={editor} />
      <FontDropDown hasStyle={'font-size'} value={fontSize} editor={editor} />
      <Divider />
      <button
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={'toolbar-item spaced ' + (isBold ? 'active' : '')}
        title={'Bold (Ctrl+B)'}
        aria-label={`Format text as bold. Shortcut: 'Ctrl+B'`}
      >
        <img className={'format'} src={bold} alt={'bold icon'} />
      </button>
      <button
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={'toolbar-item spaced ' + (isItalic ? 'active' : '')}
        title={'Italic (Ctrl+I)'}
        aria-label={`Format text as italics. Shortcut: 'Ctrl+I'`}
      >
        <img className={'format'} src={italic} alt={'italic icon'} />
      </button>
      <button
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={'toolbar-item spaced ' + (isUnderline ? 'active' : '')}
        title={'Underline (Ctrl+U)'}
        aria-label={`Format text to underlined. Shortcut: '⌘U' : 'Ctrl+U'`}
      >
        <img className={'format'} src={underline} alt={'underline icon'} />
      </button>
    </div>
  );
}

function Divider(): JSX.Element {
  return <div className="msla-toolbar-divider" />;
}
