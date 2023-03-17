import type { StaticResultRootSchemaType } from '..';
import { RequiredMarkerSide, StaticResult, Label } from '..';
import constants from '../constants';
import { PropertyEditorContainer } from './propertyEditor';
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

interface StaticResultProperty {
  schema: StaticResultRootSchemaType;
  required?: boolean;
}

const onRenderLabel = (text: string, required?: boolean): JSX.Element => {
  return <Label text={text} isRequiredField={required} />;
};

function WrappedStaticResultProperty({ schema, required = false }: StaticResultProperty): JSX.Element {
  const intl = useIntl();
  const [defaultValue, setDefaultValue] = useState(schema.default);

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
      setDefaultValue(option.key as string);
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

  console.log(schema);

  return (
    <div className="msla-static-result-property-container">
      {schema.type === constants.SWAGGER.TYPE.STRING || !schema.type ? (
        schema.enum ? (
          <Dropdown
            className="msla-static-result-property-dropdown"
            styles={dropdownStyles}
            options={getEnumValues()}
            selectedKey={defaultValue}
            onChange={selectDropdownKey}
            label={schema.title}
            required={required}
            placeholder={dropdownPlaceHolder}
          />
        ) : (
          <TextField
            className="msla-static-result-property-textField"
            styles={textFieldStyles}
            onRenderLabel={() => onRenderLabel(schema.title ?? '', required)}
            defaultValue={defaultValue}
            placeholder={textFieldPlaceHolder}
          />
        )
      ) : schema.type === constants.SWAGGER.TYPE.ARRAY && schema.items ? (
        <div>
          <Label text={schema.title ?? ''} isRequiredField={required} requiredMarkerSide={RequiredMarkerSide.RIGHT} />
          <PropertyEditorContainer schema={schema.items} />
        </div>
      ) : (
        <>
          {schema.additionalProperties ? (
            <div>
              <Label text={schema.title ?? ''} isRequiredField={required} requiredMarkerSide={RequiredMarkerSide.RIGHT} />
              <PropertyEditorContainer />
            </div>
          ) : (
            <div className="msla-static-result-property-inner">
              <StaticResult staticResultSchema={schema} showEnableButton={false} enabled={true} title={schema.title} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const StaticResultProperty = React.memo(WrappedStaticResultProperty);
