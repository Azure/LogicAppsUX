import constants from '../../constants';
import { isEscapeKey } from '../../utils/keyboardUtils';
import { handleOnEscapeDown } from './panelheader';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TextField } from '@fluentui/react/lib/TextField';
import { css } from '@fluentui/react/lib/Utilities';
import { IconButton } from '@fluentui/react/lib/Button';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export interface PanelHeaderCommentProps {
  comment?: string;
  isCollapsed: boolean;
  noNodeSelected?: boolean;
  readOnlyMode?: boolean;
  commentChange: (panelCommentChangeEvent?: string) => void;
  isTrigger?: boolean;
}

const getCommentTextFieldStyle = (isSmallViewport: boolean, isCommentCollapsed: boolean): Partial<ITextFieldStyles> => ({
  field: {
    backgroundColor: '#faf9f8',
    maxHeight: isSmallViewport ? '60px' : '25vh',
    overflowY: 'auto',
    fontSize: isSmallViewport ? '12px' : undefined,
    lineHeight: isSmallViewport ? '16px' : undefined,
    paddingLeft: '28px', // Space for collapse icon
    paddingRight: '8px',
  },
  fieldGroup: {
    maxHeight: isSmallViewport ? '60px' : '25vh',
    position: 'relative',
  },
  root: {
    marginTop: 0,
    display: isCommentCollapsed ? 'none' : 'block',
  },
});

export const PanelHeaderComment = ({
  comment,
  isCollapsed,
  noNodeSelected,
  readOnlyMode,
  commentChange,
  isTrigger,
}: PanelHeaderCommentProps): JSX.Element | null => {
  const intl = useIntl();

  const [commentHasFocus, setCommentHasFocus] = useState(false);
  const commentTextFieldRef = useRef<ITextField>(null);

  // Check if viewport is small
  const [isSmallViewport, setIsSmallViewport] = useState(false);

  // Initialize collapsed state based on viewport
  const getInitialCollapsedState = () => {
    const isSmall = window.innerHeight < 400 || window.innerWidth < 400;
    // Auto-collapse on small viewports for triggers without comments
    return isSmall && isTrigger && !comment;
  };

  const [isCommentCollapsed, setIsCommentCollapsed] = useState(getInitialCollapsedState);

  useEffect(() => {
    const checkViewport = () => {
      const isSmall = window.innerHeight < 400 || window.innerWidth < 400;
      setIsSmallViewport(isSmall);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const commentLabel = intl.formatMessage({
    defaultMessage: 'Comment',
    id: '1A1P5b',
    description: 'Comment Label',
  });

  // Autofocusing when opened for a node (skip on small viewports)
  useEffect(() => {
    if (!isCollapsed && !readOnlyMode && !comment && !isTrigger && !isSmallViewport) {
      commentTextFieldRef.current?.focus();
    }
  }, [comment, commentTextFieldRef, isCollapsed, readOnlyMode, isTrigger, isSmallViewport]);
  const getCommentEditor = (): JSX.Element => {
    const commentClassName = commentHasFocus ? 'msla-card-comment-focused' : 'msla-card-comment';
    const commentTitle = intl.formatMessage({
      defaultMessage: 'Description',
      id: 'p8AKOz',
      description: 'Label for the description textfield',
    });

    const commentPlaceholder = intl.formatMessage({
      defaultMessage: 'Add a description',
      id: 'ZyntX1',
      description: 'Text that tells you to select for adding a description',
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
        styles={getCommentTextFieldStyle(isSmallViewport, !!isCommentCollapsed)}
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
  const toggleButtonLabel = isCommentCollapsed
    ? intl.formatMessage({
        defaultMessage: 'Show description',
        id: 'W99jiu',
        description: 'Toggle button label to show comment section',
      })
    : intl.formatMessage({
        defaultMessage: 'Hide description',
        id: 'zWxKLk',
        description: 'Toggle button label to hide comment section',
      });

  if (isCollapsed || noNodeSelected) {
    return null;
  }

  return (
    <div className={css('msla-panel-comment-container', isCommentCollapsed && 'collapsed')}>
      <IconButton
        className="msla-panel-comment-toggle-inline"
        iconProps={{ iconName: isCommentCollapsed ? 'ChevronRight' : 'ChevronDown' }}
        title={toggleButtonLabel}
        ariaLabel={toggleButtonLabel}
        aria-expanded={!isCommentCollapsed}
        onClick={() => setIsCommentCollapsed(!isCommentCollapsed)}
      />
      {isCommentCollapsed ? (
        <span className="msla-panel-comment-collapsed-label">
          {comment ? `${commentLabel}: ${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}` : commentLabel}
        </span>
      ) : null}
      {getCommentEditor()}
    </div>
  );
};
