import type { ChangeState, DropdownItem, StaticResultRootSchemaType, ValueSegment } from '..';
import { Label, ValueSegmentType, DropdownEditor } from '..';
import { StaticResultProperty } from './staticResultProperty';
import { capitalizeFirstLetter, guid } from '@microsoft/utils-logic-apps';
import isEqual from 'lodash.isequal';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

interface StaticResultPropertiesProps {
  propertiesSchema: StaticResultRootSchemaType;
  required: string[];
  additionalPropertiesSchema?: boolean;
  propertyValues?: OpenAPIV2.SchemaObject;
  setPropertyValues: (newPropertyValue: OpenAPIV2.SchemaObject) => void;
}

export const StaticResultProperties = ({
  propertiesSchema,
  required = [],
  propertyValues,
  setPropertyValues,
}: StaticResultPropertiesProps): JSX.Element => {
  useEffect(() => {
    console.log(propertyValues);
  }, [propertyValues]);
  const intl = useIntl();
  const [shownProperties, setShownProperties] = useState<Record<string, boolean>>(
    initializeShownProperties(required, propertiesSchema, propertyValues)
  );

  useEffect(() => {
    initializeShownProperties(required, propertiesSchema, propertyValues);
  }, [propertiesSchema, propertyValues, required]);

  const updateShownProperties = (newState: ChangeState) => {
    const updatedProperties: Record<string, boolean> = {};
    const checkedValues = newState.value[0].value.split(',');
    Object.keys(propertiesSchema).forEach((propertyName) => {
      updatedProperties[propertyName] = checkedValues.includes(propertyName);
    });
    setShownProperties(updatedProperties);
  };

  const updatePropertyValues = (propertyName: string, newPropertyValue: any) => {
    if (!isEqual(propertyValues?.[propertyName], newPropertyValue)) {
      setPropertyValues({ ...propertyValues, [propertyName]: newPropertyValue });
    }
  };

  const fieldLabels = intl.formatMessage({
    defaultMessage: 'Select Fields',
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
            onChange={updateShownProperties}
          />
        </div>
      </div>
      {Object.entries(shownProperties).map(([propertyName, showProperty], key) => {
        return showProperty && propertiesSchema[propertyName] ? (
          <StaticResultProperty
            schema={propertiesSchema[propertyName]}
            key={key}
            required={required.includes(propertyName)}
            properties={propertyValues?.[propertyName]}
            updateParentProperties={(newPropertyValue: any) => updatePropertyValues(propertyName, newPropertyValue)}
          />
        ) : null;
      })}
    </div>
  );
};

const initializeShownProperties = (
  required: string[],
  propertiesSchema: StaticResultRootSchemaType,
  propertyValues?: OpenAPIV2.SchemaObject
): Record<string, boolean> => {
  const shownProperties: Record<string, boolean> = {};
  Object.keys(propertiesSchema).forEach((propertyName) => {
    shownProperties[propertyName] = required.indexOf(propertyName) > -1 || propertyValues?.[propertyName];
  });
  return shownProperties;
};

const formatShownProperties = (propertiesSchema: Record<string, boolean>): ValueSegment[] => {
  if (!propertiesSchema) return [];
  const filteredProperties: Record<string, boolean> = Object.fromEntries(Object.entries(propertiesSchema).filter(([, value]) => value));
  return [{ id: guid(), type: ValueSegmentType.LITERAL, value: Object.keys(filteredProperties).toString() }];
};

const getOptions = (propertiesSchema: StaticResultRootSchemaType, required: string[]): DropdownItem[] => {
  const options: DropdownItem[] = [];
  if (propertiesSchema) {
    Object.keys(propertiesSchema).forEach((propertyName, i) => {
      options.push({
        key: i.toString(),
        displayName: `${capitalizeFirstLetter(propertyName)}`,
        value: propertyName,
        disabled: required.includes(propertyName),
      });
    });
  }
  return options;
};
