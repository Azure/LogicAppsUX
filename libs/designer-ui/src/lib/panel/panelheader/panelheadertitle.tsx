import constants from '../../constants';
import { isEscapeKey } from '../../utils/keyboardUtils';
import { handleOnEscapeDown } from './panelheader';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TextField } from '@fluentui/react/lib/TextField';
import { css } from '@fluentui/react/lib/Utilities';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

const titleTextFieldStyle: Partial<ITextFieldStyles> = {
  fieldGroup: {
    background: 'inherit',
  },
  root: {
    marginTop: '5px',
  },
};

export interface PanelHeaderTitleProps {
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  title?: string;
  titleId?: string;
}

export const PanelHeaderTitle = ({ title, titleId, readOnlyMode, renameTitleDisabled }: PanelHeaderTitleProps): JSX.Element => {
  const intl = useIntl();
  const [cardTitle, setCardTitle] = useState(title);
  const [titleHasFocus, setTitleHasFocus] = useState(false);

  const titleTextFieldRef = React.createRef<ITextField>();

  const onTitleChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setCardTitle(newValue);
  };

  const onTitleBlur = (_: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    // TODO: 13067650 PANEL title validation
    const titleInvalid = false;
    if (titleInvalid) {
      setCardTitle(title);
    }
    setTitleHasFocus(false);
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
  const readOnly = readOnlyMode || renameTitleDisabled;
  const titleClassName = titleHasFocus ? 'msla-card-title-focused' : 'msla-card-title';
  const panelHeaderCardTitle = intl.formatMessage({
    defaultMessage: 'Card Title',
    description: 'Label for the title for panel header card',
  });
  return (
    <TextField
      id={titleId}
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
      onKeyDown={handleOnEscapeDown}
    />
  );
};
