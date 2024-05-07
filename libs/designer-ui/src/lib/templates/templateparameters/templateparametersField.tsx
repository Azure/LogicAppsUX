import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import { Label, Text, TextField } from '@fluentui/react';
import type { Template } from '@microsoft/logic-apps-shared';
import type { EventHandler } from '../../eventhandler';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export const labelStyles2: Partial<ILabelStyles> = {
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

export interface ParameterFieldDetails2 {
  name: string;
  value: string;
  description?: string;
  type: string;
}

const NAME_KEY = 'name';
const TYPE_KEY = 'type';
const VALUE_KEY = 'value';
const DESCRIPTION_KEY = 'description';

export interface TemplateParameterUpdateEvent {
  name: string;
  newDefinition: Template.ParameterDefinition;
}

export type TemplateParameterUpdateHandler = EventHandler<TemplateParameterUpdateEvent>;

export interface TemplateparameterFieldProps {
  definition: Template.ParameterDefinition;
  validationError: string | undefined;
  onChange?: TemplateParameterUpdateHandler;
  isReadOnly?: boolean;
}

export const TemplateparameterField = ({ definition, validationError, onChange, isReadOnly }: TemplateparameterFieldProps): JSX.Element => {
  const [value, setValue] = useState<string | undefined>(stringifyValue(definition.value));

  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails2 = {
    name: `${definition.name}-${NAME_KEY}`,
    value: `${definition.name}-${VALUE_KEY}`,
    description: `${definition.name}-${DESCRIPTION_KEY}`,
    type: `${definition.name}-${TYPE_KEY}`,
  };

  const nameTitle = intl.formatMessage({
    defaultMessage: 'Name',
    id: 'm8Q61y',
    description: 'Parameter Field Name Title',
  });
  const typeTitle = intl.formatMessage({
    defaultMessage: 'Type',
    id: 'tNoZx2',
    description: 'Parameter Field Type Title',
  });

  const descriptionTitle = intl.formatMessage({
    defaultMessage: 'Description',
    id: 'UXDOiw',
    description: 'Parameter Field Description Title',
  });

  const valueTitle = intl.formatMessage({
    defaultMessage: 'Value',
    id: 'ClZW2r',
    description: 'Parameter Field Value Title',
  });
  const valueDescription = intl.formatMessage({
    defaultMessage: 'Enter value for parameter.',
    id: 'rSIBjh',
    description: 'Parameter Field Value Placeholder Text',
  });

  const onValueChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    handleValueChange(newValue);
  };

  const handleValueChange = (value?: string) => {
    setValue(value);

    onChange?.({
      name: definition.name,
      newDefinition: { ...definition, value },
    });
  };

  return (
    <>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles2} required={false} htmlFor={parameterDetails.name}>
          {nameTitle}
        </Label>
        <Text className="msla-workflow-parameter-read-only">{definition.name}</Text>
      </div>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles2} required={false} htmlFor={parameterDetails.type}>
          {typeTitle}
        </Label>
        <Text className="msla-workflow-parameter-read-only">{definition.type}</Text>
      </div>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles2} required={false} htmlFor={parameterDetails.description}>
          {descriptionTitle}
        </Label>
        <Text className="msla-workflow-parameter-read-only">{definition?.description}</Text>
      </div>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles2} required={definition?.required} htmlFor={parameterDetails.value}>
          {valueTitle}
        </Label>
        <TextField
          data-testid={parameterDetails.value}
          id={parameterDetails.value}
          ariaLabel={valueTitle}
          placeholder={valueDescription}
          value={value}
          errorMessage={validationError}
          styles={textFieldStyles}
          onChange={onValueChange}
          disabled={isReadOnly}
        />
      </div>
    </>
  );
};

function stringifyValue(value: any): string {
  return typeof value !== 'string' ? JSON.stringify(value) : value;
}
