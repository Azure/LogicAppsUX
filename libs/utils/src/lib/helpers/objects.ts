/* eslint-disable @typescript-eslint/ban-types */
import { equals } from './functions';

/**
 * Returns a property's value from an object, using a case-insensitive search on the property path.
 * sample
 *      object: {
 *          prop1: {
 *              prop2: 'val'
 *          }
 *      }
 *      properties: ['prop1', 'prop2']
 *
 *      result : 'val'
 * @arg {Object} object - The object for search.
 * @arg {string[]} propertyPath - The ordered array of property according to its path in object.
 * @arg [boolean] caseInsensitive - Whether to use a case insensitive comparison on property names.
 * @return {any} - The value of the property, if found. Otherwise, undefined.
 */
export function getObjectPropertyValueTyped<T>(object: T, properties: (keyof T & string)[]): ValueOf<T> | undefined {
  // Danielle to refactor to remove type any
  let value;
  for (const property of properties) {
    value = getPropertyValueTyped(object, property);
  }

  return value;
}

type ValueOf<T> = T[keyof T];

type StringKeyOf<T> = keyof T & string;
/**
 * Gets the value for the specified property case-insensitively.
 * @arg {Object} object - The object.
 * @arg {string} propertyName - The property name.
 * @arg [boolean] caseInsensitive - Whether to use a case insensitive comparison on property names.
 * @return {any} - The value of the property, if found. Otherwise, undefined.
 */
export function getPropertyValueTyped<T>(object: T, propertyName: StringKeyOf<T>): ValueOf<T> | undefined {
  // Danielle to refactor to remove type any

  const value = object[propertyName]; // tslint:disable-line: no-any
  if (value !== undefined) {
    return value;
  }

  const keys = Object.keys(object);

  for (const key of keys as StringKeyOf<T>[]) {
    if (equals(key, propertyName)) {
      return object[key] as ValueOf<T>; // tslint:disable-line: no-any
    }
  }

  return undefined;
}
