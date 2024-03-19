import { ext } from '../../../extensionVariables';
import { TestFile } from './testFile';
import { type TestController, type TestItem } from 'vscode';

export class TestWorkflow {
  private children: TestItem[];
  private readonly name: string;
  private readonly testFiles: any[];
  private workflowTestItem: TestItem;

  constructor(name: string, workflows: any[], workflowTestItem: TestItem) {
    this.children = [];
    this.name = name;
    this.testFiles = workflows;
    this.workflowTestItem = workflowTestItem;
  }

  public async updateFromDisk(controller: TestController) {
    this.testFiles.forEach((testFile) => {
      const testName = testFile.path.split('/').slice(-1)[0];
      const data = new TestFile();
      const id = `${this.name}/${testName}`;
      const fileTestItem = controller.createTestItem(id, testName);
      ext.testData.set(fileTestItem, data);
      this.children.push(fileTestItem);
    });

    this.workflowTestItem.children.replace(this.children);
  }
}
