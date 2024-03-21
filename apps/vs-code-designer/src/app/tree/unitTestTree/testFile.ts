/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { runUnitTest } from '../../commands/workflows/unitTest/runUnitTest';
import { parseJson } from '../../utils/parseJson';
import { type UnitTestDefinition } from '@microsoft/utils-logic-apps';
import { type IActionContext, parseError } from '@microsoft/vscode-azext-utils';
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
    const data: string = (await fse.readFile(this.file.fsPath)).toString();
    if (/[^\s]/.test(data)) {
      try {
        this.unitTest = parseJson(data);
      } catch (error) {
        const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', this.file.fsPath, parseError(error).message);
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

  /**
   * Runs a unit test for a specific test item.
   * @param {TestItem} item - The test item to run the unit test for.
   * @param {TestRun} options - The options for running the unit test.
   * @returns A promise that resolves when the unit test is completed.
   */
  async run(item: TestItem, options: TestRun, activateContext: IActionContext): Promise<void> {
    const unitTestResult = await runUnitTest(activateContext, item);
    if (unitTestResult.isSuccessful) {
      options.passed(item, unitTestResult.duration);
    } else {
      const message = TestMessage.diff(`Expected ${item.label}`, '1', '2');
      options.failed(item, message, unitTestResult.duration);
    }
  }
}
