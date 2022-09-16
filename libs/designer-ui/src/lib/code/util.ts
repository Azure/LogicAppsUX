import constants from '../constants';
import type { Token } from '../editor';
import { TokenType } from '../editor';
import { getIntl } from '@microsoft-logic-apps/intl';
import { decodePropertySegment, OutputKeys } from '@microsoft-logic-apps/parsers';
import { ArgumentException, endsWith, equals, UnsupportedException } from '@microsoft-logic-apps/utils';

enum OperationCategory {
  Actions = 'actions',
  Trigger = 'trigger',
}

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
          description: 'Exception for unsupported programming language',
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
