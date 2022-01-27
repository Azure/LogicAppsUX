export class CommonConstants {
  public static Expression = {
    maxExpressionLimit: 8192,
  };

  public static TokenValue = {
    dot: '.',
    comma: ',',
    leftParenthesis: '(',
    rightParenthesis: ')',
    leftSquareBracket: '[',
    rightSquareBracket: ']',
    questionMark: '?',
    singleQuote: "'",
  };
}

export function isWhitespace(ch: string) {
  // NOTE(joechung): https://msdn.microsoft.com/en-us/library/system.char.iswhitespace.aspx
  switch (ch) {
    case '\u0020':
    case '\u1680':
    case '\u2000':
    case '\u2001':
    case '\u2002':
    case '\u2003':
    case '\u2004':
    case '\u2005':
    case '\u2006':
    case '\u2007':
    case '\u2008':
    case '\u2009':
    case '\u200a':
    case '\u202f':
    case '\u205f':
    case '\u3000':
    case '\u2028':
    case '\u2029':
    case '\u0009':
    case '\u000a':
    case '\u000b':
    case '\u000c':
    case '\u000d':
    case '\u0085':
    case '\u00a0':
      return true;

    default:
      return false;
  }
}
