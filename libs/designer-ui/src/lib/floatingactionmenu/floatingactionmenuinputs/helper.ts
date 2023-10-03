import type { DynamicallyAddedParameterInputsModel, DynamicallyAddedParameterInputsProperties } from '.';
import constants from '../../constants';
import type { DynamicallyAddedParameterTypeType } from '../../dynamicallyaddedparameter';
import { DynamicallyAddedParameterType } from '../../dynamicallyaddedparameter';
import {
  getDefaultTitleForDynamicallyAddedParameterType,
  getDescriptionForDynamicallyAddedParameterType,
  getIconForDynamicallyAddedParameterType,
} from '../../dynamicallyaddedparameter/helper';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import type { Schema } from '@microsoft/parsers-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';

type PartialDynamicallyAddedParameterInputsModel = Pick<
  DynamicallyAddedParameterInputsModel,
  'icon' | 'schemaKey' | 'properties' | 'required' | 'title'
>;

/**
 * Sample shape of schema object JSON expected by FlowRP that we are serializing/deserializing for Manual trigger:
 *      object: {
 *          schema: {
 *              type: 'object',
 *              properties: {
 *                  'text' : ...,
 *                  'text_1': ...,
 *                  'number': ...,
 *              },
 *              required: ['text', 'text_1'],
 *          }
 *      }
 * Sample shape of schema object JSON expected by FlowRP that we are serializing/deserializing for Hybrid trigger:
 *         schema: {
 *           rows: {
 *             type: 'array',
 *             items: {
 *               type: 'object',
 *               properties: {
 *                 type: 'object',
 *                 properties: {
 *                   'text' : ...,
 *                   'text_1': ...,
 *                   'number': ...,
 *                 }
 *                 required: ['text', 'text_1'],
 *               },
 *             }
 *           }
 * @param value - valueSegment provided to us by rest of designer parent components
 * @param isRequestApiConnectionTrigger - Flag that sets the rootObject to hybrid trigger schema type.
 * @param onChange - handler to update value when the user changes their input in one of the dynamic parameters
 * @returns - array of props to render DynamicallyAddedParameter editors with
 */
export function deserialize(value: ValueSegment[], isRequestApiConnectionTrigger = false): PartialDynamicallyAddedParameterInputsModel[] {
  if (!value || value.length === 0 || !value[0].value) {
    return [];
  }
  // ASSUMPTION: for manual trigger, we assume there is *only one* ValueSegment which contains the required data
  // ASSUMPTION: for hybrid triggers, the floating action segmets are always nested within rows.items
  const rootObject = JSON.parse(value[0].value);

  const retval: PartialDynamicallyAddedParameterInputsModel[] = [];
  let itemsProperties: any;

  itemsProperties = rootObject;
  if (isRequestApiConnectionTrigger) {
    itemsProperties = rootObject.properties?.rows?.items || rootObject.rows?.items || itemsProperties;
  }

  for (const [schemaKey, propertiesUnknown] of Object.entries(itemsProperties?.properties)) {
    const properties = propertiesUnknown as DynamicallyAddedParameterInputsProperties;
    if (properties) {
      const icon = getIconForDynamicallyAddedParameterType(properties['x-ms-content-hint'] as DynamicallyAddedParameterTypeType);
      const required = rootObject?.required?.includes(schemaKey);
      retval.push({
        icon,
        schemaKey,
        properties,
        required,
        title: properties.title,
      });
    }
  }

  return retval;
}

/**
 * See deserialize function above for sample.
 * @param props - array of props of all DynamicallyAddedParameter editors currently rendered
 * @param isManualTrigger - Flag that sets the rootObject to required schema type.
 * @returns - ValueSegment array with one literal -- value for which is a JSON representation of the dynamically added parameters in the shape expected by FlowRP
 */
export function serialize(models: DynamicallyAddedParameterInputsModel[], isRequestApiConnectionTrigger = false): ValueSegment[] {
  const requiredArray: string[] = [];
  models.forEach((model) => {
    if (model.required) requiredArray.push(model.schemaKey);
  });

  const properties = models
    .map((model) => {
      // Reshape array objects so schemaKey is the key
      return { [model.schemaKey]: model.properties };
    })
    .reduce((resultPropertiesObj, nextProperty) => {
      // Convert array to object; replace array index key with schemaKey
      const [schemaKey, propertyValue] = Object.entries(nextProperty)[0];
      return { ...resultPropertiesObj, [schemaKey]: propertyValue };
    }, {});

  let rootObject: Schema;

  rootObject = {
    type: 'object',
    properties,
    required: requiredArray,
  };

  if (isRequestApiConnectionTrigger) {
    rootObject = {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties,
          required: requiredArray,
        },
      },
    };
  }

  return [
    {
      id: guid(),
      type: ValueSegmentType.LITERAL,
      value: JSON.stringify(rootObject),
    },
  ];
}

export function getEmptySchemaValueSegmentForInitialization(useStaticInputs: boolean, isRequestApiConnectionTrigger = false) {
  let rootObject: Schema;

  rootObject = {
    type: 'object',
    properties: {},
    required: [],
  };

  if (isRequestApiConnectionTrigger) {
    rootObject = {
      rows: {
        type: 'array',
        items: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    };
  }

  if (useStaticInputs) {
    rootObject = rootObjectWithStaticInputs;
  }

  return [
    {
      id: guid(),
      type: ValueSegmentType.LITERAL,
      value: JSON.stringify(rootObject),
    },
  ];
}

export function createDynamicallyAddedParameterProperties(
  itemType: DynamicallyAddedParameterTypeType,
  schemaKey: string
): DynamicallyAddedParameterInputsProperties {
  let format, fileProperties;
  let type = '';
  switch (itemType) {
    case DynamicallyAddedParameterType.Date:
    case DynamicallyAddedParameterType.Email:
      type = constants.SWAGGER.TYPE.STRING;
      format = itemType.toLowerCase();
      break;
    case DynamicallyAddedParameterType.Text:
      type = constants.SWAGGER.TYPE.STRING;
      break;
    case DynamicallyAddedParameterType.File:
      type = constants.SWAGGER.TYPE.OBJECT;
      fileProperties = {
        contentBytes: { type: constants.SWAGGER.TYPE.STRING, format: constants.SWAGGER.FORMAT.BYTE },
        name: { type: constants.SWAGGER.TYPE.STRING },
      };
      break;
    case DynamicallyAddedParameterType.Boolean:
      type = constants.SWAGGER.TYPE.BOOLEAN;
      break;
    case DynamicallyAddedParameterType.Number:
      type = constants.SWAGGER.TYPE.NUMBER;
      break;
  }

  return {
    description: getDescriptionForDynamicallyAddedParameterType(itemType),
    format,
    title: convertDynamicallyAddedSchemaKeyToTitle(schemaKey, itemType),
    type,
    properties: fileProperties,
    'x-ms-content-hint': itemType,
    'x-ms-dynamically-added': true,
  };
}

function convertDynamicallyAddedSchemaKeyToTitle(name: string, itemType: DynamicallyAddedParameterTypeType): string {
  const title = getDefaultTitleForDynamicallyAddedParameterType(itemType);
  let result = title;

  if (name && name.indexOf('_') > -1) {
    const split = name.split('_');
    result = `${title} ${split[1]}`;
  }

  return result;
}

const rootObjectWithStaticInputs = {
  type: 'object',
  properties: {
    'key-button-date': {
      title: 'Date',
      type: 'string',
      'x-ms-dynamically-added': false,
    },
    location: {
      type: 'object',
      properties: {
        fullAddress: {
          title: 'Full address',
          type: 'string',
          'x-ms-dynamically-added': false,
        },
        address: {
          type: 'object',
          properties: {
            countryOrRegion: {
              title: 'Country/Region',
              type: 'string',
              'x-ms-dynamically-added': false,
            },
            city: {
              title: 'City',
              type: 'string',
              'x-ms-dynamically-added': false,
            },
            state: {
              title: 'State',
              type: 'string',
              'x-ms-dynamically-added': false,
            },
            street: {
              title: 'Street',
              type: 'string',
              'x-ms-dynamically-added': false,
            },
            postalCode: {
              title: 'Postal code',
              type: 'string',
              'x-ms-dynamically-added': false,
            },
          },
          required: ['countryOrRegion', 'city', 'state', 'street', 'postalCode'],
        },
        coordinates: {
          type: 'object',
          properties: {
            latitude: {
              title: 'Latitude',
              type: 'number',
              'x-ms-dynamically-added': false,
            },
            longitude: {
              title: 'Longitude',
              type: 'number',
              'x-ms-dynamically-added': false,
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
    },
  },
  required: ['key-button-date', 'location'],
};
