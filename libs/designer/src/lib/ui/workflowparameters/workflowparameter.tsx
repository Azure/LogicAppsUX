import { CommandBarButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption, IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { ILabelStyles, Label } from '@fluentui/react/lib/Label';
import { FontWeights, getTheme, IStyle } from '@fluentui/react/lib/Styling';
import { ITextStyles, Text } from '@fluentui/react/lib/Text';
import { ITextFieldProps, ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import React, { useState, useRef } from 'react';
import { equals, format } from '@microsoft-logic-apps/utils';
import Constants from '../constants';
import type { EventHandler } from '../eventhandler';
import { isHighContrastBlackOrInverted } from '../utils/theme';
import { useIntl, FormattedMessage } from 'react-intl';
import { EditOrDeleteButton } from './workflowParameterButtons';


const fieldStyles: IStyle = {
  display: 'inline-block',
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 'auto',
};

const disabledTextFieldStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
  fieldGroup: {
    borderColor: Constants.FIELD_GROUP_BORDER_COLOR,
  },
};

const dropdownStyles: Partial<IDropdownStyles> = {
  root: fieldStyles,
};

const commandBarStyles: Partial<IButtonStyles> = {
  label: {
    fontWeight: FontWeights.semibold,
  },
};

const labelStyles: Partial<ILabelStyles> = {
  root: {
    display: 'inline-block',
    minWidth: 100,
    verticalAlign: 'top',
  },
};

const textStyles: Partial<ITextStyles> = {
  root: {
    color: getTheme().palette.yellow,
    fontWeight: FontWeights.bold,
  },
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


const NAME_KEY = 'name';
const DEFAULT_VALUE_KEY = 'defaultValue';

export interface WorkflowParameterUpdateEvent {
  id: string;
  newDefinition: WorkflowParameterDefinition;
}

export interface WorkflowParameterDeleteEvent {
  id: string;
}

export type WorkflowParameterUpdateHandler = EventHandler<WorkflowParameterUpdateEvent>;
export type WorkflowParameterDeleteHandler = EventHandler<WorkflowParameterDeleteEvent>;
export type RegisterLanguageHandler = () => void;

export interface WorkflowParameterDefinition {
  defaultValue?: string;
  id: string;
  isEditable: boolean;
  name?: string;
  type?: string;
  value?: string;
}

export interface WorkflowParameterProps {
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  standardMode?: boolean;
  validationErrors?: Record<string, string>;
  onChange?: WorkflowParameterUpdateHandler;
  onDelete?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: RegisterLanguageHandler;
}

export interface WorkflowParameterState {
  defaultValue?: string;
  expanded?: boolean;
  isEditable?: boolean;
  isInverted?: boolean;
  name?: string;
  type?: string;
  valueWarningMessage?: string | undefined;
}

interface ParameterFieldDetails {
  name: string;
  defaultValue: string;
  type: string;
  value: string;
}

export function WorkflowParameter({ definition, validationErrors, standardMode, isReadOnly, onChange, ...props }: WorkflowParameterProps): JSX.Element {
  const [defaultValue, setDefaultValue] = useState(definition.defaultValue);
  const [expanded, setExpanded] = useState(!!definition.isEditable);
  const [isEditable, setIsEditable] = useState(definition.isEditable);
  const [isInverted, setIsInverted] = useState(isHighContrastBlackOrInverted());
  const [name, setName] = useState(definition.name);
  const [type, setType] = useState(definition.type);
  const [valueWarningMessage, setValueWarningMessage] = useState(getValueWarningMessage(definition.defaultValue, definition.type));
  const intl = useIntl();

  const typeOptions: IDropdownOption[] = [
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY, text: intl.formatMessage({ defaultMessage: 'Array' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL, text: intl.formatMessage({ defaultMessage: 'Bool' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT, text: intl.formatMessage({ defaultMessage: 'Float' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT, text: intl.formatMessage({ defaultMessage: 'Int' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT, text: intl.formatMessage({ defaultMessage: 'Object' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_OBJECT, text: intl.formatMessage({ defaultMessage: 'Secure Objcet' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_STRING, text: intl.formatMessage({ defaultMessage: 'Secure String' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING, text: intl.formatMessage({ defaultMessage: 'String' }) }
  ];

  const typeOptionsForStandard: IDropdownOption[] = [
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY, text: intl.formatMessage({ defaultMessage: 'Array' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL, text: intl.formatMessage({ defaultMessage: 'Bool' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT, text: intl.formatMessage({ defaultMessage: 'Float' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT, text: intl.formatMessage({ defaultMessage: 'Int' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT, text: intl.formatMessage({ defaultMessage: 'Object' }) },
    { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING, text: intl.formatMessage({ defaultMessage: 'String' }) }
  ];

  const parameterDetails: ParameterFieldDetails = {
    name: `${definition.id}-${NAME_KEY}`,
    defaultValue: `${definition.id}-${DEFAULT_VALUE_KEY}`,
    type: `${definition.id}-type`,
    value: `${definition.id}-value`,
  };
  const errors = validationErrors ? validationErrors : {};
  const iconProps: IIconProps = {
    iconName: expanded ? 'ChevronDownMed' : 'ChevronRightMed',
    styles: {
      root: {
        fontSize: 14,
        color: isInverted ? 'white' : '#514f4e',
      },
    },
  };

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const renderParameterFields = (parameterDetails: ParameterFieldDetails, errors: Record<string, string>): JSX.Element => {
    const nameTitle = intl.formatMessage({
      defaultMessage: 'Name',
      description: 'Name Title'
    });
    const nameDescription = intl.formatMessage({
      defaultMessage: 'Enter parameter name.',
      description: 'Name Description'
    });
    const typeTitle = intl.formatMessage({
      defaultMessage: 'Type',
      description: 'Type Title'
    });
    if (isEditable || !standardMode) {
      return (
        <>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} required={true} htmlFor={parameterDetails.name}>
              {nameTitle}
            </Label>
            <TextField
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
              id={parameterDetails.type}
              ariaLabel={typeTitle}
              options={standardMode ? typeOptionsForStandard : typeOptions}
              selectedKey={type}
              styles={dropdownStyles}
              onChange={onTypeChange}
              disabled={isReadOnly}
            />
          </div>
          {renderParameterValueField(parameterDetails, errors)}
        </>
      );
    } else {
      return renderReadOnlyParameters(parameterDetails);
    }
  };

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

  const renderParameterValueField = (parameterDetails: ParameterFieldDetails, errors: Record<string, string>): JSX.Element => {

    const defaultValueTitle = intl.formatMessage({
      defaultMessage: 'Default Value',
      description: 'Default Value Title'
    });
    const defaultValueDescription = intl.formatMessage({
      defaultMessage: 'Enter default value for parameter.',
      description: 'Default Value Placeholder Text'
    });
    const actualValueTitle = intl.formatMessage({
      defaultMessage: 'Actual Value',
      description: 'Actual Value Title'
    });
    return (
      <>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.defaultValue}>
            {defaultValueTitle}
          </Label>
          <TextField
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
  }

  const onRenderDescription = (props?: ITextFieldProps): JSX.Element => {
    return (
      <Text variant="small" styles={textStyles}>
        {props?.description}
      </Text>
    );
  };

  const renderReadOnlyParameters = (parameterDetails: ParameterFieldDetails): JSX.Element => {
    return (
      <>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.name}>
            <FormattedMessage
              defaultMessage='Name'
              description='Name Title'
            />
          </Label>
          <Text className="msla-workflow-parameter-read-only">{name}</Text>
        </div>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.type}>
            <FormattedMessage
              defaultMessage='Title'
              description='Type Title'
            />
          </Label>
          <Text className="msla-workflow-parameter-read-only">{type}</Text>
        </div>
        <div className="msla-workflow-parameter-value-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.value}>
            <FormattedMessage
              defaultMessage='Value'
              description='Value Title'
            />
          </Label>
          <Text block className="msla-workflow-parameter-read-only">
            {defaultValue}
          </Text>
        </div>
      </>
    );
  };
  if (standardMode) {
    const headingTitle = intl.formatMessage({
      defaultMessage: 'New parameter',
      description: 'Heading Title'
    });

    return (
      <div className="msla-workflow-parameter">
        <div className="msla-workflow-parameter-group-standard">
          <div>
            <CommandBarButton
              className="msla-workflow-parameter-heading-button"
              iconProps={iconProps}
              onClick={handleToggleExpand}
              styles={commandBarStyles}
              text={name ? name : headingTitle}
            />
          </div>
          {expanded ? renderParameterFields(parameterDetails, errors) : null}
        </div>
        {!isReadOnly ? (
          <div className="msla-workflow-parameter-edit-or-delete-button">
            <EditOrDeleteButton
              onDelete={props.onDelete}
              showDelete={isEditable}
              definition={definition}
              setIsEditable={setIsEditable}
              setExpanded={setExpanded}
            />
          </div>
        ) : null}
      </div>
    );
  } else {
    return (
      <div className="msla-workflow-parameter">
        <div className="msla-workflow-parameter-group">{
          renderParameterFields(parameterDetails, errors)}
        </div>
        {!isReadOnly ?
          <EditOrDeleteButton
            showDelete
            onDelete={props.onDelete}
            definition={definition}
            setIsEditable={setIsEditable}
            setExpanded={setExpanded}
          /> : null}
      </div>
    );
  }
}

function isSecureParameter(type?: string): boolean {
  return equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_STRING) || equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_OBJECT);
}

function getValueWarningMessage(value?: string, type?: string): string | undefined {
  return isSecureParameter(type) && !!value ? format('Warning Message', type) : undefined;
}
