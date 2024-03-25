/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import * as jsonc from 'jsonc-parser';

/**
 * Parses data to JSON. Has extra logic to remove a BOM character if it exists and handle comments
 * @param {string} data - Data to be parsed.
 * @returns {T} Parsed data in JSON format.
 */
export function parseJson<T extends object>(data: string): T {
  if (data.charCodeAt(0) === 0xfeff) {
    data = data.slice(1);
  }

  const errors: jsonc.ParseError[] = [];
  const result: T = jsonc.parse(data, errors, { allowTrailingComma: true }) as T;
  if (errors.length > 0) {
    const [line, column]: [number, number] = getLineAndColumnFromOffset(data, errors[0].offset);
    throw new Error(
      localize('jsonParseError', '{0} near line "{1}", column "{2}"', jsonc.printParseErrorCode(errors[0].error), line, column)
    );
  } else {
    return result;
  }
}

/**
 * Gets number of line and column from error offset
 * @param {string} data - Data of the error.
 * @returns {[number, number]} Line and column number.
 */
export function getLineAndColumnFromOffset(data: string, offset: number): [number, number] {
  const lines: string[] = data.split('\n');
  let charCount = 0;
  let lineCount = 0;
  let column = 0;
  for (const line of lines) {
    lineCount += 1;
    const lineLength: number = line.length + 1;
    charCount += lineLength;
    if (charCount >= offset) {
      column = offset - (charCount - lineLength);
      break;
    }
  }
  return [lineCount, column];
}
