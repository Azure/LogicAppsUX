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

  const parameterValueId = `${definition.name}-value`;

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
      <div className="msla-templates-parameter-heading">
        <Label className="msla-templates-parameter-heading-text" text={definition.displayName} isRequiredField={required} />
      </div>
      <div className="msla-templates-parameter-description">
        <Text className="msla-templates-parameter-description-text">{definition.description}</Text>
      </div>

      <div className="msla-templates-parameter-field">
        <Label styles={labelStyles} text={`${valueTitle} (${definition.type})`} htmlFor={parameterValueId} />
        <TextField
          data-testid={parameterValueId}
          id={parameterValueId}
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
