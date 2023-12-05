import { getBrandColorRgbA } from '../card/utils';
import { TokenType } from '../editor';
import { CLOSE_TOKENPICKER } from '../editor/base/plugins/CloseTokenPicker';
import { DELETE_TOKEN_NODE } from '../editor/base/plugins/DeleteTokenNode';
import { OPEN_TOKEN_PICKER } from '../editor/base/plugins/OpenTokenPicker';
import iconSvg from './icon/icon.svg';
import { Icon, css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { $getNodeByKey, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import type { LexicalCommand, NodeKey } from 'lexical';
import { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';

export const DESELECT_NODE: LexicalCommand<undefined> = createCommand();
export interface InputTokenProps {
  brandColor?: string;
  value?: string;
  disableFiltering?: boolean;
  icon?: string;
  isAdvanced?: boolean;
  isSecure?: boolean;
  readonly?: boolean;
  required?: boolean;
  title: string;
  nodeKey: NodeKey;
  description?: string;
}

export const DELETE = '\u00D7';
export const InputToken: React.FC<InputTokenProps> = ({ value, brandColor, icon, isSecure, readonly, title, nodeKey }) => {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const tokenRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    return editor.registerCommand(
      DESELECT_NODE,
      () => {
        setSelected(false);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, setSelected]);

  const handleTokenClicked = (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
    if (nodeKey) {
      editor.getEditorState().read(() => {
        // if it is an expression token we'll open the token picker in update mode
        if ($getNodeByKey(nodeKey)?.['__data']?.token?.tokenType === TokenType.FX && !readonly) {
          editor.dispatchCommand(OPEN_TOKEN_PICKER, nodeKey);
        }
        // otherwise we'll select the token
        else if (e.shiftKey) {
          setSelected(!isSelected);
        } else {
          clearSelection();
          setSelected(true);
          editor.dispatchCommand(CLOSE_TOKENPICKER, undefined);
        }
      });
    }
  };

  const tokenStyle = {
    backgroundColor: brandColor ? getBrandColorRgbA(brandColor) : 'rgba(71, 71, 71, 0.15)',
    backgroundImage: icon ?? `url(${iconSvg})`,
  };

  const tokenDelete = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'Label of Delete Token Button',
  });

  const handleTokenDeleteClicked = () => {
    if (nodeKey) {
      editor.focus();
      editor.dispatchCommand(DELETE_TOKEN_NODE, nodeKey);
    }
  };

  const renderTokenDeleteButton = (): JSX.Element | null => {
    if (readonly) {
      return null;
    }

    return (
      <button
        title={tokenDelete}
        aria-label={tokenDelete}
        className="msla-button msla-token-delete"
        data-automation-id={`msla-token-delete-${title}`}
        onClick={handleTokenDeleteClicked}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        {DELETE}
        {isSecure ? (
          <div className="msla-editor-input-secure-token">
            <Icon iconName="LockSolid" />
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <span
      className={css('msla-token msla-input-token', isSelected && 'selected')}
      data-automation-id={`msla-token msla-input-token-${title}`}
      onClick={(e) => {
        handleTokenClicked(e);
        e.stopPropagation();
      }}
      style={tokenStyle}
      ref={tokenRef}
    >
      <div className="msla-token-title" title={value}>
        {title}
      </div>
      {renderTokenDeleteButton()}
    </span>
  );
};
