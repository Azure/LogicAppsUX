import constants from '../../constants';
import { isEscapeKey } from '../../utils/keyboardUtils';
import { handleOnEscapeDown } from './panelheader';
import { bundleIcon, TextDescription20Filled, TextDescription20Regular } from '@fluentui/react-icons';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TextField } from '@fluentui/react/lib/TextField';
import { css } from '@fluentui/react/lib/Utilities';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const DescriptionIcon = bundleIcon(TextDescription20Filled, TextDescription20Regular);

export interface PanelHeaderCommentProps {
  comment?: string;
  isCollapsed: boolean;
  noNodeSelected?: boolean;
  readOnlyMode?: boolean;
  commentChange: (panelCommentChangeEvent?: string) => void;
  isTrigger?: boolean;
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
  isTrigger,
}: PanelHeaderCommentProps): JSX.Element => {
  const intl = useIntl();

  const [commentHasFocus, setCommentHasFocus] = useState(false);
  const commentTextFieldRef = useRef<ITextField>(null);

  const commentLabel = intl.formatMessage({
    defaultMessage: 'Comment',
    id: '1A1P5b',
    description: 'Comment Label',
  });

  const getDescriptionIcon = (): JSX.Element => {
    return <DescriptionIcon className={'msla-comment-icon'} aria-label={commentLabel} />;
  };

  // Autofocusing when opened for a node
  useEffect(() => {
    if (!isCollapsed && !readOnlyMode && !comment && !isTrigger) {
      commentTextFieldRef.current?.focus();
    }
  }, [comment, commentTextFieldRef, isCollapsed, readOnlyMode, isTrigger]);
  const getCommentEditor = (): JSX.Element => {
    const commentClassName = commentHasFocus ? 'msla-card-comment-focused' : 'msla-card-comment';
    const commentTitle = intl.formatMessage({
      defaultMessage: 'Description',
      id: 'p8AKOz',
      description: 'Label for the description textfield',
    });

    const commentPlaceholder = intl.formatMessage({
      defaultMessage: 'Add a description',
      id: 'wD5i+Z',
      description: 'Text to tell users to click to add description',
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
        placeholder={commentPlaceholder}
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
      {noNodeSelected ? null : getDescriptionIcon()}
      {noNodeSelected ? null : getCommentEditor()}
    </div>
  );
};
