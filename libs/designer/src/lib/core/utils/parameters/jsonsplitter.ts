/**
 * The JSON splitter.
 */
export class JsonSplitter {
  private _json: string;

  constructor(json: string) {
    this._json = json;
  }

  /**
   * Splits the JSON string into sections.
   * There are two kind of sections:
   * 1. a section representing a string
   * 2. a section representing a non-string
   * For example: { "abc": true } => [ '{ ', '"abc"', ': true }' ]
   * @return {string[]}
   */
  public split(): string[] {
    const sections = [];
    const length = this._json.length;

    let currentPosition = 0;
    while (currentPosition < length) {
      const startOfString = this._findStartOfString(currentPosition);
      if (startOfString >= 0) {
        if (startOfString > currentPosition) {
          sections.push(this._json.substring(currentPosition, startOfString));
        }
        const endOfString = this._findEndOfString(startOfString + 1);
        currentPosition = endOfString + 1;
        sections.push(this._json.substring(startOfString, currentPosition));
      } else {
        sections.push(this._json.substring(currentPosition));
        break;
      }
    }

    return sections;
  }

  private _findStartOfString(startPosition: number): number {
    return this._json.indexOf('"', startPosition);
  }

  private _findEndOfString(position: number): number {
    const json = this._json;
    const length = json.length;
    let result = position;

    while (result < length) {
      const ch = json.charAt(result);
      if (ch === '"') {
        return result;
      } else if (ch === '\\') {
        result += 2;
      } else {
        result++;
      }
    }

    return -1;
  }
}
