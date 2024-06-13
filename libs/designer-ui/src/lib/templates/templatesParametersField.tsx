import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
import { Label } from '../label';
import type { EventHandler } from '../eventhandler';
import type { Template } from '@microsoft/logic-apps-shared';

const labelStyles: Partial<ILabelStyles> = {
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

const NAME_KEY = 'name';
const DESCRIPTION_KEY = 'description';
const VALUE_KEY = 'value';

interface ParameterFieldDetails {
  name: string;
  value: string;
  type: string;
  description?: string;
}

export interface TemplatesParameterUpdateEvent {
  newDefinition: Template.ParameterDefinition;
  useLegacy?: boolean;
}

export type TemplatesParameterUpdateHandler = EventHandler<TemplatesParameterUpdateEvent>;

export interface TemplatesParameterFieldProps {
  definition: Template.ParameterDefinition;
  validationError: string | undefined;
  onChange?: TemplatesParameterUpdateHandler;
  useLegacy?: boolean;
  isReadOnly?: boolean;
  required?: boolean;
}

export const TemplatesParameterField = ({
  definition,
  validationError,
  onChange,
  required = true,
  isReadOnly,
  useLegacy,
}: TemplatesParameterFieldProps): JSX.Element => {
  const [value, setValue] = useState<string | undefined>(stringifyValue(definition.value));
  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    name: `${definition.name}-${NAME_KEY}`,
    value: `${definition.name}-${VALUE_KEY}`,
    description: `${definition.name}-${DESCRIPTION_KEY}`,
    type: `${definition.name}-type`,
  };

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
      newDefinition: {
        ...definition,
        value,
      },
      useLegacy,
    });
  };

  return (
    <>
      {/* TODO: show isrequired */}
      <div className="msla-templates-parameters-heading">
        <Text className="msla-templates-parameters-read-only">{definition.displayName}</Text>
      </div>
      <div className="msla-templates-parameter-field">
        <Text className="msla-templates-parameter-read-only">{definition.description}</Text>
      </div>

      <div className="msla-templates-parameter-field">
        <Label
          styles={labelStyles}
          text={`${valueTitle} (${definition.type})`}
          isRequiredField={required}
          htmlFor={parameterDetails.value}
        />
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
