/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runUnitTest } from '../../commands/workflows/unitTest/runUnitTest';
import { type IActionContext } from '@microsoft/vscode-azext-utils';
import { TestMessage, type TestItem, type TestRun } from 'vscode';

/**
 * Represents a test file.
 */
export class TestFile {
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
