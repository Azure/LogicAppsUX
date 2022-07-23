import { InvalidJsonSchemaTypeException } from '../exceptions/invalidjsonschematype';
import { isTemplateExpression } from '@microsoft-logic-apps/parsers';
import { createCopy, clone } from '@microsoft-logic-apps/utils';

export const Types = {
  object: 'object',
  number: 'number',
  string: 'string',
  array: 'array',
  boolean: 'boolean',
  integer: 'integer',
  null: 'null',
};

type SchemaObject = OpenAPIV2.SchemaObject;
/**
 * Generates a JSON schema based on a JSON string.
 * ASSUMPTION: The input string is valid JSON. If not, an error will be thrown. This means
 * that decimal notations that are not '.' are not accepted.
 * @arg {string} jsonString - A stringified JSON value.
 * @return {Swagger.Schema}
 */
export function generateSchemaFromJsonString(jsonString: string): SchemaObject {
  const value = JSON.parse(jsonString);
  return generateSchemaFromValue(value);
}

function generateSchemaFromValue(value: any): SchemaObject {
  const type = typeof value;
  let valueType;
  switch (type) {
    case 'number':
      valueType = Number.isInteger(value) ? Types.integer : Types.number;
      return {
        type: valueType,
      };

    case 'boolean':
      return {
        type: Types.boolean,
      };

    case 'string':
      return {
        type: Types.string,
      };

    case 'object':
      if (value === null) {
        return {};
      }

      if (Array.isArray(value)) {
        return generateSchemaFromArray(value);
      }

      return generateSchemaForObject(value);

    default:
      throw new InvalidJsonSchemaTypeException(`Unsupported type '${type}'.`);
  }
}

function generateSchemaFromArray(jsonArray: any): SchemaObject {
  const schema: SchemaObject = {
    type: Types.array,
  };

  if (jsonArray.length) {
    const firstItem = jsonArray[0];
    const firstItemType = getJsonSchemaType(firstItem);
    let isHomogeneousArray = true;

    for (const jsonArrayItem of jsonArray) {
      if (getJsonSchemaType(jsonArrayItem) !== firstItemType) {
        isHomogeneousArray = false;
        break;
      }
    }

    if (isHomogeneousArray) {
      if (firstItem !== null && firstItemType === Types.object) {
        let proposedRequiredProperties = Object.keys(firstItem);
        const representativeItem = clone(firstItem);

        for (let i = 1; i < jsonArray.length; i++) {
          const currentItem = jsonArray[i];
          //A required property must occur on all items. Remove any proposed required properties not found on current item.
          proposedRequiredProperties = proposedRequiredProperties.filter((property) => Object.keys(currentItem).indexOf(property) > -1);

          // Representative item contains all properties from all items.
          Object.keys(currentItem).forEach((property) => {
            if (representativeItem[property] === undefined) {
              representativeItem[property] = createCopy(currentItem[property]);
            }
          });
        }

        schema.items = generateSchemaFromValue(representativeItem);
        schema.items.required = proposedRequiredProperties.map(tryConvertStringToExpression);
      } else {
        schema.items = generateSchemaFromValue(firstItem);
      }
    }
  }

  return schema;
}

function generateSchemaForObject(obj: any): SchemaObject {
  const schema: SchemaObject = {
    type: Types.object,
    properties: {},
  };

  for (const propertyName of Object.keys(obj)) {
    if (schema.properties) {
      schema.properties[tryConvertStringToExpression(propertyName)] = generateSchemaFromValue(obj[propertyName]);
    }
  }

  return schema;
}

function getJsonSchemaType(value: any): string {
  const type = typeof value;
  switch (type) {
    case 'number':
      return Number.isInteger(value) ? Types.integer : Types.number;

    case 'boolean':
      return Types.boolean;

    case 'string':
      return Types.string;

    case 'object':
      if (value === null) {
        return Types.null;
      } else if (Array.isArray(value)) {
        return Types.array;
      } else {
        return Types.object;
      }

    default:
      throw new InvalidJsonSchemaTypeException(`Unsupported type '${type}' in getJsonSchemaType.`);
  }
}

export function tryConvertStringToExpression(value: string): string {
  if (isTemplateExpression(value)) {
    if (value.charAt(0) === '@') {
      return `@${value}`;
    } else {
      return value.replace(/@{/g, '@@{');
    }
  } else {
    return value;
  }
}
