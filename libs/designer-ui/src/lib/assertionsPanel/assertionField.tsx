import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import { Label, Text, TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const labelStyles: Partial<ILabelStyles> = {
  root: {
    display: 'inline-block',
    minWidth: '120px',
    verticalAlign: 'top',
    padding: '5px 0px',
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
  name: string;
  description: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  isEditable?: boolean;
  isReadOnly?: boolean;
}

export const AssertionField = ({
  name,
  description,
  setName,
  setDescription,
  isEditable,
  isReadOnly,
}: AssertionFieldProps): JSX.Element => {
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

  const namePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter name',
    description: 'Assertion field name placeholder',
  });

  const descriptionPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter description',
    description: 'Assertion field description placeholder',
  });

  const onDescriptionChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setDescription(newValue ?? '');
  };

  const onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setName(newValue ?? '');
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
            placeholder={namePlaceholder}
            value={name}
            onChange={onNameChange}
            disabled={isReadOnly}
          />
        ) : (
          <Text className="msla-assertion-field-read-only">{name}</Text>
        )}
      </div>
      <div className="msla-assertion-field">
        <Label styles={labelStyles} htmlFor={parameterDetails.description}>
          {descriptionTitle}
        </Label>
        {isEditable ? (
          <TextField
            data-testid={parameterDetails.description}
            styles={textFieldStyles}
            id={parameterDetails.description}
            ariaLabel={descriptionTitle}
            placeholder={descriptionPlaceholder}
            value={description}
            onChange={onDescriptionChange}
            disabled={isReadOnly}
            multiline
            autoAdjustHeight
          />
        ) : (
          <Text className="msla-assertion-field-read-only">{description}</Text>
        )}
      </div>
    </>
  );
};
