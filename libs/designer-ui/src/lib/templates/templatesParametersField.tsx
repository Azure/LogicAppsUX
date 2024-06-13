// import Constants from '../constants';
import type { ILabelStyles, IStyle, ITextFieldStyles } from '@fluentui/react';
import {  TextField } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
// import { SmallText } from '../text';
import { Label } from '../label';
import type { EventHandler } from '../eventhandler';

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

// const textFieldWithWarningStyles: Partial<ITextFieldStyles> = {
//   root: fieldStyles,
//   fieldGroup: {
//     borderColor: Constants.FIELD_GROUP_BORDER_COLOR_WARNING,
//     selectors: {
//       '&:hover': {
//         borderColor: Constants.FIELD_GROUP_BORDER_COLOR_WARNING,
//       },
//     },
//   },
// };

const NAME_KEY = 'name';
const DESCRIPTION_KEY = 'description';
const VALUE_KEY = 'value';

interface ParameterFieldDetails {
  name: string;
  value: string;
  // defaultValue?: string;
  type: string;
  description?: string;
}

export interface TemplatesParameterDefinition {
  value?: string;
  id: string;
  isEditable?: boolean;
  name?: string;
  type: string;
  // defaultValue?: string;
  required?: boolean;
  description?: string;
}

export interface TemplatesParameterUpdateEvent {
  id: string;
  newDefinition: TemplatesParameterDefinition;
  useLegacy?: boolean;
}

export type TemplatesParameterUpdateHandler = EventHandler<TemplatesParameterUpdateEvent>;

export interface TemplatesParameterFieldProps {
  name?: string;
  definition: TemplatesParameterDefinition;
  validationErrors?: Record<string, string | undefined>;
  // setName: (value: string | undefined | ((prevVar: string | undefined) => string)) => void;
  onChange?: TemplatesParameterUpdateHandler;
  useLegacy?: boolean;
  isReadOnly?: boolean;
  // isEditable?: boolean | Record<string, boolean>;
  required?: boolean;
}

export const TemplatesParameterField = ({
  name,
  definition,
  validationErrors,
  // setName,
  onChange,
  // isEditable,
  required = true,
  isReadOnly,
  useLegacy,
}: TemplatesParameterFieldProps): JSX.Element => {
  // const [type, setType] = useState(definition.type);
  const [value, setValue] = useState<string | undefined>(stringifyValue(definition.value));
  // const [defaultValue, setDefaultValue] = useState<string | undefined>(stringifyValue(definition.defaultValue));

  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    name: `${definition.id}-${NAME_KEY}`,
    value: `${definition.id}-${VALUE_KEY}`,
    description: `${definition.id}-${DESCRIPTION_KEY}`,
    // defaultValue: `${definition.id}-default-${VALUE_KEY}`,
    type: `${definition.id}-type`,
  };

  const errors = validationErrors ? validationErrors : {};
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
      id: definition.id,
      newDefinition: { 
        ...definition, 
        name, 
        // type, 
        value, 
        // defaultValue 
      },
      useLegacy,
    });
  };

  return (
    <>
      {/* TODO: show isrequired */}
      <div className="msla-workflow-parameter-field">
        <Text className="msla-workflow-parameter-read-only">{definition.name}</Text>
      </div>
      <div className="msla-workflow-parameter-field">
        <Text className="msla-workflow-parameter-read-only">{definition.description}</Text>
      </div>

      <div className="msla-workflow-parameter-field">
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
          errorMessage={errors[VALUE_KEY]}
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