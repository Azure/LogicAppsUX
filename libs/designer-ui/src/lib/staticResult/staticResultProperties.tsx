import type { StaticResultRootSchemaType } from '..';
import { Label, DropdownEditor } from '..';
import { StaticResultProperty } from './staticResultProperty';
import { formatShownProperties, getOptions, initializeShownProperties } from './util';
import type { IDropdownOption } from '@fluentui/react';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface StaticResultPropertiesProps {
  isRoot?: boolean;
  propertiesSchema: StaticResultRootSchemaType;
  required: string[];
  additionalPropertiesSchema?: boolean;
  propertyValues: OpenAPIV2.SchemaObject;
  setPropertyValues: Dispatch<SetStateAction<OpenAPIV2.SchemaObject>>;
}

export const StaticResultProperties = ({
  isRoot = false,
  propertiesSchema,
  required = [],
  propertyValues,
  setPropertyValues,
}: StaticResultPropertiesProps): JSX.Element => {
  const intl = useIntl();
  const [shownProperties, setShownProperties] = useState<Record<string, boolean>>(
    initializeShownProperties(required, propertiesSchema, propertyValues)
  );

  const updateShownProperties = (_event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
    const optionKey = option?.key;
    if (optionKey) {
      // delete the properties if the option is unchecked
      setPropertyValues((prevState) => {
        if (prevState[optionKey]) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [optionKey]: deletedProperty, ...otherProperties } = prevState;
          return otherProperties;
        }
        return prevState;
      });
      setShownProperties((prevState) => ({ ...prevState, [optionKey]: !prevState[optionKey] }));
    }
  };

  const updatePropertyValues = (propertyName: string, newPropertyValue: any) => {
    setPropertyValues((prevState) => ({ ...prevState, [propertyName]: newPropertyValue }));
  };

  const fieldLabels = intl.formatMessage({
    defaultMessage: 'Select Fields',
    id: 'kBOAkT',
    description: 'Label to select Fields',
  });

  return (
    <div className="msla-static-result-properties-container">
      <div className="msla-static-result-properties-header">
        <div className="msla-static-result-properties-header-optional-values">
          <Label text={fieldLabels} />
          <DropdownEditor
            initialValue={formatShownProperties(shownProperties)}
            options={getOptions(propertiesSchema, required)}
            multiSelect={true}
            //onChange={updateShownProperties}
            customOnChangeHandler={updateShownProperties}
          />
        </div>
      </div>
      <div className={isRoot ? undefined : 'msla-static-result-properties-inner'}>
        {Object.entries(shownProperties).map(([propertyName, showProperty], key) => {
          return showProperty && propertiesSchema[propertyName] ? (
            <StaticResultProperty
              isRoot={isRoot}
              schema={propertiesSchema[propertyName]}
              key={key}
              required={required.includes(propertyName)}
              properties={propertyValues?.[propertyName]}
              updateParentProperties={(newPropertyValue: any) => updatePropertyValues(propertyName, newPropertyValue)}
            />
          ) : null;
        })}
      </div>
    </div>
  );
};
