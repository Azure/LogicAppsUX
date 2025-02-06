import { guid, type MapDefinitionEntry } from '@microsoft/logic-apps-shared';
import { parse } from 'yaml';

/*
  Note: This method is copied into the commands.ts file in the vs-code-data-mapper package
  if this method gets updated, both need to be updated to keep them in sync. This method is the source of
  truth for both spots. This set up exists as a copy to avoid a package import issue.
  */
export const loadMapDefinition = (mapDefinitionString: string | undefined): MapDefinitionEntry => {
  if (mapDefinitionString) {
    // Add extra escapes around custom string values, so that we don't lose which ones are which
    let modifiedMapDefinitionString = mapDefinitionString.replaceAll('"', `\\"`);
    modifiedMapDefinitionString = modifiedMapDefinitionString.replaceAll(`$for`, () => `${guid()}-$for`);
    modifiedMapDefinitionString = modifiedMapDefinitionString.replaceAll(`$if`, () => `${guid()}-$if`);
    const mapDefinition = parse(modifiedMapDefinitionString,  { strict: false, uniqueKeys: false}) as MapDefinitionEntry;

    // Now that we've parsed the yml, remove the extra escaped quotes to restore the values
    fixMapDefinitionCustomValues(mapDefinition);

    return mapDefinition;
  }
  return {};
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
