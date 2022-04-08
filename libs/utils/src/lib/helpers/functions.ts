type Primitive = number | boolean | string;
type NonPrimitive = Record<string, unknown>;

/**
 * Aggregates an array of arrays of type T into a single array of type T.
 * @arg {T[][] | null | undefined} array - An array of arrays of elements of type T to aggregate.
 * @return {T[]} - An array of elements of type T
 */
export function aggregate<T>(array: T[][] | null | undefined): T[] {
  array = array || [];
  return array.reduce((previous, current) => previous.concat(current), []);
}

/**
 * Returns if two arrays of primitive values are equal.
 * @arg {(T | undefined)[] | null | undefined} a - An array to compare.
 * @arg {(T | undefined)[] | null | undefined} b - Another array to compare.
 * @return {boolean} True if the two arrays contain the same primitive at every index.
 */
export function arrayEquals<T extends Primitive>(
  a: (T | undefined)[] | null | undefined,
  b: (T | undefined)[] | null | undefined
): boolean {
  if (!a || !b) {
    return a === b;
  }

  return a.length === b.length && a.every((element: T | undefined, index: number) => element === b[index]);
}

/**
 * Returns if two arrays of non primitive values are equal.
 * @arg {T[] | null | undefined} a - An array to compare.
 * @arg {T[] | null | undefined} b - Another array to compare.
 * @arg {(T, T) => boolean} compareFunction - Function to compare elements. Default value is Strict Equality (===).
 * @return {boolean} True if the two arrays contain the same value at every index using isEqual.
 */
export function nonPrimitivesArrayEquals<T extends NonPrimitive>(
  a: (T | null | undefined)[] | null | undefined,
  b: (T | null | undefined)[] | null | undefined,
  compareFunction: (aValue: T | null | undefined, bValue: T | null | undefined) => boolean
): boolean {
  if (!a || !b) {
    return a === b;
  }

  return a.length === b.length && a.every((element, index) => compareFunction(element, b[index]));
}

/**
 * Returns if two arrays of primitive values are equal.
 * @arg {T[] | null | undefined} a - An array to compare.
 * @arg {T[] | null | undefined} b - Another array to compare.
 * @return {boolean} True if the two arrays contain same elements unsorted.
 */
export function arrayEqualsOrderInsensitive<T extends Primitive>(
  a: (T | undefined)[] | null | undefined,
  b: (T | undefined)[] | null | undefined
): boolean {
  if (!a || !b) {
    return a === b;
  }

  if (a.length !== b.length) {
    return false;
  }

  const counts: Map<Primitive | undefined, number> = new Map();

  for (const aValue of a) {
    const currentCount = counts.get(aValue);

    counts.set(aValue, currentCount ? currentCount + 1 : 1);
  }

  for (const bValue of b) {
    const currentCount = counts.get(bValue);

    if (!currentCount || currentCount < 1) {
      return false;
    }

    counts.set(bValue, currentCount - 1);
  }

  return true;
}

/**
 * Returns true if two strings are equal, doing case-insensitive comparisons by default.
 * @arg {string | null | undefined} x - A string to compare.
 * @arg {string | null | undefined} y - Another string to compare.
 * @arg {boolean} [caseInsensitive=true] - True if the comparison should be case-insensitive.
 * @return {boolean} - True if the two strings are equal.
 */
export function equals(x: string | null | undefined, y: string | null | undefined, caseInsensitive = true) {
  if (caseInsensitive) {
    return !isNullOrUndefined(x) && !isNullOrUndefined(y) && x.toLowerCase() === y.toLowerCase();
  } else {
    return !isNullOrUndefined(x) && !isNullOrUndefined(y) && x === y;
  }
}

/**
 * Returns true if the csv string contains the value, doing case-insensitive comparison by default.
 * @arg {string} csv - A csv string.
 * @arg {string} value - A value string.
 * @arg {boolean} [caseInsensitive=true] - True if the comparison should be case-insensitive.
 * @return {boolean} - True if the csv contains the value.
 */
export function csvContains(csv: string | null | undefined, value: string | null | undefined, caseInsensitive = true): boolean {
  if (!csv || !value) {
    return false;
  }

  return csv.split(',').some((v) => equals(v, value, caseInsensitive));
}

/**
 * Returns true if the first string contains second string, doing case-insensitive comparisons by default.
 * @arg {string} str - A string to compare.
 * @arg {string} substring - Substring.
 * @arg {boolean} [caseInsensitive=true] - True if the comparison should be case-insensitive.
 * @return {boolean} - True if the first string contains the substring
 */
export function includes(str: string, substring: string, caseInsensitive = true) {
  if (caseInsensitive) {
    return !isNullOrUndefined(str) && !isNullOrUndefined(substring) && str.toLowerCase().indexOf(substring.toLowerCase()) > -1;
  } else {
    return !isNullOrUndefined(str) && !isNullOrUndefined(substring) && str.indexOf(substring) > -1;
  }
}

/**
 * Returns the first item in the array that meets the condition.
 * @arg {(x: T) => boolean} conditionFunction - A function used to test if an item meets the condition
 * @arg {T[]} array - An array to search
 * @return {T | undefined} - The first item that meets the condition, or undefined if no items meet the condition
 */
export function first<T>(conditionFunction: (x: T) => boolean, array: T[]): T | undefined {
  for (const element of array) {
    if (conditionFunction(element)) {
      return element;
    }
  }

  return undefined;
}

/**
 * Remove the keys from the StringMap.
 * @arg {Record<string, T>} object - The StringMap.
 * @arg {string[]} keys - The keys.
 * @return {boolean} - True if any of the keys was removed.
 */
export function removeKeys<T>(object: Record<string, T>, keys: string[]): boolean {
  return (
    (keys ? keys : [])
      .filter((key) => Object.prototype.hasOwnProperty.call(object, key))
      .map((key) => delete object[key])
      .filter((isSuccessful) => isSuccessful).length > 0
  );
}

/**
 * Removes the item from the list of items given.
 * @arg {string[]} array - List of items to remove from.
 * @arg {string} itemToRemove - Item to be removed from the list.
 * @return {void}
 */
export function remove(array: string[], itemToRemove: string): void {
  if (!isNullOrUndefined(array)) {
    const index = array.indexOf(itemToRemove);
    if (index >= 0) {
      array.splice(index, 1);
    }
  }
}

/**
 * Excludes items from the given array.
 * @arg {string[]} array - List of items to exclude from.
 * @arg {string[]} itemsToExclude - List of items to exclude.
 */
export function exclude(array: string[], itemsToExclude: string[]): void {
  if (!isNullOrUndefined(array) && !isNullOrUndefined(itemsToExclude)) {
    for (const itemToExclude of itemsToExclude) {
      remove(array, itemToExclude);
    }
  }
}

/**
 * Gets the value for the specified property case-insensitively.
 * @arg {Object | null | undefined} object - The object.
 * @arg {string} propertyName - The property name.
 * @arg [boolean] caseInsensitive - Whether to use a case insensitive comparison on property names.
 * @return {any} - The value of the property, if found. Otherwise, undefined.
 */
export function getPropertyValue(object: Record<string, unknown> | null | undefined, propertyName: string, caseInsensitive = true): any {
  object = object || {};

  if (propertyName === '__proto__' || propertyName === 'constructor') throw new Error('attempting to access protected properties');
  // NOTE(tonytang): This is an optimization for when property name matches case sensitively.
  const value = (object as any)[propertyName];
  if (value !== undefined) {
    return value;
  }

  for (const key of Object.keys(object)) {
    if (equals(key, propertyName, caseInsensitive)) {
      return (object as any)[key];
    }
  }

  return undefined;
}

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
export function getObjectPropertyValue(object: Record<string, unknown>, properties: string[], caseInsensitive = true): any {
  let value = object || {};

  for (const property of properties) {
    value = getPropertyValue(value, property, caseInsensitive);
  }

  return value;
}

/**
 * Sets a property's value in an object, using a case-insensitive search on the property path.
 * sample
 *      object: {
 *          prop1: {
 *              prop2: 'val'
 *          }
 *      }
 *      properties: ['prop1', 'prop2']
 *      value: 'val2'
 *
 * @arg {Object} object - The object for search.
 * @arg {string[]} properties - The ordered array of property according to its path in object.
 * @arg {any} value
 * @return {void}
 */
export function setObjectPropertyValue(object: Record<string, unknown>, properties: string[], value: any): void {
  if (!properties.length || !object) {
    return;
  }

  for (let i = 0; i < properties.length - 1; i++) {
    object = getPropertyValue(object, properties[i]);
  }

  const lastProperty = properties[properties.length - 1];
  if (lastProperty) {
    (object as any)[lastProperty] = value;
  }
}

/**
 * Safely sets a property's value in an object, using a case-insensitive search on the property path.
 * @arg {Record<string, any> | null | undefined} target - The target object.
 * @arg {string[]} properties - The ordered array of property according to its path in object.
 * @arg {any} value - The value
 * @return {Record<string, any>} - The updated object.
 */
export function safeSetObjectPropertyValue(
  target: Record<string, any> | null | undefined,
  properties: string[],
  value: any
): Record<string, any> | null | undefined {
  if (properties.includes('__proto__') || properties.includes('constructor')) throw new Error('attempting to access protected properties');
  if (!properties.length) {
    return value;
  }

  target = target || {};

  let current = target;
  for (let i = 0; i < properties.length - 1; i++) {
    const parent = current;
    const propertyName = properties[i];
    current = getPropertyValue(current, propertyName);
    if (typeof current !== 'object') {
      current = {};
      parent[propertyName] = current;
    }
  }

  let property = properties[properties.length - 1];
  for (const key of Object.keys(current)) {
    if (equals(key, property)) {
      property = key;
      break;
    }
  }

  current[property] = value;

  return target;
}

/**
 * Deletes a property in an object, using a case-insensitive search on the property path.
 * sample
 *      object: {
 *          prop1: {
 *              prop2: 'val',
 *              prop3: 'val1'
 *          }
 *      }
 *      properties: ['prop1', 'prop2']
 *      result : object: {
 *              prop1: {
 *                  prop3: 'val1'
 *              }
 *          }
 *
 * @arg {Object} object - The object for search.
 * @arg {string[]} properties - The ordered array of property according to its path in object.
 * @return {void}
 */
export function deleteObjectProperty(object: Record<string, unknown>, properties: string[]): void {
  if (properties.includes('__proto__') || properties.includes('constructor')) throw new Error('attempting to access protected properties');
  if (!properties.length || !object) {
    return;
  }

  for (let i = 0; i < properties.length - 1; i++) {
    object = getPropertyValue(object, properties[i]);
    if (!object) {
      return;
    }
  }

  const lastProperty = properties[properties.length - 1];
  if (lastProperty) {
    delete (object as any)[lastProperty];
  }
}

/**
 * Deletes a list of properties from an object, using a case-insensitive search on the property path.
 * sample
 *      object: {
 *          prop1: {
 *              prop2: 'val',
 *              prop3: 'val1'
 *          },
 *          prop4: {
 *              prop5: 'val2',
 *              prop6: 'val3'
 *          }
 *      }
 *      properties: [['prop1', 'prop2'], ['prop4', 'prop5']]
 *      result : object: {
 *              prop1: {
 *                  prop3: 'val1'
 *              },
 *              prop4: {
 *                  prop6: 'val3'
 *              }
 *          }
 *
 * @arg {Object} object - The object for search.
 * @arg {string[][]}  properties- The list of the ordered array of property according to its path in object.
 * @return {void}
 */
export function deleteObjectProperties(object: Record<string, unknown>, properties: string[][]): void {
  if (!properties.length || !object) {
    return;
  }

  for (const property of properties) {
    deleteObjectProperty(object, property);
  }
}

/**
 * Returns true if an object has a property whose name is case-insensitive.
 * @arg {Object} object - An object to search.
 * @arg {string} property - The property to search for.
 * @return {boolean} - True if the object has the property.
 */
export function hasProperty(object: Record<string, unknown>, property: string): boolean {
  return typeof object === 'object' && Object.keys(object).some((key) => equals(key, property));
}

/**
 * Returns true if the value is a string.
 * @arg {any} value - The value to check if string.
 * @return {boolean} - True if the value is a string.
 */
export function isString(value: any): value is string {
  return typeof value === 'string';
}

/**
 * Returns true if the value is boolean.
 * @arg {any} value - The value to check if boolean.
 * @return {boolean} - True if the value is boolean.
 */
export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Returns true if the value is an empty string ("").
 * @arg {any} value - The value to check if empty string.
 * @return {boolean} - True if the value is an empty string ("").
 */
export function isEmptyString(value: string): value is '' {
  return value === '';
}

/**
 * Returns true if a value is null or undefined.
 * @arg {any} value - The value to check if null or undefined.
 * @return {boolean} - True if the value is null or undefined.
 */
export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Returns true if a value is null or empty object.
 * @arg {any} value - The value to check if null or empty object.
 * @return {boolean} - True if the value is null or empty object.
 */
export function isNullOrEmpty(value: any): boolean {
  if (typeof value === 'object') {
    return !value || !Object.keys(value).length;
  } else {
    return !value;
  }
}

/**
 * Returns true if a value is undefined or empty string.
 * @arg {any} value - The value to check if undefined empty string.
 * @return {boolean} - True if the value is undefined or empty string.
 */
export function isUndefinedOrEmptyString(value: any): value is undefined | '' {
  return value === undefined || value === '';
}

/**
 * Returns true if a value is an object.
 * @arg {any} value - The value to check if it is an object.
 * @return {boolean} - True if the value is an object.
 */
export function isObject(value: any): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Returns true if the icon url is valid
 * @arg {string} icon - The icon url
 * @return {boolean} - True if the string is a valid icon url
 */
export function isValidIcon(icon: string): boolean {
  return !!icon && (/^https:\/\//i.test(icon) || /^data:image\//i.test(icon));
}

/**
 * Returns a string map of type T from an array of type T.
 * @arg {T[] | null | undefined} array - An array of type T.
 * @arg {string | null | undefined} keyName - The name of the property with the key identifying the item.
 * @return {Record<string, T>} - An object mapping string keys to elements of type T.
 */
export function map<T>(
  array: T[] | null | undefined,
  keyName: string | null | undefined
): Record<string, T> {
  if (!keyName) {
    throw new Error('key required');
  }

  array = array || [];

  const object: Record<string, T> = {};
  for (const value of array.filter((element) => Object.prototype.hasOwnProperty.call(element, keyName))) {
    const key = (value as any)[keyName];
    object[key] = value;
  }

  return object;
}

/**
 * Returns an array of elements from a string map of type T.
 * @arg {Record<string, T> | null | undefined} object - A JavaScript object with named properties to map to an array.
 * @arg {string} [keyName] - The name of the property to add to the object with the element's key.
 * @return {T[]} - An array of elements of type T from a JavaScript object.
 */
export function unmap<T>(object: Record<string, T> | null | undefined, keyName?: string): T[] {
  const obj = object || {};
  return Object.keys(obj).map((key) => {
    const element = obj[key];

    if (keyName) {
      (element as any)[keyName] = key;
    }

    return element;
  });
}

/**
 * Clones an object.
 * @arg {T} source - The source object.
 * @return {T}
 */
export function clone<T>(source: T): T {
  return extend({}, source);
}

export interface CopyOptions {
  copyNonEnumerableProps?: boolean;
}

/**
 * Copies the properties of the second object into first object and does a deep copy.
 * @arg {CopyOptions} options - The copy options.
 * @arg {any} target - The target object.
 * @arg {any[]} [...sources] - The array of objects whose properties are to be copied.
 * @return object - the result target object.
 */
export function copy(options: CopyOptions, target: any, ...sources: any[]): any {
  if (!sources) {
    return target;
  }

  for (const source of sources) {
    if (source) {
      const keys = options.copyNonEnumerableProps ? new Set(Object.getOwnPropertyNames(source)) : Object.keys(source);
      for (const key of keys) {
        target[key] = createCopy(source[key], options);
      }
    }
  }

  return target;
}

/**
 * Extends the properties of the second object into first object and does a deep copy.
 * @arg {any} target - The target object.
 * @arg {any[]} [...sources] - The array of objects whose properties are to be copied.
 * @return object - the result target object
 */
export function extend(target: any, ...sources: any[]): any {
  return copy({ copyNonEnumerableProps: false }, target, ...sources);
}

/**
 * Gets the unique list from the given array.
 * @arg {any[]} array - The source array.
 * @return {any[]} - The unique list of elements from the given array.
 */
export function uniqueArray(array: any[]): any[] {
  const result: any[] = [],
    temp: any = {};
  for (let i = 0, l = array.length; i < l; ++i) {
    if (!Object.prototype.hasOwnProperty.call(temp, array[i])) {
      result.push(array[i]);
      temp[array[i]] = 1;
    }
  }

  return result;
}

/**
 * Creates a deep copy of an array.
 * @arg {any[] | null | undefined} array - The source array.
 * @arg {CopyOptions} options - The copy options.
 * @return {any[] | null} - The result of the copied array or null if no array was provided.
 */
export function copyArray(array: any[] | null | undefined, options?: CopyOptions): any[] | null {
  if (!array) {
    return null;
  }

  return array.map((value: any) => {
    return createCopy(value, options);
  });
}

/**
 * @arg {string} input
 * @arg {any[]} [...args]
 * @return {string}
 */
export function format(input: string, ...args: any[]): string {
  const namedFormatSpecifierRegex = /\{[a-zA-Z$_\d]*\}/g;
  const numberedFormatSpecifierRegex = /\{(\d+)\}/g;
  let matched = false,
    retVal = input;

  if (args && args.length === 1 && args[0] && typeof args[0] === 'object') {
    const namedArgs: any = args[0];
    retVal = input.replace(namedFormatSpecifierRegex, (match) => {
      const name = match.substring(1, match.length - 1);
      if (Object.prototype.hasOwnProperty.call(namedArgs, name)) {
        matched = true;
        return namedArgs[name];
      } else {
        return match;
      }
    });
  }

  if (!matched) {
    retVal = input.replace(numberedFormatSpecifierRegex, (match, num) => {
      return args.length > num ? args[num] : match;
    });
  }

  return retVal;
}

/**
 * @arg {string} prefix
 * @arg {string[]} list
 * @arg {number} [start=2]
 * @return {string}
 */
export function generateUniqueName(prefix: string, list: string[], start = 2, alwaysIncludeIndex = false): string {
  const hashMap: Record<string, any> = {};
  let uniqueName = alwaysIncludeIndex ? `${prefix}_${start}` : prefix;

  for (const item of list) {
    hashMap[item] = true;
  }

  let i = start;
  while (getPropertyValue(hashMap, uniqueName)) {
    uniqueName = `${prefix}_${i++}`;
  }
  return uniqueName;
}

/**
 * @arg {string} value
 * @arg {string} prefixString
 * @return {boolean}
 */
export function startsWith(value: string, prefixString: string): boolean {
  const testString = `${value}`;
  return !!testString && !!prefixString && equals(testString.substring(0, prefixString.length), prefixString);
}

/**
 * @arg {string} value
 * @arg {string} suffixString
 * @return {boolean}
 */
export function endsWith(value: string, suffixString: string): boolean {
  const testString = `${value}`;

  return !!testString && !!suffixString && equals(testString.substr(testString.length - suffixString.length), suffixString);
}

/**
 * Trims the string of the given character the unique list from the given array.
 * @arg {string} value - The given string.
 * @arg {string} char - The character to be trimmed.
 * @return {string} - The trimmed string.
 */
export function trim(value: string, char: string): string {
  let updatedValue: string = value;

  if (updatedValue.length < char.length) {
    return value;
  }

  if (startsWith(updatedValue, char)) {
    updatedValue = updatedValue.length > 1 ? updatedValue.substr(char.length) : '';
  }

  if (endsWith(updatedValue, char)) {
    updatedValue = updatedValue.length > 1 ? updatedValue.substring(0, updatedValue.length - char.length) : '';
  }

  return updatedValue;
}

/**
 * @arg {string} value
 * @arg {string} prefix
 * @return {string}
 */
export function addPrefix(value: string | null | undefined, prefix: string | null | undefined): string | null | undefined {
  if (!!value && !!prefix && !startsWith(value, prefix)) {
    value = `${prefix}${value}`;
  }

  return value;
}

/**
 * @arg {string} value
 * @return {any}
 */
export function getJSONValue(value: string): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * @arg {any} value
 * @arg {CopyOptions} options - The copy options.
 * @return {any}
 */
export function createCopy(value: any, options?: CopyOptions): any {
  if (Array.isArray(value)) {
    return copyArray(value, options);
  } else if (value instanceof Date) {
    return new Date(value.valueOf());
  } else if (!!value && typeof value === 'object') {
    return copy({ copyNonEnumerableProps: false, ...options }, {}, value);
  } else {
    return value;
  }
}

/**
 * @arg {Record<string, any>} originalObjects
 * @arg {Record<string, any} newObjects
 * @return {Record<string, any>}
 */
export function combineObjects(originalObjects: Record<string, any>, newObjects: Record<string, any>): Record<string, any> {
  return Object.keys(newObjects).reduce(
    (previous, current) => extend({}, previous, { [current]: newObjects[current] }),
    clone(originalObjects)
  );
}

/**
 * @arg {string} value
 * @return {boolean}
 */
export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * @arg {number[]} values - An array of numbers.
 * @return {number} - The sum of the numbers in the array.
 */
export function sum(values: number[]): number {
  return values.reduce((previous, current) => previous + current, 0);
}

/**
 * @arg {T[]} values - An array of elements of type T.
 * @arg {(value: T) => number} mapFn - A function mapping an element of type T to a number.
 * @return {number} - The sum of the numbers mapped from the array of elements of type T.
 */
export function mapsum<T>(values: T[], mapFn: (value: T) => number): number {
  return sum(values.map(mapFn));
}

/**
 * Use cross-browser URLUtils to parse the pathname and query string from a URI.
 * @arg {string} uri - A string with a URI
 * @return {string} - A string with the pathname
 *
 * Remarks:
 * URLUtils encodes URI components so decode them before using them in _processPathInputs
 */
export function parsePathnameAndQueryKeyFromUri(uri: string): { pathname: string; queryKey: Record<string, string> } {
  const el = document.createElement('a');
  el.href = uri;

  const { pathname, search } = el;
  // NOTE(johnwa): enforce add prefx /, which is not included in IE, and remove the original / to pathname if it contains any,
  // to make sure it return the same path cross browsers
  return {
    pathname: `/${decodeURIComponent(pathname.replace(/(^\/+)/g, ''))}`,
    queryKey: extractQueryKeyFromSearch(search),
  };
}

/**
 * Extract query string parameters from a URLUtils search value (full query string including ?).
 *
 * Remarks:
 * URLUtils encodes query strings so decode these before using them in _getInputsFromDefinition
 *
 * @arg {string} search - A string with the search property value from URLUtils
 * @return {Record<string, string>} - An object mapping query string parameter names to query string parameter values.
 */
function extractQueryKeyFromSearch(search: string): Record<string, string> {
  const queryKey: Record<string, string> = {};
  search = search.slice(search[0] === '?' ? 1 : 0);
  if (!search) {
    return queryKey;
  }

  const re = /(?:^|&)([^&=]*)=?([^&]*)/g;
  let matches: RegExpExecArray | null;
  while ((matches = re.exec(search)) !== null) {
    const [, key, value] = matches;
    queryKey[decodeURIComponent(key)] = decodeURIComponent(value);
  }

  return queryKey;
}

/**
 * Convert hex color string to rgba format string.
 * The input hexColor must be valid hex color format, like #FFF, #003366 etc, otherwise, it will throw error
 * @arg {string} hexColor - A valid hex color format
 * @arg {number} opacity - the opacity value for the rgba color, it's optional and in default it would be 1
 * @return {string} - The rgba color string
 */
export function hexToRgbA(hexColor: string, opacity?: number) {
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hexColor)) {
    let rgbColor = hexColor.substring(1).split('');
    if (rgbColor.length === 3) {
      rgbColor = [rgbColor[0], rgbColor[0], rgbColor[1], rgbColor[1], rgbColor[2], rgbColor[2]];
    }
    const hexValue: number = parseInt(`0x${rgbColor.join('')}`, 16);
    opacity = opacity || 1;
    return `rgba(${[(hexValue >> 16) & 255, (hexValue >> 8) & 255, hexValue & 255].join(',')}, ${opacity})`;
  }

  throw new Error('Invalid Hex color value');
}

/**
 * Use when setting optionally specified properties in object spread operations.
 * If value is defined, return an object with the specified property set to the specified value.
 * If value is undefined, return undefined.
 * @arg {string} key - A string with the property's key.
 * @arg {T | undefined} value - A possibly undefined value of type T.
 */
export function optional<T>(key: string, value: T | undefined): { [key: string]: T } | undefined {
  return value !== undefined ? { [key]: value } : undefined;
}

/**
 * Walks up the DOM tree to find a parent based on a predicate
 * @arg {HTMLElement} startingElement
 * @arg {(HTMLElement) => boolean} predicateFunction
 * @returns the first element matching the predicate. Undefined if none.
 */
export function findAncestorElement(
  startingElement: HTMLElement,
  predicateFunction: (currentElement: HTMLElement) => boolean
): HTMLElement | undefined {
  let currentElement: HTMLElement | null = startingElement;

  while (currentElement) {
    if (predicateFunction(currentElement)) {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  return undefined;
}
