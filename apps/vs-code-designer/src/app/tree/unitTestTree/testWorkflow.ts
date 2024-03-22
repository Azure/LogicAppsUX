/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { getUnitTestName } from '../../utils/unitTests';
import { TestFile } from './testFile';
import * as path from 'path';
import { type TestController, type TestItem, type Uri } from 'vscode';

/**
 * Represents a test workflow.
 */
export class TestWorkflow {
  private children: TestItem[];
  private readonly name: string;
  private readonly testFiles: Uri[];
  private workflowTestItem: TestItem;

  /**
   * Constructs a new instance of the TestWorkflow class.
   * @param {string} name - The name of the test workflow.
   * @param {Uri[]} files - The URIs of the test files associated with the workflow.
   * @param {TestItem} workflowTestItem - The test item representing the workflow.
   */
  constructor(name: string, files: Uri[], workflowTestItem: TestItem) {
    this.children = [];
    this.name = name;
    this.testFiles = files;
    this.workflowTestItem = workflowTestItem;
  }

  /**
   * Creates child test items for the current test workflow.
   * @param {TestController} controller - The test controller used to create test items.
   * @returns {Promise<void>} - A promise that resolves when all child test items are created.
   */
  public async createChild(controller: TestController): Promise<void> {
    for (const testFile of this.testFiles) {
      const testName = getUnitTestName(testFile.fsPath);
      const unitTestFileName = path.basename(testFile.fsPath);
      const id = `${this.name}/${unitTestFileName}`;

      const fileTestItem = controller.createTestItem(id, testName, testFile);
      controller.items.add(fileTestItem);
      const data = new TestFile();
      ext.testData.set(fileTestItem, data);
      this.children.push(fileTestItem);
    }

    this.workflowTestItem.children.replace(this.children);
  }

  /**
   * Checks if the current node has any children.
   * @returns {boolean} Returns true if the node has children, otherwise returns false.
   */
  public hasChildren(): boolean {
    return this.children.length > 0;
  }
}
