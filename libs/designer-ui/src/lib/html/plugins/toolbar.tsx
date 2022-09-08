import { isApple } from '../../helper';
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

export enum blockTypeToBlockName {
  bullet = 'Bulleted List',
  check = 'Check List',
  code = 'Code Block',
  h1 = 'Heading 1',
  h2 = 'Heading 2',
  h3 = 'Heading 3',
  h4 = 'Heading 4',
  h5 = 'Heading 5',
  h6 = 'Heading 6',
  number = 'Numbered List',
  paragraph = 'Normal',
  quote = 'Quote',
}

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
  // const [blockType, setBlockType] = useState<blockTypeToBlockName>(blockTypeToBlockName.paragraph);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
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
        title={isApple() ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
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
        title={isApple() ? 'Redo (⌘Y)' : 'Redo (Ctrl+Y)'}
        className="toolbar-item"
        aria-label="Redo"
      >
        <img className={'format'} src={clockWiseArrow} alt={'clockwise arrow'} />
      </button>
      <Divider />

      <Divider />
      <FontDropDown hasStyle={'font-family'} value={fontFamily} editor={editor} />
      <FontDropDown hasStyle={'font-size'} value={fontSize} editor={editor} />
      <Divider />
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
    </div>
  );
}

function Divider(): JSX.Element {
  return <div className="msla-toolbar-divider" />;
}
