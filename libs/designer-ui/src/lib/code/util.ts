import constants from '../constants';
import type { Token, ValueSegment } from '../editor';
import { TokenType } from '../editor';
import {
  getIntl,
  decodePropertySegment,
  OutputKeys,
  ArgumentException,
  endsWith,
  equals,
  prettifyJsonString,
  UnsupportedException,
  capitalizeFirstLetter,
} from '@microsoft/logic-apps-shared';

const OperationCategory = {
  Actions: 'actions',
  Trigger: 'trigger',
} as const;
export type OperationCategory = (typeof OperationCategory)[keyof typeof OperationCategory];

export function buildInlineCodeTextFromToken(inputToken: Token, language: string): string {
  const intl = getIntl();

  if (inputToken.tokenType === TokenType.VARIABLE) {
    throw new UnsupportedException(
      intl.formatMessage(
        {
          defaultMessage: 'Unsupported Token Type: {var}',
          id: 'XLUs2P',
          description: 'Exception for unsupported token types',
        },
        { var: 'Variables' }
      )
    );
  }

  if (inputToken.arrayDetails?.loopSource) {
    throw new UnsupportedException(
      intl.formatMessage(
        {
          defaultMessage: 'Unsupported Token Type: {controls}',
          id: 'b9P8SA',
          description: 'Exception for unsupported token types',
        },
        { controls: 'Controls' }
      )
    );
  }

  if (inputToken.tokenType === TokenType.FX) {
    throw new UnsupportedException(
      intl.formatMessage(
        {
          defaultMessage: 'Unsupported Token Type: {expressions}',
          id: '8baaNC',
          description: 'Exception for unsupported token types',
        },
        { expressions: 'Expressions' }
      )
    );
  }

  const actionName = inputToken.actionName;
  const source = inputToken.source;
  let property: string;
  if (!inputToken.name || matchesOutputKey(inputToken.name)) {
    property = '';
  } else {
    property = decodePropertySegment(inputToken.name);
  }
  const segmentedProperty = getSegmentedPropertyValue(property);

  switch (language) {
    case constants.PARAMETER.EDITOR_OPTIONS.LANGUAGE.JAVASCRIPT: {
      return formatForJavascript(property, actionName, source);
    }
    case constants.PARAMETER.EDITOR_OPTIONS.LANGUAGE.POWERSHELL: {
      return formatForPowershell(segmentedProperty, actionName, source);
    }
    case constants.PARAMETER.EDITOR_OPTIONS.LANGUAGE.CSHARP: {
      return formatForCSharp(segmentedProperty, actionName, source);
    }

    default: {
      throw new ArgumentException(
        intl.formatMessage({
          defaultMessage: 'Unsupported programming language.',
          id: 'MIX4f9',
          description: 'The exception for an unsupported programming language.',
        })
      );
    }
  }
}

function formatForJavascript(property: string, actionName?: string, source?: string): string {
  const type = actionName ? OperationCategory.Actions : OperationCategory.Trigger;
  let result = `workflowContext.${type}`;

  if (actionName) {
    result = `${result}.${actionName}`;
  }

  if (source === 'outputs') {
    result = `${result}.${source}`;
  } else {
    result = `${result}.outputs.${source}`;
  }

  if (property) {
    result = `${result}.${property}`;
  }

  return result;
}

function formatForPowershell(property: string, actionName?: string, source?: string): string {
  const result = `(get-WorkflowActionOutputs -actionName ${actionName ?? capitalizeFirstLetter(OperationCategory.Trigger)})${
    source ? `["${source}"]` : ''
  }${property}`;

  return result;
}

function formatForCSharp(property: string, actionName?: string, source?: string): string {
  const result = `await context.GetActionResult("${actionName ?? capitalizeFirstLetter(OperationCategory.Trigger)}")${
    source ? `["${source}"]` : ''
  }${property}`;
  return result;
}

const getSegmentedPropertyValue = (property: string): string => {
  const splitProperty = property.split('.');
  let updatedProperty = '';
  splitProperty.forEach((segment) => {
    if (segment) {
      updatedProperty += `["${segment}"]`;
    }
  });
  return updatedProperty;
};

function matchesOutputKey(tokenName: string): boolean {
  return (
    equals(tokenName, OutputKeys.Queries) ||
    equals(tokenName, OutputKeys.Headers) ||
    equals(tokenName, OutputKeys.Body) ||
    endsWith(tokenName, OutputKeys.Item) ||
    equals(tokenName, OutputKeys.Outputs) ||
    equals(tokenName, OutputKeys.StatusCode) ||
    equals(tokenName, OutputKeys.Name) ||
    equals(tokenName, OutputKeys.Properties) ||
    equals(tokenName, OutputKeys.PathParameters)
  );
}

export const getInitialValue = (initialValue: ValueSegment[]): string => {
  if (initialValue[0]?.value) {
    return formatValue(initialValue[0].value);
  }
  return '';
};

export const formatValue = (input: string): string => {
  try {
    return prettifyJsonString(input);
  } catch {
    return input;
  }
};

// Monaco should be at least 3 rows high (19*3 px) but no more than 20 rows high (19*20 px).
export const getEditorHeight = (input = ''): string => {
  return Math.min(Math.max(input?.split('\n').length * 20, 120), 380) + 'px';
};

// CodeEditor Height should be at least 12 rows high (19*12 px) but no more than 24 rows high (19*24 px).
export const getCodeEditorHeight = (input = ''): string => {
  return Math.min(Math.max(input?.split('\n').length * 20, 228), 456) + 'px';
};
