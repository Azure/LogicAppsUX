import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { TextDecoder } from 'util';
import { workspace, type TestController, type TestItem, type Uri, type TestRun, TestMessage, Location } from 'vscode';

const textDecoder = new TextDecoder('utf-8');

export type TestData = TestWorkspace | TestWorkflow | TestFile | TestCase;

/**
 * Reads the content from a file asynchronously.
 * @param {Uri} uri - The URI of the file to read.
 * @returns A Promise that resolves to the content of the file as a string.
 */
export const getContentFromFile = async (uri: Uri) => {
  try {
    const rawContent = await workspace.fs.readFile(uri);
    return textDecoder.decode(rawContent);
  } catch (error) {
    ext.outputChannel.appendLine(localize('errorReadingTestFile', 'Error reading test file from: {0}, Error: {1}', uri.fsPath, error));
    return '';
  }
};

export class TestWorkspace {
  private children: TestWorkflow[];
  private readonly name: string;
  private readonly workflows: any[];

  constructor(name: string, workflows: any[]) {
    this.children = [];
    this.name = name;
    this.workflows = workflows;
  }

  public async updateFromDisk(controller: TestController) {
    this.workflows.forEach((workflow) => {
      const data = new TestWorkflow();
      const workflowName = workflow.path.split('/').slice(-2)[0];
      const id = `${this.name}/${workflowName}`;

      const workflowTestItem = controller.createTestItem(id, workflowName);
      ext.testData.set(workflowTestItem, data);
      this.children.push(workflowTestItem);
    });
  }

  /**
   * Parses the tests from the input text, and updates the tests contained
   * by this file to be those from the text,
   */
  public updateFromContents(controller: TestController, content: string, item: TestItem) {
    const ancestors = [{ item, children: [] as TestItem[] }];

    const ascend = (depth: number) => {
      while (ancestors.length > depth) {
        const finished = ancestors.pop();
        finished.item.children.replace(finished.children);
      }
    };

    // parseMarkdown(content, {
    // 	onTest: (range, a, operator, b, expected) => {
    // 		const parent = ancestors[ancestors.length - 1];
    // 		const data = new TestCase(a, operator as Operator, b, expected, thisGeneration);
    // 		const id = `${item.uri}/${data.getLabel()}`;

    // 		const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
    // 		testData.set(tcase, data);
    // 		tcase.range = range;
    // 		parent.children.push(tcase);
    // 	},

    // 	onHeading: (range, name, depth) => {
    // 		ascend(depth);
    // 		const parent = ancestors[ancestors.length - 1];
    // 		const id = `${item.uri}/${name}`;

    // 		const thead = controller.createTestItem(id, name, item.uri);
    // 		thead.range = range;
    // 		parent.children.push(thead);
    // 		ancestors.push({ item: thead, children: [] });
    // 	},
    // });

    ascend(0); // finish and assign children for all remaining items
  }
}

export class TestWorkflow {}

export class TestFile2 {}

export class TestFile {
  public didResolve = false;

  public async updateFromDisk(controller: TestController, item: TestItem) {
    try {
      const content = await getContentFromFile(item.uri);
      item.error = undefined;
      this.updateFromContents(controller, content, item);
    } catch (e) {
      item.error = (e as Error).stack;
    }
  }

  /**
   * Parses the tests from the input text, and updates the tests contained
   * by this file to be those from the text,
   */
  public updateFromContents(controller: TestController, content: string, item: TestItem) {
    const ancestors = [{ item, children: [] as TestItem[] }];

    const ascend = (depth: number) => {
      while (ancestors.length > depth) {
        const finished = ancestors.pop();
        finished.item.children.replace(finished.children);
      }
    };

    // parseMarkdown(content, {
    // 	onTest: (range, a, operator, b, expected) => {
    // 		const parent = ancestors[ancestors.length - 1];
    // 		const data = new TestCase(a, operator as Operator, b, expected, thisGeneration);
    // 		const id = `${item.uri}/${data.getLabel()}`;

    // 		const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
    // 		testData.set(tcase, data);
    // 		tcase.range = range;
    // 		parent.children.push(tcase);
    // 	},

    // 	onHeading: (range, name, depth) => {
    // 		ascend(depth);
    // 		const parent = ancestors[ancestors.length - 1];
    // 		const id = `${item.uri}/${name}`;

    // 		const thead = controller.createTestItem(id, name, item.uri);
    // 		thead.range = range;
    // 		parent.children.push(thead);
    // 		ancestors.push({ item: thead, children: [] });
    // 	},
    // });

    ascend(0); // finish and assign children for all remaining items
  }
}

export class TestCase {
  constructor(
    private readonly workflow: string,
    private readonly name: string,
    private readonly triggerMocks: any,
    private readonly actionMocks: any,
    private readonly assertions: []
  ) {}

  getLabel() {
    return `${this.workflow}-${this.name}`;
  }

  async run(item: TestItem, options: TestRun): Promise<void> {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
    const duration = Date.now() - start;
    const message = TestMessage.diff(`Expected ${item.label}`, 'String(this.expected)', 'String(actual)');
    message.location = new Location(item.uri, item.range);
    options.failed(item, message, duration);
  }
}
