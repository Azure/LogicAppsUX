import { isApple } from '../../../helper';
import clockWiseArrow from '../icons/arrow-clockwise.svg';
import counterClockWiseArrow from '../icons/arrow-counterclockwise.svg';
import { Format } from './Format';
import { FontDropDown, FontDropDownType } from './helper/FontDropDown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
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

interface toolbarProps {
  readonly?: boolean;
}

export const Toolbar = ({ readonly = false }: toolbarProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fontSize, setFontSize] = useState<string>('12px');
  const [fontFamily, setFontFamily] = useState<string>('Arial');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    // Currently a bug affecting the toolbug due to $getSelection https://github.com/facebook/lexical/issues/4011
    if ($isRangeSelection(selection)) {
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
  }, [editor, activeEditor, updateToolbar]);

  return (
    <div className="msla-html-editor-toolbar">
      <button
        disabled={!canUndo || readonly}
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
        disabled={!canRedo || readonly}
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

      <FontDropDown fontDropdownType={FontDropDownType.FONTFAMILY} value={fontFamily} editor={editor} disabled={readonly} />
      <FontDropDown fontDropdownType={FontDropDownType.FONTSIZE} value={fontSize} editor={editor} disabled={readonly} />
      <Divider />
      <Format activeEditor={activeEditor} readonly={readonly} />
    </div>
  );
};

const Divider = (): JSX.Element => {
  return <div className="msla-toolbar-divider" />;
};
