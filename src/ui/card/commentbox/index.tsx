import { useId } from '@fluentui/react-hooks';
import { BaseButton, IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
import { ITextField, TextField } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

import { BaseComponentProps } from '../../base';
import { singleLineTextFieldStyles } from '../../fabric';
import { Label } from '../../label';

export interface CommentBoxProps extends BaseComponentProps {
  brandColor: string;
  comment: string;
  isDismissed: boolean;
  isEditing: boolean;
  isPanelModeEnabled?: boolean;
  styleWidth?: string;
  onCommentChanged?: CommentChangeEventHandler;
  onCommentCommitted?(): void;
  onCommentDismissed?(): void;
}

export interface CommentChangeEvent {
  value: string;
}

export type CommentChangeEventHandler = (e: CommentChangeEvent) => void;

const MAXIMUM_COMMENT_LENGTH = 250;

const commentIconInfo = {
  iconName: 'Comment',
  styles: {
    root: {
      fontSize: 16,
      padding: '9px 0 0 0',
    },
  },
};

const ReadOnlyComment = ({
  className,
  style,
  comment,
  onCommentDismissed,
}: {
  className: string;
  style: React.CSSProperties;
  comment: string;
  onCommentDismissed?(): void;
}) => {
  const intl = useIntl();
  const { iconName, styles } = commentIconInfo;
  const commentLabelText = intl.formatMessage({
    defaultMessage: 'Comment',
    id: 'hPIR4j',
    description: 'Label for a text field',
  });

  const commentHideText = intl.formatMessage({
    defaultMessage: 'Hide this comment',
    id: 'ZazdvR',
    description: 'Comment on a button in a tooltip to hide comment control',
  });
  const onClick = useCallback(
    (e: React.MouseEvent<BaseButton>): void => {
      e.stopPropagation();
      //todo: Add Telemetry log when hook is added for it.
      e.preventDefault();

      if (onCommentDismissed) {
        onCommentDismissed();
      }
    },
    [onCommentDismissed]
  );

  if (!comment) {
    return null;
  }

  let commentText: string;
  let commentTitle: string;
  if (comment && comment.length > MAXIMUM_COMMENT_LENGTH) {
    commentText = `${comment.substring(0, MAXIMUM_COMMENT_LENGTH)}\u2026`;
    commentTitle = comment;
  } else {
    commentText = comment;
    commentTitle = '';
  }

  return (
    <div className={className} style={style} aria-label={commentLabelText}>
      <Icon styles={styles} iconName={iconName} />
      <span title={commentTitle}>{commentText}</span>
      <TooltipHost content={commentHideText}>
        <IconButton ariaLabel={commentHideText} iconProps={{ iconName: 'Clear' }} onClick={onClick} />
      </TooltipHost>
    </div>
  );
};

const EditableComment = ({
  className,
  style,
  labelId,
  comment,
  onCommentChanged,
  onCommentCommitted,
}: {
  className: string;
  style: React.CSSProperties;
  labelId: string;
  comment: string;
  onCommentCommitted?(): void;
  onCommentChanged?: CommentChangeEventHandler;
}) => {
  const intl = useIntl();
  const textboxRef = React.useRef<ITextField | null>(null);
  const commentText = intl.formatMessage({
    defaultMessage: 'Comment',
    id: 'hPIR4j',
    description: 'Label for a text field',
  });
  const commentPlaceholderText = intl.formatMessage({
    defaultMessage: 'Add a short comment',
    id: '1KSzxz',
    description: 'Placeholder for a textbox asking for comments',
  });

  const onBlur = React.useCallback(
    (e: React.FocusEvent<HTMLElement>): void => {
      const { currentTarget } = e;
      if (onCommentCommitted && !currentTarget.contains(document.activeElement)) {
        onCommentCommitted();
      }
    },
    [onCommentCommitted]
  );

  const onChange = React.useCallback(
    (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, value: string): void => {
      if (onCommentChanged) {
        onCommentChanged({
          value,
        });
      }
    },
    [onCommentChanged]
  );
  const onKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();

        if (onCommentCommitted) {
          onCommentCommitted();
        }
      }
    },
    [onCommentCommitted]
  );
  return (
    <div className={className} style={style}>
      <Label id={labelId} text={commentText} />
      <TextField
        componentRef={(c) => (textboxRef.current = c)}
        aria-labelledby={labelId}
        maxLength={250}
        placeholder={commentPlaceholderText}
        styles={singleLineTextFieldStyles}
        value={comment}
        onBlur={onBlur}
        onChange={onChange as any}
        onKeyPress={onKeyPress}
      />
    </div>
  );
};

export const CommentBox: React.FC<CommentBoxProps> = (props) => {
  const { comment, isDismissed, isEditing, styleWidth } = props;
  const className = !styleWidth ? 'msla-comment-box msla-fixed-width' : 'msla-comment-box';
  const labelId = useId('comment-label');
  const style: React.CSSProperties = {};
  if (styleWidth) {
    style.width = styleWidth;
  }

  if (isEditing) {
    return <EditableComment className={className} style={style} labelId={labelId} {...props} />;
  } else if (isDismissed || !comment) {
    return null;
  } else {
    return <ReadOnlyComment className={className} style={style} {...props} />;
  }
};
