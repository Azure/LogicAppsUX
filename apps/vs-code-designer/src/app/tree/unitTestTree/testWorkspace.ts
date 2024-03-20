/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { TestWorkflow } from './testWorkflow';
import { Uri, type TestController, type TestItem } from 'vscode';

/**
 * Represents a test workspace.
 */
export class TestWorkspace {
  private children: TestItem[];
  private readonly name: string;
  private readonly workflows: Record<string, Uri[]>;
  private workspaceTestItem: TestItem;

  /**
   * Initializes a new instance of the TestWorkspace class.
   * @param name - The name of the workspace.
   * @param workflows - The workflows associated with the workspace.
   * @param workspaceTestItem - The test item representing the workspace.
   */
  constructor(name: string, workflows: Uri[], workspaceTestItem: TestItem) {
    this.children = [];
    this.name = name;
    this.workflows = this.parseTestWorkflows(workflows);
    this.workspaceTestItem = workspaceTestItem;
  }

  /**
   * Parses the test workflows and organizes them by workflow name.
   * @param workflows - The workflows to parse.
   * @returns An object containing the parsed workflows.
   */
  private parseTestWorkflows(workflows: Uri[]): Record<string, Uri[]> {
    return workflows.reduce((acc, workflow) => {
      const workflowName = workflow.path.split('/').slice(-2)[0];
      if (!acc[workflowName]) {
        acc[workflowName] = [];
      }
      acc[workflowName].push(workflow);
      return acc;
    }, {});
  }

  /**
   * Creates a child test item for each workflow in the test workspace.
   * @param controller - The test controller used to create the test items.
   */
  public async createChild(controller: TestController) {
    Object.keys(this.workflows).forEach((workflow) => {
      const filePath = this.workflows[workflow][0].path;
      const workflowUri = Uri.file(filePath.substring(0, filePath.lastIndexOf('/')));
      const id = `${this.name}/${workflow}`;
      const workflowTestItem = controller.createTestItem(id, workflow, workflowUri);
      workflowTestItem.canResolveChildren = true;
      controller.items.add(workflowTestItem);

      const data = new TestWorkflow(id, this.workflows[workflow], workflowTestItem);
      ext.testData.set(workflowTestItem, data);
      this.children.push(workflowTestItem);
    });
    this.workspaceTestItem.children.replace(this.children);
  }
}
