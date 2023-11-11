import { isApple } from '../../../helper';
import clockWiseArrowDark from '../icons/dark/arrow-clockwise.svg';
import counterClockWiseArrowDark from '../icons/dark/arrow-counterclockwise.svg';
import clockWiseArrowLight from '../icons/light/arrow-clockwise.svg';
import counterClockWiseArrowLight from '../icons/light/arrow-counterclockwise.svg';
import { BlockFormatDropDown } from './DropdownBlockFormat';
import { Format } from './Format';
import { CLOSE_DROPDOWN_COMMAND } from './helper/Dropdown';
import { FontDropDown, FontDropDownType } from './helper/FontDropDown';
import { useTheme } from '@fluentui/react';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isListNode, ListNode } from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $isHeadingNode } from '@lexical/rich-text';
import { $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister, $getNearestNodeOfType, $findMatchingParent } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
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
  const { isInverted } = useTheme();

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [fontSize, setFontSize] = useState<string>('15px');
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [blockType, setBlockType] = useState<keyof typeof blockTypeToBlockName>('paragraph');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    // Currently a bug affecting the toolbug due to $getSelection https://github.com/facebook/lexical/issues/4011
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }
      setFontFamily($getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'));
      setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '15px'));
    }
  }, [activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        updateToolbar();
        setActiveEditor(newEditor);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

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
      ),
      activeEditor.registerCommand<boolean>(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_NORMAL
      )
    );
  }, [editor, activeEditor, updateToolbar]);

  // close dropdowns when panel is scrolled
  useEffect(() => {
    function handleScroll() {
      activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
    }

    const scrollableContent = document.querySelector('.ms-Panel-scrollableContent');
    if (scrollableContent) {
      scrollableContent.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollableContent) {
        scrollableContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeEditor]);

  return (
    <div className="msla-html-editor-toolbar">
      <button
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        disabled={!canUndo || readonly}
        onClick={() => {
          activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
          activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        title={isApple() ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}
        className="toolbar-item spaced"
        aria-label="Undo"
      >
        <img
          className={'format'}
          src={isInverted ? counterClockWiseArrowDark : counterClockWiseArrowLight}
          alt={'counter clockwise arrow'}
        />
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        disabled={!canRedo || readonly}
        onClick={() => {
          activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
          activeEditor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        title={isApple() ? 'Redo (⌘Y)' : 'Redo (Ctrl+Y)'}
        className="toolbar-item"
        aria-label="Redo"
      >
        <img className={'format'} src={isInverted ? clockWiseArrowDark : clockWiseArrowLight} alt={'clockwise arrow'} />
      </button>
      <Divider />
      <BlockFormatDropDown disabled={readonly} blockType={blockType} editor={editor} />
      <FontDropDown fontDropdownType={FontDropDownType.FONTFAMILY} value={fontFamily} editor={editor} disabled={readonly} />
      <FontDropDown fontDropdownType={FontDropDownType.FONTSIZE} value={fontSize} editor={editor} disabled={readonly} />
      <Divider />
      <Format activeEditor={activeEditor} readonly={readonly} />
      <ListPlugin />
      <LinkPlugin />
    </div>
  );
};

const Divider = (): JSX.Element => {
  return <div className="msla-toolbar-divider" />;
};
