import type { MapDefinitionEntry } from '../models';
import * as yaml from 'js-yaml';

export const loadMapDefinition = (mapDefinitionString: string | undefined): MapDefinitionEntry => {
  if (mapDefinitionString) {
    // Add extra escapes around custom string values, so that we don't lose which ones are which
    const modifiedMapDefinitionString = mapDefinitionString.replaceAll('"', `\\"`);
    const mapDefinition = yaml.load(modifiedMapDefinitionString) as MapDefinitionEntry;

    // Now that we've parsed the yml, remove the extra escaped quotes to restore the values
    fixMapDefinitionCustomValues(mapDefinition);

    return mapDefinition;
  } else {
    return {};
  }
};

const fixMapDefinitionCustomValues = (mapDefinition: MapDefinitionEntry) => {
  for (const key in mapDefinition) {
    const curElement = mapDefinition[key];
    if (typeof curElement === 'object' && curElement !== null) {
      if (Array.isArray(curElement)) {
        // TODO: Handle arrays better, currently fine for XML, but this will need to be re-addressed
        // when we get to the advanced JSON array functionality
        curElement.forEach((arrayElement) => fixMapDefinitionCustomValues(arrayElement));
      } else {
        fixMapDefinitionCustomValues(curElement);
      }
    } else if (Object.prototype.hasOwnProperty.call(mapDefinition, key) && typeof curElement === 'string') {
      // eslint-disable-next-line no-param-reassign
      mapDefinition[key] = curElement.replaceAll('\\"', '"');
    }
  }
};
