import constants from '../constants';
import type { Token, ValueSegment } from '../editor';
import { TokenType } from '../editor';
import { getIntl } from '@microsoft/logic-apps-shared';
import { decodePropertySegment, OutputKeys } from '@microsoft/logic-apps-shared';
import { ArgumentException, endsWith, equals, prettifyJsonString, UnsupportedException } from '@microsoft/logic-apps-shared';

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

  switch (language) {
    case constants.SWAGGER.FORMAT.JAVASCRIPT: {
      return formatForJavascript(property, actionName, source);
    }

    default: {
      throw new ArgumentException(
        intl.formatMessage({
          defaultMessage: 'Unsupported programming language.',
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
