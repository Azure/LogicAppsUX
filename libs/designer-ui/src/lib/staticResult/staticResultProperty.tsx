import type { StaticResultRootSchemaType } from '..';
import { RequiredMarkerSide, Label } from '..';
import constants from '../constants';
import { StaticResult } from './StaticResult';
import { PropertyEditor } from './propertyEditor';
import { initializePropertyValueInput } from './util';
import type { IDropdownOption, IDropdownStyles, ITextFieldStyles } from '@fluentui/react';
import { Dropdown, TextField } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { useMountEffect, useUpdateEffect } from '@react-hookz/web';
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

const dropdownRootStyles: Partial<IDropdownStyles> = {
  ...dropdownStyles,
  root: {
    minHeight: '30px',
    fontSize: '14px',
    label: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: '40px',
    },
  },
};

export const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { width: '100%', fontSize: 14, minHeight: 30 },
  wrapper: { width: '100%', alignItems: 'center', paddingBottom: 14 },
};

interface StaticResultPropertyProps {
  isRoot?: boolean;
  required?: boolean;
  schema: StaticResultRootSchemaType | OpenAPIV2.SchemaObject;
  properties?: OpenAPIV2.SchemaObject;
  updateParentProperties: (newPropertyValue: any) => void;
}

const onRenderLabel = (text: string, required?: boolean, isRoot?: boolean): JSX.Element => {
  return (
    <Label
      text={text}
      isRequiredField={required}
      requiredMarkerSide={RequiredMarkerSide.LEFT}
      className={isRoot ? 'msla-static-result-label' : undefined}
    />
  );
};

function WrappedStaticResultProperty({
  isRoot = false,
  required = false,
  schema,
  properties,
  updateParentProperties,
}: StaticResultPropertyProps): JSX.Element {
  const intl = useIntl();
  const [inputValue, setInputValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currProperties, setCurrProperties] = useState<OpenAPIV2.SchemaObject>(properties ?? {});

  // only done on initialization - when a dropdown is selected and a component is rendered, to update
  // the parent with required/default value
  useMountEffect(() => {
    if (schema.type !== constants.SWAGGER.TYPE.ARRAY && schema.type !== constants.SWAGGER.TYPE.OBJECT) {
      const inputVal = initializePropertyValueInput(currProperties, schema);
      setInputValue(inputVal);
      updateParentProperties(inputVal);
    }
  });
  // only done when the properties are updated (ignore mount)
  useUpdateEffect(() => {
    updateParentProperties(currProperties);
  }, [currProperties]);

  const getEnumValues = (): IDropdownOption[] => {
    if (!schema.enum) {
      return [];
    }
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
    id: 'DJW8RE',
    description: 'Placeholder for dropdown',
  });

  const textFieldPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter a value',
    id: 'r/n6/9',
    description: 'Placeholder for text field',
  });
  const integerTextFieldPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter an integer',
    id: 'ehIBkh',
    description: 'Placeholder for integer text field',
  });

  const validateInteger = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: any) => {
    if (Number.isNaN(newValue)) {
      setInputValue(inputValue ?? '');
      setErrorMessage(
        intl.formatMessage({
          defaultMessage: 'Invalid integer value',
          id: 'oR2x4N',
          description: 'Error message for invalid integer value',
        })
      );
    } else {
      setInputValue(newValue);
      setErrorMessage('');
    }
  };

  const updateParentProps = () => {
    if (!errorMessage) {
      try {
        updateParentProperties(JSON.parse(inputValue));
      } catch {
        updateParentProperties(inputValue);
      }
    }
  };

  const renderItems = (): JSX.Element => {
    switch (schema.type) {
      case constants.SWAGGER.TYPE.STRING: {
        if (schema.enum) {
          return (
            <Dropdown
              className="msla-static-result-property-dropdown"
              styles={isRoot ? dropdownRootStyles : dropdownStyles}
              options={getEnumValues()}
              selectedKey={inputValue}
              onChange={selectDropdownKey}
              label={schema.title}
              required={required}
              placeholder={dropdownPlaceHolder}
            />
          );
        }
        return (
          <TextField
            className="msla-static-result-property-textField"
            styles={textFieldStyles}
            onRenderLabel={() => onRenderLabel(schema.title ?? '', required, isRoot)}
            value={inputValue}
            placeholder={textFieldPlaceHolder}
            onChange={(_e, newVal) => {
              setInputValue(newVal ?? '');
            }}
            onBlur={updateParentProps}
            multiline
            autoAdjustHeight
            rows={1}
          />
        );
      }
      case constants.SWAGGER.TYPE.INTEGER:
        return (
          <TextField
            className="msla-static-result-property-textField"
            styles={textFieldStyles}
            onRenderLabel={() => onRenderLabel(schema.title ?? '', required, isRoot)}
            value={inputValue}
            placeholder={integerTextFieldPlaceHolder}
            onChange={validateInteger}
            errorMessage={errorMessage}
            onBlur={updateParentProps}
          />
        );
      case constants.SWAGGER.TYPE.ARRAY:
      case constants.SWAGGER.TYPE.OBJECT: {
        if (schema.items) {
          return (
            <>
              <Label text={schema.title ?? ''} isRequiredField={required} />
              <PropertyEditor schema={schema.items} properties={currProperties} updateProperties={setCurrProperties} />
            </>
          );
        }
        if (schema.additionalProperties) {
          return (
            <>
              <Label text={schema.title ?? ''} isRequiredField={required} />
              <PropertyEditor properties={currProperties} updateProperties={setCurrProperties} />
            </>
          );
        }
        return (
          <div className="msla-static-result-property-inner">
            <StaticResult
              propertiesSchema={schema.properties}
              title={schema?.title ?? ''}
              required={schema.required}
              propertyValues={currProperties}
              setPropertyValues={setCurrProperties}
            />
          </div>
        );
      }
      default:
        return (
          <TextField
            className="msla-static-result-property-textField"
            styles={textFieldStyles}
            onRenderLabel={() => onRenderLabel(schema.title ?? '', required, isRoot)}
            value={inputValue}
            placeholder={textFieldPlaceHolder}
            onChange={(_e, newVal) => {
              setInputValue(newVal ?? '');
            }}
            onBlur={updateParentProps}
            multiline
            autoAdjustHeight
            rows={1}
          />
        );
    }
  };

  return <div className="msla-static-result-property-container">{renderItems()}</div>;
}

export const StaticResultProperty = React.memo(WrappedStaticResultProperty);
