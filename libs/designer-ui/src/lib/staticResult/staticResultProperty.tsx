import type { StaticResultRootSchemaType } from '..';
import { Label } from '..';
import constants from '../constants';
import type { IDropdownOption, IDropdownStyles, ITextFieldStyles } from '@fluentui/react';
import { Dropdown, TextField } from '@fluentui/react';
import React, { useState } from 'react';

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

const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { height: 30, width: '100%', fontSize: 14 },
  wrapper: { display: 'inline-flex', width: '100%', maxHeight: 40, alignItems: 'center' },
};

interface StaticResultProperty {
  schema: StaticResultRootSchemaType;
}

function WrappedStaticResultProperty({ schema }: StaticResultProperty): JSX.Element {
  const [defaultValue, setDefaultValue] = useState(schema.default);
  console.log(schema);

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

  return (
    <div className="msla-static-result-property-container">
      <Label text={schema.title ?? ''} />
      {schema.type === constants.SWAGGER.TYPE.STRING ? (
        schema.enum ? (
          <Dropdown
            className="msla-static-result-property-dropdown"
            styles={dropdownStyles}
            options={getEnumValues()}
            selectedKey={defaultValue}
            onChange={selectDropdownKey}
          />
        ) : (
          <TextField className="msla-static-result-property-textField" styles={textFieldStyles} />
        )
      ) : (
        <div />
      )}
    </div>
  );
}

export const StaticResultProperty = React.memo(WrappedStaticResultProperty);
