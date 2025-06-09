import Constants from '../constants';
import type { WorkflowParameterDefinition, WorkflowParameterUpdateHandler } from './workflowparameter';
import { useWorkflowParameterStyles } from './styles';
import { equals, getRecordEntry } from '@microsoft/logic-apps-shared';
import { type CSSProperties, useState } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import { Text, Input, Dropdown, Option, Textarea } from '@fluentui/react-components';
import type { DropdownProps, InputProps, TextareaProps } from '@fluentui/react-components';
import { SmallText } from '../text';
import { Label } from '../label';

const textStyles: CSSProperties = {
  color: '#FF8C00', // Orange color for warnings
  fontWeight: 600,
};

const NAME_KEY = 'name';
const TYPE_KEY = 'type';
const DESCRIPTION_KEY = 'description';
const VALUE_KEY = 'value';
const DEFAULT_VALUE_KEY = 'defaultValue';

export interface ParameterFieldDetails {
  name: string;
  value: string;
  defaultValue?: string;
  type: string;
  description?: string;
}

export interface WorkflowparameterFieldProps {
  name?: string;
  definition: WorkflowParameterDefinition;
  validationErrors?: Record<string, string | undefined>;
  setName: (value: string | undefined | ((prevVar: string | undefined) => string)) => void;
  onChange?: WorkflowParameterUpdateHandler;
  useLegacy?: boolean;
  isReadOnly?: boolean;
  isEditable?: boolean | Record<string, boolean>;
  required?: boolean | Record<string, boolean>;
}

export const WorkflowparameterField = ({
  name,
  definition,
  validationErrors,
  setName,
  onChange,
  isEditable,
  required = true,
  isReadOnly,
  useLegacy,
}: WorkflowparameterFieldProps): JSX.Element => {
  const [type, setType] = useState(definition.type);
  const [value, setValue] = useState<string | undefined>(stringifyValue(definition.value));
  const [defaultValue, setDefaultValue] = useState<string | undefined>(stringifyValue(definition.defaultValue));
  const styles = useWorkflowParameterStyles();

  const intl = useIntl();

  const parameterDetails: ParameterFieldDetails = {
    name: `${definition.id}-${NAME_KEY}`,
    value: `${definition.id}-${VALUE_KEY}`,
    description: `${definition.id}-${DESCRIPTION_KEY}`,
    defaultValue: `${definition.id}-default-${VALUE_KEY}`,
    type: `${definition.id}-type`,
  };

  const errors = validationErrors ? validationErrors : {};
  const typeTexts = getWorkflowParameterTypeDisplayNames(intl);

  const typeOptions = [
    Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY,
    Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL,
    Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT,
    Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT,
    Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT,
    Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING,
    ...(useLegacy
      ? [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_STRING, Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_OBJECT]
      : []),
  ];
  const nameTitle = intl.formatMessage({
    defaultMessage: 'Name',
    id: 'm8Q61y',
    description: 'Parameter Field Name Title',
  });
  const nameDescription = intl.formatMessage({
    defaultMessage: 'Enter parameter name.',
    id: 'GreYWQ',
    description: 'Parameter Field Name Description',
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
  const actualValueTitle = intl.formatMessage({
    defaultMessage: 'Actual value',
    id: 'mb1XDD',
    description: 'Parameter Field Actual Value Title',
  });
  const defaultValueTitle = intl.formatMessage({
    defaultMessage: 'Default value',
    id: 'dVFyPb',
    description: 'Parameter Field Default Value Title',
  });
  const defaultValueDescription = intl.formatMessage({
    defaultMessage: 'Enter default value for parameter.',
    id: 'ny75Ly',
    description: 'Parameter Field Value Placeholder Text',
  });

  const handleNameChange: InputProps['onChange'] = (event, data) => {
    const newValue = data.value;
    setName(newValue);
    onChange?.({
      id: definition.id,
      newDefinition: {
        ...definition,
        name: newValue,
        type,
        value,
        defaultValue,
      },
      useLegacy,
    });
  };

  const getDefaultValueWarningMessage = (value?: string, type?: string) => {
    const secureParameterWarningMessage = intl.formatMessage(
      {
        defaultMessage: `It is not recommended to set a default value for type ''{type}'' because it will be stored as plain text.`,
        id: 'bC2LBK',
        description: 'Warning message for secure string parameter default value',
      },
      { type }
    );
    return isSecureParameter(type) && !!value ? secureParameterWarningMessage : undefined;
  };

  const [defaultValueWarningMessage, setDefaultValueWarningMessage] = useState(
    getDefaultValueWarningMessage(definition.defaultValue, definition.type)
  );

  const handleTypeChange: DropdownProps['onOptionSelect'] = (event, data) => {
    const newType = data.optionValue as string;

    onChange?.({
      id: definition.id,
      newDefinition: {
        ...definition,
        name,
        type: newType,
        value,
        defaultValue,
      },
      useLegacy,
    });

    setType(newType);
    setDefaultValueWarningMessage(getDefaultValueWarningMessage(defaultValue, newType));
  };

  const handleValueChange: InputProps['onChange'] = (event, data) => {
    const newValue = data.value;
    setValue(newValue);

    onChange?.({
      id: definition.id,
      newDefinition: {
        ...definition,
        name,
        type,
        value: newValue,
        defaultValue,
      },
      useLegacy,
    });
  };

  const handleValueTextareaChange: TextareaProps['onChange'] = (event, data) => {
    const newValue = data.value;
    setValue(newValue);

    onChange?.({
      id: definition.id,
      newDefinition: {
        ...definition,
        name,
        type,
        value: newValue,
        defaultValue,
      },
      useLegacy,
    });
  };

  const handleDefaultValueChange: InputProps['onChange'] = (event, data) => {
    const newValue = data.value;
    setDefaultValue(newValue);
    setDefaultValueWarningMessage(getDefaultValueWarningMessage(newValue, type));

    onChange?.({
      id: definition.id,
      newDefinition: {
        ...definition,
        name,
        type,
        value,
        defaultValue: newValue,
      },
      useLegacy,
    });
  };

  const handleDefaultValueTextareaChange: TextareaProps['onChange'] = (event, data) => {
    const newValue = data.value;
    setDefaultValue(newValue);
    setDefaultValueWarningMessage(getDefaultValueWarningMessage(newValue, type));

    onChange?.({
      id: definition.id,
      newDefinition: {
        ...definition,
        name,
        type,
        value,
        defaultValue: newValue,
      },
      useLegacy,
    });
  };

  const renderWarning = (description: string): JSX.Element => {
    return <SmallText style={textStyles} text={description} />;
  };

  // Render value input based on type
  const renderValueInput = (fieldValue: string, isDefault = false) => {
    const placeholder = isDefault ? defaultValueDescription : valueDescription;
    const fieldId = isDefault ? parameterDetails.defaultValue : parameterDetails.value;
    const fieldLabel = isDefault ? defaultValueTitle : valueTitle;
    const handleInputChange = isDefault ? handleDefaultValueChange : handleValueChange;
    const handleTextareaChange = isDefault ? handleDefaultValueTextareaChange : handleValueTextareaChange;

    switch (type?.toLowerCase()) {
      case 'object':
        return (
          <Textarea
            data-testid={fieldId}
            id={fieldId}
            aria-label={fieldLabel}
            placeholder={placeholder}
            value={fieldValue || ''}
            onChange={handleTextareaChange}
            disabled={isReadOnly}
            resize="vertical"
            rows={4}
            style={{ width: '100%' }}
          />
        );

      case 'array':
      case 'string':
        return (
          <Textarea
            data-testid={fieldId}
            id={fieldId}
            aria-label={fieldLabel}
            placeholder={placeholder}
            value={fieldValue || ''}
            onChange={handleTextareaChange}
            disabled={isReadOnly}
            resize="vertical"
            rows={4}
            style={{ width: '100%' }}
          />
        );

      default: // bool, int, float, etc.
        return (
          <Input
            data-testid={fieldId}
            id={fieldId}
            aria-label={fieldLabel}
            placeholder={placeholder}
            value={fieldValue || ''}
            onChange={handleInputChange}
            disabled={isReadOnly}
            size="medium"
            style={{ width: '100%' }}
          />
        );
    }
  };

  return (
    <>
      <div className={styles.field}>
        <Label
          className={styles.fieldLabel}
          text={nameTitle}
          isRequiredField={getFieldBooleanValue(required, NAME_KEY)}
          htmlFor={parameterDetails.name}
        />
        <div className={styles.fieldEditor}>
          {getFieldBooleanValue(isEditable, NAME_KEY) ? (
            <>
              <Input
                data-testid={parameterDetails.name}
                id={parameterDetails.name}
                aria-label={nameTitle}
                placeholder={nameDescription}
                value={name || ''}
                onChange={handleNameChange}
                disabled={isReadOnly}
                size="medium"
                style={{ width: '100%' }}
              />
              {errors[NAME_KEY] && <div className={styles.fieldError}>{errors[NAME_KEY]}</div>}
            </>
          ) : (
            <Text className="msla-workflow-parameter-read-only">{name}</Text>
          )}
        </div>
      </div>
      <div className={styles.field}>
        <Label
          className={styles.fieldLabel}
          text={typeTitle}
          isRequiredField={getFieldBooleanValue(required, TYPE_KEY)}
          htmlFor={parameterDetails.type}
        />
        <div className={styles.fieldEditor}>
          {getFieldBooleanValue(isEditable, TYPE_KEY) ? (
            <>
              <Dropdown
                data-testid={parameterDetails.type}
                aria-label={typeTitle}
                placeholder={typeTitle}
                value={typeTexts[type] || type}
                selectedOptions={[type]}
                onOptionSelect={handleTypeChange}
                disabled={isReadOnly}
                style={{ width: '100%' }}
              >
                {typeOptions.map((option) => (
                  <Option key={option} value={option}>
                    {typeTexts[option]}
                  </Option>
                ))}
              </Dropdown>
              {errors[TYPE_KEY] && <div className={styles.fieldError}>{errors[TYPE_KEY]}</div>}
            </>
          ) : (
            <Text className="msla-workflow-parameter-read-only">{type}</Text>
          )}
        </div>
      </div>
      {definition?.description && (
        <div className={styles.field}>
          <Label className={styles.fieldLabel} text={descriptionTitle} isRequiredField={false} htmlFor={parameterDetails.description} />
          <div className={styles.fieldEditor}>
            <Text className="msla-workflow-parameter-read-only">{definition.description}</Text>
          </div>
        </div>
      )}
      {useLegacy ? (
        <>
          <div className={styles.field}>
            <Label
              className={styles.fieldLabel}
              text={defaultValueTitle}
              isRequiredField={getFieldBooleanValue(required, DEFAULT_VALUE_KEY)}
              htmlFor={parameterDetails.defaultValue}
            />
            <div className={styles.fieldEditor}>
              {isEditable ? (
                <>
                  {renderValueInput(defaultValue || '', true)}
                  {errors[DEFAULT_VALUE_KEY] && <div className={styles.fieldError}>{errors[DEFAULT_VALUE_KEY]}</div>}
                  {defaultValueWarningMessage && renderWarning(defaultValueWarningMessage)}
                </>
              ) : (
                <Text className="msla-workflow-parameter-read-only">{defaultValue}</Text>
              )}
            </div>
          </div>
          <div className={styles.field}>
            <Label className={styles.fieldLabel} text={actualValueTitle} htmlFor={parameterDetails.value} />
            <div className={styles.fieldEditor}>
              {getFieldBooleanValue(isEditable, VALUE_KEY) ? (
                <Input
                  data-testid={parameterDetails.value}
                  id={parameterDetails.value}
                  aria-label={valueTitle}
                  value={value || ''}
                  disabled={true}
                  type={isSecureParameter(type) ? 'password' : 'text'}
                  size="medium"
                  style={{ width: '100%' }}
                />
              ) : (
                <Text className="msla-workflow-parameter-read-only">{value}</Text>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className={styles.field}>
          <Label
            className={styles.fieldLabel}
            text={valueTitle}
            isRequiredField={getFieldBooleanValue(required, VALUE_KEY)}
            htmlFor={parameterDetails.value}
          />
          <div className={styles.fieldEditor}>
            {getFieldBooleanValue(isEditable, VALUE_KEY) ? (
              <>
                {renderValueInput(value || '')}
                {errors[VALUE_KEY] && <div className={styles.fieldError}>{errors[VALUE_KEY]}</div>}
              </>
            ) : (
              <Text className="msla-workflow-parameter-read-only">{value}</Text>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const getWorkflowParameterTypeDisplayNames = (intl: IntlShape): Record<string, string> => {
  return {
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY]: intl.formatMessage({
      defaultMessage: 'Array',
      id: 'GzQQqH',
      description: 'This is an option in a dropdown where users can select type Array for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL]: intl.formatMessage({
      defaultMessage: 'Boolean',
      id: 'J8lR2l',
      description: 'This is an option in a dropdown where users can select type Boolean for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT]: intl.formatMessage({
      defaultMessage: 'Float',
      id: 'zjDJwP',
      description: 'This is an option in a dropdown where users can select type Float for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT]: intl.formatMessage({
      defaultMessage: 'Integer',
      id: 'bZtnLw',
      description: 'This is an option in a dropdown where users can select type Integer for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT]: intl.formatMessage({
      defaultMessage: 'Object',
      id: 'Q/7unA',
      description: 'This is an option in a dropdown where users can select type Object for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING]: intl.formatMessage({
      defaultMessage: 'String',
      id: 'YJJ+gQ',
      description: 'This is an option in a dropdown where users can select type String for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_STRING]: intl.formatMessage({
      defaultMessage: 'Secure string',
      id: 'lK+Vzo',
      description: 'This is an option in a dropdown where users can select type Secure String for their parameter.',
    }),
    [Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_OBJECT]: intl.formatMessage({
      defaultMessage: 'Secure object',
      id: 'udnt8c',
      description: 'This is an option in a dropdown where users can select type Secure Object for their parameter.',
    }),
  };
};

function isSecureParameter(type?: string): boolean {
  return equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_STRING) || equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_OBJECT);
}

function stringifyValue(value: any): string {
  return typeof value !== 'string' ? JSON.stringify(value) : value;
}

function getFieldBooleanValue(value: boolean | Record<string, boolean> | undefined, fieldKey: string): boolean {
  return typeof value === 'boolean' ? value : (getRecordEntry(value, fieldKey) ?? false);
}
