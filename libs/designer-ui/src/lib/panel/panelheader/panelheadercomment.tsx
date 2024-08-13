import constants from '../../constants';
import { isEscapeKey } from '../../utils/keyboardUtils';
import { handleOnEscapeDown } from './panelheader';
import { bundleIcon, Comment20Filled, Comment20Regular } from '@fluentui/react-icons';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TextField } from '@fluentui/react/lib/TextField';
import { css } from '@fluentui/react/lib/Utilities';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const CommentIcon = bundleIcon(Comment20Filled, Comment20Regular);

export interface PanelHeaderCommentProps {
  comment?: string;
  isCollapsed: boolean;
  noNodeSelected?: boolean;
  readOnlyMode?: boolean;
  commentChange: (panelCommentChangeEvent?: string) => void;
}

const commentTextFieldStyle: Partial<ITextFieldStyles> = {
  field: {
    backgroundColor: '#faf9f8',
  },
};

export const PanelHeaderComment = ({
  comment,
  isCollapsed,
  noNodeSelected,
  readOnlyMode,
  commentChange,
}: PanelHeaderCommentProps): JSX.Element => {
  const intl = useIntl();

  const [commentHasFocus, setCommentHasFocus] = useState(false);
  const commentTextFieldRef = useRef<ITextField>(null);

  const commentLabel = intl.formatMessage({
    defaultMessage: 'Comment',
    id: '1A1P5b',
    description: 'Comment Label',
  });

  const getCommentIcon = (): JSX.Element => {
    return <CommentIcon className={'msla-comment-icon'} aria-label={commentLabel} />;
  };

  useEffect(() => {
    if (!isCollapsed && !readOnlyMode && !comment) {
      commentTextFieldRef.current?.focus();
    }
  }, [comment, commentTextFieldRef, isCollapsed, readOnlyMode]);
  const getCommentEditor = (): JSX.Element => {
    const commentClassName = commentHasFocus ? 'msla-card-comment-focused' : 'msla-card-comment';
    const commentTitle = intl.formatMessage({
      defaultMessage: 'Comment',
      id: 'OSHNZ2',
      description: 'Label for the comment textfield',
    });

    const onCommentBlur = (_: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setCommentHasFocus(false);
    };

    const onFocusComment = (): void => {
      setCommentHasFocus(true);
    };

    const onCommentTextFieldEscape = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (isEscapeKey(e)) {
        setCommentHasFocus(false);
        commentChange(comment);
        if (commentTextFieldRef.current) {
          commentTextFieldRef.current.blur();
        }
      }
    };
    return (
      <TextField
        className={css(!readOnlyMode && commentClassName)}
        borderless
        multiline
        autoAdjustHeight
        resizable={false}
        componentRef={commentTextFieldRef}
        readOnly={readOnlyMode}
        styles={commentTextFieldStyle}
        ariaLabel={commentTitle}
        maxLength={constants.PANEL.MAX_COMMENT_LENGTH}
        value={comment ?? ''}
        onChange={(_e, value) => commentChange(value)}
        onBlur={readOnlyMode ? undefined : onCommentBlur}
        onFocus={onFocusComment}
        onKeyUp={onCommentTextFieldEscape}
        onKeyDown={handleOnEscapeDown}
      />
    );
  };
  return (
    <div className="msla-panel-comment-container" hidden={isCollapsed}>
      {noNodeSelected ? null : getCommentIcon()}
      {noNodeSelected ? null : getCommentEditor()}
    </div>
  );
};
