/* eslint-disable no-param-reassign */
import Constants from '../../../common/constants';
import { isArrayOrObjectValueCompatibleWithSchema, getAndEscapeSegment } from '../parameterhelper';
import type { InputParameter } from '@microsoft-logic-apps/parsers';
import {
  createEx,
  ExtensionProperties,
  isAncestorKey,
  isChildKey,
  ParameterLocations,
  parseEx,
  SchemaProcessor,
  SegmentType,
  WildIndexSegment,
} from '@microsoft-logic-apps/parsers';
import { isObject } from '@microsoft-logic-apps/utils';

/**
 * @interface ArrayViewModel
 * Defines the view model for array parameter
 */
export interface ArrayViewModel {
  /**
   * @member {string} key - the parameter key of the array view model.
   */
  key: string;

  /**
   * @member {string} name - the name of the array parameter.
   */
  name: string;

  /**
   * @member {boolean} expanded - the flag whether the array view model expanded or not.
   */
  expanded?: boolean;

  /**
   * @member {any} preservedValue - the preserved value for the array parameter.
   */
  preservedValue?: any;

  /**
   * @member {ItemPropertyViewModel[]} items - the associated items view models when array view model is expanded.
   */
  items?: ItemPropertyViewModel[];

  /**
   * @member {InputParameter} inputParameter - the associated input parameter for the array parameter.
   */
  inputParameter: InputParameter;

  /**
   * @member {InputParameter} itemInputParameter - the associated item input parameter for the array parameter.
   */
  itemInputParameter: InputParameter;
}

export interface ItemPropertyViewModel {
  /**
   * @member {string} key - the parameter key of the item property.
   */
  key: string;

  /**
   * @member {boolean} expanded - the flag whether the array item expanded or not.
   */
  expanded?: boolean;

  /**
   * @member {PropertyMetadata[]} properties - the associated properties for the array item.
   */
  properties?: PropertyMetadata[];

  /**
   * @member {any} preservedValue - the preserved value for the array parameter.
   */
  preservedValue?: any;
}

export type PropertyMetadata = ArrayPropertyMetadata | NonArrayPropertyMetadata;

export interface BasePropertyMetadata {
  /**
   * @member {string} key - the parameter key of the array view model.
   */
  key: string;

  /**
   * @member {InputParameter} inputParameter - the associated input parameter for the property.
   */
  inputParameter: InputParameter;
}

export interface NonArrayPropertyMetadata extends BasePropertyMetadata {
  /**
   * @member {any} preservedValue - the preserved value for the property.
   */
  preservedValue?: any;
}

export interface ArrayPropertyMetadata extends BasePropertyMetadata {
  /**
   * @member {ArrayViewModel} viewModel - the associated array view model for the nested array property.
   */
  viewModel: ArrayViewModel;
}

export function initializeArrayViewModel(inputParameter: InputParameter, shouldIgnoreDefaultValue = false): ArrayViewModel {
  const descendantInputParameters = expandArrayParameters(inputParameter);
  return convertArrayInputParameterToArrayViewModel(
    inputParameter,
    inputParameter.value,
    descendantInputParameters,
    /* indexes */ [],
    shouldIgnoreDefaultValue
  );
}

function expandArrayParameters(parameter: InputParameter): InputParameter[] {
  const required = parameter.required;
  const visibility = parameter.visibility;
  const prefix = parameter.name;
  const itemSchema = parameter.itemSchema;

  const isPrimitiveArray = itemSchema.type !== 'object';
  const isTopLevelBodyParameter = parameter.in === ParameterLocations.Body && !parameter.isNested;
  const shouldPrefix = !isTopLevelBodyParameter || isPrimitiveArray;
  const titlePrefix = shouldPrefix && !itemSchema.title ? parameter.title : '';
  const summaryPrefix = shouldPrefix && !itemSchema[ExtensionProperties.Summary] ? parameter.summary : '';

  const processor = new SchemaProcessor({
    currentKey: WildIndexSegment,
    prefix,
    keyPrefix: `${parameter.key}.${WildIndexSegment}`,
    titlePrefix,
    summaryPrefix,
    isInputSchema: true,
    isNested: false,
    expandArrayOutputs: true,
    expandArrayOutputsDepth: Constants.MAX_EXPAND_ARRAY_DEPTH,
    excludeAdvanced: false,
    excludeInternal: false,
    includeParentObject: true,
    required,
    useAliasedIndexing: !!parameter.alias,
    parentProperty: {
      arrayName: prefix,
      isArray: true,
      visibility,
    },
  });

  const inputs = processor.getSchemaProperties(parameter.itemSchema);
  return inputs.map((item) => ({ ...item, in: parameter.in, isDynamic: parameter.isDynamic }));
}

function convertArrayInputParameterToArrayViewModel(
  inputParameter: InputParameter,
  parameterValue: any,
  descendantInputParameters: InputParameter[],
  indexes: number[],
  ignoreDefaultValue: boolean
): ArrayViewModel {
  const children = descendantInputParameters.filter((item) => isChildKey(inputParameter.key, item.key));
  const itemInputParameter = children[0];

  const viewModel: ArrayViewModel = {
    key: getKeyWithSpecifiedIndexes(inputParameter.key, indexes),
    name: inputParameter.title || inputParameter.summary || inputParameter.name,
    inputParameter,
    itemInputParameter,
    expanded: undefined,
    items: undefined,
  };

  const isExpandable = isArrayOrObjectValueCompatibleWithSchema(
    parameterValue,
    viewModel.inputParameter.itemSchema,
    /* isArray */ true,
    /* shallowArrayCheck */ true
  );

  viewModel.expanded = isExpandable;
  allocateArrayViewModelValue(parameterValue, viewModel, descendantInputParameters, indexes, ignoreDefaultValue);

  return viewModel;
}

function allocateArrayViewModelValue(
  parameterValue: any,
  viewModel: ArrayViewModel,
  descendantInputParameters: InputParameter[],
  indexes: number[],
  ignoreDefaultValue: boolean
) {
  const children = descendantInputParameters.filter((item) => isChildKey(viewModel.inputParameter.key, item.key));
  const itemInputParameter = children[0];

  viewModel.items = [];
  if (parameterValue !== undefined) {
    if (parameterValue !== null && viewModel.expanded) {
      const itemProperties = parameterValue.map((itemValue: any, i: number): ItemPropertyViewModel => {
        const cloneIndexes = [...indexes, i];
        const key = getKeyWithSpecifiedIndexes(itemInputParameter.key, cloneIndexes);
        if (itemInputParameter.type !== Constants.SWAGGER.TYPE.OBJECT && itemInputParameter.type !== Constants.SWAGGER.TYPE.ARRAY) {
          // for primitive item
          const primitiveItemProperty: NonArrayPropertyMetadata = {
            key,
            inputParameter: itemInputParameter,
            preservedValue: itemValue,
          };

          return {
            key,
            expanded: true,
            properties: [primitiveItemProperty],
          };
        } else {
          // for complex item or nested array
          const isExpandable = isArrayOrObjectValueCompatibleWithSchema(
            itemValue,
            viewModel.inputParameter.itemSchema,
            /* isArray */ itemInputParameter.type === Constants.SWAGGER.TYPE.ARRAY,
            /* shallowArrayCheck */ true
          );

          const itemProperty: ItemPropertyViewModel = {
            key,
            expanded: isExpandable,
            properties: isExpandable ? [] : undefined,
            preservedValue: isExpandable ? undefined : itemValue,
          };

          if (isExpandable) {
            if (itemInputParameter.type === Constants.SWAGGER.TYPE.OBJECT) {
              // for item is complex object
              const nestedProperties = addObjectPropertiesToPropertyMetadata(
                itemInputParameter,
                descendantInputParameters,
                itemValue,
                cloneIndexes,
                /* ignoreDefaultValue */ true
              );
              itemProperty.properties?.push(...nestedProperties);
            } else {
              // for item is nested array
              itemProperty.properties?.push(
                convertParameterToPropertyMetadata(
                  itemInputParameter,
                  descendantInputParameters,
                  itemValue,
                  cloneIndexes,
                  /* ignoreDefaultValue */ true
                )
              );
            }
          }

          return itemProperty;
        }
      });

      viewModel.items.push(...itemProperties);
    } else {
      viewModel.preservedValue = parameterValue;
    }
  } else {
    const itemProperty = _createNewItemProperty(itemInputParameter, descendantInputParameters, [...indexes, 0], ignoreDefaultValue);
    viewModel.items.push(itemProperty);
  }
}

function _createNewItemProperty(
  itemInputParameter: InputParameter,
  descendantInputParameters: InputParameter[],
  indexes: number[],
  ignoreDefaultValue = false
): ItemPropertyViewModel {
  const key = getKeyWithSpecifiedIndexes(itemInputParameter.key, indexes);
  const newItem: ItemPropertyViewModel = {
    key,
    expanded: true,
    properties: [],
  };

  if (itemInputParameter.type === Constants.SWAGGER.TYPE.ARRAY) {
    // for the case item is nested array
    newItem.properties?.push(
      convertParameterToPropertyMetadata(
        itemInputParameter,
        descendantInputParameters,
        /* serializedValue */ undefined,
        indexes,
        /* ignoreDefaultValue */ false
      )
    );
  } else if (itemInputParameter.type === Constants.SWAGGER.TYPE.OBJECT) {
    const nestedProperties = addObjectPropertiesToPropertyMetadata(
      itemInputParameter,
      descendantInputParameters,
      /* serializedValue */ undefined,
      indexes,
      ignoreDefaultValue
    );
    newItem.properties?.push(...nestedProperties);
  } else {
    // for the case item is primitive
    const primitiveItemProperty: NonArrayPropertyMetadata = {
      key,
      inputParameter: itemInputParameter,
      preservedValue: itemInputParameter.default,
    };
    newItem.properties?.push(primitiveItemProperty);
  }

  return newItem;
}

function convertParameterToPropertyMetadata(
  inputParameter: InputParameter,
  descendantInputParameters: InputParameter[],
  serializedValue: any,
  indexes: number[],
  ignoreDefaultValue: boolean
): PropertyMetadata {
  let property: PropertyMetadata;
  if (!ignoreDefaultValue && serializedValue === undefined) {
    serializedValue = inputParameter.default;
  }

  const key = getKeyWithSpecifiedIndexes(inputParameter.key, indexes);
  if (inputParameter.type !== Constants.SWAGGER.TYPE.ARRAY) {
    const nonArrayPropertyMetadata: NonArrayPropertyMetadata = {
      key,
      inputParameter,
      preservedValue: serializedValue,
    };
    property = nonArrayPropertyMetadata;
  } else {
    const arrayPropertyMetadata: ArrayPropertyMetadata = {
      key,
      inputParameter,
      viewModel: convertArrayInputParameterToArrayViewModel(
        inputParameter,
        serializedValue,
        descendantInputParameters,
        indexes,
        ignoreDefaultValue
      ),
    };
    property = arrayPropertyMetadata;
  }

  return property;
}

function addObjectPropertiesToPropertyMetadata(
  inputParameter: InputParameter,
  descendantInputParameters: InputParameter[],
  serializedValue: any,
  indexes: number[],
  ignoreDefaultValue: boolean
): PropertyMetadata[] {
  let result: PropertyMetadata[] = [];
  const childInputParameters = descendantInputParameters.filter((item) => isChildKey(inputParameter.key, item.key));
  if (childInputParameters.length > 0) {
    if (serializedValue === undefined && !ignoreDefaultValue && inputParameter.default !== undefined) {
      serializedValue = inputParameter.default;
      ignoreDefaultValue = true;
    }
    for (const childItem of childInputParameters) {
      const propertyKey = getAndEscapeChildPropertyKey(childItem.key);
      const propertyValue = !!serializedValue && isObject(serializedValue) ? serializedValue[propertyKey] : undefined;
      if (childItem.type === Constants.SWAGGER.TYPE.OBJECT) {
        const grandChildInputParameters = descendantInputParameters.filter((item) => isChildKey(childItem.key, item.key));
        if (grandChildInputParameters.length > 0) {
          result = result.concat(
            addObjectPropertiesToPropertyMetadata(childItem, descendantInputParameters, propertyValue, indexes, ignoreDefaultValue)
          );
        } else {
          result.push(convertParameterToPropertyMetadata(childItem, descendantInputParameters, propertyValue, indexes, ignoreDefaultValue));
        }
      } else {
        result.push(convertParameterToPropertyMetadata(childItem, descendantInputParameters, propertyValue, indexes, ignoreDefaultValue));
      }
    }
  } else {
    result.push(
      convertParameterToPropertyMetadata(inputParameter, descendantInputParameters, serializedValue, indexes, ignoreDefaultValue)
    );
  }

  return result;
}

function getKeyWithSpecifiedIndexes(itemTemplateKey: string, indexes: number[]): string {
  const cloneIndexes = [...indexes];
  const segments = parseEx(itemTemplateKey);

  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment.type === SegmentType.Index && segment.value === undefined) {
      segment.value = cloneIndexes.pop();
      if (cloneIndexes.length === 0) {
        break;
      }
    }
  }

  return createEx(segments) as string;
}

export function getAndEscapeChildPropertyKey(key: string): string | number {
  const segments = parseEx(key);
  return getAndEscapeSegment(segments[segments.length - 1]);
}

export function getArrayViewModelByIndexedKey(viewModel: ArrayViewModel, indexedKey: string): ArrayViewModel {
  if (viewModel.key === indexedKey) {
    return viewModel;
  } else if (isAncestorKey(indexedKey, viewModel.key) && !!viewModel.items) {
    for (const item of viewModel.items) {
      if (item.properties) {
        for (const property of item.properties) {
          if (property.key === indexedKey) {
            return (property as ArrayPropertyMetadata).viewModel;
          }
        }
      }
    }
  }

  throw new Error('Array view model not found');
}
