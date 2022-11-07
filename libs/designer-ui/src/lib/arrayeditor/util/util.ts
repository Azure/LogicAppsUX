import type { ComplexArrayItem } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';

export const getOneDimensionalSchema = (itemSchema: any): any[] => {
  const flattenedSchema = flattenObject(itemSchema);
  const returnVal = Object.keys(flattenedSchema).map((key) => {
    return { type: flattenedSchema[key].type, title: key };
  });
  return returnVal;
};

export const flattenObject = (obj: any) => {
  const flattened: any = {};

  Object.keys(obj).forEach((key) => {
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !value.type) {
      Object.assign(flattened, flattenObject(value));
    } else {
      flattened[key] = value;
    }
  });

  return flattened;
};

export const convertComplexItemtoSchema = (currItems: any, complexItems: ComplexArrayItem[], nodeMap?: Map<string, ValueSegment>) => {
  const schemafiedItem = JSON.parse(JSON.stringify(currItems));

  Object.keys(currItems).forEach((key) => {
    const value = currItems[key];
    if (value && !Array.isArray(value) && !value.type) {
      schemafiedItem[key] = convertComplexItemtoSchema(value, complexItems, nodeMap);
    } else {
      const valueSegments: ValueSegment[] =
        complexItems.find((item) => {
          return item.title === key;
        })?.value ?? [];
      let text = '';
      valueSegments.forEach((segment) => {
        if (segment.type === ValueSegmentType.LITERAL) {
          text += segment.value;
        } else if (segment.token) {
          const { title, value, brandColor } = segment.token;
          const string = `$[${title},${value},${brandColor}]$`;
          text += string;
          nodeMap?.set(string, segment);
        }
        schemafiedItem[key] = text;
      });
    }
  });

  return schemafiedItem;
};
