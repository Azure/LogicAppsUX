import Constants from '../constants';
import type { WorkflowParameterDefinition, WorkflowParameterUpdateHandler } from './workflowparameter';
import type {
  IDropdownOption,
  IDropdownStyles,
  ILabelStyles,
  IStyle,
  ITextFieldProps,
  ITextFieldStyles,
  ITextStyles,
} from '@fluentui/react';
import { Dropdown, FontWeights, getTheme, Label, Text, TextField } from '@fluentui/react';
import { equals, format } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
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
const VALUE_KEY = 'value';
const DEFAULT_VALUE_KEY = 'defaultValue';

export interface ParameterFieldDetails {
  name: string;
  value: string;
  defaultValue?: string;
  type: string;
}

export interface WorkflowparameterFieldProps {
  name?: string;
  definition: WorkflowParameterDefinition;
  validationErrors?: Record<string, string | undefined>;
  setName: (value: string | undefined | ((prevVar: string | undefined) => string)) => void;
  onChange?: WorkflowParameterUpdateHandler;
  isConsumption?: boolean;
  isReadOnly?: boolean;
  isEditable?: boolean;
}

export const WorkflowparameterField = ({
  name,
  definition,
  validationErrors,
  setName,
  onChange,
  isEditable,
  isReadOnly,
  isConsumption,
}: WorkflowparameterFieldProps): JSX.Element => {
  const [valueWarningMessage, setValueWarningMessage] = useState(getValueWarningMessage(definition.value, definition.type));
  const [type, setType] = useState(definition.type);
  const [value, setValue] = useState<string | undefined>(definition.value);
  const [defaultValue, setDefaultValue] = useState<string | undefined>(definition.defaultValue);

  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    name: `${definition.id}-${NAME_KEY}`,
    value: `${definition.id}-${VALUE_KEY}`,
    defaultValue: `${definition.id}-default-${VALUE_KEY}`,
    type: `${definition.id}-type`,
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
  const valueTitle = intl.formatMessage({
    defaultMessage: 'Value',
    description: 'Parameter Field Value Title',
  });
  const valueDescription = intl.formatMessage({
    defaultMessage: 'Enter value for parameter.',
    description: 'Parameter Field Value Placeholder Text',
  });
  const actualValueTitle = intl.formatMessage({
    defaultMessage: 'Actual Value',
    description: 'Parameter Field Actual Value Title',
  });
  const defaultValueTitle = intl.formatMessage({
    defaultMessage: 'Default Value',
    description: 'Parameter Field Default Value Title',
  });
  const defaultValueDescription = intl.formatMessage({
    defaultMessage: 'Enter default value for parameter.',
    description: 'Parameter Field Value Placeholder Text',
  });
  const onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    setName(newValue);
    onChange?.({
      id: definition.id,
      newDefinition: { ...definition, name: newValue, type, value, defaultValue },
      isConsumption,
    });
  };

  const onTypeChange = (_event?: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void => {
    const newType = item?.key.toString() as string;

    onChange?.({
      id: definition.id,
      newDefinition: { ...definition, name, type: newType, value, defaultValue },
      isConsumption,
    });

    setType(newType);
    setValueWarningMessage(getValueWarningMessage(defaultValue, newType));
  };

  const onValueChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    handleValueChange(newValue);
  };

  const handleValueChange = (value?: string) => {
    setValue(value);
    setValueWarningMessage(getValueWarningMessage(value, type));

    onChange?.({
      id: definition.id,
      newDefinition: { ...definition, name, type, value, defaultValue },
      isConsumption,
    });
  };

  const onDefaultValueChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    handleDefaultValueChange(newValue);
  };

  const handleDefaultValueChange = (defaultValue?: string) => {
    setDefaultValue(defaultValue);
    setValueWarningMessage(getValueWarningMessage(defaultValue, type));

    onChange?.({
      id: definition.id,
      newDefinition: { ...definition, name, type, value, defaultValue },
      isConsumption,
    });
  };

  const onRenderDescription = (props?: ITextFieldProps): JSX.Element => {
    return (
      <Text variant="small" styles={textStyles}>
        {props?.description}
      </Text>
    );
  };

  return (
    <>
      <div className="msla-workflow-parameter-field">
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
            errorMessage={errors[NAME_KEY]}
            onChange={onNameChange}
            disabled={isReadOnly}
          />
        ) : (
          <Text className="msla-workflow-parameter-read-only">{name}</Text>
        )}
      </div>
      <div className="msla-workflow-parameter-field">
        <Label styles={labelStyles} required={true} htmlFor={parameterDetails.type}>
          {typeTitle}
        </Label>
        {isEditable ? (
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
        ) : (
          <Text className="msla-workflow-parameter-read-only">{type}</Text>
        )}
      </div>
      {!isConsumption ? (
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} required={true} htmlFor={parameterDetails.value}>
            {valueTitle}
          </Label>
          {isEditable ? (
            <TextField
              data-testid={parameterDetails.value}
              id={parameterDetails.value}
              ariaLabel={valueTitle}
              placeholder={valueDescription}
              description={valueWarningMessage}
              value={value}
              errorMessage={errors[VALUE_KEY]}
              styles={valueWarningMessage ? textFieldWithWarningStyles : textFieldStyles}
              onChange={onValueChange}
              onRenderDescription={valueWarningMessage ? onRenderDescription : undefined}
              disabled={isReadOnly}
            />
          ) : (
            <Text className="msla-workflow-parameter-read-only">{value}</Text>
          )}
        </div>
      ) : (
        <>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} required={true} htmlFor={parameterDetails.defaultValue}>
              {defaultValueTitle}
            </Label>
            {isEditable ? (
              <TextField
                data-testid={parameterDetails.defaultValue}
                id={parameterDetails.defaultValue}
                ariaLabel={defaultValueTitle}
                placeholder={defaultValueDescription}
                description={valueWarningMessage}
                value={defaultValue}
                errorMessage={errors[DEFAULT_VALUE_KEY]}
                styles={valueWarningMessage ? textFieldWithWarningStyles : textFieldStyles}
                onChange={onDefaultValueChange}
                onRenderDescription={valueWarningMessage ? onRenderDescription : undefined}
                disabled={isReadOnly}
              />
            ) : (
              <Text className="msla-workflow-parameter-read-only">{defaultValue}</Text>
            )}
          </div>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} htmlFor={parameterDetails.value}>
              {actualValueTitle}
            </Label>
            {isEditable ? (
              <TextField
                data-testid={parameterDetails.value}
                id={parameterDetails.value}
                ariaLabel={valueTitle}
                description={valueWarningMessage}
                value={value}
                styles={textFieldStyles}
                disabled={true}
              />
            ) : (
              <Text className="msla-workflow-parameter-read-only">{value}</Text>
            )}
          </div>
        </>
      )}
    </>
  );
};

function isSecureParameter(type?: string): boolean {
  return equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_STRING) || equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_OBJECT);
}

function getValueWarningMessage(value?: string, type?: string): string | undefined {
  return isSecureParameter(type) && !!value ? format('Warning Message', type) : undefined;
}
