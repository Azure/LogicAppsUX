import type { FunctionDefinition, SignatureInfo } from './templatefunctions';
import { FunctionGroupDefinitions } from './templatefunctions';
import { ExpressionScanner, ExpressionTokenType } from '@microsoft-logic-apps/resolution-service';
import type { ExpressionToken } from '@microsoft-logic-apps/resolution-service';
import { first, getPropertyValue } from '@microsoft-logic-apps/utils';
import * as monaco from 'monaco-editor';

type CompletionList = monaco.languages.CompletionList;
export type CompletionItemProvider = monaco.languages.CompletionItemProvider;
type IMonarchLanguage = monaco.languages.IMonarchLanguage;
type IReadOnlyModel = monaco.editor.IReadOnlyModel;
export type IStandaloneThemeData = monaco.editor.IStandaloneThemeData;
type ParameterInformation = monaco.languages.ParameterInformation;
type Position = monaco.Position;
type ProviderResult<T> = monaco.languages.ProviderResult<T>;
export type SignatureHelpProvider = monaco.languages.SignatureHelpProvider;
type SignatureInformation = monaco.languages.SignatureInformation;
type SignatureHelpResult = monaco.languages.SignatureHelpResult;

const tokenNames: Record<string, string> = {
  FUNCTION: 'function-name',
  KEYWORD: 'keywords',
  NUMBER: 'number-literal',
  STRING: 'string-literal',
};

const keywords: string[] = ['null', 'true', 'false'];

export interface ExpressionInfo {
  templateFunction: FunctionDefinition;
  argumentsCovered: number;
  hasEmptyArgument: boolean;
}

interface IdentifierTokenInfo {
  name: string;
  argumentsCovered: number;
}

export function createLanguageDefinition(templateFunctions: FunctionDefinition[]): IMonarchLanguage {
  const keywordRules = keywords.map((keyword) => ({
    regex: keyword,
    action: {
      token: tokenNames['KEYWORD'],
    },
  }));

  const functionNameRules = templateFunctions.map((templateFunction) => {
    return {
      regex: templateFunction.name,
      action: {
        token: tokenNames['FUNCTION'],
      },
    };
  });

  const stringLiteralRule = {
    regex: /'[^']*'/g,
    action: {
      token: tokenNames['STRING'],
    },
  };

  const numberLiteralRules = [
    {
      regex: /\d*\.\d+([eE][-+]?\d+)?/,
      action: {
        token: tokenNames['NUMBER'],
      },
    },
    {
      regex: /\d+/,
      action: {
        token: tokenNames['NUMBER'],
      },
    },
  ];

  return {
    tokenizer: {
      root: [...keywordRules, ...functionNameRules, ...numberLiteralRules, stringLiteralRule],
    },
    tokenPostfix: '',
    ignoreCase: true,
  };
}

export function createCompletionItemProviderForFunctions(templateFunctions: FunctionDefinition[]): CompletionItemProvider {
  return {
    triggerCharacters: ['.'],
    provideCompletionItems: (): ProviderResult<CompletionList> => {
      const suggestions = templateFunctions.map((templateFunction) => {
        const { name: label, description: documentation, signatures } = templateFunction;
        const shouldAutoComplete = signatures.every((signature: { parameters: string | any[] }) => signature.parameters.length === 0);
        return {
          label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: shouldAutoComplete ? `${label}()` : label,
          documentation,
          range: undefined as unknown as monaco.IRange, // NOTE(joechung): Work around a monaco.d.ts bug introduced by 0.17.0.
        };
      });

      return {
        suggestions,
      };
    },
  };
}

export function createCompletionItemProviderForValues(): CompletionItemProvider {
  return {
    provideCompletionItems: (): ProviderResult<CompletionList> => {
      const suggestions = keywords.map((value) => {
        return {
          label: value,
          kind: monaco.languages.CompletionItemKind.Value,
          insertText: value,
          range: undefined as unknown as monaco.IRange, // NOTE(joechung): Work around a monaco.d.ts bug introduced by 0.17.0.
        };
      });

      return {
        suggestions,
      };
    },
  };
}

export function createSignatureHelpProvider(functions: Record<string, FunctionDefinition>): SignatureHelpProvider {
  return {
    signatureHelpTriggerCharacters: [',', '('],
    provideSignatureHelp(document: IReadOnlyModel, position: Position): ProviderResult<monaco.languages.SignatureHelpResult> {
      const currentValue = document.getValue();
      const currentCursorPosition = position.column - 1;
      const expressionInfo = parseExpression(currentValue, currentCursorPosition, functions);

      if (expressionInfo) {
        return getSignaturesInfo(expressionInfo);
      }

      return null as unknown as SignatureHelpResult;
    },
  };
}

function getSignaturesInfo(expressionInfo: ExpressionInfo): SignatureHelpResult {
  const { templateFunction, argumentsCovered: activeArgument, hasEmptyArgument } = expressionInfo;
  const signaturesWithFixedParameters = templateFunction.signatures.filter((signature) => !signatureHasVariableParameters(signature));
  const signatureWithVariableParameters = templateFunction.signatures.filter(signatureHasVariableParameters);

  const mapSignature = (signature: SignatureInfo): SignatureInformation => ({
    label: signature.definition,
    documentation: signature.documentation,
    parameters: signature.parameters.map((parameter) => ({
      label: parameter.name,
      documentation: parameter.documentation,
    })),
  });

  const allSignatures = templateFunction.signatures.map(mapSignature);

  let activeSignature: number | undefined;
  let activeParameter: number | undefined;

  for (let i = 0; i < signaturesWithFixedParameters.length; i++) {
    const numberOfArguments = signaturesWithFixedParameters[i].parameters.length;

    if ((hasEmptyArgument && numberOfArguments === 0) || (numberOfArguments > 0 && numberOfArguments > activeArgument)) {
      activeSignature = i;
      activeParameter = activeArgument;
      break;
    }
  }

  if (activeSignature !== undefined && activeParameter !== undefined) {
    return {
      dispose: () => {
        // eslint:disable-line: no-empty
      },
      value: {
        signatures: allSignatures,
        activeSignature,
        activeParameter,
      },
    };
  } else if (signatureWithVariableParameters.length === 1) {
    const staticSignatures = signaturesWithFixedParameters.map(mapSignature);
    const variableSignatures = generateSignaturesForVariableParameters(
      templateFunction.name,
      signatureWithVariableParameters[0],
      activeArgument
    );
    const newSignatures = [...staticSignatures, ...variableSignatures];

    return {
      dispose() {
        // eslint:disable-line: no-empty
      },
      value: {
        signatures: newSignatures,
        activeSignature: newSignatures.length - 1,
        activeParameter: activeArgument,
      },
    };
  }

  return null as unknown as monaco.languages.SignatureHelpResult;
}

/**
 * When a signature has variable number of arguments, generate the signatures with parameters based on the active argument.
 */
function generateSignaturesForVariableParameters(
  functionName: string,
  signature: SignatureInfo,
  activeArgument: number
): SignatureInformation[] {
  const numberOfParameters = activeArgument + 1;
  const defaultParameters = signature.parameters.filter((parameter) => !parameter.isVariable);
  const variableParameter = first((parameter) => parameter.isVariable ?? false, signature.parameters);
  if (!variableParameter) {
    return [];
  }
  const { name: parameterNamePrefix, documentation, type } = variableParameter;

  const staticParameters = defaultParameters.map((parameter) => ({ label: parameter.name, documentation: parameter.documentation }));
  const variableSignatures: SignatureInformation[] = [];
  const signatureLabelPrefix = `${functionName}(${defaultParameters.map((parameter) => `${parameter.name}: ${parameter.type}`).join(', ')}`;

  const parameterStartIndex = staticParameters.length + 1;
  for (let i = parameterStartIndex; i <= numberOfParameters; i++) {
    let signatureLabel = `${signatureLabelPrefix}, `;

    const variableParameters: ParameterInformation[] = [];

    for (let j = parameterStartIndex; j <= i; j++) {
      const currentParameterName = `${parameterNamePrefix}_${j}`;
      signatureLabel += `${currentParameterName}: ${type}`;
      signatureLabel += j !== i ? ', ' : ')';

      variableParameters.push({
        label: currentParameterName,
        documentation,
      });
    }

    variableSignatures.push({
      label: signatureLabel,
      documentation: signature.documentation,
      parameters: [...staticParameters, ...variableParameters],
    });
  }

  return variableSignatures;
}

// TODO(psamband): The parse function currently does not handle wrongly entered syntax,
// Need to update for invalid functions like guid()))).
function parseExpression(
  value: string,
  caretPosition: number,
  templateFunctions: Record<string, FunctionDefinition>
): ExpressionInfo | null {
  const scanner = new ExpressionScanner(value, /*prefetch*/ false);

  let previousToken: ExpressionToken | undefined;
  let currentToken: ExpressionToken | undefined;
  const identifiersInfo: IdentifierTokenInfo[] = [];

  try {
    previousToken = currentToken = scanner.getNextToken();
    while (currentToken !== null && currentToken.type !== ExpressionTokenType.EndOfData) {
      const { type, startPosition, endPosition } = currentToken;

      if (caretPosition >= startPosition && caretPosition < endPosition) {
        break;
      }

      if (type === ExpressionTokenType.LeftParenthesis) {
        if (previousToken.type === ExpressionTokenType.Identifier) {
          identifiersInfo.push({
            name: previousToken.value,
            argumentsCovered: 0,
          });
        }
      } else if (type === ExpressionTokenType.Comma) {
        identifiersInfo[identifiersInfo.length - 1].argumentsCovered += 1;
      } else if (type === ExpressionTokenType.RightParenthesis) {
        identifiersInfo.pop();
      }

      previousToken = currentToken;
      currentToken = scanner.getNextToken();
    }
  } catch {
    // NOTE(psamband): Exceptions thrown by the scanner and proceed with recognized tokens.
  }

  if (!identifiersInfo.length) {
    return null;
  }

  const hasEmptyArgument =
    currentToken?.type === ExpressionTokenType.RightParenthesis && previousToken?.type === ExpressionTokenType.LeftParenthesis;
  const token = identifiersInfo.pop();
  if (!token) {
    return null;
  }
  const identifierName = token?.name;
  const argumentsCovered = token?.argumentsCovered;
  const templateFunction = getPropertyValue(templateFunctions, identifierName);

  if (!templateFunction) {
    return null;
  }

  return {
    templateFunction,
    argumentsCovered,
    hasEmptyArgument,
  };
}

export function getTemplateFunctions(): FunctionDefinition[] {
  const templateFunctions: FunctionDefinition[] = [];
  for (const functionGroup of FunctionGroupDefinitions()) {
    templateFunctions.push(...functionGroup.functions);
  }

  return templateFunctions;
}

function signatureHasVariableParameters(signature: SignatureInfo): boolean {
  return signature.parameters.some((parameter) => !!parameter.isVariable);
}
