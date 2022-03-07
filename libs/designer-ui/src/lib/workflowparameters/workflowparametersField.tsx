import {
  Dropdown,
  FontWeights,
  getTheme,
  IDropdownOption,
  IDropdownStyles,
  ILabelStyles,
  IStyle,
  ITextFieldProps,
  ITextFieldStyles,
  ITextStyles,
  Label,
  Text,
  TextField,
} from '@fluentui/react';
import { equals, format } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import Constants from '../constants';
import type { EventHandler } from '../eventhandler';
import type { WorkflowParameterDefinition } from './workflowparameter';
import { ReadOnlyParameters } from './workflowparametersReadOnly';

export const labelStyles: Partial<ILabelStyles> = {
  root: {
    display: 'inline-block',
    minWidth: 100,
    verticalAlign: 'top',
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

const disabledTextFieldStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
  fieldGroup: {
    borderColor: Constants.FIELD_GROUP_BORDER_COLOR,
  },
};

const textFieldWithWarningStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
  fieldGroup: {
    borderColor: Constants.FIELD_GROUP_BORDER_COLOR_WARNING,
    selectors: {
      '&:hover': {
        borderColor: Constants.FIELD_GROUP_BORDER_COLOR_WARNING,
      },
    },
  },
};

const dropdownStyles: Partial<IDropdownStyles> = {
  root: fieldStyles,
};

const textStyles: Partial<ITextStyles> = {
  root: {
    color: getTheme().palette.yellow,
    fontWeight: FontWeights.bold,
  },
};

const NAME_KEY = 'name';
const DEFAULT_VALUE_KEY = 'defaultValue';

export interface WorkflowParameterUpdateEvent {
  id: string;
  newDefinition: WorkflowParameterDefinition;
}

export type WorkflowParameterUpdateHandler = EventHandler<WorkflowParameterUpdateEvent>;

export interface ParameterFieldDetails {
  name: string;
  defaultValue: string;
  type: string;
  value: string;
}

export interface WorkflowparameterFieldProps {
  isEditable?: boolean;
  name?: string;
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  validationErrors?: Record<string, string>;
  setName: (value: string | undefined | ((prevVar: string | undefined) => string)) => void;
  onChange?: WorkflowParameterUpdateHandler;
}

export const WorkflowparameterField = ({
  isEditable,
  name,
  definition,
  isReadOnly,
  validationErrors,
  setName,
  onChange,
}: WorkflowparameterFieldProps): JSX.Element => {
  const [valueWarningMessage, setValueWarningMessage] = useState(getValueWarningMessage(definition.defaultValue, definition.type));
  const [defaultValue, setDefaultValue] = useState(definition.defaultValue);
  const [type, setType] = useState(definition.type);

  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    name: `${definition.id}-${NAME_KEY}`,
    defaultValue: `${definition.id}-${DEFAULT_VALUE_KEY}`,
    type: `${definition.id}-type`,
    value: `${definition.id}-value`,
  };

  const errors = validationErrors ? validationErrors : {};

  const typeOptions: IDropdownOption[] = [
    {
      key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY,
      text: intl.formatMessage({
        defaultMessage: 'Array',
        description: 'This is an option in a dropdown where users can select type Array for their parameter.',
      }),
    },
    {
      key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL,
      text: intl.formatMessage({
        defaultMessage: 'Bool',
        description: 'This is an option in a dropdown where users can select type Boolean for their parameter.',
      }),
    },
    {
      key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT,
      text: intl.formatMessage({
        defaultMessage: 'Float',
        description: 'This is an option in a dropdown where users can select type Float for their parameter.',
      }),
    },
    {
      key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT,
      text: intl.formatMessage({
        defaultMessage: 'Int',
        description: 'This is an option in a dropdown where users can select type Integer for their parameter.',
      }),
    },
    {
      key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT,
      text: intl.formatMessage({
        defaultMessage: 'Object',
        description: 'This is an option in a dropdown where users can select type Object for their parameter.',
      }),
    },
    {
      key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING,
      text: intl.formatMessage({
        defaultMessage: 'String',
        description: 'This is an option in a dropdown where users can select type String for their parameter.',
      }),
    },
  ];
  const nameTitle = intl.formatMessage({
    defaultMessage: 'Name',
    description: 'Parameter Field Name Title',
  });
  const nameDescription = intl.formatMessage({
    defaultMessage: 'Enter parameter name.',
    description: 'Parameter Field Name Description',
  });
  const typeTitle = intl.formatMessage({
    defaultMessage: 'Type',
    description: 'Parameter Field Type Title',
  });
  const defaultValueTitle = intl.formatMessage({
    defaultMessage: 'Default Value',
    description: 'Parameter Field Default Value Title',
  });
  const defaultValueDescription = intl.formatMessage({
    defaultMessage: 'Enter default value for parameter.',
    description: 'Parameter Field Default Value Placeholder Text',
  });
  const actualValueTitle = intl.formatMessage({
    defaultMessage: 'Actual Value',
    description: 'Parameter Field Actual Value Title',
  });
  const onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setName(newValue);
    if (onChange) {
      onChange({
        id: definition.id,
        newDefinition: { ...definition, name: newValue },
      });
    }
  };

  const onTypeChange = (_event?: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void => {
    const newType = item?.key.toString();

    if (onChange) {
      onChange({
        id: definition.id,
        newDefinition: { ...definition, type },
      });
    }
    setType(newType);
    setValueWarningMessage(getValueWarningMessage(defaultValue, newType));
  };

  const onValueChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    handleContentChange(newValue);
  };

  const handleContentChange = (value?: string) => {
    setDefaultValue(value);
    setValueWarningMessage(getValueWarningMessage(value, type));

    if (onChange) {
      onChange({
        id: definition.id,
        newDefinition: { ...definition, defaultValue: value },
      });
    }
  };

  const onRenderDescription = (props?: ITextFieldProps): JSX.Element => {
    return (
      <Text variant="small" styles={textStyles}>
        {props?.description}
      </Text>
    );
  };

  if (isEditable) {
    return (
      <>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.name}>
            {nameTitle}
          </Label>
          <TextField
            data-testid={parameterDetails.name}
            styles={textFieldStyles}
            id={parameterDetails.name}
            ariaLabel={nameTitle}
            placeholder={nameDescription}
            value={name}
            errorMessage={errors[NAME_KEY]}
            onChange={onNameChange}
            disabled={isReadOnly}
          />
        </div>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.type}>
            {typeTitle}
          </Label>
          <Dropdown
            data-testid={parameterDetails.type}
            id={parameterDetails.type}
            ariaLabel={typeTitle}
            options={typeOptions}
            selectedKey={type}
            styles={dropdownStyles}
            onChange={onTypeChange}
            disabled={isReadOnly}
          />
        </div>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.defaultValue}>
            {defaultValueTitle}
          </Label>
          <TextField
            data-testid={parameterDetails.defaultValue}
            id={parameterDetails.defaultValue}
            ariaLabel={defaultValueTitle}
            placeholder={defaultValueDescription}
            description={valueWarningMessage}
            value={defaultValue}
            errorMessage={errors[DEFAULT_VALUE_KEY]}
            styles={valueWarningMessage ? textFieldWithWarningStyles : textFieldStyles}
            onChange={onValueChange}
            onRenderDescription={valueWarningMessage ? onRenderDescription : undefined}
            disabled={isReadOnly}
          />
        </div>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.value}>
            {actualValueTitle}
          </Label>
          <TextField
            data-testid={parameterDetails.value}
            styles={disabledTextFieldStyles}
            id={parameterDetails.value}
            ariaLabel={actualValueTitle}
            type={isSecureParameter(type) ? 'password' : undefined}
            defaultValue={definition.value}
            disabled
          />
        </div>
      </>
    );
  } else {
    return <ReadOnlyParameters name={name} defaultValue={defaultValue} type={type} parameterDetails={parameterDetails} />;
  }
};

function isSecureParameter(type?: string): boolean {
  return equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_STRING) || equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_OBJECT);
}

function getValueWarningMessage(value?: string, type?: string): string | undefined {
  return isSecureParameter(type) && !!value ? format('Warning Message', type) : undefined;
}
