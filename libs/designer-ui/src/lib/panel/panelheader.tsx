import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { isEscapeKey } from '../utils/keyboardUtils';
import { DirectionalHint, ICalloutProps } from '@fluentui/react/lib/Callout';
import { IButton, IButtonStyles, IconButton } from '@fluentui/react/lib/Button';
import { FontSizes } from '@fluentui/react/lib/Styling';
import { ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';

import { css } from '@fluentui/react/lib/Utilities';
import { ITextField, ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import constants from '../constants';
import Editor from '@monaco-editor/react';
import { Icon } from '@fluentui/react/lib/Icon';

export interface PanelHeaderProps {
  isCollapsed: boolean;
  isRight?: boolean;
  cardIcon?: string;
  comment?: string;
  panelHeaderControlType?: PanelHeaderControlType;
  noNodeSelected?: boolean;
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  showCommentBox?: boolean;
  title?: string;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onRenderWarningMessage?(): JSX.Element;
}
enum PanelHeaderControlType {
  DISMISS_BUTTON,
  MENU,
}

const collapseIconStyle: IButtonStyles = {
  icon: {
    fontSize: FontSizes.small,
  },
};

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.leftCenter,
  setInitialFocus: false,
};

const tooltipStyles: ITooltipHostStyles = {
  root: {
    display: 'block',
  },
};

const titleTextFieldStyle: Partial<ITextFieldStyles> = {
  fieldGroup: {
    background: 'inherit',
  },
  root: {
    marginTop: '5px',
  },
};

const commentTextFieldStyle: Partial<ITextFieldStyles> = {
  field: {
    backgroundColor: '#faf9f8',
  },
};

export const PanelHeader = ({
  isCollapsed,
  isRight,
  cardIcon,
  comment,
  noNodeSelected,
  panelHeaderControlType,
  readOnlyMode,
  renameTitleDisabled,
  showCommentBox,
  title,
  setIsCollapsed,
  onRenderWarningMessage,
}: PanelHeaderProps): JSX.Element => {
  const intl = useIntl();

  const menuButtonRef = React.createRef<IButton>();
  const commentTextFieldRef = React.createRef<ITextField>();
  const titleTextFieldRef = React.createRef<ITextField>();

  const [cardTitle, setCardTitle] = useState(title);
  const [cardComment, setCardComment] = useState(comment);
  const [titleHasFocus, setTitleHasFocus] = useState(false);
  const [commentHasFocus, setCommentHasFocus] = useState(false);

  const panelCollapseTitle = intl.formatMessage({
    defaultMessage: 'Collapse/Expand',
    description: 'Text of Tooltip to collapse and expand',
  });

  const commentLabel = intl.formatMessage({
    defaultMessage: 'Comment',
    description: 'Comment Label',
  });

  const getIconClassName = (): string => {
    return css(isRight ? 'collapse-toggle-right' : 'collapse-toggle-left', isCollapsed && 'collapsed');
  };

  const getCollapseIconName = (): string => {
    return isRight && isCollapsed ? 'DoubleChevronLeft8' : 'DoubleChevronRight8';
  };

  const toggleCollapse = (): void => {
    // TODO: 12798935 Analytics (event logging)
    setIsCollapsed(!isCollapsed);
  };

  const getCardTitleEditor = (): JSX.Element => {
    const readOnly = readOnlyMode || renameTitleDisabled;
    const titleClassName = titleHasFocus ? 'msla-card-title-focused' : 'msla-card-title';
    const panelHeaderCardTitle = intl.formatMessage({
      defaultMessage: 'Card Title',
      description: 'Label for the title for panel header card',
    });
    return (
      <TextField
        className={css(!readOnly && titleClassName)}
        componentRef={titleTextFieldRef}
        readOnly={readOnly}
        styles={titleTextFieldStyle}
        ariaLabel={panelHeaderCardTitle}
        maxLength={constants.PANEL.MAX_TITLE_LENGTH}
        borderless
        value={cardTitle}
        onChange={onTitleChange}
        onBlur={readOnly ? undefined : onTitleBlur}
        onFocus={onFocusTitle}
        onKeyUp={handleOnKeyUpTitle}
        onKeyDown={handleOnKeyDownTitle}
      />
    );
  };

  const onTitleChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setCardTitle(newValue);
  };

  const onTitleBlur = (_: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    // TODO: PANEL title validation
    const titleInvalid = false;
    if (titleInvalid) {
      setCardTitle(title);
      setTitleHasFocus(false);
    }
  };

  const onFocusTitle = (): void => {
    setTitleHasFocus(true);
  };

  const handleOnKeyUpTitle = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    if (isEscapeKey(e)) {
      setTitleHasFocus(false);
      setCardTitle(title);
      if (titleTextFieldRef.current) {
        titleTextFieldRef.current.blur();
      }
    }
  };

  const handleOnKeyDownTitle = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  };

  const getCommentIcon = (): JSX.Element => {
    return <Icon className={'msla-comment-icon'} ariaLabel={commentLabel} iconName="Comment" />;
  };

  const getCommentEditor = (): JSX.Element => {
    const commentTitle = intl.formatMessage({
      defaultMessage: 'Comment',
      description: 'Label for the comment textfield',
    });
    return (
      <div className={css(!readOnlyMode && commentHasFocus && 'focused')}>
        <TextField
          componentRef={commentTextFieldRef}
          readOnly={readOnlyMode}
          styles={commentTextFieldStyle}
          ariaLabel={commentTitle}
          maxLength={constants.PANEL.MAX_COMMENT_LENGTH}
          value={cardComment}
          onChange={onCommentChange}
          multiline
          autoAdjustHeight
        />
      </div>
    );
  };

  const onCommentChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setCardComment(newValue);
  };

  return (
    <div className="msla-panel-header">
      <TooltipHost calloutProps={calloutProps} content={panelCollapseTitle} styles={tooltipStyles}>
        <IconButton
          ariaLabel={panelCollapseTitle}
          className={getIconClassName()}
          disabled={false}
          iconProps={{ iconName: getCollapseIconName() }}
          styles={collapseIconStyle}
          onClick={toggleCollapse}
        />
      </TooltipHost>
      <div className="msla-panel-card-header">
        {cardIcon && <img className="msla-panel-card-icon" src={cardIcon} hidden={isCollapsed} alt="panel card icon" />}
        <div className="msla-title-container" hidden={isCollapsed}>
          {!noNodeSelected && getCardTitleEditor()}
        </div>
        <div className="msla-panel-header-controls" hidden={isCollapsed}>
          {/* {!noNodeSelected && panelHeaderControlType === PanelHeaderControlType.MENU ? getPanelHeaderMenu(panelHeaderMenu) : null}
                    {!noNodeSelected && panelHeaderControlType === PanelHeaderControlType.DISMISS_BUTTON ? getDismissButton() : null} */}
        </div>
        {onRenderWarningMessage && onRenderWarningMessage()}
        {showCommentBox ? (
          <div className="msla-panel-comment-container-wrapper" hidden={isCollapsed}>
            <div className="msla-panel-comment-container">
              {!noNodeSelected ? getCommentIcon() : null}
              {!noNodeSelected ? getCommentEditor() : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
