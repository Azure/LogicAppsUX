export enum ExpressionKind {
    NullLiteral = 'NullLiteral',
    BooleanLiteral = 'BooleanLiteral',
    NumberLiteral = 'NumberLiteral',
    StringLiteral = 'StringLiteral',
    Function = 'Function',
    StringInterpolation = 'StringInterpolation',
}

export enum ExpressionErrorCode {
    UNRECOGNIZED_EXPRESSION = 'UnrecognizedExpression',
    EMPTY_VALUE = 'EmptyValue',
    LIMIT_EXCEEDED = 'LimitExceeded',
    STRING_LITERAL_NOT_TERMINATED = 'StringLiteralNotTerminated',
    TOKEN_NOT_FOUND = 'TokenNotFound',
    UNEXPECTED_CHARACTER = 'UnexpectedCharacter',
}

export enum ExpressionFunctionNames {
    PARAMETERS = 'PARAMETERS',
    APPSETTING = 'APPSETTING',
}

export interface Dereference {
    isSafe: boolean;
    isDotNotation: boolean;
    expression: Expression;
}

export type Expression = ExpressionLiteral | ExpressionFunction | ExpressionStringInterpolation;

export interface ExpressionLiteral extends ExpressionBase {
    value: string;
}

export interface ExpressionFunction extends ExpressionBase {
    expression: string;
    name: string;
    startPosition: number;
    endPosition: number;
    arguments: Expression[];
    dereferences: Dereference[];
}

export interface ExpressionStringInterpolation extends ExpressionBase {
    segments: Expression[];
}

/*
* The expression evaluator options.
*/
export interface ExpressionEvaluatorOptions {
    /**
     * @member {boolean} [fuzzyEvaluation] - The value indicating whether to fuzzy evaluate the expression.
     */
    fuzzyEvaluation?: boolean;

    /**
     * @member {EvaluationContext} [context] - The evaluation context.
     */
    context?: ExpressionEvaluationContext;
}

export interface ExpressionEvaluationContext {
    /**
     * @member {Record<string, any>} parameters - The parameters.
     */
    parameters: Record<string, any>; // tslint:disable-line: no-any

    /**
     * @member {Record<string, any>} appsettings - The appsettings.
     */
    appsettings: Record<string, any>; // tslint:disable-line: no-any
}

interface ExpressionBase {
    kind: ExpressionKind;
}

