import constants from '../../constants';
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
  errorMessage: {
    paddingLeft: '8px',
  },
};

export type TitleChangeHandler = (originalValue: string, newValue: string) => { valid: boolean; oldValue?: string };
export interface PanelHeaderTitleProps {
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  titleValue?: string;
  titleId?: string;
  onChange: (newId: string) => ReturnType<TitleChangeHandler>;
  handleTitleUpdate: (newId: string) => void;
}

export const PanelHeaderTitle = ({
  titleValue,
  titleId,
  readOnlyMode,
  renameTitleDisabled,
  onChange,
  handleTitleUpdate,
}: PanelHeaderTitleProps): JSX.Element => {
  const intl = useIntl();

  const titleTextFieldRef = React.createRef<ITextField>();

  const [newTitleValue, setNewTitleValue] = useState(titleValue);
  const [validValue, setValidValue] = useState(titleValue);
  const [errorMessage, setErrorMessage] = useState('');

  const onTitleChange = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    const result = onChange(newValue || '');
    if (result.valid) {
      setErrorMessage('');
    } else {
      setErrorMessage(
        intl.formatMessage({
          defaultMessage: 'The name already exists or is invalid. Update the name before you continue.',
          id: 'msd312d6cc6268',
          description: 'Text for invalid operation title name',
        })
      );
      setValidValue(result.oldValue);
    }

    setNewTitleValue(newValue || '');
  };

  const onTitleBlur = (): void => {
    if (errorMessage) {
      onChange(validValue || '');
      setNewTitleValue(validValue);
      setErrorMessage('');
      handleTitleUpdate(validValue || '');
    } else {
      handleTitleUpdate(newTitleValue ?? '');
    }
  };

  const readOnly = readOnlyMode || renameTitleDisabled;
  const panelHeaderCardTitle = intl.formatMessage({
    defaultMessage: 'Card title',
    id: 'msb3900ea55907',
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
      value={newTitleValue}
      errorMessage={errorMessage}
      onChange={onTitleChange}
      onBlur={onTitleBlur}
      onKeyDown={handleOnEscapeDown}
    />
  );
};
