import type { ChangeState, StaticResultRootSchemaType } from '..';
import { Label, DropdownEditor } from '..';
import { StaticResultProperty } from './staticResultProperty';
import { formatShownProperties, getOptions, initializeShownProperties } from './util';
import type { OpenAPIV2 } from '@microsoft/logic-apps-designer';
import { createCopy } from '@microsoft/logic-apps-designer';
import isEqual from 'lodash.isequal';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

interface StaticResultPropertiesProps {
  isRoot?: boolean;
  propertiesSchema: StaticResultRootSchemaType;
  required: string[];
  additionalPropertiesSchema?: boolean;
  propertyValues: OpenAPIV2.SchemaObject;
  setPropertyValues: (newPropertyValue: OpenAPIV2.SchemaObject) => void;
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

  useEffect(() => {
    if (!isEqual(shownProperties, initializeShownProperties(required, propertiesSchema, propertyValues))) {
      const newPropertyValues: Record<string, any> = createCopy(propertyValues);
      Object.keys(shownProperties).forEach((propertyName) => {
        if (!shownProperties[propertyName]) {
          delete newPropertyValues[propertyName];
        } else {
          // todo: save previous values, so propertyEditor does not clear when removing item from dropdown
          newPropertyValues[propertyName] = propertyValues?.[propertyName];
        }
      });
      setPropertyValues(newPropertyValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownProperties]);

  useEffect(() => {
    initializeShownProperties(required, propertiesSchema, propertyValues);
  }, [propertiesSchema, propertyValues, required]);

  const updateShownProperties = (newState: ChangeState) => {
    const updatedShownProperties: Record<string, boolean> = {};
    const checkedValues = newState.value[0].value.split(',');
    Object.keys(propertiesSchema).forEach((propertyName) => {
      updatedShownProperties[propertyName] = checkedValues.includes(propertyName);
    });
    setShownProperties(updatedShownProperties);
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
      <div className={!isRoot ? 'msla-static-result-properties-inner' : undefined}>
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
