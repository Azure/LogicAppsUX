import type { AssertionUpdateHandler } from './assertion';
import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import { Label, Text, TextField } from '@fluentui/react';
import { type AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

export const labelStyles: Partial<ILabelStyles> = {
  root: {
    display: 'inline-block',
    minWidth: '120px',
    verticalAlign: 'top',
    padding: '0px',
  },
};

const fieldStyles: IStyle = {
  display: 'inline-block',
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 'auto',
};

const textFieldStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
};

const DESCRIPTION_KEY = 'description';
const NAME_KEY = 'name';

export interface ParameterFieldDetails {
  description: string;
  name: string;
}

export interface AssertionFieldProps {
  assertion: AssertionDefintion;
  onChange?: AssertionUpdateHandler;
  isEditable?: boolean;
  isReadOnly?: boolean;
}

export const AssertionField = ({ assertion, onChange, isEditable, isReadOnly }: AssertionFieldProps): JSX.Element => {
  const { description, name } = assertion;
  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    description: `${name}-${DESCRIPTION_KEY}`,
    name: `${name}-${NAME_KEY}`,
  };

  const nameTitle = intl.formatMessage({
    defaultMessage: 'Assertion name',
    description: 'Parameter Field Assertion Name Title',
  });

  const descriptionTitle = intl.formatMessage({
    defaultMessage: 'Description',
    description: 'Parameter Field Description Title',
  });

  const nameDescription = intl.formatMessage({
    defaultMessage: 'Enter parameter name.',
    description: 'Parameter Field Name Description',
  });

  const onDescriptionChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    onChange?.({
      name: name,
      description: newValue ?? '',
    });
  };

  const onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    onChange?.({
      name: newValue ?? '',
      description: description,
    });
  };

  return (
    <>
      <div className="msla-assertion-field">
        <Label styles={labelStyles} required={true} htmlFor={parameterDetails.name}>
          {nameTitle}
        </Label>
        {isEditable ? (
          <TextField
            data-testid={parameterDetails.name}
            styles={textFieldStyles}
            id={parameterDetails.name}
            ariaLabel={nameTitle}
            placeholder={nameDescription}
            value={name}
            onChange={onNameChange}
            disabled={isReadOnly}
          />
        ) : (
          <Text className="msla-workflow-assertion-read-only">{name}</Text>
        )}
      </div>
      <div className="msla-assertion-field">
        <Label styles={labelStyles} required={true} htmlFor={parameterDetails.description}>
          {descriptionTitle}
        </Label>
        {isEditable ? (
          <TextField
            data-testid={parameterDetails.description}
            styles={textFieldStyles}
            id={parameterDetails.description}
            ariaLabel={descriptionTitle}
            placeholder={nameDescription}
            value={description}
            onChange={onDescriptionChange}
            disabled={isReadOnly}
          />
        ) : (
          <Text className="msla-assertion-read-only">{description}</Text>
        )}
      </div>
    </>
  );
};
