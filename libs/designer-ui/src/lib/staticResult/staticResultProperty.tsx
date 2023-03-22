import type { StaticResultRootSchemaType } from '..';
import { RequiredMarkerSide, Label } from '..';
import constants from '../constants';
import { StaticResult } from './StaticResult';
import { PropertyEditor } from './propertyEditor';
import type { IDropdownOption, IDropdownStyles, ITextFieldStyles } from '@fluentui/react';
import { Dropdown, TextField } from '@fluentui/react';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

const dropdownStyles: Partial<IDropdownStyles> = {
  root: {
    minHeight: '30px',
    fontSize: '14px',
  },
  dropdown: {
    minHeight: '30px',
  },
  title: {
    height: '30px',
    fontSize: '14px',
    lineHeight: '30px',
  },
  caretDownWrapper: {
    paddingTop: '4px',
  },
};

export const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { height: 30, width: '100%', fontSize: 14 },
  wrapper: { width: '100%', maxHeight: 40, alignItems: 'center', paddingBottom: 14 },
};

interface StaticResultPropertyProps {
  schema: StaticResultRootSchemaType | OpenAPIV2.SchemaObject;
  required?: boolean;
  properties?: OpenAPIV2.SchemaObject;
  updateParentProperties: (newPropertyValue: any) => void;
}

const onRenderLabel = (text: string, required?: boolean): JSX.Element => {
  return <Label text={text} isRequiredField={required} />;
};

function WrappedStaticResultProperty({
  schema,
  required = false,
  properties = {},
  updateParentProperties,
}: StaticResultPropertyProps): JSX.Element {
  const intl = useIntl();
  const [inputValue, setInputValue] = useState((typeof properties === 'string' ? properties : schema?.default ?? '') as string);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const getEnumValues = (): IDropdownOption[] => {
    if (!schema.enum) return [];
    return schema.enum.map((value) => {
      return {
        key: value,
        text: value,
      };
    });
  };

  const selectDropdownKey = (_event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
    if (option) {
      setInputValue(option.key as string);
      updateParentProperties(option.key);
    }
  };

  const dropdownPlaceHolder = intl.formatMessage({
    defaultMessage: 'Select a value',
    description: 'Placeholder for dropdown',
  });

  const textFieldPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter a value',
    description: 'Placeholder for text field',
  });
  const integerTextFieldPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter an integer',
    description: 'Placeholder for integer text field',
  });

  const validateInteger = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: any) => {
    if (isNaN(newValue)) {
      setInputValue(inputValue ?? '');
      setErrorMessage(
        intl.formatMessage({ defaultMessage: 'Invalid integer value', description: 'Error message for invalid integer value' })
      );
    } else {
      setInputValue(newValue);
      setErrorMessage('');
    }
  };

  const updateParentProps = () => {
    if (!errorMessage) {
      updateParentProperties(inputValue);
    }
  };

  const updateParentPropsWithObject = (input: any) => {
    updateParentProperties(input);
  };

  const renderItems = (): JSX.Element => {
    switch (schema.type) {
      case constants.SWAGGER.TYPE.STRING:
        if (schema.enum) {
          return (
            <Dropdown
              className="msla-static-result-property-dropdown"
              styles={dropdownStyles}
              options={getEnumValues()}
              selectedKey={inputValue}
              onChange={selectDropdownKey}
              label={schema.title}
              required={required}
              placeholder={dropdownPlaceHolder}
            />
          );
        } else {
          return (
            <TextField
              className="msla-static-result-property-textField"
              styles={textFieldStyles}
              onRenderLabel={() => onRenderLabel(schema.title ?? '', required)}
              value={inputValue}
              placeholder={textFieldPlaceHolder}
              onChange={(_e, newVal) => {
                setInputValue(newVal ?? '');
              }}
              onBlur={updateParentProps}
            />
          );
        }
      case constants.SWAGGER.TYPE.INTEGER:
        return (
          <TextField
            className="msla-static-result-property-textField"
            styles={textFieldStyles}
            onRenderLabel={() => onRenderLabel(schema.title ?? '', required)}
            value={inputValue}
            placeholder={integerTextFieldPlaceHolder}
            onChange={validateInteger}
            errorMessage={errorMessage}
            onBlur={updateParentProps}
          />
        );
      case constants.SWAGGER.TYPE.ARRAY:
      case constants.SWAGGER.TYPE.OBJECT:
        if (schema.items) {
          return (
            <>
              <Label text={schema.title ?? ''} isRequiredField={required} requiredMarkerSide={RequiredMarkerSide.RIGHT} />
              <PropertyEditor schema={schema.items} properties={properties} updateProperties={updateParentPropsWithObject} />
            </>
          );
        } else if (schema.additionalProperties) {
          return (
            <>
              <Label text={schema.title ?? ''} isRequiredField={required} requiredMarkerSide={RequiredMarkerSide.RIGHT} />
              <PropertyEditor properties={properties} updateProperties={updateParentPropsWithObject} />
            </>
          );
        } else {
          return (
            <div className="msla-static-result-property-inner">
              <StaticResult
                propertiesSchema={schema.properties}
                title={schema?.title ?? ''}
                required={schema.required}
                propertyValues={properties}
                setPropertyValues={updateParentPropsWithObject}
              />
            </div>
          );
        }
      default:
        return (
          <TextField
            className="msla-static-result-property-textField"
            styles={textFieldStyles}
            onRenderLabel={() => onRenderLabel(schema.title ?? '', required)}
            value={inputValue}
            placeholder={textFieldPlaceHolder}
            onChange={(_e, newVal) => {
              setInputValue(newVal ?? '');
            }}
            onBlur={updateParentProps}
          />
        );
    }
  };

  return <div className="msla-static-result-property-container">{renderItems()}</div>;
}

export const StaticResultProperty = React.memo(WrappedStaticResultProperty);
