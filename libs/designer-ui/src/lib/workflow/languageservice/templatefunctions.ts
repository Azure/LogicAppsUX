import { getIntl } from '@microsoft/logic-apps-shared';

export interface FunctionGroupDefinition {
  id: string;
  name: string;
  functions: FunctionDefinition[];
}

export interface ParameterDetails {
  name: string;
  documentation?: string;
  type?: string;
  isVariable?: boolean;
}

export interface SignatureInfo {
  definition: string;
  documentation?: string;
  parameters: ParameterDetails[];
}

export interface FunctionDefinition {
  name: string;
  defaultSignature: string;
  description: string;
  signatures: SignatureInfo[];
  isAdvanced?: boolean;
}

const intl = getIntl();

const Resources = {
  TOKEN_FUNCTION_SECTION_STRING: intl.formatMessage({
    defaultMessage: 'String functions',
    id: '419af1524fa3',
    description: 'Label for string functions',
  }),
  TOKEN_FUNCTION_FUNCTION_CONCAT: intl.formatMessage({
    defaultMessage: 'Combines any number of strings together',
    id: '5c4ba9b4b514',
    description: 'Label for combining strings together',
  }),
  TOKEN_PARAMETER_CONCAT_ALL: intl.formatMessage({
    defaultMessage: 'Required. One of the strings to combine into a single string.',
    id: '3ff4beab9a3d',
    description: 'Required string parameter required to combine strings',
  }),
  TOKEN_FUNCTION_FUNCTION_SUBSTRING: intl.formatMessage({
    defaultMessage: 'Returns a subset of characters from a string.',
    id: 'c85d91fff2ee',
    description: 'Label for description of custom substring Function',
  }),
  TOKEN_PARAMETER_SUBSTRING_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string from which the substring is taken.',
    id: 'ed0ca6ac34f9',
    description: 'Required string parameter required to obtain substring',
  }),
  TOKEN_PARAMETER_SUBSTRING_STARTINDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of where the substring begins in parameter 1.',
    id: '7a02c8f0f63b',
    description: 'Required start index parameter required to obtain substring',
  }),
  TOKEN_PARAMETER_SUBSTRING_LENGTH: intl.formatMessage({
    defaultMessage: 'Required. The length of the substring.',
    id: 'c10b04c1c426',
    description: 'Required length parameter to obtain substring',
  }),
  TOKEN_FUNCTION_FUNCTION_SLICE: intl.formatMessage({
    defaultMessage: 'Returns a section of a string defined by the start index and the end index',
    id: '14de731d0277',
    description: 'Label for description of custom slice Function',
  }),
  TOKEN_PARAMETER_SLICE_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string to slice.',
    id: '1f5c271eb270',
    description: 'Required string parameter to slice',
  }),
  TOKEN_PARAMETER_SLICE_STARTINDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of where to start extracting the substring.',
    id: '119cf9abb3fc',
    description: 'Required start index parameter to obtain substring',
  }),
  TOKEN_PARAMETER_SLICE_ENDINDEX: intl.formatMessage({
    defaultMessage: 'Optional. The index of where to stop extracting the substring.',
    id: '7f58f4b68355',
    description: 'Optional end index parameter to obtain substring',
  }),
  TOKEN_FUNCTION_FUNCTION_REPLACE: intl.formatMessage({
    defaultMessage: 'Replaces a string with a given string',
    id: '50709534a236',
    description: 'Label for description of custom replace Function',
  }),
  TOKEN_PARAMETER_REPLACE_TEXT: intl.formatMessage({
    defaultMessage:
      'Required. The string that is searched for parameter 2 and updated with parameter 3, when parameter 2 is found in parameter 1.',
    id: 'c107045ed52f',
    description: 'Required parameters for the custom Replace Function',
  }),
  TOKEN_FUNCTION_FUNCTION_GUID: intl.formatMessage({
    defaultMessage: 'Generates a globally unique string (GUID)',
    id: 'bf7f472a33d3',
    description: 'Label for description of custom Global Unique Identifier Function',
  }),
  TOKEN_PARAMETER_GUID_FORMAT: intl.formatMessage({
    defaultMessage: 'A single format specifier that indicates how to format the value of this Guid.',
    id: '06e62b0f76b7',
    description: 'Required format parameter to determine how to obtain GUID',
  }),
  TOKEN_FUNCTION_FUNCTION_TOLOWER: intl.formatMessage({
    defaultMessage: 'Converts a string to lowercase using the casing rules of the invariant culture',
    id: '279ffbbcd4b9',
    description: 'Label for description of custom toLower Function',
  }),
  TOKEN_PARAMETER_TOLOWER_TEXT: intl.formatMessage({
    defaultMessage:
      'Required. The string to convert to lower casing. If a character in the string does not have a lowercase equivalent, the character is included unchanged in the returned string.',
    id: '99944c0fdcee',
    description: 'Required text parameter to lower case',
  }),
  TOKEN_FUNCTION_FUNCTION_TOUPPER: intl.formatMessage({
    defaultMessage: 'Converts a string to uppercase using the casing rules of the invariant culture',
    id: '882487246a1c',
    description: 'Label for description of custom toUpper Function',
  }),
  TOKEN_PARAMETER_TOUPPER_TEXT: intl.formatMessage({
    defaultMessage:
      'Required. The string to convert to upper casing. If a character in the string does not have an uppercase equivalent, the character is included unchanged in the returned string.',
    id: 'd22ffa4d11fa',
    description: 'Required text parameter to upper case',
  }),
  TOKEN_FUNCTION_FUNCTION_INDEXOF: intl.formatMessage({
    defaultMessage: 'Returns the first index of a value within a string (case-insensitive, invariant culture)',
    id: '68fd7093d0f5',
    description: "Label for the description of a custom 'indexOf' function",
  }),
  TOKEN_PARAMETER_INDEXOF_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: 'd2a57441e842',
    description: 'Required text parameter to apply indexOf function on',
  }),
  TOKEN_PARAMETER_INDEXOF_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value for which to find the index.',
    id: '4e56b7dc1e40',
    description: "Required. The text parameter for which to find the index with the 'indexOf' function.",
  }),
  TOKEN_FUNCTION_FUNCTION_NTHINDEXOF: intl.formatMessage({
    defaultMessage: `Returns the index for a value's n-th occurrence in a string (case-insensitive, invariant culture).`,
    id: '010ed9c5c1a6',
    description: 'Label for description of custom nthIndexOf Function',
  }),
  TOKEN_PARAMETER_NTHINDEXOF_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: '1b45d8addc3b',
    description: 'Required text parameter to apply nthIndexOf function on',
  }),
  TOKEN_PARAMETER_NTHINDEXOF_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value for which to find the index.',
    id: 'eaee824be66e',
    description: 'Required text parameter to search nthIndexOf function with',
  }),
  TOKEN_PARAMETER_NTHINDEXOF_OCCURRENCE: intl.formatMessage({
    defaultMessage: 'Required. The number of the occurrence of the substring to find.',
    id: '6805e7ab0879',
    description: 'Required number of occurrences to get nthIndexOf function with',
  }),
  TOKEN_FUNCTION_FUNCTION_LASTINDEXOF: intl.formatMessage({
    defaultMessage: 'Returns the last index of a value within a string (case-insensitive, invariant culture)',
    id: 'bc40610d7234',
    description: 'Label for description of custom lastIndexOf Function',
  }),
  TOKEN_FUNCTION_FUNCTION_STARTSWITH: intl.formatMessage({
    defaultMessage: 'Checks if the string starts with a value (case-insensitive, invariant culture)',
    id: '48b6749f83b6',
    description: 'Label for description of custom startsWith Function',
  }),
  TOKEN_PARAMETER_STARTSWITH_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: 'b9ccc0e5c730',
    description: 'Required text parameter to search startsWith function on',
  }),
  TOKEN_PARAMETER_STARTSWITH_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value the string may start with.',
    id: '65a21e0c676a',
    description: 'Required text parameter to search startsWith function with',
  }),
  TOKEN_FUNCTION_FUNCTION_ENDSWITH: intl.formatMessage({
    defaultMessage: 'Checks if the string ends with a value (case-insensitive, invariant culture)',
    id: 'a89a6720be83',
    description: 'Label for description of custom endsWith Function',
  }),
  TOKEN_PARAMETER_ENDSWITH_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: 'ef3ccfb0a0a2',
    description: 'Required text parameter to search endsWith function on',
  }),
  TOKEN_PARAMETER_ENDSWITH_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value the string may end with.',
    id: 'bd0710914d72',
    description: 'Required text parameter to search endsWith function with',
  }),
  TOKEN_FUNCTION_FUNCTION_SPLIT: intl.formatMessage({
    defaultMessage: 'Splits the string using a separator',
    id: '76ccfe01eb71',
    description: 'Label for description of custom split Function',
  }),
  TOKEN_PARAMETER_SPLIT_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that is split.',
    id: '457d928660c7',
    description: 'Required text parameter to apply split function on',
  }),
  TOKEN_PARAMETER_SPLIT_SEPARATOR: intl.formatMessage({
    defaultMessage: 'Required. The separator.',
    id: 'dcd8702091b8',
    description: 'Required delimeter parameter to apply split function with',
  }),
  TOKEN_FUNCTION_FUNCTION_TRIM: intl.formatMessage({
    defaultMessage: 'Trims leading and trailing whitespace from a string',
    id: 'a68cf2a44bc7',
    description: 'Label for description of custom trim Function',
  }),
  TOKEN_PARAMETER_TRIM_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string from which to remove leading and trailing whitespace.',
    id: '0f5960b1300d',
    description: 'Required text parameter to apply trim function with',
  }),
  TOKEN_FUNCTION_FUNCTION_FORMATNUMBER: intl.formatMessage({
    defaultMessage: 'Returns a formatted number string',
    id: 'f03170c47b82',
    description: 'Label for description of custom formatNumber Function',
  }),
  TOKEN_PARAMETER_FORMATNUMBER_NUMBER: intl.formatMessage({
    defaultMessage: 'Required. The number to be formatted.',
    id: '2634df0bbe2e',
    description: 'Required value parameter to apply formatNumber function on',
  }),
  TOKEN_PARAMETER_FORMATNUMBER_FORMAT: intl.formatMessage({
    defaultMessage: 'Required. The numeric format string.',
    id: '26ad98fe8c6b',
    description: 'Required format parameter to apply formatNumber function with',
  }),
  TOKEN_PARAMETER_FORMATNUMBER_LOCALE: intl.formatMessage({
    defaultMessage: `Optional. The locale to be used when formatting (defaults to 'en-us').`,
    id: 'eda26a207fcb',
    description: 'Optional locale parameter to apply formatNumber function with',
  }),
  TOKEN_FUNCTION_SECTION_COLLECTION: intl.formatMessage({
    defaultMessage: 'Collection functions',
    id: '3f8ac4c03c29',
    description: 'Label for collection functions',
  }),
  TOKEN_FUNCTION_COLLECTION_CONTAINS: intl.formatMessage({
    defaultMessage: 'Returns true if a dictionary contains a key, if an array contains a value, or if a string contains a substring',
    id: '262ebaeb7f70',
    description: 'Label for description of custom contains Function',
  }),
  TOKEN_PARAMETER_CONTAINS_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to search within.',
    id: 'ea3b169ffb18',
    description: 'Required collection parameter to apply contains function on',
  }),
  TOKEN_PARAMETER_CONTAINS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to find inside the Within collection.',
    id: '18b7773140e6',
    description: 'Required object parameter to find for the contains function',
  }),
  TOKEN_FUNCTION_COLLECTION_LENGTH: intl.formatMessage({
    defaultMessage: 'Returns the number of elements in an array or string',
    id: 'a9ce52ebd8f8',
    description: 'Label for description of custom length Function',
  }),
  TOKEN_PARAMETER_LENGTH_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection for which to get the length.',
    id: 'c74a2bda804e',
    description: 'Required collection parameter to apply length Function',
  }),
  TOKEN_FUNCTION_COLLECTION_SORT: intl.formatMessage({
    defaultMessage: 'Returns an array sorted in ascending order',
    id: 'c8a3ac98accb',
    description: 'Label for description of custom sort Function',
  }),
  TOKEN_PARAMETER_SORT_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to sort.',
    id: '1c82e6984ac0',
    description: 'Required collection parameter to apply sort function on',
  }),
  TOKEN_PARAMETER_SORT_SORTBY: intl.formatMessage({
    defaultMessage: 'Optional. A key to use for sorting objects in the collection.',
    id: '6c9109a0b523',
    description: 'Optional key parameter to apply sort function with',
  }),
  TOKEN_FUNCTION_COLLECTION_REVERSE: intl.formatMessage({
    defaultMessage: 'Returns the collection in reverse order',
    id: 'dd1a03e21425',
    description: 'Label for description of custom reverse Function',
  }),
  TOKEN_PARAMETER_REVERSE_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to reverse.',
    id: '95c9209db845',
    description: 'Required collection parameter to apply reverse function on',
  }),
  TOKEN_FUNCTION_COLLECTION_EMPTY: intl.formatMessage({
    defaultMessage: 'Returns true if an object, array, or string is empty',
    id: 'e5bd2c2a2059',
    description: 'Label for description of custom empty Function',
  }),
  TOKEN_PARAMETER_EMPTY_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to check if it is empty.',
    id: 'b1b3d9f52373',
    description: 'Required collection parameter to check empty function on',
  }),
  TOKEN_FUNCTION_COLLECTION_INTERSECTION: intl.formatMessage({
    defaultMessage: 'Returns a single array or object that has common elements between arrays or objects passed in',
    id: 'f7f51e4e11a2',
    description: 'Label for description of custom intersection Function',
  }),
  TOKEN_FUNCTION_COLLECTION_INTERSECTION_INFO: intl.formatMessage({
    defaultMessage:
      'Returns a single array or object that has common elements between arrays or objects passed in. The parameters for the function can either be a set of objects or a set of arrays (not a mixture of both). If there are two objects with the same name, the last object with that name appears in the final object.',
    id: 'a5cb99281912',
    description: 'Label for signatures of custom intersection Function',
  }),
  TOKEN_PARAMETER_INTERSECTION_ALL: intl.formatMessage({
    defaultMessage: 'Required. The collections to evaluate. An object must be in all collections passed in to appear in the result.',
    id: '3036e633019f',
    description: 'Required collection parameters to check intersection function on',
  }),
  TOKEN_FUNCTION_COLLECTION_UNION: intl.formatMessage({
    defaultMessage: 'Returns a single array or object with all the elements that are in either the array or object passed to this function',
    id: 'c26c3f6a22ba',
    description: 'Label for description of custom union Function',
  }),
  TOKEN_FUNCTION_COLLECTION_UNION_INFO: intl.formatMessage({
    defaultMessage:
      'Returns a single array or object with all the elements that are in either array or object passed to this function. The parameters for the function can either be a set of objects or a set of arrays (not a mixture thereof). If there are two objects with the same name in the final output, the last object with that name appears in the final object.',
    id: '61a163250601',
    description: 'Label for signatures of custom union Function',
  }),
  TOKEN_PARAMETER_UNION_ALL: intl.formatMessage({
    defaultMessage: 'Required. The collections to evaluate. An object that appears in any of the collections also appears in the result.',
    id: 'b91f56b889f0',
    description: 'Required collection parameters to check union function on',
  }),
  TOKEN_FUNCTION_COLLECTION_FIRST: intl.formatMessage({
    defaultMessage: 'Returns the first element from the passed-in array or string.',
    id: '774db47a09ce',
    description: 'Label for description of custom first Function',
  }),
  TOKEN_PARAMETER_FIRST_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection from which to take the first object.',
    id: '2d34e058d989',
    description: "Required. The collection parameter on which to apply the 'first' function.",
  }),
  TOKEN_FUNCTION_COLLECTION_LAST: intl.formatMessage({
    defaultMessage: 'Returns the last element in the array or string passed in',
    id: 'a3fd121234fa',
    description: 'Label for description of custom last Function',
  }),
  TOKEN_PARAMETER_LAST_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to take the last object from.',
    id: '51501f62384e',
    description: "The required collection parameter for applying the 'last' function.",
  }),
  TOKEN_FUNCTION_COLLECTION_TAKE: intl.formatMessage({
    defaultMessage: 'Returns the first Count elements from the array or string passed in',
    id: 'feeb74bbbed9',
    description: 'Label for description of custom take Function',
  }),
  TOKEN_PARAMETER_TAKE_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection from where to take the first Count objects.',
    id: 'bcb7ab795881',
    description: "Required. The collection parameter on which to apply the 'take' function.",
  }),
  TOKEN_PARAMETER_TAKE_COUNT: intl.formatMessage({
    defaultMessage: 'Required. The number of objects to take from the Collection. Must be a positive integer.',
    id: '2fe3d8fa337f',
    description: 'Required number parameter to get number of objects for take function',
  }),
  TOKEN_FUNCTION_COLLECTION_SKIP: intl.formatMessage({
    defaultMessage: 'Returns the elements in the array starting at index Count',
    id: 'fd0a800ec620',
    description: 'Label for description of custom skip Function',
  }),
  TOKEN_PARAMETER_SKIP_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to skip the first Count objects from.',
    id: '72c71ecd5006',
    description: 'Required collection parameter to apply skip function on',
  }),
  TOKEN_PARAMETER_SKIP_COUNT: intl.formatMessage({
    defaultMessage: 'Required. The number of objects to remove from the front of Collection. Must be a positive integer.',
    id: '686c95253ae9',
    description: 'Required number parameter to get number of objects to remove for skip function',
  }),
  TOKEN_FUNCTION_COLLECTION_JOIN: intl.formatMessage({
    defaultMessage: 'Returns a string with each item of an array joined by a delimiter',
    id: '1be5ef2a7393',
    description: "Label for description of the custom 'join' function",
  }),
  TOKEN_PARAMETER_JOIN_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to join items from.',
    id: 'fea7215d0b51',
    description: 'Required collection parameter to apply join function on',
  }),
  TOKEN_PARAMETER_JOIN_DELIMITER: intl.formatMessage({
    defaultMessage: 'Required. The string to delimit items with.',
    id: '429451b771de',
    description: 'Required string parameter to separate objects and join function on',
  }),
  TOKEN_FUNCTION_COLLECTION_CHUNK: intl.formatMessage({
    defaultMessage: 'Split a string or array into chunks of equal length',
    id: 'c9cd0670c883',
    description: 'Label for description of custom chunk Function',
  }),
  TOKEN_PARAMETER_CHUNK_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The string or array to split.',
    id: '8d5220cf5470',
    description: 'Required collection parameter to apply chunk function on',
  }),
  TOKEN_PARAMETER_CHUNK_LENGTH: intl.formatMessage({
    defaultMessage: 'Required. The length of each chunk.',
    id: '52068847335e',
    description: 'Required number parameter to get length of each chunk for chunk function',
  }),
  TOKEN_FUNCTION_SECTION_LOGICAL: intl.formatMessage({
    defaultMessage: 'Logical functions',
    id: '7e0ff7e2861a',
    description: 'Label for logical functions',
  }),
  TOKEN_FUNCTION_LOGICAL_IF: intl.formatMessage({
    defaultMessage: 'Returns a specified value based on whether the expression resulted in true or false',
    id: 'c16550b8af0f',
    description: 'Label for description of custom if Function',
  }),
  TOKEN_PARAMETER_IF_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. A boolean value that determines which value the expression should return.',
    id: '8082b4586d7d',
    description: 'Required boolean parameter to determine which value if function should return',
  }),
  TOKEN_PARAMETER_IF_VALUEIFTRUE: intl.formatMessage({
    defaultMessage: `Required. The value to return if the expression is 'true'.`,
    id: 'f02585121c0e',
    description: 'Required value parameter to return given if function is true',
  }),
  TOKEN_PARAMETER_IF_VALUEIFFALSE: intl.formatMessage({
    defaultMessage: 'Required. The value to return if the expression is false.',
    id: 'ab94e4a846d9',
    description: 'Required value parameter to return given if function is false',
  }),
  TOKEN_FUNCTION_LOGICAL_EQUALS: intl.formatMessage({
    defaultMessage: 'Returns true if two values are equal.',
    id: '527736b468ad',
    description: 'Label for description of custom equals Function',
  }),
  TOKEN_PARAMETER_EQUALS_OBJECT: intl.formatMessage({
    defaultMessage: 'Required. The object to compare equality.',
    id: 'cb7019401f44',
    description: 'Required object parameters to apply equals function',
  }),
  TOKEN_FUNCTION_LOGICAL_AND: intl.formatMessage({
    defaultMessage: 'Returns true if both parameters are true',
    id: 'f6efc07b75c9',
    description: 'Label for description of custom and Function',
  }),
  TOKEN_PARAMETER_AND_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. The expressions that must be true.',
    id: '46cee3dd5b2c',
    description: "Required. The expression parameters on which to apply the 'and' function.",
  }),
  TOKEN_FUNCTION_LOGICAL_OR: intl.formatMessage({
    defaultMessage: 'Returns true if either parameter is true',
    id: 'b28a8ff992d1',
    description: 'Label for description of custom or Function',
  }),
  TOKEN_PARAMETER_OR_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. The expressions that may be true.',
    id: '2ee6fb34de9e',
    description: 'Required expression parameters to apply or function',
  }),
  TOKEN_FUNCTION_LOGICAL_NOT: intl.formatMessage({
    defaultMessage: 'Returns true if the parameters are false',
    id: '19c1b4a9fb40',
    description: 'Label for description of custom not Function',
  }),
  TOKEN_PARAMETER_NOT_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. The expression that will be negated.',
    id: '8cab0c4baf77',
    description: 'Required expression parameter to apply not function',
  }),
  TOKEN_FUNCTION_LOGICAL_LESS: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is less than the second.',
    id: 'b5aac361316c',
    description: 'Label for description of custom less Function',
  }),
  TOKEN_PARAMETER_LESS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less than comparing object.',
    id: '9e0b02e3818a',
    description: 'Required object parameter to check if less than using less function',
  }),
  TOKEN_PARAMETER_LESS_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater than value being compared to.',
    id: 'eb7ff360db23',
    description: 'Required object parameter to compare to in less function',
  }),
  TOKEN_FUNCTION_LOGICAL_LESSOREQUALS: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is less than or equal to the second',
    id: 'a927a3a22b06',
    description: 'Label for description of custom lessOrEquals Function',
  }),
  TOKEN_PARAMETER_LESSOREQUALS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less or equal to the comparing object.',
    id: '434c693d0447',
    description: 'Required object parameter to check if less than or equal to using lessOrEqual function',
  }),
  TOKEN_PARAMETER_LESSOREQUALS_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater than or equal to value being compared to.',
    id: '6d3ae4f92ba1',
    description: 'Required object parameter to compare to in lessOrEqual function',
  }),
  TOKEN_FUNCTION_LOGICAL_GREATER: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is greater than the second',
    id: 'b598f65e7b58',
    description: 'Label for description of custom greater Function',
  }),
  TOKEN_PARAMETER_GREATER_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater than comparing object.',
    id: '071213447359',
    description: 'Required object parameter to check if greater than using greater function',
  }),
  TOKEN_PARAMETER_GREATER_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less than value being compared to.',
    id: 'd6387338c201',
    description: 'Required object parameter to compare to in greater function',
  }),
  TOKEN_FUNCTION_LOGICAL_GREATEROREQUALS: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is greater than or equal to the second',
    id: '7c1401c3f563',
    description: 'Label for description of custom greaterOrEquals Function',
  }),
  TOKEN_PARAMETER_GREATEROREQUALS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater or equal to the comparing object.',
    id: 'f058ce4a1e42',
    description: 'Required object parameter to check if greater than or equal to using greaterOrEqual function',
  }),
  TOKEN_PARAMETER_GREATEROREQUALS_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less than or equal to value being compared to.',
    id: '9c676cfeb7ae',
    description: 'Required object parameter to compare to in greaterOrEqual function',
  }),
  TOKEN_FUNCTION_LOGICAL_ISINT: intl.formatMessage({
    defaultMessage: 'Returns a boolean that indicates whether a string is an integer',
    id: 'cd4580b0960b',
    description: 'Label for description of custom isInt Function',
  }),
  TOKEN_PARAMETER_ISINT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to examine.',
    id: 'fa87a55f8370',
    description: 'Required string parameter to check if is integer using isInt function',
  }),
  TOKEN_FUNCTION_LOGICAL_ISFLOAT: intl.formatMessage({
    defaultMessage: 'Returns a boolean that indicates whether a string is a floating-point number',
    id: '82d41882bff0',
    description: 'Label for description of custom isFloat Function',
  }),
  TOKEN_PARAMETER_ISFLOAT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to examine.',
    id: 'dcf2591f424b',
    description: 'Required string parameter to check if is float using isFloat function',
  }),
  TOKEN_PARAMETER_ISFLOAT_LOCALE: intl.formatMessage({
    defaultMessage: `Optional. The RFC 4646 locale code to use. If not specified, default locale is used. If locale isn't a valid value, an error is generated that the provided locale isn't valid or doesn't have an associated locale.`,
    id: 'db3e4719350f',
    description: 'Optional locale parameter to check locale code in isFloat function',
  }),
  TOKEN_FUNCTION_SECTION_CONVERSION: intl.formatMessage({
    defaultMessage: 'Conversion functions',
    id: '810b7fd1f4f6',
    description: 'Label for conversion functions',
  }),
  TOKEN_FUNCTION_CONVERSION_JSON: intl.formatMessage({
    defaultMessage: 'Converts the input to a JSON type value.',
    id: '3834022a3fbd',
    description: 'Label for description of custom json Function',
  }),
  TOKEN_PARAMETER_JSON_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string that is converted to a native type value.',
    id: 'cc80d577d0bb',
    description: 'Required string parameter to be converted using json function',
  }),
  TOKEN_FUNCTION_CONVERSION_XML: intl.formatMessage({
    defaultMessage: 'Covert the input to an Xml type value',
    id: 'a5798519f47f',
    description: 'Label for description of custom xml Function',
  }),
  TOKEN_PARAMETER_XML_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value to convert to XML.',
    id: 'd43d38ed7c6b',
    description: 'Required string parameter to be converted using xml function',
  }),
  TOKEN_FUNCTION_CONVERSION_INT: intl.formatMessage({
    defaultMessage: 'Convert the parameter to an integer',
    id: '48a5e8a62200',
    description: 'Label for description of custom int Function',
  }),
  TOKEN_PARAMETER_INT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to an integer.',
    id: 'aa723863533d',
    description: 'Required string parameter to be converted using int function',
  }),
  TOKEN_FUNCTION_CONVERSION_STRING: intl.formatMessage({
    defaultMessage: 'Convert the parameter to a string',
    id: 'ab6c3c4a41b5',
    description: 'Label for description of custom string Function',
  }),
  TOKEN_PARAMETER_STRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a string.',
    id: '8d0d00aa35ac',
    description: 'Required parameter to be converted using string function',
  }),
  TOKEN_FUNCTION_CONVERSION_FLOAT: intl.formatMessage({
    defaultMessage: 'Convert the parameter argument to a floating-point number',
    id: 'd4d06f2ae495',
    description: 'Label for description of custom float Function',
  }),
  TOKEN_PARAMETER_FLOAT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a floating-point number.',
    id: '9f7e4effe67e',
    description: 'Required string parameter to be converted using float function',
  }),
  TOKEN_FUNCTION_CONVERSION_BOOL: intl.formatMessage({
    defaultMessage: 'Convert the parameter to a Boolean',
    id: '76a82df7201f',
    description: 'Label for description of custom bool Function',
  }),
  TOKEN_PARAMETER_BOOL_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a boolean.',
    id: '2527d6274855',
    description: 'Required parameter to be converted using bool function',
  }),
  TOKEN_FUNCTION_CONVERSION_BASE64: intl.formatMessage({
    defaultMessage: 'Returns the base 64 representation of the input string',
    id: '3ef9b4c41079',
    description: 'Label for description of custom base64 Function',
  }),
  TOKEN_PARAMETER_BASE64_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to encode into base64 representation.',
    id: '02b4e1d3f143',
    description: 'Required base64 string parameter to be converted using base64 function',
  }),
  TOKEN_FUNCTION_CONVERSION_BASE64TOBINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a base 64 encoded string',
    id: 'db77c4372407',
    description: 'Label for description of custom base64ToBinary Function',
  }),
  TOKEN_PARAMETER_BASE64TOBINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The base64 encoded string.',
    id: 'd05ccd25579b',
    description: 'Required base64 string parameter to be converted to binary using base64ToBinary function',
  }),
  TOKEN_FUNCTION_CONVERSION_BASE64TOSTRING: intl.formatMessage({
    defaultMessage: 'Returns a string representation of a base 64 encoded string',
    id: '761be4d2ebf4',
    description: 'Label for description of custom base64ToString Function',
  }),
  TOKEN_PARAMETER_BASE64TOSTRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The base64 encoded string.',
    id: '93fa2a14bcfc',
    description: 'Required base64 string parameter to be converted using base64ToString function',
  }),
  TOKEN_FUNCTION_CONVERSION_BINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a value',
    id: '3bef2f46f313',
    description: 'Label for description of custom binary Function',
  }),
  TOKEN_PARAMETER_BINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to binary.',
    id: '6c9ec359e57b',
    description: "Required. The string parameter to convert with the 'binary' function.",
  }),
  TOKEN_FUNCTION_CONVERSION_DATAURITOBINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a data URI',
    id: '63d901cf9647',
    description: 'Label for description of custom dataUriToBinary Function',
  }),
  TOKEN_PARAMETER_DATAURITOBINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The data URI to convert to binary representation.',
    id: '30a4dd36424a',
    description: 'Required dataURI string parameter to be converted using dataUriToBinary function',
  }),
  TOKEN_FUNCTION_CONVERSION_DATAURITOSTRING: intl.formatMessage({
    defaultMessage: 'Returns a string representation of a data URI',
    id: '986a4ab25b4e',
    description: 'Label for description of custom dataUriToString Function',
  }),
  TOKEN_PARAMETER_DATAURITOSTRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The data URI to convert to String representation.',
    id: 'd7e67c9fd865',
    description: 'Required dataUri string parameter to be converted using dataUriToString function',
  }),
  TOKEN_FUNCTION_CONVERSION_DATAURI: intl.formatMessage({
    defaultMessage: 'Returns a data URI of a value',
    id: 'f49baf4386d0',
    description: 'Label for description of custom dataUri Function',
  }),
  TOKEN_PARAMETER_DATAURI_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value to convert to data URI.',
    id: 'db7b3313e365',
    description: 'Required string parameter to be converted using dataUri function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECODEBASE64: intl.formatMessage({
    defaultMessage: 'Returns a string representation of an input based64 string',
    id: '90dea471ee74',
    description: 'Label for description of custom decodeBase64 Function',
  }),
  TOKEN_PARAMETER_DECODEBASE64_VALUE: intl.formatMessage({
    defaultMessage: 'Required. A base64 input string.',
    id: '8d5a5a9c7e86',
    description: 'Required base64 string parameter to be decoded using decodeBase64 function',
  }),
  TOKEN_FUNCTION_FUNCTION_UTF8LENGTH: intl.formatMessage({
    defaultMessage: 'Returns the UTF-8 byte length of an input string',
    id: '3daf9490274b',
    description: 'Label for description of custom utf8Length Function',
  }),
  TOKEN_PARAMETER_UTF8LENGTH_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to calculate UTF-8 length from.',
    id: 'abf0d1056b2c',
    description: 'Required string parameter to be sized using utf8Length function',
  }),
  TOKEN_FUNCTION_FUNCTION_UTF16LENGTH: intl.formatMessage({
    defaultMessage: 'Returns the UTF-16 byte length of an input string',
    id: 'bc36052050a5',
    description: 'Label for description of custom utf16Length Function',
  }),
  TOKEN_PARAMETER_UTF16LENGTH_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to calculate UTF-16 length from.',
    id: '439161d91ea0',
    description: 'Required string parameter to be sized using utf16Length function',
  }),
  TOKEN_FUNCTION_CONVERSION_ENCODEURICOMPONENT: intl.formatMessage({
    defaultMessage: 'URL encodes the input string',
    id: '6fa1bd6eaeb2',
    description: 'Label for description of custom encodeUriComponent Function',
  }),
  TOKEN_PARAMETER_ENCODEURICOMPONENT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to escape URL-unsafe characters from.',
    id: 'cba05c54d01b',
    description: 'Required string parameter to be encoded using encodeUriComponent function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECODEURICOMPONENT: intl.formatMessage({
    defaultMessage: 'URL decodes the input string',
    id: 'a2c967ecff75',
    description: 'Label for description of custom decodeUriComponent Function',
  }),
  TOKEN_PARAMETER_DECODEURICOMPONENT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to decode the URL-unsafe characters from.',
    id: '05008f63bab1',
    description: 'Required string parameter to be decoded using decodeUriComponent function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECODEDATAURI: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of an input data URI string',
    id: 'd2e8f52e22fd',
    description: 'Label for description of custom decodeDataUri Function',
  }),
  TOKEN_PARAMETER_DECODEDATAURI_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The dataURI to decode into a binary representation.',
    id: 'a0015c5bac71',
    description: 'Required string parameter to be decoded using decodeDataUri function',
  }),
  TOKEN_FUNCTION_CONVERSION_URICOMPONENT: intl.formatMessage({
    defaultMessage: 'Returns a URI encoded representation of a value',
    id: 'adccf8c38258',
    description: 'Label for description of custom uriComponent Function',
  }),
  TOKEN_PARAMETER_URICOMPONENT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to be URI encoded.',
    id: 'f14d0a3e08ef',
    description: 'Required string parameter to be encoded using uriComponent function',
  }),
  TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOBINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a URI encoded string',
    id: 'd11d83e6527c',
    description: 'Label for description of custom uriComponentToBinary Function',
  }),
  TOKEN_PARAMETER_URICOMPONENTTOBINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The URI encoded string.',
    id: 'd459f99feb0d',
    description: 'Required URI encoded string parameter to be converted using uriComponentToBinary function',
  }),
  TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOSTRING: intl.formatMessage({
    defaultMessage: 'Returns a string representation of a URI encoded string',
    id: 'c49eaf8e7035',
    description: 'Label for description of custom uriComponentToString Function',
  }),
  TOKEN_PARAMETER_URICOMPONENTTOSTRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The URI encoded string.',
    id: '0477bba9842a',
    description: 'Required URI encoded string parameter to be converted using uriComponentToString function',
  }),
  TOKEN_FUNCTION_CONVERSION_ARRAY: intl.formatMessage({
    defaultMessage: 'Convert the input to an array',
    id: 'fdda1445b8f9',
    description: 'Label for description of custom array Function',
  }),
  TOKEN_PARAMETER_ARRAY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to an array.',
    id: 'c81aec149e69',
    description: 'Required string parameter to be converted using array function',
  }),
  TOKEN_FUNCTION_CONVERSION_CREATEARRAY: intl.formatMessage({
    defaultMessage: 'Creates an array from the parameters',
    id: 'bb3b25784b52',
    description: 'Label for description of custom createArray Function',
  }),
  TOKEN_PARAMETER_CREATEARRAY_ALL: intl.formatMessage({
    defaultMessage: 'Required. The values to combine into an array.',
    id: 'a4e4dc50efeb',
    description: 'Required object parameter to be converted to array using createArray function',
  }),
  TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAVALUE: intl.formatMessage({
    defaultMessage: 'Returns a single value matching the key name from form-data or form-encoded trigger output',
    id: '41904f531329',
    description: 'Label for description of custom triggerFormDataValue Function',
  }),
  TOKEN_PARAMETER_TRIGGERFORMDATAVALUE_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data value to return.',
    id: '1c3a8fda0c39',
    description: 'Required string parameter to be used as key for triggerFormDataValue function',
  }),
  TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAMULTIVALUES: intl.formatMessage({
    defaultMessage: 'Returns an array of values matching the key name from form-data or form-encoded trigger output',
    id: 'b03900559b87',
    description: 'Label for description of custom triggerFormDataMultiValues Function',
  }),
  TOKEN_PARAMETER_TRIGGERFORMDATAMULTIVALUES_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data values to return.',
    id: '376085d093b3',
    description: 'Required string parameter to be used as key for triggerFormDataMultiValues function',
  }),
  TOKEN_FUNCTION_CONVERSION_TRIGGERMULTIPARTBODY: intl.formatMessage({
    defaultMessage: 'Returns the body for a part in a multipart output of the trigger',
    id: 'ca9655f7021d',
    description: "Label for the description of the custom 'triggerMultipartBody' function",
  }),
  TOKEN_PARAMETER_TRIGGERMULTIPARTBODY_INDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of the part to retrieve.',
    id: '076b34886d27',
    description: 'Required number parameter to be used as index for triggerMultipartBody function',
  }),
  TOKEN_FUNCTION_CONVERSION_FORMDATAVALUE: intl.formatMessage({
    defaultMessage: 'Returns a single value matching the key name from form-data or form-encoded action output',
    id: 'd9c544315243',
    description: 'Label for description of custom formDataValue Function',
  }),
  TOKEN_PARAMETER_FORMDATAVALUE_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action with a form-data or form-encoded response.',
    id: 'da0cc6ac9df9',
    description: 'Required string parameter to identify action name for formDataValue function',
  }),
  TOKEN_PARAMETER_FORMDATAVALUE_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data value to return.',
    id: 'a7fd2bd8dd84',
    description: 'Required string parameter to be used as key for formDataValue function',
  }),
  TOKEN_FUNCTION_CONVERSION_FORMDATAMULTIVALUES: intl.formatMessage({
    defaultMessage: 'Returns an array of values matching the key name from form-data or form-encoded action output',
    id: '76b33d4a5e77',
    description: 'Label for description of custom formDataMultiValues Function',
  }),
  TOKEN_PARAMETER_FORMDATAMULTIVALUES_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action with a form-data or form-encoded response.',
    id: '498d38c27380',
    description: 'Required string parameter to identify action name for formDataMultiValues function',
  }),
  TOKEN_PARAMETER_FORMDATAMULTIVALUES_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data values to return.',
    id: '8dc037220965',
    description: 'Required string parameter to be used as key for formDataMultiValues function',
  }),
  TOKEN_FUNCTION_CONVERSION_MULTIPARTBODY: intl.formatMessage({
    defaultMessage: 'Returns the body for a part in a multipart output from an action.',
    id: '71e541e652dc',
    description: "Label for the description of the custom 'multipartBody' function",
  }),
  TOKEN_PARAMETER_MULTIPARTBODY_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action with a multipart response.',
    id: 'ea44a91cb9c2',
    description: 'Required string parameter to identify action name for multipartBody function',
  }),
  TOKEN_PARAMETER_MULTIPARTBODY_INDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of the part to retrieve.',
    id: 'b4b67d4a1567',
    description: 'Required number parameter to be used as index for multipartBody function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECIMAL: intl.formatMessage({
    defaultMessage: 'Converts the parameter to a decimal number',
    id: '102642e98fc4',
    description: 'Label for description of custom decimal Function',
  }),
  TOKEN_PARAMETER_DECIMAL_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a decimal number.',
    id: 'cc13152a099e',
    description: 'Required string parameter to be converted using decimal function',
  }),
  TOKEN_FUNCTION_SECTION_MATH: intl.formatMessage({
    defaultMessage: 'Math functions',
    id: '5edb8fe5e7fe',
    description: 'Label for math functions',
  }),
  TOKEN_FUNCTION_MATH_MIN: intl.formatMessage({
    defaultMessage: 'Returns the minimum value in the input array of numbers',
    id: 'e2f727380168',
    description: 'Label for description of custom min Function',
  }),
  TOKEN_PARAMETER_MIN_ALL: intl.formatMessage({
    defaultMessage: 'Required. Either an array of values to find the minimum value, or the first value of a set.',
    id: 'c050a4a4cbcd',
    description: 'Require parameters to find minimum using min function',
  }),
  TOKEN_FUNCTION_MATH_MAX: intl.formatMessage({
    defaultMessage: 'Returns the maximum value in the input array of numbers',
    id: '6dfef4efc36f',
    description: 'Label for description of custom max Function',
  }),
  TOKEN_PARAMETER_MAX_ALL: intl.formatMessage({
    defaultMessage: 'Required. Either an array of values to find the maximum value, or the first value of a set.',
    id: 'ada062b9d369',
    description: 'Require parameters to find maximum using max function',
  }),
  TOKEN_FUNCTION_MATH_RAND: intl.formatMessage({
    defaultMessage: 'Returns a random integer from a specified range, which is inclusive only at the starting end.',
    id: '8c71c5feedab',
    description: 'Label for description of custom rand Function',
  }),
  TOKEN_PARAMETER_RAND_MINVALUE: intl.formatMessage({
    defaultMessage: 'Required. The lowest integer that can be returned.',
    id: 'e3b90e5eb0be',
    description: 'Required integer parameter to be used as lower bound for rand function',
  }),
  TOKEN_PARAMETER_RAND_MAXVALUE: intl.formatMessage({
    defaultMessage: 'Required. This value is the next integer after the highest integer that can be returned.',
    id: 'df3eab846ce5',
    description: "Required. The integer parameter to use as the upper bound for the 'rand' function.",
  }),
  TOKEN_FUNCTION_MATH_ADD: intl.formatMessage({
    defaultMessage: 'Returns the result from adding the two numbers',
    id: 'f5d8e7a88e5d',
    description: 'Label for description of custom add Function',
  }),
  TOKEN_PARAMETER_ADD_SUMMAND1: intl.formatMessage({
    defaultMessage: 'Required. The number to add to Summand 2.',
    id: '8a109dc38cfb',
    description: "Required. The number parameter to sum in the 'add' function.",
  }),
  TOKEN_PARAMETER_ADD_SUMMAND2: intl.formatMessage({
    defaultMessage: 'Required. The number to add to Summand 1.',
    id: 'cec3cd60d14f',
    description: "Required. The number parameter to sum in the 'add' function.",
  }),
  TOKEN_FUNCTION_MATH_SUB: intl.formatMessage({
    defaultMessage: 'Returns the result from subtracting two numbers',
    id: '84f33a8829c3',
    description: 'Label for description of custom sub Function',
  }),
  TOKEN_PARAMETER_SUB_MINUEND: intl.formatMessage({
    defaultMessage: 'Required. The number that Subtrahend is removed from.',
    id: '1fc6c452741d',
    description: 'Required number parameter to be minused in sub function',
  }),
  TOKEN_PARAMETER_SUB_SUBTRAHEND: intl.formatMessage({
    defaultMessage: 'Required. The number to remove from the Minuend.',
    id: 'b1f2531d560c',
    description: 'Required number parameter to be minused in sub function',
  }),
  TOKEN_FUNCTION_MATH_MUL: intl.formatMessage({
    defaultMessage: 'Returns the result from multiplying the two numbers',
    id: '5a0a0fed1cc8',
    description: 'Label for description of custom mul Function',
  }),
  TOKEN_PARAMETER_MUL_MULTIPLICAND1: intl.formatMessage({
    defaultMessage: 'Required. The number to multiply Multiplicand 2 with.',
    id: 'eaa901c339c7',
    description: 'Required number parameter to be multiplied in mul function',
  }),
  TOKEN_PARAMETER_MUL_MULTIPLICAND2: intl.formatMessage({
    defaultMessage: 'Required. The number to multiply Multiplicand 1 with.',
    id: '4f07dc93fe7a',
    description: 'Required number parameter to be multiplied in mul function',
  }),
  TOKEN_FUNCTION_MATH_DIV: intl.formatMessage({
    defaultMessage: 'Returns the result from dividing the two numbers',
    id: '80363dc64ab4',
    description: 'Label for description of custom div Function',
  }),
  TOKEN_PARAMETER_DIV_DIVIDEND: intl.formatMessage({
    defaultMessage: 'Required. The number to divide by the Divisor.',
    id: '5557d8beaa41',
    description: 'Required number parameter to be divided from in div function',
  }),
  TOKEN_PARAMETER_DIV_DIVISOR: intl.formatMessage({
    defaultMessage: 'Required. The number to divide the Dividend by.',
    id: '793f9bf567b1',
    description: 'Required number parameter to be divided by in div function',
  }),
  TOKEN_FUNCTION_MATH_MOD: intl.formatMessage({
    defaultMessage: 'Returns the remainder after dividing the two numbers (modulo)',
    id: 'd29fa926a903',
    description: 'Label for description of custom mod Function',
  }),
  TOKEN_PARAMETER_MOD_DIVIDEND: intl.formatMessage({
    defaultMessage: 'Required. The number to divide by the Divisor.',
    id: '6bb8f7812427',
    description: 'Required number parameter to divide in mod function',
  }),
  TOKEN_PARAMETER_MOD_DIVISOR: intl.formatMessage({
    defaultMessage: 'Required. The number to divide the Dividend by. After the division, the remainder is taken.',
    id: 'a58b52c84a45',
    description: 'Required number parameter to divide the dividend by in mod function',
  }),
  TOKEN_FUNCTION_MATH_RANGE: intl.formatMessage({
    defaultMessage: 'Generates an array of integers starting from a certain number',
    id: '53789655dbba',
    description: 'Label for description of custom range Function',
  }),
  TOKEN_PARAMETER_RANGE_STARTINDEX: intl.formatMessage({
    defaultMessage: 'Required. The first integer in the array.',
    id: '592f645c391c',
    description: 'Required number parameter to identify lower bound in range function',
  }),
  TOKEN_PARAMETER_RANGE_COUNT: intl.formatMessage({
    defaultMessage: 'Required. This value is the number of integers that is in the array.',
    id: '3f6039741ca5',
    description: 'Required number parameter to identify number of integers in range function',
  }),
  TOKEN_FUNCTION_SECTION_DATETIME: intl.formatMessage({
    defaultMessage: 'Date and time functions',
    id: 'caa46b43f4b9',
    description: 'Label for date and time functions',
  }),
  TOKEN_FUNCTION_DATETIME_UTCNOW: intl.formatMessage({
    defaultMessage: 'Returns the current timestamp as a string',
    id: '313478560e5f',
    description: 'Label for description of custom utcNow Function',
  }),
  TOKEN_FUNCTION_DATETIME_GETFUTURETIME: intl.formatMessage({
    defaultMessage: 'Returns a timestamp that is the current time plus the specified time interval.',
    id: '8030df7a481d',
    description: 'Label for description of custom getFutureTime Function',
  }),
  TOKEN_PARAMETER_GETFUTURETIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of time units the desired time is in the future.',
    id: '9c7b1e103ed7',
    description: 'Required integer parameter to see how far in the future',
  }),
  TOKEN_PARAMETER_GETFUTURETIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. The unit of time specified in the interval.',
    id: 'e18290005e70',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_PARAMETER_FORMAT: intl.formatMessage({
    defaultMessage: `Either a single format specifier character or a custom format pattern that indicates how to format the value of this timestamp. If format is not provided, the ISO 8601 format ('o') is used.`,
    id: '04202764ffbd',
    description: 'Optional string parameter to identify format of timestamp returned',
  }),
  TOKEN_FUNCTION_DATETIME_GETPASTTIME: intl.formatMessage({
    defaultMessage: 'Returns a timestamp that is the current time minus the specified time interval.',
    id: '98651d08e8f7',
    description: 'Label for description of custom getPastTime Function',
  }),
  TOKEN_PARAMETER_GETPASTTIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of time units the desired time is in the past.',
    id: 'b9cfcfa03156',
    description: 'Required integer parameter to see how far in the past',
  }),
  TOKEN_PARAMETER_GETPASTTIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. The unit of time specified in the interval.',
    id: '4YKQAF',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDTOTIME: intl.formatMessage({
    defaultMessage: 'Adds an integer number of a specified unit of time to a string timestamp passed in',
    id: 'ce71b2c9467a',
    description: 'Label for description of custom addToTime Function',
  }),
  TOKEN_PARAMETER_TIMESTAMP: intl.formatMessage({
    defaultMessage: 'Required. A string that contains the time.',
    id: '24d407c2c883',
    description: 'Required string parameter that contains the time',
  }),
  TOKEN_PARAMETER_ADDTOTIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of a specified time unit to add.',
    id: '17720397c56f',
    description: 'Required integer parameter to add to time',
  }),
  TOKEN_PARAMETER_ADDTOTIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. A string containing the unit of time specified in the interval to add.',
    id: 'b19d06fd92a7',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_FUNCTION_DATETIME_SUBTRACTFROMTIME: intl.formatMessage({
    defaultMessage: 'Subtracts an integer number of a specified unit of time from a string timestamp passed in',
    id: 'c046865a766b',
    description: 'Label for description of custom subtractFromTime Function',
  }),
  TOKEN_PARAMETER_SUBTRACTFROMTIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of a specified time unit to subtract.',
    id: 'def08263b21e',
    description: 'Required integer parameter to subtract to time',
  }),
  TOKEN_PARAMETER_SUBTRACTFROMTIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. A string containing the unit of time specified in the interval to subtract.',
    id: '42b403769e10',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDSECONDS: intl.formatMessage({
    defaultMessage: 'Adds an integer number of seconds to a string timestamp passed in',
    id: 'abced7db457a',
    description: 'Label for description of custom addSeconds Function',
  }),
  TOKEN_PARAMETER_ADDSECONDS_SECONDS: intl.formatMessage({
    defaultMessage: 'Required. The number of seconds to add. Can be negative to subtract seconds.',
    id: '3d19ea600a08',
    description: 'Required integer parameter to subtract seconds from time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDMINUTES: intl.formatMessage({
    defaultMessage: 'Adds an integer number of minutes to a string timestamp passed in',
    id: '9e49359ae7fa',
    description: 'Label for description of custom addMinutes Function',
  }),
  TOKEN_PARAMETER_ADDMINUTES_MINUTES: intl.formatMessage({
    defaultMessage: 'Required. The number of minutes to add. Can be negative to subtract minutes.',
    id: 'cf17bd861d7d',
    description: 'Required integer parameter to subtract minutes from time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDHOURS: intl.formatMessage({
    defaultMessage: 'Adds an integer number of hours to a string timestamp passed in',
    id: 'b9494167c0e8',
    description: 'Label for description of custom addHours Function',
  }),
  TOKEN_PARAMETER_ADDHOURS_HOURS: intl.formatMessage({
    defaultMessage: 'Required. The number of hours to add. Can be negative to subtract hours.',
    id: 'b5a3c2998cc5',
    description: 'Required integer parameter to subtract hours from time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDDAYS: intl.formatMessage({
    defaultMessage: 'Adds an integer number of days to a string timestamp passed in',
    id: 'f30af4cce17a',
    description: 'Label for description of custom addDays Function',
  }),
  TOKEN_PARAMETER_ADDDAYS_DAYS: intl.formatMessage({
    defaultMessage: 'Required. The number of days to add. Can be negative to subtract days.',
    id: 'e01ac0d33eb7',
    description: 'Required integer parameter to subtract days from time',
  }),
  TOKEN_FUNCTION_DATETIME_CONVERTTIMEZONE: intl.formatMessage({
    defaultMessage: 'Converts a string timestamp passed in from a source time zone to a target time zone',
    id: '25acf7102bd4',
    description: 'Label for description of custom convertTimeZone Function',
  }),
  TOKEN_FUNCTION_DATETIME_DATEDIFFERENCE: intl.formatMessage({
    defaultMessage: 'Returns the difference between two dates as a timespan string',
    id: '71f5077ecdb6',
    description: 'Label for description of custom dateDifference Function',
  }),
  TOKEN_PARAMETER_DATEDIFFERENCE_STARTTIMESTAMP: intl.formatMessage({
    defaultMessage: 'Required. A string that contains the start time.',
    id: '30b7242732be',
    description: 'Required string parameter for start time',
  }),
  TOKEN_PARAMETER_DATEDIFFERENCE_ENDTIMESTAMP: intl.formatMessage({
    defaultMessage: 'Required. A string that contains the end time.',
    id: '964823c431d5',
    description: 'Required string parameter for end time',
  }),
  TOKEN_PARAMETER_SOURCETIMEZONE: intl.formatMessage({
    defaultMessage: `Required. A string that contains the time zone name of the source time zone. See 'Default Time Zones' at 'https://go.microsoft.com/fwlink/?linkid=2238292'.`,
    id: 'fc453fa092ee',
    description: 'Required string parameter for source time zone',
  }),
  TOKEN_PARAMETER_DESTINATIONTIMEZONE: intl.formatMessage({
    defaultMessage:
      'Required. A string that contains the time zone name of the destination time zone. See https://msdn.microsoft.com/en-us/library/gg154758.aspx for details.',
    id: 'b7e5c2920c8b',
    description: 'Required string parameter for destination time zone',
  }),
  TOKEN_FUNCTION_DATETIME_CONVERTTOUTC: intl.formatMessage({
    defaultMessage: 'Converts a string timestamp passed in from a source time zone to UTC',
    id: 'c260d41954d5',
    description: 'Label for description of custom convertToUtc Function',
  }),
  TOKEN_FUNCTION_DATETIME_CONVERTFROMUTC: intl.formatMessage({
    defaultMessage: 'Converts a string timestamp passed in from a UTC to a target time zone',
    id: '216d8c8d03d1',
    description: 'Label for description of custom convertFromUtc Function',
  }),
  TOKEN_FUNCTION_DATETIME_FORMATDATETIME: intl.formatMessage({
    defaultMessage: 'Returns a string in date format',
    id: '427f2ac67fc6',
    description: 'Label for description of custom formatDateTime Function',
  }),
  TOKEN_PARAMETER_LOCALE: intl.formatMessage({
    defaultMessage: 'Optional. The locale to be used when parsing the date time string.',
    id: '3a287140480e',
    description: 'Optional string parameter to apply formatDateTime function with',
  }),
  TOKEN_FUNCTION_DATETIME_PARSEDATETIME: intl.formatMessage({
    defaultMessage: 'Converts a string, with optionally a locale and a format to a date',
    id: 'cdc6691d333c',
    description: 'Label for description of custom parseDateTime Function',
  }),
  TOKEN_FUNCTION_DATETIME_STARTOFHOUR: intl.formatMessage({
    defaultMessage: 'Returns the start of the hour to a string timestamp passed in',
    id: 'd3b66ca183d5',
    description: 'Label for description of custom startOfHour Function',
  }),
  TOKEN_FUNCTION_DATETIME_STARTOFDAY: intl.formatMessage({
    defaultMessage: 'Returns the start of the day for the passed-in string timestamp.',
    id: '2ed6e44bb0d6',
    description: "Label for the description of a custom 'startOfDay' function",
  }),
  TOKEN_FUNCTION_DATETIME_STARTOFMONTH: intl.formatMessage({
    defaultMessage: 'Returns the start of the month of a string timestamp',
    id: '4ceeeaa2cfda',
    description: 'Label for description of custom startOfMonth Function',
  }),
  TOKEN_FUNCTION_DATETIME_DAYOFWEEK: intl.formatMessage({
    defaultMessage: 'Returns the day of week component of a string timestamp',
    id: '2f4500cec42a',
    description: 'Label for description of custom dayOfWeek Function',
  }),
  TOKEN_FUNCTION_DATETIME_DAYOFMONTH: intl.formatMessage({
    defaultMessage: 'Returns the day of month component of a string timestamp',
    id: '64c139861083',
    description: 'Label for description of custom dayOfMonth Function',
  }),
  TOKEN_FUNCTION_DATETIME_DAYOFYEAR: intl.formatMessage({
    defaultMessage: 'Returns the day of year component of a string timestamp',
    id: 'b39455f413f4',
    description: 'Label for description of custom dayOfMonth Function',
  }),
  TOKEN_FUNCTION_DATETIME_TICKS: intl.formatMessage({
    defaultMessage: 'Returns the number of ticks (100 nanoseconds interval) since 1 January 0001 00:00:00 UT of a string timestamp',
    id: 'ee59c497308c',
    description: 'Label for description of custom ticks Function',
  }),
  TOKEN_FUNCTION_SECTION_REFERENCE: intl.formatMessage({
    defaultMessage: 'Referencing functions',
    id: '198bc5e78279',
    description: 'Label for referencing functions',
  }),
  TOKEN_FUNCTION_REFERENCE_PARAMETERS: intl.formatMessage({
    defaultMessage: 'Returns a parameter value that is defined in the definition',
    id: '14317841b0bb',
    description: 'Label for description of custom parameters Function',
  }),
  TOKEN_PARAMETER_PARAMETERS_PARAMETERNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the parameter whose values you want.',
    id: 'e1cd2e3d03d6',
    description: 'Required string parameter to create a new parameter',
  }),
  TOKEN_FUNCTION_REFERENCE_RESULT: intl.formatMessage({
    defaultMessage:
      'Returns the results from the top-level actions in the specified scoped action, such as a For_each, Until, or Scope action.',
    id: '395be27844ca',
    description: 'Label for description of custom result Function',
  }),
  TOKEN_PARAMETER_RESULT_SCOPEDACTIONNAME: intl.formatMessage({
    defaultMessage:
      'Optional. The name of the scoped action where you want the inputs and outputs from the top-level actions inside that scope.',
    id: '33c02a9b81c6',
    description: 'Optional string parameter to determine specific actions inside top-level actions',
  }),
  TOKEN_FUNCTION_REFERENCE_ACTIONS: intl.formatMessage({
    defaultMessage: 'Enables an expression to derive its value from other JSON name and value pairs or the output of the runtime action',
    id: 'afc6995ec613',
    description: 'Label for description of custom actions Function',
  }),
  TOKEN_PARAMETER_ACTIONS_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action that has the values you want.',
    id: '61bce88a654d',
    description: 'Required string parameter to determine action wanted',
  }),
  TOKEN_FUNCTION_REFERENCE_OUTPUTS: intl.formatMessage({
    defaultMessage: `Shorthand for actions('actionName').outputs`,
    id: '5c2ba76d19d2',
    description: 'Label for description of custom outputs Function',
  }),
  TOKEN_PARAMETER_ACTIONOUTPUTS_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action whose outputs you want.',
    id: 'bdae34049700',
    description: "Required string parameter to determine action's output wanted",
  }),
  TOKEN_FUNCTION_REFERENCE_BODY: intl.formatMessage({
    defaultMessage: `Shorthand for actions('actionName').outputs.body`,
    id: '96300e47a8e9',
    description: 'Label for description of custom body Function',
  }),
  TOKEN_PARAMETER_ACTIONBODY_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action whose body outputs you want.',
    id: '5f1fe76835b8',
    description: "Required string parameter to determine action's body output wanted",
  }),
  TOKEN_FUNCTION_REFERENCE_TRIGGEROUTPUTS: intl.formatMessage({
    defaultMessage: 'Shorthand for trigger().outputs',
    id: '5947b70d8c62',
    description: 'Label for description of custom triggerOutputs Function',
  }),
  TOKEN_FUNCTION_REFERENCE_TRIGGERBODY: intl.formatMessage({
    defaultMessage: 'Shorthand for trigger().outputs.body',
    id: '6546b3dd8afd',
    description: 'Label for description of custom triggerBody Function',
  }),
  TOKEN_FUNCTION_REFERENCE_TRIGGER: intl.formatMessage({
    defaultMessage: 'Enables an expression to derive its value from other JSON name and value pairs or the output of the runtime trigger',
    id: '60a5e6283c49',
    description: 'Label for description of custom trigger Function',
  }),
  TOKEN_FUNCTION_REFERENCE_ITEM: intl.formatMessage({
    defaultMessage: 'When used inside for-each loop, this function returns the current item of the specified loop.',
    id: '2e81944f73c9',
    description: 'Label for description of custom item Function',
  }),
  TOKEN_PARAMETER_ITEMS_LOOPNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the loop whose item you want.',
    id: 'e5c3e2580535',
    description: 'Required string parameter to determine loop wanted',
  }),
  TOKEN_FUNCTION_REFERENCE_ITERATIONINDEXES: intl.formatMessage({
    defaultMessage: 'When used inside until loop, this function returns the current iteration index of the specified loop.',
    id: '82ef68f73c4f',
    description: 'Label for description of custom iterationIndexes Function',
  }),
  TOKEN_FUNCTION_REFERENCE_VARIABLES: intl.formatMessage({
    defaultMessage: 'Returns the value of the specified variable.',
    id: '361f75a808a1',
    description: "Label for the description of the custom 'variables' function",
  }),
  TOKEN_PARAMETER_VARIABLES_VARIABLENAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the variable whose value you want.',
    id: '787822d781b1',
    description: 'Required string parameter to determine variable wanted',
  }),
  TOKEN_FUNCTION_SECTION_WORKFLOW: intl.formatMessage({
    defaultMessage: 'Workflow functions',
    id: '3df08994da23',
    description: 'Label for workflow functions',
  }),
  TOKEN_FUNCTION_WORKFLOW_LISTCALLBACKURL: intl.formatMessage({
    defaultMessage: 'Returns the URL to invoke the trigger or action',
    id: 'b44ed96a6db7',
    description: 'Label for description of custom listCallbackUrl Function',
  }),
  TOKEN_FUNCTION_WORKFLOW_LISTCALLBACKURL_DETAIL: intl.formatMessage({
    defaultMessage:
      'Returns the URL to invoke the trigger or action. Note: This function can only be used in an httpWebhook and apiConnectionWebhook, not in a manual, recurrence, http, or apiConnection.',
    id: 'd3d07d0948a2',
    description: 'documentation of custom listCallbackUrl Function',
  }),
  TOKEN_FUNCTION_WORKFLOW_WORKFLOW: intl.formatMessage({
    defaultMessage: 'This function provides you details for the workflow itself at runtime',
    id: 'b4c44f9c6835',
    description: 'Label for description of custom workflow Function',
  }),
  TOKEN_FUNCTION_SECTION_URI_PARSING: intl.formatMessage({
    defaultMessage: 'URI parsing functions',
    id: '1f5ee3104583',
    description: 'Label for URI parsing functions',
  }),
  TOKEN_FUNCTION_FUNCTION_URIHOST: intl.formatMessage({
    defaultMessage: 'Returns the host from a URI',
    id: '3a3189f18773',
    description: 'Label for description of custom uriHost Function',
  }),
  TOKEN_PARAMETER_URI_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The URI to parse.',
    id: '88c89c390ed1',
    description: 'Required string parameter to determine which URI to apply uriHost function to',
  }),
  TOKEN_FUNCTION_FUNCTION_URIPATH: intl.formatMessage({
    defaultMessage: `Returns the path from a URI. If path is not specified, returns '/'`,
    id: 'c58c8f47ce39',
    description: 'Label for description of custom uriPath Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URIPATHANDQUERY: intl.formatMessage({
    defaultMessage: 'Returns the path and query from a URI',
    id: '0fe3ed9ea14e',
    description: 'Label for description of custom uriPathAndQuery Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URIPORT: intl.formatMessage({
    defaultMessage: 'Returns the port from a URI. If port is not specified, returns the default port for the protocol',
    id: 'd74f4e3cbd4f',
    description: 'Label for description of custom uriPort Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URISCHEME: intl.formatMessage({
    defaultMessage: 'Returns the scheme from a URI',
    id: '2d2f2b7d9ae6',
    description: 'Label for description of custom uriScheme Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URIQUERY: intl.formatMessage({
    defaultMessage: 'Returns the query from a URI',
    id: '18063b6fc031',
    description: 'Label for description of custom uriQuery Function',
  }),
  TOKEN_FUNCTION_SECTION_MANIPULATION: intl.formatMessage({
    defaultMessage: 'Manipulation functions',
    id: '894e45761904',
    description: 'Label for URI manipulation functions',
  }),
  TOKEN_FUNCTION_MANIPULATION_COALESCE: intl.formatMessage({
    defaultMessage: 'Returns the first non-null object in the passed-in argument values.',
    id: 'a315d5e3e022',
    description: 'Label for description of custom coalesce Function',
  }),
  TOKEN_PARAMETER_COALESCE_ALL: intl.formatMessage({
    defaultMessage: 'Required. The objects to check for null.',
    id: '7ff9564d6dbb',
    description: 'Required object parameters to check for null in coalesce function',
  }),
  TOKEN_FUNCTION_MANIPULATION_ADDPROPERTY: intl.formatMessage({
    defaultMessage: 'Returns an object with an additional property value pair',
    id: 'f49bf7fb52eb',
    description: 'Label for description of custom addProperty Function',
  }),
  TOKEN_PARAMETER_OBJECT: intl.formatMessage({
    defaultMessage: 'Required. The object to add a new property to.',
    id: '2b9d339dc6f7',
    description: 'Required object parameter to add a property in addProperty function',
  }),
  TOKEN_PARAMETER_ADDPROPERTY_PROPERTY: intl.formatMessage({
    defaultMessage: 'Required. The name of the new property.',
    id: '5ba15d32132f',
    description: 'Required string parameter for new property name in addProperty function',
  }),
  TOKEN_PARAMETER_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value to assign to the property.',
    id: 'ab6382131675',
    description: 'Required parameter for new property value in addProperty function',
  }),
  TOKEN_FUNCTION_MANIPULATION_SETPROPERTY: intl.formatMessage({
    defaultMessage: 'Returns an object with a property set to the provided value',
    id: '7371bfcea123',
    description: 'Label for description of custom setProperty Function',
  }),
  TOKEN_PARAMETER_SETPROPERTY_PROPERTY: intl.formatMessage({
    defaultMessage: 'Required. The name of the new or existing property.',
    id: 'c55fe8c8ab1e',
    description: 'Required parameter for new/existing property value in setProperty function',
  }),
  TOKEN_FUNCTION_MANIPULATION_REMOVEPROPERTY: intl.formatMessage({
    defaultMessage: 'Returns an object with the specified property removed.',
    id: 'c762535b9183',
    description: "Label for description of the custom 'removeProperty' function",
  }),
  TOKEN_PARAMETER_REMOVEPROPERTY_OBJECT: intl.formatMessage({
    defaultMessage: 'Required. The object to remove the property from.',
    id: 'debceb59f725',
    description: 'Required object parameter to identify from which object to remove property from',
  }),
  TOKEN_PARAMETER_REMOVEPROPERTY_PROPERTY: intl.formatMessage({
    defaultMessage: 'Required. The name of the property to remove.',
    id: '9d3035e792a3',
    description: 'Required string parameter to identify which property to remove',
  }),
  TOKEN_FUNCTION_MANIPULATION_XPATH: intl.formatMessage({
    defaultMessage: 'Returns an XML node, nodeset or value as JSON from the provided XPath expression',
    id: 'abff947b1ca2',
    description: 'Label for description of custom xpath Function',
  }),
  TOKEN_PARAMETER_XPATH_XML: intl.formatMessage({
    defaultMessage: 'Required. The XML on which to evaluate the XPath expression.',
    id: 'a35e124c79de',
    description: 'Required XML parameter to apply xpath function on',
  }),
  TOKEN_PARAMETER_XPATH_XPATH: intl.formatMessage({
    defaultMessage: 'Required. The XPath expression to evaluate.',
    id: '9994182ef192',
    description: 'Required. The xpath parameter to identify the xPath to evaluate.',
  }),
};

export const FunctionGroupDefinitions: FunctionGroupDefinition[] = [
  {
    id: 'string',
    name: Resources.TOKEN_FUNCTION_SECTION_STRING,
    functions: [
      {
        name: 'concat',
        defaultSignature: 'concat(text_1, text_2?, ...)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_CONCAT,
        signatures: [
          {
            definition: 'concat(text_1: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_CONCAT,
            parameters: [
              {
                name: 'text_1',
                documentation: Resources.TOKEN_PARAMETER_CONCAT_ALL,
              },
            ],
          },
          {
            definition: 'concat(text_1: string, ...)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_CONCAT,
            parameters: [
              {
                name: 'text_1',
                documentation: Resources.TOKEN_PARAMETER_CONCAT_ALL,
                type: 'string',
              },
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_CONCAT_ALL,
                type: 'string',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'substring',
        defaultSignature: 'substring(text, startIndex, length?)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_SUBSTRING,
        signatures: [
          {
            definition: 'substring(text: string, startIndex: integer, length?: integer)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_SUBSTRING,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_SUBSTRING_TEXT,
              },
              {
                name: 'startIndex',
                documentation: Resources.TOKEN_PARAMETER_SUBSTRING_STARTINDEX,
              },
              {
                name: 'length',
                documentation: Resources.TOKEN_PARAMETER_SUBSTRING_LENGTH,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'slice',
        defaultSignature: 'slice(text, startIndex, endIndex?)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_SLICE,
        signatures: [
          {
            definition: 'slice(text: string, startIndex: integer, endIndex?: integer)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_SLICE,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_SLICE_TEXT,
              },
              {
                name: 'startIndex',
                documentation: Resources.TOKEN_PARAMETER_SLICE_STARTINDEX,
              },
              {
                name: 'endIndex',
                documentation: Resources.TOKEN_PARAMETER_SLICE_ENDINDEX,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'replace',
        defaultSignature: 'replace(text, oldText, newText)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_REPLACE,
        signatures: [
          {
            definition: 'replace(text: string, oldText: string, newText: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_REPLACE,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_REPLACE_TEXT,
              },
              {
                name: 'oldText',
                documentation: Resources.TOKEN_PARAMETER_REPLACE_TEXT,
              },
              {
                name: 'newText',
                documentation: Resources.TOKEN_PARAMETER_REPLACE_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'guid',
        defaultSignature: 'guid()',
        description: Resources.TOKEN_FUNCTION_FUNCTION_GUID,
        signatures: [
          {
            definition: 'guid()',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_GUID,
            parameters: [],
          },
          {
            definition: 'guid(format: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_GUID,
            parameters: [
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_GUID_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'toLower',
        defaultSignature: 'toLower(text)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_TOLOWER,
        signatures: [
          {
            definition: 'toLower(text: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_TOLOWER,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_TOLOWER_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'toUpper',
        defaultSignature: 'toUpper(text)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_TOUPPER,
        signatures: [
          {
            definition: 'toUpper(text: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_TOUPPER,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_TOUPPER_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'indexOf',
        defaultSignature: 'indexOf(text, searchText)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_INDEXOF,
        signatures: [
          {
            definition: 'indexOf(text: string, searchText: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_INDEXOF,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_INDEXOF_TEXT,
              },
              {
                name: 'searchText',
                documentation: Resources.TOKEN_PARAMETER_INDEXOF_SEARCHTEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'nthIndexOf',
        defaultSignature: 'nthIndexOf(text, searchText, occurrence)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_NTHINDEXOF,
        signatures: [
          {
            definition: 'nthIndexOf(text: string, searchText: string, occurrence: number)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_NTHINDEXOF,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_NTHINDEXOF_TEXT,
              },
              {
                name: 'searchText',
                documentation: Resources.TOKEN_PARAMETER_NTHINDEXOF_SEARCHTEXT,
              },
              {
                name: 'occurrence',
                documentation: Resources.TOKEN_PARAMETER_NTHINDEXOF_OCCURRENCE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'lastIndexOf',
        defaultSignature: 'lastIndexOf(text, searchText)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_LASTINDEXOF,
        signatures: [
          {
            definition: 'lastIndexOf(text: string, searchText: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_LASTINDEXOF,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_INDEXOF_TEXT,
              },
              {
                name: 'searchText',
                documentation: Resources.TOKEN_PARAMETER_INDEXOF_SEARCHTEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'startsWith',
        defaultSignature: 'startsWith(text, searchText)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_STARTSWITH,
        signatures: [
          {
            definition: 'startsWith(text: string, searchText: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_STARTSWITH,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_STARTSWITH_TEXT,
              },
              {
                name: 'searchText',
                documentation: Resources.TOKEN_PARAMETER_STARTSWITH_SEARCHTEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'endsWith',
        defaultSignature: 'endsWith(text, searchText)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_ENDSWITH,
        signatures: [
          {
            definition: 'endsWith(text: string, searchText: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_ENDSWITH,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_ENDSWITH_TEXT,
              },
              {
                name: 'searchText',
                documentation: Resources.TOKEN_PARAMETER_ENDSWITH_SEARCHTEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'split',
        defaultSignature: 'split(text, separator)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_SPLIT,
        signatures: [
          {
            definition: 'split(text: string, separator: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_SPLIT,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_SPLIT_TEXT,
              },
              {
                name: 'separator',
                documentation: Resources.TOKEN_PARAMETER_SPLIT_SEPARATOR,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'trim',
        defaultSignature: 'trim(text)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_TRIM,
        signatures: [
          {
            definition: 'trim(text: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_TRIM,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_TRIM_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'formatNumber',
        defaultSignature: 'formatNumber(number, format, locale?)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_FORMATNUMBER,
        signatures: [
          {
            definition: 'formatNumber(number: number, format: string, locale?: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_FORMATNUMBER,
            parameters: [
              {
                name: 'number',
                documentation: Resources.TOKEN_PARAMETER_FORMATNUMBER_NUMBER,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMATNUMBER_FORMAT,
              },
              {
                name: 'locale',
                documentation: Resources.TOKEN_PARAMETER_FORMATNUMBER_LOCALE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
    ],
  },
  {
    id: 'collection',
    name: Resources.TOKEN_FUNCTION_SECTION_COLLECTION,
    functions: [
      {
        name: 'contains',
        defaultSignature: 'contains(collection, value)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_CONTAINS,
        signatures: [
          {
            definition: 'contains(collection: array|string, value: string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_CONTAINS,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_CONTAINS_COLLECTION,
              },
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_CONTAINS_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'length',
        defaultSignature: 'length(collection)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_LENGTH,
        signatures: [
          {
            definition: 'length(collection: array|string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_LENGTH,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_LENGTH_COLLECTION,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'sort',
        defaultSignature: 'sort(collection)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_SORT,
        signatures: [
          {
            definition: 'sort(collection: array)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_SORT,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_SORT_COLLECTION,
              },
            ],
          },
          {
            definition: 'sort(colection: array, sortBy: string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_SORT,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_SORT_COLLECTION,
              },
              {
                name: 'sortBy',
                documentation: Resources.TOKEN_PARAMETER_SORT_SORTBY,
              },
            ],
          },
        ],
      },
      {
        name: 'reverse',
        defaultSignature: 'reverse(collection)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_REVERSE,
        signatures: [
          {
            definition: 'reverse(collection: array)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_REVERSE,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_REVERSE_COLLECTION,
              },
            ],
          },
        ],
      },
      {
        name: 'empty',
        defaultSignature: 'empty(collection)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_EMPTY,
        signatures: [
          {
            definition: 'empty(collection: object|array|string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_EMPTY,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_EMPTY_COLLECTION,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'intersection',
        defaultSignature: 'intersection(collection_1, collection_2, ...)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_INTERSECTION,
        signatures: [
          {
            definition: 'intersection(collection_1: object|array, collection_2: object|array)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_INTERSECTION_INFO,
            parameters: [
              {
                name: 'collection_1',
                documentation: Resources.TOKEN_PARAMETER_INTERSECTION_ALL,
              },
              {
                name: 'collection_2',
                documentation: Resources.TOKEN_PARAMETER_INTERSECTION_ALL,
              },
            ],
          },
          {
            definition: 'intersection(collection_1: object|array, collection_2: object|array, ...)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_INTERSECTION_INFO,
            parameters: [
              {
                name: 'collection_1',
                documentation: Resources.TOKEN_PARAMETER_INTERSECTION_ALL,
              },
              {
                name: 'collection_2',
                documentation: Resources.TOKEN_PARAMETER_INTERSECTION_ALL,
              },
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_INTERSECTION_ALL,
                type: 'object|array',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'union',
        defaultSignature: 'union(collection_1, collection_2?, ...)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_UNION,
        signatures: [
          {
            definition: 'union(collection_1: object|array, collection_2: object|array)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_UNION_INFO,
            parameters: [
              {
                name: 'collection_1',
                documentation: Resources.TOKEN_PARAMETER_UNION_ALL,
              },
              {
                name: 'collection_2',
                documentation: Resources.TOKEN_PARAMETER_UNION_ALL,
              },
            ],
          },
          {
            definition: 'union(collection_1: object|array, collection_2: object|array, ...)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_UNION_INFO,
            parameters: [
              {
                name: 'collection_1',
                documentation: Resources.TOKEN_PARAMETER_UNION_ALL,
              },
              {
                name: 'collection_2',
                documentation: Resources.TOKEN_PARAMETER_UNION_ALL,
              },
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_UNION_ALL,
                type: 'object|array',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'first',
        defaultSignature: 'first(collection)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_FIRST,
        signatures: [
          {
            definition: 'first(collection: array|string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_FIRST,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_FIRST_COLLECTION,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'last',
        defaultSignature: 'last(collection)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_LAST,
        signatures: [
          {
            definition: 'last(collection: array|string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_LAST,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_LAST_COLLECTION,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'take',
        defaultSignature: 'take(value, count)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_TAKE,
        signatures: [
          {
            definition: 'take(collection: array|string, count: integer)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_TAKE,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_TAKE_COLLECTION,
              },
              {
                name: 'count',
                documentation: Resources.TOKEN_PARAMETER_TAKE_COUNT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'skip',
        defaultSignature: 'skip(collection, count)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_SKIP,
        signatures: [
          {
            definition: 'skip(collection: array, count: integer)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_SKIP,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_SKIP_COLLECTION,
              },
              {
                name: 'count',
                documentation: Resources.TOKEN_PARAMETER_SKIP_COUNT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'join',
        defaultSignature: 'join(collection, delimiter)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_JOIN,
        signatures: [
          {
            definition: 'join(collection: array, delimiter: string)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_JOIN,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_JOIN_COLLECTION,
              },
              {
                name: 'delimiter',
                documentation: Resources.TOKEN_PARAMETER_JOIN_DELIMITER,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'chunk',
        defaultSignature: 'chunk(collection, length)',
        description: Resources.TOKEN_FUNCTION_COLLECTION_CHUNK,
        signatures: [
          {
            definition: 'chunk(collection: array|string, length: int)',
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_CHUNK,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_CHUNK_COLLECTION,
              },
              {
                name: 'length',
                documentation: Resources.TOKEN_PARAMETER_CHUNK_LENGTH,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
    ],
  },
  {
    id: 'logical',
    name: Resources.TOKEN_FUNCTION_SECTION_LOGICAL,
    functions: [
      {
        name: 'if',
        defaultSignature: 'if(expression, valueIfTrue, valueIfFalse)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_IF,
        signatures: [
          {
            definition: 'if(expression: boolean, valueIfTrue: any, valueIfFalse: any)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_IF,
            parameters: [
              {
                name: 'expression',
                documentation: Resources.TOKEN_PARAMETER_IF_EXPRESSION,
              },
              {
                name: 'valueIfTrue',
                documentation: Resources.TOKEN_PARAMETER_IF_VALUEIFTRUE,
              },
              {
                name: 'valueIfFalse',
                documentation: Resources.TOKEN_PARAMETER_IF_VALUEIFFALSE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'equals',
        defaultSignature: 'equals(object1, object2)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_EQUALS,
        signatures: [
          {
            definition: 'equals(object1: any, object2: any)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_EQUALS,
            parameters: [
              {
                name: 'object1',
                documentation: Resources.TOKEN_PARAMETER_EQUALS_OBJECT,
              },
              {
                name: 'object2',
                documentation: Resources.TOKEN_PARAMETER_EQUALS_OBJECT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'and',
        defaultSignature: 'and(expression1, expression2)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_AND,
        signatures: [
          {
            definition: 'and(expression1: boolean, expression2: boolean)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_AND,
            parameters: [
              {
                name: 'expression1',
                documentation: Resources.TOKEN_PARAMETER_AND_EXPRESSION,
              },
              {
                name: 'expression2',
                documentation: Resources.TOKEN_PARAMETER_AND_EXPRESSION,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'or',
        defaultSignature: 'or(expression1, expression2)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_OR,
        signatures: [
          {
            definition: 'or(expression1: boolean, expression2: boolean)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_OR,
            parameters: [
              {
                name: 'expression1',
                documentation: Resources.TOKEN_PARAMETER_OR_EXPRESSION,
              },
              {
                name: 'expression2',
                documentation: Resources.TOKEN_PARAMETER_OR_EXPRESSION,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'not',
        defaultSignature: 'not(expression)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_NOT,
        signatures: [
          {
            definition: 'not(expression: boolean)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_NOT,
            parameters: [
              {
                name: 'expression',
                documentation: Resources.TOKEN_PARAMETER_NOT_EXPRESSION,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'less',
        defaultSignature: 'less(value, compareTo)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_LESS,
        signatures: [
          {
            definition: 'less(value: integer|float|string, compareTo: integer|float|string)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_LESS,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_LESS_VALUE,
              },
              {
                name: 'compareTo',
                documentation: Resources.TOKEN_PARAMETER_LESS_COMPARETO,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'lessOrEquals',
        defaultSignature: 'lessOrEquals(value, compareTo)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_LESSOREQUALS,
        signatures: [
          {
            definition: 'lessOrEquals(value: integer|float|string, compareTo: integer|float|string)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_LESSOREQUALS,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_LESSOREQUALS_VALUE,
              },
              {
                name: 'compareTo',
                documentation: Resources.TOKEN_PARAMETER_LESSOREQUALS_COMPARETO,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'greater',
        defaultSignature: 'greater(value, compareTo)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_GREATER,
        signatures: [
          {
            definition: 'greater(value: integer|float|string, compareTo: integer|float|string)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_GREATER,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_GREATER_VALUE,
              },
              {
                name: 'compareTo',
                documentation: Resources.TOKEN_PARAMETER_GREATER_COMPARETO,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'greaterOrEquals',
        defaultSignature: 'greaterOrEquals(value, compareTo)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_GREATEROREQUALS,
        signatures: [
          {
            definition: 'greaterOrEquals(value: integer|float|string, compareTo: integer|float|string)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_GREATEROREQUALS,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_GREATEROREQUALS_VALUE,
              },
              {
                name: 'compareTo',
                documentation: Resources.TOKEN_PARAMETER_GREATEROREQUALS_COMPARETO,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'isInt',
        defaultSignature: 'isInt(value)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_ISINT,
        signatures: [
          {
            definition: 'isInt(value: string)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_ISINT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_ISINT_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'isFloat',
        defaultSignature: 'isFloat(value, locale?)',
        description: Resources.TOKEN_FUNCTION_LOGICAL_ISFLOAT,
        signatures: [
          {
            definition: 'isFloat(value: string, locale?: string)',
            documentation: Resources.TOKEN_FUNCTION_LOGICAL_ISFLOAT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_ISFLOAT_VALUE,
              },
              {
                name: 'locale',
                documentation: Resources.TOKEN_PARAMETER_ISFLOAT_LOCALE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
    ],
  },
  {
    id: 'conversion',
    name: Resources.TOKEN_FUNCTION_SECTION_CONVERSION,
    functions: [
      {
        name: 'json',
        defaultSignature: 'json(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_JSON,
        signatures: [
          {
            definition: 'json(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_JSON,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_JSON_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'xml',
        defaultSignature: 'xml(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_XML,
        signatures: [
          {
            definition: 'xml(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_XML,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_XML_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'int',
        defaultSignature: 'int(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_INT,
        signatures: [
          {
            definition: 'int(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_INT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_INT_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'string',
        defaultSignature: 'string(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_STRING,
        signatures: [
          {
            definition: 'string(value: any)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_STRING,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_STRING_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'float',
        defaultSignature: 'float(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_FLOAT,
        signatures: [
          {
            definition: 'float(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_FLOAT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_FLOAT_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'bool',
        defaultSignature: 'bool(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_BOOL,
        signatures: [
          {
            definition: 'bool(value: any)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_BOOL,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_BOOL_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'base64',
        defaultSignature: 'base64(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_BASE64,
        signatures: [
          {
            definition: 'base64(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_BASE64,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_BASE64_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'base64ToBinary',
        defaultSignature: 'base64ToBinary(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_BASE64TOBINARY,
        signatures: [
          {
            definition: 'base64ToBinary(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_BASE64TOBINARY,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_BASE64TOBINARY_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'base64ToString',
        defaultSignature: 'base64ToString(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_BASE64TOSTRING,
        signatures: [
          {
            definition: 'base64ToString(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_BASE64TOSTRING,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_BASE64TOSTRING_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'binary',
        defaultSignature: 'binary(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_BINARY,
        signatures: [
          {
            definition: 'binary(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_BINARY,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_BINARY_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'dataUriToBinary',
        defaultSignature: 'dataUriToBinary(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DATAURITOBINARY,
        signatures: [
          {
            definition: 'dataUriToBinary(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DATAURITOBINARY,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DATAURITOBINARY_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'dataUriToString',
        defaultSignature: 'dataUriToString(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DATAURITOSTRING,
        signatures: [
          {
            definition: 'dataUriToString(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DATAURITOSTRING,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DATAURITOSTRING_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'dataUri',
        defaultSignature: 'dataUri(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DATAURI,
        signatures: [
          {
            definition: 'dataUri(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DATAURI,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DATAURI_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'decodeBase64',
        defaultSignature: 'decodeBase64(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DECODEBASE64,
        signatures: [
          {
            definition: 'decodeBase64(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DECODEBASE64,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DECODEBASE64_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'utf8Length',
        defaultSignature: 'utf8Length(value)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_UTF8LENGTH,
        signatures: [
          {
            definition: 'utf8Length(value: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_UTF8LENGTH,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_UTF8LENGTH_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'utf16Length',
        defaultSignature: 'utf16Length(value)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_UTF16LENGTH,
        signatures: [
          {
            definition: 'utf16Length(value: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_UTF16LENGTH,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_UTF16LENGTH_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'encodeUriComponent',
        defaultSignature: 'encodeUriComponent(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_ENCODEURICOMPONENT,
        signatures: [
          {
            definition: 'encodeUriComponent(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_ENCODEURICOMPONENT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_ENCODEURICOMPONENT_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'decodeUriComponent',
        defaultSignature: 'decodeUriComponent(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DECODEURICOMPONENT,
        signatures: [
          {
            definition: 'decodeUriComponent(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DECODEURICOMPONENT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DECODEURICOMPONENT_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'decodeDataUri',
        defaultSignature: 'decodeDataUri(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DECODEDATAURI,
        signatures: [
          {
            definition: 'decodeDataUri(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DECODEDATAURI,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DECODEDATAURI_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'uriComponent',
        defaultSignature: 'uriComponent(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_URICOMPONENT,
        signatures: [
          {
            definition: 'uriComponent(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_URICOMPONENT,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_URICOMPONENT_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'uriComponentToBinary',
        defaultSignature: 'uriComponentToBinary(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOBINARY,
        signatures: [
          {
            definition: 'uriComponentToBinary(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOBINARY,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_URICOMPONENTTOBINARY_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'uriComponentToString',
        defaultSignature: 'uriComponentToString(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOSTRING,
        signatures: [
          {
            definition: 'uriComponentToString(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOSTRING,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_URICOMPONENTTOSTRING_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'array',
        defaultSignature: 'array(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_ARRAY,
        signatures: [
          {
            definition: 'array(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_ARRAY,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_ARRAY_VALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'createArray',
        defaultSignature: 'createArray(object_1, object_2?, ...)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_CREATEARRAY,
        signatures: [
          {
            definition: 'createArray(object_1: any)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_CREATEARRAY,
            parameters: [
              {
                name: 'object_1',
                documentation: Resources.TOKEN_PARAMETER_CREATEARRAY_ALL,
              },
            ],
          },
          {
            definition: 'createArray(object_1: any, ...)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_CREATEARRAY,
            parameters: [
              {
                name: 'object_1',
                documentation: Resources.TOKEN_PARAMETER_CREATEARRAY_ALL,
                type: 'any',
              },
              {
                name: 'object',
                documentation: Resources.TOKEN_PARAMETER_CREATEARRAY_ALL,
                type: 'any',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'triggerFormDataValue',
        defaultSignature: 'triggerFormDataValue(key)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAVALUE,
        signatures: [
          {
            definition: 'triggerFormDataValue(key: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAVALUE,
            parameters: [
              {
                name: 'key',
                documentation: Resources.TOKEN_PARAMETER_TRIGGERFORMDATAVALUE_KEY,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'triggerFormDataMultiValues',
        defaultSignature: 'triggerFormDataMultiValues(key)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAMULTIVALUES,
        signatures: [
          {
            definition: 'triggerFormDataMultiValues(key: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAMULTIVALUES,
            parameters: [
              {
                name: 'key',
                documentation: Resources.TOKEN_PARAMETER_TRIGGERFORMDATAMULTIVALUES_KEY,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'triggerMultipartBody',
        defaultSignature: 'triggerMultipartBody(index)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_TRIGGERMULTIPARTBODY,
        signatures: [
          {
            definition: 'triggerMultipartBody(index: number)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_TRIGGERMULTIPARTBODY,
            parameters: [
              {
                name: 'index',
                documentation: Resources.TOKEN_PARAMETER_TRIGGERMULTIPARTBODY_INDEX,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'formDataValue',
        defaultSignature: 'formDataValue(actionName, key)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_FORMDATAVALUE,
        signatures: [
          {
            definition: 'formDataValue(actionName: string, key: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_FORMDATAVALUE,
            parameters: [
              {
                name: 'actionName',
                documentation: Resources.TOKEN_PARAMETER_FORMDATAVALUE_ACTIONNAME,
              },
              {
                name: 'key',
                documentation: Resources.TOKEN_PARAMETER_FORMDATAVALUE_KEY,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'formDataMultiValues',
        defaultSignature: 'formDataMultiValues(actionName, key)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_FORMDATAMULTIVALUES,
        signatures: [
          {
            definition: 'formDataMultiValues(actionName: string, key: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_FORMDATAMULTIVALUES,
            parameters: [
              {
                name: 'actionName',
                documentation: Resources.TOKEN_PARAMETER_FORMDATAMULTIVALUES_ACTIONNAME,
              },
              {
                name: 'key',
                documentation: Resources.TOKEN_PARAMETER_FORMDATAMULTIVALUES_KEY,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'multipartBody',
        defaultSignature: 'multipartBody(actionName, index)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_MULTIPARTBODY,
        signatures: [
          {
            definition: 'multipartBody(actionName: string, index: number)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_MULTIPARTBODY,
            parameters: [
              {
                name: 'actionName',
                documentation: Resources.TOKEN_PARAMETER_MULTIPARTBODY_ACTIONNAME,
              },
              {
                name: 'index',
                documentation: Resources.TOKEN_PARAMETER_MULTIPARTBODY_INDEX,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'decimal',
        defaultSignature: 'decimal(value)',
        description: Resources.TOKEN_FUNCTION_CONVERSION_DECIMAL,
        signatures: [
          {
            definition: 'decimal(value: string)',
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_DECIMAL,
            parameters: [
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_DECIMAL_VALUE,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
    ],
  },
  {
    id: 'math',
    name: Resources.TOKEN_FUNCTION_SECTION_MATH,
    functions: [
      {
        name: 'min',
        defaultSignature: 'min(collection or item1, item2?, ...)',
        description: Resources.TOKEN_FUNCTION_MATH_MIN,
        signatures: [
          {
            definition: 'min(value_1: array|number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_MIN,
            parameters: [
              {
                name: 'value_1',
                documentation: Resources.TOKEN_PARAMETER_MIN_ALL,
              },
            ],
          },
          {
            definition: 'min(value_1: array|number, ...)',
            documentation: Resources.TOKEN_FUNCTION_MATH_MIN,
            parameters: [
              {
                name: 'value_1',
                documentation: Resources.TOKEN_PARAMETER_MIN_ALL,
              },
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_MIN_ALL,
                type: 'array|number',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'max',
        defaultSignature: 'max(collection or item1, item2?, ...)',
        description: Resources.TOKEN_FUNCTION_MATH_MAX,
        signatures: [
          {
            definition: 'max(value_1: array|number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_MAX,
            parameters: [
              {
                name: 'value_1',
                documentation: Resources.TOKEN_PARAMETER_MAX_ALL,
              },
            ],
          },
          {
            definition: 'max(value_1: array|number, ...)',
            documentation: Resources.TOKEN_FUNCTION_MATH_MAX,
            parameters: [
              {
                name: 'value_1',
                documentation: Resources.TOKEN_PARAMETER_MAX_ALL,
              },
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_MAX_ALL,
                type: 'array|number',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'rand',
        defaultSignature: 'rand(minValue, maxValue)',
        description: Resources.TOKEN_FUNCTION_MATH_RAND,
        signatures: [
          {
            definition: 'rand(minValue: integer, maxValue: integer)',
            documentation: Resources.TOKEN_FUNCTION_MATH_RAND,
            parameters: [
              {
                name: 'minValue',
                documentation: Resources.TOKEN_PARAMETER_RAND_MINVALUE,
              },
              {
                name: 'maxValue',
                documentation: Resources.TOKEN_PARAMETER_RAND_MAXVALUE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'add',
        defaultSignature: 'add(summand_1, summand_2)',
        description: Resources.TOKEN_FUNCTION_MATH_ADD,
        signatures: [
          {
            definition: 'add(summand_1: number, summand_2: number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_ADD,
            parameters: [
              {
                name: 'summand_1',
                documentation: Resources.TOKEN_PARAMETER_ADD_SUMMAND1,
              },
              {
                name: 'summand_2',
                documentation: Resources.TOKEN_PARAMETER_ADD_SUMMAND2,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'sub',
        defaultSignature: 'sub(minuend, subtrahend)',
        description: Resources.TOKEN_FUNCTION_MATH_SUB,
        signatures: [
          {
            definition: 'sub(minuend: number, subtrahend: number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_SUB,
            parameters: [
              {
                name: 'minuend',
                documentation: Resources.TOKEN_PARAMETER_SUB_MINUEND,
              },
              {
                name: 'subtrahend',
                documentation: Resources.TOKEN_PARAMETER_SUB_SUBTRAHEND,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'mul',
        defaultSignature: 'mul(multiplicand_1, multiplicand_2)',
        description: Resources.TOKEN_FUNCTION_MATH_MUL,
        signatures: [
          {
            definition: 'mul(multiplicand_1: number, multiplicand_2: number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_MUL,
            parameters: [
              {
                name: 'multiplicand_1',
                documentation: Resources.TOKEN_PARAMETER_MUL_MULTIPLICAND1,
              },
              {
                name: 'multiplicand_2',
                documentation: Resources.TOKEN_PARAMETER_MUL_MULTIPLICAND2,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'div',
        defaultSignature: 'div(dividend, divisor)',
        description: Resources.TOKEN_FUNCTION_MATH_DIV,
        signatures: [
          {
            definition: 'div(dividend: number, divisor: number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_DIV,
            parameters: [
              {
                name: 'dividend',
                documentation: Resources.TOKEN_PARAMETER_DIV_DIVIDEND,
              },
              {
                name: 'divisor',
                documentation: Resources.TOKEN_PARAMETER_DIV_DIVISOR,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'mod',
        defaultSignature: 'mod(dividend, divisor)',
        description: Resources.TOKEN_FUNCTION_MATH_MOD,
        signatures: [
          {
            definition: 'mod(dividend: number, divisor: number)',
            documentation: Resources.TOKEN_FUNCTION_MATH_MOD,
            parameters: [
              {
                name: 'dividend',
                documentation: Resources.TOKEN_PARAMETER_MOD_DIVIDEND,
              },
              {
                name: 'divisor',
                documentation: Resources.TOKEN_PARAMETER_MOD_DIVISOR,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'range',
        defaultSignature: 'range(startIndex, count)',
        description: Resources.TOKEN_FUNCTION_MATH_RANGE,
        signatures: [
          {
            definition: 'range(startIndex: integer, count: integer)',
            documentation: Resources.TOKEN_FUNCTION_MATH_RANGE,
            parameters: [
              {
                name: 'startIndex',
                documentation: Resources.TOKEN_PARAMETER_RANGE_STARTINDEX,
              },
              {
                name: 'count',
                documentation: Resources.TOKEN_PARAMETER_RANGE_COUNT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
    ],
  },
  {
    id: 'dateTime',
    name: Resources.TOKEN_FUNCTION_SECTION_DATETIME,
    functions: [
      {
        name: 'utcNow',
        defaultSignature: 'utcNow()',
        description: Resources.TOKEN_FUNCTION_DATETIME_UTCNOW,
        signatures: [
          {
            definition: 'utcNow()',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_UTCNOW,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'getFutureTime',
        defaultSignature: 'getFutureTime(interval, timeUnit, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_GETFUTURETIME,
        signatures: [
          {
            definition: 'getFutureTime(interval: integer, timeUnit: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_GETFUTURETIME,
            parameters: [
              {
                name: 'interval',
                documentation: Resources.TOKEN_PARAMETER_GETFUTURETIME_INTERVAL,
              },
              {
                name: 'timeUnit',
                documentation: Resources.TOKEN_PARAMETER_GETFUTURETIME_TIMEUNIT,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'getPastTime',
        defaultSignature: 'getPastTime(interval, timeUnit, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_GETPASTTIME,
        signatures: [
          {
            definition: 'getPastTime(interval: integer, timeUnit: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_GETPASTTIME,
            parameters: [
              {
                name: 'interval',
                documentation: Resources.TOKEN_PARAMETER_GETPASTTIME_INTERVAL,
              },
              {
                name: 'timeUnit',
                documentation: Resources.TOKEN_PARAMETER_GETPASTTIME_TIMEUNIT,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'addToTime',
        defaultSignature: 'addToTime(timestamp, interval, timeUnit, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_ADDTOTIME,
        signatures: [
          {
            definition: 'addToTime(timestamp: string, interval: integer, timeUnit: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_ADDTOTIME,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'interval',
                documentation: Resources.TOKEN_PARAMETER_ADDTOTIME_INTERVAL,
              },
              {
                name: 'timeUnit',
                documentation: Resources.TOKEN_PARAMETER_ADDTOTIME_TIMEUNIT,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'subtractFromTime',
        defaultSignature: 'subtractFromTime(timestamp, interval, timeUnit, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_SUBTRACTFROMTIME,
        signatures: [
          {
            definition: 'subtractFromTime(timestamp: string, interval: integer, timeUnit: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_SUBTRACTFROMTIME,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'interval',
                documentation: Resources.TOKEN_PARAMETER_SUBTRACTFROMTIME_INTERVAL,
              },
              {
                name: 'timeUnit',
                documentation: Resources.TOKEN_PARAMETER_SUBTRACTFROMTIME_TIMEUNIT,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'addSeconds',
        defaultSignature: 'addSeconds(timestamp, seconds, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_ADDSECONDS,
        signatures: [
          {
            definition: 'addSeconds(timestamp: string, seconds: integer, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_ADDSECONDS,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'seconds',
                documentation: Resources.TOKEN_PARAMETER_ADDSECONDS_SECONDS,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'addMinutes',
        defaultSignature: 'addMinutes(timestamp, minutes, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_ADDMINUTES,
        signatures: [
          {
            definition: 'addMinutes(timestamp: string, minutes: integer, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_ADDMINUTES,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'minutes',
                documentation: Resources.TOKEN_PARAMETER_ADDMINUTES_MINUTES,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'addHours',
        defaultSignature: 'addHours(timestamp, hours, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_ADDHOURS,
        signatures: [
          {
            definition: 'addHours(timestamp: string, hours: integer, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_ADDHOURS,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'hours',
                documentation: Resources.TOKEN_PARAMETER_ADDHOURS_HOURS,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'addDays',
        defaultSignature: 'addDays(timestamp, days, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_ADDDAYS,
        signatures: [
          {
            definition: 'addDays(timestamp: string, days: integer, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_ADDDAYS,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'days',
                documentation: Resources.TOKEN_PARAMETER_ADDDAYS_DAYS,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'dateDifference',
        defaultSignature: 'dateDifference(startTimestamp, endTimestamp)',
        description: Resources.TOKEN_FUNCTION_DATETIME_DATEDIFFERENCE,
        signatures: [
          {
            definition: 'dateDifference(startTimestamp: string, endTimestamp: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_DATEDIFFERENCE,
            parameters: [
              {
                name: 'startTimestamp',
                documentation: Resources.TOKEN_PARAMETER_DATEDIFFERENCE_STARTTIMESTAMP,
              },
              {
                name: 'endTimestamp',
                documentation: Resources.TOKEN_PARAMETER_DATEDIFFERENCE_ENDTIMESTAMP,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'convertTimeZone',
        defaultSignature: 'convertTimeZone(timestamp, sourceTimeZone, destinationTimeZone, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_CONVERTTIMEZONE,
        signatures: [
          {
            definition: 'convertTimeZone(timestamp: string, sourceTimeZone: string, destinationTimeZone: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_CONVERTTIMEZONE,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'sourceTimeZone',
                documentation: Resources.TOKEN_PARAMETER_SOURCETIMEZONE,
              },
              {
                name: 'destinationTimeZone',
                documentation: Resources.TOKEN_PARAMETER_DESTINATIONTIMEZONE,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'convertToUtc',
        defaultSignature: 'convertToUtc(timestamp, sourceTimeZone, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_CONVERTTOUTC,
        signatures: [
          {
            definition: 'convertToUtc(timestamp: string, sourceTimeZone: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_CONVERTTOUTC,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'sourceTimeZone',
                documentation: Resources.TOKEN_PARAMETER_SOURCETIMEZONE,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'convertFromUtc',
        defaultSignature: 'convertFromUtc(timestamp, destinationTimeZone, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_CONVERTFROMUTC,
        signatures: [
          {
            definition: 'convertFromUtc(timestamp: string, destinationTimeZone: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_CONVERTFROMUTC,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'destinationTimeZone',
                documentation: Resources.TOKEN_PARAMETER_DESTINATIONTIMEZONE,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'formatDateTime',
        defaultSignature: 'formatDateTime(timestamp, format?, locale?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_FORMATDATETIME,
        signatures: [
          {
            definition: 'formatDateTime(timestamp: string, format?: string, locale?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_FORMATDATETIME,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
              {
                name: 'locale',
                documentation: Resources.TOKEN_PARAMETER_LOCALE,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'parseDateTime',
        defaultSignature: 'parseDateTime(dateString, locale?, format?)',
        description: Resources.TOKEN_FUNCTION_DATETIME_PARSEDATETIME,
        signatures: [
          {
            definition: 'parseDateTime(dateString: string, locale?: string, format?: string))',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_PARSEDATETIME,
            parameters: [
              {
                name: 'dateString',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'locale',
                documentation: Resources.TOKEN_PARAMETER_LOCALE,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'startOfHour',
        defaultSignature: 'startOfHour(timestamp, format)',
        description: Resources.TOKEN_FUNCTION_DATETIME_STARTOFHOUR,
        signatures: [
          {
            definition: 'startOfHour(timestamp: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_STARTOFHOUR,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'startOfDay',
        defaultSignature: 'startOfDay(timestamp, format)',
        description: Resources.TOKEN_FUNCTION_DATETIME_STARTOFDAY,
        signatures: [
          {
            definition: 'startOfDay(timestamp: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_STARTOFDAY,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'startOfMonth',
        defaultSignature: 'startOfMonth(timestamp, format)',
        description: Resources.TOKEN_FUNCTION_DATETIME_STARTOFMONTH,
        signatures: [
          {
            definition: 'startOfMonth(timestamp: string, format?: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_STARTOFMONTH,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
              {
                name: 'format',
                documentation: Resources.TOKEN_PARAMETER_FORMAT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'dayOfWeek',
        defaultSignature: 'dayOfWeek(timestamp)',
        description: Resources.TOKEN_FUNCTION_DATETIME_DAYOFWEEK,
        signatures: [
          {
            definition: 'dayOfWeek(timestamp: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_DAYOFWEEK,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'dayOfMonth',
        defaultSignature: 'dayOfMonth(timestamp)',
        description: Resources.TOKEN_FUNCTION_DATETIME_DAYOFMONTH,
        signatures: [
          {
            definition: 'dayOfMonth(timestamp: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_DAYOFMONTH,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'dayOfYear',
        defaultSignature: 'dayOfYear(timestamp)',
        description: Resources.TOKEN_FUNCTION_DATETIME_DAYOFYEAR,
        signatures: [
          {
            definition: 'dayOfYear(timestamp: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_DAYOFYEAR,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'ticks',
        defaultSignature: 'ticks(timestamp)',
        description: Resources.TOKEN_FUNCTION_DATETIME_TICKS,
        signatures: [
          {
            definition: 'ticks(timestamp: string)',
            documentation: Resources.TOKEN_FUNCTION_DATETIME_TICKS,
            parameters: [
              {
                name: 'timestamp',
                documentation: Resources.TOKEN_PARAMETER_TIMESTAMP,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
    ],
  },
  {
    id: 'reference',
    name: Resources.TOKEN_FUNCTION_SECTION_REFERENCE,
    functions: [
      {
        name: 'parameters',
        defaultSignature: 'parameters(parameterName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_PARAMETERS,
        signatures: [
          {
            definition: 'parameters(parameterName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_PARAMETERS,
            parameters: [
              {
                name: 'parameterName',
                documentation: Resources.TOKEN_PARAMETER_PARAMETERS_PARAMETERNAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'result',
        defaultSignature: 'result(scopedActionName?)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_RESULT,
        signatures: [
          {
            definition: 'result(scopedActionName?: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_RESULT,
            parameters: [
              {
                name: 'scopedActionName',
                documentation: Resources.TOKEN_PARAMETER_RESULT_SCOPEDACTIONNAME,
                type: 'string',
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'actions',
        defaultSignature: 'actions(actionName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_ACTIONS,
        signatures: [
          {
            definition: 'actions(actionName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_ACTIONS,
            parameters: [
              {
                name: 'actionName',
                documentation: Resources.TOKEN_PARAMETER_ACTIONS_ACTIONNAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'outputs',
        defaultSignature: 'outputs(actionName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_OUTPUTS,
        signatures: [
          {
            definition: 'outputs(actionName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_OUTPUTS,
            parameters: [
              {
                name: 'actionName',
                documentation: Resources.TOKEN_PARAMETER_ACTIONOUTPUTS_ACTIONNAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'body',
        defaultSignature: 'body(actionName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_BODY,
        signatures: [
          {
            definition: 'body(actionName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_BODY,
            parameters: [
              {
                name: 'actionName',
                documentation: Resources.TOKEN_PARAMETER_ACTIONBODY_ACTIONNAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'triggerOutputs',
        defaultSignature: 'triggerOutputs()',
        description: Resources.TOKEN_FUNCTION_REFERENCE_TRIGGEROUTPUTS,
        signatures: [
          {
            definition: 'triggerOutputs()',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_TRIGGEROUTPUTS,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'triggerBody',
        defaultSignature: 'triggerBody()',
        description: Resources.TOKEN_FUNCTION_REFERENCE_TRIGGERBODY,
        signatures: [
          {
            definition: 'triggerBody()',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_TRIGGERBODY,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'trigger',
        defaultSignature: 'trigger()',
        description: Resources.TOKEN_FUNCTION_REFERENCE_TRIGGER,
        signatures: [
          {
            definition: 'trigger()',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_TRIGGER,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'item',
        defaultSignature: 'item()',
        description: Resources.TOKEN_FUNCTION_REFERENCE_ITEM,
        signatures: [
          {
            definition: 'item()',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_ITEM,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'items',
        defaultSignature: 'items(loopName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_ITEM,
        signatures: [
          {
            definition: 'items(loopName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_ITEM,
            parameters: [
              {
                name: 'loopName',
                documentation: Resources.TOKEN_PARAMETER_ITEMS_LOOPNAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'iterationIndexes',
        defaultSignature: 'iterationIndexes(loopName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_ITERATIONINDEXES,
        signatures: [
          {
            definition: 'iterationIndexes(loopName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_ITERATIONINDEXES,
            parameters: [
              {
                name: 'loopName',
                documentation: Resources.TOKEN_PARAMETER_ITEMS_LOOPNAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'variables',
        defaultSignature: 'variables(variableName)',
        description: Resources.TOKEN_FUNCTION_REFERENCE_VARIABLES,
        signatures: [
          {
            definition: 'variables(variableName: string)',
            documentation: Resources.TOKEN_FUNCTION_REFERENCE_VARIABLES,
            parameters: [
              {
                name: 'variableName',
                documentation: Resources.TOKEN_PARAMETER_VARIABLES_VARIABLENAME,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
    ],
  },
  {
    id: 'workflow',
    name: Resources.TOKEN_FUNCTION_SECTION_WORKFLOW,
    functions: [
      {
        name: 'listCallbackUrl',
        defaultSignature: 'listCallbackUrl()',
        description: Resources.TOKEN_FUNCTION_WORKFLOW_LISTCALLBACKURL,
        signatures: [
          {
            definition: 'listCallbackUrl()',
            documentation: Resources.TOKEN_FUNCTION_WORKFLOW_LISTCALLBACKURL_DETAIL,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'workflow',
        defaultSignature: 'workflow()',
        description: Resources.TOKEN_FUNCTION_WORKFLOW_WORKFLOW,
        signatures: [
          {
            definition: 'workflow()',
            documentation: Resources.TOKEN_FUNCTION_WORKFLOW_WORKFLOW,
            parameters: [],
          },
        ],
        isAdvanced: false,
      },
    ],
  },
  {
    id: 'uriParsing',
    name: Resources.TOKEN_FUNCTION_SECTION_URI_PARSING,
    functions: [
      {
        name: 'uriHost',
        defaultSignature: 'uriHost(uri)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_URIHOST,
        signatures: [
          {
            definition: 'uriHost(uri: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_URIHOST,
            parameters: [
              {
                name: 'uri',
                documentation: Resources.TOKEN_PARAMETER_URI_TEXT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'uriPath',
        defaultSignature: 'uriPath(uri)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_URIPATH,
        signatures: [
          {
            definition: 'uriPath(uri: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_URIPATH,
            parameters: [
              {
                name: 'uri',
                documentation: Resources.TOKEN_PARAMETER_URI_TEXT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'uriPathAndQuery',
        defaultSignature: 'uriPathAndQuery(uri: string)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_URIPATHANDQUERY,
        signatures: [
          {
            definition: 'uriPathAndQuery(uri: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_URIPATHANDQUERY,
            parameters: [
              {
                name: 'uri',
                documentation: Resources.TOKEN_PARAMETER_URI_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'uriPort',
        defaultSignature: 'uriPort(uri: string)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_URIPORT,
        signatures: [
          {
            definition: 'uriPort(uri: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_URIPORT,
            parameters: [
              {
                name: 'uri',
                documentation: Resources.TOKEN_PARAMETER_URI_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'uriScheme',
        defaultSignature: 'uriScheme(uri: string)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_URISCHEME,
        signatures: [
          {
            definition: 'uriScheme(uri: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_URISCHEME,
            parameters: [
              {
                name: 'uri',
                documentation: Resources.TOKEN_PARAMETER_URI_TEXT,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'uriQuery',
        defaultSignature: 'uriQuery(uri: string)',
        description: Resources.TOKEN_FUNCTION_FUNCTION_URIQUERY,
        signatures: [
          {
            definition: 'uriQuery(uri: string)',
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_URIQUERY,
            parameters: [
              {
                name: 'text',
                documentation: Resources.TOKEN_PARAMETER_URI_TEXT,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
    ],
  },
  {
    id: 'manipulation',
    name: Resources.TOKEN_FUNCTION_SECTION_MANIPULATION,
    functions: [
      {
        name: 'coalesce',
        defaultSignature: 'coalesce(object_1, object_2?, ...)',
        description: Resources.TOKEN_FUNCTION_MANIPULATION_COALESCE,
        signatures: [
          {
            definition: 'coalesce(object_1: any)',
            documentation: Resources.TOKEN_FUNCTION_MANIPULATION_COALESCE,
            parameters: [
              {
                name: 'object_1',
                documentation: Resources.TOKEN_PARAMETER_COALESCE_ALL,
                type: 'any',
              },
            ],
          },
          {
            definition: 'coalesce(object_1: any, ...)',
            documentation: Resources.TOKEN_FUNCTION_MANIPULATION_COALESCE,
            parameters: [
              {
                name: 'object_1',
                documentation: Resources.TOKEN_PARAMETER_COALESCE_ALL,
                type: 'any',
              },
              {
                name: 'object',
                documentation: Resources.TOKEN_PARAMETER_COALESCE_ALL,
                type: 'any',
                isVariable: true,
              },
            ],
          },
        ],
        isAdvanced: true,
      },
      {
        name: 'addProperty',
        defaultSignature: 'addProperty(object, property, value)',
        description: Resources.TOKEN_FUNCTION_MANIPULATION_ADDPROPERTY,
        signatures: [
          {
            definition: 'addProperty(object: object, property: string, value: any)',
            documentation: Resources.TOKEN_FUNCTION_MANIPULATION_ADDPROPERTY,
            parameters: [
              {
                name: 'object',
                documentation: Resources.TOKEN_PARAMETER_OBJECT,
                type: 'object',
              },
              {
                name: 'property',
                documentation: Resources.TOKEN_PARAMETER_ADDPROPERTY_PROPERTY,
                type: 'string',
              },
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_VALUE,
                type: 'any',
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'setProperty',
        defaultSignature: 'setProperty(object, property, value)',
        description: Resources.TOKEN_FUNCTION_MANIPULATION_SETPROPERTY,
        signatures: [
          {
            definition: 'setProperty(object: object, property: string, value: any)',
            documentation: Resources.TOKEN_FUNCTION_MANIPULATION_SETPROPERTY,
            parameters: [
              {
                name: 'object',
                documentation: Resources.TOKEN_PARAMETER_OBJECT,
                type: 'object',
              },
              {
                name: 'property',
                documentation: Resources.TOKEN_PARAMETER_SETPROPERTY_PROPERTY,
                type: 'string',
              },
              {
                name: 'value',
                documentation: Resources.TOKEN_PARAMETER_VALUE,
                type: 'any',
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'removeProperty',
        defaultSignature: 'removeProperty(object, property)',
        description: Resources.TOKEN_FUNCTION_MANIPULATION_REMOVEPROPERTY,
        signatures: [
          {
            definition: 'removeProperty(object: object, property: string)',
            documentation: Resources.TOKEN_FUNCTION_MANIPULATION_REMOVEPROPERTY,
            parameters: [
              {
                name: 'object',
                documentation: Resources.TOKEN_PARAMETER_REMOVEPROPERTY_OBJECT,
                type: 'object',
              },
              {
                name: 'property',
                documentation: Resources.TOKEN_PARAMETER_REMOVEPROPERTY_PROPERTY,
                type: 'string',
              },
            ],
          },
        ],
        isAdvanced: false,
      },
      {
        name: 'xpath',
        defaultSignature: 'xpath(xml, xpath)',
        description: Resources.TOKEN_FUNCTION_MANIPULATION_XPATH,
        signatures: [
          {
            definition: 'xpath(xml: any, xpath: any)',
            documentation: Resources.TOKEN_FUNCTION_MANIPULATION_XPATH,
            parameters: [
              {
                name: 'xml',
                documentation: Resources.TOKEN_PARAMETER_XPATH_XML,
              },
              {
                name: 'xpath',
                documentation: Resources.TOKEN_PARAMETER_XPATH_XPATH,
              },
            ],
          },
        ],
        isAdvanced: false,
      },
    ],
  },
];
