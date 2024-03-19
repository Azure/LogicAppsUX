import { ext } from '../../../extensionVariables';
import { TestWorkflow } from './testWorkflow';
import { type TestController, type TestItem } from 'vscode';

export class TestWorkspace {
  private children: TestItem[];
  private readonly name: string;
  private readonly workflows: Record<string, any[]>;
  private workspaceTestItem: TestItem;

  constructor(name: string, workflows: any[], workspaceTestItem: TestItem) {
    this.children = [];
    this.name = name;
    this.workflows = this.parseTestWorkflows(workflows);
    this.workspaceTestItem = workspaceTestItem;
  }
  private parseTestWorkflows(workflows: any[]) {
    return workflows.reduce((acc, workflow) => {
      const workflowName = workflow.path.split('/').slice(-2)[0];
      if (!acc[workflowName]) {
        acc[workflowName] = [];
      }
      acc[workflowName].push(workflow);
      return acc;
    }, {});
  }

  public async updateFromDisk(controller: TestController) {
    Object.keys(this.workflows).forEach((workflow) => {
      const id = `${this.name}/${workflow}`;
      const workflowTestItem = controller.createTestItem(id, workflow);
      workflowTestItem.canResolveChildren = true;
      const data = new TestWorkflow(id, this.workflows[workflow], workflowTestItem);
      ext.testData.set(workflowTestItem, data);
      this.children.push(workflowTestItem);
    });
    this.workspaceTestItem.children.replace(this.children);
  }
}
