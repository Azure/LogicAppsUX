import type { DynamicallyAddedParameterProps, DynamicallyAddedParameterTypeType } from '../../dynamicallyaddedparameter';
import { DynamicallyAddedParameter } from '../../dynamicallyaddedparameter';
import { generateDynamicParameterKey } from '../../dynamicallyaddedparameter/helper';
import type { ValueSegment } from '../../editor';
import type { ChangeHandler } from '../../editor/base';
import type { FloatingActionMenuItem } from '../floatingactionmenubase';
import { FloatingActionMenuBase } from '../floatingactionmenubase';
import { createDynamicallyAddedParameterProperties, deserialize, getEmptySchemaValueSegmentForInitialization, serialize } from './helper';
import { TextField } from '@fluentui/react';
import { safeSetObjectPropertyValue } from '@microsoft/utils-logic-apps';
import React from 'react';
import { useIntl } from 'react-intl';

type DynamicallyAddedParameterInputsPropertiesBase = {
  type: string;
  title: string;
  description: string;
  'x-ms-content-hint': DynamicallyAddedParameterTypeType;
  'x-ms-dynamically-added'?: boolean;
};

type DynamicallyAddedParameterInputsDateProperties = DynamicallyAddedParameterInputsPropertiesBase & {
  format: string;
};

type DynamicallyAddedParameterInputsEmailProperties = DynamicallyAddedParameterInputsPropertiesBase & {
  format: string;
};

type DynamicallyAddedParameterInputsFileProperties = DynamicallyAddedParameterInputsPropertiesBase & {
  properties: {
    name: {
      type: string;
    };
    contentBytes: {
      type: string;
      format: string;
    };
  };
};

export type DynamicallyAddedParameterInputsProperties =
  | DynamicallyAddedParameterInputsPropertiesBase
  | DynamicallyAddedParameterInputsDateProperties
  | DynamicallyAddedParameterInputsEmailProperties
  | DynamicallyAddedParameterInputsFileProperties;

export type DynamicallyAddedParameterInputsModel = DynamicallyAddedParameterProps & {
  required: boolean;
  properties: DynamicallyAddedParameterInputsProperties;
};

export interface FloatingActionMenuInputsProps {
  supportedTypes: Array<string>;
  useStaticInputs: boolean | undefined;
  initialValue: ValueSegment[];
  isRequestApiConnectionTrigger?: boolean;
  onChange?: ChangeHandler;
}

export const FloatingActionMenuInputs = (props: FloatingActionMenuInputsProps): JSX.Element => {
  const intl = useIntl();

  // Set an empty schema object in the value so that the object structure is what Flow-RP expects.
  if (props.initialValue.length > 0 && !props.initialValue[0].value) {
    const { onChange } = props;
    if (onChange) {
      const value = getEmptySchemaValueSegmentForInitialization(!!props.useStaticInputs, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  }

  const onDynamicallyAddedParameterChange = (schemaKey: string, propertyName: string, newPropertyValue?: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfModelToUpdate = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      safeSetObjectPropertyValue(dynamicParameterModels[indexOfModelToUpdate], ['properties', propertyName], newPropertyValue);
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const onDynamicallyAddedParameterTitleChange = (schemaKey: string, newValue: string | undefined) => {
    onDynamicallyAddedParameterChange(schemaKey, 'title', newValue);
  };

  const onDynamicallyAddedParameterDelete = (schemaKey: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexToDelete = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      dynamicParameterModels.splice(indexToDelete, 1);
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const onRenderValueField = (schemaKey: string) => {
    const onDescriptionChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newPropertyValue?: string) => {
      e.preventDefault();
      onDynamicallyAddedParameterChange(schemaKey, 'description', newPropertyValue);
    };

    const modelIndex = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
    const description = dynamicParameterModels[modelIndex].properties.description;

    return <TextField className="msla-dynamic-added-param-value-TextField" value={description} onChange={onDescriptionChange} />;
  };

  const dynamicParameterModels: DynamicallyAddedParameterInputsModel[] = deserialize(
    props.initialValue,
    props.isRequestApiConnectionTrigger
  ).map((model) => ({
    ...model,
    onTitleChange: onDynamicallyAddedParameterTitleChange,
    onDelete: onDynamicallyAddedParameterDelete,
    onRenderValueField,
  }));

  const addNewDynamicallyAddedParameter = (item: FloatingActionMenuItem) => {
    const { icon, type: floatingActionMenuItemType } = item;

    const schemaKey = generateDynamicParameterKey(
      dynamicParameterModels.map((model) => model.schemaKey),
      item.type
    );
    const properties = createDynamicallyAddedParameterProperties(floatingActionMenuItemType, schemaKey);
    dynamicParameterModels.push({
      icon,
      title: properties.title,
      schemaKey,
      properties,
      required: true, // TODO: add functionality to allow making parameters optional
      onTitleChange: onDynamicallyAddedParameterTitleChange,
      onDelete: onDynamicallyAddedParameterDelete,
      onRenderValueField,
    });
  };

  const onMenuItemSelected = (selectedItem: FloatingActionMenuItem) => {
    addNewDynamicallyAddedParameter(selectedItem);

    const { onChange } = props;
    if (onChange) {
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const collapsedTitle = intl.formatMessage({ defaultMessage: 'Add an input', description: 'Button to add a dynamically added parameter' });
  const expandedTitle = intl.formatMessage({
    defaultMessage: 'Choose the type of user input',
    description: 'Button to choose data type of the dynamically added parameter',
  });

  return (
    <FloatingActionMenuBase
      supportedTypes={props.supportedTypes}
      collapsedTitle={collapsedTitle}
      expandedTitle={expandedTitle}
      onMenuItemSelected={onMenuItemSelected}
    >
      {dynamicParameterModels.map((model) => {
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          required,
          properties,
          ...props
        } = model;

        return properties['x-ms-dynamically-added'] === true ? <DynamicallyAddedParameter {...props} key={props.schemaKey} /> : null;
      })}
    </FloatingActionMenuBase>
  );
};
