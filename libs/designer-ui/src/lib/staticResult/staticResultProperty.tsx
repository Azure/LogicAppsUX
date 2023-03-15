import type { ChangeState, DropdownItem, StaticResultRootSchemaType, ValueSegment } from '..';
import { ValueSegmentType, DropdownEditor } from '..';
import { guid } from '@microsoft/utils-logic-apps';
import { useState } from 'react';

interface StaticResultPropertyProps {
  properties: StaticResultRootSchemaType;
  required?: string[];
  additionalProperties?: boolean;
}

export const StaticResultProperty = ({ properties, required = [] }: StaticResultPropertyProps): JSX.Element => {
  const [shownProperties, setShownProperties] = useState<Record<string, boolean>>(initializeShownProperties(required, properties));

  const updateShownProperties = (newState: ChangeState) => {
    const updatedProperties: Record<string, boolean> = {};
    const checkedValues = newState.value[0].value.split(',');
    Object.keys(properties).forEach((propertyName) => {
      updatedProperties[propertyName] = checkedValues.includes(propertyName);
    });
    setShownProperties(updatedProperties);
  };
  return (
    <div>
      <DropdownEditor
        initialValue={formatShownProperties(shownProperties)}
        options={getOptions(properties, required)}
        multiSelect={true}
        onChange={updateShownProperties}
      />
      {Object.entries(shownProperties).map(([propertyName, showProperty], key) => {
        return showProperty ? <div key={key}> {propertyName} </div> : null;
      })}
    </div>
  );
};

const initializeShownProperties = (required: string[], properties?: StaticResultRootSchemaType): Record<string, boolean> => {
  const shownProperties: Record<string, boolean> = {};
  if (properties) {
    Object.keys(properties).forEach((propertyName) => {
      shownProperties[propertyName] = required.indexOf(propertyName) > -1;
    });
  }
  return shownProperties;
};

const formatShownProperties = (properties: Record<string, boolean>): ValueSegment[] => {
  const filteredProperties: Record<string, boolean> = Object.fromEntries(Object.entries(properties).filter(([, value]) => value));
  return [{ id: guid(), type: ValueSegmentType.LITERAL, value: Object.keys(filteredProperties).toString() }];
};

const getOptions = (properties: StaticResultRootSchemaType, required: string[]): DropdownItem[] => {
  const options: DropdownItem[] = [];
  Object.keys(properties).forEach((propertyName, i) => {
    options.push({ key: i.toString(), displayName: propertyName, value: propertyName, disabled: required.includes(propertyName) });
  });
  return options;
};
