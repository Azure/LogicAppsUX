import {
  addPrefix,
  aggregate,
  arrayEquals,
  arrayEqualsOrderInsensitive,
  combineObjects,
  copyArray,
  csvContains,
  deleteObjectProperties,
  deleteObjectProperty,
  endsWith,
  equals,
  exclude,
  extend,
  findAncestorElement,
  first,
  format,
  generateUniqueName,
  getJSONValue,
  getObjectPropertyValue,
  getPropertyValue,
  hasProperty,
  hexToRgbA,
  includes,
  isBoolean,
  isEmptyString,
  isNullOrEmpty,
  isNullOrUndefined,
  isObject,
  isString,
  isUndefinedOrEmptyString,
  isValidIcon,
  isValidJSON,
  map,
  mapsum,
  nonPrimitivesArrayEquals,
  optional,
  parsePathnameAndQueryKeyFromUri,
  remove,
  removeKeys,
  safeSetObjectPropertyValue,
  setObjectPropertyValue,
  sum,
  trim,
  uniqueArray,
  unmap,
} from './../functions';

describe('lib/helpers/functions', () => {
  it('aggregate', () => {
    expect(aggregate(null)).toHaveLength(0);
    expect(aggregate([['a'], ['b']])).toHaveLength(2);
  });

  it('arrayEquals', () => {
    expect(arrayEquals(['a'], ['b', 'c'])).toBeFalsy();
    expect(arrayEquals(['a'], ['a'])).toBeTruthy();
  });

  it('arrayEqualsOrderInsensitive', () => {
    expect(arrayEqualsOrderInsensitive(['a'], ['b', 'c'])).toBeFalsy();
    expect(arrayEqualsOrderInsensitive(['a', 'b'], ['b', 'a'])).toBeTruthy();
  });

  it('equals', () => {
    expect(equals('a', 'b')).toBeFalsy();
    expect(equals('a', 'A')).toBeTruthy();
    expect(equals('a', 'a', false)).toBeTruthy();
    expect(equals('a', 'A', false)).toBeFalsy();
  });

  describe('addPrefix', () => {
    const originalValue = 'test';
    const prefix = '/';

    it('should add a prefix only when prefix and value is non empty', () => {
      const result = addPrefix(originalValue, prefix);

      expect(result).toEqual('/test');
    });

    it('should return the original value when prefix or original value is empty', () => {
      let result = addPrefix('', '');
      expect(result).toEqual('');

      result = addPrefix(originalValue, '');
      expect(result).toEqual(originalValue);

      result = addPrefix('', prefix);
      expect(result).toEqual('');
    });

    it('should return the original value when prefix or original value is null/undefined', () => {
      let result = addPrefix(null, undefined);
      expect(result).toBeNull();

      result = addPrefix(originalValue, null);
      expect(result).toEqual(originalValue);

      result = addPrefix(undefined, prefix);
      expect(result).toBeUndefined();
    });
  });

  describe('aggregate', () => {
    it('returns [] if you try to aggregate null or undefined', () => {
      expect(aggregate(null)).toEqual([]);
      expect(aggregate(undefined)).toEqual([]);
    });

    it('returns a flattened array if you try to aggregate an array of arrays', () => {
      expect(
        aggregate([
          [1, 2],
          [3, 4],
          [5, 6],
        ])
      ).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('arrayEquals', () => {
    it('should return false if one of the arrays undefined', () => {
      expect(arrayEquals([1], undefined)).toBe(false);
      expect(arrayEquals([1], null)).toBe(false);
    });

    it('should return true if both arrays are undefined', () => {
      expect(arrayEquals(undefined, undefined)).toBe(true);
    });

    it('should return false if arrays are of different length', () => {
      expect(arrayEquals([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should return false if primitive elements within the arrays do not match', () => {
      expect(arrayEquals([1, 9], [1, 2])).toBe(false);
    });

    it('should return true arrays contain same primitives', () => {
      expect(arrayEquals([1, 2], [1, 2])).toBe(true);
      expect(arrayEquals(['A'], ['A'])).toBe(true);
      expect(arrayEquals([true, false], [true, false])).toBe(true);
    });
  });

  describe('arrayEqualsOrderInsensitive', () => {
    it('should return false if one of the arrays undefined', () => {
      expect(arrayEqualsOrderInsensitive([1], undefined)).toBe(false);
      expect(arrayEqualsOrderInsensitive([1], null)).toBe(false);
    });

    it('should return true if both arrays are undefined', () => {
      expect(arrayEqualsOrderInsensitive(undefined, undefined)).toBe(true);
    });

    it('should return false if arrays are of different length', () => {
      expect(arrayEqualsOrderInsensitive([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should return false if primitives within the arrays do not match', () => {
      expect(arrayEqualsOrderInsensitive([1, 9], [1, 2])).toBe(false);
      expect(arrayEqualsOrderInsensitive([1, 1, 2], [1, 2, 2])).toBe(false);
      expect(arrayEqualsOrderInsensitive([true, true, false], [true, false, false])).toBe(false);
    });

    it('should return true when arrays contain same primitives', () => {
      expect(arrayEqualsOrderInsensitive([1, 2], [1, 2])).toBe(true);
      expect(arrayEqualsOrderInsensitive(['A'], ['A'])).toBe(true);
      expect(arrayEqualsOrderInsensitive([false, true], [false, true])).toBe(true);
    });

    it('should return true when arrays contain same primitives in different order', () => {
      expect(arrayEqualsOrderInsensitive([3, 2, 4, 1], [1, 4, 3, 2])).toBe(true);
      expect(arrayEqualsOrderInsensitive(['B', 'D', 'A', 'C'], ['D', 'B', 'C', 'A'])).toBe(true);
      expect(arrayEqualsOrderInsensitive([false, false, true, true], [true, false, true, false])).toBe(true);
    });
  });

  describe('combineProperties', () => {
    it('combines the StringMap key values correctly', () => {
      const originalObjects = {
        any: {
          outputs: [
            {
              isAdvanced: false,
              name: 'key-body-output',
              title: 'Body',
            },
          ],
        },
      };
      const newObjects = {
        integer: {
          outputs: [
            {
              isAdvanced: '',
              isInsideArray: true,
              name: 'code',
              parentArray: 'phoneNumber',
              title: 'code',
            },
          ],
        },
        string: {
          outputs: [
            {
              isAdvanced: '',
              name: 'address.streetAddress',
              source: 'schema',
              title: 'streetAddress',
            },
          ],
        },
      };
      const combinedResult = {
        any: {
          outputs: [
            {
              isAdvanced: false,
              name: 'key-body-output',
              title: 'Body',
            },
          ],
        },
        integer: {
          outputs: [
            {
              isAdvanced: '',
              isInsideArray: true,
              name: 'code',
              parentArray: 'phoneNumber',
              title: 'code',
            },
          ],
        },
        string: {
          outputs: [
            {
              isAdvanced: '',
              name: 'address.streetAddress',
              source: 'schema',
              title: 'streetAddress',
            },
          ],
        },
      };

      expect(combineObjects(originalObjects, newObjects)).toEqual(combinedResult);
    });
  });

  describe('copyArray', () => {
    it('does a deep copy of array containing complex objects into new location', () => {
      const arrayObject = [
        {
          k1: {
            a: 'a',
          },
          k2: 'b',
        },
        {
          k1: {
            a: 'c',
          },
          k2: 'd',
        },
      ];

      const copiedValue = copyArray(arrayObject) as any[];
      expect(copiedValue).not.toBeNull();
      expect(copiedValue.length).toEqual(2);

      const firstValue = copiedValue[0];
      expect(Object.keys(firstValue).length).toEqual(2);
      expect(firstValue['k1']['a']).toEqual('a');
      expect(firstValue['k2']).toEqual('b');

      const secondValue = copiedValue[1];
      expect(Object.keys(secondValue).length).toEqual(2);
      expect(secondValue['k1']['a']).toEqual('c');
      expect(secondValue['k2']).toEqual('d');

      // Modify object value in the actual array and this should not update the copied one
      arrayObject[0].k1.a = 'e';

      expect(firstValue['k1']['a']).toEqual('a');
      expect(arrayObject[0].k1.a).toEqual('e');
    });

    it('returns null if passed nothing (null or undefined)', () => {
      expect(copyArray(null)).toBeNull();
      expect(copyArray(undefined)).toBeNull();
    });
  });

  describe('deleteObjectProperties', () => {
    const initialObject = {
      property1: {
        property2: {
          property3: 'blah',
          property4: 'bluh',
          property5: 'bloh',
        },
        property6: 'bleh',
      },
    };

    it('should delete with given path in the object for multiple properties', () => {
      deleteObjectProperties(initialObject, [
        ['property1', 'property2', 'property3'],
        ['property1', 'property2', 'property4'],
      ]);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property2: { property5: 'bloh' }, property6: 'bleh' } }));
    });

    it('should delete with given path in the object for a single property', () => {
      deleteObjectProperties(initialObject, [['property1', 'property2']]);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property6: 'bleh' } }));
    });

    it('should not update the object if the array of given property paths is empty', () => {
      deleteObjectProperties(initialObject, []);
      expect(initialObject).toEqual(initialObject);
    });

    it('should not update the object if the some property path in the given array empty ', () => {
      deleteObjectProperties(initialObject, [[]]);
      expect(initialObject).toEqual(initialObject);
    });

    it('should not update the object if the given property path is not valid for an object', () => {
      deleteObjectProperties(initialObject, [['property1', 'property4']]);
      expect(initialObject).toBe(initialObject);
    });

    it('should return the object as it is when passed a null object', () => {
      const object: any = null;
      deleteObjectProperties(object, [['property1', 'property2']]);
      expect(object).toBeNull();
    });

    it('should return the object as it is when passed a undefined object', () => {
      const object: any = undefined;
      deleteObjectProperties(object, [['property1', 'property2']]);
      expect(object).toBeUndefined();
    });
  });

  describe('deleteObjectProperty', () => {
    const initialObject = {
      property1: {
        property2: {
          property3: 'blah',
          property4: 'bluh',
        },
        property5: 'bleh',
      },
    };

    it('should delete with given path in the object', () => {
      deleteObjectProperty(initialObject, ['property1', 'property2']);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property5: 'bleh' } }));
    });

    it('should not update the object if the given property path is empty', () => {
      deleteObjectProperty(initialObject, []);
      expect(initialObject).toEqual(initialObject);
    });

    it('should not update the object if the given property path is not valid for an object', () => {
      deleteObjectProperty(initialObject, ['property1', 'property4', 'property6']);
      expect(initialObject).toBe(initialObject);
    });

    it('should return the object as it is when passed a null object', () => {
      const object: any = null;
      deleteObjectProperty(object, ['property1', 'property2']);
      expect(object).toBeNull();
    });

    it('should return the object as it is when passed a undefined object', () => {
      const object: any = undefined;
      deleteObjectProperty(object, ['property1', 'property2']);
      expect(object).toBeUndefined();
    });

    it('throws an error to prevent prototype pollution', () => {
      expect(() => deleteObjectProperty({}, ['__proto__'])).toThrow();
      expect(() => deleteObjectProperty({}, ['constructor'])).toThrow();
    });
  });

  describe('endsWith', () => {
    it('returns true if a string ends with a substring', () => {
      expect(endsWith('foobar', 'bar')).toBe(true);
    });

    it('returns false if a string does not end with a substring', () => {
      expect(endsWith('foobar', 'foo')).toBe(false);
    });
  });

  describe('equals', () => {
    it('returns true if two strings are the same, ignoring case', () => {
      expect(equals('foo', 'FOO')).toBe(true);
      expect(equals('foo', 'FOO', true)).toBe(true);
    });

    it('returns true if two strings are the same, not ignoring case', () => {
      expect(equals('foo', 'foo', false)).toBe(true);
      expect(equals('FOO', 'FOO', false)).toBe(true);
    });

    it('returns false if two strings are not the same, ignoring case', () => {
      expect(equals('foo', 'BAR')).toBe(false);
      expect(equals('foo', 'BAR', true)).toBe(false);
    });

    it('returns false if two strings are not the same, not ignoring case', () => {
      expect(equals('foo', 'BAR', false)).toBe(false);
      expect(equals('foo', 'FOO', false)).toBe(false);
    });

    it('returns false if either string is null or undefined', () => {
      expect(equals(null, 'BAR')).toBe(false);
      expect(equals(undefined, 'BAR')).toBe(false);
      expect(equals('foo', null)).toBe(false);
      expect(equals('foo', undefined)).toBe(false);
      expect(equals(null, null)).toBe(false);
      expect(equals(null, undefined)).toBe(false);
      expect(equals(undefined, null)).toBe(false);
      expect(equals(undefined, undefined)).toBe(false);
    });
  });

  describe('csvContains', () => {
    it('returns true if the csv string contains the value, ignoring case', () => {
      expect(csvContains('t0', 't0')).toBe(true);
      expect(csvContains('T0', 't0')).toBe(true);
      expect(csvContains('t0,t1', 't0')).toBe(true);
      expect(csvContains('t0,t1', 't1')).toBe(true);
      expect(csvContains('T0,T1', 't0')).toBe(true);
      expect(csvContains('T0,T1', 't1')).toBe(true);
      expect(csvContains('t0,t1,T2', 't2')).toBe(true);

      expect(csvContains('t0', 't0', true)).toBe(true);
      expect(csvContains('T0', 't0', true)).toBe(true);
      expect(csvContains('t0,t1', 't0', true)).toBe(true);
      expect(csvContains('t0,t1', 't1', true)).toBe(true);
      expect(csvContains('T0,T1', 't0', true)).toBe(true);
      expect(csvContains('T0,T1', 't1', true)).toBe(true);
      expect(csvContains('t0,t1,t2', 't2', true)).toBe(true);
    });

    it('returns true if the csv string contains the value, not ignoring case', () => {
      expect(csvContains('t0', 't0', false)).toBe(true);
      expect(csvContains('t0,t1', 't0', false)).toBe(true);
      expect(csvContains('t0,t1', 't1', false)).toBe(true);
      expect(csvContains('t0,t1,t2', 't2', false)).toBe(true);
    });

    it('returns false if the csv string does not contain the value, ignoring case', () => {
      expect(csvContains('t0', 't5')).toBe(false);
      expect(csvContains('T0', 't5')).toBe(false);
      expect(csvContains('t0,t1', 't5')).toBe(false);
      expect(csvContains('t0,t1', 't5')).toBe(false);
      expect(csvContains('T0,T1', 't5')).toBe(false);
      expect(csvContains('T0,T1', 't5')).toBe(false);
      expect(csvContains('t0,t1,T2', 't5')).toBe(false);

      expect(csvContains('t0', 't5', true)).toBe(false);
      expect(csvContains('T0', 't5', true)).toBe(false);
      expect(csvContains('t0,t1', 't5', true)).toBe(false);
      expect(csvContains('t0,t1', 't5', true)).toBe(false);
      expect(csvContains('T0,T1', 't5', true)).toBe(false);
      expect(csvContains('t0,t1,t2', 't5', true)).toBe(false);
    });

    it('returns false if the csv string does not contain the value, not ignoring case', () => {
      expect(csvContains('t0', 't5', false)).toBe(false);
      expect(csvContains('t0,t1', 't5', false)).toBe(false);
      expect(csvContains('t0,t1', 't5', false)).toBe(false);
      expect(csvContains('t0,t1,t2', 't5', false)).toBe(false);

      expect(csvContains('T0', 't0', false)).toBe(false);
      expect(csvContains('T0,T1', 't0', false)).toBe(false);
      expect(csvContains('T0,T1', 't1', false)).toBe(false);
      expect(csvContains('T0,T1,T2', 't2', false)).toBe(false);
    });

    it('returns false if the csv string or the value string are falsy or empty', () => {
      expect(csvContains(undefined, undefined)).toBe(false);
      expect(csvContains(null, null)).toBe(false);
      expect(csvContains('', '')).toBe(false);
      expect(csvContains(undefined, undefined, true)).toBe(false);
      expect(csvContains(null, null, true)).toBe(false);
      expect(csvContains('', '', true)).toBe(false);

      expect(csvContains('csv', undefined)).toBe(false);
      expect(csvContains('csv', null)).toBe(false);
      expect(csvContains('csv', '')).toBe(false);
      expect(csvContains('csv', undefined, true)).toBe(false);
      expect(csvContains('csv', null, true)).toBe(false);
      expect(csvContains('csv', '', true)).toBe(false);

      expect(csvContains(undefined, 'value')).toBe(false);
      expect(csvContains(null, 'value')).toBe(false);
      expect(csvContains('', 'value')).toBe(false);
      expect(csvContains(undefined, 'value', true)).toBe(false);
      expect(csvContains(null, 'value', true)).toBe(false);
      expect(csvContains('', 'value', true)).toBe(false);
    });
  });

  describe('exclude', () => {
    for (const array of [null, undefined, []] as any[]) {
      it('should handle null, undefined or empty list when tried to exclude from', () => {
        exclude(array, ['a', 'b', 'c']);

        const expectedArray = array;
        expect(expectedArray).toBe(array);
      });
    }

    for (const value of [null, undefined, []] as any[]) {
      it(`should return original list if excluding list is null, undefined, or an empty list`, () => {
        const array = ['a', 'b', 'c'];
        const expectedArray = array;

        exclude(array, value);
        expect(expectedArray).toBe(array);
      });
    }

    it('should return the excluded list when array has items of primitive type', () => {
      const stringArray = ['a', 'b', 'c', 'd', 'e'];

      const listToExclude = ['c', 'a'];
      const expectedList = ['b', 'd', 'e'];

      exclude(stringArray, listToExclude);
      expect(stringArray.length).toBe(3);
      expect(stringArray).toEqual(expectedList);
    });
  });

  describe('extend', () => {
    it('does a deep copy of object properties into new location', () => {
      const complexObject = {
          key1: {
            k1: 'k1',
            k2: {
              kk1: 2,
            },
          },
          key2: 'SomeValue',
        },
        copiedValue = extend({}, complexObject, { key3: 1 }),
        firstProperty = copiedValue['key1'];

      expect(Object.keys(copiedValue).length).toEqual(3);
      expect(copiedValue['key2']).toEqual('SomeValue');
      expect(copiedValue['key3']).toEqual(1);
      expect(Object.keys(firstProperty).length).toEqual(2);
      expect(firstProperty['k1']).toEqual('k1');
      expect(Object.keys(firstProperty['k2']).length).toEqual(1);
      expect(firstProperty['k2']['kk1']).toEqual(2);

      // Check if the object references are not same of actual and copied objects
      expect(complexObject.key1 === firstProperty).toBeFalsy();
      expect(complexObject.key1.k2 === firstProperty['k2']).toBeFalsy();

      // Modify actual object value and this should not update the extended one.
      complexObject.key1.k1 = 'Newk1';

      expect(firstProperty['k1']).toEqual('k1');
      expect(complexObject.key1.k1).toEqual('Newk1');
    });

    it('does a deep copy of objects containing array of complex objects into new location', () => {
      const arrayObject = [
          {
            k1: {
              a: 'a',
            },
            k2: 'b',
          },
          {
            k1: {
              a: 'c',
            },
            k2: 'd',
          },
        ],
        complexObject = {
          key1: arrayObject,
          key2: {
            k1: 'value',
          },
        },
        copiedValue = extend({}, complexObject, { key3: 'temp' }),
        arrayValue = copiedValue['key1'];

      expect(Object.keys(copiedValue).length).toEqual(3);
      expect(arrayValue.length).toEqual(2);
      expect(arrayObject === arrayValue).toBeFalsy();

      // Modify object value in the actual array, this should not update the copied one.
      arrayObject[0].k1.a = 'e';

      expect(arrayValue[0]['k1']['a']).toEqual('a');
      expect(arrayObject[0].k1.a).toEqual('e');
    });

    it('does a deep copy of objects containing datetime and array properties into new location', () => {
      const arrayObject = [
          {
            k1: {
              a: 'a',
            },
            k2: true,
          },
          {
            k1: {
              a: 'c',
            },
            k2: false,
          },
        ],
        dateTimeObject = new Date(2017, 6, 15),
        newDateTimeObject = new Date(2017, 6, 16),
        complexObject = {
          key1: arrayObject,
          key2: {
            k1: 'value',
          },
          key3: dateTimeObject,
          key4: 123,
        },
        copiedValueOverwrite = extend({}, complexObject, { key3: newDateTimeObject }),
        copiedValueNew = extend({}, complexObject, { key4: 234, key5: newDateTimeObject });

      expect(Object.keys(copiedValueOverwrite).length).toEqual(4);
      expect(complexObject.key3 === dateTimeObject).toBeTruthy();
      expect(copiedValueOverwrite.key3 === newDateTimeObject).toBeFalsy();
      expect(copiedValueOverwrite.key4).toEqual(123);
      expect(copiedValueOverwrite.key1[0].k2).toBeTruthy();
      expect(copiedValueOverwrite.key1[1].k2).toBeFalsy();

      expect(Object.keys(copiedValueNew).length).toEqual(5);
      expect(copiedValueNew.key3 === dateTimeObject).toBeFalsy();
      expect(copiedValueNew.key5 === newDateTimeObject).toBeFalsy();
      expect(complexObject.key4).toEqual(123);
      expect(copiedValueNew.key4).toEqual(234);
      expect(copiedValueNew.key1[0].k2).toBeTruthy();
      expect(copiedValueNew.key1[1].k2).toBeFalsy();
    });
  });

  describe('findAncestorElement', () => {
    it('should return undefined if none is found', () => {
      const startingElement = {
        accessKey: 'three',
        parentElement: {
          accessKey: 'two',
          parentElement: {
            accessKey: 'one',
            parentElement: null,
          },
        },
      };

      const ancestorElement = findAncestorElement(startingElement as HTMLElement, (element) => element.accessKey === 'zero');

      expect(ancestorElement).toBeUndefined();
    });

    it('should return first ancestor that match predicate', () => {
      const startingElement = {
        accessKey: 'parameters',
        accessKeyLabel: 'parameters',
        parentElement: {
          accessKey: 'body',
          accessKeyLabel: 'body',
          parentElement: {
            accessKey: 'card',
            accessKeyLabel: 'card',
            parentElement: {
              accessKey: 'card',
              accessKeyLabel: 'parent card',
              parentElement: null,
            },
          },
        },
      };

      const ancestorElement = findAncestorElement(startingElement as HTMLElement, (element) => element.accessKey === 'card');

      expect(ancestorElement).toBeDefined();
      expect(ancestorElement?.accessKey).toBe('card');
      expect(ancestorElement?.accessKeyLabel).toBe('card');
    });
  });

  describe('first', () => {
    it('returns the first element that matches the predicate in an array', () => {
      expect(first((x) => x % 2 === 0, [1, 2, 3])).toBe(2);
    });

    it('returns undefined if there are no elements that match the predicate in an array', () => {
      expect(first((x) => x > 3, [1, 2, 3])).toBeUndefined();
    });
  });

  describe('format', () => {
    it('should format a string if parameter passed in is undefined', () => {
      const templateString = 'parameter {0} inside',
        para = undefined;

      const result = format(templateString, para);

      expect(result).toBe('parameter undefined inside');
    });

    it('should keep the placeholder if parameter is not passed in', () => {
      const templateString = 'parameter {0} inside';

      const result = format(templateString);

      expect(result).toBe('parameter {0} inside');
    });

    it('should format a string with one parameter', () => {
      const templateString = 'parameter {0} inside',
        para = 'hello';

      const result = format(templateString, para);

      expect(result).toBe('parameter hello inside');
    });

    it('should format a string with multiple parameters', () => {
      const templateString = 'parameter {0} inside {1} end',
        para1 = 'hello',
        para2 = 'world';

      const result = format(templateString, para1, para2);

      expect(result).toBe('parameter hello inside world end');
    });

    it('should format a string with named parameters', () => {
      const templateString = 'parameter {first} inside {second} end',
        para: any = {
          first: 'hello',
          second: 'world',
        };

      const result = format(templateString, para);

      expect(result).toBe('parameter hello inside world end');
    });
  });

  describe('generateUniqueName', () => {
    it('returns the original name when there are no existing names', () => {
      expect(generateUniqueName('name', [])).toBe('name');
    });

    it('returns the original name with a postfix if there is a conflict with existing names', () => {
      expect(generateUniqueName('name', ['name'])).toBe('name_2');
    });

    it('returns the correct name if there are multiple conflicts', () => {
      expect(generateUniqueName('name', ['name', 'name_2'])).toBe('name_3');
    });

    it('returns the correct name if there are multiple conflicts and duplicates', () => {
      expect(generateUniqueName('name', ['name', 'name_2', 'name'])).toBe('name_3');
    });

    it('allows the starting integer of the postfix to be specified', () => {
      expect(generateUniqueName('name', ['name'], 5)).toBe('name_5');
    });
  });

  describe('getJSONValue', () => {
    it('returns a parsed JSON object if it is valid', () => {
      expect(getJSONValue('{"foo":"bar"}')).toEqual({ foo: 'bar' });
    });

    it('returns the original value if it cannot be parsed as JSON', () => {
      expect(getJSONValue('{"foo"}')).toEqual('{"foo"}');
    });
  });

  describe('getObjectPropertyValue', () => {
    const object = {
      foo: {
        bar: 'quux',
      },
    };

    it('returns the object if the given property path is empty', () => {
      expect(getObjectPropertyValue(object, [])).toEqual(object);
    });

    it('returns the value for the given property path if it is valid for an object', () => {
      expect(getObjectPropertyValue(object, ['foo', 'bar'])).toBe(object.foo.bar);
    });

    it('returns undefined if the given property path is not valid for an object', () => {
      expect(getObjectPropertyValue(object, ['foo', 'quux'])).toBeUndefined();
    });

    for (const value of [null, undefined] as any[]) {
      it('always returns undefined when passed a null or undefined object', () => {
        expect(getObjectPropertyValue(value, ['foo', 'bar'])).toBeUndefined();
      });
    }
  });

  describe('getPropertyValue', () => {
    it('returns the value of a property if the name matches, ignoring case', () => {
      expect(getPropertyValue({ FOO: 1 }, 'foo')).toBe(1);
      expect(getPropertyValue({ foo: 1 }, 'FOO')).toBe(1);
    });

    it('returns the value of a property if the name matches, not ignoring case', () => {
      expect(getPropertyValue({ FOO: 1 }, 'FOO')).toBe(1);
    });

    it('returns undefined if a property is not found', () => {
      expect(getPropertyValue({ foo: 1 }, 'bar')).toBeUndefined();
    });

    for (const value of [null, undefined] as any[]) {
      it(`always returns undefined when passed '${String(value)}'`, () => {
        expect(getPropertyValue(undefined, 'bar')).toBeUndefined();
      });
    }

    it('throws an error to prevent prototype pollution', () => {
      expect(() => getPropertyValue({}, '__proto__')).toThrow();
      expect(() => getPropertyValue({}, 'constructor')).toThrow();
    });
  });

  describe('hasProperty', () => {
    it('returns true if the name matches, ignoring case', () => {
      expect(hasProperty({ FOO: 1 }, 'foo')).toBe(true);
      expect(hasProperty({ foo: 1 }, 'FOO')).toBe(true);
    });

    it('returns true if the name matches, not ignoring case', () => {
      expect(hasProperty({ FOO: 1 }, 'FOO')).toBe(true);
    });

    it('returns false if a property is not found', () => {
      expect(hasProperty({ foo: 1 }, 'bar')).toBe(false);
    });
  });

  describe('hexToRgbA', () => {
    it('returns rgb value for the hex value', () => {
      const hexColor = '#0033FF';
      expect(hexToRgbA(hexColor)).toBe('rgba(0,51,255, 1)');
    });

    it('returns rgb value for the incomplete hex value', () => {
      const hexColor = '#03F';
      expect(hexToRgbA(hexColor)).toBe('rgba(0,51,255, 1)');
    });
  });

  describe('includes', () => {
    it('returns true if a string contains a substring (case-insensitive)', () => {
      expect(includes('foobar', 'foo')).toBe(true);
      expect(includes('foobar', 'FOO')).toBe(true);
    });

    it('returns true if a string contains a substring (case-sensitive)', () => {
      expect(includes('foobar', 'foo', false)).toBe(true);
    });

    it('returns false if a string does not contain a substring', () => {
      expect(includes('foobar', 'FOO', false)).toBe(false);
    });
  });

  describe('isEmptyString', () => {
    it('returns true if a value is an empty string', () => {
      expect(isEmptyString('')).toBe(true);
    });

    it('returns false if a value is not an empty string', () => {
      expect(isEmptyString('non-empty string')).toBe(false);
    });
  });

  describe('isNullOrEmpty', () => {
    for (const value of [null, undefined, {}] as any[]) {
      it(`returns true if a '${String(value)}' is null, undefined, or an empty object`, () => {
        expect(isNullOrEmpty(value)).toBe(true);
      });
    }

    for (const value of [{ foo: 'bar' }]) {
      it(`returns false if '${String(value)}' is a non-empty object`, () => {
        expect(isNullOrEmpty(value)).toBe(false);
      });
    }
  });

  describe('isNullOrUndefined', () => {
    it('returns true if a value is null or undefined', () => {
      expect(isNullOrUndefined(null)).toBe(true);
      expect(isNullOrUndefined(undefined)).toBe(true);
    });

    it('returns false if a value is falsy but is not null or undefined', () => {
      expect(isNullOrUndefined(false)).toBe(false);
      expect(isNullOrUndefined(0)).toBe(false);
      expect(isNullOrUndefined(NaN)).toBe(false);
      expect(isNullOrUndefined('')).toBe(false);
    });
  });

  describe('isObject', () => {
    it('returns true if a value is an object', () => {
      expect(isObject({})).toBe(true);
      expect(isObject(new Object())).toBe(true);
    });

    it('returns false if a value is not an object', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject(false)).toBe(false);
      expect(isObject(0)).toBe(false);
      expect(isObject(NaN)).toBe(false);
      expect(isObject('')).toBe(false);
      expect(isObject([])).toBe(false);
    });
  });

  describe('isString', () => {
    for (const value of ['', 'non-empty string']) {
      it('returns false if a value is a string', () => {
        expect(isString(value)).toBe(true);
      });
    }

    for (const value of [null, undefined, false, 0, NaN, {}, []]) {
      it('returns false if a value is not a string', () => {
        expect(isString(value)).toBe(false);
      });
    }
  });

  describe('isBoolean', () => {
    for (const value of [true, false]) {
      it('returns false if a value is boolean', () => {
        expect(isBoolean(value)).toBe(true);
      });
    }

    for (const value of [null, undefined, 'non-empty string', 0, NaN, {}, []]) {
      it('returns false if a value is not a boolean', () => {
        expect(isBoolean(value)).toBe(false);
      });
    }
  });

  describe('isUndefinedOrEmptyString', () => {
    it('returns true if a value is undefined or empty string', () => {
      expect(isUndefinedOrEmptyString('')).toBe(true);
      expect(isUndefinedOrEmptyString(undefined)).toBe(true);
    });

    it('returns false if a value is falsy but is not undefined or empty string', () => {
      expect(isUndefinedOrEmptyString(false)).toBe(false);
      expect(isUndefinedOrEmptyString(0)).toBe(false);
      expect(isUndefinedOrEmptyString(NaN)).toBe(false);
      expect(isUndefinedOrEmptyString(null)).toBe(false);
    });
  });

  describe('isValidIcon', () => {
    it('returns true if a value is a valid icon or icon URL', () => {
      expect(isValidIcon('https://microsoft.com/icon.png')).toBe(true);
      expect(isValidIcon('data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==')).toBe(true);
    });
  });

  describe('isValidJSON', () => {
    it('returns true is input is valid JSON string', () => {
      const json = {
          address: {
            streetAddress: '21 2nd Street',
            city: 'New York',
          },
        },
        text = JSON.stringify(json);
      expect(isValidJSON(text)).toBeTruthy();
    });

    it('returns true is input is valid JSON string', () => {
      const text = 'abcd';
      expect(isValidJSON(text)).toBeFalsy();
    });
  });

  describe('map', () => {
    it('throws an error if a key name was not provided', () => {
      expect(() => map([], null)).toThrow();
    });

    it('returns an array mapped into a string map', () => {
      const array = [
        { id: 'foo', value: '1' },
        { id: 'bar', value: 'xyzzy' },
      ];
      const object = {
        foo: { id: 'foo', value: '1' },
        bar: { id: 'bar', value: 'xyzzy' },
      };

      expect(map(array, 'id')).toEqual(object);
    });

    it('returns an empty string map when passed nothing (null, undefined, or an empty array)', () => {
      expect(map(null, 'id')).toEqual({});
      expect(map(undefined, 'id')).toEqual({});
      expect(map([], 'id')).toEqual({});
    });
  });

  describe('mapsum', () => {
    it('should return the sum of an array of numbers mapped from another array', () => {
      expect(mapsum(['f', 'of', 'bar', 'quux', 'which'], (s) => s.length)).toBe(15);
    });
  });

  describe('nonPrimitivesArrayEquals', () => {
    it('should return false if one of the arrays undefined', () => {
      expect(nonPrimitivesArrayEquals([{}], undefined, (a, b) => a === b)).toBe(false);
      expect(nonPrimitivesArrayEquals([{}], null, (a, b) => a === b)).toBe(false);
    });

    it('should return true if both arrays are undefined', () => {
      expect(nonPrimitivesArrayEquals(undefined, undefined, (a, b) => a === b)).toBe(true);
    });

    it('should return false if non primitive elements within the arrays do not match', () => {
      expect(nonPrimitivesArrayEquals([{ foo: 'bar' }], [{ foo: 'not bar' }], (a, b) => !!a && !!b && a.foo === b.foo)).toBe(false);

      expect(
        nonPrimitivesArrayEquals([{ foo: 'bar' }, null], [{ foo: 'bar' }, { foo: 'test' }], (a, b) => !!a && !!b && a.foo === b.foo)
      ).toBe(false);
    });

    it('should return true when arrays contain same non primitives', () => {
      expect(
        nonPrimitivesArrayEquals(
          [{ foo: 'bar' }, { foo: 'bar2' }],
          [{ foo: 'bar' }, { foo: 'bar2' }],
          (a, b) => !!a && !!b && a.foo === b.foo
        )
      ).toBe(true);
      expect(
        nonPrimitivesArrayEquals(
          [{ foo: { bar: 10, bar2: 'ten' } }, { foo: { bar: 12, bar2: 'twelve' } }],
          [{ foo: { bar: 10, bar2: 'ten' } }, { foo: { bar: 12, bar2: 'twelve' } }],
          (a, b) => !!a && !!b && !!a.foo && !!b.foo && a.foo.bar === b.foo.bar && a.foo.bar2 === b.foo.bar2
        )
      ).toBe(true);
    });

    it('should return false when arrays contain same non primitives in different order', () => {
      expect(
        nonPrimitivesArrayEquals(
          [{ foo: 'bar2' }, { foo: 'bar' }],
          [{ foo: 'bar' }, { foo: 'bar2' }],
          (a, b) => !!a && !!b && a.foo === b.foo
        )
      ).toBe(false);

      expect(
        nonPrimitivesArrayEquals(
          [{ foo: { bar: 12, bar2: 'twelve' } }, { foo: { bar: 10, bar2: 'ten' } }],
          [{ foo: { bar: 10, bar2: 'ten' } }, { foo: { bar: 12, bar2: 'twelve' } }],
          (a, b) => !!a && !!b && !!a.foo && !!b.foo && a.foo.bar === b.foo.bar && a.foo.bar2 === b.foo.bar2
        )
      ).toBe(false);
    });
  });

  describe('optional', () => {
    it("should set an object's property to the specified value if value is not undefined", () => {
      expect(optional('property', 'property')).toEqual({ property: 'property' });
    });

    it("should not set an object's property if value is undefined", () => {
      expect(optional('property', undefined)).toBeUndefined();
    });
  });

  describe('parsePathnameAndQueryKeyFromUri', () => {
    it('should return the pathname and a string map of query string parameters from a URI', () => {
      const { pathname, queryKey } = parsePathnameAndQueryKeyFromUri('https://microsoft.com/api/invoke?foo=bar');
      expect(pathname).toBe('/api/invoke');
      expect(queryKey).toEqual({ foo: 'bar' });
    });

    it('should return the correct pathname and a string map of query string parameters from a URI', () => {
      const { pathname, queryKey } = parsePathnameAndQueryKeyFromUri('https://microsoft.com////api/invoke?foo=bar');
      expect(pathname).toBe('/api/invoke');
      expect(queryKey).toEqual({ foo: 'bar' });
    });

    it('should preserve the end forward slash in pathname', () => {
      const { pathname, queryKey } = parsePathnameAndQueryKeyFromUri('https://microsoft.com/api/invoke/?foo=bar');
      expect(pathname).toBe('/api/invoke/');
      expect(queryKey).toEqual({ foo: 'bar' });
    });

    it('should return an empty string map of query string parameters from a URI which has no query string', () => {
      const { queryKey } = parsePathnameAndQueryKeyFromUri('https://microsoft.com/api/invoke');
      expect(queryKey).toEqual({});
    });
  });

  describe('remove', () => {
    for (const array of [null, undefined, []] as any[]) {
      it('should handle null, undefined or empty list when tried to remove from', () => {
        const expectedArray = array;

        remove(array, 'a');

        expect(array).toBe(expectedArray);
      });
    }

    for (const value of [null, undefined, 'd'] as any) {
      it(`should return original list if the item to remove is null, undefined or not present in the list`, () => {
        const array = ['a', 'b', 'c'];
        const expectedArray = array;

        remove(array, value);

        expect(expectedArray).toBe(array);
      });
    }

    it('should remove the item of primitive type from the original array if found', () => {
      const stringArray = ['a', 'b', 'c', 'd'];

      const expectedList = ['a', 'b', 'd'];

      remove(stringArray, 'c');

      expect(stringArray.length).toBe(3);
      expect(stringArray).toEqual(expectedList);
    });
  });

  describe('removeKeys', () => {
    it('should remove keys correctly.', () => {
      const object: Record<string, number> = {
        key1: 1,
        key2: 2,
        key3: 3,
      };

      expect(removeKeys(object, ['key1', 'key3'])).toEqual(true);
      expect(object['key1']).toBeUndefined();
      expect(object['key2']).toEqual(2);
      expect(object['key3']).toBeUndefined();
    });

    it('should throw if argument is invalid.', () => {
      expect(() => removeKeys(null as any, ['key1', 'key3'])).toThrow();
      expect(() => removeKeys(undefined as any, ['key1', 'key3'])).toThrow();
    });

    it('should return false if no keys removed.', () => {
      const object: Record<string, number> = {
        key1: 1,
        key2: 2,
        key3: 3,
      };

      expect(removeKeys(object, ['key4', 'key5'])).toEqual(false);
    });

    it('should return true if some of the keys is removed.', () => {
      const object: Record<string, number> = {
        key1: 1,
        key2: 2,
        key3: 3,
      };

      expect(removeKeys(object, ['key1', 'key5'])).toEqual(true);
    });
  });

  describe('setObjectPropertyValue', () => {
    const initialObject = {
        property1: {
          property2: {
            property3: 'blah',
          },
        },
      },
      valueToUpdate = 'bluh',
      objectValueToUpdate = {
        property4: 'bleh',
      };

    it('should update with given path with the value when it is primitive type', () => {
      setObjectPropertyValue(initialObject, ['property1', 'property2'], valueToUpdate);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property2: 'bluh' } }));
    });

    it('should update the given path with the value when it is object type', () => {
      setObjectPropertyValue(initialObject, ['property1', 'property2'], objectValueToUpdate);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property2: { property4: 'bleh' } } }));
    });

    it('should not update the object if the given property path is empty', () => {
      setObjectPropertyValue(initialObject, [], valueToUpdate);
      expect(initialObject).toEqual(initialObject);
    });

    it('should not update the object if the given property path is not valid for an object', () => {
      setObjectPropertyValue(initialObject, ['property1', 'property4'], objectValueToUpdate);
      expect(initialObject).toBe(initialObject);
    });

    it('should return the object as it is when passed a null object', () => {
      const object: any = null;
      setObjectPropertyValue(object, ['property1', 'property2'], valueToUpdate);
      expect(object).toBeNull();
    });
  });

  describe('safeSetObjectPropertyValue', () => {
    const valueToUpdate = 'bluh';
    const objectValueToUpdate = {
      property4: 'bleh',
    };
    let initialObject: object;
    beforeEach(() => {
      initialObject = {
        property1: {
          property2: {
            property3: 'blah',
          },
        },
      };
    });

    it('should update with given path with the value when it is primitive type,', () => {
      safeSetObjectPropertyValue(initialObject, ['Property1', 'Property2'], valueToUpdate);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property2: 'bluh' } }));
    });

    it('should update the given path with the value when it is object type.', () => {
      safeSetObjectPropertyValue(initialObject, ['Property1', 'Property2'], objectValueToUpdate);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property2: { property4: 'bleh' } } }));
    });

    it('should not update the object if the given property path is empty.', () => {
      safeSetObjectPropertyValue(initialObject, [], valueToUpdate);
      expect(initialObject).toEqual(initialObject);
    });

    it('should update the object if the given property path does not exist.', () => {
      safeSetObjectPropertyValue(initialObject, ['Property1', 'Property4'], valueToUpdate);
      expect(JSON.stringify(initialObject)).toBe(JSON.stringify({ property1: { property2: { property3: 'blah' }, Property4: 'bluh' } }));
    });

    it('should create the properties automatically when needed.', () => {
      const object = safeSetObjectPropertyValue(null, ['property1', 'property2'], 'def');
      expect(object).toEqual({
        property1: {
          property2: 'def',
        },
      });
    });

    it('throws an error to prevent prototype pollution', () => {
      expect(() => safeSetObjectPropertyValue({}, ['__proto__'], null)).toThrow();
      expect(() => safeSetObjectPropertyValue({}, ['constructor'], null)).toThrow();
    });
  });

  describe('sum', () => {
    it('should return the sum of an array of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });
  });

  describe('trim', () => {
    it('returns a string whose whitespace has been trimmed from its beginning and end', () => {
      expect(trim(' foobar ', ' ')).toBe('foobar');
    });

    it('returns the original string if it is too short to trim', () => {
      expect(trim(' ', '  ')).toBe(' ');
    });
  });

  describe('uniqueArray', () => {
    it('returns an array with unique elements from the given array', () => {
      expect(uniqueArray([1, 1, 1, 2, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('unmap', () => {
    it('returns a string map unmapped into an array', () => {
      const array = [
        { id: 'foo', value: '1' },
        { id: 'bar', value: 'xyzzy' },
      ];
      const object: Record<string, { id: string; value: string }> = {
        foo: { id: 'foo', value: '1' },
        bar: { id: 'bar', value: 'xyzzy' },
      };

      expect(unmap(object)).toEqual(array);
    });

    it('returns a string map unmapped into an array, each element of which should have a key property added', () => {
      const array = [
        { id: 'foo', value: '1' },
        { id: 'bar', value: 'xyzzy' },
      ];
      const object: Record<string, { value: string }> = {
        foo: { value: '1' },
        bar: { value: 'xyzzy' },
      };

      expect(unmap(object, 'id')).toEqual(array);
    });

    it('returns an empty array when passed nothing (null, undefined, or an empty object)', () => {
      expect(unmap(null, 'id')).toEqual([]);
      expect(unmap(undefined, 'id')).toEqual([]);
      expect(unmap({}, 'id')).toEqual([]);
    });
  });
});
