import { ext } from '../../../extensionVariables';
import { TestWorkflow } from './testWorkflow';
import { Uri, type TestController, type TestItem } from 'vscode';

export class TestWorkspace {
  private children: TestItem[];
  private readonly name: string;
  private readonly workflows: Record<string, Uri[]>;
  private workspaceTestItem: TestItem;

  constructor(name: string, workflows: Uri[], workspaceTestItem: TestItem) {
    this.children = [];
    this.name = name;
    this.workflows = this.parseTestWorkflows(workflows);
    this.workspaceTestItem = workspaceTestItem;
  }

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

  public async createChild(controller: TestController) {
    Object.keys(this.workflows).forEach((workflow) => {
      const filePath = this.workflows[workflow][0].path;
      const workflowUri = Uri.file(filePath.substring(0, filePath.lastIndexOf('/')));
      const id = `${this.name}/${workflow}`;
      const workflowTestItem = controller.createTestItem(id, workflow, workflowUri);
      workflowTestItem.canResolveChildren = true;

      const data = new TestWorkflow(id, this.workflows[workflow], workflowTestItem);
      ext.testData.set(workflowTestItem, data);
      this.children.push(workflowTestItem);
    });
    this.workspaceTestItem.children.replace(this.children);
  }
}
