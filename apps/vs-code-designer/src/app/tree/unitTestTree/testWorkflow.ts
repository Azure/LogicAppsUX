import { ext } from '../../../extensionVariables';
import { TestFile } from './testFile';
import { type TestController, type TestItem, type Uri } from 'vscode';

export class TestWorkflow {
  private children: TestItem[];
  private readonly name: string;
  private readonly testFiles: Uri[];
  private workflowTestItem: TestItem;

  constructor(name: string, files: Uri[], workflowTestItem: TestItem) {
    this.children = [];
    this.name = name;
    this.testFiles = files;
    this.workflowTestItem = workflowTestItem;
  }

  public async createChild(controller: TestController) {
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
