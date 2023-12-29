import { getSelectedNode, sanitizeUrl, setFloatingElemPositionForLinkEditor } from '../../../html/plugins/toolbar/helper/functions';
import { IconButton, TextField, css, useTheme } from '@fluentui/react';
import type { IButtonStyles } from '@fluentui/react';
import { $isAutoLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import type { GridSelection, LexicalEditor, NodeSelection, RangeSelection } from 'lexical';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import type { Dispatch } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as React from 'react';
import { createPortal } from 'react-dom';

const buttonStyles: Partial<IButtonStyles> = {
  root: {
    width: '24px',
    height: '24px',
    margin: '4px',
  },
  icon: {
    fontSize: '14px',
  },
};

function FloatingLinkEditor({
  editor,
  isLink,
  setIsLink,
  anchorElem,
}: {
  editor: LexicalEditor;
  isLink: boolean;
  setIsLink: Dispatch<boolean>;
  anchorElem: HTMLElement;
}): JSX.Element {
  const { isInverted } = useTheme();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [editedLinkUrl, setEditedLinkUrl] = useState('');
  const [isEditMode, setEditMode] = useState(false);
  const [lastSelection, setLastSelection] = useState<RangeSelection | GridSelection | NodeSelection | null>(null);

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setLinkUrl(node.getURL());
      } else {
        setLinkUrl('');
      }
    }
    const editorElem = editorRef.current;
    const nativeSelection = window.getSelection();
    const activeElement = document.activeElement;

    if (editorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();

    if (
      selection !== null &&
      nativeSelection !== null &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode) &&
      editor.isEditable()
    ) {
      const domRect: DOMRect | undefined = nativeSelection.focusNode?.parentElement?.getBoundingClientRect();
      if (domRect) {
        domRect.y += 40;
        setFloatingElemPositionForLinkEditor(domRect, editorElem, anchorElem);
      }
      setLastSelection(selection as any);
    } else if (!activeElement || activeElement.className !== 'link-input') {
      if (rootElement !== null) {
        setFloatingElemPositionForLinkEditor(null, editorElem, anchorElem);
      }
      setLastSelection(null);
      setEditMode(false);
      setLinkUrl('');
    }

    return true;
  }, [anchorElem, editor]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        updateLinkEditor();
      });
    };

    window.addEventListener('resize', update);

    if (scrollerElem) {
      scrollerElem.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);

      if (scrollerElem) {
        scrollerElem.removeEventListener('scroll', update);
      }
    };
  }, [anchorElem.parentElement, editor, updateLinkEditor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateLinkEditor();
          return true;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (isLink) {
            setIsLink(false);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, updateLinkEditor, setIsLink, isLink]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  useEffect(() => {
    if (isEditMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditMode]);

  const monitorInputInteraction = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLinkSubmission();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setEditMode(false);
    }
  };

  const handleLinkSubmission = () => {
    if (lastSelection !== null) {
      if (linkUrl !== '') {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl(editedLinkUrl));
      }
      setEditMode(false);
    }
  };

  return (
    <div ref={editorRef} className={css('msla-html-link-editor', isInverted && 'inverted')}>
      {!isLink ? null : isEditMode ? (
        <div className="msla-html-link-view">
          <TextField
            styles={{ root: { padding: '4px', width: '80%' } }}
            elementRef={inputRef}
            className="link-input"
            value={editedLinkUrl}
            onChange={(_, value) => {
              setEditedLinkUrl(value ?? '');
            }}
            onKeyDown={(event) => {
              monitorInputInteraction(event);
            }}
          />
          <div>
            <IconButton
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              iconProps={{ iconName: 'Cancel' }}
              styles={buttonStyles}
              onClick={() => {
                setEditMode(false);
              }}
            />
            <IconButton
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              iconProps={{ iconName: 'CheckMark' }}
              styles={buttonStyles}
              onClick={handleLinkSubmission}
            />
          </div>
        </div>
      ) : (
        <div className="msla-html-link-view">
          <a href={sanitizeUrl(linkUrl)} target="_blank" rel="noopener noreferrer">
            {linkUrl}
          </a>
          <div>
            <IconButton
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              iconProps={{ iconName: 'Edit' }}
              styles={buttonStyles}
              onClick={() => {
                setEditedLinkUrl(linkUrl);
                setEditMode(true);
              }}
            />
            <IconButton
              tabIndex={0}
              onMouseDown={(event) => event.preventDefault()}
              iconProps={{ iconName: 'Delete' }}
              styles={buttonStyles}
              onClick={() => {
                editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function useFloatingLinkEditorToolbar(editor: LexicalEditor, anchorElem: HTMLElement): JSX.Element | null {
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLink, setIsLink] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const linkParent = $findMatchingParent(node, $isLinkNode);
      const autoLinkParent = $findMatchingParent(node, $isAutoLinkNode);

      // We don't want this menu to open for auto links.
      setIsLink(linkParent != null && autoLinkParent == null);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          updateToolbar();
          setActiveEditor(newEditor);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, updateToolbar]);

  return createPortal(
    <FloatingLinkEditor editor={activeEditor} isLink={isLink} anchorElem={anchorElem} setIsLink={setIsLink} />,
    anchorElem
  );
}

export default function FloatingLinkEditorPlugin({ anchorElem = document.body }: { anchorElem?: HTMLElement }): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return useFloatingLinkEditorToolbar(editor, anchorElem);
}
