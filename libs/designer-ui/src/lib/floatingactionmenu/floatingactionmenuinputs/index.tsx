import constants from '../../constants';
import type { DynamicallyAddedParameterProps, DynamicallyAddedParameterTypeType } from '../../dynamicallyaddedparameter';
import { DynamicallyAddedParameter } from '../../dynamicallyaddedparameter';
import { generateDynamicParameterKey } from '../../dynamicallyaddedparameter/helper';
import type { ValueSegment } from '../../editor';
import type { ChangeHandler } from '../../editor/base';
import type { FloatingActionMenuItem } from '../floatingactionmenubase';
import { FloatingActionMenuBase } from '../floatingactionmenubase';
import { createDynamicallyAddedParameterProperties, deserialize, getEmptySchemaValueSegmentForInitialization, serialize } from './helper';
import { TextField } from '@fluentui/react';
import { safeSetObjectPropertyValue } from '@microsoft/logic-apps-shared';
import type React from 'react';
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

type DynamicallyAddedParameterInputsTextProperties = DynamicallyAddedParameterInputsPropertiesBase & {
  enum: string[];
};

type DynamicallyAddedParameterInputsArrayProperties = DynamicallyAddedParameterInputsPropertiesBase & {
  items: {
    enum: string[];
    type: string;
  };
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
  | DynamicallyAddedParameterInputsFileProperties
  | DynamicallyAddedParameterInputsTextProperties
  | DynamicallyAddedParameterInputsArrayProperties;

export type DynamicallyAddedParameterInputsModel = DynamicallyAddedParameterProps & {
  required: boolean;
  properties: DynamicallyAddedParameterInputsProperties;
};

export interface FloatingActionMenuInputsProps {
  supportedTypes: string[];
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

  const onDynamicallyAddedParameterRequiredToggle = (schemaKey: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfModelToUpdate = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      const currentRequiredValue = dynamicParameterModels[indexOfModelToUpdate].required;
      const newRequiredValue = !currentRequiredValue;
      safeSetObjectPropertyValue(dynamicParameterModels[indexOfModelToUpdate], ['required'], newRequiredValue);
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const onStringDropdownListToggle = (schemaKey: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfModelToUpdate = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      const modelToUpdate = dynamicParameterModels[indexOfModelToUpdate];
      const newProperties =
        (modelToUpdate.properties as DynamicallyAddedParameterInputsTextProperties).enum === undefined
          ? { ...modelToUpdate.properties, enum: ['First option'] }
          : { ...modelToUpdate.properties, enum: undefined };

      dynamicParameterModels[indexOfModelToUpdate] = safeSetObjectPropertyValue(
        modelToUpdate,
        ['properties'],
        newProperties
      ) as DynamicallyAddedParameterInputsModel;
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const onStringDropdownListUpdate = (schemaKey: string, newValue: string[]) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfModelToUpdate = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      const modelToUpdate = dynamicParameterModels[indexOfModelToUpdate];
      const newProperties = { ...modelToUpdate.properties, enum: newValue };

      dynamicParameterModels[indexOfModelToUpdate] = safeSetObjectPropertyValue(
        modelToUpdate,
        ['properties'],
        newProperties
      ) as DynamicallyAddedParameterInputsModel;
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const onStringMultiSelectListToggle = (schemaKey: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfModelToUpdate = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      const modelToUpdate = dynamicParameterModels[indexOfModelToUpdate];
      const currentParameterType = modelToUpdate.properties.type;
      const newParameterType =
        currentParameterType === constants.SWAGGER.TYPE.STRING ? constants.SWAGGER.TYPE.ARRAY : constants.SWAGGER.TYPE.STRING;

      onDynamicallyAddedParameterChange(schemaKey, 'type', newParameterType);

      const newProperties =
        currentParameterType === constants.SWAGGER.TYPE.STRING
          ? { ...modelToUpdate.properties, items: { enum: ['First option'], type: constants.SWAGGER.TYPE.STRING } }
          : { ...modelToUpdate.properties, items: undefined };

      safeSetObjectPropertyValue(modelToUpdate, ['properties'], newProperties);
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const onStringMultiSelectListUpdate = (schemaKey: string, newValue: string[]) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfModelToUpdate = dynamicParameterModels.findIndex((model) => model.schemaKey === schemaKey);
      const modelToUpdate = dynamicParameterModels[indexOfModelToUpdate];
      const newProperties = { ...modelToUpdate.properties, items: { enum: newValue, type: constants.SWAGGER.TYPE.STRING } };

      safeSetObjectPropertyValue(modelToUpdate, ['properties'], newProperties);
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const isDynamicParameterDropdown = (schemaKey: string): boolean => {
    const model = dynamicParameterModels.find((model) => model.schemaKey === schemaKey);
    if (model && (model.properties as DynamicallyAddedParameterInputsTextProperties).enum) {
      return true;
    }
    return false;
  };

  const isDynamicParameterMultiSelect = (schemaKey: string): boolean => {
    const model = dynamicParameterModels.find((model) => model.schemaKey === schemaKey);
    if (model && (model.properties as DynamicallyAddedParameterInputsArrayProperties).items) {
      return true;
    }
    return false;
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

  const stringListValues = (schemaKey: string): string[] => {
    const model = dynamicParameterModels.find((model) => model.schemaKey === schemaKey);
    if (model && (model.properties as DynamicallyAddedParameterInputsTextProperties).enum) {
      return (model.properties as DynamicallyAddedParameterInputsTextProperties).enum;
    }
    if (model && (model.properties as DynamicallyAddedParameterInputsArrayProperties).items) {
      return (model.properties as DynamicallyAddedParameterInputsArrayProperties).items.enum;
    }
    return [];
  };

  const getStringListUpdateHandler = (schemaKey: string, newValue: string[]) => {
    if (isDynamicParameterDropdown(schemaKey)) {
      return onStringDropdownListUpdate(schemaKey, newValue);
    }
    if (isDynamicParameterMultiSelect(schemaKey)) {
      return onStringMultiSelectListUpdate(schemaKey, newValue);
    }
    return undefined;
  };

  const dynamicParameterModels: DynamicallyAddedParameterInputsModel[] = deserialize(
    props.initialValue,
    props.isRequestApiConnectionTrigger
  ).map((model) => ({
    ...model,
    onTitleChange: onDynamicallyAddedParameterTitleChange,
    onRequiredToggle: onDynamicallyAddedParameterRequiredToggle,
    onStringDropdownListToggle: model.properties.type === 'string' ? onStringDropdownListToggle : undefined,
    onStringMultiSelectListToggle: ['array', 'string'].includes(model.properties.type) ? onStringMultiSelectListToggle : undefined,
    onDelete: onDynamicallyAddedParameterDelete,
    onRenderValueField,
    isDynamicParameterMultiSelect,
    isDynamicParameterDropdown,
    onStringListUpdate: getStringListUpdateHandler,
    shouldDisplayAddDropdownOption:
      (model.properties['x-ms-content-hint'] === 'TEXT' && !(model.properties as DynamicallyAddedParameterInputsTextProperties).enum) ??
      undefined,
    shouldDisplayAddMultiSelectOption:
      (model.properties['x-ms-content-hint'] === 'TEXT' && !(model.properties as DynamicallyAddedParameterInputsArrayProperties).items) ??
      undefined,
    shouldDisplayRemoveDropdownOption:
      (model.properties['x-ms-content-hint'] === 'TEXT' && !!(model.properties as DynamicallyAddedParameterInputsTextProperties).enum) ??
      undefined,
    shouldDisplayRemoveMultiSelectOption:
      (model.properties.type === 'array' && !!(model.properties as DynamicallyAddedParameterInputsArrayProperties).items) ?? undefined,
    stringListValues: ['array', 'string'].includes(model.properties.type) ? stringListValues : undefined,
  }));

  const addNewDynamicallyAddedParameter = (item: FloatingActionMenuItem) => {
    const { icon, type: floatingActionMenuItemType } = item;

    const schemaKey = generateDynamicParameterKey(
      dynamicParameterModels.map((model) => model.schemaKey),
      item.type
    );
    const properties = createDynamicallyAddedParameterProperties(floatingActionMenuItemType, schemaKey);

    const newModel: DynamicallyAddedParameterInputsModel = {
      icon,
      title: properties.title,
      schemaKey,
      properties,
      required: true,
      onRequiredToggle: onDynamicallyAddedParameterRequiredToggle,
      onStringDropdownListToggle: properties.type === 'string' ? onStringDropdownListToggle : undefined,
      onStringMultiSelectListToggle: ['array', 'string'].includes(properties.type) ? onStringMultiSelectListToggle : undefined,
      onTitleChange: onDynamicallyAddedParameterTitleChange,
      onDelete: onDynamicallyAddedParameterDelete,
      onRenderValueField,
      shouldDisplayAddDropdownOption: properties['x-ms-content-hint'] === 'TEXT',
      shouldDisplayAddMultiSelectOption: properties['x-ms-content-hint'] === 'TEXT',
      onStringListUpdate: getStringListUpdateHandler,
      stringListValues: properties['x-ms-content-hint'] === 'TEXT' ? stringListValues : undefined,
      isDynamicParameterMultiSelect: isDynamicParameterMultiSelect,
    };

    dynamicParameterModels.push(newModel);
  };

  const onMenuItemSelected = (selectedItem: FloatingActionMenuItem) => {
    addNewDynamicallyAddedParameter(selectedItem);

    const { onChange } = props;
    if (onChange) {
      const value = serialize(dynamicParameterModels, props.isRequestApiConnectionTrigger);
      onChange({ value });
    }
  };

  const collapsedTitle = intl.formatMessage({
    defaultMessage: 'Add an input',
    id: 'DuoHXI',
    description: 'Button to add a dynamically added parameter',
  });
  const expandedTitle = intl.formatMessage({
    defaultMessage: 'Choose the type of user input',
    id: '3X4FHS',
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
        const { required, properties, ...props } = model;
        return properties['x-ms-dynamically-added'] === true ? (
          <DynamicallyAddedParameter {...props} required={required} key={props.schemaKey} />
        ) : null;
      })}
    </FloatingActionMenuBase>
  );
};
