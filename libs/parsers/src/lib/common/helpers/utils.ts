import type { EnumObject, OutputMetadata, ParameterDynamicSchema, ParameterDynamicValues } from '../../models/operation';
import { DynamicSchemaType, DynamicValuesType } from '../../models/operation';
import * as Constants from '../constants';
import { OutputKeys } from '../constants';
import { parseEx } from './keysutility';
import { getIntl } from '@microsoft-logic-apps/intl';
import { equals, isNullOrUndefined } from '@microsoft-logic-apps/utils';

type SchemaObject = OpenAPIV2.SchemaObject;
type Parameter = OpenAPIV2.ParameterObject;

export function toSwaggerSchema(parameter: Parameter | OpenAPIV2.ItemsObject): SchemaObject {
  const schema: SchemaObject = {
    format: parameter.format,
    description: (parameter as Parameter).description,
    default: parameter.default,
    multipleOf: parameter.multipleOf,
    maximum: parameter.maximum,
    exclusiveMaximum: parameter.exclusiveMaximum,
    minimum: parameter.minimum,
    exclusiveMinimum: parameter.exclusiveMinimum,
    maxLength: parameter.maxLength,
    minLength: parameter.minLength,
    pattern: parameter.pattern,
    maxItems: parameter.maxItems,
    minItems: parameter.minItems,
    uniqueItems: parameter.uniqueItems,
    enum: parameter.enum,
    type: parameter.type,
    items: parameter.items ? toSwaggerSchema(parameter.items) : undefined,
  };

  for (const propertyName of Object.getOwnPropertyNames(parameter)) {
    if (propertyName.startsWith('x-ms-')) {
      schema[propertyName] = (parameter as Parameter)[propertyName];
    }
  }

  return schema;
}

export function getEnum(parameter: SchemaObject, required: boolean | undefined): EnumObject[] | undefined {
  if (parameter.enum) {
    const customEnum: EnumObject[] = parameter[Constants.ExtensionProperties.CustomEnum];
    if (customEnum) {
      return customEnum;
    } else {
      const editorOptions = parameter[Constants.ExtensionProperties.EditorOptions];
      if (editorOptions && editorOptions.items) {
        return editorOptions.items.map((item: any) => ({ displayName: item.title, value: item.value }));
      } else {
        return parameter.enum.map((item) => ({ displayName: !isNullOrUndefined(item) ? item.toString() : '', value: item }));
      }
    }
  }

  if (parameter.type === Constants.Types.Boolean) {
    const intl = getIntl();
    const TrueDisplayName = intl.formatMessage({
      defaultMessage: 'Yes',
      description: 'This is the boolean value for Yes',
    });
    const FalseDisplayName = intl.formatMessage({
      defaultMessage: 'No',
      description: 'This is the boolean value for No',
    });

    return required
      ? [
          {
            displayName: TrueDisplayName,
            value: true,
          },
          {
            displayName: FalseDisplayName,
            value: false,
          },
        ]
      : [
          {
            displayName: '',
            value: '',
          },
          {
            displayName: TrueDisplayName,
            value: true,
          },
          {
            displayName: FalseDisplayName,
            value: false,
          },
        ];
  }

  return undefined;
}

export function getParameterDynamicValues(parameter: SchemaObject): ParameterDynamicValues | undefined {
  const parameterDynamicListExtension = parameter[Constants.ExtensionProperties.DynamicList];
  const parameterDynamicValuesExtension = parameter[Constants.ExtensionProperties.DynamicValues];
  const parameterDynamicTreeExtension = parameter[Constants.ExtensionProperties.DynamicTree];

  if (parameterDynamicValuesExtension) {
    return {
      type: DynamicValuesType.LegacyDynamicValues,
      extension: parameterDynamicValuesExtension,
    };
  }

  if (parameterDynamicListExtension) {
    return {
      type: DynamicValuesType.DynamicList,
      extension: parameterDynamicListExtension,
    };
  }

  if (parameterDynamicTreeExtension) {
    return {
      type: DynamicValuesType.DynamicTree,
      extension: parameterDynamicTreeExtension,
    };
  }

  return undefined;
}

export function getParameterDynamicSchema(parameter: SchemaObject): ParameterDynamicSchema | undefined {
  const dynamicSchemaExtension = parameter[Constants.ExtensionProperties.DynamicSchema];
  if (dynamicSchemaExtension) {
    return {
      type: DynamicSchemaType.LegacyDynamicSchema,
      extension: dynamicSchemaExtension,
    };
  }

  const dynamicPropertiesExtension = parameter[Constants.ExtensionProperties.DynamicProperties];
  if (dynamicPropertiesExtension) {
    return {
      type: DynamicSchemaType.DynamicProperties,
      extension: dynamicPropertiesExtension,
    };
  }

  return undefined;
}

export function getArrayOutputMetadata(schema: SchemaObject, required: boolean, excludeInternal: boolean, prefix?: string): OutputMetadata {
  if (schema.type === 'array' && prefix !== undefined) {
    return {
      array: {
        collectionPath: prefix,
        required,
      },
    };
  } else if (schema.type === 'object') {
    const properties = schema.properties || {};
    const keys = Object.keys(properties).filter((key) => {
      const property = properties[key];
      return !(excludeInternal && equals(property[Constants.ExtensionProperties.Visibility], Constants.Visibility.Internal));
    });

    // TODO: Currently this method returns the array details of the output where the trigger needs to do splitOn.
    // Ideally this should be done by the caller and response process should just return all top level array details.
    // NOTE: if the logic combining prefix changed,
    // dynamicparametershelper.getSchemaProcessorOptionsForDynamicOutputs needs to update accordingly.
    if (keys.length === 1) {
      const firstKey = keys[0];
      const propertyRequired = required && (schema.required || []).indexOf(firstKey) !== -1;
      const details = getArrayOutputMetadata(
        properties[firstKey],
        propertyRequired,
        excludeInternal,
        prefix ? `${prefix}.${firstKey}` : firstKey
      );

      return details;
    }
  }

  return {};
}

type MakeDefinitionReducer = (previous: Record<string, any>, current: string) => Record<string, any>;

const EmptyRefs = Object.freeze({
  $refs: {},
});

/**
 * Deference cyclical schema by replacing the uninlined $ref schema with an object schema with no known properties
 * @arg {string} $ref - A string with the possibly cyclical JSON reference to dereference
 * @arg {Record<string, any>} metadata - A hash mapping cyclical JSON references to their raw schema.  A schema is raw if none of its $ref schema have been inlined
 * @return {SchemaObject}
 */
export function dereferenceRefSchema($ref: string, metadata: Record<string, any>): SchemaObject {
  if (!$ref) {
    return {};
  }

  const { $refs }: Record<string, any> = { ...EmptyRefs, ...metadata };
  const cyclicalDefinitions: Record<string, any> = Object.keys($refs).reduce(makeDefinition($refs), {});
  const cyclicalDefinitionType = cyclicalDefinitions[$ref];
  switch (cyclicalDefinitionType) {
    case Constants.Types.Array:
      return {
        items: {},
        type: Constants.Types.Array,
      };

    case Constants.Types.Object:
      return {
        type: Constants.Types.Object,
      };

    // boolean, null, number, and string schema cannot be cyclical so ignore those
    default:
      return {};
  }
}

function makeDefinition($refs: Record<string, any>): MakeDefinitionReducer {
  return (previous, current) => {
    const { type } = $refs[current];
    return { ...previous, [current]: type };
  };
}

export function getKnownTitles(name: string): string {
  const intl = getIntl();
  switch (name) {
    case OutputKeys.Body:
      return intl.formatMessage({ defaultMessage: 'Body', description: 'Display name for body outputs' });
    case OutputKeys.Headers:
      return intl.formatMessage({ defaultMessage: 'Headers', description: 'Display name for headers in outputs' });
    case OutputKeys.Outputs:
      return intl.formatMessage({ defaultMessage: 'Outputs', description: 'Display name for operation outputs' });
    case OutputKeys.Queries:
      return intl.formatMessage({ defaultMessage: 'Queries', description: 'Display name for queries in outputs' });
    case OutputKeys.StatusCode:
      return intl.formatMessage({ defaultMessage: 'Status Code', description: 'Display name for status code in outputs' });
    case OutputKeys.Item:
      return intl.formatMessage({ defaultMessage: 'Item', description: 'Display name for item output' });
    case OutputKeys.PathParameters:
      return intl.formatMessage({
        defaultMessage: 'Path Parameters',
        description: 'Display name for relative path parameters in trigger outputs',
      });
    default:
      // eslint-disable-next-line no-case-declarations
      const segments = parseEx(name);
      return segments.length ? String(segments[segments.length - 1].value) : '';
  }
}

export function getKnownTitlesFromKey(key: string): string | undefined {
  switch (key?.toLowerCase()) {
    case '$.body':
      return getKnownTitles(OutputKeys.Body);
    case '$.headers':
      return getKnownTitles(OutputKeys.Headers);
    case '$.queries':
      return getKnownTitles(OutputKeys.Queries);
    case '$.pathparameters':
      return getKnownTitles(OutputKeys.PathParameters);
    case '$.statuscode':
      return getKnownTitles(OutputKeys.StatusCode);
    default:
      return undefined;
  }
}
