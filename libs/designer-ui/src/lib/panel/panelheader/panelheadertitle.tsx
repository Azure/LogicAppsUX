import constants from '../../constants';
import { handleOnEscapeDown } from './panelheader';
import type { ITextField, ITextFieldStyles } from '@fluentui/react/lib/TextField';
import { TextField } from '@fluentui/react/lib/TextField';
import { css } from '@fluentui/react/lib/Utilities';
import React from 'react';
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
  titleValue?: string;
  titleId?: string;
  onChange: (newValue: string) => void;
}

export const PanelHeaderTitle = ({
  titleValue,
  onChange,
  titleId,
  readOnlyMode,
  renameTitleDisabled,
}: PanelHeaderTitleProps): JSX.Element => {
  const intl = useIntl();

  const titleTextFieldRef = React.createRef<ITextField>();

  const onTitleChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    onChange(newValue || '');
  };

  const readOnly = readOnlyMode || renameTitleDisabled;
  const panelHeaderCardTitle = intl.formatMessage({
    defaultMessage: 'Card Title',
    description: 'Label for the title for panel header card',
  });
  return (
    <TextField
      id={titleId}
      className={css(!readOnly && 'msla-card-title')}
      componentRef={titleTextFieldRef}
      readOnly={readOnly}
      styles={titleTextFieldStyle}
      ariaLabel={panelHeaderCardTitle}
      maxLength={constants.PANEL.MAX_TITLE_LENGTH}
      borderless
      value={titleValue}
      onChange={onTitleChange}
      onKeyDown={handleOnEscapeDown}
    />
  );
};
