/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { parseJson } from '../../utils/parseJson';
import { type UnitTestDefinition } from '@microsoft/utils-logic-apps';
import { parseError } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import { TestMessage, type TestItem, type Uri, type TestRun } from 'vscode';

/**
 * Represents a test file.
 */
export class TestFile {
  private readonly name: string;
  private file: Uri;
  private fileTestItem: TestItem;
  private unitTest: UnitTestDefinition;

  /**
   * Creates a new instance of the TestFile class.
   * @param name - The name of the test file.
   * @param file - The URI of the test file.
   * @param fileTestItem - The test item associated with the test file.
   */
  constructor(name: string, file: Uri, fileTestItem: TestItem) {
    this.name = name;
    this.file = file;
    this.fileTestItem = fileTestItem;
  }

  /**
   * Parses the unit test data from the file.
   * @returns A promise that resolves when the unit test data is parsed.
   */
  public async parseUnitTest(): Promise<void> {
    const data: string = (await fse.readFile(this.file.path)).toString();
    if (/[^\s]/.test(data)) {
      try {
        this.unitTest = parseJson(data);
      } catch (error) {
        const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', this.file.path, parseError(error).message);
        throw new Error(message);
      }
    } else {
      this.unitTest = {
        actionMocks: {},
        triggerMocks: {},
        assertions: [],
      };
    }
  }

  async run(item: TestItem, options: TestRun): Promise<void> {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
    const duration = Date.now() - start;

    // This is where we are going to run the unit test from extension bundle

    // Just put a random decision here in the meantime
    if (start % 2 === 0) {
      options.passed(item, duration);
    } else {
      const message = TestMessage.diff(`Expected ${item.label}`, '1', '2');
      options.failed(item, message, duration);
    }
  }
}
