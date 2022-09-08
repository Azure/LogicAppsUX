import type { IconProps } from '../images/IconModel';
import { SchemaNodeDataType } from '../models';
import type { Expression } from '../models/Expression';
import { ExpressionCategory } from '../models/Expression';
import {
  AddSubtractCircle20Filled,
  CalendarClock20Regular,
  Cube20Regular,
  MathSymbols20Regular,
  Wrench20Regular,
} from '@fluentui/react-icons';

export interface ExpressionGroupBranding {
  colorLight: string;
  colorDark: string;
  icon: IconProps;
}

export const collectionBranding: ExpressionGroupBranding = {
  colorLight: '#ae8c00',
  colorDark: '#c9a618',
  icon: <Cube20Regular />,
};

export const datetimeBranding: ExpressionGroupBranding = {
  colorLight: '#4f6bed',
  colorDark: '#93a4f4',
  icon: <CalendarClock20Regular />,
};

export const logicalBranding: ExpressionGroupBranding = {
  colorLight: '#038387',
  colorDark: '#4bb4b7',
  icon: <AddSubtractCircle20Filled />,
};

export const mathBranding: ExpressionGroupBranding = {
  colorLight: '#004e8c',
  colorDark: '#286ea8',
  icon: <MathSymbols20Regular />,
};

export const stringBranding: ExpressionGroupBranding = {
  colorLight: '#e43ba6',
  colorDark: '#ef85cb',
  icon: <Cube20Regular />,
};

export const utilityBranding: ExpressionGroupBranding = {
  colorLight: '#8764b8',
  colorDark: '#a083c9',
  icon: <Wrench20Regular />,
};

export const TempExpressionManifest: Expression[] = [
  {
    name: 'CurrentDate',
    numberOfInputs: 0,
    type: 'TransformationFunction',
    userExpression: 'current-date',
    xsltExpression: 'current-date()',
    isSequenceInputSupported: false,
    isXsltOperatorExpression: false,
    expressionCategory: ExpressionCategory.DateTime,
    iconFileName: 'CalendarDate20Regular.svg',
    outputType: SchemaNodeDataType.DateTime,
    detailedDescription:
      'Returns the current date. For example, a call to date() might return 2004-05-12+01:00. The returned date will always have an associated time zone, which will always be the same as the implicit time zone in the dynamic context',
    tooltip: 'Constant value representing date at the time this transform runs',
  },
  {
    name: 'CurrentDateTime',
    numberOfInputs: 0,
    type: 'TransformationFunction',
    userExpression: 'current-dateTime',
    xsltExpression: 'current-dateTime()',
    isSequenceInputSupported: false,
    isXsltOperatorExpression: false,
    expressionCategory: ExpressionCategory.DateTime,
    iconFileName: '',
    outputType: SchemaNodeDataType.DateTime,
    detailedDescription:
      'Returns the current date and time (with time zone).For example, a call to date-time() might return 2004-05-12T18:17:15.125Z corresponding to the current time on May 12, 2004 in time zone Z.',
    tooltip: 'Constant value representing date-time at the time this transform runs',
  },
  {
    name: 'CurrentTime',
    numberOfInputs: 0,
    type: 'TransformationFunction',
    userExpression: 'current-time',
    xsltExpression: 'current-time()',
    isSequenceInputSupported: false,
    isXsltOperatorExpression: false,
    expressionCategory: ExpressionCategory.DateTime,
    iconFileName: 'Clock20Regular.svg',
    outputType: SchemaNodeDataType.DateTime,
    detailedDescription:
      'Returns the current time. The returned time will always have an associated time zone, which will always be the same as the implicit time zone in the dynamic context. For example, a call to time() might return 23:17:00.000-05:00.',
    tooltip: 'Constant value representing time when this transform runs',
  },
  {
    name: 'Concat',
    numberOfInputs: -1,
    type: 'TransformationFunction',
    userExpression: 'concat',
    xsltExpression: 'concat({0})',
    isSequenceInputSupported: false,
    isXsltOperatorExpression: false,
    expressionCategory: ExpressionCategory.String,
    iconFileName: 'TextNumberFormat20Regular.svg',
    outputType: SchemaNodeDataType.String,
    detailedDescription: 'Evaluates to a string that contains the specified strings, concatenated in the order specified',
    tooltip: 'Concatenate the strings specified by input parameters, in the order given',
  },
  {
    name: 'ToLower',
    numberOfInputs: 1,
    type: 'TransformationFunction',
    userExpression: 'lower-case',
    xsltExpression: 'lower-case({0})',
    isSequenceInputSupported: false,
    isXsltOperatorExpression: false,
    expressionCategory: ExpressionCategory.String,
    iconFileName: 'TextCaseUppercase20Regular.svg',
    outputType: SchemaNodeDataType.String,
    detailedDescription:
      'Evaluates to a string that is the same as the string value of input parameter,  except that any uppercase characters in it are converted to lowercase.',
    tooltip: 'Convert any uppercase characters in a string to lowercase',
  },
  {
    name: 'Condition',
    numberOfInputs: 1,
    type: 'TransformationControlFunction',
    userExpression: '$if',
    isSequenceInputSupported: false,
    isXsltOperatorExpression: false,
    expressionCategory: ExpressionCategory.Utility,
    iconFileName: '',
    outputType: SchemaNodeDataType.String,
    detailedDescription:
      'Evaluates to Boolean value True if the values of the two input parameters are equal; the Boolean value False otherwise. Input parameter values can be in a variety of data types (string, numeric, or logical).',
    tooltip: 'Test whether the two input parameters are equal',
  },
];
