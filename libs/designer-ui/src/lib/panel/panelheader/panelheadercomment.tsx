import React, { useEffect, useState } from 'react';
import { ITextField, ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import { isEscapeKey } from '../../utils/keyboardUtils';
import { handleOnEscapeDown } from './panelheader';
import { css } from '@fluentui/react/lib/Utilities';
import constants from '../../constants';
import { useIntl } from 'react-intl';
import { Icon } from '@fluentui/react/lib/Icon';

interface PanelHeaderCommentProps {
  comment?: string;
  isCollapsed: boolean;
  noNodeSelected?: boolean;
  readOnlyMode?: boolean;
  commentChange?(panelCommentChangeEvent?: string): void;
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

  const [cardComment, setCardComment] = useState(comment);
  const [commentHasFocus, setCommentHasFocus] = useState(false);
  const commentTextFieldRef = React.createRef<ITextField>();

  useEffect(() => {
    setCardComment(comment);
  }, [comment]);

  const commentLabel = intl.formatMessage({
    defaultMessage: 'Comment',
    description: 'Comment Label',
  });

  const getCommentIcon = (): JSX.Element => {
    return <Icon className={'msla-comment-icon'} ariaLabel={commentLabel} iconName="Comment" />;
  };

  const getCommentEditor = (): JSX.Element => {
    const commentClassName = commentHasFocus ? 'msla-card-comment-focused' : 'msla-card-comment';
    const commentTitle = intl.formatMessage({
      defaultMessage: 'Comment',
      description: 'Label for the comment textfield',
    });

    const onCommentChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
      setCardComment(newValue);
    };

    const onCommentBlur = (_: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const newComment = comment;
      commentChange && commentChange(newComment);
      setCommentHasFocus(false);
    };

    const onFocusComment = (): void => {
      setCommentHasFocus(true);
    };

    const onCommentTextFieldEscape = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      if (isEscapeKey(e)) {
        const prevComment = comment;
        setCommentHasFocus(false);
        setCardComment(prevComment);
      }
    };
    return (
      <TextField
        className={css(!readOnlyMode && commentClassName)}
        borderless
        multiline
        autoAdjustHeight
        componentRef={commentTextFieldRef}
        readOnly={readOnlyMode}
        styles={commentTextFieldStyle}
        ariaLabel={commentTitle}
        maxLength={constants.PANEL.MAX_COMMENT_LENGTH}
        value={cardComment}
        onChange={onCommentChange}
        onBlur={readOnlyMode ? undefined : onCommentBlur}
        onFocus={onFocusComment}
        onKeyUp={onCommentTextFieldEscape}
        onKeyDown={handleOnEscapeDown}
      />
    );
  };
  return (
    <div className="msla-panel-comment-container-wrapper" hidden={isCollapsed}>
      <div className="msla-panel-comment-container">
        {!noNodeSelected && getCommentIcon()}
        {!noNodeSelected && getCommentEditor()}
      </div>
    </div>
  );
};
