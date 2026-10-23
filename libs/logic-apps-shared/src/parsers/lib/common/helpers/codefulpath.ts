const codefulExpressionPrefix = '#{';
const dynamicPathSegment = '__logic_apps_dynamic_path_segment__';

interface ParseResult<T> {
  value: T;
  nextIndex: number;
}

export interface CodefulPathSegment {
  type: 'literal' | 'expression';
  value: string;
}

/**
 * Reads only the SDK composer's concatenation of JSON string literals and parenthesized
 * encodeURIComponent calls. Expressions remain source text and are never evaluated.
 * Returns undefined for other formats or incomplete lexical constructs.
 */
export const parseCodefulConnectorPath = (path: string): CodefulPathSegment[] | undefined => {
  if (!path.startsWith(codefulExpressionPrefix) || !path.endsWith('}')) {
    return undefined;
  }

  const expression = path.slice(codefulExpressionPrefix.length, -1);
  let index = skipWhitespace(expression, 0);
  const segments: CodefulPathSegment[] = [];
  let dynamicSegmentCount = 0;

  while (index < expression.length) {
    if (expression[index] === '"') {
      const literal = readJsonStringLiteral(expression, index);
      if (!literal) {
        return undefined;
      }

      segments.push({ type: 'literal', value: literal.value });
      index = literal.nextIndex;
    } else if (expression[index] === '(') {
      const nextIndex = skipParenthesizedExpression(expression, index);
      if (nextIndex === undefined) {
        return undefined;
      }

      const value = expression.slice(index + 1, nextIndex - 1).trim();
      const encodedArgumentStart = /^encodeURIComponent\s*\(/.exec(value);
      if (
        !encodedArgumentStart ||
        skipParenthesizedExpression(value, encodedArgumentStart[0].length - 1) !== value.length ||
        !value.slice(encodedArgumentStart[0].length, -1).trim()
      ) {
        return undefined;
      }

      segments.push({ type: 'expression', value });
      dynamicSegmentCount++;
      index = nextIndex;
    } else {
      return undefined;
    }

    index = skipWhitespace(expression, index);
    if (index === expression.length) {
      break;
    }

    if (expression[index] !== '+') {
      return undefined;
    }

    index = skipWhitespace(expression, index + 1);
    if (index === expression.length) {
      return undefined;
    }
  }

  return dynamicSegmentCount > 0 ? segments : undefined;
};

export const normalizeCodefulConnectorPath = (path: string): string | undefined =>
  parseCodefulConnectorPath(path)
    ?.map((segment) => (segment.type === 'literal' ? segment.value : dynamicPathSegment))
    .join('');

const readJsonStringLiteral = (source: string, startIndex: number): ParseResult<string> | undefined => {
  let index = startIndex + 1;
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
      continue;
    }

    if (source[index] === '"') {
      const literal = source.slice(startIndex, index + 1);
      try {
        const value: unknown = JSON.parse(literal);
        return typeof value === 'string' ? { value, nextIndex: index + 1 } : undefined;
      } catch (error) {
        if (error instanceof SyntaxError) {
          return undefined;
        }
        throw error;
      }
    }

    index++;
  }

  return undefined;
};

const skipParenthesizedExpression = (source: string, startIndex: number): number | undefined => {
  let depth = 0;
  let index = startIndex;

  while (index < source.length) {
    const nextIndex = skipCSharpLiteralOrComment(source, index);
    if (nextIndex === undefined) {
      return undefined;
    }
    if (nextIndex !== index) {
      index = nextIndex;
      continue;
    }

    if (source[index] === '(') {
      depth++;
    } else if (source[index] === ')') {
      depth--;
      if (depth === 0) {
        return index + 1;
      }
    }

    index++;
  }

  return undefined;
};

const skipCSharpLiteralOrComment = (source: string, index: number): number | undefined => {
  if (source.startsWith('//', index)) {
    let lineEnd = index + 2;
    while (lineEnd < source.length && !/[\r\n\u0085\u2028\u2029]/.test(source[lineEnd])) {
      lineEnd++;
    }
    return lineEnd;
  }

  if (source.startsWith('/*', index)) {
    const commentEnd = source.indexOf('*/', index + 2);
    return commentEnd === -1 ? undefined : commentEnd + 2;
  }

  const rawStringStart = getRawStringStart(source, index);
  if (rawStringStart) {
    return skipRawString(source, rawStringStart.quoteIndex, rawStringStart.quoteCount, rawStringStart.dollarCount);
  }

  if (source.startsWith('$@"', index) || source.startsWith('@$"', index)) {
    return skipInterpolatedString(source, index + 2, true);
  }

  if (source.startsWith('$"', index)) {
    return skipInterpolatedString(source, index + 1, false);
  }

  if (source.startsWith('@"', index)) {
    return skipVerbatimString(source, index + 1);
  }

  if (source[index] === '"' || source[index] === "'") {
    return skipEscapedLiteral(source, index, source[index]);
  }

  // An unchanged index means no token; undefined means an unterminated token.
  return index;
};

const getRawStringStart = (
  source: string,
  startIndex: number
): { quoteIndex: number; quoteCount: number; dollarCount: number } | undefined => {
  let quoteIndex = startIndex;
  while (source[quoteIndex] === '$') {
    quoteIndex++;
  }

  const quoteCount = countConsecutiveCharacters(source, quoteIndex, '"');
  return quoteCount >= 3 ? { quoteIndex, quoteCount, dollarCount: quoteIndex - startIndex } : undefined;
};

const skipRawString = (source: string, quoteIndex: number, quoteCount: number, dollarCount: number): number | undefined => {
  let index = quoteIndex + quoteCount;
  while (index < source.length) {
    const currentQuoteCount = countConsecutiveCharacters(source, index, '"');
    if (currentQuoteCount >= quoteCount) {
      return index + quoteCount;
    }

    if (dollarCount > 0 && source[index] === '{') {
      const braceCount = countConsecutiveCharacters(source, index, '{');
      if (braceCount >= dollarCount) {
        const nextIndex = skipInterpolationHole(source, index + braceCount, dollarCount);
        if (nextIndex === undefined) {
          return undefined;
        }
        index = nextIndex;
      } else {
        index += braceCount;
      }
      continue;
    }

    index += Math.max(currentQuoteCount, 1);
  }

  return undefined;
};

const skipInterpolatedString = (source: string, quoteIndex: number, verbatim: boolean): number | undefined => {
  let index = quoteIndex + 1;
  while (index < source.length) {
    if (!verbatim && source[index] === '\\') {
      index += 2;
      continue;
    }

    if (source[index] === '"') {
      if (verbatim && source[index + 1] === '"') {
        index += 2;
        continue;
      }

      return index + 1;
    }

    if (source[index] === '{') {
      if (source[index + 1] === '{') {
        index += 2;
        continue;
      }

      const nextIndex = skipInterpolationHole(source, index + 1);
      if (nextIndex === undefined) {
        return undefined;
      }

      index = nextIndex;
      continue;
    }

    if (source[index] === '}' && source[index + 1] === '}') {
      index += 2;
      continue;
    }

    index++;
  }

  return undefined;
};

const skipInterpolationHole = (source: string, startIndex: number, closingBraceCount = 1): number | undefined => {
  let depth = 1;
  let index = startIndex;

  while (index < source.length) {
    const nextIndex = skipCSharpLiteralOrComment(source, index);
    if (nextIndex === undefined) {
      return undefined;
    }
    if (nextIndex !== index) {
      index = nextIndex;
      continue;
    }

    if (source[index] === '{') {
      depth++;
    } else if (source[index] === '}') {
      if (depth === 1) {
        return countConsecutiveCharacters(source, index, '}') >= closingBraceCount ? index + closingBraceCount : undefined;
      }
      depth--;
    }

    index++;
  }

  return undefined;
};

const skipVerbatimString = (source: string, quoteIndex: number): number | undefined => {
  let index = quoteIndex + 1;
  while (index < source.length) {
    if (source[index] === '"' && source[index + 1] === '"') {
      index += 2;
      continue;
    }

    if (source[index] === '"') {
      return index + 1;
    }

    index++;
  }

  return undefined;
};

const skipEscapedLiteral = (source: string, quoteIndex: number, quote: string): number | undefined => {
  let index = quoteIndex + 1;
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
      continue;
    }

    if (source[index] === quote) {
      return index + 1;
    }

    index++;
  }

  return undefined;
};

const skipWhitespace = (source: string, startIndex: number): number => {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) {
    index++;
  }

  return index;
};

const countConsecutiveCharacters = (source: string, startIndex: number, character: string): number => {
  let index = startIndex;
  while (source[index] === character) {
    index++;
  }

  return index - startIndex;
};
