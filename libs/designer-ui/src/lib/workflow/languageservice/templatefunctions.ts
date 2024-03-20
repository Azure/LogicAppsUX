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
    id: 'QZrxUk',
    description: 'Label for string functions',
  }),
  TOKEN_FUNCTION_FUNCTION_CONCAT: intl.formatMessage({
    defaultMessage: 'Combines any number of strings together',
    id: 'XEuptL',
    description: 'Label for combining strings together',
  }),
  TOKEN_PARAMETER_CONCAT_ALL: intl.formatMessage({
    defaultMessage: 'Required. One of the strings to combine into a single string.',
    id: 'P/S+q5',
    description: 'Required string parameter required to combine strings',
  }),
  TOKEN_FUNCTION_FUNCTION_SUBSTRING: intl.formatMessage({
    defaultMessage: 'Returns a subset of characters from a string.',
    id: 'yF2R//',
    description: 'Label for description of custom substring Function',
  }),
  TOKEN_PARAMETER_SUBSTRING_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string from which the substring is taken.',
    id: '7QymrD',
    description: 'Required string parameter required to obtain substring',
  }),
  TOKEN_PARAMETER_SUBSTRING_STARTINDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of where the substring begins in parameter 1.',
    id: 'egLI8P',
    description: 'Required start index parameter required to obtain substring',
  }),
  TOKEN_PARAMETER_SUBSTRING_LENGTH: intl.formatMessage({
    defaultMessage: 'Required. The length of the substring.',
    id: 'wQsEwc',
    description: 'Required length parameter to obtain substring',
  }),
  TOKEN_FUNCTION_FUNCTION_SLICE: intl.formatMessage({
    defaultMessage: 'Returns a section of a string defined by the start index and the end index',
    id: 'FN5zHQ',
    description: 'Label for description of custom slice Function',
  }),
  TOKEN_PARAMETER_SLICE_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string to slice.',
    id: 'H1wnHr',
    description: 'Required string parameter to slice',
  }),
  TOKEN_PARAMETER_SLICE_STARTINDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of where to start extracting the substring.',
    id: 'EZz5q7',
    description: 'Required start index parameter to obtain substring',
  }),
  TOKEN_PARAMETER_SLICE_ENDINDEX: intl.formatMessage({
    defaultMessage: 'Optional. The index of where to stop extracting the substring.',
    id: 'f1j0to',
    description: 'Optional end index parameter to obtain substring',
  }),
  TOKEN_FUNCTION_FUNCTION_REPLACE: intl.formatMessage({
    defaultMessage: 'Replaces a string with a given string',
    id: 'UHCVNK',
    description: 'Label for description of custom replace Function',
  }),
  TOKEN_PARAMETER_REPLACE_TEXT: intl.formatMessage({
    defaultMessage:
      'Required. The string that is searched for parameter 2 and updated with parameter 3, when parameter 2 is found in parameter 1.',
    id: 'wQcEXt',
    description: 'Required parameters for the custom Replace Function',
  }),
  TOKEN_FUNCTION_FUNCTION_GUID: intl.formatMessage({
    defaultMessage: 'Generates a globally unique string (GUID)',
    id: 'v39HKj',
    description: 'Label for description of custom Global Unique Identifier Function',
  }),
  TOKEN_PARAMETER_GUID_FORMAT: intl.formatMessage({
    defaultMessage: 'A single format specifier that indicates how to format the value of this Guid.',
    id: 'BuYrD3',
    description: 'Required format parameter to determine how to obtain GUID',
  }),
  TOKEN_FUNCTION_FUNCTION_TOLOWER: intl.formatMessage({
    defaultMessage: 'Converts a string to lowercase using the casing rules of the invariant culture',
    id: 'J5/7vN',
    description: 'Label for description of custom toLower Function',
  }),
  TOKEN_PARAMETER_TOLOWER_TEXT: intl.formatMessage({
    defaultMessage:
      'Required. The string to convert to lower casing. If a character in the string does not have a lowercase equivalent, the character is included unchanged in the returned string.',
    id: 'mZRMD9',
    description: 'Required text parameter to lower case',
  }),
  TOKEN_FUNCTION_FUNCTION_TOUPPER: intl.formatMessage({
    defaultMessage: 'Converts a string to uppercase using the casing rules of the invariant culture',
    id: 'iCSHJG',
    description: 'Label for description of custom toUpper Function',
  }),
  TOKEN_PARAMETER_TOUPPER_TEXT: intl.formatMessage({
    defaultMessage:
      'Required. The string to convert to upper casing. If a character in the string does not have an uppercase equivalent, the character is included unchanged in the returned string.',
    id: '0i/6TR',
    description: 'Required text parameter to upper case',
  }),
  TOKEN_FUNCTION_FUNCTION_INDEXOF: intl.formatMessage({
    defaultMessage: 'Returns the first index of a value within a string (case-insensitive, invariant culture)',
    id: 'aP1wk9',
    description: "Label for the description of a custom 'indexOf' function",
  }),
  TOKEN_PARAMETER_INDEXOF_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: '0qV0Qe',
    description: 'Required text parameter to apply indexOf function on',
  }),
  TOKEN_PARAMETER_INDEXOF_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value for which to find the index.',
    id: 'Tla33B',
    description: "Required. The text parameter for which to find the index with the 'indexOf' function.",
  }),
  TOKEN_FUNCTION_FUNCTION_NTHINDEXOF: intl.formatMessage({
    defaultMessage: `Returns the index for a value's n-th occurrence in a string (case-insensitive, invariant culture).`,
    id: 'AQ7Zxc',
    description: 'Label for description of custom nthIndexOf Function',
  }),
  TOKEN_PARAMETER_NTHINDEXOF_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: 'G0XYrd',
    description: 'Required text parameter to apply nthIndexOf function on',
  }),
  TOKEN_PARAMETER_NTHINDEXOF_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value for which to find the index.',
    id: '6u6CS+',
    description: 'Required text parameter to search nthIndexOf function with',
  }),
  TOKEN_PARAMETER_NTHINDEXOF_OCCURRENCE: intl.formatMessage({
    defaultMessage: 'Required. The number of the occurrence of the substring to find.',
    id: 'aAXnqw',
    description: 'Required number of occurrences to get nthIndexOf function with',
  }),
  TOKEN_FUNCTION_FUNCTION_LASTINDEXOF: intl.formatMessage({
    defaultMessage: 'Returns the last index of a value within a string (case-insensitive, invariant culture)',
    id: 'vEBhDX',
    description: 'Label for description of custom lastIndexOf Function',
  }),
  TOKEN_FUNCTION_FUNCTION_STARTSWITH: intl.formatMessage({
    defaultMessage: 'Checks if the string starts with a value (case-insensitive, invariant culture)',
    id: 'SLZ0n4',
    description: 'Label for description of custom startsWith Function',
  }),
  TOKEN_PARAMETER_STARTSWITH_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: 'uczA5c',
    description: 'Required text parameter to search startsWith function on',
  }),
  TOKEN_PARAMETER_STARTSWITH_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value the string may start with.',
    id: 'ZaIeDG',
    description: 'Required text parameter to search startsWith function with',
  }),
  TOKEN_FUNCTION_FUNCTION_ENDSWITH: intl.formatMessage({
    defaultMessage: 'Checks if the string ends with a value (case-insensitive, invariant culture)',
    id: 'qJpnIL',
    description: 'Label for description of custom endsWith Function',
  }),
  TOKEN_PARAMETER_ENDSWITH_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that may contain the value.',
    id: '7zzPsK',
    description: 'Required text parameter to search endsWith function on',
  }),
  TOKEN_PARAMETER_ENDSWITH_SEARCHTEXT: intl.formatMessage({
    defaultMessage: 'Required. The value the string may end with.',
    id: 'vQcQkU',
    description: 'Required text parameter to search endsWith function with',
  }),
  TOKEN_FUNCTION_FUNCTION_SPLIT: intl.formatMessage({
    defaultMessage: 'Splits the string using a separator',
    id: 'dsz+Ae',
    description: 'Label for description of custom split Function',
  }),
  TOKEN_PARAMETER_SPLIT_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string that is split.',
    id: 'RX2Shm',
    description: 'Required text parameter to apply split function on',
  }),
  TOKEN_PARAMETER_SPLIT_SEPARATOR: intl.formatMessage({
    defaultMessage: 'Required. The separator.',
    id: '3NhwIJ',
    description: 'Required delimeter parameter to apply split function with',
  }),
  TOKEN_FUNCTION_FUNCTION_TRIM: intl.formatMessage({
    defaultMessage: 'Trims leading and trailing whitespace from a string',
    id: 'pozypE',
    description: 'Label for description of custom trim Function',
  }),
  TOKEN_PARAMETER_TRIM_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The string from which to remove leading and trailing whitespace.',
    id: 'D1lgsT',
    description: 'Required text parameter to apply trim function with',
  }),
  TOKEN_FUNCTION_FUNCTION_FORMATNUMBER: intl.formatMessage({
    defaultMessage: 'Returns a formatted number string',
    id: '8DFwxH',
    description: 'Label for description of custom formatNumber Function',
  }),
  TOKEN_PARAMETER_FORMATNUMBER_NUMBER: intl.formatMessage({
    defaultMessage: 'Required. The number to be formatted.',
    id: 'JjTfC7',
    description: 'Required value parameter to apply formatNumber function on',
  }),
  TOKEN_PARAMETER_FORMATNUMBER_FORMAT: intl.formatMessage({
    defaultMessage: 'Required. The numeric format string.',
    id: 'Jq2Y/o',
    description: 'Required format parameter to apply formatNumber function with',
  }),
  TOKEN_PARAMETER_FORMATNUMBER_LOCALE: intl.formatMessage({
    defaultMessage: `Optional. The locale to be used when formatting (defaults to 'en-us').`,
    id: '7aJqIH',
    description: 'Optional locale parameter to apply formatNumber function with',
  }),
  TOKEN_FUNCTION_SECTION_COLLECTION: intl.formatMessage({
    defaultMessage: 'Collection functions',
    id: 'P4rEwD',
    description: 'Label for collection functions',
  }),
  TOKEN_FUNCTION_COLLECTION_CONTAINS: intl.formatMessage({
    defaultMessage: 'Returns true if a dictionary contains a key, if an array contains a value, or if a string contains a substring',
    id: 'Ji6663',
    description: 'Label for description of custom contains Function',
  }),
  TOKEN_PARAMETER_CONTAINS_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to search within.',
    id: '6jsWn/',
    description: 'Required collection parameter to apply contains function on',
  }),
  TOKEN_PARAMETER_CONTAINS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to find inside the Within collection.',
    id: 'GLd3MU',
    description: 'Required object parameter to find for the contains function',
  }),
  TOKEN_FUNCTION_COLLECTION_LENGTH: intl.formatMessage({
    defaultMessage: 'Returns the number of elements in an array or string',
    id: 'qc5S69',
    description: 'Label for description of custom length Function',
  }),
  TOKEN_PARAMETER_LENGTH_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection for which to get the length.',
    id: 'x0or2o',
    description: 'Required collection parameter to apply length Function',
  }),
  TOKEN_FUNCTION_COLLECTION_SORT: intl.formatMessage({
    defaultMessage: 'Returns an array sorted in ascending order',
    id: 'yKOsmK',
    description: 'Label for description of custom sort Function',
  }),
  TOKEN_PARAMETER_SORT_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to sort.',
    id: 'HILmmE',
    description: 'Required collection parameter to apply sort function on',
  }),
  TOKEN_PARAMETER_SORT_SORTBY: intl.formatMessage({
    defaultMessage: 'Optional. A key to use for sorting objects in the collection.',
    id: 'bJEJoL',
    description: 'Optional key parameter to apply sort function with',
  }),
  TOKEN_FUNCTION_COLLECTION_REVERSE: intl.formatMessage({
    defaultMessage: 'Returns the collection in reverse order',
    id: '3RoD4h',
    description: 'Label for description of custom reverse Function',
  }),
  TOKEN_PARAMETER_REVERSE_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to reverse.',
    id: 'lckgnb',
    description: 'Required collection parameter to apply reverse function on',
  }),
  TOKEN_FUNCTION_COLLECTION_EMPTY: intl.formatMessage({
    defaultMessage: 'Returns true if an object, array, or string is empty',
    id: '5b0sKi',
    description: 'Label for description of custom empty Function',
  }),
  TOKEN_PARAMETER_EMPTY_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to check if it is empty.',
    id: 'sbPZ9S',
    description: 'Required collection parameter to check empty function on',
  }),
  TOKEN_FUNCTION_COLLECTION_INTERSECTION: intl.formatMessage({
    defaultMessage: 'Returns a single array or object that has common elements between arrays or objects passed in',
    id: '9/UeTh',
    description: 'Label for description of custom intersection Function',
  }),
  TOKEN_FUNCTION_COLLECTION_INTERSECTION_INFO: intl.formatMessage({
    defaultMessage:
      'Returns a single array or object that has common elements between arrays or objects passed in. The parameters for the function can either be a set of objects or a set of arrays (not a mixture of both). If there are two objects with the same name, the last object with that name appears in the final object.',
    id: 'pcuZKB',
    description: 'Label for signatures of custom intersection Function',
  }),
  TOKEN_PARAMETER_INTERSECTION_ALL: intl.formatMessage({
    defaultMessage: 'Required. The collections to evaluate. An object must be in all collections passed in to appear in the result.',
    id: 'MDbmMw',
    description: 'Required collection parameters to check intersection function on',
  }),
  TOKEN_FUNCTION_COLLECTION_UNION: intl.formatMessage({
    defaultMessage: 'Returns a single array or object with all the elements that are in either the array or object passed to this function',
    id: 'wmw/ai',
    description: 'Label for description of custom union Function',
  }),
  TOKEN_FUNCTION_COLLECTION_UNION_INFO: intl.formatMessage({
    defaultMessage:
      'Returns a single array or object with all the elements that are in either array or object passed to this function. The parameters for the function can either be a set of objects or a set of arrays (not a mixture thereof). If there are two objects with the same name in the final output, the last object with that name appears in the final object.',
    id: 'YaFjJQ',
    description: 'Label for signatures of custom union Function',
  }),
  TOKEN_PARAMETER_UNION_ALL: intl.formatMessage({
    defaultMessage: 'Required. The collections to evaluate. An object that appears in any of the collections also appears in the result.',
    id: 'uR9WuI',
    description: 'Required collection parameters to check union function on',
  }),
  TOKEN_FUNCTION_COLLECTION_FIRST: intl.formatMessage({
    defaultMessage: 'Returns the first element from the passed-in array or string.',
    id: 'd020eg',
    description: 'Label for description of custom first Function',
  }),
  TOKEN_PARAMETER_FIRST_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection from which to take the first object.',
    id: 'LTTgWN',
    description: "Required. The collection parameter on which to apply the 'first' function.",
  }),
  TOKEN_FUNCTION_COLLECTION_LAST: intl.formatMessage({
    defaultMessage: 'Returns the last element in the array or string passed in',
    id: 'o/0SEj',
    description: 'Label for description of custom last Function',
  }),
  TOKEN_PARAMETER_LAST_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to take the last object from.',
    id: 'UVAfYj',
    description: "The required collection parameter for applying the 'last' function.",
  }),
  TOKEN_FUNCTION_COLLECTION_TAKE: intl.formatMessage({
    defaultMessage: 'Returns the first Count elements from the array or string passed in',
    id: '/ut0u7',
    description: 'Label for description of custom take Function',
  }),
  TOKEN_PARAMETER_TAKE_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection from where to take the first Count objects.',
    id: 'vLereV',
    description: "Required. The collection parameter on which to apply the 'take' function.",
  }),
  TOKEN_PARAMETER_TAKE_COUNT: intl.formatMessage({
    defaultMessage: 'Required. The number of objects to take from the Collection. Must be a positive integer.',
    id: 'L+PY+j',
    description: 'Required number parameter to get number of objects for take function',
  }),
  TOKEN_FUNCTION_COLLECTION_SKIP: intl.formatMessage({
    defaultMessage: 'Returns the elements in the array starting at index Count',
    id: '/QqADs',
    description: 'Label for description of custom skip Function',
  }),
  TOKEN_PARAMETER_SKIP_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to skip the first Count objects from.',
    id: 'cscezV',
    description: 'Required collection parameter to apply skip function on',
  }),
  TOKEN_PARAMETER_SKIP_COUNT: intl.formatMessage({
    defaultMessage: 'Required. The number of objects to remove from the front of Collection. Must be a positive integer.',
    id: 'aGyVJT',
    description: 'Required number parameter to get number of objects to remove for skip function',
  }),
  TOKEN_FUNCTION_COLLECTION_JOIN: intl.formatMessage({
    defaultMessage: 'Returns a string with each item of an array joined by a delimiter',
    id: 'G+XvKn',
    description: "Label for description of the custom 'join' function",
  }),
  TOKEN_PARAMETER_JOIN_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The collection to join items from.',
    id: '/qchXQ',
    description: 'Required collection parameter to apply join function on',
  }),
  TOKEN_PARAMETER_JOIN_DELIMITER: intl.formatMessage({
    defaultMessage: 'Required. The string to delimit items with.',
    id: 'QpRRt3',
    description: 'Required string parameter to separate objects and join function on',
  }),
  TOKEN_FUNCTION_COLLECTION_CHUNK: intl.formatMessage({
    defaultMessage: 'Split a string or array into chunks of equal length',
    id: 'yc0GcM',
    description: 'Label for description of custom chunk Function',
  }),
  TOKEN_PARAMETER_CHUNK_COLLECTION: intl.formatMessage({
    defaultMessage: 'Required. The string or array to split.',
    id: 'jVIgz1',
    description: 'Required collection parameter to apply chunk function on',
  }),
  TOKEN_PARAMETER_CHUNK_LENGTH: intl.formatMessage({
    defaultMessage: 'Required. The length of each chunk.',
    id: 'UgaIRz',
    description: 'Required number parameter to get length of each chunk for chunk function',
  }),
  TOKEN_FUNCTION_SECTION_LOGICAL: intl.formatMessage({
    defaultMessage: 'Logical functions',
    id: 'fg/34o',
    description: 'Label for logical functions',
  }),
  TOKEN_FUNCTION_LOGICAL_IF: intl.formatMessage({
    defaultMessage: 'Returns a specified value based on whether the expression resulted in true or false',
    id: 'wWVQuK',
    description: 'Label for description of custom if Function',
  }),
  TOKEN_PARAMETER_IF_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. A boolean value that determines which value the expression should return.',
    id: 'gIK0WG',
    description: 'Required boolean parameter to determine which value if function should return',
  }),
  TOKEN_PARAMETER_IF_VALUEIFTRUE: intl.formatMessage({
    defaultMessage: `Required. The value to return if the expression is 'true'.`,
    id: '8CWFEh',
    description: 'Required value parameter to return given if function is true',
  }),
  TOKEN_PARAMETER_IF_VALUEIFFALSE: intl.formatMessage({
    defaultMessage: 'Required. The value to return if the expression is false.',
    id: 'q5TkqE',
    description: 'Required value parameter to return given if function is false',
  }),
  TOKEN_FUNCTION_LOGICAL_EQUALS: intl.formatMessage({
    defaultMessage: 'Returns true if two values are equal.',
    id: 'Unc2tG',
    description: 'Label for description of custom equals Function',
  }),
  TOKEN_PARAMETER_EQUALS_OBJECT: intl.formatMessage({
    defaultMessage: 'Required. The object to compare equality.',
    id: 'y3AZQB',
    description: 'Required object parameters to apply equals function',
  }),
  TOKEN_FUNCTION_LOGICAL_AND: intl.formatMessage({
    defaultMessage: 'Returns true if both parameters are true',
    id: '9u/Ae3',
    description: 'Label for description of custom and Function',
  }),
  TOKEN_PARAMETER_AND_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. The expressions that must be true.',
    id: 'Rs7j3V',
    description: "Required. The expression parameters on which to apply the 'and' function.",
  }),
  TOKEN_FUNCTION_LOGICAL_OR: intl.formatMessage({
    defaultMessage: 'Returns true if either parameter is true',
    id: 'soqP+Z',
    description: 'Label for description of custom or Function',
  }),
  TOKEN_PARAMETER_OR_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. The expressions that may be true.',
    id: 'Lub7NN',
    description: 'Required expression parameters to apply or function',
  }),
  TOKEN_FUNCTION_LOGICAL_NOT: intl.formatMessage({
    defaultMessage: 'Returns true if the parameters are false',
    id: 'GcG0qf',
    description: 'Label for description of custom not Function',
  }),
  TOKEN_PARAMETER_NOT_EXPRESSION: intl.formatMessage({
    defaultMessage: 'Required. The expression that will be negated.',
    id: 'jKsMS6',
    description: 'Required expression parameter to apply not function',
  }),
  TOKEN_FUNCTION_LOGICAL_LESS: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is less than the second.',
    id: 'tarDYT',
    description: 'Label for description of custom less Function',
  }),
  TOKEN_PARAMETER_LESS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less than comparing object.',
    id: 'ngsC44',
    description: 'Required object parameter to check if less than using less function',
  }),
  TOKEN_PARAMETER_LESS_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater than value being compared to.',
    id: '63/zYN',
    description: 'Required object parameter to compare to in less function',
  }),
  TOKEN_FUNCTION_LOGICAL_LESSOREQUALS: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is less than or equal to the second',
    id: 'qSejoi',
    description: 'Label for description of custom lessOrEquals Function',
  }),
  TOKEN_PARAMETER_LESSOREQUALS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less or equal to the comparing object.',
    id: 'Q0xpPQ',
    description: 'Required object parameter to check if less than or equal to using lessOrEqual function',
  }),
  TOKEN_PARAMETER_LESSOREQUALS_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater than or equal to value being compared to.',
    id: 'bTrk+S',
    description: 'Required object parameter to compare to in lessOrEqual function',
  }),
  TOKEN_FUNCTION_LOGICAL_GREATER: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is greater than the second',
    id: 'tZj2Xn',
    description: 'Label for description of custom greater Function',
  }),
  TOKEN_PARAMETER_GREATER_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater than comparing object.',
    id: 'BxITRH',
    description: 'Required object parameter to check if greater than using greater function',
  }),
  TOKEN_PARAMETER_GREATER_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less than value being compared to.',
    id: '1jhzOM',
    description: 'Required object parameter to compare to in greater function',
  }),
  TOKEN_FUNCTION_LOGICAL_GREATEROREQUALS: intl.formatMessage({
    defaultMessage: 'Returns true if the first argument is greater than or equal to the second',
    id: 'fBQBw/',
    description: 'Label for description of custom greaterOrEquals Function',
  }),
  TOKEN_PARAMETER_GREATEROREQUALS_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is greater or equal to the comparing object.',
    id: '8FjOSh',
    description: 'Required object parameter to check if greater than or equal to using greaterOrEqual function',
  }),
  TOKEN_PARAMETER_GREATEROREQUALS_COMPARETO: intl.formatMessage({
    defaultMessage: 'Required. The object to check if it is less than or equal to value being compared to.',
    id: 'nGds/r',
    description: 'Required object parameter to compare to in greaterOrEqual function',
  }),
  TOKEN_FUNCTION_LOGICAL_ISINT: intl.formatMessage({
    defaultMessage: 'Returns a boolean that indicates whether a string is an integer',
    id: 'zUWAsJ',
    description: 'Label for description of custom isInt Function',
  }),
  TOKEN_PARAMETER_ISINT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to examine.',
    id: '+oelX4',
    description: 'Required string parameter to check if is integer using isInt function',
  }),
  TOKEN_FUNCTION_LOGICAL_ISFLOAT: intl.formatMessage({
    defaultMessage: 'Returns a boolean that indicates whether a string is a floating-point number',
    id: 'gtQYgr',
    description: 'Label for description of custom isFloat Function',
  }),
  TOKEN_PARAMETER_ISFLOAT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to examine.',
    id: '3PJZH0',
    description: 'Required string parameter to check if is float using isFloat function',
  }),
  TOKEN_PARAMETER_ISFLOAT_LOCALE: intl.formatMessage({
    defaultMessage: `Optional. The RFC 4646 locale code to use. If not specified, default locale is used. If locale isn't a valid value, an error is generated that the provided locale isn't valid or doesn't have an associated locale.`,
    id: '2z5HGT',
    description: 'Optional locale parameter to check locale code in isFloat function',
  }),
  TOKEN_FUNCTION_SECTION_CONVERSION: intl.formatMessage({
    defaultMessage: 'Conversion functions',
    id: 'gQt/0f',
    description: 'Label for conversion functions',
  }),
  TOKEN_FUNCTION_CONVERSION_JSON: intl.formatMessage({
    defaultMessage: 'Converts the input to a JSON type value.',
    id: 'ODQCKj',
    description: 'Label for description of custom json Function',
  }),
  TOKEN_PARAMETER_JSON_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string that is converted to a native type value.',
    id: 'zIDVd9',
    description: 'Required string parameter to be converted using json function',
  }),
  TOKEN_FUNCTION_CONVERSION_XML: intl.formatMessage({
    defaultMessage: 'Covert the input to an Xml type value',
    id: 'pXmFGf',
    description: 'Label for description of custom xml Function',
  }),
  TOKEN_PARAMETER_XML_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value to convert to XML.',
    id: '1D047X',
    description: 'Required string parameter to be converted using xml function',
  }),
  TOKEN_FUNCTION_CONVERSION_INT: intl.formatMessage({
    defaultMessage: 'Convert the parameter to an integer',
    id: 'SKXopi',
    description: 'Label for description of custom int Function',
  }),
  TOKEN_PARAMETER_INT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to an integer.',
    id: 'qnI4Y1',
    description: 'Required string parameter to be converted using int function',
  }),
  TOKEN_FUNCTION_CONVERSION_STRING: intl.formatMessage({
    defaultMessage: 'Convert the parameter to a string',
    id: 'q2w8Sk',
    description: 'Label for description of custom string Function',
  }),
  TOKEN_PARAMETER_STRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a string.',
    id: 'jQ0Aqj',
    description: 'Required parameter to be converted using string function',
  }),
  TOKEN_FUNCTION_CONVERSION_FLOAT: intl.formatMessage({
    defaultMessage: 'Convert the parameter argument to a floating-point number',
    id: '1NBvKu',
    description: 'Label for description of custom float Function',
  }),
  TOKEN_PARAMETER_FLOAT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a floating-point number.',
    id: 'n35O/+',
    description: 'Required string parameter to be converted using float function',
  }),
  TOKEN_FUNCTION_CONVERSION_BOOL: intl.formatMessage({
    defaultMessage: 'Convert the parameter to a Boolean',
    id: 'dqgt9y',
    description: 'Label for description of custom bool Function',
  }),
  TOKEN_PARAMETER_BOOL_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a boolean.',
    id: 'JSfWJ0',
    description: 'Required parameter to be converted using bool function',
  }),
  TOKEN_FUNCTION_CONVERSION_BASE64: intl.formatMessage({
    defaultMessage: 'Returns the base 64 representation of the input string',
    id: 'Pvm0xB',
    description: 'Label for description of custom base64 Function',
  }),
  TOKEN_PARAMETER_BASE64_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to encode into base64 representation.',
    id: 'ArTh0/',
    description: 'Required base64 string parameter to be converted using base64 function',
  }),
  TOKEN_FUNCTION_CONVERSION_BASE64TOBINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a base 64 encoded string',
    id: '23fENy',
    description: 'Label for description of custom base64ToBinary Function',
  }),
  TOKEN_PARAMETER_BASE64TOBINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The base64 encoded string.',
    id: '0FzNJV',
    description: 'Required base64 string parameter to be converted to binary using base64ToBinary function',
  }),
  TOKEN_FUNCTION_CONVERSION_BASE64TOSTRING: intl.formatMessage({
    defaultMessage: 'Returns a string representation of a base 64 encoded string',
    id: 'dhvk0u',
    description: 'Label for description of custom base64ToString Function',
  }),
  TOKEN_PARAMETER_BASE64TOSTRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The base64 encoded string.',
    id: 'k/oqFL',
    description: 'Required base64 string parameter to be converted using base64ToString function',
  }),
  TOKEN_FUNCTION_CONVERSION_BINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a value',
    id: 'O+8vRv',
    description: 'Label for description of custom binary Function',
  }),
  TOKEN_PARAMETER_BINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to binary.',
    id: 'bJ7DWe',
    description: "Required. The string parameter to convert with the 'binary' function.",
  }),
  TOKEN_FUNCTION_CONVERSION_DATAURITOBINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a data URI',
    id: 'Y9kBz5',
    description: 'Label for description of custom dataUriToBinary Function',
  }),
  TOKEN_PARAMETER_DATAURITOBINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The data URI to convert to binary representation.',
    id: 'MKTdNk',
    description: 'Required dataURI string parameter to be converted using dataUriToBinary function',
  }),
  TOKEN_FUNCTION_CONVERSION_DATAURITOSTRING: intl.formatMessage({
    defaultMessage: 'Returns a string representation of a data URI',
    id: 'mGpKsl',
    description: 'Label for description of custom dataUriToString Function',
  }),
  TOKEN_PARAMETER_DATAURITOSTRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The data URI to convert to String representation.',
    id: '1+Z8n9',
    description: 'Required dataUri string parameter to be converted using dataUriToString function',
  }),
  TOKEN_FUNCTION_CONVERSION_DATAURI: intl.formatMessage({
    defaultMessage: 'Returns a data URI of a value',
    id: '9JuvQ4',
    description: 'Label for description of custom dataUri Function',
  }),
  TOKEN_PARAMETER_DATAURI_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value to convert to data URI.',
    id: '23szE+',
    description: 'Required string parameter to be converted using dataUri function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECODEBASE64: intl.formatMessage({
    defaultMessage: 'Returns a string representation of an input based64 string',
    id: 'kN6kce',
    description: 'Label for description of custom decodeBase64 Function',
  }),
  TOKEN_PARAMETER_DECODEBASE64_VALUE: intl.formatMessage({
    defaultMessage: 'Required. A base64 input string.',
    id: 'jVpanH',
    description: 'Required base64 string parameter to be decoded using decodeBase64 function',
  }),
  TOKEN_FUNCTION_FUNCTION_UTF8LENGTH: intl.formatMessage({
    defaultMessage: 'Returns the UTF-8 byte length of an input string',
    id: 'Pa+UkC',
    description: 'Label for description of custom utf8Length Function',
  }),
  TOKEN_PARAMETER_UTF8LENGTH_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to calculate UTF-8 length from.',
    id: 'q/DRBW',
    description: 'Required string parameter to be sized using utf8Length function',
  }),
  TOKEN_FUNCTION_FUNCTION_UTF16LENGTH: intl.formatMessage({
    defaultMessage: 'Returns the UTF-16 byte length of an input string',
    id: 'vDYFIF',
    description: 'Label for description of custom utf16Length Function',
  }),
  TOKEN_PARAMETER_UTF16LENGTH_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to calculate UTF-16 length from.',
    id: 'Q5Fh2R',
    description: 'Required string parameter to be sized using utf16Length function',
  }),
  TOKEN_FUNCTION_CONVERSION_ENCODEURICOMPONENT: intl.formatMessage({
    defaultMessage: 'Url encodes the input string',
    id: 'mPakaD',
    description: 'Label for description of custom encodeUriComponent Function',
  }),
  TOKEN_PARAMETER_ENCODEURICOMPONENT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to escape URL-unsafe characters from.',
    id: 'y6BcVN',
    description: 'Required string parameter to be encoded using encodeUriComponent function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECODEURICOMPONENT: intl.formatMessage({
    defaultMessage: 'Url decodes the input string',
    id: '0GqNGo',
    description: 'Label for description of custom decodeUriComponent Function',
  }),
  TOKEN_PARAMETER_DECODEURICOMPONENT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to decode the URL-unsafe characters from.',
    id: 'BQCPY7',
    description: 'Required string parameter to be decoded using decodeUriComponent function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECODEDATAURI: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of an input data URI string',
    id: '0uj1Li',
    description: 'Label for description of custom decodeDataUri Function',
  }),
  TOKEN_PARAMETER_DECODEDATAURI_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The dataURI to decode into a binary representation.',
    id: 'oAFcW6',
    description: 'Required string parameter to be decoded using decodeDataUri function',
  }),
  TOKEN_FUNCTION_CONVERSION_URICOMPONENT: intl.formatMessage({
    defaultMessage: 'Returns a URI encoded representation of a value',
    id: 'rcz4w4',
    description: 'Label for description of custom uriComponent Function',
  }),
  TOKEN_PARAMETER_URICOMPONENT_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The string to be URI encoded.',
    id: '8U0KPg',
    description: 'Required string parameter to be encoded using uriComponent function',
  }),
  TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOBINARY: intl.formatMessage({
    defaultMessage: 'Returns a binary representation of a URI encoded string',
    id: '0R2D5l',
    description: 'Label for description of custom uriComponentToBinary Function',
  }),
  TOKEN_PARAMETER_URICOMPONENTTOBINARY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The URI encoded string.',
    id: '1Fn5n+',
    description: 'Required URI encoded string parameter to be converted using uriComponentToBinary function',
  }),
  TOKEN_FUNCTION_CONVERSION_URICOMPONENTTOSTRING: intl.formatMessage({
    defaultMessage: 'Returns a string representation of a URI encoded string',
    id: 'xJ6vjn',
    description: 'Label for description of custom uriComponentToString Function',
  }),
  TOKEN_PARAMETER_URICOMPONENTTOSTRING_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The URI encoded string.',
    id: 'BHe7qY',
    description: 'Required URI encoded string parameter to be converted using uriComponentToString function',
  }),
  TOKEN_FUNCTION_CONVERSION_ARRAY: intl.formatMessage({
    defaultMessage: 'Convert the input to an array',
    id: '/doURb',
    description: 'Label for description of custom array Function',
  }),
  TOKEN_PARAMETER_ARRAY_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to an array.',
    id: 'yBrsFJ',
    description: 'Required string parameter to be converted using array function',
  }),
  TOKEN_FUNCTION_CONVERSION_CREATEARRAY: intl.formatMessage({
    defaultMessage: 'Creates an array from the parameters',
    id: 'uzsleE',
    description: 'Label for description of custom createArray Function',
  }),
  TOKEN_PARAMETER_CREATEARRAY_ALL: intl.formatMessage({
    defaultMessage: 'Required. The values to combine into an array.',
    id: 'pOTcUO',
    description: 'Required object parameter to be converted to array using createArray function',
  }),
  TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAVALUE: intl.formatMessage({
    defaultMessage: 'Returns a single value matching the key name from form-data or form-encoded trigger output',
    id: 'QZBPUx',
    description: 'Label for description of custom triggerFormDataValue Function',
  }),
  TOKEN_PARAMETER_TRIGGERFORMDATAVALUE_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data value to return.',
    id: 'HDqP2g',
    description: 'Required string parameter to be used as key for triggerFormDataValue function',
  }),
  TOKEN_FUNCTION_CONVERSION_TRIGGERFORMDATAMULTIVALUES: intl.formatMessage({
    defaultMessage: 'Returns an array of values matching the key name from form-data or form-encoded trigger output',
    id: 'sDkAVZ',
    description: 'Label for description of custom triggerFormDataMultiValues Function',
  }),
  TOKEN_PARAMETER_TRIGGERFORMDATAMULTIVALUES_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data values to return.',
    id: 'N2CF0J',
    description: 'Required string parameter to be used as key for triggerFormDataMultiValues function',
  }),
  TOKEN_FUNCTION_CONVERSION_TRIGGERMULTIPARTBODY: intl.formatMessage({
    defaultMessage: 'Returns the body for a part in a multipart output of the trigger',
    id: 'ypZV9w',
    description: "Label for the description of the custom 'triggerMultipartBody' function",
  }),
  TOKEN_PARAMETER_TRIGGERMULTIPARTBODY_INDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of the part to retrieve.',
    id: 'B2s0iG',
    description: 'Required number parameter to be used as index for triggerMultipartBody function',
  }),
  TOKEN_FUNCTION_CONVERSION_FORMDATAVALUE: intl.formatMessage({
    defaultMessage: 'Returns a single value matching the key name from form-data or form-encoded action output',
    id: '2cVEMV',
    description: 'Label for description of custom formDataValue Function',
  }),
  TOKEN_PARAMETER_FORMDATAVALUE_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action with a form-data or form-encoded response.',
    id: '2gzGrJ',
    description: 'Required string parameter to identify action name for formDataValue function',
  }),
  TOKEN_PARAMETER_FORMDATAVALUE_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data value to return.',
    id: 'p/0r2N',
    description: 'Required string parameter to be used as key for formDataValue function',
  }),
  TOKEN_FUNCTION_CONVERSION_FORMDATAMULTIVALUES: intl.formatMessage({
    defaultMessage: 'Returns an array of values matching the key name from form-data or form-encoded action output',
    id: 'drM9Sl',
    description: 'Label for description of custom formDataMultiValues Function',
  }),
  TOKEN_PARAMETER_FORMDATAMULTIVALUES_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action with a form-data or form-encoded response.',
    id: 'SY04wn',
    description: 'Required string parameter to identify action name for formDataMultiValues function',
  }),
  TOKEN_PARAMETER_FORMDATAMULTIVALUES_KEY: intl.formatMessage({
    defaultMessage: 'Required. The key name of the form data values to return.',
    id: 'jcA3Ig',
    description: 'Required string parameter to be used as key for formDataMultiValues function',
  }),
  TOKEN_FUNCTION_CONVERSION_MULTIPARTBODY: intl.formatMessage({
    defaultMessage: 'Returns the body for a part in a multipart output from an action.',
    id: 'ceVB5l',
    description: "Label for the description of the custom 'multipartBody' function",
  }),
  TOKEN_PARAMETER_MULTIPARTBODY_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action with a multipart response.',
    id: '6kSpHL',
    description: 'Required string parameter to identify action name for multipartBody function',
  }),
  TOKEN_PARAMETER_MULTIPARTBODY_INDEX: intl.formatMessage({
    defaultMessage: 'Required. The index of the part to retrieve.',
    id: 'tLZ9Sh',
    description: 'Required number parameter to be used as index for multipartBody function',
  }),
  TOKEN_FUNCTION_CONVERSION_DECIMAL: intl.formatMessage({
    defaultMessage: 'Converts the parameter to a decimal number',
    id: 'ECZC6Y',
    description: 'Label for description of custom decimal Function',
  }),
  TOKEN_PARAMETER_DECIMAL_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value that is converted to a decimal number.',
    id: 'zBMVKg',
    description: 'Required string parameter to be converted using decimal function',
  }),
  TOKEN_FUNCTION_SECTION_MATH: intl.formatMessage({
    defaultMessage: 'Math functions',
    id: 'XtuP5e',
    description: 'Label for math functions',
  }),
  TOKEN_FUNCTION_MATH_MIN: intl.formatMessage({
    defaultMessage: 'Returns the minimum value in the input array of numbers',
    id: '4vcnOA',
    description: 'Label for description of custom min Function',
  }),
  TOKEN_PARAMETER_MIN_ALL: intl.formatMessage({
    defaultMessage: 'Required. Either an array of values to find the minimum value, or the first value of a set.',
    id: 'wFCkpM',
    description: 'Require parameters to find minimum using min function',
  }),
  TOKEN_FUNCTION_MATH_MAX: intl.formatMessage({
    defaultMessage: 'Returns the maximum value in the input array of numbers',
    id: 'bf7078',
    description: 'Label for description of custom max Function',
  }),
  TOKEN_PARAMETER_MAX_ALL: intl.formatMessage({
    defaultMessage: 'Required. Either an array of values to find the maximum value, or the first value of a set.',
    id: 'raBiud',
    description: 'Require parameters to find maximum using max function',
  }),
  TOKEN_FUNCTION_MATH_RAND: intl.formatMessage({
    defaultMessage: 'Returns a random integer from a specified range, which is inclusive only at the starting end.',
    id: 'jHHF/u',
    description: 'Label for description of custom rand Function',
  }),
  TOKEN_PARAMETER_RAND_MINVALUE: intl.formatMessage({
    defaultMessage: 'Required. The lowest integer that can be returned.',
    id: '47kOXr',
    description: 'Required integer parameter to be used as lower bound for rand function',
  }),
  TOKEN_PARAMETER_RAND_MAXVALUE: intl.formatMessage({
    defaultMessage: 'Required. This value is the next integer after the highest integer that can be returned.',
    id: '3z6rhG',
    description: "Required. The integer parameter to use as the upper bound for the 'rand' function.",
  }),
  TOKEN_FUNCTION_MATH_ADD: intl.formatMessage({
    defaultMessage: 'Returns the result from adding the two numbers',
    id: '9djnqI',
    description: 'Label for description of custom add Function',
  }),
  TOKEN_PARAMETER_ADD_SUMMAND1: intl.formatMessage({
    defaultMessage: 'Required. The number to add to Summand 2.',
    id: 'ihCdw4',
    description: "Required. The number parameter to sum in the 'add' function.",
  }),
  TOKEN_PARAMETER_ADD_SUMMAND2: intl.formatMessage({
    defaultMessage: 'Required. The number to add to Summand 1.',
    id: 'zsPNYN',
    description: "Required. The number parameter to sum in the 'add' function.",
  }),
  TOKEN_FUNCTION_MATH_SUB: intl.formatMessage({
    defaultMessage: 'Returns the result from subtracting two numbers',
    id: 'hPM6iC',
    description: 'Label for description of custom sub Function',
  }),
  TOKEN_PARAMETER_SUB_MINUEND: intl.formatMessage({
    defaultMessage: 'Required. The number that Subtrahend is removed from.',
    id: 'H8bEUn',
    description: 'Required number parameter to be minused in sub function',
  }),
  TOKEN_PARAMETER_SUB_SUBTRAHEND: intl.formatMessage({
    defaultMessage: 'Required. The number to remove from the Minuend.',
    id: 'sfJTHV',
    description: 'Required number parameter to be minused in sub function',
  }),
  TOKEN_FUNCTION_MATH_MUL: intl.formatMessage({
    defaultMessage: 'Returns the result from multiplying the two numbers',
    id: 'WgoP7R',
    description: 'Label for description of custom mul Function',
  }),
  TOKEN_PARAMETER_MUL_MULTIPLICAND1: intl.formatMessage({
    defaultMessage: 'Required. The number to multiply Multiplicand 2 with.',
    id: '6qkBwz',
    description: 'Required number parameter to be multiplied in mul function',
  }),
  TOKEN_PARAMETER_MUL_MULTIPLICAND2: intl.formatMessage({
    defaultMessage: 'Required. The number to multiply Multiplicand 1 with.',
    id: 'Twfck/',
    description: 'Required number parameter to be multiplied in mul function',
  }),
  TOKEN_FUNCTION_MATH_DIV: intl.formatMessage({
    defaultMessage: 'Returns the result from dividing the two numbers',
    id: 'gDY9xk',
    description: 'Label for description of custom div Function',
  }),
  TOKEN_PARAMETER_DIV_DIVIDEND: intl.formatMessage({
    defaultMessage: 'Required. The number to divide by the Divisor.',
    id: 'VVfYvq',
    description: 'Required number parameter to be divided from in div function',
  }),
  TOKEN_PARAMETER_DIV_DIVISOR: intl.formatMessage({
    defaultMessage: 'Required. The number to divide the Dividend by.',
    id: 'eT+b9W',
    description: 'Required number parameter to be divided by in div function',
  }),
  TOKEN_FUNCTION_MATH_MOD: intl.formatMessage({
    defaultMessage: 'Returns the remainder after dividing the two numbers (modulo)',
    id: '0p+pJq',
    description: 'Label for description of custom mod Function',
  }),
  TOKEN_PARAMETER_MOD_DIVIDEND: intl.formatMessage({
    defaultMessage: 'Required. The number to divide by the Divisor.',
    id: 'a7j3gS',
    description: 'Required number parameter to divide in mod function',
  }),
  TOKEN_PARAMETER_MOD_DIVISOR: intl.formatMessage({
    defaultMessage: 'Required. The number to divide the Dividend by. After the division, the remainder is taken.',
    id: 'pYtSyE',
    description: 'Required number parameter to divide the dividend by in mod function',
  }),
  TOKEN_FUNCTION_MATH_RANGE: intl.formatMessage({
    defaultMessage: 'Generates an array of integers starting from a certain number',
    id: 'U3iWVd',
    description: 'Label for description of custom range Function',
  }),
  TOKEN_PARAMETER_RANGE_STARTINDEX: intl.formatMessage({
    defaultMessage: 'Required. The first integer in the array.',
    id: 'WS9kXD',
    description: 'Required number parameter to identify lower bound in range function',
  }),
  TOKEN_PARAMETER_RANGE_COUNT: intl.formatMessage({
    defaultMessage: 'Required. This value is the number of integers that is in the array.',
    id: 'P2A5dB',
    description: 'Required number parameter to identify number of integers in range function',
  }),
  TOKEN_FUNCTION_SECTION_DATETIME: intl.formatMessage({
    defaultMessage: 'Date and time functions',
    id: 'yqRrQ/',
    description: 'Label for date and time functions',
  }),
  TOKEN_FUNCTION_DATETIME_UTCNOW: intl.formatMessage({
    defaultMessage: 'Returns the current timestamp as a string',
    id: 'MTR4Vg',
    description: 'Label for description of custom utcNow Function',
  }),
  TOKEN_FUNCTION_DATETIME_GETFUTURETIME: intl.formatMessage({
    defaultMessage: 'Returns a timestamp that is the current time plus the specified time interval.',
    id: 'gDDfek',
    description: 'Label for description of custom getFutureTime Function',
  }),
  TOKEN_PARAMETER_GETFUTURETIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of time units the desired time is in the future.',
    id: 'nHseED',
    description: 'Required integer parameter to see how far in the future',
  }),
  TOKEN_PARAMETER_GETFUTURETIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. The unit of time specified in the interval.',
    id: '4YKQAF',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_PARAMETER_FORMAT: intl.formatMessage({
    defaultMessage: `Either a single format specifier character or a custom format pattern that indicates how to format the value of this timestamp. If format is not provided, the ISO 8601 format ('o') is used.`,
    id: 'BCAnZP',
    description: 'Optional string parameter to identify format of timestamp returned',
  }),
  TOKEN_FUNCTION_DATETIME_GETPASTTIME: intl.formatMessage({
    defaultMessage: 'Returns a timestamp that is the current time minus the specified time interval.',
    id: 'mGUdCO',
    description: 'Label for description of custom getPastTime Function',
  }),
  TOKEN_PARAMETER_GETPASTTIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of time units the desired time is in the past.',
    id: 'uc/PoD',
    description: 'Required integer parameter to see how far in the past',
  }),
  TOKEN_PARAMETER_GETPASTTIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. The unit of time specified in the interval.',
    id: '4YKQAF',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDTOTIME: intl.formatMessage({
    defaultMessage: 'Adds an integer number of a specified unit of time to a string timestamp passed in',
    id: 'znGyyU',
    description: 'Label for description of custom addToTime Function',
  }),
  TOKEN_PARAMETER_TIMESTAMP: intl.formatMessage({
    defaultMessage: 'Required. A string that contains the time.',
    id: 'JNQHws',
    description: 'Required string parameter that contains the time',
  }),
  TOKEN_PARAMETER_ADDTOTIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of a specified time unit to add.',
    id: 'F3IDl8',
    description: 'Required integer parameter to add to time',
  }),
  TOKEN_PARAMETER_ADDTOTIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. A string containing the unit of time specified in the interval to add.',
    id: 'sZ0G/Z',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_FUNCTION_DATETIME_SUBTRACTFROMTIME: intl.formatMessage({
    defaultMessage: 'Subtracts an integer number of a specified unit of time from a string timestamp passed in',
    id: 'wEaGWn',
    description: 'Label for description of custom subtractFromTime Function',
  }),
  TOKEN_PARAMETER_SUBTRACTFROMTIME_INTERVAL: intl.formatMessage({
    defaultMessage: 'Required. The number of a specified time unit to subtract.',
    id: '3vCCY7',
    description: 'Required integer parameter to subtract to time',
  }),
  TOKEN_PARAMETER_SUBTRACTFROMTIME_TIMEUNIT: intl.formatMessage({
    defaultMessage: 'Required. A string containing the unit of time specified in the interval to subtract.',
    id: 'QrQDdp',
    description: 'Required string parameter to represent the unit of time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDSECONDS: intl.formatMessage({
    defaultMessage: 'Adds an integer number of seconds to a string timestamp passed in',
    id: 'q87X20',
    description: 'Label for description of custom addSeconds Function',
  }),
  TOKEN_PARAMETER_ADDSECONDS_SECONDS: intl.formatMessage({
    defaultMessage: 'Required. The number of seconds to add. Can be negative to subtract seconds.',
    id: 'PRnqYA',
    description: 'Required integer parameter to subtract seconds from time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDMINUTES: intl.formatMessage({
    defaultMessage: 'Adds an integer number of minutes to a string timestamp passed in',
    id: 'nkk1mu',
    description: 'Label for description of custom addMinutes Function',
  }),
  TOKEN_PARAMETER_ADDMINUTES_MINUTES: intl.formatMessage({
    defaultMessage: 'Required. The number of minutes to add. Can be negative to subtract minutes.',
    id: 'zxe9hh',
    description: 'Required integer parameter to subtract minutes from time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDHOURS: intl.formatMessage({
    defaultMessage: 'Adds an integer number of hours to a string timestamp passed in',
    id: 'uUlBZ8',
    description: 'Label for description of custom addHours Function',
  }),
  TOKEN_PARAMETER_ADDHOURS_HOURS: intl.formatMessage({
    defaultMessage: 'Required. The number of hours to add. Can be negative to subtract hours.',
    id: 'taPCmY',
    description: 'Required integer parameter to subtract hours from time',
  }),
  TOKEN_FUNCTION_DATETIME_ADDDAYS: intl.formatMessage({
    defaultMessage: 'Adds an integer number of days to a string timestamp passed in',
    id: '8wr0zO',
    description: 'Label for description of custom addDays Function',
  }),
  TOKEN_PARAMETER_ADDDAYS_DAYS: intl.formatMessage({
    defaultMessage: 'Required. The number of days to add. Can be negative to subtract days.',
    id: '4BrA0z',
    description: 'Required integer parameter to subtract days from time',
  }),
  TOKEN_FUNCTION_DATETIME_CONVERTTIMEZONE: intl.formatMessage({
    defaultMessage: 'Converts a string timestamp passed in from a source time zone to a target time zone',
    id: 'Jaz3EC',
    description: 'Label for description of custom convertTimeZone Function',
  }),
  TOKEN_FUNCTION_DATETIME_DATEDIFFERENCE: intl.formatMessage({
    defaultMessage: 'Returns the difference between two dates as a timespan string',
    id: 'cfUHfs',
    description: 'Label for description of custom dateDifference Function',
  }),
  TOKEN_PARAMETER_DATEDIFFERENCE_STARTTIMESTAMP: intl.formatMessage({
    defaultMessage: 'Required. A string that contains the start time.',
    id: 'MLckJz',
    description: 'Required string parameter for start time',
  }),
  TOKEN_PARAMETER_DATEDIFFERENCE_ENDTIMESTAMP: intl.formatMessage({
    defaultMessage: 'Required. A string that contains the end time.',
    id: 'lkgjxD',
    description: 'Required string parameter for end time',
  }),
  TOKEN_PARAMETER_SOURCETIMEZONE: intl.formatMessage({
    defaultMessage: `Required. A string that contains the time zone name of the source time zone. See 'Default Time Zones' at 'https://go.microsoft.com/fwlink/?linkid=2238292'.`,
    id: '/EU/oJ',
    description: 'Required string parameter for source time zone',
  }),
  TOKEN_PARAMETER_DESTINATIONTIMEZONE: intl.formatMessage({
    defaultMessage:
      'Required. A string that contains the time zone name of the destination time zone. See https://msdn.microsoft.com/en-us/library/gg154758.aspx for details.',
    id: 't+XCkg',
    description: 'Required string parameter for destination time zone',
  }),
  TOKEN_FUNCTION_DATETIME_CONVERTTOUTC: intl.formatMessage({
    defaultMessage: 'Converts a string timestamp passed in from a source time zone to UTC',
    id: 'wmDUGV',
    description: 'Label for description of custom convertToUtc Function',
  }),
  TOKEN_FUNCTION_DATETIME_CONVERTFROMUTC: intl.formatMessage({
    defaultMessage: 'Converts a string timestamp passed in from a UTC to a target time zone',
    id: 'IW2MjQ',
    description: 'Label for description of custom convertFromUtc Function',
  }),
  TOKEN_FUNCTION_DATETIME_FORMATDATETIME: intl.formatMessage({
    defaultMessage: 'Returns a string in date format',
    id: 'Qn8qxn',
    description: 'Label for description of custom formatDateTime Function',
  }),
  TOKEN_PARAMETER_LOCALE: intl.formatMessage({
    defaultMessage: 'Optional. The locale to be used when parsing the date time string.',
    id: 'OihxQE',
    description: 'Optional string parameter to apply formatDateTime function with',
  }),
  TOKEN_FUNCTION_DATETIME_PARSEDATETIME: intl.formatMessage({
    defaultMessage: 'Converts a string, with optionally a locale and a format to a date',
    id: 'zcZpHT',
    description: 'Label for description of custom parseDateTime Function',
  }),
  TOKEN_FUNCTION_DATETIME_STARTOFHOUR: intl.formatMessage({
    defaultMessage: 'Returns the start of the hour to a string timestamp passed in',
    id: '07ZsoY',
    description: 'Label for description of custom startOfHour Function',
  }),
  TOKEN_FUNCTION_DATETIME_STARTOFDAY: intl.formatMessage({
    defaultMessage: 'Returns the start of the day for the passed-in string timestamp.',
    id: 'LtbkS7',
    description: "Label for the description of a custom 'startOfDay' function",
  }),
  TOKEN_FUNCTION_DATETIME_STARTOFMONTH: intl.formatMessage({
    defaultMessage: 'Returns the start of the month of a string timestamp',
    id: 'TO7qos',
    description: 'Label for description of custom startOfMonth Function',
  }),
  TOKEN_FUNCTION_DATETIME_DAYOFWEEK: intl.formatMessage({
    defaultMessage: 'Returns the day of week component of a string timestamp',
    id: 'L0UAzs',
    description: 'Label for description of custom dayOfWeek Function',
  }),
  TOKEN_FUNCTION_DATETIME_DAYOFMONTH: intl.formatMessage({
    defaultMessage: 'Returns the day of month component of a string timestamp',
    id: 'ZME5hh',
    description: 'Label for description of custom dayOfMonth Function',
  }),
  TOKEN_FUNCTION_DATETIME_DAYOFYEAR: intl.formatMessage({
    defaultMessage: 'Returns the day of year component of a string timestamp',
    id: 's5RV9B',
    description: 'Label for description of custom dayOfMonth Function',
  }),
  TOKEN_FUNCTION_DATETIME_TICKS: intl.formatMessage({
    defaultMessage: 'Returns the number of ticks (100 nanoseconds interval) since 1 January 0001 00:00:00 UT of a string timestamp',
    id: '7lnElz',
    description: 'Label for description of custom ticks Function',
  }),
  TOKEN_FUNCTION_SECTION_REFERENCE: intl.formatMessage({
    defaultMessage: 'Referencing functions',
    id: 'GYvF54',
    description: 'Label for referencing functions',
  }),
  TOKEN_FUNCTION_REFERENCE_PARAMETERS: intl.formatMessage({
    defaultMessage: 'Returns a parameter value that is defined in the definition',
    id: 'FDF4Qb',
    description: 'Label for description of custom parameters Function',
  }),
  TOKEN_PARAMETER_PARAMETERS_PARAMETERNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the parameter whose values you want.',
    id: '4c0uPQ',
    description: 'Required string parameter to create a new parameter',
  }),
  TOKEN_FUNCTION_REFERENCE_RESULT: intl.formatMessage({
    defaultMessage:
      'Returns the results from the top-level actions in the specified scoped action, such as a For_each, Until, or Scope action.',
    id: 'OVvieE',
    description: 'Label for description of custom result Function',
  }),
  TOKEN_PARAMETER_RESULT_SCOPEDACTIONNAME: intl.formatMessage({
    defaultMessage:
      'Optional. The name of the scoped action where you want the inputs and outputs from the top-level actions inside that scope.',
    id: 'M8Aqm4',
    description: 'Optional string parameter to determine specific actions inside top-level actions',
  }),
  TOKEN_FUNCTION_REFERENCE_ACTIONS: intl.formatMessage({
    defaultMessage: 'Enables an expression to derive its value from other JSON name and value pairs or the output of the runtime action',
    id: 'r8aZXs',
    description: 'Label for description of custom actions Function',
  }),
  TOKEN_PARAMETER_ACTIONS_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action that has the values you want.',
    id: 'Ybzoim',
    description: 'Required string parameter to determine action wanted',
  }),
  TOKEN_FUNCTION_REFERENCE_OUTPUTS: intl.formatMessage({
    defaultMessage: `Shorthand for actions('actionName').outputs`,
    id: 'XCunbR',
    description: 'Label for description of custom outputs Function',
  }),
  TOKEN_PARAMETER_ACTIONOUTPUTS_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action whose outputs you want.',
    id: 'va40BJ',
    description: "Required string parameter to determine action's output wanted",
  }),
  TOKEN_FUNCTION_REFERENCE_BODY: intl.formatMessage({
    defaultMessage: `Shorthand for actions('actionName').outputs.body`,
    id: 'ljAOR6',
    description: 'Label for description of custom body Function',
  }),
  TOKEN_PARAMETER_ACTIONBODY_ACTIONNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the action whose body outputs you want.',
    id: 'Xx/naD',
    description: "Required string parameter to determine action's body output wanted",
  }),
  TOKEN_FUNCTION_REFERENCE_TRIGGEROUTPUTS: intl.formatMessage({
    defaultMessage: 'Shorthand for trigger().outputs',
    id: 'WUe3DY',
    description: 'Label for description of custom triggerOutputs Function',
  }),
  TOKEN_FUNCTION_REFERENCE_TRIGGERBODY: intl.formatMessage({
    defaultMessage: 'Shorthand for trigger().outputs.body',
    id: 'ZUaz3Y',
    description: 'Label for description of custom triggerBody Function',
  }),
  TOKEN_FUNCTION_REFERENCE_TRIGGER: intl.formatMessage({
    defaultMessage: 'Enables an expression to derive its value from other JSON name and value pairs or the output of the runtime trigger',
    id: 'YKXmKD',
    description: 'Label for description of custom trigger Function',
  }),
  TOKEN_FUNCTION_REFERENCE_ITEM: intl.formatMessage({
    defaultMessage: 'When used inside for-each loop, this function returns the current item of the specified loop.',
    id: 'LoGUT3',
    description: 'Label for description of custom item Function',
  }),
  TOKEN_PARAMETER_ITEMS_LOOPNAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the loop whose item you want.',
    id: '5cPiWA',
    description: 'Required string parameter to determine loop wanted',
  }),
  TOKEN_FUNCTION_REFERENCE_ITERATIONINDEXES: intl.formatMessage({
    defaultMessage: 'When used inside until loop, this function returns the current iteration index of the specified loop.',
    id: 'gu9o9z',
    description: 'Label for description of custom iterationIndexes Function',
  }),
  TOKEN_FUNCTION_REFERENCE_VARIABLES: intl.formatMessage({
    defaultMessage: 'Returns the value of the specified variable.',
    id: 'Nh91qA',
    description: "Label for the description of the custom 'variables' function",
  }),
  TOKEN_PARAMETER_VARIABLES_VARIABLENAME: intl.formatMessage({
    defaultMessage: 'Required. The name of the variable whose value you want.',
    id: 'eHgi14',
    description: 'Required string parameter to determine variable wanted',
  }),
  TOKEN_FUNCTION_SECTION_WORKFLOW: intl.formatMessage({
    defaultMessage: 'Workflow functions',
    id: 'PfCJlN',
    description: 'Label for workflow functions',
  }),
  TOKEN_FUNCTION_WORKFLOW_LISTCALLBACKURL: intl.formatMessage({
    defaultMessage: 'Returns the URL to invoke the trigger or action',
    id: 'tE7Zam',
    description: 'Label for description of custom listCallbackUrl Function',
  }),
  TOKEN_FUNCTION_WORKFLOW_LISTCALLBACKURL_DETAIL: intl.formatMessage({
    defaultMessage:
      'Returns the URL to invoke the trigger or action. Note: This function can only be used in an httpWebhook and apiConnectionWebhook, not in a manual, recurrence, http, or apiConnection.',
    id: '09B9CU',
    description: 'documentation of custom listCallbackUrl Function',
  }),
  TOKEN_FUNCTION_WORKFLOW_WORKFLOW: intl.formatMessage({
    defaultMessage: 'This function provides you details for the workflow itself at runtime',
    id: 'tMRPnG',
    description: 'Label for description of custom workflow Function',
  }),
  TOKEN_FUNCTION_SECTION_URI_PARSING: intl.formatMessage({
    defaultMessage: 'URI parsing functions',
    id: 'H17jEE',
    description: 'Label for URI parsing functions',
  }),
  TOKEN_FUNCTION_FUNCTION_URIHOST: intl.formatMessage({
    defaultMessage: 'Returns the host from a URI',
    id: 'OjGJ8Y',
    description: 'Label for description of custom uriHost Function',
  }),
  TOKEN_PARAMETER_URI_TEXT: intl.formatMessage({
    defaultMessage: 'Required. The URI to parse.',
    id: 'iMicOQ',
    description: 'Required string parameter to determine which URI to apply uriHost function to',
  }),
  TOKEN_FUNCTION_FUNCTION_URIPATH: intl.formatMessage({
    defaultMessage: `Returns the path from a URI. If path is not specified, returns '/'`,
    id: 'xYyPR8',
    description: 'Label for description of custom uriPath Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URIPATHANDQUERY: intl.formatMessage({
    defaultMessage: 'Returns the path and query from a URI',
    id: 'D+Ptnq',
    description: 'Label for description of custom uriPathAndQuery Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URIPORT: intl.formatMessage({
    defaultMessage: 'Returns the port from a URI. If port is not specified, returns the default port for the protocol',
    id: '109OPL',
    description: 'Label for description of custom uriPort Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URISCHEME: intl.formatMessage({
    defaultMessage: 'Returns the scheme from a URI',
    id: 'LS8rfZ',
    description: 'Label for description of custom uriScheme Function',
  }),
  TOKEN_FUNCTION_FUNCTION_URIQUERY: intl.formatMessage({
    defaultMessage: 'Returns the query from a URI',
    id: 'GAY7b8',
    description: 'Label for description of custom uriQuery Function',
  }),
  TOKEN_FUNCTION_SECTION_MANIPULATION: intl.formatMessage({
    defaultMessage: 'Manipulation functions',
    id: 'iU5Fdh',
    description: 'Label for URI manipulation functions',
  }),
  TOKEN_FUNCTION_MANIPULATION_COALESCE: intl.formatMessage({
    defaultMessage: 'Returns the first non-null object in the passed-in argument values.',
    id: 'oxXV4+',
    description: 'Label for description of custom coalesce Function',
  }),
  TOKEN_PARAMETER_COALESCE_ALL: intl.formatMessage({
    defaultMessage: 'Required. The objects to check for null.',
    id: 'f/lWTW',
    description: 'Required object parameters to check for null in coalesce function',
  }),
  TOKEN_FUNCTION_MANIPULATION_ADDPROPERTY: intl.formatMessage({
    defaultMessage: 'Returns an object with an additional property value pair',
    id: '9Jv3+1',
    description: 'Label for description of custom addProperty Function',
  }),
  TOKEN_PARAMETER_OBJECT: intl.formatMessage({
    defaultMessage: 'Required. The object to add a new property to.',
    id: 'K50znc',
    description: 'Required object parameter to add a property in addProperty function',
  }),
  TOKEN_PARAMETER_ADDPROPERTY_PROPERTY: intl.formatMessage({
    defaultMessage: 'Required. The name of the new property.',
    id: 'W6FdMh',
    description: 'Required string parameter for new property name in addProperty function',
  }),
  TOKEN_PARAMETER_VALUE: intl.formatMessage({
    defaultMessage: 'Required. The value to assign to the property.',
    id: 'q2OCEx',
    description: 'Required parameter for new property value in addProperty function',
  }),
  TOKEN_FUNCTION_MANIPULATION_SETPROPERTY: intl.formatMessage({
    defaultMessage: 'Returns an object with a property set to the provided value',
    id: 'c3G/zq',
    description: 'Label for description of custom setProperty Function',
  }),
  TOKEN_PARAMETER_SETPROPERTY_PROPERTY: intl.formatMessage({
    defaultMessage: 'Required. The name of the new or existing property.',
    id: 'xV/oyK',
    description: 'Required parameter for new/existing property value in setProperty function',
  }),
  TOKEN_FUNCTION_MANIPULATION_REMOVEPROPERTY: intl.formatMessage({
    defaultMessage: 'Returns an object with the specified property removed.',
    id: 'x2JTW5',
    description: "Label for description of the custom 'removeProperty' function",
  }),
  TOKEN_PARAMETER_REMOVEPROPERTY_OBJECT: intl.formatMessage({
    defaultMessage: 'Required. The object to remove the property from.',
    id: '3rzrWf',
    description: 'Required object parameter to identify from which object to remove property from',
  }),
  TOKEN_PARAMETER_REMOVEPROPERTY_PROPERTY: intl.formatMessage({
    defaultMessage: 'Required. The name of the property to remove.',
    id: 'nTA155',
    description: 'Required string parameter to identify which property to remove',
  }),
  TOKEN_FUNCTION_MANIPULATION_XPATH: intl.formatMessage({
    defaultMessage: 'Returns an XML node, nodeset or value as JSON from the provided XPath expression',
    id: 'q/+Uex',
    description: 'Label for description of custom xpath Function',
  }),
  TOKEN_PARAMETER_XPATH_XML: intl.formatMessage({
    defaultMessage: 'Required. The XML on which to evaluate the XPath expression.',
    id: 'o14STH',
    description: 'Required XML parameter to apply xpath function on',
  }),
  TOKEN_PARAMETER_XPATH_XPATH: intl.formatMessage({
    defaultMessage: 'Required. The XPath expression to evaluate.',
    id: 'mZQYLv',
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
            definition: `concat(text_1: string)`,
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_CONCAT,
            parameters: [
              {
                name: 'text_1',
                documentation: Resources.TOKEN_PARAMETER_CONCAT_ALL,
              },
            ],
          },
          {
            definition: `concat(text_1: string, ...)`,
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
            definition: `substring(text: string, startIndex: integer, length?: integer)`,
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
            definition: `slice(text: string, startIndex: integer, endIndex?: integer)`,
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
            definition: `replace(text: string, oldText: string, newText: string)`,
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
            definition: `guid()`,
            documentation: Resources.TOKEN_FUNCTION_FUNCTION_GUID,
            parameters: [],
          },
          {
            definition: `guid(format: string)`,
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
            definition: `toLower(text: string)`,
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
            definition: `toUpper(text: string)`,
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
            definition: `indexOf(text: string, searchText: string)`,
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
            definition: `nthIndexOf(text: string, searchText: string, occurrence: number)`,
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
            definition: `lastIndexOf(text: string, searchText: string)`,
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
            definition: `startsWith(text: string, searchText: string)`,
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
            definition: `endsWith(text: string, searchText: string)`,
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
            definition: `split(text: string, separator: string)`,
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
            definition: `trim(text: string)`,
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
            definition: `contains(collection: array|string, value: string)`,
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
            definition: `length(collection: array|string)`,
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
            definition: `sort(collection: array)`,
            documentation: Resources.TOKEN_FUNCTION_COLLECTION_SORT,
            parameters: [
              {
                name: 'collection',
                documentation: Resources.TOKEN_PARAMETER_SORT_COLLECTION,
              },
            ],
          },
          {
            definition: `sort(colection: array, sortBy: string)`,
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
            definition: `reverse(collection: array)`,
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
            definition: `empty(collection: object|array|string)`,
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
            definition: `intersection(collection_1: object|array, collection_2: object|array)`,
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
            definition: `intersection(collection_1: object|array, collection_2: object|array, ...)`,
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
            definition: `union(collection_1: object|array, collection_2: object|array)`,
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
            definition: `union(collection_1: object|array, collection_2: object|array, ...)`,
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
            definition: `first(collection: array|string)`,
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
            definition: `last(collection: array|string)`,
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
            definition: `take(collection: array|string, count: integer)`,
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
            definition: `skip(collection: array, count: integer)`,
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
            definition: `join(collection: array, delimiter: string)`,
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
            definition: `chunk(collection: array|string, length: int)`,
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
            definition: `if(expression: boolean, valueIfTrue: any, valueIfFalse: any)`,
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
            definition: `equals(object1: any, object2: any)`,
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
            definition: `and(expression1: boolean, expression2: boolean)`,
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
            definition: `or(expression1: boolean, expression2: boolean)`,
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
            definition: `not(expression: boolean)`,
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
            definition: `less(value: integer|float|string, compareTo: integer|float|string)`,
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
            definition: `lessOrEquals(value: integer|float|string, compareTo: integer|float|string)`,
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
            definition: `greater(value: integer|float|string, compareTo: integer|float|string)`,
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
            definition: `greaterOrEquals(value: integer|float|string, compareTo: integer|float|string)`,
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
            definition: `isInt(value: string)`,
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
            definition: `isFloat(value: string, locale?: string)`,
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
            definition: `json(value: string)`,
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
            definition: `xml(value: string)`,
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
            definition: `int(value: string)`,
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
            definition: `string(value: any)`,
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
            definition: `float(value: string)`,
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
            definition: `bool(value: any)`,
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
            definition: `base64(value: string)`,
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
            definition: `base64ToBinary(value: string)`,
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
            definition: `base64ToString(value: string)`,
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
            definition: `binary(value: string)`,
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
            definition: `dataUriToBinary(value: string)`,
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
            definition: `dataUriToString(value: string)`,
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
            definition: `dataUri(value: string)`,
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
            definition: `decodeBase64(value: string)`,
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
            definition: `utf8Length(value: string)`,
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
            definition: `utf16Length(value: string)`,
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
            definition: `encodeUriComponent(value: string)`,
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
            definition: `decodeUriComponent(value: string)`,
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
            definition: `decodeDataUri(value: string)`,
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
            definition: `uriComponent(value: string)`,
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
            definition: `uriComponentToBinary(value: string)`,
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
            definition: `uriComponentToString(value: string)`,
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
            definition: `array(value: string)`,
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
            definition: `createArray(object_1: any)`,
            documentation: Resources.TOKEN_FUNCTION_CONVERSION_CREATEARRAY,
            parameters: [
              {
                name: 'object_1',
                documentation: Resources.TOKEN_PARAMETER_CREATEARRAY_ALL,
              },
            ],
          },
          {
            definition: `createArray(object_1: any, ...)`,
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
            definition: `triggerFormDataValue(key: string)`,
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
            definition: `triggerFormDataMultiValues(key: string)`,
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
            definition: `triggerMultipartBody(index: number)`,
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
            definition: `formDataValue(actionName: string, key: string)`,
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
            definition: `formDataMultiValues(actionName: string, key: string)`,
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
            definition: `multipartBody(actionName: string, index: number)`,
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
            definition: `min(value_1: array|number)`,
            documentation: Resources.TOKEN_FUNCTION_MATH_MIN,
            parameters: [
              {
                name: 'value_1',
                documentation: Resources.TOKEN_PARAMETER_MIN_ALL,
              },
            ],
          },
          {
            definition: `min(value_1: array|number, ...)`,
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
            definition: `max(value_1: array|number)`,
            documentation: Resources.TOKEN_FUNCTION_MATH_MAX,
            parameters: [
              {
                name: 'value_1',
                documentation: Resources.TOKEN_PARAMETER_MAX_ALL,
              },
            ],
          },
          {
            definition: `max(value_1: array|number, ...)`,
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
            definition: `rand(minValue: integer, maxValue: integer)`,
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
            definition: `add(summand_1: number, summand_2: number)`,
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
            definition: `sub(minuend: number, subtrahend: number)`,
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
            definition: `mul(multiplicand_1: number, multiplicand_2: number)`,
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
            definition: `div(dividend: number, divisor: number)`,
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
            definition: `mod(dividend: number, divisor: number)`,
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
            definition: `range(startIndex: integer, count: integer)`,
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
            definition: `getFutureTime(interval: integer, timeUnit: string, format?: string)`,
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
            definition: `getPastTime(interval: integer, timeUnit: string, format?: string)`,
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
            definition: `addToTime(timestamp: string, interval: integer, timeUnit: string, format?: string)`,
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
            definition: `subtractFromTime(timestamp: string, interval: integer, timeUnit: string, format?: string)`,
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
            definition: `addSeconds(timestamp: string, seconds: integer, format?: string)`,
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
            definition: `addMinutes(timestamp: string, minutes: integer, format?: string)`,
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
            definition: `addHours(timestamp: string, hours: integer, format?: string)`,
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
            definition: `addDays(timestamp: string, days: integer, format?: string)`,
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
            definition: `dateDifference(startTimestamp: string, endTimestamp: string)`,
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
            definition: `convertTimeZone(timestamp: string, sourceTimeZone: string, destinationTimeZone: string, format?: string)`,
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
            definition: `convertToUtc(timestamp: string, sourceTimeZone: string, format?: string)`,
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
            definition: `convertFromUtc(timestamp: string, destinationTimeZone: string, format?: string)`,
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
            definition: `formatDateTime(timestamp: string, format?: string, locale?: string)`,
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
            definition: `parseDateTime(dateString: string, locale?: string, format?: string))`,
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
            definition: `startOfHour(timestamp: string, format?: string)`,
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
            definition: `startOfDay(timestamp: string, format?: string)`,
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
            definition: `startOfMonth(timestamp: string, format?: string)`,
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
            definition: `dayOfWeek(timestamp: string)`,
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
            definition: `dayOfMonth(timestamp: string)`,
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
            definition: `dayOfYear(timestamp: string)`,
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
            definition: `ticks(timestamp: string)`,
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
            definition: `listCallbackUrl()`,
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
            definition: `workflow()`,
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
            definition: `uriHost(uri: string)`,
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
            definition: `uriPath(uri: string)`,
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
            definition: `uriPathAndQuery(uri: string)`,
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
            definition: `uriPort(uri: string)`,
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
            definition: `uriScheme(uri: string)`,
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
            definition: `uriQuery(uri: string)`,
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
            definition: `coalesce(object_1: any)`,
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
            definition: `coalesce(object_1: any, ...)`,
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
            definition: `xpath(xml: any, xpath: any)`,
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
