/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { TestFile } from './testFile';
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
    this.testFiles.forEach(async (testFile) => {
      const testName = testFile.path.split('/').slice(-1)[0];
      const id = `${this.name}/${testName}`;

      const fileTestItem = controller.createTestItem(id, testName, testFile);
      const data = new TestFile(testName, testFile, fileTestItem);
      await data.parseUnitTest();
      ext.testData.set(fileTestItem, data);
      this.children.push(fileTestItem);
    });

    this.workflowTestItem.children.replace(this.children);
  }
}
